import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApprovalEntityType,
  AuditAction,
  Challenge,
  ChallengeParticipation,
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
import { CHALLENGE_APPROVED, CHALLENGE_DECIDED, XP_CREDITED } from '../../../common/domain-events';
import { XpService } from '../xp/xp.service';
import { ApprovalPolicyService } from '../shared/approval-policy.service';
import { TransitionService } from '../shared/transition.service';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
} from './dto/challenge.dto';

const CSTAT = 'CHALLENGE_STATUS';
const PSTAT = 'CHALLENGE_PARTICIPATION_STATUS';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
    private readonly xp: XpService,
    private readonly approvals: ApprovalPolicyService,
    private readonly transitions: TransitionService,
  ) {}

  // ═══════════════ CRUD ═══════════════
  async create(dto: CreateChallengeDto, actorId: string): Promise<Challenge> {
    await this.assertCategory(dto.categoryId);
    if (new Date(dto.deadline) <= new Date(dto.startDate)) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'deadline must be after startDate' });
    }
    const challenge = await this.prisma.challenge.create({
      data: {
        title: dto.title,
        categoryId: dto.categoryId,
        description: dto.description,
        xpValue: dto.xpValue,
        difficultyId: dto.difficultyId,
        evidenceRequired: dto.evidenceRequired ?? false,
        startDate: new Date(dto.startDate),
        deadline: new Date(dto.deadline),
        statusId: dto.statusId ?? this.lookups.id(CSTAT, 'DRAFT'),
        createdBy: actorId,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'challenge', entityId: challenge.id, after: challenge });
    return challenge;
  }

  list(p: Pagination, filters: { statusId?: string; categoryId?: string }): Promise<Paginated<Challenge>> {
    const where: Prisma.ChallengeWhereInput = { deletedAt: null };
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    return this.prisma.$transaction([
      this.prisma.challenge.findMany({ where, orderBy: { startDate: 'desc' }, skip: p.skip, take: p.take }),
      this.prisma.challenge.count({ where }),
    ]).then(([rows, total]) => paginate(rows, total, p));
  }

  get(id: string): Promise<Challenge> {
    return this.getOrThrow(id);
  }

  async update(id: string, dto: UpdateChallengeDto, actorId: string): Promise<Challenge> {
    const before = await this.getOrThrow(id);
    // Free edits only in Draft (spec §A6.6 / §A8).
    if (before.statusId !== this.lookups.id(CSTAT, 'DRAFT')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Challenges can only be edited while in Draft' });
    }
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    const after = await this.prisma.challenge.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'challenge', entityId: id, before, after });
    return after;
  }

  /** W3: transition validated against lookup_transitions + permission. */
  async transition(id: string, toStatusCode: string, user: AuthenticatedUser): Promise<Challenge> {
    const before = await this.getOrThrow(id);
    const toStatusId = this.resolveStatus(toStatusCode);
    await this.transitions.assertAllowed(before.statusId!, toStatusId, user);
    const after = await this.prisma.challenge.update({ where: { id }, data: { statusId: toStatusId } });
    await this.audit.record({ actorId: user.id, action: AuditAction.TRANSITION, entityType: 'challenge', entityId: id, before, after });
    return after;
  }

  // ═══════════════ participation (W3/W2) ═══════════════
  async join(challengeId: string, user: AuthenticatedUser): Promise<ChallengeParticipation> {
    const challenge = await this.getOrThrow(challengeId);
    if (challenge.statusId !== this.lookups.id(CSTAT, 'ACTIVE')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Challenge is not active' });
    }
    if (challenge.deadline < new Date()) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Challenge deadline has passed' });
    }
    const dup = await this.prisma.challengeParticipation.findUnique({
      where: { challengeId_employeeId: { challengeId, employeeId: user.id } },
    });
    if (dup) throw new ConflictException({ code: 'CONFLICT', message: 'Already joined' });

    const part = await this.prisma.challengeParticipation.create({
      data: { challengeId, employeeId: user.id, statusId: this.lookups.id(PSTAT, 'JOINED') },
    });
    await this.audit.record({ actorId: user.id, action: AuditAction.CREATE, entityType: 'challenge_participation', entityId: part.id, after: part });
    return part;
  }

  async setProgress(participationId: string, pct: number, user: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['JOINED', 'SUBMITTED']);
    return this.prisma.challengeParticipation.update({ where: { id: participationId }, data: { progressPct: pct } });
  }

  async attachProof(participationId: string, attachmentId: string, user: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['JOINED', 'SUBMITTED']);
    return this.prisma.challengeParticipation.update({ where: { id: participationId }, data: { proofAttachmentId: attachmentId } });
  }

  async submit(participationId: string, user: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['JOINED']);
    return this.prisma.challengeParticipation.update({ where: { id: participationId }, data: { statusId: this.lookups.id(PSTAT, 'SUBMITTED') } });
  }

  async approve(participationId: string, remarks: string | undefined, approver: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.prisma.challengeParticipation.findFirst({
      where: { id: participationId },
      include: { challenge: true, employee: true },
    });
    if (!part) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Participation not found' });
    this.assertStatusIn(part.statusId, ['SUBMITTED']);

    if (part.challenge.evidenceRequired && !part.proofAttachmentId) {
      throw new UnprocessableEntityException({ code: 'EVIDENCE_REQUIRED', message: 'Proof is required before approval' });
    }
    await this.approvals.assertCanApprove(
      ApprovalEntityType.CHALLENGE_PARTICIPATION,
      approver,
      part.employeeId,
      part.employee.departmentId,
    );

    const xpValue = part.challenge.xpValue;
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.challengeParticipation.update({
        where: { id: participationId },
        data: {
          statusId: this.lookups.id(PSTAT, 'APPROVED'),
          xpAwarded: xpValue,
          progressPct: 100,
          decidedBy: approver.id,
          decidedAt: new Date(),
          decisionRemarks: remarks,
        },
      });
      await this.xp.credit(tx, {
        employeeId: part.employeeId,
        points: xpValue,
        sourceType: XpSourceType.CHALLENGE,
        sourceId: participationId,
        remarks: 'Challenge approved',
      });
      return u;
    });

    await this.audit.record({ actorId: approver.id, action: AuditAction.APPROVE, entityType: 'challenge_participation', entityId: participationId, before: part, after: updated });
    this.events.publish(CHALLENGE_APPROVED, { participationId, employeeId: part.employeeId, xp: xpValue });
    this.events.publish(CHALLENGE_DECIDED, {
      ownerId: part.employeeId,
      entityType: 'challenge_participation',
      entityId: participationId,
      data: { decision: 'APPROVED', challenge_title: part.challenge.title, xp: xpValue },
    });
    this.events.publish(XP_CREDITED, { employeeId: part.employeeId });
    return updated;
  }

  async reject(participationId: string, remarks: string, approver: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.prisma.challengeParticipation.findFirst({ where: { id: participationId }, include: { employee: true, challenge: true } });
    if (!part) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Participation not found' });
    this.assertStatusIn(part.statusId, ['SUBMITTED']);
    await this.approvals.assertCanApprove(ApprovalEntityType.CHALLENGE_PARTICIPATION, approver, part.employeeId, part.employee.departmentId);
    const updated = await this.prisma.challengeParticipation.update({
      where: { id: participationId },
      data: { statusId: this.lookups.id(PSTAT, 'REJECTED'), decidedBy: approver.id, decidedAt: new Date(), decisionRemarks: remarks },
    });
    await this.audit.record({ actorId: approver.id, action: AuditAction.REJECT, entityType: 'challenge_participation', entityId: participationId, before: part, after: updated });
    this.events.publish(CHALLENGE_DECIDED, {
      ownerId: part.employeeId,
      entityType: 'challenge_participation',
      entityId: participationId,
      data: { decision: 'REJECTED', challenge_title: part.challenge.title },
    });
    return updated;
  }

  async withdraw(participationId: string, user: AuthenticatedUser): Promise<ChallengeParticipation> {
    const part = await this.getParticipationOrThrow(participationId);
    this.assertOwner(part.employeeId, user);
    this.assertStatusIn(part.statusId, ['JOINED', 'SUBMITTED']);
    return this.prisma.challengeParticipation.update({ where: { id: participationId }, data: { statusId: this.lookups.id(PSTAT, 'WITHDRAWN') } });
  }

  listParticipations(challengeId: string, p: Pagination): Promise<Paginated<ChallengeParticipation>> {
    const where: Prisma.ChallengeParticipationWhereInput = { challengeId };
    return this.prisma.$transaction([
      this.prisma.challengeParticipation.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      this.prisma.challengeParticipation.count({ where }),
    ]).then(([rows, total]) => paginate(rows, total, p));
  }

  /** Deadline cron: Active challenges past deadline → Under Review (spec W3). */
  async transitionExpired(): Promise<number> {
    const activeId = this.lookups.id(CSTAT, 'ACTIVE');
    const underReviewId = this.lookups.id(CSTAT, 'UNDER_REVIEW');
    const expired = await this.prisma.challenge.findMany({
      where: { statusId: activeId, deletedAt: null, deadline: { lt: new Date() } },
    });
    for (const c of expired) {
      await this.prisma.challenge.update({ where: { id: c.id }, data: { statusId: underReviewId } });
      await this.audit.record({ actorId: null, action: AuditAction.TRANSITION, entityType: 'challenge', entityId: c.id, before: { statusId: activeId }, after: { statusId: underReviewId } });
    }
    if (expired.length) this.logger.log(`deadline cron: ${expired.length} challenge(s) → Under Review`);
    return expired.length;
  }

  // ═══════════════ helpers ═══════════════
  private resolveStatus(code: string): string {
    try {
      return this.lookups.id(CSTAT, code.toUpperCase());
    } catch {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: `Unknown challenge status: ${code}` });
    }
  }

  private async assertCategory(categoryId: string): Promise<void> {
    const cat = await this.prisma.category.findFirst({ where: { id: categoryId, type: 'CHALLENGE', deletedAt: null } });
    if (!cat) throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Category must be of type CHALLENGE' });
  }

  private async getOrThrow(id: string): Promise<Challenge> {
    const c = await this.prisma.challenge.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Challenge not found' });
    return c;
  }

  private async getParticipationOrThrow(id: string): Promise<ChallengeParticipation> {
    const p = await this.prisma.challengeParticipation.findUnique({ where: { id } });
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
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: `Action not allowed from status ${current ?? 'unknown'}` });
    }
  }
}
