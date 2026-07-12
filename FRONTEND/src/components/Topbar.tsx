import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from './ui-kit/Toast';
import {
  Bell,
  Search,
  Plus,
  ChevronDown,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  Palette,
  Check,
  Shield,
  HelpCircle,
  Menu
} from 'lucide-react';
import { UserRole } from '../types';

export default function Topbar() {
  const {
    role,
    setRole,
    user,
    loadingUser,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    logoutUser
  } = useApp();

  const { toast } = useToast();

  const location = useLocation();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (roleRef.current && !roleRef.current.contains(target)) setRoleOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: UserRole[] = [
    'Admin',
    'ESG Manager',
    'CSR Manager',
    'Compliance Officer',
    'Department Head',
    'Employee',
    'Auditor'
  ];

  // Helper to generate dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') {
      return [
        { label: 'EcoSphere', active: false },
        { label: 'Dashboard', active: true }
      ];
    }

    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'EcoSphere', active: false }];

    segments.forEach((seg, i) => {
      const label = seg
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({
        label,
        active: i === segments.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Role-aware Quick Action Info
  const getQuickActionInfo = () => {
    switch (role) {
      case 'Admin':
        return { label: 'New Challenge', action: 'Create a new gamified sustainability challenge' };
      case 'ESG Manager':
        return { label: 'Log Emissions', action: 'Record a new Carbon Emission Factor or Transaction' };
      case 'CSR Manager':
        return { label: 'New CSR Activity', action: 'Launch a new Corporate Social Responsibility event' };
      case 'Compliance Officer':
        return { label: 'Raise Issue', action: 'Open a new compliance or regulatory issue' };
      case 'Department Head':
        return { label: 'Approve Logs', action: 'Review and approve department carbon logs' };
      case 'Employee':
        return { label: 'Join Activity', action: 'Participate in active CSR goals or challenges' };
      case 'Auditor':
        return { label: 'Schedule Audit', action: 'Plan a new third-party ESG audit event' };
      default:
        return { label: 'Quick Action', action: 'Perform rapid transaction' };
    }
  };

  const quickAction = getQuickActionInfo();

  const handleQuickActionClick = () => {
    alert(`[Simulation] Role-Aware Action clicked: "${quickAction.label}"\nAction: ${quickAction.action}`);
  };

  return (
    <div id="app-topbar" className="h-16 border-b border-neutral-border bg-white flex items-center justify-between px-4 sm:px-6 z-20 sticky top-0">
      {/* Left: Breadcrumbs & Hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const sidebar = document.getElementById('app-sidebar');
            if (sidebar) {
              if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                sidebar.classList.add('translate-x-0');
              } else {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove('translate-x-0');
              }
            }
          }}
          className="p-1.5 rounded-lg border border-neutral-border hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark md:hidden"
          title="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-sm select-none">
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={bc.label}>
              {idx > 0 && <span className="text-neutral-text-muted">/</span>}
              <span
                className={`font-medium tracking-tight ${
                  bc.active ? 'text-primary-teal font-semibold' : 'text-neutral-text-muted hover:text-neutral-text-dark transition-colors'
                }`}
              >
                {bc.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right: Search, Role Switcher, Quick Action, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Global Search Visuals */}
        <div className="relative max-w-xs hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-text-muted">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search screens & records..."
            className="pl-9 pr-12 py-1.5 w-64 text-xs rounded-button border border-neutral-border bg-neutral-bg focus:bg-white focus:outline-none focus:border-primary-teal transition-all text-neutral-text-dark"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="text-[10px] bg-neutral-border/50 text-neutral-text-muted px-1.5 py-0.5 rounded font-mono font-medium">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Role Switcher Dropdown */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-button border border-neutral-border hover:bg-neutral-bg transition-colors text-xs font-semibold text-neutral-text-dark"
            id="role-switcher-btn"
          >
            <Shield className="h-4 w-4 text-primary-teal shrink-0" />
            <span className="hidden sm:inline">Role: {role}</span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-text-muted shrink-0" />
          </button>

          {roleOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-neutral-border mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-text-muted block">
                  Switch Active Role
                </span>
                <p className="text-[10px] text-neutral-text-muted mt-0.5">
                  Changes layout grammar and widget scopes instantly
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {rolesList.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setRoleOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-neutral-bg text-neutral-text-dark flex items-center justify-between transition-colors"
                  >
                    <span>{r}</span>
                    {role === r && <Check className="h-4 w-4 text-primary-teal" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <button
          onClick={handleQuickActionClick}
          className="bg-primary-teal hover:bg-primary-teal-hover text-white p-2 rounded-button shadow-sm flex items-center justify-center transition-all group relative"
          title={quickAction.label}
          id="quick-action-btn"
        >
          <Plus className="h-4 w-4" />
          <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-neutral-text-dark text-white text-[10px] font-sans p-2 rounded-lg w-48 shadow-lg text-center z-50 leading-relaxed pointer-events-none">
            <span className="font-bold block text-primary-teal mb-0.5">{quickAction.label}</span>
            {quickAction.action}
          </div>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-button border border-neutral-border hover:bg-neutral-bg transition-colors relative text-neutral-text-muted hover:text-neutral-text-dark"
            title="Notifications"
            id="notifications-bell"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-semantic-danger rounded-full border border-white animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-neutral-border flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-text-dark">Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[10px] text-primary-teal hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-neutral-border">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-text-muted">
                    No new notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={`p-3 hover:bg-neutral-bg transition-colors cursor-pointer text-left ${
                        !notif.read ? 'bg-primary-teal/[0.02]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-text-dark leading-tight">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 bg-primary-teal rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-text-muted mt-1 leading-snug">
                        {notif.description}
                      </p>
                      <span className="text-[9px] text-neutral-text-muted mt-1 block">
                        {notif.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="px-3 pt-2 border-t border-neutral-border text-center">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-primary-teal hover:underline font-semibold w-full"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 focus:outline-none"
            id="profile-dropdown-btn"
          >
            {loadingUser || !user ? (
              <div className="w-8 h-8 rounded-full bg-neutral-border animate-pulse" />
            ) : (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-neutral-border object-cover bg-neutral-bg"
              />
            )}
            <ChevronDown className="h-3.5 w-3.5 text-neutral-text-muted shrink-0 hidden sm:inline" />
          </button>

          {profileOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-neutral-border mb-1 text-left">
                <span className="text-xs font-bold text-neutral-text-dark block leading-none truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-neutral-text-muted mt-1 block truncate">
                  {user.email}
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[9px] bg-neutral-bg border border-neutral-border text-neutral-text-dark px-1.5 py-0.5 rounded-full font-bold">
                    Lvl {user.level}
                  </span>
                  <span className="text-[9px] text-primary-teal font-bold tabular-nums">
                    {user.points} pts
                  </span>
                </div>
              </div>
              <div className="text-left">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-neutral-bg text-neutral-text-dark flex items-center gap-2 transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5 text-neutral-text-muted" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-neutral-bg text-neutral-text-dark flex items-center gap-2 transition-colors"
                >
                  <SettingsIcon className="h-3.5 w-3.5 text-neutral-text-muted" />
                  Admin Settings
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    toast('System Theme', 'info', 'System theme locked to professional slate-light per design guidelines.');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-neutral-bg text-neutral-text-dark flex items-center gap-2 transition-colors"
                >
                  <Palette className="h-3.5 w-3.5 text-neutral-text-muted" />
                  System Theme
                </button>
              </div>
              <div className="border-t border-neutral-border mt-1.5 pt-1.5 text-left">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logoutUser();
                    toast('Signed out', 'success', 'You have been successfully logged out of EcoSphere.');
                    navigate('/login');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
