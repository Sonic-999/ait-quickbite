import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Headset,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Send,
  CreditCard,
  Utensils,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

/**
 * Route: /support (Customer Support / Help page)
 * Blinkit-style modern support center:
 * 1. Quick Issue Selectors (UPI payment, delays, wrong item)
 * 2. Interactive Support Ticket Form
 * 3. Direct Counter Helpline Contacts
 * 4. FAQ Accordion for instant self-service
 */
export default function SupportPage({ showNotification }) {
  const [ticketCategory, setTicketCategory] = useState('payment');
  const [orderToken, setOrderToken] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);

  const faqs = [
    {
      q: 'How does UPI QR code payment and UTR verification work?',
      a: 'Scan the generated QR code using any UPI app (Google Pay, PhonePe, Paytm, BHIM). Once paid, copy the 12-digit UTR / Reference ID from your payment receipt and enter it on the checkout page to confirm your order.',
    },
    {
      q: 'What if my payment was deducted from my bank but the order failed?',
      a: 'Do not panic! All campus transactions are recorded in the central ledger. Bring your 12-digit UTR to the Juice Center or Canteen counter. Counter staff can look up the transaction on the Vendor Dashboard and hand over your order immediately.',
    },
    {
      q: 'How fast can I pickup my food after pre-ordering?',
      a: 'Our smart kitchen scheduler tracks live prep times and kitchen load. Typical wait time is 5 to 10 minutes. When your order status changes to "Ready", you receive a chime and pickup notification.',
    },
    {
      q: 'How do I redeem my earned BiteCoins rewards?',
      a: 'For every order placed, you earn BiteCoins. You can redeem these on the Rewards widget or Profile page to unlock instant 100% OFF coupons for samosas, fresh fruit juices, and cutting chai.',
    },
    {
      q: 'What are the campus canteen operating hours?',
      a: 'Juice Center: Monday to Saturday (8:00 AM - 10:30 PM), Sunday (9:00 AM - 9:00 PM). Main Canteen & Nescafe: Monday to Sunday (8:30 AM - 10:00 PM).',
    },
  ];

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    setIsSubmitting(true);
    triggerHaptic(15);

    setTimeout(() => {
      const ticketId = `AIT-TICK-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedTicket({
        id: ticketId,
        category: ticketCategory,
        orderToken: orderToken || 'N/A',
        time: 'Just now',
      });
      setIsSubmitting(false);
      setTicketMessage('');
      setOrderToken('');
      if (showNotification) {
        showNotification(`Support ticket #${ticketId} created! Counter staff notified.`);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-32 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Support Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 text-[#6b21a8] mb-3 shadow-xs">
            <Headset className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Campus Help &amp; Support
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Need help with a payment, missing item, or counter queue? We're here for you.
          </p>
        </div>

        {/* Quick Contact Helplines */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Juice Center Counter</div>
              <div className="text-sm font-extrabold text-gray-900 truncate">+91 98765 43210</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6b21a8] flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Main Canteen Desk</div>
              <div className="text-sm font-extrabold text-gray-900 truncate">+91 98765 43211</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Campus Desk Email</div>
              <div className="text-sm font-extrabold text-gray-900 truncate">help@aitcanteen.edu</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Submit a Request */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#6b21a8]" />
                <span>Submit a Support Request</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Our counter manager reviews and resolves student inquiries within 10 minutes.
              </p>

              {submittedTicket && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5 animate-in zoom-in-95 duration-150">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold">Ticket #{submittedTicket.id} Created!</span>
                    <p className="mt-0.5 text-emerald-700">
                      Show this ticket ID at the counter for prioritized assistance.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    What can we help you with?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'payment', label: 'Payment / UTR Issue', icon: CreditCard },
                      { id: 'order', label: 'Order Delay / Token', icon: Clock },
                      { id: 'food', label: 'Wrong / Missing Item', icon: Utensils },
                      { id: 'rewards', label: 'BiteCoins Balance', icon: Sparkles },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setTicketCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            ticketCategory === cat.id
                              ? 'bg-purple-50 border-[#6b21a8] text-[#6b21a8] shadow-xs'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Order Token */}
                <div>
                  <label htmlFor="support-token-input" className="block text-xs font-bold text-gray-700 mb-1">
                    Order Token / ID (Optional)
                  </label>
                  <input
                    id="support-token-input"
                    type="text"
                    placeholder="e.g. Token #42 or ord-12345"
                    value={orderToken}
                    onChange={(e) => setOrderToken(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#6b21a8] focus:border-transparent outline-none"
                  />
                </div>

                {/* Issue Description */}
                <div>
                  <label htmlFor="support-message-input" className="block text-xs font-bold text-gray-700 mb-1">
                    Description of Issue <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="support-message-input"
                    rows={4}
                    required
                    placeholder="Provide details (e.g. 'UPI payment deducted for &#8377;95 but token was pending at Juice Center')"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#6b21a8] focus:border-transparent outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  id="support-submit-btn"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white bg-[#6b21a8] hover:bg-[#581c87] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting Ticket...</span>
                  ) : (
                    <>
                      <span>Submit Support Ticket</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: FAQs & Counter Info */}
          <div className="lg:col-span-6 space-y-6">
            {/* FAQ Accordion */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#6b21a8]" />
                <span>Frequently Asked Questions</span>
              </h2>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isExpanded = expandedFaqIndex === idx;
                  return (
                    <div
                      key={faq.q}
                      className="border border-gray-200/80 rounded-xl overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqIndex(isExpanded ? -1 : idx)}
                        className="w-full p-3.5 text-left text-xs font-bold text-gray-900 bg-gray-50/60 hover:bg-gray-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <span>{faq.q}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#6b21a8] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="p-3.5 bg-white text-xs text-gray-600 leading-relaxed border-t border-gray-100 animate-in fade-in duration-150">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Counter Timings & Location Card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#6b21a8]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                  Campus Counters Location
                </h3>
              </div>
              <p className="text-xs text-gray-600">
                Army Institute of Technology (AIT), Alandi Road, Dighi, Pune &bull; 411015
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl font-medium border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                <span>All 4 Outlets Open for Ordering &amp; Pickup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
