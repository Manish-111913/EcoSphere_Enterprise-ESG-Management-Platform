import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, GovernanceAudit, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { CreateAuditDto, CompleteAuditDto, UpdateAuditDto } from './dto/audit.dto';

const STAT = 'AUDIT_STATUS';

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookups: LookupService,
  ) {}

  list(filters: { statusId?: string; departmentId?: string }): Promise<GovernanceAudit[]> {
    const where: Prisma.GovernanceAuditWhereInput = { deletedAt: null };
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    return this.prisma.governanceAudit.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  get(id: string): Promise<GovernanceAudit> {
    return this.getOrThrow(id);
  }

  async create(dto: CreateAuditDto, actorId: string): Promise<GovernanceAudit> {
    const auditRow = await this.prisma.governanceAudit.create({
      data: {
        title: dto.title,
        auditType: dto.auditType,
        scopeDescription: dto.scopeDescription,
        departmentId: dto.departmentId,
        auditorId: dto.auditorId,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
        statusId: this.lookups.id(STAT, 'PLANNED'),
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'governance_audit', entityId: auditRow.id, after: auditRow });
    return auditRow;
  }

  async update(id: string, dto: UpdateAuditDto, actorId: string): Promise<GovernanceAudit> {
    const before = await this.getOrThrow(id);
    this.assertNotCompleted(before);
    const after = await this.prisma.governanceAudit.update({
      where: { id },
      data: {
        ...dto,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'governance_audit', entityId: id, before, after });
    return after;
  }

  async start(id: string, actorId: string): Promise<GovernanceAudit> {
    const before = await this.getOrThrow(id);
    if (before.statusId !== this.lookups.id(STAT, 'PLANNED')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Only planned audits can be started' });
    }
    const after = await this.prisma.governanceAudit.update({
      where: { id },
      data: { statusId: this.lookups.id(STAT, 'IN_PROGRESS'), actualStart: new Date() },
    });
    await this.audit.record({ actorId, action: AuditAction.TRANSITION, entityType: 'governance_audit', entityId: id, before, after });
    return after;
  }

  /** Complete = findings + score, then immutable (spec W7). */
  async complete(id: string, dto: CompleteAuditDto, actorId: string): Promise<GovernanceAudit> {
    const before = await this.getOrThrow(id);
    if (before.statusId !== this.lookups.id(STAT, 'IN_PROGRESS')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Only in-progress audits can be completed' });
    }
    const after = await this.prisma.governanceAudit.update({
      where: { id },
      data: {
        statusId: this.lookups.id(STAT, 'COMPLETED'),
        actualEnd: new Date(),
        findingsSummary: dto.findingsSummary,
        auditScore: dto.auditScore,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.TRANSITION, entityType: 'governance_audit', entityId: id, before, after });
    return after;
  }

  issues(id: string) {
    return this.prisma.complianceIssue.findMany({
      where: { governanceAuditId: id },
      orderBy: { raisedDate: 'desc' },
    });
  }

  private assertNotCompleted(audit: GovernanceAudit): void {
    if (audit.statusId === this.lookups.id(STAT, 'COMPLETED')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Completed audits are immutable' });
    }
  }

  private async getOrThrow(id: string): Promise<GovernanceAudit> {
    const a = await this.prisma.governanceAudit.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Audit not found' });
    return a;
  }
}
