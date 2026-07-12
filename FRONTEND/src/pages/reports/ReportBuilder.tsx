import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui-kit/Toast';
import {
  Database, Play, Save, Columns, Filter, BarChart,
  Grid, Trash2, Download, BookOpen, AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  reportsService, ReportResult, ReportTemplate, CustomModule, CustomReportSpec,
} from '../../services/reportsService';
import { reference, DeptRef, UserRef } from '../../services/referenceData';

// Backend custom-module registry + per-module column whitelist (mirrors
// BACKEND CUSTOM_WHITELIST so runCustom() passes server-side validation).
const MODULE_LABELS: Record<CustomModule, string> = {
  carbon: 'Carbon Transactions (Env)',
  csr: 'CSR Participation (Social)',
  issues: 'Compliance Issues (Gov)',
  challenges: 'Sustainability Challenges (Gam)',
};

const moduleColumnsMap: Record<CustomModule, string[]> = {
  carbon: ['occurredAt', 'departmentId', 'co2eKg', 'quantity', 'calculationMode', 'emissionFactorId'],
  csr: ['csrActivityId', 'employeeId', 'statusId', 'pointsEarned', 'completionDate'],
  issues: ['title', 'severityId', 'ownerId', 'statusId', 'dueDate', 'isOverdue'],
  challenges: ['title', 'categoryId', 'xpValue', 'statusId', 'deadline'],
};

// group-by options must be in the whitelist for each module
const groupByOptions: Record<CustomModule, string[]> = {
  carbon: ['departmentId', 'calculationMode'],
  csr: ['statusId', 'csrActivityId'],
  issues: ['statusId', 'severityId'],
  challenges: ['categoryId', 'statusId'],
};

// numeric field used when aggregation = sum; modules without one cannot sum
const sumFieldFor: Partial<Record<CustomModule, string>> = {
  carbon: 'co2eKg',
  csr: 'pointsEarned',
  challenges: 'xpValue',
};

