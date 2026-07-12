import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Building,
  Target,
  Percent,
  TrendingUp,
  Award
} from 'lucide-react';
import { environmentalService, Goal } from '../../services/environmentalService';
import { lookupsService } from '../../services/lookupsService';
import DataTable, { Column } from '../../components/ui-kit/DataTable';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import StatusBadge, { StatusValue } from '../../components/ui-kit/StatusBadge';
import { useToast } from '../../components/ui-kit/Toast';

// ProgressRing Sub-component for delightful circular visual ratios
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ percentage, size = 64, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-neutral-bg fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Dynamic completed segment circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary-teal fill-none transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage Center Text */}
      <span className="absolute text-xs font-black text-neutral-text-dark font-sans">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

export default function Goals() {
  const { addToast } = useToast();

  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View toggle: 'grid' or 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Form Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formTarget, setFormTarget] = useState<string>('');
  const [formCurrent, setFormCurrent] = useState<string>('');
  const [formUnit, setFormUnit] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');

  // Initial Data loading
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await environmentalService.getGoals();
      setGoals(data);

      const lookups = await lookupsService.getLookups();
      setDepartments(lookups.departments);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load environmental goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute days remaining from base mock date: 2026-07-11
  const calculateDaysRemaining = (endDateStr: string) => {
    const today = new Date('2026-07-11').getTime();
    const end = new Date(endDateStr).getTime();
    const diff = end - today;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormDept(departments[0] || 'Operations');
    setFormTarget('');
    setFormCurrent('0');
    setFormUnit('kWh');
    const todayStr = new Date('2026-07-11').toISOString().split('T')[0];
    setFormStart(todayStr);
    // Default end date is 3 months from now
    const defaultEnd = new Date('2026-10-11').toISOString().split('T')[0];
    setFormEnd(defaultEnd);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDept(goal.department);
    setFormTarget(goal.targetValue.toString());
    setFormCurrent(goal.currentValue.toString());
    setFormUnit(goal.unit);
    setFormStart(goal.startDate);
    setFormEnd(goal.endDate);
    setIsDrawerOpen(true);
  };

  // Save Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDept || !formTarget || !formUnit || !formStart || !formEnd) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    const targetVal = parseFloat(formTarget);
    const currentVal = parseFloat(formCurrent);

    if (isNaN(targetVal) || targetVal <= 0) {
      addToast('Target value must be greater than zero', 'warning');
      return;
    }
    if (isNaN(currentVal) || currentVal < 0) {
      addToast('Current progress value cannot be negative', 'warning');
      return;
    }

    if (new Date(formEnd) <= new Date(formStart)) {
      addToast('End date must be strictly after the start date', 'warning');
      return;
    }

    try {
      const payload = {
        title: formTitle,
        department: formDept,
        targetValue: targetVal,
        currentValue: currentVal,
        unit: formUnit,
        startDate: formStart,
        endDate: formEnd
      };

      await environmentalService.saveGoal(
        editingGoal ? { ...payload, id: editingGoal.id } : payload
      );

      addToast(
        editingGoal ? 'Environmental target updated' : 'New ESG goal initialized',
        'success'
      );
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to save environmental goal', 'danger');
    }
  };

  // Check Form Dirtiness
  const isFormDirty = useMemo(() => {
    if (editingGoal) {
      return (
        formTitle !== editingGoal.title ||
        formDept !== editingGoal.department ||
        parseFloat(formTarget) !== editingGoal.targetValue ||
        parseFloat(formCurrent) !== editingGoal.currentValue ||
        formUnit !== editingGoal.unit ||
        formStart !== editingGoal.startDate ||
        formEnd !== editingGoal.endDate
      );
    } else {
      return (
        formTitle !== '' ||
        formTarget !== '' ||
        formCurrent !== '0'
      );
    }
  }, [formTitle, formDept, formTarget, formCurrent, formUnit, formStart, formEnd, editingGoal]);

  // Column config for table view mode
  const tableColumns: Column<Goal>[] = [
    {
      key: 'title',
      header: 'Goal Objective',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1 text-left">
          <span className="font-bold text-neutral-text-dark text-xs lg:text-[13px]">{row.title}</span>
          <span className="text-[10px] text-neutral-text-muted font-black tracking-wider uppercase flex items-center gap-1">
            <Building className="h-3 w-3" /> {row.department}
          </span>
        </div>
      )
    },
    {
      key: 'progress',
      header: 'Visual Progress',
      sortable: false,
      render: (row) => {
        const percent = (row.currentValue / row.targetValue) * 100;
        return <ProgressRing percentage={percent} size={48} strokeWidth={4} />;
      }
    },
    {
      key: 'targetValue',
      header: 'Target vs Achievement',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col text-left">
          <span className="text-xs font-black text-neutral-text-dark">
            {row.currentValue.toLocaleString()} / {row.targetValue.toLocaleString()} {row.unit}
          </span>
          <span className="text-[10px] text-neutral-text-muted font-bold">
            Pillar: Environmental Target
          </span>
        </div>
      )
    },
    {
      key: 'endDate',
      header: 'Time Horizon',
      sortable: true,
      render: (row) => {
        const days = calculateDaysRemaining(row.endDate);
        return (
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs font-black text-neutral-text-dark">
              {days} days remaining
            </span>
            <span className="text-[10px] text-neutral-text-muted font-semibold">
              Ends {row.endDate}
            </span>
          </div>
        );
      }
    }
  ];

  const tableActions = [
    {
      label: 'Update Target',
      icon: <TrendingUp className="h-3.5 w-3.5 text-primary-teal" />,
      onClick: (row: Goal) => handleOpenEdit(row)
    }
  ];

  return (
    <div className="space-y-6" id="goals-page">
      
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            Target Goals
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Formulate, trace, and monitor high-performance ESG metric thresholds and sustainability targets.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* View Toggle */}
          <div className="bg-neutral-bg border border-neutral-border rounded-xl p-1 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-teal shadow-xs border border-neutral-border/30'
                  : 'text-neutral-text-muted hover:text-neutral-text-dark'
              }`}
              title="Card Grid Mode"
              id="btn-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-primary-teal shadow-xs border border-neutral-border/30'
                  : 'text-neutral-text-muted hover:text-neutral-text-dark'
              }`}
              title="Table Grid Mode"
              id="btn-view-table"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0"
            id="btn-new-goal"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 rounded-full border-2 border-primary-teal border-t-transparent animate-spin mx-auto" />
          <span className="text-xs text-neutral-text-muted font-bold mt-2 block">Assembling goals stage...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center">
          <p className="text-xs font-semibold">{error}</p>
          <button onClick={loadData} className="mt-2 text-xs bg-red-600 text-white font-bold px-4 py-2 rounded-xl">
            Retry
          </button>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-border rounded-2xl max-w-lg mx-auto p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-bg border border-neutral-border flex items-center justify-center text-2xl mx-auto">
            🏁
          </div>
          <h4 className="text-sm font-bold text-neutral-text-dark">No active goals found</h4>
          <p className="text-xs text-neutral-text-muted leading-relaxed">
            Formulate your company's carbon reduction, energy limits, or resource targets to motivate operational standards.
          </p>
          <button
            onClick={handleOpenCreate}
            className="text-xs bg-primary-teal text-white font-bold px-4 py-2 rounded-xl shadow"
          >
            Formulate First Goal
          </button>
        </div>
      ) : viewMode === 'table' ? (
        // Table view mode
        <DataTable<Goal>
          data={goals}
          columns={tableColumns}
          keyExtractor={(row) => row.id}
          searchKey="title"
          searchPlaceholder="Search goals by objective..."
          emptyTitle="No matching goals"
          emptyDescription="Try searching for another target criteria."
          loading={loading}
          actions={tableActions}
        />
      ) : (
        // Grid view mode
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="goals-card-grid">
          {goals.map((goal) => {
            const daysRemaining = calculateDaysRemaining(goal.endDate);
            const percentage = (goal.currentValue / goal.targetValue) * 100;
            const isCompleted = percentage >= 100;

            return (
              <div
                key={goal.id}
                className="bg-white border border-neutral-border hover:border-primary-teal/40 hover:shadow-md transition rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group text-left"
              >
                {/* Visual completion overlay strip */}
                {isCompleted && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                )}

                <div className="space-y-4">
                  {/* Top segment: Title and Department */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[10px] bg-neutral-bg text-neutral-text-muted font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-neutral-border/30">
                        <Building className="h-3 w-3" /> {goal.department}
                      </span>
                      {isCompleted && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" /> Achieved
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-neutral-text-dark tracking-tight hover:text-primary-teal cursor-pointer transition-colors" onClick={() => handleOpenEdit(goal)}>
                      {goal.title}
                    </h3>
                  </div>

                  {/* Mid Segment: ProgressRing, stats */}
                  <div className="flex items-center gap-5 bg-neutral-bg/20 p-3 rounded-xl border border-neutral-border/20">
                    <ProgressRing percentage={percentage} size={60} strokeWidth={5} />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] uppercase font-black text-neutral-text-muted tracking-wider block">Target Milestone</span>
                      <div className="text-xs font-black text-neutral-text-dark truncate">
                        {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-neutral-text-muted font-bold block truncate">{goal.unit} Target achieved</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Segment: Days counter & Quick Update button */}
                <div className="mt-5 pt-4 border-t border-neutral-border/60 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-neutral-text-muted shrink-0" />
                    <span className="text-[11px] font-black uppercase text-neutral-text-dark font-mono">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenEdit(goal)}
                    className="text-[10px] font-black uppercase tracking-wider text-primary-teal hover:text-primary-teal-dark border border-primary-teal/20 hover:border-primary-teal/50 bg-primary-teal/5 hover:bg-primary-teal/10 px-3 py-1.5 rounded-lg transition"
                  >
                    Update Progress
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Form Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingGoal ? 'Update Target Goal' : 'Establish Target Goal'}
        subtitle={editingGoal ? `Re-adjust target boundaries for ${editingGoal.title}` : 'Formulate strict resource or carbon emission guidelines.'}
        isDirty={isFormDirty}
        footerActions={
          <button
            onClick={handleSaveGoal}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow"
            id="btn-save-goal"
          >
            {editingGoal ? 'Commit Update' : 'Initialize Goal'}
          </button>
        }
      >
        <form className="space-y-5 text-left" onSubmit={handleSaveGoal}>
          
          {/* Objective Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Goal Objective / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Reduce Logistics Diesel Consumption"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Assigned Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formDept}
                onChange={e => setFormDept(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
              >
                {departments.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Target Unit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Target Metric Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. kWh, %, liters"
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Value */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Target Threshold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.0001"
                placeholder="e.g. 10000"
                value={formTarget}
                onChange={e => setFormTarget(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold font-mono"
              />
            </div>

            {/* Current Value */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Current Achievement
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 2400"
                value={formCurrent}
                onChange={e => setFormCurrent(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Start Horizon Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formStart}
                onChange={e => setFormStart(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Target Horizon End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formEnd}
                onChange={e => setFormEnd(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
              />
            </div>
          </div>

        </form>
      </FormDrawer>
    </div>
  );
}
