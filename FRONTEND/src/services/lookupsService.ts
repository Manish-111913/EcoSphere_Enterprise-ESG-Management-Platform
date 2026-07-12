import { LookupData } from '../types';
import { api } from './apiClient';
import { reference } from './referenceData';

const toOption = (v: { code: string; label: string; color: string | null }) => ({
  value: v.code,
  label: v.label,
  color: v.color ?? '#6B7280',
});

interface BackendCategory { id: string; name: string; type: string }

async function loadPillarCategories(): Promise<{ environmental: string[]; social: string[]; governance: string[] }> {
  // The CSR/CHALLENGE category masters power the pillar chips.
  try {
    const [csr, challenge] = await Promise.all([
      api.get<BackendCategory[]>('/categories?type=CSR_ACTIVITY'),
      api.get<BackendCategory[]>('/categories?type=CHALLENGE'),
    ]);
    return {
      environmental: challenge.map((c) => c.name),
      social: csr.map((c) => c.name),
      governance: [],
    };
  } catch {
    return { environmental: [], social: [], governance: [] };
  }
}

export const lookupsService = {
  async getLookups(): Promise<LookupData> {
    const [severities, challengeStatuses, complianceStatuses, difficulties, units, categories, depts] =
      await Promise.all([
        reference.valuesOf('SEVERITY'),
        reference.valuesOf('CHALLENGE_STATUS'),
        reference.valuesOf('ISSUE_STATUS'),
        reference.valuesOf('DIFFICULTY'),
        reference.valuesOf('UNIT'),
        loadPillarCategories(),
        reference.departments(),
      ]);
    return {
      severities: severities.map(toOption),
      challengeStatuses: challengeStatuses.map(toOption),
      complianceStatuses: complianceStatuses.map(toOption),
      difficulties: difficulties.map((d) => ({ value: d.code, label: d.label })),
      emissionUnits: units.map((u) => u.label),
      categories,
      departments: depts.map((d) => d.name),
    };
  },

  async getSeverities() {
    return (await reference.valuesOf('SEVERITY')).map(toOption);
  },

  async getChallengeStatuses() {
    return (await reference.valuesOf('CHALLENGE_STATUS')).map(toOption);
  },

  async getComplianceStatuses() {
    return (await reference.valuesOf('ISSUE_STATUS')).map(toOption);
  },

  async getDifficulties() {
    return (await reference.valuesOf('DIFFICULTY')).map((d) => ({ value: d.code, label: d.label }));
  },

  async getEmissionUnits() {
    return (await reference.valuesOf('UNIT')).map((u) => u.label);
  },

  async getCategories() {
    return loadPillarCategories();
  },

  async getDepartments() {
    return (await reference.departments()).map((d) => d.name);
  },
};
