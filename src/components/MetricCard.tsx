import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCardData } from '../types';

export default function MetricCard({ data }: { data: StatCardData }) {
  const { title, value, delta, isPositive, sparkline, unit } = data;

  // Render svg sparkline
  const renderSparkline = () => {
    if (!sparkline || sparkline.length === 0) return null;
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min === 0 ? 1 : max - min;
    const height = 28;
    const width = 96;
    const points = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * width;
        const y = height - ((val - min) / range) * height + 1; // 1px padding
        return `${x},${y}`;
      })
      .join(' ');

    const strokeColor = isPositive ? '#16A34A' : '#DC2626';

    return (
      <svg className="h-7 w-24 overflow-visible shrink-0" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      id={`metric-card-${data.id}`}
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">{title}</span>
        {isPositive ? (
          <span className="flex items-center gap-0.5 text-xs font-bold text-semantic-success bg-semantic-success/10 px-2 py-0.5 rounded-full font-sans">
            <ArrowUpRight className="h-3 w-3 shrink-0" />
            {delta}
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-xs font-bold text-semantic-danger bg-semantic-danger/10 px-2 py-0.5 rounded-full font-sans">
            <ArrowDownRight className="h-3 w-3 shrink-0" />
            {delta}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-neutral-text-dark font-sans tracking-tight tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-neutral-text-muted">
              {unit}
            </span>
          )}
        </div>
        <div className="pt-1.5">{renderSparkline()}</div>
      </div>
    </div>
  );
}
