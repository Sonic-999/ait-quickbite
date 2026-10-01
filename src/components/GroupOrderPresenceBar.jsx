import React, { useState, useEffect } from 'react';
import { Users, Share2, Copy, Check, Sparkles, MessageCircle, DollarSign, X } from 'lucide-react';

/**
 * Group Order Live Presence Bar
 * Shows connected friends, live activity ticker, and quick invite actions.
 */
export default function GroupOrderPresenceBar({
  session,
  currentUser,
  onOpenInviteModal,
  onLeaveGroup,
}) {
  if (!session) return null;

  const participants = session.participants || [];
  const latestActivity = session.activities && session.activities.length > 0 ? session.activities[0] : null;
  const splitBill = session.splitBill || { totalAmount: 0, perPersonAmount: 0, numParticipants: 1 };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <div className="bg-gradient-to-r from-purple-900 via-[#6b21a8] to-purple-800 text-white rounded-2xl p-3.5 sm:p-4 shadow-xl border border-purple-400/30 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Room Badge & Connected Friends Avatars */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0 shadow-inner">
            <Users className="w-5 h-5 text-purple-200" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-purple-200 bg-white/10 px-2 py-0.5 rounded">
                Room #{session.id}
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {participants.length} {participants.length === 1 ? 'Friend' : 'Friends'} Connected
              </span>
            </div>

            {/* Stack of Active Avatars */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {participants.map((p) => {
                const isYou = currentUser && p.id === currentUser.id;
                return (
                  <div
                    key={p.id}
                    title={`${p.name}${isYou ? ' (You)' : ''}${p.isHost ? ' - Host' : ''}${p.hasPaid ? ' - Paid' : ''}`}
                    className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-transform hover:scale-105 ${
                      isYou
                        ? 'bg-purple-600/90 text-white border-purple-300 ring-2 ring-purple-300/40'
                        : 'bg-white/15 text-white border-white/20'
                    }`}
                  >
                    <span>{p.avatar || '👤'}</span>
                    <span className="truncate max-w-[90px]">{p.name}</span>
                    {p.isHost && (
                      <span className="text-[10px] text-amber-300 font-black">★</span>
                    )}
                    {p.hasPaid && (
                      <span className="text-[10px] text-emerald-300 font-bold">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Live Activity Ticker */}
        {latestActivity && (
          <div className="w-full md:w-auto md:max-w-xs flex-1 bg-black/20 rounded-xl px-3 py-1.5 border border-white/10 flex items-center gap-2 text-xs">
            <span className="text-sm flex-shrink-0 animate-bounce">
              {latestActivity.avatar || '💬'}
            </span>
            <span className="truncate text-purple-100 font-medium">
              {latestActivity.text}
            </span>
          </div>
        )}

        {/* Right: Auto-Split Bill Pill & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto flex-wrap">
          {splitBill.totalAmount > 0 && (
            <div className="bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 rounded-xl text-left">
              <div className="text-[10px] text-emerald-200 uppercase font-extrabold tracking-wider">
                Auto-Split Bill
              </div>
              <div className="text-xs font-black text-white">
                ₹{splitBill.perPersonAmount} <span className="text-emerald-200 font-medium">/ friend</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenInviteModal}
            className="py-2 px-3.5 bg-white text-[#6b21a8] hover:bg-purple-50 text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Friends</span>
          </button>

          {onLeaveGroup && (
            <button
              type="button"
              onClick={onLeaveGroup}
              title="Leave Group Cart"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
