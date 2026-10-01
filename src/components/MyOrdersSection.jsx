import React from 'react';
import { Clock, CheckCircle2, ShoppingBag, MapPin, AlertCircle } from 'lucide-react';

export default function MyOrdersSection({ orders = [], onBrowseShops, onTrackOrder }) {
  return (
    <section id="orders-section" className="bg-[#ffffff] py-12 sm:py-16 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="pb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b21a8] uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b21a8]"></span>
              Live Order Tracker
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              My Campus Orders
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full self-start sm:self-auto">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Active
          </span>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="mt-8 text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No active orders yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-6">
              Skip the campus dining queue by pre-ordering from any AIT canteen or cafe now.
            </p>
            <button
              onClick={onBrowseShops}
              className="px-6 py-2.5 bg-[#6b21a8] hover:bg-[#581c87] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Browse Campus Shops
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-[#ffffff] border border-gray-200 rounded-xl p-6 shadow-sm hover:border-gray-300 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <span className="text-xs font-mono font-semibold text-[#6b21a8] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      TOKEN #{order.token}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{order.shopName}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {order.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Estimated Pickup Highlight */}
                <div className="my-5 p-4 rounded-lg bg-purple-50/50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6b21a8] text-white flex items-center justify-center font-bold flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Estimated Pickup Time</div>
                      <div className="text-base font-bold text-gray-900">{order.estimatedTime}</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-900 font-medium bg-white px-3 py-1.5 rounded-md border border-purple-200 self-start sm:self-auto">
                    Show Token #{order.token} at counter
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Ordered Items
                  </div>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-none">
                      <span className="text-gray-800 font-medium">{item.name}</span>
                      <span className="text-gray-900 font-bold">&#8377;{item.price}</span>
                    </div>
                  ))}
                  <div className="pt-3 flex justify-between items-center text-sm font-bold text-gray-900 border-t border-gray-100">
                    <span>Total Amount Paid</span>
                    <span className="text-base text-[#6b21a8]">&#8377;{order.total}</span>
                  </div>
                </div>

                {/* Bottom Notice & Live Status Action */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>Please reach the counter 1-2 minutes before scheduled pickup time.</span>
                  </div>
                  {onTrackOrder && (
                    <button
                      onClick={() => onTrackOrder(order)}
                      className="self-start sm:self-auto text-xs font-bold text-[#6b21a8] hover:text-[#581c87] bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-md border border-purple-200 transition-colors cursor-pointer"
                    >
                      Track Live Status &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
