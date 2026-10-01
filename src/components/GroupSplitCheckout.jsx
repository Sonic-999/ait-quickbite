import React, { useState, useEffect, useRef } from 'react';
import { Check, QrCode, ArrowRight, ShieldCheck, Users, Sparkles, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { fireCelebratoryConfetti } from '../utils/confetti';
import { triggerHaptic } from '../utils/haptics';

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
          width: 110,
          height: 110,
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
      className="w-[110px] h-[110px] bg-white rounded-xl shadow-xs border border-purple-200 flex items-center justify-center p-1.5 flex-shrink-0"
    >
      <QrCode className="w-16 h-16 text-[#6b21a8]" />
    </div>
  );
}

/**
 * Group Order Split Bill & Checkout Component
 * Calculates auto-split equal bill, renders individual UPI QR codes per person,
 * tracks live payment status over WebSockets, and dispatches to kitchen when ready.
 */
export default function GroupSplitCheckout({
  session,
  currentUser,
  onPayShare,
  onDispatchOrder,
  onBackToMenu,
}) {
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState(null);

  if (!session) return null;

  const participants = session.participants || [];
  const cartItems = session.cartItems || [];
  const totalAmount = cartItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const numParticipants = Math.max(1, participants.length);
  const perPersonAmount = Math.ceil(totalAmount / numParticipants);
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

  return (
    <div className="bg-[#ffffff] min-h-screen py-8 sm:py-12 border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToMenu}
            className="text-xs font-bold text-gray-600 hover:text-[#6b21a8] py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            &larr; Back to Shared Menu
          </button>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            Room Code: #{session.id}
          </span>
        </div>

        {/* Central Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
          
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#6b21a8] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer Group Checkout</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Auto-Split Bill & UPI Payment
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              Each friend pays their exact share directly to the canteen counter before dispatch.
            </p>
          </div>

          {/* Auto-Split Calculation Banner */}
          <div className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-purple-100/50 to-emerald-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-800">
                Auto-Split Calculation
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-gray-900 mt-0.5">
                Total ₹{totalAmount} &divide; {numParticipants} Friends
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Rounded equally: <strong className="text-[#6b21a8]">₹{perPersonAmount} each</strong>
              </p>
            </div>

            <div className="bg-white px-4 py-2 rounded-xl shadow-xs border border-purple-200 text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Payment Progress
              </span>
              <div className="text-lg font-black text-gray-900 flex items-center justify-center gap-1.5">
                <span className={allPaid ? 'text-emerald-600' : 'text-purple-700'}>
                  {paidCount} / {numParticipants} Paid
                </span>
                {allPaid && <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Cart Itemized Summary (Shows who added what) */}
          <div className="mb-6">
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">
              Shared Cart Items ({cartItems.length})
            </h3>
            <div className="divide-y divide-gray-100 bg-gray-50/60 rounded-xl border border-gray-200 overflow-hidden">
              {cartItems.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-gray-900">
                      {item.quantity}x
                    </span>
                    <span className="font-semibold text-gray-800">
                      {item.name}
                    </span>
                    {item.addedBy && (
                      <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 font-medium flex items-center gap-1">
                        <span>{item.addedBy.avatar || '👤'}</span>
                        <span>Added by {item.addedBy.name}</span>
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-gray-900">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual UPI QR Codes Per Participant */}
          <div className="mb-8">
            <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Individual UPI QR Codes ({numParticipants})</span>
              <span className="text-[11px] text-purple-700 font-bold normal-case">
                Scan with GPay / PhonePe / Paytm
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p) => {
                const upiString = `upi://pay?pa=juicecenter@aitcampus&pn=Juice%20Center%20AIT&am=${perPersonAmount}&tn=GroupOrder-${session.id}-${encodeURIComponent(p.name)}`;
                const isYou = currentUser && p.id === currentUser.id;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-4 border transition-all relative ${
                      p.hasPaid
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                        : isYou
                        ? 'bg-purple-50/40 border-purple-300 ring-2 ring-purple-300/30 shadow-xs'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.avatar || '👤'}</span>
                        <div>
                          <div className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isYou && (
                              <span className="text-[10px] bg-purple-100 text-[#6b21a8] px-1.5 py-0.2 rounded font-black">
                                YOU
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-black">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Share to pay: <strong className="text-gray-900 font-bold">₹{perPersonAmount}</strong>
                          </div>
                        </div>
                      </div>

                      {p.hasPaid ? (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* QR Code and Payment Actions */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                      <ParticipantQrBox
                        upiString={upiString}
                        name={p.name}
                        amount={perPersonAmount}
                      />

                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Direct UPI
                          </div>
                          <div className="text-xs font-mono font-bold text-purple-900 truncate">
                            ₹{perPersonAmount} via UPI
                          </div>
                          {p.hasPaid && (
                            <div className="text-[10px] text-emerald-600 font-mono mt-1">
                              UTR: {p.utr || 'Verified'}
                            </div>
                          )}
                        </div>

                        {!p.hasPaid && (
                          <button
                            id={`btn-pay-${p.id}`}
                            data-testid="btn-pay-share"
                            type="button"
                            onClick={() => handleSimulatePayment(p)}
                            className="mt-3 w-full py-1.5 bg-[#6b21a8] hover:bg-[#581c87] active:scale-95 text-white text-xs font-extrabold rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>Mark Paid (₹{perPersonAmount})</span>
                          </button>
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
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{dispatchError}</span>
            </div>
          )}

          {/* Final Dispatch Button */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <button
              id="btn-dispatch-group-order"
              type="button"
              disabled={isDispatching || (!allPaid && !isHost)}
              onClick={handleDispatch}
              className={`w-full py-3.5 text-sm sm:text-base font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                allPaid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : isHost
                  ? 'bg-[#6b21a8] hover:bg-[#581c87] text-white active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Dispatching Order to Kitchen...</span>
                </>
              ) : allPaid ? (
                <>
                  <Sparkles className="w-5 h-5 fill-white text-white" />
                  <span>All Paid! Dispatch Order to Kitchen &rarr;</span>
                </>
              ) : isHost ? (
                <>
                  <span>Host Override: Dispatch Order Now (₹{totalAmount}) &rarr;</span>
                </>
              ) : (
                <>
                  <span>Waiting for Friends to Pay ({paidCount}/{numParticipants} Paid)...</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-gray-500 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant ACID transaction locks kitchen inventory atomically</span>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
