import { api } from './apiClient';
import { reference } from './referenceData';

/**
 * Social-metrics service — backed by the real NestJS backend.
 *
 * Powers the Diversity Metrics and Training Completion screens, and feeds the
 * Social pillar visuals (CSR Manager dashboard + Social Report).
 *
 * Diversity metrics are DEFINED as data (metric definitions) via the
 * `/metric-definitions` CRUD endpoints. Diversity readings live under
 * `/diversity-records`, training under `/training-records`.
 *
 * NOTE ON PERIODS: the backend stores a diversity record's `period` as a month
 * (a Date). We surface it to the pages as a `YYYY-MM` string and derive the
 * available period options from the data itself, rather than a fixed quarter
 * list. `QUARTERS` / `CURRENT_QUARTER` remain exported for backwards compat and
 * as sensible fallbacks when there is no data yet.
 */

// Current month as a YYYY-MM string — used as a fallback period option.
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const CURRENT_QUARTER = monthKey(new Date());
export const QUARTERS = [CURRENT_QUARTER];

export interface MetricDefinition {
  /** Backend id — present for persisted definitions, absent for unsaved ones. */
  id?: string;
  code: string;
  name: string;
  unit: string;
  higherIsBetter: boolean;
}

export interface DiversityRecord {
  id: string;
  metricCode: string;
  department: string;
  period: string; // YYYY-MM
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
  completedDate: string | null; // YYYY-MM-DD
  status: TrainingStatus;
}

/** Per-department completion, mirrors the backend training summary. */
export interface TrainingDeptSummary {
  departmentId: string;
  department: string;
  employees: number;
  completed: number;
  completionPct: number;
}

// ───────────────────────── backend wire shapes ─────────────────────────
type Direction = 'higher_better' | 'lower_better';

interface RawMetricDefinition {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  direction: Direction;
  isActive: boolean;
}

interface RawDiversityRecord {
  id: string;
  departmentId: string | null;
  metricDefinitionId: string;
  period: string; // ISO date
  value: number | string;
  metadata?: Record<string, unknown> | null;
  metricDefinition?: RawMetricDefinition;
}

interface RawTrainingRecord {
  id: string;
  employeeId: string;
  trainingName: string;
  hours: number | string | null;
  completedAt: string | null;
  statusId: string | null;
}

interface RawTrainingSummary {
  departmentId: string;
  name: string;
  employees: number;
  completed: number;
  completionPct: number | null;
}

// ───────────────────────── mapping helpers ─────────────────────────
function toMonth(iso: string): string {
  return (iso ?? '').slice(0, 7);
}
function toDay(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null;
}
function defToFrontend(d: RawMetricDefinition): MetricDefinition {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    unit: d.unit ?? '',
    higherIsBetter: d.direction === 'higher_better',
  };
}

// Gender-ratio metric codes we know how to fold into a GenderSplit. If the org
// has not defined any such metric, getGenderSplit() returns an empty array —
// we never fabricate gender numbers.
const GENDER_CODES: Record<'male' | 'female' | 'nonBinary', string[]> = {
  male: ['MALE', 'MALE_PCT', 'MALE_RATIO', 'MALE_REP', 'GENDER_MALE'],
  female: ['FEMALE', 'FEMALE_PCT', 'FEMALE_RATIO', 'FEMALE_REP', 'GENDER_FEMALE'],
  nonBinary: ['NON_BINARY', 'NONBINARY', 'NB', 'NONBINARY_PCT', 'GENDER_NONBINARY', 'GENDER_NB'],
};

class SocialMetricsService {
  // Cache of the training summary so the synchronous aggregation helpers used
  // by the dashboards (which cannot await) have something to read.
  private summaryCache: TrainingDeptSummary[] | null = null;
  private summaryInFlight = false;

  // ─────────────── metric definitions (admin-configurable) ───────────────
  async getDefinitions(): Promise<MetricDefinition[]> {
    const defs = await api.get<RawMetricDefinition[]>('/metric-definitions');
    return defs.filter((d) => d.isActive).map(defToFrontend);
  }

