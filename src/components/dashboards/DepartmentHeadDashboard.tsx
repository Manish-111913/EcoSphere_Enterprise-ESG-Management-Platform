import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, XCircle, Users, Award, ShieldAlert, BarChart2, Check, HelpCircle } from 'lucide-react';
import { useToast } from '../ui-kit/Toast';
import { mockPendingApprovals } from '../../mocks/dashboardData';
import { mockDepartments, mockEmployees, mockDepartmentScores } from '../../mocks/db';

export default function DepartmentHeadDashboard() {
  const { user } = useApp();
  const { addToast } = useToast();

  const deptObj = mockDepartments.find(d => d.head === user?.name) || mockDepartments[0];
  const deptEmployees = mockEmployees.filter(e => e.departmentId === deptObj.id);

  const [approvals, setApprovals] = useState(() => {
    // Filter pending approvals queue for this department's employees
    const cached = localStorage.getItem('ecosphere_pending_approvals');
    const list = cached ? JSON.parse(cached) : mockPendingApprovals;
    // Keep those associated with this department's employees
    return list;
  });

  const departmentApprovals = approvals.filter((app: any) => {
    return app.user?.department === deptObj.name;
  });

  const handleApprovalAction = (id: string, action: 'approved' | 'rejected') => {
    setApprovals((prev: any) => prev.filter((item: any) => item.id !== id));
    // Update local storage
    const cached = localStorage.getItem('ecosphere_pending_approvals');
    const list = cached ? JSON.parse(cached) : mockPendingApprovals;
    const updated = list.filter((item: any) => item.id !== id);
    localStorage.setItem('ecosphere_pending_approvals', JSON.stringify(updated));

    addToast({
      title: `Submission ${action === 'approved' ? 'Approved' : 'Rejected'}`,
      description: `Submission record ${id} has been successfully ${action}.`,
      type: action === 'approved' ? 'success' : 'info'
    });
  };

  // Get department scores
  const deptScores = mockDepartmentScores.filter(s => s.departmentId === deptObj.id);

  return (
    <div className="space-y-6">
      {/* Banner Area */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white p-5 rounded-xl shadow-sm text-left">
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">Department Head Dashboard</span>
        <h3 className="text-lg font-black tracking-tight mt-1">{deptObj.name} (Code: {deptObj.code})</h3>
        <p className="text-xs text-teal-100 mt-1 leading-relaxed">
          Monitoring {deptEmployees.length} active employees. Review department-specific sustainability checklists and approve carbon submissions live.
        </p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Department Employees</span>
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg"><Users size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{deptEmployees.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">staff members</span>
          </div>
          <p className="text-[11px] text-neutral-text-muted mt-1.5">
            Active in active ESG tracks
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Total Pending Items</span>
            <span className="p-1.5 bg-red-50 text-red-700 rounded-lg"><ShieldAlert size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{departmentApprovals.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">submissions</span>
          </div>
          <p className="text-[11px] text-red-600 font-bold mt-1.5">
            Review and sign off required
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Q2 ESG Rating score</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg"><BarChart2 size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">
              {deptScores[deptScores.length - 1]?.total || 85}
            </span>
            <span className="text-xs font-bold text-neutral-text-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1.5">
            Exceeds the baseline target
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Reward Redemptions</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg"><Award size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">12</span>
            <span className="text-xs font-bold text-neutral-text-muted">redeemed</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1.5">
            Eco mugs & Solar chargers
          </p>
        </div>
      </div>

      {/* Main Grid: Pending Approvals + Department Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Approvals Queue */}
        <div className="lg:col-span-7 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4 flex items-center justify-between">
            <span>Pending Approvals Queue ({deptObj.name})</span>
            <span className="text-[10px] bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-bold">Action Needed</span>
          </h3>
          {departmentApprovals.length === 0 ? (
            <div className="text-center py-12 text-neutral-text-muted text-xs">
              🎉 No pending carbon transactions or challenge milestones from your department.
            </div>
          ) : (
            <div className="space-y-4">
              {departmentApprovals.map((app: any) => (
                <div key={app.id} className="border border-neutral-border rounded-xl p-4 text-left bg-neutral-bg/30">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <img src={app.user?.avatar} alt={app.user?.name} className="w-9 h-9 rounded-full border border-neutral-border" />
                      <div>
                        <div className="text-xs font-bold text-neutral-text-dark">{app.user?.name}</div>
                        <div className="text-[10px] text-neutral-text-muted">{app.user?.department}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-text-muted">{app.id}</span>
                  </div>

                  <div className="mt-3 border-t border-neutral-border/50 pt-3">
                    <span className="text-[10px] uppercase font-black text-neutral-text-muted block">Type: {app.type.toUpperCase()}</span>
                    <span className="text-xs font-bold text-neutral-text-dark block mt-0.5">{app.title}</span>
                    <p className="text-[11px] text-neutral-text-muted mt-0.5 leading-snug">{app.subtitle}</p>
                  </div>

                  {app.details?.evidenceUrl && (
                    <div className="mt-3">
                      <img src={app.details.evidenceUrl} alt="Evidence" className="w-full h-32 object-cover rounded-lg border border-neutral-border bg-white" />
                    </div>
                  )}

                  {app.details?.factor && (
                    <div className="mt-2 text-[11px] text-neutral-text-muted font-mono leading-relaxed">
                      Factor: {app.details.factor} <br />
                      Quantity: {app.details.quantity} {app.details.unit}
                    </div>
                  )}

                  <div className="mt-4 border-t border-neutral-border/50 pt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleApprovalAction(app.id, 'rejected')}
                      className="px-3 py-1.5 hover:bg-red-50 text-red-600 font-bold text-[11px] rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprovalAction(app.id, 'approved')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quarterly ESG Score Splits Table */}
        <div className="lg:col-span-5 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            Department ESG score splits
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">Quarter</th>
                  <th className="p-3 font-semibold text-center text-emerald-700">E Score</th>
                  <th className="p-3 font-semibold text-center text-teal-700">S Score</th>
                  <th className="p-3 font-semibold text-center text-indigo-700">G Score</th>
                  <th className="p-3 font-semibold text-right font-bold text-neutral-text-dark">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {deptScores.map((score: any) => (
                  <tr key={score.id} className="hover:bg-neutral-bg transition-colors font-semibold">
                    <td className="p-3 text-neutral-text-dark font-sans">{score.quarter}</td>
                    <td className="p-3 text-center text-emerald-600 font-mono">{score.environmental}</td>
                    <td className="p-3 text-center text-teal-600 font-mono">{score.social}</td>
                    <td className="p-3 text-center text-indigo-600 font-mono">{score.governance}</td>
                    <td className="p-3 text-right font-bold font-mono text-neutral-text-dark">{score.total}</td>
                  </tr>
                ))}
                {deptScores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-neutral-text-muted text-xs">
                      No quarterly scoring loaded for this department yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-neutral-text-muted mt-4 leading-normal">
            * Scores calculated quarterly using weighted parameters. Goal target is set to 80.
          </p>
        </div>
      </div>
    </div>
  );
}
