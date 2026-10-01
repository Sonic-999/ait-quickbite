import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
  IndianRupee,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Utensils,
  Coffee,
  CupSoda,
  Cookie,
  Sliders,
  RefreshCw,
  Info
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export default function WalletAnalytics({
  onBackToMenu,
  onBrowseShops,
  userId = 'usr-std-01',
  userName = 'Aarav Sharma',
}) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Budget input state
  const [budgetInput, setBudgetInput] = useState('2000');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Canvas refs
  const gaugeCanvasRef = useRef(null);
  const gaugeChartInstance = useRef(null);
  const categoryCanvasRef = useRef(null);
  const categoryChartInstance = useRef(null);

  // Fetch wallet analytics from SQLite backend API
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/user/wallet-analytics?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error(`Failed to load analytics: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setAnalyticsData(data);
        setBudgetInput(String(data.monthlyBudget || 2000));
        // Persist to localStorage for fast access across components
        localStorage.setItem('ait_monthly_budget', String(data.monthlyBudget || 2000));
        localStorage.setItem('ait_monthly_spend', String(data.monthlySpend || 0));
      } else {
        throw new Error(data?.error || 'Could not fetch wallet data');
      }
    } catch (err) {
      console.error('[WalletAnalytics] Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle Budget Update
  const handleUpdateBudget = async (newVal) => {
    const targetBudget = Number(newVal || budgetInput);
    if (!targetBudget || targetBudget <= 0) return;

    try {
      setIsSavingBudget(true);
      triggerHaptic(50);
      const res = await fetch('/api/user/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, budget: targetBudget }),
      });
      const data = await res.json();
      if (data && data.success) {
        setSaveSuccessMsg(`Budget updated to ₹${targetBudget.toLocaleString('en-IN')}`);
        localStorage.setItem('ait_monthly_budget', String(targetBudget));
        // Update local state immediately
        setAnalyticsData((prev) => {
          if (!prev) return prev;
          const newPercent = Math.round((prev.monthlySpend / targetBudget) * 100);
          return {
            ...prev,
            monthlyBudget: targetBudget,
            remainingBudget: Math.max(0, targetBudget - prev.monthlySpend),
            budgetPercent: newPercent,
            isNearBudget: newPercent >= 90,
          };
        });
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('[WalletAnalytics] Error saving budget:', err);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const monthlySpend = analyticsData?.monthlySpend || 0;
  const monthlyBudget = analyticsData?.monthlyBudget || 2000;
  const remainingBudget = analyticsData?.remainingBudget ?? Math.max(0, monthlyBudget - monthlySpend);
  const budgetPercent = analyticsData?.budgetPercent ?? Math.round((monthlySpend / monthlyBudget) * 100);
  const isNearBudget = budgetPercent >= 90;

  // -------------------------------------------------------------
  // 1. Chart.js Monthly Spend Gauge Chart (Semi-circle Doughnut)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!gaugeCanvasRef.current || !analyticsData) return;

    if (gaugeChartInstance.current) {
      gaugeChartInstance.current.destroy();
    }

    const ctx = gaugeCanvasRef.current.getContext('2d');
    const spent = monthlySpend;
    const remaining = Math.max(0, monthlyBudget - spent);
    const isExceeded = spent > monthlyBudget;

    // Dynamic gradient color for the gauge fill
    let gaugeColor = '#10b981'; // Emerald (< 75%)
    if (budgetPercent >= 100) {
      gaugeColor = '#ef4444'; // Red (Exceeded)
    } else if (budgetPercent >= 90) {
      gaugeColor = '#f59e0b'; // Amber (Approaching 90%+)
    } else if (budgetPercent >= 75) {
      gaugeColor = '#8b5cf6'; // Violet (Moderate)
    }

    gaugeChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Spent at Canteen', 'Remaining Budget'],
        datasets: [
          {
            data: isExceeded ? [spent, 0] : [spent, remaining],
            backgroundColor: [gaugeColor, '#f1f5f9'],
            hoverBackgroundColor: [gaugeColor, '#e2e8f0'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
            cutout: '76%',
            borderRadius: [10, 10],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { bottom: 10 },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.raw || 0;
                return ` ${label}: ₹${val.toLocaleString('en-IN')}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (gaugeChartInstance.current) {
        gaugeChartInstance.current.destroy();
      }
    };
  }, [analyticsData, monthlySpend, monthlyBudget, budgetPercent]);

  // -------------------------------------------------------------
  // 2. Chart.js Dynamic Category Breakdown Bar Chart
  // -------------------------------------------------------------
  useEffect(() => {
    if (!categoryCanvasRef.current || !analyticsData) return;

    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }

    const ctx = categoryCanvasRef.current.getContext('2d');
    const breakdown = analyticsData.categoryBreakdown || {
      Snacks: 400,
      Juices: 465,
      Meals: 365,
    };

    // Filter to categories that have meaningful data or the core categories
    const categories = ['Snacks', 'Juices', 'Meals', 'Shakes', 'Beverages'];
    const dataValues = categories.map((cat) => breakdown[cat] || 0);

    const categoryColors = [
      '#f97316', // Snacks (Amber/Orange)
      '#06b6d4', // Juices (Cyan)
      '#8b5cf6', // Meals (Purple)
      '#ec4899', // Shakes (Pink)
      '#10b981', // Beverages (Emerald)
    ];

    categoryChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Monthly Spend (₹)',
            data: dataValues,
            backgroundColor: categoryColors,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 54,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` Spent: ₹${context.raw.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
            },
            ticks: {
              font: { size: 11, weight: '600' },
              color: '#64748b',
              callback: (value) => '₹' + value,
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 12, weight: '700' },
              color: '#334155',
            },
          },
        },
      },
    });

    return () => {
      if (categoryChartInstance.current) {
        categoryChartInstance.current.destroy();
      }
    };
  }, [analyticsData]);

  const categoryIcons = {
    Snacks: Cookie,
    Juices: CupSoda,
    Meals: Utensils,
    Shakes: CupSoda,
    Beverages: Coffee,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 via-white to-gray-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <button
              onClick={onBackToMenu || onBrowseShops}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#6b21a8] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Campus Shops</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6b21a8] to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>My Wallet &amp; Analytics</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6b21a8] border border-purple-200">
                    Live
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Smart visual expense tracker &amp; monthly budget manager for {userName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#6b21a8] bg-white border border-gray-200 hover:border-purple-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6b21a8]' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* 90% Budget Approaching Warning Alert (If applicable) */}
        {isNearBudget && (
          <div
            id="wallet-budget-warning-banner"
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <PiggyBank className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                    Smart Saver Warning
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {budgetPercent}% of monthly limit spent
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-950 mt-1">
                  You are approaching your monthly canteen budget!
                </h3>
                <p className="text-xs sm:text-sm text-amber-900/90 mt-0.5 leading-relaxed">
                  You've spent <strong className="text-amber-950">₹{monthlySpend.toLocaleString('en-IN')}</strong> of your{' '}
                  <strong className="text-amber-950">₹{monthlyBudget.toLocaleString('en-IN')}</strong> budget. You only have{' '}
                  <strong className="text-amber-950">₹{remainingBudget.toLocaleString('en-IN')}</strong> remaining for this month.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  const input = document.getElementById('monthly-budget-input');
                  if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                Adjust Budget
              </button>
            </div>
          </div>
        )}

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Monthly Spend */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">This Month's Spend</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              &#8377;{monthlySpend.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-1 font-medium">
              <span>Spent at canteen</span>
            </div>
          </div>

          {/* Card 2: Set Monthly Budget */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Monthly Budget</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              &#8377;{monthlyBudget.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-gray-500 font-medium">
              <span>Target spending cap</span>
            </div>
          </div>

          {/* Card 3: Remaining Balance */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Safe to Spend</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isNearBudget ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isNearBudget ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              &#8377;{remainingBudget.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-gray-500 font-medium">
              {budgetPercent}% limit utilized
            </div>
          </div>

          {/* Card 4: Total Orders */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Past Orders</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {analyticsData?.totalOrdersCount || 0}
            </div>
            <div className="mt-1 text-xs text-gray-500 font-medium">
              QuickBite meals logged
            </div>
          </div>
        </div>

        {/* Charts Row: Gauge Chart + Category Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chart 1: Monthly Spend Gauge Chart (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      Monthly Spend Gauge
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Budget consumption meter
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    budgetPercent >= 100
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : budgetPercent >= 90
                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {budgetPercent >= 100 ? 'Over Budget' : budgetPercent >= 90 ? '90%+ Warning' : 'Safe Zone'}
                </span>
              </div>

              {/* Gauge Canvas Container */}
              <div className="relative h-56 sm:h-64 flex items-center justify-center pt-2">
                <canvas ref={gaugeCanvasRef} id="monthly-spend-gauge-chart" />

                {/* Centered Gauge Inner Text:
                    'You have spent ₹1,200 at the canteen this month' */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 text-center pointer-events-none">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                    &#8377;{monthlySpend.toLocaleString('en-IN')}
                  </span>
                  
                  {/* Primary Required Statement */}
                  <div className="text-xs sm:text-sm font-bold text-gray-700 max-w-[240px] mt-1 leading-snug">
                    You have spent <span className="text-[#6b21a8] font-extrabold">&#8377;{monthlySpend.toLocaleString('en-IN')}</span> at the canteen this month
                  </div>

                  <span className="text-[11px] text-gray-400 font-semibold mt-1">
                    of &#8377;{monthlyBudget.toLocaleString('en-IN')} monthly limit ({budgetPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Gauge Bottom Insights */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      budgetPercent >= 100
                        ? '#ef4444'
                        : budgetPercent >= 90
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                />
                <span className="font-semibold">
                  {budgetPercent >= 90
                    ? 'Threshold Reached (>= 90%)'
                    : 'Within Student Budget'}
                </span>
              </div>
              <span className="font-bold text-gray-800">
                &#8377;{remainingBudget.toLocaleString('en-IN')} left
              </span>
            </div>
          </div>

          {/* Chart 2: Dynamic Category Breakdown Bar Chart (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      Category Breakdown
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Dynamic spend distribution ('Snacks', 'Juices', 'Meals')
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-gray-500">
                  {analyticsData?.totalOrdersCount || 0} Orders Analysed
                </span>
              </div>

              {/* Dynamic Bar Chart Canvas */}
              <div className="h-56 sm:h-64 relative">
                <canvas ref={categoryCanvasRef} id="category-spend-bar-chart" />
              </div>
            </div>

            {/* Category Metric Pills below chart */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {['Snacks', 'Juices', 'Meals', 'Shakes', 'Beverages'].map((cat, idx) => {
                const amount = analyticsData?.categoryBreakdown?.[cat] || 0;
                const IconComponent = categoryIcons[cat] || Cookie;
                const catColors = [
                  'border-orange-200 text-orange-700 bg-orange-50/60',
                  'border-cyan-200 text-cyan-700 bg-cyan-50/60',
                  'border-purple-200 text-purple-700 bg-purple-50/60',
                  'border-pink-200 text-pink-700 bg-pink-50/60',
                  'border-emerald-200 text-emerald-700 bg-emerald-50/60',
                ];

                return (
                  <div
                    key={cat}
                    className={`p-2 rounded-xl border flex flex-col text-center ${catColors[idx % catColors.length]}`}
                  >
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                      <IconComponent className="w-3 h-3" />
                      <span>{cat}</span>
                    </div>
                    <span className="text-xs font-extrabold mt-0.5">
                      &#8377;{amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Set Monthly Budget Section */}
        <div
          id="monthly-budget-input-container"
          className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-extrabold text-gray-900">
                  Set Monthly Budget
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                Configure your monthly spending cap. When you approach 90% of this budget, we will show a friendly warning on checkout.
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Input & Save Button */}
            <div className="md:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                  &#8377;
                </span>
                <input
                  id="monthly-budget-input"
                  type="number"
                  min="100"
                  step="50"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6b21a8] focus:bg-white transition-all"
                />
              </div>

              <button
                id="save-budget-btn"
                onClick={() => handleUpdateBudget()}
                disabled={isSavingBudget || !budgetInput}
                className="px-5 py-2.5 rounded-xl bg-[#6b21a8] hover:bg-[#581c87] active:scale-95 text-white text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSavingBudget ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Save Monthly Budget</span>
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="md:col-span-5 flex items-center flex-wrap gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1">
                Quick Presets:
              </span>
              {[1000, 1300, 1500, 2000, 3000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setBudgetInput(String(val));
                    handleUpdateBudget(val);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    Number(budgetInput) === val
                      ? 'bg-purple-100 text-[#6b21a8] border-purple-300 shadow-2xs font-extrabold'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
                  }`}
                >
                  &#8377;{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Past Orders Table / Log */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Past Orders History
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Verified campus orders from local SQLite database
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              {analyticsData?.recentOrders?.length || 0} Recent
            </span>
          </div>

          {/* Orders List */}
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {analyticsData?.recentOrders && analyticsData.recentOrders.length > 0 ? (
              analyticsData.recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6b21a8] flex items-center justify-center font-black text-sm flex-shrink-0">
                      #{ord.token || 'OK'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">
                          {ord.shopName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#6b21a8] border border-purple-200 uppercase">
                          {ord.primaryCategory}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {ord.itemsSummary || 'Campus bite'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-gray-400 block font-medium">
                        {ord.date ? new Date(ord.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-gray-900 min-w-[70px]">
                      &#8377;{ord.total}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs">
                No past orders found in this period.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
