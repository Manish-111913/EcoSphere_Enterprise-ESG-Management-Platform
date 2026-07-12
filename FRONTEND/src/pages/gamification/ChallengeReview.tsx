import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { gamificationService, EnhancedParticipation } from '../../services/gamificationService';
import { challengesService } from '../../services/challengesService';
import { Employee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileCheck2,
  Users,
  Eye,
  Sparkles,
  Info,
  Keyboard,
  ThumbsUp,
  ThumbsDown,
  AlertCircle
} from 'lucide-react';

export default function ChallengeReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, refreshUser } = useApp();

  const [challenge, setChallenge] = useState<any | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const employees = useMemo(() => gamificationService.getEmployees(), []);
  
  const [participations, setParticipations] = useState<EnhancedParticipation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionDone, setActionDone] = useState<string | null>(null);

  const loadSubmissions = () => {
    if (!id) return;
    const parts = gamificationService.getParticipationsByChallenge(id);
    // Only display 'Pending Review' submissions for review queue
    const pending = parts.filter(p => p.status === 'Pending Review');
    setParticipations(pending);
    setCurrentIndex(0);
  };

  useEffect(() => {
    loadSubmissions();
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadChallenge() {
      if (!id) {
        if (active) {
          setChallenge(null);
          setChallengeLoading(false);
        }
        return;
      }

      const localChallenge = gamificationService.getChallengeById(id);
      if (localChallenge) {
        if (active) {
          setChallenge(localChallenge);
          setChallengeLoading(false);
        }
        return;
      }

      setChallengeLoading(true);
      try {
        const liveChallenge = await challengesService.getChallengeById(id);
        if (active) {
          setChallenge(liveChallenge);
        }
      } catch {
        if (active) {
          setChallenge(null);
        }
      } finally {
        if (active) {
          setChallengeLoading(false);
        }
      }
    }

    void loadChallenge();
    return () => {
      active = false;
    };
  }, [id]);

  if (challengeLoading) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-primary-teal mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-neutral-text-dark font-sans">Loading Challenge</h2>
        <p className="text-sm text-neutral-text-muted">Fetching the latest challenge details...</p>
      </div>
    );
  }

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in feedback textarea
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (key === 'j') {
        // Next submission
        handleNext();
      } else if (key === 'k') {
        // Previous submission
        handlePrev();
      } else if (key === 'a') {
        // Approve
        handleApprove();
      } else if (key === 'r') {
        // Reject
        handleReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [participations, currentIndex, feedback]);

  const handleNext = () => {
    if (participations.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % participations.length);
    setFeedback('');
    setActionDone(null);
  };

  const handlePrev = () => {
    if (participations.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + participations.length) % participations.length);
    setFeedback('');
    setActionDone(null);
  };

  const handleApprove = () => {
    if (participations.length === 0) return;
    const active = participations[currentIndex];
    
    gamificationService.reviewSubmission(active.id, 'Approved', feedback);
    setActionDone('Approved! Points and XP have been successfully credited to the employee.');
    
    // Refresh global user points session
    refreshUser();

    // Reload queue
    setTimeout(() => {
      loadSubmissions();
      setFeedback('');
      setActionDone(null);
    }, 1500);
  };

  const handleReject = () => {
    if (participations.length === 0) return;
    const active = participations[currentIndex];
    
    gamificationService.reviewSubmission(active.id, 'Rejected', feedback || 'Proof files submitted did not meet ESG requirements.');
    setActionDone('Rejected. The submission status has been updated and no points were awarded.');
    
    setTimeout(() => {
      loadSubmissions();
      setFeedback('');
      setActionDone(null);
    }, 1500);
  };

  const activeSubmission = participations[currentIndex];
  const activeEmployee = useMemo(() => {
    if (!activeSubmission) return null;
    return employees.find(e => e.id === activeSubmission.employeeId) || null;
  }, [activeSubmission, employees]);

  // Guard clause if challenge not found
  if (!challenge) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-neutral-text-dark font-sans">Challenge Not Found</h2>
        <button onClick={() => navigate('/gamification/challenges')} className="bg-primary-teal text-white font-semibold text-xs px-4 py-2 mt-4 rounded-button">
          Go Back
        </button>
      </div>
    );
  }

  // Security Role Check: only Admins and CSR Managers can review
  const isAuthorized = role === 'Admin' || role === 'CSR Manager';
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-text-dark font-sans">Access Unauthorized</h2>
        <p className="text-sm text-neutral-text-muted">
          Only ESG Auditors, CSR Managers, or Administrators are authorized to review employee challenge proof submissions.
        </p>
        <button
          onClick={() => navigate(`/gamification/challenges/${challenge.id}`)}
          className="bg-neutral-bg border border-neutral-border text-neutral-text-dark font-bold text-xs px-4 py-2.5 rounded-button"
        >
          Return to Challenge Detail
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 py-6 font-sans relative" id="review-submissions-page">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/gamification/challenges/${challenge.id}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-text-muted hover:text-neutral-text-dark transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Challenge Details</span>
          </button>
          <h1 className="text-xl font-extrabold text-neutral-text-dark tracking-tight">
            Submission Evaluation Queue
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium">
            Reviewing pending completions for <span className="font-bold text-neutral-text-dark">"{challenge.title}"</span>
          </p>
        </div>

        <div className="bg-neutral-bg border border-neutral-border px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-neutral-text-dark shrink-0">
          Queue Remaining: {participations.length}
        </div>
      </div>

      {/* Main Review Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Card: 2/3 Width Submission Queue Card */}
        <div className="md:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {participations.length > 0 && activeSubmission && activeEmployee ? (
              <motion.div
                key={activeSubmission.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="bg-white border border-neutral-border rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Submission Header Panel */}
                <div className="flex items-center justify-between gap-3 border-b border-neutral-border pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeEmployee.avatar}
                      alt={activeEmployee.name}
                      className="h-10 w-10 rounded-full object-cover border border-neutral-border shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-neutral-text-dark leading-none">{activeEmployee.name}</h3>
                      <p className="text-[10px] text-neutral-text-muted leading-none">{activeEmployee.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-text-muted font-bold">Submission #{currentIndex + 1} of {participations.length}</span>
                    <span className="text-xs font-extrabold text-teal-600 font-mono">Progress Completed: {activeSubmission.progress}%</span>
                  </div>
                </div>

                {/* Proof Lightbox Activation Element */}
                {activeSubmission.proofUrl ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-text-dark">Proof Upload</span>
                    <div
                      onClick={() => setLightboxUrl(activeSubmission.proofUrl || null)}
                      className="group relative h-48 w-full rounded-xl overflow-hidden border border-neutral-border cursor-pointer shadow-sm hover:ring-2 hover:ring-primary-teal transition-all"
                    >
                      <img
                        src={activeSubmission.proofUrl}
                        alt="Proof of completion"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-neutral-text-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Click to expand image</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-bg p-4 rounded-xl text-center text-xs text-neutral-text-muted border border-dashed border-neutral-border">
                    No physical proof image uploaded for this submission.
                  </div>
                )}

                {/* Review Feedback Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-dark block">Auditor Feedback Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide comments or notes regarding completion quality (optional)..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={!!actionDone}
                    className="w-full bg-neutral-bg focus:bg-white text-xs px-3 py-2 rounded-button border border-neutral-border outline-none transition-all placeholder:text-neutral-text-muted text-neutral-text-dark resize-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal"
                  />
                </div>

                {/* Action Feedback Indicator Banner */}
                {actionDone ? (
                  <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl text-teal-800 text-xs font-bold flex items-center gap-2 animate-pulse">
                    <Sparkles className="h-4 w-4 text-teal-600 fill-teal-100" />
                    <span>{actionDone}</span>
                  </div>
                ) : (
                  /* Form Actions Group */
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 font-bold text-xs py-3 rounded-button flex items-center justify-center gap-2 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject (R)</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex-1 bg-primary-teal hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-button flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve (A)</span>
                    </button>
                  </div>
                )}

                {/* Carousel Navigator Controls */}
                {participations.length > 1 && (
                  <div className="flex items-center justify-between border-t border-neutral-border pt-4 text-neutral-text-muted">
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 hover:text-neutral-text-dark text-xs font-semibold cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous (K)</span>
                    </button>
                    <span className="text-[10px] font-mono font-bold">Submission {currentIndex + 1} of {participations.length}</span>
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 hover:text-neutral-text-dark text-xs font-semibold cursor-pointer"
                    >
                      <span>Next (J)</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-white border border-neutral-border rounded-2xl p-12 text-center shadow-sm space-y-4">
                <FileCheck2 className="h-10 w-10 text-neutral-text-muted mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-text-dark text-base">All submissions evaluated!</h3>
                  <p className="text-xs text-neutral-text-muted max-w-sm mx-auto">
                    There are no pending submission reviews for this challenge at this time. Excellent audit compliance!
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/gamification/challenges/${challenge.id}`)}
                  className="bg-primary-teal text-white font-bold text-xs px-4 py-2.5 rounded-button shadow-sm"
                >
                  Return to Challenge Details
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Keyboard Shortcut Tutorial Cards */}
        <div className="space-y-4">
          <div className="bg-white border border-neutral-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-neutral-text-dark tracking-wider flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary-teal" />
              <span>Keyboard Shortcuts</span>
            </h3>
            
            <p className="text-[11px] text-neutral-text-muted leading-relaxed">
              Use high-efficiency keystrokes to evaluate submissions in rapid succession:
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-text-muted">Next submission</span>
                <kbd className="px-2 py-0.5 bg-neutral-bg border border-neutral-border rounded font-mono font-bold text-neutral-text-dark">J</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-text-muted">Previous submission</span>
                <kbd className="px-2 py-0.5 bg-neutral-bg border border-neutral-border rounded font-mono font-bold text-neutral-text-dark">K</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-text-muted">Approve and Reward</span>
                <kbd className="px-2 py-0.5 bg-neutral-bg border border-neutral-border rounded font-mono font-bold text-neutral-text-dark">A</kbd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-text-muted">Reject and Deny</span>
                <kbd className="px-2 py-0.5 bg-neutral-bg border border-neutral-border rounded font-mono font-bold text-neutral-text-dark">R</kbd>
              </div>
            </div>
          </div>

          <div className="bg-neutral-bg border border-neutral-border p-4 rounded-2xl flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary-teal shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-text-dark block">Audit Compliance Log</span>
              <p className="text-[10px] text-neutral-text-muted leading-relaxed">
                Approvals instantly reward the employee. Dynamic logs are generated under their active profile histories.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 bg-neutral-text-dark/95 flex items-center justify-center z-50 p-6 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl border border-neutral-border/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute right-4 top-4 p-1 rounded-full bg-neutral-text-dark/80 text-white hover:bg-neutral-text-dark transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightboxUrl}
                alt="Expanded Proof"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
