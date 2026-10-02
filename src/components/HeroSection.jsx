import React from 'react';
import { ArrowRight, Clock, Coffee, ShieldCheck, CheckCircle2, UtensilsCrossed } from 'lucide-react';

export default function HeroSection({ onBrowseShops }) {
  return (
    <section className="bg-[#faf8f5] border-b border-[#e4eae2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Subheading, and Prominent CTA */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Campus Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8f2ec] border border-[#c3dcd0] text-[#164e3d] text-xs sm:text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#164e3d]"></span>
              <span>Official Campus Food Ordering &bull; Army Institute of Technology</span>
            </div>

            {/* Large Friendly Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#2a221e] tracking-tight leading-[1.15]">
              Skip the Queue at <br className="hidden sm:inline" />
              <span className="text-[#164e3d]">AIT Campus</span>
            </h1>

            {/* Simple Subheading */}
            <p className="text-lg sm:text-xl text-[#605249] max-w-2xl leading-relaxed font-normal">
              Pre-order your food and drinks online. We will tell you exactly when to pick it up.
            </p>

            {/* Prominent Clickable Button */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onBrowseShops}
                className="px-8 py-4 bg-[#164e3d] hover:bg-[#113f31] text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-150 inline-flex items-center justify-center gap-2 cursor-pointer focus:ring-4 focus:ring-[#c3dcd0]"
              >
                <span>Browse Shops</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sm text-[#605249] px-2 py-1">
                <Clock className="w-4 h-4 text-[#164e3d] flex-shrink-0" />
                <span>Average campus wait time: <strong className="text-[#2a221e]">under 5 mins</strong></span>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="pt-6 border-t border-[#e4eae2] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-[#605249]">
                <CheckCircle2 className="w-4 h-4 text-[#164e3d] flex-shrink-0" />
                <span>No rush-hour lines</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#605249]">
                <CheckCircle2 className="w-4 h-4 text-[#164e3d] flex-shrink-0" />
                <span>Freshly prepared food</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#605249]">
                <CheckCircle2 className="w-4 h-4 text-[#164e3d] flex-shrink-0" />
                <span>Real-time pickup alerts</span>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Light-Themed Campus Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#ffffff] border border-[#e4eae2] rounded-2xl p-6 sm:p-7 shadow-sm">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e4eae2]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f2ec] text-[#164e3d] flex items-center justify-center font-bold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2a221e]">Nescafe Kiosk</h3>
                    <p className="text-xs text-[#74645b]">Student Center &bull; Order #AIT-108</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold bg-[#e8f2ec] text-[#164e3d] border border-[#c3dcd0] rounded-full">
                  Preparing
                </span>
              </div>

              {/* Order Status Timeline */}
              <div className="py-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#605249]">Estimated Pickup Time</span>
                  <span className="font-extrabold text-[#2a221e] text-base">In 7 Minutes (12:45 PM)</span>
                </div>

                {/* Clean Progress Bar in Leafy Deep Green */}
                <div className="w-full bg-[#e8f2ec] rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#164e3d] h-2.5 rounded-full w-2/3"></div>
                </div>

                <div className="bg-[#faf8f5] rounded-xl p-3 text-xs text-[#605249] border border-[#e4eae2] space-y-1">
                  <div className="flex justify-between font-semibold text-[#2a221e]">
                    <span>1x Cold Coffee (Regular)</span>
                    <span className="text-[#9f1239] font-bold">&#8377;45</span>
                  </div>
                  <div className="flex justify-between font-semibold text-[#2a221e]">
                    <span>1x Grilled Veg Cheese Sandwich</span>
                    <span className="text-[#9f1239] font-bold">&#8377;65</span>
                  </div>
                  <div className="pt-2 border-t border-[#e4eae2] flex justify-between font-bold text-[#2a221e] text-sm">
                    <span>Total Paid</span>
                    <span className="text-[#be185d] font-black">&#8377;110</span>
                  </div>
                </div>
              </div>

              {/* Pickup Instructions */}
              <div className="pt-2 flex items-center justify-between text-xs text-[#74645b] border-t border-[#e4eae2]">
                <span className="inline-flex items-center gap-1 text-[#2a221e] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#164e3d]" />
                  Show Token #42 at counter
                </span>
                <span className="text-[#164e3d] font-bold cursor-pointer hover:underline" onClick={onBrowseShops}>
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
