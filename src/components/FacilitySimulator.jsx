import React, { useState } from 'react';
import CameraFeedView from './CameraFeedView';
import { soundFx } from '../utils/audio';

const TIME_PRESETS = [
  { id: 'breakfast', label: 'Breakfast', time: '08:30', count: 36, status: 'Normal' },
  { id: 'lunch', label: 'Lunch Rush', time: '13:15', count: 108, status: 'Peak' },
  { id: 'tea', label: 'Afternoon Lull', time: '16:30', count: 24, status: 'Normal' },
  { id: 'dinner', label: 'Dinner Service', time: '20:00', count: 88, status: 'Moderate' },
];

export default function FacilitySimulator({
  occupancyCount,
  setOccupancyCount,
  capacity = 120,
  latencyMs = 42
}) {
  const [selectedPreset, setSelectedPreset] = useState('lunch');

  // Animation filters
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showPrivacyBlur, setShowPrivacyBlur] = useState(true);
  const [showTripwire, setShowTripwire] = useState(true);

  const occupancyPercent = Math.min(100, Math.round((occupancyCount / capacity) * 100));
  const availableSeats = Math.max(0, capacity - occupancyCount);

  const getStatus = () => {
    if (occupancyPercent >= 80) {
      return {
        label: 'Peak Surge',
        desc: 'Facility nearing maximum capacity. Estimated 8-12 min queue.',
        color: 'text-rose-600',
        barColor: 'bg-rose-500',
        badge: 'bg-rose-50 text-rose-700 border border-rose-200',
        wait: '8 - 12 mins',
      };
    }
    if (occupancyPercent >= 50) {
      return {
        label: 'Moderate Flow',
        desc: 'Steady student volume. Serving lines moving smoothly.',
        color: 'text-amber-600',
        barColor: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border border-amber-200',
        wait: '3 - 5 mins',
      };
    }
    return {
      label: 'Optimal Seating',
      desc: 'Sufficient open tables available. Direct counter access.',
      color: 'text-emerald-600',
      barColor: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      wait: '< 2 mins',
    };
  };

  const status = getStatus();

  const handlePresetSelect = (preset) => {
    soundFx.click();
    setSelectedPreset(preset.id);
    setOccupancyCount(preset.count);
  };

  const handleAddOne = () => {
    soundFx.sensorPing(false);
    setOccupancyCount((prev) => Math.min(capacity, prev + 1));
  };

  const handleRemoveOne = () => {
    soundFx.sensorPing(true);
    setOccupancyCount((prev) => Math.max(0, prev - 1));
  };

  const handleSurge = () => {
    soundFx.reconcilePing();
    setOccupancyCount((prev) => Math.min(capacity, prev + 15));
  };

  const handleReset = () => {
    soundFx.click();
    setOccupancyCount(20);
    setSelectedPreset('tea');
  };

  return (
    <section id="simulator" className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">
              Interactive Testbench
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Facility Crowd Simulator
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Simulate entry and exit events across various meal hours. Adjust counts to observe sensor tripwires and overhead detection in action.
            </p>
          </div>

          {/* Time Presets Styled as Elegant Light Segmented Control */}
          <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs self-start md:self-auto">
            {TIME_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] font-mono text-slate-500">{p.time}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Architectural Floor Plan Canvas & Floating Dock */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <CameraFeedView
              occupancyCount={occupancyCount}
              capacity={capacity}
              showBBoxes={showBBoxes}
              showPrivacyBlur={showPrivacyBlur}
              showTripwire={showTripwire}
              onStudentAdd={handleAddOne}
              onStudentExit={handleRemoveOne}
            />

            {/* Consolidated Minimalist Control Dock in Crisp Light Theme */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
              
              {/* Simulation Trigger Buttons with tactile click response */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAddOne}
                  disabled={occupancyCount >= capacity}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Enter
                </button>

                <button
                  onClick={handleRemoveOne}
                  disabled={occupancyCount <= 0}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &minus; Exit
                </button>

                <button
                  onClick={handleSurge}
                  disabled={occupancyCount >= capacity}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Surge
                </button>

                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3 text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showBBoxes}
                    onChange={(e) => setShowBBoxes(e.target.checked)}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span>AI Reticles</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showPrivacyBlur}
                    onChange={(e) => setShowPrivacyBlur(e.target.checked)}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span>Privacy Blur</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={showTripwire}
                    onChange={(e) => setShowTripwire(e.target.checked)}
                    className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span>Sensors</span>
                </label>
              </div>

            </div>
          </div>

          {/* Right: Technical Telemetry Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Real-Time Facility Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                  <span>Occupancy Telemetry</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="flex items-baseline justify-between my-2 font-mono">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight text-slate-900">
                      {occupancyCount}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {capacity}
                    </span>
                  </div>

                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status.badge}`}>
                    {occupancyPercent}%
                  </span>
                </div>

                {/* Clean progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full ${status.barColor} transition-all duration-300`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>

                {/* Status Pill & Description */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className={`text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {status.desc}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase font-medium block">Open Seating</span>
                    <span className="text-slate-900 font-mono font-semibold mt-0.5 block">{availableSeats} chairs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase font-medium block">Est. Queue Time</span>
                    <span className="text-slate-900 font-mono font-semibold mt-0.5 block">{status.wait}</span>
                  </div>
                </div>
              </div>

              {/* Slider Input */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-700 font-medium">Manual Calibration</span>
                  <span className="font-mono text-slate-600">{occupancyCount} Persons</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={capacity}
                  value={occupancyCount}
                  onChange={(e) => setOccupancyCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>0</span>
                  <span>60</span>
                  <span>120 max</span>
                </div>
              </div>

            </div>

            {/* Hardware & Edge Specifications */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 shadow-xs space-y-2">
              <div className="text-[10px] uppercase font-medium tracking-wider text-slate-400">
                Hardware Health
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">PIR/Ultrasonic Gateway:</span>
                <span className="text-emerald-600 font-medium">Active (ESP32)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Overhead Camera:</span>
                <span className="text-slate-800">1080p @ 30 FPS</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Roundtrip Latency:</span>
                <span className="text-indigo-600 font-medium">{latencyMs} ms</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
