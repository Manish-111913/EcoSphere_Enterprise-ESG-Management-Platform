import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Users, ShieldCheck, BarChart3, FileDown, Calendar, Database, RefreshCw, Trash2, ArrowRight } from 'lucide-react';

interface ExportRecord {
  id: string;
  name: string;
  format: 'PDF' | 'Excel' | 'CSV';
  timestamp: string;
  size: string;
}

export default function ReportsHub() {
  const [recentExports, setRecentExports] = useState<ExportRecord[]>([]);

  useEffect(() => {
    const loadExports = () => {
      const cached = localStorage.getItem('ecosphere_recent_exports');
      if (cached) {
        setRecentExports(JSON.parse(cached));
      } else {
        const initial: ExportRecord[] = [
          { id: 'EXP-4081', name: 'Q1 ESG Performance Audit Summary', format: 'PDF', timestamp: '2026-06-15 14:32', size: '2.4 MB' },
          { id: 'EXP-3091', name: 'Scope 1 & 2 Carbon Emission Ledger', format: 'CSV', timestamp: '2026-06-10 09:15', size: '345 KB' },
          { id: 'EXP-2015', name: 'CSR Challenge Engagement & Leaderboard Matrix', format: 'Excel', timestamp: '2026-05-28 11:45', size: '1.2 MB' },
        ];
        localStorage.setItem('ecosphere_recent_exports', JSON.stringify(initial));
        setRecentExports(initial);
      }
    };
    loadExports();
  }, []);

  const handleClearExports = () => {
    localStorage.removeItem('ecosphere_recent_exports');
    setRecentExports([]);
  };

  const handleDownloadFile = (record: ExportRecord) => {
    alert(`[Simulation] Downloading simulated ${record.format} file: ${record.name} (${record.size})`);
  };

  const reports = [
    {
      title: 'Environmental Report',
      description: 'Scope 1, 2, 3 carbon equivalents, offset transactions, department comparison index, and intensity ratios.',
      link: '/reports/environmental',
      icon: <Leaf className="h-6 w-6 text-emerald-600" />,
      theme: 'border-emerald-100 hover:border-emerald-400 bg-emerald-50/5',
      stat: '1,240 t CO₂e Logged'
    },
    {
      title: 'Social Report',
      description: 'Corporate social responsibility indices, volunteer activity attendance metrics, challenge completion rates, and badge shelves.',
      link: '/reports/social',
      icon: <Users className="h-6 w-6 text-teal-600" />,
      theme: 'border-teal-100 hover:border-teal-400 bg-teal-50/5',
      stat: '84% Engagement Rate'
    },
    {
      title: 'Governance Report',
      description: 'Regulatory compliance auditing maps, policy acknowledgment matrices, unresolved issue trackers, and audit history logs.',
      link: '/reports/governance',
      icon: <ShieldCheck className="h-6 w-6 text-indigo-600" />,
      theme: 'border-indigo-100 hover:border-indigo-400 bg-indigo-50/5',
      stat: '98.5% Signed Policies'
    },
    {
      title: 'ESG Summary Report',
      description: 'The executive overview. Interactive weighted radar score splits, environmental emissions, and multi-line performance trajectories.',
      link: '/reports/summary',
      icon: <BarChart3 className="h-6 w-6 text-slate-700" />,
      theme: 'border-slate-200 hover:border-slate-500 bg-slate-50/10',
      stat: 'Total Score: 87.2/100'
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">Reports Hub</h1>
          <p className="text-xs text-neutral-text-muted mt-1">
            Access deep analytics sheets or assemble custom metrics boards instantly.
          </p>
        </div>
        <Link
          to="/reports/builder"
          className="px-4 py-2 bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 self-start transition-colors"
        >
          <Database size={15} /> Open Report Builder
        </Link>
      </div>

      {/* Grid of 4 Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <Link
            key={rep.title}
            to={rep.link}
            className={`border rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between ${rep.theme} hover:shadow-md cursor-pointer group`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-neutral-bg border border-neutral-border rounded-xl shrink-0">
                  {rep.icon}
                </span>
                <span className="text-[10px] bg-neutral-bg text-neutral-text-muted border border-neutral-border px-2.5 py-0.5 rounded-full font-bold">
                  {rep.stat}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-neutral-text-dark group-hover:text-primary-teal transition-colors">
                  {rep.title}
                </h3>
                <p className="text-xs text-neutral-text-muted leading-relaxed">
                  {rep.description}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-border/50 flex items-center justify-between text-xs font-bold text-primary-teal">
              <span>Generate Sheet Report</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Exports Section */}
      <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm mt-6">
        <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-text-dark">Recent Exports Log</h3>
            <p className="text-xs text-neutral-text-muted">History of exported documents for external distribution and audits</p>
          </div>
          {recentExports.length > 0 && (
            <button
              onClick={handleClearExports}
              className="px-2.5 py-1 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg border border-red-100 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Clear Log
            </button>
          )}
        </div>

        {recentExports.length === 0 ? (
          <div className="text-center py-12 text-neutral-text-muted text-xs">
            📄 No recent exports recorded. Generated reports appear in this log.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">Export ID</th>
                  <th className="p-3 font-semibold">Report Document Name</th>
                  <th className="p-3 font-semibold text-center">Format</th>
                  <th className="p-3 font-semibold">Generated Timestamp</th>
                  <th className="p-3 font-semibold text-right">File Size</th>
                  <th className="p-3 font-semibold text-center">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {recentExports.map((rec) => (
                  <tr key={rec.id} className="hover:bg-neutral-bg/30 transition-colors">
                    <td className="p-3 font-mono font-semibold text-neutral-text-dark">{rec.id}</td>
                    <td className="p-3 font-medium text-neutral-text-dark">{rec.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                        rec.format === 'PDF' ? 'bg-red-50 text-red-700 border border-red-100' :
                        rec.format === 'Excel' ? 'bg-green-50 text-green-700 border border-green-100' :
                        'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {rec.format}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-text-muted font-mono">{rec.timestamp}</td>
                    <td className="p-3 text-right text-neutral-text-muted font-mono">{rec.size}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDownloadFile(rec)}
                        className="p-1.5 hover:bg-neutral-bg text-primary-teal rounded-lg transition-colors inline-flex items-center gap-1.5"
                        title="Download Document"
                      >
                        <FileDown size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
