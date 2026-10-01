import React, { useState, useEffect } from 'react';
import { Check, Flame, ShoppingBag, Sparkles, ChefHat } from 'lucide-react';

/**
 * Dynamic SVG Live Order Tracking Progress Component
 * 
 * Replaces the static progress bar with a dynamic SVG animation featuring:
 * - A stylized dashed road line connecting the 3 milestones.
 * - An animated physical vehicle (stylized Delivery Scooter or Chef Cooking Pan)
 *   that moves along the dashed line between 'Order Placed', 'Preparing', and 'Ready'
 *   milestones when WebSockets push status updates.
 * - Sizzling steam, rotating wheels, glowing headlight, and milestone pulse rings.
 */
export default function DynamicTrackingProgress({ currentStep = 2, onTriggerTestStep }) {
  // Vehicle mode: 'scooter' | 'pan'
  const [vehicleMode, setVehicleMode] = useState('scooter');
  
  // Coordinates for the 3 milestones along the 700px viewBox
  // Step 1: Order Placed -> x = 90
  // Step 2: Preparing    -> x = 350
  // Step 3: Ready        -> x = 610
  const MILESTONES = [
    { id: 1, label: 'Order Placed', sublabel: 'Sent to Kitchen', x: 90 },
    { id: 2, label: 'Preparing', sublabel: 'Cooking Fresh', x: 350 },
    { id: 3, label: 'Ready for Pickup', sublabel: 'Counter #1 Ready', x: 610 },
  ];

  // Target X position based on currentStep (1, 2, or 3)
  const getTargetX = (step) => {
    if (step <= 1) return 90;
    if (step === 2) return 350;
    return 610;
  };

  const vehicleX = getTargetX(currentStep);

  return (
    <div className="w-full max-w-2xl mx-auto my-8 px-2 select-none">
      
      {/* Top Controls: Vehicle Toggle & Live Status Badge */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          <span>Animation Tracker:</span>
          <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setVehicleMode('scooter')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                vehicleMode === 'scooter'
                  ? 'bg-white text-[#6b21a8] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>🛵 Campus Scooter</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleMode('pan')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                vehicleMode === 'pan'
                  ? 'bg-white text-[#6b21a8] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>🍳 Sizzling Pan</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            {currentStep === 1 ? 'Step 1: Order Queued' : currentStep === 2 ? 'Step 2: On The Grill' : 'Step 3: Ready for Pickup!'}
          </span>
        </div>
      </div>

      {/* Main Dynamic SVG Container */}
      <div className="relative bg-gradient-to-b from-gray-50/70 to-purple-50/20 border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
        
        <svg
          viewBox="0 0 700 140"
          className="w-full h-auto overflow-visible"
          id="live-tracking-svg-canvas"
        >
          <defs>
            {/* Active Gradient for Progress Path */}
            <linearGradient id="activeTrackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b21a8" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Glowing filter for active milestone */}
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Headlight beam gradient */}
            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Static Inactive Dashed Background Track */}
          <line
            x1="90"
            y1="70"
            x2="610"
            y2="70"
            stroke="#cbd5e1"
            strokeWidth="5"
            strokeDasharray="8 8"
            strokeLinecap="round"
          />

          {/* 2. Active Progress Line (Follows vehicleX) */}
          <line
            x1="90"
            y1="70"
            x2={vehicleX}
            y2="70"
            stroke="url(#activeTrackGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              transition: 'x2 1.2s cubic-bezier(0.34, 1.25, 0.64, 1)',
            }}
          />

          {/* 3. Dynamic Animated Dash Overlay on Active Line */}
          {vehicleX > 90 && (
            <line
              x1="90"
              y1="70"
              x2={vehicleX}
              y2="70"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className="animate-dashed-flow"
              opacity="0.85"
              strokeLinecap="round"
              style={{
                transition: 'x2 1.2s cubic-bezier(0.34, 1.25, 0.64, 1)',
              }}
            />
          )}

          {/* 4. Three Milestone Nodes */}
          {MILESTONES.map((m) => {
            const isCompleted = currentStep > m.id;
            const isActive = currentStep === m.id;
            const isFuture = currentStep < m.id;

            return (
              <g key={m.id} transform={`translate(${m.x}, 70)`} className="cursor-pointer">
                {/* Milestone Outer Glow on Active */}
                {isActive && (
                  <circle
                    r="24"
                    fill="none"
                    stroke={m.id === 3 ? '#10b981' : '#6b21a8'}
                    strokeWidth="2"
                    opacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* Milestone Background Circle */}
                <circle
                  r="18"
                  fill={isCompleted || isActive ? (m.id === 3 ? '#10b981' : '#6b21a8') : '#ffffff'}
                  stroke={isCompleted || isActive ? (m.id === 3 ? '#059669' : '#581c87') : '#94a3b8'}
                  strokeWidth="3"
                  className="transition-colors duration-300"
                  filter={isActive ? 'url(#emeraldGlow)' : undefined}
                />

                {/* Milestone Icon / Number */}
                {isCompleted ? (
                  <g transform="translate(-7, -7)">
                    <path
                      d="M2 7l4 4 8-8"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ) : isActive ? (
                  <circle r="5" fill="#ffffff" />
                ) : (
                  <text
                    y="4.5"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="12"
                    fontWeight="800"
                    fontFamily="Inter, sans-serif"
                  >
                    {m.id}
                  </text>
                )}

                {/* Milestone Text Label (Below) */}
                <text
                  y="34"
                  textAnchor="middle"
                  fill={isActive ? '#111827' : isCompleted ? '#374151' : '#94a3b8'}
                  fontSize="12"
                  fontWeight={isActive ? '800' : '600'}
                  fontFamily="Inter, sans-serif"
                >
                  {m.label}
                </text>

                {/* Milestone Subtext */}
                <text
                  y="48"
                  textAnchor="middle"
                  fill={isActive ? '#6b21a8' : '#9ca3af'}
                  fontSize="10"
                  fontWeight={isActive ? '700' : '500'}
                  fontFamily="Inter, sans-serif"
                >
                  {m.sublabel}
                </text>
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* 5. PHYSICAL MOVING VEHICLE / COOKING PAN SVG             */}
          {/* Positioned on the dashed path at vehicleX with animation */}
          {/* ======================================================== */}
          <g
            id="dynamic-tracking-vehicle"
            transform={`translate(${vehicleX}, 70)`}
            style={{
              transition: 'transform 1.2s cubic-bezier(0.34, 1.25, 0.64, 1)',
            }}
          >
            {/* Gentle bobbing vibration container */}
            <g className="animate-scooter-bob">

              {vehicleMode === 'scooter' ? (
                /* ======================================================== */
                /* STYLIZED CAMPUS DELIVERY SCOOTER SVG                     */
                /* ======================================================== */
                <g id="stylized-scooter-svg" transform="translate(-24, -36)">
                  {/* Headlight Projection Beam */}
                  <polygon
                    points="42,20 85,12 85,28"
                    fill="url(#headlightBeam)"
                  />

                  {/* Rear Delivery Food Box (AIT Purple) */}
                  <rect
                    x="2"
                    y="6"
                    width="16"
                    height="16"
                    rx="3"
                    fill="#6b21a8"
                    stroke="#4c1d95"
                    strokeWidth="1.5"
                  />
                  {/* Food Box Accent Stripe & Fork Icon */}
                  <rect x="2" y="12" width="16" height="3" fill="#a855f7" />
                  <circle cx="10" cy="14" r="2.5" fill="#ffffff" />
                  <path d="M9 13.5v1M11 13.5v1M10 13.5v2" stroke="#6b21a8" strokeWidth="0.6" strokeLinecap="round" />

                  {/* Scooter Body / Chassis (Emerald Green & Purple) */}
                  <path
                    d="M16 19 L26 19 L32 10 L38 10 L41 18 L34 26 L16 26 Z"
                    fill="#10b981"
                    stroke="#047857"
                    strokeWidth="1.2"
                  />

                  {/* Scooter Seat */}
                  <path
                    d="M17 17 Q22 15 27 17 L25 19 L17 19 Z"
                    fill="#1f2937"
                  />

                  {/* Handlebar & Windshield */}
                  <line x1="33" y1="10" x2="35" y2="4" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="35" cy="4" r="1.5" fill="#f59e0b" />
                  <path d="M34 6 L39 6 L37 2 L33 2 Z" fill="#60a5fa" opacity="0.6" />

                  {/* Bright Headlight */}
                  <circle cx="41" cy="18" r="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
                  <circle cx="41" cy="18" r="1.5" fill="#ffffff" />

                  {/* Exhaust Pipe & Smoke Puffs */}
                  <path d="M4 23 L-2 24" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="-5" cy="23" r="1.5" fill="#cbd5e1" className="animate-steam" />
                  <circle cx="-8" cy="22" r="2" fill="#e2e8f0" className="animate-steam" style={{ animationDelay: '0.3s' }} />

                  {/* Rear Wheel (Spinning) */}
                  <g transform="translate(10, 27)">
                    <circle r="7" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                    <circle r="4" fill="#94a3b8" />
                    <circle r="1.5" fill="#475569" />
                    {/* Rotating Spokes */}
                    <g className="animate-wheel-spin">
                      <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="0.8" />
                      <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="0.8" />
                    </g>
                  </g>

                  {/* Front Wheel (Spinning) */}
                  <g transform="translate(36, 27)">
                    <circle r="7" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                    <circle r="4" fill="#94a3b8" />
                    <circle r="1.5" fill="#475569" />
                    {/* Rotating Spokes */}
                    <g className="animate-wheel-spin">
                      <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="0.8" />
                      <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="0.8" />
                    </g>
                  </g>
                </g>
              ) : (
                /* ======================================================== */
                /* STYLIZED CHEF COOKING PAN SVG                            */
                /* ======================================================== */
                <g id="stylized-cooking-pan-svg" transform="translate(-24, -30)">
                  {/* Animated Rising Steam Wisps */}
                  <path
                    d="M12 4 Q14 -2 12 -8 Q10 -14 13 -18"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="animate-steam"
                  />
                  <path
                    d="M20 6 Q23 0 20 -6 Q17 -12 21 -16"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="animate-steam"
                    style={{ animationDelay: '0.4s' }}
                  />
                  <path
                    d="M28 4 Q30 -2 28 -8 Q26 -14 29 -18"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="animate-steam"
                    style={{ animationDelay: '0.8s' }}
                  />

                  {/* Sizzling Flame / Hot Glow beneath pan */}
                  <ellipse cx="20" cy="22" rx="14" ry="3.5" fill="#f59e0b" opacity="0.35" className="animate-ping" />
                  <path d="M12 22 Q16 26 20 22 Q24 26 28 22 Z" fill="#ef4444" opacity="0.8" />
                  <path d="M15 22 Q18 24 20 22 Q22 24 25 22 Z" fill="#fbbf24" />

                  {/* Skillet Pan Body (Sleek Charcoal) */}
                  <ellipse cx="20" cy="14" rx="16" ry="6.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                  
                  {/* Golden Sizzling Food / Samosa / Curry inside pan */}
                  <ellipse cx="20" cy="14" rx="13" ry="4.5" fill="#d97706" />
                  <circle cx="16" cy="13.5" r="2.5" fill="#fbbf24" />
                  <circle cx="23" cy="14" r="2" fill="#10b981" />
                  <circle cx="20" cy="13" r="1.8" fill="#f59e0b" />

                  {/* Pan Rim */}
                  <ellipse cx="20" cy="13.5" rx="16" ry="5.5" fill="none" stroke="#475569" strokeWidth="1.2" />

                  {/* Ergonomic Handle */}
                  <path
                    d="M4 14 L-8 12 Q-12 11 -12 14 Q-12 17 -8 16 L4 15 Z"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  {/* Grip accents */}
                  <rect x="-9" y="12.5" width="2" height="3" fill="#cbd5e1" rx="0.5" />
                </g>
              )}

            </g>
          </g>
        </svg>

      </div>

      {/* Helpful Interactive Milestone Note */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time WebSockets synchronization active</span>
        </span>
        {onTriggerTestStep && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Simulation:</span>
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onTriggerTestStep(s)}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                  currentStep === s
                    ? 'bg-[#6b21a8] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Step {s}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
