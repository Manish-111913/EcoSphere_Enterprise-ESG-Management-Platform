import { api } from './apiClient';

export interface RankedRow {
  rank: number;
  id: string;
  name: string;
  department?: string;
  total: number;
}

const PERIOD_MAP: Record<'week' | 'month' | 'all', string> = {
  week: 'month',
  month: 'month',
  all: 'all',
};

export const leaderboardService = {
  get(scope: 'individual' | 'department', period: 'week' | 'month' | 'all'): Promise<RankedRow[]> {
    return api.get<RankedRow[]>(`/leaderboard?scope=${scope}&period=${PERIOD_MAP[period]}`);
  },
};