export default function ReportBuilder() {
  const { addToast } = useToast();

  // Selected states
  const [selectedModule, setSelectedModule] = useState<CustomModule>('carbon');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [aggregate, setAggregate] = useState<'' | 'sum' | 'count'>('');
  const [filterDept, setFilterDept] = useState('');

  // Custom template state
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([]);

  // Run result + reference data
  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [depts, setDepts] = useState<DeptRef[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);

  const canSum = !!sumFieldFor[selectedModule];

  // resolve id-bearing cell values to names where we can
  const resolveCell = (col: string, val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (col === 'departmentId') return depts.find(d => d.id === val)?.name ?? String(val);
    if (col === 'ownerId' || col === 'employeeId') return users.find(u => u.id === val)?.name ?? String(val);
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  useEffect(() => {
    // Select all columns by default for the active module
    setSelectedColumns(moduleColumnsMap[selectedModule]);
  }, [selectedModule]);

  // Load reference data (dept/user names) once
  useEffect(() => {
    Promise.all([reference.departments(), reference.users()])
      .then(([d, u]) => { setDepts(d); setUsers(u); })
      .catch(() => { /* names simply fall back to ids */ });
  }, []);

  // Load saved templates from the backend
  const loadTemplates = () => {
    reportsService.getTemplates()
      .then(setSavedTemplates)
      .catch(() => { /* keep whatever we have */ });
  };
  useEffect(() => { loadTemplates(); }, []);

  const handleModuleChange = (mod: CustomModule) => {
    setSelectedModule(mod);
    setGroupBy('');
    setAggregate('');
    setFilterDept('');
  };

  const handleColumnToggle = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const buildSpec = (): CustomReportSpec => {
    const spec: CustomReportSpec = {
      moduleScope: selectedModule,
      columns: selectedColumns,
    };
    if (filterDept && selectedModule === 'carbon') spec.filters = { departmentId: filterDept };
    if (groupBy) {
      spec.groupBy = groupBy;
      if (aggregate === 'sum' && sumFieldFor[selectedModule]) {
        spec.aggregation = 'sum';
        spec.aggregateField = sumFieldFor[selectedModule];
      } else if (aggregate === 'count' || aggregate === 'sum') {
        spec.aggregation = 'count';
      }
    }
    return spec;
  };

  const runReport = async (): Promise<ReportResult | null> => {
    setRunning(true);
    try {
      const res = await reportsService.runCustom(buildSpec());
      setResult(res);
      return res;
    } catch (err: any) {
      addToast({
        title: 'Query failed',
        description: err?.message || 'The custom report could not be compiled.',
        type: 'error',
      });
      return null;
    } finally {
      setRunning(false);
    }
  };

  const handleCompileRun = async () => {
    const res = await runReport();
    if (res) {
      addToast({
        title: 'Report compiled',
        description: `Query returned ${res.rows.length} row${res.rows.length === 1 ? '' : 's'} from the ${selectedModule} module.`,
        type: 'success',
      });
    }
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Custom-report export: the backend export endpoint only covers the four
  // standard reports, so the builder compiles the live custom result and
  // serializes it client-side (CSV) from the real backend rows.
  const handleExport = async (format: 'csv' | 'xlsx') => {
    const res = result ?? (await runReport());
    if (!res) return;
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = res.columns.map(esc).join(',');
    const lines = res.rows.map(r => res.columns.map(c => esc(resolveCell(c, r[c]))).join(','));
    const csv = [header, ...lines].join('\n');
    triggerDownload(csv, `custom-${selectedModule}-report.csv`, 'text/csv');
    addToast({
      title: 'Export ready',
      description: `Custom ${selectedModule} ledger exported to ${format.toUpperCase()} (${res.rows.length} rows).`,
      type: 'success',
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    try {
      await reportsService.saveTemplate({
        name: templateName.trim(),
        moduleScope: { module: selectedModule },
        columns: selectedColumns,
        filters: filterDept && selectedModule === 'carbon' ? { departmentId: filterDept } : undefined,
        groupBy: groupBy ? [groupBy] : [],
        aggregations: aggregate ? { type: aggregate, field: sumFieldFor[selectedModule] } : {},
        chartType: 'bar',
        isShared: false,
      });
      setTemplateName('');
      loadTemplates();
      addToast({
        title: 'Template Saved',
        description: `Report template "${templateName.trim()}" was successfully registered.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Save failed',
        description: err?.message || 'The template could not be saved.',
        type: 'error',
      });
    }
  };

  const handleLoadTemplate = (tmp: ReportTemplate) => {
    const mod = (tmp.moduleScope as { module?: CustomModule })?.module;
    if (mod && moduleColumnsMap[mod]) setSelectedModule(mod);
    if (Array.isArray(tmp.columns)) setSelectedColumns(tmp.columns as string[]);
    const gb = Array.isArray(tmp.groupBy) ? (tmp.groupBy[0] as string) : '';
    setGroupBy(gb || '');
    const aggType = (tmp.aggregations as { type?: 'sum' | 'count' })?.type;
    setAggregate(aggType ?? '');
    addToast({
      title: 'Template Loaded',
      description: `Configured builder fields to template "${tmp.name}".`,
      type: 'info',
    });
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reportsService.deleteTemplate(id);
      setSavedTemplates(prev => prev.filter(t => t.id !== id));
      addToast({
        title: 'Template Deleted',
        description: 'Template has been removed from your saved dock.',
        type: 'info',
      });
    } catch (err: any) {
      addToast({
        title: 'Delete failed',
        description: err?.message || 'The template could not be deleted.',
        type: 'error',
      });
    }
  };

  // ---------------------------------
  // PREVIEW + CHART DERIVED FROM THE REAL BACKEND RESULT
  // ---------------------------------
  const previewColumns = result?.columns ?? (groupBy && aggregate ? [] : selectedColumns);
  const previewRows = result?.rows ?? [];
  const isGrouped = !!groupBy && !!aggregate;

  const suggestedChartData = isGrouped && result && result.columns.length >= 2
    ? result.rows.map(row => ({
        name: resolveCell(result.columns[0], row[result.columns[0]]),
        value: Number(row[result.columns[1]] ?? 0),
      }))
    : [];

  return (
    <div className="space-y-6 text-left">
      {/* Builder Header */}
      <div className="border-b border-neutral-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">Custom Report Builder</h1>
          <p className="text-xs text-neutral-text-muted mt-1">
            Build, group, and visualize custom ESG ledger queries using the live backend query compiler.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-1.5 border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={handleCompileRun}
            disabled={running}
            className="px-3.5 py-1.5 bg-neutral-text-dark hover:bg-neutral-text-dark/95 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Play size={13} className="fill-white" /> {running ? 'Compiling…' : 'Compile & Run'}
          </button>
        </div>
      </div>

      {/* THREE-PANE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* PANE 1 (LEFT): DATA SOURCE & COLUMNS PICKER (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-border pb-3">
            <Database className="h-4 w-4 text-primary-teal" />
            <h3 className="text-xs font-bold text-neutral-text-dark uppercase tracking-wider">1. Pick Data Source</h3>
          </div>

          {/* Module Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Module Registry</label>
            <select
              value={selectedModule}
              onChange={(e) => handleModuleChange(e.target.value as CustomModule)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              {(Object.keys(MODULE_LABELS) as CustomModule[]).map(m => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
          </div>

          {/* Whitelist Checkboxes */}
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted flex items-center gap-1.5">
              <Columns size={12} /> Active Columns Whitelist
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {moduleColumnsMap[selectedModule]?.map(col => (
                <label key={col} className="flex items-center gap-2.5 cursor-pointer text-xs p-1 rounded hover:bg-neutral-bg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={() => handleColumnToggle(col)}
                    className="rounded border-neutral-border text-primary-teal focus:ring-primary-teal h-3.5 w-3.5"
                  />
                  <span className="font-semibold text-neutral-text-dark capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* PANE 2 (MIDDLE): FILTERS, GROUP-BY & AGGREGATION (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-border pb-3">
            <Filter className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-neutral-text-dark uppercase tracking-wider">2. Group & Aggregate</h3>
          </div>

          {/* Live Filters */}
          <div className="space-y-3.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Quick Query Filters</label>
            <div className="space-y-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
                disabled={selectedModule !== 'carbon'}
              >
                <option value="">All Departments</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {selectedModule !== 'carbon' && (
                <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5">
                  <AlertCircle size={12} /> Department filter only supports Carbon logs
                </div>
              )}
            </div>
          </div>

          {/* Group-By field */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Group Results By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="">No Grouping (Raw Rows)</option>
              {groupByOptions[selectedModule].map(g => (
                <option key={g} value={g}>{g.replace(/([A-Z])/g, ' $1')}</option>
              ))}
            </select>
          </div>

          {/* Aggregate Function */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Aggregate Calculation</label>
            <select
              value={aggregate}
              onChange={(e) => setAggregate(e.target.value as '' | 'sum' | 'count')}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
              disabled={!groupBy}
            >
              <option value="">None</option>
              {canSum && <option value="sum">Sum ({sumFieldFor[selectedModule]})</option>}
              <option value="count">Count (Number of Records)</option>
            </select>
          </div>
        </div>

        {/* PANE 3 (RIGHT): LIVE PREVIEW & AUTOMATIC CHART (col-span-6) */}
        <div className="lg:col-span-6 space-y-6">

          {/* Automatic Suggested Chart Card */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-neutral-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-neutral-text-dark uppercase tracking-wider">Suggested Visualization</h3>
              </div>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Auto-suggested chart</span>
            </div>

            {suggestedChartData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={suggestedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={9} stroke="#64748B" />
                    <YAxis fontSize={9} stroke="#64748B" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-neutral-text-muted border border-dashed border-neutral-border rounded-lg p-6 bg-neutral-bg/25">
                <BarChart className="h-8 w-8 text-neutral-border animate-pulse mb-2" />
                <span className="text-[11px] font-bold">No Grouped Result Yet</span>
                <p className="text-[10px] text-neutral-text-muted max-w-xs mt-1 leading-normal">
                  Select a <strong>"Group Results By"</strong> variable and an <strong>"Aggregate Calculation"</strong>, then press <strong>Compile &amp; Run</strong> to construct dynamic chart models.
                </p>
              </div>
            )}
          </div>

          {/* Live Preview DataTable */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-neutral-border pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-neutral-text-dark uppercase tracking-wider">Live Preview Datatable</h3>
              </div>
              <span className="text-[10px] text-neutral-text-muted font-mono font-bold">
                {result ? `${previewRows.length} rows` : 'Not compiled'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                    {previewColumns.map(col => (
                      <th key={col} className="p-2 font-semibold capitalize">{col.replace(/([A-Z])/g, ' $1')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border font-medium text-neutral-text-dark">
                  {running && (
                    <tr>
                      <td colSpan={previewColumns.length || 3} className="p-6 text-center text-neutral-text-muted">
                        Compiling query…
                      </td>
                    </tr>
                  )}
                  {!running && previewRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-bg/20">
                      {previewColumns.map(col => (
                        <td key={col} className={`p-2 truncate max-w-[160px] ${isGrouped && col === previewColumns[1] ? 'text-right font-mono font-bold text-teal-600' : 'font-mono text-neutral-text-muted'}`}>
                          {resolveCell(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!running && result && previewRows.length === 0 && (
                    <tr>
                      <td colSpan={previewColumns.length || 3} className="p-6 text-center text-neutral-text-muted">
                        No active records match the current selection.
                      </td>
                    </tr>
                  )}
                  {!running && !result && (
                    <tr>
                      <td colSpan={previewColumns.length || 3} className="p-6 text-center text-neutral-text-muted">
                        Configure your query and press <strong>Compile &amp; Run</strong> to preview live records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER SHELF: SAVE TEMPLATE DOCK & SAVE FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-bg/20 border border-neutral-border rounded-xl p-5 shadow-sm mt-6">

        {/* Template List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-border/50 pb-2">
            <BookOpen size={16} className="text-primary-teal" />
            <h3 className="text-xs font-bold text-neutral-text-dark">Saved Custom Templates</h3>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {savedTemplates.map(tmp => {
              const mod = (tmp.moduleScope as { module?: string })?.module ?? 'custom';
              const gb = Array.isArray(tmp.groupBy) ? (tmp.groupBy[0] as string) : '';
              return (
                <div
                  key={tmp.id}
                  onClick={() => handleLoadTemplate(tmp)}
                  className="flex items-center justify-between p-3 border border-neutral-border rounded-lg bg-white hover:border-primary-teal cursor-pointer hover:shadow-sm transition-all"
                >
                  <div className="text-left">
                    <span className="text-xs font-bold text-neutral-text-dark">{tmp.name}</span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-text-muted">
                      <span className="uppercase font-semibold text-primary-teal">{mod}</span>
                      <span>·</span>
                      <span>Group: {gb || 'none'}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(tmp.id, e)}
                    className="p-1 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {savedTemplates.length === 0 && (
              <div className="text-center py-6 text-neutral-text-muted text-[11px]">
                No templates saved. Save report queries using the form on the right.
              </div>
            )}
          </div>
        </div>

        {/* Save Form */}
        <form onSubmit={handleSaveTemplate} className="space-y-4 border-l border-neutral-border/50 pl-0 md:pl-6">
          <div className="flex items-center gap-2 border-b border-neutral-border/50 pb-2">
            <Save size={16} className="text-primary-teal" />
            <h3 className="text-xs font-bold text-neutral-text-dark">Save Current Query Template</h3>
          </div>
          <p className="text-[11px] text-neutral-text-muted">
            Lock in the active column parameters, grouping factors, and aggregation metrics to reload them with one click.
          </p>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Template Label</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Procurement CO2e Aggregate..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
              >
                Save template
              </button>
            </div>
          </div>
        </form>

      </div>

    </div>
  );
}
