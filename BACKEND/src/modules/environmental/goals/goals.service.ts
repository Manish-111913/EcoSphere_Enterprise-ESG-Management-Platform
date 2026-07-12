import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, EnvironmentalGoal, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

export interface GoalProgress {
  goalId: string;
  type: 'reduction' | 'achievement';
  target: number;
  baseline: number | null;
  actual: number;
  progressPct: number;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(filters: {
    departmentId?: string;
    statusId?: string;
  }): Promise<EnvironmentalGoal[]> {
    const where: Prisma.EnvironmentalGoalWhereInput = { deletedAt: null };
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.statusId) where.statusId = filters.statusId;
    return this.prisma.environmentalGoal.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });
  }

  async get(id: string): Promise<EnvironmentalGoal> {
    return this.getOrThrow(id);
  }

  async create(dto: CreateGoalDto, actorId: string): Promise<EnvironmentalGoal> {
    this.assertPeriod(new Date(dto.periodStart), new Date(dto.periodEnd));
    const goal = await this.prisma.environmentalGoal.create({
      data: {
        title: dto.title,
        departmentId: dto.departmentId ?? null,
        metricCode: dto.metricCode,
        targetValue: dto.targetValue,
        baselineValue: dto.baselineValue,
        unitId: dto.unitId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        statusId: dto.statusId,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'environmental_goal',
      entityId: goal.id,
      after: goal,
    });
    return goal;
  }

  async update(
    id: string,
    dto: UpdateGoalDto,
    actorId: string,
  ): Promise<EnvironmentalGoal> {
    const before = await this.getOrThrow(id);
    const start = dto.periodStart ? new Date(dto.periodStart) : before.periodStart;
    const end = dto.periodEnd ? new Date(dto.periodEnd) : before.periodEnd;
    this.assertPeriod(start, end);

    const after = await this.prisma.environmentalGoal.update({
      where: { id },
      data: {
        title: dto.title,
        departmentId: dto.departmentId,
        metricCode: dto.metricCode,
        targetValue: dto.targetValue,
        baselineValue: dto.baselineValue,
        unitId: dto.unitId,
        periodStart: dto.periodStart ? start : undefined,
        periodEnd: dto.periodEnd ? end : undefined,
        statusId: dto.statusId,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'environmental_goal',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.prisma.environmentalGoal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'environmental_goal',
      entityId: id,
      before,
    });
    return { message: 'Goal deleted' };
  }

  /**
   * Progress vs carbon actuals (spec §A7.1 goal progress formula).
   * actual = Σ co2e_kg for the goal's department (or org-wide) within the period.
   */
  async progress(id: string): Promise<GoalProgress> {
    const goal = await this.getOrThrow(id);
    const agg = await this.prisma.carbonTransaction.aggregate({
      where: {
        deletedAt: null,
        occurredAt: { gte: goal.periodStart, lte: goal.periodEnd },
        ...(goal.departmentId ? { departmentId: goal.departmentId } : {}),
      },
      _sum: { co2eKg: true },
    });
    const actual = Number(agg._sum.co2eKg ?? 0);
    const target = Number(goal.targetValue);
    const baseline = goal.baselineValue === null ? null : Number(goal.baselineValue);

    const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
    let type: 'reduction' | 'achievement';
    let progress: number;
    if (baseline !== null && target < baseline) {
      type = 'reduction';
      progress = clamp01((baseline - actual) / (baseline - target)) * 100;
    } else {
      type = 'achievement';
      progress = target > 0 ? clamp01(actual / target) * 100 : 0;
    }
    const progressPct = Math.round(progress * 10) / 10;

    // Persist the derived cache (spec: progress_pct is derived).
    await this.prisma.environmentalGoal.update({
      where: { id },
      data: { progressPct },
    });
    return { goalId: id, type, target, baseline, actual, progressPct };
  }

  private assertPeriod(start: Date, end: Date): void {
    if (end <= start) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'periodEnd must be after periodStart',
      });
    }
  }

  private async getOrThrow(id: string): Promise<EnvironmentalGoal> {
    const goal = await this.prisma.environmentalGoal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!goal) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Goal not found' });
    }
    return goal;
  }
}
