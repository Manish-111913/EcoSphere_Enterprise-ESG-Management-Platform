import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Prisma, ReportFormat } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LookupService } from '../../core/lookups/lookup.service';
import { StorageService } from '../../core/storage/storage.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateTemplateDto, CustomReportDto, ReportFiltersDto } from './dto/report.dto';

export interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

const UNSCOPED_ROLES = ['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Auditor'];

// Per-module column whitelist for the custom builder (spec §A6.9).
const CUSTOM_WHITELIST: Record<string, string[]> = {
  carbon: ['occurredAt', 'departmentId', 'co2eKg', 'quantity', 'calculationMode', 'emissionFactorId'],
  csr: ['csrActivityId', 'employeeId', 'statusId', 'pointsEarned', 'completionDate'],
  issues: ['title', 'severityId', 'ownerId', 'statusId', 'dueDate', 'isOverdue'],
  challenges: ['title', 'categoryId', 'xpValue', 'statusId', 'deadline'],
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lookups: LookupService,
    private readonly storage: StorageService,
  ) {}

  /** Dept Head → own department only (spec §A6.9). */
  private forceDept(user: AuthenticatedUser, filters: ReportFiltersDto): string | undefined {
    if (user.roleNames.some((r) => UNSCOPED_ROLES.includes(r))) return filters.department;
    return user.departmentId;
  }

  private dateRange(f: ReportFiltersDto): { gte?: Date; lte?: Date } | undefined {
    if (!f.dateFrom && !f.dateTo) return undefined;
    const r: { gte?: Date; lte?: Date } = {};
    if (f.dateFrom) r.gte = new Date(f.dateFrom);
    if (f.dateTo) r.lte = new Date(f.dateTo);
    return r;
  }

  // ═══════════════ standard reports ═══════════════
  async environmental(f: ReportFiltersDto, user: AuthenticatedUser): Promise<ReportResult> {
    const dept = this.forceDept(user, f);
    const where: Prisma.CarbonTransactionWhereInput = { deletedAt: null };
    if (dept) where.departmentId = dept;
    const range = this.dateRange(f);
    if (range) where.occurredAt = range;
    if (f.esgCategory) where.emissionFactor = { category: f.esgCategory };
    const rows = await this.prisma.carbonTransaction.findMany({
      where,
      include: { emissionFactor: { select: { category: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 1000,
    });
    return {
      columns: ['occurredAt', 'departmentId', 'category', 'quantity', 'co2eKg', 'mode'],
      rows: rows.map((r) => ({
        occurredAt: r.occurredAt.toISOString().slice(0, 10),
        departmentId: r.departmentId,
        category: r.emissionFactor.category,
        quantity: Number(r.quantity),
        co2eKg: Number(r.co2eKg),
        mode: r.calculationMode,
      })),
    };
  }

  async social(f: ReportFiltersDto, user: AuthenticatedUser): Promise<ReportResult> {
    const dept = this.forceDept(user, f);
    const where: Prisma.CsrParticipationWhereInput = {};
    if (dept) where.employee = { departmentId: dept };
    if (f.employee) where.employeeId = f.employee;
    const range = this.dateRange(f);
    if (range) where.createdAt = range;
    const rows = await this.prisma.csrParticipation.findMany({
      where,
      include: { activity: { select: { title: true } }, employee: { select: { firstName: true, lastName: true, departmentId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return {
      columns: ['activity', 'employee', 'departmentId', 'status', 'pointsEarned'],
      rows: rows.map((r) => ({
        activity: r.activity.title,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        departmentId: r.employee.departmentId,
        status: this.lookups.byIdOrNull(r.statusId)?.label ?? null,
        pointsEarned: r.pointsEarned ?? 0,
      })),
    };
  }

  async governance(f: ReportFiltersDto, user: AuthenticatedUser): Promise<ReportResult> {
    const dept = this.forceDept(user, f);
    const where: Prisma.ComplianceIssueWhereInput = {};
    if (dept) where.ownerId = { in: await this.deptUserIds(dept) };
    const range = this.dateRange(f);
    if (range) where.raisedDate = range;
    const rows = await this.prisma.complianceIssue.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: 1000,
    });
    const owners = await this.userNames(rows.map((r) => r.ownerId));
    return {
      columns: ['title', 'severity', 'owner', 'status', 'dueDate', 'isOverdue'],
      rows: rows.map((r) => ({
        title: r.title,
        severity: this.lookups.byIdOrNull(r.severityId)?.label ?? null,
        owner: owners.get(r.ownerId) ?? null,
        status: this.lookups.byIdOrNull(r.statusId)?.label ?? null,
        dueDate: r.dueDate.toISOString().slice(0, 10),
        isOverdue: r.isOverdue,
      })),
    };
  }

  async summary(f: ReportFiltersDto, user: AuthenticatedUser): Promise<ReportResult> {
    const dept = this.forceDept(user, f);
    const latest = await this.prisma.departmentScore.findFirst({ orderBy: { computedAt: 'desc' }, select: { periodStart: true, periodEnd: true } });
    if (!latest) return { columns: ['department', 'e', 's', 'g', 'total'], rows: [] };
    const rows = await this.prisma.departmentScore.findMany({
      where: { periodStart: latest.periodStart, periodEnd: latest.periodEnd, ...(dept ? { departmentId: dept } : {}) },
      orderBy: { totalScore: 'desc' },
    });
    const names = await this.deptNames(rows.map((r) => r.departmentId));
    return {
      columns: ['department', 'e', 's', 'g', 'total'],
      rows: rows.map((r) => ({
        department: names.get(r.departmentId) ?? r.departmentId,
        e: Number(r.environmentalScore),
        s: Number(r.socialScore),
        g: Number(r.governanceScore),
        total: Number(r.totalScore),
      })),
    };
  }

  private async deptUserIds(deptId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({ where: { departmentId: deptId, deletedAt: null }, select: { id: true } });
    return users.map((u) => u.id);
  }

  private async userNames(ids: string[]): Promise<Map<string, string>> {
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, firstName: true, lastName: true } });
    return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }

  private async deptNames(ids: string[]): Promise<Map<string, string>> {
    const depts = await this.prisma.department.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
    return new Map(depts.map((d) => [d.id, d.name]));
  }

  async standard(report: string, f: ReportFiltersDto, user: AuthenticatedUser): Promise<ReportResult> {
    switch (report) {
      case 'environmental': return this.environmental(f, user);
      case 'social': return this.social(f, user);
      case 'governance': return this.governance(f, user);
      case 'summary': return this.summary(f, user);
      default: throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Unknown report' });
    }
  }

  // ═══════════════ custom builder ═══════════════
  async custom(dto: CustomReportDto, user: AuthenticatedUser): Promise<ReportResult> {
    const whitelist = CUSTOM_WHITELIST[dto.moduleScope];
    const invalid = dto.columns.filter((c) => !whitelist.includes(c));
    if (invalid.length) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `Columns not allowed for ${dto.moduleScope}: ${invalid.join(', ')}`, details: { allowed: whitelist } });
    }
    if (dto.groupBy && !whitelist.includes(dto.groupBy)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `groupBy not allowed: ${dto.groupBy}` });
    }
    const dept = user.roleNames.some((r) => UNSCOPED_ROLES.includes(r)) ? undefined : user.departmentId;

    if (dto.groupBy) {
      return this.customGrouped(dto, dept);
    }
    const model = this.modelFor(dto.moduleScope);
    const select = Object.fromEntries(dto.columns.map((c) => [c, true]));
    const where = this.scopeWhere(dto.moduleScope, dept);
    const rows = await (model as unknown as { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }).findMany({ where, select, take: 1000 });
    return { columns: dto.columns, rows };
  }

  private async customGrouped(dto: CustomReportDto, dept?: string): Promise<ReportResult> {
    const model = this.modelFor(dto.moduleScope);
    const where = this.scopeWhere(dto.moduleScope, dept);
    const groupArgs: Record<string, unknown> = { by: [dto.groupBy], where, _count: { _all: true } };
    if (dto.aggregation === 'sum' && dto.aggregateField) groupArgs._sum = { [dto.aggregateField]: true };
    const rows = await (model as unknown as { groupBy: (args: unknown) => Promise<Record<string, unknown>[]> }).groupBy(groupArgs);
    return {
      columns: [dto.groupBy!, dto.aggregation === 'sum' ? `sum_${dto.aggregateField}` : 'count'],
      rows: rows.map((r) => ({
        [dto.groupBy!]: r[dto.groupBy!],
        ...(dto.aggregation === 'sum'
          ? { [`sum_${dto.aggregateField}`]: Number((r._sum as Record<string, unknown>)?.[dto.aggregateField!] ?? 0) }
          : { count: (r._count as { _all: number })._all }),
      })),
    };
  }

  private modelFor(moduleScope: string): unknown {
    switch (moduleScope) {
      case 'carbon': return this.prisma.carbonTransaction;
      case 'csr': return this.prisma.csrParticipation;
      case 'issues': return this.prisma.complianceIssue;
      case 'challenges': return this.prisma.challenge;
      default: throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Unknown module' });
    }
  }

  private scopeWhere(moduleScope: string, dept?: string): Record<string, unknown> {
    if (!dept) return {};
    if (moduleScope === 'carbon') return { departmentId: dept };
    if (moduleScope === 'csr') return { employee: { departmentId: dept } };
    if (moduleScope === 'issues') return { owner: { departmentId: dept } };
    return {};
  }

  // ═══════════════ templates ═══════════════
  listTemplates(userId: string) {
    return this.prisma.reportTemplate.findMany({ where: { OR: [{ ownerId: userId }, { isShared: true }] }, orderBy: { createdAt: 'desc' } });
  }

  createTemplate(dto: CreateTemplateDto, userId: string) {
    return this.prisma.reportTemplate.create({
      data: {
        name: dto.name,
        ownerId: userId,
        moduleScope: dto.moduleScope as Prisma.InputJsonValue,
        columns: dto.columns as Prisma.InputJsonValue,
        filters: (dto.filters as Prisma.InputJsonValue) ?? undefined,
        groupBy: (dto.groupBy as Prisma.InputJsonValue) ?? undefined,
        aggregations: (dto.aggregations as Prisma.InputJsonValue) ?? undefined,
        chartType: dto.chartType,
        isShared: dto.isShared ?? false,
      },
    });
  }

  async deleteTemplate(id: string, userId: string) {
    const t = await this.prisma.reportTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    if (t.ownerId !== userId) throw new BadRequestException({ code: 'FORBIDDEN', message: 'Not your template' });
    await this.prisma.reportTemplate.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  // ═══════════════ export records ═══════════════
  createExportRecord(userId: string, format: ReportFormat, filters: unknown, fileKey: string | null, status: 'Ready' | 'Failed') {
    return this.prisma.reportExport.create({
      data: { requestedBy: userId, format, filters: (filters as Prisma.InputJsonValue) ?? undefined, fileKey, status },
    });
  }

  async getExport(id: string) {
    const e = await this.prisma.reportExport.findUnique({ where: { id } });
    if (!e) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Export not found' });
    return e;
  }

  /** Generate an export: CSV (sync), XLSX (exceljs); PDF returns 501 (spec §A6.9). */
  async export(
    report: string,
    format: 'csv' | 'xlsx' | 'pdf',
    filters: ReportFiltersDto,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string; exportId: string }> {
    if (format === 'pdf') {
      throw new NotImplementedException({
        code: 'NOT_IMPLEMENTED',
        message: 'PDF export is not implemented yet; please use CSV or XLSX',
      });
    }
    const result = await this.standard(report, filters, user);
    let buffer: Buffer;
    let mimeType: string;
    let ext: string;
    let fmt: ReportFormat;
    if (format === 'csv') {
      buffer = Buffer.from(this.toCsv(result), 'utf8');
      mimeType = 'text/csv';
      ext = 'csv';
      fmt = ReportFormat.CSV;
    } else {
      buffer = await this.toXlsx(report, result);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
      fmt = ReportFormat.XLSX;
    }
    const filename = `${report}-report.${ext}`;
    const key = this.storage.generateKey(filename);
    await this.storage.save(key, buffer);
    const record = await this.createExportRecord(user.id, fmt, filters, key, 'Ready');
    return { buffer, mimeType, filename, exportId: record.id };
  }

  private toCsv(result: ReportResult): string {
    const esc = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = result.columns.map(esc).join(',');
    const lines = result.rows.map((row) => result.columns.map((c) => esc(row[c])).join(','));
    return [header, ...lines].join('\n');
  }

  private async toXlsx(report: string, result: ReportResult): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(report);
    ws.addRow(result.columns);
    for (const row of result.rows) ws.addRow(result.columns.map((c) => row[c] as ExcelJS.CellValue));
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }
}
