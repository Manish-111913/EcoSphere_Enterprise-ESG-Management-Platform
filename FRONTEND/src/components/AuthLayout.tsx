import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "EcoSphere has completely transformed how we track, analyze, and report our ESG indicators across all six global offices.",
    author: "Priya Sharma",
    role: "ESG Manager, Acme Corp"
  },
  {
    quote: "The interactive challenges and badges have gamified sustainability, keeping our employees highly engaged and committed to carbon reduction.",
    author: "Marcus Aurelius",
    role: "Operations Director, EcoSystems"
  },
  {
    quote: "With automated compliance issue tracking and audit logs, we passed our external sustainability audit in record time and with zero warnings.",
    author: "Reginald Vance",
    role: "Chief Compliance Officer"
  }
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
      {/* Left Brand Panel: 45% on Desktop, slim top banner on Mobile */}
      <div className="w-full md:w-[45%] bg-gradient-to-tr from-teal-900 via-emerald-800 to-teal-700 text-white p-6 md:p-12 flex flex-col justify-between relative overflow-hidden shadow-2xl shrink-0">
        {/* Subtle abstract geometric decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10 justify-center md:justify-start">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
            <Leaf className="text-emerald-300 w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-teal-100 bg-clip-text text-transparent">
              EcoSphere
            </span>
            <p className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-semibold -mt-1">
              ESG Management Suite
            </p>
          </div>
        </div>

        {/* Center Section: Graphic + Quotes (Desktop only) */}
        <div className="hidden md:flex flex-col gap-10 my-auto relative z-10 py-8">
          {/* Mini ESG Gauge Graphic */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 max-w-sm mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-emerald-100">Live ESG Score</span>
              <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Level A+
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Animated Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3.5"
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 15 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold tracking-tight">85</span>
                  <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold">Excellent</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span className="text-neutral-300">Environmental</span>
                  <span className="font-semibold text-white">88%</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span className="text-neutral-300">Social Pillar</span>
                  <span className="font-semibold text-white">82%</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-neutral-300">Governance Index</span>
                  <span className="font-semibold text-white">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Quote slider */}
          <div className="min-h-[120px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
                className="space-y-3"
              >
                <p className="text-emerald-100 font-medium italic text-sm leading-relaxed">
                  "{TESTIMONIALS[index].quote}"
                </p>
                <div>
                  <h4 className="font-bold text-sm text-white">{TESTIMONIALS[index].author}</h4>
                  <p className="text-xs text-emerald-300">{TESTIMONIALS[index].role}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Footer info */}
        <div className="hidden md:block text-[11px] text-emerald-300/60 font-medium text-center md:text-left relative z-10">
          &copy; 2026 EcoSphere Inc. All rights reserved. Secure ESG platform for modern teams.
        </div>
      </div>

      {/* Right White Form Panel: 55% */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-[420px] py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
