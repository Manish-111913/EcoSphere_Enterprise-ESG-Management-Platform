import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, ComplianceIssue, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { EventBus } from '../../../core/events/event-bus';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { ISSUE_OVERDUE, ISSUE_RAISED } from '../../../common/domain-events';
import { TransitionService } from '../../gamification/shared/transition.service';
import {
  CreateIssueDto,
  UpdateIssueDto,
} from './dto/issue.dto';

const STAT = 'ISSUE_STATUS';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
    private readonly transitions: TransitionService,
  ) {}

  list(filters: { statusId?: string; ownerId?: string; severityId?: string }): Promise<ComplianceIssue[]> {
    const where: Prisma.ComplianceIssueWhereInput = {};
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.severityId) where.severityId = filters.severityId;
    return this.prisma.complianceIssue.findMany({ where, orderBy: { dueDate: 'asc' } });
  }

  get(id: string): Promise<ComplianceIssue> {
    return this.getOrThrow(id);
  }

  overdue(): Promise<ComplianceIssue[]> {
    return this.prisma.complianceIssue.findMany({ where: { isOverdue: true }, orderBy: { dueDate: 'asc' } });
  }

  async create(dto: CreateIssueDto, actorId: string): Promise<ComplianceIssue> {
    const owner = await this.prisma.user.findFirst({ where: { id: dto.ownerId, deletedAt: null } });
    if (!owner) throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Owner must be a valid user' });
    const raisedDate = dto.raisedDate ? new Date(dto.raisedDate) : new Date();
    const dueDate = new Date(dto.dueDate);
    if (dueDate < this.dateOnly(raisedDate)) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'dueDate must be on/after raisedDate' });
    }
    const issue = await this.prisma.complianceIssue.create({
      data: {
        governanceAuditId: dto.governanceAuditId,
        title: dto.title,
        description: dto.description,
        severityId: dto.severityId,
        ownerId: dto.ownerId,
        dueDate,
        raisedBy: actorId,
        raisedDate,
        statusId: this.lookups.id(STAT, 'OPEN'),
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'compliance_issue', entityId: issue.id, after: issue });
    // notify the owner (spec W8)
    this.events.publish(ISSUE_RAISED, {
      ownerId: issue.ownerId,
      departmentId: owner.departmentId,
      entityType: 'compliance_issue',
      entityId: issue.id,
      data: { issue_title: issue.title, due_date: this.fmt(issue.dueDate) },
    });
    return issue;
  }

  async update(id: string, dto: UpdateIssueDto, actorId: string): Promise<ComplianceIssue> {
    const before = await this.getOrThrow(id);
    const after = await this.prisma.complianceIssue.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        severityId: dto.severityId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'compliance_issue', entityId: id, before, after });
    return after;
  }

  async changeOwner(id: string, ownerId: string, actorId: string): Promise<ComplianceIssue> {
    const before = await this.getOrThrow(id);
    const owner = await this.prisma.user.findFirst({ where: { id: ownerId, deletedAt: null } });
    if (!owner) throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Owner must be a valid user' });
    const after = await this.prisma.complianceIssue.update({ where: { id }, data: { ownerId } });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'compliance_issue', entityId: id, before, after });
    return after;
  }

  /** Transition per ISSUE_STATUS machine; resolve requires notes (spec W8). */
  async transition(id: string, toStatusCode: string, resolutionNotes: string | undefined, user: AuthenticatedUser): Promise<ComplianceIssue> {
    const before = await this.getOrThrow(id);
    const toStatusId = this.resolveStatus(toStatusCode);
    await this.transitions.assertAllowed(before.statusId!, toStatusId, user);

    const code = toStatusCode.toUpperCase();
    const data: Prisma.ComplianceIssueUpdateInput = { statusId: toStatusId };
    if (code === 'RESOLVED') {
      if (!resolutionNotes) {
        throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Resolution notes are required to resolve' });
      }
      data.resolutionNotes = resolutionNotes;
      data.resolvedAt = new Date();
      data.isOverdue = false;
    }
    if (code === 'CLOSED') data.closedAt = new Date();

    const after = await this.prisma.complianceIssue.update({ where: { id }, data });
    await this.audit.record({ actorId: user.id, action: AuditAction.TRANSITION, entityType: 'compliance_issue', entityId: id, before, after });
    return after;
  }

  /** Nightly overdue flagger (spec W8): unresolved + past due → is_overdue + issue.overdue. */
  async scanOverdue(): Promise<{ flagged: number }> {
    const openId = this.lookups.id(STAT, 'OPEN');
    const inProgressId = this.lookups.id(STAT, 'IN_PROGRESS');
    const today = this.dateOnly(new Date());
    const newlyOverdue = await this.prisma.complianceIssue.findMany({
      where: {
        statusId: { in: [openId, inProgressId] },
        resolvedAt: null,
        isOverdue: false,
        dueDate: { lt: today },
      },
    });
    for (const issue of newlyOverdue) {
      await this.prisma.complianceIssue.update({ where: { id: issue.id }, data: { isOverdue: true } });
      const owner = await this.prisma.user.findUnique({ where: { id: issue.ownerId }, select: { departmentId: true } });
      this.events.publish(ISSUE_OVERDUE, {
        ownerId: issue.ownerId,
        departmentId: owner?.departmentId,
        entityType: 'compliance_issue',
        entityId: issue.id,
        data: { issue_title: issue.title, due_date: this.fmt(issue.dueDate) },
      });
    }
    if (newlyOverdue.length) this.logger.log(`overdue scan: flagged ${newlyOverdue.length} issue(s)`);
    return { flagged: newlyOverdue.length };
  }

  // ─────────────── helpers ───────────────
  private resolveStatus(code: string): string {
    try {
      return this.lookups.id(STAT, code.toUpperCase());
    } catch {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: `Unknown issue status: ${code}` });
    }
  }

  private async getOrThrow(id: string): Promise<ComplianceIssue> {
    const i = await this.prisma.complianceIssue.findUnique({ where: { id } });
    if (!i) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' });
    return i;
  }

  private dateOnly(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
