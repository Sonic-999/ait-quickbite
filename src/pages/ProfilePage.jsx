import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Wallet,
  Activity,
  Clock,
  Sparkles,
  Flame,
  Award,
  ChevronRight,
  Store,
  DollarSign,
  TrendingUp,
  PieChart,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import WalletAnalytics from '../components/WalletAnalytics';
import MyOrdersSection from '../components/MyOrdersSection';
import LiveKitchenQueueTimer from '../components/LiveKitchenQueueTimer';

/**
 * Route: /profile (User Wallet, Macros, and Order History)
 * Blinkit-style user hub providing:
 * 1. User Identity & Loyalty status (Bitecoins)
 * 2. Fitness & Nutritional Macros breakdown (Protein, Carbs, Calories)
 * 3. Monthly Wallet & Spending Analytics (with Chart.js)
 * 4. Past Order History with instant re-ordering
 */
export default function ProfilePage({
  currentUser,
  orders = [],
  onTrackOrder,
  onBrowseShops,
  onAddToCart,
}) {
  const navigate = useNavigate();
  const [activeProfileTab, setActiveProfileTab] = useState('overview'); // 'overview' | 'wallet' | 'orders'
  const [budgetLimit, setBudgetLimit] = useState(() => {
    return typeof window !== 'undefined' ? Number(localStorage.getItem('ait_monthly_budget')) || 2000 : 2000;
  });

  // Calculate mock macro stats based on student orders
  const todayCalories = 840;
  const todayProtein = 28; // grams
  const todayCarbs = 94; // grams
  const todayFat = 18; // grams

  const totalSpent = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const budgetPercent = Math.min(100, Math.round((totalSpent / budgetLimit) * 100));

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-32 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* 1. Student Profile Header Card */}
        <div className="bg-gradient-to-r from-[#164e3d] via-[#1d5c49] to-[#164e3d] text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden border border-[#164e3d]/30">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                {currentUser?.avatar || '👨‍🎓'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {currentUser?.name || 'Aarav Sharma'}
                  </h1>
                  <span className="text-[11px] font-bold bg-[#be185d] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Gold Foodie</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5 font-medium">
                  Roll: TE-COMP-42 &bull; Army Institute of Technology, Pune
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] bg-white/15 px-2.5 py-0.5 rounded-md font-mono text-emerald-50">
                    ID: {currentUser?.id || 'usr-std-01'}
                  </span>
                  <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block animate-pulse" />
                    Resident Scholar
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Switch to Vendor Dashboard */}
            <div className="flex sm:flex-col gap-2">
              <Link
                to="/vendor"
                className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3.5 py-2 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-sm shadow-xs"
              >
                <Store className="w-4 h-4 text-amber-300" />
                <span>Vendor Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10 text-center">
            <div className="bg-white/5 rounded-2xl p-2.5 backdrop-blur-xs">
              <div className="text-xs text-emerald-200/90 font-medium">BiteCoins Balance</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">365 🪙</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-2.5 backdrop-blur-xs">
              <div className="text-xs text-emerald-200/90 font-medium">Orders Placed</div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">{orders.length || 18}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-2.5 backdrop-blur-xs">
              <div className="text-xs text-emerald-200/90 font-medium">Money Saved</div>
              <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">&#8377;420</div>
            </div>
          </div>
        </div>

        {/* Live Kitchen Queue Dynamic Prep Time & 3-Min Countdown Timer */}
        <div className="mb-6">
          <LiveKitchenQueueTimer
            activeOrder={orders.find(o => o.status && !['ready', 'ready for pickup', 'completed', 'delivered', 'cancelled'].includes(o.status.toLowerCase())) || orders[0]}
            allOrders={orders}
            onTrackFullOrder={onTrackOrder}
          />
        </div>

        {/* 2. Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#e4eae2] pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Nutritional Macros & Budget', icon: Activity },
            { id: 'wallet', label: 'Wallet & Spend Analytics', icon: Wallet },
            { id: 'orders', label: `My Orders (${orders.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeProfileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#164e3d] text-white shadow-xs'
                    : 'bg-white text-[#605249] hover:bg-[#e8f2ec]/60 hover:text-[#164e3d] border border-[#e4eae2]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Tab Contents */}
        {activeProfileTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Daily Macros Card */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#e8f2ec] text-[#164e3d]">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-[#2a221e] uppercase tracking-wider">
                      Daily Campus Nutrition &amp; Macros
                    </h2>
                    <p className="text-xs text-[#605249]">
                      Calculated from your food orders at AIT campus outlets
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#be185d] bg-[#fdf2f8] px-2.5 py-1 rounded-full border border-[#fbcfe8]">
                  {todayCalories} kcal consumed
                </span>
              </div>

              {/* Progress Bars for Macros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Protein */}
                <div className="p-4 bg-[#fdf2f8]/70 rounded-xl border border-[#fbcfe8]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-extrabold text-[#2a221e]">Protein</span>
                    <span className="font-bold text-[#be185d]">{todayProtein}g / 60g</span>
                  </div>
                  <div className="w-full bg-[#fce7f3] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#be185d] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (todayProtein / 60) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#be185d] font-medium mt-1 block">
                    Ideal for gym workouts
                  </span>
                </div>

                {/* Carbs */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-extrabold text-[#2a221e]">Carbohydrates</span>
                    <span className="font-bold text-amber-700">{todayCarbs}g / 180g</span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (todayCarbs / 180) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium mt-1 block">
                    Quick campus energy
                  </span>
                </div>

                {/* Fats */}
                <div className="p-4 bg-[#e8f2ec]/60 rounded-xl border border-[#c2ddcb]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-extrabold text-[#2a221e]">Healthy Fats</span>
                    <span className="font-bold text-[#164e3d]">{todayFat}g / 45g</span>
                  </div>
                  <div className="w-full bg-[#c2ddcb] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#164e3d] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (todayFat / 45) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#164e3d] font-medium mt-1 block">
                    Balanced nutrient ratio
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Budget Card */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#e8f2ec] text-[#164e3d]">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-[#2a221e] uppercase tracking-wider">
                      Monthly Canteen Budget
                    </h2>
                    <p className="text-xs text-[#605249]">
                      Spend tracking to prevent overspending before month end
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-[#be185d]">
                  &#8377;{totalSpent} / &#8377;{budgetLimit}
                </span>
              </div>

              <div className="w-full bg-[#e8f2ec]/60 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetPercent > 90
                      ? 'bg-red-500'
                      : budgetPercent > 75
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[#164e3d] to-[#be185d]'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-[#605249]">
                <span>{budgetPercent}% of monthly limit used</span>
                <span className="font-semibold text-[#2a221e]">
                  &#8377;{Math.max(0, budgetLimit - totalSpent)} remaining
                </span>
              </div>
            </div>
          </div>
        )}

        {activeProfileTab === 'wallet' && (
          <div className="animate-in fade-in duration-200">
            <WalletAnalytics
              onBackToMenu={() => navigate('/')}
              onBrowseShops={() => navigate('/')}
              userId="usr-std-01"
              userName={currentUser?.name || 'Aarav Sharma'}
            />
          </div>
        )}

        {activeProfileTab === 'orders' && (
          <div className="animate-in fade-in duration-200">
            <MyOrdersSection
              orders={orders}
              onBrowseShops={() => navigate('/')}
              onTrackOrder={(order) => {
                onTrackOrder(order);
                navigate('/live-status');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
