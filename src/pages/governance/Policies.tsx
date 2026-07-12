import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { socialGovernanceService } from '../../services/socialGovernanceService';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Clock,
  ArrowRight,
  Calendar
} from 'lucide-react';

export default function Policies() {
  const { user } = useApp();
  const navigate = useNavigate();

  const policies = socialGovernanceService.getPolicies();
  const employees = socialGovernanceService.getEmployees();
  const acknowledgements = socialGovernanceService.getPolicyAcknowledgements();

  // Find active employee
  const currentEmployee = employees.find(emp => emp.email === user?.email) || employees[0];

  const totalEmployees = employees.length || 25;

  // Calculate pending policies for this specific employee
  const employeeAcks = acknowledgements.filter(ack => ack.employeeId === currentEmployee?.id);
  
  const pendingPolicies = policies.filter(policy => {
    const ack = employeeAcks.find(a => a.policyId === policy.id);
    return !ack || ack.status !== 'Completed';
  });

  const pendingCount = pendingPolicies.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="policies-list-page">
      {/* Dashboard Banner Alert */}
      {pendingCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-xs flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-red-900">Acknowledgement Required</h4>
              <p className="text-xs text-red-700 mt-0.5">
                You have <span className="font-bold">{pendingCount} policies</span> awaiting your official sign-off. Please review and acknowledge them to remain compliant.
              </p>
            </div>
          </div>
          <Link
            to="/governance/policies/pending"
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
          >
            Review Pending <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight">Corporate Policies</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Browse and sign off on active regulatory, environmental, and ethical policies.
          </p>
        </div>
      </div>

      {/* Policies DataTable Card */}
      <div className="bg-white rounded-xl border border-neutral-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-border flex justify-between items-center bg-neutral-bg/20">
          <h3 className="font-bold text-sm text-neutral-text-dark">Organization Directory</h3>
          <span className="text-[10px] uppercase font-bold text-neutral-text-muted bg-white px-2.5 py-1 rounded-full border border-neutral-border">
            Total {policies.length} Active Policies
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="policies-data-table">
            <thead>
              <tr className="bg-neutral-bg text-neutral-text-dark border-b border-neutral-border text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Policy Document</th>
                <th className="py-4 px-6 text-center">Version</th>
                <th className="py-4 px-6">Effective Date</th>
                <th className="py-4 px-6">Ack Deadline</th>
                <th className="py-4 px-6">Acks Progress</th>
                <th className="py-4 px-6 text-center">Your Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-bg text-xs">
              {policies.map((policy) => {
                // Calculate dynamic acknowledgement progress
                const policyAcks = acknowledgements.filter(ack => ack.policyId === policy.id && ack.status === 'Completed');
                const ackPercent = Math.min(100, Math.round((policyAcks.length / totalEmployees) * 100));

                // Check active employee status for this policy
                const userAck = employeeAcks.find(a => a.policyId === policy.id);
                const isSigned = userAck?.status === 'Completed';

                // Calculate a mock deadline: 30 days after effective date
                const effDateObj = new Date(policy.effectiveDate);
                const deadlineObj = new Date(effDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
                const deadlineStr = deadlineObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <tr key={policy.id} className="hover:bg-neutral-bg/20 transition-colors">
                    {/* Policy Title and Pillar */}
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-bg flex items-center justify-center text-neutral-text-muted shrink-0 mt-0.5">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-text-dark text-sm hover:text-primary-teal cursor-pointer" onClick={() => navigate(`/governance/policies/${policy.id}`)}>
                            {policy.title}
                          </div>
                          <p className="text-[11px] text-neutral-text-muted mt-0.5 line-clamp-1">{policy.description}</p>
                        </div>
                      </div>
                    </td>

                    {/* Version Chip */}
                    <td className="py-4 px-6 text-center">
                      <span className="bg-neutral-bg text-neutral-text-dark font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-neutral-border">
                        v{policy.version}
                      </span>
                    </td>

                    {/* Effective Date */}
                    <td className="py-4 px-6 text-neutral-text-muted font-medium">
                      {policy.effectiveDate}
                    </td>

                    {/* Ack Deadline */}
                    <td className="py-4 px-6 text-neutral-text-muted font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-neutral-text-muted" />
                        {deadlineStr}
                      </span>
                    </td>

                    {/* Ack Percentage mini progress bar */}
                    <td className="py-4 px-6">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[10px] font-bold text-neutral-text-dark">
                          <span>{ackPercent}% Signed</span>
                          <span className="text-neutral-text-muted">({policyAcks.length}/{totalEmployees})</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-teal rounded-full"
                            style={{ width: `${ackPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Your Status */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSigned
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {isSigned ? 'Acknowledged' : 'Pending Sign-off'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => navigate(`/governance/policies/${policy.id}`)}
                        className={`font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto transition-colors ${
                          isSigned
                            ? 'bg-neutral-bg hover:bg-neutral-border text-neutral-text-muted hover:text-neutral-text-dark border border-neutral-border'
                            : 'bg-primary-teal hover:bg-teal-700 text-white'
                        }`}
                      >
                        {isSigned ? 'Review Document' : 'Acknowledge Now'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
