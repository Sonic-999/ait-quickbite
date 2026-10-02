import React, { useState, useEffect } from 'react';
import { Clock, MapPin, X, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import LazyImage from './LazyImage';

const CAMPUS_SHOPS = [
  {
    id: 'main-canteen',
    name: 'Main Canteen',
    image: '/images/main_canteen.jpg',
    status: 'Open Now',
    description: 'Fresh North & South Indian meals, hot thalis, dosas, and daily campus lunch specials.',
    location: 'Central Dining Hall, Ground Floor',
    prepTime: '8 - 12 mins',
    menu: [
      { id: 'mc-1', name: 'Special Student Veg Thali', price: 90, desc: '2 rotis, dal tadka, paneer sabzi, rice, and salad' },
      { id: 'mc-2', name: 'Crispy Masala Dosa', price: 55, desc: 'Served with hot sambar and fresh coconut chutney' },
      { id: 'mc-3', name: 'Chole Bhature (2 pcs)', price: 70, desc: 'Spiced Amritsari chole with pickled onions' },
      { id: 'mc-4', name: 'Paneer Butter Masala Meal', price: 95, desc: 'Served with 3 rotis or steamed jeera rice' },
      { id: 'mc-5', name: 'Cold Soft Drink (300ml)', price: 20, desc: 'Chilled bottle' },
    ],
  },
  {
    id: 'nescafe-booth',
    name: 'Nescafe Booth',
    image: '/images/nescafe_booth.jpg',
    status: 'Open Now',
    description: 'Iced cold coffee, hot brewed espresso, grilled cheese sandwiches, and Maggi bowls.',
    location: 'Opposite Central Library Lawn',
    prepTime: '5 - 8 mins',
    menu: [
      { id: 'nb-1', name: 'Signature Iced Cold Coffee', price: 45, desc: 'Chilled rich coffee with creamy froth' },
      { id: 'nb-2', name: 'Veg Cheese Grilled Sandwich', price: 65, desc: 'Toasted golden with capsicum, corn, and cheese' },
      { id: 'nb-3', name: 'Butter Masala Maggi', price: 40, desc: 'Classic double masala noodles' },
      { id: 'nb-4', name: 'Hot Hazelnut Cappuccino', price: 50, desc: 'Steamed milk with aromatic hazelnut' },
      { id: 'nb-5', name: 'Chocolate Chip Muffin', price: 40, desc: 'Freshly baked snack' },
    ],
  },
  {
    id: 'juice-center',
    name: 'Juice Center',
    image: '/images/juice_center.jpg',
    status: 'Open Now',
    description: 'Freshly squeezed fruit juices, fitness smoothies, cold shakes, and seasonal fruit bowls.',
    location: 'Near Sports Complex & Gym',
    prepTime: '4 - 7 mins',
    menu: [
      { id: 'jc-1', name: 'Fresh Mosambi (Sweet Lime) Juice', price: 40, desc: 'Freshly squeezed, 100% pure fruit juice' },
      { id: 'jc-2', name: 'Fresh Watermelon Cooler', price: 35, desc: 'Chilled watermelon juice with fresh mint' },
      { id: 'jc-3', name: 'Banana Peanut Butter Shake', price: 50, desc: 'Energy smoothie with chilled milk' },
      { id: 'jc-4', name: 'Fresh Mixed Fruit Bowl', price: 50, desc: 'Cut seasonal fruits with honey and chaat masala' },
      { id: 'jc-5', name: 'Pure Orange Juice', price: 50, desc: 'Fresh Nagpur oranges without added sugar' },
    ],
  },
  {
    id: 'campus-bakery',
    name: 'Campus Bakery',
    image: '/images/campus_bakery.jpg',
    status: 'Open Now',
    description: 'Warm flaky puff patties, stuffed kathi rolls, evening samosas, and freshly brewed tea.',
    location: 'Academic Block Basement Entrance',
    prepTime: '3 - 6 mins',
    menu: [
      { id: 'cb-1', name: 'Crispy Veg Puff Patty', price: 25, desc: 'Golden baked flaky crust with spiced potato filling' },
      { id: 'cb-2', name: 'Spicy Paneer Kathi Roll', price: 60, desc: 'Tawa paneer wrap with mint chutney and onions' },
      { id: 'cb-3', name: 'Hot Samosa Pav', price: 25, desc: 'Fresh fried samosa in buttered pav with chutneys' },
      { id: 'cb-4', name: 'Special Masala Chai', price: 15, desc: 'Freshly brewed ginger and cardamom tea' },
      { id: 'cb-5', name: 'Chocolate Fudge Brownie', price: 45, desc: 'Warm chocolate brownie slice' },
    ],
  },
];

export default function CampusShops({ onQuickOrder, onOpenJuiceMenu }) {
  const [selectedShop, setSelectedShop] = useState(null);
  const [modalItems, setModalItems] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [orderedItemIds, setOrderedItemIds] = useState([]);

  useEffect(() => {
    if (!selectedShop) {
      setModalItems([]);
      return;
    }

    const fetchShopItems = async () => {
      try {
        setIsModalLoading(true);
        const res = await fetch(`/api/menu?shop=${selectedShop.id}&format=flat`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setModalItems(data.items);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load shop menu:', err);
      } finally {
        setIsModalLoading(false);
      }
      setModalItems(selectedShop.menu || []);
    };

    fetchShopItems();
  }, [selectedShop]);

  const handleViewMenuClick = (shop) => {
    if (shop.id === 'juice-center' && onOpenJuiceMenu) {
      onOpenJuiceMenu();
    } else {
      setSelectedShop(shop);
    }
  };

  const handleOrderItem = (item, shop) => {
    triggerHaptic(50);
    onQuickOrder(item, shop);
    setOrderedItemIds((prev) => [...prev, item.id]);
    setTimeout(() => {
      setOrderedItemIds((prev) => prev.filter((id) => id !== item.id));
    }, 2000);
  };

  return (
    <section id="campus-shops" className="bg-[#ffffff] py-14 sm:py-18 md:py-20 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f2ec] border border-[#c3dcd0] text-[#164e3d] text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#164e3d]"></span>
            <span>AIT Campus Dining</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#164e3d] tracking-tight">
            Campus Shops
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#605249]">
            Choose a food joint below to view the menu and place your pre-order without waiting in line.
          </p>
        </div>

        {/* Neat Grid of Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {CAMPUS_SHOPS.map((shop) => (
            <div
              key={shop.id}
              className="bg-[#ffffff] border border-[#e4eae2] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
            >
              {/* Card Top: Lazy Loaded Image with Skeleton and Smooth Fade-in */}
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                <LazyImage
                  src={shop.image}
                  alt={shop.name}
                  fallbackSrc="/images/juice_center.jpg"
                  className="w-full h-full"
                  imgClassName="group-hover:scale-[1.03]"
                  skeletonClassName="shimmer-skeleton"
                  hoverEffect={true}
                />
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Shop Name & Small Green Indicator 'Open Now' */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-[#2a221e] group-hover:text-[#164e3d] transition-colors">
                      {shop.name}
                    </h3>
                    
                    {/* Small Green Indicator */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8f2ec] text-[#164e3d] border border-[#c3dcd0] flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#164e3d] animate-pulse"></span>
                      {shop.status}
                    </span>
                  </div>

                  {/* Plain and Simple Description */}
                  <p className="text-sm text-[#605249] leading-relaxed mb-4">
                    {shop.description}
                  </p>
                </div>

                <div>
                  {/* Location & Ready Time Meta */}
                  <div className="pt-3 border-t border-[#e4eae2] flex items-center justify-between text-xs text-[#74645b]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#74645b]" />
                      <span className="truncate max-w-[130px]">{shop.location}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#2a221e]">
                      <Clock className="w-3.5 h-3.5 text-[#164e3d]" />
                      {shop.prepTime}
                    </span>
                  </div>

                  {/* Simple 'View Menu' Button in Leafy Deep Green */}
                  <button
                    onClick={() => handleViewMenuClick(shop)}
                    className="w-full mt-4 py-2.5 px-4 bg-[#164e3d] hover:bg-[#113f31] text-white text-sm font-bold rounded-xl shadow-xs transition-colors text-center cursor-pointer focus:ring-2 focus:ring-[#c3dcd0]"
                  >
                    View Menu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Clean Light-Themed Menu Modal when 'View Menu' is Clicked */}
        {selectedShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-[#ffffff] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-[#e4eae2] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-[#e4eae2] flex items-start justify-between bg-[#faf8f5]">
                <div className="flex items-center gap-3">
                  <LazyImage
                    src={selectedShop.image}
                    alt={selectedShop.name}
                    fallbackSrc="/images/juice_center.jpg"
                    className="w-12 h-12 rounded-xl border border-[#e4eae2]"
                    skeletonClassName="shimmer-skeleton"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#2a221e]">{selectedShop.name}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#e8f2ec] text-[#164e3d] border border-[#c3dcd0]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#164e3d]"></span>
                        {selectedShop.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#74645b] mt-0.5">{selectedShop.location} &bull; Ready in {selectedShop.prepTime}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedShop(null)}
                  className="p-1 rounded-lg text-[#74645b] hover:text-[#2a221e] hover:bg-[#e8f2ec] transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Menu Items List */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-white">
                <div className="text-xs font-bold text-[#605249] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Menu Items &bull; Click to Pre-order</span>
                  {isModalLoading && <span className="text-xs text-[#164e3d] animate-pulse">Syncing SQLite...</span>}
                </div>

                {isModalLoading ? (
                  <div className="space-y-3" aria-busy="true">
                    {[1, 2, 3, 4].map((m) => (
                      <div
                        key={m}
                        className="p-3.5 rounded-xl border border-[#e4eae2] flex items-center justify-between bg-white"
                      >
                        <div className="pr-3 flex-1 space-y-2">
                          <div className="h-4 shimmer-skeleton rounded w-2/5" />
                          <div className="h-3 shimmer-skeleton-subtle rounded w-3/5" />
                          <div className="h-3.5 shimmer-skeleton rounded w-14 mt-1" />
                        </div>
                        <div className="w-20 h-7 rounded-lg shimmer-skeleton-darker flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (modalItems.length > 0 ? modalItems : selectedShop.menu).map((item) => {
                    const isJustAdded = orderedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-[#e4eae2] flex items-center justify-between hover:border-[#c3dcd0] hover:bg-[#e8f2ec]/30 transition-colors"
                      >
                        <div className="pr-3">
                          <div className="font-bold text-[#2a221e] text-sm">{item.name}</div>
                          <div className="text-xs text-[#605249] mt-0.5">{item.desc}</div>
                          {/* Playful Raspberry Price Tag */}
                          <div className="text-sm font-black text-[#be185d] mt-1">&#8377;{item.price}</div>
                        </div>

                        {/* Playful Raspberry Add / Pre-order Button */}
                        <button
                          onClick={() => handleOrderItem(item, selectedShop)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                            isJustAdded
                              ? 'bg-emerald-700 text-white'
                              : 'bg-gradient-to-r from-[#d81b60] to-[#be185d] hover:from-[#be185d] hover:to-[#9f1239] text-white shadow-xs'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Ordered!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Pre-order</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#faf8f5] border-t border-[#e4eae2] flex items-center justify-between">
                <span className="text-xs text-[#74645b]">
                  Pre-ordered meals receive an exact pickup token.
                </span>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="px-4 py-2 text-sm font-semibold text-[#2a221e] hover:bg-[#e8f2ec] rounded-lg transition-colors cursor-pointer"
                >
                  Close Menu
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
