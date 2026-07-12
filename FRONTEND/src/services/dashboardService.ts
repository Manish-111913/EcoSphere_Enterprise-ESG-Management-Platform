import { api } from './apiClient';
import { EsgDetails, CarbonTrendData, DepartmentRanking } from '../mocks/dashboardData';
import { StatCardData, PendingApproval, ActivityFeedItem, NotificationItem, User, UserRole } from '../types';

interface SummaryResponse {
  kpis: { code: string; label: string; value: number; delta: number | null; sparkline: number[] }[];
  orgEsgScore: { total: number; e: number; s: number; g: number; weights: { environmental: number; social: number; governance: number } };
  pendingApprovalsCount: number;
  openIssuesCount: number;
  overdueIssuesCount: number;
}

const avatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D9488&color=fff`;

function fmtDelta(delta: number | null): { delta: string; isPositive: boolean } {
  if (delta === null || delta === undefined) return { delta: '—', isPositive: true };
  return { delta: `${delta > 0 ? '+' : ''}${delta}%`, isPositive: delta >= 0 };
}

export const dashboardService = {
  async getStatCards(): Promise<StatCardData[]> {
    const s = await api.get<SummaryResponse>('/dashboard/summary');
    return s.kpis.map((k) => {
      const d = fmtDelta(k.delta);
      return { id: k.code, title: k.label, value: String(k.value), delta: d.delta, isPositive: d.isPositive, sparkline: k.sparkline ?? [] };
    });
  },

  async getEsgScoreDetails(): Promise<EsgDetails> {
    const s = await api.get<SummaryResponse>('/dashboard/summary');
    const o = s.orgEsgScore;
    return { total: o.total, environmental: o.e, social: o.s, governance: o.g, weights: o.weights };
  },

  async getCarbonTrend(): Promise<CarbonTrendData[]> {
    const res = await api.get<{ series: { month: string; total: number }[] }>('/dashboard/carbon-trend?months=12');
    return res.series.map((p) => ({ month: p.month, actual: Math.round(p.total), goal: Math.round(p.total * 0.9) }));
  },

  async getDepartmentRankings(): Promise<DepartmentRanking[]> {
    const rows = await api.get<{ name: string; total: number; e: number; s: number; g: number }[]>('/dashboard/department-rankings');
    return rows.map((r) => ({ department: r.name, score: r.total, environmental: r.e, social: r.s, governance: r.g }));
  },

  async getPendingApprovals(): Promise<PendingApproval[]> {
    const res = await api.get<{ csr: { id: string; title: string; employee: string }[]; challenge: { id: string; title: string; employee: string }[] }>('/dashboard/pending-approvals');
    const csr: PendingApproval[] = res.csr.map((c) => ({
      id: c.id, type: 'csr', title: c.title, subtitle: 'CSR participation', user: { name: c.employee, avatar: avatar(c.employee), department: '' }, timestamp: new Date().toISOString(), details: {},
    }));
    const challenge: PendingApproval[] = res.challenge.map((c) => ({
      id: c.id, type: 'challenge', title: c.title, subtitle: 'Challenge submission', user: { name: c.employee, avatar: avatar(c.employee), department: '' }, timestamp: new Date().toISOString(), details: {},
    }));
    return [...csr, ...challenge];
  },

  async getRecentActivities(): Promise<ActivityFeedItem[]> {
    const rows = await api.get<{ id: string; action: string; entityType: string | null; createdAt: string }[]>('/dashboard/activity-feed?limit=15');
    const typeFor = (a: string): ActivityFeedItem['type'] =>
      a === 'REDEEM' ? 'transaction' : a === 'APPROVE' ? 'challenge_completed' : a === 'TRANSITION' ? 'compliance_resolved' : 'transaction';
    return rows.map((r) => ({
      id: r.id,
      type: typeFor(r.action),
      title: `${r.action} ${r.entityType ?? ''}`.trim(),
      subtitle: r.entityType ?? '',
      time: r.createdAt,
      user: { name: 'System', avatar: avatar('System') },
      pillar: 'General',
    }));
  },

  async getNotifications(): Promise<NotificationItem[]> {
    const res = await api.get<{ data: { id: string; title: string; body: string | null; eventCode: string | null; isRead: boolean; createdAt: string }[] }>('/notifications');
    const typeFor = (e: string | null): NotificationItem['type'] =>
      e === 'issue.overdue' ? 'danger' : e === 'policy.reminder' ? 'warning' : e && (e.includes('decided') || e.includes('awarded')) ? 'success' : 'info';
    return res.data.map((n) => ({ id: n.id, title: n.title, description: n.body ?? '', time: n.createdAt, read: n.isRead, type: typeFor(n.eventCode) }));
  },

  async getUserByRole(role: UserRole): Promise<User> {
    const me = await api.get<{ user: { firstName: string; lastName: string; email: string } }>('/auth/me');
    const name = `${me.user.firstName} ${me.user.lastName}`.trim();
    return { name, email: me.user.email, avatar: avatar(name), role, points: 0, level: 1, xp: 0 };
  },
};
