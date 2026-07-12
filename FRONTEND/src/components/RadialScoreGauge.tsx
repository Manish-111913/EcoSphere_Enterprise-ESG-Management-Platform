import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { EsgDetails } from '../mocks/dashboardData';

export default function RadialScoreGauge() {
  const [esg, setEsg] = useState<EsgDetails>({ total: 0, environmental: 0, social: 0, governance: 0, weights: { environmental: 40, social: 30, governance: 30 } });
  const { total, environmental, social, governance, weights } = esg;
  const [hoveredRing, setHoveredRing] = useState<string | null>(null);

  useEffect(() => {
    dashboardService.getEsgScoreDetails().then(setEsg).catch(() => { /* keep zeros */ });
  }, []);

  // Helper to compute SVG dasharray for radial rings
  const radiusE = 45;
  const radiusS = 36;
  const radiusG = 27;

  const circumference = (r: number) => 2 * Math.PI * r;

  const strokeDashOffset = (score: number, r: number) => {
    const circ = circumference(r);
    return circ - (score / 100) * circ;
  };

  return (
    <div
      id="org-esg-score-radial"
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-text-dark">Org ESG Score Details</h3>
          <p className="text-xs text-neutral-text-muted">Weighted performance of ESG pillars</p>
        </div>
        <div className="relative group cursor-help">
          <Info className="h-4.5 w-4.5 text-neutral-text-muted hover:text-neutral-text-dark transition-colors" />
          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-neutral-text-dark text-white text-[10px] font-medium p-2.5 rounded-lg w-52 shadow-xl z-50 leading-relaxed text-center">
            <span className="font-bold text-primary-teal block mb-1">Pillar Weights Configuration</span>
            E {weights.environmental}% · S {weights.social}% · G {weights.governance}%
            <span className="block text-[8px] text-neutral-text-muted mt-1">(Configurable in Admin settings)</span>
          </div>
        </div>
      </div>

      {/* Radial Gauge & Value Display */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {/* SVG concentric rings */}
        <div className="relative w-36 h-36 shrink-0 select-none">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Rings */}
            <circle cx="50" cy="50" r={radiusE} fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
            <circle cx="50" cy="50" r={radiusS} fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
            <circle cx="50" cy="50" r={radiusG} fill="transparent" stroke="#E2E8F0" strokeWidth="6" />

            {/* Environmental (Green) */}
            <circle
              cx="50"
              cy="50"
              r={radiusE}
              fill="transparent"
              stroke="#22C55E"
              strokeWidth="6"
              strokeDasharray={circumference(radiusE)}
              strokeDashoffset={strokeDashOffset(environmental, radiusE)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out cursor-pointer hover:stroke-[8]"
              onMouseEnter={() => setHoveredRing('environmental')}
              onMouseLeave={() => setHoveredRing(null)}
            />

            {/* Social (Blue) */}
            <circle
              cx="50"
              cy="50"
              r={radiusS}
              fill="transparent"
              stroke="#3B82F6"
              strokeWidth="6"
              strokeDasharray={circumference(radiusS)}
              strokeDashoffset={strokeDashOffset(social, radiusS)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out cursor-pointer hover:stroke-[8]"
              onMouseEnter={() => setHoveredRing('social')}
              onMouseLeave={() => setHoveredRing(null)}
            />

            {/* Governance (Purple) */}
            <circle
              cx="50"
              cy="50"
              r={radiusG}
              fill="transparent"
              stroke="#8B5CF6"
              strokeWidth="6"
              strokeDasharray={circumference(radiusG)}
              strokeDashoffset={strokeDashOffset(governance, radiusG)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out cursor-pointer hover:stroke-[8]"
              onMouseEnter={() => setHoveredRing('governance')}
              onMouseLeave={() => setHoveredRing(null)}
            />
          </svg>

          {/* Core Display Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
            {hoveredRing ? (
              <>
                <span className="text-xl font-extrabold text-neutral-text-dark font-sans tabular-nums">
                  {hoveredRing === 'environmental' ? environmental : hoveredRing === 'social' ? social : governance}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">
                  {hoveredRing === 'environmental' ? 'E Score' : hoveredRing === 'social' ? 'S Score' : 'G Score'}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-neutral-text-dark font-sans tabular-nums tracking-tighter">
                  {total}
                </span>
                <span className="text-[10px] text-neutral-text-muted font-bold font-sans">
                  Total ESG
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {/* Environmental */}
          <div
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              hoveredRing === 'environmental' ? 'bg-emerald-50' : ''
            }`}
            onMouseEnter={() => setHoveredRing('environmental')}
            onMouseLeave={() => setHoveredRing(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pillar-e shrink-0" />
              <span className="text-xs font-semibold text-neutral-text-dark">Environmental (E)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-neutral-text-dark tabular-nums">{environmental}%</span>
              <span className="text-[10px] text-neutral-text-muted block font-medium">Weight: {weights.environmental}%</span>
            </div>
          </div>

          {/* Social */}
          <div
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              hoveredRing === 'social' ? 'bg-blue-50' : ''
            }`}
            onMouseEnter={() => setHoveredRing('social')}
            onMouseLeave={() => setHoveredRing(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pillar-s shrink-0" />
              <span className="text-xs font-semibold text-neutral-text-dark">Social (S)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-neutral-text-dark tabular-nums">{social}%</span>
              <span className="text-[10px] text-neutral-text-muted block font-medium">Weight: {weights.social}%</span>
            </div>
          </div>

          {/* Governance */}
          <div
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              hoveredRing === 'governance' ? 'bg-purple-50' : ''
            }`}
            onMouseEnter={() => setHoveredRing('governance')}
            onMouseLeave={() => setHoveredRing(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pillar-g shrink-0" />
              <span className="text-xs font-semibold text-neutral-text-dark">Governance (G)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-neutral-text-dark tabular-nums">{governance}%</span>
              <span className="text-[10px] text-neutral-text-muted block font-medium">Weight: {weights.governance}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
