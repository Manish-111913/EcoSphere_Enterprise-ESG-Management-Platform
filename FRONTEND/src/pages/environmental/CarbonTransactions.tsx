import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  Search,
  Filter,
  Check,
  Building,
  Activity,
  Percent
} from 'lucide-react';
import { environmentalService, CarbonTransaction, EmissionFactor } from '../../services/environmentalService';
import { lookupsService } from '../../services/lookupsService';
import DataTable, { Column } from '../../components/ui-kit/DataTable';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import ChartCard from '../../components/ui-kit/ChartCard';
import StatCard from '../../components/ui-kit/StatCard';
import StatusBadge, { StatusValue } from '../../components/ui-kit/StatusBadge';
import { useToast } from '../../components/ui-kit/Toast';
import SelectField from '../../components/ui/select-field';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function CarbonTransactions() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // State
  const [transactions, setTransactions] = useState<CarbonTransaction[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filterDept, setFilterDept] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Auto' | 'Manual'>('All');
  const [filterFactorSearch, setFilterFactorSearch] = useState('');

  // Form Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formDept, setFormDept] = useState('');
  const [formFactorId, setFormFactorId] = useState('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  
  // Custom SearchableSelect for Factor inside the Form Drawer
  const [factorSearchQuery, setFactorSearchQuery] = useState('');
  const [isFactorDropdownOpen, setIsFactorDropdownOpen] = useState(false);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const txData = await environmentalService.getCarbonTransactions();
      setTransactions(txData);
      
      const factorData = await environmentalService.getEmissionFactors();
      setFactors(factorData);

      const lookups = await lookupsService.getLookups();
      setDepartments(lookups.departments);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load carbon transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Dept check
      if (filterDept !== 'All' && tx.department !== filterDept) return false;
      
      // Mode check
      if (filterMode !== 'All' && tx.mode !== filterMode) return false;

      // Factor Search check
      if (filterFactorSearch && !tx.factorName.toLowerCase().includes(filterFactorSearch.toLowerCase())) return false;

      // Date Range check
      if (filterStartDate) {
        if (new Date(tx.date) < new Date(filterStartDate)) return false;
      }
      if (filterEndDate) {
        if (new Date(tx.date) > new Date(filterEndDate)) return false;
      }

      return true;
    });
  }, [transactions, filterDept, filterMode, filterFactorSearch, filterStartDate, filterEndDate]);

  // Dynamic statistics calculations
  const stats = useMemo(() => {
    const list = filteredTransactions;
    const totalCo2e = list.reduce((sum, tx) => sum + tx.calculatedCo2e, 0);
    const count = list.length;

    // Top emitting department
    const deptTotals: Record<string, number> = {};
    list.forEach(tx => {
      deptTotals[tx.department] = (deptTotals[tx.department] || 0) + tx.calculatedCo2e;
    });

    let topDept = 'N/A';
    let topDeptVal = 0;
    Object.entries(deptTotals).forEach(([dept, val]) => {
      if (val > topDeptVal) {
        topDeptVal = val;
        topDept = dept;
      }
    });

    // Compute vs last period delta
    // If we have date filter, we look at previous window. Otherwise, we compare June 2026 vs May 2026.
    let delta = '0.0%';
    let isDeltaPositive = false; // "Positive" means lower emissions (which is good) or we can label higher emissions with up arrow

    if (filterStartDate && filterEndDate) {
      const start = new Date(filterStartDate).getTime();
      const end = new Date(filterEndDate).getTime();
      const diff = end - start;

      const prevStart = new Date(start - diff);
      const prevEnd = new Date(start);

      const prevPeriodTx = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= prevStart && d < prevEnd && (filterDept === 'All' || tx.department === filterDept);
      });

      const prevTotal = prevPeriodTx.reduce((sum, tx) => sum + tx.calculatedCo2e, 0);
      if (prevTotal > 0) {
        const percentage = ((totalCo2e - prevTotal) / prevTotal) * 100;
        delta = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
        isDeltaPositive = percentage <= 0; // True if emissions decreased
      }
    } else {
      // Default: Compare June 2026 vs May 2026
      const juneTx = transactions.filter(tx => tx.date.startsWith('2026-06'));
      const mayTx = transactions.filter(tx => tx.date.startsWith('2026-05'));
      const juneTotal = juneTx.reduce((sum, tx) => sum + tx.calculatedCo2e, 0);
      const mayTotal = mayTx.reduce((sum, tx) => sum + tx.calculatedCo2e, 0);

      if (mayTotal > 0) {
        const percentage = ((juneTotal - mayTotal) / mayTotal) * 100;
        delta = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
        isDeltaPositive = percentage <= 0;
      }
    }

    return {
      totalCo2e,
      delta,
      isDeltaPositive,
      count,
      topDept: topDept !== 'N/A' ? `${topDept} (${topDeptVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg)` : 'N/A'
    };
  }, [filteredTransactions, transactions, filterStartDate, filterEndDate, filterDept]);

  // Bar chart series generation: "Emissions by department × category"
  const chartData = useMemo(() => {
    // Collect all departments in currently filtered data
    const activeDepts = Array.from(new Set(filteredTransactions.map(tx => tx.department))) as string[];
    
    // Group factors by category
    const factorToCategoryMap: Record<string, string> = {};
    factors.forEach(f => {
      factorToCategoryMap[f.id] = f.category;
    });

    // Structure of data: { department: string, [category]: number }
    const deptCategoriesData: Record<string, Record<string, number>> = {};
    
    filteredTransactions.forEach(tx => {
      const cat = factorToCategoryMap[tx.emissionFactorId] || 'Other';
      if (!deptCategoriesData[tx.department]) {
        deptCategoriesData[tx.department] = {};
      }
      deptCategoriesData[tx.department][cat] = (deptCategoriesData[tx.department][cat] || 0) + tx.calculatedCo2e;
    });

    // Format for Recharts
    return activeDepts.map(dept => {
      const item: any = { department: dept };
      const deptData = deptCategoriesData[dept];
      if (deptData) {
        Object.keys(deptData).forEach(cat => {
          const val = deptData[cat];
          item[cat] = parseFloat(val.toFixed(1));
        });
      }
      return item;
    });
  }, [filteredTransactions, factors]);

  // Extract all categories currently present in dataset for rendering Recharts <Bar> tags
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    factors.forEach(f => cats.add(f.category));
    return Array.from(cats);
  }, [factors]);

  // Colors for Recharts
  const chartColors = [
    '#0ea5e9', // Sky blue (Scope 2 / electricity)
    '#f59e0b', // Amber (Scope 1 / fuel)
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6'  // Teal
  ];

  // Selected factor for New Transaction LIVE calculations
  const selectedFormFactor = useMemo(() => {
    return factors.find(f => f.id === formFactorId) || null;
  }, [formFactorId, factors]);

  // Live computed preview formula
  const liveCo2ePreview = useMemo(() => {
    const qty = parseFloat(formQuantity);
    if (!selectedFormFactor || isNaN(qty) || qty <= 0) return null;
    const computed = qty * selectedFormFactor.factor;
    return `${qty.toLocaleString()} ${selectedFormFactor.unit.split('/')[1] || 'units'} × ${selectedFormFactor.factor.toFixed(4)} = ${computed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg CO₂e`;
  }, [formQuantity, selectedFormFactor]);

  // Filter factors for form SearchableSelect
  const filteredFormFactors = useMemo(() => {
    if (!factorSearchQuery) return factors;
    return factors.filter(f =>
      f.name.toLowerCase().includes(factorSearchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(factorSearchQuery.toLowerCase())
    );
  }, [factorSearchQuery, factors]);

  // Handle open Drawer
  const handleOpenCreateDrawer = () => {
    setFormDept(departments[0] || 'Operations');
    setFormFactorId(factors[0]?.id || '');
    setFormQuantity('');
    const todayStr = new Date().toISOString().split('T')[0];
    setFormDate(todayStr);
    setFormNotes('');
    setFactorSearchQuery('');
    setIsDrawerOpen(true);
  };

  // Submit form
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDept || !formFactorId || !formQuantity || !formDate) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    const qtyNum = parseFloat(formQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      addToast('Quantity must be greater than zero', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (formDate > todayStr) {
      addToast('Date cannot be in the future', 'warning');
      return;
    }

    try {
      await environmentalService.saveCarbonTransaction({
        date: formDate,
        department: formDept,
        emissionFactorId: formFactorId,
        quantity: qtyNum,
        mode: 'Manual',
        notes: formNotes
      });

      addToast('Carbon transaction logged successfully', 'success');
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to log carbon transaction', 'danger');
    }
  };

  // DataTable columns configuration
  const columns: Column<CarbonTransaction>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-neutral-text-muted font-bold text-xs">{row.date}</span>
      )
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-neutral-text-muted shrink-0" />
          <span className="font-bold text-neutral-text-dark">{row.department}</span>
        </div>
      )
    },
    {
      key: 'factorName',
      header: 'Factor Reference',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-0.5 max-w-[200px]">
          <span className="font-bold text-neutral-text-dark text-xs truncate" title={row.factorName}>
            {row.factorName}
          </span>
          <span className="text-[10px] text-neutral-text-muted font-bold">
            Snapshot: {row.factorValue.toFixed(4)} {row.unit}
          </span>
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Activity Quantity',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-neutral-text-dark font-black">
          {row.quantity.toLocaleString()} <span className="text-[10px] text-neutral-text-muted font-bold">{row.unit.split('/')[1] || ''}</span>
        </span>
      )
    },
    {
      key: 'calculatedCo2e',
      header: 'Emissions (CO₂e kg)',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-black text-neutral-text-dark">
          {row.calculatedCo2e.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
        </span>
      )
    },
    {
      key: 'mode',
      header: 'Logged Mode',
      sortable: true,
      render: (row) => {
        const isAuto = row.mode === 'Auto';
        const badgeStyle: StatusValue = isAuto
          ? { code: 'auto', label: 'Auto Stream', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
          : { code: 'manual', label: 'Manual Log', color: 'bg-blue-50 text-blue-800 border-blue-100' };

        return <StatusBadge status={badgeStyle} />;
      }
    }
  ];

  const clearFilters = () => {
    setFilterDept('All');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMode('All');
    setFilterFactorSearch('');
  };

  const isFormDirty = useMemo(() => {
    return formQuantity !== '' || formNotes !== '';
  }, [formQuantity, formNotes]);

  return (
    <div className="space-y-6" id="carbon-transactions-page">
      
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            Carbon Transactions
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Real-time ledger audit trails tracking resource utilization and carbon equivalent (CO₂e) footprints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={() => navigate('/environmental/operational-records?status=Uncalculated')}
            className="border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm"
            id="btn-calculate-from-record"
          >
            <ArrowRightLeft className="h-4 w-4 text-primary-teal" />
            Calculate From Record
          </button>
          <button
            onClick={handleOpenCreateDrawer}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm"
            id="btn-new-transaction"
          >
            <Plus className="h-4 w-4" />
            Log New Transaction
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-border/60 pb-2.5">
          <Filter className="h-4 w-4 text-primary-teal" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-text-dark">Audit Filter Panel</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Dept */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department</label>
            <SelectField
              value={filterDept}
              onValueChange={setFilterDept}
              options={[
                { value: 'All', label: 'All Departments' },
                ...departments.map((department) => ({
                  value: department,
                  label: department,
                })),
              ]}
              triggerClassName="w-full h-9 text-xs px-3 py-2 font-semibold"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">From Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">To Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
            />
          </div>

          {/* Mode */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Capture Mode</label>
            <SelectField
              value={filterMode}
              onValueChange={(value) => setFilterMode(value as any)}
              options={[
                { value: 'All', label: 'All Modes' },
                { value: 'Auto', label: 'Auto Streams' },
                { value: 'Manual', label: 'Manual Logs' },
              ]}
              triggerClassName="w-full h-9 text-xs px-3 py-2 font-semibold"
            />
          </div>

          {/* Factor Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Factor Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-text-muted" />
              <input
                type="text"
                placeholder="Search factor..."
                value={filterFactorSearch}
                onChange={e => setFilterFactorSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters indicator */}
        {(filterDept !== 'All' || filterStartDate || filterEndDate || filterMode !== 'All' || filterFactorSearch) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-wider flex items-center gap-1 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg transition"
            >
              Clear Active Filters
            </button>
          </div>
        )}
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="carbon-transactions-stats">
        <StatCard
          data={{
            id: 'stat-emissions-total',
            title: 'Emissions This Period',
            value: `${stats.totalCo2e.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
            unit: 'kg CO₂e',
            delta: stats.delta,
            isPositive: stats.isDeltaPositive,
            sparkline: [40, 45, 42, 48, 50, 44, 38, 35]
          }}
        />
        <StatCard
          data={{
            id: 'stat-tx-count',
            title: 'Log Count',
            value: `${stats.count}`,
            unit: 'transactions',
            delta: '',
            isPositive: true,
            sparkline: [5, 10, 8, 12, 11, 15, 10, 14]
          }}
        />
        <StatCard
          data={{
            id: 'stat-top-dept',
            title: 'Top Emitting Dept',
            value: stats.topDept.split(' ')[0],
            unit: stats.topDept.includes('(') ? stats.topDept.substring(stats.topDept.indexOf('(')) : '',
            delta: '',
            isPositive: true,
            sparkline: []
          }}
        />
        <StatCard
          data={{
            id: 'stat-auto-stream',
            title: 'Active Capture Stream',
            value: '93.8%',
            unit: 'auto ratio',
            delta: '+2.4%',
            isPositive: true,
            sparkline: [85, 88, 87, 90, 92, 91, 94]
          }}
        />
      </div>

      {/* Stacked Chart Card */}
      <ChartCard
        title="Emissions by Department × Category"
        subtitle="Cumulative resource load segmented across operating pillars and scopes (in kg CO₂e)."
        id="emissions-dept-category-chart"
      >
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-neutral-text-muted text-xs font-semibold">
            No transaction records match the active criteria to populate the stacked load breakdown.
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="department"
                  tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280' }}
                />
                {uniqueCategories.map((cat, idx) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={chartColors[idx % chartColors.length]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* List / Grid stage */}
      <DataTable<CarbonTransaction>
        data={filteredTransactions}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchKey="factorName"
        searchPlaceholder="Search transactions by factor name..."
        emptyTitle="No carbon transactions found"
        emptyDescription="Try broadening your active filter parameters or log a manual transaction manually."
        emptyCtaLabel="Log New Transaction"
        onEmptyCtaClick={handleOpenCreateDrawer}
        loading={loading}
        error={error}
        onRetry={loadData}
      />

      {/* Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Carbon Transaction"
        subtitle="Report manual fuel, electric, travel, or waste metrics to calculate the carbon equivalent."
        isDirty={isFormDirty}
        footerActions={
          <button
            onClick={handleSaveTransaction}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow"
            id="btn-save-tx"
          >
            Audit Transaction
          </button>
        }
      >
        <form className="space-y-5 text-left" onSubmit={handleSaveTransaction}>
          
          {/* Live computed CO2e preview line */}
          {liveCo2ePreview && (
            <div className="p-3.5 bg-primary-teal/5 border border-primary-teal/20 rounded-xl flex items-center gap-3 text-left">
              <div className="h-7 w-7 rounded-full bg-primary-teal/10 flex items-center justify-center text-primary-teal shrink-0">
                <Activity className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h5 className="text-[10px] font-black text-primary-teal uppercase tracking-wider">Live CO₂e Calculation Preview</h5>
                <p className="font-mono text-[11px] text-neutral-text-dark font-black mt-0.5">
                  {liveCo2ePreview}
                </p>
              </div>
            </div>
          )}

          {/* Department Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Reporting Department <span className="text-red-500">*</span>
            </label>
            <SelectField
              value={formDept}
              onValueChange={setFormDept}
              options={departments.map((department) => ({
                value: department,
                label: department,
              }))}
              triggerClassName="w-full h-10 text-xs px-3.5 py-2.5 font-semibold"
            />
          </div>

          {/* Factor SearchableSelect */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Carbon Emission Factor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFactorDropdownOpen(!isFactorDropdownOpen)}
                className="w-full text-left text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedFormFactor
                    ? `${selectedFormFactor.name} (${selectedFormFactor.factor.toFixed(4)} ${selectedFormFactor.unit})`
                    : 'Select a factor...'}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-text-muted shrink-0" />
              </button>

              {isFactorDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsFactorDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-border shadow-2xl rounded-xl p-2 z-20 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-text-muted" />
                      <input
                        type="text"
                        placeholder="Type to filter factors..."
                        value={factorSearchQuery}
                        onChange={e => setFactorSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
                      />
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredFormFactors.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setFormFactorId(f.id);
                            setIsFactorDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg hover:bg-neutral-bg transition text-xs font-semibold flex items-start justify-between ${
                            formFactorId === f.id ? 'bg-primary-teal/5 text-primary-teal' : 'text-neutral-text-dark'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="font-bold truncate">{f.name}</div>
                            <div className="text-[10px] text-neutral-text-muted mt-0.5">{f.category}</div>
                          </div>
                          <div className="text-right font-mono shrink-0 text-[11px]">
                            {f.factor.toFixed(4)} <span className="text-[9px] text-neutral-text-muted block">{f.unit}</span>
                          </div>
                        </button>
                      ))}
                      {filteredFormFactors.length === 0 && (
                        <div className="text-center py-4 text-neutral-text-muted text-[11px] font-semibold">
                          No matching factors found
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Quantity {selectedFormFactor && `(${selectedFormFactor.unit.split('/')[1] || 'units'})`} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.0001"
                placeholder="e.g. 1500"
                value={formQuantity}
                onChange={e => setFormQuantity(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold font-mono"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Notes & Audit Evidence References
            </label>
            <textarea
              placeholder="e.g. Electricity billing code CAL-91823. Diesel invoice logged during monthly operational checks."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal bg-white font-semibold h-20 resize-none"
            />
          </div>

        </form>
      </FormDrawer>
    </div>
  );
}
