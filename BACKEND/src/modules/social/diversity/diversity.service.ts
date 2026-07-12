import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, MetricDefinition, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import {
  CreateDiversityRecordDto,
  CreateMetricDefinitionDto,
  UpdateMetricDefinitionDto,
} from './dto/diversity.dto';

@Injectable()
export class DiversityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════ metric definitions (Admin) ═══════════════
  listMetricDefs(): Promise<MetricDefinition[]> {
    return this.prisma.metricDefinition.findMany({ orderBy: { code: 'asc' } });
  }

  async createMetricDef(dto: CreateMetricDefinitionDto, actorId: string) {
    if (await this.prisma.metricDefinition.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Metric code already exists' });
    }
    const def = await this.prisma.metricDefinition.create({
      data: { code: dto.code, name: dto.name, unit: dto.unit, direction: dto.direction, isActive: dto.isActive ?? true },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'metric_definition', entityId: def.id, after: def });
    return def;
  }

  async updateMetricDef(id: string, dto: UpdateMetricDefinitionDto, actorId: string) {
    const before = await this.getDefOrThrow(id);
    const after = await this.prisma.metricDefinition.update({ where: { id }, data: dto });
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'metric_definition', entityId: id, before, after });
    return after;
  }

  async deleteMetricDef(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getDefOrThrow(id);
    await this.prisma.metricDefinition.update({ where: { id }, data: { isActive: false } });
    await this.audit.record({ actorId, action: AuditAction.DELETE, entityType: 'metric_definition', entityId: id, before });
    return { message: 'Metric definition deactivated' };
  }

  // ═══════════════ records + summary ═══════════════
  listRecords(filters: { departmentId?: string; metricDefinitionId?: string }) {
    const where: Prisma.DiversityMetricRecordWhereInput = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.metricDefinitionId) where.metricDefinitionId = filters.metricDefinitionId;
    return this.prisma.diversityMetricRecord.findMany({
      where,
      include: { metricDefinition: true },
      orderBy: { period: 'desc' },
    });
  }

  async createRecord(dto: CreateDiversityRecordDto, actorId: string) {
    await this.getDefOrThrow(dto.metricDefinitionId);
    const record = await this.prisma.diversityMetricRecord.create({
      data: {
        departmentId: dto.departmentId,
        metricDefinitionId: dto.metricDefinitionId,
        period: new Date(dto.period),
        value: dto.value,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'diversity_record', entityId: record.id, after: record });
    return record;
  }

  /** Per-metric averages for a period — feeds the Social pillar diversity_index. */
  async summary(period?: string) {
    const where: Prisma.DiversityMetricRecordWhereInput = {};
    if (period) {
      const start = new Date(`${period}-01T00:00:00Z`);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      where.period = { gte: start, lt: end };
    }
    const grouped = await this.prisma.diversityMetricRecord.groupBy({
      by: ['metricDefinitionId'],
      where,
      _avg: { value: true },
      _count: { _all: true },
    });
    const defs = await this.prisma.metricDefinition.findMany();
    const defById = new Map(defs.map((d) => [d.id, d]));
    return grouped.map((g) => ({
      metricDefinitionId: g.metricDefinitionId,
      code: defById.get(g.metricDefinitionId)?.code,
      name: defById.get(g.metricDefinitionId)?.name,
      direction: defById.get(g.metricDefinitionId)?.direction,
      average: Number(g._avg.value ?? 0),
      count: g._count._all,
    }));
  }

  private async getDefOrThrow(id: string): Promise<MetricDefinition> {
    const def = await this.prisma.metricDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Metric definition not found' });
    return def;
  }
}
