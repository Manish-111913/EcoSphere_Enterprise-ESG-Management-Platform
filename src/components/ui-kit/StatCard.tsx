import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { StatCardData } from '../../types';

interface StatCardProps {
  data: StatCardData;
  onViewDetails?: () => void;
}

export default function StatCard({ data, onViewDetails }: StatCardProps) {
  const { title, value, delta, isPositive, sparkline, unit } = data;

  // Custom count-up animation for numeric values
  const [displayValue, setDisplayValue] = useState<string>('0');

  useEffect(() => {
    // Check if the value is a number (ignoring commas)
    const numericStr = value.replace(/,/g, '');
    const isNum = !isNaN(Number(numericStr));

    if (!isNum) {
      setDisplayValue(value);
      return;
    }

    const target = Number(numericStr);
    const duration = 800; // ms
    const stepTime = 16; // ~60fps
    const steps = duration / stepTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.round(target * easeProgress);

      if (currentStep >= steps) {
        setDisplayValue(value); // final exact formatting
        clearInterval(timer);
      } else {
        setDisplayValue(currentVal.toLocaleString());
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  // Is decreasing good? Usually for carbon emissions/compliance issues yes, so isPositive is explicitly passed
  // We determine colors purely on isPositive flag passed in metadata.
  const isTrendGood = isPositive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-neutral-border hover:border-primary-teal/40 transition-all rounded-2xl p-5 shadow-sm hover:shadow flex flex-col justify-between relative overflow-hidden group"
      id={`stat-card-${data.id}`}
    >
      {/* Decorative accent top line on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary-teal scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

      {/* Top Section: Title & Details Action Button */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-neutral-text-muted leading-relaxed">
          {title}
        </span>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="p-1 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition opacity-0 group-hover:opacity-100 shrink-0"
            title="View drilldown details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Center Section: Main Metric with Count up animation */}
      <div className="flex items-baseline gap-1.5 mt-3.5">
        <span className="text-3xl font-black text-neutral-text-dark tracking-tighter">
          {displayValue}
        </span>
        {unit && (
          <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider font-sans">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Section: Trend Indicator & Sparkline */}
      <div className="flex items-center justify-between gap-4 mt-4">
        {/* Delta change block */}
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
          isTrendGood
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {isTrendGood ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          <span>{delta}</span>
        </div>

        {/* Optional Micro-Sparkline */}
        {sparkline && sparkline.length > 0 && (
          <div className="h-8 w-24 shrink-0 flex items-end">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`gradient-${data.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isTrendGood ? '#10b981' : '#ef4444'} stopOpacity="0.2"/>
                  <stop offset="100%" stopColor={isTrendGood ? '#10b981' : '#ef4444'} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path
                d={generateSvgPath(sparkline, 100, 30)}
                fill="none"
                stroke={isTrendGood ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`${generateSvgPath(sparkline, 100, 30)} L 100 30 L 0 30 Z`}
                fill={`url(#gradient-${data.id})`}
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Generate coordinate-matched SVG polyline paths from an array of numbers
function generateSvgPath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  // Padding inside graph bounding box
  const pad = 2;
  const graphHeight = height - pad * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    // Invert Y coordinate so higher values are higher visually
    const y = height - pad - ((val - min) / range) * graphHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${points.join(' L ')}`;
}
