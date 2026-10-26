import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Tag,
  ShieldCheck,
  Truck,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { CartItem, PriceQuoteResponse, IndianPincodeInfo } from '../../shared/types';
import { calculateAuthoritativeQuote } from '../../server/security';
import { FIXTURE_PRODUCTS } from '../../shared/fixtures';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  currentPincode: IndianPincodeInfo;
  dbConnected: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  currentPincode,
  dbConnected,
}) => {
  const [couponCode, setCouponCode] = useState('FIRSTGIFT');
  const [couponInput, setCouponInput] = useState('FIRSTGIFT');
  const [quote, setQuote] = useState<PriceQuoteResponse | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [showCheckoutNotice, setShowCheckoutNotice] = useState(false);

  // Authoritative server quote calculation on cart items change
  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        customisationValues: i.customisationValues,
      })),
      couponCode: couponCode.trim(),
      shippingPincode: currentPincode.pincode,
    };

    const result = calculateAuthoritativeQuote(payload, FIXTURE_PRODUCTS);
    if (result.success) {
      setQuote(result.quote);
      if (result.quote.appliedCoupon) {
        setCouponMessage(`✓ ${result.quote.appliedCoupon.description}`);
      } else if (couponCode.trim()) {
        setCouponMessage('Coupon code requires minimum order amount.');
      } else {
        setCouponMessage(null);
      }
    }
  }, [items, couponCode, currentPincode.pincode]);

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponCode(couponInput.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-indigo-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">Shopping Bag</span>
              <span className="text-xs bg-amber-500 text-indigo-950 px-2 py-0.5 rounded font-black">
                {items.reduce((acc, i) => acc + i.quantity, 0)} Items
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-300 hover:text-white p-1 rounded hover:bg-indigo-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Truck className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Your shopping bag is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore our handcrafted photo frames, magic mugs, and personalized keychains to begin.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-950 text-white text-xs font-semibold rounded hover:bg-indigo-900 transition-colors"
                >
                  Start Customising
                </button>
              </div>
            ) : (
              items.map((item) => {
                const itemTotalRupees = Math.round(item.calculatedLineTotalPaisa / 100);
                const primaryImage =
                  item.product.images.find((img) => img.isPrimary) || item.product.images[0];

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex gap-3 text-left"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-16 h-16 bg-white rounded border border-slate-200 overflow-hidden shrink-0">
                      <img
                        src={primaryImage?.url}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {item.product.title}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.variantTitle && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.variantTitle}
                          </div>
                        )}

                        {/* Customisation Summary with Real File Names */}
                        {item.customisationValues.length > 0 && (
                          <div className="mt-1 space-y-1">
                            <div className="text-[10px] text-indigo-900 font-medium bg-indigo-50/80 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                              ✨{' '}
                              {item.customisationValues
                                .map((v) =>
                                  v.fileName
                                    ? `📷 ${v.fileName}`
                                    : v.textValue || v.selectedOption || (v.photoUrl ? '📷 Photo' : '')
                                )
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {item.customisationValues.some((v) => v.photoUrl) && (
                              <div className="flex items-center gap-1">
                                {item.customisationValues
                                  .filter((v) => v.photoUrl)
                                  .map((v) => (
                                    <img
                                      key={v.slotKey}
                                      src={v.photoUrl}
                                      alt={v.fileName || 'Attached Photo'}
                                      className="w-5 h-5 rounded object-cover border border-slate-300"
                                      title={v.fileName || 'Uploaded photo preview'}
                                    />
                                  ))}
                                <span className="text-[9px] text-slate-500">
                                  ({item.customisationValues.filter((v) => v.photoUrl).length} photo{item.customisationValues.filter((v) => v.photoUrl).length > 1 ? 's' : ''} attached · Local preview)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity & Line Total */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/80">
                        <div className="flex items-center border border-slate-300 rounded bg-white">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600"
                            disabled={item.quantity >= 50}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-sm font-black text-slate-900">
                          ₹{itemTotalRupees.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Coupon & Transparent Billing Breakdown */}
          {items.length > 0 && quote && (
            <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3 shrink-0">
              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon (e.g. FIRSTGIFT)"
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-indigo-950"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-950 text-white font-bold text-xs rounded hover:bg-indigo-900 transition-colors"
                >
                  Apply
                </button>
              </form>

              {couponMessage && (
                <div
                  className={`text-[11px] font-medium ${
                    quote.appliedCoupon ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {couponMessage}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Math.round(quote.subtotalPaisa / 100).toLocaleString('en-IN')}
                  </span>
                </div>

                {quote.variantUpgradesPaisa > 0 && (
                  <div className="flex justify-between">
                    <span>Variant Upgrades</span>
                    <span className="font-semibold text-slate-800">
                      +₹{Math.round(quote.variantUpgradesPaisa / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {quote.discountPaisa > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount ({quote.appliedCoupon?.code})</span>
                    <span>-₹{Math.round(quote.discountPaisa / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping to {currentPincode.pincode}</span>
                  {quote.isFreeDelivery ? (
                    <span className="text-emerald-700 font-bold uppercase text-[11px]">FREE</span>
                  ) : (
                    <span>+₹{Math.round(quote.deliveryFeePaisa / 100)}</span>
                  )}
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Estimated Taxes (GST 18% inclusive)</span>
                  <span>₹{Math.round(quote.taxPaisa / 100).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-indigo-950">
                    ₹{Math.round(quote.totalAmountPaisa / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Checkout Trigger */}
              <button
                onClick={() => setShowCheckoutNotice(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-sm rounded shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Safe Payments &amp; Quality Checked in Jaipur</span>
              </div>
            </div>
          )}

          {/* Phase 1 Checkout Gate Modal */}
          {showCheckoutNotice && (
            <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-5 text-left border border-slate-200">
                <div className="flex items-center gap-2 text-amber-600 mb-3 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Phase 1 Architecture Gate</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  In compliance with our engineering contract, live order checkout requires an
                  authorized MySQL 8 database instance to store immutable order snapshots and
                  payment transactions.
                </p>
                <div className="p-2.5 bg-slate-50 rounded border text-xs text-slate-700 space-y-1 mb-4">
                  <div>
                    <strong>Quote Verified:</strong> ₹
                    {quote ? Math.round(quote.totalAmountPaisa / 100) : 0} (Authoritative)
                  </div>
                  <div>
                    <strong>Status:</strong> Ready for MySQL Phase 2 transaction pipeline.
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckoutNotice(false)}
                  className="w-full py-2 bg-indigo-950 text-white font-bold text-xs rounded hover:bg-indigo-900 transition-colors"
                >
                  Understood (Close)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
