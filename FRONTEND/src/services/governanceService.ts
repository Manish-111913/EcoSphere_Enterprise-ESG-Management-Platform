import { api } from './apiClient';
import { reference } from './referenceData';
import { ComplianceIssue } from '../types';

interface BackendIssue {
  id: string; governanceAuditId: string | null; title: string; description: string;
  severityId: string; ownerId: string; dueDate: string; statusId: string | null;
  isOverdue: boolean; resolutionNotes: string | null;
}
interface BackendAudit { id: string; title: string }

const STATUS_TO_CODE: Record<ComplianceIssue['status'], string> = {
  Open: 'OPEN', 'In Progress': 'IN_PROGRESS', Resolved: 'RESOLVED', Closed: 'CLOSED',
};
const dateOnly = (d: string) => (d ? d.slice(0, 10) : d);

async function mapIssue(i: BackendIssue): Promise<ComplianceIssue> {
  const [sev, status] = await Promise.all([
    reference.byId('SEVERITY', i.severityId),
    reference.byId('ISSUE_STATUS', i.statusId),
  ]);
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    severity: (sev?.label as ComplianceIssue['severity']) ?? 'Medium',
    status: (status?.label as ComplianceIssue['status']) ?? 'Open',
    ownerId: i.ownerId,
    dueDate: dateOnly(i.dueDate),
    isOverdue: i.isOverdue,
    linkedAuditId: i.governanceAuditId ?? undefined,
    resolutionNotes: i.resolutionNotes ?? undefined,
  };
}

export interface DirectoryEmployee {
  id: string; name: string; email: string; avatar: string; role: string; departmentId: string;
}

export const governanceService = {
  async getComplianceIssues(): Promise<ComplianceIssue[]> {
    const rows = await api.get<BackendIssue[]>('/compliance-issues');
    return Promise.all(rows.map(mapIssue));
  },

  async getEmployees(): Promise<DirectoryEmployee[]> {
    const users = await reference.users();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0D9488&color=fff`,
      role: '',
      departmentId: u.departmentId,
    }));
  },

  async getAudits(): Promise<{ id: string; title: string }[]> {
    try {
      const rows = await api.get<BackendAudit[]>('/audits');
      return rows.map((a) => ({ id: a.id, title: a.title }));
    } catch {
      return [];
    }
  },

  async createComplianceIssue(input: {
    title: string; description: string; severity: ComplianceIssue['severity'];
    ownerId: string; dueDate: string; linkedAuditId?: string;
  }): Promise<ComplianceIssue> {
    const severityId = await reference.idByLabel('SEVERITY', input.severity);
    const created = await api.post<BackendIssue>('/compliance-issues', {
      title: input.title,
      description: input.description,
      severityId,
      ownerId: input.ownerId,
      dueDate: input.dueDate,
      ...(input.linkedAuditId ? { governanceAuditId: input.linkedAuditId } : {}),
    });
    return mapIssue(created);
  },

  /** Status change via the backend transition machine (resolve needs notes). */
  async transitionIssue(id: string, toStatus: ComplianceIssue['status'], resolutionNotes?: string): Promise<ComplianceIssue> {
    const updated = await api.post<BackendIssue>(`/compliance-issues/${id}/transition`, {
      toStatus: STATUS_TO_CODE[toStatus],
      ...(resolutionNotes ? { resolutionNotes } : {}),
    });
    return mapIssue(updated);
  },
};
