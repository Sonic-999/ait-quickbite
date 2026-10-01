import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundFx } from '../utils/audio';
import { ShieldCheck, Cpu, Radio, Eye, ArrowRight, Terminal } from 'lucide-react';

const BOOT_STEPS = [
  { text: "Initializing PIR & Ultrasonic Nodes (HC-SR501 / HC-SR04)...", icon: Radio },
  { text: "Loading YOLOv8 Edge Weights (TensorRT FP16 3.2M params)...", icon: Eye },
  { text: "Calibrating Dual Accumulative Occupancy Engine...", icon: Cpu },
  { text: "Connecting AIT Pune Campus Dining Telemetry Feed...", icon: Terminal },
  { text: "Enforcing Privacy Shield: Zero Persistent Biometric Retention...", icon: ShieldCheck },
];

export default function BootScreen({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < BOOT_STEPS.length - 1) {
          soundFx.click();
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 400);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    setProgress(Math.round(((currentStep + 1) / BOOT_STEPS.length) * 100));
  }, [currentStep]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-slate-900 p-4"
    >
      {/* Clean Technical System Init Box */}
      <div className="w-full max-w-md p-6 rounded-xl bg-white border border-slate-200 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900">SmartCrowd</span>
            <span className="text-xs text-slate-500 font-mono">v1.0-AIT</span>
          </div>
          <span className="text-xs font-mono text-indigo-600 font-semibold">{progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Terminal Line */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5 font-mono text-xs text-slate-700 min-h-[48px]">
          {React.createElement(BOOT_STEPS[currentStep].icon, {
            className: "w-4 h-4 text-indigo-600 flex-shrink-0"
          })}
          <span>{BOOT_STEPS[currentStep].text}</span>
        </div>

        {/* Action Skip */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              soundFx.click();
              onComplete();
            }}
            className="px-3 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <span>Skip Initialization</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
