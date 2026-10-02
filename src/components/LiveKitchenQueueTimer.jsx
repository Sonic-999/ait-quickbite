import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Zap,
  Bell,
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Flame,
  ArrowRight,
  Volume2
} from 'lucide-react';
import { socket, playNotificationChime } from '../socket';
import { triggerHaptic } from '../utils/haptics';

/**
 * Live Kitchen Queue & Countdown Timer Component:
 * - Real-time calculation: Base 5 mins + 2 mins per pending order.
 * - Dynamic countdown timer (MM:SS) synchronized via WebSockets as vendor clears orders.
 * - At exactly 3 minutes (180s), triggers:
 *   1. Native Browser Push Notification
 *   2. Pulsating Visual UI Alert: "🚶‍♂️ Time to go! Leave your room now and your food will be hot right as you arrive."
 */
export default function LiveKitchenQueueTimer({
  activeOrder = null,
  allOrders = [],
  onTrackFullOrder,
}) {
  // Find current active order (Pending or Kitchen Preparing)
  const currentOrder =
    activeOrder ||
    allOrders.find(
      (o) =>
        o.status &&
        !['ready', 'ready for pickup', 'completed', 'delivered', 'cancelled'].includes(
          o.status.toLowerCase()
        )
    ) ||
    allOrders[0] ||
    null;

  const [queueInfo, setQueueInfo] = useState({
    activeOrdersCount: 2,
    ordersAhead: 1,
    estimatedPrepMinutes: 7, // 5 + (1 * 2) = 7 mins default
    basePrepMinutes: 5,
    additionalPerOrderMinutes: 2,
  });

  const [remainingSeconds, setRemainingSeconds] = useState(420); // 7 mins = 420s
  const [isReady, setIsReady] = useState(false);
  const [showThreeMinAlert, setShowThreeMinAlert] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  const hasTriggered3MinAlertRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const initialPrepSecondsRef = useRef(420);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          triggerHaptic(20);
        }
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    }
  };

  // Trigger the 3-minute walking alert
  const triggerThreeMinuteAlert = useCallback(() => {
    if (hasTriggered3MinAlertRef.current) return;
    hasTriggered3MinAlertRef.current = true;
    setShowThreeMinAlert(true);

    // Audio & Haptic feedback
    try {
      playNotificationChime();
      triggerHaptic(60);
    } catch (e) {}

    // Native Browser Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const title = '🚶‍♂️ Time to go! | AIT QuickBite';
      const options = {
        body: 'Leave your room now and your food will be hot right as you arrive.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'ait-time-to-go',
        renotify: true,
      };

      if (Notification.permission === 'granted') {
        try {
          new Notification(title, options);
        } catch (err) {
          console.warn('Native notification instantiation error:', err);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          setNotificationPermission(perm);
          if (perm === 'granted') {
            try {
              new Notification(title, options);
            } catch (err) {}
          }
        });
      }
    }
  }, []);

  // Fetch initial queue data from backend API
  const fetchQueueStatus = useCallback(async () => {
    try {
      const orderParam = currentOrder?.id ? `?orderId=${currentOrder.id}&shop=${encodeURIComponent(currentOrder.shopName || '')}` : '';
      const res = await fetch(`/api/kitchen/queue${orderParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const prepMinutes = data.orderEstimatedPrepMinutes || data.estimated_prep_time || 7;
          const prepSecs = prepMinutes * 60;

          setQueueInfo({
            activeOrdersCount: data.activeOrdersCount || 0,
            ordersAhead: data.ordersAhead != null ? data.ordersAhead : 0,
            estimatedPrepMinutes: prepMinutes,
            basePrepMinutes: data.basePrepMinutes || 5,
            additionalPerOrderMinutes: data.additionalPerOrderMinutes || 2,
          });

          // Compute remaining seconds based on elapsed time since order creation
          const elapsedSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const newRemaining = Math.max(10, prepSecs - elapsedSecs);
          setRemainingSeconds(newRemaining);
          initialPrepSecondsRef.current = prepSecs;

          // Check if already <= 180s (3 minutes)
          if (newRemaining <= 180 && newRemaining > 0) {
            triggerThreeMinuteAlert();
          }
        }
      }
    } catch (err) {
      console.warn('[LiveKitchenQueueTimer] Failed to fetch queue status:', err);
    }
  }, [currentOrder, triggerThreeMinuteAlert]);

  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    // 1. Kitchen Queue Updated event (orders placed or cleared)
    const handleQueueUpdated = (data) => {
      console.log('[Socket.IO Live Queue Update Received]', data);
      if (!data) return;

      let ordersAhead = data.activeOrdersCount || 0;
      let prepMinutes = data.estimated_prep_time || 5;

      // If this specific order is in activeOrders list, find its exact position
      if (currentOrder?.id && Array.isArray(data.activeOrders)) {
        const found = data.activeOrders.find(
          (o) => o.id === currentOrder.id || o.token === currentOrder.token
        );
        if (found) {
          ordersAhead = found.ordersAhead;
          prepMinutes = found.estimated_prep_time;
        } else {
          // If not in activeOrders, order might be marked Ready!
          ordersAhead = 0;
          prepMinutes = 0;
        }
      }

      setQueueInfo({
        activeOrdersCount: data.activeOrdersCount || 0,
        ordersAhead,
        estimatedPrepMinutes: prepMinutes,
        basePrepMinutes: data.basePrepMinutes || 5,
        additionalPerOrderMinutes: data.additionalPerOrderMinutes || 2,
      });

      const updatedTotalSecs = prepMinutes * 60;
      initialPrepSecondsRef.current = Math.max(initialPrepSecondsRef.current, updatedTotalSecs);

      // Adjust countdown to new target
      setRemainingSeconds((prev) => {
        // If orders ahead were cleared by vendor, countdown jumps to new estimated time
        const newSecs = Math.min(prev, updatedTotalSecs);
        if (newSecs <= 180 && newSecs > 0) {
          triggerThreeMinuteAlert();
        }
        return Math.max(0, newSecs);
      });
    };

    // 2. Order status updated (Vendor marks ready/completed)
    const handleOrderStatusUpdated = ({ orderId, status }) => {
      if (currentOrder && (orderId === currentOrder.id || orderId === currentOrder.token)) {
        if (status && status.toLowerCase().includes('ready')) {
          setIsReady(true);
          setRemainingSeconds(0);
          playNotificationChime();
        }
      }
      fetchQueueStatus();
    };

    // 3. Order ready event
    const handleOrderReady = ({ orderId }) => {
      if (currentOrder && (orderId === currentOrder.id || orderId === currentOrder.token)) {
        setIsReady(true);
        setRemainingSeconds(0);
        playNotificationChime();
      }
    };

    socket.on('kitchen:queue_updated', handleQueueUpdated);
    socket.on('order:status_updated', handleOrderStatusUpdated);
    socket.on('order:ready', handleOrderReady);

    // Request queue status immediately upon socket connection
    socket.emit('queue:get_status', {
      orderId: currentOrder?.id,
      shop: currentOrder?.shopName,
    });

    return () => {
      socket.off('kitchen:queue_updated', handleQueueUpdated);
      socket.off('order:status_updated', handleOrderStatusUpdated);
      socket.off('order:ready', handleOrderReady);
    };
  }, [currentOrder, fetchQueueStatus, triggerThreeMinuteAlert]);

  // Local second-by-second countdown timer
  useEffect(() => {
    if (isReady || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;

        // Check if countdown hits EXACTLY 3 minutes (180 seconds)
        if (next === 180 || (next <= 180 && next > 175 && !hasTriggered3MinAlertRef.current)) {
          triggerThreeMinuteAlert();
        }

        if (next <= 0) {
          clearInterval(interval);
          setIsReady(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, remainingSeconds, triggerThreeMinuteAlert]);

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((initialPrepSecondsRef.current - remainingSeconds) / (initialPrepSecondsRef.current || 420)) * 100))
  );

  return (
    <div
      id="live-kitchen-queue-card"
      className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      {/* Background Ambient Glow */}
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-100/50 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header with WebSocket Live Pulsing Dot */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-100 text-[#6b21a8]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Live Kitchen Queue</span>
              {currentOrder && (
                <span className="text-[11px] font-bold bg-purple-100 text-[#6b21a8] px-2 py-0.2 rounded-md">
                  Token #{currentOrder.token || currentOrder.id?.slice(-4)}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Dynamic prep time: Base 5 mins + 2 mins per pending order
            </p>
          </div>
        </div>

        {/* Live WebSocket Status Pill */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
          <span>Live WebSocket Sync</span>
        </div>
      </div>

      {/* 2. Visual 3-Minute Pulse Banner ('Time to go!') */}
      {showThreeMinAlert && !isReady && (
        <div
          id="three-minute-walking-alert"
          className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg animate-pulse ring-4 ring-amber-300/60 transition-all"
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0 animate-bounce">🚶‍♂️</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Time to go!
                </h3>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  ~3 mins away
                </span>
              </div>
              <p className="text-xs font-bold text-amber-50 mt-0.5 leading-snug">
                Leave your room now and your food will be hot right as you arrive.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Live Countdown Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Big Digital Clock */}
        <div className="md:col-span-6 bg-gradient-to-br from-purple-50 to-indigo-50/60 rounded-2xl p-5 border border-purple-100/80 text-center relative">
          <div className="text-[11px] font-bold text-purple-900 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>Estimated Pickup Countdown</span>
          </div>

          <div
            id="live-queue-countdown-timer"
            className={`font-mono text-4xl sm:text-5xl font-black tracking-tight my-1 transition-all ${
              isReady
                ? 'text-emerald-600'
                : remainingSeconds <= 180
                ? 'text-orange-600 animate-pulse'
                : 'text-[#6b21a8]'
            }`}
          >
            {isReady ? 'READY!' : formatTime(remainingSeconds)}
          </div>

          <p className="text-xs text-purple-800 font-semibold mt-1">
            {isReady
              ? '✨ Your order is fresh and waiting at the counter!'
              : remainingSeconds <= 180
              ? '🚶‍♂️ Walking window active (~3 mins remaining)'
              : `Kitchen preparing: ~${Math.ceil(remainingSeconds / 60)} minutes left`}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-purple-200/60 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isReady
                  ? 'bg-emerald-500'
                  : remainingSeconds <= 180
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600'
              }`}
              style={{ width: `${isReady ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Live Queue Metrics Breakdown */}
        <div className="md:col-span-6 space-y-3">
          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#6b21a8] flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Orders Ahead in Queue</span>
                <span className="text-sm font-extrabold text-gray-900">
                  {queueInfo.ordersAhead} {queueInfo.ordersAhead === 1 ? 'order ahead' : 'orders ahead'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#6b21a8] bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
              +{queueInfo.ordersAhead * queueInfo.additionalPerOrderMinutes} mins
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Base Preparation Time</span>
                <span className="text-sm font-extrabold text-gray-900">
                  {queueInfo.basePrepMinutes} Minutes
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
              Standard
            </span>
          </div>

          {/* Native Notification Enable Button */}
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="w-full py-2 px-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6b21a8] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable 3-Min Walking Push Notification</span>
            </button>
          )}

          {/* Quick Simulation / Test Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setRemainingSeconds(180);
                triggerThreeMinuteAlert();
              }}
              className="text-[11px] font-bold text-gray-500 hover:text-purple-700 underline cursor-pointer"
            >
              Test 3-Min Alert Simulation
            </button>

            {onTrackFullOrder && currentOrder && (
              <button
                type="button"
                onClick={() => onTrackFullOrder(currentOrder)}
                className="text-xs font-extrabold text-[#6b21a8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Live Status</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
