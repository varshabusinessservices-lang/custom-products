/**
 * Security Foundation & Authoritative Price Calculation Engine
 * Indian Personalised Products E-Commerce Platform
 */

import { Request, Response, NextFunction } from 'express';
import { PriceQuoteRequest, PriceQuoteResponse, Product, CustomisationValueInput } from '../shared/types';
import { FIXTURE_PRODUCTS, FIXTURE_COUPONS, lookupPincode } from '../shared/fixtures';

// Rate Limiter: In-memory sliding window
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 120; // 120 req/min

  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry after some time.',
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  record.count += 1;
  next();
}

// Security Headers Middleware
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Restrict caching on sensitive API endpoints
  if (req.path.startsWith('/api/v1/admin') || req.path.startsWith('/api/v1/cart')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
}

// Input sanitizer for strings
export function sanitizeString(input: unknown, maxLength = 255): string {
  if (typeof input !== 'string') return '';
  // Strip control characters and trim
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

// PII Scrubber for logging
export function scrubPii(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'mfaSecret', 'creditCard', 'cvv'];
  const cleaned: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      cleaned[key] = '[REDACTED_SECRET]';
    } else if (key.toLowerCase().includes('phone') && typeof val === 'string') {
      cleaned[key] = val.length > 5 ? val.slice(0, 3) + '****' + val.slice(-2) : '[REDACTED_PHONE]';
    } else if (key.toLowerCase().includes('email') && typeof val === 'string') {
      const parts = val.split('@');
      cleaned[key] = parts.length === 2 ? parts[0].slice(0, 2) + '***@' + parts[1] : '[REDACTED_EMAIL]';
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = scrubPii(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Authoritative Server-Side Price Calculation Engine
 * NEVER trusts client totals or client discounts.
 * Calculates exact subtotal, variant surcharges, coupon discounts, GST, and shipping.
 */
export function calculateAuthoritativeQuote(
  payload: PriceQuoteRequest,
  catalogProducts: Product[] = FIXTURE_PRODUCTS
): { success: true; quote: PriceQuoteResponse } | { success: false; error: string; statusCode: number } {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { success: false, error: 'Quote request must include at least one item.', statusCode: 400 };
  }

  let subtotalPaisa = 0;
  let variantUpgradesPaisa = 0;
  const customisationFeePaisa = 0; // standard customisation included in base price

  for (const item of payload.items) {
    if (!item.productId || typeof item.productId !== 'string') {
      return { success: false, error: 'Invalid product ID specified in quote request.', statusCode: 400 };
    }

    const qty = Math.floor(Number(item.quantity) || 1);
    if (qty <= 0 || qty > 50) {
      return { success: false, error: 'Item quantity must be between 1 and 50.', statusCode: 400 };
    }

    // Look up authoritative product in catalog
    const product = catalogProducts.find((p) => p.id === item.productId || p.slug === item.productId);
    if (!product) {
      return { success: false, error: `Product '${item.productId}' not found in authoritative catalog.`, statusCode: 404 };
    }

    // Check base price
    subtotalPaisa += product.basePricePaisa * qty;

    // Check variant if supplied
    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId || v.sku === item.variantId);
      if (!variant) {
        return { success: false, error: `Variant '${item.variantId}' does not belong to product '${product.title}'.`, statusCode: 400 };
      }
      variantUpgradesPaisa += variant.additionalPaisa * qty;
    }

    // Server-side customisation slot validation
    if (product.isPersonalised && product.customisationTemplate) {
      const validation = validateItemCustomisation(product, item.customisationValues || []);
      const isStrict = (payload as any).strictCustomisation === true;
      if (isStrict && !validation.valid) {
        return {
          success: false,
          error: `Incomplete customisation for '${product.title}'. Missing required fields: ${validation.missingSlots.join(', ')}.`,
          statusCode: 400,
        };
      }
    }
  }

  const grossItemsPaisa = subtotalPaisa + variantUpgradesPaisa;

  // Authoritative Coupon Validation
  let discountPaisa = 0;
  let appliedCoupon: PriceQuoteResponse['appliedCoupon'] | undefined = undefined;

  if (payload.couponCode) {
    const cleanCoupon = sanitizeString(payload.couponCode).toUpperCase();
    const foundCoupon = FIXTURE_COUPONS.find((c) => c.code === cleanCoupon);

    if (foundCoupon) {
      if (grossItemsPaisa >= foundCoupon.minOrderPaisa) {
        if (foundCoupon.discountType === 'FLAT') {
          discountPaisa = foundCoupon.discountPaisa;
        } else if (foundCoupon.discountType === 'PERCENT') {
          const rawDiscount = Math.round((grossItemsPaisa * foundCoupon.percentage) / 100);
          discountPaisa = foundCoupon.maxDiscountPaisa ? Math.min(rawDiscount, foundCoupon.maxDiscountPaisa) : rawDiscount;
        }

        // Never let discount exceed items total
        discountPaisa = Math.min(discountPaisa, grossItemsPaisa);

        appliedCoupon = {
          code: foundCoupon.code,
          discountPaisa,
          description: foundCoupon.description,
        };
      }
    }
  }

  // Delivery Calculation: Free above ₹499 (49900 Paisa), else ₹60 (6000 Paisa)
  const freeDeliveryThresholdPaisa = 49900;
  const isFreeDelivery = grossItemsPaisa - discountPaisa >= freeDeliveryThresholdPaisa;
  const deliveryFeePaisa = isFreeDelivery ? 0 : 6000;

  // Pincode validation
  let isPincodeDeliverable = true;
  let estimatedDeliveryDateText: string | undefined = undefined;

  if (payload.shippingPincode) {
    const pinInfo = lookupPincode(payload.shippingPincode);
    isPincodeDeliverable = pinInfo.isDeliverable;
    if (pinInfo.isDeliverable) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + pinInfo.standardDays);
      estimatedDeliveryDateText = deliveryDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  const netPaisa = grossItemsPaisa - discountPaisa + deliveryFeePaisa;
  // Indian GST 18% inclusive breakdown (Round to nearest Paisa)
  const taxPaisa = Math.round((netPaisa * 18) / 118);

  const quote: PriceQuoteResponse = {
    subtotalPaisa,
    customisationFeePaisa,
    variantUpgradesPaisa,
    discountPaisa,
    appliedCoupon,
    deliveryFeePaisa,
    isFreeDelivery,
    freeDeliveryThresholdPaisa,
    taxPaisa,
    totalAmountPaisa: Math.max(0, netPaisa),
    currency: 'INR',
    isPincodeDeliverable,
    estimatedDeliveryDateText,
    serverTimestamp: new Date().toISOString(),
  };

  return { success: true, quote };
}

