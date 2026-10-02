import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Users,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Smartphone,
  X,
  CreditCard,
  Receipt,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { fireCelebratoryConfetti } from '../utils/confetti';
import { triggerHaptic } from '../utils/haptics';

// Verified destination UPI ID for AIT QuickBite payments
const MERCHANT_UPI_ID = 'kashishsangwan1105@okicici';
const MERCHANT_NAME = 'AIT QuickBite';

/**
 * Individual QR Code Component for a Participant's Auto-Split Share
 */
function ParticipantQrBox({ upiString, name, amount }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined' && window.QRCode) {
      containerRef.current.innerHTML = '';
      try {
        new window.QRCode(containerRef.current, {
          text: upiString,
          width: 120,
          height: 120,
          colorDark: '#6b21a8',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        console.error('QR code render error:', e);
      }
    }
  }, [upiString]);

  return (
    <div
      ref={containerRef}
      className="w-[120px] h-[120px] bg-white rounded-xl shadow-xs border border-purple-200 flex items-center justify-center p-1.5 flex-shrink-0"
    >
      <QrCode className="w-16 h-16 text-[#6b21a8]" />
    </div>
  );
}

/**
 * Group Order Split Bill & Checkout Modal Component
 * 
 * Calculates each person's exact total based on items added, auto-generates
 * individual UPI QR codes for each person to scan and pay directly to the vendor,
 * synchronizes payment states over WebSockets in real time, and finalizes the order.
 */
