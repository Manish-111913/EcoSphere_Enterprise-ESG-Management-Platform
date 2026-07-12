import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { socialGovernanceService } from '../../services/socialGovernanceService';
import { useToast } from '../../components/ui-kit/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileCheck,
  Calendar,
  User,
  Activity,
  AlertCircle,
  Plus,
  Save,
  ChevronRight,
  ArrowRight,
  X,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';
import { Audit } from '../../types';

export default function Audits() {
  const navigate = useNavigate();
  const { role } = useApp();
  const { addToast } = useToast();

  const audits = socialGovernanceService.getAudits();
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  
  // Drawer editing state
  const [findings, setFindings] = useState('');
  const [auditScore, setAuditScore] = useState<number | ''>('');
  const [auditStatus, setAuditStatus] = useState<'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'>('Scheduled');

  // Force re-renders for updates
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  const isAuditorOrAdmin = role === 'Admin' || role === 'Compliance Officer' || role === 'Auditor';

  const handleOpenAudit = (audit: any) => {
    setSelectedAudit(audit);
    setFindings(audit.findings || '');
    setAuditScore(audit.auditScore !== undefined ? audit.auditScore : '');
    setAuditStatus(audit.status);
  };

  const handleSaveAudit = () => {
    if (!selectedAudit) return;

    const scoreNum = auditScore === '' ? undefined : Number(auditScore);
    if (scoreNum !== undefined && (scoreNum < 0 || scoreNum > 100)) {
      addToast({
        title: 'Validation Error',
        description: 'Audit score must be a percentage between 0 and 100.',
        type: 'danger'
      });
      return;
    }

    const updated: any = {
      ...selectedAudit,
      status: auditStatus,
      findings,
      auditScore: scoreNum
    };

    socialGovernanceService.updateAudit(updated);
    addToast({
      title: 'Audit Saved Successfully',
      description: `The audit ${selectedAudit.title} has been updated.`,
      type: 'success'
    });
    setSelectedAudit(updated);
    forceUpdate();
  };

  const handleRaiseIssue = () => {
    if (!selectedAudit) return;
    
    // Pass linked audit ID as react-router state to the compliance issue page
    navigate('/governance/compliance-issues', {
      state: { preLinkedAuditId: selectedAudit.id }
    });
  };

  // Status Stepper mappings
  const stepperStates = [
    { key: 'Scheduled', label: 'Planned' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'Completed', label: 'Completed' }
  ];

  const getStepIndex = (status: string) => {
    if (status === 'Cancelled') return -1;
    return stepperStates.findIndex(s => s.key === status);
  };

  const activeStepIdx = getStepIndex(auditStatus);
  const isReadOnly = selectedAudit?.status === 'Completed';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="audits-page">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight">Governance Audits</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Conduct formal regulatory, workplace equity, and emissions transparency audits. Keep secure tracking of findings and risk issues.
          </p>
        </div>
      </div>

      {/* Audits DataTable Card */}
      <div className="bg-white rounded-xl border border-neutral-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-border flex justify-between items-center bg-neutral-bg/20">
          <h3 className="font-bold text-sm text-neutral-text-dark">Audit Registries</h3>
          <span className="text-[10px] uppercase font-bold text-neutral-text-muted bg-white px-2.5 py-1 rounded-full border border-neutral-border">
            Total {audits.length} Audits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="audits-data-table">
            <thead>
              <tr className="bg-neutral-bg text-neutral-text-dark border-b border-neutral-border text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Audit Details</th>
                <th className="py-4 px-6">Assigned Auditor</th>
                <th className="py-4 px-6">Scheduled Date</th>
                <th className="py-4 px-6 text-center">Score</th>
                <th className="py-4 px-6 text-center">Findings</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-bg text-xs">
              {audits.map((aud) => {
                const isCompleted = aud.status === 'Completed';
                const hasScore = aud.auditScore !== undefined;

                return (
                  <tr key={aud.id} className="hover:bg-neutral-bg/20 transition-colors">
                    {/* Title & Description */}
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-bg flex items-center justify-center text-neutral-text-muted mt-0.5 shrink-0">
                          <FileCheck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-text-dark text-sm hover:text-primary-teal cursor-pointer" onClick={() => handleOpenAudit(aud)}>
                            {aud.title}
                          </div>
                          <p className="text-[11px] text-neutral-text-muted mt-0.5 line-clamp-1">{aud.description}</p>
                        </div>
                      </div>
                    </td>

                    {/* Auditor */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-medium text-neutral-text-dark">
                        <User className="h-4 w-4 text-neutral-text-muted" />
                        <span>{aud.auditor}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-neutral-text-muted font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-neutral-text-muted" />
                        <span>{aud.date}</span>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-4 px-6 text-center">
                      {hasScore ? (
                        <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${
                          aud.auditScore! >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : aud.auditScore! >= 75
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {aud.auditScore}%
                        </span>
                      ) : (
                        <span className="text-neutral-text-muted font-medium">--</span>
                      )}
                    </td>

                    {/* Findings Badge Count */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        aud.findingsCount > 0
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-neutral-bg text-neutral-text-muted'
                      }`}>
                        {aud.findingsCount} Issues Found
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        aud.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : aud.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : aud.status === 'Cancelled'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {aud.status === 'Scheduled' ? 'Planned' : aud.status}
                      </span>
                    </td>

                    {/* Actions Button */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenAudit(aud)}
                        className="bg-neutral-bg hover:bg-neutral-border text-neutral-text-muted hover:text-neutral-text-dark font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto border border-neutral-border transition-all"
                      >
                        <Activity className="h-3.5 w-3.5" /> View Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide drawer for Audit Details */}
      <AnimatePresence>
        {selectedAudit && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAudit(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col justify-between"
              id="audit-details-drawer"
            >
              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto pb-10">
                {/* Header Title bar */}
                <div className="p-6 border-b border-neutral-border bg-neutral-bg/20 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-text-muted tracking-wider block">Audit Record ID: {selectedAudit.id}</span>
                    <h2 className="text-xl font-bold text-neutral-text-dark font-sans tracking-tight mt-1">{selectedAudit.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedAudit(null)}
                    className="p-1.5 rounded-lg hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark border shadow-xs transition-colors bg-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* General audit context */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-neutral-text-dark block">Document Description</span>
                    <p className="text-xs text-neutral-text-muted leading-relaxed">
                      {selectedAudit.description}
                    </p>
                  </div>

                  {/* Highlights metadata strip */}
                  <div className="grid grid-cols-2 gap-4 bg-neutral-bg/30 p-4 rounded-xl border border-neutral-border text-xs font-semibold">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-text-muted block">Auditor Specialist</span>
                      <span className="text-neutral-text-dark flex items-center gap-1 mt-0.5">
                        <User className="h-3.5 w-3.5" /> {selectedAudit.auditor}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-text-muted block">Review Date</span>
                      <span className="text-neutral-text-dark flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" /> {selectedAudit.date}
                      </span>
                    </div>
                  </div>

                  {/* STATUS STEPPER */}
                  <div className="space-y-4 pt-4 border-t border-neutral-border">
                    <span className="text-[11px] font-bold text-neutral-text-dark block">Workflow Audit Status</span>
                    
                    {selectedAudit.status === 'Cancelled' ? (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-800 text-xs flex items-center gap-2">
                        <Ban className="h-4.5 w-4.5" /> This audit has been officially cancelled.
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-between mt-2 px-1">
                        {/* Connecting Line */}
                        <div className="absolute left-3 right-3 h-0.5 bg-neutral-border -z-10" />
                        <div
                          className="absolute left-3 h-0.5 bg-primary-teal -z-10 transition-all duration-300"
                          style={{
                            width: `${activeStepIdx === 0 ? '0%' : activeStepIdx === 1 ? '50%' : '100%'}`
                          }}
                        />

                        {stepperStates.map((step, idx) => {
                          const isDone = idx < activeStepIdx;
                          const isCurrent = idx === activeStepIdx;
                          const isUpcoming = idx > activeStepIdx;

                          return (
                            <button
                              key={step.key}
                              disabled={isReadOnly || !isAuditorOrAdmin}
                              onClick={() => setAuditStatus(step.key as any)}
                              className="flex flex-col items-center gap-1.5 focus:outline-none group/step disabled:cursor-not-allowed"
                            >
                              <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                                isDone
                                  ? 'bg-primary-teal border-primary-teal text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-white border-primary-teal text-primary-teal ring-4 ring-teal-50'
                                  : 'bg-white border-neutral-border text-neutral-text-muted'
                              }`}>
                                {isDone ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                              </div>
                              <span className={`text-[10px] font-bold transition-colors ${
                                isCurrent ? 'text-primary-teal' : 'text-neutral-text-muted'
                              }`}>
                                {step.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* READ-ONLY BANNER IF COMPLETED */}
                  {isReadOnly && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-emerald-800 text-[11px] flex items-start gap-2 leading-relaxed">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Audit Completed (Read-Only)</span>: This audit was formally submitted by the auditor and is locked against modifications. Any outstanding findings must be logged as Compliance Issues.
                      </div>
                    </div>
                  )}

                  {/* EDITABLE FINDINGS AND SCORE (if not completed) */}
                  <div className="space-y-4 pt-4 border-t border-neutral-border">
                    {/* Findings text area */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-neutral-text-dark block">Audit Findings Summary</span>
                      <textarea
                        disabled={isReadOnly || !isAuditorOrAdmin}
                        placeholder="Detail specific omissions, strengths or gaps logged during physical inspections..."
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        rows={4}
                        className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white disabled:bg-neutral-bg disabled:text-neutral-text-muted focus:outline-none focus:border-primary-teal"
                      />
                    </div>

                    {/* Audit Score input */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-neutral-text-dark block">Overall Performance Score (%)</span>
                      <input
                        type="number"
                        disabled={isReadOnly || !isAuditorOrAdmin}
                        placeholder="Enter percentage score (e.g. 95)"
                        value={auditScore}
                        onChange={(e) => setAuditScore(e.target.value === '' ? '' : Number(e.target.value))}
                        min={0}
                        max={100}
                        className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white disabled:bg-neutral-bg disabled:text-neutral-text-muted focus:outline-none focus:border-primary-teal font-mono"
                      />
                    </div>
                  </div>

                  {/* RAISE COMPLIANCE ISSUE CTA */}
                  <div className="pt-4 border-t border-neutral-border text-center space-y-3">
                    <div className="text-[11px] text-neutral-text-muted font-medium">
                      Identify a critical non-compliance concern or regulatory penalty risk?
                    </div>
                    <button
                      type="button"
                      onClick={handleRaiseIssue}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-800 border border-red-200 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600" /> Raise Linked Issue
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="p-4 border-t border-neutral-border bg-neutral-bg/30 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAudit(null)}
                  className="flex-1 py-2.5 border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark text-xs font-bold bg-white rounded-lg transition-colors"
                >
                  Close Drawer
                </button>

                {!isReadOnly && isAuditorOrAdmin && (
                  <button
                    type="button"
                    onClick={handleSaveAudit}
                    className="flex-1 py-2.5 bg-primary-teal hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Save className="h-4 w-4" /> Save Audit Changes
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
