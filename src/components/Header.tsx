import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  MapPin,
  PhoneCall,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  User,
  Info,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Category, Product, IndianPincodeInfo } from '../../shared/types';

interface HeaderProps {
  categories: Category[];
  products: Product[];
  currentPincode: IndianPincodeInfo;
  onOpenPincodeModal: () => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onSelectCategory: (slug: string | null) => void;
  onSelectProduct: (product: Product) => void;
  onOpenCustomiserStudio: () => void;
  selectedCategory: string | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeView: 'home' | 'catalog' | 'product' | 'admin';
  onNavigateHome: () => void;
  dbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  products,
  currentPincode,
  onOpenPincodeModal,
  cartCount,
  onOpenCart,
  onOpenAdmin,
  onSelectCategory,
  onSelectProduct,
  onOpenCustomiserStudio,
  selectedCategory,
  searchTerm,
  onSearchChange,
  activeView,
  onNavigateHome,
  dbConnected,
}) => {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = searchTerm.trim()
    ? products
        .filter(
          (p) =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.categorySlug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  return (
    <>
      {/* 1. Utility Top Strip (Flipkart density) */}
      <div className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Location & Delivery */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenPincodeModal}
              className="flex items-center gap-1.5 hover:text-amber-400 transition-colors text-left"
              title="Click to change delivery pincode"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Deliver to</span>
              <span className="font-semibold text-white underline decoration-dotted underline-offset-2">
                {currentPincode.pincode}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                ({currentPincode.city}) · Demo Pincode Check
              </span>
            </button>

            <span className="text-slate-700 hidden md:inline">|</span>

            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              <span>Customer Desk (Demo Mode)</span>
              <span className="text-slate-500 text-[11px]">(Mon-Sat 9 AM - 8 PM IST)</span>
            </div>
          </div>

          {/* Right: Architecture Notice & Currency */}
          <div className="flex items-center gap-3">
            {/* Database Persistence Status Badge */}
            <button
              onClick={() => setShowStatusModal(true)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                dbConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/80 hover:bg-amber-900/60'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>{dbConnected ? 'MySQL Connected' : 'Phase 1: MySQL Unconnected'}</span>
              <Info className="w-2.5 h-2.5 opacity-70" />
            </button>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-1 font-medium text-slate-200">
              <span>Currency:</span>
              <span className="text-amber-400 font-bold">INR (₹)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main High-Density Navigation Bar */}
      <header className="sticky top-0 z-40 bg-indigo-950 text-white shadow-md border-b border-indigo-900/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="text-left flex flex-col focus:outline-none group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  PERSONALISED STORE
                </span>
                <span className="bg-amber-500 text-indigo-950 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline">
                  India
                </span>
              </div>
              <span className="text-[10px] text-indigo-200 tracking-wide hidden sm:block">
                Custom Photo Gifts · Laser Engraving · Express Delivery
              </span>
            </button>
          </div>

          {/* Compact Search Bar with Live Dropdown */}
          <div ref={searchRef} className="relative flex-1 max-w-xl mx-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search photo frames, magic mugs, Spotify keychains..."
                className="w-full bg-white text-slate-900 placeholder-slate-400 pl-3 pr-10 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
              />
              <button
                aria-label="Search"
                className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-indigo-900 hover:text-amber-600"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSearchDropdown && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white text-slate-900 rounded-md shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Product Suggestions
                </div>
                {searchSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p);
                      setShowSearchDropdown(false);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-indigo-50 text-left text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={p.images[0]?.url}
                        alt={p.title}
                        className="w-8 h-8 rounded object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-medium text-slate-900 line-clamp-1">{p.title}</div>
                        <div className="text-xs text-slate-500">
                          ₹{(p.basePricePaisa / 100).toLocaleString('en-IN')} · {p.categorySlug}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-600 font-semibold">{p.discountPercent}% OFF</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Customiser Studio Trigger */}
            <button
              onClick={onOpenCustomiserStudio}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold rounded text-xs transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customise Studio</span>
            </button>

            {/* Admin Shell Trigger */}
            <button
              onClick={onOpenAdmin}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                activeView === 'admin'
                  ? 'bg-amber-400 text-indigo-950 font-bold'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-900'
              }`}
              title="Store Owner & Admin Portal"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            {/* Cart Button with Counter */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded text-xs font-semibold transition-colors border border-indigo-700/60"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-amber-500 text-indigo-950 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Horizontal Category Navigation Strip (Zero ugly scrollbar) */}
        <div className="bg-white text-slate-800 border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-6 min-w-max text-xs sm:text-sm">
            <button
              onClick={() => onSelectCategory(null)}
              className={`font-semibold py-1 px-2.5 rounded transition-colors ${
                selectedCategory === null && activeView !== 'admin'
                  ? 'bg-indigo-950 text-white'
                  : 'text-slate-700 hover:text-indigo-950 hover:bg-slate-100'
              }`}
            >
              All Categories
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.slug)}
                  className={`font-medium py-1 px-2 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-100 text-indigo-950 font-bold'
                      : 'text-slate-700 hover:text-indigo-950 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({cat.itemCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Persistence Architecture Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Phase 1 Architecture Status Report
                </h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                <div className="font-semibold text-xs uppercase tracking-wide">
                  MySQL 8 Connection State
                </div>
                <div className="text-sm mt-1">
                  {dbConnected ? (
                    <span className="text-emerald-700 font-medium">
                      ✓ Connected to MySQL 8 database instance.
                    </span>
                  ) : (
                    <span>
                      ⚠️ <strong>MySQL 8 is not yet connected.</strong> The application is currently
                      operating in <em>Development Fixtures Mode</em> with authentic handcrafted product
                      catalogs and real server quote calculations.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Single-Owner Store Architecture (No multi-vendor clutter)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Authoritative server-side pricing engine (Tamper-proof Paisa math)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Prisma Relational Schema & MySQL 8 DDL migrations generated</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>OpenAPI 3.1 specification active at <code>/api/v1/openapi.json</code></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Live order persistence gated until MySQL credentials provided</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t">
                To connect live MySQL: Update <code>DATABASE_URL</code> in your environment and run{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">
                  npx prisma migrate deploy
                </code>
                .
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-indigo-950 text-white text-xs font-semibold rounded hover:bg-indigo-900 transition-colors"
              >
                Acknowledge & Continue Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
