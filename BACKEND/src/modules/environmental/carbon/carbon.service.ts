import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditAction,
  CalculationMode,
  CarbonTransaction,
  OperationalRecord,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { EventBus } from '../../../core/events/event-bus';
import { EmissionFactorsService } from '../factors/emission-factors.service';
import {
  paginate,
  Paginated,
  Pagination,
} from '../../../common/pagination';
import { CreateCarbonTransactionDto } from './dto/carbon.dto';

export const CARBON_RECORDED_EVENT = 'carbon.recorded';

export interface CalcResult {
  created: boolean;
  skipped: boolean;
  reason?: string;
  transaction?: CarbonTransaction;
}

@Injectable()
export class CarbonService {
  private readonly logger = new Logger(CarbonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
    private readonly factors: EmissionFactorsService,
  ) {}

  // ─────────────── manual create (spec §A6.4 / W1) ───────────────
  async createManual(
    dto: CreateCarbonTransactionDto,
    actorId: string,
  ): Promise<CarbonTransaction> {
    const occurredAt = new Date(dto.occurredAt);
    this.assertNotFuture(occurredAt);

    const factor = await this.prisma.emissionFactor.findFirst({
      where: { id: dto.emissionFactorId, deletedAt: null },
    });
    if (!factor) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Emission factor not found' });
    }
    if (!this.factorActiveOn(factor, occurredAt)) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'Emission factor is not active on the transaction date',
      });
    }
    const snapshot = Number(factor.factorValue);
    const co2e = Number((dto.quantity * snapshot).toFixed(4));

    const txn = await this.prisma.carbonTransaction.create({
      data: {
        departmentId: dto.departmentId,
        emissionFactorId: factor.id,
        factorValueSnapshot: snapshot,
        quantity: dto.quantity,
        unitId: dto.unitId,
        co2eKg: co2e,
        calculationMode: CalculationMode.MANUAL,
        occurredAt,
        notes: dto.notes,
        createdBy: actorId,
      },
    });
    await this.afterRecorded(txn, actorId);
    return txn;
  }

  // ─────────────── auto/explicit calc from an operational record ───────────────
  /** W1: called during operational-record insert when auto_emission_calc is ON. */
  async autoCalcForRecord(
    record: OperationalRecord,
    actorId: string,
  ): Promise<CalcResult> {
    const existing = await this.prisma.carbonTransaction.findUnique({
      where: { operationalRecordId: record.id },
    });
    if (existing) return { created: false, skipped: true, reason: 'ALREADY_CALCULATED' };
    return this.doCalc(record, actorId);
  }

  /** POST /operational-records/:id/calculate — explicit; duplicate → 409. */
  async calculateRecord(recordId: string, actorId: string): Promise<CalcResult> {
    const record = await this.prisma.operationalRecord.findFirst({
      where: { id: recordId, deletedAt: null },
    });
    if (!record) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Operational record not found' });
    }
    const existing = await this.prisma.carbonTransaction.findUnique({
      where: { operationalRecordId: record.id },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'This record has already been calculated',
      });
    }
    const result = await this.doCalc(record, actorId);
    if (result.skipped) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: `Cannot calculate: ${result.reason}`,
      });
    }
    return result;
  }

  private async doCalc(
    record: OperationalRecord,
    actorId: string,
  ): Promise<CalcResult> {
    if (!record.emissionCategory) {
      return { created: false, skipped: true, reason: 'NO_EMISSION_CATEGORY' };
    }
    const factor = await this.factors.resolveActiveOrNull(
      record.emissionCategory,
      record.unitId,
      record.occurredAt,
    );
    if (!factor) {
      this.logger.warn(
        `no active factor for record ${record.id} (${record.emissionCategory}); skipping`,
      );
      return { created: false, skipped: true, reason: 'NO_MATCHING_FACTOR' };
    }
    const snapshot = Number(factor.factorValue);
    const co2e = Number((Number(record.quantity) * snapshot).toFixed(4));
    let txn: CarbonTransaction;
    try {
      txn = await this.prisma.carbonTransaction.create({
        data: {
          operationalRecordId: record.id,
          departmentId: record.departmentId,
          emissionFactorId: factor.id,
          factorValueSnapshot: snapshot,
          quantity: record.quantity,
          unitId: record.unitId,
          co2eKg: co2e,
          calculationMode: CalculationMode.AUTO,
          occurredAt: record.occurredAt,
          createdBy: actorId,
        },
      });
    } catch (e) {
      // unique(operational_record_id) is the final race guard → 409
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ code: 'CONFLICT', message: 'Record already calculated' });
      }
      throw e;
    }
    await this.afterRecorded(txn, actorId);
    return { created: true, skipped: false, transaction: txn };
  }

  // ─────────────── list & summary ───────────────
  async list(
    p: Pagination,
    filters: {
      departmentId?: string;
      dateFrom?: string;
      dateTo?: string;
      mode?: CalculationMode;
      factorId?: string;
    },
  ): Promise<Paginated<CarbonTransaction>> {
    const where: Prisma.CarbonTransactionWhereInput = { deletedAt: null };
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.mode) where.calculationMode = filters.mode;
    if (filters.factorId) where.emissionFactorId = filters.factorId;
    if (filters.dateFrom || filters.dateTo) {
      where.occurredAt = {};
      if (filters.dateFrom) where.occurredAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.occurredAt.lte = new Date(filters.dateTo);
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.carbonTransaction.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.carbonTransaction.count({ where }),
    ]);
    return paginate(rows, total, p);
  }

  async summary(
    groupBy: 'department' | 'category' | 'month',
  ): Promise<{ key: string; label: string; total: number }[]> {
    if (groupBy === 'department') {
      return this.prisma.$queryRaw<{ key: string; label: string; total: number }[]>`
        SELECT ct.department_id::text AS key, d.name AS label, SUM(ct.co2e_kg)::float AS total
        FROM carbon_transactions ct JOIN departments d ON d.id = ct.department_id
        WHERE ct.deleted_at IS NULL
        GROUP BY ct.department_id, d.name ORDER BY total DESC`;
    }
    if (groupBy === 'category') {
      return this.prisma.$queryRaw<{ key: string; label: string; total: number }[]>`
        SELECT ef.category AS key, ef.category AS label, SUM(ct.co2e_kg)::float AS total
        FROM carbon_transactions ct JOIN emission_factors ef ON ef.id = ct.emission_factor_id
        WHERE ct.deleted_at IS NULL
        GROUP BY ef.category ORDER BY total DESC`;
    }
    return this.prisma.$queryRaw<{ key: string; label: string; total: number }[]>`
      SELECT to_char(ct.occurred_at, 'YYYY-MM') AS key, to_char(ct.occurred_at, 'YYYY-MM') AS label,
             SUM(ct.co2e_kg)::float AS total
      FROM carbon_transactions ct
      WHERE ct.deleted_at IS NULL
      GROUP BY 1 ORDER BY 1`;
  }

  // ─────────────── helpers ───────────────
  private factorActiveOn(
    factor: { isActive: boolean; effectiveFrom: Date; effectiveTo: Date | null },
    date: Date,
  ): boolean {
    if (!factor.isActive) return false;
    if (factor.effectiveFrom > date) return false;
    if (factor.effectiveTo && factor.effectiveTo < date) return false;
    return true;
  }

  private assertNotFuture(date: Date): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'occurredAt cannot be in the future',
      });
    }
  }

  private async afterRecorded(
    txn: CarbonTransaction,
    actorId: string,
  ): Promise<void> {
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'carbon_transaction',
      entityId: txn.id,
      after: txn,
    });
    // post-commit domain event (spec §A7 W1)
    this.events.publish(CARBON_RECORDED_EVENT, {
      carbonTransactionId: txn.id,
      departmentId: txn.departmentId,
      co2eKg: Number(txn.co2eKg),
      occurredAt: txn.occurredAt,
      mode: txn.calculationMode,
    });
  }
}
