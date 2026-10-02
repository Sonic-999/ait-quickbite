import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Tag,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Users,
  Share2,
  Receipt,
  Layers,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import GroupOrderPresenceBar from '../components/GroupOrderPresenceBar';
import GroupSplitCheckout from '../components/GroupSplitCheckout';
import GroupJoinModal from '../components/GroupJoinModal';

// Verified Destination Merchant UPI Configuration
const MERCHANT_UPI_ID = 'kashishsangwan1105@okicici';
const MERCHANT_NAME = 'AIT QuickBite';

/**
 * Route: /cart (Checkout and Payment page)
 * Blinkit-style focused checkout and payment flow with Multiplayer Group Cart support.
 * Displays cart items with student attribution, promo codes, dynamic ETA, instant UPI QR generation,
 * 12-digit UTR verification, Multiplayer Group Cart sharing (AIT-XXXX room codes), and Split Bill modal.
 */
export default function CartPage({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onConfirmOrder,
  activePromo = null,
  onApplyPromo,
  onRemovePromo,
  // Multiplayer Group Cart Props
  groupSession = null,
  currentUser = null,
  onCreateGroupCart,
  onJoinGroupCart,
  onLeaveGroupCart,
  onOpenInviteModal,
  onOpenGroupCheckout,
  onPayShare,
  onDispatchGroupOrder,
}) {
  const navigate = useNavigate();
  const [pickupTime, setPickupTime] = useState('In 10 Minutes');
  const [manualPromoInput, setManualPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Group Cart Modals state
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inlineRoomCode, setInlineRoomCode] = useState('');
  const [showInlineJoin, setShowInlineJoin] = useState(false);

  // Dynamic ETA state
  const [etaData, setEtaData] = useState(null);
  const [isEtaLoading, setIsEtaLoading] = useState(false);

  // Use items from groupSession if active, else local cartItems
  const activeCartItems = (groupSession && groupSession.cartItems && groupSession.cartItems.length > 0)
    ? groupSession.cartItems
    : cartItems;

  // Calculate bill amounts
  const subtotal = activeCartItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  
  // Promo discount calculation
  let promoDiscount = 0;
  if (activePromo?.discountPercent) {
    promoDiscount = (subtotal * activePromo.discountPercent) / 100;
  } else if (activePromo?.item) {
    promoDiscount = Number(activePromo.item.price || 0);
  }

  const finalPayable = Math.max(0, subtotal - promoDiscount);
  const cartTotalFormatted = finalPayable.toFixed(2);
  const estimatedPoints = Math.round(finalPayable * 1.5);

  // Construct UPI deep link string strictly in the required format
  const upiString = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${cartTotalFormatted}&cu=INR&tn=CampusOrder`;

  // Fetch Dynamic ETA from backend service
  const fetchDynamicETA = useCallback(async () => {
    if (activeCartItems.length === 0) return;
    const targetShop = activeCartItems[0]?.shopName || 'Juice Center';

    try {
      setIsEtaLoading(true);
      const res = await fetch('/api/checkout/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: targetShop,
          items: activeCartItems.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            prepTimeMinutes: it.prepTimeMinutes || 3,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setEtaData(data);
        }
      }
    } catch (err) {
      console.error('[CartPage] Error fetching ETA:', err);
    } finally {
      setIsEtaLoading(false);
    }
  }, [activeCartItems]);

  useEffect(() => {
    if (activeCartItems.length > 0) {
      fetchDynamicETA();
    }
  }, [activeCartItems.length, fetchDynamicETA]);

  // Render QR Code using new QRCode(container, ...)
  useEffect(() => {
    if (activeCartItems.length === 0) return;

    let timer = null;
    const renderQR = () => {
      const container = document.getElementById('cart-page-qrcode-container');
      if (!container) return;

      if (typeof window !== 'undefined' && window.QRCode) {
        container.innerHTML = '';
        try {
          new window.QRCode(container, {
            text: upiString,
            width: 180,
            height: 180,
            colorDark: '#164e3d',
            colorLight: '#ffffff',
          });
        } catch (err) {
          console.error('[CartPage] Error generating QR code:', err);
        }
      }
    };

    const initialTimeout = setTimeout(renderQR, 60);

    if (typeof window !== 'undefined' && !window.QRCode) {
      timer = setInterval(() => {
        if (window.QRCode) {
          clearInterval(timer);
          renderQR();
        }
      }, 150);
    }

    return () => {
      clearTimeout(initialTimeout);
      if (timer) clearInterval(timer);
    };
  }, [activeCartItems.length, upiString]);

  const handleApplyManualPromo = async () => {
    const code = manualPromoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError('');
    setPromoSuccessMsg('');
    try {
      const res = await fetch('/api/rewards/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: 'usr-std-01' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid promo code');
      }
      if (onApplyPromo) {
        onApplyPromo({
          code: data.promoCode,
          item: data.freeItem,
          discountPercent: data.discountPercent,
        });
      }
      setPromoSuccessMsg(`🎉 Promo ${data.promoCode} applied successfully!`);
      setManualPromoInput('');
    } catch (err) {
      setPromoError(err.message || 'Error validating promo code');
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setOrderError(null);

    // Validate 12-digit UTR
    const cleanUtr = (utr || '').replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      setUtrError('Please enter a valid 12-digit UPI UTR number from your payment receipt.');
      const utrEl = document.getElementById('cart-utr-input') || document.getElementById('utr-input');
      if (utrEl) utrEl.focus();
      return;
    }
    setUtrError('');

    try {
      setIsProcessing(true);
      triggerHaptic(20);

      const result = await onConfirmOrder({
        items: activeCartItems,
        total: finalPayable,
        pickupTime,
        utr: cleanUtr,
        upiString,
        promoCode: activePromo?.code,
        skipAutoNavigate: true,
      });

      if (result && result.success) {
        setConfirmedOrder(result.order || {
          token: '4201',
          total: finalPayable,
          pickupTime,
        });
        triggerHaptic([40, 80, 40]);
      } else if (!result || !result.success) {
        setOrderError(result?.error || 'Order placement failed. Please verify item stock.');
      }
    } catch (err) {
      setOrderError(err.message || 'Payment verification encountered a network error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInlineJoinSubmit = (e) => {
    e.preventDefault();
    const clean = inlineRoomCode.trim().toUpperCase();
    if (!clean) return;
    if (onJoinGroupCart) {
      onJoinGroupCart(clean, currentUser);
    }
    setShowInlineJoin(false);
    setInlineRoomCode('');
  };

  // Scroll to top immediately when order is confirmed so the animated checkmark is in full view
  useEffect(() => {
    if (confirmedOrder && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [confirmedOrder]);

  // ========================================================
  // 1. ANIMATED CHECKOUT SUCCESS STATE
  // Highly satisfying, animated green checkmark that draws itself on screen
  // ========================================================
  if (confirmedOrder) {
    return (
      <div
        id="cart-checkout-success-view"
        className="min-h-[85vh] flex flex-col items-center justify-start px-4 pt-28 sm:pt-32 pb-36 bg-gray-50/60"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg bg-white rounded-3xl border border-gray-200/90 shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden"
        >
          {/* Decorative Background Glow */}
          <div className="absolute -top-20 -left-20 w-52 h-52 bg-emerald-100 rounded-full blur-3xl opacity-70 pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-purple-100 rounded-full blur-3xl opacity-70 pointer-events-none" />

          {/* Highly satisfying, animated green checkmark that draws itself on the screen */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.9, 1.25, 1], opacity: [0.4, 0.7, 0.5] }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-emerald-300/40 filter blur-md"
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
              className="w-full h-full rounded-full bg-emerald-50 border-4 border-emerald-300/80 shadow-xl flex items-center justify-center relative z-10"
            >
              <svg
                id="checkout-success-animated-checkmark"
                data-testid="checkout-success-animated-checkmark"
                className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-600"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Animated Circle Drawing */}
                <motion.circle
                  cx="26"
                  cy="26"
                  r="23"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.65, ease: 'easeOut', delay: 0.2 }}
                />
                {/* Animated Checkmark Drawing */}
                <motion.path
                  d="M15 27L23 35L37 19"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: 0.65 }}
                />
              </svg>
            </motion.div>
          </div>

          {/* Celebratory Headers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block mb-3">
              Payment Verified &bull; Order Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
              Order Placed Successfully! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
              Your food is being prepared in the kitchen. Skip the queue and pick it up hot as you arrive!
            </p>
          </motion.div>

          {/* Token & Order Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.35 }}
            className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-3"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e4eae2]">
              <div>
                <span className="text-[10px] font-bold text-[#605249] uppercase tracking-wider block">Pickup Token</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#164e3d]">
                  #AIT-{confirmedOrder.token || '4201'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#605249] uppercase tracking-wider block">Total Paid</span>
                <span className="text-lg font-black text-[#be185d]">
                  &#8377;{Number(confirmedOrder.total || cartTotalFormatted).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#605249]">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#164e3d]" />
                <span>Target Ready:</span>
              </span>
              <span className="font-bold text-[#2a221e]">
                {confirmedOrder.pickupTime || pickupTime || 'In 10 Minutes'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#605249]">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>BiteCoins Earned:</span>
              </span>
              <span className="font-black text-amber-600">
                +{estimatedPoints || 30} 🪙
              </span>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.35 }}
            className="space-y-2.5"
          >
            <button
              type="button"
              id="btn-track-live-order"
              data-testid="btn-track-live-order"
              onClick={() => {
                navigate('/live-status');
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#164e3d] via-[#1f5c49] to-[#2d6a4f] hover:from-[#133f32] hover:to-[#164e3d] text-white rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Track Live Kitchen Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-back-to-menu-after-order"
              onClick={() => {
                setConfirmedOrder(null);
                navigate('/');
              }}
              className="w-full py-2.5 px-4 bg-[#f0f4f1] hover:bg-[#e4eae2] text-[#2a221e] rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Campus Menu
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // 2. Empty Cart State
  if (activeCartItems.length === 0 && !groupSession) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 pb-28 text-center bg-[#faf8f5]">
        <div className="w-24 h-24 rounded-full bg-[#e8f2ec] flex items-center justify-center text-[#164e3d] mb-4 shadow-sm ring-8 ring-[#e8f2ec]/60">
          <ShoppingBag className="w-12 h-12 stroke-[1.8]" />
        </div>
        <h2 className="text-2xl font-black text-[#164e3d] tracking-tight mb-2">
          Your Cart is Empty
        </h2>
        <p className="text-sm text-[#605249] max-w-sm mb-6 leading-relaxed">
          Looks like you haven't added anything to your campus order yet. Explore fresh juices, snacks, or join a friend's group cart!
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
          <Link
            to="/"
            id="cart-empty-browse-menu-btn"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>Explore Campus Menu</span>
            <ChevronRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            id="btn-share-cart-empty"
            onClick={onCreateGroupCart}
            className="inline-flex items-center gap-2 bg-[#e8f2ec] hover:bg-[#d8e9de] text-[#164e3d] border border-[#164e3d]/20 px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Start Multiplayer Group Cart</span>
          </button>
        </div>

        {/* Join Friends Cart Prompt */}
        <div className="w-full max-w-sm bg-white p-4 rounded-2xl border border-[#e4eae2] shadow-xs text-left">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-[#164e3d]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2a221e]">
              Have a Friend's Room Code?
            </h3>
          </div>
          <form onSubmit={handleInlineJoinSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. AIT-4921"
              value={inlineRoomCode}
              onChange={(e) => setInlineRoomCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-[#faf8f5] border border-[#e4eae2] rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#164e3d] outline-none focus:ring-2 focus:ring-[#164e3d]"
            />
            <button
              type="submit"
              id="btn-join-room-empty"
              className="bg-[#164e3d] hover:bg-[#133f32] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Join
            </button>
          </form>
        </div>

        {/* Group Join Modal */}
        <GroupJoinModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onJoin={(user, code) => {
            setIsJoinModalOpen(false);
            if (onJoinGroupCart) onJoinGroupCart(code, user);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-32 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Top Breadcrumb Navigation & Badges */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#605249] hover:text-[#164e3d] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>

          <div className="flex items-center gap-2">
            {groupSession ? (
              <span className="text-xs font-bold text-[#164e3d] bg-[#e8f2ec] border border-[#164e3d]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#164e3d] animate-pulse" />
                <span>Room #{groupSession.id}</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-[#164e3d] bg-[#e8f2ec] px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Fast Counter Pickup</span>
              </span>
            )}
          </div>
        </div>

        {/* 1. MULTIPLAYER GROUP CART SECTION (SHARE CART & ROOM PRESENCE) */}
        {groupSession ? (
          <div className="mb-6">
            <GroupOrderPresenceBar
              session={groupSession}
              currentUser={currentUser}
              onOpenInviteModal={onOpenInviteModal}
              onLeaveGroup={onLeaveGroupCart}
            />
          </div>
        ) : (
          <div className="mb-6 bg-gradient-to-r from-[#164e3d] via-[#1f5c49] to-[#2d6a4f] rounded-2xl p-4 sm:p-5 text-white shadow-md border border-[#164e3d]/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-white shadow-inner">
                <Users className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    Multiplayer Group Cart
                  </h3>
                  <span className="bg-[#be185d] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                    New
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                  Order together with friends, see each person's items live, and auto-split individual UPI QR codes!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              <button
                type="button"
                id="btn-share-cart"
                data-testid="btn-share-cart"
                onClick={onCreateGroupCart}
                className="py-2.5 px-4 bg-white text-[#164e3d] hover:bg-[#faf8f5] active:scale-95 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Cart (Generate Room Code)</span>
              </button>

              <button
                type="button"
                id="btn-join-room-code"
                onClick={() => setIsJoinModalOpen(true)}
                className="py-2.5 px-3 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs rounded-xl transition-all border border-white/20 cursor-pointer"
              >
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-black text-[#164e3d] tracking-tight mb-6">
          Order Review &amp; Checkout
        </h1>

        {/* Global Error Banner */}
        {orderError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Transaction Failed</p>
              <p className="text-xs mt-0.5">{orderError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Items List + Pickup Time + Promo Code */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Cart Items List Card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#e4eae2] mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#164e3d]" />
                  <h2 className="text-sm font-extrabold text-[#2a221e] uppercase tracking-wider">
                    Items in Cart ({activeCartItems.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#605249] font-medium">
                    {activeCartItems[0]?.shopName || 'Juice Center'}
                  </span>
                  {groupSession && (
                    <span className="text-[10px] font-bold text-[#164e3d] bg-[#e8f2ec] px-2 py-0.5 rounded-full border border-[#164e3d]/20">
                      Shared Cart
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[#e4eae2]">
                {activeCartItems.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#e8f2ec] border border-[#164e3d]/20 flex items-center justify-center flex-shrink-0 font-bold text-xs text-[#164e3d]">
                        🍔
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#2a221e] truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#605249]">
                          &#8377;{item.price} each
                        </p>

                        {/* Each item in cart displays avatar and name of the person who added it */}
                        {item.addedBy ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f2ec] text-[#164e3d] border border-[#164e3d]/20">
                            <span>{item.addedBy.avatar || '👨‍🎓'}</span>
                            <span>
                              Added by {item.addedBy.id === currentUser?.id ? `You (${item.addedBy.name})` : item.addedBy.name}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-[#605249] bg-[#f0f4f1]">
                            <span>{currentUser?.avatar || '👨‍🎓'}</span>
                            <span>Added by You</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Quantity Selector */}
                      <div className="flex items-center bg-[#f0f4f1] rounded-lg p-0.5 border border-[#e4eae2]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item)}
                          className="w-7 h-7 flex items-center justify-center text-[#2a221e] hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-[#2a221e]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item)}
                          className="w-7 h-7 flex items-center justify-center text-[#2a221e] hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Total - Playful Raspberry */}
                      <span className="text-sm font-black text-[#be185d] w-14 text-right">
                        &#8377;{item.price * item.quantity}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[#605249] hover:text-[#be185d] p-1 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Pickup Time Selector */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#2a221e] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#164e3d]" />
                <span>Select Pickup Time</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  'In 5 Minutes',
                  'In 10 Minutes',
                  'In 15 Minutes',
                  'After Class (1:15 PM)',
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setPickupTime(opt);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      pickupTime === opt
                        ? 'bg-[#164e3d] text-white border-[#164e3d] shadow-xs scale-102'
                        : 'bg-[#f0f4f1] text-[#2a221e] border-[#e4eae2] hover:bg-[#e8f2ec]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {etaData && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 font-medium">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    Current Kitchen Load:{' '}
                    <span className="font-extrabold">{etaData.loadLevel || 'Normal'}</span>. Your estimated pickup time is{' '}
                    <span className="font-extrabold">{etaData.totalEtaMinutes || 10}</span> minutes.
                  </span>
                </div>
              )}
            </div>

            {/* 3. Promo Codes & Discounts */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#2a221e] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#164e3d]" />
                <span>Apply Promo Code</span>
              </h2>

              {activePromo ? (
                <div className="flex items-center justify-between bg-[#e8f2ec] border border-[#164e3d]/20 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#164e3d]" />
                    <span className="text-xs font-bold text-[#164e3d]">
                      Code <strong>{activePromo.code}</strong> Applied! (Save &#8377;{promoDiscount})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemovePromo}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME100, QUICKBITE"
                      value={manualPromoInput}
                      onChange={(e) => setManualPromoInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 border border-[#e4eae2] rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-[#164e3d] focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualPromo}
                      className="bg-[#164e3d] hover:bg-[#133f32] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-red-600 font-semibold">{promoError}</p>}
                  {promoSuccessMsg && <p className="text-xs text-emerald-600 font-semibold">{promoSuccessMsg}</p>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Split Bill Modal Trigger / Individual UPI QR Payment / Bill Details */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Split Bill Modal Trigger Highlight (When in Group Cart) */}
            {groupSession && (
              <div className="bg-gradient-to-r from-[#e8f2ec] via-[#f0f4f1] to-[#e8f2ec] border-2 border-[#164e3d]/30 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#164e3d] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#164e3d]" />
                    <span>Group Split Bill Active</span>
                  </span>
                  <span className="text-[11px] font-black text-[#164e3d] bg-white px-2 py-0.5 rounded-full border border-[#164e3d]/20">
                    {groupSession.participants?.length || 1} Friends
                  </span>
                </div>

                <p className="text-xs text-purple-900 mb-3 leading-relaxed">
                  Each student can scan their individual UPI QR code with their exact share amount before dispatch.
                </p>

                <button
                  type="button"
                  id="btn-group-split-checkout"
                  data-testid="btn-group-split-checkout"
                  onClick={() => setIsSplitModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Split Bill &amp; Individual UPI QR Codes</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 1. UPI QR Code Payment Box */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 shadow-xs text-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-[#2a221e] uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#164e3d]" />
                  <span>Scan &amp; Pay with UPI</span>
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-[#e8f2ec] px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Instant &#8377;{cartTotalFormatted}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-[#faf8f5] border border-[#e4eae2] rounded-2xl inline-flex items-center justify-center shadow-inner">
                <div
                  id="cart-page-qrcode-container"
                  className="min-h-[180px] min-w-[180px] flex items-center justify-center [&_img]:mx-auto [&_canvas]:mx-auto"
                />
              </div>

              <div className="mt-3.5 space-y-1">
                <div className="text-xs text-[#2a221e] font-medium">
                  Payee: <strong>{MERCHANT_NAME}</strong>
                </div>
                <div className="text-xs text-[#605249] font-mono">
                  UPI ID: <span className="text-[#2a221e] font-semibold">{MERCHANT_UPI_ID}</span>
                </div>

                {/* Direct UPI App Deep Link for Mobile Users */}
                <div className="pt-2">
                  <a
                    href={upiString}
                    id="cart-pay-upi-btn"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-[#e8f2ec] hover:bg-[#d8e9de] text-[#164e3d] border border-[#164e3d]/20 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    <span>Open in GPay / PhonePe / Paytm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 2. 12-Digit UTR Form */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 shadow-xs">
              <label htmlFor="utr-input" className="block text-xs font-extrabold uppercase tracking-wider text-[#2a221e] mb-1.5">
                UPI UTR / Transaction ID (12 Digits) <span className="text-rose-500">*</span>
              </label>

              <div className="relative mb-2">
                <input
                  id="utr-input"
                  data-testid="cart-utr-input"
                  type="text"
                  maxLength={12}
                  placeholder="Enter 12-digit UTR from receipt"
                  value={utr}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setUtr(clean);
                    if (clean.length === 12) setUtrError('');
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest outline-none transition-colors ${
                    utrError
                      ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                      : 'border-[#e4eae2] focus:ring-2 focus:ring-[#164e3d] focus:border-transparent'
                  }`}
                />
                {utr.length === 12 && (
                  <span className="absolute right-3 top-2.5 text-emerald-600 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valid</span>
                  </span>
                )}
              </div>

              {utrError ? (
                <p className="text-xs text-red-600 font-semibold mb-2">{utrError}</p>
              ) : (
                <p className="text-[11px] text-[#605249]/70 mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Found in GPay &bull; PhonePe &bull; Paytm payment details</span>
                </p>
              )}
            </div>

            {/* 3. Bill Summary Card */}
            <div className="bg-white rounded-2xl border border-[#e4eae2] p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#605249]">
                Bill Summary
              </h2>

              <div className="space-y-1.5 text-xs text-[#605249]">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-[#2a221e]">&#8377;{subtotal.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo Discount</span>
                    <span>-&#8377;{promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#605249]/70">
                  <span>Canteen Packaging &amp; Counter Fee</span>
                  <span className="font-bold text-emerald-700">FREE</span>
                </div>

                <div className="border-t border-[#e4eae2] pt-2 flex justify-between text-sm font-black text-[#2a221e]">
                  <span>To Pay</span>
                  <span className="text-base text-[#be185d] font-black">&#8377;{cartTotalFormatted}</span>
                </div>
              </div>

              {/* Bitecoins rewards badge */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bitecoins on this order</span>
                </span>
                <span className="font-black">+{estimatedPoints} 🪙</span>
              </div>

              {/* Submit Order Buttons */}
              <div className="space-y-2 pt-1">
                {groupSession ? (
                  <>
                    <button
                      type="button"
                      id="btn-group-split-checkout"
                      data-testid="cart-split-bill-primary-btn"
                      onClick={() => {
                        setIsSplitModalOpen(true);
                        if (onOpenGroupCheckout) onOpenGroupCheckout();
                      }}
                      className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-[#164e3d] via-[#1f5c49] to-[#2d6a4f] hover:from-[#133f32] hover:to-[#164e3d] shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Split Bill &amp; Individual UPI QRs (&#8377;{cartTotalFormatted})</span>
                    </button>

                    <button
                      type="button"
                      id="cart-confirm-order-button"
                      onClick={handleCheckoutSubmit}
                      disabled={isProcessing}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-[#164e3d] bg-[#e8f2ec] hover:bg-[#d8e9de] transition-colors cursor-pointer text-center"
                    >
                      Host Option: Pay Full Bill Directly (Single Payment)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      id="cart-confirm-order-button"
                      onClick={handleCheckoutSubmit}
                      disabled={isProcessing}
                      className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Order &bull; &#8377;{cartTotalFormatted}</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="cart-split-with-friends-btn"
                      onClick={onCreateGroupCart}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-[#164e3d] bg-[#e8f2ec] hover:bg-[#d8e9de] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Want to Split Bill? Share Cart with Friends</span>
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Split Bill Modal */}
      {groupSession && (
        <GroupSplitCheckout
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          session={groupSession}
          currentUser={currentUser}
          onPayShare={onPayShare}
          onDispatchOrder={onDispatchGroupOrder}
          onBackToCart={() => setIsSplitModalOpen(false)}
        />
      )}

      {/* Group Join Modal */}
      <GroupJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={(user, code) => {
          setIsJoinModalOpen(false);
          if (onJoinGroupCart) onJoinGroupCart(code, user);
        }}
      />
    </div>
  );
}
