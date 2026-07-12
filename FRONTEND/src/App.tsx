import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/auth';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui-kit/Toast';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Invite from './pages/Invite';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';
import EmissionFactors from './pages/environmental/EmissionFactors';
import CarbonTransactions from './pages/environmental/CarbonTransactions';
import Goals from './pages/environmental/Goals';

// Gamification Module Pages
import Challenges from './pages/gamification/Challenges';
import ChallengeDetails from './pages/gamification/ChallengeDetails';
import ChallengeReview from './pages/gamification/ChallengeReview';
import Badges from './pages/gamification/Badges';
import Rewards from './pages/gamification/Rewards';
import Leaderboard from './pages/gamification/Leaderboard';

// Social Module Pages
import CsrActivities from './pages/social/CsrActivities';
import Participation from './pages/social/Participation';
import Diversity from './pages/social/Diversity';
import Training from './pages/social/Training';

// Governance Module Pages
import Policies from './pages/governance/Policies';
import PendingPolicies from './pages/governance/PendingPolicies';
import PolicyDetail from './pages/governance/PolicyDetail';
import Audits from './pages/governance/Audits';
import ComplianceIssues from './pages/governance/ComplianceIssues';

// New Phase 4 Pages
import ReportsHub from './pages/reports/ReportsHub';
import ReportDetail from './pages/reports/ReportDetail';
import ReportBuilder from './pages/reports/ReportBuilder';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Employees from './pages/Employees';

// Phase 6 Gap-Closure Pages
import Departments from './pages/Departments';
import Categories from './pages/administration/Categories';
import OperationalRecords from './pages/environmental/OperationalRecords';

import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <SettingsProvider>
          <ToastProvider>
            <HashRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/invite" element={<Invite />} />
              
              {/* Protected Routes wrapped in AuthGuard */}
              <Route element={<AuthGuard />}>
                <Route element={<AppShell />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="departments" element={<Departments />} />
                  
                  {/* Environmental Module Routes */}
                  <Route path="environmental/emission-factors" element={<EmissionFactors />} />
                  <Route path="environmental/carbon-transactions" element={<CarbonTransactions />} />
                  <Route path="environmental/operational-records" element={<OperationalRecords />} />
                  <Route path="environmental/goals" element={<Goals />} />
                  
                  {/* Administration Module Routes */}
                  <Route path="administration/categories" element={<Categories />} />
                  
                  {/* Gamification Module Routes */}
                  <Route path="gamification/challenges" element={<Challenges />} />
                  <Route path="gamification/challenges/:id" element={<ChallengeDetails />} />
                  <Route path="gamification/challenges/:id/review" element={<ChallengeReview />} />
                  <Route path="gamification/badges" element={<Badges />} />
                  <Route path="gamification/rewards" element={<Rewards />} />
                  <Route path="gamification/leaderboard" element={<Leaderboard />} />

                  {/* Social Module Routes */}
                  <Route path="social/csr-activities" element={<CsrActivities />} />
                  <Route path="social/participation" element={<Participation />} />
                  <Route path="social/diversity" element={<Diversity />} />
                  <Route path="social/training" element={<Training />} />

                  {/* Governance Module Routes */}
                  <Route path="governance/policies" element={<Policies />} />
                  <Route path="governance/policies/pending" element={<PendingPolicies />} />
                  <Route path="governance/policies/:id" element={<PolicyDetail />} />
                  <Route path="governance/audits" element={<Audits />} />
                  <Route path="governance/compliance-issues" element={<ComplianceIssues />} />
                  
                  {/* Phase 4 Routes */}
                  <Route path="reports" element={<ReportsHub />} />
                  <Route path="reports/builder" element={<ReportBuilder />} />
                  <Route path="reports/:type" element={<ReportDetail />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="profile" element={<Profile />} />

                  <Route path="forbidden" element={<Forbidden />} />
                  <Route path="403" element={<Forbidden />} />
                  <Route path="404" element={<NotFound />} />
                  
                  {/* Catch-all for sub-routes inside app-shell to show friendly 404 */}
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Route>
              </Route>

              {/* Catch-all global route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </SettingsProvider>
    </AppProvider>
    </AuthProvider>
  );
}
