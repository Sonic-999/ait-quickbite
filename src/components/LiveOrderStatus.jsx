import React, { useState, useEffect, useRef } from 'react';
import { Check, Clock, MapPin, ArrowLeft, Coffee, Sparkles, AlertCircle, ShoppingBag, QrCode, Maximize2, Bell, Zap, PartyPopper } from 'lucide-react';
import { socket, joinOrderTracking, triggerHTML5Notification, requestNotificationPermission, playNotificationChime } from '../socket';
import DynamicTrackingProgress from './DynamicTrackingProgress';
import { fireCelebratoryConfetti } from '../utils/confetti';

export default function LiveOrderStatus({ order, onBackHome, onViewAllOrders, onOpenQrGenerator }) {
  // Live order state synchronized with SQLite database via WebSockets
  const [liveOrder, setLiveOrder] = useState(order);
  const [currentStep, setCurrentStep] = useState(2); // Steps: 1: 'Order Placed', 2: 'Preparing', 3: 'Ready for Pickup'
  const [readyAlert, setReadyAlert] = useState(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const qrBoxRef = useRef(null);

  useEffect(() => {
    if (order) {
      setLiveOrder(order);
      const s = (order.status || '').toLowerCase();
      if (s.includes('ready') || s.includes('completed')) {
        setCurrentStep(3);
        fireCelebratoryConfetti();
      } else if (s.includes('prep') || s.includes('kitchen')) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    }
  }, [order]);

  /**
   * WebSockets Real-Time Order Tracking (NO HTTP Polling):
   * Listens directly for 'order:ready' and 'order:status_updated' on the student's socket.
   * Instantly updates live tracking screen and triggers HTML5 push notification.
   */
  useEffect(() => {
    const targetId = liveOrder?.id || order?.id;
    const targetToken = liveOrder?.token || order?.token;
    if (!targetId) return;

    let isMounted = true;

    // Request notification permission if not yet decided
    requestNotificationPermission().then((granted) => {
      if (isMounted) setHasNotificationPermission(granted);
    });

    // Join WebSockets order tracking room (handles disconnections & reconnections)
    joinOrderTracking(targetId, targetToken);

    // Initial state sync from database
    const syncInitialStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${targetId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.order) {
            setLiveOrder(data.order);
            const s = (data.order.status || '').toLowerCase();
            if (s.includes('ready') || s.includes('completed')) {
              setCurrentStep(3);
            } else if (s.includes('prep') || s.includes('kitchen')) {
              setCurrentStep(2);
            } else {
              setCurrentStep(1);
            }
          }
        }
      } catch (err) {
        // silent initial sync catch
      }
    };
    syncInitialStatus();

    // Handler when vendor clicks 'Mark as Ready'
    const handleOrderReady = (data) => {
      if (!isMounted) return;
      console.log('[Student Tracking] ⚡ Real-Time order:ready received:', data);

      const matchingOrder = data.order || data;
      const isTarget =
        data.orderId === targetId ||
        matchingOrder.id === targetId ||
        (targetToken && matchingOrder.token === targetToken);

      if (isTarget) {
        setCurrentStep(3);
        setLiveOrder((prev) => ({
          ...prev,
          ...matchingOrder,
          status: 'Ready',
        }));

        const shopTitle = matchingOrder.shopName || matchingOrder.shop_name || 'Campus Kitchen';
        const tokenNum = matchingOrder.token || targetToken || '42';

        setReadyAlert(`🎉 Token #${tokenNum} from ${shopTitle} is READY for counter pickup!`);

        // Celebratory burst of confetti fired exactly when WebSockets notify order is ready!
        fireCelebratoryConfetti();

        // Trigger HTML5 Push Notification + Sound Chime
        triggerHTML5Notification('Your AIT QuickBite Order is Ready! 🎉', {
          body: `Token #${tokenNum} from ${shopTitle} is ready! Collect now without waiting in line.`,
          tag: `ait-order-ready-${targetId}`,
        });
      }
    };

    // General status update handler
    const handleStatusUpdated = ({ orderId, status, order: updated }) => {
      if (!isMounted) return;
      if (orderId === targetId || (updated && updated.id === targetId)) {
        console.log(`[Student Tracking] Real-Time status update: ${status}`);
        setLiveOrder((prev) => ({
          ...prev,
          ...(updated || {}),
          status,
        }));
        const s = (status || '').toLowerCase();
        if (s.includes('ready') || s.includes('completed')) {
          setCurrentStep(3);
        } else if (s.includes('prep') || s.includes('kitchen')) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }
      }
    };

    // Reconnection state synchronization
    const handleSyncSingle = (data) => {
      if (!isMounted || !data.order) return;
      if (data.order.id === targetId || data.order.token === targetToken) {
        setLiveOrder((prev) => ({ ...prev, ...data.order }));
        const s = (data.order.status || '').toLowerCase();
        if (s.includes('ready') || s.includes('completed')) setCurrentStep(3);
      }
    };

    socket.on('order:ready', handleOrderReady);
    socket.on('order:status_updated', handleStatusUpdated);
    socket.on('order:sync_single', handleSyncSingle);

    return () => {
      isMounted = false;
      socket.off('order:ready', handleOrderReady);
      socket.off('order:status_updated', handleStatusUpdated);
      socket.off('order:sync_single', handleSyncSingle);
    };
  }, [liveOrder?.id, order?.id]);

  // Order data to display (live database record preferred)
  const orderData = liveOrder || order || {
    id: 'ord-101',
    token: '42',
    shopName: 'Juice Center',
    location: 'Near Sports Complex & Gym',
    pickupTime: 'In 10 Minutes',
    total: 90,
    items: [
      { name: '1x Fresh Orange Juice', price: 40 },
      { name: '1x Mixed Seasonal Fruit Bowl', price: 50 },
    ],
  };

  const qrPayload = `AIT-ORDER-TOKEN-${orderData.token || '42'}-${(orderData.shopName || 'JuiceCenter').replace(/\s+/g, '')}-${orderData.pickupTime || '10mins'}`;

  // Dynamically generate QR code using qrcode.js CDN library
  useEffect(() => {
    let timer = null;

    const renderOrderQr = () => {
      if (!qrBoxRef.current) return;
      if (typeof window !== 'undefined' && window.QRCode) {
        qrBoxRef.current.innerHTML = '';
        try {
          new window.QRCode(qrBoxRef.current, {
            text: qrPayload,
            width: 140,
            height: 140,
            colorDark: '#6b21a8', // Deep purple brand color
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M,
          });
        } catch (e) {
          console.error('qrcode.js error:', e);
        }
      }
    };

    renderOrderQr();

    if (typeof window !== 'undefined' && !window.QRCode) {
      timer = setInterval(() => {
        if (window.QRCode) {
          clearInterval(timer);
          renderOrderQr();
        }
      }, 150);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [qrPayload]);

  return (
    <div className="bg-[#ffffff] min-h-screen py-10 sm:py-16 border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Real-time Order Ready Celebration Alert */}
        {readyAlert && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0 animate-bounce">
                🎉
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-900">Your Order is Ready!</h4>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">{readyAlert}</p>
              </div>
            </div>
            <button
              onClick={() => setReadyAlert(null)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded bg-white border border-emerald-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Back Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackHome}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#6b21a8] transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campus Home</span>
          </button>

          <div className="flex items-center gap-2">
            {!hasNotificationPermission && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setHasNotificationPermission(granted);
                  if (granted) triggerHTML5Notification('Push Notifications Enabled! 🔔', { body: 'You will receive an alert the exact second your food is ready.' });
                }}
                className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Enable Alerts</span>
              </button>
            )}

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-[#6b21a8] border border-purple-200 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#6b21a8] fill-[#6b21a8]" />
              <span>WebSockets Live</span>
            </span>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Payment Verified
            </span>
          </div>
        </div>

        {/* Central Order Status Card */}
        <div className="bg-[#ffffff] border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center">
          
          {/* Subtitle / Status Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#6b21a8] text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6b21a8]"></span>
            <span>AIT Campus Dining &bull; Live Tracker</span>
          </div>

          {/* Large, Easy-to-Read Order Number in the Center */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            Order #AIT-{orderData.token || '42'}
          </h1>

          <p className="mt-2 text-sm text-gray-500 font-medium">
            Pre-ordered from <strong className="text-gray-900">{orderData.shopName}</strong> &bull; {orderData.location}
          </p>

          {/* Counter Token Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold">
            <span>Counter Pickup Token:</span>
            <span className="font-mono text-base font-extrabold text-[#6b21a8] bg-white px-2.5 py-0.5 rounded border border-purple-200">
              #{orderData.token || '42'}
            </span>
          </div>

          {/* Dynamic SVG Live Tracking Animation (Scooter / Cooking Pan traveling along dashed path) */}
          <DynamicTrackingProgress
            currentStep={currentStep}
            onTriggerTestStep={(step) => {
              setCurrentStep(step);
              if (step === 3) fireCelebratoryConfetti();
            }}
          />

          {/* Friendly Plain-English Text Note */}
          <div className="mt-8 p-4 sm:p-5 rounded-xl bg-purple-50/60 border border-purple-200 text-center max-w-xl mx-auto">
            <p className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
              &ldquo;Relax! We will notify you when your order is ready. No need to stand in the queue.&rdquo;
            </p>
            <p className="mt-1.5 text-xs text-gray-600">
              Estimated Pickup Time: <strong className="text-[#6b21a8] font-bold">{orderData.pickupTime || 'In 10 Minutes'}</strong>
            </p>
          </div>

          {/* Dynamic Digital Counter Pickup QR Pass (Rendered with qrcode.js) */}
          <div className="mt-6 p-5 bg-white border border-gray-200 rounded-2xl max-w-sm mx-auto shadow-xs text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-800">
                <QrCode className="w-4 h-4 text-[#6b21a8]" />
                <span>Digital Pickup QR Pass</span>
              </div>
              {onOpenQrGenerator && (
                <button
                  type="button"
                  onClick={() => onOpenQrGenerator(qrPayload)}
                  className="text-[11px] font-semibold text-[#6b21a8] hover:text-[#581c87] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  Customize QR
                </button>
              )}
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl inline-flex items-center justify-center">
              <div
                ref={qrBoxRef}
                className="min-h-[140px] min-w-[140px] flex items-center justify-center [&_img]:mx-auto [&_canvas]:mx-auto"
              />
            </div>

            <p className="mt-2.5 text-xs text-gray-500 leading-relaxed">
              Show this dynamic QR code at the counter for contactless pickup verification.
            </p>
            <div className="mt-2">
              <span className="inline-block text-[11px] font-mono text-[#6b21a8] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 font-bold">
                TOKEN #{orderData.token || '42'} &bull; QR Verified
              </span>
            </div>
          </div>

          {/* Interactive Simulation Controls (For previewing status transitions) */}
          <div className="mt-6 pt-5 border-t border-gray-100 max-w-md mx-auto">
            <div className="text-xs text-gray-500 font-semibold mb-2">
              Preview Kitchen Progress States:
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  currentStep === 1
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                1. Order Placed
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  currentStep === 2
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                2. Preparing
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  currentStep === 3
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                3. Ready for Pickup
              </button>
            </div>
          </div>

          {/* Order Summary Details Box */}
          <div className="mt-8 text-left max-w-xl mx-auto border border-gray-200 rounded-xl p-5 bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                <ShoppingBag className="w-4 h-4 text-[#6b21a8]" />
                <span>Order Summary</span>
              </div>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Paid: &#8377;{orderData.total}
              </span>
            </div>

            <div className="divide-y divide-gray-100 py-2">
              {(orderData.items || []).map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-800 font-medium">{item.name}</span>
                  <span className="font-semibold text-gray-900">&#8377;{item.price}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Pickup Window: <strong className="text-gray-800 font-semibold">{orderData.pickupTime}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {orderData.shopName} Counter
              </span>
            </div>

            {orderData.utr && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                <span>Verified UPI UTR:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {orderData.utr}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              onClick={onBackHome}
              className="w-full sm:w-auto px-6 py-3 bg-[#6b21a8] hover:bg-[#581c87] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Order Another Meal
            </button>

            <button
              onClick={onViewAllOrders}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              View All Campus Orders
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
