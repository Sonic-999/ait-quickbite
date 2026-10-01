import React, { useState } from 'react';
import { Menu, X, ShoppingBag, User, Utensils, QrCode, Store, Download, Wallet } from 'lucide-react';

export default function Navbar({
  activeTab,
  onSelectTab,
  onOpenLogin,
  onOpenCart,
  onOpenQrGenerator,
  onOpenInstallPrompt,
  orderCount = 1,
  pendingOrdersCount = 0,
  cartCount = 0,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'shops', label: 'Shops' },
    { id: 'orders', label: 'My Orders', badge: orderCount > 0 ? orderCount : null },
    { id: 'wallet', label: 'Wallet & Analytics', icon: Wallet },
  ];

  const handleLinkClick = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#ffffff] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo on the Left */}
          <div className="flex items-center">
            <button
              onClick={() => handleLinkClick('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              aria-label="AIT QuickBite Home"
            >
              <div className="w-10 h-10 rounded-lg bg-[#6b21a8] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 group-hover:text-[#6b21a8] transition-colors">
                  AIT QuickBite
                </span>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden sm:block">
                  Campus Food Ordering
                </span>
              </div>
            </button>
          </div>

          {/* Simple Links on the Right (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#6b21a8] bg-purple-50 font-semibold'
                      : 'text-gray-700 hover:text-[#6b21a8] hover:bg-gray-50'
                  }`}
                >
                  {link.icon && <link.icon className="w-4 h-4 text-[#6b21a8]" />}
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-[#6b21a8] rounded-full">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Vendor Portal Button */}
            <button
              onClick={() => handleLinkClick('vendor')}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vendor'
                  ? 'text-[#6b21a8] bg-purple-50 font-bold border border-purple-200'
                  : 'text-gray-700 hover:text-[#6b21a8] hover:bg-gray-50'
              }`}
              title="AIT QuickBite - Vendor Portal"
            >
              <Store className="w-4 h-4 text-[#6b21a8]" />
              <span>Vendor Portal</span>
              {pendingOrdersCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-amber-600 rounded-full">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            {/* PWA Install App Button */}
            {onOpenInstallPrompt && (
              <button
                onClick={onOpenInstallPrompt}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[#6b21a8] bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Install QuickBite to Home Screen"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* QR Pass Generator Button */}
            {onOpenQrGenerator && (
              <button
                onClick={onOpenQrGenerator}
                className="px-3 py-2 rounded-md text-sm font-semibold text-gray-700 hover:text-[#6b21a8] hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open Dynamic QR Code Generator"
              >
                <QrCode className="w-4 h-4 text-[#6b21a8]" />
                <span className="hidden lg:inline">QR Pass</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="px-3.5 py-2 rounded-md text-sm font-semibold text-gray-700 hover:text-[#6b21a8] hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer relative"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#6b21a8]" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-[#6b21a8] rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Login Link / Action */}
            <div className="pl-3 ml-2 border-l border-gray-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="px-4 py-2 text-sm font-semibold rounded-md text-[#6b21a8] hover:bg-purple-50 border border-[#6b21a8] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
            </div>
          </nav>

          {/* Mobile Right Controls: Cart & Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenCart}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 relative focus:outline-none"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-6 h-6 text-[#6b21a8]" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-[#6b21a8] rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#ffffff] border-b border-gray-200 px-4 pt-2 pb-4 space-y-1 shadow-sm">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-base font-medium flex items-center justify-between ${
                  isActive
                    ? 'text-[#6b21a8] bg-purple-50 font-semibold'
                    : 'text-gray-700 hover:text-[#6b21a8] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {link.icon && <link.icon className="w-4 h-4 text-[#6b21a8]" />}
                  <span>{link.label}</span>
                </span>
                {link.badge && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-[#6b21a8] rounded-full">
                    {link.badge} Active
                  </span>
                )}
              </button>
            );
          })}

          {/* Vendor Portal in Mobile */}
          <button
            onClick={() => handleLinkClick('vendor')}
            className={`w-full text-left px-3 py-2.5 rounded-md text-base font-medium flex items-center justify-between cursor-pointer ${
              activeTab === 'vendor'
                ? 'text-[#6b21a8] bg-purple-50 font-bold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#6b21a8]" />
              Vendor Portal
            </span>
            {pendingOrdersCount > 0 && (
              <span className="text-xs font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full">
                {pendingOrdersCount} pending
              </span>
            )}
          </button>

          {onOpenQrGenerator && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenQrGenerator();
              }}
              className="w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#6b21a8]" />
              <span>Dynamic QR Pass Generator</span>
            </button>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenCart();
            }}
            className="w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#6b21a8]" />
              View Cart &amp; Checkout
            </span>
            {cartCount > 0 && (
              <span className="text-xs font-bold text-white bg-[#6b21a8] px-2 py-0.5 rounded-full">
                {cartCount} items
              </span>
            )}
          </button>

          {onOpenInstallPrompt && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInstallPrompt();
              }}
              className="w-full text-left px-3 py-2.5 rounded-md text-base font-semibold text-[#6b21a8] bg-purple-50 hover:bg-purple-100 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#6b21a8]" />
                Install QuickBite App
              </span>
              <span className="text-xs bg-[#6b21a8] text-white px-2 py-0.5 rounded-full font-bold">
                PWA
              </span>
            </button>
          )}

          <div className="pt-3 border-t border-gray-200 mt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full text-center px-4 py-2.5 text-base font-semibold rounded-md text-white bg-[#6b21a8] hover:bg-[#581c87] transition-colors shadow-sm cursor-pointer"
            >
              Login to Account
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
