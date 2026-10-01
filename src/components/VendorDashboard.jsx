import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  Utensils,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Store,
  Volume2,
  VolumeX,
  Bell,
  RefreshCw,
  ChevronDown,
  UserCheck,
  Zap
} from 'lucide-react';
import { socket, joinVendorRoom, playNotificationChime } from '../socket';

const VENDOR_SHOPS = [
  { id: 'JuiceCenter', name: 'Juice Center', location: 'Near Sports Complex & Gym' },
  { id: 'MainCanteen', name: 'Main Canteen', location: 'Ground Floor, Student Activity Hub' },
  { id: 'NescafeBooth', name: 'Nescafe Booth', location: 'Opposite Central Library Lawn' },
  { id: 'CampusBakery', name: 'Campus Bakery', location: 'Near Mechanical Workshop' },
  { id: 'all', name: 'All Campus Shops (Combined)', location: 'Full Campus Queue' },
];

export default function VendorDashboard({
  orders: initialOrders = [],
  onUpdateOrderStatus,
  onAddNewSampleOrder,
  onSwitchToStudentView,
}) {
  // Currently selected shop for vendor login / counter view
  const [selectedShop, setSelectedShop] = useState('JuiceCenter');
  
  // State for orders currently loaded in the dashboard for the selected vendor
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabMobile, setActiveTabMobile] = useState('pending'); // 'pending' | 'completed' for mobile toggle
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioNotificationBanner, setAudioNotificationBanner] = useState(null);
  const [activeRoom, setActiveRoom] = useState('room_juice_center');
  const [isSocketLive, setIsSocketLive] = useState(socket.connected);

  // Store the IDs of the currently displayed orders in an array
  const displayedOrderIdsRef = useRef([]);

  const getShopDisplayName = (shopId) => {
    const found = VENDOR_SHOPS.find((s) => s.id === shopId);
    return found ? found.name : shopId;
  };

  // Audio notification function using HTML5 Audio API
  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch((audioErr) => {
        console.warn('Autoplay restricted by browser policy until user interacts:', audioErr);
      });
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  /**
   * Initial fetch helper for initial mount
   */
  const fetchOrders = async (targetShop = selectedShop) => {
    try {
      setIsPolling(true);
      const queryParam = targetShop && targetShop !== 'all' ? `?shop=${encodeURIComponent(targetShop)}` : '';
      const endpoint = `/api/vendor/orders${queryParam}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const latestOrders = await response.json();

      if (Array.isArray(latestOrders)) {
        displayedOrderIdsRef.current = latestOrders.map((ord) => ord.id);
        setOrders(latestOrders);
        setLastSyncedTime(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch (error) {
      console.warn('Fetch note:', error.message);
    } finally {
      setIsPolling(false);
    }
  };

  /**
   * Handle switching shop in the dropdown:
   * Joins the vendor to the specific room for that shop (e.g., room_juice_center).
   */
  const handleShopChange = (e) => {
    const newShop = e.target.value;
    setSelectedShop(newShop);
    displayedOrderIdsRef.current = [];
    joinVendorRoom(newShop);
    fetchOrders(newShop);
  };

  /**
   * WebSockets Room Architecture (NO HTTP Polling):
   * When vendor logs in or switches shop, joins the room specific to their shop.
   * Listens for 'order:new' emitted directly to that room and renders instantly with sound.
   */
  useEffect(() => {
    let isMounted = true;

    // Join room specific to this shop (e.g. room_juice_center)
    joinVendorRoom(selectedShop);
    fetchOrders(selectedShop);

    const onConnect = () => {
      if (isMounted) setIsSocketLive(true);
      joinVendorRoom(selectedShop);
    };
    const onDisconnect = () => {
      if (isMounted) setIsSocketLive(false);
    };

    const onRoomJoined = ({ room, shop }) => {
      if (!isMounted) return;
      console.log(`[Vendor KDS] Confirmed room joined: ${room} for shop: ${shop}`);
      setActiveRoom(room);
      setIsSocketLive(true);
    };

    // Synchronize full order state from room upon join or reconnect without loss of state
    const onOrdersSync = ({ room, orders: syncedOrders }) => {
      if (!isMounted) return;
      console.log(`[Vendor KDS] orders:sync received for ${room} (${syncedOrders?.length || 0} orders)`);
      if (Array.isArray(syncedOrders)) {
        displayedOrderIdsRef.current = syncedOrders.map((o) => o.id);
        setOrders(syncedOrders);
        setLastSyncedTime(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    };

    // When a student places an order, emit an event directly to this specific shop's room
    const onNewOrder = ({ order, room }) => {
      if (!isMounted || !order) return;
      console.log(`[Vendor KDS] ⚡ Real-Time order:new received in room ${room}:`, order);

      // Trigger notification sound with HTML5 Audio API
      if (soundEnabled) {
        playNotificationSound();
      }

      const newOrderToken = order.token || 'New';
      setAudioNotificationBanner(
        `🔔 New Order #AIT-${newOrderToken} received for ${getShopDisplayName(selectedShop)}!`
      );
      setTimeout(() => {
        if (isMounted) setAudioNotificationBanner(null);
      }, 4500);

      // Instantly render new order card in Pending column
      setOrders((prevOrders) => {
        const exists = prevOrders.some((o) => o.id === order.id);
        if (exists) return prevOrders;
        displayedOrderIdsRef.current = [order.id, ...displayedOrderIdsRef.current];
        return [order, ...prevOrders];
      });

      setLastSyncedTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    const onStatusUpdated = ({ orderId, status, order }) => {
      if (!isMounted) return;
      console.log(`[Vendor KDS] Real-time order:status_updated received: ${orderId} -> ${status}`);
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord.id === orderId ? { ...ord, ...(order || {}), status } : ord
        )
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('vendor:room_joined', onRoomJoined);
    socket.on('orders:sync', onOrdersSync);
    socket.on('order:new', onNewOrder);
    socket.on('order:status_updated', onStatusUpdated);

    return () => {
      isMounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('vendor:room_joined', onRoomJoined);
      socket.off('orders:sync', onOrdersSync);
      socket.off('order:new', onNewOrder);
      socket.off('order:status_updated', onStatusUpdated);
    };
  }, [selectedShop, soundEnabled]);

  /**
   * When vendor clicks 'Mark as Ready':
   * 1. Updates card immediately to 'Completed' column
   * 2. Emits event back to the specific student's socket ID and order room
   */
  const handleMarkAsReady = async (orderId) => {
    try {
      // Move the card to 'Completed' immediately
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord.id === orderId ? { ...ord, status: 'Ready' } : ord
        )
      );

      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(orderId, 'Ready for Pickup');
      }

      // Emit socket event to notify student instantly
      socket.emit('order:mark_ready', { orderId });

      // Sends POST request to persist status in database
      const response = await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          status: 'Ready',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }
    } catch (err) {
      console.warn('Mark as Ready note:', err);
    }
  };

  /**
   * Move order back to Pending
   */
  const handleRevertToPending = async (orderId) => {
    try {
      await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'Pending' }),
      });
    } catch (e) {
      console.warn('Revert order note:', e);
    }
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'Pending' } : ord))
    );
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, 'Preparing in Kitchen');
    }
  };

  /**
   * Trigger demo test order into backend & poll for the selected shop
   */
  const handleTriggerTestOrder = async () => {
    const newToken = Math.floor(10 + Math.random() * 89).toString();
    const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    // Choose appropriate shop name matching the selected vendor
    const targetShopName =
      selectedShop === 'MainCanteen'
        ? 'Main Canteen'
        : selectedShop === 'NescafeBooth'
        ? 'Nescafe Booth'
        : selectedShop === 'CampusBakery'
        ? 'Campus Bakery'
        : 'Juice Center';

    const newDemoOrder = {
      id: `ord-${Date.now()}`,
      token: newToken,
      shopName: targetShopName,
      location: 'AIT Campus Counter',
      status: 'Pending',
      pickupTime: '2:45 PM',
      dueTime: '2:45 PM',
      total: 95,
      utr: randomUtr,
      items: [
        { name: `2x Fresh ${targetShopName === 'Juice Center' ? 'Orange Juice' : 'Snack Item'}`, price: 80 },
        { name: '1x Samosa', price: 15 },
      ],
    };

    try {
      await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', order: newDemoOrder }),
      });
    } catch (e) {
      console.warn('Create test order note:', e);
    }

    // Immediately trigger fetchOrders to demonstrate comparison & sound chime
    fetchOrders(selectedShop);

    if (onAddNewSampleOrder) {
      onAddNewSampleOrder();
    }
  };

  // Filter orders by search query (Token or UTR)
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      (order.token && order.token.includes(searchQuery.trim())) ||
      (order.utr && order.utr.includes(searchQuery.trim())) ||
      (order.items &&
        order.items.some((item) =>
          (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        ));

    return matchesSearch;
  });

  const pendingOrders = filteredOrders.filter(
    (order) => !order.status || order.status.toLowerCase() !== 'ready'
  );

  const completedOrders = filteredOrders.filter(
    (order) => order.status && order.status.toLowerCase() === 'ready'
  );

  return (
    <div className="min-h-screen bg-[#ffffff] text-gray-900 pb-16">
      
      {/* Audio & New Order Notification Toast */}
      {audioNotificationBanner && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#ffffff] border-2 border-emerald-500 text-gray-900 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-bounce">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
              Audio Chime Triggered
            </span>
            <span className="text-sm font-semibold">{audioNotificationBanner}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-gray-200 bg-[#ffffff] sticky top-16 sm:top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          
          {/* Shop Selector & Vendor Login Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#6b21a8] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#6b21a8] uppercase tracking-wider">
                    Vendor Active Counter
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-semibold text-emerald-700">Online</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {getShopDisplayName(selectedShop)}
                </span>
              </div>
            </div>

            {/* Shop Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="shop-selector-dropdown" className="text-xs font-bold text-gray-700 whitespace-nowrap">
                Select Shop:
              </label>
              <div className="relative min-w-[210px]">
                <select
                  id="shop-selector-dropdown"
                  value={selectedShop}
                  onChange={handleShopChange}
                  className="w-full bg-white border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#6b21a8] focus:border-[#6b21a8] cursor-pointer appearance-none pr-9 transition-colors"
                >
                  <option value="JuiceCenter">Juice Center</option>
                  <option value="MainCanteen">Main Canteen</option>
                  <option value="NescafeBooth">Nescafe Booth</option>
                  <option value="CampusBakery">Campus Bakery</option>
                  <option value="all">All Campus Shops (Combined)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Title & Brand */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6b21a8] mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-gray-700 font-semibold">{getShopDisplayName(selectedShop)}</span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                  <span>WebSockets Live ({activeRoom})</span>
                </span>
                {lastSyncedTime && (
                  <span className="text-gray-400 text-[10px] hidden sm:inline">
                    Synced {lastSyncedTime}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                AIT QuickBite - Vendor Portal
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Real-time queue &amp; order fulfillment board for{' '}
                <strong className="text-gray-800">{getShopDisplayName(selectedShop)}</strong>
              </p>
            </div>

            {/* Large New Orders Counter & Controls */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              
              {/* Prominent 'New Orders' Counter */}
              <div className="flex items-center bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 shadow-xs">
                <div className="flex flex-col text-right mr-3">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Queue Status
                  </span>
                  <span className="text-xs font-semibold text-[#6b21a8]">
                    New Orders
                  </span>
                </div>
                <div className="flex items-center justify-center min-w-[48px] h-10 px-2 bg-[#6b21a8] text-white rounded-lg font-black text-2xl tracking-tight shadow-xs">
                  {pendingOrders.length}
                </div>
              </div>

              {/* Sound Test / Sound Toggle Button */}
              <button
                onClick={() => {
                  playNotificationSound();
                  setAudioNotificationBanner('🔔 Audio Test: HTML5 Audio API Chime Played!');
                  setTimeout(() => setAudioNotificationBanner(null), 3000);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-[#6b21a8] hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Test HTML5 Audio API Notification Sound"
              >
                <Volume2 className="w-4 h-4 text-[#6b21a8]" />
                <span className="hidden sm:inline">Test Sound</span>
              </button>

              {/* Manual Refresh / Polling Indicator */}
              <button
                onClick={() => fetchOrders(selectedShop)}
                disabled={isPolling}
                className="p-2 text-gray-600 hover:text-[#6b21a8] hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                title="Refresh queue now (runs automatically every 10s)"
              >
                <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin text-[#6b21a8]' : ''}`} />
              </button>

              {/* Action: Switch to Student View */}
              {onSwitchToStudentView && (
                <button
                  onClick={onSwitchToStudentView}
                  className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Switch to customer ordering page"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline">Student View</span>
                </button>
              )}

              {/* Action: Simulate Incoming Order */}
              <button
                onClick={handleTriggerTestOrder}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#6b21a8] text-white hover:bg-[#581c87] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Send a new order to /api/vendor/orders and trigger polling audio notification"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Test Order</span>
              </button>

            </div>

          </div>

          {/* Quick Search & Filter Bar */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Active Shop Badge */}
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <span className="font-semibold text-gray-900">Current Queue:</span>
              <span className="bg-gray-100 text-gray-800 font-semibold px-2.5 py-1 rounded-md border border-gray-200">
                {getShopDisplayName(selectedShop)}
              </span>
              <span className="text-gray-400">({pendingOrders.length} pending, {completedOrders.length} ready)</span>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Token (#42) or UTR..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[#6b21a8] text-gray-900 placeholder-gray-400"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Column Switcher (Tab buttons for small screens) */}
      <div className="md:hidden max-w-7xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg border border-gray-200 text-sm font-semibold">
          <button
            onClick={() => setActiveTabMobile('pending')}
            className={`py-2 rounded-md transition-colors ${
              activeTabMobile === 'pending'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Pending Orders ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTabMobile('completed')}
            className={`py-2 rounded-md transition-colors ${
              activeTabMobile === 'completed'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Completed / Ready ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Main Kanban Board: Split into Two Vertical Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
          
          {/* ======================================================== */}
          {/* COLUMN 1: PENDING ORDERS (LEFT COLUMN)                   */}
          {/* ======================================================== */}
          <section
            aria-label="Pending Orders Column"
            className={`${activeTabMobile === 'pending' ? 'block' : 'hidden md:block'}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  Pending Orders
                </h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingOrders.length} in queue
              </span>
            </div>

            {/* List of Pending Order Cards */}
            {pendingOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Queue is clear!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  No pending orders for <strong className="text-gray-700">{getShopDisplayName(selectedShop)}</strong> right now.
                </p>
                <button
                  onClick={handleTriggerTestOrder}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-[#6b21a8] bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                >
                  + Generate Order for {getShopDisplayName(selectedShop)}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => {
                  // Format order number (e.g., #AIT-42)
                  const orderNumber = order.token ? `#AIT-${order.token}` : `#AIT-42`;
                  
                  // Timestamp calculation / fallback
                  const dueTime = order.dueTime || order.pickupTime || '2:15 PM';

                  return (
                    <article
                      key={order.id}
                      className="bg-[#ffffff] border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-all"
                    >
                      {/* Top Bar of Card: Order Number Prominently */}
                      <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-gray-900 tracking-tight">
                              {orderNumber}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                              {order.shopName || 'Main Canteen'}
                            </span>
                          </div>
                          {order.location && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order.location}
                            </p>
                          )}
                        </div>

                        {/* Order Total */}
                        <div className="text-right">
                          <span className="text-xs font-medium text-gray-400 block">Bill</span>
                          <span className="text-base font-bold text-gray-900">
                            ₹{order.total || 40}
                          </span>
                        </div>
                      </div>

                      {/* List of Ordered Items */}
                      <div className="py-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                          Items to Prepare:
                        </span>
                        <ul className="space-y-1.5">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-center justify-between text-sm font-medium text-gray-800 bg-gray-50 px-3 py-2 rounded-md border border-gray-100"
                              >
                                <span className="font-semibold text-gray-900">
                                  {item.name}
                                </span>
                                {item.price && (
                                  <span className="text-xs text-gray-500 font-mono">
                                    ₹{item.price}
                                  </span>
                                )}
                              </li>
                            ))
                          ) : (
                            <li className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-md">
                              2x Fresh Orange Juice, 1x Samosa
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* 12-Digit UTR Display for Payment Verification */}
                      {order.utr ? (
                        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold">UPI UTR:</span>
                            <span className="font-mono font-bold tracking-wider text-gray-900">
                              {order.utr}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Paid Online
                          </span>
                        </div>
                      ) : (
                        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-gray-500">
                          <span className="font-mono">UTR: Pending verification</span>
                          <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-1.5 py-0.5 rounded">
                            Counter Pay
                          </span>
                        </div>
                      )}

                      {/* Bold Red Timestamp at Bottom Right */}
                      <div className="flex items-center justify-between mb-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>Pickup Target</span>
                        </div>
                        {/* Bold red timestamp at the bottom right */}
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-bold text-red-600 tracking-tight">
                            Due: {dueTime}
                          </span>
                        </div>
                      </div>

                      {/* Large Bright Green Button: 'Mark as Ready' (Sends POST request to update order status) */}
                      <button
                        onClick={() => handleMarkAsReady(order.id)}
                        className="w-full py-3 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-base rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2"
                      >
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span>Mark as Ready</span>
                      </button>

                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ======================================================== */}
          {/* COLUMN 2: COMPLETED / READY (RIGHT COLUMN)               */}
          {/* ======================================================== */}
          <section
            aria-label="Completed and Ready Orders Column"
            className={`${activeTabMobile === 'completed' ? 'block' : 'hidden md:block'}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-green-500">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  Completed / Ready
                </h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                {completedOrders.length} ready for pickup
              </span>
            </div>

            {/* List of Completed / Ready Cards */}
            {completedOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                <Utensils className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <h3 className="text-sm font-bold text-gray-700">No ready orders yet</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Orders marked as &quot;Ready&quot; for {getShopDisplayName(selectedShop)} will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order) => {
                  const orderNumber = order.token ? `#AIT-${order.token}` : `#AIT-42`;

                  return (
                    <article
                      key={order.id}
                      className="bg-[#ffffff] border border-gray-200 rounded-xl p-5 shadow-2xs hover:border-gray-300 transition-all opacity-95"
                    >
                      {/* Top Bar of Card */}
                      <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-900">
                              {orderNumber}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-700" />
                              Ready for Pickup
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {order.shopName || 'Main Canteen'}
                          </p>
                        </div>

                        <span className="text-sm font-bold text-gray-900">
                          ₹{order.total || 40}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="py-3">
                        <ul className="space-y-1">
                          {order.items &&
                            order.items.map((item, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-gray-700 font-medium"
                              >
                                • {item.name}
                              </li>
                            ))}
                        </ul>
                      </div>

                      {/* UTR & Verification Info */}
                      {order.utr && (
                        <div className="mb-3 text-[11px] font-mono text-gray-500 flex items-center justify-between bg-gray-50 px-2.5 py-1.5 rounded border border-gray-100">
                          <span>UTR: {order.utr}</span>
                          <span className="text-green-700 font-semibold font-sans">Verified</span>
                        </div>
                      )}

                      {/* Revert / Archive Actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          Notify counter staff when handed over
                        </span>
                        <button
                          onClick={() => handleRevertToPending(order.id)}
                          className="text-gray-500 hover:text-gray-800 text-xs font-medium flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                          title="Move back to Pending if clicked by mistake"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo to Pending</span>
                        </button>
                      </div>

                    </article>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