export interface CustomisationValidationResult {
  valid: boolean;
  missingSlots: string[];
  fieldErrors: Record<string, string>;
}

/**
 * Validates that all required customisation slots are strictly satisfied with valid inputs.
 * For photos: rejects empty, placeholder, or blank values.
 * For text: rejects empty strings or strings exceeding slot.maxLength.
 */
export function validateItemCustomisation(
  product: Product,
  values: CustomisationValueInput[] = []
): CustomisationValidationResult {
  if (!product.isPersonalised || !product.customisationTemplate) {
    return { valid: true, missingSlots: [], fieldErrors: {} };
  }

  const missingSlots: string[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const slot of product.customisationTemplate.slots) {
    if (!slot.required) continue;

    const match = values.find((v) => v.slotKey === slot.slotKey);

    if (slot.slotType === 'TEXT' || slot.slotType === 'DATE') {
      const val = match?.textValue?.trim() || '';
      if (!val) {
        missingSlots.push(slot.slotKey);
        fieldErrors[slot.slotKey] = `${slot.label} is required.`;
      } else if (slot.maxLength && val.length > slot.maxLength) {
        missingSlots.push(slot.slotKey);
        fieldErrors[slot.slotKey] = `${slot.label} cannot exceed ${slot.maxLength} characters.`;
      }
    } else if (slot.slotType === 'PHOTO') {
      const photo = match?.photoUrl?.trim() || '';
      // Reject empty string or placeholder values
      if (!photo || photo === 'placeholder' || photo.startsWith('placeholder_')) {
        missingSlots.push(slot.slotKey);
        fieldErrors[slot.slotKey] = `Photo upload is required for '${slot.label}'. Please choose an image file.`;
      }
    } else if (slot.slotType === 'SELECT') {
      const opt = match?.selectedOption?.trim() || '';
      if (!opt) {
        missingSlots.push(slot.slotKey);
        fieldErrors[slot.slotKey] = `Please select an option for '${slot.label}'.`;
      }
    }
  }

  return {
    valid: missingSlots.length === 0,
    missingSlots,
    fieldErrors,
  };
}