export default function GroupSplitCheckout({
  isOpen = true,
  onClose,
  session,
  currentUser,
  onPayShare,
  onDispatchOrder,
  onBackToMenu,
  onBackToCart,
}) {
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState(null);
  // Calculation mode: 'exact' (what you added) or 'equal' (total / friends)
  const [splitMode, setSplitMode] = useState('exact');

  if (!session || isOpen === false) return null;

  const participants = session.participants || [];
  const cartItems = session.cartItems || [];
  const totalAmount = cartItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const numParticipants = Math.max(1, participants.length);
  const equalSplitAmount = Math.ceil(totalAmount / numParticipants);

  // Calculate exact itemized breakdown per participant
  const breakdown = participants.map((p) => {
    // Find items added by this participant
    const myItems = cartItems.filter((it) => {
      if (it.addedBy?.id && it.addedBy.id === p.id) return true;
      if (it.addedBy?.name && p.name && it.addedBy.name.toLowerCase() === p.name.toLowerCase()) return true;
      return false;
    });

    const exactTotal = myItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    return {
      ...p,
      myItems,
      exactTotal,
    };
  });

  // Check for items with no owner or assigned before join
  const assignedIds = new Set(breakdown.flatMap((b) => b.myItems.map((it) => it.id)));
  const unassignedItems = cartItems.filter((it) => !assignedIds.has(it.id));
  if (unassignedItems.length > 0 && breakdown.length > 0) {
    // Attribute unassigned items to host or first participant
    const hostIdx = breakdown.findIndex((b) => b.isHost);
    const targetIdx = hostIdx >= 0 ? hostIdx : 0;
    breakdown[targetIdx].myItems = [...breakdown[targetIdx].myItems, ...unassignedItems];
    breakdown[targetIdx].exactTotal += unassignedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
  }

  const participantShares = breakdown;

  const paidCount = participants.filter((p) => p.hasPaid).length;
  const allPaid = paidCount === numParticipants;
  const isHost = currentUser && participants.find((p) => p.id === currentUser.id)?.isHost;

  const handleSimulatePayment = (participant) => {
    triggerHaptic(50);
    const dummyUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    if (onPayShare) {
      onPayShare(participant.id, dummyUtr);
    }
  };

  const handleDispatch = async () => {
    try {
      setIsDispatching(true);
      setDispatchError(null);
      triggerHaptic(50);

      const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      await onDispatchOrder({
        utr: randomUtr,
        pickupTime: 'In 10 Minutes',
      });
      fireCelebratoryConfetti();
    } catch (err) {
      console.error('[Group Checkout Dispatch Error]', err);
      setDispatchError(err.message || 'Failed to dispatch order to kitchen.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else if (onBackToCart) onBackToCart();
    else if (onBackToMenu) onBackToMenu();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div id="group-split-checkout-modal" className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Sticky Modal Header */}
        <div className="bg-gradient-to-r from-[#6b21a8] via-purple-800 to-indigo-800 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Split Bill &amp; Individual UPI Payment</h2>
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded text-purple-100 font-bold uppercase">
                  #{session.id}
                </span>
              </div>
              <p className="text-xs text-purple-200">
                {participants.length} {participants.length === 1 ? 'student' : 'students'} sharing this order &bull; Pay vendor directly
              </p>
            </div>
          </div>

          <button
            id="btn-close-split-checkout"
            onClick={handleClose}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Banner: Bill Summary & Mode Toggle */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-purple-100/50 to-emerald-50 border border-purple-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-purple-800">
                  Auto-Split Bill
                </span>
                <span className="text-xs font-bold text-gray-500">
                  Total: <strong className="text-gray-900">₹{totalAmount.toFixed(2)}</strong> across {numParticipants} Friends
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                {splitMode === 'exact' ? (
                  <span>Exact Itemized Calculation</span>
                ) : (
                  <span>₹{equalSplitAmount} <span className="text-sm font-semibold text-gray-600">/ friend</span></span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Destination Merchant: <strong className="text-[#6b21a8] font-mono">{MERCHANT_UPI_ID}</strong>
              </p>
            </div>

            {/* Split Mode Selector Toggle */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="bg-white p-1 rounded-xl border border-purple-200 flex items-center shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setSplitMode('exact');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    splitMode === 'exact'
                      ? 'bg-[#6b21a8] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Exact Items</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setSplitMode('equal');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    splitMode === 'equal'
                      ? 'bg-[#6b21a8] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Split Equally</span>
                </button>
              </div>

              {/* Live Payment Progress Pill */}
              <div className="bg-white px-4 py-2 rounded-xl shadow-xs border border-purple-200 text-center min-w-[120px]">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                  Payment Status
                </span>
                <div className="text-sm font-black text-gray-900 flex items-center justify-center gap-1 mt-0.5">
                  <span className={allPaid ? 'text-emerald-600' : 'text-[#6b21a8]'}>
                    {paidCount} / {numParticipants} Paid
                  </span>
                  {allPaid && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Shared Cart Items Overview */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Items in Shared Cart ({cartItems.length})</span>
              <span className="text-xs text-purple-700 font-bold normal-case">
                Attributed by student
              </span>
            </h3>

            <div className="divide-y divide-gray-100 bg-gray-50/70 rounded-2xl border border-gray-200/90 overflow-hidden">
              {cartItems.map((item) => (
                <div key={item.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-black text-gray-900 bg-purple-100/80 text-purple-900 px-2 py-0.5 rounded-md">
                      {item.quantity}x
                    </span>
                    <span className="font-bold text-gray-900 truncate">
                      {item.name}
                    </span>
                    {item.addedBy && (
                      <span className="text-[11px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 font-bold flex items-center gap-1 flex-shrink-0">
                        <span>{item.addedBy.avatar || '👤'}</span>
                        <span>Added by {item.addedBy.name}</span>
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-gray-900 flex-shrink-0">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual UPI QR Codes Per Participant */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Individual UPI QR Codes ({numParticipants})</span>
              <span className="text-[11px] text-purple-700 font-bold normal-case">
                Each student scans and pays their share directly
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participantShares.map((p) => {
                const calculatedShare = splitMode === 'exact'
                  ? (p.exactTotal > 0 ? p.exactTotal : equalSplitAmount)
                  : equalSplitAmount;
                const formattedShare = calculatedShare.toFixed(2);

                const upiString = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(
                  MERCHANT_NAME
                )}&am=${formattedShare}&cu=INR&tn=GroupOrder-${session.id}-${encodeURIComponent(p.name)}`;

                const isYou = currentUser && p.id === currentUser.id;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-4.5 border transition-all relative flex flex-col justify-between ${
                      p.hasPaid
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                        : isYou
                        ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-300/30 shadow-xs'
                        : 'bg-white border-gray-200 shadow-2xs'
                    }`}
                  >
                    {/* Participant Header Info */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{p.avatar || '👨‍🎓'}</span>
                        <div>
                          <div className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isYou && (
                              <span className="text-[10px] bg-purple-100 text-[#6b21a8] px-1.5 py-0.2 rounded font-black">
                                YOU
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {splitMode === 'exact' ? (
                              <span>Ordered {p.myItems.length} {p.myItems.length === 1 ? 'item' : 'items'}</span>
                            ) : (
                              <span>Share to pay: <strong className="text-gray-900 font-bold">₹{formattedShare}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {p.hasPaid ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Participant Itemized List (if exact mode) */}
                    {splitMode === 'exact' && p.myItems && p.myItems.length > 0 && (
                      <div className="mb-3 p-2 bg-white/80 rounded-xl border border-gray-100 text-[11px] space-y-1">
                        {p.myItems.map((it) => (
                          <div key={it.id} className="flex justify-between text-gray-600">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="font-semibold text-gray-900">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* QR Code and Payment Actions Container */}
                    <div className="flex items-center gap-3.5 bg-white p-3 rounded-2xl border border-gray-100">
                      <ParticipantQrBox
                        upiString={upiString}
                        name={p.name}
                        amount={formattedShare}
                      />

                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            Direct UPI Share
                          </div>
                          <div className="text-lg font-black text-[#6b21a8] truncate">
                            ₹{formattedShare}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono truncate">
                            pa: {MERCHANT_UPI_ID}
                          </div>
                          {p.hasPaid && (
                            <div className="text-[11px] text-emerald-700 font-mono font-bold mt-1">
                              UTR: {p.utr || 'Verified'}
                            </div>
                          )}
                        </div>

                        {/* Pay Link / Simulate Pay Button */}
                        {!p.hasPaid && (
                          <div className="mt-2 space-y-1.5">
                            <a
                              href={upiString}
                              className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-[#6b21a8] text-[11px] font-bold rounded-lg border border-purple-200 transition-colors flex items-center justify-center gap-1 text-center"
                            >
                              <span>Open in UPI App</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                            <button
                              id={`btn-pay-${p.id}`}
                              data-testid="btn-pay-share"
                              type="button"
                              onClick={() => handleSimulatePayment(p)}
                              className="w-full py-1.5 bg-[#6b21a8] hover:bg-[#581c87] active:scale-95 text-white text-[11px] font-extrabold rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>Mark Paid (₹{formattedShare})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch Error Notification */}
          {dispatchError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{dispatchError}</span>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-center sm:text-left">
            <div className="text-xs text-gray-500 font-medium">
              Order Total: <strong className="text-gray-900 font-bold">₹{totalAmount.toFixed(2)}</strong>
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ACID inventory check &bull; Orders dispatched atomically</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Back
            </button>

            <button
              id="btn-dispatch-group-order"
              type="button"
              disabled={isDispatching || (!allPaid && !isHost)}
              onClick={handleDispatch}
              className={`flex-1 sm:flex-initial py-3 px-6 text-xs sm:text-sm font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                allPaid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : isHost
                  ? 'bg-[#6b21a8] hover:bg-[#581c87] text-white active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching to Kitchen...</span>
                </>
              ) : allPaid ? (
                <>
                  <Sparkles className="w-4 h-4 fill-white text-white" />
                  <span>All Paid! Dispatch Order &rarr;</span>
                </>
              ) : isHost ? (
                <>
                  <span>Host Override: Dispatch Now &rarr;</span>
                </>
              ) : (
                <>
                  <span>Waiting for Friends ({paidCount}/{numParticipants} Paid)...</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
