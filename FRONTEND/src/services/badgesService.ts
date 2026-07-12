import { api } from './apiClient';
import { Badge, BadgeAward } from '../types';

interface BackendBadge {
  id: string; name: string; description: string | null; iconKey: string | null;
  unlockRule: { metric: string; operator: string; threshold: number };
}
interface BackendAward { id: string; badgeId: string; employeeId: string; awardedAt: string }

const OP_TO_UI: Record<string, Badge['operator']> = { '>=': 'gte', '>': 'gt', '=': 'eq' };
const OP_TO_API: Record<string, string> = { gte: '>=', gt: '>', eq: '=', lte: '>=', lt: '>' };

function mapBadge(b: BackendBadge): Badge {
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? '',
    icon: b.iconKey || 'Award',
    metric: b.unlockRule?.metric ?? 'xp_total',
    operator: OP_TO_UI[b.unlockRule?.operator] ?? 'gte',
    threshold: b.unlockRule?.threshold ?? 0,
    pointsAward: 0,
  };
}

export const badgesService = {
  async getBadges(): Promise<Badge[]> {
    return (await api.get<BackendBadge[]>('/badges')).map(mapBadge);
  },

  async getBadgeAwards(employeeId?: string): Promise<BadgeAward[]> {
    const q = employeeId ? `?employee=${employeeId}` : '';
    const rows = await api.get<BackendAward[]>(`/badge-awards${q}`);
    return rows.map((a) => ({ id: a.id, badgeId: a.badgeId, employeeId: a.employeeId, awardedAt: a.awardedAt }));
  },

  async createBadge(rule: Omit<Badge, 'id'>): Promise<Badge> {
    const created = await api.post<BackendBadge>('/badges', {
      name: rule.name,
      description: rule.description,
      iconKey: rule.icon,
      unlockRule: { metric: rule.metric, operator: OP_TO_API[rule.operator] ?? '>=', threshold: rule.threshold },
    });
    return mapBadge(created);
  },

  reevaluate(employeeId?: string): Promise<unknown> {
    return api.post('/badges/reevaluate', employeeId ? { employeeId } : {});
  },
};
