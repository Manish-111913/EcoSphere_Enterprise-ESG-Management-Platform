import { api, ApiError } from './apiClient';
import { Reward, RewardRedemption } from '../types';

interface BackendReward {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  stock: number;
  imageKey: string | null;
}

interface BackendRedemption {
  id: string;
  rewardId: string;
  employeeId: string;
  pointsSpent: number;
  statusId: string | null;
  redeemedAt: string;
  reward?: { name: string; imageKey: string | null };
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300';

function toReward(r: BackendReward): Reward {
  return {
    id: r.id,
    title: r.name,
    description: r.description ?? '',
    pointsCost: r.pointsRequired,
    stock: r.stock,
    image: r.imageKey || FALLBACK_IMG,
  };
}

export const rewardsService = {
  async getRewards(): Promise<Reward[]> {
    const rows = await api.get<BackendReward[]>('/rewards');
    return rows.map(toReward);
  },

  async getRedemptions(employeeId: string): Promise<RewardRedemption[]> {
    const rows = await api.get<BackendRedemption[]>(`/redemptions?employee=${employeeId}`);
    return rows.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      employeeId: r.employeeId,
      status: 'Completed',
      timestamp: r.redeemedAt,
      pointsSpent: r.pointsSpent,
    }));
  },

  async redeem(
    rewardId: string,
  ): Promise<{ success: boolean; error?: string; newBalance?: number; newStock?: number }> {
    try {
      const res = await api.post<{ newBalance: number; newStock: number }>(`/rewards/${rewardId}/redeem`);
      return { success: true, newBalance: res.newBalance, newStock: res.newStock };
    } catch (e) {
      const err = e as ApiError;
      return { success: false, error: err.message || 'Redemption failed.' };
    }
  },
};
