import {
  Department,
  Employee,
  EmissionFactor,
  CarbonTransaction,
  CsrActivity,
  CsrParticipation,
  Challenge,
  ChallengeParticipation,
  XpLedgerEntry,
  Badge,
  BadgeAward,
  Reward,
  RewardRedemption,
  Policy,
  PolicyAcknowledgement,
  Audit,
  ComplianceIssue,
  DepartmentScore,
  NotificationItem,
  LookupData
} from '../types';

// ==========================================
// 1. LOOKUPS
// ==========================================
export const mockLookups: LookupData = {
  severities: [
    { value: 'Critical', label: 'Critical', color: 'bg-red-500 text-white' },
    { value: 'High', label: 'High', color: 'bg-orange-500 text-white' },
    { value: 'Medium', label: 'Medium', color: 'bg-yellow-500 text-black' },
    { value: 'Low', label: 'Low', color: 'bg-gray-400 text-white' },
  ],
  challengeStatuses: [
    { value: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'Active', label: 'Active', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'Under Review', label: 'Under Review', color: 'bg-amber-100 text-amber-800' },
    { value: 'Completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    { value: 'Archived', label: 'Archived', color: 'bg-gray-200 text-gray-500' },
  ],
  complianceStatuses: [
    { value: 'Open', label: 'Open', color: 'bg-red-100 text-red-800' },
    { value: 'In Progress', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
    { value: 'Resolved', label: 'Resolved', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  ],
  difficulties: [
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' },
  ],
  emissionUnits: [
    'kg CO2e/kWh',
    'kg CO2e/liter',
    'kg CO2e/km',
    'kg CO2e/kg',
    'metric tons CO2e'
  ],
  categories: {
    environmental: [
      'Scope 1 - Direct Emissions',
      'Scope 2 - Indirect Emissions',
      'Scope 3 - Value Chain'
    ],
    social: [
      'Community Engagement',
      'Employee Wellbeing',
      'Diversity & Inclusion',
      'Skills & Education'
    ],
    governance: [
      'Policy Compliance',
      'Code of Conduct',
      'Regulatory Filing',
      'Security Audit'
    ]
  },
  departments: [
    'Operations',
    'Logistics',
    'Engineering',
    'Human Resources',
    'Legal & Compliance',
    'Procurement'
  ]
};

// ==========================================
// 2. 6 DEPARTMENTS (1 parent-child pair)
// ==========================================
// Operations (parent) -> Logistics (child)
export const mockDepartments: Department[] = [
  { id: 'dept-1', name: 'Operations', parentDepartmentId: null, code: 'OPS', head: 'Marcus Aurelius' },
  { id: 'dept-2', name: 'Logistics', parentDepartmentId: 'dept-1', code: 'LOG', head: 'Sarah Jenkins' },
  { id: 'dept-3', name: 'Engineering', parentDepartmentId: null, code: 'ENG', head: 'David Beckham' },
  { id: 'dept-4', name: 'Human Resources', parentDepartmentId: null, code: 'HR', head: 'Jane Doe' },
  { id: 'dept-5', name: 'Legal & Compliance', parentDepartmentId: null, code: 'LGC', head: 'Reginald Vance' },
  { id: 'dept-6', name: 'Procurement', parentDepartmentId: null, code: 'PRO', head: 'Eleanor Vance' }
];

// ==========================================
// 3. 25 EMPLOYEES ACROSS DEPARTMENTS
// ==========================================
export const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Eleanor Vance', email: 'eleanor.vance@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', role: 'Admin', departmentId: 'dept-6', points: 1250, level: 18, xp: 8750 },
  { id: 'emp-2', name: 'Dr. Alistair Green', email: 'alistair.green@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', role: 'ESG Manager', departmentId: 'dept-1', points: 980, level: 12, xp: 5900 },
  { id: 'emp-3', name: 'Samantha Social', email: 'samantha.s@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', role: 'CSR Manager', departmentId: 'dept-4', points: 1420, level: 15, xp: 7200 },
  { id: 'emp-4', name: 'Reginald Vance', email: 'reginald.vance@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', role: 'Compliance Officer', departmentId: 'dept-5', points: 430, level: 8, xp: 3200 },
  { id: 'emp-5', name: 'Marcus Aurelius', email: 'marcus.aurelius@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', role: 'Department Head', departmentId: 'dept-1', points: 620, level: 10, xp: 4500 },
  { id: 'emp-6', name: 'David Beckham', email: 'david.beckham@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', role: 'Department Head', departmentId: 'dept-3', points: 720, level: 9, xp: 4100 },
  { id: 'emp-7', name: 'Sarah Jenkins', email: 'sarah.jenkins@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', role: 'Department Head', departmentId: 'dept-2', points: 810, level: 11, xp: 5150 },
  { id: 'emp-8', name: 'Jane Doe', email: 'jane.doe@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', role: 'Department Head', departmentId: 'dept-4', points: 1100, level: 14, xp: 6800 },
  { id: 'emp-9', name: 'Arthur Inspector', email: 'arthur.inspector@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', role: 'Auditor', departmentId: 'dept-5', points: 100, level: 3, xp: 1200 },
  { id: 'emp-10', name: 'Michael Jordan', email: 'michael.jordan@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150', role: 'Employee', departmentId: 'dept-3', points: 410, level: 6, xp: 2600 },
  { id: 'emp-11', name: 'Serena Williams', email: 'serena.williams@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150', role: 'Employee', departmentId: 'dept-3', points: 540, level: 7, xp: 3300 },
  { id: 'emp-12', name: 'Lionel Messi', email: 'lionel.messi@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150', role: 'Employee', departmentId: 'dept-2', points: 650, level: 8, xp: 3900 },
  { id: 'emp-13', name: 'Clara Oswald', email: 'clara.oswald@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150', role: 'Employee', departmentId: 'dept-4', points: 200, level: 4, xp: 1800 },
  { id: 'emp-14', name: 'Peter Parker', email: 'peter.parker@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', role: 'Employee', departmentId: 'dept-3', points: 300, level: 5, xp: 2200 },
  { id: 'emp-15', name: 'Bruce Wayne', email: 'bruce.wayne@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', role: 'Employee', departmentId: 'dept-1', points: 990, level: 13, xp: 6200 },
  { id: 'emp-16', name: 'Diana Prince', email: 'diana.prince@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150', role: 'Employee', departmentId: 'dept-5', points: 450, level: 7, xp: 3100 },
  { id: 'emp-17', name: 'Tony Stark', email: 'tony.stark@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', role: 'Employee', departmentId: 'dept-3', points: 1500, level: 20, xp: 10500 },
  { id: 'emp-18', name: 'Steve Rogers', email: 'steve.rogers@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', role: 'Employee', departmentId: 'dept-1', points: 880, level: 12, xp: 5800 },
  { id: 'emp-19', name: 'Natasha Romanoff', email: 'natasha.romanoff@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', role: 'Employee', departmentId: 'dept-5', points: 760, level: 11, xp: 5050 },
  { id: 'emp-20', name: 'Thor Odinson', email: 'thor.odinson@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', role: 'Employee', departmentId: 'dept-2', points: 210, level: 4, xp: 1950 },
  { id: 'emp-21', name: 'Wanda Maximoff', email: 'wanda.maximoff@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', role: 'Employee', departmentId: 'dept-4', points: 340, level: 5, xp: 2350 },
  { id: 'emp-22', name: 'Barry Allen', email: 'barry.allen@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', role: 'Employee', departmentId: 'dept-2', points: 410, level: 6, xp: 2700 },
  { id: 'emp-23', name: 'Arthur Curry', email: 'arthur.curry@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', role: 'Employee', departmentId: 'dept-1', points: 300, level: 5, xp: 2100 },
  { id: 'emp-24', name: 'Hal Jordan', email: 'hal.jordan@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', role: 'Employee', departmentId: 'dept-2', points: 150, level: 3, xp: 1400 },
  { id: 'emp-25', name: 'Bruce Banner', email: 'bruce.banner@ecosphere.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', role: 'Employee', departmentId: 'dept-3', points: 510, level: 7, xp: 3250 }
];

// ==========================================
// 4. 8 EMISSION FACTORS (with 2 versions of 1 factor)
// ==========================================
export const mockEmissionFactors: EmissionFactor[] = [
  { id: 'ef-1a', name: 'Grid Electricity (California v1)', category: 'Electricity', scope: 2, factor: 0.38, unit: 'kg CO2e/kWh', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-1b', name: 'Grid Electricity (California v2)', category: 'Electricity', scope: 2, factor: 0.32, unit: 'kg CO2e/kWh', version: '2026', effectiveDate: '2026-01-01' },
  { id: 'ef-2', name: 'Diesel Fuel Combustion', category: 'Mobile Fuel', scope: 1, factor: 2.68, unit: 'kg CO2e/liter', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-3', name: 'Natural Gas Heating', category: 'Stationary Fuel', scope: 1, factor: 1.91, unit: 'kg CO2e/m3', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-4', name: 'Standard Flight Travel (Short)', category: 'Business Travel', scope: 3, factor: 0.15, unit: 'kg CO2e/km', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-5', name: 'Standard Flight Travel (Long)', category: 'Business Travel', scope: 3, factor: 0.11, unit: 'kg CO2e/km', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-6', name: 'Waste Disposal (Landfill)', category: 'Waste', scope: 3, factor: 0.45, unit: 'kg CO2e/kg', version: '2025', effectiveDate: '2025-01-01' },
  { id: 'ef-7', name: 'Water Usage (Supply & Treatment)', category: 'Water', scope: 3, factor: 0.28, unit: 'kg CO2e/m3', version: '2025', effectiveDate: '2025-01-01' }
];

// ==========================================
// 5. 60 CARBON TRANSACTIONS ACROSS 12 MONTHS
// ==========================================
// We generate 60 realistic transactions from July 2025 to June 2026
const generateTransactions = (): CarbonTransaction[] => {
  const transactions: CarbonTransaction[] = [];
  const depts = ['dept-1', 'dept-2', 'dept-3', 'dept-4', 'dept-5', 'dept-6'];
  const employees = ['emp-5', 'emp-12', 'emp-14', 'emp-13', 'emp-16', 'emp-1'];
  const factors = ['ef-1a', 'ef-1b', 'ef-2', 'ef-3', 'ef-4', 'ef-5', 'ef-6', 'ef-7'];

  const dates = [
    '2025-07-15', '2025-07-22', '2025-08-10', '2025-08-28', '2025-09-05',
    '2025-09-18', '2025-10-12', '2025-10-24', '2025-11-04', '2025-11-19',
    '2025-12-08', '2025-12-25', '2026-01-05', '2026-01-20', '2026-02-12',
    '2026-02-28', '2026-03-08', '2026-03-24', '2026-04-02', '2026-04-18',
    '2026-05-14', '2026-05-29', '2026-06-11', '2026-06-25'
  ];

  for (let i = 1; i <= 60; i++) {
    const deptId = depts[i % depts.length];
    const empId = employees[i % employees.length];
    
    // Choose appropriate grid electricity factor based on date (before or after 2026-01-01)
    let efId = factors[i % factors.length];
    const dateStr = dates[i % dates.length];
    if (efId === 'ef-1a' && dateStr.startsWith('2026')) {
      efId = 'ef-1b';
    } else if (efId === 'ef-1b' && dateStr.startsWith('2025')) {
      efId = 'ef-1a';
    }

    const factorObj = mockEmissionFactors.find(f => f.id === efId) || mockEmissionFactors[0];
    const quantity = parseFloat((Math.random() * 500 + 50).toFixed(1));
    const calculatedCo2e = parseFloat((quantity * factorObj.factor / 1000).toFixed(3)); // Metric Tons CO2e
    
    transactions.push({
      id: `TX-${String(i).padStart(3, '0')}`,
      departmentId: deptId,
      employeeId: empId,
      emissionFactorId: efId,
      quantity,
      calculatedCo2e,
      date: dateStr,
      status: i % 12 === 0 ? 'Pending' : i % 20 === 0 ? 'Rejected' : 'Approved',
      evidenceUrl: i % 4 === 0 ? 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=400' : undefined
    });
  }
  return transactions;
};

export const mockCarbonTransactions = generateTransactions();

// ==========================================
// 6. 6 CSR ACTIVITIES & 20 PARTICIPATIONS WITH PROOF
// ==========================================
export const mockCsrActivities: CsrActivity[] = [
  { id: 'csr-act-1', title: 'Community Beach Cleanup', description: 'Voluntary coastal cleaning drive at Bayfront Beach.', points: 100, xp: 150, category: 'Community Engagement', status: 'Completed' },
  { id: 'csr-act-2', title: 'Tree Planting Drive', description: 'Planting native trees in the metropolitan forest area.', points: 80, xp: 120, category: 'Community Engagement', status: 'Active' },
  { id: 'csr-act-3', title: 'Wellbeing Mindfulness Week', description: 'A series of online guided meditation and wellness courses.', points: 50, xp: 75, category: 'Employee Wellbeing', status: 'Active' },
  { id: 'csr-act-4', title: 'Diversity & Inclusion Panel', description: 'Interactive panel debate and awareness speech.', points: 40, xp: 60, category: 'Diversity & Inclusion', status: 'Active' },
  { id: 'csr-act-5', title: 'Youth Green Mentorship', description: 'Teaching local high school students basic recycling.', points: 120, xp: 200, category: 'Skills & Education', status: 'Draft' },
  { id: 'csr-act-6', title: 'Charity Food Packing Drive', description: 'Packaging sustainable meals for low-income shelters.', points: 60, xp: 90, category: 'Community Engagement', status: 'Completed' }
];

export const mockCsrParticipations: CsrParticipation[] = [
  { id: 'csr-p-1', activityId: 'csr-act-1', employeeId: 'emp-5', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400', timestamp: '2025-07-20T10:00:00Z' },
  { id: 'csr-p-2', activityId: 'csr-act-1', employeeId: 'emp-6', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400', timestamp: '2025-07-20T10:30:00Z' },
  { id: 'csr-p-3', activityId: 'csr-act-1', employeeId: 'emp-10', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400', timestamp: '2025-07-21T09:15:00Z' },
  { id: 'csr-p-4', activityId: 'csr-act-1', employeeId: 'emp-11', status: 'Rejected', proofUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400', feedback: 'Proof image was unreadable.', timestamp: '2025-07-21T11:45:00Z' },
  { id: 'csr-p-5', activityId: 'csr-act-2', employeeId: 'emp-12', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400', timestamp: '2026-05-10T14:00:00Z' },
  { id: 'csr-p-6', activityId: 'csr-act-2', employeeId: 'emp-15', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400', timestamp: '2026-05-10T14:15:00Z' },
  { id: 'csr-p-7', activityId: 'csr-act-2', employeeId: 'emp-18', status: 'Pending', proofUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400', timestamp: '2026-07-10T16:45:00Z' },
  { id: 'csr-p-8', activityId: 'csr-act-3', employeeId: 'emp-13', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', timestamp: '2026-06-02T08:30:00Z' },
  { id: 'csr-p-9', activityId: 'csr-act-3', employeeId: 'emp-14', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', timestamp: '2026-06-02T09:00:00Z' },
  { id: 'csr-p-10', activityId: 'csr-act-3', employeeId: 'emp-21', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', timestamp: '2026-06-03T10:15:00Z' },
  { id: 'csr-p-11', activityId: 'csr-act-3', employeeId: 'emp-23', status: 'Pending', proofUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', timestamp: '2026-07-11T12:00:00Z' },
  { id: 'csr-p-12', activityId: 'csr-act-4', employeeId: 'emp-19', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400', timestamp: '2026-04-12T13:00:00Z' },
  { id: 'csr-p-13', activityId: 'csr-act-4', employeeId: 'emp-20', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400', timestamp: '2026-04-12T13:30:00Z' },
  { id: 'csr-p-14', activityId: 'csr-act-4', employeeId: 'emp-25', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400', timestamp: '2026-04-13T10:00:00Z' },
  { id: 'csr-p-15', activityId: 'csr-act-6', employeeId: 'emp-7', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1488459711615-496159216f50?w=400', timestamp: '2025-11-15T12:00:00Z' },
  { id: 'csr-p-16', activityId: 'csr-act-6', employeeId: 'emp-8', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1488459711615-496159216f50?w=400', timestamp: '2025-11-15T12:30:00Z' },
  { id: 'csr-p-17', activityId: 'csr-act-6', employeeId: 'emp-16', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1488459711615-496159216f50?w=400', timestamp: '2025-11-16T11:00:00Z' },
  { id: 'csr-p-18', activityId: 'csr-act-6', employeeId: 'emp-22', status: 'Approved', proofUrl: 'https://images.unsplash.com/photo-1488459711615-496159216f50?w=400', timestamp: '2025-11-16T15:00:00Z' },
  { id: 'csr-p-19', activityId: 'csr-act-2', employeeId: 'emp-24', status: 'Pending', proofUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400', timestamp: '2026-07-11T14:10:00Z' },
  { id: 'csr-p-20', activityId: 'csr-act-4', employeeId: 'emp-17', status: 'Pending', proofUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400', timestamp: '2026-07-11T15:20:00Z' }
];

// ==========================================
// 7. 10 CHALLENGES (ALL 5 lifecycle states: Draft, Active, Under Review, Completed, Archived)
// ==========================================
export const mockChallenges: Challenge[] = [
  { id: 'ch-1', title: 'Zero Waste Challenge', description: 'Minimize single-use plastics to absolute zero for 7 days.', pillar: 'E', status: 'Completed', points: 100, xp: 150, startDate: '2025-08-01', endDate: '2025-08-08', difficulty: 'Medium' },
  { id: 'ch-2', title: 'Energy Saver Extraordinaire', description: 'Power down all desktop rigs and server screens before leaving.', pillar: 'E', status: 'Completed', points: 80, xp: 120, startDate: '2025-10-10', endDate: '2025-10-17', difficulty: 'Easy' },
  { id: 'ch-3', title: 'Mindful Commuting Marathon', description: 'Use public transit, bicycle, or walk to office for 2 consecutive weeks.', pillar: 'E', status: 'Active', points: 150, xp: 250, startDate: '2026-07-01', endDate: '2026-07-15', difficulty: 'Hard' },
  { id: 'ch-4', title: 'Water Guardian Week', description: 'Monitor and report micro water leaks in plumbing fixtures.', pillar: 'E', status: 'Active', points: 50, xp: 75, startDate: '2026-07-08', endDate: '2026-07-15', difficulty: 'Easy' },
  { id: 'ch-5', title: 'Mentorship Core Sessions', description: 'Host or take part in professional mentorship for local youths.', pillar: 'S', status: 'Under Review', points: 120, xp: 180, startDate: '2026-06-01', endDate: '2026-06-30', difficulty: 'Medium' },
  { id: 'ch-6', title: 'Ethics & Compliance Awareness', description: 'Successfully execute custom scenario auditing games in compliance.', pillar: 'G', status: 'Under Review', points: 100, xp: 150, startDate: '2026-06-15', endDate: '2026-07-05', difficulty: 'Medium' },
  { id: 'ch-7', title: 'Diversity Film & Debate Nights', description: 'Participate and review weekly inclusion screening documentaries.', pillar: 'S', status: 'Draft', points: 40, xp: 60, startDate: '2026-08-01', endDate: '2026-08-15', difficulty: 'Easy' },
  { id: 'ch-8', title: 'Vendor Audit Protocol Prep', description: 'Standardize direct vendor assessment security policies.', pillar: 'G', status: 'Draft', points: 180, xp: 300, startDate: '2026-08-10', endDate: '2026-08-30', difficulty: 'Hard' },
  { id: 'ch-9', title: 'Healthy Eating Drive 2025', description: 'Track carbon impact of vegetarian or plant-based meals in cafeteria.', pillar: 'S', status: 'Archived', points: 60, xp: 100, startDate: '2025-05-01', endDate: '2025-05-15', difficulty: 'Easy' },
  { id: 'ch-10', title: 'Security Safeguards Drill', description: 'Execute comprehensive simulated anti-phishing department matches.', pillar: 'G', status: 'Archived', points: 90, xp: 140, startDate: '2025-11-01', endDate: '2025-11-10', difficulty: 'Medium' }
];

// ==========================================
// 8. 30 CHALLENGE PARTICIPATIONS
// ==========================================
const generateChallengeParticipations = (): ChallengeParticipation[] => {
  const list: ChallengeParticipation[] = [];
  const employees = mockEmployees.map(e => e.id);
  
  // We distribute 30 participations across active, completed, archived, and under review challenges
  const assignments = [
    { challengeId: 'ch-1', empId: 'emp-5', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400' },
    { challengeId: 'ch-1', empId: 'emp-6', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400' },
    { challengeId: 'ch-1', empId: 'emp-10', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400' },
    { challengeId: 'ch-1', empId: 'emp-11', status: 'Failed' as const },
    { challengeId: 'ch-2', empId: 'emp-12', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=400' },
    { challengeId: 'ch-2', empId: 'emp-13', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=400' },
    { challengeId: 'ch-2', empId: 'emp-14', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=400' },
    { challengeId: 'ch-3', empId: 'emp-15', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-16', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-17', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-18', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-1', status: 'In Progress' as const },
    { challengeId: 'ch-4', empId: 'emp-19', status: 'In Progress' as const },
    { challengeId: 'ch-4', empId: 'emp-20', status: 'In Progress' as const },
    { challengeId: 'ch-4', empId: 'emp-21', status: 'In Progress' as const },
    { challengeId: 'ch-5', empId: 'emp-22', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400' },
    { challengeId: 'ch-5', empId: 'emp-23', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400' },
    { challengeId: 'ch-5', empId: 'emp-24', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400' },
    { challengeId: 'ch-6', empId: 'emp-25', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=400' },
    { challengeId: 'ch-6', empId: 'emp-2', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=400' },
    { challengeId: 'ch-6', empId: 'emp-3', status: 'Pending Review' as const, proofUrl: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=400' },
    { challengeId: 'ch-9', empId: 'emp-4', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
    { challengeId: 'ch-9', empId: 'emp-7', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
    { challengeId: 'ch-9', empId: 'emp-8', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
    { challengeId: 'ch-10', empId: 'emp-9', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400' },
    { challengeId: 'ch-10', empId: 'emp-10', status: 'Completed' as const, proofUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400' },
    { challengeId: 'ch-4', empId: 'emp-5', status: 'In Progress' as const },
    { challengeId: 'ch-4', empId: 'emp-6', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-12', status: 'In Progress' as const },
    { challengeId: 'ch-3', empId: 'emp-13', status: 'In Progress' as const }
  ];

  assignments.forEach((as, i) => {
    list.push({
      id: `ch-part-${String(i+1).padStart(3, '0')}`,
      challengeId: as.challengeId,
      employeeId: as.empId,
      status: as.status,
      proofUrl: as.proofUrl,
      timestamp: '2026-07-05T09:00:00Z'
    });
  });

  return list;
};

export const mockChallengeParticipations = generateChallengeParticipations();

// ==========================================
// 9. XP LEDGER PER EMPLOYEE (with EARN & REDEEM rows)
// ==========================================
const generateXpLedgers = (): XpLedgerEntry[] => {
  const ledger: XpLedgerEntry[] = [];
  mockEmployees.forEach((emp, index) => {
    // Each employee gets at least 2 ledger entries: one EARN and one REDEEM
    ledger.push({
      id: `xp-${emp.id}-1`,
      employeeId: emp.id,
      type: 'EARN',
      amount: Math.round(emp.xp * 1.2),
      source: 'challenge-ch-1',
      timestamp: '2025-08-10T11:00:00Z',
      description: 'Completed Zero Waste Week challenge successfully.'
    });

    ledger.push({
      id: `xp-${emp.id}-2`,
      employeeId: emp.id,
      type: 'REDEEM',
      amount: Math.round(emp.xp * 0.2) || 50,
      source: 'reward-rew-1',
      timestamp: '2026-02-14T15:30:00Z',
      description: 'Redeemed Eco-friendly Mug from rewards system.'
    });
  });
  return ledger;
};

export const mockXpLedgers = generateXpLedgers();

// ==========================================
// 10. 8 BADGES (with unlock rules)
// ==========================================
export const mockBadges: Badge[] = [
  { id: 'bdg-1', name: 'Carbon Cutter Starter', description: 'Awarded for cutting carbon emissions in scope 1.', icon: 'Leaf', metric: 'carbon_saved', operator: 'gte', threshold: 50, pointsAward: 100 },
  { id: 'bdg-2', name: 'Master Refiner', description: 'Logged over 15 emissions tracking entries.', icon: 'Zap', metric: 'entries_logged', operator: 'gte', threshold: 15, pointsAward: 150 },
  { id: 'bdg-3', name: 'Social Impact Pioneer', description: 'Successfully took part in 3 community initiatives.', icon: 'Users', metric: 'challenges_completed', operator: 'gte', threshold: 3, pointsAward: 200 },
  { id: 'bdg-4', name: 'Sustainability Champion', description: 'Reach Level 10 on the platform.', icon: 'Trophy', metric: 'level', operator: 'gte', threshold: 10, pointsAward: 300 },
  { id: 'bdg-5', name: 'Compliance Sentinel', description: 'Signed off all required annual policies.', icon: 'ShieldCheck', metric: 'policies_signed', operator: 'eq', threshold: 5, pointsAward: 120 },
  { id: 'bdg-6', name: 'Eco Guru', description: 'Accumulated more than 5,000 XP in total.', icon: 'Sparkles', metric: 'xp', operator: 'gte', threshold: 5000, pointsAward: 500 },
  { id: 'bdg-7', name: 'Zero Waste Vanguard', description: 'Achieved Zero Waste challenge tier.', icon: 'Trash2', metric: 'zero_waste_score', operator: 'gte', threshold: 90, pointsAward: 180 },
  { id: 'bdg-8', name: 'Perfect Audit Companion', description: 'Close 3 compliance issues assigned to you.', icon: 'CheckSquare', metric: 'issues_closed', operator: 'gte', threshold: 3, pointsAward: 250 }
];

export const mockBadgeAwards: BadgeAward[] = [
  { id: 'ba-1', badgeId: 'bdg-1', employeeId: 'emp-1', awardedAt: '2025-09-12T14:00:00Z' },
  { id: 'ba-2', badgeId: 'bdg-3', employeeId: 'emp-1', awardedAt: '2025-10-18T16:30:00Z' },
  { id: 'ba-3', badgeId: 'bdg-4', employeeId: 'emp-1', awardedAt: '2026-01-05T09:00:00Z' },
  { id: 'ba-4', badgeId: 'bdg-1', employeeId: 'emp-5', awardedAt: '2025-09-12T14:00:00Z' },
  { id: 'ba-5', badgeId: 'bdg-2', employeeId: 'emp-2', awardedAt: '2025-11-20T10:15:00Z' },
  { id: 'ba-6', badgeId: 'bdg-4', employeeId: 'emp-3', awardedAt: '2026-03-01T11:00:00Z' },
  { id: 'ba-7', badgeId: 'bdg-6', employeeId: 'emp-17', awardedAt: '2026-02-15T15:00:00Z' },
  { id: 'ba-8', badgeId: 'bdg-4', employeeId: 'emp-8', awardedAt: '2026-01-10T12:00:00Z' }
];

// ==========================================
// 11. 6 REWARDS (one with stock 0, one with stock 2)
// ==========================================
export const mockRewards: Reward[] = [
  { id: 'rew-1', title: 'Recycled Bamboo Mug', description: 'Premium thermal travel mug made of sustainable bamboo fibers.', pointsCost: 150, stock: 0, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300' }, // Stock 0
  { id: 'rew-2', title: 'Solar Power Charger', description: 'Pocket power bank with highly active photo-voltaic cells.', pointsCost: 400, stock: 2, image: 'https://images.unsplash.com/photo-1620283085439-39620a1e21c4?w=300' }, // Stock 2
  { id: 'rew-3', title: 'Plant-Your-Own Herb Kit', description: 'Biodegradable pot, peat disk, and organic basil seeds.', pointsCost: 80, stock: 25, image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300' },
  { id: 'rew-4', title: 'Organic Cotton Tote Bag', description: 'Extra durable raw woven cotton tote with custom green print.', pointsCost: 60, stock: 50, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300' },
  { id: 'rew-5', title: 'Eco-Smart LED Lightbulb', description: 'WiFi controlled 9W smart bulb with extreme energy efficiency.', pointsCost: 120, stock: 15, image: 'https://images.unsplash.com/photo-1550985543-f47f38aee64e?w=300' },
  { id: 'rew-6', title: 'Trees-for-Future Sponsorship', description: 'Sponsor the planting of 5 trees in a deforestation zone.', pointsCost: 250, stock: 100, image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300' }
];

export const mockRewardRedemptions: RewardRedemption[] = [
  { id: 'red-001', rewardId: 'rew-1', employeeId: 'emp-1', status: 'Completed', timestamp: '2026-03-12T14:00:00Z', pointsSpent: 150 },
  { id: 'red-002', rewardId: 'rew-1', employeeId: 'emp-5', status: 'Completed', timestamp: '2026-03-14T11:20:00Z', pointsSpent: 150 },
  { id: 'red-003', rewardId: 'rew-3', employeeId: 'emp-12', status: 'Completed', timestamp: '2026-05-18T10:00:00Z', pointsSpent: 80 },
  { id: 'red-004', rewardId: 'rew-4', employeeId: 'emp-10', status: 'Completed', timestamp: '2026-06-01T15:30:00Z', pointsSpent: 60 },
  { id: 'red-005', rewardId: 'rew-2', employeeId: 'emp-3', status: 'Completed', timestamp: '2026-06-15T16:00:00Z', pointsSpent: 400 },
  { id: 'red-006', rewardId: 'rew-2', employeeId: 'emp-8', status: 'Completed', timestamp: '2026-06-16T09:15:00Z', pointsSpent: 400 },
  { id: 'red-007', rewardId: 'rew-5', employeeId: 'emp-15', status: 'Completed', timestamp: '2026-06-20T11:00:00Z', pointsSpent: 120 },
  { id: 'red-008', rewardId: 'rew-6', employeeId: 'emp-17', status: 'Completed', timestamp: '2026-05-01T14:45:00Z', pointsSpent: 250 },
  { id: 'red-009', rewardId: 'rew-3', employeeId: 'emp-21', status: 'Pending', timestamp: '2026-07-09T13:00:00Z', pointsSpent: 80 },
  { id: 'red-010', rewardId: 'rew-4', employeeId: 'emp-22', status: 'Pending', timestamp: '2026-07-10T10:30:00Z', pointsSpent: 60 },
  { id: 'red-011', rewardId: 'rew-6', employeeId: 'emp-2', status: 'Pending', timestamp: '2026-07-11T09:15:00Z', pointsSpent: 250 },
  { id: 'red-012', rewardId: 'rew-1', employeeId: 'emp-6', status: 'Cancelled', timestamp: '2026-04-01T15:00:00Z', pointsSpent: 150 }
];

// ==========================================
// 12. 5 POLICIES & ACKNOWLEDGEMENT RECORDS
// ==========================================
export const mockPolicies: Policy[] = [
  { id: 'pol-1', title: 'Anti-Bribery and Corruption v2.1', description: 'Official corporate ethical guidelines on dealing with vendor gifts and hospitality rules.', pillar: 'G', effectiveDate: '2025-01-15', version: '2.1' },
  { id: 'pol-2', title: 'Environmental Sustainability Policy v3.0', description: 'Commitment outlines for waste reductions, double-sided printing, and energy preservation.', pillar: 'E', effectiveDate: '2025-06-01', version: '3.0' },
  { id: 'pol-3', title: 'Inclusion & Equal Opportunity v1.5', description: 'Framework parameters for diverse hiring rosters, workplace equity, and anti-harassment metrics.', pillar: 'S', effectiveDate: '2025-09-10', version: '1.5' },
  { id: 'pol-4', title: 'Data Privacy & HIPAA Framework v4.2', description: 'Critical handling policies for employee, customer and stakeholder health records and private data.', pillar: 'G', effectiveDate: '2026-03-20', version: '4.2' },
  { id: 'pol-5', title: 'Sustainable Supply Chain Protocol v1.0', description: 'Required auditing guidelines for selection and procurement of green third-party vendors.', pillar: 'E', effectiveDate: '2026-07-01', version: '1.0' }
];

// Generate varied acknowledgement completion percentages
// policy 1: 100%, policy 2: 88%, policy 3: 76%, policy 4: 48%, policy 5: 12%
const generatePolicyAcknowledgements = (): PolicyAcknowledgement[] => {
  const list: PolicyAcknowledgement[] = [];
  mockEmployees.forEach((emp, eIdx) => {
    // Policy 1 (All completed)
    list.push({
      id: `ack-p1-${emp.id}`,
      policyId: 'pol-1',
      employeeId: emp.id,
      acknowledgedAt: '2025-02-10T09:00:00Z',
      status: 'Completed'
    });

    // Policy 2 (Completed for index 0 to 21 - ~88%)
    const acknowledgedP2 = eIdx < 22;
    list.push({
      id: `ack-p2-${emp.id}`,
      policyId: 'pol-2',
      employeeId: emp.id,
      acknowledgedAt: acknowledgedP2 ? '2025-06-15T11:30:00Z' : '',
      status: acknowledgedP2 ? 'Completed' : 'Pending'
    });

    // Policy 3 (Completed for index 0 to 18 - ~76%)
    const acknowledgedP3 = eIdx < 19;
    list.push({
      id: `ack-p3-${emp.id}`,
      policyId: 'pol-3',
      employeeId: emp.id,
      acknowledgedAt: acknowledgedP3 ? '2025-10-01T14:15:00Z' : '',
      status: acknowledgedP3 ? 'Completed' : 'Pending'
    });

    // Policy 4 (Completed for index 0 to 11 - ~48%)
    const acknowledgedP4 = eIdx < 12;
    list.push({
      id: `ack-p4-${emp.id}`,
      policyId: 'pol-4',
      employeeId: emp.id,
      acknowledgedAt: acknowledgedP4 ? '2026-04-05T10:00:00Z' : '',
      status: acknowledgedP4 ? 'Completed' : 'Pending'
    });

    // Policy 5 (Completed for index 0 to 2 - ~12%)
    const acknowledgedP5 = eIdx < 3;
    list.push({
      id: `ack-p5-${emp.id}`,
      policyId: 'pol-5',
      employeeId: emp.id,
      acknowledgedAt: acknowledgedP5 ? '2026-07-05T15:30:00Z' : '',
      status: acknowledgedP5 ? 'Completed' : 'Pending'
    });
  });
  return list;
};

export const mockPolicyAcknowledgements = generatePolicyAcknowledgements();

// ==========================================
// 13. 4 AUDITS IN DIFFERENT STATUSES
// ==========================================
export const mockAudits: Audit[] = [
  { id: 'aud-001', title: 'Q3 Environmental & Emissions Audit', description: 'Review of direct diesel and stationary natural gas combustion records.', auditor: 'Apex Green Verifiers Inc.', status: 'Completed', date: '2025-09-18', findingsCount: 2 },
  { id: 'aud-002', title: 'Annual HR diversity & Payroll Equality Audit', description: 'Comprehensive auditing of compensation structures, workplace equity policies.', auditor: 'Deloitte Equity Partners', status: 'In Progress', date: '2026-07-10', findingsCount: 0 },
  { id: 'aud-003', title: 'Supply Chain Vendor Security Audit', description: 'Evaluating digital security standards of third-party logistics operators.', auditor: 'KPMG Cyber Trust', status: 'Scheduled', date: '2026-08-15', findingsCount: 0 },
  { id: 'aud-004', title: 'Bi-Annual Waste & Water Auditing', description: 'Review of landfill waste recycling metrics and cooling tower leak reports.', auditor: 'EcoAssure LLC', status: 'Cancelled', date: '2026-03-12', findingsCount: 0 }
];

// ==========================================
// 14. 12 COMPLIANCE ISSUES (EXACTLY 3 OVERDUE)
// ==========================================
// Every issue has an owner (employeeId) and a dueDate.
// EXACTLY 3 are overdue (dueDate in past, status Open/In Progress, isOverdue: true)
export const mockComplianceIssues: ComplianceIssue[] = [
  // 3 Overdue issues
  { id: 'ci-001', title: 'Logistics Fleet fuel logging omission', description: 'Missed logging for vehicle set E-14 diesel bills in Q1.', severity: 'High', status: 'Open', ownerId: 'emp-7', dueDate: '2026-05-15', isOverdue: true },
  { id: 'ci-002', title: 'Server Room high cooling power drain', description: 'AC unit drawing 40% more electricity than allowed by limits.', severity: 'Medium', status: 'In Progress', ownerId: 'emp-6', dueDate: '2026-06-01', isOverdue: true },
  { id: 'ci-003', title: 'Vendor ESG code of conduct unsigned', description: 'Procurement vendor EcoSupply Co. failed to sign ethical guidelines document.', severity: 'Critical', status: 'Open', ownerId: 'emp-5', dueDate: '2026-06-10', isOverdue: true },
  // Open / In Progress but not overdue
  { id: 'ci-004', title: 'Waste recycling bins mapping missing', description: 'Floors 3 and 4 do not have designated separation maps.', severity: 'Low', status: 'In Progress', ownerId: 'emp-8', dueDate: '2026-08-20', isOverdue: false },
  { id: 'ci-005', title: 'D&I annual training incomplete roster', description: '12% of managers missed the live session deadline.', severity: 'Medium', status: 'Open', ownerId: 'emp-3', dueDate: '2026-07-30', isOverdue: false },
  { id: 'ci-006', title: 'Procurement packaging auditing protocol', description: 'Design dynamic review protocols for raw material vendors.', severity: 'High', status: 'In Progress', ownerId: 'emp-1', dueDate: '2026-08-15', isOverdue: false },
  // Resolved / Closed (cannot be overdue even if dueDate is in the past)
  { id: 'ci-007', title: 'Operations water heater leakage', description: 'Remediated plumbing leak on main boiler valve.', severity: 'Critical', status: 'Resolved', ownerId: 'emp-5', dueDate: '2025-10-15', isOverdue: false },
  { id: 'ci-008', title: 'Logistics truck driver licensing logs', description: 'Audited and updated all commercial cargo driving registries.', severity: 'Medium', status: 'Closed', ownerId: 'emp-7', dueDate: '2025-12-10', isOverdue: false },
  { id: 'ci-009', title: 'Anti-bribery training acknowledgment check', description: 'Verified 100% signoff of policy v2.1.', severity: 'High', status: 'Resolved', ownerId: 'emp-4', dueDate: '2025-03-01', isOverdue: false },
  { id: 'ci-010', title: 'Waste disposal billing mismatch', description: 'Reconciled volume weight differences between contractor and invoices.', severity: 'Low', status: 'Closed', ownerId: 'emp-12', dueDate: '2026-01-20', isOverdue: false },
  { id: 'ci-011', title: 'Data room physical lock damage', description: 'Restored secure keypad locks on critical communications server cabinet.', severity: 'High', status: 'Resolved', ownerId: 'emp-4', dueDate: '2026-06-30', isOverdue: false },
  { id: 'ci-012', title: 'Air filter replacement omission', description: 'Ventilation filters replaced inside chemical warehousing unit.', severity: 'Critical', status: 'Closed', ownerId: 'emp-2', dueDate: '2026-04-10', isOverdue: false }
];

// ==========================================
// 15. DEPARTMENT SCORES PER QUARTER (E/S/G/total)
// ==========================================
export const mockDepartmentScores: DepartmentScore[] = [
  // 2026-Q1
  { id: 'ds-1', departmentId: 'dept-1', quarter: '2026-Q1', environmental: 82, social: 75, governance: 80, total: 79.4 },
  { id: 'ds-2', departmentId: 'dept-2', quarter: '2026-Q1', environmental: 71, social: 70, governance: 72, total: 71.0 },
  { id: 'ds-3', departmentId: 'dept-3', quarter: '2026-Q1', environmental: 84, social: 88, governance: 85, total: 85.6 },
  { id: 'ds-4', departmentId: 'dept-4', quarter: '2026-Q1', environmental: 78, social: 92, governance: 88, total: 85.2 },
  { id: 'ds-5', departmentId: 'dept-5', quarter: '2026-Q1', environmental: 75, social: 80, governance: 92, total: 81.4 },
  { id: 'ds-6', departmentId: 'dept-6', quarter: '2026-Q1', environmental: 80, social: 76, governance: 82, total: 79.6 },

  // 2026-Q2
  { id: 'ds-7', departmentId: 'dept-1', quarter: '2026-Q2', environmental: 85, social: 78, governance: 82, total: 82.1 },
  { id: 'ds-8', departmentId: 'dept-2', quarter: '2026-Q2', environmental: 73, social: 72, governance: 74, total: 72.9 },
  { id: 'ds-9', departmentId: 'dept-3', quarter: '2026-Q2', environmental: 86, social: 90, governance: 87, total: 87.6 },
  { id: 'ds-10', departmentId: 'dept-4', quarter: '2026-Q2', environmental: 80, social: 95, governance: 90, total: 87.5 },
  { id: 'ds-11', departmentId: 'dept-5', quarter: '2026-Q2', environmental: 77, social: 82, governance: 94, total: 83.3 },
  { id: 'ds-12', departmentId: 'dept-6', quarter: '2026-Q2', environmental: 83, social: 79, governance: 84, total: 82.2 }
];

// ==========================================
// 16. 15 NOTIFICATIONS
// ==========================================
export const mockNotifications: NotificationItem[] = [
  { id: 'not-001', title: 'New Policy Acknowledgment', description: 'Sustainable Supply Chain Protocol v1.0 requires signoff by all managers.', time: '10 mins ago', read: false, type: 'warning' },
  { id: 'not-002', title: 'Audit Scheduled: Q3 Environmental Audit', description: 'The external auditor Apex Green scheduled reviews next Tuesday at 9:00 AM.', time: '1 hour ago', read: false, type: 'info' },
  { id: 'not-003', title: 'Compliance issue CI-002 flagged', description: 'High power drain issue flagged in server room AC unit.', time: '4 hours ago', read: false, type: 'danger' },
  { id: 'not-004', title: 'Monthly ESG Performance Report', description: 'June 2026 platform-wide ESG insights report is ready for download.', time: '1 day ago', read: true, type: 'success' },
  { id: 'not-005', title: 'Zero Waste Week challenge completed', description: 'Human Resources reached the 95% single-use plastic reduction target!', time: '1 day ago', read: true, type: 'success' },
  { id: 'not-006', title: 'Carbon transaction approved', description: 'Logistics direct diesel combustion log approved by manager.', time: '2 days ago', read: true, type: 'success' },
  { id: 'not-007', title: 'Compliance issue CI-001 overdue', description: 'Vehicle fuel logging omission issue is now overdue.', time: '3 days ago', read: true, type: 'danger' },
  { id: 'not-008', title: 'New CSR activity approved', description: 'Youth Green Mentorship CSR activity has been approved as draft.', time: '4 days ago', read: true, type: 'info' },
  { id: 'not-009', title: 'New Badge Awarded', description: 'Tony Stark unlocked the "Eco Guru" Badge!', time: '5 days ago', read: true, type: 'success' },
  { id: 'not-010', title: 'Reward Redemption Pending', description: 'Wanda Maximoff requested a Plant-Your-Own Herb Kit.', time: '6 days ago', read: true, type: 'info' },
  { id: 'not-011', title: 'Audit completed', description: 'Annual Environmental & Emissions Audit marked completed with 2 findings.', time: '1 week ago', read: true, type: 'success' },
  { id: 'not-012', title: 'Compliance issue resolved', description: 'Reginald Vance resolved data room physical lock damage.', time: '1 week ago', read: true, type: 'success' },
  { id: 'not-013', title: 'Compliance issue CI-003 flagged', description: 'High severity vendor code of conduct omission flagged.', time: '1 week ago', read: true, type: 'danger' },
  { id: 'not-014', title: 'Inclusion film night starting soon', description: 'Diversity film screening scheduled for tonight in conference room A.', time: '2 weeks ago', read: true, type: 'info' },
  { id: 'not-015', title: 'Server AC replacement verification', description: ' AC maintenance team scheduled physical verification inspections.', time: '2 weeks ago', read: true, type: 'info' }
];
