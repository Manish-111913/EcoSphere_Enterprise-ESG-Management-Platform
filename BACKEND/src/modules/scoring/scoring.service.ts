import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { LookupService } from '../../core/lookups/lookup.service';
import { AuditService } from '../../core/audit/audit.service';

interface Normalization {
  min: number;
  max: number;
  direction: 'higher_better' | 'lower_better';
}
interface MetricConfig {
  pillar: 'E' | 'S' | 'G';
  metricCode: string;
  weight: number;
  normalization: Normalization;
}
interface MetricResult {
  raw: number | null;
  normalized: number; // metric score 0..100
  weight: number;
  missing: boolean;
}
type Breakdown = Record<'environmental' | 'social' | 'governance', Record<string, MetricResult>>;

export interface DepartmentScoreResult {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  totalScore: number;
  weightSnapshot: { environmental: number; social: number; governance: number };
  metricBreakdown: Breakdown;
}

export interface OrgScore {
  total: number;
  e: number;
  s: number;
  g: number;
  weights: { environmental: number; social: number; governance: number };
}

const PILLAR_KEY: Record<'E' | 'S' | 'G', keyof Breakdown> = {
  E: 'environmental',
  S: 'social',
  G: 'governance',
};

/**
 * Scoring engine (W9/W10) — implements the A7.1 formulas verbatim. Every number
 * is reproducible by hand from the metric_breakdown stored on each row.
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly audit: AuditService,
  ) {}

  private clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
  }
  private round1(n: number): number {
    return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
  }

  /** Shared normalization (A7.1): n = clamp((v−min)/(max−min),0,1); lower_better → 1−n; score = n×100. */
  private normalize(v: number, norm: Normalization): number {
    const span = norm.max - norm.min;
    let n = span === 0 ? 0 : this.clamp01((v - norm.min) / span);
    if (norm.direction === 'lower_better') n = 1 - n;
    return n * 100;
  }

  // ═══════════════ recompute ═══════════════
  async recompute(
    periodStart: Date,
    periodEnd: Date,
    actorId: string | null,
  ): Promise<{ period: { start: Date; end: Date }; org: OrgScore; departments: DepartmentScoreResult[] }> {
    const [weightConfig, configs, departments] = await Promise.all([
      this.activeWeightConfig(),
      this.scoringConfigs(),
      this.prisma.department.findMany({ where: { deletedAt: null, isActive: true } }),
    ]);
    const missingDefault = this.settings.getNumber('scoring_missing_default', 50);

    const results: DepartmentScoreResult[] = [];
    for (const dept of departments) {
      const r = await this.computeDepartment(dept.id, dept.name, configs, weightConfig, missingDefault, periodStart, periodEnd);
      results.push(r);

      await this.prisma.departmentScore.upsert({
        where: { departmentId_periodStart_periodEnd: { departmentId: dept.id, periodStart, periodEnd } },
        create: {
          departmentId: dept.id,
          periodStart,
          periodEnd,
          environmentalScore: r.environmentalScore,
          socialScore: r.socialScore,
          governanceScore: r.governanceScore,
          totalScore: r.totalScore,
          weightConfigSnapshot: r.weightSnapshot as unknown as Prisma.InputJsonValue,
          metricBreakdown: r.metricBreakdown as unknown as Prisma.InputJsonValue,
        },
        update: {
          environmentalScore: r.environmentalScore,
          socialScore: r.socialScore,
          governanceScore: r.governanceScore,
          totalScore: r.totalScore,
          weightConfigSnapshot: r.weightSnapshot as unknown as Prisma.InputJsonValue,
          metricBreakdown: r.metricBreakdown as unknown as Prisma.InputJsonValue,
          computedAt: new Date(),
        },
      });
    }

    const org = this.orgFrom(results, weightConfig);
    await this.audit.record({ actorId, action: AuditAction.UPDATE, entityType: 'department_scores', entityId: 'recompute', after: { period: { periodStart, periodEnd }, org } });
    this.logger.log(`recomputed ${results.length} department scores; org total=${org.total}`);
    return { period: { start: periodStart, end: periodEnd }, org, departments: results };
  }

  /** Org score from a set of department results, weighted per dept_weight_basis. */
  private orgFrom(
    results: DepartmentScoreResult[],
    weights: { environmental: number; social: number; governance: number },
  ): OrgScore {
    const basis = this.settings.getString('dept_weight_basis', 'employee_count');
    let sumW = 0, sumTotal = 0, sumE = 0, sumS = 0, sumG = 0;
    for (const r of results) {
      const w = basis === 'employee_count' ? r.employeeCount : 1;
      sumW += w;
      sumTotal += r.totalScore * w;
      sumE += r.environmentalScore * w;
      sumS += r.socialScore * w;
      sumG += r.governanceScore * w;
    }
    if (sumW === 0) return { total: 0, e: 0, s: 0, g: 0, weights };
    return {
      total: this.round1(sumTotal / sumW),
      e: this.round1(sumE / sumW),
      s: this.round1(sumS / sumW),
      g: this.round1(sumG / sumW),
      weights,
    };
  }

  /** Org score from the most recently computed period (used by dashboards). */
  async orgScoreLatest(): Promise<OrgScore | null> {
    const latest = await this.prisma.departmentScore.findFirst({ orderBy: { computedAt: 'desc' }, select: { periodStart: true, periodEnd: true } });
    if (!latest) return null;
    const rows = await this.prisma.departmentScore.findMany({
      where: { periodStart: latest.periodStart, periodEnd: latest.periodEnd },
    });
    const weightConfig = await this.activeWeightConfig();
    const basis = this.settings.getString('dept_weight_basis', 'employee_count');
    const deptEmp = new Map<string, number>();
    if (basis === 'employee_count') {
      const depts = await this.prisma.department.findMany({ select: { id: true, employeeCount: true } });
      depts.forEach((d) => deptEmp.set(d.id, d.employeeCount));
    }
    let sumW = 0, sumTotal = 0, sumE = 0, sumS = 0, sumG = 0;
    for (const r of rows) {
      const w = basis === 'employee_count' ? (deptEmp.get(r.departmentId) ?? 0) : 1;
      sumW += w;
      sumTotal += Number(r.totalScore) * w;
      sumE += Number(r.environmentalScore) * w;
      sumS += Number(r.socialScore) * w;
      sumG += Number(r.governanceScore) * w;
    }
    if (sumW === 0) return { total: 0, e: 0, s: 0, g: 0, weights: weightConfig };
    return {
      total: this.round1(sumTotal / sumW),
      e: this.round1(sumE / sumW),
      s: this.round1(sumS / sumW),
      g: this.round1(sumG / sumW),
      weights: weightConfig,
    };
  }

  // ═══════════════ per-department computation ═══════════════
  private async computeDepartment(
    deptId: string,
    deptName: string,
    configs: MetricConfig[],
    weights: { environmental: number; social: number; governance: number },
    missingDefault: number,
    start: Date,
    end: Date,
  ): Promise<DepartmentScoreResult> {
    const employeeCount = await this.prisma.user.count({ where: { departmentId: deptId, isActive: true, deletedAt: null } });
    const breakdown: Breakdown = { environmental: {}, social: {}, governance: {} };
    const pillarScore: Record<'E' | 'S' | 'G', number> = { E: 0, S: 0, G: 0 };

    for (const cfg of configs) {
      const { raw, missing } = await this.rawValue(cfg.metricCode, deptId, employeeCount, start, end);
      const normalized = missing ? missingDefault : this.normalize(raw as number, cfg.normalization);
      breakdown[PILLAR_KEY[cfg.pillar]][cfg.metricCode] = {
        raw: missing ? null : this.round1(raw as number) === 0 ? (raw as number) : Number((raw as number).toFixed(4)),
        normalized: this.round1(normalized),
        weight: cfg.weight,
        missing,
      };
      pillarScore[cfg.pillar] += cfg.weight * normalized;
    }

    // pillar = Σ(weight × score)/100
    const e = this.round1(pillarScore.E / 100);
    const s = this.round1(pillarScore.S / 100);
    const g = this.round1(pillarScore.G / 100);
    // total = (E×wE + S×wS + G×wG)/100 using ACTIVE weight config (snapshot)
    const total = this.round1((e * weights.environmental + s * weights.social + g * weights.governance) / 100);

    return {
      departmentId: deptId,
      departmentName: deptName,
      employeeCount,
      environmentalScore: e,
      socialScore: s,
      governanceScore: g,
      totalScore: total,
      weightSnapshot: weights,
      metricBreakdown: breakdown,
    };
  }

  // ═══════════════ metric raw values (A7.1) ═══════════════
  private async rawValue(
    metricCode: string,
    deptId: string,
    employeeCount: number,
    start: Date,
    end: Date,
  ): Promise<{ raw: number | null; missing: boolean }> {
    switch (metricCode) {
      case 'emission_vs_goal':
        return this.emissionVsGoal(deptId, employeeCount, start, end);
      case 'csr_participation_rate':
        return this.rate(await this.distinctApprovedCsr(deptId, start, end), employeeCount);
      case 'training_completion':
        return this.rate(await this.distinctCompletedTraining(deptId, start, end), employeeCount);
      case 'diversity_index':
        return this.diversityIndex(deptId, start, end);
      case 'policy_ack_rate':
        return this.policyAckRate(deptId, employeeCount, start, end);
      case 'audit_score':
        return this.auditScore(deptId, start, end);
      case 'open_issue_penalty':
        return this.openIssuePenalty(deptId);
      default:
        return { raw: null, missing: true };
    }
  }

  private rate(numerator: number, denominator: number): { raw: number; missing: boolean } {
    return { raw: denominator > 0 ? (numerator / denominator) * 100 : 0, missing: false };
  }

  private async emissionVsGoal(deptId: string, employeeCount: number, start: Date, end: Date): Promise<{ raw: number | null; missing: boolean }> {
    const goal = await this.prisma.environmentalGoal.findFirst({
      where: { departmentId: deptId, deletedAt: null, periodStart: { lte: end }, periodEnd: { gte: start } },
      orderBy: { periodStart: 'desc' },
    });
    const co2e = await this.deptCo2e(deptId, start, end);
    if (goal && Number(goal.targetValue) > 0) {
      return { raw: co2e / Number(goal.targetValue), missing: false }; // ratio
    }
    // fallback: kg CO2e per employee
    return { raw: employeeCount > 0 ? co2e / employeeCount : 0, missing: false };
  }

  private async deptCo2e(deptId: string, start: Date, end: Date): Promise<number> {
    const agg = await this.prisma.carbonTransaction.aggregate({
      where: { departmentId: deptId, deletedAt: null, occurredAt: { gte: start, lte: end } },
      _sum: { co2eKg: true },
    });
    return Number(agg._sum.co2eKg ?? 0);
  }

  private async distinctApprovedCsr(deptId: string, start: Date, end: Date): Promise<number> {
    const approved = this.lookups.id('CSR_PARTICIPATION_STATUS', 'APPROVED');
    const rows = await this.prisma.csrParticipation.findMany({
      where: { statusId: approved, employee: { departmentId: deptId }, completionDate: { gte: start, lte: end } },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    return rows.length;
  }

  private async distinctCompletedTraining(deptId: string, start: Date, end: Date): Promise<number> {
    const rows = await this.prisma.trainingRecord.findMany({
      where: { employee: { departmentId: deptId }, completedAt: { gte: start, lte: end } },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    return rows.length;
  }

  private async diversityIndex(deptId: string, start: Date, end: Date): Promise<{ raw: number | null; missing: boolean }> {
    const records = await this.prisma.diversityMetricRecord.findMany({
      where: { departmentId: deptId, period: { gte: start, lte: end } },
      include: { metricDefinition: true },
    });
    if (records.length === 0) return { raw: null, missing: true };
    // Normalize each record value (assume 0..100 range) by its definition's direction.
    const normalized = records
      .filter((r) => r.metricDefinition.isActive)
      .map((r) => {
        let n = this.clamp01(Number(r.value) / 100);
        if (r.metricDefinition.direction === 'lower_better') n = 1 - n;
        return n;
      });
    if (normalized.length === 0) return { raw: null, missing: true };
    const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;
    return { raw: avg * 100, missing: false };
  }

  private async policyAckRate(deptId: string, employeeCount: number, start: Date, end: Date): Promise<{ raw: number | null; missing: boolean }> {
    const published = this.lookups.id('POLICY_STATUS', 'PUBLISHED');
    const employees = await this.prisma.user.findMany({ where: { departmentId: deptId, isActive: true, deletedAt: null }, select: { id: true } });
    const policies = await this.prisma.esgPolicy.findMany({
      where: {
        statusId: published, deletedAt: null,
        acknowledgementDeadline: { lte: end },
        OR: [{ audience: 'ALL' }, { audience: 'DEPARTMENT', audienceDepartmentId: deptId }],
      },
      select: { id: true, version: true },
    });
    if (policies.length === 0 || employees.length === 0) return { raw: null, missing: true };
    const empIds = new Set(employees.map((e) => e.id));
    const acks = await this.prisma.policyAcknowledgement.findMany({
      where: { policyId: { in: policies.map((p) => p.id) }, employeeId: { in: [...empIds] } },
      select: { policyId: true, policyVersion: true, employeeId: true },
    });
    const validPolicyVersion = new Map(policies.map((p) => [p.id, p.version]));
    const ackCount = acks.filter((a) => validPolicyVersion.get(a.policyId) === a.policyVersion).length;
    const denom = policies.length * employees.length;
    return { raw: denom > 0 ? (ackCount / denom) * 100 : 0, missing: false };
  }

  private async auditScore(deptId: string, start: Date, end: Date): Promise<{ raw: number | null; missing: boolean }> {
    const completed = this.lookups.id('AUDIT_STATUS', 'COMPLETED');
    const audits = await this.prisma.governanceAudit.findMany({
      where: {
        statusId: completed, deletedAt: null,
        actualEnd: { gte: start, lte: end },
        OR: [{ departmentId: deptId }, { departmentId: null }], // dept-scoped or org-wide
        auditScore: { not: null },
      },
      select: { auditScore: true },
    });
    if (audits.length === 0) return { raw: null, missing: true };
    const avg = audits.reduce((a, b) => a + (b.auditScore ?? 0), 0) / audits.length;
    return { raw: avg, missing: false };
  }

  private async openIssuePenalty(deptId: string): Promise<{ raw: number; missing: boolean }> {
    const resolved = this.lookups.id('ISSUE_STATUS', 'RESOLVED');
    const closed = this.lookups.id('ISSUE_STATUS', 'CLOSED');
    const employees = await this.prisma.user.findMany({ where: { departmentId: deptId, deletedAt: null }, select: { id: true } });
    if (employees.length === 0) return { raw: 0, missing: false };
    const issues = await this.prisma.complianceIssue.findMany({
      where: { ownerId: { in: employees.map((e) => e.id) }, statusId: { notIn: [resolved, closed] } },
      select: { severityId: true, isOverdue: true },
    });
    let penalty = 0;
    for (const issue of issues) {
      const meta = this.lookups.byIdOrNull(issue.severityId)?.metadata as { weight?: number } | null;
      const weight = meta?.weight ?? 1;
      penalty += issue.isOverdue ? weight * 2 : weight; // overdue counts double
    }
    return { raw: penalty, missing: false };
  }

  // ═══════════════ config loaders ═══════════════
  private async activeWeightConfig(): Promise<{ environmental: number; social: number; governance: number }> {
    const cfg = await this.prisma.esgWeightConfig.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } });
    if (!cfg) return { environmental: 40, social: 30, governance: 30 };
    return { environmental: cfg.environmentalWeight, social: cfg.socialWeight, governance: cfg.governanceWeight };
  }

  private async scoringConfigs(): Promise<MetricConfig[]> {
    const rows = await this.prisma.scoringConfig.findMany({ where: { isActive: true } });
    return rows.map((r) => ({
      pillar: r.pillar as 'E' | 'S' | 'G',
      metricCode: r.metricCode,
      weight: r.weight,
      normalization: r.normalization as unknown as Normalization,
    }));
  }
}
