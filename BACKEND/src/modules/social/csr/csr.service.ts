import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApprovalEntityType,
  AuditAction,
  CsrActivity,
  CsrParticipation,
  Prisma,
  XpSourceType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AppConfigService } from '../../../core/config/app-config.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { EventBus } from '../../../core/events/event-bus';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { paginate, Paginated, Pagination } from '../../../common/pagination';
import { CSR_APPROVED, CSR_DECIDED, XP_CREDITED } from '../../../common/domain-events';
import { XpService } from '../../gamification/xp/xp.service';
import { ApprovalPolicyService } from '../../gamification/shared/approval-policy.service';
import {
  CreateCsrActivityDto,
  UpdateCsrActivityDto,
} from './dto/csr.dto';

const PSTAT = 'CSR_PARTICIPATION_STATUS';
const ASTAT = 'CSR_ACTIVITY_STATUS';

@Injectable()
export class CsrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
    private readonly xp: XpService,
    private readonly approvals: ApprovalPolicyService,
  ) {}

  // ═══════════════ activities ═══════════════
  async createActivity(dto: CreateCsrActivityDto, actorId: string): Promise<CsrActivity> {
    await this.assertCategory(dto.categoryId, 'CSR_ACTIVITY');
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'endDate must be on/after startDate' });
    }
    const activity = await this.prisma.csrActivity.create({
      data: {
        title: dto.title,
        categoryId: dto.categoryId,
        description: dto.description,
        departmentId: dto.departmentId,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity,
        pointsValue: dto.pointsValue,
        evidenceRequiredOverride: dto.evidenceRequiredOverride,
        statusId: dto.statusId ?? this.lookups.id(ASTAT, 'DRAFT'),
        createdBy: actorId,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'csr_activity', entityId: activity.id, after: activity });
    return activity;
  }

  listActivities(p: Pagination, filters: { statusId?: string; departmentId?: string }): Promise<Paginated<CsrActivity>> {
    const where: Prisma.CsrActivityWhereInput = { deletedAt: null };
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    return this.prisma.$transaction([
      this.prisma.csrActivity.findMany({ where, orderBy: { startDate: 'desc' }, skip: p.skip, take: p.take }),
      this.prisma.csrActivity.count({ where }),
    ]).then(([rows, total]) => paginate(rows, total, p));
  }

  getActivity(id: string): Promise<CsrActivity> {
    return this.getActivityOrThrow(id);
  }

  async updateActivity(id: string, dto: UpdateCsrActivityDto, actorId: string): Promise<CsrActivity> {
    const before = await this.getActivityOrThrow(id);
    if (dto.categoryId) await this.assertCategory(dto.categoryId, 'CSR_ACTIVITY');
    const after = await this.prisma.csrActivity.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'csr_activity', entityId: id, before, after });
    return after;
  }

  async removeActivity(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getActivityOrThrow(id);
    await this.prisma.csrActivity.update({ where: { id }, data: { deletedAt: new Date(), statusId: this.lookups.id(ASTAT, 'ARCHIVED') } });
    await this.audit.record({ actorId, action: AuditAction.DELETE, entityType: 'csr_activity', entityId: id, before });
    return { message: 'Activity archived' };
  }

  // ═══════════════ participation (W2) ═══════════════
  async participate(activityId: string, user: AuthenticatedUser): Promise<CsrParticipation> {
    const activity = await this.getActivityOrThrow(activityId);
    if (activity.statusId !== this.lookups.id(ASTAT, 'OPEN')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Activity is not open for participation' });
    }
    const dup = await this.prisma.csrParticipation.findUnique({
      where: { csrActivityId_employeeId: { csrActivityId: activityId, employeeId: user.id } },
    });
    if (dup) throw new ConflictException({ code: 'CONFLICT', message: 'Already participating' });

    if (activity.capacity !== null) {
      const active = await this.prisma.csrParticipation.count({
        where: {
          csrActivityId: activityId,
          statusId: { in: [this.lookups.id(PSTAT, 'PENDING'), this.lookups.id(PSTAT, 'SUBMITTED'), this.lookups.id(PSTAT, 'APPROVED')] },
        },
      });
      if (active >= activity.capacity) {
        throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Activity is at capacity' });
      }
    }
    const part = await this.prisma.csrParticipation.create({
      data: { csrActivityId: activityId, employeeId: user.id, statusId: this.lookups.id(PSTAT, 'PENDING') },
    });
    await this.audit.record({ actorId: user.id, action: AuditAction.CREATE, entityType: 'csr_participation', entityId: part.id, after: part });
    return part;
  }

  async attachProof(participationId: string, attachmentId: string, user: AuthenticatedUser): Promise<CsrParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['PENDING', 'SUBMITTED']);
    return this.prisma.csrParticipation.update({ where: { id: participationId }, data: { proofAttachmentId: attachmentId } });
  }

  async submit(participationId: string, user: AuthenticatedUser): Promise<CsrParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['PENDING']);
    return this.prisma.csrParticipation.update({ where: { id: participationId }, data: { statusId: this.lookups.id(PSTAT, 'SUBMITTED') } });
  }

  async approve(participationId: string, remarks: string | undefined, approver: AuthenticatedUser): Promise<CsrParticipation> {
    const part = await this.prisma.csrParticipation.findFirst({
      where: { id: participationId },
      include: { activity: true, employee: true },
    });
    if (!part) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Participation not found' });
    this.assertStatusIn(part.statusId, ['SUBMITTED']); // decisions only from Submitted

    // Evidence guard: activity override wins over the global setting.
    const evidenceRequired = part.activity.evidenceRequiredOverride ?? this.settings.getBoolean('evidence_required_csr', false);
    if (evidenceRequired && !part.proofAttachmentId) {
      throw new UnprocessableEntityException({ code: 'EVIDENCE_REQUIRED', message: 'Proof is required before approval' });
    }
    await this.approvals.assertCanApprove(
      ApprovalEntityType.CSR_PARTICIPATION,
      approver,
      part.employeeId,
      part.employee.departmentId,
    );

    const points = part.activity.pointsValue;
    // ONE transaction: status + points snapshot + idempotent XP credit
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.csrParticipation.update({
        where: { id: participationId },
        data: {
          statusId: this.lookups.id(PSTAT, 'APPROVED'),
          pointsEarned: points,
          completionDate: new Date(),
          decidedBy: approver.id,
          decidedAt: new Date(),
          decisionRemarks: remarks,
        },
      });
      await this.xp.credit(tx, {
        employeeId: part.employeeId,
        points,
        sourceType: XpSourceType.CSR,
        sourceId: participationId,
        remarks: 'CSR participation approved',
      });
      return u;
    });

    // post-commit
    await this.audit.record({ actorId: approver.id, action: AuditAction.APPROVE, entityType: 'csr_participation', entityId: participationId, before: part, after: updated });
    this.events.publish(CSR_APPROVED, { participationId, employeeId: part.employeeId, points });
    this.events.publish(CSR_DECIDED, {
      ownerId: part.employeeId,
      entityType: 'csr_participation',
      entityId: participationId,
      data: { decision: 'APPROVED', activity_title: part.activity.title, points },
    });
    if (points > 0) this.events.publish(XP_CREDITED, { employeeId: part.employeeId });
    return updated;
  }

  async reject(participationId: string, remarks: string, approver: AuthenticatedUser): Promise<CsrParticipation> {
    const part = await this.prisma.csrParticipation.findFirst({ where: { id: participationId }, include: { employee: true, activity: true } });
    if (!part) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Participation not found' });
    this.assertStatusIn(part.statusId, ['SUBMITTED']);
    await this.approvals.assertCanApprove(ApprovalEntityType.CSR_PARTICIPATION, approver, part.employeeId, part.employee.departmentId);

    const updated = await this.prisma.csrParticipation.update({
      where: { id: participationId },
      data: { statusId: this.lookups.id(PSTAT, 'REJECTED'), decidedBy: approver.id, decidedAt: new Date(), decisionRemarks: remarks },
    });
    await this.audit.record({ actorId: approver.id, action: AuditAction.REJECT, entityType: 'csr_participation', entityId: participationId, before: part, after: updated });
    this.events.publish(CSR_DECIDED, {
      ownerId: part.employeeId,
      entityType: 'csr_participation',
      entityId: participationId,
      data: { decision: 'REJECTED', activity_title: part.activity.title },
    });
    return updated;
  }

  async withdraw(participationId: string, user: AuthenticatedUser): Promise<CsrParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['PENDING', 'SUBMITTED']);
    return this.prisma.csrParticipation.update({ where: { id: participationId }, data: { statusId: this.lookups.id(PSTAT, 'WITHDRAWN') } });
  }

  listParticipations(p: Pagination, filters: { activityId?: string; employeeId?: string; statusId?: string }): Promise<Paginated<CsrParticipation>> {
    const where: Prisma.CsrParticipationWhereInput = {};
    if (filters.activityId) where.csrActivityId = filters.activityId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.statusId) where.statusId = filters.statusId;
    return this.prisma.$transaction([
      this.prisma.csrParticipation.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      this.prisma.csrParticipation.count({ where }),
    ]).then(([rows, total]) => paginate(rows, total, p));
  }

  // ═══════════════ helpers ═══════════════
  private async assertCategory(categoryId: string, type: string): Promise<void> {
    const cat = await this.prisma.category.findFirst({ where: { id: categoryId, type, deletedAt: null } });
    if (!cat) throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: `Category must be of type ${type}` });
  }

  private async getActivityOrThrow(id: string): Promise<CsrActivity> {
    const a = await this.prisma.csrActivity.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CSR activity not found' });
    return a;
  }

  private async getParticipationOrThrow(id: string): Promise<CsrParticipation> {
    const p = await this.prisma.csrParticipation.findUnique({ where: { id } });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Participation not found' });
    return p;
  }

  private assertOwner(employeeId: string, user: AuthenticatedUser): void {
    if (employeeId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your participation' });
    }
  }

  private assertStatusIn(statusId: string | null, codes: string[]): void {
    const current = this.lookups.byIdOrNull(statusId)?.code;
    if (!current || !codes.includes(current)) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: `Action not allowed from status ${current ?? 'unknown'}`,
      });
    }
  }
}
