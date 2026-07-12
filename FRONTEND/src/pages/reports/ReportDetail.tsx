import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../components/ui-kit/Toast';
import {
  Leaf, Users, ShieldCheck, BarChart3, ChevronDown, Download, ArrowLeft,
  Calendar, Building, FileSpreadsheet, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';

import {
  mockDepartments, mockEmployees, mockChallenges, mockCarbonTransactions,
  mockCsrActivities, mockComplianceIssues, mockPolicies, mockEmissionFactors
} from '../../mocks/db';

interface ExportRecord {
  id: string;
  name: string;
  format: 'PDF' | 'Excel' | 'CSV';
  timestamp: string;
  size: string;
}

export default function ReportDetail() {
  const { type } = useParams<{ type: string }>();
  const { addToast } = useToast();

  // 1. FILTER STATES (ALL SIX FILTERS)
  const [filterDept, setFilterDept] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterChallenge, setFilterChallenge] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Dropdown states
  const [exportOpen, setExportOpen] = useState(false);

  // Load weights from settings if exists
  const [weights, setWeights] = useState({ e: 40, s: 30, g: 30 });
  useEffect(() => {
    const cached = localStorage.getItem('ecosphere_esg_weights');
    if (cached) {
      setWeights(JSON.parse(cached));
    }
  }, []);

  // Title and layout based on type
  const reportInfo = {
    title: type === 'environmental' ? 'Environmental Report' :
           type === 'social' ? 'Social Report' :
           type === 'governance' ? 'Governance Report' : 'ESG Executive Summary',
    badge: type === 'environmental' ? 'Scope 1/2/3' :
           type === 'social' ? 'CSR Engagement' :
           type === 'governance' ? 'Audit & Signoffs' : 'Corporate Index',
    icon: type === 'environmental' ? <Leaf className="h-5 w-5 text-emerald-600" /> :
          type === 'social' ? <Users className="h-5 w-5 text-teal-600" /> :
          type === 'governance' ? <ShieldCheck className="h-5 w-5 text-indigo-600" /> :
          <BarChart3 className="h-5 w-5 text-slate-700" />,
    color: type === 'environmental' ? 'teal' :
           type === 'social' ? 'indigo' :
           type === 'governance' ? 'rose' : 'emerald'
  };

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    setExportOpen(false);
    
    // Generate simulated export metadata
    const expId = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    const docName = `${reportInfo.title} - ${new Date().toISOString().split('T')[0]}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const size = format === 'PDF' ? '1.8 MB' : format === 'Excel' ? '820 KB' : '150 KB';

    const newExport: ExportRecord = {
      id: expId,
      name: docName,
      format,
      timestamp,
      size
    };

    // Save to Recent Exports
    const cached = localStorage.getItem('ecosphere_recent_exports');
    const list = cached ? JSON.parse(cached) : [];
    const updated = [newExport, ...list];
    localStorage.setItem('ecosphere_recent_exports', JSON.stringify(updated));

    // Toast
    addToast({
      title: 'Export ready',
      description: `Your ${format} document is compiled and ready for download.`,
      type: 'success'
    });
  };

  const handleResetFilters = () => {
    setFilterDept('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterModule('');
    setFilterEmployee('');
    setFilterChallenge('');
    setFilterCategory('');
  };

  // ---------------------------------
  // 2. DATA PROCESSING & MOCK DATATABLE LISTS
  // ---------------------------------
  let displayRows: any[] = [];
  let tableHeaders: string[] = [];
  let renderRowCells = (row: any) => null;

  if (type === 'environmental') {
    // Filter Carbon Transactions
    let filtered = mockCarbonTransactions;
    if (filterDept) filtered = filtered.filter(t => t.departmentId === filterDept);
    if (filterEmployee) filtered = filtered.filter(t => t.employeeId === filterEmployee);
    if (filterCategory) {
      // Category matches Scope
      filtered = filtered.filter(t => {
        const ef = mockEmissionFactors.find(f => f.id === t.emissionFactorId);
        return ef?.scope.toString() === filterCategory;
      });
    }
    // Date Range filters
    if (filterStartDate) filtered = filtered.filter(t => t.date >= filterStartDate);
    if (filterEndDate) filtered = filtered.filter(t => t.date <= filterEndDate);

    displayRows = filtered;
    tableHeaders = ['ID', 'Department', 'Logged By', 'Factor / standard', 'Quantity', 'Scope', 'Total CO₂e', 'Status'];
    renderRowCells = (tx: any) => {
      const dept = mockDepartments.find(d => d.id === tx.departmentId);
      const emp = mockEmployees.find(e => e.id === tx.employeeId);
      const ef = mockEmissionFactors.find(f => f.id === tx.emissionFactorId);
      return (
        <>
          <td className="p-3 font-mono font-semibold text-neutral-text-dark">{tx.id}</td>
          <td className="p-3 font-semibold text-neutral-text-dark">{dept?.name || 'Corporate'}</td>
          <td className="p-3 text-neutral-text-muted">{emp?.name || 'Automated'}</td>
          <td className="p-3">
            <div className="font-semibold text-neutral-text-dark">{ef?.name}</div>
            <div className="text-[10px] text-neutral-text-muted">{ef?.version}</div>
          </td>
          <td className="p-3 font-mono text-neutral-text-dark text-right">{tx.quantity}</td>
          <td className="p-3 text-center">
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
              Scope {ef?.scope || 1}
            </span>
          </td>
          <td className="p-3 font-mono font-bold text-red-600 text-right">{tx.calculatedCo2e} t</td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              tx.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
              tx.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {tx.status}
            </span>
          </td>
        </>
      );
    };
  } else if (type === 'social') {
    // Filter CSR activities / challenges completion
    let filtered = mockCsrActivities;
    if (filterDept) {
      // Mock filtering based on department
    }
    if (filterCategory) {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    displayRows = filtered;
    tableHeaders = ['Activity ID', 'Title', 'Category', 'Capacity Progress', 'Points Reward', 'XP Reward', 'Status'];
    renderRowCells = (act: any) => {
      return (
        <>
          <td className="p-3 font-mono font-semibold text-neutral-text-dark">{act.id.toUpperCase()}</td>
          <td className="p-3">
            <div className="font-semibold text-neutral-text-dark">{act.title}</div>
            <p className="text-[10px] text-neutral-text-muted leading-tight">{act.description}</p>
          </td>
          <td className="p-3 text-center">
            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
              {act.category}
            </span>
          </td>
          <td className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-20 bg-neutral-bg border border-neutral-border rounded-full h-2 overflow-hidden">
                <div className="bg-primary-teal h-full" style={{ width: '70%' }} />
              </div>
              <span className="text-[10px] text-neutral-text-muted font-bold">70%</span>
            </div>
          </td>
          <td className="p-3 font-mono text-neutral-text-dark text-right">+{act.points} pts</td>
          <td className="p-3 font-mono text-emerald-600 text-right">+{act.xp} XP</td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              act.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {act.status}
            </span>
          </td>
        </>
      );
    };
  } else if (type === 'governance') {
    // Compliance issues / Policy sign-offs
    let filtered = mockComplianceIssues;
    if (filterDept) {
      // Issues linked to department heads
    }
    if (filterCategory) {
      filtered = filtered.filter(i => i.severity === filterCategory);
    }
    displayRows = filtered;
    tableHeaders = ['ID', 'Issue Title', 'Severity', 'Due Date', 'Status', 'Overdue Alert', 'Owner'];
    renderRowCells = (issue: any) => {
      const owner = mockEmployees.find(e => e.id === issue.ownerId);
      return (
        <>
          <td className="p-3 font-mono font-semibold text-neutral-text-dark">{issue.id.toUpperCase()}</td>
          <td className="p-3">
            <div className="font-semibold text-neutral-text-dark">{issue.title}</div>
            <p className="text-[10px] text-neutral-text-muted leading-tight">{issue.description}</p>
          </td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
              issue.severity === 'Critical' ? 'bg-red-50 text-red-800 border border-red-100' :
              issue.severity === 'High' ? 'bg-orange-50 text-orange-800' :
              'bg-yellow-50 text-yellow-800'
            }`}>
              {issue.severity}
            </span>
          </td>
          <td className="p-3 font-mono text-neutral-text-muted">{issue.dueDate}</td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {issue.status}
            </span>
          </td>
          <td className="p-3 text-center">
            {issue.isOverdue ? (
              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">Overdue alert</span>
            ) : (
              <span className="text-[9px] font-bold text-neutral-text-muted bg-neutral-bg px-2 py-0.5 rounded-full">On schedule</span>
            )}
          </td>
          <td className="p-3 font-medium text-neutral-text-dark">{owner?.name || 'Compliance Team'}</td>
        </>
      );
    };
  } else {
    // ESG Executive Summary: Department Performance
    displayRows = mockDepartments;
    tableHeaders = ['Code', 'Department', 'E Score', 'S Score', 'G Score', 'Total Index', 'Head Manager'];
    renderRowCells = (dept: any) => {
      return (
        <>
          <td className="p-3 font-mono font-semibold text-neutral-text-dark">{dept.code}</td>
          <td className="p-3 font-bold text-neutral-text-dark">{dept.name}</td>
          <td className="p-3 text-center font-mono text-emerald-600 font-bold">88</td>
          <td className="p-3 text-center font-mono text-teal-600 font-bold">82</td>
          <td className="p-3 text-center font-mono text-indigo-600 font-bold">91</td>
          <td className="p-3 text-right font-mono font-black text-neutral-text-dark">87.2</td>
          <td className="p-3 text-neutral-text-muted font-medium">{dept.head}</td>
        </>
      );
    };
  }

  // ---------------------------------
  // 3. RECHARTS METRIC DATASETS
  // ---------------------------------
  const emissionsSummaryData = [
    { month: 'Jan', Scope1: 42, Scope2: 38, Scope3: 15 },
    { month: 'Feb', Scope1: 39, Scope2: 35, Scope3: 14 },
    { month: 'Mar', Scope1: 45, Scope2: 41, Scope3: 18 },
    { month: 'Apr', Scope1: 31, Scope2: 29, Scope3: 12 },
    { month: 'May', Scope1: 28, Scope2: 26, Scope3: 11 },
    { month: 'Jun', Scope1: 25, Scope2: 24, Scope3: 9 },
  ];

  const socialSummaryData = [
    { category: 'Zero Waste', completed: 18, enrolled: 25 },
    { category: 'Clean Energy', completed: 12, enrolled: 15 },
    { category: 'Eco Mobility', completed: 22, enrolled: 30 },
    { category: 'Ethical Supply', completed: 8, enrolled: 10 },
  ];

  const govSummaryData = [
    { name: 'Jan', resolved: 4, open: 2 },
    { name: 'Feb', resolved: 5, open: 1 },
    { name: 'Mar', resolved: 3, open: 3 },
    { name: 'Apr', resolved: 6, open: 1 },
    { name: 'May', resolved: 7, open: 0 },
    { name: 'Jun', resolved: 8, open: 2 },
  ];

  const esgTrendData = [
    { month: 'Jan', E: 81, S: 79, G: 86 },
    { month: 'Feb', E: 83, S: 80, G: 87 },
    { month: 'Mar', E: 84, S: 81, G: 88 },
    { month: 'Apr', E: 85, S: 83, G: 89 },
    { month: 'May', E: 87, S: 84, G: 90 },
    { month: 'Jun', E: 89, S: 86, G: 92 },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Detail Header with back navigation & Export Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/reports"
            className="p-2 border border-neutral-border hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-xl transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 bg-neutral-bg border border-neutral-border rounded-lg text-neutral-text-dark shrink-0">
                {reportInfo.icon}
              </span>
              <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">
                {reportInfo.title}
              </h1>
              <span className="text-[10px] bg-primary-teal/10 text-primary-teal border border-primary-teal/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {reportInfo.badge}
              </span>
            </div>
            <p className="text-xs text-neutral-text-muted mt-1 font-medium">
              Analytical tracking board synchronized with corporate registries.
            </p>
          </div>
        </div>

        {/* Export Dropdown */}
        <div className="relative self-start sm:self-center">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="px-4 py-2 bg-neutral-text-dark hover:bg-neutral-text-dark/90 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Download size={14} /> Export Report <ChevronDown size={14} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-neutral-border rounded-xl shadow-lg py-1.5 z-50 text-left">
              <button
                onClick={() => handleExport('PDF')}
                className="w-full px-4 py-2 text-xs hover:bg-neutral-bg text-neutral-text-dark font-medium flex items-center gap-2"
              >
                Download PDF Document
              </button>
              <button
                onClick={() => handleExport('Excel')}
                className="w-full px-4 py-2 text-xs hover:bg-neutral-bg text-neutral-text-dark font-medium flex items-center gap-2"
              >
                Download Excel Sheet
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="w-full px-4 py-2 text-xs hover:bg-neutral-bg text-neutral-text-dark font-medium flex items-center gap-2"
              >
                Download CSV Ledger
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ 6-FILTER BAR */}
      <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-text-dark border-b border-neutral-border/50 pb-2">
          <Filter size={14} className="text-primary-teal" />
          <span>Report Query Parameters (6 Active Filters)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Department */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Department</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="">All Departments</option>
              {mockDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* 2. Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            />
          </div>

          {/* 3. End Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            />
          </div>

          {/* 4. Module */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Module</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="">All Modules</option>
              <option value="env">Environmental</option>
              <option value="soc">Social Activities</option>
              <option value="gov">Compliance Policies</option>
              <option value="gam">Gamification Challenges</option>
            </select>
          </div>

          {/* 5. Employee */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="">All Employees</option>
              {mockEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* 6. Challenge / ESG Category */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">
              {type === 'environmental' ? 'Scope Rating' : type === 'social' ? 'Category' : type === 'governance' ? 'Severity' : 'ESG Metric'}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-neutral-text-dark focus:ring-1 focus:ring-primary-teal"
            >
              <option value="">All Targets</option>
              {type === 'environmental' && (
                <>
                  <option value="1">Scope 1 (Direct)</option>
                  <option value="2">Scope 2 (Indirect)</option>
                  <option value="3">Scope 3 (Supply Chain)</option>
                </>
              )}
              {type === 'social' && (
                <>
                  <option value="Zero Waste">Zero Waste</option>
                  <option value="Clean Energy">Clean Energy</option>
                  <option value="Eco Mobility">Eco Mobility</option>
                </>
              )}
              {type === 'governance' && (
                <>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-border/50 pt-3">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-neutral-text-muted hover:text-neutral-text-dark text-xs font-semibold transition-colors"
          >
            Reset Filters
          </button>
          <button className="px-4 py-1.5 bg-primary-teal/10 hover:bg-primary-teal/20 text-primary-teal text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
            <RefreshCw size={13} /> Apply Query
          </button>
        </div>
      </div>

      {/* ---------------------------------
          4. 2-3 CHARTS CARD ROW
         --------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {type === 'environmental' && (
          <>
            {/* Environmental Charts */}
            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Scope 1 / 2 / 3 Emissions Monthly Trend</h3>
                <p className="text-[11px] text-neutral-text-muted">Breakdown in metric tons of carbon equivalent</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={emissionsSummaryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorS1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorS2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="Scope1" stroke="#0F766E" fillOpacity={1} fill="url(#colorS1)" />
                    <Area type="monotone" dataKey="Scope2" stroke="#0D9488" fillOpacity={1} fill="url(#colorS2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Emissions by Department Distribution</h3>
                <p className="text-[11px] text-neutral-text-muted">Comparison of overall quarterly carbon logging</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Procurement', emissions: 450 }, { name: 'Engineering', emissions: 310 }, { name: 'Logistics', emissions: 580 }, { name: 'HR', emissions: 80 }]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="emissions" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {type === 'social' && (
          <>
            {/* Social Charts */}
            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Enrolled vs Completed Participations</h3>
                <p className="text-[11px] text-neutral-text-muted">Total counts sorted by sustainability categories</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={socialSummaryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="category" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="enrolled" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Volunteering Hours Growth</h3>
                <p className="text-[11px] text-neutral-text-muted">Aggregated hours completed by month</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{ month: 'Jan', hours: 120 }, { month: 'Feb', hours: 180 }, { month: 'Mar', hours: 240 }, { month: 'Apr', hours: 310 }, { month: 'May', hours: 450 }]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#6366F1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {type === 'governance' && (
          <>
            {/* Governance Charts */}
            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Unresolved vs Resolved Compliance Issues</h3>
                <p className="text-[11px] text-neutral-text-muted">Monthly resolution rate tracking</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={govSummaryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="resolved" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="open" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Regulatory Policies Sign-off Status</h3>
                <p className="text-[11px] text-neutral-text-muted">Completion rate percentages across policies</p>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Ethics', rate: 98 }, { name: 'Carbon Standard', rate: 91 }, { name: 'Waste Mgmt', rate: 85 }, { name: 'Supplier Ethics', rate: 76 }]} layout="vertical" margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" fontSize={10} stroke="#64748B" />
                    <YAxis dataKey="name" type="category" fontSize={10} stroke="#64748B" width={80} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {type === 'summary' && (
          <>
            {/* ESG SUMMARY SPECIAL TREND CHART */}
            <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between col-span-2">
              <div>
                <h3 className="text-xs font-bold text-neutral-text-dark">Multi-Line E/S/G Score Performance Trend</h3>
                <p className="text-[11px] text-neutral-text-muted">Comparing Environmental, Social, and Governance ratings splits</p>
              </div>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={esgTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" fontSize={10} stroke="#64748B" tickLine={false} />
                    <YAxis fontSize={10} stroke="#64748B" tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="E" stroke="#10B981" strokeWidth={2.5} name="Environmental Score" activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="S" stroke="#06B6D4" strokeWidth={2.5} name="Social Score" activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="G" stroke="#6366F1" strokeWidth={2.5} name="Governance Score" activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* WEIGHT DISCLOSURE CAPTION */}
              <div className="border-t border-neutral-border/50 pt-3.5 mt-3 text-center">
                <span className="text-[10px] text-neutral-text-muted uppercase tracking-wider font-semibold">
                  Weights Disclosure: E {weights.e}% · S {weights.s}% · G {weights.g}% (configurable in Settings)
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------
          5. DATATABLE ROWS LOG
         --------------------------------- */}
      <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3.5 mb-4">
          Detailed Records Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                {tableHeaders.map((h, i) => (
                  <th key={i} className={`p-3 font-semibold ${h === 'Quantity' || h === 'Total CO₂e' || h === 'Total Index' ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border">
              {displayRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-bg/30 transition-colors">
                  {renderRowCells(row)}
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-8 text-center text-neutral-text-muted">
                    No matching ledger items found for the active query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
