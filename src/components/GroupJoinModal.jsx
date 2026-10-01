import React, { useState } from 'react';
import { Users, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

const AVATAR_OPTIONS = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '🦊', '🦁', '🐼', '🍕', '🚀', '⚡', '☕'];
const QUICK_NAMES = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Rohan', 'Ananya'];

/**
 * Group Order Join Modal
 * Prompt shown to friends when opening a group link, letting them choose their name and avatar.
 */
export default function GroupJoinModal({
  isOpen,
  sessionId,
  onJoin,
}) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🎓');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter your name to join the cart.');
      return;
    }

    onJoin({
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      avatar: selectedAvatar,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#6b21a8] to-purple-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center text-2xl mb-3 shadow-inner">
            {selectedAvatar}
          </div>
          <h3 className="text-xl font-black">Join Group Order</h3>
          <p className="text-xs text-purple-200 font-medium mt-1">
            Room Code: <strong className="text-white font-mono uppercase bg-white/20 px-2 py-0.5 rounded">#{sessionId}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
              Pick Your Avatar
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                    selectedAvatar === av
                      ? 'bg-purple-100 border-2 border-[#6b21a8] scale-105 shadow-xs'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
              Your Name
            </label>
            <input
              id="input-friend-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6b21a8] focus:bg-white transition-all"
            />
            {error && (
              <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>
            )}

            {/* Quick Name Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-gray-400 font-medium">Suggestions:</span>
              {QUICK_NAMES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setName(qn)}
                  className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-join-group"
            type="submit"
            className="w-full py-3 bg-[#6b21a8] hover:bg-[#581c87] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter Group Cart</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <p className="text-[11px] text-center text-gray-500 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Synced in real-time with WebSockets</span>
          </p>

        </form>

      </div>
    </div>
  );
}
