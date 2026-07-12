import React from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Flame, Award, User } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RouteErrorBoundary from './RouteErrorBoundary';

export default function AppShell() {
  const { isLoggedIn, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-bg pb-16 md:pb-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <RouteErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar for Employee */}
      {role === 'Employee' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-neutral-border flex items-center justify-around px-2 z-40 shadow-lg">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center gap-1 ${
              location.pathname === '/dashboard' ? 'text-primary-teal' : 'text-neutral-text-muted'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="text-[10px] font-black">Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/gamification/challenges')}
            className={`flex flex-col items-center justify-center gap-1 ${
              location.pathname === '/gamification/challenges' ? 'text-primary-teal' : 'text-neutral-text-muted'
            }`}
          >
            <Flame size={18} />
            <span className="text-[10px] font-black">Challenges</span>
          </button>
          <button
            onClick={() => navigate('/gamification/badges')}
            className={`flex flex-col items-center justify-center gap-1 ${
              location.pathname === '/gamification/badges' ? 'text-primary-teal' : 'text-neutral-text-muted'
            }`}
          >
            <Award size={18} />
            <span className="text-[10px] font-black">Badges</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center gap-1 ${
              location.pathname === '/profile' ? 'text-primary-teal' : 'text-neutral-text-muted'
            }`}
          >
            <User size={18} />
            <span className="text-[10px] font-black">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}
