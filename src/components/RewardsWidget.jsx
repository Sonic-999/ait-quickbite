import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Flame,
  Gift,
  Sparkles,
  Check,
  ChevronRight,
  X,
  TrendingUp,
  Clock,
  Coffee,
  ShoppingBag,
  Zap,
  ArrowRight
} from 'lucide-react';
import { fireCelebratoryConfetti } from '../utils/confetti';
import { triggerHaptic } from '../utils/haptics';

export default function RewardsWidget({
  userId = 'usr-std-01',
  activePromo = null,
  onApplyPromo,
  onOpenCart,
  onAddToCart,
  refreshTrigger = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rewardsData, setRewardsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState('reward-tea');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current loyalty rewards status from backend SQLite API
  const fetchRewardsStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/user/rewards?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRewardsData(data);
          // If there is an active unredeemed promo code and no activePromo set, auto-apply it
          if (data.activePromoCodes?.length > 0 && !activePromo && onApplyPromo) {
            const latestPromo = data.activePromoCodes[0];
            onApplyPromo({
              code: latestPromo.code,
              item: {
                id: latestPromo.item_id,
                name: latestPromo.item_name,
                price: latestPromo.item_price,
              },
              discountPercent: latestPromo.discount_percent || 100,
            });
          }
        }
      }
    } catch (err) {
      console.error('[RewardsWidget] Error fetching rewards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, activePromo, onApplyPromo]);

  useEffect(() => {
    fetchRewardsStatus();
  }, [fetchRewardsStatus, refreshTrigger]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle 500-point reward redemption
  const handleRedeemReward = async () => {
    if (!rewardsData || rewardsData.bitecoinsBalance < 500) {
      setErrorMsg('You need at least 500 BiteCoins to redeem a 100% free item.');
      return;
    }

    try {
      setIsRedeeming(true);
      setErrorMsg('');

      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rewardId: selectedRewardId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem reward.');
      }

      // Celebratory feedback
      fireCelebratoryConfetti();
      triggerHaptic(50);

      setRedeemSuccess(data);

      // Automatically apply promo code to next cart
      if (onApplyPromo) {
        onApplyPromo({
          code: data.promoCode,
          item: data.freeItem,
          discountPercent: 100,
        });
      }

      // Refresh rewards status from backend
      fetchRewardsStatus();
    } catch (err) {
      console.error('[RewardsWidget] Redemption error:', err);
      setErrorMsg(err.message || 'Error processing redemption.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Add the free item directly into the user's cart and open checkout drawer
  const handleAddFreeItemToCartAndOpen = (freeItem) => {
    if (onAddToCart && freeItem) {
      onAddToCart({
        id: freeItem.id,
        name: freeItem.name,
        price: freeItem.price,
        shopName: freeItem.shopName || 'Juice Center',
        quantity: 1,
        image: freeItem.image,
        isFreePromoItem: true,
      });
    }
    setIsOpen(false);
    if (onOpenCart) {
      setTimeout(() => onOpenCart(), 150);
    }
  };

  const balance = rewardsData?.bitecoinsBalance ?? 520;
  const streak = rewardsData?.currentStreak ?? 3;
  const multiplier = rewardsData?.multiplier ?? 2.0;
  const streakMessage = rewardsData?.streakMessage ?? '3-Day Coffee Streak! 2x Points';
  const canRedeem = balance >= 500;
  const availableRewards = rewardsData?.availableRewards || [
    {
      id: 'reward-tea',
      itemId: 'jc-tea-special',
      name: 'AIT Special Cutting Chai',
      price: 15,
      description: '100% FREE hot aromatic Indian cutting tea with cardamom & ginger.',
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
    },
    {
      id: 'reward-patty',
      itemId: 'jc-sn-patty',
      name: 'Crispy Golden Veg Patty',
      price: 20,
      description: '100% FREE golden flaky puff pastry with spiced potato-pea filling.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
    },
    {
      id: 'reward-samosa-pav',
      itemId: 'jc-sn-samosa-pav',
      name: 'Mumbai Samosa Pav',
      price: 25,
      description: '100% FREE warm pav bun with crispy Punjabi samosa & garlic chutney.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
    },
  ];

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* Floating 'Rewards' Widget Button (Bottom Right)              */}
      {/* ------------------------------------------------------------- */}
      <aside aria-label="Loyalty Rewards" className="fixed bottom-20 right-4 sm:bottom-22 sm:right-6 z-40 select-none">
        <button
          id="btn-floating-rewards-widget"
          onClick={() => {
            triggerHaptic(30);
            setIsOpen(true);
            setRedeemSuccess(null);
            setErrorMsg('');
          }}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-gray-900 via-purple-950 to-gray-900 hover:from-purple-900 hover:to-indigo-950 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl border-2 border-amber-400/80 hover:border-amber-300 transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-md"
          title="Click to view BiteCoins, Streaks & Redeem 100% Free Items"
        >
          {/* Subtle glowing halo when 500+ points can be redeemed */}
          {canRedeem && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-black text-white items-center justify-center">
                !
              </span>
            </span>
          )}

          {/* Animated Coin Badge */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center text-sm shadow-md group-hover:rotate-12 transition-transform">
            🪙
          </div>

          {/* BiteCoins & Streak Info */}
          <div className="flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-300 tracking-wide">
                {balance} BiteCoins
              </span>
              {canRedeem && (
                <span className="text-[10px] bg-emerald-500/90 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                  Redeem
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-300 font-medium">
              <span className="text-orange-400 flex items-center gap-0.5 font-bold">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                {streak}D ({multiplier}x)
              </span>
              <span className="text-gray-400">&bull;</span>
              <span className="text-gray-300">Rewards</span>
            </div>
          </div>
        </button>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* Rewards & Redemption Modal                                    */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          id="rewards-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target.id === 'rewards-modal-backdrop') {
              setIsOpen(false);
            }
          }}
        >
          <div
            id="rewards-modal-card"
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-gray-900"
          >
            {/* Modal Header */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-purple-900 via-[#6b21a8] to-indigo-900 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-xl shadow-inner">
                    🪙
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>BiteCoins &amp; Loyalty Rewards</span>
                      <span className="text-[10px] bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-full uppercase">
                        Campus Perks
                      </span>
                    </h2>
                    <p className="text-xs text-purple-200">
                      Earn &#8377;1 = 1 point &bull; Multiplier on daily streaks
                    </p>
                  </div>
                </div>

                <button
                  id="btn-close-rewards-modal"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Balance & Streak Ribbon */}
              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-purple-700/50">
                <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-600/30">
                  <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block">
                    Your Points Balance
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-amber-300" id="rewards-bitecoins-balance">
                      {balance}
                    </span>
                    <span className="text-xs text-amber-200/80 font-bold">BiteCoins</span>
                  </div>
                </div>

                <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-600/30">
                  <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span>Streak Multiplier</span>
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-orange-300">
                      {multiplier}x
                    </span>
                    <span className="text-xs text-orange-200/80 font-bold">
                      ({streak} Days)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Success Notification Banner on Redemption */}
              {redeemSuccess && (
                <div
                  id="rewards-redeem-success-banner"
                  className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-black uppercase text-emerald-800 tracking-wider block">
                        Reward Redeemed Successfully!
                      </span>
                      <p className="text-sm font-bold text-emerald-950 mt-0.5">
                        Promo Code: <code className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-mono font-black text-base">{redeemSuccess.promoCode}</code>
                      </p>
                      <p className="text-xs text-emerald-800 mt-1">
                        100% discount generated for <strong>{redeemSuccess.freeItem?.name}</strong>. Automatically applied to your next cart!
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      id="btn-add-free-item-to-cart"
                      onClick={() => handleAddFreeItemToCartAndOpen(redeemSuccess.freeItem)}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add Free Item to Cart &amp; View Cart</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Streak Multiplier Details Card */}
              <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/80 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900" id="rewards-streak-heading">
                        {streakMessage}
                      </h3>
                      <p className="text-xs text-gray-600">
                        Consecutive campus orders boost your BiteCoins earnings!
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-orange-200 text-orange-900 font-extrabold px-2 py-1 rounded-lg">
                    {multiplier}x Active
                  </span>
                </div>

                {/* Streak Multiplier Ladder */}
                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className={`p-1.5 rounded-lg border ${streak === 1 ? 'bg-orange-500 text-white font-black border-orange-600' : 'bg-white/80 text-gray-600 border-gray-200'}`}>
                    <div className="font-bold">1 Day</div>
                    <div>1.0x Pts</div>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${streak === 2 ? 'bg-orange-500 text-white font-black border-orange-600' : 'bg-white/80 text-gray-600 border-gray-200'}`}>
                    <div className="font-bold">2 Days</div>
                    <div>1.5x Pts</div>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${streak >= 3 && streak < 5 ? 'bg-orange-500 text-white font-black border-orange-600 ring-2 ring-orange-400' : 'bg-white/80 text-gray-600 border-gray-200'}`}>
                    <div className="font-bold">3-4 Days</div>
                    <div>2.0x Pts 🔥</div>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${streak >= 5 ? 'bg-orange-500 text-white font-black border-orange-600' : 'bg-white/80 text-gray-600 border-gray-200'}`}>
                    <div className="font-bold">5+ Days</div>
                    <div>2.5x - 3x</div>
                  </div>
                </div>
              </div>

              {/* 500-Points Milestone Redemption Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#6b21a8]" />
                      <span>500 Points Reward Milestone</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Redeem 500 points for a 100% discount promo code for low-cost snacks.
                    </p>
                  </div>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${canRedeem ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                    {canRedeem ? '✓ Ready to Claim' : `${500 - (balance % 500)} pts to unlock`}
                  </span>
                </div>

                {/* Progress Bar towards 500 points */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                    <span>Progress: {balance} / 500 points</span>
                    <span>{Math.min(100, Math.round((balance / 500) * 100))}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, Math.round((balance / 500) * 100)))}%` }}
                    />
                  </div>
                </div>

                {/* Reward Items Choices */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Select your free item:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {availableRewards.map((reward) => {
                      const isSelected = selectedRewardId === reward.id;
                      return (
                        <div
                          key={reward.id}
                          onClick={() => setSelectedRewardId(reward.id)}
                          className={`relative rounded-2xl p-3 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#6b21a8] bg-purple-50/50 shadow-md ring-1 ring-[#6b21a8]'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6b21a8] text-white flex items-center justify-center text-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}

                          <div className="space-y-2">
                            <img
                              src={reward.image}
                              alt={reward.name}
                              className="w-full h-20 object-cover rounded-xl"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">
                                {reward.name}
                              </h4>
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                {reward.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-400 line-through">
                              &#8377;{reward.price}
                            </span>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              100% FREE
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error Banner if any */}
                {errorMsg && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {errorMsg}
                  </p>
                )}

                {/* Redeem Button (500 pts) */}
                <div className="pt-2">
                  <button
                    id="btn-redeem-reward"
                    onClick={handleRedeemReward}
                    disabled={!canRedeem || isRedeeming}
                    className={`w-full py-3.5 px-4 text-sm font-extrabold rounded-2xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 ${
                      !canRedeem
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                        : isRedeeming
                        ? 'bg-[#6b21a8]/70 text-white cursor-wait'
                        : 'bg-gradient-to-r from-purple-700 via-[#6b21a8] to-indigo-700 hover:from-purple-800 hover:to-indigo-800 active:scale-[0.99] text-white hover:shadow-xl cursor-pointer'
                    }`}
                  >
                    {isRedeeming ? (
                      <span>Generating 100% OFF Promo Code...</span>
                    ) : canRedeem ? (
                      <>
                        <span>Redeem for 100% FREE Item (500 BiteCoins)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <span>Need {500 - balance} More Points to Redeem</span>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-gray-400 mt-1.5">
                    Redemption generates a single-use 100% discount promo code automatically applied to your cart.
                  </p>
                </div>
              </div>

              {/* Active / Unredeemed Promo Codes Section */}
              {rewardsData?.activePromoCodes && rewardsData.activePromoCodes.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Your Active 100% OFF Promo Codes ({rewardsData.activePromoCodes.length})</span>
                  </h4>

                  <div className="space-y-2">
                    {rewardsData.activePromoCodes.map((promo) => {
                      const isApplied = activePromo?.code === promo.code;
                      return (
                        <div
                          key={promo.id}
                          className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-black text-sm text-[#6b21a8] bg-white px-2 py-0.5 rounded border border-purple-200">
                                {promo.code}
                              </code>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                                100% OFF
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                              Free item: <strong>{promo.item_name}</strong> (&#8377;{promo.item_price})
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              if (onApplyPromo) {
                                onApplyPromo({
                                  code: promo.code,
                                  item: {
                                    id: promo.item_id,
                                    name: promo.item_name,
                                    price: promo.item_price,
                                  },
                                  discountPercent: promo.discount_percent || 100,
                                });
                              }
                              triggerHaptic(30);
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isApplied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#6b21a8] hover:bg-purple-800 text-white'
                            }`}
                          >
                            {isApplied ? '✓ Applied' : 'Apply Code'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1 font-medium">
                <span>Account:</span> <strong className="text-gray-800">{rewardsData?.userName || 'Aarav Sharma'}</strong>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="font-bold text-[#6b21a8] hover:underline cursor-pointer"
              >
                Close &amp; Continue Ordering
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