  async createDefinition(def: MetricDefinition): Promise<MetricDefinition> {
    const created = await api.post<RawMetricDefinition>('/metric-definitions', {
      code: def.code,
      name: def.name,
      unit: def.unit,
      direction: def.higherIsBetter ? 'higher_better' : 'lower_better',
      isActive: true,
    });
    return defToFrontend(created);
  }

  async updateDefinition(id: string, def: MetricDefinition): Promise<MetricDefinition> {
    const updated = await api.put<RawMetricDefinition>(`/metric-definitions/${id}`, {
      name: def.name,
      unit: def.unit,
      direction: def.higherIsBetter ? 'higher_better' : 'lower_better',
    });
    return defToFrontend(updated);
  }

  async deleteDefinition(id: string): Promise<void> {
    await api.del(`/metric-definitions/${id}`);
  }

  /**
   * Reconcile an edited list of definitions against the originals, issuing the
   * appropriate create / update / delete calls. Powers the "Manage metric
   * definitions" dialog's batched "Save Changes" action.
   */
  async syncDefinitions(original: MetricDefinition[], updated: MetricDefinition[]): Promise<void> {
    const updatedIds = new Set(updated.filter((d) => d.id).map((d) => d.id));
    const origById = new Map(original.filter((d) => d.id).map((d) => [d.id, d]));

    // Deletes: originals whose id is gone from the updated list.
    for (const o of original) {
      if (o.id && !updatedIds.has(o.id)) await this.deleteDefinition(o.id);
    }
    // Creates + updates.
    for (const u of updated) {
      if (!u.id) {
        await this.createDefinition(u);
        continue;
      }
      const before = origById.get(u.id);
      if (
        before &&
        (before.name !== u.name || before.unit !== u.unit || before.higherIsBetter !== u.higherIsBetter)
      ) {
        await this.updateDefinition(u.id, u);
      }
    }
  }

  // ─────────────── diversity records ───────────────
  async getDiversityRecords(): Promise<DiversityRecord[]> {
    const raw = await api.get<RawDiversityRecord[]>('/diversity-records');
    const out: DiversityRecord[] = [];
    for (const r of raw) {
      out.push({
        id: r.id,
        metricCode: r.metricDefinition?.code ?? '',
        department: await reference.deptNameById(r.departmentId),
        period: toMonth(r.period),
        value: Number(r.value),
      });
    }
    return out;
  }

  /** rec.period is a YYYY-MM string; rec.department is a department name. */
  async addDiversityRecord(rec: Omit<DiversityRecord, 'id'>): Promise<DiversityRecord> {
    const defs = await api.get<RawMetricDefinition[]>('/metric-definitions');
    const def = defs.find((d) => d.code === rec.metricCode);
    if (!def) throw new Error(`Unknown metric code ${rec.metricCode}`);
    const departmentId = await reference.deptIdByName(rec.department);
    const created = await api.post<RawDiversityRecord>('/diversity-records', {
      departmentId,
      metricDefinitionId: def.id,
      period: `${rec.period}-01`,
      value: rec.value,
    });
    return {
      id: created.id,
      metricCode: rec.metricCode,
      department: rec.department,
      period: rec.period,
      value: Number(created.value),
    };
  }

  /**
   * Derive a per-department gender split from the latest-period diversity
   * records whose metric codes map to gender ratios. Returns [] when the org
   * has no such metric definitions — the Diversity page renders an empty state.
   */
  async getGenderSplit(): Promise<GenderSplit[]> {
    const records = await this.getDiversityRecords();
    const codeToKey = new Map<string, 'male' | 'female' | 'nonBinary'>();
    (Object.keys(GENDER_CODES) as ('male' | 'female' | 'nonBinary')[]).forEach((key) => {
      GENDER_CODES[key].forEach((code) => codeToKey.set(code, key));
    });

    const genderRecords = records.filter((r) => codeToKey.has(r.metricCode));
    if (genderRecords.length === 0) return [];

    // Only the most recent period, per department.
    const latest = genderRecords.map((r) => r.period).sort().pop();
    const byDept = new Map<string, GenderSplit>();
    for (const r of genderRecords) {
      if (r.period !== latest) continue;
      const key = codeToKey.get(r.metricCode)!;
      const entry = byDept.get(r.department) ?? { department: r.department, male: 0, female: 0, nonBinary: 0 };
      entry[key] = r.value;
      byDept.set(r.department, entry);
    }
    // Keep only departments that have at least male + female signal.
    return [...byDept.values()].filter((g) => g.male > 0 || g.female > 0);
  }

