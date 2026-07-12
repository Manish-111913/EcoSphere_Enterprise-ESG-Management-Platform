import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, Download, FileDown, RefreshCw } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { DepartmentRanking } from '../mocks/dashboardData';

export default function DeptRankingsChart() {
  const navigate = useNavigate();
  const [data, setData] = useState<DepartmentRanking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const rankings = await dashboardService.getDepartmentRankings();
        setData(rankings);
      } catch (err) {
        console.error('Failed to load department rankings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-xl shrink-0 select-none">🥇</span>;
      case 1:
        return <span className="text-xl shrink-0 select-none">🥈</span>;
      case 2:
        return <span className="text-xl shrink-0 select-none">🥉</span>;
      default:
        return <span className="text-xs font-bold text-neutral-text-muted w-5 text-center">{index + 1}</span>;
    }
  };

  const handleDeptClick = (deptName: string) => {
    navigate(`/departments?name=${encodeURIComponent(deptName)}`);
  };

  return (
    <div
      id="dept-rankings-chart"
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-text-dark">Department ESG Rankings</h3>
          <p className="text-xs text-neutral-text-muted">Stacked performance splits (E/S/G segments)</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-neutral-bg border border-neutral-border text-neutral-text-muted px-2 py-0.5 rounded-full font-semibold">
            Ranked
          </span>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="h-80 w-full flex flex-col items-center justify-center gap-2 text-neutral-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-teal" />
          <span className="text-xs">Loading department rankings...</span>
        </div>
      ) : (
        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
          {data.map((dept, idx) => {
            // E, S, G scores. Let's normalize them to render as stacked percentages
            const totalScore = dept.environmental + dept.social + dept.governance;
            const pctE = (dept.environmental / totalScore) * 100;
            const pctS = (dept.social / totalScore) * 100;
            const pctG = (dept.governance / totalScore) * 100;

            return (
              <div
                key={dept.department}
                onClick={() => handleDeptClick(dept.department)}
                className="group p-2.5 rounded-lg hover:bg-neutral-bg transition-colors cursor-pointer border border-transparent hover:border-neutral-border flex items-center gap-3.5"
              >
                {/* Medal Icon / Index */}
                <div className="w-6 flex justify-center">{getMedalIcon(idx)}</div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-text-dark group-hover:text-primary-teal transition-colors truncate">
                      {dept.department}
                    </span>
                    <span className="text-xs font-extrabold text-neutral-text-dark tabular-nums">
                      {dept.score} <span className="text-[9px] text-neutral-text-muted font-semibold">pts</span>
                    </span>
                  </div>

                  {/* Stacked Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                    {/* E - Environmental */}
                    <div
                      style={{ width: `${pctE}%` }}
                      className="bg-pillar-e hover:opacity-90 transition-opacity"
                      title={`Environmental: ${dept.environmental} pts`}
                    />
                    {/* S - Social */}
                    <div
                      style={{ width: `${pctS}%` }}
                      className="bg-pillar-s hover:opacity-90 transition-opacity"
                      title={`Social: ${dept.social} pts`}
                    />
                    {/* G - Governance */}
                    <div
                      style={{ width: `${pctG}%` }}
                      className="bg-pillar-g hover:opacity-90 transition-opacity"
                      title={`Governance: ${dept.governance} pts`}
                    />
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-neutral-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Mini Legend */}
      <div className="mt-4 pt-3 border-t border-neutral-border flex items-center justify-center gap-6 text-[10px] font-semibold text-neutral-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pillar-e" />
          <span>E Pillar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pillar-s" />
          <span>S Pillar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pillar-g" />
          <span>G Pillar</span>
        </div>
      </div>
    </div>
  );
}
