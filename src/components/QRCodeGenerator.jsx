import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Copy, Check, RefreshCw, X, Sparkles, ShieldCheck } from 'lucide-react';

export default function QRCodeGenerator({
  initialText = 'AIT-QUICKBITE-ORDER-42',
  title = 'Dynamic QR Code Generator',
  subtitle = 'Generate scan-ready QR codes for campus orders, payments, and student tokens.',
  isModal = false,
  isOpen = true,
  onClose,
}) {
  const [text, setText] = useState(initialText);
  const [color, setColor] = useState('#6b21a8'); // Default brand deep purple
  const [size, setSize] = useState(180);
  const [copied, setCopied] = useState(false);
  const [isQrReady, setIsQrReady] = useState(false);

  const qrContainerRef = useRef(null);

  // Sync initialText if changed from outside
  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  // Render QR Code dynamically using qrcode.js CDN library
  useEffect(() => {
    let checkInterval = null;

    const renderQR = () => {
      if (!qrContainerRef.current) return;

      // Check if window.QRCode is loaded from CDN
      if (typeof window !== 'undefined' && window.QRCode) {
        qrContainerRef.current.innerHTML = '';
        try {
          new window.QRCode(qrContainerRef.current, {
            text: text || 'AIT-QUICKBITE',
            width: size,
            height: size,
            colorDark: color,
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.H,
          });
          setIsQrReady(true);
        } catch (err) {
          console.error('Error rendering QR code with qrcode.js:', err);
        }
      } else {
        // Retry polling for script load if not yet ready
        setIsQrReady(false);
      }
    };

    renderQR();

    // If qrcode.js hasn't finished loading yet, check every 150ms
    if (typeof window !== 'undefined' && !window.QRCode) {
      checkInterval = setInterval(() => {
        if (window.QRCode) {
          clearInterval(checkInterval);
          renderQR();
        }
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [text, color, size]);

  const handleDownload = () => {
    if (!qrContainerRef.current) return;
    const img = qrContainerRef.current.querySelector('img');
    const canvas = qrContainerRef.current.querySelector('canvas');

    let dataUrl = '';
    if (img && img.src) {
      dataUrl = img.src;
    } else if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    }

    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `AIT_QRCode_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets = [
    { label: 'Live Order #42', value: 'AIT-ORDER-TOKEN-42-NESCAFE-CONFIRMED' },
    { label: 'Campus Menu Link', value: 'https://aitquickbite.campus/shops/juice-center' },
    { label: 'UPI Fast Pay', value: 'upi://pay?pa=aitcanteen@campus&pn=AITQuickBite&am=90' },
    { label: 'Student Gate Pass', value: 'STUDENT-AIT-PUNE-ROLL-21045' },
  ];

  const content = (
    <div className="bg-[#ffffff] text-[#1f2937] p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-sm max-w-xl mx-auto">
      
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6b21a8] flex items-center justify-center border border-purple-200 shadow-xs">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        
        {/* Left: QR Display Box */}
        <div className="sm:col-span-6 flex flex-col items-center justify-center p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-xs inline-flex items-center justify-center">
            {/* Target element for qrcode.js */}
            <div
              ref={qrContainerRef}
              className="flex items-center justify-center min-h-[160px] min-w-[160px] [&_img]:mx-auto [&_canvas]:mx-auto"
            />
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>High-accuracy Error Correction (Level H)</span>
          </div>
        </div>

        {/* Right: Controls & Presets */}
        <div className="sm:col-span-6 space-y-4">
          
          {/* Text/Data Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              QR Code Payload / Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, token, or URL..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-[#6b21a8] transition-colors"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Quick Campus Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setText(p.value)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    text === p.value
                      ? 'bg-purple-50 text-[#6b21a8] border-purple-300 font-bold'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color & Size Customization */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Purple', val: '#6b21a8' },
                  { name: 'Dark', val: '#1f2937' },
                  { name: 'Green', val: '#059669' },
                ].map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => setColor(c.val)}
                    style={{ backgroundColor: c.val }}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                      color === c.val ? 'ring-2 ring-offset-2 ring-purple-400 scale-110' : 'opacity-80'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 text-xs rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-[#6b21a8]"
              >
                <option value={140}>Small (140px)</option>
                <option value={180}>Medium (180px)</option>
                <option value={220}>Large (220px)</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#6b21a8] hover:bg-[#581c87] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Payload!' : 'Copy Text'}</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-400 font-mono">
          Powered by qrcode.js
        </span>
      </div>

    </div>
  );

  if (isModal) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <div className="animate-in fade-in zoom-in-95 duration-150 w-full max-w-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
