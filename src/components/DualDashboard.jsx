import React, { useState } from 'react';
import { soundFx } from '../utils/audio';
import {
  Smartphone, BarChart2, Clock, Users,
  CheckCircle2, ArrowUpRight, Activity, TrendingUp, AlertCircle
} from 'lucide-react';

export default function DualDashboard({
  occupancyCount = 74,
  capacity = 120,
  occupancyPercent = 62,
  statusMode = 'moderate',
  latencyMs = 42
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'mobile'

  // Time-series data points with entry and exit deltas
  const hourlyData = [
    { time: '08:00', occ: 24, entry: 18, exit: 4, capPct: 20 },
    { time: '09:00', occ: 38, entry: 22, exit: 8, capPct: 32 },
    { time: '11:00', occ: 28, entry: 12, exit: 22, capPct: 23 },
    { time: '12:00', occ: 65, entry: 48, exit: 11, capPct: 54 },
    { time: '13:00', occ: 112, entry: 58, exit: 11, capPct: 93, isPeak: true },
    { time: '14:00', occ: 72, entry: 15, exit: 55, capPct: 60 },
    { time: '16:00', occ: 26, entry: 14, exit: 60, capPct: 22 },
    { time: '18:00', occ: 42, entry: 28, exit: 12, capPct: 35 },
    { time: '20:00', occ: 96, entry: 64, exit: 10, capPct: 80, isPeak: true },
    { time: '21:00', occ: 40, entry: 8, exit: 64, capPct: 33 },
  ];

  const getStudentStatus = () => {
    if (occupancyPercent >= 80) {
      return {
        level: 'Peak Rush',
        wait: '8 - 14 min queue',
        recommend: 'High facility load. Recommend visiting after 13:45.',
        badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        barColor: 'bg-rose-500',
      };
    }
    if (occupancyPercent >= 50) {
      return {
        level: 'Moderate Flow',
        wait: '3 - 5 min queue',
        recommend: 'Steady dining line. Serving speed is nominal.',
        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        barColor: 'bg-amber-400',
      };
    }
    return {
      level: 'Optimal Seating',
      wait: '< 2 min queue',
      recommend: 'Low facility density. Immediate counter access.',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      barColor: 'bg-emerald-400',
    };
  };

  const status = getStudentStatus();

  return (
    <section id="dashboard" className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">
              Operations & Analytics
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Facility Telemetry & Client Dashboards
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Real-time engineering monitoring console tracking hourly crowd throughput alongside the client-side student view.
            </p>
          </div>

          {/* Understated Segmented Control */}
          <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs self-start md:self-auto">
            <button
              onClick={() => {
                soundFx.click();
                setActiveTab('analytics');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Facility Analytics</span>
            </button>

            <button
              onClick={() => {
                soundFx.click();
                setActiveTab('mobile');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                activeTab === 'mobile'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Student Mobile View</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Engineering Analytics Console */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            
            {/* 4 Summary Stat Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Peak Today
                </div>
                <div className="font-mono text-2xl font-semibold text-slate-900">
                  112 <span className="text-xs text-slate-500 font-normal">/ 120 cap</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Recorded at 13:15 (Lunch Rush)
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Avg. Meal Turnover
                </div>
                <div className="font-mono text-2xl font-semibold text-slate-900">
                  18.4 <span className="text-xs text-slate-500 font-normal">minutes</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mean table dwell duration
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Sensor / Vision Variance
                </div>
                <div className="font-mono text-2xl font-semibold text-emerald-600">
                  &plusmn;1.8%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Cross-validation deviation
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Throughput Rate
                </div>
                <div className="font-mono text-2xl font-semibold text-slate-900">
                  16.2 <span className="text-xs text-slate-500 font-normal">meals/min</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Current counter service speed
                </div>
              </div>
            </div>

            {/* Main Hourly Influx Chart in Crisp Light Theme */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    Hourly Facility Occupancy & Throughput
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time count aggregation recorded at AIT Pune Central Dining Hall #01
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <span>Peak Surge (&ge;80%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                    <span>Standard Occupancy</span>
                  </div>
                </div>
              </div>

              {/* Chart Grid with Y-axis markers */}
              <div className="mt-6 flex">
                {/* Y-axis Labels */}
                <div className="flex flex-col justify-between h-44 pr-3 text-[10px] font-mono text-slate-400 text-right select-none">
                  <span>120</span>
                  <span>90</span>
                  <span>60</span>
                  <span>30</span>
                  <span>0</span>
                </div>

                {/* Plot Area */}
                <div className="flex-1 flex flex-col justify-between h-44 relative border-l border-b border-slate-200">
                  {/* Subtle horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-100 w-full h-0" />
                    <div className="border-b border-slate-100 w-full h-0" />
                    <div className="border-b border-slate-100 w-full h-0" />
                    <div className="border-b border-slate-100 w-full h-0" />
                    <div className="w-full h-0" />
                  </div>

                  {/* Interactive Bars */}
                  <div className="grid grid-cols-10 gap-2 sm:gap-3 items-end h-full px-2 z-10">
                    {hourlyData.map((d, i) => {
                      const barHeight = Math.round((d.occ / 120) * 100);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 h-full justify-end group cursor-pointer">
                          {/* Hover Tooltip */}
                          <span className="text-[10px] font-mono font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            {d.occ}
                          </span>
                          <div
                            className={`w-full rounded-t transition-all group-hover:brightness-95 ${
                              d.isPeak
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* X-axis Timestamps */}
              <div className="flex pl-8 mt-2">
                <div className="grid grid-cols-10 gap-2 sm:gap-3 w-full text-center text-[10px] font-mono text-slate-500">
                  {hourlyData.map((d, i) => (
                    <span key={i}>{d.time}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Student Mobile Perspective */}
        {activeTab === 'mobile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Phone Frame */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[300px] rounded-3xl p-4 bg-slate-900 border-4 border-slate-800 shadow-xl">
                <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto mb-4" />

                <div className="bg-white rounded-2xl p-4 shadow-inner text-slate-900">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">Central Mess Hall</div>
                      <div className="text-[10px] text-slate-500 font-mono">AIT Pune Campus</div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Status Card inside app */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                      <span>Current Occupancy</span>
                      <span className="font-mono text-slate-900 font-semibold">{occupancyPercent}%</span>
                    </div>

                    <div className="text-lg font-semibold text-slate-900 mb-2">
                      {status.level}
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                      <div className={`h-full ${status.barColor}`} style={{ width: `${occupancyPercent}%` }} />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Est. Queue: {status.wait}</span>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-3 leading-relaxed">
                    <span className="text-[10px] font-mono uppercase text-indigo-600 font-semibold block mb-0.5">Recommendation</span>
                    {status.recommend}
                  </div>

                  {/* Available Seating */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase text-slate-500 font-mono block">Available Chairs</span>
                    <span className="text-xl font-semibold font-mono text-slate-900">
                      {Math.max(0, capacity - occupancyCount)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono"> / {capacity}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation & Value Prop */}
            <div className="lg:col-span-7">
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                Real-Time Seating Transparency
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Students can check their mobile screens before leaving hostel rooms or labs. By shifting meal arrival times slightly, campus bottlenecks are smoothed naturally.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant Visual Cues</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clear green, amber, and rose volume badges eliminate ambiguity regarding facility crowding.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Predictive Queue Wait</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calculates approximate serving line delays so students can allocate break time effectively.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
