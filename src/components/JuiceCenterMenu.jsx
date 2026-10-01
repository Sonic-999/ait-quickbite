import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingBag, ArrowLeft, Clock, MapPin, Star, Sparkles, Check, Flame, RefreshCw, AlertCircle, Ban, Users, Share2 } from 'lucide-react';
import { socket } from '../socket';
import SwiggyItemSkeleton from './SwiggyItemSkeleton';
import { triggerHaptic } from '../utils/haptics';
import { flyItemToCart } from '../utils/flyingCartAnimation';
import MultiplayerCursors from './MultiplayerCursors';
import GroupOrderPresenceBar from './GroupOrderPresenceBar';
import CampusFavoritesBanner from './CampusFavoritesBanner';

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
    <div className="bg-[#ffffff] min-h-screen py-6 sm:py-10 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb / Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToShops}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#6b21a8] transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campus Shops</span>
          </button>

          {totalCartCount > 0 && (
            <button
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#6b21a8] px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{totalCartCount} in Cart (₹{totalCartValue}) &bull; Checkout &rarr;</span>
            </button>
          )}
        </div>

        {/* Shop Header Banner */}
        <div className="bg-[#ffffff] border border-gray-200 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Open Now
                </span>
                <span className="text-xs text-gray-400">&bull;</span>
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#6b21a8]" />
                  Pickup in 4 - 7 mins
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Juice Center
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
                100% freshly extracted juices, thick shakes, and quick bites. Pre-order and pick up right when ready!
              </p>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 text-xs text-gray-500 space-y-1">
              <div className="flex md:justify-end items-center gap-1 font-semibold text-gray-800">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Near Sports Complex &amp; Gym</span>
              </div>
              <p>Operating: 9:00 AM - 9:00 PM</p>
              <p className="text-emerald-700 font-bold">Fast Counter Pickup &bull; Verified UPI</p>
            </div>
          </div>

          {/* Group Cart Multiplayer Action in Shop Header */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            {!groupSession ? (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  id="btn-create-group-cart"
                  type="button"
                  onClick={onCreateGroupCart}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-700 via-[#6b21a8] to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Users className="w-4 h-4 text-purple-200" />
                  <span>Create Group Cart</span>
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                    Multiplayer
                  </span>
                </button>
                <span className="text-xs text-gray-500">
                  Order together with friends, split bill &amp; pay via individual UPI QR codes!
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-purple-900">
                    Group Room #{groupSession.id} Active
                  </span>
                  <span className="text-xs text-gray-400">&bull;</span>
                  <span className="text-xs font-semibold text-gray-600">
                    {groupSession.participants?.length || 1} Friends in Room
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-invite-friends"
                    type="button"
                    onClick={onOpenInviteModal}
                    className="px-3.5 py-2 bg-purple-50 text-[#6b21a8] hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Room Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLeaveGroupCart}
                    className="px-3 py-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
        <div className="lg:hidden sticky top-16 sm:top-20 z-30 bg-[#ffffff]/95 backdrop-blur-md border-y border-gray-200 py-2.5 px-4 shadow-2xs -mx-4 sm:-mx-6 mb-6">
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
                      ? 'bg-[#6b21a8] text-white shadow-xs scale-102 font-extrabold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 font-semibold'
                  }`}
                >
                  {cat.id === 'bestsellers' && (
                    <Flame className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                  )}
                  <span>{cat.label}</span>
                  {isLoading ? (
                    <span className="w-5 h-3.5 rounded-full shimmer-skeleton inline-block opacity-80" />
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-purple-900/40 text-white font-bold' : 'bg-gray-200 text-gray-600'
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
            <div className="bg-[#ffffff] border border-gray-200 rounded-2xl p-3.5 shadow-xs sticky top-28">
              <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Categories
                </span>
                <span className="text-[11px] font-semibold text-[#6b21a8] bg-purple-50 px-2 py-0.5 rounded-full">
                  Blinkit Fast
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
                          ? 'bg-purple-50 text-[#6b21a8] font-black shadow-2xs'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Small colored vertical indicator */}
                        <span
                          className={`w-1 h-5 rounded-full transition-all ${
                            isActive ? 'bg-[#6b21a8]' : 'bg-transparent'
                          }`}
                        />
                        <span className={isActive ? 'font-black text-[#6b21a8]' : 'font-semibold'}>
                          {cat.label}
                        </span>
                      </div>
                      
                      {isLoading ? (
                        <span className="w-6 h-4 rounded-full shimmer-skeleton inline-block opacity-80" />
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isActive
                              ? 'bg-purple-100 text-[#6b21a8]'
                              : 'text-gray-400 font-medium'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t border-gray-100 px-3 text-xs text-gray-500">
                <p className="font-bold text-gray-800 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#6b21a8]" />
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
                  className="px-4 py-2 bg-[#6b21a8] text-white rounded-lg font-semibold text-sm hover:bg-[#581c87] transition-colors inline-flex items-center gap-2 cursor-pointer"
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
                    className="bg-[#ffffff] border border-gray-200 rounded-2xl overflow-hidden shadow-xs scroll-mt-28 sm:scroll-mt-32"
                  >
                  {/* Category Header */}
                  <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        {section.categoryId === 'bestsellers' && (
                          <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                        )}
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                          {section.category}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {section.description}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      {section.items.length} items
                    </span>
                  </div>

                  {/* List of Menu Items (Horizontal Cards with Subtle Border-Bottom) */}
                  <div className="divide-y divide-gray-100">
                    {section.items.map((item) => {
                      const qty = getItemQuantity(item.id);
                      const isSoldOut = (item.inStockQuantity != null ? item.inStockQuantity : 20) <= 0 || item.isAvailable === false;

                      return (
                        <div
                          key={`${section.categoryId}-${item.id}`}
                          data-item-id={item.id}
                          onClick={(e) => {
                            if (isSoldOut) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className={`menu-item-card p-5 sm:p-6 flex items-start justify-between gap-4 sm:gap-8 transition-all relative overflow-hidden ${
                            isSoldOut
                              ? 'bg-gray-100/70 opacity-60 grayscale-[85%] cursor-not-allowed select-none'
                              : 'bg-[#ffffff] hover:bg-gray-50/30'
                          }`}
                        >
                          {/* ======================================================== */}
                          {/* LEFT SIDE (TEXT): Veg icon, Item Name, Price, Description*/}
                          {/* ======================================================== */}
                          <div className="flex-1 pr-2 sm:pr-4">
                            
                            {/* Veg Icon (green dot in a green square) / Sold out pill */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div
                                className={`w-4 h-4 border-[1.5px] ${
                                  isSoldOut ? 'border-gray-400 bg-gray-100' : 'border-emerald-600 bg-white'
                                } rounded-[3px] p-[2px] flex items-center justify-center shadow-2xs`}
                                title={isSoldOut ? 'Sold Out' : '100% Pure Vegetarian'}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSoldOut ? 'bg-gray-400' : 'bg-emerald-600'
                                  }`}
                                />
                              </div>
                              
                              {/* Sold Out Badge */}
                              {isSoldOut ? (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                                  <Ban className="w-2.5 h-2.5" />
                                  SOLD OUT
                                </span>
                              ) : (
                                <>
                                  {/* Optional Badge */}
                                  {item.badge && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                      {item.badge}
                                    </span>
                                  )}
                                  {/* Low stock indicator */}
                                  {item.inStockQuantity != null && item.inStockQuantity <= 5 && item.inStockQuantity > 0 && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50/80 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                      Only {item.inStockQuantity} left!
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Item Name in bold, dark gray text */}
                            <h4
                              className={`text-base sm:text-lg font-bold leading-snug tracking-tight ${
                                isSoldOut ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {item.name}
                            </h4>

                            {/* Price */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-sm sm:text-base font-extrabold ${isSoldOut ? 'text-gray-400' : 'text-gray-900'}`}>
                                ₹{item.price}
                              </span>
                              {isSoldOut && (
                                <span className="text-xs font-bold text-rose-600">
                                  &bull; Currently Unavailable
                                </span>
                              )}
                            </div>

                            {/* Short, two-line muted grey description */}
                            <p className="mt-2 text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed max-w-xl">
                              {item.desc}
                            </p>

                            {/* Group Order Indicator: who added this item */}
                            {groupSession && (() => {
                              const itemInGroup = groupSession.cartItems?.find((ci) => ci.id === item.id);
                              if (!itemInGroup) return null;
                              return (
                                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 w-fit">
                                  <span>{itemInGroup.addedBy?.avatar || '👥'}</span>
                                  <span>Added by {itemInGroup.addedBy?.name || 'Friend'} ({itemInGroup.quantity}x)</span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* ======================================================== */}
                          {/* RIGHT SIDE (IMAGE & BUTTON): Square photo & 'ADD' button */}
                          {/* ======================================================== */}
                          <div className="relative flex-shrink-0 flex flex-col items-center pb-3 pt-0.5">
                            
                            {/* High-quality, square food image with slightly rounded corners & object-fit: cover */}
                            <div className="w-28 h-28 sm:w-36 sm:h-36 aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200/80 shadow-2xs flex-shrink-0 relative">
                              <img
                                src={item.image}
                                alt={item.alt || item.name}
                                loading="lazy"
                                style={{ objectFit: 'cover' }}
                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                  isSoldOut ? 'grayscale filter brightness-90' : 'hover:scale-105'
                                }`}
                                onError={(e) => {
                                  if (item.fallbackImage && e.currentTarget.src !== item.fallbackImage) {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = item.fallbackImage;
                                  }
                                }}
                              />

                              {/* Sold Out Darkened Glass Overlay across food image */}
                              {isSoldOut && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-2">
                                  <span className="text-white text-[11px] sm:text-xs font-black tracking-widest uppercase bg-black/75 px-2.5 py-1 rounded shadow-md border border-white/20 select-none">
                                    SOLD OUT
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Directly overlapping the bottom center of this image: rectangular primary 'ADD' button, quantity selector, or disabled 'SOLD OUT' */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                              {isSoldOut ? (
                                /* Disabled 'SOLD OUT' button - grayed out with clicks disabled */
                                <button
                                  type="button"
                                  disabled
                                  aria-disabled="true"
                                  className="w-24 sm:w-28 h-8 sm:h-9 bg-gray-200 text-gray-400 font-extrabold text-[11px] sm:text-xs rounded-lg shadow-none border border-gray-300 flex items-center justify-center uppercase tracking-wider cursor-not-allowed select-none pointer-events-none"
                                  title="Item is sold out and unavailable to add"
                                >
                                  <span>SOLD OUT</span>
                                </button>
                              ) : (
                                /* CSS Morphing 'ADD' Button into '- 1 +' Quantity Selector (transition: all 0.3s ease) */
                                <div
                                  className={`morphing-add-btn relative h-8 sm:h-9 bg-[#6b21a8] text-white rounded-lg shadow-md border border-purple-800 flex items-center justify-center overflow-hidden select-none ${
                                    qty > 0
                                      ? 'w-28 sm:w-32 shadow-lg ring-2 ring-purple-400/25'
                                      : 'w-20 sm:w-24 hover:bg-[#581c87] hover:shadow-lg'
                                  }`}
                                  style={{ transition: 'all 0.3s ease' }}
                                  role="group"
                                  aria-label={qty > 0 ? `Quantity selector for ${item.name}` : `Add ${item.name} to cart`}
                                >
                                  {/* Compact 'ADD' State (visible when qty === 0) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddClick(item, e);
                                    }}
                                    className={`w-full h-full flex items-center justify-center gap-1 font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer active:scale-95 text-white ${
                                      qty > 0 ? 'opacity-0 scale-75 pointer-events-none absolute inset-0' : 'opacity-100 scale-100'
                                    }`}
                                    style={{ transition: 'all 0.3s ease' }}
                                    tabIndex={qty > 0 ? -1 : 0}
                                    aria-hidden={qty > 0}
                                    aria-label={`Add ${item.name} to cart`}
                                  >
                                    <span>ADD</span>
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  {/* Expanded '- 1 +' Quantity State (visible when qty > 0) */}
                                  <div
                                    className={`w-full h-full flex items-center justify-between px-1 sm:px-1.5 ${
                                      qty > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none absolute inset-0'
                                    }`}
                                    style={{ transition: 'all 0.3s ease' }}
                                    aria-hidden={qty === 0}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuantityChange(item, -1, e);
                                      }}
                                      className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded transition-colors cursor-pointer"
                                      aria-label={`Decrease ${item.name}`}
                                    >
                                      <Minus className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>

                                    <span className="font-extrabold text-white text-sm sm:text-base select-none px-1 min-w-[20px] text-center">
                                      {qty}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuantityChange(item, 1, e);
                                      }}
                                      className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded transition-colors cursor-pointer"
                                      aria-label={`Increase ${item.name}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
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
              className={`bg-[#ffffff] border-2 border-[#6b21a8] rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3 transition-transform ${
                isBannerPulsing ? 'cart-pulse-active' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  id="cart-icon-target"
                  className={`w-10 h-10 rounded-xl bg-purple-50 text-[#6b21a8] flex items-center justify-center font-bold shadow-2xs transition-transform duration-300 ${
                    isBannerPulsing ? 'scale-110 bg-purple-100 text-purple-900' : ''
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                    <span>
                      {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in {groupSession ? 'Group Cart' : 'Cart'}
                    </span>
                    {groupSession && (
                      <span className="text-[10px] bg-purple-100 text-[#6b21a8] px-1.5 py-0.2 rounded font-black">
                        {groupSession.participants?.length || 1}P
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold">
                    {groupSession ? (
                      <>
                        Total: <strong className="text-gray-900">₹{totalCartValue}</strong> &bull; Auto-Split: <strong className="text-emerald-700">₹{groupSession.splitBill?.perPersonAmount || totalCartValue}/friend</strong>
                      </>
                    ) : (
                      <>Total: <strong className="text-gray-900">₹{totalCartValue}</strong></>
                    )}
                  </div>
                </div>
              </div>

              <button
                id={groupSession ? 'btn-group-split-checkout' : 'btn-view-cart'}
                onClick={groupSession ? (onOpenGroupCheckout || onOpenCart) : onOpenCart}
                className="py-2.5 px-5 bg-gradient-to-r from-purple-700 via-[#6b21a8] to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{groupSession ? 'Auto-Split & Checkout' : 'View Cart'}</span>
                <span className="text-purple-200">&rarr;</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
