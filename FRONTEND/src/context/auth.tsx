import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiAuth, BackendUser, MeSummary } from '../services/apiAuth';
import { tokens } from '../services/apiClient';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  employeeId: string | null;
  role: UserRole;
  permissions: string[];
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (details: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  acceptInvite: (token: string, name: string, password?: string, role?: UserRole, department?: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const KNOWN_ROLES: UserRole[] = [
  'Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Department Head', 'Employee', 'Auditor',
];

// Seeded demo credentials (spec §A11) — all password Demo@123.
const ROLE_EMAILS: Record<UserRole, string> = {
  'Admin': 'admin@ecosphere.demo',
  'ESG Manager': 'esg@ecosphere.demo',
  'CSR Manager': 'csr@ecosphere.demo',
  'Compliance Officer': 'compliance@ecosphere.demo',
  'Department Head': 'head@ecosphere.demo',
  'Employee': 'employee@ecosphere.demo',
  'Auditor': 'auditor@ecosphere.demo',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickRole(roles: string[]): UserRole {
  return (roles.find((r) => KNOWN_ROLES.includes(r as UserRole)) as UserRole) || 'Employee';
}

function toUser(bu: BackendUser, summary?: MeSummary | null): User {
  const name = `${bu.firstName} ${bu.lastName}`.trim();
  return {
    name,
    email: bu.email,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`,
    role: pickRole(bu.roles),
    points: summary?.xpBalance ?? 0,
    level: summary?.level ?? 1,
    xp: summary?.xpBalance ?? 0,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Optimistic: assume a session if we hold a refresh token (confirmed by bootstrap).
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!tokens.getRefresh());
  const [role, setRoleState] = useState<UserRole>(() => (localStorage.getItem('ecosphere_role') as UserRole) || 'Admin');
  const [user, setUser] = useState<User | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const applySession = (bu: BackendUser, roles: string[], perms: string[], summary?: MeSummary | null) => {
    const r = pickRole(roles.length ? roles : bu.roles);
    setUser(toUser(bu, summary));
    setEmployeeId(bu.id);
    setPermissions(perms);
    setRoleState(r);
    setIsLoggedIn(true);
    localStorage.setItem('ecosphere_role', r);
  };

  // Bootstrap: if a refresh token exists, the api client will silently refresh
  // the access token on the first 401 from /auth/me.
  useEffect(() => {
    (async () => {
      if (!tokens.getRefresh()) {
        setIsLoggedIn(false);
        return;
      }
      try {
        const me = await apiAuth.me();
        const summary = await apiAuth.summary().catch(() => null);
        applySession(me.user, me.roles, me.permissions, summary);
      } catch {
        tokens.clear();
        setIsLoggedIn(false);
        setUser(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateAfterLogin = async (loginData: { user: BackendUser; permissions: string[] }) => {
    const summary = await apiAuth.summary().catch(() => null);
    applySession(loginData.user, loginData.user.roles, loginData.permissions, summary);
  };

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const data = await apiAuth.login(email, password ?? '');
      await hydrateAfterLogin(data);
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (newRole: UserRole) => {
    await login(ROLE_EMAILS[newRole] ?? ROLE_EMAILS['Employee'], 'Demo@123');
  };

  const signup = async (details: any) => {
    setLoading(true);
    try {
      const departmentId =
        typeof details.departmentId === 'string' && UUID_RE.test(details.departmentId)
          ? details.departmentId
          : undefined;

      await apiAuth.register({
        email: details.email,
        password: details.password,
        firstName: details.firstName ?? details.name?.split(' ')[0] ?? 'New',
        lastName: details.lastName ?? details.name?.split(' ').slice(1).join(' ') ?? 'User',
        departmentId,
      });
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await apiAuth.forgotPassword(email);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, password?: string) => {
    setLoading(true);
    try {
      await apiAuth.resetPassword(token, password ?? '');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setLoading(true);
    try {
      await apiAuth.verifyEmail(token);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (token: string, name: string, password?: string) => {
    setLoading(true);
    try {
      const [firstName, ...rest] = name.trim().split(' ');
      const data = await apiAuth.acceptInvite(token, firstName, rest.join(' ') || firstName, password ?? '');
      await hydrateAfterLogin(data);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!isLoggedIn) return;
    try {
      const [me, summary] = await Promise.all([apiAuth.me(), apiAuth.summary().catch(() => null)]);
      setUser(toUser(me.user, summary));
      setEmployeeId(me.user.id);
    } catch {
      /* ignore transient errors */
    }
  };

  const logout = () => {
    void apiAuth.logout();
    localStorage.removeItem('ecosphere_role');
    setIsLoggedIn(false);
    setRoleState('Admin');
    setUser(null);
    setEmployeeId(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        employeeId,
        role,
        permissions,
        loading,
        login,
        signup,
        forgotPassword,
        resetPassword,
        verifyEmail,
        acceptInvite,
        logout,
        quickDemoLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
