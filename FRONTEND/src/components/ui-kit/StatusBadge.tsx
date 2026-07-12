import React from 'react';

export interface StatusValue {
  code: string;
  label: string;
  color: string; // Tailwind class name, e.g., 'bg-red-100 text-red-800' or border classes
}

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { code, label, color } = status;

  // Extract a background/dot color from tailwind classes if we can,
  // or simply rely on the color class provided by lookup data directly.
  // We can render a neat capsule containing a colored pulse dot + text.
  
  // Clean parsing to add a dot color based on database text values (e.g. if color contains 'bg-emerald-100', dot should be 'bg-emerald-500')
  const getDotColorClass = () => {
    if (color.includes('emerald')) return 'bg-emerald-500';
    if (color.includes('green')) return 'bg-green-500';
    if (color.includes('red')) return 'bg-red-500';
    if (color.includes('amber')) return 'bg-amber-500';
    if (color.includes('yellow')) return 'bg-yellow-400';
    if (color.includes('blue')) return 'bg-blue-500';
    if (color.includes('orange')) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-current/10 font-black uppercase text-[10px] tracking-wider shrink-0 select-none ${color} ${className}`}
      id={`status-badge-${code.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${getDotColorClass()}`} />
      <span>{label}</span>
    </span>
  );
}
