import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Sparkles,
  Truck,
  ShieldCheck,
  RotateCcw,
  Clock,
  CheckCircle,
  MapPin,
  Share2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Product, ProductVariant, IndianPincodeInfo } from '../../shared/types';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onOpenCustomiser: (product: Product) => void;
  currentPincode: IndianPincodeInfo;
  onOpenPincodeModal: () => void;
  onAddToCart: (
    product: Product,
    variant: ProductVariant | undefined,
    customisationValues: any[],
    quantity: number
  ) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onBack,
  onOpenCustomiser,
  currentPincode,
  onOpenPincodeModal,
  onAddToCart,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeImage = product.images[selectedImageIndex] || product.images[0];
  const basePriceRupees = Math.round(product.basePricePaisa / 100);
  const variantAdditionalRupees = selectedVariant ? Math.round(selectedVariant.additionalPaisa / 100) : 0;
  const unitPriceRupees = basePriceRupees + variantAdditionalRupees;
  const mspRupees = Math.round(product.originalMspPaisa / 100) + variantAdditionalRupees;
  const totalPriceRupees = unitPriceRupees * quantity;

  // Delivery estimation based on pincode
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + currentPincode.standardDays + product.leadTimeDays);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 overflow-x-auto whitespace-nowrap">
          <button onClick={onBack} className="hover:text-indigo-950 font-medium flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="capitalize">{product.categorySlug.replace('-', ' ')}</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-xs">{product.title}</span>
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-5 space-y-3">
            {/* Main Stage Image */}
            <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group">
              <img
                src={activeImage?.url}
                alt={activeImage?.alt || product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {product.isDevelopmentFixture && (
                <div className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                  Dev Fixture
                </div>
              )}
            </div>

            {/* Thumbnail Row */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden shrink-0 transition-all ${
                      selectedImageIndex === idx
                        ? 'border-indigo-950 shadow-xs ring-1 ring-indigo-950'
                        : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Action Bar Below Gallery: Customise Studio Highlight */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Free Live Digital Preview</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  See engraved text and photo layout before checkout.
                </div>
              </div>
              <button
                onClick={() => onOpenCustomiser(product)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-black rounded shadow-xs transition-colors shrink-0"
              >
                Customise Now
              </button>
            </div>
          </div>

          {/* Right Column: Product Details, Variants, Price, Pincode */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              {/* Category & Tags (Zero-Pill discipline: unboxed text with typographic separators) */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-indigo-900">
                  {product.categorySlug.replace('-', ' ')}
                </span>
                <span aria-hidden="true">·</span>
                <span>SKU: {selectedVariant?.sku || product.sku}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">In Stock</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {product.title}
              </h1>

              {/* Rating & Reviews (Clearly labeled demo metadata) */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 bg-slate-800 text-amber-300 font-bold text-xs px-2 py-0.5 rounded">
                  <span>{product.ratingAverage.toFixed(1)}</span>
                  <Star className="w-3 h-3 fill-current" />
                </div>
                <span className="text-xs text-slate-500">
                  Sample Rating (Development Fixture)
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  onClick={handleShare}
                  className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-medium"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Transparent Price Breakdown (Flipkart Style) */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{unitPriceRupees.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  ₹{mspRupees.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {product.discountPercent}% off
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Base Handcrafted Product</span>
                  <span className="font-medium">₹{basePriceRupees.toLocaleString('en-IN')}</span>
                </div>
                {variantAdditionalRupees > 0 && (
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Variant Upgrade ({selectedVariant?.attributeValue})</span>
                    <span className="font-medium">+₹{variantAdditionalRupees.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Personalisation &amp; Laser Engraving</span>
                  <span className="font-bold">INCLUDED (₹0)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>All Taxes Included (GST 18% inclusive)</span>
                  <span className="text-emerald-700 font-semibold">
                    {unitPriceRupees >= 499 ? 'Eligible for Free Delivery' : '+₹60 Standard Shipping'}
                  </span>
                </div>
              </div>
            </div>

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <span>Available Options:</span>
                  <span className="text-indigo-900 font-normal">
                    Selected: {selectedVariant?.title}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-2.5 rounded-lg border text-left text-xs transition-all ${
                        selectedVariant?.id === v.id
                          ? 'border-indigo-950 bg-indigo-50/70 font-bold text-indigo-950 ring-1 ring-indigo-950 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{v.title}</span>
                        {v.additionalPaisa > 0 ? (
                          <span className="text-amber-700 font-bold">
                            +₹{Math.round(v.additionalPaisa / 100)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[10px]">Standard</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Pincode Checker */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Configure delivery availability for PIN {currentPincode.pincode} ({currentPincode.city})</span>
                </div>
                <button
                  onClick={onOpenPincodeModal}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline"
                >
                  Change PIN
                </button>
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Estimated Delivery transit: ~{currentPincode.standardDays + product.leadTimeDays} business days
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-500 font-normal">Demo postal calculator</span>
              </div>
            </div>

            {/* Customisation Slot Specifications Breakdown */}
            {product.customisationTemplate && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Required Customisation Slots:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {product.customisationTemplate.slots.map((slot) => (
                    <div key={slot.slotKey} className="flex items-start gap-1.5 text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{slot.label}</span>
                        {slot.required && <span className="text-rose-600 ml-0.5 font-bold">*Required</span>}
                        {slot.helpText && (
                          <div className="text-[10px] text-slate-400">{slot.helpText}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                  ⚠️ Note: Customisation inputs (photos and text) must be provided in the Customiser Studio before this item can be added to the bag.
                </div>
              </div>
            )}

            {/* Call to Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenCustomiser(product)}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Customise &amp; Add to Bag ({quantity})</span>
              </button>
            </div>

            {/* Specifications & Highlights */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
                  Key Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{key}</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
                  Product Description
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
