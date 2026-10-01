import { io } from 'socket.io-client';

// Connect directly to backend or through Vite reverse proxy
const SOCKET_URL = typeof window !== 'undefined'
  ? (window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin)
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

// Logging connection states
socket.on('connect', () => {
  console.log(`[Socket.IO Client] Connected to backend! Socket ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.warn(`[Socket.IO Client] Disconnected (${reason}). Auto-reconnecting...`);
});

socket.on('connect_error', (error) => {
  console.error('[Socket.IO Client] Connection error:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`[Socket.IO Client] Successfully reconnected after ${attemptNumber} attempts.`);
});

/**
 * Access the current client socket ID
 */
export function getSocketId() {
  return socket.id || null;
}

/**
 * Join a vendor specific room (e.g. room_juice_center)
 * Handles disconnections and reconnections automatically.
 */
export function joinVendorRoom(shopName, vendorId = 'canteen-vendor') {
  const emitJoin = () => {
    console.log(`[Socket.IO Client] Emitting vendor:join_room for shop: "${shopName}"`);
    socket.emit('vendor:join_room', {
      shop: shopName,
      vendorId,
    });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }

  // Ensure re-joining upon reconnection
  socket.off('reconnect_vendor_room');
  socket.on('reconnect', () => {
    console.log(`[Socket.IO Client] Re-joining vendor room for "${shopName}" after reconnect`);
    emitJoin();
  });
}

/**
 * Join an order tracking room for students
 */
export function joinOrderTracking(orderId, token) {
  if (!orderId && !token) return;

  const emitJoin = () => {
    console.log(`[Socket.IO Client] Emitting order:join_tracking for order: ${orderId || token}`);
    socket.emit('order:join_tracking', {
      orderId,
      token,
    });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }

  socket.on('reconnect', () => {
    emitJoin();
  });
}

/**
 * Play high-fidelity notification sound using HTML5 Audio API
 */
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function playNotificationChime() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.play().catch((err) => {
      console.warn('[Audio] Autoplay requires user interaction first:', err.message);
    });
  } catch (err) {
    console.error('[Audio] Error playing alert chime:', err);
  }
}

/**
 * Request HTML5 Push Notification Permission
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[Push Notification] Notifications not supported in this environment');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('[Push Notification] Permission request failed:', err);
      return false;
    }
  }

  return false;
}

/**
 * Trigger an HTML5 system push notification + sound alert
 */
export function triggerHTML5Notification(title, options = {}) {
  // Always trigger sound
  playNotificationChime();

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: options.body || 'Your order is ready for pickup at the campus counter!',
        icon: options.icon || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        tag: options.tag || 'ait-quickbite-ready',
        renotify: true,
        silent: false,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (err) {
      console.warn('[Push Notification] Failed to display notification:', err);
    }
  }
  return null;
}

/**
 * =======================================================================
 * GROUP ORDER / MULTIPLAYER CART SOCKET HELPERS
 * =======================================================================
 */

export function joinGroupRoom(sessionId, user) {
  if (!sessionId) return;
  const emitJoin = () => {
    console.log(`[Socket.IO Client] Emitting group:join for session: ${sessionId} by ${user?.name}`);
    socket.emit('group:join', {
      sessionId,
      user,
    });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }

  socket.on('reconnect', () => {
    emitJoin();
  });
}

export function emitGroupCartUpdate(sessionId, { item, delta, user }) {
  if (!sessionId) return;
  socket.emit('group:cart_update', {
    sessionId,
    item,
    delta,
    user,
  });
}

export function emitGroupCursor(sessionId, userId, cursor) {
  if (!sessionId) return;
  socket.emit('group:cursor_move', {
    sessionId,
    userId,
    cursor,
  });
}

export function emitGroupActivity(sessionId, text, user) {
  if (!sessionId) return;
  socket.emit('group:activity', {
    sessionId,
    text,
    user,
  });
}

export function emitGroupPayShare(sessionId, participantId, utr) {
  if (!sessionId) return;
  socket.emit('group:pay_share', {
    sessionId,
    participantId,
    utr,
  });
}

export function emitGroupDispatchOrder(sessionId, orderDetails = {}) {
  if (!sessionId) return;
  socket.emit('group:dispatch_order', {
    sessionId,
    ...orderDetails,
  });
}

