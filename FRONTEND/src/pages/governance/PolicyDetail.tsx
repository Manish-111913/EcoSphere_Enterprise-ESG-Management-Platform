import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { policiesService, PolicyAcknowledgementView } from '../../services/policiesService';
import { useToast } from '../../components/ui-kit/Toast';
import { ApiError } from '../../services/apiClient';
import { Policy } from '../../types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
} from 'lucide-react';

function getPolicySections(policyTitle: string) {
  const title = policyTitle.toLowerCase();

  if (title.includes('conduct')) {
    return [
      { title: '1. Executive Mandate', text: 'EcoSphere prohibits bribery, extortion, embezzlement, and corruption in all internal and external dealings.' },
      { title: '2. Gifts & Hospitality', text: 'Employees must avoid inappropriate gifts, favors, or hospitality that could influence commercial or compliance decisions.' },
      { title: '3. Conflict Disclosure', text: 'Potential conflicts of interest must be disclosed promptly so they can be reviewed and managed appropriately.' },
      { title: '4. Reporting & Non-Retaliation', text: 'Suspected violations must be reported through approved channels, and good-faith reporting must never lead to retaliation.' },
    ];
  }

  if (title.includes('environment')) {
    return [
      { title: '1. Scope', text: 'This policy defines the organization’s approach to carbon reduction, waste minimization, and resource stewardship.' },
      { title: '2. Energy Practices', text: 'Teams are expected to follow approved shutdown, monitoring, and energy-efficiency practices across facilities and systems.' },
      { title: '3. Waste Reduction', text: 'Departments must support recycling, responsible disposal, and reduced dependence on single-use materials.' },
      { title: '4. Procurement Alignment', text: 'Operational purchasing should prefer suppliers and materials that support sustainability targets and measurable improvements.' },
    ];
  }

  if (title.includes('privacy')) {
    return [
      { title: '1. Data Handling', text: 'Personal, operational, and regulated information must be stored, accessed, and transferred according to approved data handling controls.' },
      { title: '2. Access Control', text: 'Systems and devices that process sensitive information must use strong authentication, access review, and secure storage practices.' },
      { title: '3. Physical Safeguards', text: 'Critical records and infrastructure must remain protected through appropriate physical and administrative safeguards.' },
      { title: '4. Incident Response', text: 'Potential data exposure or loss events must be reported immediately so remediation and notification workflows can begin.' },
    ];
  }

  if (title.includes('safety')) {
    return [
      { title: '1. Safety Scope', text: 'This policy establishes workplace safety responsibilities, reporting channels, and operational safeguards for active teams and facilities.' },
      { title: '2. Hazard Prevention', text: 'Departments must identify, document, and mitigate safety hazards promptly, including equipment, workspace, and environmental risks.' },
      { title: '3. Incident Reporting', text: 'All incidents, near misses, and unsafe conditions must be reported immediately through the approved internal process.' },
      { title: '4. Training & Accountability', text: 'Managers are responsible for ensuring employees complete required safety training and follow documented procedures.' },
    ];
  }

  return [
    { title: '1. Purpose & Coverage', text: 'This document outlines the expectations, controls, and responsibilities associated with this policy across the organization.' },
    { title: '2. Operational Requirements', text: 'Applicable teams must implement required controls, maintain records, and follow approved review procedures.' },
    { title: '3. Oversight & Review', text: 'Compliance with this policy is monitored through periodic reviews, manager oversight, and corrective actions where needed.' },
    { title: '4. Enforcement', text: 'Failure to follow this policy may result in remediation steps, additional training requirements, or administrative escalation.' },
  ];
}

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const { employeeId, user } = useAuth();
  const { toast } = useToast();

  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [acknowledgedRecord, setAcknowledgedRecord] = useState<PolicyAcknowledgementView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      policiesService.getPolicyById(id),
      policiesService.getAcknowledgements(id).catch(() => []),
    ])
      .then(([policyRow, acknowledgements]) => {
        if (!active) return;
        setPolicy(policyRow);
        if (employeeId) {
          const ack = acknowledgements.find((a) => a.employeeId === employeeId) ?? null;
          setAcknowledgedRecord(ack);
          if (ack) setHasScrolledToEnd(true);
        }
        setNotFound(false);
      })
      .catch((err) => {
        if (!active) return;
        setNotFound(err instanceof ApiError && err.status === 404);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, employeeId]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || acknowledgedRecord) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (isAtBottom) setHasScrolledToEnd(true);
  };

  const handleAcknowledge = () => {
    if (!policy) return;
    policiesService
      .acknowledge(policy.id)
      .then(() => {
        const ack: PolicyAcknowledgementView = {
          id: `ack-${Date.now()}`,
          policyId: policy.id,
          policyVersion: Number(policy.version),
          employeeId: employeeId ?? '',
          acknowledgedAt: new Date().toISOString(),
        };
        setAcknowledgedRecord(ack);
        toast('Policy Acknowledged', 'success', `You have successfully signed off on ${policy.title}.`);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Unable to acknowledge this policy.';
        toast('Acknowledgement Failed', 'error', message);
      });
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <div className="text-sm text-neutral-text-muted">Loading policy document...</div>
      </div>
    );
  }

  if (!policy || notFound) {
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

  const sections = getPolicySections(policy.title);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" id="policy-detail-page">
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
            <span>|</span>
            <span>Version: v{policy.version}</span>
            <span>|</span>
            <span>Effective Date: {policy.effectiveDate}</span>
          </p>
        </div>

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

      <div className="space-y-2">
        <div className="text-xs font-bold text-neutral-text-muted flex items-center justify-between px-1">
          <span>Official Legal Document Viewer</span>
          {!acknowledgedRecord && (
            <span className="text-[10px] text-amber-600 uppercase tracking-wide">
              * Scroll completely to the end of the text to unlock sign-off button
            </span>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="bg-white border border-neutral-border rounded-xl shadow-sm p-8 max-h-[500px] overflow-y-auto space-y-6 leading-relaxed relative text-sm text-neutral-text-dark no-scrollbar select-none"
          id="policy-scroll-pane"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        >
          <div className="text-center pb-8 border-b border-neutral-border/40 space-y-2">
            <div className="text-[10px] font-extrabold text-primary-teal uppercase tracking-widest">
              EcoSphere ESG Compliance Protocol
            </div>
            <h2 className="text-lg font-extrabold text-neutral-text-dark tracking-tight">
              {policy.title}
            </h2>
            <div className="text-xs text-neutral-text-muted">
              Classification: Internal Document | Rev v{policy.version} | Active
            </div>
          </div>

          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="font-bold text-neutral-text-dark text-base tracking-tight">
                {sec.title}
              </h4>
              <p className="text-xs text-neutral-text-muted text-justify leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}

          <div className="pt-8 border-t border-neutral-border/40 text-center text-xs text-neutral-text-muted font-mono uppercase tracking-widest">
            *** End of Compliance Document ***
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-border p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {acknowledgedRecord ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-text-dark">Successfully Acknowledged</div>
              <p className="text-[11px] text-neutral-text-muted leading-relaxed mt-0.5">
                Signed electronically by <span className="font-bold">{user?.name ?? 'Current User'}</span> on{' '}
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
                  ? 'You have completed reading. Please click the button to certify compliance.'
                  : 'Please scroll the document viewer entirely to the end to certify your understanding.'}
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
