import { api } from './apiClient';

export interface CsrReviewItem {
  id: string;
  activityTitle: string;
  employeeName: string;
  points: number;
  proofUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
  feedback: string;
}

interface PendingApprovalsResponse {
  csr: { id: string; type: string; title: string; employee: string }[];
  challenge: { id: string; type: string; title: string; employee: string }[];
}

export const csrService = {
  /** Submitted CSR participations the caller may decide (spec §A6.8). */
  async getReviewQueue(): Promise<CsrReviewItem[]> {
    const res = await api.get<PendingApprovalsResponse>('/dashboard/pending-approvals');
    return res.csr.map((c) => ({
      id: c.id,
      activityTitle: c.title,
      employeeName: c.employee,
      points: 0,
      proofUrl: undefined,
      status: 'Pending',
      timestamp: new Date().toISOString(),
      feedback: '',
    }));
  },

  /** Approve — the backend enforces the evidence guard (422 EVIDENCE_REQUIRED). */
  approve(id: string, remarks?: string): Promise<unknown> {
    return api.post(`/csr-participations/${id}/approve`, { remarks });
  },

  reject(id: string, remarks: string): Promise<unknown> {
    return api.post(`/csr-participations/${id}/reject`, { remarks });
  },
};
