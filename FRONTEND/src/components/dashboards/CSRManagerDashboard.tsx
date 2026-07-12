import React, { useState } from 'react';
import { Award, Trophy, Users, CheckCircle, XCircle, Calendar, Gift, Flame, ShieldAlert, GraduationCap } from 'lucide-react';
import { useToast } from '../ui-kit/Toast';
import { mockChallenges, mockCsrActivities, mockCsrParticipations, mockEmployees } from '../../mocks/db';
import { socialMetricsService } from '../../services/socialMetricsService';

export default function CSRManagerDashboard() {
  const { addToast } = useToast();
  
  const [challenges, setChallenges] = useState(() => {
    const cached = localStorage.getItem('ecosphere_challenges');
    return cached ? JSON.parse(cached) : mockChallenges;
  });

  const [participations, setParticipations] = useState(() => {
    const cached = localStorage.getItem('ecosphere_csr_participations');
    return cached ? JSON.parse(cached) : mockCsrParticipations;
  });

  const pendingParticipations = participations.filter((p: any) => p.status === 'Pending');

  const updateParticipationStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    const updated = participations.map((p: any) =>
      p.id === id ? { ...p, status: newStatus } : p
    );
    setParticipations(updated);
    localStorage.setItem('ecosphere_csr_participations', JSON.stringify(updated));
    addToast({
      title: `Submission ${newStatus}`,
      description: `CSR Participation record ${id} has been ${newStatus.toLowerCase()}.`,
      type: newStatus === 'Approved' ? 'success' : 'info'
    });
  };

  const activeChallenges = challenges.filter((c: any) => c.status === 'Active');
  const activeCsr = mockCsrActivities.filter(a => a.status === 'Active');
  const trainingCompletion = socialMetricsService.trainingCompletionPct('All');

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Total CSR Events</span>
            <span className="p-1.5 bg-green-50 text-green-700 rounded-lg"><Calendar size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{mockCsrActivities.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">activities</span>
          </div>
          <p className="text-[11px] text-green-600 font-bold mt-1.5">
            {activeCsr.length} currently active events
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Active Challenges</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg"><Flame size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{activeChallenges.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">running</span>
          </div>
          <p className="text-[11px] text-neutral-text-muted mt-1.5">
            Driving social & eco awareness
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Pending Submissions</span>
            <span className="p-1.5 bg-red-50 text-red-700 rounded-lg"><ShieldAlert size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{pendingParticipations.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">to review</span>
          </div>
          <p className="text-[11px] text-red-600 font-bold mt-1.5">
            Requires proof image verification
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Total Participation Rate</span>
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg"><Users size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">84%</span>
            <span className="text-xs font-bold text-neutral-text-muted">staff rate</span>
          </div>
          <p className="text-[11px] text-purple-600 font-bold mt-1.5">
            +5.2% vs previous quarter
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Training Completion</span>
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg"><GraduationCap size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{trainingCompletion}%</span>
            <span className="text-xs font-bold text-neutral-text-muted">org-wide</span>
          </div>
          <p className="text-[11px] text-teal-600 font-bold mt-1.5">
            Mandatory learning coverage
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Challenges List */}
        <div className="lg:col-span-6 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            Active Sustainability Challenges
          </h3>
          <div className="space-y-3">
            {activeChallenges.map((ch: any) => (
              <div key={ch.id} className="border border-neutral-border rounded-lg p-3.5 flex items-start justify-between gap-4">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-text-dark">{ch.title}</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                      {ch.pillar}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-text-muted mt-1 leading-snug">{ch.description}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-neutral-text-muted">
                    <span className="bg-neutral-bg px-2 py-0.5 rounded font-mono font-medium">Cost: {ch.points} pts</span>
                    <span className="font-medium">Ends: {ch.endDate}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-emerald-600">+{ch.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CSR Activities Tracker */}
        <div className="lg:col-span-6 bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
            CSR Activity Programs
          </h3>
          <div className="space-y-3">
            {mockCsrActivities.slice(0, 4).map((act: any) => (
              <div key={act.id} className="border border-neutral-border rounded-lg p-3.5 flex items-start justify-between gap-4">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-text-dark">{act.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      act.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-text-muted mt-1 leading-snug">{act.description}</p>
                  <span className="text-[10px] text-neutral-text-muted mt-2 block">Category: {act.category}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-teal-600 block">+{act.points} pts</span>
                  <span className="text-[10px] text-neutral-text-muted font-semibold block">+{act.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Participations Deck */}
      <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3 mb-4">
          Review Activity Participation Submissions
        </h3>
        {pendingParticipations.length === 0 ? (
          <div className="text-center py-8 text-neutral-text-muted text-xs">
            🎉 Excellent! All employee event participations are fully reviewed.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingParticipations.map((part: any) => {
              const emp = mockEmployees.find(e => e.id === part.employeeId);
              const act = mockCsrActivities.find(a => a.id === part.activityId);
              return (
                <div key={part.id} className="border border-neutral-border rounded-xl p-4 flex flex-col justify-between bg-neutral-bg/30">
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <img src={emp?.avatar} alt={emp?.name} className="w-8 h-8 rounded-full border border-neutral-border" />
                      <div>
                        <div className="text-xs font-bold text-neutral-text-dark">{emp?.name}</div>
                        <div className="text-[10px] text-neutral-text-muted">{emp?.email}</div>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-neutral-border/50 pt-2">
                      <div className="text-[10px] text-neutral-text-muted uppercase font-bold">Activity</div>
                      <div className="text-xs font-bold text-teal-700 mt-0.5">{act?.title}</div>
                      <p className="text-[10px] text-neutral-text-muted mt-0.5 leading-tight">{act?.description}</p>
                    </div>
                    {part.proofUrl && (
                      <div className="mt-3">
                        <span className="text-[10px] text-neutral-text-muted font-bold block mb-1">Uploaded Proof</span>
                        <img src={part.proofUrl} alt="Participation Proof" className="w-full h-24 object-cover rounded-lg border border-neutral-border bg-white" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-neutral-border/50 pt-3">
                    <button
                      onClick={() => updateParticipationStatus(part.id, 'Approved')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => updateParticipationStatus(part.id, 'Rejected')}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
