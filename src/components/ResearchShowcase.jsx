import React, { useState } from 'react';
import { soundFx } from '../utils/audio';
import {
  FileText, ShieldCheck, Zap, CheckCircle2, DollarSign, EyeOff
} from 'lucide-react';

const HIGHLIGHT_METRICS = [
  {
    title: '94.2% Counting Accuracy',
    desc: 'Dual sensor tripwire + visual cross-validation resolves occlusion and cluster entry misses.',
    icon: CheckCircle2,
    badge: 'Empirical Result'
  },
  {
    title: '42ms Edge Latency',
    desc: 'Sub-50ms local processing loop ensures instant occupancy telemetry updates without cloud delays.',
    icon: Zap,
    badge: 'Hardware Metric'
  },
  {
    title: '100% Biometric Privacy',
    desc: 'No face images or persistent videos are ever stored; frames are discarded after vector extraction.',
    icon: ShieldCheck,
    badge: 'Privacy Protocol'
  },
  {
    title: 'Low-Cost Deployment',
    desc: 'Built using affordable off-the-shelf micro-controllers and edge processors (~$45 total per doorway).',
    icon: DollarSign,
    badge: 'Cost Efficiency'
  }
];

export default function ResearchShowcase({ onOpenPaper }) {
  const [privacyDemoMode, setPrivacyDemoMode] = useState(true);

  return (
    <section id="math" className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">
              Empirical Validation
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Research Findings & Methodology
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Derived from the published framework: <em>SmartCrowd: A Hybrid IoT and YOLOv8-Based Framework for Real-Time Crowd Monitoring in Campus Facilities</em> (AIT Pune).
            </p>
          </div>

          <button
            onClick={() => {
              soundFx.click();
              onOpenPaper();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-800 border border-slate-200 text-xs font-medium transition-all cursor-pointer self-start md:self-auto flex items-center gap-1.5 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Read Research Paper</span>
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {HIGHLIGHT_METRICS.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                      {m.badge}
                    </span>
                    <Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {m.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Preservation Architecture Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7">
              <div className="text-xs font-mono uppercase text-indigo-600 font-semibold mb-1">
                Zero Biometric Retention
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Automated Facial Anonymization
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Unlike standard CCTV surveillance, SmartCrowd processes each video frame entirely in temporary volatile RAM. Bounding box coordinates and anonymous numeric tracking IDs are extracted, while pixel data is immediately purged.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    soundFx.click();
                    setPrivacyDemoMode(!privacyDemoMode);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    privacyDemoMode
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{privacyDemoMode ? 'Privacy Mask: Active' : 'Privacy Mask: Inactive (Raw View)'}</span>
                </button>
              </div>
            </div>

            {/* Visual Anonymization Preview */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-[11px] font-mono text-slate-500 mb-3">
                {privacyDemoMode ? 'Edge Output: Anonymous Vector' : 'Unprocessed Frame (Purged)'}
              </div>

              <div className="h-32 rounded bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-slate-300 relative flex items-center justify-center">
                    {privacyDemoMode && (
                      <div className="absolute inset-0 rounded-full bg-indigo-500/80 border border-indigo-400 flex items-center justify-center shadow-xs">
                        <EyeOff className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-14 rounded-t-lg bg-slate-400 mt-1" />
                </div>
              </div>

              <div className="mt-2.5 text-[11px] font-mono text-slate-600">
                {privacyDemoMode ? (
                  <span className="text-emerald-600 font-medium">✓ Target ID #104 [x: 320, y: 194, conf: 0.94]</span>
                ) : (
                  <span className="text-rose-600 font-medium">Raw facial features visible</span>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
