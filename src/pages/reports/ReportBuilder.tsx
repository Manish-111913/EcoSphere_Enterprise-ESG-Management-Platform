import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui-kit/Toast';
import {
  Database, Play, Save, ChevronDown, Check, Columns, Filter, BarChart,
  Grid, RefreshCw, Trash2, ArrowRight, Download, BookOpen, AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import {
  mockCarbonTransactions, mockCsrActivities, mockPolicyAcknowledgements, mockChallenges,
  mockDepartments, mockEmployees
} from '../../mocks/db';

interface SavedTemplate {
  id: string;
  name: string;
  module: string;
  columns: string[];
  groupBy: string;
  aggregate: string;
}

export default function ReportBuilder() {
  const { addToast } = useToast();

  // Selected states
  const [selectedModule, setSelectedModule] = useState('carbon_transactions');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [aggregate, setAggregate] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  // Custom template state
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);

  // Whietlist columns by module
  const moduleColumnsMap: Record<string, string[]> = {
    carbon_transactions: ['id', 'department', 'employee', 'quantity', 'calculatedCo2e', 'status', 'date'],
    csr_activities: ['id', 'title', 'category', 'points', 'xp', 'status'],
    policy_signoffs: ['id', 'policyName', 'employee', 'acknowledgedDate', 'status'],
    challenges: ['id', 'title', 'pillar', 'points', 'xp', 'difficulty', 'status']
  };

  useEffect(() => {
    // Select all columns by default for active module
    setSelectedColumns(moduleColumnsMap[selectedModule]);
  }, [selectedModule]);

  useEffect(() => {
    const cached = localStorage.getItem('ecosphere_saved_templates');
    if (cached) {
      setSavedTemplates(JSON.parse(cached));
    } else {
      const initial: SavedTemplate[] = [
        { id: 'tmp-1', name: 'Scope 1 Emissions Aggregate', module: 'carbon_transactions', columns: ['department', 'calculatedCo2e'], groupBy: 'department', aggregate: 'sum' },
        { id: 'tmp-2', name: 'CSR Volunteer XP Sum', module: 'csr_activities', columns: ['title', 'xp'], groupBy: 'title', aggregate: 'sum' }
      ];
      localStorage.setItem('ecosphere_saved_templates', JSON.stringify(initial));
      setSavedTemplates(initial);
    }
  }, []);

  const handleModuleChange = (mod: string) => {
    setSelectedModule(mod);
    setGroupBy('');
    setAggregate('');
  };

  const handleColumnToggle = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const newTemplate: SavedTemplate = {
      id: `tmp-${Date.now()}`,
      name: templateName,
      module: selectedModule,
      columns: selectedColumns,
      groupBy,
      aggregate
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem('ecosphere_saved_templates', JSON.stringify(updated));
    setTemplateName('');

    addToast({
      title: 'Template Saved',
      description: `Report template "${newTemplate.name}" was successfully registered.`,
      type: 'success'
    });
  };

  const handleLoadTemplate = (tmp: SavedTemplate) => {
    setSelectedModule(tmp.module);
    setSelectedColumns(tmp.columns);
    setGroupBy(tmp.groupBy);
    setAggregate(tmp.aggregate);

    addToast({
      title: 'Template Loaded',
      description: `Configured builder fields to template "${tmp.name}".`,
      type: 'info'
    });
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem('ecosphere_saved_templates', JSON.stringify(updated));
    addToast({
      title: 'Template Deleted',
      description: 'Template has been removed from your saved dock.',
      type: 'info'
    });
  };

  const handleExport = (format: string) => {
    addToast({
      title: 'Export ready',
      description: `Custom reports ledger compiled and exported to ${format.toUpperCase()} successfully.`,
      type: 'success'
    });
  };

  // ---------------------------------
  // LIVE PREVIEW COMPUTATION & DATA AGGREGATION
  // ---------------------------------
  let rawData: any[] = [];
  if (selectedModule === 'carbon_transactions') {
    rawData = mockCarbonTransactions.map(tx => ({
      ...tx,
      department: mockDepartments.find(d => d.id === tx.departmentId)?.name || 'Procurement',
      employee: mockEmployees.find(e => e.id === tx.employeeId)?.name || 'Admin',
    }));
  } else if (selectedModule === 'csr_activities') {
    rawData = mockCsrActivities;
  } else if (selectedModule === 'policy_signoffs') {
    rawData = mockPolicyAcknowledgements.map(ack => ({
      ...ack,
      policyName: 'Sustainability Ethics Charter',
      employee: mockEmployees.find(e => e.id === ack.employeeId)?.name || 'Employee'
    }));
  } else {
    rawData = mockChallenges;
  }

  // Filter department if selected
  if (filterDept && selectedModule === 'carbon_transactions') {
    rawData = rawData.filter(d => d.departmentId === filterDept);
  }

  // Group-by and Aggregate
  let finalPreviewRows: any[] = [];
  let suggestedChartData: any[] = [];

  if (groupBy && aggregate) {
    // Perform live aggregation logic
    const groups: Record<string, any[]> = {};
    rawData.forEach(row => {
      const key = row[groupBy] || 'Unclassified';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    finalPreviewRows = Object.entries(groups).map(([groupKey, rows]) => {
      let value = 0;
      // Find a numeric column to aggregate
      const numericCol = selectedModule === 'carbon_transactions' ? 'calculatedCo2e' :
                         selectedModule === 'csr_activities' ? 'xp' : 'points';
      
      if (aggregate === 'sum') {
        value = rows.reduce((acc, r) => acc + (Number(r[numericCol]) || 0), 0);
      } else if (aggregate === 'avg') {
        const sum = rows.reduce((acc, r) => acc + (Number(r[numericCol]) || 0), 0);
        value = Math.round((sum / rows.length) * 10) / 10;
      } else {
        value = rows.length;
      }

      return {
        [groupBy]: groupKey,
        [aggregate === 'count' ? 'Count' : 'Value']: value,
        _count: rows.length
      };
    });

    suggestedChartData = finalPreviewRows.map(row => ({
      name: row[groupBy],
      value: row[aggregate === 'count' ? 'Count' : 'Value']
    }));
  } else {
    // Normal raw preview rows
    finalPreviewRows = rawData.slice(0, 10);
  }

  return (
    <div className="space-y-6 text-left">
      {/* Builder Header */}
      <div className="border-b border-neutral-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">Custom Report Builder</h1>
          <p className="text-xs text-neutral-text-muted mt-1">
            Build, group, and visualize custom ESG ledger queries using the live metadata compiler.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-1.5 border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={13} /> Export Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-1.5 bg-neutral-text-dark hover:bg-neutral-text-dark/95 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <Play size={13} className="fill-white" /> Compile & Run
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
              onChange={(e) => handleModuleChange(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="carbon_transactions">Carbon Transactions (Env)</option>
              <option value="csr_activities">CSR Activities (Social)</option>
              <option value="policy_signoffs">Policy Acknowledgements (Gov)</option>
              <option value="challenges">Sustainability Challenges (Gam)</option>
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
                disabled={selectedModule !== 'carbon_transactions'}
              >
                <option value="">All Departments</option>
                {mockDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {selectedModule !== 'carbon_transactions' && (
                <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5">
                  <AlertCircle size={12} /> Filters only support Carbon logs
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
              {selectedModule === 'carbon_transactions' && (
                <>
                  <option value="department">Department</option>
                  <option value="status">Verification Status</option>
                  <option value="date">Date Log</option>
                </>
              )}
              {selectedModule === 'csr_activities' && (
                <>
                  <option value="category">CSR Category</option>
                  <option value="status">Activity Status</option>
                </>
              )}
              {selectedModule === 'policy_signoffs' && (
                <>
                  <option value="status">Signoff Status</option>
                </>
              )}
              {selectedModule === 'challenges' && (
                <>
                  <option value="pillar">ESG Pillar</option>
                  <option value="difficulty">Difficulty Badge</option>
                </>
              )}
            </select>
          </div>

          {/* Aggregate Function */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Aggregate Calculation</label>
            <select
              value={aggregate}
              onChange={(e) => setAggregate(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
              disabled={!groupBy}
            >
              <option value="">None</option>
              <option value="sum">Sum (Total Metric Value)</option>
              <option value="avg">Average Score</option>
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

            {groupBy && aggregate && suggestedChartData.length > 0 ? (
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
                <span className="text-[11px] font-bold">No Grouping Active</span>
                <p className="text-[10px] text-neutral-text-muted max-w-xs mt-1 leading-normal">
                  Select a <strong>"Group Results By"</strong> variable and an <strong>"Aggregate Calculation"</strong> parameter to construct dynamic chart models.
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
              <span className="text-[10px] text-neutral-text-muted font-mono font-bold">Query Limit: 10 rows</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                    {groupBy && aggregate ? (
                      <>
                        <th className="p-2 font-semibold capitalize">{groupBy}</th>
                        <th className="p-2 font-semibold capitalize text-right">{aggregate} metric</th>
                        <th className="p-2 font-semibold text-center">Record count</th>
                      </>
                    ) : (
                      selectedColumns.map(col => (
                        <th key={col} className="p-2 font-semibold capitalize">{col.replace(/([A-Z])/g, ' $1')}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border font-medium text-neutral-text-dark">
                  {groupBy && aggregate ? (
                    finalPreviewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-bg/20">
                        <td className="p-2 font-bold">{row[groupBy]}</td>
                        <td className="p-2 text-right font-mono font-bold text-teal-600">{row[aggregate === 'count' ? 'Count' : 'Value']}</td>
                        <td className="p-2 text-center font-mono text-neutral-text-muted">{row._count} rows</td>
                      </tr>
                    ))
                  ) : (
                    finalPreviewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-bg/20">
                        {selectedColumns.map(col => (
                          <td key={col} className="p-2 font-mono text-neutral-text-muted truncate max-w-[120px]">
                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                  {finalPreviewRows.length === 0 && (
                    <tr>
                      <td colSpan={selectedColumns.length || 3} className="p-6 text-center text-neutral-text-muted">
                        No active records match the current selection.
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
            {savedTemplates.map(tmp => (
              <div
                key={tmp.id}
                onClick={() => handleLoadTemplate(tmp)}
                className="flex items-center justify-between p-3 border border-neutral-border rounded-lg bg-white hover:border-primary-teal cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-text-dark">{tmp.name}</span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-text-muted">
                    <span className="uppercase font-semibold text-primary-teal">{tmp.module.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>Group: {tmp.groupBy || 'none'}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteTemplate(tmp.id, e)}
                  className="p-1 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
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
