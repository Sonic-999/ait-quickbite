import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  Users,
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';
import CampusShops from '../components/CampusShops';
import JuiceCenterMenu from '../components/JuiceCenterMenu';
import HeroSection from '../components/HeroSection';
import HowItWorks from '../components/HowItWorks';
import GroupOrderPresenceBar from '../components/GroupOrderPresenceBar';

/**
 * Route: / (Home / Menu page)
 * Blinkit-style clean, modern campus food marketplace.
 * Displays shops, full categorized menu with instant add-to-cart,
 * multiplayer group cart presence, and sticky cart preview floating bar.
 */
export default function HomePage({
  cartItems = [],
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  groupSession,
  currentUser,
  onCreateGroupCart,
  onLeaveGroupCart,
  onOpenInviteModal,
  onUpdateGroupCart,
  onOpenGroupCheckout,
  onQuickOrder,
}) {
  const [selectedShop, setSelectedShop] = useState('juicecenter');
  const [searchFilter, setSearchFilter] = useState('');

  const cartTotal = cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const totalItemsCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  const scrollToMenu = () => {
    const el = document.getElementById('campus-menu-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28">
      {/* 1. Multiplayer Group Cart Presence Bar (if active) */}
      {groupSession && (
        <div className="sticky top-16 z-30 px-3 py-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold tracking-tight">
                Group Cart Active ({groupSession.participants?.length || 1} friends)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenInviteModal}
                className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
              <Link
                to="/cart"
                className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-gray-900 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Section & Quick Pre-Order */}
      <HeroSection onBrowseShops={scrollToMenu} />

      {/* 3. Campus Outlets Grid */}
      <div id="campus-shops" className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Campus Outlets</span>
              <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-[#6b21a8] px-2 py-0.5 rounded-full">
                Instant Pickup
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Order ahead to skip queue during 10-minute class breaks
            </p>
          </div>
        </div>

        <CampusShops
          onQuickOrder={onQuickOrder}
          onOpenJuiceMenu={scrollToMenu}
        />
      </div>

      {/* 4. Full Campus Menu Section */}
      <div id="campus-menu-section" className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <div className="border-t border-gray-200/80 pt-8">
          <JuiceCenterMenu
            onBackToShops={scrollToMenu}
            onAddToCart={onAddToCart}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveFromCart={onRemoveItem}
            onOpenCart={() => {}}
            cartItems={cartItems}
            groupSession={groupSession}
            currentUser={currentUser}
            onCreateGroupCart={onCreateGroupCart}
            onLeaveGroupCart={onLeaveGroupCart}
            onOpenInviteModal={onOpenInviteModal}
            onUpdateGroupCart={onUpdateGroupCart}
            onOpenGroupCheckout={onOpenGroupCheckout}
          />
        </div>
      </div>

      {/* 5. How It Works (Blinkit 3-step guarantee) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        <HowItWorks />
      </div>

      {/* 6. Blinkit-Style Floating Cart Bar (Appears when cartItems > 0) */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-18 left-0 right-0 z-30 px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
            <Link
              to="/cart"
              id="home-floating-cart-bar"
              className="bg-gradient-to-r from-emerald-600 via-teal-700 to-[#6b21a8] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ring-2 ring-white/60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm">
                  {totalItemsCount}
                </div>
                <div>
                  <div className="text-xs text-white/80 font-medium">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in cart
                  </div>
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>&#8377;{cartTotal.toFixed(2)}</span>
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded">
                      Fast Pickup
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl font-extrabold text-xs shadow-xs hover:bg-gray-100 transition-colors">
                <span>View Cart</span>
                <ArrowRight className="w-4 h-4 text-[#6b21a8]" />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
