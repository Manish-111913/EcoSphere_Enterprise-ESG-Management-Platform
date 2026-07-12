import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Leaf,
  Users,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Flame,
  Award,
  Lock,
  HeartHandshake,
  Database,
  Play,
  FileSpreadsheet,
  AlertTriangle,
  Settings,
  Bell,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { XPBar } from '../components/ui-kit/GamificationAndFlow';

// Small carbon trend chart data
const chartData = [
  { month: 'Jan', value: 45 },
  { month: 'Feb', value: 40 },
  { month: 'Mar', value: 38 },
  { month: 'Apr', value: 32 },
  { month: 'May', value: 29 },
  { month: 'Jun', value: 24 }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Scroll effect for sticky navbar blur
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stats count up (simulated on load)
  const [stats, setStats] = useState({
    carbon: 1000,
    policy: 70,
    challenges: 200,
    departments: 5
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        carbon: 12400,
        policy: 94,
        challenges: 3200,
        departments: 45
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  // CTA Band Prefill Email
  const [ctaEmail, setCtaEmail] = useState('');

  const handleCtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ctaEmail.trim()) {
      navigate(`/signup?email=${encodeURIComponent(ctaEmail.trim())}`);
    } else {
      navigate('/signup');
    }
  };

  // Framer motion variants
  const fadeInUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15
      }
    }
  };

  return (
    <div className="bg-white min-h-screen text-neutral-text-dark font-sans selection:bg-teal-500/20 selection:text-teal-900 scroll-smooth antialiased">
      
      {/* 1. NAVBAR */}
      <nav
        id="landing-navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-neutral-border py-3 shadow-sm'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Left */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-tr from-teal-700 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-teal-700/10 shrink-0">
              <Leaf className="text-white h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <span className="font-sans font-extrabold text-xl tracking-tight text-neutral-text-dark block leading-none">
                EcoSphere
              </span>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest block mt-0.5">
                ESG Core Enterprise
              </span>
            </div>
          </div>

          {/* Desktop Center Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-neutral-text-muted hover:text-teal-800 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-neutral-text-muted hover:text-teal-800 transition-colors">
              How It Works
            </a>
            <a href="#modules" className="text-sm font-semibold text-neutral-text-muted hover:text-teal-800 transition-colors">
              Modules
            </a>
            <a href="#faq" className="text-sm font-semibold text-neutral-text-muted hover:text-teal-800 transition-colors">
              FAQ
            </a>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-bold text-neutral-text-muted hover:text-teal-800 transition-colors bg-transparent border-0"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-sm font-bold rounded-xl shadow-md shadow-teal-800/10 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Get started
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-neutral-border text-neutral-text-muted hover:text-neutral-text-dark hover:bg-neutral-bg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-neutral-border px-4 py-6 space-y-4 shadow-inner"
          >
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-neutral-text-muted hover:text-teal-800 py-1"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-neutral-text-muted hover:text-teal-800 py-1"
              >
                How It Works
              </a>
              <a
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-neutral-text-muted hover:text-teal-800 py-1"
              >
                Modules
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-neutral-text-muted hover:text-teal-800 py-1"
              >
                FAQ
              </a>
            </div>
            <hr className="border-neutral-border" />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="flex-1 py-2.5 text-sm font-bold text-neutral-text-muted hover:text-teal-800 bg-neutral-bg rounded-lg border border-neutral-border"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/signup');
                }}
                className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-sm font-bold rounded-lg text-center shadow"
              >
                Get started
              </button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section id="hero" className="relative pt-32 pb-24 md:pt-40 md:pb-36 bg-gradient-to-b from-teal-50/40 via-white to-white overflow-hidden">
        {/* Subtle blur background rings */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column (Copy) */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-teal-700 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                ESG Management Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tight text-neutral-text-dark leading-none">
              Measure, manage and improve your{' '}
              <span className="bg-gradient-to-r from-teal-800 to-emerald-500 bg-clip-text text-transparent">
                ESG performance
              </span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-text-muted leading-relaxed font-medium">
              Transform daily operations into clean, actionable, real-time ESG metrics. Automatically convert standard ERP activities into certified carbon transactions, gamify sustainable practices to ignite employee engagement, and build audit-ready compliance pathways effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-lg shadow-teal-800/15 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span>Get started free</span>
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 bg-white hover:bg-neutral-bg text-teal-800 font-bold rounded-xl border border-teal-800/20 transition-all hover:scale-[1.02] text-base text-center"
              >
                View live demo
              </button>
            </div>

            {/* Trust row */}
            <div className="pt-6 border-t border-neutral-border/80 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-text-muted">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>40/30/30 configurable scoring</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-text-muted">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Audit-ready reporting</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-text-muted">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>Gamified engagement</span>
              </div>
            </div>
          </div>

          {/* Right Column (Dashboard Mockup) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative radial gradients under the mockup */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-60" />

              {/* Mockup Frame container - rotated & float animated */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                className="relative bg-white border border-neutral-border shadow-2xl rounded-2xl overflow-hidden transform md:rotate-2 hover:rotate-0 transition-transform duration-500 z-10 text-left select-none"
              >
                {/* Browser top title bar */}
                <div className="bg-neutral-bg border-b border-neutral-border px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="text-[10px] text-neutral-text-muted font-bold font-mono px-4 py-0.5 bg-white border border-neutral-border/50 rounded-md">
                    app.ecosphere.com/dashboard
                  </div>
                  <div className="w-8" />
                </div>

                {/* Dashboard body mockup contents */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Top quick banner inside mockup */}
                  <div className="bg-teal-50/50 border border-teal-100/80 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-100 rounded-lg text-emerald-700">
                        <Leaf size={14} />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase block leading-none">Emission Saved</span>
                        <span className="text-xs font-extrabold text-teal-800 font-sans">14.2 tons saved</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                      +12% XP
                    </span>
                  </div>

                  {/* Concentric Gauge section (at 78 overall) */}
                  <div className="bg-neutral-bg/25 border border-neutral-border rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background rings */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                        <circle cx="50" cy="50" r="22" fill="none" stroke="#E2E8F0" strokeWidth="8" />

                        {/* Environmental - 85% */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#22C55E" strokeWidth="8" strokeDasharray="263.8" strokeDashoffset="39.5" strokeLinecap="round" />
                        {/* Social - 74% */}
                        <circle cx="50" cy="50" r="32" fill="none" stroke="#3B82F6" strokeWidth="8" strokeDasharray="201.0" strokeDashoffset="52.2" strokeLinecap="round" />
                        {/* Governance - 70% */}
                        <circle cx="50" cy="50" r="22" fill="none" stroke="#8B5CF6" strokeWidth="8" strokeDasharray="138.2" strokeDashoffset="41.4" strokeLinecap="round" />
                      </svg>
                      {/* Center value overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-black text-neutral-text-dark font-mono leading-none">78</span>
                        <span className="text-[8px] font-bold text-neutral-text-muted leading-none mt-0.5">ESG</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-text-dark flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Environmental
                        </span>
                        <span className="font-extrabold text-neutral-text-dark font-mono">85%</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-text-dark flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Social
                        </span>
                        <span className="font-extrabold text-neutral-text-dark font-mono">74%</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-text-dark flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Governance
                        </span>
                        <span className="font-extrabold text-neutral-text-dark font-mono">70%</span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Area Chart & Leaderboard */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-bg/25 border border-neutral-border rounded-xl p-2.5">
                      <span className="text-[8px] text-neutral-text-muted font-bold block uppercase tracking-wider mb-1">
                        Carbon Trend (CO2e)
                      </span>
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#0F766E" strokeWidth={1.5} fillOpacity={1} fill="url(#colorValue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <span className="text-[9px] font-black font-mono text-neutral-text-dark mt-1 block">
                        -46% this year
                      </span>
                    </div>

                    <div className="bg-neutral-bg/25 border border-neutral-border rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[8px] text-neutral-text-muted font-bold block uppercase tracking-wider">
                        Top Departments
                      </span>
                      <div className="space-y-1 mt-1 flex-grow flex flex-col justify-center">
                        <div className="flex items-center justify-between text-[9px] border-b border-neutral-border/40 pb-0.5">
                          <span className="font-semibold text-neutral-text-dark truncate">1. R&D Dept</span>
                          <span className="font-extrabold text-emerald-600 font-mono">84 pts</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] border-b border-neutral-border/40 pb-0.5">
                          <span className="font-semibold text-neutral-text-muted truncate">2. Logistics</span>
                          <span className="font-extrabold text-teal-600 font-mono">79 pts</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="font-semibold text-neutral-text-muted truncate">3. Facilities</span>
                          <span className="font-extrabold text-teal-600 font-mono">75 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard strip & Badge Medallion */}
                  <div className="flex items-center justify-between border-t border-neutral-border/80 pt-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-xs">
                        JD
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-text-dark font-extrabold block leading-tight">Jane Doe</span>
                        <span className="text-[9px] text-neutral-text-muted block font-medium leading-none">Employee · 2,450 XP</span>
                      </div>
                    </div>

                    {/* Badge medallion mock */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg">
                      <Award className="h-3.5 w-3.5 text-amber-500 fill-amber-50" />
                      <span className="text-[8px] font-black uppercase text-amber-800">
                        Carbon Zero Champion
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LOGO/STATS STRIP */}
      <section id="stats" className="border-y border-neutral-border bg-neutral-bg/35 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center">
            
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-teal-800 font-mono block tracking-tight">
                {stats.carbon.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm text-neutral-text-muted font-bold block uppercase tracking-wider">
                t CO₂e tracked
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono block tracking-tight">
                {stats.policy}%
              </span>
              <span className="text-xs sm:text-sm text-neutral-text-muted font-bold block uppercase tracking-wider">
                policy acknowledgement
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono block tracking-tight">
                {stats.challenges.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm text-neutral-text-muted font-bold block uppercase tracking-wider">
                challenges completed
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-purple-600 font-mono block tracking-tight">
                {stats.departments}
              </span>
              <span className="text-xs sm:text-sm text-neutral-text-muted font-bold block uppercase tracking-wider">
                departments scored
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 4. THREE PILLARS */}
      <section id="modules" className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black text-teal-700 uppercase tracking-widest block">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-text-dark tracking-tight">
              Configured around three pillars of ESG sustainability
            </h2>
            <p className="text-base text-neutral-text-muted leading-relaxed font-medium">
              A comprehensive system built to align metrics across environmental impact, social contribution, and legal transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* Environmental (Green) */}
            <div className="group bg-white border border-neutral-border rounded-2xl p-6 lg:p-8 hover:-translate-y-2 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Leaf className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-text-dark">Environmental (E)</h3>
                  <p className="text-xs text-neutral-text-muted font-medium leading-relaxed">
                    Automated greenhouse gas monitoring, tracking Scope 1, Scope 2, and Scope 3 emissions.
                  </p>
                </div>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Auto emissions transaction logger</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Configurable EPA & DEFRA emission factors</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Real-time corporate carbon targets</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-8 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1.5"
              >
                Learn more <ChevronRight size={14} />
              </button>
            </div>

            {/* Social (Blue) */}
            <div className="group bg-white border border-neutral-border rounded-2xl p-6 lg:p-8 hover:-translate-y-2 hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-text-dark">Social (S)</h3>
                  <p className="text-xs text-neutral-text-muted font-medium leading-relaxed">
                    Elevating corporate social responsibility, local events, and workforce training metrics.
                  </p>
                </div>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>CSR voluntary activity portal</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Attendance & engagement tracking</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Diversity & workplace equity index</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-8 text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1.5"
              >
                Learn more <ChevronRight size={14} />
              </button>
            </div>

            {/* Governance (Purple) */}
            <div className="group bg-white border border-neutral-border rounded-2xl p-6 lg:p-8 hover:-translate-y-2 hover:border-purple-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-text-dark">Governance (G)</h3>
                  <p className="text-xs text-neutral-text-muted font-medium leading-relaxed">
                    Ensuring strict adherence to regulatory rules, policy approvals, and external audits.
                  </p>
                </div>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>Policy distribution & acknowledgement</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>Compliance issues registry & workflow</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-neutral-text-muted font-semibold">
                    <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>Audit logs with deep historical trails</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-8 text-xs font-bold text-purple-600 group-hover:text-purple-700 flex items-center gap-1.5"
              >
                Learn more <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-neutral-bg/25 border-y border-neutral-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black text-teal-700 uppercase tracking-widest block">
              Continuous Loop
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-text-dark tracking-tight">
              How EcoSphere automates your sustainability lifecycle
            </h2>
            <p className="text-base text-neutral-text-muted leading-relaxed font-medium">
              From administrative rules to employee action, watch data flow seamlessly into reporting metrics.
            </p>
          </div>

          {/* Stepper horizontal timeline */}
          <div className="relative mt-8">
            {/* Timeline connector line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-neutral-border" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-4 group">
                <div className="h-16 w-16 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-lg font-black text-teal-800 ring-4 ring-teal-500/10 group-hover:scale-105 transition-transform z-10">
                  ①
                </div>
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-700">
                  <Settings size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-text-dark">Configure masters</h3>
                  <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold max-w-[200px]">
                    Define emission factors, department scopes, and legal policies.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-4 group">
                <div className="h-16 w-16 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-lg font-black text-teal-800 ring-4 ring-teal-500/10 group-hover:scale-105 transition-transform z-10">
                  ②
                </div>
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-700">
                  <Database size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-text-dark">Convert operations</h3>
                  <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold max-w-[200px]">
                    Activities convert automatically into carbon logs via emission factors.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-4 group">
                <div className="h-16 w-16 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-lg font-black text-teal-800 ring-4 ring-teal-500/10 group-hover:scale-105 transition-transform z-10">
                  ③
                </div>
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-700">
                  <Flame size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-text-dark">Employees engage</h3>
                  <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold max-w-[200px]">
                    Teams complete challenges, join CSR events, and earn XP and badges.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center space-y-4 group">
                <div className="h-16 w-16 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-lg font-black text-teal-800 ring-4 ring-teal-500/10 group-hover:scale-105 transition-transform z-10">
                  ④
                </div>
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-700">
                  <Award size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-text-dark">Score dashboard</h3>
                  <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold max-w-[200px]">
                    All data rolls up immediately into one comprehensive ESG score.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 6. GAMIFICATION SHOWCASE */}
      <section id="gamification-showcase" className="py-24 sm:py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Block: Copy */}
          <div className="space-y-6 text-left">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">
              Interactive Workplace Culture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Sustainability your employees actually enjoy
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              We bring play mechanics into corporate responsibility. Boost engagement, increase training sign-offs, and celebrate team climate successes. By combining experience points, milestone levels, interactive badges, and departmental leaderboards, eco-initiatives become an inspiring team-building game.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-1 border-l-2 border-emerald-500 pl-4">
                <span className="text-xl font-bold font-mono text-white block">Level Up</span>
                <span className="text-xs text-slate-400 font-semibold block">Employees progress with XP points</span>
              </div>
              <div className="space-y-1 border-l-2 border-emerald-500 pl-4">
                <span className="text-xl font-bold font-mono text-white block">Core Rewards</span>
                <span className="text-xs text-slate-400 font-semibold block">Redeem completed tasks for products</span>
              </div>
            </div>
          </div>

          {/* Right Block: Live Components */}
          <div className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-6 text-left">
              {/* Simulated Level Progress */}
              <div className="space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Active Employee XP Tracking
                </span>
                <XPBar currentXp={720} nextLevelXp={1000} currentLevel={4} />
              </div>

              {/* Three BadgeMedallions Mock */}
              <div className="grid grid-cols-3 gap-4">
                
                {/* Badge 1 (Earned) */}
                <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl flex flex-col items-center justify-between text-center select-none">
                  <div className="w-10 h-10 bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center shadow-sm">
                    <Leaf size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-white mt-2 leading-tight">
                    Eco Commuter
                  </span>
                  <span className="text-[8px] text-emerald-400 font-bold mt-1 uppercase">
                    +150 XP
                  </span>
                </div>

                {/* Badge 2 (Earned) */}
                <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl flex flex-col items-center justify-between text-center select-none">
                  <div className="w-10 h-10 bg-blue-500/15 border-2 border-blue-500 text-blue-400 rounded-full flex items-center justify-center shadow-sm">
                    <HeartHandshake size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-white mt-2 leading-tight">
                    CSR Anchor
                  </span>
                  <span className="text-[8px] text-blue-400 font-bold mt-1 uppercase">
                    +200 XP
                  </span>
                </div>

                {/* Badge 3 (Locked) */}
                <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl flex flex-col items-center justify-between text-center grayscale opacity-60 relative select-none">
                  <div className="w-10 h-10 bg-slate-800 border border-slate-700 text-slate-400 rounded-full flex items-center justify-center">
                    <Lock size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-2 leading-tight">
                    Audit Ready
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase">
                    Locked
                  </span>
                </div>

              </div>

              {/* Mini Podium Graphic */}
              <div className="border-t border-slate-700/60 pt-4 space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Weekly Leadership Board
                </span>

                <div className="flex items-end justify-center gap-2 pt-4 h-24">
                  {/* 2nd place */}
                  <div className="flex flex-col items-center w-20">
                    <span className="text-[9px] font-bold text-slate-300 mb-1">Marketing</span>
                    <div className="w-full h-10 bg-slate-700/80 rounded-t-lg flex items-center justify-center font-extrabold text-slate-300">
                      2nd
                    </div>
                  </div>

                  {/* 1st place */}
                  <div className="flex flex-col items-center w-24">
                    <span className="text-[9px] font-black text-amber-400 mb-1 flex items-center gap-0.5">
                      ★ R&D Dept
                    </span>
                    <div className="w-full h-16 bg-emerald-600/90 rounded-t-lg flex items-center justify-center font-extrabold text-white text-lg">
                      1st
                    </div>
                  </div>

                  {/* 3rd place */}
                  <div className="flex flex-col items-center w-20">
                    <span className="text-[9px] font-bold text-slate-400 mb-1">Logistics</span>
                    <div className="w-full h-8 bg-slate-800 rounded-t-lg flex items-center justify-center font-extrabold text-slate-400">
                      3rd
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 7. FEATURE GRID */}
      <section id="features" className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black text-teal-700 uppercase tracking-widest block">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-text-dark tracking-tight">
              A comprehensive ESG suite without compromise
            </h2>
            <p className="text-base text-neutral-text-muted leading-relaxed font-medium">
              We provide enterprise-grade capabilities built on top of absolute scoring flexibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 text-left">
            
            {/* Feature 1 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <Leaf size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Auto Emission Calculation</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Instantly map fuel consumption, freight logs, and utility energy to greenhouse gas transactions using configured DEFRA / EPA factors.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <FileSpreadsheet size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Custom Report Builder</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Generate complex multi-pillar compliance reports exportable instantly in fully formatted PDF, Microsoft Excel, and raw CSV.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <Users size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Role-based Dashboards</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Configured with 7 core access roles, from external auditors to corporate officers, giving each stakeholder exact data access.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <Bell size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Notification System</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Intelligent alerts flag expiring policies, carbon limit threshold violations, and review requirements instantly to responsible owners.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <Settings size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Configurable Rules</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Nothing hardcoded. Tailor weight balances across pillars, emission limits, and badge rules through our intuitive administrative hub.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-neutral-border p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl w-fit">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Immutable Audit Trail</h3>
              <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                Ensure perfect compliance reporting with a read-only historical database tracing every emission update, policy sign-off, and review action.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="py-24 sm:py-32 bg-neutral-bg/25 border-y border-neutral-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-12 text-left">
          <div className="text-center space-y-4">
            <span className="text-xs font-black text-teal-700 uppercase tracking-widest block">
              Support Center
            </span>
            <h2 className="text-3xl font-black text-neutral-text-dark tracking-tight text-center">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Is scoring configurable?',
                a: 'Yes, completely. Administrative officers can define customized weights (e.g., 40/30/30) across the Environmental, Social, and Governance pillars through our platform configurations to match your exact sector framework.'
              },
              {
                q: 'How is carbon calculated?',
                a: 'Carbon calculations are processed using configured EPA or DEFRA emission factors. Operation logs (e.g., fuel usage, flights) are transformed into exact tCO2e (tonnes of carbon dioxide equivalent) transactions upon entry.'
              },
              {
                q: 'Which roles are supported?',
                a: 'EcoSphere supports seven specific stakeholder roles: Administrator, ESG Manager, CSR Manager, Compliance Officer, Department Head, Employee, and External Auditor. Each enjoys custom-tailored views and access controls.'
              },
              {
                q: 'Can we export reports?',
                a: 'Absolutely. Stakeholders can generate structured compliance documents from our report builder and instantly download files in ready-to-share PDF layouts, complete spreadsheets (Excel), and structured data CSV formats.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-neutral-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-neutral-text-dark hover:bg-neutral-bg/50 transition-colors"
                >
                  <span className="text-sm font-semibold">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-neutral-text-muted transition-transform duration-300 ${
                      openFaq === idx ? 'rotate-180 text-teal-800' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-neutral-text-muted leading-relaxed font-medium border-t border-neutral-border/40">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA BAND */}
      <section id="cta-band" className="relative py-20 bg-gradient-to-r from-teal-800 to-emerald-700 text-white overflow-hidden text-center">
        {/* Subtle decorative mesh */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Start your ESG journey today
          </h2>
          <p className="text-sm sm:text-base text-teal-100 max-w-2xl mx-auto font-medium">
            Join forward-looking enterprises automating carbon tracking, elevating CSR participation, and cementing legal compliance.
          </p>

          <form onSubmit={handleCtaSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="email"
              required
              value={ctaEmail}
              onChange={e => setCtaEmail(e.target.value)}
              placeholder="Enter corporate email address"
              className="flex-grow px-4 py-3 text-xs text-neutral-text-dark bg-white rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs shadow-md transition hover:scale-[1.02] cursor-pointer shrink-0"
            >
              Get started
            </button>
          </form>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer id="footer" className="bg-slate-50 border-t border-neutral-border py-16 text-left select-none text-neutral-text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Logo Column */}
          <div className="md:col-span-4 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-800 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                <Leaf className="h-4.5 w-4.5" />
              </div>
              <span className="font-sans font-extrabold text-lg tracking-tight text-neutral-text-dark block leading-none">
                EcoSphere
              </span>
            </div>
            <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold max-w-xs">
              EcoSphere is an enterprise-wide ESG management platform that transforms daily operations into certified emissions reporting, verified policy acknowledgement, and interactive gamified sustainability.
            </p>
            <span className="text-[10px] font-bold text-neutral-text-muted block font-mono">
              © 2026 EcoSphere Inc. All rights reserved.
            </span>
          </div>

          {/* Links Column 1 */}
          <div className="col-span-2 space-y-4">
            <h4 className="text-xs font-extrabold text-neutral-text-dark uppercase tracking-widest">
              Product
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Integrations</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Pricing Models</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Platform API</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Enterprise Security</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="col-span-2 space-y-4">
            <h4 className="text-xs font-extrabold text-neutral-text-dark uppercase tracking-widest">
              Modules
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Environmental (E)</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Social (S)</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Governance (G)</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Gamification Hub</a></li>
            </ul>
          </div>

          {/* Links Column 3 */}
          <div className="col-span-2 space-y-4">
            <h4 className="text-xs font-extrabold text-neutral-text-dark uppercase tracking-widest">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Our Climate Commit</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Media Assets</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Partner Network</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Careers</a></li>
            </ul>
          </div>

          {/* Links Column 4 */}
          <div className="col-span-2 space-y-4">
            <h4 className="text-xs font-extrabold text-neutral-text-dark uppercase tracking-widest">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Privacy Policy</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Terms of Service</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">Audit Certifications</a></li>
              <li><a href="#" className="text-xs font-semibold hover:text-teal-800 transition-colors block">SLA Guarantees</a></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}
