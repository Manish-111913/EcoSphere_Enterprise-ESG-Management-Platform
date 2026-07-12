import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from './ui-kit/Toast';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
  Menu,
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
    logoutUser,
  } = useApp();

  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const rolesList: UserRole[] = [
    'Admin',
    'ESG Manager',
    'CSR Manager',
    'Compliance Officer',
    'Department Head',
    'Employee',
    'Auditor',
  ];

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') {
      return [
        { label: 'EcoSphere', active: false },
        { label: 'Dashboard', active: true },
      ];
    }

    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'EcoSphere', active: false }];

    segments.forEach((seg, i) => {
      const label = seg
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({
        label,
        active: i === segments.length - 1,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

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

      <div className="flex items-center gap-4">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-button text-xs font-semibold">
              <Shield className="h-4 w-4 text-primary-teal shrink-0" />
              <span className="hidden sm:inline">Role: {role}</span>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-text-muted shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Switch Active Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {rolesList.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRole(r)} className="justify-between">
                <span>{r}</span>
                {role === r && <Check className="h-4 w-4 text-primary-teal" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-button border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark"
              title="Notifications"
              id="notifications-bell"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-semantic-danger rounded-full border border-white animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-neutral-border flex items-center justify-between">
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
                notifications.slice(0, 5).map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`w-full p-3 hover:bg-neutral-bg transition-colors cursor-pointer text-left ${
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
                  </button>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-neutral-border text-center">
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs text-primary-teal hover:underline font-semibold w-full"
              >
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
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
          </DropdownMenuTrigger>
          {user && (
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="normal-case px-3 py-2">
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
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserIcon className="h-3.5 w-3.5 text-neutral-text-muted" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="h-3.5 w-3.5 text-neutral-text-muted" />
                Admin Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast('System Theme', 'info', 'System theme locked to professional slate-light per design guidelines.');
                }}
              >
                <Palette className="h-3.5 w-3.5 text-neutral-text-muted" />
                System Theme
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={() => {
                  logoutUser();
                  toast('Signed out', 'success', 'You have been successfully logged out of EcoSphere.');
                  navigate('/login');
                }}
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
}
