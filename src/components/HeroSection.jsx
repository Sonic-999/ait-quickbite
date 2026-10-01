import React from 'react';
import { ArrowRight, Clock, Coffee, ShieldCheck, CheckCircle2, UtensilsCrossed } from 'lucide-react';

export default function HeroSection({ onBrowseShops }) {
  return (
    <section className="bg-[#ffffff] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Subheading, and Prominent CTA */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Campus Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-[#6b21a8] text-xs sm:text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#6b21a8]"></span>
              <span>Official Campus Food Ordering &bull; Army Institute of Technology</span>
            </div>

            {/* Large Friendly Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              Skip the Queue at <br className="hidden sm:inline" />
              <span className="text-[#6b21a8]">AIT Campus</span>
            </h1>

            {/* Simple Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed font-normal">
              Pre-order your food and drinks online. We will tell you exactly when to pick it up.
            </p>

            {/* Prominent Clickable Button */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onBrowseShops}
                className="px-8 py-4 bg-[#6b21a8] hover:bg-[#581c87] text-white font-semibold text-lg rounded-lg shadow-sm hover:shadow transition-all duration-150 inline-flex items-center justify-center gap-2 cursor-pointer focus:ring-4 focus:ring-purple-200"
              >
                <span>Browse Shops</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sm text-gray-600 px-2 py-1">
                <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Average campus wait time: <strong>under 5 mins</strong></span>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#6b21a8] flex-shrink-0" />
                <span>No rush-hour lines</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#6b21a8] flex-shrink-0" />
                <span>Freshly prepared food</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[#6b21a8] flex-shrink-0" />
                <span>Real-time pickup alerts</span>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Light-Themed Campus Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#ffffff] border border-gray-200 rounded-xl p-6 sm:p-7 shadow-sm">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-[#6b21a8] flex items-center justify-center font-bold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Nescafe Kiosk</h3>
                    <p className="text-xs text-gray-500">Student Center &bull; Order #AIT-108</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Preparing
                </span>
              </div>

              {/* Order Status Timeline */}
              <div className="py-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Estimated Pickup Time</span>
                  <span className="font-bold text-gray-900 text-base">In 7 Minutes (12:45 PM)</span>
                </div>

                {/* Clean Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#6b21a8] h-2.5 rounded-full w-2/3"></div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-100 space-y-1">
                  <div className="flex justify-between font-medium text-gray-800">
                    <span>1x Cold Coffee (Regular)</span>
                    <span>&#8377;45</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-800">
                    <span>1x Grilled Veg Cheese Sandwich</span>
                    <span>&#8377;65</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold text-gray-900 text-sm">
                    <span>Total Paid</span>
                    <span>&#8377;110</span>
                  </div>
                </div>
              </div>

              {/* Pickup Instructions */}
              <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Show Token #42 at counter
                </span>
                <span className="text-[#6b21a8] font-semibold cursor-pointer hover:underline" onClick={onBrowseShops}>
                  View All Outlets &rarr;
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
