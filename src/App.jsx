import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNavigationBar from './components/BottomNavigationBar';
import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import SupportPage from './pages/SupportPage';
import VendorDashboard from './components/VendorDashboard';
import LiveOrderStatus from './components/LiveOrderStatus';
import CartCheckoutPanel from './components/CartCheckoutPanel';
import LoginModal from './components/LoginModal';
import QRCodeGenerator from './components/QRCodeGenerator';
import A2HSInstallPrompt from './components/A2HSInstallPrompt';
import GroupInviteModal from './components/GroupInviteModal';
import GroupJoinModal from './components/GroupJoinModal';
import GroupSplitCheckout from './components/GroupSplitCheckout';
import RewardsWidget from './components/RewardsWidget';
import Footer from './components/Footer';
import { CheckCircle2 } from 'lucide-react';
import {
  socket,
  getSocketId,
  playNotificationChime,
  joinGroupRoom,
  emitGroupCartUpdate,
  emitGroupPayShare,
  emitGroupDispatchOrder,
} from './socket';
import { fireCelebratoryConfetti } from './utils/confetti';

/**
 * Inner Application Component containing Router-Aware Navigation,
 * Centralized State, WebSockets Synchronization, and Sticky Bottom Bar.
 */
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCustomPayload, setQrCustomPayload] = useState('AIT-ORDER-TOKEN-42-NESCAFE-CONFIRMED');
  const [notification, setNotification] = useState(null);

  // A2HS (Add to Home Screen) custom install prompt modal state
  const [showA2hsPrompt, setShowA2hsPrompt] = useState(false);
  const [a2hsOrderToken, setA2hsOrderToken] = useState('');

  // Live orders state fetched directly from local SQLite database API
  const [orders, setOrders] = useState([]);

  // Gamified Loyalty & Rewards promo code state
  const [activePromo, setActivePromo] = useState(null);
  const [rewardsRefreshKey, setRewardsRefreshKey] = useState(0);

  // The active order being tracked on the Live Order Status page
  const [activeOrderForStatus, setActiveOrderForStatus] = useState(null);

  // Multiplayer Group Order state
  const [currentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ait_group_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: 'Aarav Sharma',
      avatar: '👨‍🎓',
      color: '#6b21a8',
      isHost: false,
    };
  });

  const [groupSession, setGroupSession] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [pendingJoinSessionId, setPendingJoinSessionId] = useState(null);
  const [isGroupCheckoutOpen, setIsGroupCheckoutOpen] = useState(false);

  // Cart items state
  const [cartItems, setCartItems] = useState([]);

  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  // Multiplayer Group Cart Socket.IO Listeners
  useEffect(() => {
    const handleGroupStateSync = ({ session }) => {
      if (session) setGroupSession(session);
    };

    const handleGroupUserJoined = ({ session, user }) => {
      if (session) setGroupSession(session);
      if (user && user.id !== currentUser.id) {
        showNotification(`${user.avatar || '👥'} ${user.name} joined the Group Cart!`);
      }
    };

    const handleGroupCartUpdated = ({ session, item, delta, user }) => {
      if (session) setGroupSession(session);
      if (user && user.id !== currentUser.id && item) {
        showNotification(
          delta > 0
            ? `${user.avatar || '👥'} ${user.name} added ${item.name} to Group Cart!`
            : `${user.avatar || '👥'} ${user.name} removed ${item.name} from Group Cart!`
        );
      }
    };

    const handleGroupPaymentReceived = ({ session, participant }) => {
      if (session) setGroupSession(session);
      if (participant) {
        playNotificationChime();
        showNotification(`💰 ${participant.avatar || '✓'} ${participant.name} paid their share!`);
      }
    };

    const handleGroupOrderDispatched = ({ session, order }) => {
      if (session) setGroupSession(session);
      if (order) {
        fireCelebratoryConfetti();
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
        setActiveOrderForStatus(order);
        setIsGroupCheckoutOpen(false);
        showNotification(`🎉 Group Order #${order.token} dispatched to kitchen!`);
        navigate('/live-status');
      }
    };

    socket.on('group:state_sync', handleGroupStateSync);
    socket.on('group:user_joined', handleGroupUserJoined);
    socket.on('group:cart_updated', handleGroupCartUpdated);
    socket.on('group:payment_received', handleGroupPaymentReceived);
    socket.on('group:order_dispatched', handleGroupOrderDispatched);

    return () => {
      socket.off('group:state_sync', handleGroupStateSync);
      socket.off('group:user_joined', handleGroupUserJoined);
      socket.off('group:cart_updated', handleGroupCartUpdated);
      socket.off('group:payment_received', handleGroupPaymentReceived);
      socket.off('group:order_dispatched', handleGroupOrderDispatched);
    };
  }, [currentUser.id, navigate, showNotification]);

  // Initial order load + Socket.IO real-time synchronization
  useEffect(() => {
    let isMounted = true;
    const fetchOrdersFromDb = async () => {
      try {
        const res = await fetch('/api/vendor/orders?shop=all');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setOrders(data);
            if (data.length > 0) {
              setActiveOrderForStatus((prev) => prev || data[0]);
            }
          }
        }
      } catch (err) {
        console.error('[App] Failed to fetch live orders from database:', err);
      }
    };

    fetchOrdersFromDb();

    const handleNewOrder = ({ order }) => {
      if (!order || !isMounted) return;
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      showNotification(`🔔 New Order #${order.token || order.id} queued!`);
    };

    const handleStatusUpdated = ({ orderId, status, order }) => {
      if (!isMounted) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...(order || {}), status } : o))
      );
      if (status === 'Ready') {
        playNotificationChime();
        showNotification(`🎉 Order #${order?.token || orderId} is Ready for Pickup!`);
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdated);

    return () => {
      isMounted = false;
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdated);
    };
  }, [showNotification]);

  // Handle URL query parameters (e.g., ?view=order-status or ?view=wallet)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    const orderIdParam = params.get('orderId');

    if (viewParam === 'order-status') {
      if (orderIdParam) {
        fetch(`/api/orders/${orderIdParam}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.order) setActiveOrderForStatus(d.order);
          })
          .catch(() => {});
      }
      navigate('/live-status', { replace: true });
    } else if (viewParam === 'wallet') {
      navigate('/profile', { replace: true });
    } else if (viewParam === 'cart') {
      navigate('/cart', { replace: true });
    }
  }, [location.search, navigate]);

  // Cart operations
  const handleAddToCartFromMenu = ({ item, quantity, shop }) => {
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === item.id);
      if (existing) {
        return prev.map((it) =>
          it.id === item.id ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
          shopName: shop.name || 'Juice Center',
          location: shop.location || 'Near Sports Complex',
          prepTimeMinutes: item.prepTimeMinutes || item.prep_time_minutes || 3,
        },
      ];
    });

    if (groupSession) {
      emitGroupCartUpdate(groupSession.id, {
        item,
        delta: quantity,
        user: currentUser,
      });
    }

    showNotification(`Added ${quantity}x "${item.name}" to Cart!`);
  };

  const handleUpdateCartQuantity = (itemId, newQty) => {
    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((it) => it.id !== itemId);
      }
      return prev.map((it) => (it.id === itemId ? { ...it, quantity: newQty } : it));
    });
  };

  const handleRemoveCartItem = (itemId) => {
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
    showNotification('Item removed from cart');
  };

  const handleQuickOrder = (item, shop) => {
    handleAddToCartFromMenu({ item, quantity: 1, shop });
    navigate('/cart');
  };

  const handleAddFreePromoItemToCart = (item) => {
    if (!item) return;
    setCartItems((prev) => {
      const exists = prev.find((it) => it.id === item.id);
      if (exists) return prev;
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price || 0,
          quantity: 1,
          shopName: 'Juice Center',
          isFreePromo: true,
        },
      ];
    });
    showNotification(`🎁 Free "${item.name}" added to cart!`);
  };

  // Order Placement
  const handleConfirmOrder = async ({ items, total, pickupTime, utr, upiString, promoCode }) => {
    const sanitizedUtr = (utr || '').toString().trim() || '123456789012';

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price * it.quantity,
            quantity: it.quantity,
            shopName: it.shopName || 'Juice Center',
          })),
          total,
          pickupTime: pickupTime || 'In 10 Minutes',
          utr: sanitizedUtr,
          shopName: items[0]?.shopName || 'Juice Center',
          userName: currentUser?.name || 'Aarav Sharma',
          upiString,
          promoCode: promoCode || activePromo?.code,
          studentSocketId: getSocketId(),
        }),
      });

      const data = await response.json();
      if (data.success && data.order) {
        const createdOrder = data.order;
        setOrders((prev) => [createdOrder, ...prev.filter((o) => o.id !== createdOrder.id)]);
        setActiveOrderForStatus(createdOrder);
        setCartItems([]);
        setIsCartOpen(false);
        setActivePromo(null);
        setRewardsRefreshKey((k) => k + 1);

        fireCelebratoryConfetti();

        setA2hsOrderToken(createdOrder.token);
        setTimeout(() => setShowA2hsPrompt(true), 750);

        navigate('/live-status');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (data.rewards) {
          showNotification(`Payment Verified! 🪙 +${data.rewards.earnedPoints} BiteCoins earned!`);
        } else {
          showNotification(`Payment Verified! Order #AIT-${createdOrder.token} created!`);
        }
        return { success: true, order: createdOrder, rewards: data.rewards };
      } else {
        const errorMsg = data.error || data.message || 'Failed to place order.';
        showNotification(`⚠️ ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('[Checkout Error]', err);
      showNotification(`⚠️ Error placing order: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  // Vendor status update handler
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    try {
      fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      }).catch(() => {});
    } catch (e) {}

    const target = orders.find((o) => o.id === orderId);
    showNotification(`Order #AIT-${target?.token || '42'} marked as ${newStatus}`);
  };

  const handleAddNewSampleOrder = async () => {
    const newToken = Math.floor(10 + Math.random() * 89).toString();
    const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const newOrder = {
      id: `ord-${Date.now()}`,
      token: newToken,
      shopName: 'Juice Center',
      location: 'Near Sports Complex',
      status: 'Pending',
      pickupTime: 'In 10 Minutes',
      dueTime: '2:45 PM',
      estimatedTime: 'In 10 mins',
      total: 95,
      utr: randomUtr,
      items: [
        { name: '2x Fresh Orange Juice', price: 80 },
        { name: '1x Crispy Punjabi Samosa (2 pcs)', price: 15 },
      ],
    };

    try {
      const res = await fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', order: newOrder }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => [data.order, ...prev]);
        showNotification(`New order queued: #AIT-${newToken}`);
        return;
      }
    } catch (e) {}
    setOrders((prev) => [newOrder, ...prev]);
    showNotification(`New order queued: #AIT-${newToken}`);
  };

  // Navigation handlers
  const handleSelectTab = (tabId) => {
    if (tabId === 'home') navigate('/');
    else if (tabId === 'shops') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('campus-shops');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === 'orders') navigate('/profile');
    else if (tabId === 'wallet') navigate('/profile');
    else if (tabId === 'vendor') navigate('/vendor');
  };

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const pendingOrdersCount = orders.filter(
    (o) => !o.status || !o.status.toLowerCase().includes('ready')
  ).length;

  // Active tab determination for Top Navbar
  let currentActiveTab = 'home';
  if (location.pathname === '/cart') currentActiveTab = 'cart';
  else if (location.pathname === '/profile') currentActiveTab = 'wallet';
  else if (location.pathname === '/support') currentActiveTab = 'support';
  else if (location.pathname === '/vendor') currentActiveTab = 'vendor';
  else if (location.pathname === '/live-status') currentActiveTab = 'orders';

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1f2937] flex flex-col font-sans">
      {/* Toast Alert Banner */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#ffffff] border-2 border-[#6b21a8] text-gray-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#6b21a8] flex-shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{notification}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        activeTab={currentActiveTab}
        onSelectTab={handleSelectTab}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenCart={() => navigate('/cart')}
        onOpenQrGenerator={() => setQrModalOpen(true)}
        onOpenInstallPrompt={() => setShowA2hsPrompt(true)}
        orderCount={orders.length}
        pendingOrdersCount={pendingOrdersCount}
        cartCount={totalCartCount}
      />

      {/* Main Routed Page Content */}
      <main className="flex-1 bg-[#ffffff]">
        <Routes>
          {/* 1. / (Home / Menu page) */}
          <Route
            path="/"
            element={
              <HomePage
                cartItems={cartItems}
                onAddToCart={handleAddToCartFromMenu}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                groupSession={groupSession}
                currentUser={currentUser}
                onCreateGroupCart={() => setIsInviteModalOpen(true)}
                onLeaveGroupCart={() => setGroupSession(null)}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
                onUpdateGroupCart={() => {}}
                onOpenGroupCheckout={() => setIsGroupCheckoutOpen(true)}
                onQuickOrder={handleQuickOrder}
              />
            }
          />

          {/* Alias for /menu */}
          <Route
            path="/menu"
            element={
              <HomePage
                cartItems={cartItems}
                onAddToCart={handleAddToCartFromMenu}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                groupSession={groupSession}
                currentUser={currentUser}
                onCreateGroupCart={() => setIsInviteModalOpen(true)}
                onLeaveGroupCart={() => setGroupSession(null)}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
                onUpdateGroupCart={() => {}}
                onOpenGroupCheckout={() => setIsGroupCheckoutOpen(true)}
                onQuickOrder={handleQuickOrder}
              />
            }
          />

          {/* 2. /cart (Checkout and Payment page) */}
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onConfirmOrder={handleConfirmOrder}
                activePromo={activePromo}
                onApplyPromo={(promo) => setActivePromo(promo)}
                onRemovePromo={() => setActivePromo(null)}
              />
            }
          />

          {/* 3. /profile (User Wallet, Macros, and Order History) */}
          <Route
            path="/profile"
            element={
              <ProfilePage
                currentUser={currentUser}
                orders={orders}
                onTrackOrder={(order) => {
                  setActiveOrderForStatus(order);
                  navigate('/live-status');
                }}
                onBrowseShops={() => navigate('/')}
                onAddToCart={handleAddToCartFromMenu}
              />
            }
          />

          {/* Alias: /wallet redirects to /profile */}
          <Route path="/wallet" element={<Navigate to="/profile" replace />} />

          {/* 4. /support (Customer Support / Help page) */}
          <Route
            path="/support"
            element={<SupportPage showNotification={showNotification} />}
          />

          {/* Additional core routes */}
          <Route
            path="/vendor"
            element={
              <div className="pb-24">
                <VendorDashboard
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAddNewSampleOrder={handleAddNewSampleOrder}
                  onSwitchToStudentView={() => navigate('/')}
                />
              </div>
            }
          />

          <Route
            path="/live-status"
            element={
              <div className="pb-24">
                <LiveOrderStatus
                  order={activeOrderForStatus || orders[0]}
                  onBackHome={() => navigate('/')}
                  onViewAllOrders={() => navigate('/profile')}
                  onOpenQrGenerator={() => setQrModalOpen(true)}
                />
              </div>
            }
          />

          {/* Catch-all route -> redirect to / */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Light-Themed Footer */}
      <Footer onSelectTab={handleSelectTab} />

      {/* Sticky Bottom Navigation Bar with 4 Highly Visible Icons */}
      <BottomNavigationBar cartCount={totalCartCount} />

      {/* Slide-Out Checkout Panel (Optional quick drawer) */}
      <CartCheckoutPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onConfirmOrder={handleConfirmOrder}
        activePromo={activePromo}
        onApplyPromo={(promo) => setActivePromo(promo)}
        onRemovePromo={() => setActivePromo(null)}
        onAddPromoItemToCart={handleAddFreePromoItemToCart}
      />

      {/* Gamified Loyalty Rewards Widget */}
      <RewardsWidget
        userId="usr-std-01"
        activePromo={activePromo}
        onApplyPromo={(promo) => setActivePromo(promo)}
        onOpenCart={() => navigate('/cart')}
        onAddToCart={handleAddFreePromoItemToCart}
        refreshTrigger={rewardsRefreshKey}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(user) => showNotification(`Logged in as ${user.email}`)}
      />

      {/* Dynamic QR Modal */}
      <QRCodeGenerator
        isModal={true}
        isOpen={qrModalOpen}
        initialText={qrCustomPayload}
        onClose={() => setQrModalOpen(false)}
      />

      {/* A2HS Custom Install Prompt */}
      <A2HSInstallPrompt
        isOpen={showA2hsPrompt}
        onClose={() => setShowA2hsPrompt(false)}
        orderToken={a2hsOrderToken}
        onInstallSuccess={() => showNotification('🎉 AIT QuickBite added to Home Screen!')}
      />

      {/* Group Cart Modals */}
      <GroupInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={groupSession}
        currentUser={currentUser}
      />

      <GroupJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        sessionId={pendingJoinSessionId || groupSession?.id}
        onJoin={(name, avatar) => {
          showNotification(`Welcome to Group Cart, ${name}!`);
          setIsJoinModalOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Main Application wrapped in React Router's BrowserRouter.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
