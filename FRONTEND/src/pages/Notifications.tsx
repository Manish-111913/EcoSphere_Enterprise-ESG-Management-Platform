import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui-kit/Toast';
import {
  Bell, Check, Eye, Trash2, CheckCircle2, AlertTriangle, Info, ShieldCheck, Filter, MailOpen
} from 'lucide-react';

export default function Notifications() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const { addToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'info' | 'warning' | 'success' | 'danger'>('all');

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.read;
    return n.type === activeFilter;
  });

  const handleMarkAll = () => {
    markAllNotificationsAsRead();
    addToast({
      title: 'Success',
      description: 'All notifications marked as read.',
      type: 'success'
    });
  };

  const handleMarkSingle = (id: string, title: string) => {
    markNotificationAsRead(id);
    addToast({
      title: 'Opened notification',
      description: `Marked "${title}" as read.`,
      type: 'info'
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'danger':
        return <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-neutral-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-neutral-text-dark tracking-tight flex items-center gap-2">
            <Bell className="text-primary-teal animate-pulse" /> Notifications Center
          </h1>
          <p className="text-xs text-neutral-text-muted mt-1">
            Stay updated with system triggers, peer challenge achievements, and compliance status warnings.
          </p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 self-start transition-colors"
          >
            <MailOpen size={14} /> Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeFilter === 'all' ? 'border-primary-teal text-primary-teal' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeFilter === 'unread' ? 'border-primary-teal text-primary-teal' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          Unread ({notifications.filter(n => !n.read).length})
        </button>
        <button
          onClick={() => setActiveFilter('success')}
          className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeFilter === 'success' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          Success
        </button>
        <button
          onClick={() => setActiveFilter('warning')}
          className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeFilter === 'warning' ? 'border-amber-500 text-amber-500' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          Warnings
        </button>
        <button
          onClick={() => setActiveFilter('danger')}
          className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeFilter === 'danger' ? 'border-rose-600 text-rose-600' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          Critical
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.map(notif => (
          <div
            key={notif.id}
            onClick={() => !notif.read && handleMarkSingle(notif.id, notif.title)}
            className={`border rounded-xl p-4 flex items-start gap-3.5 transition-all relative overflow-hidden text-left ${
              notif.read
                ? 'bg-white border-neutral-border text-neutral-text-muted opacity-80'
                : 'bg-teal-50/10 border-teal-500/30 hover:border-teal-500 cursor-pointer shadow-sm'
            }`}
          >
            {/* Unread strip indicator */}
            {!notif.read && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-teal" />
            )}

            {getIcon(notif.type)}

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className={`text-xs font-black ${notif.read ? 'text-neutral-text-dark' : 'text-teal-950'}`}>
                  {notif.title}
                </span>
                <span className="text-[10px] font-mono text-neutral-text-muted font-bold shrink-0">{notif.time}</span>
              </div>
              <p className="text-xs text-neutral-text-muted leading-relaxed">
                {notif.description}
              </p>
            </div>

            {!notif.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkSingle(notif.id, notif.title);
                }}
                className="p-1 hover:bg-teal-50 text-neutral-text-muted hover:text-primary-teal rounded transition-colors self-center shrink-0"
                title="Mark Read"
              >
                <Check size={14} />
              </button>
            )}
          </div>
        ))}

        {filteredNotifs.length === 0 && (
          <div className="text-center py-16 text-neutral-text-muted border border-dashed border-neutral-border rounded-xl bg-neutral-bg/25 p-8 flex flex-col items-center justify-center gap-2">
            <Bell className="h-8 w-8 text-neutral-border animate-pulse" />
            <span className="text-xs font-bold">No Notifications Found</span>
            <p className="text-[11px] text-neutral-text-muted max-w-xs mt-1 leading-normal">
              You are completely caught up! New events and compliance reports will trigger real-time banners here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
