import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, EmissionFactor, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import {
  CreateEmissionFactorDto,
  UpdateEmissionFactorDto,
} from './dto/emission-factor.dto';

@Injectable()
export class EmissionFactorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookups: LookupService,
  ) {}

  async list(filters: {
    category?: string;
    isActive?: boolean;
  }): Promise<EmissionFactor[]> {
    const where: Prisma.EmissionFactorWhereInput = { deletedAt: null };
    if (filters.category) where.category = filters.category;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    return this.prisma.emissionFactor.findMany({
      where,
      orderBy: [{ category: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async get(id: string): Promise<EmissionFactor> {
    return this.getOrThrow(id);
  }

  /** Resolve the factor active for (category, unit) on a given date, or null. */
  async resolveActiveOrNull(
    category: string,
    unitId: string,
    date: Date,
  ): Promise<EmissionFactor | null> {
    const candidates = await this.prisma.emissionFactor.findMany({
      where: {
        category,
        unitId,
        isActive: true,
        deletedAt: null,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return candidates[0] ?? null;
  }

  /** Resolve the factor active for (category, unit) on a given date (spec §A6.4). */
  async resolveActive(
    category: string,
    unitId: string,
    dateStr?: string,
  ): Promise<EmissionFactor> {
    const date = dateStr ? new Date(dateStr) : new Date();
    const factor = await this.resolveActiveOrNull(category, unitId, date);
    if (!factor) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'No active emission factor for the given category/unit/date',
      });
    }
    return factor;
  }

  async create(
    dto: CreateEmissionFactorDto,
    actorId: string,
  ): Promise<EmissionFactor> {
    this.assertPositive(dto.factorValue);
    this.assertUnitAndScope(dto.unitId, dto.scopeId);
    const from = new Date(dto.effectiveFrom);
    const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    this.assertDateOrder(from, to);
    if (dto.isActive ?? true) {
      await this.assertNoOverlap(dto.category, dto.unitId, from, to, null);
    }

    const factor = await this.prisma.emissionFactor.create({
      data: {
        name: dto.name,
        category: dto.category,
        unitId: dto.unitId,
        scopeId: dto.scopeId,
        factorValue: dto.factorValue,
        sourceReference: dto.sourceReference,
        effectiveFrom: from,
        effectiveTo: to,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'emission_factor',
      entityId: factor.id,
      after: factor,
    });
    return factor;
  }

  async update(
    id: string,
    dto: UpdateEmissionFactorDto,
    actorId: string,
  ): Promise<EmissionFactor> {
    const before = await this.getOrThrow(id);
    if (dto.factorValue !== undefined) this.assertPositive(dto.factorValue);
    const unitId = dto.unitId ?? before.unitId;
    const scopeId = dto.scopeId ?? before.scopeId;
    this.assertUnitAndScope(unitId, scopeId);
    const category = dto.category ?? before.category;
    const from = dto.effectiveFrom ? new Date(dto.effectiveFrom) : before.effectiveFrom;
    const to = dto.effectiveTo
      ? new Date(dto.effectiveTo)
      : dto.effectiveTo === undefined
        ? before.effectiveTo
        : null;
    this.assertDateOrder(from, to);
    const willBeActive = dto.isActive ?? before.isActive;
    if (willBeActive) {
      await this.assertNoOverlap(category, unitId, from, to, id);
    }

    const after = await this.prisma.emissionFactor.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        unitId: dto.unitId,
        scopeId: dto.scopeId,
        factorValue: dto.factorValue,
        sourceReference: dto.sourceReference,
        effectiveFrom: dto.effectiveFrom ? from : undefined,
        effectiveTo: dto.effectiveTo !== undefined ? to : undefined,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'emission_factor',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  /** Deactivate (never hard-delete masters referenced by transactions, §A5). */
  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.prisma.emissionFactor.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'emission_factor',
      entityId: id,
      before,
    });
    return { message: 'Emission factor deactivated' };
  }

  // ─────────────── validation ───────────────
  private assertPositive(value: number): void {
    if (!(value > 0)) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'factorValue must be greater than 0',
      });
    }
  }

  private assertUnitAndScope(unitId: string, scopeId: string): void {
    if (!this.lookups.byIdOrNull(unitId) || this.lookups.byIdOrNull(unitId)?.typeCode !== 'UNIT') {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Invalid unit' });
    }
    if (!this.lookups.byIdOrNull(scopeId) || this.lookups.byIdOrNull(scopeId)?.typeCode !== 'EMISSION_SCOPE') {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Invalid emission scope' });
    }
  }

  private assertDateOrder(from: Date, to: Date | null): void {
    if (to && to < from) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'effectiveTo must be on/after effectiveFrom',
      });
    }
  }

  private async assertNoOverlap(
    category: string,
    unitId: string,
    from: Date,
    to: Date | null,
    excludeId: string | null,
  ): Promise<void> {
    const actives = await this.prisma.emissionFactor.findMany({
      where: {
        category,
        unitId,
        isActive: true,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const newEnd = to ? to.getTime() : Number.POSITIVE_INFINITY;
    const newStart = from.getTime();
    for (const f of actives) {
      const fStart = f.effectiveFrom.getTime();
      const fEnd = f.effectiveTo ? f.effectiveTo.getTime() : Number.POSITIVE_INFINITY;
      if (newStart <= fEnd && fStart <= newEnd) {
        throw new UnprocessableEntityException({
          code: 'FACTOR_VERSION_OVERLAP',
          message: 'An active factor version already overlaps this date range',
          details: { conflictingFactorId: f.id },
        });
      }
    }
  }

  private async getOrThrow(id: string): Promise<EmissionFactor> {
    const factor = await this.prisma.emissionFactor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!factor) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Emission factor not found' });
    }
    return factor;
  }
}
