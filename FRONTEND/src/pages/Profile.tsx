import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui-kit/Toast';
import {
  User as UserIcon, Trophy, Award, Gift, Key, ShieldCheck, Mail, Building,
  Star, Compass, History, Lock, EyeOff, Eye
} from 'lucide-react';

import { mockBadges, mockBadgeAwards, mockRewards, mockEmployees } from '../mocks/db';

interface XpLedgerItem {
  id: string;
  activity: string;
  xpEarned: number;
  pointsEarned: number;
  date: string;
}

export default function Profile() {
  const { user } = useApp();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Load earned badges
  const earnedBadgeIds = mockBadgeAwards.filter(ba => ba.employeeId === 'emp-1').map(ba => ba.badgeId);
  const earnedBadges = mockBadges.filter(b => earnedBadgeIds.includes(b.id));

  // XP History Ledger
  const xpLedger: XpLedgerItem[] = [
    { id: 'LDG-102', activity: 'Completed "Double-Sided Printing Challenge"', xpEarned: 150, pointsEarned: 50, date: '2026-07-10' },
    { id: 'LDG-101', activity: 'Submitted Scope 1 Carbon Offset Invoice Proof', xpEarned: 300, pointsEarned: 100, date: '2026-07-08' },
    { id: 'LDG-100', activity: 'Acknowledged Q2 Sustainability Ethics Policy', xpEarned: 100, pointsEarned: 25, date: '2026-07-05' },
    { id: 'LDG-099', activity: 'Unlocked Badge: "Zero Waste Hero"', xpEarned: 500, pointsEarned: 150, date: '2026-07-01' },
  ];

  // Redemptions List
  const redeemedRewards = [
    { id: 'RDM-401', title: 'Eco-Friendly Bamboo Coffee Mug', cost: 120, status: 'Completed', date: '2026-07-02' },
    { id: 'RDM-302', title: 'Solar Powered USB Phone Charger', cost: 350, status: 'In Transit', date: '2026-06-25' },
  ];

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast({ title: 'Error', description: 'All password fields are required.', type: 'info' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ title: 'Error', description: 'New passwords do not match.', type: 'info' });
      return;
    }
    
    addToast({
      title: 'Password Updated',
      description: 'Your security password has been changed successfully.',
      type: 'success'
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      {/* Profile Overview Header Card */}
      <div className="bg-white border border-neutral-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-teal-50/15 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4 flex-wrap">
          <img
            src={user?.avatar}
            alt={user?.name}
            className="w-16 h-16 rounded-full border border-neutral-border object-cover bg-white shrink-0"
          />
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">{user?.name}</h1>
              <span className="text-[9px] bg-primary-teal/10 text-primary-teal border border-primary-teal/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-neutral-text-muted flex items-center gap-1.5 font-medium">
              <Mail size={13} /> {user?.email}
            </p>
            <p className="text-xs text-neutral-text-muted flex items-center gap-1.5 font-semibold">
              <Building size={13} /> Procurement & Sourcing Division
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <div className="border border-neutral-border bg-neutral-bg/25 rounded-xl px-4 py-2 text-center font-sans">
            <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Total Level</span>
            <span className="text-xl font-black text-primary-teal block mt-0.5">{user?.level || 9}</span>
          </div>
          <div className="border border-neutral-border bg-neutral-bg/25 rounded-xl px-4 py-2 text-center font-sans">
            <span className="text-[10px] uppercase font-bold text-neutral-text-muted">Available Points</span>
            <span className="text-xl font-black text-amber-500 block mt-0.5">{user?.points || 720} pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: XP History Ledger & Unlocked Badges */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* XP History Ledger */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-border pb-3.5 mb-4">
              <History size={16} className="text-primary-teal" />
              <h3 className="text-sm font-bold text-neutral-text-dark">Your XP & Points History Ledger</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg font-bold">
                    <th className="p-2.5">Registry ID</th>
                    <th className="p-2.5">Sustainability Action</th>
                    <th className="p-2.5 text-center text-emerald-700">XP Earned</th>
                    <th className="p-2.5 text-center text-amber-600">Points</th>
                    <th className="p-2.5">Action Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {xpLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-bg/20 font-semibold text-neutral-text-dark">
                      <td className="p-2.5 font-mono text-[11px] text-neutral-text-muted">{item.id}</td>
                      <td className="p-2.5 font-sans">{item.activity}</td>
                      <td className="p-2.5 text-center text-emerald-600 font-mono">+{item.xpEarned} XP</td>
                      <td className="p-2.5 text-center text-amber-600 font-mono">+{item.pointsEarned} pts</td>
                      <td className="p-2.5 font-mono text-neutral-text-muted">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unlocked Badges Shelf */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center gap-2 border-b border-neutral-border pb-3 mb-4">
              <Award size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-neutral-text-dark">Unlocked Milestone Badges</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {earnedBadges.map((badge: any) => (
                <div key={badge.id} className="border border-neutral-border rounded-xl p-3 flex flex-col items-center justify-center text-center bg-teal-50/5">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mb-2.5 shadow-sm text-amber-600">
                    <Award className="h-6 w-6 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-text-dark block leading-none">{badge.name}</span>
                  <span className="text-[9px] text-emerald-600 font-bold mt-1.5 block">+{badge.pointsAward} pts</span>
                </div>
              ))}
              {earnedBadges.length === 0 && (
                <div className="text-center py-6 text-neutral-text-muted text-xs col-span-4">
                  No achievement badges unlocked yet. Keep completing challenges!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Redemptions & Security Password Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Redeemed Rewards */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center gap-2 border-b border-neutral-border pb-3.5 mb-3">
              <Gift size={16} className="text-primary-teal" />
              <h3 className="text-sm font-bold text-neutral-text-dark">Redeemed Rewards Log</h3>
            </div>
            <div className="space-y-3">
              {redeemedRewards.map(item => (
                <div key={item.id} className="border border-neutral-border rounded-lg p-3 bg-neutral-bg/25">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-neutral-text-dark block leading-snug">{item.title}</span>
                    <span className="text-[9px] font-mono text-neutral-text-muted font-bold shrink-0">{item.id}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-text-muted font-semibold">
                    <span>Cost: {item.cost} pts</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                      item.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-blue-50 text-blue-700 animate-pulse font-bold'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security / Password Form */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm text-left">
            <div className="flex items-center gap-2 border-b border-neutral-border pb-3 mb-4">
              <Key size={16} className="text-primary-teal" />
              <h3 className="text-sm font-bold text-neutral-text-dark">Account Security</h3>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Current Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-neutral-border rounded-lg pl-3 pr-9 py-1.5 text-xs text-neutral-text-dark bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-2.5 text-neutral-text-muted hover:text-neutral-text-dark"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">New Password</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-neutral-border rounded-lg px-3 py-1.5 text-xs text-neutral-text-dark bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Confirm New Password</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-neutral-border rounded-lg px-3 py-1.5 text-xs text-neutral-text-dark bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-neutral-text-dark hover:bg-neutral-text-dark/95 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Lock size={13} /> Update Password
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
