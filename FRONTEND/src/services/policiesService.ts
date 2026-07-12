import { api } from './apiClient';
import { reference } from './referenceData';
import { Policy } from '../types';

interface BackendPolicy {
  id: string; title: string; description: string | null; version: number;
  effectiveDate: string | null; acknowledgementDeadline: string | null; statusId: string | null;
}

export interface PolicyAcknowledgementView {
  id: string;
  policyId: string;
  policyVersion: number;
  employeeId: string;
  acknowledgedAt: string;
}

const dateOnly = (d: string | null) => (d ? d.slice(0, 10) : '');

function mapPolicy(p: BackendPolicy): Policy {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    pillar: 'G',
    effectiveDate: dateOnly(p.effectiveDate),
    version: String(p.version),
  };
}

export const policiesService = {
  async getBoard(): Promise<{
    policies: Policy[];
    ackCount: Record<string, number>;
    pendingIds: Set<string>;
    totalEmployees: number;
  }> {
    const [rows, pending, users] = await Promise.all([
      api.get<BackendPolicy[]>('/policies'),
      api.get<BackendPolicy[]>('/policies/pending-acknowledgement').catch(() => []),
      reference.users(),
    ]);
    const policies = rows.map(mapPolicy);
    const ackCount: Record<string, number> = {};
    await Promise.all(
      policies.map(async (p) => {
        try {
          const acks = await api.get<unknown[]>(`/policies/${p.id}/acknowledgements`);
          ackCount[p.id] = acks.length;
        } catch {
          ackCount[p.id] = 0;
        }
      }),
    );
    return {
      policies,
      ackCount,
      pendingIds: new Set(pending.map((p) => p.id)),
      totalEmployees: users.length || 25,
    };
  },

  acknowledge(policyId: string): Promise<unknown> {
    return api.post(`/policies/${policyId}/acknowledge`);
  },

  async getPolicyById(policyId: string): Promise<Policy> {
    const row = await api.get<BackendPolicy>(`/policies/${policyId}`);
    return mapPolicy(row);
  },

  async getPendingPolicies(): Promise<Policy[]> {
    const rows = await api.get<BackendPolicy[]>('/policies/pending-acknowledgement');
    return rows.map(mapPolicy);
  },

  getAcknowledgements(policyId: string): Promise<PolicyAcknowledgementView[]> {
    return api.get<PolicyAcknowledgementView[]>(`/policies/${policyId}/acknowledgements`);
  },
};
