import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { governanceService, DirectoryEmployee } from '../../services/governanceService';
import { useToast } from '../../components/ui-kit/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Flag,
  User,
  Calendar,
  CheckCircle,
  Clock,
  LayoutGrid,
  List,
  ArrowRight,
  ChevronDown,
  X,
  FileCheck,
  CheckSquare,
  AlertOctagon,
  Trash2,
  FileText
} from 'lucide-react';
import { ComplianceIssue } from '../../types';

export default function ComplianceIssues() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useApp();
  const { addToast } = useToast();

  // Live data from the backend.
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [audits, setAudits] = useState<{ id: string; title: string }[]>([]);

  const reload = useCallback(async () => {
    const [i, e, a] = await Promise.all([
      governanceService.getComplianceIssues().catch(() => [] as ComplianceIssue[]),
      governanceService.getEmployees().catch(() => [] as DirectoryEmployee[]),
      governanceService.getAudits().catch(() => [] as { id: string; title: string }[]),
    ]);
    setIssues(i);
    setEmployees(e);
    setAudits(a);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const forceUpdate = () => { void reload(); };

  // Core view toggle: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedOwnerId, setSelectedOwnerId] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drawers and Modal state
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false);
  const [resolutionModalIssue, setResolutionModalIssue] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Autocomplete Owner State (for form)
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<DirectoryEmployee | null>(null);
  const [isOwnerListOpen, setIsOwnerListOpen] = useState(false);

  // New Issue Form Fields
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newLinkedAuditId, setNewLinkedAuditId] = useState('');

  // Handle pre-linked state from navigation
  useEffect(() => {
    const state = location.state as { preLinkedAuditId?: string } | null;
    if (state?.preLinkedAuditId) {
      setNewLinkedAuditId(state.preLinkedAuditId);
      setIsNewDrawerOpen(true);
      // Clean history state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Calculations for stats
  const openIssuesCount = issues.filter(i => i.status === 'Open' || i.status === 'In Progress').length;
  const overdueIssuesCount = issues.filter(i => {
    const isOverdueState = new Date(i.dueDate) < new Date() && i.status !== 'Resolved' && i.status !== 'Closed';
    return isOverdueState;
  }).length;
  const resolvedThisMonthCount = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length; // Mock calculation
  const avgResolutionDays = 14;

  const severitiesList = [
    { value: 'Critical', color: 'bg-red-500 text-white hover:bg-red-600' },
    { value: 'High', color: 'bg-orange-500 text-white hover:bg-orange-600' },
    { value: 'Medium', color: 'bg-yellow-500 text-black hover:bg-yellow-600' },
    { value: 'Low', color: 'bg-gray-400 text-white hover:bg-gray-500' }
  ];

  const handleSeverityToggle = (sev: string) => {
    setSelectedSeverities(prev =>
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  // Filter compliance issues
  const filteredIssues = issues.map(issue => {
    const owner = employees.find(e => e.id === issue.ownerId);
    const audit = audits.find(a => a.id === (issue as any).linkedAuditId);
    
    // Check overdue dynamically
    const isOverdue = new Date(issue.dueDate) < new Date() && issue.status !== 'Resolved' && issue.status !== 'Closed';

    return {
      ...issue,
      isOverdue,
      ownerName: owner?.name || 'Unassigned',
      ownerAvatar: owner?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      auditTitle: audit?.title || 'None'
    };
  }).filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverities.length === 0 || selectedSeverities.includes(issue.severity);
    const matchesStatus = selectedStatus === 'All' || issue.status === selectedStatus;
    const matchesOwner = selectedOwnerId === 'All' || issue.ownerId === selectedOwnerId;
    
    // Date range filter
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(issue.dueDate) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(issue.dueDate) <= new Date(endDate);
    }

    return matchesSearch && matchesSeverity && matchesStatus && matchesOwner && matchesDate;
  });

  // Kanban Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'Open' | 'In Progress' | 'Resolved' | 'Closed') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const issue = issues.find(i => i.id === id);
    if (!issue || issue.status === targetStatus) return;

    if (targetStatus === 'Resolved') {
      setResolutionModalIssue(issue);
      setResolutionNotes('');
    } else {
      try {
        await governanceService.transitionIssue(id, targetStatus);
        addToast({ title: 'Status Updated', description: `Issue moved to ${targetStatus}.`, type: 'success' });
        await reload();
      } catch (err) {
        addToast({ title: 'Transition Blocked', description: (err as Error).message, type: 'danger' });
      }
    }
  };

  const resolveIssue = async (issue: any, notes: string) => {
    try {
      await governanceService.transitionIssue(issue.id, 'Resolved', notes);
      addToast({ title: 'Issue Resolved', description: `Issue resolved successfully.`, type: 'success' });
      setResolutionModalIssue(null);
      setResolutionNotes('');
      await reload();
    } catch (err) {
      addToast({ title: 'Resolve Failed', description: (err as Error).message, type: 'danger' });
    }
  };

  // Submit Resolution Dialog
  const submitResolution = () => {
    if (!resolutionModalIssue || !resolutionNotes.trim()) {
      addToast({
        title: 'Remarks Needed',
        description: 'Resolution notes are required to resolve a compliance issue.',
        type: 'danger'
      });
      return;
    }
    void resolveIssue(resolutionModalIssue, resolutionNotes);
  };

  // Submit New Issue form
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !selectedOwner || !newDueDate) {
      addToast({ title: 'Form Incomplete', description: 'Please fill in all required fields.', type: 'danger' });
      return;
    }
    try {
      await governanceService.createComplianceIssue({
        title: newTitle,
        description: newDescription,
        severity: newSeverity,
        ownerId: selectedOwner.id,
        dueDate: newDueDate,
        linkedAuditId: newLinkedAuditId || undefined,
      });
      addToast({ title: 'Issue Created', description: `Compliance issue was successfully raised.`, type: 'success' });
      setNewTitle('');
      setNewDescription('');
      setNewSeverity('Medium');
      setSelectedOwner(null);
      setOwnerSearch('');
      setNewDueDate('');
      setNewLinkedAuditId('');
      setIsNewDrawerOpen(false);
      await reload();
    } catch (err) {
      addToast({ title: 'Could not raise issue', description: (err as Error).message, type: 'danger' });
    }
  };

  // Compliance issues are audit records — the backend has no hard delete.
  const handleDeleteIssue = (_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addToast({
      title: 'Not Supported',
      description: 'Compliance issues are permanent audit records; close them instead of deleting.',
      type: 'warning'
    });
  };

  // Autocomplete suggestions
  const suggestedEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(ownerSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in" id="compliance-issues-page">
      {/* Header section with Raise CTA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight">Compliance Issues</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Audit, triage, and track organizational compliance, ethics disputes, and environmental risks.
          </p>
        </div>

        <button
          onClick={() => setIsNewDrawerOpen(true)}
          className="bg-primary-teal hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" /> Raise Compliance Issue
        </button>
      </div>

      {/* STAT STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="compliance-stat-strip">
        <div className="bg-white rounded-xl border border-neutral-border p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Open Issues</span>
          <div className="text-2xl font-bold text-neutral-text-dark mt-1">{openIssuesCount}</div>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-xs border-l-4 border-l-red-500">
          <span className="text-[10px] uppercase font-bold text-red-600">OVERDUE</span>
          <div className="text-2xl font-bold text-red-600 mt-1">{overdueIssuesCount}</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-border p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Resolved This Month</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">+{resolvedThisMonthCount}</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-border p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Avg Resolution Time</span>
          <div className="text-2xl font-bold text-neutral-text-dark mt-1">{avgResolutionDays} Days</div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-xl border border-neutral-border shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text Search */}
          <div className="relative">
            <span className="text-[10px] font-bold text-neutral-text-muted block mb-1">Search Keywords</span>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
              <input
                type="text"
                placeholder="Search description/ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-neutral-border rounded-lg text-xs bg-white focus:outline-none focus:border-primary-teal"
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <span className="text-[10px] font-bold text-neutral-text-muted block mb-1">Triage Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-neutral-border text-xs rounded-lg p-2 bg-white font-medium text-neutral-text-dark focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Owner filter */}
          <div>
            <span className="text-[10px] font-bold text-neutral-text-muted block mb-1">Responsible Owner</span>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full border border-neutral-border text-xs rounded-lg p-2 bg-white font-medium text-neutral-text-dark focus:outline-none"
            >
              <option value="All">All Owners</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <span className="text-[10px] font-bold text-neutral-text-muted block mb-1">Due Date Range</span>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-neutral-border text-[11px] rounded-lg p-1.5 bg-white focus:outline-none font-medium"
              />
              <span className="text-neutral-text-muted text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-neutral-border text-[11px] rounded-lg p-1.5 bg-white focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Severity multi-select chips */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-neutral-bg">
          <span className="text-[10px] font-bold text-neutral-text-muted uppercase shrink-0">Filter Severity:</span>
          <div className="flex flex-wrap gap-1.5">
            {severitiesList.map(sev => {
              const active = selectedSeverities.includes(sev.value);
              return (
                <button
                  key={sev.value}
                  onClick={() => handleSeverityToggle(sev.value)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                    active
                      ? `${sev.color} shadow-xs`
                      : 'bg-white text-neutral-text-muted border-neutral-border hover:bg-neutral-bg'
                  }`}
                >
                  {sev.value}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW TOGGLE */}
      <div className="flex justify-end gap-1.5">
        <button
          onClick={() => setViewMode('table')}
          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            viewMode === 'table'
              ? 'bg-neutral-text-dark text-white border-neutral-text-dark'
              : 'bg-white text-neutral-text-muted border-neutral-border hover:bg-neutral-bg'
          }`}
          title="Switch to list view"
        >
          <List className="h-4 w-4" /> Table View
        </button>

        <button
          onClick={() => setViewMode('kanban')}
          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            viewMode === 'kanban'
              ? 'bg-neutral-text-dark text-white border-neutral-text-dark'
              : 'bg-white text-neutral-text-muted border-neutral-border hover:bg-neutral-bg'
          }`}
          title="Switch to Kanban board view"
        >
          <LayoutGrid className="h-4 w-4" /> Kanban Board
        </button>
      </div>

      {/* MAIN VIEW CONTENTS */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-neutral-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="compliance-issues-table">
              <thead>
                <tr className="bg-neutral-bg text-neutral-text-dark border-b border-neutral-border text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Issue ID</th>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6 text-center">Severity</th>
                  <th className="py-4 px-6">Assigned Owner</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Linked Audit</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-bg text-xs">
                {filteredIssues.map((issue) => {
                  const overdue = issue.isOverdue;

                  return (
                    <tr
                      key={issue.id}
                      className={`hover:bg-neutral-bg/20 transition-colors ${
                        overdue ? 'border-l-4 border-l-red-500 bg-red-50/5' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="py-4 px-6 font-mono font-bold text-neutral-text-muted">
                        {issue.id}
                      </td>

                      {/* Title & Desc */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-neutral-text-dark text-sm">{issue.title}</div>
                        <p className="text-[10px] text-neutral-text-muted mt-0.5 line-clamp-1 max-w-sm">
                          {issue.description}
                        </p>
                      </td>

                      {/* Severity chip */}
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                          issue.severity === 'Critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : issue.severity === 'High'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : issue.severity === 'Medium'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {issue.severity}
                        </span>
                      </td>

                      {/* Owner avatar & name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <img
                            src={issue.ownerAvatar}
                            alt={issue.ownerName}
                            referrerPolicy="no-referrer"
                            className="w-6.5 h-6.5 rounded-full object-cover border border-neutral-border shrink-0"
                          />
                          <span className="font-semibold text-neutral-text-dark">{issue.ownerName}</span>
                        </div>
                      </td>

                      {/* Due date with red flag if overdue */}
                      <td className="py-4 px-6">
                        {overdue ? (
                          <span className="text-red-600 font-bold flex items-center gap-1.5 animate-pulse">
                            <Flag className="h-3.5 w-3.5 fill-red-600" /> {issue.dueDate}
                          </span>
                        ) : (
                          <span className="text-neutral-text-muted font-medium">{issue.dueDate}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          issue.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : issue.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : issue.status === 'Closed'
                            ? 'bg-gray-100 text-gray-700 border-gray-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {issue.status}
                        </span>
                      </td>

                      {/* Linked Audit */}
                      <td className="py-4 px-6 font-semibold text-neutral-text-muted">
                        {issue.linkedAuditId ? (
                          <span className="text-primary-teal font-mono text-[11px]">{issue.linkedAuditId}</span>
                        ) : (
                          <span className="text-neutral-text-muted">--</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={(e) => handleDeleteIssue(issue.id, e)}
                          className="text-neutral-text-muted hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete issue"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW WITH DRAG & DROP */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="compliance-kanban-board">
          {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map(colStatus => {
            const colIssues = filteredIssues.filter(i => i.status === colStatus);

            return (
              <div
                key={colStatus}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, colStatus)}
                className="bg-neutral-bg/30 border border-neutral-border rounded-xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-border mb-4">
                  <span className="text-xs font-bold text-neutral-text-dark flex items-center gap-1.5">
                    {colStatus === 'Open' && <AlertTriangle className="h-4.5 w-4.5 text-red-500" />}
                    {colStatus === 'In Progress' && <Clock className="h-4.5 w-4.5 text-amber-500 animate-spin-slow" />}
                    {colStatus === 'Resolved' && <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />}
                    {colStatus === 'Closed' && <CheckSquare className="h-4.5 w-4.5 text-gray-500" />}
                    <span>{colStatus}</span>
                  </span>
                  <span className="bg-white text-neutral-text-muted font-bold text-[10px] px-2 py-0.5 rounded-full border border-neutral-border">
                    {colIssues.length}
                  </span>
                </div>

                {/* Card stack */}
                <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                  {colIssues.map(issue => {
                    const overdue = issue.isOverdue;

                    return (
                      <div
                        key={issue.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, issue.id)}
                        className={`bg-white rounded-xl border border-neutral-border p-4 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3 relative ${
                          overdue ? 'border-l-4 border-l-red-500' : ''
                        }`}
                        id={`kanban-card-${issue.id}`}
                      >
                        {/* Title and ID */}
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-mono font-bold text-[10px] text-neutral-text-muted">{issue.id}</span>
                            
                            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              issue.severity === 'Critical'
                                ? 'bg-red-50 text-red-700'
                                : issue.severity === 'High'
                                ? 'bg-orange-50 text-orange-700'
                                : issue.severity === 'Medium'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-neutral-text-dark tracking-tight mt-1 leading-snug">
                            {issue.title}
                          </h4>
                        </div>

                        {/* Assignee & Due Date */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-bg text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={issue.ownerAvatar}
                              alt={issue.ownerName}
                              referrerPolicy="no-referrer"
                              className="w-5.5 h-5.5 rounded-full object-cover border border-neutral-border"
                            />
                            <span className="text-neutral-text-dark font-semibold">{issue.ownerName.split(' ')[0]}</span>
                          </div>

                          {overdue ? (
                            <span className="text-red-600 font-bold flex items-center gap-0.5 animate-pulse">
                              <Flag className="h-3 w-3 fill-red-600" /> Overdue
                            </span>
                          ) : (
                            <span className="text-neutral-text-muted font-medium">{issue.dueDate.substring(5)}</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={(e) => handleDeleteIssue(issue.id, e)}
                            className="text-neutral-text-muted hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colIssues.length === 0 && (
                    <div className="text-center text-neutral-text-muted text-[10px] py-12 border border-dashed border-neutral-border rounded-xl">
                      Drag cards here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESOLUTION REQUIRED NOTES DIALOG */}
      <AnimatePresence>
        {resolutionModalIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-border shadow-2xl max-w-md w-full p-6 space-y-4"
              id="resolution-dialog"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
                <h3 className="font-bold text-base text-neutral-text-dark">Resolution Notes Required</h3>
              </div>
              
              <p className="text-xs text-neutral-text-muted leading-relaxed">
                Please document the correction and mitigation notes taken to resolve issue <span className="font-bold">{resolutionModalIssue.id}</span> before officially certifying.
              </p>

              <textarea
                required
                placeholder="Enter what steps were executed (e.g. 'Re-logged natural gas combustion invoice; audited California electricity grids.')"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal"
              />

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolutionModalIssue(null)}
                  className="flex-1 py-2 border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark text-xs font-bold bg-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => submitResolution()}
                  disabled={!resolutionNotes.trim()}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted disabled:border-neutral-border text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Submit Resolution
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW ISSUE CREATION DRAWER */}
      <AnimatePresence>
        {isNewDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col justify-between"
              id="new-compliance-drawer"
            >
              {/* Header */}
              <div className="p-6 border-b border-neutral-border bg-neutral-bg/20 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-neutral-text-dark font-sans tracking-tight">Raise Compliance Issue</h2>
                  <p className="text-xs text-neutral-text-muted mt-1">Log regulatory breaches or audit findings.</p>
                </div>
                <button
                  onClick={() => setIsNewDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark border shadow-xs transition-colors bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateIssue} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Issue Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Enter short descriptive title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Detailed Description <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    placeholder="Provide full audit details, breach evidence, or ethics dispute outlines..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal"
                  />
                </div>

                {/* Severity Selection Chips */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Issue Severity <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => {
                      const isChosen = newSeverity === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setNewSeverity(sev)}
                          className={`flex-1 text-xs py-2 font-bold rounded-lg border transition-all ${
                            isChosen
                              ? sev === 'Critical'
                                ? 'bg-red-500 text-white border-red-500'
                                : sev === 'High'
                                ? 'bg-orange-500 text-white border-orange-500'
                                : sev === 'Medium'
                                ? 'bg-yellow-500 text-black border-yellow-500'
                                : 'bg-gray-500 text-white border-gray-500'
                              : 'bg-white text-neutral-text-muted border-neutral-border hover:bg-neutral-bg'
                          }`}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* OWNER AUTOCOMPLETE */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Responsible Owner <span className="text-red-500">*</span></label>
                  
                  {selectedOwner ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={selectedOwner.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-neutral-text-dark">{selectedOwner.name}</div>
                          <div className="text-[10px] text-neutral-text-muted">{selectedOwner.role}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOwner(null);
                          setOwnerSearch('');
                        }}
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type name to autocomplete owner..."
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value);
                          setIsOwnerListOpen(true);
                        }}
                        onFocus={() => setIsOwnerListOpen(true)}
                        className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal"
                      />
                      
                      {isOwnerListOpen && ownerSearch && (
                        <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-neutral-border rounded-lg shadow-lg z-20 divide-y divide-neutral-bg">
                          {suggestedEmployees.map(emp => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setSelectedOwner(emp);
                                setIsOwnerListOpen(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-neutral-bg text-xs flex items-center gap-2"
                            >
                              <img src={emp.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                              <div>
                                <div className="font-semibold text-neutral-text-dark">{emp.name}</div>
                                <div className="text-[10px] text-neutral-text-muted">{emp.role}</div>
                              </div>
                            </button>
                          ))}
                          {suggestedEmployees.length === 0 && (
                            <div className="p-3 text-center text-xs text-neutral-text-muted">No coworkers found</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Due date with minimum today */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Official Due Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    min="2026-07-11" // locked to today per instructions
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal font-medium"
                  />
                </div>

                {/* Linked Audit select */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Linked Source Audit</label>
                  <select
                    value={newLinkedAuditId}
                    onChange={(e) => setNewLinkedAuditId(e.target.value)}
                    className="w-full border border-neutral-border text-xs rounded-lg p-3 bg-white font-medium text-neutral-text-dark focus:outline-none"
                  >
                    <option value="">-- No Audit Link --</option>
                    {audits.map(aud => (
                      <option key={aud.id} value={aud.id}>{aud.id} · {aud.title}</option>
                    ))}
                  </select>
                </div>
              </form>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-neutral-border bg-neutral-bg/30 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark text-xs font-bold bg-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateIssue}
                  disabled={!newTitle.trim() || !newDescription.trim() || !selectedOwner || !newDueDate}
                  className="flex-1 py-2.5 bg-primary-teal hover:bg-teal-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted disabled:border-neutral-border text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Raise Issue
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
