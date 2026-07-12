import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui-kit/Toast';
import FormDrawer from '../components/ui-kit/FormDrawer';
import ConfirmDialog from '../components/ui-kit/ConfirmDialog';
import StatusBadge from '../components/ui-kit/StatusBadge';
import { gamificationService } from '../services/gamificationService';
import { mockDepartments } from '../mocks/db';
import { 
  Users, UserPlus, Mail, Shield, Building, X, Search, Filter, Trash2, 
  Edit, Award, ShieldAlert, Badge as BadgeIcon, Calendar, CheckSquare, 
  Info, Trophy, RefreshCw, Eye, Sparkles, Check, ChevronRight, UserCheck
} from 'lucide-react';
import { Employee, UserRole } from '../types';

export default function Employees() {
  const { role: currentUserRole } = useApp();
  const { addToast } = useToast();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Multi-select roles helper state
  const [showRoleFilterDropdown, setShowRoleFilterDropdown] = useState(false);

  // Invite Drawer state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Employee');
  const [inviteDeptId, setInviteDeptId] = useState('');

  // Edit Drawer state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  // Change Roles Dialog state
  const [isChangeRolesOpen, setIsChangeRolesOpen] = useState(false);
  const [roleEmployee, setRoleEmployee] = useState<Employee | null>(null);
  const [roleSelection, setRoleSelection] = useState<UserRole>('Employee');

  // Read-only Profile Drawer state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [profileXpHistory, setProfileXpHistory] = useState<any[]>([]);
  const [profileBadges, setProfileBadges] = useState<any[]>([]);

  // List of available roles
  const availableRoles: UserRole[] = [
    'Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 
    'Department Head', 'Employee', 'Auditor'
  ];

  // Fetch initial employees
  const loadEmployees = () => {
    setLoading(true);
    try {
      const emps = gamificationService.getEmployees();
      // Ensure everyone has an employee code and joinDate for completeness
      const hydrated = emps.map((e, idx) => ({
        ...e,
        employeeCode: (e as any).employeeCode || `EMP-${String(idx + 1).padStart(3, '0')}`,
        joinDate: (e as any).joinDate || `2025-${String((idx % 12) + 1).padStart(2, '0')}-15`,
        designation: (e as any).designation || (e.role === 'Department Head' ? 'Director' : e.role),
        status: (e as any).status !== undefined ? (e as any).status : ('Active' as const)
      }));
      setEmployees(hydrated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const getDeptName = (deptId: string) => {
    const d = mockDepartments.find(item => item.id === deptId);
    return d ? d.name : 'Corporate';
  };

  // Sync state helpers to update localStorage
  const syncEmployees = (updated: Employee[]) => {
    localStorage.setItem('ecosphere_employees', JSON.stringify(updated));
    setEmployees(updated);
  };

  // Invite action
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      addToast('Email is required', 'warning');
      return;
    }
    if (!inviteDeptId) {
      addToast('Please select a department', 'warning');
      return;
    }

    const deptName = getDeptName(inviteDeptId);
    const origin = window.location.origin;
    const inviteUrl = `${origin}/#/invite?token=demo&email=${encodeURIComponent(inviteEmail)}&role=${encodeURIComponent(inviteRole)}&dept=${encodeURIComponent(deptName)}`;

    navigator.clipboard.writeText(inviteUrl).then(() => {
      addToast('Invitation sent! Activation link copied to clipboard.', 'success');
    }).catch(() => {
      addToast('Invitation sent successfully.', 'success');
    });

    // Create a new invited employee
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: inviteEmail.split('@')[0].replace('.', ' '),
      email: inviteEmail,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Date.now() % 1000000}?w=150`,
      role: inviteRole,
      departmentId: inviteDeptId,
      points: 0,
      level: 1,
      xp: 0,
      employeeCode: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      joinDate: new Date().toISOString().split('T')[0],
      designation: inviteRole,
      status: 'Active' as any
    } as any;

    syncEmployees([newEmp, ...employees]);
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteRole('Employee');
    setInviteDeptId('');
  };

  // Edit employee save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const updated = employees.map(emp => {
      if (emp.id === editingEmployee.id) {
        return {
          ...emp,
          name: editName,
          email: editEmail,
          employeeCode: editCode,
          departmentId: editDeptId,
          designation: editDesignation
        } as any;
      }
      return emp;
    });

    syncEmployees(updated);
    addToast('Employee updated successfully', 'success');
    setIsEditOpen(false);
  };

  // Change Role save
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleEmployee) return;

    const updated = employees.map(emp => {
      if (emp.id === roleEmployee.id) {
        return {
          ...emp,
          role: roleSelection,
          designation: roleSelection === 'Department Head' ? 'Director' : roleSelection
        };
      }
      return emp;
    });

    syncEmployees(updated);
    addToast('Employee role changed successfully', 'success');
    setIsChangeRolesOpen(false);
  };

  // Toggle activation (Deactivate / Activate)
  const handleToggleActivation = (emp: Employee) => {
    const isDeactivating = (emp as any).status !== 'Inactive';

    if (isDeactivating) {
      // Guard: At least one Admin must remain
      const activeAdmins = employees.filter(e => e.role === 'Admin' && (e as any).status !== 'Inactive');
      if (emp.role === 'Admin' && activeAdmins.length <= 1) {
        addToast('At least one Admin must remain active.', 'danger');
        return;
      }
    }

    const updated = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          status: isDeactivating ? 'Inactive' : 'Active'
        } as any;
      }
      return e;
    });

    syncEmployees(updated);
    addToast(
      isDeactivating ? 'Employee profile deactivated' : 'Employee profile activated', 
      'success'
    );
  };

  // Open profile drawer & resolve XP history + badges
  const handleOpenProfile = (emp: Employee) => {
    setProfileEmployee(emp);
    
    // XP history
    const storedLedger = localStorage.getItem('ecosphere_xp_ledger');
    const ledger = storedLedger ? JSON.parse(storedLedger) : [];
    const empLedger = ledger.filter((l: any) => l.employeeId === emp.id);
    setProfileXpHistory(empLedger);

    // Badges awards
    const storedAwards = localStorage.getItem('ecosphere_badge_awards');
    const awards = storedAwards ? JSON.parse(storedAwards) : [];
    const empAwards = awards.filter((a: any) => a.employeeId === emp.id);
    
    // Resolve badges full objects
    const badgesList = gamificationService.getBadges();
    const empBadges = empAwards.map((a: any) => {
      const bg = badgesList.find(b => b.id === a.badgeId);
      return bg ? { ...bg, awardedAt: a.awardedAt } : null;
    }).filter(Boolean);

    setProfileBadges(empBadges);
    setIsProfileOpen(true);
  };

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search search query
      const searchStr = searchQuery.toLowerCase();
      if (searchQuery && !emp.name.toLowerCase().includes(searchStr) && !emp.email.toLowerCase().includes(searchStr) && !((emp as any).employeeCode || '').toLowerCase().includes(searchStr)) {
        return false;
      }

      // Dept selection
      if (selectedDept !== 'All' && emp.departmentId !== selectedDept) return false;

      // Roles selection
      if (selectedRoles.length > 0 && !selectedRoles.includes(emp.role)) return false;

      // Status selection
      const empStatus = (emp as any).status || 'Active';
      if (selectedStatus !== 'All' && empStatus !== selectedStatus) return false;

      return true;
    });
  }, [employees, searchQuery, selectedDept, selectedRoles, selectedStatus]);

  const toggleRoleFilter = (roleName: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleName) 
        ? prev.filter(r => r !== roleName) 
        : [...prev, roleName]
    );
  };

  // Render Access Denied if non-Admin
  if (currentUserRole !== 'Admin') {
    return (
      <div className="bg-white border border-neutral-border rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-neutral-text-dark">Access Denied</h2>
        <p className="text-xs text-neutral-text-muted leading-relaxed">
          The Employees roster and invite system is strictly restricted to workspace administrators. Please swap your role to Admin using the settings or profile portal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="employees-page">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            User Directory
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Manage your enterprise directory workspace, invite users, authorize permissions, and audit XP.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0 self-start sm:self-center"
          id="btn-invite-user"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-border/60 pb-2.5">
          <Filter className="h-4 w-4 text-primary-teal" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-text-dark">Staff Filter Panel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Search Member</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-neutral-text-muted" />
              </span>
              <input
                type="text"
                placeholder="Name, email or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
              />
            </div>
          </div>

          {/* Department dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              <option value="All">All Departments</option>
              {mockDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Role Multi-Select dropdown */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Workspace Roles</label>
            <div>
              <button
                type="button"
                onClick={() => setShowRoleFilterDropdown(!showRoleFilterDropdown)}
                className="w-full text-left text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedRoles.length === 0 ? 'All Roles' : `${selectedRoles.length} Roles Selected`}
                </span>
                <ChevronRight className={`h-4 w-4 text-neutral-text-muted transition-transform ${showRoleFilterDropdown ? 'rotate-90' : ''}`} />
              </button>
              
              {showRoleFilterDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-border rounded-xl shadow-lg z-30 p-2.5 space-y-1.5 max-h-48 overflow-y-auto">
                  {availableRoles.map(rName => (
                    <label key={rName} className="flex items-center gap-2 text-xs font-semibold text-neutral-text-dark hover:bg-neutral-bg p-1.5 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(rName)}
                        onChange={() => toggleRoleFilter(rName)}
                        className="rounded border-neutral-border text-primary-teal focus:ring-primary-teal"
                      />
                      <span>{rName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees DataTable */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-bg/60 border-b border-neutral-border text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                <th className="py-3.5 px-6">Avatar & Name</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Workspace Role</th>
                <th className="py-3.5 px-4 text-right">XP Balance</th>
                <th className="py-3.5 px-4 text-center">Badges</th>
                <th className="py-3.5 px-4">Join Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {filteredEmployees.map(emp => {
                const empStatus = (emp as any).status || 'Active';
                const empCode = (emp as any).employeeCode || 'EMP-000';
                const empJoinDate = (emp as any).joinDate || '2025-01-15';
                
                return (
                  <tr 
                    key={emp.id} 
                    onClick={() => handleOpenProfile(emp)}
                    className="hover:bg-neutral-bg/30 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-6 flex items-center gap-3">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-neutral-border"
                      />
                      <div>
                        <h4 className="font-bold text-neutral-text-dark">{emp.name}</h4>
                        <p className="text-[10px] text-neutral-text-muted mt-0.5">{emp.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-neutral-text-muted">
                      {empCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-text-dark">
                      {getDeptName(emp.departmentId)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                        emp.role === 'Admin'
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : emp.role.includes('Manager')
                          ? 'bg-teal-50 text-teal-700 border border-teal-100'
                          : emp.role === 'Auditor'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-neutral-text-dark tabular-nums">
                      {emp.points.toLocaleString()} <span className="text-[10px] text-neutral-text-muted">XP</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-neutral-text-dark bg-neutral-bg px-2 py-0.5 rounded-full border border-neutral-border">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        {emp.level}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-text-muted">
                      {empJoinDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge 
                        status={
                          empStatus === 'Active'
                            ? { code: 'active', label: 'Active', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
                            : { code: 'inactive', label: 'Inactive', color: 'bg-neutral-bg text-neutral-text-muted border-neutral-border' }
                        }
                      />
                    </td>
                    <td className="py-3.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEditName(emp.name);
                            setEditEmail(emp.email);
                            setEditCode(empCode);
                            setEditDeptId(emp.departmentId);
                            setEditDesignation((emp as any).designation || emp.role);
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-lg transition"
                          title="Edit Info"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setRoleEmployee(emp);
                            setRoleSelection(emp.role);
                            setIsChangeRolesOpen(true);
                          }}
                          className="p-1.5 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-lg transition"
                          title="Change Role"
                        >
                          <Shield className="h-3.5 w-3.5 text-primary-teal" />
                        </button>
                        <button
                          onClick={() => handleToggleActivation(emp)}
                          className={`p-1.5 rounded-lg transition ${
                            empStatus === 'Active'
                              ? 'hover:bg-red-50 text-red-600'
                              : 'hover:bg-emerald-50 text-emerald-600'
                          }`}
                          title={empStatus === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. INVITE USER FormDrawer */}
      <FormDrawer
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite User"
        subtitle="Issue secure enterprise platform credentials via workplace email"
      >
        <form onSubmit={handleSendInvite} className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Candidate Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
              <input
                type="email"
                required
                placeholder="e.g. jessica.alba@ecosphere.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Authority Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as UserRole)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              {availableRoles.map(roleName => (
                <option key={roleName} value={roleName}>{roleName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department Allocation</label>
            <select
              value={inviteDeptId}
              required
              onChange={e => setInviteDeptId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              <option value="">-- Choose Corporate Department --</option>
              {mockDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex gap-3 text-[11px] text-emerald-800 leading-relaxed font-semibold">
            <Info className="h-4.5 w-4.5 text-primary-teal shrink-0 mt-0.5" />
            <div>
              <span>Demo Notice</span>
              <p className="mt-1 font-medium text-neutral-text-muted text-[10px]">
                Upon click, a mock dispatch runs and copies the validation link automatically to your clipboard for quick registration testing.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5"
            >
              Generate Link & Invite
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* 2. EDIT PROFILE FormDrawer */}
      <FormDrawer
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Information"
        subtitle={`Modify roster records for code ${editCode}`}
      >
        <form onSubmit={handleSaveEdit} className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Employee Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Work Email Address</label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Employee Code</label>
            <input
              type="text"
              required
              value={editCode}
              onChange={e => setEditCode(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono font-black uppercase text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department</label>
            <select
              value={editDeptId}
              onChange={e => setEditDeptId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            >
              {mockDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Job Designation</label>
            <input
              type="text"
              required
              value={editDesignation}
              onChange={e => setEditDesignation(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Save Changes
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* 3. CHANGE ROLES Dialog */}
      <FormDrawer
        isOpen={isChangeRolesOpen}
        onClose={() => setIsChangeRolesOpen(false)}
        title="Modify Authorized Roles"
        subtitle={`Swap authority structures for ${roleEmployee?.name}`}
      >
        <form onSubmit={handleSaveRole} className="p-5 space-y-5">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Select New Platform Role</span>
            <div className="space-y-1.5">
              {availableRoles.map(roleName => (
                <label 
                  key={roleName} 
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-neutral-bg/30 transition ${
                    roleSelection === roleName 
                      ? 'border-primary-teal bg-primary-teal/5' 
                      : 'border-neutral-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="role-swap"
                    checked={roleSelection === roleName}
                    onChange={() => setRoleSelection(roleName)}
                    className="text-primary-teal focus:ring-primary-teal h-4 w-4 border-neutral-border"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-text-dark">{roleName}</span>
                    <span className="text-[9px] text-neutral-text-muted">Set workspace status to {roleName} permissions.</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsChangeRolesOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Apply Role Change
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* 4. READ-ONLY PROFILE DRAWER */}
      <FormDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title={profileEmployee?.name || 'Employee Profile'}
        subtitle={`System activity and gamification telemetry audit log`}
      >
        {profileEmployee && (
          <div className="p-5 space-y-6">
            {/* Profile Avatar summary */}
            <div className="flex items-center gap-4 bg-neutral-bg/40 p-4 border border-neutral-border rounded-2xl">
              <img 
                src={profileEmployee.avatar} 
                alt={profileEmployee.name} 
                className="w-14 h-14 rounded-full border border-neutral-border object-cover shrink-0" 
              />
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-black text-neutral-text-dark truncate">{profileEmployee.name}</h3>
                <p className="text-xs text-neutral-text-muted truncate font-medium">{(profileEmployee as any).designation || profileEmployee.role}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[9px] bg-primary-teal/10 text-primary-teal font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-primary-teal/10">
                    {profileEmployee.role}
                  </span>
                  <span className="text-[9px] bg-neutral-bg text-neutral-text-muted font-bold px-2 py-0.5 rounded-md border border-neutral-border">
                    {getDeptName(profileEmployee.departmentId)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats columns */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">Total Score</span>
                <p className="text-lg font-black text-neutral-text-dark mt-1 font-mono">{profileEmployee.points.toLocaleString()} pts</p>
              </div>
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">XP Level</span>
                <p className="text-lg font-black text-primary-teal mt-1 font-mono">Lvl {profileEmployee.level}</p>
              </div>
              <div className="bg-neutral-bg/60 border border-neutral-border p-3 rounded-xl text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">Badges count</span>
                <p className="text-lg font-black text-neutral-text-dark mt-1 font-mono">{profileBadges.length}</p>
              </div>
            </div>

            {/* Medal medallions showcase */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-dark">Earned Badge Medallions</span>
              <div className="flex flex-wrap gap-2.5 p-3.5 border border-neutral-border rounded-xl bg-white min-h-[60px] items-center">
                {profileBadges.length === 0 ? (
                  <span className="text-xs text-neutral-text-muted font-medium py-1">No badges unlocked yet on this path.</span>
                ) : (
                  profileBadges.map((bg, index) => (
                    <div 
                      key={index} 
                      className="group relative flex items-center gap-1.5 bg-neutral-bg border border-neutral-border/80 p-2 rounded-xl"
                      title={bg.description}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] font-black text-neutral-text-dark">{bg.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* XP History ledger mini table */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-dark">Recent Ledger Transactions (XP)</span>
              <div className="border border-neutral-border rounded-xl divide-y divide-neutral-border bg-white max-h-40 overflow-y-auto">
                {profileXpHistory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-text-muted font-medium">No ledger events recorded.</div>
                ) : (
                  profileXpHistory.map((l, index) => (
                    <div key={index} className="p-2.5 flex items-center justify-between hover:bg-neutral-bg/30">
                      <div className="space-y-0.5 max-w-[240px] min-w-0">
                        <p className="text-xs font-bold text-neutral-text-dark truncate">{l.description}</p>
                        <p className="text-[9px] text-neutral-text-muted font-semibold">{l.timestamp.split('T')[0]} • {l.source}</p>
                      </div>
                      <span className={`text-xs font-black font-mono shrink-0 ${
                        l.type === 'EARN' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {l.type === 'EARN' ? '+' : '-'}{l.amount} XP
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
