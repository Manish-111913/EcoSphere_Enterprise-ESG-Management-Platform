import React, { useEffect, useState } from 'react';
import { Award, CheckCircle, Clock, FileText, ArrowLeftRight, Flame, RefreshCw, Compass } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { ActivityFeedItem } from '../types';

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      try {
        const list = await dashboardService.getRecentActivities();
        setActivities(list);
      } catch (err) {
        console.error('Failed to fetch activity feed', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'badge_unlock':
        return <Award className="h-4 w-4 text-amber-600" />;
      case 'transaction':
        return <ArrowLeftRight className="h-4 w-4 text-emerald-600" />;
      case 'policy_ack':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'compliance_resolved':
        return <CheckCircle className="h-4 w-4 text-indigo-600" />;
      case 'challenge_completed':
        return <Flame className="h-4 w-4 text-orange-600" />;
      default:
        return <Compass className="h-4 w-4 text-neutral-text-muted" />;
    }
  };

  const getPillarBadge = (pillar: 'E' | 'S' | 'G' | 'General') => {
    switch (pillar) {
      case 'E':
        return (
          <span className="text-[9px] bg-pillar-e/10 text-pillar-e border border-pillar-e/20 px-1.5 py-0.2 rounded font-bold font-sans">
            E Pillar
          </span>
        );
      case 'S':
        return (
          <span className="text-[9px] bg-pillar-s/10 text-pillar-s border border-pillar-s/20 px-1.5 py-0.2 rounded font-bold font-sans">
            S Pillar
          </span>
        );
      case 'G':
        return (
          <span className="text-[9px] bg-pillar-g/10 text-pillar-g border border-pillar-g/20 px-1.5 py-0.2 rounded font-bold font-sans">
            G Pillar
          </span>
        );
      default:
        return (
          <span className="text-[9px] bg-neutral-bg border border-neutral-border text-neutral-text-muted px-1.5 py-0.2 rounded font-bold font-sans">
            General
          </span>
        );
    }
  };

  return (
    <div
      id="recent-activity-feed"
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-text-dark">Recent Activity Feed</h3>
          <p className="text-xs text-neutral-text-muted">Real-time audit log of corporate actions</p>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-neutral-text-muted" />
          <span className="text-[10px] text-neutral-text-muted font-bold font-sans">Live</span>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="h-64 w-full flex flex-col items-center justify-center gap-2 text-neutral-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-teal" />
          <span className="text-xs">Loading activities...</span>
        </div>
      ) : (
        <div className="relative pl-4 space-y-5 border-l border-neutral-border/65 ml-2 max-h-[360px] overflow-y-auto pr-1">
          {activities.map(act => (
            <div key={act.id} className="relative group text-left">
              {/* Timeline dot */}
              <div className="absolute -left-[24px] top-1 bg-white border border-neutral-border rounded-full p-1 shadow-xs group-hover:scale-110 transition-transform">
                {getActivityIcon(act.type)}
              </div>

              {/* Card Container */}
              <div className="p-2.5 rounded-lg hover:bg-neutral-bg transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-neutral-text-dark group-hover:text-primary-teal transition-colors">
                    {act.title}
                  </span>
                  {getPillarBadge(act.pillar)}
                </div>
                <p className="text-xs text-neutral-text-muted leading-relaxed">
                  {act.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <img
                    src={act.user.avatar}
                    alt={act.user.name}
                    referrerPolicy="no-referrer"
                    className="w-4.5 h-4.5 rounded-full border border-neutral-border object-cover bg-neutral-bg"
                  />
                  <span className="text-[10px] text-neutral-text-muted">
                    {act.user.name} • {act.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
