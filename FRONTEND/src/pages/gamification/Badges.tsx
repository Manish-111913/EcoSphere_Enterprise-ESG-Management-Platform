import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { gamificationService } from '../../services/gamificationService';
import { Badge, Employee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import {
  Award,
  Lock,
  Plus,
  Eye,
  Settings,
  Sparkles,
  Trophy,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  AlertCircle,
  X
} from 'lucide-react';
import SelectField from '../../components/ui/select-field';

export default function Badges() {
  const { user, role, refreshUser } = useApp();
  const { settings } = useSettings();

  // Load state and lookups
  const badges = useMemo(() => gamificationService.getBadges(), []);
  const badgeAwards = useMemo(() => gamificationService.getBadgeAwards(), []);
  const employees = useMemo(() => gamificationService.getEmployees(), []);

  // Current Employee ID
  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.email === user.email) || null;
  }, [user, employees]);

  // States
  const [badgeList, setBadgeList] = useState<Badge[]>(badges);
  const [awardsList, setAwardsList] = useState(badgeAwards);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  
  // Celebration modal
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Admin Rule Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    icon: 'Leaf',
    metric: 'challenges_completed',
    operator: 'gte' as Badge['operator'],
    threshold: 5,
    pointsAward: 150
  });
  const [builderError, setBuilderError] = useState('');
  const [builderSuccess, setBuilderSuccess] = useState(false);

  // Sync data from database on load/changes
  const refreshData = () => {
    setBadgeList(gamificationService.getBadges());
    setAwardsList(gamificationService.getBadgeAwards());
  };

  useEffect(() => {
    refreshData();
  }, [isBuilderOpen]);

  // Compute metrics for current employee to render locks & progression percentages
  const employeeMetrics = useMemo(() => {
    if (!currentEmployee) return {};
    const participations = gamificationService.getParticipations().filter(p => p.employeeId === currentEmployee.id && p.status === 'Completed');
    const redemptions = gamificationService.getRewardRedemptions().filter(r => r.employeeId === currentEmployee.id && r.status === 'Completed');

    return {
      xp: currentEmployee.xp,
      level: currentEmployee.level,
      challenges_completed: participations.length,
      rewards_redeemed: redemptions.length,
      carbon_saved: Math.round(participations.length * 20),
      entries_logged: Math.round(currentEmployee.xp / 100),
      policies_signed: 5,
      zero_waste_score: 95,
      issues_closed: 3
    };
  }, [currentEmployee]);

  // Separate earned vs locked badges
  const badgeStates = useMemo(() => {
    return badgeList.map(badge => {
      const isEarned = currentEmployee
        ? awardsList.some(a => a.badgeId === badge.id && a.employeeId === currentEmployee.id)
        : false;

      // Progress value and fraction
      const userVal = employeeMetrics[badge.metric] ?? 0;
      const progressPercent = Math.min(Math.round((userVal / badge.threshold) * 100), 100);
      const progressFraction = `${userVal}/${badge.threshold}`;

      return {
        ...badge,
        isEarned,
        progressPercent,
        progressFraction
      };
    });
  }, [badgeList, awardsList, currentEmployee, employeeMetrics]);

  // Split into earned & locked lists
  const earnedBadges = useMemo(() => badgeStates.filter(b => b.isEarned), [badgeStates]);
  const lockedBadges = useMemo(() => badgeStates.filter(b => !b.isEarned), [badgeStates]);

  // Helper to render Lucide Icons dynamically
  const renderBadgeIcon = (iconName: string, className = "h-6 w-6") => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Award;
    return <IconComponent className={className} />;
  };

  // Metric labels lookup
  const getMetricLabel = (m: string) => {
    switch (m) {
      case 'xp': return 'Total XP';
      case 'level': return 'Platform Level';
      case 'challenges_completed': return 'Completed Challenges';
      case 'rewards_redeemed': return 'Redeemed Items';
      case 'carbon_saved': return 'CO₂e Carbon Saved';
      case 'entries_logged': return 'Tracking Entries Logged';
      case 'policies_signed': return 'Governance Policies Signed';
      case 'zero_waste_score': return 'Zero Waste Index Score';
      case 'issues_closed': return 'Closed Audit Issues';
      default: return m;
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setBuilderError('');
    setBuilderSuccess(false);

    if (!ruleForm.name || !ruleForm.description) {
      setBuilderError('Please supply a badge name and clear unlock description.');
      return;
    }

    if (ruleForm.threshold <= 0 || ruleForm.pointsAward <= 0) {
      setBuilderError('Threshold and points award values must be positive.');
      return;
    }

    try {
      const created = gamificationService.createBadgeRule(ruleForm);
      setBuilderSuccess(true);
      
      // If we want to simulate an unlock celebration of our newly created rule instantly
      setCelebrationBadge(created);
      setShowCelebration(true);

      // Reset
      setRuleForm({
        name: '',
        description: '',
        icon: 'Leaf',
        metric: 'challenges_completed',
        operator: 'gte',
        threshold: 5,
        pointsAward: 150
      });
      refreshData();
    } catch (err: any) {
      setBuilderError(err.message || 'An error occurred constructing badge rule.');
    }
  };

  // Demo tool: manually simulate a badge award celebration
  const simulateAward = (badge: Badge) => {
    setCelebrationBadge(badge);
    setShowCelebration(true);
  };

  const isReviewer = role === 'Admin' || role === 'CSR Manager';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans relative" id="badges-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-600">
              <Award className="h-5 w-5 fill-current animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold text-neutral-text-dark tracking-tight">Achievements & Badges</h1>
          </div>
          <p className="text-sm text-neutral-text-muted max-w-xl">
            Track unlocked company credentials. High compliance, challenges, and auditing metrics qualify you for premium badge status.
          </p>
        </div>

        {isReviewer && (
          <button
            onClick={() => setIsBuilderOpen(!isBuilderOpen)}
            className="bg-primary-teal hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-button shadow-sm flex items-center gap-2 shrink-0 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Settings className="h-4 w-4" />
            <span>{isBuilderOpen ? 'Close Rule Builder' : 'Badge Rule Builder'}</span>
          </button>
        )}
      </div>

      {/* Admin Unlock Rule Builder Section */}
      <AnimatePresence>
        {isReviewer && isBuilderOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white border border-neutral-border rounded-2xl p-6 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left side Form: 2 Columns */}
            <form onSubmit={handleCreateRule} className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-border pb-3">
                <Sliders className="h-4 w-4 text-primary-teal" />
                <h2 className="text-sm font-bold text-neutral-text-dark">Construct New Badge Rule</h2>
              </div>

              {builderError && (
                <div className="bg-red-50 text-red-800 p-2.5 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{builderError}</span>
                </div>
              )}

              {builderSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Badge rule registered successfully! Instant celebration triggered.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Badge Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSR Champion v1"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-neutral-bg focus:bg-white text-xs px-3 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Icon Symbol</label>
                  <SelectField
                    value={ruleForm.icon}
                    onValueChange={(value) => setRuleForm((prev) => ({ ...prev, icon: value }))}
                    options={[
                      { value: 'Leaf', label: 'Leaf (Sustainability)' },
                      { value: 'Zap', label: 'Zap (Energy Efficiency)' },
                      { value: 'Users', label: 'Users (Social impact)' },
                      { value: 'Trophy', label: 'Trophy (Achievements)' },
                      { value: 'ShieldCheck', label: 'ShieldCheck (Compliance Audit)' },
                      { value: 'Sparkles', label: 'Sparkles (Special bonus)' },
                      { value: 'Trash2', label: 'Trash2 (Zero Waste)' },
                      { value: 'CheckSquare', label: 'CheckSquare (Audit closed)' },
                    ]}
                    triggerClassName="w-full h-10 bg-neutral-bg text-xs px-3 py-2 border-neutral-border rounded-button text-neutral-text-dark"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-text-dark block">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Detail how employees earn this badge (e.g. Awarded for completing 5 active challenges)..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-neutral-bg focus:bg-white text-xs px-3 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Evaluation Metric</label>
                  <select
                    value={ruleForm.metric}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, metric: e.target.value }))}
                    className="w-full bg-neutral-bg text-xs px-3 py-2 border border-neutral-border rounded-button outline-none text-neutral-text-dark cursor-pointer"
                  >
                    <option value="challenges_completed">Completed Challenges</option>
                    <option value="xp">Total XP accumulated</option>
                    <option value="level">Platform Level reached</option>
                    <option value="carbon_saved">Carbon CO₂e Saved</option>
                    <option value="rewards_redeemed">Redeemed Items</option>
                    <option value="zero_waste_score">Zero Waste Score</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Rule Condition</label>
                  <div className="flex bg-neutral-bg border border-neutral-border rounded-button items-center px-3 py-2 text-xs font-medium text-neutral-text-muted">
                    <span>Must be Greater than or Equal ( &gt;= )</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Target Threshold Value</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    className="w-full bg-neutral-bg focus:bg-white text-xs px-3 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 border-t border-neutral-border pt-4">
                <div className="space-y-1 w-1/3">
                  <label className="text-[11px] font-bold text-neutral-text-dark block">Points Payout Bonus</label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={ruleForm.pointsAward}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, pointsAward: Number(e.target.value) }))}
                    className="w-full bg-neutral-bg focus:bg-white text-xs px-3 py-2 rounded-button border border-neutral-border outline-none transition-all text-neutral-text-dark"
                  />
                </div>
                
                <button
                  type="submit"
                  className="bg-primary-teal hover:bg-teal-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-button shadow-sm shrink-0 transition-all hover:scale-[1.02] mt-5"
                >
                  Create Badge Rule
                </button>
              </div>
            </form>

            {/* Right side Live Preview Container */}
            <div className="bg-neutral-bg/60 p-5 rounded-2xl border border-neutral-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-text-muted block mb-3">Rule Live Preview</span>
                
                {/* Simulated Grid Card component */}
                <div className="bg-white border border-neutral-border rounded-xl p-4 text-center space-y-3.5 shadow-sm max-w-[200px] mx-auto">
                  <div className="relative inline-flex items-center justify-center h-14 w-14 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-full mx-auto shadow-md">
                    {renderBadgeIcon(ruleForm.icon, "h-7 w-7")}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-neutral-text-dark truncate">
                      {ruleForm.name || 'Untitled Badge'}
                    </h4>
                    <p className="text-[10px] text-neutral-text-muted leading-tight line-clamp-2">
                      {ruleForm.description || 'Provide a badge rules description...'}
                    </p>
                  </div>

                  <span className="inline-block text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    +{ruleForm.pointsAward} pts bonus
                  </span>
                </div>
              </div>

              <div className="text-[10px] leading-relaxed text-neutral-text-muted pt-4 border-t border-neutral-border/50 text-center">
                This live card previews exactly what the employee will see when credentials unlock automatically.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges Grid Panels */}
      <div className="space-y-8">
        
        {/* Earned Achievements Panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-text-dark uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>My Unlocked Badges ({earnedBadges.length})</span>
          </h2>
          
          {earnedBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {earnedBadges.map(badge => (
                <motion.div
                  key={badge.id}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-neutral-border rounded-2xl p-4 text-center space-y-3 hover:shadow-md transition-all relative group cursor-pointer"
                  onClick={() => setSelectedBadge(badge as any)}
                >
                  <div className="relative inline-flex items-center justify-center h-12 w-12 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-full mx-auto shadow-sm group-hover:scale-105 transition-transform duration-200">
                    {renderBadgeIcon(badge.icon, "h-6 w-6")}
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full ring-2 ring-white">
                      <Sparkles className="h-3 w-3 fill-current" />
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="font-bold text-xs text-neutral-text-dark font-sans leading-snug truncate">
                      {badge.name}
                    </h3>
                    <p className="text-[10px] text-neutral-text-muted leading-tight line-clamp-1">
                      {badge.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      +{badge.pointsAward} pts bonus
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 bg-white border border-neutral-border rounded-2xl text-center space-y-2">
              <Trophy className="h-8 w-8 text-neutral-text-muted/50 mx-auto" />
              <h3 className="font-bold text-xs text-neutral-text-dark">No credentials unlocked yet</h3>
              <p className="text-[11px] text-neutral-text-muted max-w-sm mx-auto">
                Complete audit issues, challenges, and emissions logging to unlock your first custom achievement badges!
              </p>
            </div>
          )}
        </div>

        {/* Locked Badges Panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-text-dark uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-neutral-text-muted" />
            <span>Locked Badges ({lockedBadges.length})</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {lockedBadges.map(badge => (
              <motion.div
                key={badge.id}
                whileHover={{ y: -1 }}
                className="bg-neutral-bg border border-neutral-border/80 rounded-2xl p-4 text-center space-y-3 shadow-sm hover:shadow-md transition-all group relative cursor-pointer"
                onClick={() => setSelectedBadge(badge as any)}
              >
                {/* Desaturated Greyscale lock container */}
                <div className="relative inline-flex items-center justify-center h-12 w-12 bg-neutral-100 text-neutral-text-muted border border-neutral-border rounded-full mx-auto">
                  {renderBadgeIcon(badge.icon, "h-6 w-6 grayscale opacity-60")}
                  <span className="absolute -bottom-1 -right-1 bg-neutral-200 text-neutral-text-muted p-0.5 rounded-full border border-white">
                    <Lock className="h-3 w-3" />
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-bold text-xs text-neutral-text-dark font-sans leading-snug truncate">
                    {badge.name}
                  </h3>
                  <p className="text-[10px] text-neutral-text-muted leading-tight line-clamp-1">
                    {getMetricLabel(badge.metric)}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1.5">
                  <div className="flex items-center justify-between text-[9px] text-neutral-text-muted font-bold font-mono">
                    <span>Unlock Progress</span>
                    <span>{badge.progressFraction}</span>
                  </div>
                  <div className="w-full bg-neutral-border h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-text-muted/50 h-full rounded-full transition-all"
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Simulated Award test trigger for sandbox testing */}
                {isReviewer && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      simulateAward(badge);
                    }}
                    className="absolute inset-x-4 bottom-2 opacity-0 group-hover:opacity-100 bg-white border border-neutral-border text-[9px] font-extrabold text-teal-600 hover:bg-teal-50 py-1 rounded transition-opacity"
                  >
                    Test Celebration UI
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Badge Detail Dialog */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
            className="fixed inset-0 bg-neutral-text-dark/60 z-50 flex items-center justify-center p-6 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-neutral-border p-6 shadow-2xl max-w-sm w-full text-center space-y-6 relative"
            >
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className={`relative inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto shadow-sm ${
                (selectedBadge as any).isEarned
                  ? 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-white'
                  : 'bg-neutral-100 text-neutral-text-muted border border-neutral-border'
              }`}>
                {renderBadgeIcon(selectedBadge.icon, "h-8 w-8")}
                {!(selectedBadge as any).isEarned && (
                  <span className="absolute -bottom-1 -right-1 bg-neutral-200 text-neutral-text-muted p-0.5 rounded-full border border-white">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-neutral-text-dark leading-none">{selectedBadge.name}</h3>
                <span className="inline-block text-[10px] font-bold text-neutral-text-muted mt-1">
                  Credential ID: {selectedBadge.id.toUpperCase()}
                </span>
                <p className="text-xs text-neutral-text-muted leading-relaxed pt-2">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="bg-neutral-bg/60 p-4 rounded-xl border border-neutral-border/50 text-left space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-neutral-text-dark block border-b border-neutral-border pb-1">
                  Unlock Rule Specs
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-text-muted">Metric Condition:</span>
                  <span className="font-semibold text-neutral-text-dark">{getMetricLabel(selectedBadge.metric)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-text-muted">Target Threshold:</span>
                  <span className="font-semibold text-neutral-text-dark">&gt;= {selectedBadge.threshold}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-text-muted">Esg Points Payout:</span>
                  <span className="font-extrabold text-teal-600">+{selectedBadge.pointsAward} pts</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBadge(null)}
                className="w-full bg-primary-teal hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-button shadow-sm"
              >
                Close Details
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Unlock Dialog with Scaling Medallion (Pure motion) */}
      <AnimatePresence>
        {showCelebration && celebrationBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-text-dark/80 z-55 flex items-center justify-center p-6 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: -5 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 relative border border-neutral-border shadow-2xl overflow-hidden"
            >
              {/* Confetti sparkle backgrounds */}
              <div className="absolute inset-0 bg-radial-gradient from-teal-500/10 to-transparent pointer-events-none" />

              <button
                onClick={() => setShowCelebration(false)}
                className="absolute right-4 top-4 p-1 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative inline-block pt-4">
                {/* Glowing aura */}
                <div className="absolute inset-0 bg-teal-400 blur-2xl opacity-50 animate-pulse rounded-full" />
                
                {/* Huge Scaling Medallion */}
                <motion.div
                  initial={{ scale: 0.6 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative h-24 w-24 bg-gradient-to-tr from-teal-500 via-emerald-400 to-yellow-300 rounded-full flex items-center justify-center shadow-2xl border-4 border-white shrink-0 mx-auto"
                >
                  {renderBadgeIcon(celebrationBadge.icon, "h-12 w-12 text-white fill-current")}
                </motion.div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-500 block animate-bounce">
                  Achievement Unlocked!
                </span>
                <h3 className="font-sans font-black text-xl text-neutral-text-dark tracking-tight">
                  {celebrationBadge.name}
                </h3>
                <p className="text-xs text-neutral-text-muted leading-relaxed max-w-xs mx-auto">
                  Outstanding performance! You completed the criteria threshold. The credential has been added to your permanent ledger.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-2xl flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 fill-current shrink-0" />
                <span className="text-xs font-extrabold text-amber-900 font-sans">
                  Credited Payout: +{celebrationBadge.pointsAward} Points
                </span>
              </div>

              <button
                onClick={() => {
                  setShowCelebration(false);
                  refreshUser();
                }}
                className="w-full bg-primary-teal hover:bg-teal-700 text-white font-extrabold text-xs py-3 rounded-button shadow-sm transition-all hover:scale-[1.02]"
              >
                Claim Payout & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
