import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/auth';
import { useSettings } from '../../context/SettingsContext';
import { csrActivitiesService, EnrichedActivity, CsrPart } from '../../services/csrActivitiesService';
import { reference } from '../../services/referenceData';
import { useToast } from '../../components/ui-kit/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Sparkles,
  Search,
  Upload,
  X,
  Clock,
  CheckCircle,
  HelpCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { CsrActivity, Employee } from '../../types';

export default function CsrActivities() {
  const { user } = useApp();
  const { employeeId } = useAuth();
  const { addToast } = useToast();
  const { settings } = useSettings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Live CSR board from the backend.
  const [activities, setActivities] = useState<EnrichedActivity[]>([]);
  const [participations, setParticipations] = useState<CsrPart[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; avatar: string }[]>([]);

  const reload = useCallback(async () => {
    const [board, dir] = await Promise.all([
      csrActivitiesService.getBoard().catch(() => ({ activities: [] as EnrichedActivity[], participations: [] as CsrPart[] })),
      reference.users().catch(() => []),
    ]);
    setActivities(board.activities);
    setParticipations(board.participations);
    setEmployees(dir.map((u) => ({ id: u.id, name: u.name, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0D9488&color=fff` })));
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const forceUpdate = () => { void reload(); };

  const currentEmployee = employeeId ? { id: employeeId, email: user?.email } : null;
  const categories = ['All', ...Array.from(new Set(activities.map((a) => a.category)))];

  // Filtering
  const filteredActivities = activities.filter(act => {
    const matchesSearch = act.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          act.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || act.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleJoin = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentEmployee) {
      addToast({ title: 'Error', description: 'No active employee session found.', type: 'danger' });
      return;
    }
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    try {
      await csrActivitiesService.join(activityId);
      addToast({ title: 'Joined Activity!', description: `You have successfully registered for ${activity.title}.`, type: 'success' });
      await reload();
    } catch (err) {
      addToast({ title: 'Could not join', description: (err as Error).message, type: 'danger' });
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setProofFile(file);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
  };

  const submitProof = async () => {
    if (!selectedActivity || !currentEmployee || !proofFile) return;
    const part = participations.find(p => p.activityId === selectedActivity.id && p.employeeId === currentEmployee.id);
    if (!part) {
      addToast({ title: 'Join first', description: 'Please join the activity before submitting proof.', type: 'danger' });
      return;
    }
    setIsSubmittingProof(true);
    try {
      await csrActivitiesService.submitProof(part.id, proofFile);
      addToast({ title: 'Proof Submitted!', description: 'Your proof has been uploaded and is pending CSR Manager review.', type: 'success' });
      setProofFile(null);
      setProofPreviewUrl('');
      await reload();
    } catch (err) {
      addToast({ title: 'Submission failed', description: (err as Error).message, type: 'danger' });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const getParticipationStatusForSelected = () => {
    if (!selectedActivity || !currentEmployee) return null;
    return participations.find(
      p => p.activityId === selectedActivity.id && p.employeeId === currentEmployee.id
    );
  };

  const selectedPart = getParticipationStatusForSelected();

  // Retrieve joined participants
  const getJoinedEmployeesForActivity = (activityId: string) => {
    const actParts = participations.filter(p => p.activityId === activityId);
    return actParts.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      return emp ? { ...emp, status: p.status } : null;
    }).filter(Boolean) as { id: string; name: string; avatar: string; status: string }[];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="csr-activities-page">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-text-dark font-sans tracking-tight">CSR Activities</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Browse and join corporate social responsibility initiatives to earn points and boost local community impact.
          </p>
        </div>
        
        {/* User Stats Card */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-neutral-border shadow-sm shrink-0">
          <div className="w-10 h-10 bg-primary-teal/10 rounded-full flex items-center justify-center text-primary-teal">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-text-muted font-bold">Your Balance</div>
            <div className="text-sm font-bold text-neutral-text-dark flex items-center gap-1">
              <span>{user?.points || 0} Points</span>
              <span className="text-xs text-neutral-text-muted font-normal">({user?.xp || 0} XP)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-border rounded-lg text-sm bg-white focus:outline-none focus:border-primary-teal"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-primary-teal text-white shadow-sm'
                  : 'bg-white text-neutral-text-muted border border-neutral-border hover:bg-neutral-bg'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((act) => {
          const isClosed = act.status === 'Completed';
          const isFull = act.joinedCount >= act.capacity;
          const isUserJoined = participations.some(p => p.activityId === act.id && p.employeeId === currentEmployee?.id);
          
          let tooltipText = '';
          if (isClosed) tooltipText = 'This activity is completed and closed.';
          else if (isFull && !isUserJoined) tooltipText = 'Activity capacity is fully reached.';

          return (
            <div
              key={act.id}
              onClick={() => {
                setSelectedActivity(act);
                setProofFile(null);
                setProofPreviewUrl('');
              }}
              className="bg-white rounded-xl border border-neutral-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
              id={`csr-card-${act.id}`}
            >
              <div>
                {/* Cover Photo */}
                <div className="h-44 w-full relative bg-neutral-bg overflow-hidden">
                  <img
                    src={act.coverUrl}
                    alt={act.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Chip */}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-neutral-text-dark border border-neutral-border/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    {act.category}
                  </span>

                  {/* Status Overlay */}
                  {isClosed && (
                    <div className="absolute inset-0 bg-neutral-text-dark/50 flex items-center justify-center">
                      <span className="bg-neutral-text-dark text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20">
                        COMPLETED
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Area */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-neutral-text-dark tracking-tight leading-snug group-hover:text-primary-teal transition-colors">
                      {act.title}
                    </h3>
                    <p className="text-xs text-neutral-text-muted mt-1.5 line-clamp-2">
                      {act.description}
                    </p>
                  </div>

                  {/* Meta Elements */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs font-medium text-neutral-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-neutral-text-muted" />
                      <span>{act.startDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-neutral-text-muted" />
                      <span className="truncate">{act.location}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-text-muted font-medium">Capacity Progress</span>
                      <span className="font-bold text-neutral-text-dark">
                        {act.joinedCount} / {act.capacity} joined
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isClosed
                            ? 'bg-neutral-text-muted'
                            : isFull
                            ? 'bg-amber-500'
                            : 'bg-primary-teal'
                        }`}
                        style={{ width: `${Math.min(100, (act.joinedCount / act.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-5 pt-0 border-t border-neutral-bg mt-auto flex items-center justify-between">
                {/* Rewards pill */}
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  <span>+{act.points} Points</span>
                </div>

                {/* Join CTA with custom tooltip trigger */}
                <div className="relative group/tooltip">
                  {isClosed || (isFull && !isUserJoined) ? (
                    <>
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-neutral-bg text-neutral-text-muted border border-neutral-border text-xs font-bold rounded-lg cursor-not-allowed flex items-center gap-1"
                      >
                        Join Activity
                      </button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-neutral-text-dark text-white text-[11px] rounded-lg p-2 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity shadow-lg z-20 text-center leading-normal">
                        <AlertCircle className="h-3.5 w-3.5 inline mr-1 text-amber-400" />
                        {tooltipText}
                      </div>
                    </>
                  ) : isUserJoined ? (
                    <span className="text-xs font-bold text-primary-teal bg-primary-teal/10 border border-primary-teal/20 px-3 py-2 rounded-lg flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Registered
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleJoin(act.id, e)}
                      className="px-4 py-2 bg-primary-teal hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition-all"
                    >
                      Join Activity
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zero State */}
      {filteredActivities.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-border p-12 text-center max-w-md mx-auto space-y-4">
          <Users className="h-12 w-12 text-neutral-text-muted mx-auto" />
          <h3 className="text-lg font-bold text-neutral-text-dark">No activities match filters</h3>
          <p className="text-sm text-neutral-text-muted">
            Try adjusting your search terms or picking another category chip.
          </p>
        </div>
      )}

      {/* Drawer - Sliding detail pane */}
      <AnimatePresence>
        {selectedActivity && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedActivity(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col justify-between"
              id="csr-activity-drawer"
            >
              {/* Header / Cover Area */}
              <div className="overflow-y-auto flex-1 pb-10">
                <div className="relative h-56 bg-neutral-bg">
                  <img
                    src={selectedActivity.coverUrl}
                    alt={selectedActivity.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white text-neutral-text-dark p-2 rounded-full border border-neutral-border shadow-md transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <span className="absolute bottom-4 left-4 bg-primary-teal text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm">
                    {selectedActivity.category}
                  </span>
                </div>

                {/* Description Body */}
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-text-dark font-sans tracking-tight">
                      {selectedActivity.title}
                    </h2>
                    <p className="text-sm text-neutral-text-muted mt-2 leading-relaxed">
                      {selectedActivity.description}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-neutral-bg/40 p-4 rounded-xl border border-neutral-border">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-neutral-text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date Range
                      </div>
                      <div className="text-xs font-semibold text-neutral-text-dark">
                        {selectedActivity.startDate} to {selectedActivity.endDate}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-neutral-text-muted flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                      </div>
                      <div className="text-xs font-semibold text-neutral-text-dark truncate">
                        {selectedActivity.location}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-neutral-text-muted flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Points Reward
                      </div>
                      <div className="text-xs font-bold text-amber-700">
                        +{selectedActivity.points} Points
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-neutral-text-muted flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> XP Gain
                      </div>
                      <div className="text-xs font-semibold text-primary-teal">
                        +{selectedActivity.xp} XP
                      </div>
                    </div>
                  </div>

                  {/* Joined Participants list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-neutral-text-dark flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-neutral-text-muted" />
                      <span>Registered Coworkers ({selectedActivity.joinedCount} Joined)</span>
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {getJoinedEmployeesForActivity(selectedActivity.id).map(emp => (
                        <div key={emp.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-neutral-border text-xs">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-neutral-border"
                            />
                            <div>
                              <div className="font-bold text-neutral-text-dark">{emp.name}</div>
                              <div className="text-[10px] text-neutral-text-muted">Participant</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : emp.status === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {emp.status}
                          </span>
                        </div>
                      ))}

                      {getJoinedEmployeesForActivity(selectedActivity.id).length === 0 && (
                        <div className="text-center text-xs text-neutral-text-muted py-4 bg-neutral-bg/30 rounded-lg border border-dashed border-neutral-border">
                          No coworkers registered yet. Be the first!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Upload Section for Proof (only if user is registered and status is NOT approved) */}
                  {participations.some(p => p.activityId === selectedActivity.id && p.employeeId === currentEmployee?.id) && (
                    <div className="space-y-3 pt-4 border-t border-neutral-border">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-neutral-text-dark flex items-center gap-1.5">
                          <Upload className="h-4 w-4 text-neutral-text-muted" />
                          <span>Submit Activity Proof</span>
                        </h4>
                        
                        {selectedPart && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            selectedPart.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedPart.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            Proof Status: {selectedPart.status}
                          </span>
                        )}
                      </div>

                      {selectedPart?.feedback && (
                        <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg text-xs">
                          <span className="font-bold">Manager Remarks:</span> {selectedPart.feedback}
                        </div>
                      )}

                      {selectedPart?.status !== 'Approved' ? (
                        <div className="space-y-3">
                          {/* Drag and Drop Container */}
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative ${
                              dragActive
                                ? 'border-primary-teal bg-primary-teal/5'
                                : proofFile
                                ? 'border-emerald-500 bg-emerald-50/10'
                                : 'border-neutral-border hover:border-primary-teal bg-neutral-bg/20'
                            }`}
                          >
                            <input
                              type="file"
                              id="proof-upload-input"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            
                            <label htmlFor="proof-upload-input" className="cursor-pointer space-y-2 block">
                              <Upload className={`h-8 w-8 mx-auto ${proofFile ? 'text-emerald-500' : 'text-neutral-text-muted'}`} />
                              <div className="text-xs font-semibold text-neutral-text-dark">
                                {proofFile ? proofFile.name : 'Drag & drop proof image here, or click to browse'}
                              </div>
                              <p className="text-[10px] text-neutral-text-muted">
                                Supports PNG, JPG or JPEG up to 10MB
                              </p>
                            </label>

                            {proofFile && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setProofFile(null);
                                  setProofPreviewUrl('');
                                }}
                                className="absolute top-2 right-2 bg-white/80 border border-neutral-border p-1 rounded-full text-neutral-text-muted hover:text-neutral-text-dark"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Image preview */}
                          {proofPreviewUrl && (
                            <div className="rounded-lg border border-neutral-border overflow-hidden h-32 relative">
                              <img src={proofPreviewUrl} alt="Proof preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-neutral-text-dark/20 flex items-center justify-center text-white text-xs font-bold">
                                Proof File Loaded
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={submitProof}
                            disabled={!proofFile || isSubmittingProof}
                            className="w-full py-2 bg-primary-teal hover:bg-teal-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted disabled:border-neutral-border text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
                          >
                            {isSubmittingProof ? 'Uploading Proof...' : 'Upload & Submit Evidence'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs space-y-2">
                          <div className="font-bold flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Point Reward Approved!
                          </div>
                          <p>
                            Your proof was audited successfully by the CSR Manager. You earned +{selectedActivity.points} Points and +{selectedActivity.xp} XP.
                          </p>
                          {selectedPart.proofUrl && (
                            <div className="rounded-lg border border-emerald-100 overflow-hidden h-28 mt-2">
                              <img src={selectedPart.proofUrl} alt="Approved proof" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="p-4 border-t border-neutral-border bg-neutral-bg/30 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  className="flex-1 py-2.5 border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark text-xs font-bold bg-white rounded-lg transition-colors"
                >
                  Close Panel
                </button>

                {!participations.some(p => p.activityId === selectedActivity.id && p.employeeId === currentEmployee?.id) && (
                  <button
                    type="button"
                    onClick={(e) => handleJoin(selectedActivity.id, e)}
                    disabled={selectedActivity.status === 'Completed' || selectedActivity.joinedCount >= selectedActivity.capacity}
                    className="flex-1 py-2.5 bg-primary-teal hover:bg-teal-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted disabled:border-neutral-border text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Join Activity Now
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
