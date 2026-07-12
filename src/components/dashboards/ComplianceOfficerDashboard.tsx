import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ClipboardCheck, FileCheck, CheckCircle, Search, XCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../ui-kit/Toast';
import { mockComplianceIssues, mockAudits, mockPolicies, mockEmployees } from '../../mocks/db';

export default function ComplianceOfficerDashboard() {
  const { addToast } = useToast();
  
  const [issues, setIssues] = useState(() => {
    const cached = localStorage.getItem('ecosphere_compliance_issues');
    return cached ? JSON.parse(cached) : mockComplianceIssues;
  });

  const overdueIssues = issues.filter((i: any) => i.isOverdue && (i.status === 'Open' || i.status === 'In Progress'));
  const activeIssues = issues.filter((i: any) => i.status === 'Open' || i.status === 'In Progress');
  const completedAudits = mockAudits.filter(a => a.status === 'Completed');
  const scheduledAudits = mockAudits.filter(a => a.status === 'Scheduled' || a.status === 'In Progress');

  const resolveIssue = (id: string) => {
    const updated = issues.map((i: any) =>
      i.id === id ? { ...i, status: 'Resolved', isOverdue: false } : i
    );
    setIssues(updated);
    localStorage.setItem('ecosphere_compliance_issues', JSON.stringify(updated));
    addToast({
      title: 'Issue Resolved',
      description: `Compliance issue ${id} was marked as resolved.`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-6">
      {/* ⚠️ RED OVERDUE ALERT STRIP */}
      {overdueIssues.length > 0 && (
        <div className="bg-red-500 text-white p-4 rounded-xl shadow-md flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-lg shrink-0 text-white"><AlertTriangle size={20} className="animate-pulse" /></span>
            <div className="text-left">
              <span className="text-sm font-black tracking-tight block">CRITICAL: Overdue Compliance Issues Detected</span>
              <p className="text-[11px] text-white/90 leading-tight">
                There are currently <strong>{overdueIssues.length}</strong> compliance issues that have exceeded their target resolution dates. Immediate action required.
              </p>
            </div>
          </div>
          <span className="text-xs bg-white text-red-600 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shrink-0 font-mono">
            Action Due
          </span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Total Open Issues</span>
            <span className="p-1.5 bg-red-50 text-red-700 rounded-lg"><AlertTriangle size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{activeIssues.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">active</span>
          </div>
          <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
             {overdueIssues.length} are currently overdue
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Completed Audits</span>
            <span className="p-1.5 bg-green-50 text-green-700 rounded-lg"><ClipboardCheck size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{completedAudits.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">audits</span>
          </div>
          <p className="text-[11px] text-green-600 font-bold mt-1.5">
             No outstanding audits failed
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Audited Policies</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg"><ShieldCheck size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{mockPolicies.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">regulations</span>
          </div>
          <p className="text-[11px] text-blue-600 font-bold mt-1.5">
            100% compliant in ethics policy
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Scheduled Reviews</span>
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg"><FileCheck size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{scheduledAudits.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">scheduled</span>
          </div>
          <p className="text-[11px] text-purple-600 font-bold mt-1.5">
            Apex Green & Deloitte scheduled
          </p>
        </div>
      </div>

      {/* Main Grid: Issues table + Audits list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Issues Table */}
        <div className="lg:col-span-8 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            Active Compliance Issues Tracker
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-2.5 font-semibold">ID</th>
                  <th className="p-2.5 font-semibold">Issue Title</th>
                  <th className="p-2.5 font-semibold text-center">Severity</th>
                  <th className="p-2.5 font-semibold text-center">Status</th>
                  <th className="p-2.5 font-semibold">Owner</th>
                  <th className="p-2.5 font-semibold">Due Date</th>
                  <th className="p-2.5 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {activeIssues.map((issue: any) => {
                  const owner = mockEmployees.find(e => e.id === issue.ownerId);
                  return (
                    <tr key={issue.id} className="hover:bg-neutral-bg transition-colors">
                      <td className="p-2.5 font-mono font-semibold text-neutral-text-dark">{issue.id.toUpperCase()}</td>
                      <td className="p-2.5 font-medium text-neutral-text-dark">{issue.title}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          issue.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] ${
                          issue.isOverdue ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' :
                          issue.status === 'In Progress' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {issue.isOverdue ? 'Overdue' : issue.status}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={owner?.avatar} alt={owner?.name} className="w-5 h-5 rounded-full" />
                          <span className="font-semibold text-neutral-text-dark">{owner?.name}</span>
                        </div>
                      </td>
                      <td className={`p-2.5 font-mono ${issue.isOverdue ? 'text-red-600 font-bold' : 'text-neutral-text-muted'}`}>
                        {issue.dueDate}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => resolveIssue(issue.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[9px] transition-colors"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audits & Scheduled Events */}
        <div className="lg:col-span-4 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            Audit Plans & Verification events
          </h3>
          <div className="space-y-3.5">
            {mockAudits.map((aud) => (
              <div key={aud.id} className="border border-neutral-border rounded-lg p-3.5 text-left bg-neutral-bg/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-text-muted font-bold">{aud.id}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    aud.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    aud.status === 'In Progress' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    aud.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {aud.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-neutral-text-dark mt-1">{aud.title}</div>
                <p className="text-[11px] text-neutral-text-muted mt-1 leading-snug">{aud.description}</p>
                <div className="mt-2.5 border-t border-neutral-border/50 pt-2 flex items-center justify-between text-[10px] text-neutral-text-muted font-semibold">
                  <span>Verifier: {aud.auditor}</span>
                  <span>Date: {aud.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
