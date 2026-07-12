import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/auth';
import { rewardsService } from '../../services/rewardsService';
import { Reward, RewardRedemption } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gift,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export default function Rewards() {
  const { user, refreshUser } = useApp();
  const { employeeId } = useAuth();

  // States
  const [rewardsList, setRewardsList] = useState<Reward[]>([]);
  const [redemptionList, setRedemptionList] = useState<RewardRedemption[]>([]);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionError, setRedemptionError] = useState('');
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');

  // Active employee profile derived from the authenticated user.
  const currentEmployee = useMemo(() => {
    if (!user || !employeeId) return null;
    return { id: employeeId, points: user.points, email: user.email };
  }, [user, employeeId]);

  const refreshList = useCallback(async () => {
    const [rewards, reds] = await Promise.all([
      rewardsService.getRewards(),
      employeeId ? rewardsService.getRedemptions(employeeId) : Promise.resolve([]),
    ]);
    setRewardsList(rewards);
    setRedemptionList(reds);
  }, [employeeId]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const redemptions = useMemo(() => {
    return redemptionList
      .map(r => {
        const item = rewardsList.find(rew => rew.id === r.rewardId);
        return {
          ...r,
          rewardTitle: item?.title || 'Unknown eco-item',
          rewardImage: item?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300'
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [rewardsList, redemptionList]);

  const handleOpenRedeem = (reward: Reward) => {
    setRedemptionError('');
    setRedemptionSuccess(false);

    if (!currentEmployee) {
      setRedemptionError('You must be logged in as an active employee.');
      setSelectedReward(reward);
      return;
    }

    if (currentEmployee.points < reward.pointsCost) {
      setRedemptionError(`Insufficient points. This item costs ${reward.pointsCost} points, but you currently have ${currentEmployee.points} spendable points.`);
    }

    setSelectedReward(reward);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !currentEmployee) return;
    setRedemptionError('');

    const res = await rewardsService.redeem(selectedReward.id);
    if (res.success) {
      setRedemptionSuccess(true);
      await refreshList();
      refreshUser(); // re-fetch live balance from the backend
    } else {
      setRedemptionError(res.error || 'Redemption failed.');
    }
  };

  // Stock badge rendering helper
  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <span className="bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
          <X className="h-3 w-3" /> Out of stock
        </span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
          <AlertTriangle className="h-3 w-3 text-amber-500" /> Low stock ({stock} left)
        </span>
      );
    }
    return (
      <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
        <Check className="h-3 w-3" /> In stock ({stock} available)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans relative" id="rewards-store-page">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-600">
              <Gift className="h-5 w-5 fill-current animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold text-neutral-text-dark tracking-tight">Eco-Rewards Store</h1>
          </div>
          <p className="text-sm text-neutral-text-muted max-w-xl">
            Redeem your accrued ESG Points for sustainable corporate gifts, renewable energy goods, and direct reforestation sponsorships.
          </p>
        </div>

        {/* Live balance banner */}
        {user && (
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl px-5 py-3 shadow-md flex items-center gap-4 shrink-0 transition-transform hover:scale-[1.01]">
            <span className="p-2 rounded-full bg-white/10 text-white shrink-0">
              <Coins className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-white/80">Spendable Balance</span>
              <span className="text-xl font-extrabold font-mono leading-none">
                {user.points} <span className="text-sm font-semibold">pts</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs list: Catalog vs My Orders */}
      <div className="flex border-b border-neutral-border">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-primary-teal text-primary-teal'
              : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          Catalog Items
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-primary-teal text-primary-teal'
              : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <span>My Orders</span>
          {redemptions.length > 0 && (
            <span className="bg-neutral-bg text-neutral-text-muted text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-neutral-border">
              {redemptions.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'catalog' ? (
          <motion.div
            key="catalog-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {rewardsList.map((reward) => {
              const isLocked = reward.stock === 0;
              const hasBalance = currentEmployee ? currentEmployee.points >= reward.pointsCost : false;

              return (
                <div
                  key={reward.id}
                  className="bg-white border border-neutral-border hover:border-neutral-text-muted/30 rounded-2xl p-5 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Item Image Container */}
                    <div className="relative h-40 w-full rounded-xl overflow-hidden border border-neutral-border/60 shadow-inner shrink-0">
                      <img
                        src={reward.image}
                        alt={reward.title}
                        className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute left-3 top-3 bg-white border border-neutral-border text-xs font-black text-neutral-text-dark px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        <span>{reward.pointsCost} pts</span>
                      </span>
                    </div>

                    {/* Stock & Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        {getStockBadge(reward.stock)}
                      </div>
                      <h3 className="font-bold text-neutral-text-dark font-sans text-base leading-snug group-hover:text-primary-teal transition-colors truncate">
                        {reward.title}
                      </h3>
                      <p className="text-xs text-neutral-text-muted leading-relaxed line-clamp-2">
                        {reward.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-neutral-border pt-4 mt-4">
                    <button
                      onClick={() => handleOpenRedeem(reward)}
                      disabled={isLocked}
                      className={`w-full font-bold text-xs py-2.5 rounded-button shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isLocked
                          ? 'bg-neutral-bg border-neutral-border text-neutral-text-muted cursor-not-allowed'
                          : hasBalance
                            ? 'bg-primary-teal hover:bg-teal-700 text-white hover:scale-[1.01]'
                            : 'bg-white border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{isLocked ? 'Item Out of Stock' : 'Redeem Item'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <h2 className="text-sm font-bold text-neutral-text-dark uppercase tracking-wider mb-3">Redemption Order History</h2>

            {redemptions.length > 0 ? (
              <div className="space-y-3.5">
                {redemptions.map(red => (
                  <div key={red.id} className="bg-white border border-neutral-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src={red.rewardImage}
                        alt={red.rewardTitle}
                        className="h-10 w-10 rounded-lg object-cover border border-neutral-border"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-neutral-text-dark leading-snug">{red.rewardTitle}</h4>
                        <p className="text-[10px] text-neutral-text-muted flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" /> {new Date(red.timestamp).toLocaleDateString()} at {new Date(red.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs font-extrabold text-teal-600 font-mono">-{red.pointsSpent} pts</span>
                      <span className="text-[9px] font-black uppercase bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" /> Approved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 bg-white border border-neutral-border rounded-2xl text-center space-y-2">
                <ShoppingBag className="h-8 w-8 text-neutral-text-muted/60 mx-auto" />
                <p className="text-xs text-neutral-text-muted">You haven't ordered or redeemed any items yet.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redemption Overlay Flow Modal (Confirm & Success phases) */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-text-dark/60 z-50 flex items-center justify-center p-6 backdrop-blur-xs cursor-pointer"
            onClick={() => setSelectedReward(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-neutral-border p-6 shadow-2xl max-w-sm w-full text-center space-y-6 relative"
            >
              <button
                onClick={() => setSelectedReward(null)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              {redemptionSuccess ? (
                /* REDEMPTION SUCCESS VIEW */
                <div className="space-y-6 py-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-40 animate-pulse rounded-full" />
                    <div className="relative h-16 w-16 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center shadow-lg border border-white mx-auto shrink-0">
                      <CheckCircle2 className="h-9 w-9 fill-emerald-600/30 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-black text-lg text-neutral-text-dark font-sans tracking-tight">Redemption Successful!</h3>
                    <p className="text-xs text-neutral-text-muted leading-relaxed max-w-xs mx-auto">
                      Congratulations! You have successfully redeemed the <span className="font-bold text-neutral-text-dark">"{selectedReward.title}"</span>. The spent points have been deducted from your active balance.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200/50 p-3.5 rounded-xl text-left space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-emerald-900">
                      <span>Eco-Item:</span>
                      <span>{selectedReward.title}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Points Spent:</span>
                      <span className="font-mono">-{selectedReward.pointsCost} pts</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Order Status:</span>
                      <span>Ready for Pickup</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedReward(null);
                      refreshList();
                    }}
                    className="w-full bg-primary-teal hover:bg-teal-700 text-white font-extrabold text-xs py-2.5 rounded-button shadow-sm"
                  >
                    Return to Store
                  </button>
                </div>
              ) : (
                /* CONFIRMATION DIALOG VIEW */
                <div className="space-y-5 text-left">
                  <div className="border-b border-neutral-border pb-3 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary-teal" />
                    <h3 className="font-bold text-sm text-neutral-text-dark">Confirm Eco-Redemption</h3>
                  </div>

                  {redemptionError && (
                    <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block">Redemption Blocked</span>
                        <p className="text-[10px] leading-relaxed opacity-90">{redemptionError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <img
                      src={selectedReward.image}
                      alt={selectedReward.title}
                      className="h-16 w-16 rounded-xl object-cover border border-neutral-border shrink-0 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-neutral-text-dark leading-snug">{selectedReward.title}</h4>
                      <p className="text-[11px] text-neutral-text-muted leading-relaxed line-clamp-2">
                        {selectedReward.description}
                      </p>
                    </div>
                  </div>

                  <div className="bg-neutral-bg/60 p-4 rounded-xl border border-neutral-border/50 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-neutral-text-muted">
                      <span>Your Spendable Points:</span>
                      <span className="font-mono font-bold text-neutral-text-dark">{currentEmployee?.points || 0} pts</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-text-muted">
                      <span>Item Redemption Cost:</span>
                      <span className="font-mono font-black text-red-600">-{selectedReward.pointsCost} pts</span>
                    </div>
                    <div className="h-[1px] bg-neutral-border w-full my-1.5" />
                    <div className="flex justify-between items-center text-neutral-text-muted font-bold">
                      <span>Remaining Points Balance:</span>
                      <span className="font-mono font-bold text-teal-600">
                        {currentEmployee ? Math.max(0, currentEmployee.points - selectedReward.pointsCost) : 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setSelectedReward(null)}
                      className="flex-1 border border-neutral-border hover:bg-neutral-border/30 text-neutral-text-dark font-bold text-xs py-2.5 rounded-button text-center cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRedeem}
                      disabled={!!redemptionError}
                      className="flex-1 bg-primary-teal hover:bg-teal-700 disabled:bg-neutral-bg disabled:text-neutral-text-muted text-white font-bold text-xs py-2.5 rounded-button text-center shadow-sm"
                    >
                      Confirm Order
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
