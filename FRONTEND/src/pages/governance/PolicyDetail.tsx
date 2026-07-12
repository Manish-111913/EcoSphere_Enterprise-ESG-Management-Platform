import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { socialGovernanceService } from '../../services/socialGovernanceService';
import { useToast } from '../../components/ui-kit/Toast';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const { addToast } = useToast();

  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [acknowledgedRecord, setAcknowledgedRecord] = useState<any | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const policy = socialGovernanceService.getPolicyById(id || '');
  const employees = socialGovernanceService.getEmployees();
  const acknowledgements = socialGovernanceService.getPolicyAcknowledgements();

  const currentEmployee = employees.find(emp => emp.email === user?.email) || employees[0];

  useEffect(() => {
    if (policy && currentEmployee) {
      const ack = acknowledgements.find(
        a => a.policyId === policy.id && a.employeeId === currentEmployee.id && a.status === 'Completed'
      );
      if (ack) {
        setAcknowledgedRecord(ack);
        setHasScrolledToEnd(true); // already signed
      }
    }
  }, [policy, currentEmployee, acknowledgements]);

  if (!policy) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-neutral-text-dark">Policy Document Not Found</h3>
        <p className="text-sm text-neutral-text-muted">
          We couldn't locate the specified policy document ID. It may have been archived.
        </p>
        <Link to="/governance/policies" className="inline-block bg-primary-teal text-white text-xs font-bold px-4 py-2 rounded-lg">
          Back to Directory
        </Link>
      </div>
    );
  }

  // Scroll handler
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || acknowledgedRecord) return;

    // Check if user reached bottom of container
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (isAtBottom) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAcknowledge = () => {
    if (!currentEmployee) {
      addToast({
        title: 'Session Error',
        description: 'Unable to identify current employee session.',
        type: 'danger'
      });
      return;
    }

    const newAck = socialGovernanceService.acknowledgePolicy(policy.id, currentEmployee.id);
    setAcknowledgedRecord(newAck);
    addToast({
      title: 'Policy Acknowledged',
      description: `You have successfully signed off on ${policy.title}.`,
      type: 'success'
    });
  };

  // Content paragraph arrays to render
  const getPolicySections = (policyId: string) => {
    switch (policyId) {
      case 'pol-1':
        return [
          { title: '1. Executive Mandate', text: 'EcoSphere strictly prohibits any form of bribery, extortion, embezzlement, or corruption. All corporate relations, procurements, and vendor decisions must be based entirely on open-market competitiveness and compliant commercial practices.' },
          { title: '2. Gift Limits & Thresholds', text: 'Employees must not solicit, accept, or offer any financial incentives, gifts, luxury travel, or excessive hospitality from or to active suppliers. Token promotional items value capped strictly at $50 USD maximum may be permitted with department sign-off.' },
          { title: '3. Procurement Transparency & Conflict of Interest', text: 'Any potential conflicts of interest must be disclosed immediately to the Legal & Compliance unit. Relationships with vendor stakeholders must be fully declared prior to placing purchase orders.' },
          { title: '4. Reporting Channels & Non-Retaliation', text: 'Violations or compliance suspicions must be channeled immediately via the secure whistleblower portal (compliance@ecosphere.com). Retaliation against any employee raising issues in good faith is strictly illegal and subject to summary termination.' }
        ];
      case 'pol-2':
        return [
          { title: '1. Purpose & Scope', text: 'This policy governs EcoSphere’s commitment to minimizing its direct and indirect environmental footprint. Targets cover scope 1, 2, and 3 carbon reduction, waste reduction, water conservation, and sustainable travel.' },
          { title: '2. Active Energy Preservation', text: 'All workspaces and data rooms must enforce energy conservation thresholds. Computers, laptops, auxiliary server screens, and office lighting grids must be fully shut down at close of operational shifts.' },
          { title: '3. Waste Minimization & Zero-Plastic Initiatives', text: 'The use of single-use plastics is restricted on company premises. Recyclable materials, paper bins, and organic waste separation grids must be mapped and maintained on all administrative floors.' },
          { title: '4. Green Purchasing & Logistics', text: 'Operational procurement must prioritize suppliers that demonstrate proactive decarbonization efforts, recycled material sourcing, and efficient freight routing.' }
        ];
      case 'pol-3':
        return [
          { title: '1. Equal Opportunity Core Guarantee', text: 'EcoSphere is committed to maintaining a diverse, inclusive, and equitable working environment. Selection, hiring, promotion, and payroll compensation are handled strictly without regard to race, gender, religion, age, sexual orientation, or disability.' },
          { title: '2. Inclusion Roster and Mentorship Metrics', text: 'Departments must actively participate in corporate mentorship programs to empower underrepresented demographics, providing fair career opportunities and professional skills training.' },
          { title: '3. Anti-Harassment & Discrimination Protocols', text: 'Zero tolerance is enforced for discriminatory actions, verbal slurs, or psychological harassment. Formal incident reports are audited by the HR and Legal divisions, guaranteeing fully confidential reviews.' },
          { title: '4. Physical and Digital Accessibility Standards', text: 'All shared office resources, communication channels, and digital tools must conform to accessibility standards to accommodate personnel with diverse physical requirements.' }
        ];
      case 'pol-4':
        return [
          { title: '1. Protected Health Information & HIPAA Compliance', text: 'Any handling, logging, storage, or transmission of medical records, medical leaves, or personal identifier data must strictly adhere to HIPAA and GDPR parameters.' },
          { title: '2. Server Security & Device Enforcements', text: 'Critical databases must be protected with modern cryptographic mechanisms. Mobile devices used for business files must utilize corporate authentication screens and active security keys.' },
          { title: '3. Physical Access Controls', text: 'Data warehouses and physical communications racks must remain locked and subject to biometric or passcode verifications, with logs inspected weekly by the compliance team.' },
          { title: '4. Incident Response and Data Leak Remediation', text: 'Any suspect data leakage or device theft must be flagged to security teams within 2 hours. Mitigation workflows must initiate immediately to notify impacted stakeholders.' }
        ];
      default:
        return [
          { title: '1. Vendor Qualification Requirements', text: 'Supply chain management must audit third-party logistics and material vendors. Qualifying suppliers must sign off on EcoSphere’s Supplier Code of Conduct and provide verified ESG emission scopes.' },
          { title: '2. Auditing and Periodic Performance Checklists', text: 'Vendor performance audits are conducted bi-annually. Logistics providers must report direct fuel consumption logs to maintain certified vendor status.' },
          { title: '3. Sustainable Materials Sourcing', text: 'Procured raw goods must hold FSC, FairTrade, or equivalent green certifications. Packaging materials must be comprised of at least 80% post-consumer recycled content.' },
          { title: '4. Supply Chain Rectification Protocols', text: 'Should a supplier fail to meet ethical standards or environmental thresholds, a 60-day remediation roadmap must be drafted. Failure to resolve issues results in agreement cancellation.' }
        ];
    }
  };

  const sections = getPolicySections(policy.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" id="policy-detail-page">
      {/* Navigation and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-border pb-5">
        <div className="space-y-1">
          <Link
            to="/governance/policies"
            className="text-neutral-text-muted hover:text-neutral-text-dark text-xs font-semibold flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Policies
          </Link>
          <h1 className="text-2xl font-bold text-neutral-text-dark font-sans tracking-tight">
            {policy.title}
          </h1>
          <p className="text-xs text-neutral-text-muted flex items-center gap-3">
            <span>Pillar: {policy.pillar}</span>
            <span>·</span>
            <span>Version: v{policy.version}</span>
            <span>·</span>
            <span>Effective Date: {policy.effectiveDate}</span>
          </p>
        </div>

        {/* Status Indicator */}
        {acknowledgedRecord ? (
          <span className="self-start sm:self-center bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Acknowledged Compliance
          </span>
        ) : (
          <span className="self-start sm:self-center bg-red-50 text-red-800 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 animate-pulse">
            <AlertTriangle className="h-4.5 w-4.5 text-red-600" /> Action Required
          </span>
        )}
      </div>

      {/* Document scrollable container */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-neutral-text-muted flex items-center justify-between px-1">
          <span>Official Legal Document Viewer</span>
          {!acknowledgedRecord && (
            <span className="text-[10px] text-amber-600 uppercase tracking-wide">
              * Scroll completely to the end of the text to unlock sign-off button
            </span>
          )}
        </div>

        {/* Scrollable container with handler */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="bg-white border border-neutral-border rounded-xl shadow-sm p-8 max-h-[500px] overflow-y-auto space-y-6 leading-relaxed relative text-sm text-neutral-text-dark no-scrollbar select-none"
          id="policy-scroll-pane"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        >
          {/* Cover Sheet */}
          <div className="text-center pb-8 border-b border-neutral-border/40 space-y-2">
            <div className="text-[10px] font-extrabold text-primary-teal uppercase tracking-widest">
              EcoSphere ESG Compliance Protocol
            </div>
            <h2 className="text-lg font-extrabold text-neutral-text-dark tracking-tight">
              {policy.title}
            </h2>
            <div className="text-xs text-neutral-text-muted">
              Classification: Internal Document · Rev v{policy.version} · Active
            </div>
          </div>

          {/* Render Sections */}
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-2">
              <h4 className="font-bold text-neutral-text-dark text-base tracking-tight">
                {sec.title}
              </h4>
              <p className="text-xs text-neutral-text-muted text-justify leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}

          {/* End mark */}
          <div className="pt-8 border-t border-neutral-border/40 text-center text-xs text-neutral-text-muted font-mono uppercase tracking-widest">
            *** End of Compliance Document ***
          </div>
        </div>
      </div>

      {/* Bottom Sign off control card */}
      <div className="bg-white rounded-xl border border-neutral-border p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {acknowledgedRecord ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-text-dark">Successfully Acknowledged</div>
              <p className="text-[11px] text-neutral-text-muted leading-relaxed mt-0.5">
                Signed electronically by <span className="font-bold">{currentEmployee?.name}</span> ({currentEmployee?.email}) on{' '}
                <span className="font-semibold text-neutral-text-dark font-sans">
                  {new Date(acknowledgedRecord.acknowledgedAt).toLocaleString()}
                </span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
              <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-text-dark">Awaiting Electronic Signature</div>
              <p className="text-[11px] text-neutral-text-muted leading-relaxed mt-0.5">
                {hasScrolledToEnd 
                  ? "You have completed reading. Please click the button to certify compliance." 
                  : "Please scroll the document viewer entirely to the end to certify your understanding."}
              </p>
            </div>
          </div>
        )}

        {!acknowledgedRecord && (
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={!hasScrolledToEnd}
            className={`w-full md:w-auto px-6 py-2.5 rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all text-center ${
              hasScrolledToEnd
                ? 'bg-primary-teal hover:bg-teal-700 text-white cursor-pointer'
                : 'bg-neutral-bg text-neutral-text-muted border border-neutral-border cursor-not-allowed'
            }`}
            id="policy-sign-off-btn"
          >
            I Acknowledge & Certify
          </button>
        )}
      </div>
    </div>
  );
}
