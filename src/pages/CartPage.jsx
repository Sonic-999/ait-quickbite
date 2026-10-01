import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Info
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

// Verified Destination Merchant UPI Configuration
const MERCHANT_UPI_ID = 'kashishsangwan1105@okicici';
const MERCHANT_NAME = 'AIT QuickBite';

/**
 * Route: /cart (Checkout and Payment page)
 * Blinkit-style focused checkout and payment flow.
 * Displays cart items, promo codes, dynamic ETA, instant UPI QR generation,
 * 12-digit UTR verification, and order placement.
 */
export default function CartPage({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onConfirmOrder,
  activePromo = null,
  onApplyPromo,
  onRemovePromo,
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

  // Dynamic ETA state
  const [etaData, setEtaData] = useState(null);
  const [isEtaLoading, setIsEtaLoading] = useState(false);

  // Calculate bill amounts
  const subtotal = cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  
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
    if (cartItems.length === 0) return;
    const targetShop = cartItems[0]?.shopName || 'Juice Center';

    try {
      setIsEtaLoading(true);
      const res = await fetch('/api/checkout/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: targetShop,
          items: cartItems.map((it) => ({
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
  }, [cartItems]);

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchDynamicETA();
    }
  }, [cartItems.length, fetchDynamicETA]);

  // Render QR Code using new QRCode(container, ...)
  useEffect(() => {
    if (cartItems.length === 0) return;

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
  }, [cartItems.length, upiString]);

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
      const utrEl = document.getElementById('cart-utr-input');
      if (utrEl) utrEl.focus();
      return;
    }
    setUtrError('');

    try {
      setIsProcessing(true);
      triggerHaptic(20);

      const result = await onConfirmOrder({
        items: cartItems,
        total: finalPayable,
        pickupTime,
        utr: cleanUtr,
        upiString,
        promoCode: activePromo?.code,
      });

      if (!result || !result.success) {
        setOrderError(result?.error || 'Order placement failed. Please verify item stock.');
      }
    } catch (err) {
      setOrderError(err.message || 'Payment verification encountered a network error.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty Cart State
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 pb-28 text-center bg-gray-50/50">
        <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-[#6b21a8] mb-4 shadow-sm ring-8 ring-purple-50">
          <ShoppingBag className="w-12 h-12 stroke-[1.8]" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
          Your Cart is Empty
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
          Looks like you haven't added anything to your campus order yet. Explore fresh juices, snacks, and meal combos!
        </p>
        <Link
          to="/"
          id="cart-empty-browse-menu-btn"
          className="inline-flex items-center gap-2 bg-[#6b21a8] hover:bg-[#581c87] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <span>Explore Campus Menu</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-32 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-bold text-[#6b21a8] bg-purple-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fast Counter Pickup</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-6">
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
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#6b21a8]" />
                  <span>Items in Cart ({cartItems.length})</span>
                </h2>
                <span className="text-xs text-gray-500 font-medium">
                  {cartItems[0]?.shopName || 'Juice Center'}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 font-bold text-xs text-[#6b21a8]">
                        🍔
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs font-semibold text-gray-500">
                          &#8377;{item.price} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Quantity Selector */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <span className="text-sm font-extrabold text-gray-900 w-14 text-right">
                        &#8377;{item.price * item.quantity}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6b21a8]" />
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
                        ? 'bg-[#6b21a8] text-white border-[#6b21a8] shadow-xs scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
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
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#6b21a8]" />
                <span>Apply Promo Code</span>
              </h2>

              {activePromo ? (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#6b21a8]" />
                    <span className="text-xs font-bold text-purple-900">
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
                      className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-[#6b21a8] focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualPromo}
                      className="bg-gray-900 hover:bg-[#6b21a8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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

          {/* RIGHT COLUMN: UPI QR Payment + 12-Digit UTR + Bill Details */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. UPI QR Code Payment Box */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs text-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#6b21a8]" />
                  <span>Scan &amp; Pay with UPI</span>
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Instant &#8377;{cartTotalFormatted}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl inline-flex items-center justify-center shadow-inner">
                <div
                  id="cart-page-qrcode-container"
                  className="min-h-[180px] min-w-[180px] flex items-center justify-center [&_img]:mx-auto [&_canvas]:mx-auto"
                />
              </div>

              <div className="mt-3.5 space-y-1">
                <div className="text-xs text-gray-700 font-medium">
                  Payee: <strong>{MERCHANT_NAME}</strong>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  UPI ID: <span className="text-gray-900 font-semibold">{MERCHANT_UPI_ID}</span>
                </div>

                {/* Direct UPI App Deep Link for Mobile Users */}
                <div className="pt-2">
                  <a
                    href={upiString}
                    id="cart-pay-upi-btn"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-purple-50 hover:bg-purple-100 text-[#6b21a8] border border-purple-200 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    <span>Open in GPay / PhonePe / Paytm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 2. 12-Digit UTR Form */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <label htmlFor="cart-utr-input" className="block text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-1.5">
                UPI UTR / Transaction ID (12 Digits) <span className="text-red-500">*</span>
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
                      : 'border-gray-300 focus:ring-2 focus:ring-[#6b21a8] focus:border-transparent'
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
                <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Found in GPay &bull; PhonePe &bull; Paytm payment details</span>
                </p>
              )}
            </div>

            {/* 3. Bill Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Bill Summary
              </h2>

              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-gray-900">&#8377;{subtotal.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo Discount</span>
                    <span>-&#8377;{promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500">
                  <span>Canteen Packaging &amp; Counter Fee</span>
                  <span className="font-bold text-emerald-700">FREE</span>
                </div>

                <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-black text-gray-900">
                  <span>To Pay</span>
                  <span className="text-base text-[#6b21a8]">&#8377;{cartTotalFormatted}</span>
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

              {/* Submit Order Button */}
              <button
                type="button"
                id="cart-confirm-order-button"
                onClick={handleCheckoutSubmit}
                disabled={isProcessing}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
