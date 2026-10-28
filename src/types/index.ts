export type Role = 'admin' | 'owner' | 'staff';

export type BusinessType =
  | 'restaurant'
  | 'hotel'
  | 'cafe'
  | 'cafe_coffee_bar'
  | 'bakery'
  | 'bakery_pastry'
  | 'juice_chaat'
  | 'juice_shop'
  | 'grocery'
  | 'grocery_kirana'
  | 'retail'
  | 'retail_shop'
  | 'hardware'
  | 'hardware_building_materials'
  | 'other';

export type OrderSourceType = 'store' | 'menu';

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'pay_at_counter' | 'pending_verification';
export type PaymentMethod = 'upi' | 'cash' | 'card' | 'online' | 'counter';
export type FulfilmentMethod = 'pickup' | 'delivery' | 'dine_in' | 'takeaway';

export interface BusinessSocialLinks {
  googleBusiness?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  googleBusinessEnabled?: boolean;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  youtubeEnabled?: boolean;
}

export type StorefrontTemplateId = 'classic' | 'modern';

export interface StorefrontColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  button: string;
}

export interface StorefrontDesignSettings {
  templateId: StorefrontTemplateId;
  colors: StorefrontColors;
  coverImageUrl?: string;
  isPublished: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

export interface GstInvoiceSettings {
  isGstRegistered: boolean;
  gstin?: string;
  legalBusinessName?: string;
  registeredAddress?: string;
  defaultGstRate: number; // 0, 5, 12, 18, 28
  pricesIncludeGst: boolean; // true = inclusive, false = exclusive
  invoicePrefix?: string; // e.g. "INV-2026-"
  invoiceNotes?: string;
  hsnCodeDefault?: string;
  stateCode?: string;
}

export interface TaxBreakdown {
  isGstApplicable: boolean;
  gstRate: number;
  isTaxInclusive: boolean;
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstin?: string;
  legalBusinessName?: string;
  registeredAddress?: string;
  invoiceNumber?: string;
}

export interface BusinessSettings {
  modules: {
    store: boolean;
    menu: boolean;
  };
  isStoreOpen?: boolean; // Controls whether store is open for business
  onlineOrderingEnabled?: boolean; // Controls whether customers can place online orders
  orderSettings: {
    minStoreOrder: number;
    enableGst?: boolean;
    gstin?: string;
    taxRatePercentage: number;
    currencySymbol: string;
    currencyCode: string;
    enableDelivery: boolean;
    deliveryFee: number;
    enableTakeaway: boolean;
    enableDineIn: boolean;
    autoAcceptOrders: boolean;
    showCustomerPhone?: boolean;
    requireCustomerPhone?: boolean;
  };
  tokenPrefixStore: string; // e.g. "S-"
  tokenPrefixMenu: string;  // e.g. "M-"
  operatingHours: string;
  onboardingCompleted?: boolean;
  socialLinks?: BusinessSocialLinks;
  storefrontDesign?: StorefrontDesignSettings;
  gst?: GstInvoiceSettings;
  ownerName?: string;
  previousSlugs?: string[];
  aliases?: string[];
}

export interface ModuleEntitlement {
  allowed: boolean;
  isPrimaryModule: boolean;
  planId: string;
  planName: string;
  requiresUpgrade: boolean;
  reason: string;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  category?: BusinessType;
  ownerId?: string;
  ownerName?: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  isStoreOpen?: boolean;
  onlineOrderingEnabled?: boolean;
  storeEntitlement?: ModuleEntitlement;
  menuEntitlement?: ModuleEntitlement;
  settings: BusinessSettings;
  subscription: {
    planId: string;
    status: 'active' | 'trial' | 'expired' | 'suspended' | 'pending_payment';
    billingCycle: 'monthly' | 'annual';
    renewsAt: string;
    startsAt?: string;
    amount: number;
    previousPlanId?: string;
    scheduledDowngradePlanId?: string;
    scheduledDowngradeDate?: string;
    paymentProvider?: string;
    lastPaymentId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId?: string; // null if platform admin
  permissions?: string[];
  status?: 'active' | 'suspended';
  createdAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  sourceType: OrderSourceType; // 'store' for retail products, 'menu' for food/drink
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku?: string;
}

export interface ProductAddOn {
  id: string;
  name: string;
  price: number;
}

export interface DietaryFlags {
  isVeg?: boolean;
  isNonVeg?: boolean;
  isVegan?: boolean;
  isSpicy?: boolean;
  isJain?: boolean;
  isGlutenFree?: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  categoryId: string;
  sourceType: OrderSourceType; // 'store' vs 'menu'
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  sku?: string;
  barcode?: string;
  brand?: string;
  unit?: string; // piece, bag, box, kg, metre, litre, etc.
  minOrderQty?: number;
  stockQuantity?: number; // Retail inventory
  lowStockThreshold?: number;
  isAvailable: boolean;
  imageUrl?: string;
  sortOrder: number;
  dietaryFlags?: DietaryFlags;
  variants?: ProductVariant[];
  addOns?: ProductAddOn[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  selectedVariant?: { id: string; name: string; price: number };
  selectedAddOns?: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface CustomerDetails {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tableNumber?: string; // For dine-in restaurant menu orders
  roomNumber?: string;  // For hotel in-room dining orders
  floorNumber?: string; // Optional hotel floor
  notes?: string;
}

export interface HotelRoom {
  id: string;
  businessId: string;
  roomNumber: string;
  floor?: string;
  roomType?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  businessId: string;
  sourceType: OrderSourceType; // 'store' or 'menu' strictly isolated!
  tokenNumber: string;         // e.g. S-00101 or M-00101
  trackingId: string;          // Cryptographic random token for guest customer tracking
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  fulfilmentMethod: FulfilmentMethod;
  statusHistory: OrderStatusHistoryItem[];
  queueToken?: string;         // optional queue token if attached to queue
  taxBreakdown?: TaxBreakdown;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueToken {
  id: string;
  businessId: string;
  sourceType: OrderSourceType;
  tokenNumber: string;        // e.g. Q-S01 or Q-M01
  sequenceNumber: number;
  orderId?: string;
  customerName?: string;
  status: 'waiting' | 'called' | 'served' | 'skipped';
  counterNumber?: number;
  createdAt: string;
  calledAt?: string;
  servedAt?: string;
}

export interface NotificationItem {
  id: string;
  businessId: string;
  sourceType: OrderSourceType | 'system';
  title: string;
  message: string;
  orderId?: string;
  tokenNumber?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number; // e.g. 20 (INR ₹20/month base)
  priceAnnual: number;  // e.g. 200 (INR ₹200/year)
  features: string[];
  maxProducts: number;
  maxCategories: number;
  maxStaff: number;
  allowsStore: boolean;
  allowsMenu: boolean;
  allowsTvDisplay: boolean;
  allowsAnalytics: boolean;
  isPopular?: boolean;
  isVisible?: boolean;
  customUpi?: boolean;
}

export interface BusinessPlanUsage {
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
    allowsStore: boolean;
    allowsMenu: boolean;
  };
  products: {
    count: number;
    max: number;
    remaining: number;
    percentage: number;
    isLimitReached: boolean;
  };
  categories: {
    count: number;
    max: number;
    remaining: number;
    percentage: number;
    isLimitReached: boolean;
  };
}

export interface BusinessUpiSettings {
  businessId: string;
  upiId: string;
  payeeName: string;
  qrImageUrl?: string;
  instructions?: string;
  storeUrl?: string;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPayment {
  id: string;
  businessId: string;
  planId: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  status: 'pending' | 'pending_verification' | 'completed' | 'failed' | 'cancelled';
  paymentReference?: string;
  paymentMethod: string;
  paymentProvider?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  previousPlanId?: string;
  startsAt?: string;
  expiresAt?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  metadata?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistory {
  id: string;
  businessId: string;
  previousPlanId?: string;
  newPlanId: string;
  changeType: 'initial' | 'upgrade' | 'downgrade_scheduled' | 'downgrade_applied' | 'downgrade_cancelled' | 'renewal' | 'expired';
  paymentId?: string;
  amount?: number;
  effectiveDate: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  businessId?: string;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
  ipAddress?: string;
  targetEntity?: string;
  targetId?: string;
  reason?: string;
  result?: string;
  beforeValues?: any;
  afterValues?: any;
  timestamp: string;
}

export interface AdminRoleRecord {
  id: string;
  userId: string;
  role: 'super_admin' | 'admin';
  createdAt: string;
  createdBy?: string;
}

export interface PlatformSettings {
  platformName: string;
  legalCompanyName: string;
  supportEmail: string;
  publicWebsiteUrl: string;
  contactPhone: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  diamondPlanAvailable: boolean;
  supportedCategories: string[];
  defaultBranding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}
