import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import HowItWorks from './components/HowItWorks';
import CampusShops from './components/CampusShops';
import JuiceCenterMenu from './components/JuiceCenterMenu';
import MyOrdersSection from './components/MyOrdersSection';
import LiveOrderStatus from './components/LiveOrderStatus';
import CartCheckoutPanel from './components/CartCheckoutPanel';
import QRCodeGenerator from './components/QRCodeGenerator';
import LoginModal from './components/LoginModal';
import VendorDashboard from './components/VendorDashboard';
import A2HSInstallPrompt from './components/A2HSInstallPrompt';
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
import GroupInviteModal from './components/GroupInviteModal';
import GroupJoinModal from './components/GroupJoinModal';
import GroupSplitCheckout from './components/GroupSplitCheckout';
import WalletAnalytics from './components/WalletAnalytics';
import RewardsWidget from './components/RewardsWidget';
import StickyBottomNav from './components/StickyBottomNav';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/wallet' || search.includes('view=wallet')) return 'wallet';
      if (path === '/live-status' || search.includes('view=order-status')) return 'order-status';
      if (path === '/vendor' || search.includes('view=vendor')) return 'vendor';
      if (path === '/menu' || path === '/juice-menu' || search.includes('view=menu') || search.includes('view=juice-menu')) return 'juice-menu';
    }
    return 'main';
  }); // 'main' | 'juice-menu' | 'order-status' | 'vendor' | 'wallet'
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
  const [currentUser, setCurrentUser] = useState(() => {
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

  // Multiplayer Group Cart Socket.IO Listeners
  useEffect(() => {
    const handleGroupStateSync = ({ session }) => {
      console.log('[App Socket] group:state_sync:', session);
      if (session) setGroupSession(session);
    };

    const handleGroupUserJoined = ({ session, user }) => {
      console.log('[App Socket] group:user_joined:', user);
      if (session) setGroupSession(session);
      if (user && user.id !== currentUser.id) {
        showNotification(`${user.avatar || '👥'} ${user.name} joined the Group Cart!`);
      }
    };

    const handleGroupCartUpdated = ({ session, item, delta, user }) => {
      console.log('[App Socket] group:cart_updated:', item, delta, user);
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
      console.log('[App Socket] group:payment_received:', participant);
      if (session) setGroupSession(session);
      if (participant) {
        playNotificationChime();
        showNotification(`💰 ${participant.avatar || '✓'} ${participant.name} paid their share (₹${session?.splitBill?.perPersonAmount || ''})!`);
      }
    };

    const handleGroupOrderDispatched = ({ session, order }) => {
      console.log('[App Socket] group:order_dispatched:', order);
      if (session) setGroupSession(session);
      if (order) {
        fireCelebratoryConfetti();
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
        setActiveOrderForStatus(order);
        setIsGroupCheckoutOpen(false);
        showNotification(`🎉 Group Order #${order.token} dispatched to kitchen!`);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ orderId: order.id }, '', '/live-status');
        }
        setCurrentView('order-status');
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
  }, [currentUser.id]);

  // Initial order load + Socket.IO real-time synchronization (No HTTP polling!)
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

    // Real-time WebSockets event listeners
    const handleNewOrder = ({ order }) => {
      if (!order || !isMounted) return;
      console.log('[App Socket] Real-time order:new received:', order);
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      showNotification(`🔔 New Order #${order.token || order.id} queued!`);
    };

    const handleStatusUpdated = ({ orderId, status, order }) => {
      if (!isMounted) return;
      console.log(`[App Socket] Real-time order:status_updated received: ${orderId} -> ${status}`);
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
  }, []);

  // Cart items start empty
  const [cartItems, setCartItems] = useState([]);

  // Synchronize browser URL (/live-status, /vendor, /menu, /cart/session/:id) with view state
  React.useEffect(() => {
    const handleUrlRouting = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const search = window.location.search;
        const urlParams = new URLSearchParams(search);

        // Check for group cart session URLs (/cart/session/:id or ?group=:id)
        const groupMatch = path.match(/\/cart\/session\/([a-zA-Z0-9_-]+)/);
        const sessionFromUrl = (groupMatch && groupMatch[1]) || urlParams.get('group');

        if (sessionFromUrl) {
          setCurrentView('juice-menu');
          setPendingJoinSessionId(sessionFromUrl);

          fetch(`/api/group-cart/${sessionFromUrl}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.session) {
                setGroupSession(d.session);
                const isAlreadyParticipant = d.session.participants.some(
                  (p) => p.id === currentUser.id
                );
                if (!isAlreadyParticipant) {
                  setIsJoinModalOpen(true);
                } else {
                  joinGroupRoom(sessionFromUrl, currentUser);
                }
              } else {
                setIsJoinModalOpen(true);
              }
            })
            .catch(() => {
              setIsJoinModalOpen(true);
            });
          return;
        }

        if (path === '/wallet' || search.includes('view=wallet')) {
          setCurrentView('wallet');
          setActiveTab('wallet');
        } else if (path === '/live-status') {
          const qOrderId = urlParams.get('orderId') || (window.history.state && window.history.state.orderId);
          if (qOrderId) {
            fetch(`/api/orders/${qOrderId}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.success && d.order) setActiveOrderForStatus(d.order);
              })
              .catch(() => {});
          }
          setCurrentView('order-status');
        } else if (path === '/vendor') {
          setCurrentView('vendor');
          setActiveTab('vendor');
        } else if (path === '/menu' || path === '/juice-menu' || search.includes('view=menu')) {
          setCurrentView('juice-menu');
        } else {
          setCurrentView('main');
        }
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, [currentUser.id]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleBrowseShops = () => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/live-status' || window.location.pathname === '/vendor' || window.location.pathname === '/wallet')) {
      window.history.pushState({}, '', '/');
    }
    setCurrentView('main');
    setActiveTab('shops');
    setTimeout(() => {
      const shopsEl = document.getElementById('campus-shops');
      if (shopsEl) shopsEl.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      if (tabId === 'vendor') {
        window.history.pushState({}, '', '/vendor');
      } else if (tabId === 'wallet') {
        window.history.pushState({}, '', '/wallet');
      } else if (window.location.pathname === '/live-status' || window.location.pathname === '/vendor' || window.location.pathname === '/wallet') {
        window.history.pushState({}, '', '/');
      }
    }

    if (tabId === 'vendor') {
      setCurrentView('vendor');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabId === 'wallet') {
      setCurrentView('wallet');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabId === 'home') {
      setCurrentView('main');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabId === 'shops') {
      setCurrentView('main');
      setTimeout(() => {
        const shopsEl = document.getElementById('campus-shops');
        if (shopsEl) shopsEl.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === 'orders') {
      setCurrentView('main');
      setTimeout(() => {
        const ordersEl = document.getElementById('orders-section');
        if (ordersEl) ordersEl.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: newStatus,
            estimatedTime:
              newStatus === 'Ready for Pickup' ? 'Ready now for pickup!' : ord.estimatedTime,
          };
        }
        return ord;
      })
    );

    // Persist status change to SQLite database
    try {
      fetch('/api/vendor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      }).catch((e) => console.error('Status sync error:', e));
    } catch (e) {
      // non-blocking
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    const token = targetOrder ? targetOrder.token : '42';

    if (newStatus === 'Ready for Pickup' || newStatus === 'Ready') {
      showNotification(`Order #AIT-${token} marked as Ready! Student notified.`);
    } else {
      showNotification(`Order #AIT-${token} moved back to kitchen queue.`);
    }
  };

  const handleAddNewSampleOrder = async () => {
    const newToken = Math.floor(10 + Math.random() * 89).toString();
    const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const newOrder = {
      id: `ord-${Date.now()}`,
      token: newToken,
      shopName: 'Juice Center',
      location: 'Near Sports Complex & Gym',
      status: 'Pending',
      pickupTime: 'In 10 Minutes',
      dueTime: '2:45 PM',
      estimatedTime: 'In 15 mins (approx. 2:45 PM)',
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
        showNotification(`New order incoming! #AIT-${newToken} (UTR: ${randomUtr})`);
        return;
      }
    } catch (err) {
      console.error('Failed to create sample order:', err);
    }

    setOrders((prev) => [newOrder, ...prev]);
    showNotification(`New order incoming! #AIT-${newToken} (UTR: ${randomUtr})`);
  };

  const handleQuickOrder = (item, shop) => {
    const newToken = Math.floor(10 + Math.random() * 89).toString();
    const newOrder = {
      id: `ord-${Date.now()}`,
      token: newToken,
      shopName: shop.name,
      location: shop.location,
      status: 'Order Placed &bull; Kitchen Preparing',
      estimatedTime: `In ${shop.prepTime ? shop.prepTime.split(' ')[0] : '5'} mins`,
      total: item.price,
      items: [{ name: `1x ${item.name}`, price: item.price }],
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderForStatus(newOrder);
    showNotification(`Pre-ordered "${item.name}" from ${shop.name}! Token #${newToken}`);
  };

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
          shopName: shop.name,
          location: shop.location,
        },
      ];
    });

    showNotification(`Added ${quantity}x "${item.name}" to Cart!`);
  };

  const handleUpdateCartQuantity = (itemId, delta) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === itemId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveCartItem = (itemId) => {
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Group Cart Multiplayer Actions
  const handleCreateGroupCart = async () => {
    try {
      const res = await fetch('/api/group-cart/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: currentUser.name,
          avatar: currentUser.avatar,
          color: currentUser.color,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        const updatedUser = { ...currentUser, isHost: true };
        setCurrentUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ait_group_user', JSON.stringify(updatedUser));
          window.history.pushState({}, '', `/cart/session/${data.session.id}`);
        }
        setGroupSession(data.session);
        joinGroupRoom(data.session.id, updatedUser);
        setIsInviteModalOpen(true);
        showNotification(`🎉 Group Cart #${data.session.id} created! Share link with friends.`);
      } else {
        showNotification(`Failed to create group cart: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error creating group cart:', err);
      showNotification('Error creating group cart.');
    }
  };

  const handleJoinGroup = async (userProfile) => {
    const targetSessionId = pendingJoinSessionId || groupSession?.id;
    if (!targetSessionId) return;

    const finalUser = {
      id: currentUser.id || 'user_' + Math.random().toString(36).substring(2, 9),
      name: userProfile.name,
      avatar: userProfile.avatar,
      color: userProfile.color,
      isHost: false,
    };
    setCurrentUser(finalUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ait_group_user', JSON.stringify(finalUser));
      window.history.pushState({}, '', `/cart/session/${targetSessionId}`);
    }

    try {
      const res = await fetch(`/api/group-cart/${targetSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: finalUser }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setGroupSession(data.session);
      }
    } catch (e) {
      console.warn('API join error, relying on socket:', e);
    }

    joinGroupRoom(targetSessionId, finalUser);
    setIsJoinModalOpen(false);
    setCurrentView('juice-menu');
    showNotification(`👋 Welcome to the Group Cart, ${finalUser.name}!`);
  };

  const handleUpdateGroupCart = (item, delta) => {
    if (!groupSession) return;
    emitGroupCartUpdate(groupSession.id, {
      item,
      delta,
      user: currentUser,
    });
  };

  const handlePayShare = async (participantId, utr) => {
    if (!groupSession) return;
    emitGroupPayShare(groupSession.id, participantId, utr);
    try {
      await fetch(`/api/group-cart/${groupSession.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, utr }),
      });
    } catch (e) {
      console.warn('REST pay share error:', e);
    }
  };

  const handleDispatchGroupOrder = async ({ utr, pickupTime }) => {
    if (!groupSession) return;
    const studentSocketId = getSocketId();
    try {
      const res = await fetch(`/api/group-cart/${groupSession.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentSocketId,
          utr: utr || '123456789012',
          pickupTime: pickupTime || 'In 10 Minutes',
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
        setActiveOrderForStatus(data.order);
        setGroupSession(data.session);
        setIsGroupCheckoutOpen(false);
        fireCelebratoryConfetti();
        showNotification(`🎉 Group Order #${data.order.token} placed with kitchen!`);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ orderId: data.order.id }, '', '/live-status');
        }
        setCurrentView('order-status');
        return data.order;
      } else {
        throw new Error(data.error || 'Failed to dispatch order');
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      throw err;
    }
  };

  const handleLeaveGroupCart = () => {
    setGroupSession(null);
    setIsGroupCheckoutOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/menu');
    }
    showNotification('Left Group Cart session.');
  };

  const handleAddFreePromoItemToCart = (freeItem) => {
    if (!freeItem) return;
    setCartItems((prev) => {
      const existing = prev.find(
        (it) => it.id === freeItem.id || it.name.toLowerCase() === freeItem.name.toLowerCase()
      );
      if (existing) {
        return prev;
      }
      return [
        ...prev,
        {
          id: freeItem.id,
          name: freeItem.name,
          price: freeItem.price,
          quantity: 1,
          shopName: freeItem.shopName || 'Juice Center',
          isFreeReward: true,
          prepTimeMinutes: 3,
        },
      ];
    });
    showNotification(`🎁 Free ${freeItem.name} added to your cart!`);
  };

  const handleVoiceOrderSuccess = (matchedItemsList, toastMessage) => {
    if (!Array.isArray(matchedItemsList) || matchedItemsList.length === 0) return;

    setCartItems((prev) => {
      let updated = [...prev];
      matchedItemsList.forEach(({ item, quantity }) => {
        const existingIndex = updated.findIndex(
          (it) => it.id === item.id || it.name.toLowerCase() === item.name.toLowerCase()
        );
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
        } else {
          updated.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity,
            shopName: item.shopName || 'Juice Center',
            location: item.location || 'Near Sports Complex & Gym',
            prepTimeMinutes: item.prepTimeMinutes || 3,
            inStockQuantity: item.inStockQuantity || 20,
          });
        }
      });
      return updated;
    });

    // If currently in a Multiplayer Group Cart session, sync voice additions with all participants
    if (groupSession) {
      matchedItemsList.forEach(({ item, quantity }) => {
        emitGroupCartUpdate(groupSession.id, {
          item,
          delta: quantity,
          user: currentUser,
        });
      });
    }

    // Trigger cart pulse animation
    const floatingBar = document.getElementById('floating-cart-banner-card');
    if (floatingBar) {
      floatingBar.classList.add('cart-pulse-active');
      setTimeout(() => floatingBar.classList.remove('cart-pulse-active'), 700);
    }
  };

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
          userName: 'Aarav Sharma',
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

        // Clear redeemed promo code and trigger loyalty widget refresh
        setActivePromo(null);
        setRewardsRefreshKey((k) => k + 1);

        // Fire celebratory burst of confetti exactly when order is successfully logged in the database!
        fireCelebratoryConfetti();

        // Trigger custom A2HS (Add to Home Screen) install prompt after successful order
        setA2hsOrderToken(createdOrder.token);
        setTimeout(() => {
          setShowA2hsPrompt(true);
        }, 750);

        // Redirect to '/live-status' page
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ orderId: createdOrder.id }, '', '/live-status');
        }
        setCurrentView('order-status');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (data.rewards) {
          showNotification(`Payment Verified! 🪙 +${data.rewards.earnedPoints} BiteCoins earned (${data.rewards.streakMessage})`);
        } else {
          showNotification(`Payment Verified! Order #AIT-${createdOrder.token} (UTR: ${createdOrder.utr})`);
        }
        return { success: true, order: createdOrder, rewards: data.rewards };
      } else {
        // Concurrency or validation error returned from ACID backend (e.g. 'Item just sold out')
        console.warn('[Checkout Transaction Failed]', data);
        const errorMsg = data.error || data.message || 'Failed to place order.';
        const itemName = data.item || '';
        showNotification(`⚠️ ${errorMsg}${itemName ? `: ${itemName}` : ''}`);
        return {
          success: false,
          error: errorMsg,
          message: data.message || errorMsg,
          item: itemName,
          itemId: data.itemId,
          code: data.code,
        };
      }
    } catch (err) {
      console.error('[Checkout Error]', err);
      showNotification(`⚠️ Connection error placing order: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  const handleTrackSpecificOrder = (order) => {
    setActiveOrderForStatus(order);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({ orderId: order.id }, '', '/live-status');
    }
    setCurrentView('order-status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQrGenerator = (payload) => {
    if (payload && typeof payload === 'string') {
      setQrCustomPayload(payload);
    }
    setQrModalOpen(true);
  };

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const pendingOrdersCount = orders.filter(
    (o) => !o.status || !o.status.toLowerCase().includes('ready')
  ).length;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1f2937] flex flex-col font-sans">
      
      {/* Toast Alert Banner for Pre-Orders & Cart */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#ffffff] border-2 border-[#6b21a8] text-gray-900 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#6b21a8] flex-shrink-0" />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        activeTab={
          currentView === 'vendor'
            ? 'vendor'
            : currentView === 'juice-menu'
            ? 'shops'
            : currentView === 'order-status'
            ? 'orders'
            : currentView === 'wallet'
            ? 'wallet'
            : activeTab
        }
        onSelectTab={handleSelectTab}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenQrGenerator={() => handleOpenQrGenerator('AIT-ORDER-TOKEN-42-NESCAFE-CONFIRMED')}
        onOpenInstallPrompt={() => setShowA2hsPrompt(true)}
        orderCount={orders.length}
        pendingOrdersCount={pendingOrdersCount}
        cartCount={totalCartCount}
      />

      {/* Main Content Sections */}
      <main className="flex-1 bg-[#ffffff] pb-24">
        {currentView === 'vendor' ? (
          /* Vendor Dashboard (Minimalist Kanban board for canteen owners) */
          <VendorDashboard
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onAddNewSampleOrder={handleAddNewSampleOrder}
            onSwitchToStudentView={() => {
              handleSelectTab('home');
            }}
          />
        ) : currentView === 'order-status' ? (
          /* Live Order Status Page (Shown after paying or tracking an order) */
          <LiveOrderStatus
            order={activeOrderForStatus || orders[0]}
            onBackHome={() => {
              setCurrentView('main');
              handleSelectTab('home');
            }}
            onViewAllOrders={() => {
              setCurrentView('main');
              handleSelectTab('orders');
            }}
            onOpenQrGenerator={handleOpenQrGenerator}
          />
        ) : currentView === 'wallet' ? (
          /* My Wallet & Analytics Dashboard with Chart.js */
          <WalletAnalytics
            onBackToMenu={() => {
              setCurrentView('juice-menu');
              setActiveTab('shops');
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/menu');
            }}
            onBrowseShops={() => {
              handleBrowseShops();
            }}
            userId="usr-std-01"
            userName={currentUser?.name || 'Aarav Sharma'}
          />
        ) : isGroupCheckoutOpen && groupSession ? (
          /* Auto-Split Bill & Checkout for Group Cart */
          <GroupSplitCheckout
            session={groupSession}
            currentUser={currentUser}
            onPayShare={handlePayShare}
            onDispatchOrder={handleDispatchGroupOrder}
            onBackToMenu={() => setIsGroupCheckoutOpen(false)}
          />
        ) : currentView === 'juice-menu' ? (
          /* Dedicated Menu Page for Juice Center with Multiplayer Group Cart */
          <JuiceCenterMenu
            onBackToShops={() => {
              setCurrentView('main');
              handleSelectTab('shops');
            }}
            onAddToCart={handleAddToCartFromMenu}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveFromCart={handleRemoveCartItem}
            onOpenCart={() => setIsCartOpen(true)}
            cartItems={cartItems}
            groupSession={groupSession}
            currentUser={currentUser}
            onCreateGroupCart={handleCreateGroupCart}
            onLeaveGroupCart={handleLeaveGroupCart}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onUpdateGroupCart={handleUpdateGroupCart}
            onOpenGroupCheckout={() => setIsGroupCheckoutOpen(true)}
          />
        ) : (
          /* Standard Campus Layout */
          <>
            {/* Clean Hero Section */}
            <HeroSection onBrowseShops={handleBrowseShops} />

            {/* How It Works (Clean 3 Steps) */}
            <HowItWorks />

            {/* Campus Food Outlets & Pre-Ordering */}
            <CampusShops
              onQuickOrder={handleQuickOrder}
              onOpenJuiceMenu={() => {
                setCurrentView('juice-menu');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Live Orders Section */}
            <MyOrdersSection
              orders={orders}
              onBrowseShops={handleBrowseShops}
              onTrackOrder={handleTrackSpecificOrder}
            />
          </>
        )}
      </main>

      {/* Clean Light-Themed Footer */}
      <Footer onSelectTab={handleSelectTab} />

      {/* Cart & Checkout Slide-Out Panel */}
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

      {/* Gamified Loyalty & Rewards Floating Widget */}
      <RewardsWidget
        userId="usr-std-01"
        activePromo={activePromo}
        onApplyPromo={(promo) => setActivePromo(promo)}
        onOpenCart={() => setIsCartOpen(true)}
        onAddToCart={handleAddFreePromoItemToCart}
        refreshTrigger={rewardsRefreshKey}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          showNotification(`Logged in as ${user.email}`);
        }}
      />

      {/* Dynamic QR Code Generator Modal (Powered by qrcode.js CDN) */}
      <QRCodeGenerator
        isModal={true}
        isOpen={qrModalOpen}
        initialText={qrCustomPayload}
        onClose={() => setQrModalOpen(false)}
      />

      {/* Add to Home Screen (A2HS) Custom Install Prompt */}
      <A2HSInstallPrompt
        isOpen={showA2hsPrompt}
        onClose={() => setShowA2hsPrompt(false)}
        orderToken={a2hsOrderToken}
        onInstallSuccess={() => {
          showNotification('🎉 AIT QuickBite added to Home Screen!');
        }}
      />

      {/* Group Invite Modal (Shareable Link & QR) */}
      <GroupInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={groupSession}
        currentUser={currentUser}
      />

      {/* Group Join Modal (Name & Avatar for friends joining via link) */}
      <GroupJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        sessionId={pendingJoinSessionId || groupSession?.id}
        onJoin={handleJoinGroup}
      />

      {/* Sticky Bottom Navigation Bar with Prominent Voice-to-Cart Mic Button */}
      {currentView !== 'vendor' && (
        <StickyBottomNav
          activeTab={
            currentView === 'juice-menu'
              ? 'shops'
              : currentView === 'order-status'
              ? 'orders'
              : activeTab
          }
          onSelectTab={handleSelectTab}
          onOpenCart={() => setIsCartOpen(true)}
          cartCount={totalCartCount}
          cartItems={cartItems}
          onVoiceOrderSuccess={handleVoiceOrderSuccess}
          showNotification={(msg) => showNotification(msg)}
        />
      )}

    </div>
  );
}
