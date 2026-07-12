import { mockDepartments, mockEmployees } from '../mocks/db';

/**
 * Social-metrics mock service (no backend).
 *
 * Powers the Diversity Metrics and Training Completion screens, and feeds the
 * Social pillar visuals (CSR Manager dashboard + Social Report). Everything is
 * localStorage-backed so records added via the "Record snapshot" / "Record
 * training" drawers survive reloads during a demo.
 *
 * Diversity metrics are DEFINED as data (metric definitions), not hardcoded —
 * the "Manage metric definitions" dialog is a CRUD over that store.
 */

export const QUARTERS = ['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3'];
export const CURRENT_QUARTER = '2026-Q3';

export interface MetricDefinition {
  code: string;
  name: string;
  unit: string;
  higherIsBetter: boolean;
}

export interface DiversityRecord {
  id: string;
  metricCode: string;
  department: string;
  period: string;
  value: number;
}

export interface GenderSplit {
  department: string;
  male: number;
  female: number;
  nonBinary: number;
}

export type TrainingStatus = 'Completed' | 'In Progress' | 'Not Started' | 'Overdue';

export interface TrainingRecord {
  id: string;
  employeeId: string;
  trainingName: string;
  hours: number;
  completedDate: string | null;
  status: TrainingStatus;
}

const KEYS = {
  DEFINITIONS: 'ecosphere_metric_definitions',
  DIVERSITY: 'ecosphere_diversity_records',
  GENDER: 'ecosphere_gender_split',
  TRAINING: 'ecosphere_training_records',
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEFAULT_DEFINITIONS: MetricDefinition[] = [
  { code: 'DIV_INDEX', name: 'Diversity Index', unit: 'index', higherIsBetter: true },
  { code: 'GENDER_BAL', name: 'Gender Balance', unit: '%', higherIsBetter: true },
  { code: 'LEADERSHIP_DIV', name: 'Leadership Diversity', unit: '%', higherIsBetter: true },
  { code: 'PAY_GAP', name: 'Gender Pay Gap', unit: '%', higherIsBetter: false },
  { code: 'ATTRITION', name: 'Voluntary Attrition', unit: '%', higherIsBetter: false },
];

// Per-department diversity index trajectory across QUARTERS (higher is better).
const DIV_INDEX_TRAJECTORY: Record<string, number[]> = {
  Operations: [62, 64, 66, 69],
  Logistics: [55, 57, 58, 61],
  Engineering: [48, 52, 55, 59],
  'Human Resources': [78, 80, 82, 85],
  'Legal & Compliance': [66, 67, 69, 71],
  Procurement: [58, 60, 63, 64],
};

const GENDER_BAL_TRAJECTORY: Record<string, number[]> = {
  Operations: [38, 40, 42, 44],
  Logistics: [30, 31, 33, 35],
  Engineering: [26, 28, 30, 33],
  'Human Resources': [58, 60, 61, 63],
  'Legal & Compliance': [46, 47, 48, 50],
  Procurement: [40, 41, 43, 45],
};

const PAY_GAP_TRAJECTORY: Record<string, number[]> = {
  Operations: [12, 11, 10, 9],
  Logistics: [15, 14, 14, 13],
  Engineering: [18, 17, 16, 15],
  'Human Resources': [6, 5, 5, 4],
  'Legal & Compliance': [9, 9, 8, 7],
  Procurement: [13, 12, 11, 11],
};

const DEFAULT_GENDER_SPLIT: GenderSplit[] = [
  { department: 'Operations', male: 28, female: 21, nonBinary: 2 },
  { department: 'Logistics', male: 34, female: 18, nonBinary: 1 },
  { department: 'Engineering', male: 41, female: 19, nonBinary: 3 },
  { department: 'Human Resources', male: 12, female: 20, nonBinary: 1 },
  { department: 'Legal & Compliance', male: 15, female: 14, nonBinary: 1 },
  { department: 'Procurement', male: 19, female: 16, nonBinary: 1 },
];

const TRAINING_NAMES = [
  'ESG Fundamentals',
  'Anti-Harassment & Respect',
  'Data Privacy & GDPR',
  'Carbon Accounting Basics',
  'Inclusive Leadership',
  'Workplace Safety',
  'Ethical Procurement',
  'Cybersecurity Awareness',
];

function buildDefaultTraining(): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  const statusCycle: TrainingStatus[] = [
    'Completed', 'Completed', 'Completed', 'In Progress', 'Completed',
    'Overdue', 'Completed', 'Not Started', 'Completed', 'In Progress',
  ];
  mockEmployees.forEach((emp, idx) => {
    // Each employee gets 1–2 training assignments, deterministically.
    const first = TRAINING_NAMES[idx % TRAINING_NAMES.length];
    const status = statusCycle[idx % statusCycle.length];
    const hours = 2 + (idx % 6) * 2; // 2..12
    const completed = status === 'Completed';
    const month = (idx % 3) + 5; // May / Jun / Jul 2026
    records.push({
      id: `tr-${idx + 1}`,
      employeeId: emp.id,
      trainingName: first,
      hours,
      completedDate: completed ? `2026-0${month}-${String((idx % 27) + 1).padStart(2, '0')}` : null,
      status,
    });

    if (idx % 3 === 0) {
      const second = TRAINING_NAMES[(idx + 3) % TRAINING_NAMES.length];
      const status2: TrainingStatus = idx % 2 === 0 ? 'Completed' : 'In Progress';
      records.push({
        id: `tr-${idx + 1}b`,
        employeeId: emp.id,
        trainingName: second,
        hours: 3 + (idx % 4) * 2,
        completedDate: status2 === 'Completed' ? `2026-06-${String((idx % 27) + 1).padStart(2, '0')}` : null,
        status: status2,
      });
    }
  });
  return records;
}

