import { api } from './apiClient';
import { reference, scopeUtil } from './referenceData';

export interface EmissionFactor {
  id: string;
  name: string;
  category: string;
  scope: 1 | 2 | 3;
  factor: number;
  unit: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
}

export interface CarbonTransaction {
  id: string;
  date: string;
  department: string;
  factorName: string;
  emissionFactorId: string;
  quantity: number;
  unit: string;
  factorValue: number;
  calculatedCo2e: number;
  mode: 'Auto' | 'Manual';
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  department: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string;
}

interface BackendFactor {
  id: string; name: string; category: string; unitId: string; scopeId: string;
  factorValue: string | number; sourceReference: string | null;
  effectiveFrom: string; effectiveTo: string | null;
}
interface BackendCarbon {
  id: string; departmentId: string; emissionFactorId: string; factorValueSnapshot: string | number;
  quantity: string | number; unitId: string; co2eKg: string | number;
  calculationMode: 'AUTO' | 'MANUAL'; occurredAt: string; notes: string | null;
}
interface BackendGoal {
  id: string; title: string; departmentId: string | null; targetValue: string | number;
  baselineValue: string | number | null; unitId: string | null; periodStart: string; periodEnd: string;
  progressPct: string | number | null;
}

const dateOnly = (d: string) => (d ? d.slice(0, 10) : d);

async function mapFactor(f: BackendFactor): Promise<EmissionFactor> {
  const [unit, scope] = await Promise.all([
    reference.byId('UNIT', f.unitId),
    reference.byId('EMISSION_SCOPE', f.scopeId),
  ]);
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    scope: scopeUtil.toNum(scope?.code),
    factor: Number(f.factorValue),
    unit: unit?.label ?? '',
    effectiveFrom: dateOnly(f.effectiveFrom),
    effectiveTo: f.effectiveTo ? dateOnly(f.effectiveTo) : null,
    source: f.sourceReference ?? '',
  };
}

