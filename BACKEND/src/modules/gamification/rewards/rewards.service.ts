import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, Prisma, Reward, XpSourceType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AppConfigService } from '../../../core/config/app-config.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { EventBus } from '../../../core/events/event-bus';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { REWARD_REDEEMED } from '../../../common/domain-events';
import { XpService } from '../xp/xp.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';

interface LockedReward {
  id: string;
  points_required: number;
  stock: number;
  status_id: string;
}

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly events: EventBus,
    private readonly xp: XpService,
  ) {}

  // ═══════════════ CRUD ═══════════════
  list(): Promise<Reward[]> {
    return this.prisma.reward.findMany({ where: { deletedAt: null }, orderBy: { pointsRequired: 'asc' } });
  }

  async create(dto: CreateRewardDto, actorId: string): Promise<Reward> {
    const statusId = dto.statusId ?? this.lookups.id('REWARD_STATUS', dto.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK');
    const reward = await this.prisma.reward.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointsRequired: dto.pointsRequired,
        stock: dto.stock,
        imageKey: dto.imageKey,
        statusId,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'reward', entityId: reward.id, after: reward });
    return reward;
  }

  async update(id: string, dto: UpdateRewardDto, actorId: string): Promise<Reward> {
    const before = await this.getOrThrow(id);
    const after = await this.prisma.reward.update({ where: { id }, data: dto });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'reward', entityId: id, before, after });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.prisma.reward.update({ where: { id }, data: { deletedAt: new Date(), statusId: this.lookups.id('REWARD_STATUS', 'INACTIVE') } });
    await this.audit.record({ actorId, action: AuditAction.DELETE, entityType: 'reward', entityId: id, before });
    return { message: 'Reward deactivated' };
  }

  // ═══════════════ redemption (W5 — ONE atomic transaction) ═══════════════
  async redeem(rewardId: string, user: AuthenticatedUser) {
    const activeId = this.lookups.id('REWARD_STATUS', 'ACTIVE');
    const outOfStockId = this.lookups.id('REWARD_STATUS', 'OUT_OF_STOCK');
    const redeemedId = this.lookups.id('REDEMPTION_STATUS', 'REDEEMED');

    const result = await this.prisma.$transaction(async (tx) => {
      // pessimistic lock on the reward row — serializes concurrent redemptions
      const rows = await tx.$queryRaw<LockedReward[]>(
        Prisma.sql`SELECT id, points_required, stock, status_id
                   FROM rewards WHERE id = ${rewardId}::uuid AND deleted_at IS NULL
                   FOR UPDATE`,
      );
      if (rows.length === 0) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Reward not found' });
      }
      const reward = rows[0];

      if (reward.stock <= 0 || reward.status_id === outOfStockId) {
        throw new UnprocessableEntityException({ code: 'OUT_OF_STOCK', message: 'Reward is out of stock' });
      }
      if (reward.status_id !== activeId) {
        throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Reward is not active' });
      }
      await this.assertPeriodLimit(tx, user.id);

      // redemption row first (so the ledger debit can reference it), then debit + stock
      const redemption = await tx.rewardRedemption.create({
        data: { rewardId, employeeId: user.id, pointsSpent: reward.points_required, statusId: redeemedId },
      });
      const debitEntry = await this.xp.debit(tx, {
        employeeId: user.id,
        points: reward.points_required, // throws INSUFFICIENT_POINTS if balance too low
        sourceType: XpSourceType.REDEMPTION,
        sourceId: redemption.id,
        remarks: 'Reward redemption',
      });
      const newStock = reward.stock - 1;
      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: newStock, statusId: newStock === 0 ? outOfStockId : activeId },
      });
      // balance_after from the in-tx debit row (reading via base client would miss it)
      return { redemption, newStock, newBalance: debitEntry.balanceAfter };
    });

    // post-commit
    await this.audit.record({ actorId: user.id, action: AuditAction.REDEEM, entityType: 'reward_redemption', entityId: result.redemption.id, after: result.redemption });
    this.events.publish(REWARD_REDEEMED, { redemptionId: result.redemption.id, employeeId: user.id, rewardId });
    return result;
  }

  listRedemptions(filters: { employeeId?: string; statusId?: string }) {
    return this.prisma.rewardRedemption.findMany({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.statusId ? { statusId: filters.statusId } : {}),
      },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  async fulfill(redemptionId: string, actorId: string) {
    const redemption = await this.getRedemptionOrThrow(redemptionId);
    if (redemption.statusId !== this.lookups.id('REDEMPTION_STATUS', 'REDEEMED')) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Only redeemed items can be fulfilled' });
    }
    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: { statusId: this.lookups.id('REDEMPTION_STATUS', 'FULFILLED'), fulfilledAt: new Date(), fulfilledBy: actorId },
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'reward_redemption', entityId: redemptionId, before: redemption, after: updated });
    return updated;
  }

  /** Cancel = compensating credit + stock restore (spec W5). */
  async cancel(redemptionId: string, actorId: string) {
    const redemption = await this.getRedemptionOrThrow(redemptionId);
    const cancelledId = this.lookups.id('REDEMPTION_STATUS', 'CANCELLED');
    if (redemption.statusId === cancelledId) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Redemption already cancelled' });
    }
    const activeId = this.lookups.id('REWARD_STATUS', 'ACTIVE');
    const outOfStockId = this.lookups.id('REWARD_STATUS', 'OUT_OF_STOCK');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.rewardRedemption.update({ where: { id: redemptionId }, data: { statusId: cancelledId } });
      await this.xp.adjust(tx, {
        employeeId: redemption.employeeId,
        points: redemption.pointsSpent, // compensating credit
        sourceType: XpSourceType.REDEMPTION,
        sourceId: redemptionId,
        remarks: 'Redemption cancelled — points restored',
      });
      const reward = await tx.reward.findUniqueOrThrow({ where: { id: redemption.rewardId } });
      const newStock = reward.stock + 1;
      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: newStock, statusId: reward.statusId === outOfStockId && newStock > 0 ? activeId : reward.statusId ?? activeId },
      });
      return u;
    });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'reward_redemption', entityId: redemptionId, before: redemption, after: updated });
    return updated;
  }

  // ═══════════════ helpers ═══════════════
  private async assertPeriodLimit(tx: Prisma.TransactionClient, employeeId: string): Promise<void> {
    const limit = this.settings.getNumber('redemption_limit_per_month', 0);
    if (limit <= 0) return;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const cancelledId = this.lookups.id('REDEMPTION_STATUS', 'CANCELLED');
    const count = await tx.rewardRedemption.count({
      where: { employeeId, redeemedAt: { gte: monthStart }, NOT: { statusId: cancelledId } },
    });
    if (count >= limit) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: `Monthly redemption limit of ${limit} reached`,
      });
    }
  }

  private async getOrThrow(id: string): Promise<Reward> {
    const r = await this.prisma.reward.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Reward not found' });
    return r;
  }

  private async getRedemptionOrThrow(id: string) {
    const r = await this.prisma.rewardRedemption.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Redemption not found' });
    return r;
  }
}
