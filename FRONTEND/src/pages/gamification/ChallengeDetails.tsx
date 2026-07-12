import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { gamificationService, EnhancedParticipation } from '../../services/gamificationService';
import { Challenge, Employee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Award,
  Calendar,
  ChevronLeft,
  Users,
  Trophy,
  Hourglass,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Activity,
  ThumbsUp,
  Sliders,
  Send,
  Loader2,
  Lock,
  X
} from 'lucide-react';

export default function ChallengeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, refreshUser } = useApp();
  const { settings } = useSettings();

  // Selected challenge & related stats
  const challenge = useMemo(() => gamificationService.getChallengeById(id || ''), [id]);
  const employees = useMemo(() => gamificationService.getEmployees(), []);
  
  // Active employee ID based on current user session email
  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.email === user.email) || null;
  }, [user, employees]);

  // States
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'timeline'>('overview');
  const [participations, setParticipations] = useState<EnhancedParticipation[]>([]);
  const [userParticipation, setUserParticipation] = useState<EnhancedParticipation | null>(null);
  
  // Interactive Panel States (slider, upload)
  const [sliderVal, setSliderVal] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newBadges, setNewBadges] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load participations list
  const loadData = () => {
    if (!id) return;
    const parts = gamificationService.getParticipationsByChallenge(id);
    setParticipations(parts);
    
    if (currentEmployee) {
      const uPart = parts.find(p => p.employeeId === currentEmployee.id);
      setUserParticipation(uPart || null);
      if (uPart) {
        setSliderVal(uPart.progress || 0);
        setUploadedUrl(uPart.proofUrl || '');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id, currentEmployee]);

  // Guard clause if challenge is not found
  if (!challenge) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-text-dark font-sans">Challenge Not Found</h2>
        <p className="text-sm text-neutral-text-muted">The requested challenge id "{id}" does not exist in the database.</p>
        <button
          onClick={() => navigate('/gamification/challenges')}
          className="bg-primary-teal text-white font-semibold text-xs px-4 py-2.5 rounded-button shadow-sm"
        >
          Go Back to Challenges
        </button>
      </div>
    );
  }

  // Count reviews pending
  const pendingReviewsCount = participations.filter(p => p.status === 'Pending Review').length;

  // Render countdown text
  const getCountdownText = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return 'Challenge Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} days remaining`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours remaining`;
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setIsUploading(true);
    // Simulate async server file upload
    setTimeout(() => {
      setIsUploading(false);
      // Give a dummy Unsplash image that matches the challenge theme
      const urls = [
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600',
        'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600',
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
        'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=600'
      ];
      const randomUrl = urls[Math.floor(Math.random() * urls.length)];
      setUploadedUrl(randomUrl);
    }, 1200);
  };

  // Interactive Actions
  const handleJoin = () => {
    if (!currentEmployee) return;
    gamificationService.joinChallenge(challenge.id, currentEmployee.id);
    loadData();
  };

  const handleSliderRelease = () => {
    if (!currentEmployee) return;
    gamificationService.updateParticipationProgress(challenge.id, currentEmployee.id, sliderVal);
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!currentEmployee) {
      setSubmitError('You must be logged in as an active employee.');
      return;
    }

    if (settings.evidenceRequired && !uploadedUrl) {
      setSubmitError('Verification proof file upload is required by company policy settings.');
      return;
    }

    try {
      gamificationService.submitChallengeProof(challenge.id, currentEmployee.id, uploadedUrl, sliderVal);
      setSubmitSuccess(true);
      loadData();
      
      // Auto-award / evaluate badges if setting allows
      if (settings.badgeAutoAward) {
        const newlyEarned = gamificationService.checkAndAwardBadges(currentEmployee.id);
        if (newlyEarned.length > 0) {
          setNewBadges(newlyEarned);
          setShowConfetti(true);
        }
      }

      refreshUser();
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred during proof submission.');
    }
  };

  // Dynamic Pillar Badging
  const getPillarStyles = (p: Challenge['pillar']) => {
    switch (p) {
      case 'E': return 'bg-emerald-500/10 text-emerald-700 border-emerald-300';
      case 'S': return 'bg-sky-500/10 text-sky-700 border-sky-300';
      case 'G': return 'bg-indigo-500/10 text-indigo-700 border-indigo-300';
    }
  };

  // DataTable participants list mapping
  const participantRows = useMemo(() => {
    return participations.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      return {
        id: p.id,
        name: emp?.name || 'Unknown Colleague',
        email: emp?.email || '',
        avatar: emp?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        department: emp ? (emp.departmentId === 'dept-1' ? 'Human Resources' : emp.departmentId === 'dept-2' ? 'Engineering' : emp.departmentId === 'dept-3' ? 'Procurement' : emp.departmentId === 'dept-4' ? 'Legal' : 'Operations') : 'Corporate',
        progress: p.progress || 0,
        status: p.status,
        proofUrl: p.proofUrl
      };
    });
  }, [participations, employees]);

  // Chronological activity timeline items generator
  const activityTimeline = useMemo(() => {
    const list: { id: string; user: { name: string; avatar: string }; action: string; time: string; icon: any; color: string }[] = [];
    
    participations.forEach((p, idx) => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (!emp) return;

      const baseUser = { name: emp.name, avatar: emp.avatar };

      // Join event
      list.push({
        id: `join-${p.id}`,
        user: baseUser,
        action: 'joined this sustainability challenge.',
        time: p.timestamp ? new Date(new Date(p.timestamp).getTime() - 2 * 3600000).toLocaleDateString() : 'Recent',
        icon: Users,
        color: 'bg-teal-100 text-teal-700'
      });

      // Status events
      if (p.status === 'Pending Review') {
        list.push({
          id: `submit-${p.id}`,
          user: baseUser,
          action: 'submitted completion proof for auditor review.',
          time: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'Recent',
          icon: Send,
          color: 'bg-amber-100 text-amber-700'
        });
      } else if (p.status === 'Completed') {
        list.push({
          id: `complete-${p.id}`,
          user: baseUser,
          action: `completed the challenge! Earned +${challenge.xp} XP and +${challenge.points} Points.`,
          time: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'Recent',
          icon: Trophy,
          color: 'bg-emerald-100 text-emerald-700'
        });
      } else if (p.status === 'Failed') {
        list.push({
          id: `fail-${p.id}`,
          user: baseUser,
          action: 'had submission rejected or challenge expired.',
          time: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'Recent',
          icon: AlertCircle,
          color: 'bg-rose-100 text-rose-700'
        });
      }
    });

    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [participations, employees, challenge]);

  // Roles verification
  const isReviewer = role === 'Admin' || role === 'CSR Manager';
  const isEmployee = role === 'Employee' || role === 'Admin' || role === 'Department Head';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans relative" id="challenge-detail-page">
      {/* Back CTA */}
      <button
        onClick={() => navigate('/gamification/challenges')}
        className="flex items-center gap-2 text-xs font-bold text-neutral-text-muted hover:text-neutral-text-dark transition-all cursor-pointer hover:translate-x-[-2px]"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Challenges Hub</span>
      </button>

      {/* Hero Banner Grid Card */}
      <div className="bg-white border border-neutral-border rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Decorative corner flash */}
        <div className="absolute right-0 top-0 h-2 w-full bg-primary-teal" />

        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getPillarStyles(challenge.pillar)}`}>
              Pillar {challenge.pillar}
            </span>
            <span className="text-[10px] font-bold bg-neutral-bg border border-neutral-border text-neutral-text-dark px-2.5 py-1 rounded-full">
              {challenge.difficulty} Difficulty
            </span>
            <span className="text-[10px] font-bold bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3 fill-current" /> +{challenge.xp} XP / +{challenge.points} Points
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-neutral-text-dark font-sans tracking-tight">
            {challenge.title}
          </h1>

          <div className="flex items-center gap-4 text-xs font-semibold text-neutral-text-muted font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neutral-text-muted" /> {challenge.startDate} to {challenge.endDate}
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <Hourglass className="h-4 w-4 animate-pulse text-amber-500" /> {getCountdownText(challenge.endDate)}
            </span>
          </div>
        </div>

        {/* Hero Actions Column */}
        <div className="flex flex-col items-stretch md:items-end justify-center gap-2 shrink-0 w-full md:w-auto">
          {/* Review Queue CTA if reviewer */}
          {isReviewer && pendingReviewsCount > 0 && (
            <button
              onClick={() => navigate(`/gamification/challenges/${challenge.id}/review`)}
              className="bg-primary-teal hover:bg-teal-700 text-white font-extrabold text-xs px-5 py-3 rounded-button shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <FileText className="h-4 w-4" />
              <span>Review Submissions ({pendingReviewsCount} pending)</span>
            </button>
          )}

          {/* Join Challenge Button for Employee session */}
          {isEmployee && !userParticipation && (
            <button
              onClick={handleJoin}
              className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-6 py-3 rounded-button shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Flame className="h-4 w-4 fill-current" />
              <span>Join Challenge Now</span>
            </button>
          )}

          {/* User Active Status Badge on joined challenges */}
          {userParticipation && (
            <div className="flex flex-col items-stretch md:items-end gap-1.5">
              <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border text-center ${
                userParticipation.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                userParticipation.status === 'Pending Review' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                Active Status: {userParticipation.status}
              </span>
              <span className="text-[10px] text-neutral-text-muted text-center md:text-right font-medium">
                Your Progress: {userParticipation.progress || 0}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Panel Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: 2/3 Width Tabs Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-border rounded-2xl shadow-sm overflow-hidden">
            {/* Tabs Selector Bar */}
            <div className="flex border-b border-neutral-border bg-neutral-bg/20">
              {(['overview', 'participants', 'timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-center border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary-teal text-primary-teal bg-white'
                      : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark hover:bg-neutral-bg/40'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <h2 className="text-base font-bold text-neutral-text-dark">Challenge Objectives</h2>
                    <p className="text-sm text-neutral-text-muted leading-relaxed whitespace-pre-line">
                      {challenge.description}
                    </p>

                    <div className="bg-neutral-bg/60 rounded-xl p-4 border border-neutral-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase">Start Date</span>
                        <p className="text-xs font-semibold text-neutral-text-dark">{challenge.startDate}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase">End Date</span>
                        <p className="text-xs font-semibold text-neutral-text-dark">{challenge.endDate}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase">Required Evidence</span>
                        <p className="text-xs font-semibold text-neutral-text-dark">
                          {settings.evidenceRequired ? 'Image/Document File Upload Upload' : 'No strict upload needed'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase">Company Rule Enforcement</span>
                        <p className="text-xs font-semibold text-neutral-text-dark">
                          {settings.badgeAutoAward ? 'Auto Badge Evaluation' : 'Manual Audit Auditing'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'participants' && (
                  <motion.div
                    key="participants-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <h2 className="text-base font-bold text-neutral-text-dark mb-2">Participant Roster ({participantRows.length})</h2>

                    {participantRows.length > 0 ? (
                      <div className="border border-neutral-border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-neutral-bg text-neutral-text-muted uppercase text-[10px] font-bold tracking-wider border-b border-neutral-border">
                              <th className="px-4 py-3.5">Employee</th>
                              <th className="px-4 py-3.5">Department</th>
                              <th className="px-4 py-3.5">Progress</th>
                              <th className="px-4 py-3.5 text-right">Verification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participantRows.map(row => (
                              <tr key={row.id} className="border-b border-neutral-border/60 hover:bg-neutral-bg/30 transition-colors">
                                <td className="px-4 py-3 flex items-center gap-3">
                                  <img
                                    src={row.avatar}
                                    alt={row.name}
                                    className="h-8 w-8 rounded-full object-cover border border-neutral-border"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-neutral-text-dark">{row.name}</span>
                                    <span className="text-[10px] text-neutral-text-muted">{row.email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-neutral-text-muted font-medium">
                                  {row.department}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 w-full max-w-[120px]">
                                    <div className="w-full bg-neutral-border h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-primary-teal h-full rounded-full"
                                        style={{ width: `${row.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-text-dark font-mono shrink-0">
                                      {row.progress}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    row.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' :
                                    row.status === 'Pending Review' ? 'bg-amber-50 text-amber-800 animate-pulse' :
                                    'bg-blue-50 text-blue-800'
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-neutral-text-muted border border-dashed border-neutral-border rounded-xl">
                        <Users className="h-8 w-8 text-neutral-text-muted/60 mx-auto mb-2" />
                        <p className="text-xs">No employees have joined this challenge yet.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <h2 className="text-base font-bold text-neutral-text-dark">Activity Feed</h2>

                    {activityTimeline.length > 0 ? (
                      <div className="relative border-l border-neutral-border pl-6 ml-3 space-y-6">
                        {activityTimeline.map(act => (
                          <div key={act.id} className="relative group">
                            {/* Icon Indicator */}
                            <span className={`absolute -left-[35px] top-0.5 flex items-center justify-center h-6 w-6 rounded-full ring-4 ring-white shadow-sm border border-neutral-border ${act.color}`}>
                              <act.icon className="h-3 w-3" />
                            </span>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <img
                                  src={act.user.avatar}
                                  alt={act.user.name}
                                  className="h-5 w-5 rounded-full object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-xs font-bold text-neutral-text-dark">{act.user.name}</span>
                                <span className="text-xs text-neutral-text-muted">{act.action}</span>
                              </div>
                              <p className="text-[10px] text-neutral-text-muted font-mono">{act.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-neutral-text-muted border border-dashed border-neutral-border rounded-xl">
                        <Activity className="h-8 w-8 text-neutral-text-muted/60 mx-auto mb-2" />
                        <p className="text-xs">No activity logged for this challenge yet.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Side: 1/3 Width Employee Interaction Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {/* If not joined, show a prompt card */}
            {isEmployee && !userParticipation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-bg border border-neutral-border p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4"
              >
                <Lock className="h-10 w-10 text-neutral-text-muted mb-1" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-neutral-text-dark">Challenge Locked</h3>
                  <p className="text-xs text-neutral-text-muted max-w-xs">
                    You must join this challenge first in order to track progress and submit proof files.
                  </p>
                </div>
                <button
                  onClick={handleJoin}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-button transition-colors shadow-sm"
                >
                  Join Challenge
                </button>
              </motion.div>
            )}

            {/* If joined, show interactive slide and file upload panel */}
            {isEmployee && userParticipation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-neutral-border rounded-2xl p-6 shadow-sm space-y-6"
              >
                <div>
                  <h3 className="font-bold text-sm text-neutral-text-dark mb-1 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-primary-teal" />
                    <span>My Challenge Panel</span>
                  </h3>
                  <p className="text-[11px] text-neutral-text-muted leading-relaxed">
                    Update your progress, upload required files, and submit for verification and points payout.
                  </p>
                </div>

                {submitSuccess ? (
                  <div className="space-y-4 py-2 text-center">
                    <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-neutral-text-dark">Submission Received</h4>
                      <p className="text-[11px] text-neutral-text-muted">
                        Your proof was submitted and is pending verification review. You'll be notified when points are credited!
                      </p>
                    </div>
                    <button
                      onClick={() => setSubmitSuccess(false)}
                      className="text-[11px] font-bold text-primary-teal hover:underline"
                    >
                      Resubmit another file
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProof} className="space-y-5">
                    {submitError && (
                      <div className="bg-red-50 text-red-800 p-2.5 rounded-lg border border-red-200 text-[10px] font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {/* Progress Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-text-dark">My Progress</span>
                        <span className="text-xs font-extrabold text-teal-600 font-mono">{sliderVal}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        disabled={userParticipation.status === 'Completed' || userParticipation.status === 'Pending Review'}
                        value={sliderVal}
                        onChange={(e) => setSliderVal(Number(e.target.value))}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="w-full h-1.5 bg-neutral-bg hover:bg-neutral-border/50 rounded-lg appearance-none cursor-pointer accent-primary-teal transition-all disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[9px] text-neutral-text-muted font-bold font-mono">
                        <span>Not Started</span>
                        <span>Halfway</span>
                        <span>Done</span>
                      </div>
                    </div>

                    {/* Drag & Drop FileUpload */}
                    {settings.evidenceRequired && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-neutral-text-dark block">Proof Evidence</span>
                        
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
                            dragActive ? 'border-primary-teal bg-teal-50/20' : 'border-neutral-border hover:bg-neutral-bg/40'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />

                          {isUploading ? (
                            <div className="flex flex-col items-center gap-1">
                              <Loader2 className="h-6 w-6 text-primary-teal animate-spin" />
                              <span className="text-[10px] font-semibold text-neutral-text-muted">Uploading file...</span>
                            </div>
                          ) : uploadedUrl ? (
                            <div className="space-y-1.5 w-full">
                              <img
                                src={uploadedUrl}
                                alt="Proof preview"
                                className="h-24 w-full object-cover rounded-lg border border-neutral-border shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[10px] text-teal-600 font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3 w-3 fill-teal-100" /> Proof File Uploaded
                              </span>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="h-7 w-7 text-neutral-text-muted group-hover:text-primary-teal" />
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-neutral-text-dark">Drag & Drop file</span>
                                <span className="text-[9px] text-neutral-text-muted block">or click to choose image</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit Proof Button */}
                    <button
                      type="submit"
                      disabled={userParticipation.status === 'Completed' || userParticipation.status === 'Pending Review' || isUploading}
                      className="w-full bg-primary-teal hover:bg-teal-700 text-white disabled:bg-neutral-bg disabled:text-neutral-text-muted font-bold text-xs py-3 rounded-button transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{userParticipation.status === 'Pending Review' ? 'Awaiting Review' : 'Submit for Review'}</span>
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confetti & Level up Medallion Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-text-dark/70 flex items-center justify-center z-50 p-6 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl relative border border-neutral-border space-y-6"
            >
              <button
                onClick={() => setShowConfetti(false)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative inline-block">
                <div className="absolute inset-0 bg-amber-400 blur-xl opacity-40 animate-pulse rounded-full" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="relative h-24 w-24 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full flex items-center justify-center shadow-lg border border-white shrink-0"
                >
                  <Award className="h-12 w-12 text-white fill-current" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-neutral-text-dark font-sans tracking-tight">Badge Awarded!</h3>
                <p className="text-xs text-neutral-text-muted leading-relaxed">
                  Congratulations! Due to your high-performance sustainability participations, you have unlocked:
                </p>
                {newBadges.map(b => (
                  <div key={b.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left flex items-center gap-3">
                    <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-amber-900 block">{b.name}</span>
                      <span className="text-[10px] text-amber-800/80 leading-snug">{b.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowConfetti(false)}
                className="w-full bg-primary-teal hover:bg-teal-700 text-white text-xs font-extrabold py-3 rounded-button transition-colors shadow-sm"
              >
                Claim Rewards (+{newBadges.reduce((sum, b) => sum + b.pointsAward, 0)} pts)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
