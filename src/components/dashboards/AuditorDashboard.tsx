import React, { useState } from 'react';
import { Shield, FileCheck, Search, Calendar, CheckSquare, Eye, ExternalLink } from 'lucide-react';
import { mockAudits, mockComplianceIssues, mockPolicies } from '../../mocks/db';

export default function AuditorDashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIssues = mockComplianceIssues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Read-Only Banner */}
      <div className="bg-slate-800 text-white p-5 rounded-xl shadow-sm text-left flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Auditor Workspace</span>
          <h3 className="text-lg font-black mt-1">Audit schedules & Compliance Findings</h3>
          <p className="text-xs text-slate-300 mt-1">
            Read-only clearance tier. Review independent audit trails, policy verification milestones, and active compliance logs.
          </p>
        </div>
        <span className="text-xs bg-slate-700 text-slate-100 font-bold border border-slate-600 px-3 py-1.5 rounded-full uppercase shrink-0 font-mono">
          Read-Only Access
        </span>
      </div>

      {/* Stats Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <span className="text-xs font-semibold text-neutral-text-muted">Verification Actions</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{mockAudits.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">milestones</span>
          </div>
          <p className="text-[11px] text-green-600 font-bold mt-1.5">
            Deloitte & Apex certified
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <span className="text-xs font-semibold text-neutral-text-muted">Compliance Audits</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">4</span>
            <span className="text-xs font-bold text-neutral-text-muted">schedules</span>
          </div>
          <p className="text-[11px] text-neutral-text-muted mt-1.5">
            2 scheduled in Q3
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <span className="text-xs font-semibold text-neutral-text-muted">Ethics Code Compliance</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">100%</span>
            <span className="text-xs font-bold text-neutral-text-muted">ethics rate</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1.5">
            All policy terms signed
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <span className="text-xs font-semibold text-neutral-text-muted">Logged Findings</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{mockComplianceIssues.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">issues total</span>
          </div>
          <p className="text-[11px] text-neutral-text-muted mt-1.5">
            Tracked with timestamp hash
          </p>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white border border-neutral-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
          <input
            type="text"
            placeholder="Search audit findings by ID or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-neutral-border rounded-lg text-xs focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-neutral-bg/30"
          />
        </div>
      </div>

      {/* Main Grid: Audit Schedule + Findings review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Audit Schedule */}
        <div className="lg:col-span-4 bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            Official Audit Schedules
          </h3>
          <div className="space-y-4">
            {mockAudits.map((aud) => (
              <div key={aud.id} className="border border-neutral-border rounded-lg p-3.5 bg-neutral-bg/10 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-neutral-text-muted">{aud.id}</span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    aud.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {aud.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-neutral-text-dark mt-1">{aud.title}</div>
                <p className="text-[10px] text-neutral-text-muted mt-1 leading-snug">{aud.description}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-text-muted font-mono font-bold border-t border-neutral-border/50 pt-2">
                  <span>Verifier: {aud.auditor}</span>
                  <span>{aud.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Read-only compliance issues finding table */}
        <div className="lg:col-span-8 bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4 flex items-center justify-between">
            <span>Logged Compliance Findings</span>
            <span className="text-[10px] text-neutral-text-muted font-mono">Independent verification trail</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Title</th>
                  <th className="p-3 font-semibold">Severity</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Due Date</th>
                  <th className="p-3 font-semibold text-center">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {filteredIssues.map((issue: any) => (
                  <tr key={issue.id} className="hover:bg-neutral-bg transition-colors">
                    <td className="p-3 font-mono font-semibold text-neutral-text-dark">{issue.id.toUpperCase()}</td>
                    <td className="p-3 font-medium text-neutral-text-dark">{issue.title}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        issue.severity === 'Critical' ? 'bg-red-50 text-red-800 border border-red-100' :
                        issue.severity === 'High' ? 'bg-orange-50 text-orange-800' :
                        'bg-yellow-50 text-yellow-800'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] ${
                        issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800' :
                        'bg-red-50 text-red-800'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-neutral-text-muted">{issue.dueDate}</td>
                    <td className="p-3 text-center">
                      <button className="p-1.5 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-lg transition-colors inline-flex items-center gap-1">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
