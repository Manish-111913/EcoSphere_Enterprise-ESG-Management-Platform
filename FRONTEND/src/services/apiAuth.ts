import { api, tokens } from './apiClient';

export interface BackendUser {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  designation: string | null;
  isActive: boolean;
  emailVerified: boolean;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: BackendUser;
  permissions: string[];
}

export interface MeSummary {
  xpBalance: number;
  level: number;
  nextLevelAt: number | null;
  badges: unknown[];
  activeChallenges: unknown[];
  pendingAcknowledgementsCount: number;
  affordableRewardsCount: number;
  leaderboardRank: number | null;
}

export interface SignupDepartmentOption {
  id: string;
  name: string;
  code: string;
}

export const apiAuth = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await api.postPublic<LoginResponse>('/auth/login', { email, password });
    tokens.setPair(data.accessToken, data.refreshToken);
    return data;
  },

  me(): Promise<{ user: BackendUser; roles: string[]; permissions: string[] }> {
    return api.get('/auth/me');
  },

  summary(): Promise<MeSummary> {
    return api.get('/me/summary');
  },

  signupOptions(): Promise<{ departments: SignupDepartmentOption[] }> {
    return api.getPublic('/auth/signup-options');
  },

  register(dto: { email: string; password: string; firstName: string; lastName: string; departmentId?: string }) {
    return api.postPublic('/auth/register', dto);
  },

  verifyEmail(token: string) {
    return api.postPublic('/auth/verify-email', { token });
  },

  forgotPassword(email: string) {
    return api.postPublic('/auth/forgot-password', { email });
  },

  resetPassword(token: string, newPassword: string) {
    return api.postPublic('/auth/reset-password', { token, newPassword });
  },

  async acceptInvite(token: string, firstName: string, lastName: string, password: string): Promise<LoginResponse> {
    const data = await api.postPublic<LoginResponse>('/invitations/accept', { token, firstName, lastName, password });
    tokens.setPair(data.accessToken, data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    const rt = tokens.getRefresh();
    if (rt) {
      try {
        await api.post('/auth/logout', { refreshToken: rt });
      } catch {
        /* ignore */
      }
    }
    tokens.clear();
  },
};
