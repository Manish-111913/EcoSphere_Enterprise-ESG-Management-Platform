import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { gamificationService } from '../services/gamificationService';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (details: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  acceptInvite: (token: string, name: string, password?: string, role?: UserRole, department?: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ecosphere_logged_in') === 'true';
  });
  
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('ecosphere_role') as UserRole) || 'Admin';
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ecosphere_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Synchronize user and roles when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setUser(null);
      return;
    }
    
    // Look up employee by role in gamification service or mock default
    const emp = gamificationService.getEmployeeByRole(role);
    if (emp) {
      const u = {
        name: emp.name,
        email: emp.email,
        avatar: emp.avatar,
        role: emp.role,
        points: emp.points,
        level: emp.level,
        xp: emp.xp,
        department: emp.departmentId === 'dept-1' ? 'Operations' : 'Logistics'
      };
      setUser(u);
      localStorage.setItem('ecosphere_user', JSON.stringify(u));
    } else {
      const u = {
        name: 'Jane Doe',
        email: 'jane.doe@ecosphere.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        role: role,
        points: 850,
        level: 5,
        xp: 2100,
        department: 'Operations'
      };
      setUser(u);
      localStorage.setItem('ecosphere_user', JSON.stringify(u));
    }
  }, [isLoggedIn, role]);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    
    if (email === 'wrong@demo.com') {
      setLoading(false);
      throw new Error('Invalid credentials');
    }

    // Try to match a mock employee by email
    const matchedEmp = gamificationService.getEmployees().find(e => e.email.toLowerCase() === email.toLowerCase());
    const assignedRole = matchedEmp?.role || 'Employee';

    localStorage.setItem('ecosphere_logged_in', 'true');
    localStorage.setItem('ecosphere_role', assignedRole);
    if (matchedEmp) {
      localStorage.setItem('ecosphere_user', JSON.stringify({
        name: matchedEmp.name,
        email: matchedEmp.email,
        avatar: matchedEmp.avatar,
        role: matchedEmp.role,
        points: matchedEmp.points,
        level: matchedEmp.level,
        xp: matchedEmp.xp,
        department: matchedEmp.departmentId === 'dept-1' ? 'Operations' : 'Logistics'
      }));
    }

    setIsLoggedIn(true);
    setRoleState(assignedRole);
    setLoading(false);
  };

  const signup = async (details: any) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setLoading(false);
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setLoading(false);
  };

  const resetPassword = async (token: string, password?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setLoading(false);
  };

  const verifyEmail = async (token: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setLoading(false);
  };

  const acceptInvite = async (token: string, name: string, password?: string, assignedRole?: UserRole, department?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const useRole = assignedRole || 'Employee';
    const newUser: User = {
      name,
      email: 'priya@acme.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: useRole,
      points: 100,
      level: 1,
      xp: 100
    };

    localStorage.setItem('ecosphere_logged_in', 'true');
    localStorage.setItem('ecosphere_role', useRole);
    localStorage.setItem('ecosphere_user', JSON.stringify(newUser));

    setIsLoggedIn(true);
    setRoleState(useRole);
    setUser(newUser);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('ecosphere_logged_in');
    localStorage.removeItem('ecosphere_role');
    localStorage.removeItem('ecosphere_user');
    setIsLoggedIn(false);
    setRoleState('Admin');
    setUser(null);
  };

  const quickDemoLogin = (newRole: UserRole) => {
    localStorage.setItem('ecosphere_logged_in', 'true');
    localStorage.setItem('ecosphere_role', newRole);
    setIsLoggedIn(true);
    setRoleState(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        role,
        loading,
        login,
        signup,
        forgotPassword,
        resetPassword,
        verifyEmail,
        acceptInvite,
        logout,
        quickDemoLogin
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
