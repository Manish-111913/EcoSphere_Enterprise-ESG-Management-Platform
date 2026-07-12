import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { dashboardService } from '../services/dashboardService';
import { StatCardData } from '../types';
import MetricCard from '../components/MetricCard';
import RadialScoreGauge from '../components/RadialScoreGauge';
import CarbonTrendChart from '../components/CarbonTrendChart';
import DeptRankingsChart from '../components/DeptRankingsChart';
import PendingApprovalsList from '../components/PendingApprovalsList';
import ActivityTimeline from '../components/ActivityTimeline';
import { LayoutDashboard, Shield, Leaf, Users, ShieldCheck, Trophy, Sparkles, RefreshCw } from 'lucide-react';

// Import role-specific dashboards
import ESGManagerDashboard from '../components/dashboards/ESGManagerDashboard';
import CSRManagerDashboard from '../components/dashboards/CSRManagerDashboard';
import ComplianceOfficerDashboard from '../components/dashboards/ComplianceOfficerDashboard';
import DepartmentHeadDashboard from '../components/dashboards/DepartmentHeadDashboard';
import EmployeeDashboard from '../components/dashboards/EmployeeDashboard';
import AuditorDashboard from '../components/dashboards/AuditorDashboard';

export default function Dashboard() {
  const { role, user, loadingUser, pendingApprovals } = useApp();
  const [statCards, setStatCards] = useState<StatCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const stats = await dashboardService.getStatCards();
        setStatCards(stats);
      } catch (err) {
        console.error('Failed to load stat cards', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Format date elegantly
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Helper to describe role-specific dashboard focus
  const getRoleHeaderSubtitle = () => {
    switch (role) {
      case 'Admin':
        return 'System health summary and platform-wide ESG metrics control panel.';
      case 'ESG Manager':
        return 'Deep environmental metrics, emissions monitoring, and Scope 1/2/3 data analysis.';
      case 'CSR Manager':
        return 'Corporate social impact metrics, employee participation tracking, and rewards control.';
      case 'Compliance Officer':
        return 'Governance auditing, regulatory policy status, and critical compliance issues tracker.';
      case 'Department Head':
        return 'Own department ESG score splits, pending approvals queue, and performance stats.';
      case 'Employee':
        return 'Sustainablity personal journey overview, earned badges shelf, and rewards catalog.';
      case 'Auditor':
        return 'Read-only audit schedules, findings summaries, and verification snapshots.';
      default:
        return 'Enterprise ESG management controls.';
    }
  };

  // Filter KPI cards dynamically based on selected role
  const getFilteredStatCards = () => {
    if (loading || statCards.length === 0) return [];

    // Dynamically sync pending approvals and open issues from context if applicable
    const syncedCards = statCards.map(card => {
      if (card.id === 'active-challenges' && role === 'Admin') {
        // Just mock-sync
        return card;
      }
      if (card.id === 'open-compliance-issues') {
        // Can sync with some state
        return card;
      }
      return card;
    });

    switch (role) {
      case 'ESG Manager':
        // Environmental metrics: emissions and ESG score
        return syncedCards.filter(c => c.id === 'total-co2e' || c.id === 'org-esg-score');
      case 'CSR Manager':
        // Social metrics: ESG score and active challenges
        return syncedCards.filter(c => c.id === 'org-esg-score' || c.id === 'active-challenges');
      case 'Compliance Officer':
      case 'Auditor':
        // Governance metrics: ESG score and compliance issues
        return syncedCards.filter(c => c.id === 'org-esg-score' || c.id === 'open-compliance-issues');
      default:
        return syncedCards;
    }
  };

  const filteredStats = getFilteredStatCards();

  const renderDashboardByRole = () => {
    switch (role) {
      case 'ESG Manager':
        return <ESGManagerDashboard />;
      case 'CSR Manager':
        return <CSRManagerDashboard />;
      case 'Compliance Officer':
        return <ComplianceOfficerDashboard />;
      case 'Department Head':
        return <DepartmentHeadDashboard />;
      case 'Employee':
        return <EmployeeDashboard />;
      case 'Auditor':
        return <AuditorDashboard />;
      default:
        return (
          <>
            {/* KPI Stats Cards Row */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm h-28 flex flex-col justify-between">
                    <div className="h-4 w-24 bg-neutral-border animate-pulse rounded" />
                    <div className="h-8 w-16 bg-neutral-border animate-pulse rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {filteredStats.map(card => (
                  <div key={card.id}>
                    <MetricCard data={card} />
                  </div>
                ))}
              </div>
            )}

            {/* Widgets Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: Carbon Trend Area Chart & Recent Activity Feed */}
              <div className="lg:col-span-7 space-y-6 flex flex-col">
                <CarbonTrendChart />
                <ActivityTimeline />
              </div>

              {/* Right Side: ESG score gauge, Department ESG rankings, Pending approvals queue */}
              <div className="lg:col-span-5 space-y-6 flex flex-col">
                <RadialScoreGauge />
                <DeptRankingsChart />
                <PendingApprovalsList />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Role Information Header Banner */}
      <div className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {loadingUser || !user ? (
          <div className="space-y-2">
            <div className="h-6 w-48 bg-neutral-border animate-pulse rounded-md" />
            <div className="h-4 w-72 bg-neutral-border animate-pulse rounded-md" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full border border-neutral-border object-cover shrink-0"
            />
            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-neutral-text-dark tracking-tight">
                  Welcome back, {user.name}
                </h2>
                <span className="text-[10px] bg-primary-teal/10 text-primary-teal border border-primary-teal/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-sans">
                  {role}
                </span>
              </div>
              <p className="text-xs text-neutral-text-muted mt-1 font-medium">
                {getRoleHeaderSubtitle()}
              </p>
            </div>
          </div>
        )}
        <div className="text-left md:text-right shrink-0">
          <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider block">
            System Date
          </span>
          <span className="text-xs font-semibold text-neutral-text-dark mt-1 block">
            {getFormattedDate()}
          </span>
        </div>
      </div>

      {renderDashboardByRole()}
    </div>
  );
}
