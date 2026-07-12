import { StatCardData, PendingApproval, ActivityFeedItem, NotificationItem, User, UserRole } from '../types';
import {
  mockNotifications as dbNotifications,
  mockEmployees,
  mockDepartments,
  mockCarbonTransactions,
  mockChallenges,
  mockComplianceIssues
} from './db';

export interface EsgDetails {
  total: number;
  environmental: number;
  social: number;
  governance: number;
  weights: {
    environmental: number;
    social: number;
    governance: number;
  };
}

export const mockEsgScoreDetails: EsgDetails = {
  total: 82,
  environmental: 78,
  social: 85,
  governance: 83,
  weights: {
    environmental: 40,
    social: 30,
    governance: 30
  }
};

export interface CarbonTrendData {
  month: string;
  actual: number;
  goal: number;
}

export const mockCarbonTrend: CarbonTrendData[] = [
  { month: 'Jul 25', actual: 140, goal: 120 },
  { month: 'Aug 25', actual: 135, goal: 120 },
  { month: 'Sep 25', actual: 138, goal: 120 },
  { month: 'Oct 25', actual: 130, goal: 115 },
  { month: 'Nov 25', actual: 125, goal: 115 },
  { month: 'Dec 25', actual: 128, goal: 115 },
  { month: 'Jan 26', actual: 118, goal: 110 },
  { month: 'Feb 26', actual: 115, goal: 110 },
  { month: 'Mar 26', actual: 110, goal: 110 },
  { month: 'Apr 26', actual: 105, goal: 105 },
  { month: 'May 26', actual: 102, goal: 105 },
  { month: 'Jun 26', actual: 98, goal: 100 }
];

export interface DepartmentRanking {
  department: string;
  score: number;
  environmental: number;
  social: number;
  governance: number;
}

export const mockDepartmentRankings: DepartmentRanking[] = [
  { department: 'Human Resources', score: 92, environmental: 85, social: 98, governance: 93 },
  { department: 'Engineering', score: 88, environmental: 84, social: 90, governance: 90 },
  { department: 'Procurement', score: 84, environmental: 89, social: 79, governance: 84 },
  { department: 'Legal & Compliance', score: 81, environmental: 70, social: 82, governance: 91 },
  { department: 'Operations', score: 76, environmental: 82, social: 72, governance: 74 },
  { department: 'Logistics', score: 71, environmental: 73, social: 70, governance: 70 }
];

// Dynamically count open compliance issues and active challenges
const activeChallengesCount = mockChallenges.filter(c => c.status === 'Active').length;
const openIssuesCount = mockComplianceIssues.filter(i => i.status === 'Open' || i.status === 'In Progress').length;

export const mockStatCards: StatCardData[] = [
  {
    id: 'total-co2e',
    title: 'Total CO₂e Emissions',
    value: '1,240',
    delta: '-8.2%',
    isPositive: true,
    sparkline: [1350, 1320, 1340, 1290, 1280, 1270, 1260, 1250, 1245, 1240],
    unit: 't CO₂e'
  },
  {
    id: 'org-esg-score',
    title: 'Org ESG Score',
    value: '82',
    delta: '+2.4%',
    isPositive: true,
    sparkline: [78, 78, 79, 79, 80, 80, 81, 81, 82, 82],
    unit: '/ 100'
  },
  {
    id: 'active-challenges',
    title: 'Active Challenges',
    value: String(activeChallengesCount),
    delta: '+4.0%',
    isPositive: true,
    sparkline: [10, 11, 11, 12, 12, 13, 13, 13, activeChallengesCount, activeChallengesCount],
    unit: 'Challenges'
  },
  {
    id: 'open-compliance-issues',
    title: 'Open Compliance Issues',
    value: String(openIssuesCount),
    delta: '-25.0%',
    isPositive: true,
    sparkline: [6, 5, 5, 5, 4, 4, 4, 3, 3, openIssuesCount],
    unit: 'Issues'
  }
];

