import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Leaf,
  Users,
  ShieldCheck,
  Trophy,
  LineChart,
  Settings,
  ChevronDown,
  ChevronRight,
  Calculator,
  ArrowLeftRight,
  Target,
  Calendar,
  ClipboardCheck,
  FileText,
  FileCheck,
  AlertTriangle,
  Flame,
  Award,
  Gift,
  BarChart3,
  UserCog,
  Building,
  Sliders,
  ChevronLeft,
  Activity,
  FolderTree
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  roles?: UserRole[];
}

interface SidebarGroup {
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: UserRole[];
  items?: SidebarItem[];
  path?: string; // If no items, acts as a direct link
}

export default function Sidebar() {
  const { role, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep track of expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Environmental: true,
    Social: true,
    Governance: true,
    Gamification: false,
    Administration: false
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Group definitions
  const sidebarGroups: SidebarGroup[] = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Department Head', 'Employee', 'Auditor'],
      path: '/dashboard'
    },
    {
      name: 'Environmental',
      icon: Leaf,
      roles: ['Admin', 'ESG Manager', 'Department Head', 'Employee', 'Compliance Officer', 'Auditor'],
      items: [
        { name: 'Emission Factors', path: '/environmental/emission-factors', icon: Calculator },
        { name: 'Operational Records', path: '/environmental/operational-records', icon: Activity },
        { name: 'Carbon Transactions', path: '/environmental/carbon-transactions', icon: ArrowLeftRight },
        { name: 'Goals', path: '/environmental/goals', icon: Target }
      ]
    },
    {
      name: 'Social',
      icon: Users,
      roles: ['Admin', 'CSR Manager', 'Department Head', 'Employee'],
      items: [
        { name: 'CSR Activities', path: '/social/csr-activities', icon: Calendar },
        { name: 'Participation', path: '/social/participation', icon: ClipboardCheck }
      ]
    },
    {
      name: 'Governance',
      icon: ShieldCheck,
      roles: ['Admin', 'Compliance Officer', 'Auditor', 'Employee', 'Department Head', 'ESG Manager', 'CSR Manager'],
      items: [
        { name: 'Policies', path: '/governance/policies', icon: FileText, roles: ['Admin', 'Compliance Officer', 'Auditor', 'Employee', 'Department Head', 'ESG Manager', 'CSR Manager'] },
        { name: 'Audits', path: '/governance/audits', icon: FileCheck, roles: ['Admin', 'Compliance Officer', 'Auditor'] },
        { name: 'Compliance Issues', path: '/governance/compliance-issues', icon: AlertTriangle, badge: '3 overdue', roles: ['Admin', 'Compliance Officer', 'Auditor', 'Department Head', 'ESG Manager', 'CSR Manager'] }
      ]
    },
    {
      name: 'Gamification',
      icon: Trophy,
      roles: ['Admin', 'CSR Manager', 'Department Head', 'Employee'],
      items: [
        { name: 'Challenges', path: '/gamification/challenges', icon: Flame },
        { name: 'Badges', path: '/gamification/badges', icon: Award },
        { name: 'Rewards', path: '/gamification/rewards', icon: Gift },
        { name: 'Leaderboard', path: '/gamification/leaderboard', icon: BarChart3 }
      ]
    },
    {
      name: 'Reports',
      icon: LineChart,
      roles: ['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Department Head', 'Auditor'],
      items: [
        { name: 'Reports Hub', path: '/reports', icon: LineChart },
        { name: 'Report Builder', path: '/reports/builder', icon: BarChart3 }
      ]
    },
    {
      name: 'Administration',
      icon: Settings,
      roles: ['Admin', 'ESG Manager'],
      items: [
        { name: 'Users', path: '/employees', icon: Users, roles: ['Admin'] },
        { name: 'Departments', path: '/departments', icon: Building, roles: ['Admin', 'ESG Manager'] },
        { name: 'Categories', path: '/administration/categories', icon: FolderTree, roles: ['Admin', 'ESG Manager'] },
        { name: 'Settings Hub', path: '/settings', icon: Sliders }
      ]
    }
  ];

  // Filter groups by current user role and sub-items by role
  const filteredGroups = sidebarGroups
    .filter(group => group.roles.includes(role))
    .map(group => ({
      ...group,
      items: group.items?.filter(item => !item.roles || item.roles.includes(role))
    }));

  const isItemActive = (path: string) => {
    return location.pathname === path;
  };

  const isGroupActive = (group: SidebarGroup) => {
    if (group.path) return location.pathname === group.path;
    return group.items?.some(item => location.pathname === item.path) || false;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    // Auto-close sidebar drawer on mobile viewports
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      <div
        id="app-sidebar-backdrop"
        onClick={() => {
          const sidebar = document.getElementById('app-sidebar');
          if (sidebar) {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0');
          }
        }}
        className="fixed inset-0 bg-neutral-text-dark/30 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 opacity-0 pointer-events-none"
      />

      <div
        id="app-sidebar"
        className={`bg-white border-r border-neutral-border h-screen flex flex-col justify-between fixed md:sticky top-0 left-0 bottom-0 transition-all duration-300 z-40 -translate-x-full md:translate-x-0 ${
          sidebarCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'
        } w-[260px] shadow-lg md:shadow-none`}
      >
        {/* Top Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary-teal rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-extrabold text-xl font-sans tracking-tighter">E</span>
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg text-neutral-text-dark font-sans tracking-tight shrink-0"
              >
                EcoSphere
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors hidden md:block"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Mobile close button */}
          <button
            onClick={() => {
              const sidebar = document.getElementById('app-sidebar');
              if (sidebar) {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove('translate-x-0');
              }
            }}
            className="p-1.5 rounded-md hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark md:hidden transition-colors"
            title="Close menu"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        {filteredGroups.map(group => {
          const groupActive = isGroupActive(group);
          const hasChildren = !!group.items;

          // Single direct item
          if (!hasChildren) {
            return (
              <div key={group.name} className="w-full">
                <button
                  onClick={() => group.path && navigate(group.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-sm font-medium transition-all group relative ${
                    groupActive
                      ? 'bg-primary-teal text-white shadow-sm'
                      : 'text-neutral-text-muted hover:bg-neutral-bg hover:text-neutral-text-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className={`h-5 w-5 shrink-0 ${groupActive ? 'text-white' : 'text-neutral-text-muted group-hover:text-neutral-text-dark'}`} />
                    {!sidebarCollapsed && <span>{group.name}</span>}
                  </div>
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-text-dark text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                      {group.name}
                    </div>
                  )}
                </button>
              </div>
            );
          }

          // Group dropdown
          return (
            <div key={group.name} className="space-y-1">
              <button
                onClick={() => !sidebarCollapsed && toggleGroup(group.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-sm font-medium transition-all group relative ${
                  groupActive && sidebarCollapsed
                    ? 'bg-primary-teal text-white shadow-sm'
                    : 'text-neutral-text-muted hover:bg-neutral-bg hover:text-neutral-text-dark'
                }`}
              >
                <div className="flex items-center gap-3">
                  <group.icon className={`h-5 w-5 shrink-0 ${groupActive && sidebarCollapsed ? 'text-white' : 'text-neutral-text-muted group-hover:text-neutral-text-dark'}`} />
                  {!sidebarCollapsed && <span>{group.name}</span>}
                </div>
                {!sidebarCollapsed && (
                  <div>
                    {expandedGroups[group.name] ? (
                      <ChevronDown className="h-4 w-4 text-neutral-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-neutral-text-muted" />
                    )}
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-text-dark text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                    {group.name} (Expand to view sub-items)
                  </div>
                )}
              </button>

              {/* Children */}
              {!sidebarCollapsed && expandedGroups[group.name] && (
                <div className="pl-4 space-y-1 border-l border-neutral-border ml-5 mt-1">
                  {group.items?.map(subItem => {
                    const active = isItemActive(subItem.path);
                    return (
                      <button
                        key={subItem.name}
                        onClick={() => handleNavigate(subItem.path)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-button text-xs font-medium transition-all ${
                          active
                            ? 'bg-primary-teal text-white shadow-sm'
                            : 'text-neutral-text-muted hover:bg-neutral-bg hover:text-neutral-text-dark'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden truncate">
                          <subItem.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{subItem.name}</span>
                        </div>
                        {subItem.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-tight shrink-0 ${
                            active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {subItem.badge.split(' ')[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role and Level Indicator at bottom */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-neutral-border bg-neutral-bg/50 m-3 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-text-muted font-bold">Role Session</span>
            <span className="text-[10px] bg-primary-teal/10 text-primary-teal px-1.5 py-0.5 rounded-full font-bold font-sans">
              Active
            </span>
          </div>
          <div className="text-xs font-semibold text-neutral-text-dark truncate">
            {role}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
