import { EmissionFactor as DbEmissionFactor, CarbonTransaction as DbCarbonTransaction } from '../types';
import { mockEmissionFactors, mockCarbonTransactions, mockDepartments } from '../mocks/db';

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
  calculatedCo2e: number; // in kg CO2e
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Key strings for localStorage
const FACTORS_KEY = 'ecosphere_emission_factors';
const TRANSACTIONS_KEY = 'ecosphere_carbon_transactions';
const GOALS_KEY = 'ecosphere_environmental_goals';

export const environmentalService = {
  // Initialize state helper
  init() {
    // 1. Emission Factors
    if (!localStorage.getItem(FACTORS_KEY)) {
      const initialFactors: EmissionFactor[] = mockEmissionFactors.map((ef, index) => {
        // Map old mock schema to requested schema
        let effectiveFrom = ef.effectiveDate || '2025-01-01';
        let effectiveTo: string | null = null;
        let source = 'EcoSphere Database';

        if (ef.id === 'ef-1a') {
          effectiveFrom = '2025-01-01';
          effectiveTo = '2025-12-31';
          source = 'EPA Greenhouse Gas Hub v1';
        } else if (ef.id === 'ef-1b') {
          effectiveFrom = '2026-01-01';
          effectiveTo = null;
          source = 'EPA Greenhouse Gas Hub v2';
        } else if (ef.id === 'ef-2') {
          source = 'DEFRA Mobile Fuels';
        } else if (ef.id === 'ef-3') {
          source = 'EIA Natural Gas Ref';
        } else if (ef.id === 'ef-4' || ef.id === 'ef-5') {
          source = 'DEFRA Business Travel Factor';
        } else if (ef.id === 'ef-6') {
          source = 'EPA Waste Registry';
        } else if (ef.id === 'ef-7') {
          source = 'UK Water Treatment Factors';
        }

        return {
          id: ef.id,
          name: ef.name,
          category: ef.category,
          scope: ef.scope,
          factor: ef.factor,
          unit: ef.unit,
          effectiveFrom,
          effectiveTo,
          source
        };
      });
      localStorage.setItem(FACTORS_KEY, JSON.stringify(initialFactors));
    }

    // 2. Carbon Transactions
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
      const initialFactors = JSON.parse(localStorage.getItem(FACTORS_KEY)!) as EmissionFactor[];
      
      const initialTransactions: CarbonTransaction[] = mockCarbonTransactions.map((tx, idx) => {
        const dept = mockDepartments.find(d => d.id === tx.departmentId)?.name || 'Operations';
        
        // Find matching factor to fetch unit/factor value snapshot
        const matchingFactor = initialFactors.find(f => f.id === tx.emissionFactorId) || initialFactors[0];
        
        // Let's compute calculatedCo2e in KG (the original mock has it in metric tons, let's convert to KG or keep as requested)
        // User request states: "CO2e kg (bold)" which means we should represent it in kilograms.
        // If snapshot factor is 0.38 kg CO2e/kWh and quantity is 100 kWh, CO2e is 38 kg CO2e.
        // Let's compute: quantity * factorValue
        const factorValue = matchingFactor.factor;
        const calculatedCo2e = parseFloat((tx.quantity * factorValue).toFixed(2));

        return {
          id: tx.id,
          date: tx.date,
          department: dept,
          factorName: matchingFactor.name,
          emissionFactorId: matchingFactor.id,
          quantity: tx.quantity,
          unit: matchingFactor.unit,
          factorValue,
          calculatedCo2e,
          mode: idx % 3 === 0 ? 'Auto' : 'Manual',
          notes: 'Automatic snapshot logging during activity period.'
        };
      });
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(initialTransactions));
    }

    // 3. Goals
    if (!localStorage.getItem(GOALS_KEY)) {
      const initialGoals: Goal[] = [
        {
          id: 'goal-1',
          title: 'Reduce Engineering Electricity Load',
          department: 'Engineering',
          targetValue: 12000,
          currentValue: 9120,
          unit: 'kWh',
          startDate: '2026-01-01',
          endDate: '2026-10-31'
        },
        {
          id: 'goal-2',
          title: 'Minimize Logistics Diesel Footprint',
          department: 'Logistics',
          targetValue: 800,
          currentValue: 742.5,
          unit: 'liters',
          startDate: '2026-03-01',
          endDate: '2026-08-15'
        },
        {
          id: 'goal-3',
          title: 'Paperless Procurement Initiative',
          department: 'Procurement',
          targetValue: 100,
          currentValue: 85,
          unit: '%',
          startDate: '2026-05-01',
          endDate: '2026-07-28'
        },
        {
          id: 'goal-4',
          title: 'Operations Low-Carbon Heating',
          department: 'Operations',
          targetValue: 5000,
          currentValue: 2450,
          unit: 'm3',
          startDate: '2026-01-01',
          endDate: '2026-12-31'
        },
        {
          id: 'goal-5',
          title: 'Water Supply Efficiency Target',
          department: 'Operations',
          targetValue: 1500,
          currentValue: 1580,
          unit: 'm3',
          startDate: '2026-01-01',
          endDate: '2026-09-30'
        }
      ];
      localStorage.setItem(GOALS_KEY, JSON.stringify(initialGoals));
    }
  },

  // ----------------- EMISSION FACTORS API -----------------
  async getEmissionFactors(): Promise<EmissionFactor[]> {
    this.init();
    await delay(200);
    const data = localStorage.getItem(FACTORS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async saveEmissionFactor(factor: Omit<EmissionFactor, 'id'> & { id?: string }): Promise<EmissionFactor> {
    this.init();
    await delay(200);
    const factors = await this.getEmissionFactors();
    
    if (factor.id) {
      // Edit
      const index = factors.findIndex(f => f.id === factor.id);
      if (index !== -1) {
        factors[index] = { ...factor, id: factor.id };
      }
    } else {
      // Create
      const newId = `ef-${Date.now()}`;
      const newFactor: EmissionFactor = { ...factor, id: newId };
      factors.unshift(newFactor);
      factor.id = newId;
    }

    localStorage.setItem(FACTORS_KEY, JSON.stringify(factors));
    return factor as EmissionFactor;
  },

  async deleteEmissionFactor(id: string): Promise<boolean> {
    this.init();
    await delay(150);
    const factors = await this.getEmissionFactors();
    const filtered = factors.filter(f => f.id !== id);
    localStorage.setItem(FACTORS_KEY, JSON.stringify(filtered));
    return true;
  },

  // Date overlap checker for emission factors:
  // Show warning banner if dates overlap an existing version of the same category+unit.
  async checkFactorOverlap(
    category: string,
    unit: string,
    effectiveFrom: string,
    effectiveTo: string | null,
    currentId?: string
  ): Promise<boolean> {
    const factors = await this.getEmissionFactors();
    const sameTypeFactors = factors.filter(f => 
      f.category.toLowerCase() === category.toLowerCase() && 
      f.unit.toLowerCase() === unit.toLowerCase() &&
      f.id !== currentId
    );

    if (sameTypeFactors.length === 0) return false;

    const newStart = new Date(effectiveFrom).getTime();
    const newEnd = effectiveTo ? new Date(effectiveTo).getTime() : Infinity;

    for (const f of sameTypeFactors) {
      const fStart = new Date(f.effectiveFrom).getTime();
      const fEnd = f.effectiveTo ? new Date(f.effectiveTo).getTime() : Infinity;

      // Check if interval [newStart, newEnd] overlaps with [fStart, fEnd]
      const overlaps = newStart <= fEnd && fStart <= newEnd;
      if (overlaps) {
        return true;
      }
    }

    return false;
  },

  // ----------------- CARBON TRANSACTIONS API -----------------
  async getCarbonTransactions(): Promise<CarbonTransaction[]> {
    this.init();
    await delay(250);
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async saveCarbonTransaction(tx: Omit<CarbonTransaction, 'id' | 'calculatedCo2e' | 'factorValue' | 'unit' | 'factorName'> & { id?: string, emissionFactorId: string }): Promise<CarbonTransaction> {
    this.init();
    await delay(200);
    const transactions = await this.getCarbonTransactions();
    const factors = await this.getEmissionFactors();
    
    const matchingFactor = factors.find(f => f.id === tx.emissionFactorId) || factors[0];
    const factorValue = matchingFactor.factor;
    const calculatedCo2e = parseFloat((tx.quantity * factorValue).toFixed(2));

    const finalTx: CarbonTransaction = {
      id: tx.id || `TX-${Date.now()}`,
      date: tx.date,
      department: tx.department,
      factorName: matchingFactor.name,
      emissionFactorId: matchingFactor.id,
      quantity: tx.quantity,
      unit: matchingFactor.unit,
      factorValue,
      calculatedCo2e,
      mode: tx.mode,
      notes: tx.notes || ''
    };

    if (tx.id) {
      const index = transactions.findIndex(t => t.id === tx.id);
      if (index !== -1) {
        transactions[index] = finalTx;
      }
    } else {
      transactions.unshift(finalTx);
    }

    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    return finalTx;
  },

  // ----------------- GOALS API -----------------
  async getGoals(): Promise<Goal[]> {
    this.init();
    await delay(200);
    const data = localStorage.getItem(GOALS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async saveGoal(goal: Omit<Goal, 'id'> & { id?: string }): Promise<Goal> {
    this.init();
    await delay(200);
    const goals = await this.getGoals();
    
    const finalGoal: Goal = {
      ...goal,
      id: goal.id || `goal-${Date.now()}`
    };

    if (goal.id) {
      const index = goals.findIndex(g => g.id === goal.id);
      if (index !== -1) {
        goals[index] = finalGoal;
      }
    } else {
      goals.unshift(finalGoal);
    }

    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    return finalGoal;
  }
};
