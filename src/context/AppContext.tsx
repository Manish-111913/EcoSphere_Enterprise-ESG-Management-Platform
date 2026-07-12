import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, PendingApproval, NotificationItem } from '../types';
import { dashboardService } from '../services/dashboardService';
import { useAuth } from './auth';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: User | null;
  loadingUser: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  pendingApprovals: PendingApproval[];
  approveApproval: (id: string) => void;
  rejectApproval: (id: string) => void;
  isLoggedIn: boolean;
  loginUser: (email: string) => void;
  logoutUser: () => void;
  refreshUser: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, user, logout: logoutUser, quickDemoLogin, loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  // Initialize notifications & approvals
  useEffect(() => {
    async function loadInitialData() {
      try {
        const notifs = await dashboardService.getNotifications();
        setNotifications(notifs);
        const approvals = await dashboardService.getPendingApprovals();
        setPendingApprovals(approvals);
      } catch (err) {
        console.error('Failed to load initial mock data', err);
      }
    }
    loadInitialData();
  }, []);

  const refreshUser = () => {
    // No-op because AuthContext handles active user dynamically based on role
  };

  const setRole = (newRole: UserRole) => {
    quickDemoLogin(newRole);
  };

  const loginUser = (email: string) => {
    // Legacy support for other parts of code that might call loginUser
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const approveApproval = (id: string) => {
    setPendingApprovals(prev => prev.filter(item => item.id !== id));
  };

  const rejectApproval = (id: string) => {
    setPendingApprovals(prev => prev.filter(item => item.id !== id));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        user,
        loadingUser: authLoading,
        sidebarCollapsed,
        setSidebarCollapsed,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        pendingApprovals,
        approveApproval,
        rejectApproval,
        isLoggedIn,
        loginUser,
        logoutUser,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
