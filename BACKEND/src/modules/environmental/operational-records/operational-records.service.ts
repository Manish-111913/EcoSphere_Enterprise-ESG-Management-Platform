import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, OperationalRecord, Prisma, RecordType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AppConfigService } from '../../../core/config/app-config.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import {
  paginate,
  Paginated,
  Pagination,
} from '../../../common/pagination';
import { CarbonService, CalcResult } from '../carbon/carbon.service';
import {
  CreateOperationalRecordDto,
  UpdateOperationalRecordDto,
} from './dto/operational-record.dto';

export interface ImportRowResult {
  row: number;
  status: 'created' | 'skipped' | 'failed';
  message?: string;
  recordId?: string;
}

@Injectable()
export class OperationalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly carbon: CarbonService,
  ) {}

  async list(
    p: Pagination,
    filters: { recordType?: RecordType; departmentId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<Paginated<OperationalRecord>> {
    const where: Prisma.OperationalRecordWhereInput = { deletedAt: null };
    if (filters.recordType) where.recordType = filters.recordType;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.dateFrom || filters.dateTo) {
      where.occurredAt = {};
      if (filters.dateFrom) where.occurredAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.occurredAt.lte = new Date(filters.dateTo);
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.operationalRecord.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.operationalRecord.count({ where }),
    ]);
    return paginate(rows, total, p);
  }

  async get(id: string): Promise<OperationalRecord> {
    return this.getOrThrow(id);
  }

  async create(
    dto: CreateOperationalRecordDto,
    actorId: string,
  ): Promise<{ record: OperationalRecord; calculation: CalcResult | null }> {
    const occurredAt = new Date(dto.occurredAt);
    this.assertNotFuture(occurredAt);
    await this.assertActiveDepartment(dto.departmentId);

    const record = await this.prisma.operationalRecord.create({
      data: {
        recordType: dto.recordType as RecordType,
        departmentId: dto.departmentId,
        description: dto.description,
        quantity: dto.quantity,
        unitId: dto.unitId,
        amount: dto.amount,
        occurredAt,
        externalRef: dto.externalRef,
        emissionCategory: dto.emissionCategory,
        createdBy: actorId,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'operational_record',
      entityId: record.id,
      after: record,
    });

    // W1: auto-create the carbon transaction when the toggle is ON.
    let calculation: CalcResult | null = null;
    if (this.settings.getBoolean('auto_emission_calc', false)) {
      calculation = await this.carbon.autoCalcForRecord(record, actorId);
    }
    return { record, calculation };
  }

  async update(
    id: string,
    dto: UpdateOperationalRecordDto,
    actorId: string,
  ): Promise<OperationalRecord> {
    const before = await this.getOrThrow(id);
    if (dto.occurredAt) this.assertNotFuture(new Date(dto.occurredAt));
    if (dto.departmentId) await this.assertActiveDepartment(dto.departmentId);
    const after = await this.prisma.operationalRecord.update({
      where: { id },
      data: {
        recordType: dto.recordType as RecordType | undefined,
        departmentId: dto.departmentId,
        description: dto.description,
        quantity: dto.quantity,
        unitId: dto.unitId,
        amount: dto.amount,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        externalRef: dto.externalRef,
        emissionCategory: dto.emissionCategory,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'operational_record',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.prisma.operationalRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'operational_record',
      entityId: id,
      before,
    });
    return { message: 'Operational record deleted' };
  }

  calculate(id: string, actorId: string): Promise<CalcResult> {
    return this.carbon.calculateRecord(id, actorId);
  }

  // ─────────────── CSV import ───────────────
  async importCsv(
    file: Express.Multer.File | undefined,
    actorId: string,
  ): Promise<{ total: number; created: number; skipped: number; failed: number; results: ImportRowResult[] }> {
    if (!file) {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'No CSV file provided' });
    }
    const text = file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'CSV has no data rows' });
    }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (name: string): number => header.indexOf(name);
    const results: ImportRowResult[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const rowNum = i + 1;
      try {
        const departmentCode = cells[idx('departmentcode')];
        const unitCode = cells[idx('unitcode')];
        const dept = await this.prisma.department.findFirst({
          where: { code: departmentCode, deletedAt: null },
        });
        if (!dept) throw new Error(`unknown departmentCode "${departmentCode}"`);
        const unitId = this.lookups.id('UNIT', (unitCode || '').toUpperCase());

        const dto: CreateOperationalRecordDto = {
          recordType: (cells[idx('recordtype')] || 'PURCHASE').toUpperCase() as CreateOperationalRecordDto['recordType'],
          departmentId: dept.id,
          quantity: Number(cells[idx('quantity')]),
          unitId,
          occurredAt: cells[idx('occurredat')],
          emissionCategory: idx('emissioncategory') >= 0 ? cells[idx('emissioncategory')] : undefined,
          description: idx('description') >= 0 ? cells[idx('description')] : undefined,
        };
        if (!(dto.quantity > 0)) throw new Error('quantity must be > 0');

        const { record, calculation } = await this.create(dto, actorId);
        results.push({
          row: rowNum,
          status: 'created',
          recordId: record.id,
          message: calculation?.created
            ? 'auto-calculated'
            : calculation?.skipped
              ? `not calculated (${calculation.reason})`
              : undefined,
        });
      } catch (err) {
        results.push({ row: rowNum, status: 'failed', message: (err as Error).message });
      }
    }
    return {
      total: results.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    };
  }

  // ─────────────── helpers ───────────────
  private async getOrThrow(id: string): Promise<OperationalRecord> {
    const record = await this.prisma.operationalRecord.findFirst({
      where: { id, deletedAt: null },
    });
    if (!record) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Operational record not found' });
    }
    return record;
  }

  private async assertActiveDepartment(id: string): Promise<void> {
    const dept = await this.prisma.department.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!dept) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Department is inactive or not found' });
    }
  }

  private assertNotFuture(date: Date): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'occurredAt cannot be in the future' });
    }
  }
}
