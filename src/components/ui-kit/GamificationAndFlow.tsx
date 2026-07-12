import React from 'react';
import { Award, Lock, Check, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../../types';

// ==========================================
// 1. XP BAR (with level markers)
// ==========================================
interface XPBarProps {
  currentXp: number;
  nextLevelXp: number;
  currentLevel: number;
  id?: string;
}

export function XPBar({ currentXp, nextLevelXp, currentLevel, id = 'xp-bar' }: XPBarProps) {
  const percentage = Math.min(100, Math.max(0, (currentXp / nextLevelXp) * 100));

  return (
    <div className="space-y-2.5 text-left w-full" id={id}>
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-primary-teal/15 text-primary-teal border border-primary-teal/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
            Level {currentLevel}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-text-muted">
          XP: <strong className="text-neutral-text-dark font-mono">{currentXp}</strong> / {nextLevelXp}
        </span>
      </div>

      <div className="relative">
        {/* Main Track */}
        <div className="h-2.5 w-full bg-neutral-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary-teal to-emerald-500 rounded-full"
          />
        </div>

        {/* Level Milestone markers */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1/4 h-4 w-4 rounded-full border-2 border-white bg-neutral-border flex items-center justify-center text-[8px] font-bold text-neutral-text-muted cursor-help" title="25% Milestone achieved" />
        <div className="absolute top-1/2 -translate-y-1/2 left-2/4 h-4 w-4 rounded-full border-2 border-white bg-neutral-border flex items-center justify-center text-[8px] font-bold text-neutral-text-muted cursor-help" title="50% Milestone achieved" />
        <div className="absolute top-1/2 -translate-y-1/2 left-3/4 h-4 w-4 rounded-full border-2 border-white bg-neutral-border flex items-center justify-center text-[8px] font-bold text-neutral-text-muted cursor-help" title="75% Milestone achieved" />
      </div>
    </div>
  );
}

// ==========================================
// 2. BADGE MEDALLION (earned = color / locked = grayscale + unlock-rule tooltip)
// ==========================================
interface BadgeMedallionProps {
  badge: Badge;
  isEarned: boolean;
  awardedAt?: string;
  id?: string;
}

export function BadgeMedallion({ badge, isEarned, awardedAt, id }: BadgeMedallionProps) {
  const { name, description, icon, metric, operator, threshold, pointsAward } = badge;

  // Resolve Lucide icon dynamically from the library
  const IconComponent = (LucideIcons as any)[icon] || Award;

  const getOperatorSymbol = () => {
    switch (operator) {
      case 'gt': return '>';
      case 'gte': return '≥';
      case 'lt': return '<';
      case 'lte': return '≤';
      case 'eq': return '=';
      default: return '≥';
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'xp': return 'XP';
      case 'carbon_saved': return 'kg CO2e Saved';
      case 'challenges_completed': return 'Challenges Completed';
      case 'entries_logged': return 'Emissions Logs';
      case 'policies_signed': return 'Signed Policies';
      case 'zero_waste_score': return 'Zero Waste Score';
      case 'issues_closed': return 'Compliance Issues Closed';
      default: return metric;
    }
  };

  return (
    <div
      className="relative group flex flex-col items-center p-4 bg-white border border-neutral-border hover:border-primary-teal/30 transition rounded-2xl select-none"
      id={id || `badge-medallion-${badge.id}`}
    >
      {/* Medallion Frame */}
      <div className={`relative h-16 w-16 rounded-full flex items-center justify-center border-4 shadow-sm transition-all duration-300 ${
        isEarned
          ? 'bg-primary-teal/10 border-primary-teal text-primary-teal group-hover:scale-105 group-hover:shadow-md'
          : 'bg-neutral-bg/40 border-neutral-border text-neutral-text-muted/50 grayscale'
      }`}>
        <IconComponent className="h-7 w-7" />

        {/* Small Lock overlay for locked badges */}
        {!isEarned && (
          <div className="absolute -bottom-1 -right-1 bg-white border border-neutral-border rounded-full p-1 shadow">
            <Lock className="h-3 w-3 text-neutral-text-muted" />
          </div>
        )}
      </div>

      {/* Badge Name */}
      <h4 className={`text-xs font-black mt-3 text-center tracking-tight leading-tight ${
        isEarned ? 'text-neutral-text-dark' : 'text-neutral-text-muted'
      }`}>
        {name}
      </h4>

      {/* Unlock Tooltip (Visible on Hover) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-neutral-text-dark text-white rounded-xl p-3 shadow-xl text-left pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 flex flex-col gap-1.5 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-primary-teal">
            {isEarned ? 'Earned Badge' : 'Locked Badge'}
          </span>
          <span className="text-[9px] font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded font-mono">
            +{pointsAward} PTS
          </span>
        </div>
        <p className="text-[10px] font-black text-white">{name}</p>
        <p className="text-[10px] text-white/70 leading-normal">{description}</p>
        
        <div className="h-px bg-white/10 my-1" />
        
        <div className="flex items-center justify-between text-[9px] font-bold">
          <span className="text-white/50">Unlock Rule:</span>
          <span className="text-white font-mono uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {getMetricLabel()} {getOperatorSymbol()} {threshold}
          </span>
        </div>

        {isEarned && awardedAt && (
          <div className="flex items-center justify-between text-[9px] font-bold mt-1 text-emerald-400">
            <span>Unlocked:</span>
            <span>{new Date(awardedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. PROGRESS RING
// ==========================================
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  centerSubtext?: string;
  id?: string;
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 10,
  centerText,
  centerSubtext,
  id = 'progress-ring'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" id={id}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-neutral-border"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground active fill circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary-teal"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>

      {/* Core textual overlay in center */}
      <div className="absolute text-center flex flex-col items-center justify-center">
        <span className="text-xl font-black text-neutral-text-dark tracking-tighter">
          {centerText || `${Math.round(percentage)}%`}
        </span>
        {centerSubtext && (
          <span className="text-[9px] font-black uppercase text-neutral-text-muted tracking-wider mt-0.5 leading-none">
            {centerSubtext}
          </span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. TIMELINE
// ==========================================
export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  color?: string; // status background color lookup
  meta?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  id?: string;
}

export function Timeline({ items, id = 'timeline-root' }: TimelineProps) {
  return (
    <div className="relative border-l border-neutral-border pl-6 space-y-6 text-left" id={id}>
      {items.map((item, index) => (
        <div key={item.id} className="relative group">
          {/* Timeline Node dot */}
          <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-teal ring-4 ring-primary-teal/10 group-hover:scale-110 transition-transform" />

          {/* Timeline content capsule */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-neutral-text-dark group-hover:text-primary-teal transition">
                {item.title}
              </span>
              <span className="text-[10px] text-neutral-text-muted font-bold tracking-tight">
                {item.timestamp}
              </span>
            </div>
            
            <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
              {item.description}
            </p>

            {item.meta && <div className="pt-1">{item.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 5. STEPPER
// ==========================================
interface StepperProps {
  steps: string[];
  activeStep: number; // 1-indexed
  id?: string;
}

export function Stepper({ steps, activeStep, id = 'stepper-root' }: StepperProps) {
  return (
    <div className="flex items-center w-full" id={id}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < activeStep;
        const isActive = stepNum === activeStep;

        return (
          <React.Fragment key={step}>
            {/* Step circle container */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all duration-300 ${
                isCompleted
                  ? 'bg-primary-teal border-primary-teal text-white'
                  : isActive
                    ? 'border-primary-teal text-primary-teal bg-primary-teal/5 shadow-md ring-4 ring-primary-teal/10'
                    : 'bg-white border-neutral-border text-neutral-text-muted'
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider mt-2.5 whitespace-nowrap absolute top-full ${
                isActive ? 'text-primary-teal' : 'text-neutral-text-muted'
              }`}>
                {step}
              </span>
            </div>

            {/* Connecting connector line */}
            {index < steps.length - 1 && (
              <div className="flex-grow h-0.5 mx-4 bg-neutral-border relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 bg-primary-teal transition-all duration-500 ${
                  isCompleted ? 'w-full' : 'w-0'
                }`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
