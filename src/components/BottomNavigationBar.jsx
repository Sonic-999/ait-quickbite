import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
 * 2. Cart (/cart) with live item count badge & bounce micro-interaction
 * 3. Profile (/profile)
 * 4. Support (/support)
 */
export default function BottomNavigationBar({ cartCount = 0 }) {
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const prevCartCountRef = useRef(cartCount);

  // Trigger bounce micro-interaction whenever cartCount increases
  useEffect(() => {
    if (cartCount > 0 && cartCount !== prevCartCountRef.current) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => setIsCartBouncing(false), 600);
      prevCartCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // Also support custom event trigger for items added without count change (e.g. quantity increases)
  useEffect(() => {
    const handleCustomBounce = () => {
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 600);
    };

    window.addEventListener('bounce-cart-nav', handleCustomBounce);
    return () => window.removeEventListener('bounce-cart-nav', handleCustomBounce);
  }, []);

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
      id="sticky-bottom-navigation"
      data-testid="sticky-bottom-navigation-bar"
      aria-label="Main Application Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#e4eae2] shadow-[0_-4px_25px_rgba(22,78,61,0.06)] py-1.5 transition-all"
    >
      <div className="max-w-md md:max-w-xl mx-auto px-3 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCartItem = item.id === 'bottom-nav-cart';

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
                    ? 'text-[#164e3d] font-bold'
                    : 'text-[#605249] hover:text-[#2a221e] font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={
                        isCartItem && isCartBouncing
                          ? {
                              scale: [1, 1.45, 0.85, 1.2, 1],
                              rotate: [0, -15, 15, -8, 0],
                              y: [0, -8, 2, -2, 0],
                            }
                          : { scale: 1, rotate: 0, y: 0 }
                      }
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className={`p-1.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-[#e8f2ec] text-[#164e3d] scale-110 shadow-xs ring-2 ring-[#c3dcd0]'
                          : 'text-[#605249] group-hover:bg-[#e8f2ec]/60 group-hover:text-[#164e3d]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.6px]' : 'stroke-[2px]'}`} />
                    </motion.div>

                    {/* Live Cart Count Badge with Playful Raspberry Pop */}
                    {item.badge != null && (
                      <motion.span
                        id="bottom-nav-cart-badge"
                        key={item.badge}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        className="absolute -top-1 -right-2 bg-gradient-to-r from-[#d81b60] to-[#be185d] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                      isActive ? 'text-[#164e3d] font-black' : 'text-[#605249] group-hover:text-[#2a221e]'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Active bottom indicator pill */}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="w-1.5 h-1.5 bg-[#164e3d] rounded-full mt-0.5"
                    />
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

