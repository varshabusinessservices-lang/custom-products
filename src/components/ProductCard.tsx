import React from 'react';
import { Star, Sparkles, Clock, Check } from 'lucide-react';
import { Product } from '../../shared/types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onCustomiseNow: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onCustomiseNow,
}) => {
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const priceRupees = Math.round(product.basePricePaisa / 100);
  const mspRupees = Math.round(product.originalMspPaisa / 100);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group text-left">
      {/* Product Image Container */}
      <div
        onClick={() => onSelect(product)}
        className="relative bg-slate-100 aspect-4/3 overflow-hidden cursor-pointer"
      >
        <img
          src={primaryImage?.url}
          alt={primaryImage?.alt || product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Quiet Kicker / Lead Badge */}
        {product.tags[0] && (
          <div className="absolute top-2 left-2 bg-indigo-950/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide backdrop-blur-xs">
            {product.tags[0]}
          </div>
        )}

        {/* Fixture indicator badge (honesty requirement) */}
        {product.isDevelopmentFixture && (
          <div className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 text-[9px] px-1.5 py-0.5 rounded">
            Dev Fixture
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata: Category & Lead Time (Zero-Pill discipline: typographic separator) */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <span className="capitalize">{product.categorySlug.replace('-', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-0.5 text-slate-600">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Est. {product.leadTimeDays}d dispatch (Demo)</span>
            </span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onSelect(product)}
            className="font-bold text-slate-900 text-sm line-clamp-2 hover:text-indigo-950 cursor-pointer transition-colors leading-snug mb-1.5"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Rating & Review (Clearly marked sample rating) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-0.5 bg-slate-800 text-amber-300 font-bold text-[10px] px-1.5 py-0.2 rounded">
              <span>{product.ratingAverage.toFixed(1)}</span>
              <Star className="w-2.5 h-2.5 fill-current" />
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Sample rating
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-medium">
              Demo product
            </span>
          </div>
        </div>

        {/* Pricing Block (Flipkart format: ₹Deal M.R.P. Discount%) */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-black text-slate-900">
              ₹{priceRupees.toLocaleString('en-IN')}
            </span>
            {mspRupees > priceRupees && (
              <>
                <span className="text-xs text-slate-400 line-through">
                  ₹{mspRupees.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          {/* Action Button: Customise & Buy */}
          <button
            onClick={() => onCustomiseNow(product)}
            className="w-full py-2 px-3 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-[0.99]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Customise &amp; Buy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