export const environmentalService = {
  init() { /* no-op: state now lives in the backend */ },

  // ----------------- EMISSION FACTORS -----------------
  async getEmissionFactors(): Promise<EmissionFactor[]> {
    const rows = await api.get<BackendFactor[]>('/emission-factors');
    return Promise.all(rows.map(mapFactor));
  },

  async saveEmissionFactor(factor: Omit<EmissionFactor, 'id'> & { id?: string }): Promise<EmissionFactor> {
    const [unitId, scopeId] = await Promise.all([
      reference.idByLabel('UNIT', factor.unit),
      reference.idOf('EMISSION_SCOPE', scopeUtil.toCode(factor.scope)),
    ]);
    const body = {
      name: factor.name,
      category: factor.category,
      unitId,
      scopeId,
      factorValue: factor.factor,
      sourceReference: factor.source,
      effectiveFrom: factor.effectiveFrom,
      ...(factor.effectiveTo ? { effectiveTo: factor.effectiveTo } : {}),
    };
    const saved = factor.id
      ? await api.put<BackendFactor>(`/emission-factors/${factor.id}`, body)
      : await api.post<BackendFactor>('/emission-factors', body);
    return mapFactor(saved);
  },

  async deleteEmissionFactor(id: string): Promise<boolean> {
    await api.del(`/emission-factors/${id}`);
    return true;
  },

  async checkFactorOverlap(
    category: string, unit: string, effectiveFrom: string, effectiveTo: string | null, currentId?: string,
  ): Promise<boolean> {
    const factors = await this.getEmissionFactors();
    const same = factors.filter(
      (f) => f.category.toLowerCase() === category.toLowerCase() && f.unit.toLowerCase() === unit.toLowerCase() && f.id !== currentId,
    );
    const newStart = new Date(effectiveFrom).getTime();
    const newEnd = effectiveTo ? new Date(effectiveTo).getTime() : Infinity;
    return same.some((f) => {
      const fStart = new Date(f.effectiveFrom).getTime();
      const fEnd = f.effectiveTo ? new Date(f.effectiveTo).getTime() : Infinity;
      return newStart <= fEnd && fStart <= newEnd;
    });
  },

  // ----------------- CARBON TRANSACTIONS -----------------
  async getCarbonTransactions(): Promise<CarbonTransaction[]> {
    const [rows, factors] = await Promise.all([
      api.get<BackendCarbon[]>('/carbon-transactions?size=200'),
      this.getEmissionFactors(),
    ]);
    const factorById = new Map<string, EmissionFactor>(factors.map((f) => [f.id, f] as [string, EmissionFactor]));
    return Promise.all(
      rows.map(async (t) => {
        const f = factorById.get(t.emissionFactorId);
        return {
          id: t.id,
          date: dateOnly(t.occurredAt),
          department: await reference.deptNameById(t.departmentId),
          factorName: f?.name ?? 'Unknown factor',
          emissionFactorId: t.emissionFactorId,
          quantity: Number(t.quantity),
          unit: f?.unit ?? '',
          factorValue: Number(t.factorValueSnapshot),
          calculatedCo2e: Number(t.co2eKg),
          mode: t.calculationMode === 'AUTO' ? 'Auto' : 'Manual',
          notes: t.notes ?? '',
        } as CarbonTransaction;
      }),
    );
  },

  async saveCarbonTransaction(
    tx: Omit<CarbonTransaction, 'id' | 'calculatedCo2e' | 'factorValue' | 'unit' | 'factorName'> & { id?: string; emissionFactorId: string },
  ): Promise<CarbonTransaction> {
    const [departmentId, factor] = await Promise.all([
      reference.deptIdByName(tx.department),
      api.get<BackendFactor>(`/emission-factors/${tx.emissionFactorId}`),
    ]);
    const created = await api.post<BackendCarbon>('/carbon-transactions', {
      departmentId,
      emissionFactorId: tx.emissionFactorId,
      quantity: tx.quantity,
      unitId: factor.unitId,
      occurredAt: tx.date,
      notes: tx.notes,
    });
    const mapped = await mapFactor(factor);
    return {
      id: created.id,
      date: dateOnly(created.occurredAt),
      department: tx.department,
      factorName: mapped.name,
      emissionFactorId: created.emissionFactorId,
      quantity: Number(created.quantity),
      unit: mapped.unit,
      factorValue: Number(created.factorValueSnapshot),
      calculatedCo2e: Number(created.co2eKg),
      mode: created.calculationMode === 'AUTO' ? 'Auto' : 'Manual',
      notes: created.notes ?? '',
    };
  },

  // ----------------- GOALS -----------------
  async getGoals(): Promise<Goal[]> {
    const rows = await api.get<BackendGoal[]>('/environmental-goals');
    return Promise.all(
      rows.map(async (g) => {
        const target = Number(g.targetValue);
        const pct = g.progressPct === null ? 0 : Number(g.progressPct);
        const unit = await reference.byId('UNIT', g.unitId ?? undefined);
        return {
          id: g.id,
          title: g.title,
          department: await reference.deptNameById(g.departmentId),
          targetValue: target,
          currentValue: Math.round((pct / 100) * target),
          unit: unit?.label ?? '',
          startDate: dateOnly(g.periodStart),
          endDate: dateOnly(g.periodEnd),
        } as Goal;
      }),
    );
  },

  async saveGoal(goal: Omit<Goal, 'id'> & { id?: string }): Promise<Goal> {
    const [departmentId, unitId, statusId] = await Promise.all([
      goal.department && goal.department !== 'Organization-wide' ? reference.deptIdByName(goal.department) : Promise.resolve(undefined),
      reference.idByLabel('UNIT', goal.unit),
      reference.idOf('GOAL_STATUS', 'ACTIVE').catch(() => undefined),
    ]);
    const body = {
      title: goal.title,
      departmentId,
      metricCode: 'co2e_reduction',
      targetValue: goal.targetValue,
      baselineValue: goal.currentValue,
      unitId,
      periodStart: goal.startDate,
      periodEnd: goal.endDate,
      statusId,
    };
    const saved = goal.id
      ? await api.put<BackendGoal>(`/environmental-goals/${goal.id}`, body)
      : await api.post<BackendGoal>('/environmental-goals', body);
    return {
      id: saved.id,
      title: saved.title,
      department: goal.department,
      targetValue: Number(saved.targetValue),
      currentValue: goal.currentValue,
      unit: goal.unit,
      startDate: dateOnly(saved.periodStart),
      endDate: dateOnly(saved.periodEnd),
    };
  },
};
