import React, { useEffect, useState } from 'react';
import { Download, FileDown, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { CarbonTrendData } from '../mocks/dashboardData';

export default function CarbonTrendChart() {
  const [data, setData] = useState<CarbonTrendData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const trend = await dashboardService.getCarbonTrend();
        setData(trend);
      } catch (err) {
        console.error('Failed to load carbon trend', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleExport = (type: 'png' | 'csv') => {
    alert(`[Simulation] Exporting Carbon Trend chart data as ${type.toUpperCase()}`);
  };

  return (
    <div
      id="carbon-trend-chart"
      className="bg-white border border-neutral-border rounded-xl p-6 shadow-sm flex flex-col justify-between"
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-text-dark">12-Month Carbon Trend</h3>
          <p className="text-xs text-neutral-text-muted">Direct & indirect emissions (Scope 1 & 2) vs Goal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="p-1.5 rounded-md hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors border border-neutral-border"
            title="Export CSV"
          >
            <FileDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleExport('png')}
            className="p-1.5 rounded-md hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-colors border border-neutral-border"
            title="Export PNG"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="h-80 w-full">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-text-muted">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-teal" />
            <span className="text-xs">Loading chart data...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGoal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-5}
                unit=" t"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif'
                }}
                itemStyle={{ color: '#FFFFFF' }}
                labelClassName="font-bold text-primary-teal mb-1"
                formatter={(value: any) => [`${value} t CO₂e`, '']}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: 500 }}
              />
              <Area
                name="Actual Emissions"
                type="monotone"
                dataKey="actual"
                stroke="#0F766E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActual)"
                activeDot={{ r: 6 }}
              />
              <ReferenceLine
                y={110}
                label={{
                  value: 'Reduction Target Reference',
                  fill: '#DC2626',
                  fontSize: 9,
                  fontWeight: 600,
                  position: 'top'
                }}
                stroke="#DC2626"
                strokeDasharray="4 4"
              />
              <Area
                name="Target Baseline"
                type="monotone"
                dataKey="goal"
                stroke="#10B981"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                fillOpacity={0.5}
                fill="url(#colorGoal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
