/**
 * Shared TypeScript Contracts & Domain Entities
 * Personalised Indian E-Commerce Platform (Single-Owner Store)
 */

export type Role = 'CUSTOMER' | 'ADMIN' | 'STAFF' | 'SUPERADMIN';

export type SlotType = 'TEXT' | 'PHOTO' | 'DATE' | 'SELECT' | 'COLOR';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'PROCESSING_CUSTOMISATION'
  | 'PRINTING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type PaymentProvider = 'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'COD';

export type CourierPartner = 'DELHIVERY' | 'BLUEDART' | 'EKART' | 'DTDC' | 'INDIA_POST';

export interface Category {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  bannerUrl?: string;
  itemCount: number;
  featured: boolean;
  displayOrder: number;
}

export interface CustomisationSlotDefinition {
  slotKey: string;
  slotType: SlotType;
  label: string;
  placeholder?: string;
  required: boolean;
  maxLength?: number;
  options?: string[];
  helpText?: string;
  allowedMimes?: string[];
  maxFileSizeMb?: number;
  aspectRatio?: string;
}

export interface CustomisationTemplate {
  id: string;
  productId: string;
  templateKey: string;
  name: string;
  description: string;
  previewBaseImageUrl: string;
  slots: CustomisationSlotDefinition[];
  schemaVersion: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  attributeType: string; // e.g. "Size", "Frame Material", "Color"
  attributeValue: string; // e.g. "8x10 inch", "12x18 inch", "Teak Wood"
  additionalPaisa: number; // in Indian Paisa (100 Paisa = 1 INR)
  stockQuantity: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  slug: string;
  categorySlug: string;
  shortSummary: string;
  description: string;
  basePricePaisa: number; // e.g. 49900 = ₹499.00
  originalMspPaisa: number; // e.g. 99900 = ₹999.00
  discountPercent: number;
  isPersonalised: boolean;
  leadTimeDays: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  ratingAverage: number;
  ratingCount: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'MADE_TO_ORDER';
  images: {
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
  }[];
  variants: ProductVariant[];
  customisationTemplate?: CustomisationTemplate;
  tags: string[];
  features: string[];
  specifications: Record<string, string>;
  isDevelopmentFixture?: boolean;
}

export interface CustomisationValueInput {
  slotKey: string;
  textValue?: string;
  photoUrl?: string;
  previewThumbnailUrl?: string;
  selectedOption?: string;
  fileName?: string;
  fileSizeBytes?: number;
  isLocalPreview?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string;
  variantTitle?: string;
  variantAdditionalPaisa: number;
  quantity: number;
  customisationValues: CustomisationValueInput[];
  calculatedLineTotalPaisa: number;
}

export interface PriceQuoteRequest {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    customisationValues: CustomisationValueInput[];
  }[];
  couponCode?: string;
  shippingPincode?: string;
}

export interface PriceQuoteResponse {
  subtotalPaisa: number;
  customisationFeePaisa: number;
  variantUpgradesPaisa: number;
  discountPaisa: number;
  appliedCoupon?: {
    code: string;
    discountPaisa: number;
    description: string;
  };
  deliveryFeePaisa: number;
  isFreeDelivery: boolean;
  freeDeliveryThresholdPaisa: number;
  taxPaisa: number; // 18% GST (already inclusive or broken down)
  totalAmountPaisa: number;
  currency: 'INR';
  isPincodeDeliverable: boolean;
  estimatedDeliveryDateText?: string;
  serverTimestamp: string;
}

export interface IndianPincodeInfo {
  pincode: string;
  city: string;
  state: string;
  isDeliverable: boolean;
  isExpressAvailable: boolean;
  standardDays: number;
  expressDays: number;
  codAvailable: boolean;
}

export interface HealthStatusResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  service: string;
  environment: string;
  database: {
    configured: boolean;
    provider: 'mysql';
    connected: boolean;
    message: string;
    schemaStatus: 'applied' | 'migration_pending' | 'unconnected';
    databaseUrlMasked?: string;
    readiness?: 'ready' | 'degraded_preview' | 'unavailable';
  };
  storage: {
    driver: string;
    mode: 'temporary-preview' | 'persistent-storage';
    persistent: boolean;
    active: boolean;
    maxUploadMb: number;
    message?: string;
  };
  security: {
    corsConfigured: boolean;
    rateLimitingEnabled: boolean;
    mfaRequiredByPolicy: boolean;
    mfaOperational: boolean;
    mfaEnforced: boolean;
  };
  uptimeSeconds: number;
  timestamp: string;
}
