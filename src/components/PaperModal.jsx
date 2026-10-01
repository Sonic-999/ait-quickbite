import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFx } from '../utils/audio';
import {
  X, Printer, Copy, Check, FileText, BookOpen
} from 'lucide-react';

export default function PaperModal({ isOpen, onClose }) {
  const [copiedType, setCopiedType] = useState(null);

  if (!isOpen) return null;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
        
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden bg-white"
        >
          {/* Top Clean Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">Research Paper Manuscript</h3>
                <p className="text-[11px] text-slate-500">Department of Computer Engineering • AIT Pune</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(bibtexText, 'bibtex')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-mono text-slate-700 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="Copy BibTeX Citation"
              >
                {copiedType === 'bibtex' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'bibtex' ? 'Copied' : 'BibTeX'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-mono text-slate-700 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>

              <button
                onClick={() => {
                  soundFx.click();
                  onClose();
                }}
                className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 active:scale-95 transition-all cursor-pointer ml-1 shadow-2xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paper Content Scroll View */}
          <div className="p-6 sm:p-10 overflow-y-auto text-slate-700 space-y-6 leading-relaxed text-xs sm:text-sm">
            
            {/* Paper Header Block */}
            <div className="text-center pb-6 border-b border-slate-200">
              <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 mb-3 font-medium">
                Research Paper • IEEE Two-Column Format
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 max-w-3xl mx-auto leading-snug tracking-tight">
                SmartCrowd: A Hybrid IoT and YOLOv8-Based Framework for Real-Time Crowd Monitoring in Campus Facilities
              </h1>
              
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>
                  <strong className="text-slate-800">Authors:</strong> Surya, Vinayak, Sanyam, and Saurabh
                </div>
                <div>
                  Department of Computer Engineering, Army Institute of Technology, Pune, India
                </div>
                <div className="text-indigo-600 font-medium pt-0.5">
                  Faculty Guide: Aarti Gangshetty
                </div>
              </div>
            </div>

            {/* Abstract */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h2 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Abstract
              </h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Campus facilities such as messes, cafeterias, and service counters can become crowded within short periods, particularly during meal breaks and class changes. SmartCrowd is proposed as a hybrid IoT and computer-vision framework for monitoring current occupancy. The design utilizes PIR and ultrasonic physical sensors to register ingress and egress events, alongside YOLOv8 object detection to track people from an overhead camera feed. These complementary sources are reconciled by an occupancy engine to maintain an accurate real-time count.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 text-xs font-mono text-slate-500">
                <strong className="text-slate-700">Index Terms—</strong> crowd monitoring, YOLOv8, Internet of Things, occupancy estimation, edge vision.
              </div>
            </div>

            {/* Section I */}
            <div>
              <h2 className="font-semibold text-sm text-slate-900 mb-2 uppercase tracking-wide">I. Introduction</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Crowding is common in shared campus facilities. At places such as student messes, cafeterias, and food counters, volume fluctuates drastically within minutes. Typically, students only discover how crowded a facility is upon arrival. SmartCrowd brings IoT door sensors and edge deep learning together to estimate occupancy numbers in real time without facial biometric retention.
              </p>
            </div>

            {/* Section IV: Architecture and Math */}
            <div>
              <h2 className="font-semibold text-sm text-slate-900 mb-2 uppercase tracking-wide">IV. Proposed Architecture & Formulation</h2>
              <p className="text-slate-600 leading-relaxed">
                The framework is structured into four primary tiers: physical sensing, edge vision, reconciliation engine, and client dashboards.
              </p>
              <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-center space-y-2 text-xs">
                <div className="text-slate-800">
                  O<sub>t</sub> = O<sub>t-1</sub> + E<sub>t</sub> - X<sub>t</sub> &nbsp;&nbsp;&nbsp;&nbsp; (Accumulative Update)
                </div>
                <div className="text-indigo-600 font-semibold">
                  P<sub>t</sub> = ( O<sub>t</sub> / C ) &times; 100 &nbsp;&nbsp;&nbsp;&nbsp; (Capacity Percentage)
                </div>
              </div>
            </div>

            {/* Section VIII */}
            <div>
              <h2 className="font-semibold text-sm text-slate-900 mb-2 uppercase tracking-wide">VIII. Privacy, Security & Ethics</h2>
              <p className="text-slate-600 leading-relaxed text-justify">
                Facility occupancy monitoring does not require individual facial recognition. Ephemeral numeric tracking IDs follow persons across frames in memory, while camera frame buffers are purged immediately after bounding box calculation.
              </p>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div>
              Army Institute of Technology, Pune
            </div>
            <button
              onClick={() => {
                soundFx.click();
                onClose();
              }}
              className="px-3.5 py-1 rounded bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 transition-all cursor-pointer shadow-2xs font-sans font-medium"
            >
              Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
