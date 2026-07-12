import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Building, LayoutGrid, Network, Plus, Search, Trash2, Edit, ChevronRight, 
  ChevronDown, ArrowRight, User, Users, Briefcase, Calendar, Check, AlertTriangle, 
  Info, TrendingUp, Sparkles, Filter, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui-kit/Toast';
import FormDrawer from '../components/ui-kit/FormDrawer';
import ConfirmDialog from '../components/ui-kit/ConfirmDialog';
import StatusBadge from '../components/ui-kit/StatusBadge';
import { gamificationService } from '../services/gamificationService';
import { environmentalService } from '../services/environmentalService';
import { mockDepartments } from '../mocks/db';
import { mockDepartmentScores } from '../mocks/db';

interface Department {
  id: string;
  name: string;
  code: string;
  head: string;
  parentDepartmentId: string | null;
  status: 'Active' | 'Inactive';
}

export default function Departments() {
  const { role } = useApp();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tree state (expanded nodes)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'dept-1': true // Expand parent by default
  });

  // Selected department for detail drawer
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form Drawer states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  
  // Form values
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formHead, setFormHead] = useState('');
  const [formParentId, setFormParentId] = useState<string>('none');
  const [formStatus, setFormStatus] = useState<boolean>(true);

  // Auto-complete head state
  const [headSearch, setHeadSearch] = useState('');
  const [showHeadSuggestions, setShowHeadSuggestions] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [isDeleteBlocked, setIsDeleteBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  // Initial Load
  useEffect(() => {
    // Load departments
    const stored = localStorage.getItem('ecosphere_departments');
    if (stored) {
      setDepartments(JSON.parse(stored));
    } else {
      const initial = mockDepartments.map(d => ({
        ...d,
        status: 'Active' as const
      }));
      localStorage.setItem('ecosphere_departments', JSON.stringify(initial));
      setDepartments(initial);
    }

    // Load employees
    setEmployees(gamificationService.getEmployees());

    // Load carbon transactions
    environmentalService.getCarbonTransactions().then(txs => {
      setTransactions(txs);
    });
  }, []);

  // Sync details from query parameters (?name= or ?id=)
  useEffect(() => {
    if (departments.length > 0) {
      const nameParam = searchParams.get('name');
      const idParam = searchParams.get('id');
      if (nameParam) {
        const found = departments.find(d => d.name.toLowerCase() === nameParam.toLowerCase());
        if (found) {
          setSelectedDept(found);
          setIsDetailOpen(true);
          // Clear query param so it doesn't lock open on reload
          setSearchParams({});
        }
      } else if (idParam) {
        const found = departments.find(d => d.id === idParam);
        if (found) {
          setSelectedDept(found);
          setIsDetailOpen(true);
          setSearchParams({});
        }
      }
    }
  }, [departments, searchParams]);

  const saveDepartmentsToStorage = (updated: Department[]) => {
    localStorage.setItem('ecosphere_departments', JSON.stringify(updated));
    setDepartments(updated);
  };

  // Autocomplete suggestions
  const headSuggestions = useMemo(() => {
    if (!headSearch) return [];
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(headSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(headSearch.toLowerCase())
    );
  }, [headSearch, employees]);

  // Form validation errors
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    
    // Check Code uniqueness
    if (formCode) {
      const isDuplicate = departments.some(d => 
        d.code.toUpperCase() === formCode.toUpperCase() && d.id !== editingDeptId
      );
      if (isDuplicate) {
        errs.code = 'Department code must be unique';
      }
    }

    // Check hierarchy cycle
    if (formParentId !== 'none' && editingDeptId) {
      // Find all descendants of the current editing department
      const descendants = new Set<string>();
      const getDescendants = (id: string) => {
        departments.forEach(d => {
          if (d.parentDepartmentId === id) {
            descendants.add(d.id);
            getDescendants(d.id);
          }
        });
      };
      getDescendants(editingDeptId);

      if (formParentId === editingDeptId || descendants.has(formParentId)) {
        errs.parent = 'Cannot create a hierarchy cycle (department cannot depend on itself or its descendants)';
      }
    }

    return errs;
  }, [formCode, formParentId, editingDeptId, departments]);

  // Dynamic values per department (employees count, latest scores, transactions)
  const departmentMetrics = useMemo(() => {
    return departments.reduce((acc, dept) => {
      const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
      const deptTxs = transactions.filter(tx => tx.department.toLowerCase() === dept.name.toLowerCase());
      
      // Get score
      const scoreObj = mockDepartmentScores.find(s => s.departmentId === dept.id && s.quarter === '2026-Q2') ||
                       mockDepartmentScores.find(s => s.departmentId === dept.id) || 
                       { environmental: 75, social: 75, governance: 75, total: 75.0 };

      acc[dept.id] = {
        employeeCount: deptEmployees.length,
        employees: deptEmployees,
        transactionCount: deptTxs.length,
        transactions: deptTxs,
        scores: scoreObj
      };
      return acc;
    }, {} as Record<string, { employeeCount: number; employees: any[]; transactionCount: number; transactions: any[]; scores: any }>);
  }, [departments, employees, transactions]);

  // Root and nested children for Tree view
  const rootDepartments = useMemo(() => {
    return departments.filter(d => !d.parentDepartmentId);
  }, [departments]);

  const getChildren = (parentId: string) => {
    return departments.filter(d => d.parentDepartmentId === parentId);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Form Drawer Actions
  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingDeptId(null);
    setFormName('');
    setFormCode('');
    setFormHead('');
    setHeadSearch('');
    setFormParentId('none');
    setFormStatus(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept: Department, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormMode('edit');
    setEditingDeptId(dept.id);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormHead(dept.head);
    setHeadSearch(dept.head);
    setFormParentId(dept.parentDepartmentId || 'none');
    setFormStatus(dept.status === 'Active');
    setIsFormOpen(true);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode || !formHead) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    if (Object.keys(errors).length > 0) {
      addToast('Please fix validation errors first', 'warning');
      return;
    }

    const parentId = formParentId === 'none' ? null : formParentId;

    if (formMode === 'create') {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name: formName,
        code: formCode.toUpperCase(),
        head: formHead,
        parentDepartmentId: parentId,
        status: formStatus ? 'Active' : 'Inactive'
      };
      saveDepartmentsToStorage([newDept, ...departments]);
      addToast('Department created successfully', 'success');
    } else {
      const updated = departments.map(d => {
        if (d.id === editingDeptId) {
          return {
            ...d,
            name: formName,
            code: formCode.toUpperCase(),
            head: formHead,
            parentDepartmentId: parentId,
            status: (formStatus ? 'Active' : 'Inactive') as 'Active' | 'Inactive'
          };
        }
        return d;
      });
      saveDepartmentsToStorage(updated);
      addToast('Department updated successfully', 'success');
    }

    setIsFormOpen(false);
  };

  // Delete Action with Guards
  const handleDeleteAttempt = (dept: Department, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeptToDelete(dept);
    
    const metrics = departmentMetrics[dept.id];
    const empCount = metrics?.employeeCount || 0;
    const txCount = metrics?.transactionCount || 0;

    if (empCount > 0 || txCount > 0) {
      setIsDeleteBlocked(true);
      let msg = '';
      if (empCount > 0 && txCount > 0) {
        msg = `Cannot delete — ${empCount} employees assigned and ${txCount} carbon transactions logged. Deactivate instead.`;
      } else if (empCount > 0) {
        msg = `Cannot delete — ${empCount} employees assigned. Deactivate instead.`;
      } else {
        msg = `Cannot delete — ${txCount} carbon transactions logged. Deactivate instead.`;
      }
      setBlockedMessage(msg);
    } else {
      setIsDeleteBlocked(false);
      setBlockedMessage('');
    }
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deptToDelete) return;
    const updated = departments.filter(d => d.id !== deptToDelete.id);
    saveDepartmentsToStorage(updated);
    addToast('Department deleted successfully', 'success');
    setIsDeleteDialogOpen(false);
    setDeptToDelete(null);
  };

  const handleDeactivateInstead = () => {
    if (!deptToDelete) return;
    const updated = departments.map(d => {
      if (d.id === deptToDelete.id) {
        return { ...d, status: 'Inactive' as const };
      }
      return d;
    });
    saveDepartmentsToStorage(updated);
    addToast('Department deactivated successfully', 'success');
    setIsDeleteDialogOpen(false);
    setDeptToDelete(null);
  };

  // Row click Detail Drawer
  const handleRowClick = (dept: Department) => {
    setSelectedDept(dept);
    setIsDetailOpen(true);
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.head.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  return (
    <div className="space-y-6" id="departments-page">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            Departments Registry
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Configure administrative hierarchies, assign heads, and track corporate ESG score splits.
          </p>
        </div>
        {role === 'Admin' && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0 self-start sm:self-center"
            id="btn-new-dept"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Toggle View + Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-neutral-border p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-neutral-text-muted" />
          </span>
          <input
            type="text"
            placeholder="Search code, name, head..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-neutral-border rounded-xl bg-neutral-bg/30 font-semibold focus:outline-none focus:ring-1 focus:ring-primary-teal"
          />
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 bg-neutral-bg p-1 rounded-xl shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              viewMode === 'table'
                ? 'bg-white text-primary-teal shadow-xs'
                : 'text-neutral-text-muted hover:text-neutral-text-dark'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Table View
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              viewMode === 'tree'
                ? 'bg-white text-primary-teal shadow-xs'
                : 'text-neutral-text-muted hover:text-neutral-text-dark'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            Tree View
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-bg/60 border-b border-neutral-border text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-4">Department Name</th>
                  <th className="py-3.5 px-4">Department Head</th>
                  <th className="py-3.5 px-4">Parent Dept</th>
                  <th className="py-3.5 px-4 text-center">Staff Count</th>
                  <th className="py-3.5 px-4 text-center">Latest ESG Split</th>
                  <th className="py-3.5 px-4">Status</th>
                  {role === 'Admin' && <th className="py-3.5 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border text-xs">
                {filteredDepartments.map(dept => {
                  const m = departmentMetrics[dept.id] || { employeeCount: 0, scores: { environmental: 75, social: 75, governance: 75, total: 75.0 } };
                  const parentDept = departments.find(d => d.id === dept.parentDepartmentId);
                  
                  return (
                    <tr 
                      key={dept.id} 
                      onClick={() => handleRowClick(dept)}
                      className="hover:bg-neutral-bg/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-6 font-mono font-black text-neutral-text-muted">
                        {dept.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-neutral-text-dark text-sm">
                        {dept.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-teal/10 text-primary-teal flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary-teal/20">
                            {dept.head.charAt(0)}
                          </div>
                          <span className="font-semibold text-neutral-text-dark">{dept.head}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {parentDept ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-text-muted font-bold">
                            <Building className="h-3 w-3" />
                            {parentDept.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-text-muted/60 font-black tracking-wider uppercase">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-neutral-text-dark">
                        {m.employeeCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black">
                          <span className="bg-pillar-e/10 text-pillar-e border border-pillar-e/20 px-1.5 py-0.5 rounded-md" title="Environmental">E: {m.scores.environmental}</span>
                          <span className="bg-pillar-s/10 text-pillar-s border border-pillar-s/20 px-1.5 py-0.5 rounded-md" title="Social">S: {m.scores.social}</span>
                          <span className="bg-pillar-g/10 text-pillar-g border border-pillar-g/20 px-1.5 py-0.5 rounded-md" title="Governance">G: {m.scores.governance}</span>
                          <span className="bg-primary-teal text-white px-1.5 py-0.5 rounded-md ml-1" title="Total score">★ {m.scores.total}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge 
                          status={
                            dept.status === 'Active' 
                              ? { code: 'active', label: 'Active', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
                              : { code: 'inactive', label: 'Inactive', color: 'bg-neutral-bg text-neutral-text-muted border-neutral-border' }
                          } 
                        />
                      </td>
                      {role === 'Admin' && (
                        <td className="py-3.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={e => handleOpenEdit(dept, e)}
                              className="p-1.5 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-lg transition"
                              title="Edit Department"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={e => handleDeleteAttempt(dept, e)}
                              className="p-1.5 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded-lg transition"
                              title="Delete Department"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TREE view indented hierarchy */
        <div className="bg-white border border-neutral-border p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-border pb-3 mb-2">
            <Network className="h-5 w-5 text-primary-teal" />
            <h3 className="text-sm font-bold text-neutral-text-dark">Organizational Reporting Hierarchy</h3>
          </div>
          
          <div className="space-y-2">
            {rootDepartments.map(rootDept => (
              <TreeNode 
                key={rootDept.id}
                dept={rootDept}
                getChildren={getChildren}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                departmentMetrics={departmentMetrics}
                handleRowClick={handleRowClick}
                handleOpenEdit={handleOpenEdit}
                handleDeleteAttempt={handleDeleteAttempt}
                isAdmin={role === 'Admin'}
              />
            ))}
          </div>
        </div>
      )}

      {/* CREATE/EDIT FormDrawer */}
      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formMode === 'create' ? 'Create Department' : 'Edit Department'}
        subtitle={formMode === 'create' ? 'Establish a new administrative corporate business unit' : `Modify unit details for ${formName}`}
      >
        <form onSubmit={handleSaveDepartment} className="space-y-5 p-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Quality Assurance"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Unique Code</label>
            <input
              type="text"
              required
              placeholder="e.g. QA"
              value={formCode}
              onChange={e => setFormCode(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono uppercase font-black text-neutral-text-dark"
            />
            {errors.code && (
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {errors.code}
              </span>
            )}
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department Head</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Search staff members..."
                value={headSearch}
                onChange={e => {
                  setHeadSearch(e.target.value);
                  setFormHead(e.target.value);
                  setShowHeadSuggestions(true);
                }}
                onFocus={() => setShowHeadSuggestions(true)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
              />
              {showHeadSuggestions && headSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-border rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-neutral-border">
                  {headSuggestions.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setFormHead(emp.name);
                        setHeadSearch(emp.name);
                        setShowHeadSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-neutral-bg flex items-center justify-between text-neutral-text-dark"
                    >
                      <span>{emp.name}</span>
                      <span className="text-[10px] text-neutral-text-muted">{emp.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Parent Department</label>
            <select
              value={formParentId}
              onChange={e => setFormParentId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              <option value="none">No Parent (Top Level)</option>
              {departments
                .filter(d => d.id !== editingDeptId)
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
            </select>
            {errors.parent && (
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {errors.parent}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-neutral-bg/40 p-4 rounded-xl border border-neutral-border/60">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-neutral-text-dark">Active Status</h4>
              <p className="text-[10px] text-neutral-text-muted">Allow logins and logging resource emissions</p>
            </div>
            <button
              type="button"
              onClick={() => setFormStatus(!formStatus)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formStatus ? 'bg-primary-teal' : 'bg-neutral-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formStatus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition"
            >
              Save Department
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* CONFIRM DELETE DIALOG (Custom blockage error warning) */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title={isDeleteBlocked ? "Deletion Blocked" : "Confirm Deletion"}
        description={
          isDeleteBlocked 
            ? blockedMessage 
            : `Are you absolutely sure you want to delete the department ${deptToDelete?.name}? This action cannot be undone.`
        }
        confirmLabel={isDeleteBlocked ? "Deactivate Instead" : "Delete"}
        isDestructive={!isDeleteBlocked}
        onConfirm={isDeleteBlocked ? handleDeactivateInstead : handleConfirmDelete}
      />

      {/* DETAIL DRAWER */}
      <FormDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDept?.name || 'Department Details'}
        subtitle={`System records audit overview for department ${selectedDept?.code}`}
      >
        {selectedDept && (
          <div className="space-y-6 p-5">
            {/* Header statistics summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">Staff Count</span>
                <p className="text-lg font-black text-neutral-text-dark mt-1 font-mono">
                  {departmentMetrics[selectedDept.id]?.employeeCount || 0}
                </p>
              </div>
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">Total Score</span>
                <p className="text-lg font-black text-primary-teal mt-1 font-mono">
                  ★ {departmentMetrics[selectedDept.id]?.scores.total || 75.0}
                </p>
              </div>
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">Ledger Logs</span>
                <p className="text-lg font-black text-neutral-text-dark mt-1 font-mono">
                  {departmentMetrics[selectedDept.id]?.transactionCount || 0}
                </p>
              </div>
            </div>

            {/* Score splits trend card */}
            <div className="bg-neutral-bg/40 border border-neutral-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-neutral-text-dark">Score Trends (E/S/G)</span>
                <TrendingUp className="h-4 w-4 text-primary-teal" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-2 border-t border-neutral-border/60 pt-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-text-muted">Environmental</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pillar-e" />
                    <span className="text-xs font-black font-mono text-neutral-text-dark">{departmentMetrics[selectedDept.id]?.scores.environmental}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-text-muted">Social</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pillar-s" />
                    <span className="text-xs font-black font-mono text-neutral-text-dark">{departmentMetrics[selectedDept.id]?.scores.social}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-text-muted">Governance</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pillar-g" />
                    <span className="text-xs font-black font-mono text-neutral-text-dark">{departmentMetrics[selectedDept.id]?.scores.governance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee assigned List */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-dark">Assigned Team Members</span>
              <div className="border border-neutral-border rounded-xl divide-y divide-neutral-border bg-white max-h-48 overflow-y-auto">
                {departmentMetrics[selectedDept.id]?.employees.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-text-muted">No employees allocated to this department.</div>
                ) : (
                  departmentMetrics[selectedDept.id]?.employees.map(emp => (
                    <div key={emp.id} className="p-2.5 flex items-center justify-between hover:bg-neutral-bg/30">
                      <div className="flex items-center gap-2">
                        <img src={emp.avatar} alt={emp.name} className="w-7 h-7 rounded-full border border-neutral-border" />
                        <div>
                          <p className="text-xs font-bold text-neutral-text-dark">{emp.name}</p>
                          <p className="text-[9px] text-neutral-text-muted">{emp.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-neutral-bg px-2 py-0.5 rounded-lg border border-neutral-border">
                        {emp.points} XP
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Carbon Transactions list */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-dark">Recent Resource Ledgers</span>
              <div className="border border-neutral-border rounded-xl divide-y divide-neutral-border bg-white max-h-48 overflow-y-auto">
                {departmentMetrics[selectedDept.id]?.transactions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-text-muted">No carbon ledger entries found.</div>
                ) : (
                  departmentMetrics[selectedDept.id]?.transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-neutral-bg/30">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-neutral-text-dark">{tx.factorName}</p>
                        <p className="text-[9px] text-neutral-text-muted">{tx.date} • {tx.quantity} {tx.unit.split('/')[1] || ''}</p>
                      </div>
                      <span className="text-xs font-black text-neutral-text-dark shrink-0">
                        {tx.calculatedCo2e.toLocaleString()} kg CO₂e
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl transition"
              >
                Close Summary
              </button>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}

// Tree view helper component
interface TreeNodeProps {
  dept: Department;
  getChildren: (parentId: string) => Department[];
  expandedNodes: Record<string, boolean>;
  toggleNode: (id: string) => void;
  departmentMetrics: any;
  handleRowClick: (dept: Department) => void;
  handleOpenEdit: (dept: Department, e?: React.MouseEvent) => void;
  handleDeleteAttempt: (dept: Department, e: React.MouseEvent) => void;
  isAdmin: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  dept,
  getChildren,
  expandedNodes,
  toggleNode,
  departmentMetrics,
  handleRowClick,
  handleOpenEdit,
  handleDeleteAttempt,
  isAdmin
}) => {
  const children = getChildren(dept.id);
  const isExpanded = expandedNodes[dept.id] || false;
  const metrics = departmentMetrics[dept.id] || { employeeCount: 0, scores: { total: 75.0 } };

  return (
    <div className="space-y-1.5" id={`tree-node-${dept.id}`}>
      <div 
        onClick={() => handleRowClick(dept)}
        className="group flex items-center justify-between p-3 border border-neutral-border rounded-xl hover:bg-neutral-bg/40 cursor-pointer transition"
      >
        <div className="flex items-center gap-2">
          {children.length > 0 ? (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleNode(dept.id);
              }}
              className="p-1 hover:bg-neutral-bg text-neutral-text-muted rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <Building className="h-4 w-4 text-primary-teal shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-text-dark text-sm">{dept.name}</span>
              <span className="font-mono text-[10px] bg-neutral-bg border border-neutral-border text-neutral-text-muted px-1.5 py-0.2 rounded font-black">{dept.code}</span>
            </div>
            <span className="text-[10px] text-neutral-text-muted mt-0.5">Head: {dept.head}</span>
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <span className="text-[11px] font-bold text-neutral-text-muted bg-neutral-bg px-2 py-0.5 rounded-lg border border-neutral-border font-mono">
            {metrics.employeeCount} Members
          </span>
          <span className="text-xs font-black text-white bg-primary-teal px-2 py-0.5 rounded-lg">
            ★ {metrics.scores.total}
          </span>
          
          {isAdmin && (
            <div className="flex items-center gap-1 border-l border-neutral-border pl-3 ml-1">
              <button
                onClick={() => handleOpenEdit(dept)}
                className="p-1 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-md transition"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={e => handleDeleteAttempt(dept, e)}
                className="p-1 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded-md transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {children.length > 0 && isExpanded && (
        <div className="pl-6 border-l border-dashed border-neutral-border/60 ml-5 space-y-1.5 pt-1 pb-1">
          {children.map(child => (
            <TreeNode 
              key={child.id}
              dept={child}
              getChildren={getChildren}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              departmentMetrics={departmentMetrics}
              handleRowClick={handleRowClick}
              handleOpenEdit={handleOpenEdit}
              handleDeleteAttempt={handleDeleteAttempt}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
