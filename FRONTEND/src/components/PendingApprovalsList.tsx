import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, XCircle, FileText, Image, ExternalLink, RefreshCw, X, Eye } from 'lucide-react';
import { PendingApproval } from '../types';

export default function PendingApprovalsList() {
  const { pendingApprovals, approveApproval, rejectApproval } = useApp();
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);

  const handleApprove = (id: string, name: string) => {
    approveApproval(id);
    triggerToast(`Approved: ${name}'s request successfully.`);
    if (selectedApproval?.id === id) {
      setSelectedApproval(null);
    }
  };

  const handleReject = (id: string, name: string) => {
    if (selectedApproval?.id === id && !remarks.trim()) {
      setRemarksError('Remarks are strictly required for rejections.');
      return;
    }
    rejectApproval(id);
    triggerToast(`Rejected: ${name}'s request.`);
    setSelectedApproval(null);
    setRemarks('');
    setRemarksError('');
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 3000);
  };

  const openModal = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setRemarks('');
    setRemarksError('');
  };

  return (
    <div
      id="pending-approvals-queue"
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col justify-between relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-text-dark">Pending Approvals Queue</h3>
          <p className="text-xs text-neutral-text-muted">Verify uploaded CSR evidence & carbon logs</p>
        </div>
        <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold tabular-nums">
          {pendingApprovals.length} pending
        </span>
      </div>

      {/* List */}
      <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[380px] pr-1">
        {pendingApprovals.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-text-muted text-center gap-2 select-none">
            <CheckCircle className="h-10 w-10 text-semantic-success/60" />
            <p className="text-xs font-bold text-neutral-text-dark">All Caught Up!</p>
            <p className="text-[11px] max-w-[200px]">There are no pending submissions requiring manual audit verification.</p>
          </div>
        ) : (
          pendingApprovals.map(app => (
            <div
              key={app.id}
              className="p-3 bg-neutral-bg/45 hover:bg-neutral-bg/80 border border-neutral-border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <img
                  src={app.user.avatar}
                  alt={app.user.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-neutral-border object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-neutral-text-dark">{app.user.name}</span>
                    <span className="text-[9px] bg-neutral-border text-neutral-text-muted px-1.5 py-0.2 rounded-full font-semibold">
                      {app.user.department}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-text-dark mt-1 leading-snug group-hover:text-primary-teal transition-colors">
                    {app.title}
                  </h4>
                  <p className="text-[10px] text-neutral-text-muted truncate mt-0.5 max-w-[240px]">
                    {app.subtitle}
                  </p>
                </div>
              </div>

              {/* Inline Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => openModal(app)}
                  className="p-1.5 rounded-button text-neutral-text-muted hover:text-neutral-text-dark hover:bg-neutral-border/50 border border-neutral-border transition-colors"
                  title="View Proof & Audit Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleReject(app.id, app.user.name)}
                  className="px-2.5 py-1.5 rounded-button text-xs font-bold text-semantic-danger bg-semantic-danger/10 hover:bg-semantic-danger/25 transition-all"
                  title="Reject logs with feedback"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(app.id, app.user.name)}
                  className="px-2.5 py-1.5 rounded-button text-xs font-bold text-white bg-semantic-success hover:bg-semantic-success/90 shadow-sm transition-all"
                  title="Approve logs into core ledger"
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Proof Lightbox / Reject Dialog */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-neutral-text-dark/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-neutral-border w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedApproval(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-neutral-border pb-3 mb-4">
              <span className="text-[10px] bg-primary-teal/10 text-primary-teal px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Audit Verification
              </span>
              <h3 className="text-base font-extrabold text-neutral-text-dark mt-2">{selectedApproval.title}</h3>
              <p className="text-xs text-neutral-text-muted mt-1">{selectedApproval.subtitle}</p>
            </div>

            {/* Proof Preview Pane */}
            <div className="space-y-4">
              {selectedApproval.details.evidenceUrl ? (
                <div>
                  <span className="text-[10px] font-bold text-neutral-text-muted uppercase block mb-1.5">
                    Uploaded Evidence (Proof Image)
                  </span>
                  <div className="relative rounded-lg overflow-hidden border border-neutral-border bg-neutral-bg h-48 flex items-center justify-center">
                    <img
                      src={selectedApproval.details.evidenceUrl}
                      alt="Proof"
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-neutral-bg border border-neutral-border">
                  <span className="text-[10px] font-bold text-neutral-text-muted uppercase block mb-2">
                    Carbon Transaction Details
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-text-muted block">Quantity:</span>
                      <span className="font-bold text-neutral-text-dark tabular-nums">
                        {selectedApproval.details.quantity} {selectedApproval.details.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-text-muted block">Factor:</span>
                      <span className="font-bold text-neutral-text-dark">
                        {selectedApproval.details.factor}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Awarded Metrics summary if any */}
              {(selectedApproval.details.xp || selectedApproval.details.points) && (
                <div className="flex gap-4 p-3 bg-primary-teal/[0.03] border border-primary-teal/10 rounded-lg">
                  {selectedApproval.details.xp && (
                    <div className="text-xs">
                      <span className="text-neutral-text-muted">Award XP:</span>
                      <span className="font-extrabold text-primary-teal block tabular-nums">+{selectedApproval.details.xp} XP</span>
                    </div>
                  )}
                  {selectedApproval.details.points && (
                    <div className="text-xs">
                      <span className="text-neutral-text-muted">Award Points:</span>
                      <span className="font-extrabold text-accent-emerald block tabular-nums">+{selectedApproval.details.points} pts</span>
                    </div>
                  )}
                </div>
              )}

              {/* Remarks Field (required for rejection) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-text-dark block">
                  Remarks / Auditor Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={e => {
                    setRemarks(e.target.value);
                    if (e.target.value.trim()) setRemarksError('');
                  }}
                  placeholder="Enter feedback for approval or reasons for rejection..."
                  className="w-full h-20 text-xs p-2.5 rounded-lg border border-neutral-border focus:border-primary-teal focus:outline-none focus:bg-white resize-none text-neutral-text-dark"
                />
                {remarksError && (
                  <p className="text-[10px] font-semibold text-semantic-danger flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {remarksError}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-border">
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="px-4 py-2 border border-neutral-border rounded-button text-xs font-semibold hover:bg-neutral-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedApproval.id, selectedApproval.user.name)}
                  className="px-4 py-2 bg-semantic-danger text-white rounded-button text-xs font-bold hover:bg-semantic-danger/95 shadow-sm transition-all"
                >
                  Reject & Notify
                </button>
                <button
                  onClick={() => handleApprove(selectedApproval.id, selectedApproval.user.name)}
                  className="px-4 py-2 bg-semantic-success text-white rounded-button text-xs font-bold hover:bg-semantic-success/95 shadow-sm transition-all"
                >
                  Approve Ledger Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success/Error Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-neutral-text-dark text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-neutral-border animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle className="h-4.5 w-4.5 text-accent-emerald" />
          <span>{showToast}</span>
        </div>
      )}
    </div>
  );
}
