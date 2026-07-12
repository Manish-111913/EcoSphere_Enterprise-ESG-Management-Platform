import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AuditAction, AwardMode, Badge, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AppConfigService } from '../../../core/config/app-config.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { EventBus } from '../../../core/events/event-bus';
import {
  BADGE_AWARDED,
  CHALLENGE_APPROVED,
  CSR_APPROVED,
  XP_CREDITED,
} from '../../../common/domain-events';
import { CreateBadgeDto, UnlockRuleDto, UpdateBadgeDto } from './dto/badge.dto';

interface EmployeeMetrics {
  xp_total: number;
  challenges_completed: number;
  csr_completed: number;
}

/**
 * Badge engine (W4). On xp.credited/approval — when badge_auto_award is ON —
 * evaluates every active badge's unlock_rule against the employee's metrics and
 * inserts awards (unique (badge, employee) = race guard) with a rule_snapshot.
 */
@Injectable()
export class BadgeService implements OnModuleInit {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
  ) {}

  onModuleInit(): void {
    const onCredit = async (p: { employeeId: string }): Promise<void> => {
      await this.evaluateForEmployee(p.employeeId);
    };
    this.events.on(XP_CREDITED, onCredit);
    this.events.on(CSR_APPROVED, onCredit);
    this.events.on(CHALLENGE_APPROVED, onCredit);
  }

  // ═══════════════ CRUD ═══════════════
  list(): Promise<Badge[]> {
    return this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateBadgeDto, actorId: string): Promise<Badge> {
    const badge = await this.prisma.badge.create({
      data: {
        name: dto.name,
        description: dto.description,
        iconKey: dto.iconKey,
        unlockRule: dto.unlockRule as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'badge', entityId: badge.id, after: badge });
    return badge;
  }

  async update(id: string, dto: UpdateBadgeDto, actorId: string): Promise<Badge> {
    const before = await this.getOrThrow(id);
    const after = await this.prisma.badge.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        iconKey: dto.iconKey,
        unlockRule: dto.unlockRule ? (dto.unlockRule as unknown as Prisma.InputJsonValue) : undefined,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'badge', entityId: id, before, after });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.prisma.badge.update({ where: { id }, data: { isActive: false } });
    await this.audit.record({ actorId, action: AuditAction.DELETE, entityType: 'badge', entityId: id, before });
    return { message: 'Badge deactivated' };
  }

  listAwards(employeeId?: string) {
    return this.prisma.badgeAward.findMany({
      where: employeeId ? { employeeId } : {},
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
  }

  // ═══════════════ manual award + reevaluate ═══════════════
  async manualAward(badgeId: string, employeeId: string, actorId: string) {
    const badge = await this.getOrThrow(badgeId);
    const existing = await this.prisma.badgeAward.findUnique({
      where: { badgeId_employeeId: { badgeId, employeeId } },
    });
    if (existing) return existing;
    const award = await this.prisma.badgeAward.create({
      data: {
        badgeId,
        employeeId,
        awardedMode: AwardMode.MANUAL,
        ruleSnapshot: badge.unlockRule as Prisma.InputJsonValue,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'badge_award', entityId: award.id, after: award });
    this.events.publish(BADGE_AWARDED, {
      ownerId: employeeId,
      entityType: 'badge',
      entityId: badgeId,
      data: { badge_name: badge.name },
    });
    return award;
  }

  /** Re-run auto evaluation for one employee or everyone. */
  async reevaluate(employeeId?: string): Promise<{ evaluated: number; awarded: number }> {
    const employees = employeeId
      ? [{ id: employeeId }]
      : await this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
    let awarded = 0;
    for (const e of employees) awarded += await this.evaluateForEmployee(e.id, true);
    return { evaluated: employees.length, awarded };
  }

  // ═══════════════ engine ═══════════════
  async evaluateForEmployee(employeeId: string, force = false): Promise<number> {
    if (!force && !this.settings.getBoolean('badge_auto_award', false)) return 0;

    const [badges, metrics, existingAwards] = await Promise.all([
      this.prisma.badge.findMany({ where: { isActive: true } }),
      this.metricsFor(employeeId),
      this.prisma.badgeAward.findMany({ where: { employeeId }, select: { badgeId: true } }),
    ]);
    const awardedIds = new Set(existingAwards.map((a) => a.badgeId));
    let count = 0;

    for (const badge of badges) {
      if (awardedIds.has(badge.id)) continue;
      const rule = badge.unlockRule as unknown as UnlockRuleDto;
      if (!this.satisfies(metrics, rule)) continue;
      try {
        await this.prisma.badgeAward.create({
          data: {
            badgeId: badge.id,
            employeeId,
            awardedMode: AwardMode.AUTO,
            ruleSnapshot: rule as unknown as Prisma.InputJsonValue,
          },
        });
        count += 1;
        this.events.publish(BADGE_AWARDED, {
          ownerId: employeeId,
          entityType: 'badge',
          entityId: badge.id,
          data: { badge_name: badge.name },
        });
      } catch (e) {
        // unique(badge, employee) race guard — already awarded concurrently
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    if (count) this.logger.log(`awarded ${count} badge(s) to ${employeeId}`);
    return count;
  }

  private satisfies(metrics: EmployeeMetrics, rule: UnlockRuleDto): boolean {
    const value = metrics[rule.metric];
    switch (rule.operator) {
      case '>=':
        return value >= rule.threshold;
      case '>':
        return value > rule.threshold;
      case '=':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  private async metricsFor(employeeId: string): Promise<EmployeeMetrics> {
    const csrApproved = this.lookups.id('CSR_PARTICIPATION_STATUS', 'APPROVED');
    const challengeApproved = this.lookups.id('CHALLENGE_PARTICIPATION_STATUS', 'APPROVED');
    const [xpAgg, challenges, csr] = await Promise.all([
      this.prisma.xpLedger.aggregate({ where: { employeeId }, _sum: { points: true } }),
      this.prisma.challengeParticipation.count({ where: { employeeId, statusId: challengeApproved } }),
      this.prisma.csrParticipation.count({ where: { employeeId, statusId: csrApproved } }),
    ]);
    return {
      xp_total: xpAgg._sum.points ?? 0,
      challenges_completed: challenges,
      csr_completed: csr,
    };
  }

  private async getOrThrow(id: string): Promise<Badge> {
    const badge = await this.prisma.badge.findUnique({ where: { id } });
    if (!badge) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Badge not found' });
    return badge;
  }
}
