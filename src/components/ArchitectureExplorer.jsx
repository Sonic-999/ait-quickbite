import React, { useState } from 'react';
import { soundFx } from '../utils/audio';
import {
  Radio, Eye, Cpu, Database, Smartphone, ArrowRight, CheckCircle2
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    id: 'sensors',
    stepNumber: '01',
    title: 'Sensors',
    subtitle: 'Physical Tripwires',
    icon: Radio,
    description: 'PIR motion & ultrasonic acoustic beams at doorways detect traversal without capturing imagery.',
    spec: 'HC-SR501 + HC-SR04 (<12ms)',
    techDetails: [
      'Acoustic echo time-of-flight verifies directional person traversal',
      'Debounce filtering prevents multipath echo noise and false triggers',
      'Zero facial imagery — operates purely on infrared/acoustic pulses'
    ]
  },
  {
    id: 'detection',
    stepNumber: '02',
    title: 'Detection',
    subtitle: 'Overhead Vision',
    icon: Eye,
    description: 'Lightweight YOLOv8 neural network detects people from an overhead camera and extracts coordinates.',
    spec: 'YOLOv8 Nano (3.2M params) FP16',
    techDetails: [
      'ByteTrack Kalman filter associations track individual trajectories',
      'Automated facial blurring guarantees complete student privacy',
      'Reconciles missed counts when pairs walk in closely abreast'
    ]
  },
  {
    id: 'processing',
    stepNumber: '03',
    title: 'Processing',
    subtitle: 'Edge Hardware',
    icon: Cpu,
    description: 'Coordinating gateway aggregates sensor interrupt events and manages camera inference pipelines.',
    spec: 'Raspberry Pi 4 Model B (4GB)',
    techDetails: [
      'Quad-core Cortex-A72 @ 1.5GHz runs lightweight local inference',
      'Operates completely on-premise at AIT Pune for data sovereignty',
      'Sub-50ms edge latency meets strict real-time telemetry target'
    ]
  },
  {
    id: 'engine',
    stepNumber: '04',
    title: 'Occupancy Engine',
    subtitle: 'Dual Fusion & Drift',
    icon: Database,
    description: 'Blends physical sensor footstep counts with vision headcounts to output a verified ground truth.',
    spec: 'Ot = Ot-1 + Et - Xt',
    techDetails: [
      'Dual accumulative update prevents cumulative counting errors',
      'Monitors sensor-camera count variance to detect door bottlenecks',
      'Self-calibrating baseline maintains consistency during surges'
    ]
  },
  {
    id: 'dashboard',
    stepNumber: '05',
    title: 'Dashboard',
    subtitle: 'Client Delivery',
    icon: Smartphone,
    description: 'Pushes live crowd metrics, queue forecasts, and seat availability directly to campus devices.',
    spec: 'WebSocket Telemetry Push',
    techDetails: [
      'Real-time color-coded crowd indicators: Normal, Moderate, Peak',
      'Predictive wait-time calculation for meal serving counters',
      'Automated portion forecasting for kitchen staff to reduce food waste'
    ]
  }
];

export default function ArchitectureExplorer() {
  const [activeStepId, setActiveStepId] = useState('sensors');
  const activeStep = PIPELINE_STEPS.find((s) => s.id === activeStepId) || PIPELINE_STEPS[0];

  return (
    <section id="architecture" className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-8">
          <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">
            System Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Five-Stage Engineering Pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-xl">
            A cohesive architecture combining physical threshold tripwires, edge deep learning, and instant localized reconciliation.
          </p>
        </div>

        {/* Clean Horizontal Architecture Flow (Rule 11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative mb-6">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStepId === step.id;

            return (
              <div key={step.id} className="relative flex flex-col">
                <button
                  onClick={() => {
                    soundFx.click();
                    setActiveStepId(step.id);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer active:scale-98 flex-1 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header: Step Number & Icon */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-mono font-medium text-slate-400">
                        {step.stepNumber}
                      </span>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>

                    {/* Step Title & Subtitle */}
                    <div className="font-semibold text-sm text-slate-900 mb-0.5">
                      {step.title}
                    </div>
                    <div className="text-[11px] text-indigo-600 font-mono mb-2">
                      {step.subtitle}
                    </div>

                    {/* Clean 1-2 line description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Hardware / Formula Spec Chip */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-mono text-slate-500 truncate">
                    {step.spec}
                  </div>
                </button>

                {/* Subtle horizontal connecting arrow */}
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white border border-slate-200 shadow-2xs items-center justify-center text-slate-400">
                    <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Step Technical Details Drawer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-7">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
                <span>STAGE {activeStep.stepNumber} SPECIFICATION</span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-600 font-semibold">{activeStep.spec}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {activeStep.title} — {activeStep.subtitle}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeStep.description}
              </p>
            </div>

            <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider mb-2">
                Implementation Details
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {activeStep.techDetails.map((td, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 text-xs mt-0.5">•</span>
                    <span>{td}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
