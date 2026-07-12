import { api } from './apiClient';
import { reference } from './referenceData';
import { Audit } from '../types';

export type AuditView = Audit & { findings?: string; auditScore?: number };

interface BackendAudit {
  id: string; title: string; auditType: string | null; scopeDescription: string | null;
  departmentId: string | null; auditorId: string; plannedStart: string | null; actualStart: string | null;
  statusId: string | null; findingsSummary: string | null; auditScore: number | null;
}

const STATUS: Record<string, AuditView['status']> = { PLANNED: 'Scheduled', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
const dateOnly = (d: string | null) => (d ? d.slice(0, 10) : '');

async function mapAudit(a: BackendAudit): Promise<AuditView> {
  const st = await reference.byId('AUDIT_STATUS', a.statusId);
  return {
    id: a.id,
    title: a.title,
    description: a.scopeDescription ?? '',
    auditor: await reference.userNameById(a.auditorId),
    status: st ? (STATUS[st.code] ?? 'Scheduled') : 'Scheduled',
    date: dateOnly(a.actualStart ?? a.plannedStart),
    findingsCount: 0,
    findings: a.findingsSummary ?? '',
    auditScore: a.auditScore ?? undefined,
  };
}

export const auditsService = {
  async getAudits(): Promise<AuditView[]> {
    const rows = await api.get<BackendAudit[]>('/audits');
    return Promise.all(rows.map(mapAudit));
  },

  /** Drive the audit lifecycle: Planned → In Progress (start) → Completed (complete). */
  async save(id: string, prevStatus: AuditView['status'], next: { status: AuditView['status']; findings: string; auditScore?: number }): Promise<AuditView> {
    if (next.status === 'In Progress' && prevStatus === 'Scheduled') {
      return mapAudit(await api.post<BackendAudit>(`/audits/${id}/start`));
    }
    if (next.status === 'Completed') {
      if (prevStatus === 'Scheduled') await api.post(`/audits/${id}/start`);
      const done = await api.post<BackendAudit>(`/audits/${id}/complete`, {
        findingsSummary: next.findings || 'Audit completed.',
        auditScore: next.auditScore ?? 0,
      });
      return mapAudit(done);
    }
    // Planned edits or no transition — return current
    return mapAudit(await api.get<BackendAudit>(`/audits/${id}`));
  },
};
