import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  WifiOff,
  Bell,
  Sparkles,
  CheckCircle2,
  Share,
  PlusSquare,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { triggerInstallPrompt, isRunningStandalone } from '../registerServiceWorker';

export default function A2HSInstallPrompt({
  isOpen,
  onClose,
  orderToken = '',
  onInstallSuccess,
}) {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
      setIsIOS(isApple);
      setIsInstalled(isRunningStandalone());
    }
  }, []);

  if (!isOpen || isInstalled) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    const result = await triggerInstallPrompt();
    setInstalling(false);

    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      if (onInstallSuccess) onInstallSuccess();
      onClose();
    } else if (result.outcome === 'unavailable' && isIOS) {
      // iOS fallback is already shown in UI
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Decorative Banner */}
        <div className="relative bg-gradient-to-br from-[#8b5cf6] via-[#6b21a8] to-[#4c1d95] text-white p-6 pb-7 text-center overflow-hidden">
          {/* Subtle background glow circles */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Icon with golden lightning badge */}
          <div className="relative inline-block mx-auto mb-3">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border-2 border-white/80 overflow-hidden mx-auto">
              <img
                src="/icons/icon-192x192.png"
                alt="QuickBite App Icon"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="text-2xl font-black text-[#6b21a8]">QB</span>';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>

          {/* Order Success Confirmation Tag */}
          {orderToken && (
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 border border-white/20 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Order #{orderToken} Confirmed!</span>
            </div>
          )}

          <h3 className="text-xl font-extrabold tracking-tight text-white">
            Install AIT QuickBite App
          </h3>
          <p className="text-xs text-purple-100/90 mt-1 max-w-xs mx-auto">
            Add to your home screen for zero-wait campus dining and instant counter pickup alerts.
          </p>
        </div>

        {/* Benefits List */}
        <div className="p-6 space-y-4 bg-white">
          <div className="space-y-3">
            
            {/* Benefit 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100/80">
              <div className="w-8 h-8 rounded-lg bg-[#6b21a8] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Standalone App Experience</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Runs fullscreen without the browser URL bar or navigation clutter.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100/80">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Cache-First Offline Engine</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Opens in milliseconds and browses menus even on weak hostel &amp; campus Wi-Fi.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Live Kitchen &amp; Token Alerts</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Receive instant notifications when your food is hot and ready at the counter.
                </p>
              </div>
            </div>

          </div>

          {/* iOS Safari Specific Instructions */}
          {isIOS ? (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs text-gray-700">
              <div className="font-bold flex items-center gap-1.5 text-gray-900">
                <Share className="w-4 h-4 text-[#6b21a8]" />
                <span>How to Install on iPhone / iPad:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600 pl-1">
                <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-gray-700" />).</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {!isIOS ? (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3.5 px-4 bg-[#6b21a8] hover:bg-[#581c87] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Opening Install Dialog...' : 'Add to Home Screen'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-[#6b21a8] hover:bg-[#581c87] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Got It &bull; Continue to Order Tracking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer text-center"
            >
              Maybe Later
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Standard PWA &bull; Uses ~1 MB storage &bull; No app store required</span>
          </div>

        </div>

      </div>
    </div>
  );
}
