import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  TrendingUp,
  Sparkles,
  Clock,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  Radio,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { socket } from '../socket';
import { triggerHaptic } from '../utils/haptics';
import { flyItemToCart } from '../utils/flyingCartAnimation';
import LazyImage from './LazyImage';

export default function CampusFavoritesBanner({
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  groupSession = null,
  onUpdateGroupCart,
  onOpenCart,
}) {
  const [trendingItems, setTrendingItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [justUpdated, setJustUpdated] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [poppingItemId, setPoppingItemId] = useState(null);
  const scrollContainerRef = useRef(null);

  // Fetch initial trending data from backend SQL window function
  const fetchTrendingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/trending?minutes=60');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.trending)) {
          setTrendingItems(data.trending);
          setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.error('[CampusFavoritesBanner] Error fetching trending:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingData();

    // Listen to real-time WebSockets event 'trending:updated'
    // Dynamic updates across campus as orders are placed or trends shift
    const handleTrendingUpdated = (payload) => {
      const newItems = payload?.trendingItems || [];
      if (Array.isArray(newItems) && newItems.length > 0) {
        console.log('[CampusFavoritesBanner Socket] Received real-time trending:updated:', newItems);
        setTrendingItems(newItems);
        setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2200);
      }
    };

    socket.on('trending:updated', handleTrendingUpdated);

    return () => {
      socket.off('trending:updated', handleTrendingUpdated);
    };
  }, []);

  // Helper to get cart quantity for an item
  const getItemQuantity = (itemId, itemName) => {
    const found = cartItems.find(
      (it) => it.id === itemId || (itemName && it.name.toLowerCase() === itemName.toLowerCase())
    );
    return found ? found.quantity : 0;
  };

  // Horizontal scroll buttons
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Handle direct item add
  const handleAddItem = (item, event) => {
    triggerHaptic(50);

    // Parabolic flight animation to sticky cart banner
    if (event && event.currentTarget) {
      const card = event.currentTarget.closest('.trending-item-card');
      const img = card ? card.querySelector('img') : null;
      if (img) {
        flyItemToCart(img, '#floating-cart-banner-card');
      }
    }

    // Card pop micro-interaction
    setPoppingItemId(item.id);
    setTimeout(() => setPoppingItemId(null), 400);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bounce-cart-nav'));
    }

    if (groupSession && onUpdateGroupCart) {
      onUpdateGroupCart(item, 1);
    } else if (onAddToCart) {
      onAddToCart({
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          image: item.image,
          prepTimeMinutes: item.prepTimeMinutes,
          inStockQuantity: item.inStockQuantity,
        },
        quantity: 1,
        shop: {
          name: item.shopName || 'Juice Center',
        },
      });
    }
  };

  // Handle quantity adjustment
  const handleQuantityChange = (item, delta, event) => {
    triggerHaptic(50);
    const currentQty = getItemQuantity(item.id, item.name);
    const newQty = currentQty + delta;

    if (delta > 0 && event && event.currentTarget) {
      const card = event.currentTarget.closest('.trending-item-card');
      const img = card ? card.querySelector('img') : null;
      if (img) {
        flyItemToCart(img, '#floating-cart-banner-card');
      }
    }

    if (delta > 0) {
      setPoppingItemId(item.id);
      setTimeout(() => setPoppingItemId(null), 400);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bounce-cart-nav'));
      }
    }

    if (groupSession && onUpdateGroupCart) {
      onUpdateGroupCart(item, delta);
    } else if (onUpdateQuantity) {
      onUpdateQuantity(item.id, delta);
    }
  };

  if (!isLoading && trendingItems.length === 0) {
    return null;
  }

  return (
    <section
      id="campus-favorites-section"
      aria-label="Campus Favorites Trending Section"
      className="mb-8 bg-gradient-to-br from-[#164e3d]/8 via-[#2d6a4f]/5 to-[#164e3d]/10 border-2 border-[#164e3d]/25 rounded-3xl p-4 sm:p-6 shadow-sm transition-all duration-300 relative overflow-hidden"
    >
      {/* Decorative background glow circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#164e3d]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#be185d]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Title and Real-Time WebSocket Pulse Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#164e3d] via-[#24634f] to-[#2d6a4f] flex items-center justify-center text-white shadow-md shadow-[#164e3d]/25 flex-shrink-0 animate-bounce-subtle">
            <Flame className="w-6 h-6 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#164e3d] tracking-tight flex items-center gap-1.5" id="campus-favorites-title">
                <span>🔥 Campus Favorites</span>
              </h2>
              <span className="text-[10px] bg-gradient-to-r from-[#d81b60] to-[#be185d] text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Trending Right Now
              </span>
            </div>
            <p className="text-xs text-[#605249] mt-0.5 font-medium">
              Top 3 most frequently ordered items in the last 60 minutes across campus!
            </p>
          </div>
        </div>

        {/* Real-time WebSockets Sync Indicator & Scroll Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div
            id="trending-live-indicator"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all duration-300 ${
              justUpdated
                ? 'bg-rose-50 text-[#9f1239] border-rose-300 scale-105 shadow-sm'
                : 'bg-white/95 text-[#164e3d] border-[#164e3d]/20 shadow-2xs'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${justUpdated ? 'bg-[#be185d]' : 'bg-[#164e3d]'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${justUpdated ? 'bg-[#9f1239]' : 'bg-[#164e3d]'}`} />
            </span>
            <span>{justUpdated ? '🔥 Trend Shift Updated!' : '● LIVE WEBSOCKETS'}</span>
            {lastUpdateTime && (
              <span className="text-[10px] text-[#605249] font-mono hidden md:inline">
                ({lastUpdateTime})
              </span>
            )}
          </div>

          {/* Left/Right Scroll Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={scrollLeft}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#faf8f5] text-[#2a221e] border border-[#e4eae2] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#faf8f5] text-[#2a221e] border border-[#e4eae2] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Banner of Top 3 Items / Animated Skeleton Loaders */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((idx) => (
            <div
              key={`trending-skeleton-${idx}`}
              className="min-w-[280px] sm:min-w-[320px] md:min-w-[340px] max-w-[360px] flex-shrink-0 bg-white rounded-2xl border-2 border-[#e4eae2] shadow-xs flex flex-col justify-between overflow-hidden"
            >
              {/* Header Shimmer */}
              <div className="p-3.5 pb-2 flex items-center justify-between border-b border-[#e4eae2] bg-[#faf8f5]/50">
                <div className="h-4 w-24 rounded-full shimmer-skeleton" />
                <div className="h-3 w-16 rounded shimmer-skeleton-subtle" />
              </div>
              {/* Image Shimmer Area */}
              <div className="h-44 w-full shimmer-skeleton relative">
                <div className="absolute bottom-2.5 left-2.5 right-2.5 h-8 rounded-xl shimmer-skeleton-dark" />
              </div>
              {/* Content Shimmer */}
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 rounded shimmer-skeleton" />
                <div className="h-3 w-full rounded shimmer-skeleton-subtle" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-5 w-14 rounded shimmer-skeleton" />
                  <div className="h-8 w-20 rounded-lg shimmer-skeleton-darker" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          id="campus-favorites-scroll-container"
          className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar focus:outline-none"
        >
          {trendingItems.slice(0, 3).map((item, index) => {
            const qty = getItemQuantity(item.id, item.name);
            const isSoldOut = item.inStockQuantity <= 0 || item.isAvailable === false;

            return (
              <motion.div
                key={item.id || index}
                data-item-id={item.id}
                animate={poppingItemId === item.id ? { scale: 1.05 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="trending-item-card min-w-[280px] sm:min-w-[320px] md:min-w-[340px] max-w-[360px] flex-shrink-0 bg-white rounded-2xl border-2 border-[#e4eae2] hover:border-[#164e3d]/40 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden snap-start relative group"
              >
                {/* Card Header: Rank Badge & Shop Pill */}
                <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-[#e4eae2] bg-gradient-to-r from-[#faf8f5] to-white">
                  <span
                    className={`text-[11px] font-black text-white px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1 bg-gradient-to-r ${item.rankGradient || 'from-[#d81b60] to-[#be185d]'}`}
                  >
                    <span>{item.rankTitle}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#605249]">
                    {item.shopName}
                  </span>
                </div>

                {/* Food Image with LazyImage, Shimmer & Smooth Fade-in */}
                <div className="relative h-44 w-full bg-[#f4f7f4] overflow-hidden">
                  <LazyImage
                    src={item.image}
                    alt={item.name}
                    fallbackSrc="https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80"
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105"
                    skeletonClassName="shimmer-skeleton"
                  />

                  {/* Primary Required Badge: '15 students ordered this in the last hour!' */}
                  <div
                    id={`trending-badge-${item.id}`}
                    className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#0c241b]/90 backdrop-blur-md text-emerald-200 text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-2 animate-in fade-in duration-200 z-2"
                  >
                    <Flame className="w-3.5 h-3.5 text-[#fb7185] fill-[#fb7185] flex-shrink-0 animate-pulse" />
                    <span className="line-clamp-1">
                      {item.badgeText || `${item.studentCount || 15} students ordered this in the last hour!`}
                    </span>
                  </div>
                </div>

              {/* Card Content & Action Button */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-extrabold text-[#2a221e] leading-snug group-hover:text-[#164e3d] transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-base font-black text-[#be185d] flex-shrink-0">
                      &#8377;{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-[#605249] line-clamp-1 mt-1">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e4eae2] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#605249] font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#164e3d]" />
                    <span>~{item.prepTimeMinutes || 3} mins prep</span>
                  </div>

                  {/* Morphing ADD / Quantity Selector */}
                  {isSoldOut ? (
                    <span className="py-1.5 px-3 bg-[#faf8f5] text-[#605249]/60 text-xs font-bold rounded-lg border border-[#e4eae2]">
                      SOLD OUT
                    </span>
                  ) : qty > 0 ? (
                    <div className="flex items-center bg-[#fdf2f8] border border-[#fbcfe8] rounded-xl overflow-hidden shadow-2xs">
                      <button
                        onClick={(e) => handleQuantityChange(item, -1, e)}
                        className="w-8 h-8 flex items-center justify-center text-[#be185d] hover:bg-[#fce7f3] active:bg-[#fbcfe8] transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-black text-[#9f1239] min-w-[20px] text-center">
                        {qty}
                      </span>
                      <button
                        onClick={(e) => handleQuantityChange(item, 1, e)}
                        className="w-8 h-8 flex items-center justify-center text-[#be185d] hover:bg-[#fce7f3] active:bg-[#fbcfe8] transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddItem(item, e)}
                      className="py-1.5 px-4 bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] active:scale-95 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </section>
  );
}
