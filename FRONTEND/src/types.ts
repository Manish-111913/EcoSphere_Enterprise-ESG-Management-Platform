export type UserRole =
  | 'Admin'
  | 'ESG Manager'
  | 'CSR Manager'
  | 'Compliance Officer'
  | 'Department Head'
  | 'Employee'
  | 'Auditor';

export interface User {
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  points: number;
  level: number;
  xp: number;
}

export interface StatCardData {
  id: string;
  title: string;
  value: string;
  delta: string; // e.g. "-8.2%" or "+2.4%"
  isPositive: boolean; // green arrow vs red arrow
  sparkline: number[];
  unit?: string;
}

export interface PendingApproval {
  id: string;
  type: 'challenge' | 'transaction' | 'csr';
  title: string;
  subtitle: string;
  user: {
    name: string;
    avatar: string;
    department: string;
  };
  timestamp: string;
  details: {
    xp?: number;
    points?: number;
    quantity?: number;
    unit?: string;
    factor?: string;
    evidenceUrl?: string;
  };
}

export interface ActivityFeedItem {
  id: string;
  type: 'badge_unlock' | 'transaction' | 'policy_ack' | 'compliance_resolved' | 'challenge_completed';
  title: string;
  subtitle: string;
  time: string;
  user: {
    name: string;
    avatar: string;
  };
  pillar: 'E' | 'S' | 'G' | 'General';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface LookupData {
  severities: { value: string; label: string; color: string }[];
  challengeStatuses: { value: string; label: string; color: string }[];
  complianceStatuses: { value: string; label: string; color: string }[];
  difficulties: { value: string; label: string }[];
  emissionUnits: string[];
  categories: {
    environmental: string[];
    social: string[];
    governance: string[];
  };
  departments: string[];
}

// RICH INTERCONNECTED MOCK DATA MODELS
export interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  code: string;
  head: string; // Employee ID or name
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  departmentId: string;
  points: number;
  level: number;
  xp: number;
}

export interface EmissionFactor {
  id: string;
  name: string;
  category: string;
  scope: 1 | 2 | 3;
  factor: number;
  unit: string;
  version: string;
  effectiveDate: string;
}

export interface CarbonTransaction {
  id: string;
  departmentId: string;
  employeeId: string;
  emissionFactorId: string;
  quantity: number;
  calculatedCo2e: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  evidenceUrl?: string;
}

export interface CsrActivity {
  id: string;
  title: string;
  description: string;
  points: number;
  xp: number;
  category: string;
  status: 'Draft' | 'Active' | 'Completed';
}

export interface CsrParticipation {
  id: string;
  activityId: string;
  employeeId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string;
  feedback?: string;
  timestamp: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  pillar: 'E' | 'S' | 'G';
  status: 'Draft' | 'Active' | 'Under Review' | 'Completed' | 'Archived';
  points: number;
  xp: number;
  startDate: string;
  endDate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  employeeId: string;
  status: 'In Progress' | 'Completed' | 'Failed' | 'Pending Review';
  proofUrl?: string;
  timestamp: string;
}

export interface XpLedgerEntry {
  id: string;
  employeeId: string;
  type: 'EARN' | 'REDEEM';
  amount: number;
  source: string; // e.g. "challenge-001", "csr-002", "reward-003"
  timestamp: string;
  description: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  metric: string; // e.g. "xp", "carbon_saved", "challenges_completed"
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  pointsAward: number;
}

export interface BadgeAward {
  id: string;
  badgeId: string;
  employeeId: string;
  awardedAt: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  image: string;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  employeeId: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  timestamp: string;
  pointsSpent: number;
}

export interface Policy {
  id: string;
  title: string;
  description: string;
  pillar: 'E' | 'S' | 'G';
  effectiveDate: string;
  version: string;
}

export interface PolicyAcknowledgement {
  id: string;
  policyId: string;
  employeeId: string;
  acknowledgedAt: string;
  status: 'Pending' | 'Completed';
}

export interface Audit {
  id: string;
  title: string;
  description: string;
  auditor: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  date: string;
  findingsCount: number;
}

export interface ComplianceIssue {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  ownerId: string; // employeeId
  dueDate: string;
  isOverdue: boolean;
  linkedAuditId?: string;
  resolutionNotes?: string;
}

export interface DepartmentScore {
  id: string;
  departmentId: string;
  quarter: string; // e.g. '2026-Q1'
  environmental: number;
  social: number;
  governance: number;
  total: number;
}

