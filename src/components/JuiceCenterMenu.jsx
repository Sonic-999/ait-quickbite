import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingBag, ArrowLeft, Clock, MapPin, Star, Sparkles, Check, Flame, RefreshCw, AlertCircle, Ban, Users, Share2, Leaf } from 'lucide-react';
import { socket } from '../socket';
import SwiggyItemSkeleton from './SwiggyItemSkeleton';
import { triggerHaptic } from '../utils/haptics';
import { flyItemToCart } from '../utils/flyingCartAnimation';
import MultiplayerCursors from './MultiplayerCursors';
import GroupOrderPresenceBar from './GroupOrderPresenceBar';
import CampusFavoritesBanner from './CampusFavoritesBanner';
import LazyImage from './LazyImage';

/**
 * Helper to compute smart, vibrant dietary tags (Vegan, High-Protein, 100% Veg, etc.)
 */
export function getDietaryTags(item) {
  const tags = [];
  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();
  const cat = (item.category || item.categoryId || '').toLowerCase();

  // 1. High-Protein Tag
  if (
    name.includes('peanut butter') ||
    name.includes('protein') ||
    name.includes('paneer') ||
    name.includes('sprout') ||
    desc.includes('protein') ||
    desc.includes('peanut butter') ||
    desc.includes('paneer')
  ) {
    tags.push({
      label: 'High-Protein',
      bg: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
    });
  }

  // 2. Vegan Tag (pure fresh fruit juices, coolers, seasonal cut fruit bowls)
  const isJuiceOrFruit =
    cat.includes('juice') ||
    name.includes('juice') ||
    name.includes('cooler') ||
    name.includes('fruit') ||
    name.includes('watermelon') ||
    name.includes('orange') ||
    name.includes('mosambi') ||
    name.includes('pineapple') ||
    name.includes('anaar') ||
    name.includes('pomegranate') ||
    name.includes('dragonfruit') ||
    desc.includes('vegan');

  const hasDairy =
    name.includes('shake') ||
    name.includes('cheese') ||
    name.includes('milk') ||
    name.includes('paneer') ||
    name.includes('chai') ||
    name.includes('tea') ||
    name.includes('coffee') ||
    desc.includes('milk') ||
    desc.includes('cream') ||
    desc.includes('cheese');

  if (isJuiceOrFruit && !hasDairy) {
    tags.push({
      label: 'Vegan',
      bg: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
    });
  } else if (item.isVeg) {
    tags.push({
      label: '100% Veg',
      bg: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
    });
  }

  // 3. Functional Nutrition / Campus favorites
  if (
    name.includes('orange') ||
    name.includes('mosambi') ||
    name.includes('anaar') ||
    desc.includes('natural')
  ) {
    tags.push({
      label: 'Cold-Pressed',
      bg: 'bg-orange-500/25 text-orange-200 border-orange-400/40',
    });
  } else if (name.includes('shake') || name.includes('smoothie')) {
    tags.push({
      label: 'Energy Boost',
      bg: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
    });
  } else if (name.includes('samosa') || name.includes('sandwich') || name.includes('fries') || name.includes('patty')) {
    tags.push({
      label: 'Hot & Fresh',
      bg: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
    });
  }

  if (tags.length === 0) {
    tags.push({
      label: item.isVeg ? '100% Veg' : 'Campus Choice',
      bg: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
    });
  }

  return tags.slice(0, 2);
}

/**
 * Helper to ensure crystal-clear, high-resolution direct image URLs
 */
const getCleanImageUrl = (item) => {
  if (item.image && !item.image.includes('source.unsplash.com')) {
    return item.image;
  }
  return item.fallbackImage || item.image || 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80';
};

const DEFAULT_CATEGORIES = [
  { id: 'bestsellers', label: 'Bestsellers' },
  { id: 'juices', label: 'Juices' },
  { id: 'shakes', label: 'Shakes' },
  { id: 'snacks', label: 'Snacks' },
];

