import {
  mockStatCards,
  mockEsgScoreDetails,
  mockCarbonTrend,
  mockDepartmentRankings,
  mockPendingApprovals,
  mockActivities,
  mockNotifications,
  mockUsersByRole,
  EsgDetails,
  CarbonTrendData,
  DepartmentRanking
} from '../mocks/dashboardData';
import { StatCardData, PendingApproval, ActivityFeedItem, NotificationItem, User, UserRole } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const dashboardService = {
  async getStatCards(): Promise<StatCardData[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockStatCards));
  },

  async getEsgScoreDetails(): Promise<EsgDetails> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockEsgScoreDetails));
  },

  async getCarbonTrend(): Promise<CarbonTrendData[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockCarbonTrend));
  },

  async getDepartmentRankings(): Promise<DepartmentRanking[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockDepartmentRankings));
  },

  async getPendingApprovals(): Promise<PendingApproval[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockPendingApprovals));
  },

  async getRecentActivities(): Promise<ActivityFeedItem[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockActivities));
  },

  async getNotifications(): Promise<NotificationItem[]> {
    await delay(300);
    return JSON.parse(JSON.stringify(mockNotifications));
  },

  async getUserByRole(role: UserRole): Promise<User> {
    await delay(300);
    const mockUser = mockUsersByRole[role] || mockUsersByRole['Admin'];
    return {
      ...mockUser,
      role
    };
  }
};
