import React, { useEffect, useState } from 'react';
import { socket, emitGroupCursor } from '../socket';

/**
 * Multiplayer Cursors Component
 * Renders live cursors of other participants connected to the same Group Cart session.
 */
export default function MultiplayerCursors({ sessionId, currentUser }) {
  const [remoteCursors, setRemoteCursors] = useState({});

  useEffect(() => {
    if (!sessionId || !currentUser) return;

    // Listen to remote cursor moves
    const handleRemoteCursor = ({ userId, cursor }) => {
      if (userId === currentUser.id) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: {
          ...cursor,
          lastSeen: Date.now(),
        },
      }));
    };

    socket.on('group:remote_cursor', handleRemoteCursor);

    // Throttle local mousemove to 40ms (~25fps)
    let lastEmit = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastEmit > 40) {
        lastEmit = now;
        emitGroupCursor(sessionId, currentUser.id, {
          x: e.clientX,
          y: e.clientY,
          name: currentUser.name,
          color: currentUser.color || '#6b21a8',
          avatar: currentUser.avatar || '👨‍🎓',
          visible: true,
        });
      }
    };

    const handleMouseLeave = () => {
      emitGroupCursor(sessionId, currentUser.id, {
        visible: false,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Clean up stale cursors (not updated for > 5 seconds)
    const cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - 5000;
      setRemoteCursors((prev) => {
        let changed = false;
        const next = {};
        for (const [uid, c] of Object.entries(prev)) {
          if (c.lastSeen > cutoff && c.visible) {
            next[uid] = c;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      socket.off('group:remote_cursor', handleRemoteCursor);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearInterval(cleanupInterval);
    };
  }, [sessionId, currentUser?.id]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Object.entries(remoteCursors).map(([userId, c]) => {
        if (!c.visible) return null;
        return (
          <div
            key={userId}
            className="absolute transition-transform duration-75 ease-out flex items-start gap-1"
            style={{
              transform: `translate3d(${c.x}px, ${c.y}px, 0)`,
            }}
          >
            {/* SVG Cursor Pointer */}
            <svg
              className="w-5 h-5 -rotate-45 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={c.color || '#6b21a8'}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <polygon points="3,3 21,9 12,12 9,21" />
            </svg>

            {/* Name & Avatar Badge */}
            <div
              className="px-2 py-0.5 rounded-full text-white text-[11px] font-extrabold shadow-md flex items-center gap-1 select-none whitespace-nowrap"
              style={{ backgroundColor: c.color || '#6b21a8' }}
            >
              <span>{c.avatar || '👤'}</span>
              <span>{c.name || 'Friend'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