export const mockPendingApprovals: PendingApproval[] = [
  {
    id: 'PA-001',
    type: 'challenge',
    title: 'Challenge Completion: Zero Waste Week',
    subtitle: 'Marcus Aurelius completed HR initiative with proof',
    user: {
      name: 'Marcus Aurelius',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      department: 'Human Resources'
    },
    timestamp: '2026-07-11T14:30:00Z',
    details: {
      xp: 150,
      points: 100,
      evidenceUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'
    }
  },
  {
    id: 'PA-002',
    type: 'transaction',
    title: 'Carbon Transaction: Logistics Fleet Q2 Fuel',
    subtitle: 'Direct diesel consumption log for Logistics fleet',
    user: {
      name: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      department: 'Logistics'
    },
    timestamp: '2026-07-11T11:15:00Z',
    details: {
      quantity: 12.5,
      unit: 'metric tons CO₂e',
      factor: 'Diesel Fuel Combustion (EPA 2024)'
    }
  },
  {
    id: 'PA-003',
    type: 'csr',
    title: 'CSR Participation: Charity Marathon Run',
    subtitle: 'Community engagement run for children education fundraiser',
    user: {
      name: 'David Beckham',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      department: 'Engineering'
    },
    timestamp: '2026-07-11T09:45:00Z',
    details: {
      points: 50,
      evidenceUrl: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=400'
    }
  }
];

export const mockActivities: ActivityFeedItem[] = [
  {
    id: 'ACT-001',
    type: 'badge_unlock',
    title: 'Jane Doe unlocked "Carbon Cutter" Badge',
    subtitle: 'Achieved by logging 5 consecutive emission reductions in Scope 1.',
    time: '2 hours ago',
    user: {
      name: 'Jane Doe',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    },
    pillar: 'E'
  },
  {
    id: 'ACT-002',
    type: 'transaction',
    title: 'Logistics fuel emission factors auto-validated',
    subtitle: 'Verified against EPA Emission Factors 2024 (Scope 1 Direct).',
    time: '4 hours ago',
    user: {
      name: 'System Validator',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
    },
    pillar: 'E'
  },
  {
    id: 'ACT-003',
    type: 'policy_ack',
    title: 'Mark Smith acknowledged Anti-Bribery Policy v3.2',
    subtitle: 'Completed compliance training block on Governance ethics.',
    time: '6 hours ago',
    user: {
      name: 'Mark Smith',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    },
    pillar: 'G'
  },
  {
    id: 'ACT-004',
    type: 'compliance_resolved',
    title: 'CI-2041 "Server Room leak" marked as Resolved',
    subtitle: 'Compliance officer verified remediation steps and cooling repairs.',
    time: '1 day ago',
    user: {
      name: 'Reginald Vance',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
    },
    pillar: 'G'
  },
  {
    id: 'ACT-005',
    type: 'challenge_completed',
    title: 'HR Department completed "Zero Waste Week"',
    subtitle: 'Earned +150 XP for reaching 95% single-use plastic reduction target.',
    time: '1 day ago',
    user: {
      name: 'Department Bot',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    },
    pillar: 'S'
  }
];

export const mockNotifications: NotificationItem[] = dbNotifications;

export const mockUsersByRole: Record<string, { name: string; email: string; avatar: string; points: number; level: number; xp: number }> = {
  Admin: {
    name: 'Eleanor Vance',
    email: 'eleanor.vance@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    points: 1250,
    level: 18,
    xp: 8750
  },
  'ESG Manager': {
    name: 'Dr. Alistair Green',
    email: 'alistair.green@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    points: 980,
    level: 12,
    xp: 5900
  },
  'CSR Manager': {
    name: 'Samantha Social',
    email: 'samantha.s@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    points: 1420,
    level: 15,
    xp: 7200
  },
  'Compliance Officer': {
    name: 'Reginald Vance',
    email: 'reginald.vance@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    points: 430,
    level: 8,
    xp: 3200
  },
  'Department Head': {
    name: 'Marcus Aurelius',
    email: 'marcus.aurelius@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    points: 620,
    level: 10,
    xp: 4500
  },
  Employee: {
    name: 'David Beckham',
    email: 'david.beckham@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    points: 720,
    level: 9,
    xp: 4100
  },
  Auditor: {
    name: 'Arthur Inspector',
    email: 'arthur.inspector@ecosphere.com',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    points: 100,
    level: 3,
    xp: 1200
  }
};
