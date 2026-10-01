import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  QrCode,
  Flame,
  Activity,
  ChefHat,
  Timer,
  PiggyBank,
  Wallet,
  Tag,
  Gift,
  Sparkles
} from 'lucide-react';
import { socket } from '../socket';
import { triggerHaptic } from '../utils/haptics';

// Merchant UPI Configuration
const MERCHANT_UPI_ID = 'kashishsangwan1105@okicici';
const MERCHANT_NAME = 'AIT QuickBite';

export default function CartCheckoutPanel({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onConfirmOrder,
  activePromo = null,
  onApplyPromo,
  onRemovePromo,
  onAddPromoItemToCart,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Sold out concurrency error state returned from ACID transaction
  const [soldOutError, setSoldOutError] = useState(null);

  // Dynamic ETA state calculated by backend service
  const [etaData, setEtaData] = useState(null);
  const [isEtaLoading, setIsEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState(null);

  // 12-digit UPI UTR state & validation
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');

  // Monthly Budget & Spend Tracking for 90% threshold warning
  const [budgetInfo, setBudgetInfo] = useState(() => {
    const savedBudget = typeof window !== 'undefined' ? Number(localStorage.getItem('ait_monthly_budget')) || 2000 : 2000;
    const savedSpend = typeof window !== 'undefined' ? Number(localStorage.getItem('ait_monthly_spend')) || 1200 : 1200;
    return {
      monthlySpend: savedSpend,
      monthlyBudget: savedBudget,
      isNearBudget: false,
    };
  });

  const fetchBudgetInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/user/wallet-analytics');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setBudgetInfo({
            monthlySpend: data.monthlySpend || 0,
            monthlyBudget: data.monthlyBudget || 2000,
            isNearBudget: data.isNearBudget,
          });
          localStorage.setItem('ait_monthly_budget', String(data.monthlyBudget || 2000));
          localStorage.setItem('ait_monthly_spend', String(data.monthlySpend || 0));
        }
      }
    } catch (e) {
      console.error('[CartCheckoutPanel] Could not fetch budget info:', e);
    }
  }, []);

  // Loyalty rewards info and manual promo input
  const [loyaltyInfo, setLoyaltyInfo] = useState({
    multiplier: 2.0,
    currentStreak: 3,
    streakMessage: '3-Day Coffee Streak! 2x Points',
  });
  const [manualPromoInput, setManualPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');

  const fetchLoyaltyInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/user/rewards?userId=usr-std-01');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLoyaltyInfo({
            multiplier: data.multiplier || 2.0,
            currentStreak: data.currentStreak || 3,
            streakMessage: data.streakMessage || '3-Day Coffee Streak! 2x Points',
            bitecoinsBalance: data.bitecoinsBalance,
          });
        }
      }
    } catch (e) {
      console.error('[CartCheckoutPanel] Loyalty info error:', e);
    }
  }, []);

  const totalBill = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Check if promo item is in cart
  const promoItemInCart = activePromo ? cartItems.find((it) => {
    if (activePromo.item?.id && it.id === activePromo.item.id) return true;
    if (activePromo.item?.name && it.name.toLowerCase().includes(activePromo.item.name.toLowerCase())) return true;
    return false;
  }) : null;

  // 100% discount on that 1 item
  const discountAmount = promoItemInCart ? (activePromo.item?.price || promoItemInCart.price) : 0;
  const finalPayable = Math.max(0, totalBill - discountAmount);

  // Budget calculations
  const currentSpend = budgetInfo.monthlySpend;
  const currentBudget = budgetInfo.monthlyBudget;
  const projectedTotalSpend = currentSpend + finalPayable;
  const currentBudgetPercent = currentBudget > 0 ? Math.round((currentSpend / currentBudget) * 100) : 0;
  const projectedBudgetPercent = currentBudget > 0 ? Math.round((projectedTotalSpend / currentBudget) * 100) : 0;
  // Approaches 90% if either currently >= 90% or this checkout brings them >= 90%
  const isApproachingBudget = currentBudgetPercent >= 90 || projectedBudgetPercent >= 90;

  // Fetch cart total as a string with strictly two decimal places (e.g., '150.00')
  const cartTotal = Number(finalPayable).toFixed(2);

  // Estimated points earned on this order
  const estimatedPoints = Math.round(Math.max(1, finalPayable) * (loyaltyInfo.multiplier || 1));

  // Construct UPI deep link string strictly in the required format:
  // upi://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${cartTotal}&cu=INR&tn=CampusOrder
  const upiString = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${cartTotal}&cu=INR&tn=CampusOrder`;

  const handleApplyManualPromo = async () => {
    const code = manualPromoInput.trim();
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
      setPromoSuccessMsg(`Promo code ${data.promoCode} applied! 100% OFF on ${data.freeItem?.name}.`);
      setManualPromoInput('');
    } catch (err) {
      setPromoError(err.message || 'Error validating promo code');
    }
  };

  /**
   * Fetch Dynamic ETA from backend service:
   * Queries pending orders for the shop + sums prep times + adds user's cart prep time
   */
  const fetchDynamicETA = useCallback(async () => {
    if (cartItems.length === 0) {
      setEtaData(null);
      return;
    }

    const targetShop = cartItems[0]?.shopName || 'Juice Center';

    try {
      setIsEtaLoading(true);
      const response = await fetch('/api/checkout/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: targetShop,
          items: cartItems.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            prepTimeMinutes: it.prepTimeMinutes || it.prep_time_minutes,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`ETA request failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.success) {
        setEtaData(data);
        setEtaError(null);
      } else {
        setEtaError(data?.error || 'Failed to calculate dynamic ETA');
      }
    } catch (err) {
      console.error('[CartCheckoutPanel] Error fetching dynamic ETA:', err);
      setEtaError(err.message || 'Error connecting to ETA service');
    } finally {
      setIsEtaLoading(false);
    }
  }, [cartItems]);

  // Fetch ETA and Budget whenever drawer opens or cartItems change
  useEffect(() => {
    if (isOpen) {
      fetchBudgetInfo();
      if (cartItems.length > 0) {
        fetchDynamicETA();
      }
    }
  }, [isOpen, cartItems, fetchDynamicETA, fetchBudgetInfo]);

  // Real-time synchronization via WebSockets
  // When an order is placed or marked ready, refresh kitchen load & ETA
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) return;

    const handleQueueChange = () => {
      fetchDynamicETA();
    };

    socket.on('order:new', handleQueueChange);
    socket.on('order:status_updated', handleQueueChange);
    socket.on('order:ready', handleQueueChange);

    return () => {
      socket.off('order:new', handleQueueChange);
      socket.off('order:status_updated', handleQueueChange);
      socket.off('order:ready', handleQueueChange);
    };
  }, [isOpen, cartItems.length, fetchDynamicETA]);

  // Render QR Code using new QRCode(document.getElementById('qrcode-container'), ...)
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) return;

    let timer = null;

    const renderUPIQR = () => {
      const container = document.getElementById('qrcode-container');
      if (!container) return;

      if (typeof window !== 'undefined' && window.QRCode) {
        container.innerHTML = '';
        try {
          new window.QRCode(container, {
            text: upiString,
            width: 200,
            height: 200,
          });
        } catch (err) {
          console.error('Error generating UPI QR code with qrcode.js:', err);
        }
      }
    };

    // Small delay to ensure the drawer DOM is painted
    const initialTimeout = setTimeout(renderUPIQR, 50);

    // If qrcode.js library from CDN is still loading, poll until available
    if (typeof window !== 'undefined' && !window.QRCode) {
      timer = setInterval(() => {
        if (window.QRCode) {
          clearInterval(timer);
          renderUPIQR();
        }
      }, 150);
    }

    return () => {
      clearTimeout(initialTimeout);
      if (timer) clearInterval(timer);
    };
  }, [isOpen, cartTotal, upiString, cartItems.length]);

  if (!isOpen) return null;

  // Check if checkout must be disabled (queue > 60 minutes)
  const isQueueOverloaded = Boolean(
    etaData && (etaData.isQueueFull || etaData.totalEtaMinutes > 60 || etaData.queuePrepMinutes > 60 || !etaData.canCheckout)
  );

  // Validate that UTR input is exactly 12 digits and submit order with ACID transaction handling
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return;

    if (isQueueOverloaded) {
      alert(`Kitchen Over Capacity: The active order queue exceeds 60 minutes (${etaData?.totalEtaMinutes || 60}+ mins). Orders are temporarily paused.`);
      return;
    }

    const trimmedUtr = utr.trim();

    // Check if UTR is exactly 12 digits long
    if (!/^\d{12}$/.test(trimmedUtr)) {
      setUtrError('Please enter a valid 12-digit UTR number before submitting your order.');
      return;
    }

    setUtrError('');
    setSoldOutError(null);
    setIsProcessing(true);

    try {
      const result = await onConfirmOrder({
        items: cartItems,
        total: finalPayable,
        cartTotalFormatted: cartTotal,
        pickupTime: etaData ? `In ${etaData.totalEtaMinutes} Minutes` : 'In 15 Minutes',
        targetPickupTime: etaData?.targetPickupTime,
        eta: etaData,
        utr: trimmedUtr,
        upiString,
        promoCode: activePromo?.code,
      });

      if (result && result.success) {
        setIsProcessing(false);
        setSoldOutError(null);
        onClose();
      } else if (result && !result.success) {
        setIsProcessing(false);
        if (
          result.error === 'Item just sold out' ||
          result.code === 'ERR_ITEM_SOLD_OUT' ||
          result.message?.toLowerCase().includes('sold out')
        ) {
          setSoldOutError({
            message: 'Item just sold out',
            itemName: result.item || 'One of the items in your cart',
            itemId: result.itemId,
          });
        }
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      setIsProcessing(false);
      console.error('[CartCheckoutPanel] Order submission error:', err);
    }
  };

  // Generate sample upcoming times for dropdown
  const timeOptions = [
    '12:45 PM',
    '1:00 PM',
    '1:15 PM',
    '1:30 PM',
    '1:45 PM',
    '2:00 PM',
    '2:15 PM',
    '2:30 PM',
    '3:00 PM',
    '3:30 PM',
    '4:00 PM',
    '5:00 PM',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#ffffff] border-l border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          
          {/* Panel Header */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Cart &amp; Checkout</h2>
                <p className="text-xs text-gray-500">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} ready for pre-order
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            
            {/* Empty State */}
            {cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Your cart is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Browse campus shops and menus to add freshly prepared meals and beverages.
                </p>
              </div>
            ) : (
              <>
                {/* Graceful Sold Out Error Banner */}
                {soldOutError && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 mt-0.5 shadow-2xs">
                        <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            High Demand
                          </span>
                          <h4 className="text-sm font-extrabold text-rose-950">
                            Item just sold out!
                          </h4>
                        </div>
                        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                          Another student just purchased the remaining inventory of{' '}
                          <strong className="text-rose-950 underline decoration-rose-400">
                            {soldOutError.itemName}
                          </strong>
                          . The database transaction rolled back safely to prevent overcharging.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/80">
                      <button
                        type="button"
                        onClick={() => {
                          const match = cartItems.find(
                            (i) => i.id === soldOutError.itemId || (soldOutError.itemName && i.name.toLowerCase().includes(soldOutError.itemName.toLowerCase()))
                          );
                          if (match) {
                            onRemoveItem(match.id);
                          }
                          setSoldOutError(null);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Sold Out Item &amp; Update Cart</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Friendly 90% Monthly Budget Warning on Checkout */}
                {isApproachingBudget && (
                  <div
                    id="checkout-budget-alert"
                    className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-400 rounded-2xl text-amber-950 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 text-white mt-0.5 shadow-2xs">
                        <PiggyBank className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-amber-950 bg-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Friendly Budget Alert
                          </span>
                          <span className="text-xs font-bold text-amber-900">
                            {projectedBudgetPercent}% Limit Reached
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-amber-950 mt-1">
                          You're approaching your monthly canteen budget!
                        </h4>
                        <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                          You have spent <strong>₹{currentSpend.toLocaleString('en-IN')}</strong> of your{' '}
                          <strong>₹{currentBudget.toLocaleString('en-IN')}</strong> monthly budget ({currentBudgetPercent}%). This{' '}
                          <strong>₹{totalBill.toLocaleString('en-IN')}</strong> order will bring your total spend to{' '}
                          <strong className="text-amber-950">₹{projectedTotalSpend.toLocaleString('en-IN')}</strong> ({projectedBudgetPercent}%).
                        </p>
                        <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2.5 py-1.5 rounded-lg border border-amber-200/80 flex items-center gap-1.5">
                          <span className="font-bold">💡 Money-saving tip:</span>
                          <span>Keep an eye on monthly spending to help your student allowance go further!</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 text-[11px]">
                      <span className="text-amber-800">Canteen Wallet &amp; Analytics</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (typeof window !== 'undefined') {
                            window.history.pushState({}, '', '/wallet');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }
                        }}
                        className="font-bold text-amber-900 hover:text-[#6b21a8] underline cursor-pointer"
                      >
                        Adjust Budget &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Summary of Items Added */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Order Summary
                  </div>

                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    {cartItems.map((item) => {
                      const isItemSoldOut = Boolean(
                        soldOutError && (
                          item.id === soldOutError.itemId ||
                          (soldOutError.itemName && item.name.toLowerCase().includes(soldOutError.itemName.toLowerCase()))
                        )
                      );

                      return (
                      <div
                        key={item.id}
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                          isItemSoldOut ? 'bg-rose-50/80 border-l-4 border-rose-500' : ''
                        }`}
                      >
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {item.name}
                            </h4>
                            {isItemSoldOut && (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.2 rounded uppercase">
                                Sold Out
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            &#8377;{item.price} each &bull; <span className="text-[#6b21a8] font-medium">{item.shopName || 'Juice Center'}</span>
                          </div>
                        </div>

                        {/* Quantity Controls [-] [qty] [+] */}
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
                          <button
                            onClick={() => {
                              triggerHaptic(50);
                              onUpdateQuantity(item.id, -1);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-gray-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              triggerHaptic(50);
                              onUpdateQuantity(item.id, 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Subtotal & Remove */}
                        <div className="text-right flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 min-w-[50px]">
                            &#8377;{item.price * item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              triggerHaptic(50);
                              onRemoveItem(item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Dynamic Kitchen Load & Estimated Pickup Time Section */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6b21a8]" />
                      <span>Estimated Pickup Time</span>
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Dynamic ETA Engine</span>
                    </div>
                  </div>

                  {/* Dynamic Kitchen Load Card */}
                  {isEtaLoading && !etaData ? (
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 animate-pulse flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ) : etaData ? (
                    <div
                      className={`rounded-2xl border p-4 transition-all shadow-xs ${
                        isQueueOverloaded
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                          : etaData.loadLevel === 'High'
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : etaData.loadLevel === 'Moderate'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      {/* Top Banner with Load Badge and Live Indicator */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <ChefHat
                            className={`w-4 h-4 ${
                              isQueueOverloaded
                                ? 'text-rose-600'
                                : etaData.loadLevel === 'High'
                                ? 'text-amber-600'
                                : etaData.loadLevel === 'Moderate'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                            {etaData.shop} Kitchen
                          </span>
                        </div>

                        {/* Load Status Pill */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
                            isQueueOverloaded
                              ? 'bg-rose-100 text-rose-700 border-rose-300'
                              : etaData.loadLevel === 'High'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : etaData.loadLevel === 'Moderate'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isQueueOverloaded
                                ? 'bg-rose-600'
                                : etaData.loadLevel === 'High'
                                ? 'bg-amber-600 animate-pulse'
                                : etaData.loadLevel === 'Moderate'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>Load: {etaData.loadLevel}</span>
                        </span>
                      </div>

                      {/* Primary Required Statement:
                          'Current Kitchen Load: High. Your estimated pickup time is 22 minutes.' */}
                      <div className="text-[13.5px] font-bold text-gray-900 leading-snug">
                        Current Kitchen Load:{' '}
                        <span
                          className={`font-black ${
                            isQueueOverloaded
                              ? 'text-rose-600'
                              : etaData.loadLevel === 'High'
                              ? 'text-amber-600'
                              : etaData.loadLevel === 'Moderate'
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {etaData.loadLevel}
                        </span>
                        . Your estimated pickup time is{' '}
                        <span className="font-extrabold text-[#6b21a8] underline decoration-[#6b21a8]/30 underline-offset-2">
                          {etaData.totalEtaMinutes} minutes
                        </span>
                        .
                      </div>

                      {/* Target Clock Time */}
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          Ready for pickup at counter at <strong>{etaData.targetPickupTime}</strong>
                        </span>
                      </div>

                      {/* Queue Meter Capacity Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-gray-500">
                          <span>Current Queue vs Capacity</span>
                          <span>{etaData.totalEtaMinutes} / 60 mins max</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isQueueOverloaded
                                ? 'bg-rose-500'
                                : etaData.totalEtaMinutes >= 45
                                ? 'bg-orange-500'
                                : etaData.totalEtaMinutes >= 20
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(5, Math.round((etaData.totalEtaMinutes / 60) * 100)))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Queue Load Breakdown Details */}
                      <div className="mt-3 pt-2.5 border-t border-gray-200/70 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                        <div className="bg-white/70 p-2 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-medium">Orders in Queue</span>
                          <span className="font-bold text-gray-800 text-xs">
                            {etaData.queueOrdersCount} pending (~{etaData.queuePrepMinutes}m)
                          </span>
                        </div>
                        <div className="bg-white/70 p-2 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-medium">Your Cart Prep</span>
                          <span className="font-bold text-gray-800 text-xs">
                            ~{etaData.cartPrepMinutes} mins
                          </span>
                        </div>
                      </div>

                      {/* Over Capacity Warning Alert if Queue > 60 Minutes */}
                      {isQueueOverloaded && (
                        <div className="mt-3 p-3 bg-red-100/90 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-red-950 block">Checkout Temporarily Disabled</span>
                            <span>
                              This shop's active queue is currently <strong>{etaData.totalEtaMinutes} minutes</strong> (exceeds the 60-minute limit). To maintain food quality, new checkout orders are paused until the kitchen clears pending items.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                      Loading dynamic ETA for your items...
                    </div>
                  )}
                </div>

                {/* 2.5 Promo Code & 100% Loyalty Reward Section */}
                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2.5" id="cart-promo-section">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-[#6b21a8]" />
                      <span>Promo Code &amp; Loyalty Reward</span>
                    </span>
                    {activePromo && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase" id="badge-promo-applied">
                        100% OFF Active
                      </span>
                    )}
                  </div>

                  {activePromo ? (
                    <div className="p-3 bg-white rounded-lg border border-purple-300 space-y-2" id="active-promo-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-black text-sm text-[#6b21a8] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" id="active-promo-code-text">
                            {activePromo.code}
                          </code>
                          <span className="text-xs font-bold text-emerald-700">100% Free {activePromo.item?.name}</span>
                        </div>
                        {onRemovePromo && (
                          <button
                            onClick={onRemovePromo}
                            className="text-xs text-gray-400 hover:text-red-600 font-bold transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {!promoItemInCart ? (
                        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2">
                          <span className="text-xs text-amber-700 font-medium">
                            Item not in cart! Add it now to apply 100% discount.
                          </span>
                          <button
                            id="btn-add-promo-item-to-cart"
                            onClick={() => {
                              if (onAddPromoItemToCart && activePromo.item) {
                                onAddPromoItemToCart(activePromo.item);
                              }
                            }}
                            className="py-1 px-3 bg-[#6b21a8] hover:bg-purple-800 text-white text-xs font-bold rounded-lg cursor-pointer flex-shrink-0"
                          >
                            + Add Free Item
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Discount of &#8377;{discountAmount} applied automatically to total bill!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          id="input-promo-code"
                          type="text"
                          value={manualPromoInput}
                          onChange={(e) => setManualPromoInput(e.target.value.toUpperCase())}
                          placeholder="e.g. BITE-CHAI-1234"
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg font-mono uppercase focus:outline-none focus:border-[#6b21a8]"
                        />
                        <button
                          id="btn-apply-promo-code"
                          onClick={handleApplyManualPromo}
                          className="px-3 py-1.5 bg-[#6b21a8] hover:bg-purple-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      {promoError && <p className="text-[11px] text-red-600 font-semibold">{promoError}</p>}
                      {promoSuccessMsg && <p className="text-[11px] text-emerald-600 font-semibold">{promoSuccessMsg}</p>}
                    </div>
                  )}
                </div>

                {/* 3. Bill Summary Details */}
                <div className="pt-1">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Items Subtotal</span>
                      <span className="font-semibold text-gray-800">&#8377;{Number(totalBill).toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200" id="bill-discount-row">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Loyalty Reward (100% OFF {activePromo?.item?.name})</span>
                        </span>
                        <span>-&#8377;{Number(discountAmount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Campus Packaging</span>
                      <span className="font-semibold text-emerald-600">Free</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Estimated Pickup (Live ETA)</span>
                      <span className="font-semibold text-[#6b21a8]">
                        {etaData ? `In ${etaData.totalEtaMinutes} mins (${etaData.targetPickupTime})` : 'Calculating...'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-extrabold text-gray-900">
                      <span>Total Payable</span>
                      <span className="text-base text-[#6b21a8]">&#8377;{cartTotal}</span>
                    </div>
                  </div>

                  {/* BiteCoins Loyalty Points Preview */}
                  <div className="mt-2.5 p-2.5 bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs" id="cart-loyalty-preview">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🪙</span>
                      <div>
                        <span className="font-bold text-gray-900 block">
                          Earn +{estimatedPoints} BiteCoins on this order!
                        </span>
                        <span className="text-[11px] text-orange-600 font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                          <span>{loyaltyInfo.streakMessage}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-full">
                      {loyaltyInfo.multiplier}x Pts
                    </span>
                  </div>
                </div>

                {/* 4. Instant UPI QR Code Payment Section */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#6b21a8]" />
                      <span>Scan &amp; Pay with UPI</span>
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Instant &#8377;{cartTotal}
                    </span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-xs">
                    {/* QR Code Container required by qrcode.js: id='qrcode-container' */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg inline-flex items-center justify-center">
                      <div
                        id="qrcode-container"
                        className="flex items-center justify-center min-h-[200px] min-w-[200px] [&_img]:mx-auto [&_canvas]:mx-auto"
                      />
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="text-xs text-gray-700 font-medium">
                        Payee: <strong>{MERCHANT_NAME}</strong>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        UPI ID: <span className="text-gray-900 font-semibold">{MERCHANT_UPI_ID}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 pt-1">
                        Scan with GPay, PhonePe, Paytm, BHIM, or any UPI app.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. 12-digit UTR Input Field */}
                <div className="space-y-1.5">
                  <label htmlFor="utr-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    UPI UTR / Transaction ID (12 Digits) <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <input
                      id="utr-input"
                      type="text"
                      maxLength={12}
                      value={utr}
                      onChange={(e) => {
                        // Allow digits only
                        const val = e.target.value.replace(/\D/g, '');
                        setUtr(val);
                        if (utrError && val.length === 12) {
                          setUtrError('');
                        }
                      }}
                      placeholder="e.g. 123456789012"
                      className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg font-mono tracking-wider focus:outline-none transition-colors ${
                        utrError
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-300 focus:border-[#6b21a8] focus:ring-2 focus:ring-purple-200'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                      {utr.length}/12
                    </span>
                  </div>

                  {utrError && (
                    <p className="text-xs text-red-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{utrError}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-gray-500">
                    Enter the 12-digit UTR / reference number from your UPI payment receipt to verify your order.
                  </p>
                </div>

                {/* Campus Guarantee Notice */}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Instant counter pickup token issued upon confirmation.</span>
                </div>
              </>
            )}

          </div>

          {/* Panel Footer: 'Submit Order' Button */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-white space-y-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500 font-medium">Payable Amount</span>
                <span className="text-xl font-extrabold text-gray-900">&#8377;{cartTotal}</span>
              </div>

              {/* 'Submit Order' Button with 12-digit UTR validation & 60-Minute Queue Limiter */}
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isProcessing || isQueueOverloaded}
                className={`w-full py-4 text-base font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                  isQueueOverloaded
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300 shadow-none'
                    : isProcessing
                    ? 'bg-[#6b21a8]/70 text-white cursor-wait'
                    : 'bg-[#6b21a8] hover:bg-[#581c87] active:scale-[0.99] text-white hover:shadow cursor-pointer'
                }`}
              >
                {isQueueOverloaded ? (
                  <span className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>Kitchen Over Capacity (&gt; 60 mins) &bull; Checkout Paused</span>
                  </span>
                ) : isProcessing ? (
                  <span>Verifying UTR &amp; Placing Order...</span>
                ) : (
                  <>
                    <span>Submit Order &bull; &#8377;{cartTotal}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400">
                Verified automatically against UTR &bull; Zero Counter Wait
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