  // ─────────────── training records ───────────────
  async getTrainingRecords(): Promise<TrainingRecord[]> {
    const raw = await api.get<RawTrainingRecord[]>('/training-records');
    const out: TrainingRecord[] = [];
    for (const r of raw) {
      const lookup = r.statusId ? await reference.byId('TRAINING_STATUS', r.statusId) : undefined;
      const status = (lookup?.label ?? (r.completedAt ? 'Completed' : 'Not Started')) as TrainingStatus;
      out.push({
        id: r.id,
        employeeId: r.employeeId,
        trainingName: r.trainingName,
        hours: Number(r.hours ?? 0),
        completedDate: toDay(r.completedAt),
        status,
      });
    }
    return out;
  }

  async addTrainingRecord(rec: Omit<TrainingRecord, 'id'>): Promise<TrainingRecord> {
    // Map the frontend status label to a lookup id where the backend has one.
    // 'Overdue' has no backend lookup — we let the backend derive the status.
    const statusId = await reference.idByLabel('TRAINING_STATUS', rec.status);
    const created = await api.post<RawTrainingRecord>('/training-records', {
      employeeId: rec.employeeId,
      trainingName: rec.trainingName,
      hours: rec.hours,
      completedAt: rec.completedDate ?? undefined,
      statusId,
    });
    // Invalidate the summary cache so dashboards refresh on next read.
    this.summaryCache = null;
    return {
      id: created.id,
      employeeId: rec.employeeId,
      trainingName: rec.trainingName,
      hours: rec.hours,
      completedDate: rec.completedDate,
      status: rec.status,
    };
  }

  async getTrainingSummary(): Promise<TrainingDeptSummary[]> {
    const raw = await api.get<RawTrainingSummary[]>('/training-records/summary');
    const mapped: TrainingDeptSummary[] = raw.map((s) => ({
      departmentId: s.departmentId,
      department: s.name,
      employees: s.employees,
      completed: s.completed,
      completionPct: Number(s.completionPct ?? 0),
    }));
    this.summaryCache = mapped;
    return mapped;
  }

  // ─────────────── aggregations ───────────────
  async getDepartments(): Promise<string[]> {
    const depts = await reference.departments();
    return depts.map((d) => d.name);
  }

  async employeeDept(employeeId: string): Promise<string> {
    const users = await reference.users();
    const user = users.find((u) => u.id === employeeId);
    return reference.deptNameById(user?.departmentId);
  }

  /**
   * Lazily-populated cache read used by the synchronous helpers below. Kicks off
   * a background fetch the first time it is empty so a subsequent render can
   * pick up real data (dashboards call the sync helpers without awaiting).
   */
  private ensureSummary(): TrainingDeptSummary[] {
    if (!this.summaryCache && !this.summaryInFlight) {
      this.summaryInFlight = true;
      void this.getTrainingSummary().finally(() => {
        this.summaryInFlight = false;
      });
    }
    return this.summaryCache ?? [];
  }

  /**
   * Overall training completion percentage (optionally scoped to a department).
   * SYNCHRONOUS for dashboard compatibility — reads the summary cache.
   */
  trainingCompletionPct(department?: string): number {
    const summary = this.ensureSummary();
    if (department && department !== 'All') {
      const d = summary.find((s) => s.department === department);
      return d ? Math.round(d.completionPct) : 0;
    }
    const employees = summary.reduce((sum, s) => sum + s.employees, 0);
    const completed = summary.reduce((sum, s) => sum + s.completed, 0);
    return employees === 0 ? 0 : Math.round((completed / employees) * 100);
  }

  /** Completion % per department, for the bar chart. SYNCHRONOUS (cache-backed). */
  completionByDepartment(): { department: string; completion: number }[] {
    return this.ensureSummary().map((s) => ({
      department: s.department,
      completion: Math.round(s.completionPct),
    }));
  }
}

export const socialMetricsService = new SocialMetricsService();
