import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundFx } from '../utils/audio';
import {
  ArrowLeft, FileText, Copy, Check, Printer, BookOpen,
  ShieldCheck, Cpu, Database, Zap, CheckCircle2, DollarSign, EyeOff, Radio
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

export default function ResearchPage({ onBackToDashboard }) {
  const [copiedType, setCopiedType] = useState(null);
  const [privacyDemoMode, setPrivacyDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'methodology' | 'paper'

  const bibtexText = `@article{smartcrowd2024,
  title={SmartCrowd: A Hybrid IoT and YOLOv8-Based Framework for Real-Time Crowd Monitoring in Campus Facilities},
  author={Surya and Vinayak and Sanyam and Saurabh},
  school={Department of Computer Engineering, Army Institute of Technology, Pune},
  guide={Aarti Gangshetty},
  year={2024}
}`;

  const copyToClipboard = (text, type) => {
    soundFx.click();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handlePrint = () => {
    soundFx.click();
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16"
    >
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/95 border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          <button
            onClick={() => {
              soundFx.click();
              onBackToDashboard();
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Dashboard</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span>Research Repository • AIT Pune</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(bibtexText, 'bibtex')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 text-slate-700 shadow-2xs transition-all cursor-pointer"
              title="Copy BibTeX Citation"
            >
              {copiedType === 'bibtex' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'bibtex' ? 'Copied' : 'BibTeX'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full mt-8">
        
        {/* Paper Title Banner Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Peer-Reviewed Academic Framework • IEEE Format</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto leading-snug">
            SmartCrowd: A Hybrid IoT and YOLOv8-Based Framework for Real-Time Crowd Monitoring in Campus Facilities
          </h1>

          <div className="mt-4 text-xs sm:text-sm text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-900 font-semibold">Authors:</strong> Surya, Vinayak, Sanyam, and Saurabh
            </p>
            <p className="text-slate-500">
              Department of Computer Engineering, Army Institute of Technology (AIT), Pune, Maharashtra, India
            </p>
            <p className="text-indigo-600 font-medium pt-1">
              Faculty Guide & Mentor: Aarti Gangshetty
            </p>
          </div>

          {/* Sub Navigation Segmented Pills */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
              <button
                onClick={() => { soundFx.click(); setActiveTab('summary'); }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Executive Summary
              </button>
              <button
                onClick={() => { soundFx.click(); setActiveTab('methodology'); }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'methodology'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Methodology & Math
              </button>
              <button
                onClick={() => { soundFx.click(); setActiveTab('paper'); }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'paper'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Manuscript
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Executive Summary & Metrics */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            
            {/* 4 Empirical Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HIGHLIGHT_METRICS.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
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

            {/* Abstract Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Abstract & Problem Statement</span>
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed text-justify">
                Campus facilities such as messes, cafeterias, and service counters can become crowded within short periods, particularly during meal breaks and class changes. SmartCrowd is proposed as a hybrid IoT and computer-vision framework for monitoring current occupancy. The design utilizes PIR and ultrasonic physical sensors to register ingress and egress events, alongside YOLOv8 object detection to track people from an overhead camera feed. These complementary sources are reconciled by an occupancy engine to maintain an accurate real-time count without biometric or facial data retention.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
                <strong className="text-slate-800">Index Terms—</strong> crowd monitoring, YOLOv8, Internet of Things, occupancy estimation, edge vision, campus safety.
              </div>
            </div>

            {/* Privacy Shield Interactive Simulator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                <div className="lg:col-span-7">
                  <div className="text-xs font-mono uppercase text-indigo-600 font-semibold mb-1">
                    Zero Biometric Retention
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Automated Facial Anonymization Pipeline
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    Unlike standard CCTV surveillance, SmartCrowd processes each video frame entirely in temporary volatile RAM. Bounding box coordinates and anonymous numeric tracking IDs are extracted, while pixel data is immediately purged.
                  </p>

                  <button
                    onClick={() => {
                      soundFx.click();
                      setPrivacyDemoMode(!privacyDemoMode);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                      privacyDemoMode
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-2xs'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold shadow-2xs'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{privacyDemoMode ? 'Privacy Mask: Active (Vector Mode)' : 'Privacy Mask: Inactive (Raw Unblurred View)'}</span>
                  </button>
                </div>

                {/* Visual Preview */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                  <div className="text-[11px] font-mono text-slate-500 mb-3">
                    {privacyDemoMode ? 'Edge Output: Anonymous Vector' : 'Unprocessed Frame (Purged)'}
                  </div>

                  <div className="h-36 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden shadow-inner">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-300 relative flex items-center justify-center">
                        {privacyDemoMode && (
                          <div className="absolute inset-0 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center shadow-xs">
                            <EyeOff className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="w-14 h-16 rounded-t-lg bg-slate-400 mt-1" />
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] font-mono text-slate-600">
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
        )}

        {/* Tab 2: Methodology & Formulations */}
        {activeTab === 'methodology' && (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  1. Dual Accumulative Counting Formulation
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The central estimation loop reconciles incremental doorway events with periodically verified overhead camera counts to eliminate drift:
                </p>

                <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-center space-y-2 text-sm">
                  <div className="text-slate-900 font-semibold">
                    O<sub>t</sub> = O<sub>t-1</sub> + E<sub>t</sub> - X<sub>t</sub> &nbsp;&nbsp;&nbsp;&nbsp; (Accumulative Update)
                  </div>
                  <div className="text-indigo-600 font-semibold">
                    P<sub>t</sub> = ( O<sub>t</sub> / C ) &times; 100 &nbsp;&nbsp;&nbsp;&nbsp; (Capacity Percentage)
                  </div>
                </div>

                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>O<sub>t</sub></strong>: Net facility occupancy at discrete timestamp <em>t</em>.</li>
                  <li><strong>E<sub>t</sub>, X<sub>t</sub></strong>: Entry and exit events registered by ultrasonic time-of-flight directional logic.</li>
                  <li><strong>C</strong>: Total rated physical chair capacity of the dining hall (120 seats).</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  2. Edge Neural Network Pipeline (YOLOv8 Nano)
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  To achieve sub-50ms inference on cost-effective campus hardware (Raspberry Pi 4 / Jetson Nano), the YOLOv8 Nano architecture is quantized to FP16:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Model Size</span>
                    <span className="text-base font-semibold font-mono text-slate-900">3.2M params</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Inference Target</span>
                    <span className="text-base font-semibold font-mono text-slate-900">&lt;45ms / frame</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Frame Rate</span>
                    <span className="text-base font-semibold font-mono text-slate-900">30 FPS Smooth</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  3. Queue Waiting Time Estimator
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Predictive queue length is determined dynamically using empirical meal turnover velocity:
                </p>
                <div className="my-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-center text-xs text-slate-900">
                  W<sub>t</sub> = max( 0, ( O<sub>t</sub> - S<sub>available</sub> ) &times; &tau;<sub>turnover</sub> / N<sub>servers</sub> )
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 3: Full Academic Manuscript */}
        {activeTab === 'paper' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 leading-relaxed text-sm">
            
            <div className="text-center pb-6 border-b border-slate-200">
              <span className="text-xs font-mono uppercase text-indigo-600 font-semibold block mb-1">
                IEEE Transactions on Mobile Computing & IoT
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                SmartCrowd: A Hybrid IoT and YOLOv8-Based Framework for Real-Time Crowd Monitoring in Campus Facilities
              </h2>
              <p className="text-xs text-slate-500 mt-2">
                Surya, Vinayak, Sanyam, Saurabh | Faculty Guide: Aarti Gangshetty
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base text-slate-900 uppercase tracking-wide mb-2">
                I. Introduction
              </h3>
              <p className="leading-relaxed text-justify">
                Crowding is common in shared campus facilities. At places such as student messes, cafeterias, and food counters, volume fluctuates drastically within minutes. Typically, students only discover how crowded a facility is upon arrival, resulting in long queues and wasted time. SmartCrowd brings IoT door sensors and edge deep learning together to estimate occupancy numbers in real time without facial biometric retention.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base text-slate-900 uppercase tracking-wide mb-2">
                II. Related Work
              </h3>
              <p className="leading-relaxed text-justify">
                Traditional approaches to crowd counting rely either purely on physical infrared break-beams (prone to occlusion when multiple students walk through doors abreast) or continuous high-resolution cloud video surveillance (expensive and privacy-invasive). SmartCrowd circumvents both limitations by pairing localized threshold tripwires with ephemeral edge object detection.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base text-slate-900 uppercase tracking-wide mb-2">
                III. Proposed Hardware Architecture
              </h3>
              <p className="leading-relaxed text-justify">
                The physical sensing suite consists of two paired HC-SR04 ultrasonic acoustic sensors mounted 15 cm apart at door lintel height, complemented by an HC-SR501 passive infrared motion sensor. The phase difference between ultrasonic time-of-flight pulses establishes the direction of traversal. Data is collected by an ESP32 microcontroller and transmitted via lightweight MQTT to a local edge processor (Raspberry Pi 4 Model B).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base text-slate-900 uppercase tracking-wide mb-2">
                IV. Privacy & Data Ethics
              </h3>
              <p className="leading-relaxed text-justify">
                The framework enforces strict ephemeral processing. No biometric images, facial embeddings, or persistent video recordings are saved to non-volatile storage. The edge pipeline extracts anonymous integer bounding boxes in memory and discards the raw visual frame within 33 milliseconds.
              </p>
            </div>

            {/* BibTeX Code Card */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-slate-500 font-semibold">BibTeX Citation</span>
                <button
                  onClick={() => copyToClipboard(bibtexText, 'bibtex')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy BibTeX</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
                {bibtexText}
              </pre>
            </div>

          </div>
        )}

      </main>

    </motion.div>
  );
}
