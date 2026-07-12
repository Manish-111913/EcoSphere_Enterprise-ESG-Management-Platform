import { api } from './apiClient';

/**
 * Reports service — real NestJS backend for the EcoSphere ESG platform.
 * Standard reports, the custom-report builder, saved templates, and exports.
 *
 * Backend shapes (BACKEND/src/modules/reports):
 *  - Standard/custom reports return a columnar ReportResult { columns, rows }.
 *  - POST /reports/export returns a binary file (Blob); the export id is on the
 *    `X-Export-Id` response header (not surfaced by apiClient), so the record can
 *    be re-fetched via GET /report-exports/:id if the id is known.
 */

/** Columnar result returned by every standard + custom report endpoint. */
export interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export type ReportType = 'environmental' | 'social' | 'governance' | 'summary';

/** Filters accepted by the standard report + export endpoints (ReportFiltersDto). */
export interface ReportFilters {
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  module?: string;
  employee?: string;
  challenge?: string;
  esgCategory?: string;
}

export type CustomModule = 'carbon' | 'csr' | 'issues' | 'challenges';

/** Body for POST /reports/custom (CustomReportDto). */
export interface CustomReportSpec {
  moduleScope: CustomModule;
  columns: string[];
  filters?: Record<string, unknown>;
  groupBy?: string;
  aggregation?: 'count' | 'sum';
  aggregateField?: string;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

/** Body for POST /reports/export (ExportReportDto). */
export interface ExportRequest {
  report: ReportType;
  format: ExportFormat;
  filters?: ReportFilters;
}

/** Report template persisted by the backend (Prisma ReportTemplate). */
export interface ReportTemplate {
  id: string;
  name: string;
  ownerId: string;
  moduleScope: Record<string, unknown>;
  columns: unknown[];
  filters?: Record<string, unknown> | null;
  groupBy?: unknown[] | null;
  aggregations?: Record<string, unknown> | null;
  chartType?: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /report-templates (CreateTemplateDto). */
export interface CreateTemplatePayload {
  name: string;
  moduleScope: Record<string, unknown>;
  columns: unknown[];
  filters?: Record<string, unknown>;
  groupBy?: unknown[];
  aggregations?: Record<string, unknown>;
  chartType?: string;
  isShared?: boolean;
}

/** Export record persisted by the backend (Prisma ReportExport). */
export interface ReportExport {
  id: string;
  requestedBy: string;
  format: string;
  filters?: Record<string, unknown> | null;
  fileKey: string | null;
  status: string;
  createdAt: string;
}

function toQuery(filters?: ReportFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const reportsService = {
  // ─────────────── standard reports ───────────────
  getEnvironmental(filters?: ReportFilters): Promise<ReportResult> {
    return api.get<ReportResult>(`/reports/environmental${toQuery(filters)}`);
  },
  getSocial(filters?: ReportFilters): Promise<ReportResult> {
    return api.get<ReportResult>(`/reports/social${toQuery(filters)}`);
  },
  getGovernance(filters?: ReportFilters): Promise<ReportResult> {
    return api.get<ReportResult>(`/reports/governance${toQuery(filters)}`);
  },
  getSummary(filters?: ReportFilters): Promise<ReportResult> {
    return api.get<ReportResult>(`/reports/summary${toQuery(filters)}`);
  },
  /** Fetch any of the four standard reports by type. */
  getStandard(type: ReportType, filters?: ReportFilters): Promise<ReportResult> {
    switch (type) {
      case 'environmental': return this.getEnvironmental(filters);
      case 'social': return this.getSocial(filters);
      case 'governance': return this.getGovernance(filters);
      case 'summary': return this.getSummary(filters);
      default: return this.getSummary(filters);
    }
  },

  // ─────────────── custom builder ───────────────
  runCustom(spec: CustomReportSpec): Promise<ReportResult> {
    return api.post<ReportResult>('/reports/custom', spec);
  },

  // ─────────────── templates ───────────────
  getTemplates(): Promise<ReportTemplate[]> {
    return api.get<ReportTemplate[]>('/report-templates');
  },
  saveTemplate(t: CreateTemplatePayload): Promise<ReportTemplate> {
    return api.post<ReportTemplate>('/report-templates', t);
  },
  deleteTemplate(id: string): Promise<{ message: string }> {
    return api.del<{ message: string }>(`/report-templates/${id}`);
  },

  // ─────────────── export ───────────────
  /**
   * Request an export. The endpoint streams the file back directly, so this
   * resolves to a Blob (PDF is not implemented backend-side and returns 501).
   */
  requestExport(payload: ExportRequest): Promise<Blob> {
    return api.post<Blob>('/reports/export', payload);
  },
  /** Re-fetch a persisted export record by id (GET /report-exports/:id). */
  getExport(id: string): Promise<ReportExport> {
    return api.get<ReportExport>(`/report-exports/${id}`);
  },
};
