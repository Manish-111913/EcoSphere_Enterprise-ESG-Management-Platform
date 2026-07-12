import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { LookupService } from '../../core/lookups/lookup.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ScoringService } from '../scoring/scoring.service';

const UNSCOPED_ROLES = ['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Auditor'];
const FEED_ACTIONS: AuditAction[] = [
  AuditAction.CREATE,
  AuditAction.APPROVE,
  AuditAction.REJECT,
  AuditAction.TRANSITION,
  AuditAction.REDEEM,
];

export interface Kpi {
  code: string;
  label: string;
  value: number;
  delta: number | null;
  sparkline: number[];
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class DashboardService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
    private readonly scoring: ScoringService,
  ) {}

  /** Dept Head is scoped to their own department (spec §A6.8). */
  private scopeDept(user: AuthenticatedUser): string | null {
    if (user.roleNames.some((r) => UNSCOPED_ROLES.includes(r))) return null;
    return user.departmentId;
  }

  private async cached<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.data as T;
    const data = await producer();
    const ttl = this.settings.getNumber('dashboard_cache_ttl', 60) * 1000;
    this.cache.set(key, { data, expiresAt: now + ttl });
    return data;
  }

  // ═══════════════ summary ═══════════════
  async summary(user: AuthenticatedUser) {
    const deptId = this.scopeDept(user);
    return this.cached(`summary:${deptId ?? 'all'}`, async () => {
      const [orgEsgScore, kpis, pending, openIssues, overdueIssues] = await Promise.all([
        this.esgScore(deptId),
        this.kpis(deptId),
        this.pendingApprovalsCount(user),
        this.openIssuesCount(deptId),
        this.overdueIssuesCount(deptId),
      ]);
      return {
        kpis,
        orgEsgScore,
        pendingApprovalsCount: pending,
        openIssuesCount: openIssues,
        overdueIssuesCount: overdueIssues,
      };
    });
  }

  private async esgScore(deptId: string | null) {
    if (!deptId) {
      const org = await this.scoring.orgScoreLatest();
      return org ?? { total: 0, e: 0, s: 0, g: 0, weights: { environmental: 40, social: 30, governance: 30 } };
    }
    const row = await this.prisma.departmentScore.findFirst({ where: { departmentId: deptId }, orderBy: { periodEnd: 'desc' } });
    if (!row) return { total: 0, e: 0, s: 0, g: 0, weights: { environmental: 40, social: 30, governance: 30 } };
    return {
      total: Number(row.totalScore),
      e: Number(row.environmentalScore),
      s: Number(row.socialScore),
      g: Number(row.governanceScore),
      weights: row.weightConfigSnapshot,
    };
  }

  private async kpis(deptId: string | null): Promise<Kpi[]> {
    const deptFilter = deptId ? { departmentId: deptId } : {};
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);

    const [co2eCur, co2ePrev, sparkline] = await Promise.all([
      this.sumCo2e({ ...deptFilter, occurredAt: { gte: d30, lte: now } }),
      this.sumCo2e({ ...deptFilter, occurredAt: { gte: d60, lt: d30 } }),
      this.monthlyCo2e(deptId, 6),
    ]);

    const csrApproved = this.lookups.id('CSR_PARTICIPATION_STATUS', 'APPROVED');
    const empWhere = deptId ? { employee: { departmentId: deptId } } : {};
    const [csrCur, csrPrev] = await Promise.all([
      this.prisma.csrParticipation.count({ where: { statusId: csrApproved, ...empWhere, decidedAt: { gte: d30, lte: now } } }),
      this.prisma.csrParticipation.count({ where: { statusId: csrApproved, ...empWhere, decidedAt: { gte: d60, lt: d30 } } }),
    ]);

    return [
      { code: 'carbon_30d', label: 'Carbon (kg CO₂e, 30d)', value: this.round(co2eCur), delta: this.delta(co2eCur, co2ePrev), sparkline },
      { code: 'csr_approvals_30d', label: 'CSR approvals (30d)', value: csrCur, delta: this.delta(csrCur, csrPrev), sparkline: [] },
      { code: 'open_issues', label: 'Open issues', value: await this.openIssuesCount(deptId), delta: null, sparkline: [] },
    ];
  }

  // ═══════════════ trends ═══════════════
  async carbonTrend(months: number, departmentId: string | undefined, user: AuthenticatedUser) {
    const deptId = this.scopeDept(user) ?? departmentId ?? null;
    return this.cached(`carbon-trend:${deptId ?? 'all'}:${months}`, async () => ({
      months,
      series: await this.monthlyCo2eLabeled(deptId, months),
    }));
  }

  async csrTrend(months: number, user: AuthenticatedUser) {
    const deptId = this.scopeDept(user);
    return this.cached(`csr-trend:${deptId ?? 'all'}:${months}`, async () => {
      const approved = this.lookups.id('CSR_PARTICIPATION_STATUS', 'APPROVED');
      const deptFrag = deptId ? Prisma.sql`AND u.department_id = ${deptId}::uuid` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<{ month: string; count: number }[]>(Prisma.sql`
        SELECT to_char(cp.decided_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM csr_participations cp JOIN users u ON u.id = cp.employee_id
        WHERE cp.status_id = ${approved}::uuid AND cp.decided_at >= (now() - (${months} || ' months')::interval) ${deptFrag}
        GROUP BY 1 ORDER BY 1`);
      return { months, series: rows };
    });
  }

  async departmentRankings(user: AuthenticatedUser) {
    return this.cached(`dept-rankings`, async () => {
      const latest = await this.prisma.departmentScore.findFirst({ orderBy: { computedAt: 'desc' }, select: { periodStart: true, periodEnd: true } });
      if (!latest) return [];
      const rows = await this.prisma.departmentScore.findMany({
        where: { periodStart: latest.periodStart, periodEnd: latest.periodEnd },
        orderBy: { totalScore: 'desc' },
      });
      const depts = await this.prisma.department.findMany({ select: { id: true, name: true } });
      const nameById = new Map(depts.map((d) => [d.id, d.name]));
      return rows.map((r, i) => ({
        rank: i + 1,
        departmentId: r.departmentId,
        name: nameById.get(r.departmentId) ?? r.departmentId,
        total: Number(r.totalScore),
        e: Number(r.environmentalScore),
        s: Number(r.socialScore),
        g: Number(r.governanceScore),
      }));
    });
  }

  async activityFeed(limit: number, user: AuthenticatedUser) {
    const rows = await this.prisma.auditLog.findMany({
      where: { action: { in: FEED_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      actorId: r.actorId,
      createdAt: r.createdAt,
    }));
  }

  // ═══════════════ pending approvals ═══════════════
  private async approvalScopes(user: AuthenticatedUser): Promise<{ csr: 'ALL' | 'DEPT' | 'NONE'; challenge: 'ALL' | 'DEPT' | 'NONE' }> {
    if (user.roleNames.includes('Admin')) return { csr: 'ALL', challenge: 'ALL' };
    const rules = await this.prisma.approvalRule.findMany({ where: { isActive: true } });
    const scopeFor = (entity: 'CSR_PARTICIPATION' | 'CHALLENGE_PARTICIPATION'): 'ALL' | 'DEPT' | 'NONE' => {
      const mine = rules.filter((r) => r.entityType === entity && user.roleIds.includes(r.approverRoleId));
      if (mine.some((r) => r.scope === 'ANY')) return 'ALL';
      if (mine.some((r) => r.scope === 'SAME_DEPARTMENT')) return 'DEPT';
      return 'NONE';
    };
    return { csr: scopeFor('CSR_PARTICIPATION'), challenge: scopeFor('CHALLENGE_PARTICIPATION') };
  }

  async pendingApprovals(user: AuthenticatedUser) {
    const scopes = await this.approvalScopes(user);
    const csrSubmitted = this.lookups.id('CSR_PARTICIPATION_STATUS', 'SUBMITTED');
    const chSubmitted = this.lookups.id('CHALLENGE_PARTICIPATION_STATUS', 'SUBMITTED');

    const csr = scopes.csr === 'NONE' ? [] : await this.prisma.csrParticipation.findMany({
      where: { statusId: csrSubmitted, ...(scopes.csr === 'DEPT' ? { employee: { departmentId: user.departmentId } } : {}) },
      include: { activity: { select: { title: true } }, employee: { select: { firstName: true, lastName: true } } },
      take: 100,
    });
    const challenge = scopes.challenge === 'NONE' ? [] : await this.prisma.challengeParticipation.findMany({
      where: { statusId: chSubmitted, ...(scopes.challenge === 'DEPT' ? { employee: { departmentId: user.departmentId } } : {}) },
      include: { challenge: { select: { title: true } }, employee: { select: { firstName: true, lastName: true } } },
      take: 100,
    });
    return {
      csr: csr.map((c) => ({ id: c.id, type: 'CSR', title: c.activity.title, employee: `${c.employee.firstName} ${c.employee.lastName}` })),
      challenge: challenge.map((c) => ({ id: c.id, type: 'CHALLENGE', title: c.challenge.title, employee: `${c.employee.firstName} ${c.employee.lastName}` })),
    };
  }

  private async pendingApprovalsCount(user: AuthenticatedUser): Promise<number> {
    const p = await this.pendingApprovals(user);
    return p.csr.length + p.challenge.length;
  }

  // ═══════════════ helpers ═══════════════
  private async deptOwnerFilter(deptId: string | null): Promise<{ ownerId?: { in: string[] } }> {
    if (!deptId) return {};
    const users = await this.prisma.user.findMany({ where: { departmentId: deptId, deletedAt: null }, select: { id: true } });
    return { ownerId: { in: users.map((u) => u.id) } };
  }

  private async openIssuesCount(deptId: string | null): Promise<number> {
    const open = this.lookups.id('ISSUE_STATUS', 'OPEN');
    const inProgress = this.lookups.id('ISSUE_STATUS', 'IN_PROGRESS');
    return this.prisma.complianceIssue.count({ where: { statusId: { in: [open, inProgress] }, ...(await this.deptOwnerFilter(deptId)) } });
  }

  private async overdueIssuesCount(deptId: string | null): Promise<number> {
    return this.prisma.complianceIssue.count({ where: { isOverdue: true, ...(await this.deptOwnerFilter(deptId)) } });
  }

  private async sumCo2e(where: Prisma.CarbonTransactionWhereInput): Promise<number> {
    const agg = await this.prisma.carbonTransaction.aggregate({ where: { deletedAt: null, ...where }, _sum: { co2eKg: true } });
    return Number(agg._sum.co2eKg ?? 0);
  }

  private async monthlyCo2e(deptId: string | null, months: number): Promise<number[]> {
    const rows = await this.monthlyCo2eLabeled(deptId, months);
    return rows.map((r) => r.total);
  }

  private async monthlyCo2eLabeled(deptId: string | null, months: number): Promise<{ month: string; total: number }[]> {
    const deptFrag = deptId ? Prisma.sql`AND department_id = ${deptId}::uuid` : Prisma.empty;
    return this.prisma.$queryRaw<{ month: string; total: number }[]>(Prisma.sql`
      SELECT to_char(occurred_at, 'YYYY-MM') AS month, SUM(co2e_kg)::float AS total
      FROM carbon_transactions
      WHERE deleted_at IS NULL AND occurred_at >= (now() - (${months} || ' months')::interval) ${deptFrag}
      GROUP BY 1 ORDER BY 1`);
  }

  private delta(current: number, previous: number): number | null {
    if (previous === 0) return null; // render "—" (spec §A7.1 KPI delta rule)
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private round(n: number): number {
    return Math.round(n * 10) / 10;
  }
}
