import React, { useMemo, useState } from 'react';
import {
  Users, Plus, Settings2, TrendingUp, TrendingDown, Minus, X, Edit, Trash2, ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui-kit/Toast';
import ChartCard from '../../components/ui-kit/ChartCard';
import DataTable, { Column } from '../../components/ui-kit/DataTable';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import {
  socialMetricsService, QUARTERS, CURRENT_QUARTER,
  MetricDefinition, DiversityRecord
} from '../../services/socialMetricsService';

const GENDER_COLORS = ['#0EA5E9', '#EC4899', '#8B5CF6'];
const BAR_COLOR = '#0D9488';

interface MetricRow extends DiversityRecord {
  metricName: string;
  unit: string;
  higherIsBetter: boolean;
  previousValue: number | null;
}

export default function Diversity() {
  const { role } = useApp();
  const { addToast } = useToast();
  const canManage = role === 'Admin' || role === 'CSR Manager';

  const departments = socialMetricsService.getDepartments();

  // Data + a tick to refresh after mutations
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const records = useMemo(() => socialMetricsService.getDiversityRecords(), [tick]);
  const definitions = useMemo(() => socialMetricsService.getDefinitions(), [tick]);
  const genderSplit = useMemo(() => socialMetricsService.getGenderSplit(), [tick]);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState(CURRENT_QUARTER);
  const [selectedDept, setSelectedDept] = useState(departments[0]);

  // Drawers / dialogs
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isDefinitionsOpen, setIsDefinitionsOpen] = useState(false);

  // Snapshot form
  const [formMetric, setFormMetric] = useState(definitions[0]?.code ?? '');
  const [formDept, setFormDept] = useState(departments[0]);
  const [formPeriod, setFormPeriod] = useState(CURRENT_QUARTER);
  const [formValue, setFormValue] = useState('');

  // --- Chart data ---
  const donutData = useMemo(() => {
    const g = genderSplit.find(x => x.department === selectedDept);
    if (!g) return [];
    return [
      { name: 'Male', value: g.male },
      { name: 'Female', value: g.female },
      { name: 'Non-binary', value: g.nonBinary },
    ];
  }, [genderSplit, selectedDept]);

  const trendData = useMemo(() => {
    return QUARTERS.map(period => {
      const rec = records.find(
        r => r.metricCode === 'DIV_INDEX' && r.department === selectedDept && r.period === period
      );
      return { period, value: rec?.value ?? 0 };
    });
  }, [records, selectedDept]);

  const comparisonData = useMemo(() => {
    return departments
      .map(dept => {
        const rec = records.find(
          r => r.metricCode === 'DIV_INDEX' && r.department === dept && r.period === selectedPeriod
        );
        return { department: dept, value: rec?.value ?? 0 };
      })
      .sort((a, b) => b.value - a.value);
  }, [records, departments, selectedPeriod]);

  // --- Table rows (selected period, direction vs previous quarter) ---
  const tableRows = useMemo<MetricRow[]>(() => {
    const periodIdx = QUARTERS.indexOf(selectedPeriod);
    const prevPeriod = periodIdx > 0 ? QUARTERS[periodIdx - 1] : null;
    const defByCode = new Map<string, MetricDefinition>(definitions.map(d => [d.code, d]));

    return records
      .filter(r => r.period === selectedPeriod)
      .filter(r => selectedDept === 'All' || r.department === selectedDept)
      .map(r => {
        const def = defByCode.get(r.metricCode);
        const prev = prevPeriod
          ? records.find(x => x.metricCode === r.metricCode && x.department === r.department && x.period === prevPeriod)
          : undefined;
        return {
          ...r,
          metricName: def?.name ?? r.metricCode,
          unit: def?.unit ?? '',
          higherIsBetter: def?.higherIsBetter ?? true,
          previousValue: prev ? prev.value : null,
        };
      });
  }, [records, definitions, selectedPeriod, selectedDept]);

  // --- Snapshot save ---
  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(formValue);
    if (!formMetric || !formDept || !formPeriod || isNaN(value)) {
      addToast('Please complete all snapshot fields with a valid value', 'warning');
      return;
    }
    socialMetricsService.addDiversityRecord({
      metricCode: formMetric,
      department: formDept,
      period: formPeriod,
      value,
    });
    addToast('Diversity snapshot recorded', 'success');
    setIsSnapshotOpen(false);
    setFormValue('');
    refresh();
  };

  const columns: Column<MetricRow>[] = [
    {
      key: 'metricName',
      header: 'Metric',
      sortable: true,
      render: row => <span className="font-bold text-neutral-text-dark">{row.metricName}</span>,
    },
    { key: 'department', header: 'Department', sortable: true },
    {
      key: 'period',
      header: 'Period',
      render: row => <span className="font-mono text-[11px] text-neutral-text-muted">{row.period}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: row => (
        <span className="font-black text-neutral-text-dark tabular-nums">
          {row.value}
          <span className="text-[10px] text-neutral-text-muted ml-1 font-bold">{row.unit}</span>
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'vs Prev.',
      render: row => {
        if (row.previousValue === null) {
          return <span className="text-neutral-text-muted text-[11px]">—</span>;
        }
        const delta = row.value - row.previousValue;
        if (delta === 0) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-text-muted">
              <Minus className="h-3.5 w-3.5" /> 0
            </span>
          );
        }
        const isUp = delta > 0;
        const isGood = row.higherIsBetter ? isUp : !isUp;
        return (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-black ${
              isGood ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6" id="diversity-page">
      {/* Header + filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-teal" />
            Diversity Metrics
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Workforce representation, balance indices, and equity trends across business units.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
          >
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {canManage && (
            <button
              onClick={() => { setFormPeriod(selectedPeriod); setFormDept(selectedDept === 'All' ? departments[0] : selectedDept); setIsSnapshotOpen(true); }}
              className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Record Snapshot
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Gender Split"
          subtitle={selectedDept === 'All' ? 'Select a department' : selectedDept}
        >
          {selectedDept === 'All' || donutData.length === 0 ? (
            <div className="text-xs text-neutral-text-muted text-center px-6">
              Pick a specific department to view its gender distribution.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                  formatter={(v: number, n: string) => [`${v} staff`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Diversity Index Trend" subtitle={`${selectedDept === 'All' ? 'All departments' : selectedDept} · by quarter`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="value" stroke={BAR_COLOR} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Comparison" subtitle={`Diversity index · ${selectedPeriod}`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} stroke="#94a3b8" width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={BAR_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Manage definitions link */}
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsDefinitionsOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-teal hover:text-primary-teal-dark transition"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage metric definitions
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Records table */}
      <DataTable<MetricRow>
        data={tableRows}
        columns={columns}
        keyExtractor={row => row.id}
        searchKey="metricName"
        searchPlaceholder="Search metric name..."
        emptyTitle="No metric records"
        emptyDescription="No diversity metric snapshots match the selected period and department."
      />

      {/* Record snapshot drawer */}
      <FormDrawer
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        title="Record Metric Snapshot"
        subtitle="Log a diversity metric reading for a department and period"
        footerActions={
          <button
            type="submit"
            form="snapshot-form"
            className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-xl transition"
          >
            Save Snapshot
          </button>
        }
      >
        <form id="snapshot-form" onSubmit={handleSaveSnapshot} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Metric</label>
            <select
              value={formMetric}
              onChange={e => setFormMetric(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark bg-white"
            >
              {definitions.map(d => (
                <option key={d.code} value={d.code}>{d.name} ({d.unit})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department</label>
            <select
              value={formDept}
              onChange={e => setFormDept(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark bg-white"
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Period</label>
            <select
              value={formPeriod}
              onChange={e => setFormPeriod(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark bg-white"
            >
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Value</label>
            <input
              type="number"
              step="0.1"
              required
              value={formValue}
              onChange={e => setFormValue(e.target.value)}
              placeholder="e.g. 68"
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>
        </form>
      </FormDrawer>

      {/* Manage definitions dialog */}
      {isDefinitionsOpen && (
        <MetricDefinitionsDialog
          definitions={definitions}
          onClose={() => setIsDefinitionsOpen(false)}
          onSave={defs => { socialMetricsService.saveDefinitions(defs); refresh(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric definitions CRUD dialog — reinforces that metrics are data-defined
// ---------------------------------------------------------------------------
interface DefsDialogProps {
  definitions: MetricDefinition[];
  onClose: () => void;
  onSave: (defs: MetricDefinition[]) => void;
}

const MetricDefinitionsDialog: React.FC<DefsDialogProps> = ({ definitions, onClose, onSave }) => {
  const { addToast } = useToast();
  const [defs, setDefs] = useState<MetricDefinition[]>(definitions);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState('%');
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const resetForm = () => { setName(''); setCode(''); setUnit('%'); setHigherIsBetter(true); setEditingCode(null); };

  const handleAddOrUpdate = () => {
    if (!name.trim() || !code.trim()) {
      addToast('Metric name and code are required', 'warning');
      return;
    }
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '_');
    if (editingCode) {
      setDefs(defs.map(d => d.code === editingCode ? { code: normalizedCode, name, unit, higherIsBetter } : d));
    } else {
      if (defs.some(d => d.code === normalizedCode)) {
        addToast('A metric with this code already exists', 'warning');
        return;
      }
      setDefs([...defs, { code: normalizedCode, name, unit, higherIsBetter }]);
    }
    resetForm();
  };

  const handleEdit = (d: MetricDefinition) => {
    setEditingCode(d.code); setName(d.name); setCode(d.code); setUnit(d.unit); setHigherIsBetter(d.higherIsBetter);
  };

  const handleDelete = (code: string) => setDefs(defs.filter(d => d.code !== code));

  const handleSaveAll = () => {
    onSave(defs);
    addToast('Metric definitions updated', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-text-dark/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-border w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-neutral-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-neutral-text-dark">Metric Definitions</h3>
            <p className="text-[11px] text-neutral-text-muted mt-0.5">Metrics are configurable data — add or refine what the org tracks.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-bg rounded-lg text-neutral-text-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Existing list */}
          <div className="space-y-2">
            {defs.map(d => (
              <div key={d.code} className="flex items-center justify-between border border-neutral-border rounded-xl px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-bold text-neutral-text-dark flex items-center gap-2">
                    {d.name}
                    <span className="font-mono text-[9px] bg-neutral-bg border border-neutral-border px-1.5 py-0.5 rounded font-black text-neutral-text-muted">{d.code}</span>
                  </div>
                  <div className="text-[10px] text-neutral-text-muted mt-0.5">
                    Unit: {d.unit} · {d.higherIsBetter ? 'Higher is better' : 'Lower is better'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(d)} className="p-1.5 hover:bg-neutral-bg rounded-lg text-neutral-text-muted hover:text-neutral-text-dark"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(d.code)} className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-text-muted hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / edit form */}
          <div className="bg-neutral-bg/40 border border-neutral-border rounded-xl p-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              {editingCode ? 'Edit metric' : 'Add metric'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Metric name" className="text-xs px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold" />
              <input value={code} onChange={e => setCode(e.target.value)} disabled={!!editingCode} placeholder="CODE" className="text-xs px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono uppercase font-black disabled:bg-neutral-bg disabled:text-neutral-text-muted" />
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (%, index)" className="text-xs px-3 py-2 border border-neutral-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold" />
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-text-dark px-1">
                <input type="checkbox" checked={higherIsBetter} onChange={e => setHigherIsBetter(e.target.checked)} className="h-4 w-4 rounded border-neutral-border text-primary-teal focus:ring-primary-teal" />
                Higher is better
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleAddOrUpdate} className="bg-primary-teal hover:bg-primary-teal-dark text-white text-[11px] font-black uppercase tracking-wider py-2 px-3.5 rounded-lg transition">
                {editingCode ? 'Update' : 'Add metric'}
              </button>
              {editingCode && (
                <button onClick={resetForm} className="text-[11px] font-bold text-neutral-text-muted hover:text-neutral-text-dark px-2">Cancel edit</button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-border flex items-center justify-end gap-2 bg-neutral-bg/30">
          <button onClick={onClose} className="text-xs font-black uppercase tracking-wider text-neutral-text-muted hover:text-neutral-text-dark px-4 py-2 rounded-xl border border-neutral-border">Cancel</button>
          <button onClick={handleSaveAll} className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-xl transition">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
