import {
  CsrActivity,
  CsrParticipation,
  Policy,
  PolicyAcknowledgement,
  Audit,
  ComplianceIssue,
  Employee
} from '../types';
import {
  mockCsrActivities,
  mockCsrParticipations,
  mockPolicies,
  mockPolicyAcknowledgements,
  mockAudits,
  mockComplianceIssues,
  mockEmployees
} from '../mocks/db';

const STORAGE_KEYS = {
  CSR_ACTIVITIES: 'ecosphere_csr_activities',
  CSR_PARTICIPATIONS: 'ecosphere_csr_participations',
  POLICIES: 'ecosphere_policies',
  POLICY_ACKNOWLEDGEMENTS: 'ecosphere_policy_acknowledgements',
  AUDITS: 'ecosphere_audits',
  COMPLIANCE_ISSUES: 'ecosphere_compliance_issues',
  EMPLOYEES: 'ecosphere_employees'
};

// Rich mock details for CSR Activities
const csrActDetails: Record<string, { startDate: string; endDate: string; location: string; capacity: number; coverUrl: string }> = {
  'csr-act-1': {
    startDate: '2025-07-20',
    endDate: '2025-07-21',
    location: 'Bayfront Beach',
    capacity: 25,
    coverUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600'
  },
  'csr-act-2': {
    startDate: '2026-05-10',
    endDate: '2026-05-12',
    location: 'Metropolitan Forest',
    capacity: 30,
    coverUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=600'
  },
  'csr-act-3': {
    startDate: '2026-06-01',
    endDate: '2026-06-07',
    location: 'Online - Zoom Meeting',
    capacity: 100,
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600'
  },
  'csr-act-4': {
    startDate: '2026-04-12',
    endDate: '2026-04-13',
    location: 'Main Conference Auditorium',
    capacity: 50,
    coverUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600'
  },
  'csr-act-5': {
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    location: 'Downtown Youth Center',
    capacity: 15,
    coverUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600'
  },
  'csr-act-6': {
    startDate: '2025-11-15',
    endDate: '2025-11-16',
    location: 'Operations Warehouse B',
    capacity: 40,
    coverUrl: 'https://images.unsplash.com/photo-1488459711615-496159216f50?w=600'
  }
};