function buildDefaultDiversity(): DiversityRecord[] {
  const records: DiversityRecord[] = [];
  let seq = 1;
  const push = (metricCode: string, traj: Record<string, number[]>) => {
    mockDepartments.forEach(dept => {
      const series = traj[dept.name];
      if (!series) return;
      QUARTERS.forEach((period, qi) => {
        records.push({
          id: `dv-${seq++}`,
          metricCode,
          department: dept.name,
          period,
          value: series[qi],
        });
      });
    });
  };
  push('DIV_INDEX', DIV_INDEX_TRAJECTORY);
  push('GENDER_BAL', GENDER_BAL_TRAJECTORY);
  push('PAY_GAP', PAY_GAP_TRAJECTORY);
  return records;
}

// ---------------------------------------------------------------------------
// Store plumbing
// ---------------------------------------------------------------------------

function load<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T[];
  } catch {
    /* reseed */
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

class SocialMetricsService {
  // --- Metric definitions (admin-configurable) ---
  getDefinitions(): MetricDefinition[] {
    return load(KEYS.DEFINITIONS, DEFAULT_DEFINITIONS);
  }
  saveDefinitions(defs: MetricDefinition[]): void {
    save(KEYS.DEFINITIONS, defs);
  }

  // --- Diversity records ---
  getDiversityRecords(): DiversityRecord[] {
    return load(KEYS.DIVERSITY, buildDefaultDiversity());
  }
  addDiversityRecord(rec: Omit<DiversityRecord, 'id'>): DiversityRecord {
    const records = this.getDiversityRecords();
    const created: DiversityRecord = { ...rec, id: `dv-${Date.now()}` };
    save(KEYS.DIVERSITY, [created, ...records]);
    return created;
  }

  getGenderSplit(): GenderSplit[] {
    return load(KEYS.GENDER, DEFAULT_GENDER_SPLIT);
  }

  // --- Training records ---
  getTrainingRecords(): TrainingRecord[] {
    return load(KEYS.TRAINING, buildDefaultTraining());
  }
  addTrainingRecord(rec: Omit<TrainingRecord, 'id'>): TrainingRecord {
    const records = this.getTrainingRecords();
    const created: TrainingRecord = { ...rec, id: `tr-${Date.now()}` };
    save(KEYS.TRAINING, [created, ...records]);
    return created;
  }

  // --- Aggregations ---
  getDepartments(): string[] {
    return mockDepartments.map(d => d.name);
  }

  employeeDept(employeeId: string): string {
    const emp = mockEmployees.find(e => e.id === employeeId);
    const dept = emp ? mockDepartments.find(d => d.id === emp.departmentId) : undefined;
    return dept?.name ?? 'Unassigned';
  }

  /** Overall training completion percentage (optionally scoped to a department). */
  trainingCompletionPct(department?: string): number {
    const records = this.getTrainingRecords().filter(
      r => !department || department === 'All' || this.employeeDept(r.employeeId) === department
    );
    if (records.length === 0) return 0;
    const completed = records.filter(r => r.status === 'Completed').length;
    return Math.round((completed / records.length) * 100);
  }

  /** Completion % per department, for the bar chart. */
  completionByDepartment(): { department: string; completion: number }[] {
    return mockDepartments.map(d => ({
      department: d.name,
      completion: this.trainingCompletionPct(d.name),
    }));
  }
}

export const socialMetricsService = new SocialMetricsService();
