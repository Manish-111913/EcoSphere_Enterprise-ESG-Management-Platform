import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, EsgPolicy, PolicyAudience, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { EventBus } from '../../../core/events/event-bus';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { POLICY_REMINDER } from '../../../common/domain-events';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto';

const STAT = 'POLICY_STATUS';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
  ) {}

  /** Scan published policies and remind applicable, un-acknowledged employees (W6/W11). */
  async reminderScan(): Promise<{ policies: number; reminded: number }> {
    const published = this.lookups.id(STAT, 'PUBLISHED');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const policies = await this.prisma.esgPolicy.findMany({
      where: { statusId: published, deletedAt: null, acknowledgementDeadline: { gte: today } },
    });
    let reminded = 0;
    for (const policy of policies) {
      const applicable = await this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(policy.audience === 'DEPARTMENT' && policy.audienceDepartmentId
            ? { departmentId: policy.audienceDepartmentId }
            : {}),
        },
        select: { id: true },
      });
      const acks = await this.prisma.policyAcknowledgement.findMany({
        where: { policyId: policy.id, policyVersion: policy.version },
        select: { employeeId: true },
      });
      const acked = new Set(acks.map((a) => a.employeeId));
      const affectedUserIds = applicable.map((u) => u.id).filter((id) => !acked.has(id));
      if (affectedUserIds.length === 0) continue;
      reminded += affectedUserIds.length;
      this.events.publish(POLICY_REMINDER, {
        affectedUserIds,
        entityType: 'esg_policy',
        entityId: policy.id,
        data: {
          policy_title: policy.title,
          deadline: policy.acknowledgementDeadline
            ? policy.acknowledgementDeadline.toISOString().slice(0, 10)
            : '',
        },
      });
    }
    return { policies: policies.length, reminded };
  }

  list(filters: { statusId?: string }): Promise<EsgPolicy[]> {
    const where: Prisma.EsgPolicyWhereInput = { deletedAt: null };
    if (filters.statusId) where.statusId = filters.statusId;
    return this.prisma.esgPolicy.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  get(id: string): Promise<EsgPolicy> {
    return this.getOrThrow(id);
  }

  async create(dto: CreatePolicyDto, actorId: string): Promise<EsgPolicy> {
    const policy = await this.prisma.esgPolicy.create({
      data: {
        title: dto.title,
        description: dto.description,
        version: 1,
        documentAttachmentId: dto.documentAttachmentId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        acknowledgementDeadline: dto.acknowledgementDeadline ? new Date(dto.acknowledgementDeadline) : null,
        audience: (dto.audience as PolicyAudience) ?? PolicyAudience.ALL,
        audienceDepartmentId: dto.audienceDepartmentId,
        statusId: this.lookups.id(STAT, 'DRAFT'),
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'esg_policy', entityId: policy.id, after: policy });
    return policy;
  }

  async update(id: string, dto: UpdatePolicyDto, actorId: string): Promise<EsgPolicy> {
    const before = await this.getOrThrow(id);
    const isPublished = before.statusId === this.lookups.id(STAT, 'PUBLISHED');
    // Replacing the document on a published policy bumps the version (§A8).
    const documentReplaced = dto.documentAttachmentId && dto.documentAttachmentId !== before.documentAttachmentId;
    const after = await this.prisma.esgPolicy.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        documentAttachmentId: dto.documentAttachmentId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        acknowledgementDeadline: dto.acknowledgementDeadline ? new Date(dto.acknowledgementDeadline) : undefined,
        audience: dto.audience as PolicyAudience | undefined,
        audienceDepartmentId: dto.audienceDepartmentId,
        version: isPublished && documentReplaced ? before.version + 1 : undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'esg_policy', entityId: id, before, after });
    return after;
  }

  /** Publish = version freeze; needs document + deadline (spec W6). */
  async publish(id: string, actorId: string): Promise<EsgPolicy> {
    const before = await this.getOrThrow(id);
    if (!before.documentAttachmentId) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'A document attachment is required to publish' });
    }
    if (!before.acknowledgementDeadline) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'An acknowledgement deadline is required to publish' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (before.acknowledgementDeadline < today) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Acknowledgement deadline must be today or later' });
    }
    const after = await this.prisma.esgPolicy.update({
      where: { id },
      data: { statusId: this.lookups.id(STAT, 'PUBLISHED'), publishedAt: new Date(), publishedBy: actorId },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'esg_policy', entityId: id, before, after });
    return after;
  }

  /** Acknowledge — unique per (policy, version, employee), immutable, Published only. */
  async acknowledge(id: string, user: AuthenticatedUser, ip?: string) {
    const policy = await this.getOrThrow(id);
    if (policy.statusId !== this.lookups.id(STAT, 'PUBLISHED')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Only published policies can be acknowledged' });
    }
    const existing = await this.prisma.policyAcknowledgement.findUnique({
      where: { policyId_policyVersion_employeeId: { policyId: id, policyVersion: policy.version, employeeId: user.id } },
    });
    if (existing) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Already acknowledged this policy version' });
    }
    const ack = await this.prisma.policyAcknowledgement.create({
      data: { policyId: id, policyVersion: policy.version, employeeId: user.id, ipAddress: ip },
    });
    await this.audit.record({ actorId: user.id, action: AuditAction.CREATE, entityType: 'policy_acknowledgement', entityId: ack.id, after: ack });
    return ack;
  }

  acknowledgements(id: string) {
    return this.prisma.policyAcknowledgement.findMany({
      where: { policyId: id },
      orderBy: { acknowledgedAt: 'desc' },
    });
  }

  /** Published policies applicable to the caller that they have not acknowledged. */
  async pendingForUser(user: AuthenticatedUser): Promise<EsgPolicy[]> {
    const published = this.lookups.id(STAT, 'PUBLISHED');
    const policies = await this.prisma.esgPolicy.findMany({
      where: {
        statusId: published,
        deletedAt: null,
        OR: [{ audience: 'ALL' }, { audience: 'DEPARTMENT', audienceDepartmentId: user.departmentId }],
      },
    });
    if (policies.length === 0) return [];
    const acks = await this.prisma.policyAcknowledgement.findMany({
      where: { employeeId: user.id, policyId: { in: policies.map((p) => p.id) } },
      select: { policyId: true, policyVersion: true },
    });
    const acked = new Set(acks.map((a) => `${a.policyId}:${a.policyVersion}`));
    return policies.filter((p) => !acked.has(`${p.id}:${p.version}`));
  }

  private async getOrThrow(id: string): Promise<EsgPolicy> {
    const p = await this.prisma.esgPolicy.findFirst({ where: { id, deletedAt: null } });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Policy not found' });
    return p;
  }
}
