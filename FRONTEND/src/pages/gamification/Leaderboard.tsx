import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { leaderboardService, RankedRow } from '../../services/leaderboardService';
import { motion } from 'motion/react';
import {
  Trophy,
  Users,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Award,
  Crown,
  Star,
  Zap,
  Building,
  Target
} from 'lucide-react';

export default function Leaderboard() {
  const { user } = useApp();

  // States
  const [viewMode, setViewMode] = useState<'individual' | 'department'>('individual');
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [individualRaw, setIndividualRaw] = useState<RankedRow[]>([]);
  const [departmentRaw, setDepartmentRaw] = useState<RankedRow[]>([]);

  const avatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D9488&color=fff`;

  // Ledger-computed rankings from the backend, refreshed by period.
  useEffect(() => {
    let active = true;
    Promise.all([
      leaderboardService.get('individual', period).catch(() => []),
      leaderboardService.get('department', period).catch(() => []),
    ]).then(([ind, dep]) => {
      if (!active) return;
      setIndividualRaw(ind);
      setDepartmentRaw(dep);
    });
    return () => { active = false; };
  }, [period]);

  const individualRankings = useMemo(() => {
    return individualRaw.map((r) => ({
      id: r.id,
      name: r.name,
      email: '',
      avatar: avatar(r.name),
      points: r.total,
      level: 1 + Math.floor(r.total / 300),
      department: r.department ?? '—',
      isCurrentUser: user?.name === r.name,
    }));
  }, [individualRaw, user]);

  const departmentRankings = useMemo(() => {
    return departmentRaw.map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: 0,
      points: r.total,
      avatar: avatar(r.name),
      avgPoints: r.total,
      isCurrentUserDept: false,
    }));
  }, [departmentRaw]);

  // Extract Podium top 3
  const topThree = useMemo(() => {
    if (viewMode === 'individual') {
      return {
        first: individualRankings[0] || null,
        second: individualRankings[1] || null,
        third: individualRankings[2] || null,
        remainder: individualRankings.slice(3)
      };
    } else {
      return {
        first: departmentRankings[0] || null,
        second: departmentRankings[1] || null,
        third: departmentRankings[2] || null,
        remainder: departmentRankings.slice(3)
      };
    }
  }, [viewMode, individualRankings, departmentRankings]);

  // Timeframe labels helper
  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'this week';
      case 'month': return 'this month';
      case 'all': return 'all time';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans relative" id="leaderboard-page">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-600">
              <Trophy className="h-5 w-5 fill-current animate-pulse text-amber-500" />
            </span>
            <h1 className="text-2xl font-bold text-neutral-text-dark tracking-tight">Leaderboard Standings</h1>
          </div>
          <p className="text-sm text-neutral-text-muted max-w-xl">
            Celebrate active corporate performance! See how you or your department ranks across ESG achievements, challenges, and audit goals.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Individual vs Dept Toggle */}
          <div className="bg-neutral-bg border border-neutral-border p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-white text-primary-teal shadow-sm'
                  : 'text-neutral-text-muted hover:text-neutral-text-dark'
              }`}
            >
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Individual
              </span>
            </button>
            <button
              onClick={() => setViewMode('department')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'department'
                  ? 'bg-white text-primary-teal shadow-sm'
                  : 'text-neutral-text-muted hover:text-neutral-text-dark'
              }`}
            >
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> Department
              </span>
            </button>
          </div>

          {/* Period Toggles */}
          <div className="bg-neutral-bg border border-neutral-border p-1 rounded-xl flex">
            {(['week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-primary-teal text-white shadow-sm'
                    : 'text-neutral-text-muted hover:text-neutral-text-dark'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Visual Podium for top 3 candidates */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-6 max-w-4xl mx-auto py-8 px-4 bg-gradient-to-b from-neutral-bg/30 to-white border border-neutral-border rounded-2xl shadow-inner relative">
        <div className="absolute top-4 left-4 flex items-center gap-1 text-[11px] font-bold text-neutral-text-muted bg-white px-2.5 py-1 rounded-full border border-neutral-border shadow-xs">
          <Target className="h-3.5 w-3.5 text-primary-teal" /> Standings {getPeriodLabel()}
        </div>

        {/* SECOND PLACE (Rank #2) - Left */}
        {topThree.second && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center order-2 md:order-1"
          >
            {/* Candidate avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-neutral-200 blur-lg opacity-30 group-hover:opacity-50 rounded-full" />
              <img
                src={topThree.second.avatar}
                alt={topThree.second.name}
                className="relative h-16 w-16 rounded-full object-cover border-2 border-neutral-300 ring-4 ring-neutral-100 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-2 -right-1 bg-neutral-300 border border-neutral-400 text-neutral-800 p-1 rounded-full text-[10px] font-black h-6 w-6 flex items-center justify-center shadow-xs">
                2
              </span>
            </div>

            <div className="text-center mt-4 space-y-0.5">
              <h3 className="text-xs font-extrabold text-neutral-text-dark leading-tight truncate max-w-[140px]">
                {topThree.second.name}
              </h3>
              <p className="text-[10px] text-neutral-text-muted leading-tight font-medium">
                {viewMode === 'individual' ? (topThree.second as any).department : `${(topThree.second as any).memberCount} members`}
              </p>
            </div>

            {/* Simulated Podium step */}
            <div className="w-full bg-neutral-bg border border-neutral-border/60 rounded-t-xl h-24 mt-4 flex flex-col items-center justify-center p-3 shadow-inner">
              <Star className="h-5 w-5 text-neutral-400 mb-1" />
              <span className="text-sm font-extrabold font-mono text-neutral-text-dark">
                {topThree.second.points} <span className="text-[10px] font-medium text-neutral-text-muted">pts</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* FIRST PLACE (Rank #1) - Center */}
        {topThree.first && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center order-1 md:order-2"
          >
            {/* Candidate avatar */}
            <div className="relative group z-10">
              {/* Crown animation overlay */}
              <motion.div
                animate={{ y: [-2, 1, -2] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500"
              >
                <Crown className="h-7 w-7 fill-current drop-shadow-sm" />
              </motion.div>
              <div className="absolute inset-0 bg-amber-400 blur-xl opacity-30 group-hover:opacity-50 rounded-full animate-pulse" />
              <img
                src={topThree.first.avatar}
                alt={topThree.first.name}
                className="relative h-20 w-20 rounded-full object-cover border-4 border-amber-400 ring-4 ring-amber-100 shadow-md"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-2 -right-1 bg-amber-400 border border-amber-500 text-amber-950 p-1.5 rounded-full text-xs font-black h-7 w-7 flex items-center justify-center shadow-sm">
                1
              </span>
            </div>

            <div className="text-center mt-4 space-y-0.5">
              <h3 className="text-sm font-black text-neutral-text-dark leading-tight flex items-center justify-center gap-1">
                {topThree.first.name} <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" />
              </h3>
              <p className="text-[10px] text-neutral-text-muted leading-tight font-semibold">
                {viewMode === 'individual' ? (topThree.first as any).department : `${(topThree.first as any).memberCount} members`}
              </p>
            </div>

            {/* Simulated Podium step */}
            <div className="w-full bg-gradient-to-t from-teal-50 to-white border-2 border-primary-teal/40 rounded-t-2xl h-32 mt-4 flex flex-col items-center justify-center p-3 shadow-md relative">
              <Crown className="h-6 w-6 text-amber-500 mb-1" />
              <span className="text-base font-extrabold font-mono text-teal-900">
                {topThree.first.points} <span className="text-xs font-semibold text-teal-800">pts</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* THIRD PLACE (Rank #3) - Right */}
        {topThree.third && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center order-3"
          >
            {/* Candidate avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-orange-200 blur-lg opacity-30 group-hover:opacity-50 rounded-full" />
              <img
                src={topThree.third.avatar}
                alt={topThree.third.name}
                className="relative h-14 w-14 rounded-full object-cover border-2 border-amber-600 ring-4 ring-orange-50 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1.5 -right-1 bg-amber-600 border border-amber-700 text-white p-1 rounded-full text-[9px] font-black h-5.5 w-5.5 flex items-center justify-center shadow-xs">
                3
              </span>
            </div>

            <div className="text-center mt-4 space-y-0.5">
              <h3 className="text-xs font-extrabold text-neutral-text-dark leading-tight truncate max-w-[140px]">
                {topThree.third.name}
              </h3>
              <p className="text-[10px] text-neutral-text-muted leading-tight font-medium">
                {viewMode === 'individual' ? (topThree.third as any).department : `${(topThree.third as any).memberCount} members`}
              </p>
            </div>

            {/* Simulated Podium step */}
            <div className="w-full bg-neutral-bg border border-neutral-border/60 rounded-t-xl h-20 mt-4 flex flex-col items-center justify-center p-3 shadow-inner">
              <Award className="h-5 w-5 text-amber-600 mb-1" />
              <span className="text-sm font-extrabold font-mono text-neutral-text-dark">
                {topThree.third.points} <span className="text-[10px] font-medium text-neutral-text-muted">pts</span>
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Ranked Standings list */}
      <div className="bg-white border border-neutral-border rounded-2xl shadow-sm overflow-hidden max-w-4xl mx-auto">
        <div className="px-5 py-4 border-b border-neutral-border bg-neutral-bg/20 flex justify-between items-center">
          <span className="text-xs font-bold text-neutral-text-dark uppercase tracking-wider">Ranked Standings</span>
          <span className="text-[10px] text-neutral-text-muted font-bold font-mono">Rank #4 to #{topThree.remainder.length + 3}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-bg text-neutral-text-muted uppercase text-[9px] font-bold tracking-wider border-b border-neutral-border">
                <th className="px-6 py-3.5 text-center w-16">Rank</th>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">{viewMode === 'individual' ? 'Department' : 'Members'}</th>
                {viewMode === 'individual' && <th className="px-6 py-3.5 text-center">Level</th>}
                <th className="px-6 py-3.5 text-right">Points Standings</th>
              </tr>
            </thead>
            <tbody>
              {topThree.remainder.map((row, idx) => {
                const rankNum = idx + 4;
                const isCurrentUser = (row as any).isCurrentUser;
                const isCurrentUserDept = (row as any).isCurrentUserDept;
                
                // Highlight row style if it's the current user session
                const highlightStyle = (isCurrentUser || isCurrentUserDept)
                  ? 'bg-teal-50/55 hover:bg-teal-50 border-y border-primary-teal/20'
                  : 'border-b border-neutral-border/60 hover:bg-neutral-bg/30';

                return (
                  <tr key={row.id} className={`transition-colors ${highlightStyle}`}>
                    <td className="px-6 py-4 text-center font-mono text-xs font-black text-neutral-text-dark">
                      {rankNum}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        src={row.avatar}
                        alt={row.name}
                        className="h-8 w-8 rounded-full object-cover border border-neutral-border"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-text-dark">{row.name}</span>
                        {isCurrentUser && (
                          <span className="bg-primary-teal text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95 shadow-xs">
                            You
                          </span>
                        )}
                        {isCurrentUserDept && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95">
                            My Dept
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-text-muted font-medium">
                      {viewMode === 'individual' ? (row as any).department : `${(row as any).memberCount} active colleagues`}
                    </td>
                    {viewMode === 'individual' && (
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-mono">
                          Lvl {(row as any).level}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs font-black text-neutral-text-dark font-mono">
                          {row.points} <span className="text-[10px] text-neutral-text-muted font-normal">pts</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 font-extrabold flex items-center font-mono">
                          <TrendingUp className="h-3 w-3" /> +15%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {topThree.remainder.length === 0 && (
                <tr>
                  <td colSpan={viewMode === 'individual' ? 5 : 4} className="py-12 text-center text-xs text-neutral-text-muted">
                    No remainder ranks found. Complete more metrics to expand rankings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
