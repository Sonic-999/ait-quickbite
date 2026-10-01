import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingBag,
  User,
  Headset
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

/**
 * Sticky Bottom Navigation Bar (Blinkit / Swiggy style)
 * Fixed at the bottom of every page with 4 highly visible navigation tabs:
 * 1. Menu (/)
 * 2. Cart (/cart) with live item count badge
 * 3. Profile (/profile)
 * 4. Support (/support)
 */
export default function BottomNavigationBar({ cartCount = 0 }) {
  const navItems = [
    {
      to: '/',
      label: 'Menu',
      id: 'bottom-nav-menu',
      icon: UtensilsCrossed,
      end: true,
    },
    {
      to: '/cart',
      label: 'Cart',
      id: 'bottom-nav-cart',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : null,
      end: false,
    },
    {
      to: '/profile',
      label: 'Profile',
      id: 'bottom-nav-profile',
      icon: User,
      end: false,
    },
    {
      to: '/support',
      label: 'Support',
      id: 'bottom-nav-support',
      icon: Headset,
      end: false,
    },
  ];

  return (
    <nav
      id="sticky-bottom-navigation-bar"
      aria-label="Main Application Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] py-1.5 transition-all"
    >
      <div className="max-w-md md:max-w-xl mx-auto px-3 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              id={item.id}
              onClick={() => {
                triggerHaptic(12);
              }}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 select-none group cursor-pointer ${
                  isActive
                    ? 'text-[#6b21a8] font-bold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`p-1.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-100 text-[#6b21a8] scale-110 shadow-xs ring-2 ring-purple-200'
                          : 'text-gray-600 group-hover:bg-gray-100 group-hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.6px]' : 'stroke-[2px]'}`} />
                    </div>

                    {/* Live Cart Count Badge */}
                    {item.badge != null && (
                      <span
                        id="bottom-nav-cart-badge"
                        className="absolute -top-1 -right-2 bg-gradient-to-r from-purple-700 to-indigo-600 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in-75 duration-150"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                      isActive ? 'text-[#6b21a8] font-black' : 'text-gray-500 group-hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Active bottom indicator pill */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-[#6b21a8] rounded-full mt-0.5 animate-in fade-in zoom-in-50 duration-200" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
