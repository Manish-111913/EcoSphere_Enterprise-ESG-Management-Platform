import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { challengesService } from '../../services/challengesService';
import { Challenge } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Award,
  Calendar,
  AlertCircle,
  FileCheck2,
  Users,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Hourglass,
  SlidersHorizontal,
  X
} from 'lucide-react';
import SelectField from '../../components/ui/select-field';

export default function Challenges() {
  const { user, role, refreshUser } = useApp();
  const { settings } = useSettings();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<Challenge['status']>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  // Live challenge categories from the backend master.
  const [challengeCategories, setChallengeCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    challengesService.getCategories().then(setChallengeCategories).catch(() => setChallengeCategories([]));
  }, []);

  // Create Challenge Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    pillar: 'E' as 'E' | 'S' | 'G',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    xp: 100,
    points: 150,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Draft' as Challenge['status']
  });
  const [formError, setFormError] = useState('');

  // Load challenges from the backend.
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const loadChallenges = useCallback(async () => {
    try {
      setChallenges(await challengesService.getChallenges());
    } catch {
      setChallenges([]);
    }
  }, []);
  useEffect(() => { void loadChallenges(); }, [loadChallenges]);
  // Participant avatars need a per-challenge fetch (see Challenge Details); omitted in the grid.
  const participations: { challengeId: string; employeeId: string }[] = [];
  const employees: { id: string; email: string; avatar: string; name: string }[] = [];

  // Filter Challenges
  const filteredChallenges = useMemo(() => {
    return challenges.filter(c => {
      if (c.status !== activeTab) return false;
      
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPillar = pillarFilter === 'all' || c.pillar === pillarFilter;
      const matchesDifficulty = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
      
      return matchesSearch && matchesPillar && matchesDifficulty;
    });
  }, [challenges, activeTab, searchQuery, pillarFilter, difficultyFilter]);

  // Tab Counts
  const tabCounts = useMemo(() => {
    const counts: Record<Challenge['status'], number> = {
      Draft: 0,
      Active: 0,
      'Under Review': 0,
      Completed: 0,
      Archived: 0
    };
    challenges.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [challenges]);

  // Pillar details helper
  const getPillarDetails = (pillar: 'E' | 'S' | 'G') => {
    switch (pillar) {
      case 'E':
        return { label: 'Environmental', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100' };
      case 'S':
        return { label: 'Social Impact', color: 'bg-sky-50 text-sky-700 border-sky-200/50 hover:bg-sky-100' };
      case 'G':
        return { label: 'Governance', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/50 hover:bg-indigo-100' };
    }
  };

  // Get difficulty styles
  const getDifficultyStyles = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200/60';
      case 'Hard':
        return 'bg-rose-50 text-rose-800 border-rose-200/60';
    }
  };

  // Calculate dynamic countdown in human readable format
  const getCountdown = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) {
      return `${days}d left`;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours}h left`;
  };

  // Get stacked participants list for a challenge
  const getChallengeParticipants = (challengeId: string) => {
    const challengeParts = participations.filter(p => p.challengeId === challengeId);
    return challengeParts.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      return emp ? { avatar: emp.avatar, name: emp.name } : null;
    }).filter(Boolean) as { avatar: string; name: string }[];
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.description) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (formData.xp <= 0 || formData.points <= 0) {
      setFormError('XP and Points must be positive values.');
      return;
    }

    try {
      await challengesService.createChallenge({
        title: formData.title,
        description: formData.description,
        category: formData.category || undefined,
        pillar: formData.pillar,
        status: formData.status,
        points: Number(formData.points),
        xp: Number(formData.xp),
        startDate: formData.startDate,
        endDate: formData.endDate,
        difficulty: formData.difficulty
      });
      await loadChallenges();
      setIsDrawerOpen(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        pillar: 'E',
        difficulty: 'Medium',
        xp: 100,
        points: 150,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft'
      });
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating challenge.');
    }
  };

  const canCreate = role === 'Admin' || role === 'CSR Manager';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in" id="challenges-page">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-600">
              <Flame className="h-5 w-5 fill-current animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold font-sans text-neutral-text-dark tracking-tight">Eco-Challenges Hub</h1>
          </div>
          <p className="text-sm text-neutral-text-muted max-w-xl">
            Complete high-impact sustainability, community, and auditing tasks to earn valuable ESG Points and unlock custom badges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* User Score Summary Card */}
          {user && (
            <div className="bg-neutral-bg border border-neutral-border px-4 py-2.5 rounded-xl flex items-center gap-4 shrink-0 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-neutral-text-muted">My Level</span>
                <span className="text-lg font-extrabold text-neutral-text-dark font-mono flex items-center gap-1">
                  Lvl {user.level} <Sparkles className="h-4 w-4 text-amber-500 fill-current" />
                </span>
              </div>
              <div className="h-8 w-[1px] bg-neutral-border" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Earned Points</span>
                <span className="text-lg font-extrabold text-teal-600 font-mono">
                  {user.points} pts
                </span>
              </div>
            </div>
          )}

          {canCreate && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="bg-primary-teal hover:bg-teal-700 text-white font-medium text-sm px-4 py-2.5 rounded-button shadow-sm flex items-center gap-2 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Challenge</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="space-y-4">
        {/* Search & Select dropdown filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-white border border-neutral-border p-3 rounded-xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <input
              type="text"
              placeholder="Search challenges by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-bg hover:bg-neutral-border/30 focus:bg-white text-sm rounded-button border border-transparent focus:border-neutral-border outline-none transition-all placeholder:text-neutral-text-muted text-neutral-text-dark font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-bg text-neutral-text-muted rounded-button border border-neutral-border/30 text-xs font-semibold">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>
            
            <SelectField
              value={pillarFilter}
              onValueChange={setPillarFilter}
              options={[
                { value: 'all', label: 'All Pillars' },
                { value: 'E', label: 'Environmental (E)' },
                { value: 'S', label: 'Social (S)' },
                { value: 'G', label: 'Governance (G)' },
              ]}
              triggerClassName="h-9 bg-neutral-bg text-xs font-medium text-neutral-text-dark px-3 py-1.5 rounded-button border-neutral-border/30"
            />

            <SelectField
              value={difficultyFilter}
              onValueChange={setDifficultyFilter}
              options={[
                { value: 'all', label: 'All Difficulties' },
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' },
              ]}
              triggerClassName="h-9 bg-neutral-bg text-xs font-medium text-neutral-text-dark px-3 py-1.5 rounded-button border-neutral-border/30"
            />

            {(searchQuery || pillarFilter !== 'all' || difficultyFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPillarFilter('all');
                  setDifficultyFilter('all');
                }}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline px-2.5 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex border-b border-neutral-border overflow-x-auto no-scrollbar">
          {(['Draft', 'Active', 'Under Review', 'Completed', 'Archived'] as Challenge['status'][]).map((tab) => {
            const count = tabCounts[tab] || 0;
            const isTabActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  isTabActive
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark hover:border-neutral-border'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isTabActive
                    ? 'bg-primary-teal text-white'
                    : 'bg-neutral-bg text-neutral-text-muted border border-neutral-border/50'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + JSON.stringify(filteredChallenges)}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredChallenges.map((challenge, idx) => {
            const pillar = getPillarDetails(challenge.pillar);
            const difficultyStyle = getDifficultyStyles(challenge.difficulty);
            const isJoinable = challenge.status === 'Active';
            const countdown = getCountdown(challenge.endDate);
            const members = getChallengeParticipants(challenge.id);
            const hasJoined = participations.some(p => p.challengeId === challenge.id && p.employeeId === (user ? employees.find(e => e.email === user.email)?.id : ''));

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2) }}
                className="bg-white border border-neutral-border hover:border-neutral-text-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between group"
              >
                {/* Card Top: Pillar Badge, Difficulty, XP */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${pillar.color} transition-colors`}>
                      {pillar.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${difficultyStyle}`}>
                        {challenge.difficulty}
                      </span>
                      {settings.evidenceRequired && (
                        <span className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" title="Proof file upload required">
                          <FileCheck2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-neutral-text-dark font-sans text-base leading-snug mb-1.5 group-hover:text-primary-teal transition-colors">
                    {challenge.title}
                  </h3>
                  <p className="text-xs text-neutral-text-muted leading-relaxed line-clamp-2 mb-4">
                    {challenge.description}
                  </p>
                </div>

                {/* Card Bottom Panel */}
                <div className="border-t border-neutral-border pt-4 mt-auto space-y-4">
                  {/* Participant Avatars & Countdown */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Avatars stacked */}
                    <div className="flex items-center">
                      {members.length > 0 ? (
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {members.slice(0, 3).map((m, i) => (
                            <img
                              key={i}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                              src={m.avatar}
                              alt={m.name}
                              title={m.name}
                              referrerPolicy="no-referrer"
                            />
                          ))}
                          {members.length > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-text-muted ring-2 ring-white">
                              +{members.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-text-muted flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> No participants yet
                        </span>
                      )}
                    </div>

                    {/* Deadline/Countdown */}
                    <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-text-muted">
                      <Hourglass className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="font-mono">{countdown}</span>
                    </div>
                  </div>

                  {/* Actions Bar: XP / Points display & Join/View Details CTA */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-text-muted font-semibold">Reward</span>
                      <span className="text-xs font-extrabold text-neutral-text-dark font-mono flex items-center gap-1">
                        +{challenge.xp} XP <span className="text-teal-600">({challenge.points} pts)</span>
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/gamification/challenges/${challenge.id}`)}
                      className={`flex items-center gap-1 font-bold text-xs px-4 py-2 rounded-button border transition-all ${
                        hasJoined
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          : 'bg-neutral-bg hover:bg-primary-teal hover:text-white border-neutral-border text-neutral-text-dark'
                      }`}
                    >
                      <span>{hasJoined ? 'In Progress' : 'View Details'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredChallenges.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white border border-neutral-border rounded-2xl p-8 text-center shadow-sm">
              <AlertCircle className="h-10 w-10 text-neutral-text-muted mb-3" />
              <h4 className="text-base font-bold text-neutral-text-dark mb-1">No Challenges Found</h4>
              <p className="text-xs text-neutral-text-muted max-w-sm mb-4">
                There are currently no challenges matching the tab status "{activeTab}" or active filters.
              </p>
              {canCreate && activeTab === 'Draft' && (
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="bg-primary-teal hover:bg-teal-700 text-white font-medium text-xs px-4 py-2 rounded-button transition-colors shadow-sm"
                >
                  Create a New Draft
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slide-out Create Drawer (Pure Client-side FormDrawer Component) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-neutral-text-dark z-40 cursor-pointer"
            />

            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 flex flex-col justify-between border-l border-neutral-border overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-border pb-4">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary-teal" />
                    <h2 className="text-lg font-bold text-neutral-text-dark font-sans tracking-tight">Create Challenge</h2>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateChallenge} className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-dark">Challenge Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tree Planting Marathon"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-neutral-bg hover:bg-neutral-border/20 focus:bg-white text-sm px-3.5 py-2 rounded-button border border-neutral-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal outline-none transition-all placeholder:text-neutral-text-muted text-neutral-text-dark"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-dark">Description <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Detail the terms and requirements of the challenge..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-neutral-bg hover:bg-neutral-border/20 focus:bg-white text-sm px-3.5 py-2 rounded-button border border-neutral-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal outline-none transition-all placeholder:text-neutral-text-muted text-neutral-text-dark resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-dark">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-neutral-bg hover:bg-neutral-border/20 text-sm px-3.5 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                    >
                      <option value="">Select a category…</option>
                      {challengeCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-text-muted mt-1">
                      Managed in Administration → Categories. New categories appear here instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">Pillar</label>
                      <SelectField
                        value={formData.pillar}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, pillar: value as 'E' | 'S' | 'G' }))}
                        options={[
                          { value: 'E', label: 'Environmental (E)' },
                          { value: 'S', label: 'Social Impact (S)' },
                          { value: 'G', label: 'Governance (G)' },
                        ]}
                        triggerClassName="w-full h-10 bg-neutral-bg text-sm px-3.5 py-2 rounded-button border-neutral-border text-neutral-text-dark"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">Difficulty</label>
                      <SelectField
                        value={formData.difficulty}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value as any }))}
                        options={[
                          { value: 'Easy', label: 'Easy' },
                          { value: 'Medium', label: 'Medium' },
                          { value: 'Hard', label: 'Hard' },
                        ]}
                        triggerClassName="w-full h-10 bg-neutral-bg text-sm px-3.5 py-2 rounded-button border-neutral-border text-neutral-text-dark"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">XP Awarded</label>
                      <input
                        type="number"
                        min={10}
                        required
                        value={formData.xp}
                        onChange={(e) => setFormData(prev => ({ ...prev, xp: Number(e.target.value) }))}
                        className="w-full bg-neutral-bg hover:bg-neutral-border/20 focus:bg-white text-sm px-3.5 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">ESG Points</label>
                      <input
                        type="number"
                        min={10}
                        required
                        value={formData.points}
                        onChange={(e) => setFormData(prev => ({ ...prev, points: Number(e.target.value) }))}
                        className="w-full bg-neutral-bg hover:bg-neutral-border/20 focus:bg-white text-sm px-3.5 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">Start Date</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-neutral-bg hover:bg-neutral-border/20 text-sm px-3.5 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-text-dark">End Date</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-neutral-bg hover:bg-neutral-border/20 text-sm px-3.5 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-neutral-text-dark">Initial Status</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-neutral-text-dark cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.status === 'Draft'}
                          onChange={() => setFormData(prev => ({ ...prev, status: 'Draft' }))}
                          className="h-4 w-4 accent-primary-teal cursor-pointer"
                        />
                        <span>Draft</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-neutral-text-dark cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.status === 'Active'}
                          onChange={() => setFormData(prev => ({ ...prev, status: 'Active' }))}
                          className="h-4 w-4 accent-primary-teal cursor-pointer"
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-neutral-border bg-neutral-bg/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 border border-neutral-border hover:bg-neutral-border/30 font-semibold text-xs px-4 py-3 rounded-button text-neutral-text-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateChallenge}
                  className="flex-1 bg-primary-teal hover:bg-teal-700 text-white font-semibold text-xs px-4 py-3 rounded-button transition-all shadow-sm"
                >
                  Save Challenge
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
