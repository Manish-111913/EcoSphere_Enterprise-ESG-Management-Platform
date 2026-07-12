import { api } from './apiClient';
import { reference } from './referenceData';

export interface EnrichedActivity {
  id: string; title: string; description: string; points: number; xp: number;
  category: string; status: 'Draft' | 'Active' | 'Completed';
  startDate: string; endDate: string; location: string; capacity: number;
  coverUrl: string; joinedCount: number;
}
export interface CsrPart {
  id: string; activityId: string; employeeId: string; status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string;
}

interface BackendActivity {
  id: string; title: string; categoryId: string; description: string | null; location: string | null;
  startDate: string; endDate: string; capacity: number | null; pointsValue: number; statusId: string | null;
}
interface BackendPart {
  id: string; csrActivityId: string; employeeId: string; statusId: string | null; proofAttachmentId: string | null;
}
interface BackendCategory { id: string; name: string }

const dateOnly = (d: string) => (d ? d.slice(0, 10) : d);
const COVER = 'https://images.unsplash.com/photo-1560252829-804f1aedf1be?w=600';

const ACT_STATUS: Record<string, EnrichedActivity['status']> = { DRAFT: 'Draft', OPEN: 'Active', CLOSED: 'Completed', ARCHIVED: 'Completed' };
const PART_STATUS: Record<string, CsrPart['status']> = { PENDING: 'Pending', SUBMITTED: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Rejected' };

function unwrap<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : res.data;
}

export const csrActivitiesService = {
  async getBoard(): Promise<{ activities: EnrichedActivity[]; participations: CsrPart[] }> {
    const [actRes, partRes, cats] = await Promise.all([
      api.get<{ data: BackendActivity[] }>('/csr-activities?size=200'),
      api.get<{ data: BackendPart[] }>('/csr-participations?size=500').catch(() => ({ data: [] as BackendPart[] })),
      api.get<BackendCategory[]>('/categories?type=CSR_ACTIVITY').catch(() => [] as BackendCategory[]),
    ]);
    const acts = unwrap(actRes);
    const parts = unwrap(partRes);
    const catName = new Map(cats.map((c) => [c.id, c.name]));

    const participations: CsrPart[] = await Promise.all(parts.map(async (p) => {
      const st = await reference.byId('CSR_PARTICIPATION_STATUS', p.statusId);
      return {
        id: p.id,
        activityId: p.csrActivityId,
        employeeId: p.employeeId,
        status: st ? (PART_STATUS[st.code] ?? 'Pending') : 'Pending',
        proofUrl: p.proofAttachmentId ? `${api.base}/files/${p.proofAttachmentId}` : undefined,
      };
    }));

    const joinedByActivity = new Map<string, number>();
    participations.forEach((p) => joinedByActivity.set(p.activityId, (joinedByActivity.get(p.activityId) ?? 0) + 1));

    const activities: EnrichedActivity[] = await Promise.all(acts.map(async (a) => {
      const st = await reference.byId('CSR_ACTIVITY_STATUS', a.statusId);
      return {
        id: a.id,
        title: a.title,
        description: a.description ?? '',
        points: a.pointsValue,
        xp: a.pointsValue,
        category: catName.get(a.categoryId) ?? 'Community',
        status: st ? (ACT_STATUS[st.code] ?? 'Active') : 'Active',
        startDate: dateOnly(a.startDate),
        endDate: dateOnly(a.endDate),
        location: a.location ?? '',
        capacity: a.capacity ?? 999,
        coverUrl: COVER,
        joinedCount: joinedByActivity.get(a.id) ?? 0,
      };
    }));

    return { activities, participations };
  },

  join(activityId: string): Promise<{ id: string }> {
    return api.post<{ id: string }>(`/csr-activities/${activityId}/participate`);
  },

  /** Upload proof → attach → submit for review. */
  async submitProof(participationId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', 'csr_participation');
    form.append('entityId', participationId);
    const uploaded = await api.upload<{ attachmentId: string }>('/files/upload', form);
    await api.post(`/csr-participations/${participationId}/proof`, { attachmentId: uploaded.attachmentId });
    await api.post(`/csr-participations/${participationId}/submit`);
  },
};
