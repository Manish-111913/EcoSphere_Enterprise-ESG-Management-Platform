import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { csrService, CsrReviewItem } from '../../services/csrService';
import { ApiError } from '../../services/apiClient';
import { useToast } from '../../components/ui-kit/Toast';
import { motion, AnimatePresence } from 'motion/react';
import SelectField from '../../components/ui/select-field';
import {
  ClipboardCheck,
  Check,
  X,
  Eye,
  AlertTriangle,
  FileImage,
  Info,
  Calendar,
  User,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';

export default function Participation() {
  const { user, role } = useApp();
  const { settings } = useSettings();
  const { addToast } = useToast();

  const [activeParticipation, setActiveParticipation] = useState<any | null>(null);
  const [remarks, setRemarks] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Live review queue from the backend (submitted CSR the caller may decide).
  const [participations, setParticipations] = useState<CsrReviewItem[]>([]);

  const loadQueue = useCallback(async () => {
    try {
      setParticipations(await csrService.getReviewQueue());
    } catch (err) {
      console.error('Failed to load CSR review queue', err);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const isReviewer = role === 'Admin' || role === 'CSR Manager' || role === 'Department Head';

  const filteredParticipations = participations
    .map(p => ({
      ...p,
      employeeAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.employeeName)}&background=0D9488&color=fff`,
      employeeRole: 'Employee',
      xp: p.points,
    }))
    .filter(p => {
      const matchesSearch = p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.activityTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Approval goes through the REAL backend, which enforces the evidence guard.
  const handleApprove = async (p: any) => {
    try {
      await csrService.approve(p.id, remarks);
      addToast({
        title: 'Submission Approved',
        description: `Approved participation for ${p.employeeName}. Points awarded.`,
        type: 'success'
      });
      setActiveParticipation(null);
      setRemarks('');
      await loadQueue();
    } catch (err) {
      const e = err as ApiError;
      addToast({
        title: e.code === 'EVIDENCE_REQUIRED' ? 'Action Blocked' : 'Approval Failed',
        description: e.message || 'Could not approve submission.',
        type: 'danger'
      });
    }
  };

  const handleReject = async (p: any) => {
    if (!remarks.trim()) {
      addToast({
        title: 'Error',
        description: 'Remarks are strictly required when rejecting a submission.',
        type: 'danger'
      });
      return;
    }
    try {
      await csrService.reject(p.id, remarks);
      addToast({
        title: 'Submission Rejected',
        description: `Rejected participation for ${p.employeeName}. Remarks saved.`,
        type: 'warning'
      });
      setActiveParticipation(null);
      setRemarks('');
      await loadQueue();
    } catch (err) {
      const e = err as ApiError;
      addToast({ title: 'Rejection Failed', description: e.message, type: 'danger' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="participation-page">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight">CSR Participation Ledger</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Track and review corporate social responsibility activities. Managers can approve and audit proofs submitted by employees.
          </p>
        </div>

        {/* Live Settings Toggle indicator */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium shrink-0 ${
          settings.evidenceRequired 
            ? 'bg-amber-50 text-amber-800 border-amber-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {settings.evidenceRequired ? (
            <>
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold">Strict Evidence Lock ON</div>
                <div className="text-[10px] text-amber-700/80">Proof file is mandatory for approvals.</div>
              </div>
            </>
          ) : (
            <>
              <Info className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">Evidence Rule: Optional</div>
                <div className="text-[10px] text-emerald-700/80">Reviews allowed without proof file attachment.</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table search & quick filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
          <input
            type="text"
            placeholder="Search employee or activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-border rounded-lg text-sm bg-white focus:outline-none focus:border-primary-teal"
          />
        </div>

        <div className="flex gap-2 items-center w-full sm:w-auto">
          <Filter className="h-4 w-4 text-neutral-text-muted shrink-0" />
          <SelectField
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
            ]}
            triggerClassName="h-9 rounded-lg p-2 text-xs font-medium text-neutral-text-dark"
          />
        </div>
      </div>

      {/* Main DataTable Card */}
      <div className="bg-white rounded-xl border border-neutral-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="participation-data-table">
            <thead>
              <tr className="bg-neutral-bg text-neutral-text-dark border-b border-neutral-border text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">CSR Activity</th>
                <th className="py-4 px-6 text-center">Proof File</th>
                <th className="py-4 px-6 text-center">Status Badge</th>
                <th className="py-4 px-6 text-right">Points</th>
                <th className="py-4 px-6">Submitted Date</th>
                {isReviewer && <th className="py-4 px-6 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-bg text-xs">
              {filteredParticipations.map((p) => {
                const dateObj = new Date(p.timestamp);
                const formattedDate = isNaN(dateObj.getTime()) ? p.timestamp : dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <tr key={p.id} className="hover:bg-neutral-bg/20 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.employeeAvatar}
                          alt={p.employeeName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-neutral-border shrink-0"
                        />
                        <div>
                          <div className="font-bold text-neutral-text-dark text-sm">{p.employeeName}</div>
                          <div className="text-[10px] text-neutral-text-muted">{p.employeeRole}</div>
                        </div>
                      </div>
                    </td>

                    {/* CSR Activity */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-neutral-text-dark max-w-xs truncate" title={p.activityTitle}>
                        {p.activityTitle}
                      </div>
                      <div className="text-[10px] text-neutral-text-muted mt-0.5">Category: CSR Initiative</div>
                    </td>

                    {/* Proof Image Column */}
                    <td className="py-4 px-6 text-center">
                      {p.proofUrl ? (
                        <div className="inline-block group/thumb relative cursor-pointer" onClick={() => setLightboxUrl(p.proofUrl || null)}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-border relative shadow-xs">
                            <img src={p.proofUrl} alt="Proof" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-neutral-text-muted">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-[10px]">No Proof File</span>
                        </div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        p.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'Rejected'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status === 'Pending' ? 'Pending Review' : p.status}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="py-4 px-6 text-right font-bold text-neutral-text-dark">
                      <span className="text-amber-600">+{p.points}</span>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-neutral-text-muted font-medium">
                      {formattedDate}
                    </td>

                    {/* Action buttons (only if reviewer) */}
                    {isReviewer && (
                      <td className="py-4 px-6 text-center">
                        {p.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setActiveParticipation(p);
                              setRemarks(p.feedback || '');
                            }}
                            className="bg-primary-teal hover:bg-teal-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto transition-colors"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" /> Audit Proof
                          </button>
                        ) : (
                          <span className="text-neutral-text-muted font-medium text-[11px]">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredParticipations.length === 0 && (
          <div className="p-12 text-center text-neutral-text-muted">
            <ClipboardCheck className="h-10 w-10 mx-auto text-neutral-text-muted mb-3" />
            <div className="font-semibold text-neutral-text-dark">No participations found</div>
            <p className="text-xs">Try adjusting your filters or searches.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setLightboxUrl(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white p-2 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center p-3 border-b border-neutral-border">
                <span className="text-xs font-bold text-neutral-text-dark flex items-center gap-1.5">
                  <FileImage className="h-4 w-4 text-primary-teal" /> Submitter Proof Attachment
                </span>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="p-1 rounded-lg hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="bg-neutral-bg p-4 flex items-center justify-center overflow-auto flex-1 max-h-[65vh]">
                <img src={lightboxUrl} alt="Lightbox proof full resolution" referrerPolicy="no-referrer" className="max-w-full max-h-[60vh] object-contain rounded-lg border shadow-sm" />
              </div>
              <div className="p-3 bg-neutral-bg/30 text-center text-[11px] text-neutral-text-muted font-medium border-t border-neutral-border">
                Press anywhere outside or click Close to return.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve/Reject Dialog */}
      <AnimatePresence>
        {activeParticipation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl border border-neutral-border shadow-2xl max-w-xl w-full overflow-hidden flex flex-col"
              id="audit-participation-modal"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-border">
                <h3 className="font-bold text-base text-neutral-text-dark flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary-teal" /> Audit Submitter Submission
                </h3>
                <button
                  onClick={() => setActiveParticipation(null)}
                  className="p-1 rounded-lg hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                {/* Details card */}
                <div className="grid grid-cols-2 gap-4 bg-neutral-bg/30 p-4 rounded-xl border border-neutral-border text-xs leading-normal">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-text-muted block">Employee Name</span>
                    <span className="font-bold text-neutral-text-dark">{activeParticipation.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-text-muted block">CSR Initiative</span>
                    <span className="font-bold text-neutral-text-dark">{activeParticipation.activityTitle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-text-muted block">Rewards</span>
                    <span className="font-bold text-amber-700">+{activeParticipation.points} Points (+{activeParticipation.xp} XP)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-text-muted block">Submitted Date</span>
                    <span className="font-semibold text-neutral-text-dark">{new Date(activeParticipation.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Evidence / Proof Preview Pane */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-text-dark block">Proof Evidence File</span>
                  {activeParticipation.proofUrl ? (
                    <div className="rounded-xl border border-neutral-border overflow-hidden bg-neutral-bg h-48 relative group/drawer">
                      <img
                        src={activeParticipation.proofUrl}
                        alt="Submitted proof screenshot"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(activeParticipation.proofUrl || null)}
                        className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-neutral-text-dark text-[11px] font-bold px-3 py-1.5 rounded-lg border shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Full Resolution
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-6 text-center text-red-800 space-y-1.5">
                      <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
                      <div className="text-xs font-bold">No evidence attached</div>
                      <p className="text-[10px] leading-relaxed">
                        This employee has registered but has not provided a proof file.
                      </p>
                    </div>
                  )}
                </div>

                {/* Remarks textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-neutral-text-dark">Audit Remarks & Feedback</span>
                    <span className="text-[10px] text-red-500 font-semibold">* Required for Rejections</span>
                  </div>
                  <textarea
                    placeholder="Enter review remarks (e.g. 'Excellent community cleaning effort!', or why proof was rejected...)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-3 border border-neutral-border rounded-lg bg-white focus:outline-none focus:border-primary-teal"
                  />
                </div>

                {/* Strict Lock Alert if disabled */}
                {settings.evidenceRequired && !activeParticipation.proofUrl && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-[10.5px] leading-normal flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Approve Action Disabled</span>: Per current organization-wide rules inside settings, "Strict Evidence Upload" is toggled ON. Since no proof was attached, this participation cannot be approved.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-neutral-bg/30 border-t border-neutral-border flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveParticipation(null)}
                  className="px-4 py-2 border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark text-xs font-bold bg-white rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {/* Reject button - remarks required */}
                  <button
                    type="button"
                    onClick={() => handleReject(activeParticipation)}
                    disabled={!remarks.trim()}
                    title={!remarks.trim() ? "Remarks are required for rejection" : "Reject submission"}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted disabled:border-neutral-border text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Reject Submitter
                  </button>

                  {/* Approve — the backend enforces the evidence guard (real setting). */}
                  <button
                    type="button"
                    onClick={() => handleApprove(activeParticipation)}
                    title={settings.evidenceRequired ? 'Evidence rule ON — backend blocks proof-less approvals' : 'Approve submission'}
                    className="px-4 py-2 bg-primary-teal hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs hover:shadow-sm"
                  >
                    Approve Submitter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
