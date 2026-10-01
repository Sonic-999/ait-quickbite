import React, { useState, useEffect, useRef } from 'react';
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
      className="mb-8 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-orange-500/10 border-2 border-amber-300/80 rounded-3xl p-4 sm:p-6 shadow-md transition-all duration-300 relative overflow-hidden"
    >
      {/* Decorative background glow circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Title and Real-Time WebSocket Pulse Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 flex-shrink-0 animate-bounce-subtle">
            <Flame className="w-6 h-6 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight flex items-center gap-1.5" id="campus-favorites-title">
                <span>🔥 Campus Favorites</span>
              </h2>
              <span className="text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Trending Right Now
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">
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
                ? 'bg-amber-100 text-amber-900 border-amber-400 scale-105 shadow-sm'
                : 'bg-white/90 text-emerald-800 border-emerald-300 shadow-2xs'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${justUpdated ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${justUpdated ? 'bg-amber-600' : 'bg-emerald-500'}`} />
            </span>
            <span>{justUpdated ? '🔥 Trend Shift Updated!' : '● LIVE WEBSOCKETS'}</span>
            {lastUpdateTime && (
              <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                ({lastUpdateTime})
              </span>
            )}
          </div>

          {/* Left/Right Scroll Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={scrollLeft}
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Banner of Top 3 Items */}
      <div
        ref={scrollContainerRef}
        id="campus-favorites-scroll-container"
        className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar focus:outline-none"
      >
        {trendingItems.slice(0, 3).map((item, index) => {
          const qty = getItemQuantity(item.id, item.name);
          const isSoldOut = item.inStockQuantity <= 0 || item.isAvailable === false;

          return (
            <div
              key={item.id || index}
              data-item-id={item.id}
              className="trending-item-card min-w-[280px] sm:min-w-[320px] md:min-w-[340px] max-w-[360px] flex-shrink-0 bg-white rounded-2xl border-2 border-amber-200/90 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between overflow-hidden snap-start relative group"
            >
              {/* Card Header: Rank Badge & Shop Pill */}
              <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <span
                  className={`text-[11px] font-black text-white px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1 bg-gradient-to-r ${item.rankGradient}`}
                >
                  <span>{item.rankTitle}</span>
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  {item.shopName}
                </span>
              </div>

              {/* Food Image with 15 Students Badge Overlay */}
              <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    if (item.name?.toLowerCase().includes('samosa')) {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80';
                    } else if (item.name?.toLowerCase().includes('chai') || item.name?.toLowerCase().includes('tea')) {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80';
                    } else {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80';
                    }
                  }}
                />

                {/* Primary Required Badge: '15 students ordered this in the last hour!' */}
                <div
                  id={`trending-badge-${item.id}`}
                  className="absolute bottom-2.5 left-2.5 right-2.5 bg-gray-950/90 backdrop-blur-md text-amber-300 text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border border-amber-400/60 flex items-center gap-2 animate-in fade-in duration-200"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 flex-shrink-0 animate-pulse" />
                  <span className="line-clamp-1">
                    {item.badgeText || `${item.studentCount || 15} students ordered this in the last hour!`}
                  </span>
                </div>
              </div>

              {/* Card Content & Action Button */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug group-hover:text-[#6b21a8] transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-base font-black text-gray-900 flex-shrink-0">
                      &#8377;{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#6b21a8]" />
                    <span>~{item.prepTimeMinutes || 3} mins prep</span>
                  </div>

                  {/* Morphing ADD / Quantity Selector */}
                  {isSoldOut ? (
                    <span className="py-1.5 px-3 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg border border-gray-200">
                      SOLD OUT
                    </span>
                  ) : qty > 0 ? (
                    <div className="flex items-center bg-purple-50 border border-purple-200 rounded-xl overflow-hidden shadow-2xs">
                      <button
                        onClick={(e) => handleQuantityChange(item, -1, e)}
                        className="w-8 h-8 flex items-center justify-center text-[#6b21a8] hover:bg-purple-100 active:bg-purple-200 transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-black text-purple-950 min-w-[20px] text-center">
                        {qty}
                      </span>
                      <button
                        onClick={(e) => handleQuantityChange(item, 1, e)}
                        className="w-8 h-8 flex items-center justify-center text-[#6b21a8] hover:bg-purple-100 active:bg-purple-200 transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddItem(item, e)}
                      className="py-1.5 px-4 bg-[#6b21a8] hover:bg-[#581c87] active:scale-95 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
