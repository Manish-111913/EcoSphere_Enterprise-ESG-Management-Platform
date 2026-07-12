import { api } from './apiClient';
import { reference } from './referenceData';

export interface ChallengePart {
  id: string;
  challengeId: string;
  employeeId: string;
  status: 'In Progress' | 'Completed' | 'Failed' | 'Pending Review';
  progress: number;
  proofUrl?: string;
  feedback?: string;
}

interface BackendPart {
  id: string; challengeId: string; employeeId: string; progressPct: number;
  proofAttachmentId: string | null; statusId: string | null; decisionRemarks: string | null;
}

const STATUS: Record<string, ChallengePart['status']> = {
  JOINED: 'In Progress', SUBMITTED: 'Pending Review', APPROVED: 'Completed', REJECTED: 'Failed', WITHDRAWN: 'Failed',
};

async function mapPart(p: BackendPart): Promise<ChallengePart> {
  const st = await reference.byId('CHALLENGE_PARTICIPATION_STATUS', p.statusId);
  return {
    id: p.id,
    challengeId: p.challengeId,
    employeeId: p.employeeId,
    status: st ? (STATUS[st.code] ?? 'In Progress') : 'In Progress',
    progress: p.progressPct,
    proofUrl: p.proofAttachmentId ? `${api.base}/files/${p.proofAttachmentId}` : undefined,
    feedback: p.decisionRemarks ?? undefined,
  };
}

function unwrap<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : res.data;
}

export const challengeParticipationsService = {
  async byChallenge(challengeId: string): Promise<ChallengePart[]> {
    const res = await api.get<{ data: BackendPart[] }>(`/challenges/${challengeId}/participations?size=200`);
    return Promise.all(unwrap(res).map(mapPart));
  },

  async join(challengeId: string): Promise<ChallengePart> {
    return mapPart(await api.post<BackendPart>(`/challenges/${challengeId}/join`));
  },

  progress(participationId: string, progressPct: number): Promise<unknown> {
    return api.post(`/challenge-participations/${participationId}/progress`, { progressPct });
  },

  async submitProof(participationId: string, file: File, progressPct?: number): Promise<void> {
    if (progressPct !== undefined) {
      await api.post(`/challenge-participations/${participationId}/progress`, { progressPct }).catch(() => {});
    }
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', 'challenge_participation');
    form.append('entityId', participationId);
    const up = await api.upload<{ attachmentId: string }>('/files/upload', form);
    await api.post(`/challenge-participations/${participationId}/proof`, { attachmentId: up.attachmentId });
    await api.post(`/challenge-participations/${participationId}/submit`);
  },

  approve(participationId: string, remarks?: string): Promise<unknown> {
    return api.post(`/challenge-participations/${participationId}/approve`, { remarks });
  },

  reject(participationId: string, remarks: string): Promise<unknown> {
    return api.post(`/challenge-participations/${participationId}/reject`, { remarks });
  },
};
