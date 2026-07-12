import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { socialGovernanceService } from '../../services/socialGovernanceService';
import {
  FileWarning,
  ArrowLeft,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileText
} from 'lucide-react';

export default function PendingPolicies() {
  const { user } = useApp();
  const navigate = useNavigate();

  const policies = socialGovernanceService.getPolicies();
  const employees = socialGovernanceService.getEmployees();
  const acknowledgements = socialGovernanceService.getPolicyAcknowledgements();

  // Find active employee
  const currentEmployee = employees.find(emp => emp.email === user?.email) || employees[0];

  // Filter pending policies
  const employeeAcks = acknowledgements.filter(ack => ack.employeeId === currentEmployee?.id);
  const pendingPolicies = policies.filter(policy => {
    const ack = employeeAcks.find(a => a.policyId === policy.id);
    return !ack || ack.status !== 'Completed';
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" id="pending-policies-page">
      {/* Back link */}
      <div>
        <Link
          to="/governance/policies"
          className="text-neutral-text-muted hover:text-neutral-text-dark text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Policy Index
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-neutral-border pb-6">
        <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-amber-500" /> Pending Policy Checklist
        </h1>
        <p className="text-sm text-neutral-text-muted mt-1">
          Below are the annual corporate compliance documents requiring your review and official acknowledgement.
        </p>
      </div>

      {/* List Checklist */}
      <div className="space-y-4">
        {pendingPolicies.map((policy, idx) => {
          // Calculate mock deadline
          const effDateObj = new Date(policy.effectiveDate);
          const deadlineObj = new Date(effDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
          const deadlineStr = deadlineObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={policy.id}
              className="bg-white rounded-xl border border-neutral-border p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              id={`pending-card-${policy.id}`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-text-dark leading-tight hover:text-primary-teal cursor-pointer" onClick={() => navigate(`/governance/policies/${policy.id}`)}>
                    {policy.title}
                  </h3>
                  <p className="text-xs text-neutral-text-muted mt-1 leading-normal max-w-lg">
                    {policy.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2.5 text-[11px] font-semibold text-neutral-text-muted">
                    <span className="bg-neutral-bg text-neutral-text-dark px-2 py-0.5 rounded font-mono">
                      v{policy.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Sign-off due by: {deadlineStr}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/governance/policies/${policy.id}`)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                Sign Off Policy <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {/* Checked off state */}
        {pendingPolicies.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-10 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <FileWarning className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Compliance fully up-to-date!</h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Excellent! You have reviewed and signed off on all active policies required for your role. No pending actions at this time.
            </p>
            <Link
              to="/governance/policies"
              className="inline-block bg-white border border-emerald-200 text-emerald-800 font-bold text-xs px-4 py-2 rounded-lg hover:bg-emerald-100/50 transition-colors shadow-xs"
            >
              View Policy Directory
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
