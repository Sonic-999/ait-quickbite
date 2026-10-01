import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Share2, Users, QrCode, Sparkles } from 'lucide-react';

/**
 * Group Order Invite Modal
 * Displays the unique shareable link (e.g. /cart/session/xyz123), QR code,
 * and current participant list.
 */
export default function GroupInviteModal({
  isOpen,
  onClose,
  sessionId,
  session,
  participants = [],
}) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const activeSessionId = sessionId || session?.id;
  const activeParticipants = participants.length > 0 ? participants : (session?.participants || []);

  // Build clean shareable room link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const shareUrl = activeSessionId ? `${origin}/cart/session/${activeSessionId}` : '';

  // Render QR Code using window.QRCode (called unconditionally to satisfy React rules of hooks)
  useEffect(() => {
    if (!isOpen || !activeSessionId || !shareUrl) return;
    if (qrRef.current && typeof window !== 'undefined' && window.QRCode) {
      qrRef.current.innerHTML = '';
      try {
        new window.QRCode(qrRef.current, {
          text: shareUrl,
          width: 140,
          height: 140,
          colorDark: '#6b21a8',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        console.error('QR render error:', e);
      }
    }
  }, [isOpen, activeSessionId, shareUrl]);

  if (!isOpen || !activeSessionId) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my AIT QuickBite Group Order!',
          text: `Hey! I started a group cart on AIT QuickBite. Tap this link to add your food to our shared order:`,
          url: shareUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b21a8] to-purple-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-snug">Invite Friends to Cart</h3>
              <p className="text-xs text-purple-200 font-medium">Room ID: #{sessionId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Shareable Link Input with One-Click Copy */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
              Shareable Room Link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="share-link-input"
                readOnly
                value={shareUrl}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-800 truncate select-all outline-none"
              />
              <button
                id="btn-copy-share-link"
                type="button"
                onClick={handleCopyLink}
                className={`py-2 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#6b21a8] hover:bg-[#581c87] text-white active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick QR Code for In-Person Phone Camera Scanning */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 flex items-center gap-4">
            <div
              ref={qrRef}
              className="bg-white p-2 rounded-xl shadow-xs border border-purple-200 flex-shrink-0 flex items-center justify-center min-w-[96px] min-h-[96px]"
            >
              {/* Fallback SVG QR if qrcode.js not loaded */}
              <QrCode className="w-16 h-16 text-[#6b21a8]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-gray-900">Scan with Phone Camera</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Friends sitting next to you can scan this QR code to join the shared cart instantly!
              </p>
              <button
                type="button"
                onClick={handleNativeShare}
                className="mt-2 text-xs font-bold text-[#6b21a8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp / Apps</span>
              </button>
            </div>
          </div>

          {/* Live Connected Friends List */}
          <div>
            <div className="flex items-center justify-between text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
              <span>Friends In Cart ({participants.length})</span>
              <span className="text-emerald-600 flex items-center gap-1 normal-case font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs font-semibold text-gray-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{p.avatar || '👤'}</span>
                    <div>
                      <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isHost && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-black">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {p.hasPaid ? 'Paid their share' : 'Selecting items...'}
                      </div>
                    </div>
                  </div>

                  {p.hasPaid ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Paid
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Ordering
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Close */}
          <button
            id="btn-close-invite-modal"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>

        </div>

      </div>
    </div>
  );
}
