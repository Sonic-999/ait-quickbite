import React from 'react';
import { Smartphone, ChefHat, CheckCircle2 } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: Smartphone,
      title: 'Pre-order Online',
      desc: 'Browse live menus from any AIT campus canteen or shop right from your classroom or hostel.',
    },
    {
      step: '02',
      icon: ChefHat,
      title: 'Kitchen Prepares Fresh',
      desc: 'The kitchen receives your order ticket immediately and begins fresh preparation on schedule.',
    },
    {
      step: '03',
      icon: CheckCircle2,
      title: 'Pick Up Right on Time',
      desc: 'Get your exact pickup estimate and token. Walk to the counter, grab your meal, and skip the line.',
    },
  ];

  return (
    <section className="bg-[#ffffff] py-14 sm:py-16 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b21a8] uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6b21a8]"></span>
            How It Works
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            How AIT QuickBite Saves Your Lunch Break
          </h2>
          <p className="mt-3 text-base text-gray-600">
            No more waiting 20 minutes in crowded campus lines between lectures.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-[#ffffff] border border-gray-200 rounded-xl p-7 relative hover:border-gray-300 transition-colors shadow-xs"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center border border-purple-100">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black text-gray-200">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
