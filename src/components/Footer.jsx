import React from 'react';
import { Utensils, Heart, MapPin, Mail, Phone } from 'lucide-react';

export default function Footer({ onSelectTab }) {
  return (
    <footer className="bg-[#faf8f5] border-t border-[#e4eae2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#164e3d] flex items-center justify-center text-white shadow-sm">
                <Utensils className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#2a221e]">
                AIT QuickBite
              </span>
            </div>
            <p className="text-sm text-[#605249] max-w-md leading-relaxed">
              Official campus food pre-ordering platform for students, faculty, and staff at Army Institute of Technology (AIT), Pune. Skip the lunchtime queue and pick up fresh meals on time.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#605249]/80 pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#164e3d]" />
              <span>Army Institute of Technology, Dighi Hills, Alandi Road, Pune - 411015</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2a221e]">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-sm text-[#605249]">
              <li>
                <button
                  onClick={() => onSelectTab('home')}
                  className="hover:text-[#164e3d] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('shops')}
                  className="hover:text-[#164e3d] transition-colors cursor-pointer"
                >
                  Shops &amp; Canteens
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('orders')}
                  className="hover:text-[#164e3d] transition-colors cursor-pointer"
                >
                  My Active Orders
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('vendor')}
                  className="hover:text-[#be185d] transition-colors cursor-pointer font-medium text-[#be185d]"
                >
                  Vendor &amp; Kitchen Portal &rarr;
                </button>
              </li>
            </ul>
          </div>

          {/* Campus Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2a221e]">
              Campus Support
            </h4>
            <ul className="space-y-2 text-sm text-[#605249]">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#164e3d]" />
                <span>quickbite@aitpune.edu.in</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#164e3d]" />
                <span>Intercom Ext: 204 / 205</span>
              </li>
              <li className="pt-2 text-xs text-[#605249]/80">
                Operating Hours: 8:00 AM - 10:30 PM (All 7 Days)
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-12 pt-6 border-t border-[#e4eae2] flex flex-col sm:flex-row items-center justify-between text-xs text-[#605249]/80 gap-3">
          <p>
            &copy; {new Date().getFullYear()} AIT QuickBite. Designed for Army Institute of Technology, Pune.
          </p>
          <p className="flex items-center gap-1">
            Built for lightning-fast campus dining
          </p>
        </div>

      </div>
    </footer>
  );
}