export default function JuiceCenterMenu({
  onBackToShops,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onOpenCart,
  cartItems = [],
  groupSession = null,
  currentUser = null,
  onCreateGroupCart,
  onLeaveGroupCart,
  onOpenInviteModal,
  onUpdateGroupCart,
  onOpenGroupCheckout,
}) {
  // Live menu data fetched from SQLite backend API
  const [menuSections, setMenuSections] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Active category state
  const [activeCategory, setActiveCategory] = useState('bestsellers');
  
  // Parabolic flight landing pulse animation state on 'View Cart' sticky banner
  const [isBannerPulsing, setIsBannerPulsing] = useState(false);

  // Micro-interaction: ID of card currently popping (scale: 1.05) on add to cart
  const [poppingItemId, setPoppingItemId] = useState(null);

  // Local quantity fallback to keep cards interactive even standalone
  const [localQuantities, setLocalQuantities] = useState({});

  // Fetch live menu items from the Node.js/Express SQLite backend
  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await fetch('/api/menu?shop=JuiceCenter');
      if (!res.ok) {
        throw new Error(`Failed to load menu: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setMenuSections(data.categories);
        const dynamicCats = data.categories.map((c) => ({
          id: c.categoryId,
          label: c.category,
        }));
        if (dynamicCats.length > 0) {
          setCategories(dynamicCats);
          setActiveCategory(dynamicCats[0].id);
        }
      } else {
        throw new Error(data.error || 'Invalid menu response format');
      }
    } catch (err) {
      console.error('[JuiceCenterMenu] Error fetching menu from backend:', err);
      setFetchError(err.message || 'Unable to connect to local backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Listen to real-time WebSockets stock updates
  // When an order is placed and stock hits 0, update card immediately
  useEffect(() => {
    const handleStockUpdate = (payload) => {
      const updatedList = payload?.items || [];
      if (!Array.isArray(updatedList) || updatedList.length === 0) return;

      const stockMap = new Map();
      for (const u of updatedList) {
        if (u.id) stockMap.set(u.id, u);
        if (u.name) stockMap.set(u.name.toLowerCase().trim(), u);
      }

      setMenuSections((prevSections) =>
        prevSections.map((sec) => ({
          ...sec,
          items: sec.items.map((item) => {
            const update = stockMap.get(item.id) || stockMap.get(item.name.toLowerCase().trim());
            if (update) {
              return {
                ...item,
                inStockQuantity: update.inStockQuantity,
                isAvailable: update.isAvailable != null ? update.isAvailable : update.inStockQuantity > 0,
              };
            }
            return item;
          }),
        }))
      );
    };

    socket.on('menu:stock_updated', handleStockUpdate);
    return () => {
      socket.off('menu:stock_updated', handleStockUpdate);
    };
  }, []);

  // Helper to get active quantity for an item (synced with cartItems or groupSession)
  const activeCartList = groupSession ? (groupSession.cartItems || []) : cartItems;
  const getItemQuantity = (itemId) => {
    const inCart = activeCartList.find((it) => it.id === itemId);
    if (inCart) return inCart.quantity;
    return localQuantities[itemId] || 0;
  };

  // When clicking the rectangular 'ADD' button
  const handleAddClick = (item, event) => {
    const isSoldOut = (item.inStockQuantity != null ? item.inStockQuantity : 20) <= 0 || item.isAvailable === false;
    if (isSoldOut) return;

    // Trigger subtle physical 'pop' haptic vibration for mobile users
    triggerHaptic(50);

    // Parabolic flight animation: clone item image, shrink to 30x30px, fly along arc to sticky banner
    let sourceImg = null;
    if (event && event.currentTarget) {
      const card = event.currentTarget.closest('.menu-item-card') || event.currentTarget.closest('[data-item-id]');
      sourceImg = card ? card.querySelector('img') : null;
    }
    if (!sourceImg) {
      sourceImg = document.querySelector(`[data-item-id="${item.id}"] img`) || document.querySelector(`img[alt="${item.name}"]`);
    }

    flyItemToCart(sourceImg, '#floating-cart-banner-card', () => {
      setIsBannerPulsing(true);
      setTimeout(() => setIsBannerPulsing(false), 500);
    });

    setLocalQuantities((prev) => ({ ...prev, [item.id]: 1 }));

    // Trigger Framer Motion item card pop (scale: 1.05) and bottom nav bounce
    setPoppingItemId(item.id);
    setTimeout(() => setPoppingItemId(null), 400);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bounce-cart-nav'));
    }

    if (groupSession && onUpdateGroupCart) {
      onUpdateGroupCart(item, 1);
    } else if (onAddToCart) {
      onAddToCart({
        item,
        quantity: 1,
        shop: {
          name: 'Juice Center',
          location: 'Near Sports Complex & Gym',
          prepTime: '4 - 7 mins',
        },
      });
    }
  };

  // When clicking '+' or '-' inside the quantity selector
  const handleQuantityChange = (item, delta, event) => {
    const isSoldOut = (item.inStockQuantity != null ? item.inStockQuantity : 20) <= 0 || item.isAvailable === false;
    if (isSoldOut && delta > 0) return;

    // Trigger subtle physical 'pop' haptic vibration for mobile users on add or remove
    triggerHaptic(50);

    // Parabolic flight animation when adding more of an item to the cart
    if (delta > 0) {
      let sourceImg = null;
      if (event && event.currentTarget) {
        const card = event.currentTarget.closest('.menu-item-card') || event.currentTarget.closest('[data-item-id]');
        sourceImg = card ? card.querySelector('img') : null;
      }
      if (!sourceImg) {
        sourceImg = document.querySelector(`[data-item-id="${item.id}"] img`) || document.querySelector(`img[alt="${item.name}"]`);
      }
      flyItemToCart(sourceImg, '#floating-cart-banner-card', () => {
        setIsBannerPulsing(true);
        setTimeout(() => setIsBannerPulsing(false), 500);
      });
    }

    const currentQty = getItemQuantity(item.id);
    const newQty = currentQty + delta;

    if (groupSession && onUpdateGroupCart) {
      onUpdateGroupCart(item, delta);
      setLocalQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, newQty) }));
      return;
    }

    if (newQty <= 0) {
      setLocalQuantities((prev) => ({ ...prev, [item.id]: 0 }));
      if (onRemoveFromCart) {
        onRemoveFromCart(item.id);
      } else if (onUpdateQuantity) {
        onUpdateQuantity(item.id, -currentQty);
      }
    } else {
      // Check available stock limit
      const availableStock = item.inStockQuantity != null ? item.inStockQuantity : 99;
      if (newQty > availableStock) {
        return;
      }

      setLocalQuantities((prev) => ({ ...prev, [item.id]: newQty }));

      if (delta > 0) {
        setPoppingItemId(item.id);
        setTimeout(() => setPoppingItemId(null), 400);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bounce-cart-nav'));
        }
      }

      if (onUpdateQuantity) {
        onUpdateQuantity(item.id, delta);
      } else if (onAddToCart && delta > 0) {
        onAddToCart({
          item,
          quantity: delta,
          shop: {
            name: 'Juice Center',
            location: 'Near Sports Complex & Gym',
            prepTime: '4 - 7 mins',
          },
        });
      }
    }
  };

  /**
   * Smoothly scrolls to a specific category section when clicked.
   * Accounts for fixed navbar and mobile pill menu offsets.
   */
  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const targetElement = document.getElementById(`category-section-${categoryId}`);
    if (targetElement) {
      const isMobile = window.innerWidth < 1024;
      const navOffset = isMobile ? 135 : 95;
      const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  /**
   * Auto-detect currently visible category section while scrolling
   */
  useEffect(() => {
    const handleScroll = () => {
      const isMobile = window.innerWidth < 1024;
      const navOffset = isMobile ? 150 : 110;
      const scrollPosition = window.scrollY + navOffset;

      for (let i = categories.length - 1; i >= 0; i--) {
        const cat = categories[i];
        const el = document.getElementById(`category-section-${cat.id}`);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveCategory(cat.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const totalCartCount = activeCartList.reduce((acc, it) => acc + it.quantity, 0);
  const totalCartValue = activeCartList.reduce((acc, it) => acc + it.price * it.quantity, 0);

  return (
    <div className="bg-[#faf8f5] min-h-screen py-6 sm:py-10 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb / Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToShops}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2a221e] hover:text-[#164e3d] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#e8f2ec]/60 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campus Shops</span>
          </button>

          {totalCartCount > 0 && (
            <button
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 bg-[#fdf2f8] hover:bg-[#fce7f3] border border-[#fbcfe8] text-[#be185d] px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{totalCartCount} in Cart (₹{totalCartValue}) &bull; Checkout &rarr;</span>
            </button>
          )}
        </div>

        {/* Shop Header Banner */}
        <div className="bg-white border border-[#e4eae2] rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f2ec] text-[#164e3d] border border-[#164e3d]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#164e3d] animate-pulse"></span>
                  Open Now
                </span>
                <span className="text-xs text-[#605249]/40">&bull;</span>
                <span className="text-xs font-semibold text-[#605249] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#164e3d]" />
                  Pickup in 4 - 7 mins
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#164e3d] tracking-tight">
                Juice Center
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-[#605249] max-w-2xl leading-relaxed">
                100% freshly extracted juices, thick shakes, and quick bites. Pre-order and pick up right when ready!
              </p>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-[#e4eae2] text-xs text-[#605249] space-y-1">
              <div className="flex md:justify-end items-center gap-1 font-semibold text-[#2a221e]">
                <MapPin className="w-3.5 h-3.5 text-[#605249]" />
                <span>Near Sports Complex &amp; Gym</span>
              </div>
              <p>Operating: 9:00 AM - 9:00 PM</p>
              <p className="text-[#164e3d] font-bold">Fast Counter Pickup &bull; Verified UPI</p>
            </div>
          </div>

          {/* Group Cart Multiplayer Action in Shop Header */}
          <div className="mt-5 pt-4 border-t border-[#e4eae2] flex items-center justify-between flex-wrap gap-3">
            {!groupSession ? (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  id="btn-create-group-cart"
                  type="button"
                  onClick={onCreateGroupCart}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#164e3d] via-[#1f5c49] to-[#2d6a4f] hover:from-[#133f32] hover:to-[#164e3d] text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Users className="w-4 h-4 text-emerald-200" />
                  <span>Create Group Cart</span>
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                    Multiplayer
                  </span>
                </button>
                <span className="text-xs text-[#605249]">
                  Order together with friends, split bill &amp; pay via individual UPI QR codes!
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#164e3d] animate-pulse" />
                  <span className="text-xs font-black text-[#164e3d]">
                    Group Room #{groupSession.id} Active
                  </span>
                  <span className="text-xs text-[#605249]/40">&bull;</span>
                  <span className="text-xs font-semibold text-[#605249]">
                    {groupSession.participants?.length || 1} Friends in Room
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-invite-friends"
                    type="button"
                    onClick={onOpenInviteModal}
                    className="px-3.5 py-2 bg-[#e8f2ec] text-[#164e3d] hover:bg-[#d8e9de] border border-[#164e3d]/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Room Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLeaveGroupCart}
                    className="px-3 py-2 text-[#605249] hover:text-[#9f1239] hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Leave Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Recommendation Engine: '🔥 Campus Favorites' Horizontal Scrolling Banner */}
        <CampusFavoritesBanner
          onAddToCart={onAddToCart}
          onUpdateQuantity={onUpdateQuantity}
          cartItems={activeCartList}
          groupSession={groupSession}
          onUpdateGroupCart={onUpdateGroupCart}
          onOpenCart={onOpenCart}
        />

        {/* Live Multiplayer Cursors and Group Presence Bar */}
        {groupSession && (
          <>
            <MultiplayerCursors sessionId={groupSession.id} currentUser={currentUser} />
            <GroupOrderPresenceBar
              session={groupSession}
              currentUser={currentUser}
              onOpenInviteModal={onOpenInviteModal}
              onLeaveGroup={onLeaveGroupCart}
            />
          </>
        )}

        {/* ======================================================== */}
        {/* MOBILE CATEGORY NAVIGATION: Fixed Horizontal Scrollable   */}
        {/* Pill Menu (Blinkit Style) Just Below Header              */}
        {/* ======================================================== */}
        <div className="lg:hidden sticky top-16 sm:top-20 z-30 bg-[#faf8f5]/95 backdrop-blur-md border-y border-[#e4eae2] py-2.5 px-4 shadow-2xs -mx-4 sm:-mx-6 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count = menuSections.find((s) => s.categoryId === cat.id)?.items?.length || 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-[#164e3d] text-white shadow-xs scale-102 font-extrabold'
                      : 'bg-[#f0f4f1] text-[#2a221e] hover:bg-[#e4eae2] hover:text-[#164e3d] font-semibold'
                  }`}
                >
                  {cat.id === 'bestsellers' && (
                    <Flame className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-[#be185d]'}`} />
                  )}
                  <span>{cat.label}</span>
                  {isLoading ? (
                    <span className="w-5 h-3.5 rounded-full shimmer-skeleton inline-block opacity-80" />
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-[#0c241b] text-white font-bold' : 'bg-[#e4eae2] text-[#605249]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* DESKTOP STICKY SIDEBAR: Category Names on the Left       */}
          {/* With Bold Font & Small Colored Vertical Indicator        */}
          {/* ======================================================== */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-white border border-[#e4eae2] rounded-2xl p-3.5 shadow-xs sticky top-28">
              <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-[#e4eae2]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#605249]">
                  Categories
                </span>
                <span className="text-[11px] font-semibold text-[#164e3d] bg-[#e8f2ec] px-2 py-0.5 rounded-full">
                  Campus Menu
                </span>
              </div>
              
              <nav className="space-y-1.5 mt-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const count = menuSections.find((s) => s.categoryId === cat.id)?.items?.length || 0;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl text-sm transition-all flex items-center justify-between cursor-pointer relative ${
                        isActive
                          ? 'bg-[#e8f2ec] text-[#164e3d] font-black shadow-2xs'
                          : 'text-[#605249] hover:bg-[#faf8f5] hover:text-[#2a221e] font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Small colored vertical indicator */}
                        <span
                          className={`w-1 h-5 rounded-full transition-all ${
                            isActive ? 'bg-[#164e3d]' : 'bg-transparent'
                          }`}
                        />
                        <span className={isActive ? 'font-black text-[#164e3d]' : 'font-semibold'}>
                          {cat.label}
                        </span>
                      </div>
                      
                      {isLoading ? (
                        <span className="w-6 h-4 rounded-full shimmer-skeleton inline-block opacity-80" />
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isActive
                              ? 'bg-[#d8e9de] text-[#164e3d]'
                              : 'text-[#605249] font-medium'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t border-[#e4eae2] px-3 text-xs text-[#605249]">
                <p className="font-bold text-[#2a221e] mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#164e3d]" />
                  AIT QuickBite
                </p>
                <p className="leading-relaxed">Pre-order drinks before entering the gym or class for zero counter delay.</p>
              </div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* MENU ITEMS: Rendered Vertically with Anchor IDs         */}
          {/* ======================================================== */}
          <main className="lg:col-span-9">
            {isLoading ? (
              /* Shimmering Skeleton Screen: 5 cards matching exact Swiggy item card dimensions */
              <SwiggyItemSkeleton count={5} />
            ) : fetchError ? (
              /* Fetch Error State with Retry Button */
              <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-xs">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Failed to Load Menu</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{fetchError}</p>
                <button
                  onClick={fetchMenuData}
                  className="px-4 py-2 bg-[#164e3d] text-white rounded-lg font-semibold text-sm hover:bg-[#133f32] transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Connecting</span>
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {menuSections.map((section) => (
                  <section
                    key={section.categoryId}
                    id={`category-section-${section.categoryId}`}
                    className="bg-white border border-[#e4eae2] rounded-2xl overflow-hidden shadow-xs scroll-mt-28 sm:scroll-mt-32"
                  >
                  {/* Category Header */}
                  <div className="px-6 py-4 bg-[#faf8f5]/90 border-b border-[#e4eae2] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        {section.categoryId === 'bestsellers' && (
                          <Flame className="w-5 h-5 text-[#be185d] fill-[#be185d]" />
                        )}
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#164e3d] tracking-tight">
                          {section.category}
                        </h3>
                      </div>
                      <p className="text-xs text-[#605249] mt-0.5">
                        {section.description}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#605249] bg-white border border-[#e4eae2] px-2.5 py-1 rounded-full self-start sm:self-auto">
                      {section.items.length} items
                    </span>
                  </div>

                  {/* ======================================================== */}
                  {/* ASYMMETRIC BENTO BOX CSS GRID: 2x2 Spans vs 1x1 Blocks   */}
                  {/* Glassmorphic Overlays, Rounded Corners & 2-Line Descs    */}
                  {/* ======================================================== */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-[260px] sm:auto-rows-[280px] grid-flow-dense">
                    {section.items.map((item, index) => {
                      const qty = getItemQuantity(item.id);
                      const isSoldOut = (item.inStockQuantity != null ? item.inStockQuantity : 20) <= 0 || item.isAvailable === false;
                      const dietaryTags = getDietaryTags(item);
                      const imageUrl = getCleanImageUrl(item);

                      // Asymmetric Bento Grid logic:
                      // Best-selling / Star items occupy large 2x2 spans, standard items occupy 1x1 blocks
                      const isLargeBento = Boolean(
                        (item.badge && (item.badge.toLowerCase().includes('bestseller') || item.badge.toLowerCase().includes('special') || item.badge.toLowerCase().includes('top'))) ||
                        (index === 0 && section.items.length >= 3)
                      ) && (index === 0 || (index === 3 && section.items.length >= 7));

                      return (
                        <motion.div
                          key={`${section.categoryId}-${item.id}`}
                          data-item-id={item.id}
                          animate={poppingItemId === item.id ? { scale: 1.05 } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                          onClick={(e) => {
                            if (isSoldOut) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className={`menu-item-card group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#e4eae2] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-end bg-gray-900 ${
                            isLargeBento
                              ? 'col-span-1 sm:col-span-2 row-span-2 min-h-[400px] sm:min-h-[580px]'
                              : 'col-span-1 row-span-1 min-h-[260px] sm:min-h-[280px]'
                          } ${
                            isSoldOut
                              ? 'opacity-65 grayscale-[75%] cursor-not-allowed select-none'
                              : 'hover:-translate-y-1'
                          }`}
                        >
                          {/* Large, High-Quality Image Background with lazy loading, animated skeleton & smooth fade-in */}
                          <div className="absolute inset-0 w-full h-full overflow-hidden">
                            <LazyImage
                              src={imageUrl}
                              fallbackSrc={item.fallbackImage}
                              alt={item.alt || item.name}
                              className="w-full h-full"
                              imgClassName={`transition-transform duration-700 ease-out group-hover:scale-108 ${
                                isSoldOut ? 'grayscale filter brightness-75' : ''
                              }`}
                              skeletonClassName="shimmer-skeleton-dark"
                              hoverEffect={true}
                            />
                            {/* Contrast Gradient Overlay for text legibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0c241b]/95 via-[#0c241b]/40 to-black/10 pointer-events-none z-2" />
                          </div>

                          {/* Top Badges: Bestseller / Star / Pure Veg / Sold Out */}
                          <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isLargeBento ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-gradient-to-r from-[#d81b60] to-[#be185d] text-white shadow-xl border border-rose-300/40 backdrop-blur-md">
                                  <Flame className="w-3.5 h-3.5 fill-white" />
                                  <span>{item.badge || 'Bestseller'}</span>
                                </span>
                              ) : item.badge ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-amber-300 border border-white/20 backdrop-blur-md shadow-md">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>{item.badge}</span>
                                </span>
                              ) : null}

                              {isSoldOut && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-600/90 text-white shadow-lg border border-rose-400/40 backdrop-blur-md">
                                  <Ban className="w-3 h-3" />
                                  <span>Sold Out</span>
                                </span>
                              )}
                            </div>

                            {/* Pure Veg square indicator */}
                            <div className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/20 shadow-md flex-shrink-0">
                              <div
                                className={`w-3.5 h-3.5 border-2 ${
                                  isSoldOut ? 'border-gray-400 bg-gray-900/60' : 'border-emerald-400 bg-emerald-950/40'
                                } rounded-[3px] p-[1.5px] flex items-center justify-center`}
                                title={item.isVeg ? '100% Pure Veg' : 'Non-Veg'}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSoldOut ? 'bg-gray-400' : 'bg-emerald-400'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Sold Out Darkened Center Overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-15 flex items-center justify-center pointer-events-none">
                              <span className="text-white text-xs font-black tracking-widest uppercase bg-rose-600/90 border border-rose-300/40 px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md">
                                CURRENTLY SOLD OUT
                              </span>
                            </div>
                          )}

                          {/* ======================================================== */}
                          {/* SLEEK GLASSMORPHISM OVERLAY AT THE BOTTOM OF THE IMAGE    */}
                          {/* With item name, price, dietary tags, max 2-line desc     */}
                          {/* ======================================================== */}
                          <div className="relative z-20 m-2.5 sm:m-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0c241b]/80 sm:bg-[#0c241b]/75 backdrop-blur-md border border-emerald-400/25 shadow-2xl text-white transition-all duration-300 group-hover:border-emerald-300/40 group-hover:bg-[#0c241b]/85">
                            {/* 1. Dietary Tags & Prep Time */}
                            <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {dietaryTags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-xs flex items-center gap-1 ${tag.bg}`}
                                  >
                                    {tag.label === 'Vegan' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    {tag.label === 'High-Protein' && <Sparkles className="w-2.5 h-2.5 text-amber-300" />}
                                    <span>{tag.label}</span>
                                  </span>
                                ))}
                              </div>

                              {item.prepTimeMinutes && (
                                <span className="text-[10px] text-gray-300/90 font-medium flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded">
                                  <Clock className="w-2.5 h-2.5 text-emerald-300" />
                                  <span>{item.prepTimeMinutes}m</span>
                                </span>
                              )}
                            </div>

                            {/* 2. Item Name (up to 2 clean lines) */}
                            <h4
                              className={`font-black text-white leading-tight tracking-tight line-clamp-2 ${
                                isLargeBento ? 'text-base sm:text-xl' : 'text-sm sm:text-base'
                              } ${isSoldOut ? 'line-through text-gray-400' : ''}`}
                            >
                              {item.name}
                            </h4>

                            {/* 3. Description: Strictly limited to a maximum of two lines */}
                            {item.desc && (
                              <p className="text-[11px] sm:text-xs text-[#e8f2ec]/90 line-clamp-2 leading-relaxed mt-1 font-normal">
                                {item.desc}
                              </p>
                            )}

                            {/* Multiplayer group cart presence indicator */}
                            {groupSession && (() => {
                              const itemInGroup = groupSession.cartItems?.find((ci) => ci.id === item.id);
                              if (!itemInGroup) return null;
                              return (
                                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-200 bg-[#9f1239]/60 border border-[#fb7185]/30 px-1.5 py-0.5 rounded w-fit">
                                  <span>{itemInGroup.addedBy?.avatar || '👥'}</span>
                                  <span>Added by {itemInGroup.addedBy?.name || 'Friend'} ({itemInGroup.quantity}x)</span>
                                </div>
                              );
                            })()}

                            {/* 4. Price & Morphing ADD Button / Quantity Selector */}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10">
                              <div className="flex items-baseline gap-1">
                                <span className={`font-black text-[#fda4af] sm:text-[#fb7185] item-price ${isLargeBento ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
                                  ₹{item.price}
                                </span>
                                {isSoldOut ? (
                                  <span className="text-[10px] font-bold text-rose-400 ml-1">
                                    Unavailable
                                  </span>
                                ) : item.inStockQuantity != null && item.inStockQuantity <= 5 && item.inStockQuantity > 0 ? (
                                  <span className="text-[10px] font-bold text-amber-300 ml-1">
                                    {item.inStockQuantity} left
                                  </span>
                                ) : null}
                              </div>

                              {/* ADD Button / Morphing Quantity Control */}
                              {isSoldOut ? (
                                <button
                                  type="button"
                                  disabled
                                  className="h-7 sm:h-8 px-2.5 bg-gray-800/80 text-gray-400 font-extrabold text-[10px] sm:text-xs rounded-lg border border-gray-700 uppercase tracking-wider cursor-not-allowed select-none pointer-events-none"
                                >
                                  Sold Out
                                </button>
                              ) : (
                                <div
                                  className={`morphing-add-btn relative h-7 sm:h-8 bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] text-white rounded-lg shadow-md border border-rose-400/40 flex items-center justify-center overflow-hidden select-none transition-all duration-200 ${
                                    qty > 0 ? 'w-24 sm:w-26 shadow-rose-900/50 ring-1 ring-rose-300' : 'w-18 sm:w-20'
                                  }`}
                                  role="group"
                                  aria-label={qty > 0 ? `Quantity selector for ${item.name}` : `Add ${item.name} to cart`}
                                >
                                  {/* ADD button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddClick(item, e);
                                    }}
                                    className={`w-full h-full flex items-center justify-center gap-1 font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 text-white ${
                                      qty > 0 ? 'opacity-0 scale-75 pointer-events-none absolute inset-0' : 'opacity-100 scale-100'
                                    }`}
                                    style={{ transition: 'all 0.25s ease' }}
                                    tabIndex={qty > 0 ? -1 : 0}
                                    aria-hidden={qty > 0}
                                    aria-label={`Add ${item.name} to cart`}
                                  >
                                    <span>ADD</span>
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  {/* - qty + controls */}
                                  <div
                                    className={`w-full h-full flex items-center justify-between px-1 ${
                                      qty > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none absolute inset-0'
                                    }`}
                                    style={{ transition: 'all 0.25s ease' }}
                                    aria-hidden={qty === 0}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuantityChange(item, -1, e);
                                      }}
                                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded transition-colors cursor-pointer"
                                      aria-label={`Decrease ${item.name}`}
                                    >
                                      <Minus className="w-3 h-3 stroke-[3]" />
                                    </button>
                                    <span className="font-extrabold text-white text-xs sm:text-sm px-1 min-w-[18px] text-center">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuantityChange(item, 1, e);
                                      }}
                                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded transition-colors cursor-pointer"
                                      aria-label={`Increase ${item.name}`}
                                    >
                                      <Plus className="w-3 h-3 stroke-[3]" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            )}
          </main>

        </div>

        {/* Floating Quick Checkout Bar when Cart has items (Blinkit style) */}
        {totalCartCount > 0 && (
          <div
            id="floating-cart-bar"
            aria-label="View Cart Banner"
            className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in slide-in-from-bottom duration-200"
          >
            <div
              id="floating-cart-banner-card"
              className={`bg-white border-2 border-[#164e3d] rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3 transition-transform ${
                isBannerPulsing ? 'cart-pulse-active' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  id="cart-icon-target"
                  className={`w-10 h-10 rounded-xl bg-[#e8f2ec] text-[#164e3d] flex items-center justify-center font-bold shadow-2xs transition-transform duration-300 ${
                    isBannerPulsing ? 'scale-110 bg-[#d8e9de] text-[#164e3d]' : ''
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#2a221e] flex items-center gap-1.5">
                    <span>
                      {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in {groupSession ? 'Group Cart' : 'Cart'}
                    </span>
                    {groupSession && (
                      <span className="text-[10px] bg-[#e8f2ec] text-[#164e3d] px-1.5 py-0.2 rounded font-black">
                        {groupSession.participants?.length || 1}P
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#605249] font-semibold">
                    {groupSession ? (
                      <>
                        Total: <strong className="text-[#2a221e]">₹{totalCartValue}</strong> &bull; Auto-Split: <strong className="text-[#164e3d]">₹{groupSession.splitBill?.perPersonAmount || totalCartValue}/friend</strong>
                      </>
                    ) : (
                      <>Total: <strong className="text-[#2a221e]">₹{totalCartValue}</strong></>
                    )}
                  </div>
                </div>
              </div>

              <button
                id={groupSession ? 'btn-group-split-checkout' : 'btn-view-cart'}
                onClick={groupSession ? (onOpenGroupCheckout || onOpenCart) : onOpenCart}
                className="py-2.5 px-5 bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] text-white text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{groupSession ? 'Auto-Split & Checkout' : 'View Cart'}</span>
                <span className="text-rose-200">&rarr;</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