class SocialGovernanceService {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    // 1. Employees (sync with gamification key if needed, or fallback)
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mockEmployees));
    }

    // 2. CSR Activities
    if (!localStorage.getItem(STORAGE_KEYS.CSR_ACTIVITIES)) {
      const enrichedActivities = mockCsrActivities.map(act => {
        const details = csrActDetails[act.id] || {
          startDate: '2026-07-20',
          endDate: '2026-07-22',
          location: 'HQ Green Garden',
          capacity: 25,
          coverUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600'
        };
        return {
          ...act,
          ...details
        };
      });
      localStorage.setItem(STORAGE_KEYS.CSR_ACTIVITIES, JSON.stringify(enrichedActivities));
    }

    // 3. CSR Participations
    if (!localStorage.getItem(STORAGE_KEYS.CSR_PARTICIPATIONS)) {
      localStorage.setItem(STORAGE_KEYS.CSR_PARTICIPATIONS, JSON.stringify(mockCsrParticipations));
    }

    // 4. Policies
    if (!localStorage.getItem(STORAGE_KEYS.POLICIES)) {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(mockPolicies));
    }

    // 5. Policy Acknowledgements
    if (!localStorage.getItem(STORAGE_KEYS.POLICY_ACKNOWLEDGEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.POLICY_ACKNOWLEDGEMENTS, JSON.stringify(mockPolicyAcknowledgements));
    }

    // 6. Audits
    if (!localStorage.getItem(STORAGE_KEYS.AUDITS)) {
      // Add optional findings, auditScore, status (e.g. Completed renders read-only)
      const auditsEnriched = mockAudits.map(aud => ({
        ...aud,
        findings: aud.status === 'Completed' ? 'Minor emissions inventory reporting gaps. Standardized verification is recommended.' : '',
        auditScore: aud.status === 'Completed' ? 92 : undefined
      }));
      localStorage.setItem(STORAGE_KEYS.AUDITS, JSON.stringify(auditsEnriched));
    }

    // 7. Compliance Issues
    if (!localStorage.getItem(STORAGE_KEYS.COMPLIANCE_ISSUES)) {
      localStorage.setItem(STORAGE_KEYS.COMPLIANCE_ISSUES, JSON.stringify(mockComplianceIssues));
    }
  }

  private getItems<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setItems<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  // --- Employees ---
  getEmployees(): Employee[] {
    const fromSelf = this.getItems<Employee>(STORAGE_KEYS.EMPLOYEES);
    if (fromSelf.length > 0) return fromSelf;
    // Fallback or attempt to read from gamification service key
    const fromGami = localStorage.getItem('ecosphere_employees');
    return fromGami ? JSON.parse(fromGami) : mockEmployees;
  }

  // --- CSR Activities & Participations ---
  getActivities(): (CsrActivity & { startDate: string; endDate: string; location: string; capacity: number; coverUrl: string; joinedCount: number })[] {
    const activities = this.getItems<CsrActivity & { startDate: string; endDate: string; location: string; capacity: number; coverUrl: string }>(STORAGE_KEYS.CSR_ACTIVITIES);
    const participations = this.getParticipations();

    return activities.map(act => {
      // count active/approved/pending joined employees
      const joinedCount = participations.filter(p => p.activityId === act.id && (p.status === 'Approved' || p.status === 'Pending')).length;
      return {
        ...act,
        joinedCount
      };
    });
  }

  getActivityById(id: string) {
    return this.getActivities().find(act => act.id === id);
  }

  getParticipations(): CsrParticipation[] {
    return this.getItems<CsrParticipation>(STORAGE_KEYS.CSR_PARTICIPATIONS);
  }

  joinActivity(activityId: string, employeeId: string, proofUrl?: string): CsrParticipation {
    const participations = this.getParticipations();
    
    // Check if already joined
    const existing = participations.find(p => p.activityId === activityId && p.employeeId === employeeId);
    if (existing) {
      return existing;
    }

    const newPart: CsrParticipation = {
      id: `csr-p-${Date.now()}`,
      activityId,
      employeeId,
      status: 'Pending',
      proofUrl: proofUrl || 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400', // default mock proof if joined
      timestamp: new Date().toISOString()
    };

    participations.push(newPart);
    this.setItems(STORAGE_KEYS.CSR_PARTICIPATIONS, participations);
    return newPart;
  }

  approveParticipation(id: string, feedback?: string): void {
    const participations = this.getParticipations();
    const updated = participations.map(p => {
      if (p.id === id) {
        // Award points and XP to the employee
        this.awardPoints(p.employeeId, p.activityId);
        return { ...p, status: 'Approved' as const, feedback };
      }
      return p;
    });
    this.setItems(STORAGE_KEYS.CSR_PARTICIPATIONS, updated);
  }

  rejectParticipation(id: string, feedback: string): void {
    const participations = this.getParticipations();
    const updated = participations.map(p => {
      if (p.id === id) {
        return { ...p, status: 'Rejected' as const, feedback };
      }
      return p;
    });
    this.setItems(STORAGE_KEYS.CSR_PARTICIPATIONS, updated);
  }

  private awardPoints(employeeId: string, activityId: string) {
    const employees = this.getEmployees();
    const activity = this.getActivityById(activityId);
    if (!activity) return;

    const updatedEmployees = employees.map(emp => {
      if (emp.id === employeeId) {
        const newPoints = emp.points + activity.points;
        const newXp = emp.xp + activity.xp;
        // Simple level up calculation (every 500 XP is a level)
        const newLevel = Math.floor(newXp / 500) + 1;
        
        // Also update the employee in gamification storage key so other pages see it
        const empUpdated = {
          ...emp,
          points: newPoints,
          xp: newXp,
          level: newLevel
        };

        return empUpdated;
      }
      return emp;
    });

    this.setItems(STORAGE_KEYS.EMPLOYEES, updatedEmployees);
    // Sync with gamification key
    localStorage.setItem('ecosphere_employees', JSON.stringify(updatedEmployees));
  }

  // --- Policies & Acknowledgements ---
  getPolicies(): Policy[] {
    return this.getItems<Policy>(STORAGE_KEYS.POLICIES);
  }

  getPolicyById(id: string): Policy | undefined {
    return this.getPolicies().find(p => p.id === id);
  }

  getPolicyAcknowledgements(): PolicyAcknowledgement[] {
    return this.getItems<PolicyAcknowledgement>(STORAGE_KEYS.POLICY_ACKNOWLEDGEMENTS);
  }

  getAcknowledgementsForEmployee(employeeId: string): PolicyAcknowledgement[] {
    return this.getPolicyAcknowledgements().filter(ack => ack.employeeId === employeeId);
  }

  acknowledgePolicy(policyId: string, employeeId: string): PolicyAcknowledgement {
    const acks = this.getPolicyAcknowledgements();
    const existingIdx = acks.findIndex(ack => ack.policyId === policyId && ack.employeeId === employeeId);

    const now = new Date().toISOString();
    let updatedAck: PolicyAcknowledgement;

    if (existingIdx >= 0) {
      acks[existingIdx] = {
        ...acks[existingIdx],
        status: 'Completed',
        acknowledgedAt: now
      };
      updatedAck = acks[existingIdx];
    } else {
      updatedAck = {
        id: `ack-p-${Date.now()}`,
        policyId,
        employeeId,
        acknowledgedAt: now,
        status: 'Completed'
      };
      acks.push(updatedAck);
    }

    this.setItems(STORAGE_KEYS.POLICY_ACKNOWLEDGEMENTS, acks);
    return updatedAck;
  }

  // --- Audits ---
  getAudits(): (Audit & { findings?: string; auditScore?: number })[] {
    return this.getItems<Audit & { findings?: string; auditScore?: number }>(STORAGE_KEYS.AUDITS);
  }

  getAuditById(id: string) {
    return this.getAudits().find(aud => aud.id === id);
  }

  updateAudit(updatedAudit: Audit & { findings?: string; auditScore?: number }): void {
    const audits = this.getAudits();
    const index = audits.findIndex(a => a.id === updatedAudit.id);
    if (index >= 0) {
      audits[index] = {
        ...audits[index],
        ...updatedAudit
      };
      this.setItems(STORAGE_KEYS.AUDITS, audits);
    }
  }

  // --- Compliance Issues ---
  getComplianceIssues(): ComplianceIssue[] {
    return this.getItems<ComplianceIssue>(STORAGE_KEYS.COMPLIANCE_ISSUES);
  }

  getComplianceIssueById(id: string): ComplianceIssue | undefined {
    return this.getComplianceIssues().find(ci => ci.id === id);
  }

  createComplianceIssue(issue: Omit<ComplianceIssue, 'id' | 'isOverdue'>): ComplianceIssue {
    const issues = this.getComplianceIssues();
    const id = `ci-${String(issues.length + 1).padStart(3, '0')}`;
    
    const dueDateStr = issue.dueDate;
    const isOverdue = new Date(dueDateStr) < new Date() && issue.status !== 'Resolved' && issue.status !== 'Closed';

    const newIssue: ComplianceIssue = {
      ...issue,
      id,
      isOverdue
    };

    issues.push(newIssue);
    this.setItems(STORAGE_KEYS.COMPLIANCE_ISSUES, issues);
    return newIssue;
  }

  updateComplianceIssue(updatedIssue: ComplianceIssue): void {
    const issues = this.getComplianceIssues();
    const index = issues.findIndex(ci => ci.id === updatedIssue.id);
    if (index >= 0) {
      // Re-evaluate overdue status
      const isOverdue = new Date(updatedIssue.dueDate) < new Date() && updatedIssue.status !== 'Resolved' && updatedIssue.status !== 'Closed';
      issues[index] = {
        ...updatedIssue,
        isOverdue
      };
      this.setItems(STORAGE_KEYS.COMPLIANCE_ISSUES, issues);
    }
  }

  deleteComplianceIssue(id: string): void {
    const issues = this.getComplianceIssues();
    const filtered = issues.filter(ci => ci.id !== id);
    this.setItems(STORAGE_KEYS.COMPLIANCE_ISSUES, filtered);
  }
}

export const socialGovernanceService = new SocialGovernanceService();
