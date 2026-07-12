import React, { useState } from 'react';
import { Leaf, CheckCircle, XCircle, ArrowUpRight, TrendingDown, Layers, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../ui-kit/Toast';
import { mockCarbonTransactions, mockEmissionFactors, mockDepartments, mockEmployees } from '../../mocks/db';
import CarbonTrendChart from '../CarbonTrendChart';
import DeptRankingsChart from '../DeptRankingsChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function ESGManagerDashboard() {
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState(() => {
    const cached = localStorage.getItem('ecosphere_carbon_transactions');
    return cached ? JSON.parse(cached) : mockCarbonTransactions;
  });

  const pendingTx = transactions.filter((t: any) => t.status === 'Pending');

  const updateTxStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    const updated = transactions.map((t: any) =>
      t.id === id ? { ...t, status: newStatus } : t
    );
    setTransactions(updated);
    localStorage.setItem('ecosphere_carbon_transactions', JSON.stringify(updated));
    addToast({
      title: `Transaction ${newStatus}`,
      description: `Log ${id} was marked as ${newStatus.toLowerCase()} successfully.`,
      type: newStatus === 'Approved' ? 'success' : 'info'
    });
  };

  // Scope 1/2/3 breakdown data
  const scopeData = [
    { name: 'Scope 1 - Direct', value: 450, color: '#0F766E' },
    { name: 'Scope 2 - Indirect', value: 520, color: '#0D9488' },
    { name: 'Scope 3 - Value Chain', value: 270, color: '#14B8A6' },
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Total Emissions Logged</span>
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg"><Leaf size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">1,240</span>
            <span className="text-xs font-bold text-neutral-text-muted">t CO₂e</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
            <TrendingDown size={12} /> -8.2% vs last quarter
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Pending Auditing Logs</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg"><Layers size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{pendingTx.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">pending review</span>
          </div>
          <p className="text-[11px] text-neutral-text-muted mt-1.5">
            Requires technical scope verification
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Active Emission Factors</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg"><FileSpreadsheet size={16} /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-text-dark">{mockEmissionFactors.length}</span>
            <span className="text-xs font-bold text-neutral-text-muted">standards</span>
          </div>
          <p className="text-[11px] text-blue-600 font-bold mt-1.5">
            EPA 2024 & 2025 v2 loaded
          </p>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-muted">Primary Reducer</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg"><ArrowUpRight size={16} /></span>
          </div>
          <div className="mt-3">
            <span className="text-sm font-black text-neutral-text-dark">Human Resources</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-2">
            Highest completion in zero waste
          </p>
        </div>
      </div>

      {/* Main Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scope Breakdown Bar Chart */}
        <div className="lg:col-span-4 bg-white border border-neutral-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-text-dark">Scope 1 / 2 / 3 Emissions</h3>
            <p className="text-xs text-neutral-text-muted">Distribution in metric tons CO₂e</p>
          </div>
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={9} width={90} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '11px',
                  }}
                  formatter={(value: any) => [`${value} t CO₂e`, 'Emissions']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {scopeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carbon Trend Chart */}
        <div className="lg:col-span-8">
          <CarbonTrendChart />
        </div>
      </div>

      {/* Pending Validation Grid */}
      <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-border pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-text-dark">Review Pending Carbon Transactions</h3>
            <p className="text-xs text-neutral-text-muted">Scope 1 & 2 logging entries awaiting official validation</p>
          </div>
          <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
            {pendingTx.length} pending
          </span>
        </div>

        {pendingTx.length === 0 ? (
          <div className="text-center py-8 text-neutral-text-muted text-xs">
            🎉 All emissions logs are fully validated! No transactions currently pending.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Dept / Employee</th>
                  <th className="p-3 font-semibold">Emission Standard Factor</th>
                  <th className="p-3 font-semibold text-right">Quantity</th>
                  <th className="p-3 font-semibold text-right">Calculated CO₂e</th>
                  <th className="p-3 font-semibold">Logged Date</th>
                  <th className="p-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {pendingTx.map((tx: any) => {
                  const dept = mockDepartments.find(d => d.id === tx.departmentId);
                  const emp = mockEmployees.find(e => e.id === tx.employeeId);
                  const ef = mockEmissionFactors.find(f => f.id === tx.emissionFactorId);
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-bg transition-colors">
                      <td className="p-3 font-mono font-semibold text-neutral-text-dark">{tx.id}</td>
                      <td className="p-3">
                        <div className="font-medium text-neutral-text-dark">{emp?.name}</div>
                        <div className="text-[10px] text-neutral-text-muted">{dept?.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-neutral-text-dark">{ef?.name}</div>
                        <div className="text-[10px] text-neutral-text-muted">Scope {ef?.scope} · {ef?.version}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-neutral-text-dark">{tx.quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">{tx.calculatedCo2e} t</td>
                      <td className="p-3 font-mono text-neutral-text-muted">{tx.date}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => updateTxStatus(tx.id, 'Approved')}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                            title="Approve log"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateTxStatus(tx.id, 'Rejected')}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Reject log"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeptRankingsChart />
    </div>
  );
}
