import React, { useState } from 'react';
import { Clock, MapPin, Star, Utensils, Coffee, Apple, Croissant, Search, Check, ShoppingCart } from 'lucide-react';

export const CAMPUS_SHOPS = [
  {
    id: 'canteen',
    name: 'Main Campus Canteen',
    category: 'Meals, Thalis & Indian Dishes',
    icon: Utensils,
    location: 'Ground Floor, Central Dining Hall',
    waitTime: '8 - 12 mins',
    rating: 4.8,
    status: 'Open Now',
    description: 'Fresh North & South Indian meals, hot thalis, and daily student specials.',
    items: [
      { id: 'c1', name: 'Special Student Veg Thali', price: 90, desc: '2 rotis, dal tadka, paneer sabzi, rice, salad' },
      { id: 'c2', name: 'Crispy Masala Dosa', price: 55, desc: 'With hot sambar and fresh coconut chutney' },
      { id: 'c3', name: 'Chole Bhature (2 pcs)', price: 70, desc: 'Spiced Amritsari chole with pickled onions' },
      { id: 'c4', name: 'Paneer Butter Masala Combo', price: 95, desc: 'Served with 3 tawa rotis or steamed rice' },
    ],
  },
  {
    id: 'nescafe',
    name: 'Nescafe Campus Kiosk',
    category: 'Coffee, Maggi & Quick Snacks',
    icon: Coffee,
    location: 'Opposite Central Library Lawn',
    waitTime: '5 - 8 mins',
    rating: 4.9,
    status: 'Open Now',
    description: 'Iconic iced beverages, hot brews, cheesy Maggi bowls, and grilled sandwiches.',
    items: [
      { id: 'n1', name: 'Signature Iced Cold Coffee', price: 45, desc: 'Chilled rich espresso with vanilla foam' },
      { id: 'n2', name: 'Cheese Veg Grilled Sandwich', price: 65, desc: 'Loaded with capsicum, sweet corn, melted cheese' },
      { id: 'n3', name: 'Butter Masala Maggi', price: 40, desc: 'Double masala noodles with sauteed veggies' },
      { id: 'n4', name: 'Hot Hazelnut Cappuccino', price: 50, desc: 'Steamed creamy milk with roasted hazelnut syrup' },
    ],
  },
  {
    id: 'juice',
    name: 'Juice & Smoothie Corner',
    category: 'Fresh Juices & Energy Bowls',
    icon: Apple,
    location: 'Near Sports Complex & Gym',
    waitTime: '4 - 7 mins',
    rating: 4.7,
    status: 'Open Now',
    description: '100% natural, sugar-optional juices, fitness protein smoothies, and fresh fruit bowls.',
    items: [
      { id: 'j1', name: 'Fresh Mosambi (Sweet Lime) Juice', price: 40, desc: 'Pure freshly squeezed with black salt hint' },
      { id: 'j2', name: 'Banana Peanut Butter Shake', price: 60, desc: 'High energy protein smoothie with oats' },
      { id: 'j3', name: 'Mixed Fruit Bowl', price: 50, desc: 'Fresh seasonal cuts with honey and chaat masala' },
      { id: 'j4', name: 'Watermelon Cooler', price: 35, desc: 'Fresh chilled watermelon with mint leaves' },
    ],
  },
  {
    id: 'bakery',
    name: 'Campus Bakery & Bites',
    category: 'Patties, Rolls & Evening Tea',
    icon: Croissant,
    location: 'Academic Block Basement Entrance',
    waitTime: '3 - 6 mins',
    rating: 4.6,
    status: 'Open Now',
    description: 'Hot baked flaky puff pastries, stuffed rolls, evening samosas, and ginger chai.',
    items: [
      { id: 'b1', name: 'Spicy Paneer Kathi Roll', price: 60, desc: 'Marinated paneer chunks with mint chutney wrap' },
      { id: 'b2', name: 'Crispy Aloo Puff Patty', price: 25, desc: 'Golden baked flaky pastry stuffed with spiced potato' },
      { id: 'b3', name: 'Special Adrak Elaichi Chai', price: 15, desc: 'Freshly brewed aromatic campus tea' },
      { id: 'b4', name: 'Chocolate Chip Brownie', price: 45, desc: 'Warm fudge brownie slice with chocolate drizzle' },
    ],
  },
];

export default function ShopsSection({ onQuickOrder }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [orderedItemIds, setOrderedItemIds] = useState([]);

  const filteredShops = CAMPUS_SHOPS.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddItem = (item, shop) => {
    onQuickOrder(item, shop);
    setOrderedItemIds((prev) => [...prev, item.id]);
    setTimeout(() => {
      setOrderedItemIds((prev) => prev.filter((id) => id !== item.id));
    }, 2000);
  };

  return (
    <section id="shops-section" className="bg-[#ffffff] py-12 sm:py-16 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b21a8] uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b21a8]"></span>
              Campus Outlets
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              AIT Campus Food Outlets
            </h2>
            <p className="mt-2 text-base text-gray-600 max-w-xl">
              Select an outlet, customize your items, and place your pre-order. You will receive an exact pickup time.
            </p>
          </div>

          {/* Clean Search Input */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shops or dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:border-[#6b21a8] focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Shops Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {filteredShops.map((shop) => {
            const ShopIcon = shop.icon;
            return (
              <div
                key={shop.id}
                className="bg-[#ffffff] border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Shop Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#6b21a8] flex items-center justify-center border border-purple-100 flex-shrink-0">
                        <ShopIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">{shop.category}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {shop.status}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-600 pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#6b21a8]" />
                      Ready in: <strong>{shop.waitTime}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {shop.location}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {shop.rating}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {shop.description}
                  </p>

                  {/* Popular Menu Preview */}
                  <div className="mt-5 space-y-2.5">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Popular Items &bull; Instant Pre-Order
                    </div>
                    {shop.items.slice(0, 3).map((item) => {
                      const isJustAdded = orderedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm hover:bg-gray-100/70 transition-colors"
                        >
                          <div className="pr-2">
                            <span className="font-medium text-gray-800">{item.name}</span>
                            <span className="text-xs text-gray-500 block">{item.desc}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-bold text-gray-900">&#8377;{item.price}</span>
                            <button
                              onClick={() => handleAddItem(item, shop)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                isJustAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#6b21a8] hover:bg-[#581c87] text-white shadow-xs'
                              }`}
                            >
                              {isJustAdded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Added!</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-3 h-3" />
                                  <span>Pre-order</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom View Full Menu Action */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedShop(shop)}
                    className="w-full py-2.5 text-center text-sm font-semibold text-[#6b21a8] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                  >
                    View All Items ({shop.items.length} dishes) &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for Viewing Full Shop Menu */}
        {selectedShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-[#ffffff] rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-gray-200 shadow-xl">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedShop.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedShop.location} &bull; Ready in {selectedShop.waitTime}</p>
                </div>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  &times; Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {selectedShop.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-gray-200 flex items-center justify-between hover:border-purple-200 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                      <div className="text-sm font-bold text-[#6b21a8] mt-1">&#8377;{item.price}</div>
                    </div>
                    <button
                      onClick={() => handleAddItem(item, selectedShop)}
                      className="px-4 py-2 bg-[#6b21a8] hover:bg-[#581c87] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      Pre-order
                    </button>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedShop(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
