import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  ChefHat,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  Store,
  ArrowRight,
  ArrowLeft,
  Check,
  Maximize2,
  Minimize2,
  PlusCircle,
  ExternalLink,
  Sparkles,
  Zap,
  ShoppingBag,
  User,
  Hash,
  X
} from 'lucide-react';
import { socket, getSocketId } from '../socket';
import {
  startLoopingChime,
  stopLoopingChime,
  isChimeLooping,
  setMuteState,
  getMuteState,
  playKitchenChime,
  playOrderReadySound,
  unlockAudioContext
} from '../utils/kdsAudio';

const VENDOR_SHOPS = [
  { id: 'all', name: 'All Campus Kitchens' },
  { id: 'JuiceCenter', name: 'Juice Center' },
  { id: 'MainCanteen', name: 'Main Canteen' },
  { id: 'NescafeBooth', name: 'Nescafe Booth' },
  { id: 'CampusBakery', name: 'Campus Bakery' },
];

export default function KitchenDisplaySystem({ initialOrders = [], onSwitchToStudentView }) {
  const navigate = useNavigate();

  // 1. Security PIN state (Default PIN: 1234 or AIT2026)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('ait_kds_auth') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // 2. KDS Orders and Filtering
  const [orders, setOrders] = useState(initialOrders);
  const [selectedShop, setSelectedShop] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');

  // 3. Audio Alarm & Sound Notification State
  const [soundMuted, setSoundMuted] = useState(getMuteState());
  const [activeAlarmOrder, setActiveAlarmOrder] = useState(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 4. Time Ticker for Live Elapsed Prep Timers (updates every 5s)
  const [tickerTime, setTickerTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTickerTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active orders from backend SQLite
  const fetchKdsOrders = async () => {
    setIsLoading(true);
    try {
      const url = selectedShop === 'all'
        ? '/api/vendor/orders?shop=all'
        : `/api/vendor/orders?shop=${encodeURIComponent(selectedShop)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('[KDS] Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchKdsOrders();
    }
  }, [isAuthenticated, selectedShop]);

  // Audio Context unlock listener
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudioContext();
      setIsAudioUnlocked(true);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // WebSockets Real-Time Listeners for KDS
  useEffect(() => {
    if (!isAuthenticated) return;

    // Join KDS display room
    socket.emit('kds:join', { vendorId: 'kds_terminal_01' });

    // When student completes checkout
    const handleNewOrder = (payload) => {
      const order = payload?.order || payload;
      if (!order || !order.id) return;

      console.log('[KDS] 🚨 New Order popped up via WebSocket:', order);

      // Add to orders state (or update if already exists)
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === order.id);
        if (exists) return prev;
        return [order, ...prev];
      });

      // Highlight the new card
      setNewlyArrivedIds((prev) => new Set([...prev, order.id]));
      setTimeout(() => {
        setNewlyArrivedIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 15000);

      // Trigger loud looping chime alarm!
      setActiveAlarmOrder(order);
      startLoopingChime();
    };

    // When status is updated anywhere
    const handleStatusUpdated = ({ orderId, status, order: updated }) => {
      console.log(`[KDS] Status update for ${orderId} -> ${status}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...(updated || {}), status } : o))
      );
    };

    socket.on('order:new', handleNewOrder);
    socket.on('kds:new_order', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdated);
    socket.on('kds:status_updated', handleStatusUpdated);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('kds:new_order', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdated);
      socket.off('kds:status_updated', handleStatusUpdated);
      stopLoopingChime();
    };
  }, [isAuthenticated]);

  // Handle PIN verification
  const handlePinSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = pinInput.trim();
    if (clean === '1234' || clean.toUpperCase() === 'AIT2026' || clean === '0000') {
      setIsAuthenticated(true);
      sessionStorage.setItem('ait_kds_auth', 'true');
      setPinError(false);
      setPinInput('');
      unlockAudioContext();
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleQuickUnlock = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('ait_kds_auth', 'true');
    setPinError(false);
    unlockAudioContext();
  };

  const handleLockTerminal = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('ait_kds_auth');
    stopLoopingChime();
  };

  // Status transition handlers (New Orders -> Preparing -> Ready -> Completed)
  const handleUpdateStatus = async (orderId, newStatus) => {
    // If moving from New to Preparing or Ready, silence alarm
    if (activeAlarmOrder && activeAlarmOrder.id === orderId) {
      stopLoopingChime();
      setActiveAlarmOrder(null);
    }

    // Play ready sound feedback if moving to Ready
    if (newStatus === 'Ready') {
      playOrderReadySound();
    } else if (newStatus === 'Preparing') {
      playKitchenChime();
    }

    // Optimistically update local state
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    // 1. Emit via WebSocket
    socket.emit('kds:update_status', { orderId, status: newStatus });
    if (newStatus === 'Ready') {
      socket.emit('order:mark_ready', { orderId });
    }

    // 2. Call REST endpoint to persist in SQLite and trigger backend notifications
    try {
      await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
    } catch (err) {
      console.error('[KDS] Status update error:', err);
    }
  };

  // Silence Alarm manually
  const handleSilenceAlarm = () => {
    stopLoopingChime();
    setActiveAlarmOrder(null);
  };

  // Toggle master sound mute
  const handleToggleMute = () => {
    const nextState = !soundMuted;
    setSoundMuted(nextState);
    setMuteState(nextState);
    if (nextState) {
      stopLoopingChime();
      setActiveAlarmOrder(null);
    }
  };

  // Test sound
  const handleTestSound = () => {
    unlockAudioContext();
    playKitchenChime();
  };

  // Simulate Student Order (Instant verification)
  const handleSimulateOrder = async () => {
    unlockAudioContext();
    const token = Math.floor(10 + Math.random() * 89).toString();
    const mockItems = [
      { id: 'JC-ORANGE-01', name: 'Fresh Orange Juice', price: 40, quantity: 1, shopName: 'Juice Center' },
      { id: 'JC-SAMOSA-01', name: 'Crispy Punjabi Samosa (2 pcs)', price: 30, quantity: 1, shopName: 'Juice Center' },
    ];
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: mockItems,
          total: 70,
          pickupTime: 'In 10 Minutes',
          utr: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
          shopName: 'Juice Center',
          userName: 'Simulated Student',
          studentSocketId: getSocketId(),
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        // WebSocket event handles the pop-up and sound automatically!
      }
    } catch (e) {
      console.warn('Simulation fallback');
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Normalize order status into one of 3 Kanban buckets:
  // 1. 'new': Pending, Placed, New
  // 2. 'preparing': Preparing, In Kitchen, Cooking
  // 3. 'ready': Ready, Ready for Pickup
  const categorizeOrder = (order) => {
    const s = (order.status || 'Pending').toLowerCase().trim();
    if (s.includes('ready') || s.includes('pickup')) return 'ready';
    if (s.includes('prep') || s.includes('kitchen') || s.includes('cook')) return 'preparing';
    if (s.includes('complete') || s.includes('deliver') || s.includes('cancel')) return 'completed';
    return 'new';
  };

  // Filter orders by shop and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Shop filter
      if (selectedShop !== 'all') {
        const oShop = (o.shopName || o.shop_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = selectedShop.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!oShop.includes(target) && !target.includes(oShop)) return false;
      }
      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const tokenMatch = (o.token || '').toString().includes(q);
        const nameMatch = (o.userName || o.user_name || '').toLowerCase().includes(q);
        const idMatch = (o.id || '').toLowerCase().includes(q);
        let itemMatch = false;
        if (Array.isArray(o.items)) {
          itemMatch = o.items.some((it) => (it.name || '').toLowerCase().includes(q));
        }
        return tokenMatch || nameMatch || idMatch || itemMatch;
      }
      return true;
    });
  }, [orders, selectedShop, searchQuery]);

  const newOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => categorizeOrder(o) === 'new')
      .sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));
  }, [filteredOrders]);

  const preparingOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => categorizeOrder(o) === 'preparing')
      .sort((a, b) => new Date(a.updatedAt || a.updated_at || a.createdAt || 0) - new Date(b.updatedAt || b.updated_at || b.createdAt || 0));
  }, [filteredOrders]);

  const readyOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => categorizeOrder(o) === 'ready')
      .sort((a, b) => new Date(b.updatedAt || b.updated_at || 0) - new Date(a.updatedAt || a.updated_at || 0));
  }, [filteredOrders]);

  // Format elapsed time string
  const getElapsedTimeString = (isoTimestamp) => {
    if (!isoTimestamp) return 'Just now';
    const diffMs = tickerTime - new Date(isoTimestamp).getTime();
    if (diffMs < 0) return 'Just now';
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s ago`;
    return `${mins}m ${secs}s ago`;
  };

  // Get elapsed timer urgency level
  const getUrgencyClass = (isoTimestamp) => {
    if (!isoTimestamp) return 'text-[#164e3d] bg-[#e8f2ec] border-[#c2ddcb]';
    const mins = (tickerTime - new Date(isoTimestamp).getTime()) / (1000 * 60);
    if (mins > 10) return 'text-[#be185d] bg-[#fdf2f8] border-[#fbcfe8] animate-pulse font-black';
    if (mins > 5) return 'text-amber-800 bg-amber-50 border-amber-200 font-bold';
    return 'text-[#164e3d] bg-[#e8f2ec] border-[#c2ddcb] font-semibold';
  };

  // --------------------------------------------------------------------------
  // RENDER: Security PIN Pad barrier if not authenticated
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e4eae2] shadow-2xl relative overflow-hidden">
          {/* Herb Garden Decorative Accent */}
          <div className="w-full h-2 bg-gradient-to-r from-[#164e3d] via-emerald-600 to-[#be185d] absolute top-0 left-0" />

          <div className="text-center mb-6 pt-2">
            <div className="w-16 h-16 bg-[#e8f2ec] text-[#164e3d] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-[#2a221e] tracking-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-[#605249] mt-1 font-medium">
              AIT Campus Food Ordering &bull; Restricted Kitchen Staff Terminal
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2a221e] uppercase tracking-wider mb-2 text-center">
                Enter Kitchen Staff PIN
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="&bull; &bull; &bull; &bull;"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] py-3.5 px-4 rounded-xl border-2 border-[#e4eae2] focus:border-[#164e3d] focus:outline-none bg-[#faf8f5] text-[#2a221e] font-mono shadow-inner transition-colors"
              />
              {pinError && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-bold text-[#be185d]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Invalid Staff PIN. Please try again or use Demo Unlock.</span>
                </div>
              )}
            </div>

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPinInput((prev) => (prev.length < 8 ? prev + num : prev))}
                  className="py-3 bg-[#faf8f5] hover:bg-[#e8f2ec] active:bg-[#c2ddcb] text-[#2a221e] font-bold text-lg rounded-xl border border-[#e4eae2] transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="py-3 bg-red-50 hover:bg-red-100 text-[#be185d] font-bold text-xs uppercase rounded-xl border border-red-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setPinInput((prev) => (prev.length < 8 ? prev + '0' : prev))}
                className="py-3 bg-[#faf8f5] hover:bg-[#e8f2ec] active:bg-[#c2ddcb] text-[#2a221e] font-bold text-lg rounded-xl border border-[#e4eae2] transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="submit"
                className="py-3 bg-[#164e3d] hover:bg-[#123e31] active:bg-[#0c2a21] text-white font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              >
                Enter &rarr;
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#164e3d] hover:bg-[#123e31] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Kitchen Display</span>
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-6 pt-5 border-t border-[#e4eae2] text-center">
            <button
              type="button"
              onClick={handleQuickUnlock}
              className="w-full py-2.5 px-4 bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#be185d] font-bold text-xs rounded-xl border border-[#fbcfe8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#be185d]" />
              <span>Demo One-Click Staff Unlock (PIN: 1234)</span>
            </button>
            <p className="text-[11px] text-[#605249] mt-2">
              Default authorized PINs: <span className="font-mono font-bold text-[#2a221e]">1234</span> or <span className="font-mono font-bold text-[#2a221e]">AIT2026</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Full Kitchen Display System Kanban Board
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a221e] flex flex-col font-sans pb-12 selection:bg-[#be185d] selection:text-white">
      {/* 1. Loud Looping Alarm Notification Banner */}
      {activeAlarmOrder && (
        <div className="bg-gradient-to-r from-[#be185d] via-rose-600 to-[#9f1239] text-white px-4 py-3 sm:px-6 shadow-xl sticky top-0 z-50 animate-bounce-subtle flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
              <Bell className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white text-[#be185d] px-2 py-0.5 rounded-full">
                  🚨 NEW ORDER RECEIVED
                </span>
                <span className="text-xs text-white/90 font-mono">
                  Token #{activeAlarmOrder.token || activeAlarmOrder.id}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {activeAlarmOrder.userName || 'Student'} &bull; {activeAlarmOrder.shopName || activeAlarmOrder.shop_name || 'Kitchen'} &bull; Loop chime is ringing!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSilenceAlarm}
              className="px-4 py-2 bg-white hover:bg-white/90 text-[#be185d] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              <span>Acknowledge / Silence Alarm</span>
            </button>
            <button
              onClick={() => handleUpdateStatus(activeAlarmOrder.id, 'Preparing')}
              className="px-4 py-2 bg-[#164e3d] hover:bg-[#123e31] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ChefHat className="w-4 h-4" />
              <span>Start Preparing Now &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Top KDS Navigation Bar */}
      <header className="bg-white border-b border-[#e4eae2] px-4 sm:px-6 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Brand & Shop Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#164e3d] text-white flex items-center justify-center shadow-sm">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-[#2a221e]">
                    AIT QuickBite KDS
                  </h1>
                  <span className="text-[11px] font-bold bg-[#e8f2ec] text-[#164e3d] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#c2ddcb]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Display</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#605249]">
                  Kitchen Display System &bull; Auto-sync WebSockets
                </p>
              </div>
            </div>

            {/* Shop Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#faf8f5] px-3 py-1.5 rounded-xl border border-[#e4eae2]">
              <Store className="w-4 h-4 text-[#164e3d]" />
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#2a221e] focus:outline-none cursor-pointer"
              >
                {VENDOR_SHOPS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Controls: Sound, Simulate Order, Search, Fullscreen, Lock */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605249]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token # or student..."
                className="pl-8 pr-3 py-1.5 bg-[#faf8f5] border border-[#e4eae2] focus:border-[#164e3d] text-xs font-medium rounded-xl text-[#2a221e] focus:outline-none w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#605249] hover:text-[#2a221e]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleMute}
              title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                soundMuted
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-[#e8f2ec] text-[#164e3d] border-[#c2ddcb]'
              }`}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#164e3d]" />}
              <span>{soundMuted ? 'Muted' : 'Sound ON'}</span>
            </button>

            {/* Test Chime Button */}
            <button
              onClick={handleTestSound}
              title="Test Kitchen Chime"
              className="p-1.5 bg-[#faf8f5] hover:bg-[#e8f2ec] text-[#164e3d] border border-[#e4eae2] rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Simulate Student Order Button */}
            <button
              onClick={handleSimulateOrder}
              className="px-3 py-1.5 bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#be185d]" />
              <span>Simulate Checkout 🛒</span>
            </button>

            {/* Refresh Sync */}
            <button
              onClick={fetchKdsOrders}
              disabled={isLoading}
              title="Refresh Orders"
              className="p-1.5 bg-[#faf8f5] hover:bg-[#e8f2ec] text-[#605249] hover:text-[#164e3d] border border-[#e4eae2] rounded-xl text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen Display"
              className="p-1.5 bg-[#faf8f5] hover:bg-[#e8f2ec] text-[#605249] border border-[#e4eae2] rounded-xl text-xs transition-colors cursor-pointer hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Lock / Exit KDS */}
            <button
              onClick={handleLockTerminal}
              title="Lock Terminal"
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#605249] rounded-xl text-xs font-bold border border-gray-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            {/* Switch to Student View */}
            <button
              onClick={() => {
                if (onSwitchToStudentView) onSwitchToStudentView();
                else navigate('/');
              }}
              className="text-xs font-bold text-[#164e3d] hover:underline cursor-pointer ml-1"
            >
              Student View &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main KDS Kanban Board (3 Columns) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1: NEW ORDERS */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col rounded-3xl bg-[#ffffff] border-2 border-[#fbcfe8] shadow-sm overflow-hidden min-h-[600px]">
            {/* Column Header */}
            <div className="bg-[#fdf2f8] px-5 py-4 border-b border-[#fbcfe8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#be185d] animate-pulse" />
                <h2 className="text-base font-black text-[#2a221e] uppercase tracking-wider">
                  New Orders
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#be185d] text-white shadow-xs">
                {newOrders.length}
              </span>
            </div>

            {/* Column Order List */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {newOrders.length === 0 ? (
                <div className="py-16 text-center text-[#605249]">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
                  <p className="text-sm font-bold text-[#2a221e]">All Caught Up!</p>
                  <p className="text-xs text-[#605249] mt-0.5">No new orders waiting to be prepped.</p>
                </div>
              ) : (
                newOrders.map((order) => {
                  const isNewFlash = newlyArrivedIds.has(order.id);
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      column="new"
                      isHighlighted={isNewFlash}
                      elapsedString={getElapsedTimeString(order.createdAt || order.created_at)}
                      urgencyClass={getUrgencyClass(order.createdAt || order.created_at)}
                      onAdvance={() => handleUpdateStatus(order.id, 'Preparing')}
                      onQuickReady={() => handleUpdateStatus(order.id, 'Ready')}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2: PREPARING */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col rounded-3xl bg-[#ffffff] border-2 border-amber-200 shadow-sm overflow-hidden min-h-[600px]">
            {/* Column Header */}
            <div className="bg-amber-50/80 px-5 py-4 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-700" />
                <h2 className="text-base font-black text-[#2a221e] uppercase tracking-wider">
                  Preparing
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-600 text-white shadow-xs">
                {preparingOrders.length}
              </span>
            </div>

            {/* Column Order List */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {preparingOrders.length === 0 ? (
                <div className="py-16 text-center text-[#605249]">
                  <ChefHat className="w-10 h-10 mx-auto text-amber-500 mb-2 opacity-50" />
                  <p className="text-sm font-bold text-[#2a221e]">No Orders In Prep</p>
                  <p className="text-xs text-[#605249] mt-0.5">Move orders from 'New Orders' when kitchen begins cooking.</p>
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    column="preparing"
                    elapsedString={getElapsedTimeString(order.updatedAt || order.updated_at || order.createdAt || order.created_at)}
                    urgencyClass={getUrgencyClass(order.createdAt || order.created_at)}
                    onAdvance={() => handleUpdateStatus(order.id, 'Ready')}
                    onMoveBack={() => handleUpdateStatus(order.id, 'Pending')}
                  />
                ))
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 3: READY FOR PICKUP */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col rounded-3xl bg-[#ffffff] border-2 border-[#c2ddcb] shadow-sm overflow-hidden min-h-[600px]">
            {/* Column Header */}
            <div className="bg-[#e8f2ec] px-5 py-4 border-b border-[#c2ddcb] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#164e3d]" />
                <h2 className="text-base font-black text-[#2a221e] uppercase tracking-wider">
                  Ready for Pickup
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#164e3d] text-white shadow-xs">
                {readyOrders.length}
              </span>
            </div>

            {/* Column Order List */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {readyOrders.length === 0 ? (
                <div className="py-16 text-center text-[#605249]">
                  <ShoppingBag className="w-10 h-10 mx-auto text-[#164e3d] mb-2 opacity-50" />
                  <p className="text-sm font-bold text-[#2a221e]">No Orders Waiting</p>
                  <p className="text-xs text-[#605249] mt-0.5">Items marked 'Ready' will appear here for student collection.</p>
                </div>
              ) : (
                readyOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    column="ready"
                    elapsedString={getElapsedTimeString(order.updatedAt || order.updated_at)}
                    urgencyClass="text-[#164e3d] bg-[#e8f2ec] border-[#c2ddcb]"
                    onAdvance={() => handleUpdateStatus(order.id, 'Completed')}
                    onMoveBack={() => handleUpdateStatus(order.id, 'Preparing')}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

/**
 * Individual Kanban Order Card Component
 */
function OrderCard({
  order,
  column,
  isHighlighted,
  elapsedString,
  urgencyClass,
  onAdvance,
  onQuickReady,
  onMoveBack,
}) {
  const token = order.token || (order.id ? order.id.slice(-4) : '42');
  const shopName = order.shopName || order.shop_name || 'Kitchen';
  const userName = order.userName || order.user_name || 'Student';
  const pickupTime = order.pickupTime || order.pickup_time || 'In 10 mins';
  const total = order.total || 0;
  const utr = order.utr;

  let parsedItems = [];
  if (Array.isArray(order.items)) {
    parsedItems = order.items;
  } else if (typeof order.items === 'string') {
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      parsedItems = [{ name: order.items, quantity: 1 }];
    }
  }

  return (
    <div
      className={`rounded-2xl p-4 bg-white border transition-all duration-200 shadow-sm hover:shadow-md ${
        isHighlighted
          ? 'border-2 border-[#be185d] ring-4 ring-[#be185d]/20 bg-[#fdf2f8]/30 animate-pulse'
          : 'border-[#e4eae2]'
      }`}
    >
      {/* Top Card Row: Big Token Number & Live Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e4eae2]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#164e3d] tracking-tight">
            #{token}
          </span>
          <span className="text-[11px] font-bold bg-[#faf8f5] text-[#605249] px-2 py-0.5 rounded-md border border-[#e4eae2]">
            {shopName}
          </span>
        </div>

        {/* Live Elapsed Timer */}
        <div className={`px-2.5 py-1 rounded-full text-xs border flex items-center gap-1 ${urgencyClass}`}>
          <Clock className="w-3 h-3" />
          <span>{elapsedString}</span>
        </div>
      </div>

      {/* Customer Info & Target Pickup */}
      <div className="py-2.5 flex items-center justify-between text-xs text-[#605249]">
        <div className="flex items-center gap-1.5 font-bold text-[#2a221e]">
          <User className="w-3.5 h-3.5 text-[#164e3d]" />
          <span>{userName}</span>
        </div>
        <div className="text-[11px] font-medium bg-[#faf8f5] px-2 py-0.5 rounded-md border border-[#e4eae2]">
          Pickup: <span className="font-bold text-[#164e3d]">{pickupTime}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-[#faf8f5] rounded-xl p-3 border border-[#e4eae2] my-2 space-y-1.5">
        {parsedItems.map((it, idx) => {
          const qty = it.quantity || 1;
          const name = (it.name || 'Menu Item').replace(/^\d+x\s*/i, '');
          const price = it.price ? `₹${it.price}` : '';
          return (
            <div key={idx} className="flex items-start justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-white border border-[#e4eae2] text-[#164e3d] font-black text-[11px] flex items-center justify-center flex-shrink-0 shadow-2xs">
                  {qty}
                </span>
                <span className="font-bold text-[#2a221e] leading-snug">
                  {name}
                </span>
              </div>
              {price && (
                <span className="text-[11px] font-bold text-[#be185d] flex-shrink-0">
                  {price}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Total & UTR Verification Tag */}
      <div className="flex items-center justify-between text-xs pt-1 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[#605249] text-[11px]">Total:</span>
          <span className="font-black text-[#be185d] text-sm">₹{total}</span>
        </div>
        {utr && (
          <span className="text-[10px] font-mono text-[#605249] bg-white px-2 py-0.5 rounded border border-[#e4eae2]" title="UPI UTR ID">
            UTR: {utr.slice(-6)}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-[#e4eae2] flex items-center gap-2">
        {column === 'new' && (
          <>
            <button
              onClick={onAdvance}
              className="flex-1 py-2.5 bg-[#164e3d] hover:bg-[#123e31] active:bg-[#0c2a21] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ChefHat className="w-4 h-4" />
              <span>Start Preparing &rarr;</span>
            </button>
            {onQuickReady && (
              <button
                onClick={onQuickReady}
                title="Direct to Ready (Instant)"
                className="px-3 py-2.5 bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8] rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                ⚡ Ready
              </button>
            )}
          </>
        )}

        {column === 'preparing' && (
          <>
            {onMoveBack && (
              <button
                onClick={onMoveBack}
                title="Move back to New Orders"
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-[#605249] rounded-xl text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onAdvance}
              className="flex-1 py-2.5 bg-[#be185d] hover:bg-[#9f1239] active:bg-[#881337] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>Mark as Ready 🔔 &rarr;</span>
            </button>
          </>
        )}

        {column === 'ready' && (
          <>
            {onMoveBack && (
              <button
                onClick={onMoveBack}
                title="Move back to Preparing"
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-[#605249] rounded-xl text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onAdvance}
              className="flex-1 py-2.5 bg-[#164e3d] hover:bg-[#123e31] active:bg-[#0c2a21] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Handed Over / Completed ✓</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
