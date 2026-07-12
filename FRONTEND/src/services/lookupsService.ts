import { LookupData } from '../types';
import { mockLookups } from '../mocks/lookupsData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const lookupsService = {
  async getLookups(): Promise<LookupData> {
    await delay(300);
    return { ...mockLookups };
  },

  async getSeverities() {
    await delay(300);
    return [...mockLookups.severities];
  },

  async getChallengeStatuses() {
    await delay(300);
    return [...mockLookups.challengeStatuses];
  },

  async getComplianceStatuses() {
    await delay(300);
    return [...mockLookups.complianceStatuses];
  },

  async getDifficulties() {
    await delay(300);
    return [...mockLookups.difficulties];
  },

  async getEmissionUnits() {
    await delay(300);
    return [...mockLookups.emissionUnits];
  },

  async getCategories() {
    await delay(300);
    return { ...mockLookups.categories };
  },

  async getDepartments() {
    await delay(300);
    return [...mockLookups.departments];
  }
};
