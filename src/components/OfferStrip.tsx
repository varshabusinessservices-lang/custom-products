import React from 'react';
import { Tag, Zap, Gift, Truck } from 'lucide-react';

interface OfferStripProps {
  onApplyCouponHint?: (code: string) => void;
}

export const OfferStrip: React.FC<OfferStripProps> = ({ onApplyCouponHint }) => {
  return (
    <div className="bg-amber-50 border-y border-amber-200/80 py-2.5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs">
          {/* Offer 1 */}
          <div className="flex items-center gap-2 p-1.5 rounded hover:bg-amber-100/60 transition-colors">
            <div className="p-1.5 bg-amber-500 text-indigo-950 rounded shrink-0">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Demo Offer: ₹150 OFF</div>
              <div className="text-[11px] text-slate-600">
                Code <span className="font-mono font-bold text-indigo-900">FIRSTGIFT</span> (Min ₹599)
              </div>
            </div>
          </div>

          {/* Offer 2 */}
          <div className="flex items-center gap-2 p-1.5 rounded hover:bg-amber-100/60 transition-colors">
            <div className="p-1.5 bg-indigo-900 text-amber-400 rounded shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Demo Offer: 10% Off</div>
              <div className="text-[11px] text-slate-600">
                Code <span className="font-mono font-bold text-indigo-900">FESTIVE10</span> (Min ₹999)
              </div>
            </div>
          </div>

          {/* Offer 3 */}
          <div className="flex items-center gap-2 p-1.5 rounded hover:bg-amber-100/60 transition-colors">
            <div className="p-1.5 bg-emerald-600 text-white rounded shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Free Delivery Threshold</div>
              <div className="text-[11px] text-slate-600">On cart subtotal above ₹499</div>
            </div>
          </div>

          {/* Offer 4 */}
          <div className="flex items-center gap-2 p-1.5 rounded hover:bg-amber-100/60 transition-colors">
            <div className="p-1.5 bg-purple-600 text-white rounded shrink-0">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Interactive Studio</div>
              <div className="text-[11px] text-slate-600">Live digital craft proofing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
