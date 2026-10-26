import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle,
  Truck,
  ShieldCheck,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { OfferStrip } from './components/OfferStrip';
import { ProductCard } from './components/ProductCard';
import { ProductDetailView } from './components/ProductDetailView';
import { LiveCustomiserModal } from './components/LiveCustomiserModal';
import { CartDrawer } from './components/CartDrawer';
import { AdminShell } from './components/AdminShell';
import { PincodeModal } from './components/PincodeModal';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';

import {
  Category,
  Product,
  ProductVariant,
  CartItem,
  CustomisationValueInput,
  IndianPincodeInfo,
  HealthStatusResponse,
} from '../shared/types';
import {
  FIXTURE_CATEGORIES,
  FIXTURE_PRODUCTS,
  lookupPincode,
} from '../shared/fixtures';

export default function App() {
  // Navigation & View States
  const [activeView, setActiveView] = useState<'home' | 'catalog' | 'product' | 'admin'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customisingProduct, setCustomisingProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Pincode & Delivery State
  const [currentPincode, setCurrentPincode] = useState<IndianPincodeInfo>(
    lookupPincode('110001')
  );
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular');
  const [priceMaxFilter, setPriceMaxFilter] = useState<number>(3000);

  // Backend Health & Database Connectivity
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [dbConnected, setDbConnected] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Fetch health status from Express backend on mount
  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data: HealthStatusResponse) => {
        setHealth(data);
        setDbConnected(data.database.connected);
      })
      .catch(() => {
        // Fallback status if offline
        setDbConnected(false);
      });
  }, []);

  // Filter products based on search, category, and price
  const filteredProducts = FIXTURE_PRODUCTS.filter((product) => {
    if (selectedCategory && product.categorySlug !== selectedCategory) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        product.title.toLowerCase().includes(q) ||
        product.shortSummary.toLowerCase().includes(q) ||
        product.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (Math.round(product.basePricePaisa / 100) > priceMaxFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOption === 'price_asc') return a.basePricePaisa - b.basePricePaisa;
    if (sortOption === 'price_desc') return b.basePricePaisa - a.basePricePaisa;
    if (sortOption === 'rating') return b.ratingAverage - a.ratingAverage;
    return b.ratingCount - a.ratingCount;
  });

  const bestSellers = FIXTURE_PRODUCTS.slice(0, 4);
  const trendingProducts = FIXTURE_PRODUCTS.slice(2, 6);

  // Cart Handlers
  const handleAddToCart = (
    product: Product,
    variant: ProductVariant | undefined,
    customisationValues: CustomisationValueInput[],
    quantity: number
  ) => {
    // If product is personalised, verify that customisation values are present
    if (product.isPersonalised) {
      const hasValues = customisationValues && customisationValues.length > 0;
      if (!hasValues) {
        setCustomisingProduct(product);
        return;
      }
    }

    const variantAdditional = variant ? variant.additionalPaisa : 0;
    const lineTotalPaisa = (product.basePricePaisa + variantAdditional) * quantity;

    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      product,
      variantId: variant?.id,
      variantTitle: variant?.title,
      variantAdditionalPaisa: variantAdditional,
      quantity,
      customisationValues,
      calculatedLineTotalPaisa: lineTotalPaisa,
    };

    setCartItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const unit = item.product.basePricePaisa + item.variantAdditionalPaisa;
          return {
            ...item,
            quantity: newQty,
            calculatedLineTotalPaisa: unit * newQty,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (slug: string | null) => {
    setSelectedCategory(slug);
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqs = [
    {
      q: 'How do I upload and verify photos for my personalised order?',
      a: 'You can choose your image files (JPG, PNG, WebP up to 15MB) directly inside our Live Customiser Studio. The studio provides a real-time visual proof of the engraving, frame, or reveal mug. In Phase 1, selected files are previewed in your browser session and validated for print resolution.',
    },
    {
      q: 'How does delivery pincode verification work?',
      a: 'The delivery estimator in the top bar uses sample transit models for Indian postal codes. In production (Phase 2), this will connect directly to courier partner APIs for real-time tracking and delivery windows.',
    },
    {
      q: 'Can I add an item without customisation?',
      a: 'No. All items designated as personalised require you to complete the necessary text and photo upload fields before they can be placed in your bag. This guarantees that your order details are verified.',
    },
    {
      q: 'How is order checkout handled in Phase 1?',
      a: 'Phase 1 provides complete authoritative price quote calculations, coupon validation, and real-time customisation previews. Order persistence and payment processing remain safely gated until MySQL 8 database credentials and payment gateways are linked.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-indigo-950">
      {/* 1. Universal Top Header & Navigation */}
      <Header
        categories={FIXTURE_CATEGORIES}
        products={FIXTURE_PRODUCTS}
        currentPincode={currentPincode}
        onOpenPincodeModal={() => setIsPincodeModalOpen(true)}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setActiveView('admin')}
        onSelectCategory={handleSelectCategory}
        onSelectProduct={handleSelectProduct}
        onOpenCustomiserStudio={() => setCustomisingProduct(FIXTURE_PRODUCTS[0])}
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          if (activeView !== 'catalog') setActiveView('catalog');
        }}
        activeView={activeView}
        onNavigateHome={() => {
          setActiveView('home');
          setSelectedCategory(null);
          setSearchTerm('');
        }}
        dbConnected={dbConnected}
      />

      {/* 2. Main Content Routing */}
      <main className="flex-1 pb-16 lg:pb-0">
        {/* VIEW A: ADMIN DESIGN SHELL */}
        {activeView === 'admin' && (
          <AdminShell
            onBackToStore={() => setActiveView('home')}
            health={health}
          />
        )}

        {/* VIEW B: PRODUCT DETAIL SKELETON */}
        {activeView === 'product' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onBack={() => setActiveView('catalog')}
            onOpenCustomiser={(p) => setCustomisingProduct(p)}
            currentPincode={currentPincode}
            onOpenPincodeModal={() => setIsPincodeModalOpen(true)}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* VIEW C: SEARCHABLE & FILTERABLE CATALOG */}
        {activeView === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Catalog Banner & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {selectedCategory
                    ? FIXTURE_CATEGORIES.find((c) => c.slug === selectedCategory)?.name || 'Catalog'
                    : searchTerm
                    ? `Search Results for "${searchTerm}"`
                    : 'Personalised Product Catalog'}
                </h1>
                <div className="text-xs text-slate-500 mt-1">
                  Showing {filteredProducts.length} handcrafted personalised products · Tested with
                  authoritative pricing
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                <span className="text-slate-500 font-medium">Sort By:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-950"
                >
                  <option value="popular">Most Popular</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                </select>
              </div>
            </div>

            {/* Catalog Layout: Sidebar Filters + Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Filter Sidebar */}
              <div className="lg:col-span-3 space-y-5 bg-white p-4 rounded-lg border border-slate-200 h-fit">
                <div className="flex items-center justify-between font-bold text-xs text-slate-900 uppercase tracking-wide border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-950" />
                    <span>Filter Products</span>
                  </span>
                  {(selectedCategory || searchTerm || priceMaxFilter < 3000) && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchTerm('');
                        setPriceMaxFilter(3000);
                      }}
                      className="text-indigo-700 hover:text-indigo-950 font-semibold normal-case text-xs"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Categories Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Gift Categories
                  </label>
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-left px-2 py-1.5 rounded transition-colors flex justify-between ${
                        selectedCategory === null
                          ? 'bg-indigo-950 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Items</span>
                      <span className="opacity-75">{FIXTURE_PRODUCTS.length}</span>
                    </button>
                    {FIXTURE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors flex justify-between ${
                          selectedCategory === cat.slug
                            ? 'bg-indigo-950 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="opacity-75">{cat.itemCount}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Filter Slider */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
                    <span>Max Price</span>
                    <span className="text-indigo-950 font-black">₹{priceMaxFilter}</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="3000"
                    step="100"
                    value={priceMaxFilter}
                    onChange={(e) => setPriceMaxFilter(Number(e.target.value))}
                    className="w-full accent-indigo-950 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>₹200</span>
                    <span>₹3,000</span>
                  </div>
                </div>

                {/* Assurance Note */}
                <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Free Customisation</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    No extra hidden fees for laser engraving or text printing.
                  </p>
                </div>
              </div>

              {/* Products Results Grid */}
              <div className="lg:col-span-9">
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-3">
                    <div className="text-slate-400 font-bold text-base">No products match your criteria</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try expanding your price range or clearing category filters.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchTerm('');
                        setPriceMaxFilter(3000);
                      }}
                      className="px-4 py-2 bg-indigo-950 text-white text-xs font-semibold rounded hover:bg-indigo-900 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onSelect={handleSelectProduct}
                        onCustomiseNow={(prod) => setCustomisingProduct(prod)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW D: HIGH-CONVERSION HOMEPAGE */}
        {activeView === 'home' && (
          <div className="space-y-8">
            {/* 1. Hero Promo Banner */}
            <HeroBanner
              onOpenCustomiser={() => setCustomisingProduct(FIXTURE_PRODUCTS[0])}
              onExploreCatalog={() => {
                setActiveView('catalog');
                setSelectedCategory(null);
              }}
            />

            {/* 2. Compact Deal & Coupon Strip */}
            <OfferStrip />

            {/* 3. Category Grid Showcase (Flipkart density) */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Explore Personalised Categories
                  </h2>
                  <div className="text-xs text-slate-500">
                    Handmade gifts tailored with your photos and dates
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveView('catalog');
                    setSelectedCategory(null);
                  }}
                  className="text-xs font-bold text-indigo-950 hover:text-amber-600 flex items-center gap-1 transition-colors"
                >
                  <span>View All ({FIXTURE_PRODUCTS.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {FIXTURE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.slug)}
                    className="p-3 bg-white rounded-lg border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-950 group-hover:bg-amber-500 group-hover:text-indigo-950 transition-colors flex items-center justify-center mb-2 shadow-inner">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-indigo-950">
                      {cat.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {cat.itemCount} Designs
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 4. Best Sellers Section */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 sm:p-6 rounded-xl border border-amber-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-amber-500 text-indigo-950 rounded font-black text-xs">
                      HOT
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        Best Sellers · Most Loved Across India
                      </h2>
                      <div className="text-xs text-slate-600">
                        Top rated frames, magic mugs, and engraved steel keychains
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveView('catalog');
                      setSortOption('popular');
                    }}
                    className="text-xs font-bold text-indigo-950 hover:text-amber-600 hidden sm:flex items-center gap-1"
                  >
                    <span>See All Best Sellers</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {bestSellers.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={handleSelectProduct}
                      onCustomiseNow={(p) => setCustomisingProduct(p)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 5. Interactive Studio Sandbox Banner */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="bg-indigo-950 text-white rounded-xl p-6 sm:p-8 relative overflow-hidden border border-indigo-900 shadow-xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
                  <div className="lg:col-span-8 space-y-3">
                    <span className="bg-amber-500 text-indigo-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      Live Craft Preview Engine
                    </span>
                    <h3 className="text-xl sm:text-3xl font-black tracking-tight">
                      Experience Real-Time Personalisation Before You Order
                    </h3>
                    <p className="text-xs sm:text-sm text-indigo-200 max-w-xl leading-relaxed">
                      Type your family title, anniversary date, or upload a photo to immediately
                      see how it renders on laser-carved teakwood, temperature-reveal ceramic, or
                      stretched gallery canvas.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setCustomisingProduct(FIXTURE_PRODUCTS[0])}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black rounded text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Launch Live Customiser Studio</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex justify-center">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-xs text-indigo-100 space-y-2 max-w-xs w-full">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>High-Definition Digital Proof</span>
                      </div>
                      <div>• Real-time font &amp; engraving simulation</div>
                      <div>• Zero-risk preview prior to workshop production</div>
                      <div>• Instant calculated quote with no hidden fees</div>
                    </div>
                  </div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-amber-500/10 blur-3xl -z-0 pointer-events-none" />
              </div>
            </section>

            {/* 6. Trending Personalized Products */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Trending This Week
                  </h2>
                  <div className="text-xs text-slate-500">
                    Handpicked customer favorites across India
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveView('catalog');
                    setSelectedCategory(null);
                  }}
                  className="text-xs font-bold text-indigo-950 hover:text-amber-600 flex items-center gap-1 transition-colors"
                >
                  <span>Explore Catalog</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {trendingProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    onCustomiseNow={(p) => setCustomisingProduct(p)}
                  />
                ))}
              </div>
            </section>

            {/* 7. Indian E-Commerce FAQ Accordion */}
            <section className="max-w-4xl mx-auto px-4 pt-4">
              <div className="text-center mb-6">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Everything you need to know about our handcrafted personalised gifting process
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full px-4 py-3 text-left font-bold text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3 text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 3. Universal Footer */}
      <Footer />

      {/* 4. Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={activeView}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onNavigateHome={() => {
          setActiveView('home');
          setSelectedCategory(null);
          setSearchTerm('');
        }}
        onNavigateCategories={() => {
          setActiveView('catalog');
          setSelectedCategory(null);
        }}
        onOpenCustomiser={() => setCustomisingProduct(FIXTURE_PRODUCTS[0])}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 5. Modals & Drawers */}
      {/* Live Customiser Studio */}
      {customisingProduct && (
        <LiveCustomiserModal
          product={customisingProduct}
          onClose={() => setCustomisingProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Slide-over Cart with Authoritative Server Quote */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        currentPincode={currentPincode}
        dbConnected={dbConnected}
      />

      {/* Pincode Selector Modal */}
      <PincodeModal
        isOpen={isPincodeModalOpen}
        onClose={() => setIsPincodeModalOpen(false)}
        currentPincode={currentPincode}
        onSelectPincode={(info) => setCurrentPincode(info)}
      />
    </div>
  );
}
