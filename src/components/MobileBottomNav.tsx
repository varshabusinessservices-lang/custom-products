import React, { useState } from 'react';
import { Home, Grid, Sparkles, ShoppingBag, User, Info, X } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'home' | 'catalog' | 'product' | 'admin';
  cartCount: number;
  onNavigateHome: () => void;
  onNavigateCategories: () => void;
  onOpenCustomiser: () => void;
  onOpenCart: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  cartCount,
  onNavigateHome,
  onNavigateCategories,
  onOpenCustomiser,
  onOpenCart,
}) => {
  const [showAccountNotice, setShowAccountNotice] = useState(false);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around text-[10px] font-medium text-slate-600">
        {/* 1. Home */}
        <button
          onClick={onNavigateHome}
          className={`flex flex-col items-center py-1 px-2 rounded transition-colors ${
            activeView === 'home' ? 'text-indigo-950 font-bold' : 'hover:text-indigo-950'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        {/* 2. Categories */}
        <button
          onClick={onNavigateCategories}
          className={`flex flex-col items-center py-1 px-2 rounded transition-colors ${
            activeView === 'catalog' ? 'text-indigo-950 font-bold' : 'hover:text-indigo-950'
          }`}
        >
          <Grid className="w-4 h-4 mb-0.5" />
          <span>Explore</span>
        </button>

        {/* 3. Customise Studio (Prominent Center Button) */}
        <button
          onClick={onOpenCustomiser}
          className="flex flex-col items-center py-1 px-2 text-amber-700 font-bold hover:text-amber-800 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-amber-500 text-indigo-950 flex items-center justify-center mb-0.5 shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <span>Customise</span>
        </button>

        {/* 4. Cart */}
        <button
          onClick={onOpenCart}
          className="relative flex flex-col items-center py-1 px-2 hover:text-indigo-950 transition-colors"
        >
          <ShoppingBag className="w-4 h-4 mb-0.5 text-slate-700" />
          <span>Cart</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 bg-amber-500 text-indigo-950 font-black rounded-full text-[9px] flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* 5. Account (Consumer profile placeholder) */}
        <button
          onClick={() => setShowAccountNotice(true)}
          className="flex flex-col items-center py-1 px-2 text-slate-500 hover:text-indigo-950 transition-colors"
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>Account</span>
        </button>
      </div>

      {/* Account Info Modal */}
      {showAccountNotice && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <User className="w-4 h-4 text-indigo-950" />
                <span>Customer Account</span>
              </div>
              <button
                onClick={() => setShowAccountNotice(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Customer profile, saved addresses, and order history will be enabled upon Phase 2
              MySQL user authentication. (Store Owner access remains available via the top header).
            </p>
            <button
              onClick={() => setShowAccountNotice(false)}
              className="w-full py-2 bg-indigo-950 text-white text-xs font-semibold rounded hover:bg-indigo-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
