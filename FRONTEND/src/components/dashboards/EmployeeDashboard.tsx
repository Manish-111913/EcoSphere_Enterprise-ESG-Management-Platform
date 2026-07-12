import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trophy, Award, Flame, Gift, FileText, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { useToast } from '../ui-kit/Toast';
import { mockChallenges, mockBadges, mockBadgeAwards, mockPolicies, mockPolicyAcknowledgements, mockRewards, mockEmployees } from '../../mocks/db';

export default function EmployeeDashboard() {
  const { user, refreshUser } = useApp();
  const { addToast } = useToast();

  const [points, setPoints] = useState(user?.points || 720);
  const [xp, setXp] = useState(user?.xp || 4100);
  const [level, setLevel] = useState(user?.level || 9);

  // Compute progress to next level (each level requires level * 1000 XP)
  const currentLevelMinXp = (level - 1) * 1000;
  const nextLevelXp = level * 1000;
  const levelProgress = ((xp - currentLevelMinXp) / 1000) * 100;

  // Active challenges
  const activeChallenges = mockChallenges.filter(c => c.status === 'Active');

  // Earned badges
  const earnedBadgeIds = mockBadgeAwards.filter(ba => ba.employeeId === 'emp-1').map(ba => ba.badgeId);
  const earnedBadges = mockBadges.filter(b => earnedBadgeIds.includes(b.id));

  // Pending policy signoffs
  const pendingAcks = mockPolicyAcknowledgements.filter(a => a.employeeId === 'emp-1' && a.status === 'Pending');
  const pendingPolicies = mockPolicies.filter(p => pendingAcks.some(a => a.policyId === p.id));

  // Affordable rewards
  const affordableRewards = mockRewards.filter(r => r.pointsCost <= points && r.stock > 0);

  // Mini Leaderboard
  const sortedEmployees = [...mockEmployees].sort((a, b) => b.points - a.points);
  const ownRankIdx = sortedEmployees.findIndex(e => e.name === user?.name);
  const ownRank = ownRankIdx !== -1 ? ownRankIdx + 1 : 9;

  const handleJoinChallenge = (title: string, xpReward: number) => {
    addToast({
      title: 'Joined Challenge',
      description: `You have successfully joined the challenge "${title}". Earn +${xpReward} XP on completion!`,
      type: 'success'
    });
  };

  const handleSignPolicy = (id: string, title: string) => {
    addToast({
      title: 'Policy Acknowledged',
      description: `You signed off on "${title}" successfully. Your compliance status is active.`,
      type: 'success'
    });
    // Visual state update
    pendingPolicies.filter(p => p.id !== id);
  };

  const handleRedeemReward = (id: string, title: string, cost: number) => {
    if (points < cost) return;
    setPoints(prev => prev - cost);
    addToast({
      title: 'Redemption Success',
      description: `Redeemed "${title}" for ${cost} points. A confirmation email was sent!`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-6">
      {/* 🌟 Gamified Welcome & XP Level Progress Bar Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-950 text-white p-6 rounded-2xl shadow-md text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-xl"><Star className="h-6 w-6 text-amber-300 fill-amber-300 animate-spin-slow" /></span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200">Level {level} Sustainability Champion</span>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5 truncate">Welcome back, {user?.name}</h2>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-100">
              <span>{xp} XP Earned</span>
              <span>Next Level: {nextLevelXp} XP</span>
            </div>
            <div className="w-full bg-teal-950/50 rounded-full h-3 p-0.5 overflow-hidden border border-emerald-500/30">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-white/10 border border-white/15 p-4 rounded-xl backdrop-blur-sm self-start md:self-center">
          <div className="text-center font-sans">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Available Points</span>
            <span className="text-3xl font-black text-amber-300 block mt-1 tabular-nums">{points} pts</span>
          </div>
        </div>
      </div>

      {/* Main Employee Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Active Challenges + Badges Shelf */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Challenges */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-neutral-border pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-text-dark">Your Active ESG Challenges</h3>
                <p className="text-xs text-neutral-text-muted">Participate and complete to earn carbon points and level XP</p>
              </div>
              <span className="text-xs font-bold text-primary-teal hover:underline cursor-pointer flex items-center gap-1">
                View All <ArrowRight size={14} />
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeChallenges.map((ch: any) => (
                <div key={ch.id} className="border border-neutral-border hover:border-teal-500 rounded-xl p-4 flex flex-col justify-between bg-neutral-bg/20 transition-all group relative">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200`}>
                        {ch.pillar} - {ch.difficulty}
                      </span>
                      <span className="text-xs font-black text-teal-600">+{ch.xp} XP</span>
                    </div>
                    <h4 className="text-xs font-bold text-neutral-text-dark mt-2.5 group-hover:text-teal-700 transition-colors">{ch.title}</h4>
                    <p className="text-[11px] text-neutral-text-muted mt-1 leading-relaxed">{ch.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-border/50 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-text-muted font-mono font-medium">Reward: {ch.points} pts</span>
                    <button
                      onClick={() => handleJoinChallenge(ch.title, ch.xp)}
                      className="px-3 py-1 bg-primary-teal hover:bg-primary-teal-hover text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                    >
                      Join challenge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges Shelf */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
              Your Unlocked Badges Shelf
            </h3>
            {earnedBadges.length === 0 ? (
              <div className="text-center py-6 text-neutral-text-muted text-xs">
                No badges unlocked yet. Keep completing challenges to show them here!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {earnedBadges.map((badge: any) => (
                  <div key={badge.id} className="border border-neutral-border/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center bg-teal-50/10">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200 shadow-sm mb-2.5">
                      <Award className="h-6 w-6 text-amber-600 animate-pulse" />
                    </div>
                    <span className="text-[11px] font-bold text-neutral-text-dark leading-tight block truncate w-full">{badge.name}</span>
                    <span className="text-[9px] text-emerald-600 font-bold mt-1 block">+{badge.pointsAward} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Leaderboard + Signoffs + Affordable Rewards */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pending Acknowledgements / Policy Sign-offs */}
          {pendingPolicies.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm text-left">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-amber-700 animate-bounce" />
                <span className="text-xs font-bold text-amber-800">Pending Policy Sign-Offs</span>
              </div>
              <div className="space-y-3">
                {pendingPolicies.map((pol) => (
                  <div key={pol.id} className="bg-white border border-amber-200 rounded-lg p-3 text-xs shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-text-muted font-bold block">{pol.id} · v{pol.version}</span>
                      <span className="font-bold text-neutral-text-dark mt-0.5 block leading-snug">{pol.title}</span>
                    </div>
                    <button
                      onClick={() => handleSignPolicy(pol.id, pol.title)}
                      className="mt-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] rounded-md transition-colors"
                    >
                      Acknowledge & Sign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini Leaderboard */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-3">
              Employee Leaderboard Rank
            </h3>
            <div className="space-y-2.5">
              {sortedEmployees.slice(0, 4).map((emp, idx) => (
                <div key={emp.id} className={`flex items-center justify-between p-2 rounded-lg ${
                  emp.name === user?.name ? 'bg-teal-50 border border-teal-200 font-bold' : ''
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden truncate">
                    <span className="text-xs font-bold font-mono text-neutral-text-muted w-4">#{idx+1}</span>
                    <img src={emp.avatar} alt={emp.name} className="w-6 h-6 rounded-full border border-neutral-border shrink-0" />
                    <span className="text-xs text-neutral-text-dark truncate leading-none">{emp.name}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-teal-700 shrink-0">{emp.points} pts</span>
                </div>
              ))}
              {ownRank > 4 && (
                <div className="border-t border-neutral-border/50 pt-2 flex items-center justify-between p-2 bg-teal-50 border border-teal-200 font-bold rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden truncate">
                    <span className="text-xs font-bold font-mono text-neutral-text-muted w-4">#{ownRank}</span>
                    <img src={user?.avatar} alt={user?.name} className="w-6 h-6 rounded-full border border-neutral-border shrink-0" />
                    <span className="text-xs text-neutral-text-dark truncate leading-none">{user?.name} (You)</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-teal-700 shrink-0">{points} pts</span>
                </div>
              )}
            </div>
          </div>

          {/* Affordable Rewards */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-3">
              Affordable Rewards Catalog
            </h3>
            <div className="space-y-3">
              {affordableRewards.slice(0, 3).map((reward) => (
                <div key={reward.id} className="border border-neutral-border rounded-lg p-2 flex items-center gap-3 bg-neutral-bg/20">
                  <img src={reward.image} alt={reward.title} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-neutral-border" />
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-xs font-bold text-neutral-text-dark truncate block leading-none">{reward.title}</span>
                    <span className="text-[10px] text-amber-600 font-bold block mt-1">{reward.pointsCost} pts</span>
                  </div>
                  <button
                    onClick={() => handleRedeemReward(reward.id, reward.title, reward.pointsCost)}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                  >
                    Redeem
                  </button>
                </div>
              ))}
              {affordableRewards.length === 0 && (
                <div className="text-center py-4 text-neutral-text-muted text-[11px]">
                  No rewards available for your current point total. Keep earning!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
