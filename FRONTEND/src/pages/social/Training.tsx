import React, { useMemo, useState } from 'react';
import { GraduationCap, Plus, CheckCircle2, Clock, Award, Building2, Search, User as UserIcon } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui-kit/Toast';
import ChartCard from '../../components/ui-kit/ChartCard';
import DataTable, { Column } from '../../components/ui-kit/DataTable';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import StatusBadge from '../../components/ui-kit/StatusBadge';
import { mockEmployees } from '../../mocks/db';
import {
  socialMetricsService, CURRENT_QUARTER, TrainingRecord, TrainingStatus
} from '../../services/socialMetricsService';

const TARGET = 90;

const STATUS_STYLES: Record<TrainingStatus, { color: string }> = {
  Completed: { color: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  'In Progress': { color: 'bg-blue-50 text-blue-800 border-blue-100' },
  'Not Started': { color: 'bg-neutral-bg text-neutral-text-muted border-neutral-border' },
  Overdue: { color: 'bg-red-50 text-red-800 border-red-100' },
};

interface TrainingRow extends TrainingRecord {
  employeeName: string;
  employeeAvatar?: string;
  department: string;
}

export default function Training() {
  const { role } = useApp();
  const { addToast } = useToast();
  const canManage = role === 'Admin' || role === 'CSR Manager';

  const departments = socialMetricsService.getDepartments();

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const records = useMemo(() => socialMetricsService.getTrainingRecords(), [tick]);

  // Filters
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drawer
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [formTraining, setFormTraining] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStatus, setFormStatus] = useState<TrainingStatus>('Completed');

  // Enriched rows
  const enriched = useMemo<TrainingRow[]>(() => {
    return records.map(r => {
      const emp = mockEmployees.find(e => e.id === r.employeeId);
      return {
        ...r,
        employeeName: emp?.name ?? 'Unknown',
        employeeAvatar: emp?.avatar,
        department: socialMetricsService.employeeDept(r.employeeId),
      };
    });
  }, [records]);

  const filtered = useMemo(() => {
    return enriched.filter(r => {
      if (selectedDept !== 'All' && r.department !== selectedDept) return false;
      if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;
      if (startDate && (!r.completedDate || r.completedDate < startDate)) return false;
      if (endDate && (!r.completedDate || r.completedDate > endDate)) return false;
      return true;
    });
  }, [enriched, selectedDept, selectedStatus, startDate, endDate]);

  // Stats
  const stats = useMemo(() => {
    const overall = socialMetricsService.trainingCompletionPct('All');
    const completedThisQuarter = records.filter(
      r => r.status === 'Completed' && r.completedDate && r.completedDate >= '2026-07-01'
    ).length;
    const totalHours = records.filter(r => r.status === 'Completed').reduce((sum, r) => sum + r.hours, 0);
    const byDept = socialMetricsService.completionByDepartment();
    const at100 = byDept.filter(d => d.completion === 100).length;
    return { overall, completedThisQuarter, totalHours, at100 };
  }, [records]);

  const chartData = useMemo(() => socialMetricsService.completionByDepartment(), [records]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = Number(formHours);
    if (!formEmployeeId || !formTraining.trim() || isNaN(hours) || hours <= 0) {
      addToast('Please provide an employee, training name and valid hours', 'warning');
      return;
    }
    socialMetricsService.addTrainingRecord({
      employeeId: formEmployeeId,
      trainingName: formTraining.trim(),
      hours,
      completedDate: formStatus === 'Completed' ? (formDate || '2026-07-12') : null,
      status: formStatus,
    });
    addToast('Training record added', 'success');
    setIsFormOpen(false);
    setFormEmployeeId(''); setEmpSearch(''); setFormTraining(''); setFormHours(''); setFormDate('');
    setFormStatus('Completed');
    refresh();
  };

  const filteredEmployees = mockEmployees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase())
  );
  const selectedEmp = mockEmployees.find(e => e.id === formEmployeeId);

  const columns: Column<TrainingRow>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: row => (
        <div className="flex items-center gap-2.5">
          {row.employeeAvatar
            ? <img src={row.employeeAvatar} alt="" className="h-7 w-7 rounded-full object-cover border border-neutral-border" />
            : <div className="h-7 w-7 rounded-full bg-neutral-bg flex items-center justify-center"><UserIcon className="h-3.5 w-3.5 text-neutral-text-muted" /></div>}
          <div>
            <div className="font-bold text-neutral-text-dark">{row.employeeName}</div>
            <div className="text-[10px] text-neutral-text-muted">{row.department}</div>
          </div>
        </div>
      ),
    },
    { key: 'trainingName', header: 'Training', sortable: true },
    {
      key: 'hours',
      header: 'Hours',
      sortable: true,
      render: row => <span className="tabular-nums font-bold">{row.hours}h</span>,
    },
    {
      key: 'completedDate',
      header: 'Completed',
      render: row => row.completedDate
        ? <span className="font-mono text-[11px] text-neutral-text-muted">{row.completedDate}</span>
        : <span className="text-[11px] text-neutral-text-muted">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: row => (
        <StatusBadge status={{ code: row.status.toLowerCase(), label: row.status, color: STATUS_STYLES[row.status].color }} />
      ),
    },
  ];

  const statCards = [
    { label: 'Overall Completion', value: `${stats.overall}%`, icon: <CheckCircle2 className="h-4 w-4" />, accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Completed This Quarter', value: String(stats.completedThisQuarter), icon: <Award className="h-4 w-4" />, accent: 'bg-teal-50 text-teal-700' },
    { label: 'Total Training Hours', value: String(stats.totalHours), icon: <Clock className="h-4 w-4" />, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Departments at 100%', value: String(stats.at100), icon: <Building2 className="h-4 w-4" />, accent: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="space-y-6" id="training-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary-teal" />
            Training Completion
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Mandatory learning progress across departments — completion rates, hours logged, and compliance gaps.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4" />
            Record Training
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-neutral-border p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department</label>
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none font-semibold text-neutral-text-dark">
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Status</label>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none font-semibold text-neutral-text-dark">
            <option value="All">All Statuses</option>
            {(['Completed', 'In Progress', 'Not Started', 'Overdue'] as TrainingStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Completed From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none font-semibold text-neutral-text-dark" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Completed To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none font-semibold text-neutral-text-dark" />
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white border border-neutral-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-muted">{s.label}</span>
              <span className={`p-1.5 rounded-lg ${s.accent}`}>{s.icon}</span>
            </div>
            <div className="mt-3 text-2xl font-black text-neutral-text-dark tracking-tighter">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Completion by department chart */}
      <ChartCard title="Completion Rate by Department" subtitle={`Target line at ${TARGET}% · current quarter ${CURRENT_QUARTER}`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="department" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} formatter={(v: number) => [`${v}%`, 'Completion']} cursor={{ fill: '#f8fafc' }} />
            <ReferenceLine y={TARGET} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} label={{ value: `Target ${TARGET}%`, position: 'right', fontSize: 10, fill: '#f59e0b' }} />
            <Bar dataKey="completion" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.completion >= TARGET ? '#10b981' : '#0D9488'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Records table */}
      <DataTable<TrainingRow>
        data={filtered}
        columns={columns}
        keyExtractor={row => row.id}
        searchKey="employeeName"
        searchPlaceholder="Search employee..."
        emptyTitle="No training records"
        emptyDescription="No training records match the current filters."
      />

      {/* Record training drawer */}
      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Record Training"
        subtitle="Log a training assignment or completion for an employee"
        footerActions={
          <button type="submit" form="training-form" className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-xl transition">
            Save Record
          </button>
        }
      >
        <form id="training-form" onSubmit={handleSave} className="space-y-5">
          {/* Employee autocomplete */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Employee</label>
            {selectedEmp ? (
              <div className="flex items-center justify-between px-3 py-2 border border-neutral-border rounded-xl bg-primary-teal/5">
                <div className="flex items-center gap-2">
                  <img src={selectedEmp.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                  <span className="text-xs font-bold text-neutral-text-dark">{selectedEmp.name}</span>
                </div>
                <button type="button" onClick={() => { setFormEmployeeId(''); setEmpSearch(''); }} className="text-[10px] font-bold text-neutral-text-muted hover:text-red-600">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowEmpDropdown(true); }}
                  onFocus={() => setShowEmpDropdown(true)}
                  placeholder="Search employee name..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
                />
                {showEmpDropdown && empSearch && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-neutral-border rounded-xl shadow-lg z-20 py-1">
                    {filteredEmployees.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-neutral-text-muted">No employees found</div>
                    ) : filteredEmployees.slice(0, 8).map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => { setFormEmployeeId(e.id); setShowEmpDropdown(false); }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-bg flex items-center gap-2 font-bold"
                      >
                        <img src={e.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                        {e.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Training Name</label>
            <input type="text" required value={formTraining} onChange={e => setFormTraining(e.target.value)} placeholder="e.g. ESG Fundamentals" className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Hours</label>
              <input type="number" min={1} value={formHours} onChange={e => setFormHours(e.target.value)} placeholder="e.g. 4" className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value as TrainingStatus)} className="w-full text-xs px-3 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none font-semibold text-neutral-text-dark">
                {(['Completed', 'In Progress', 'Not Started', 'Overdue'] as TrainingStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Completion Date</label>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} disabled={formStatus !== 'Completed'} className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark disabled:bg-neutral-bg disabled:text-neutral-text-muted" />
            {formStatus !== 'Completed' && (
              <p className="text-[10px] text-neutral-text-muted">Completion date applies only to completed trainings.</p>
            )}
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
