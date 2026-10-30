import { Pool, QueryResult, QueryResultRow } from 'pg';
import {
  Business,
  Category,
  Product,
  Order,
  QueueToken,
  NotificationItem,
  SubscriptionPlan,
  AuditLog,
  User,
  Role,
  OrderSourceType,
  HotelRoom,
  PosBill,
  PosBillItem,
} from '@/types';

// Supabase Connection URL with verified IPv4/IPv6 compatibility (use port 6543 for transaction pooling)
const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

// Ensure Supabase pooler uses transaction mode (port 6543) instead of session mode (port 5432 with 15 client cap)
const connectionString = rawConnectionString.replace(
  'pooler.supabase.com:5432',
  'pooler.supabase.com:6543'
);

// Global singleton to prevent connection leaks across Next.js dev server hot-reloads
const globalForPg = globalThis as unknown as { _pgPool?: Pool };
let isConnected = false;

export function getPgPool(): Pool {
  if (!globalForPg._pgPool) {
    globalForPg._pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    globalForPg._pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return globalForPg._pgPool;
}

export async function checkPgConnection(): Promise<boolean> {
  try {
    const p = getPgPool();
    await p.query('SELECT 1;');
    isConnected = true;
    return true;
  } catch (err) {
    console.error('PostgreSQL connectivity check failed:', err);
    isConnected = false;
    return false;
  }
}

export async function pgQuery<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const p = getPgPool();
  return p.query<T>(text, params);
}

// Data Mappers: Database snake_case <-> TypeScript camelCase

export function mapRowToBusiness(r: any): Business {
  const settings = typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings || {});
  const isStoreOpen = r.is_store_open !== undefined && r.is_store_open !== null
    ? Boolean(r.is_store_open)
    : (settings.isStoreOpen !== undefined ? Boolean(settings.isStoreOpen) : true);
  const onlineOrderingEnabled = r.online_ordering_enabled !== undefined && r.online_ordering_enabled !== null
    ? Boolean(r.online_ordering_enabled)
    : (settings.onlineOrderingEnabled !== undefined ? Boolean(settings.onlineOrderingEnabled) : true);

  settings.isStoreOpen = isStoreOpen;
  settings.onlineOrderingEnabled = onlineOrderingEnabled;

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type,
    category: r.type,
    ownerId: r.owner_id || undefined,
    ownerName: r.owner_name || settings.ownerName || undefined,
    description: r.description || '',
    email: r.email,
    phone: r.phone,
    address: r.address,
    logoUrl: r.logo_url || undefined,
    coverImageUrl: r.cover_image_url || settings.coverImageUrl || settings.storefrontDesign?.coverImageUrl || undefined,
    isStoreOpen,
    onlineOrderingEnabled,
    settings,
    subscription: typeof r.subscription === 'string' ? JSON.parse(r.subscription) : r.subscription,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
  };
}

export function mapRowToCategory(r: any): Category {
  return {
    id: r.id,
    businessId: r.business_id,
    sourceType: r.source_type as OrderSourceType,
    name: r.name,
    slug: r.slug,
    description: r.description || undefined,
    imageUrl: r.image_url || undefined,
    sortOrder: r.sort_order || 0,
    isActive: r.is_active !== false,
    salesChannel: (r.sales_channel as any) || 'both',
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
  };
}

export function mapRowToProduct(r: any): Product {
  return {
    id: r.id,
    businessId: r.business_id,
    categoryId: r.category_id,
    sourceType: r.source_type as OrderSourceType,
    name: r.name,
    description: r.description || undefined,
    price: parseFloat(r.price),
    salePrice: r.sale_price !== null && r.sale_price !== undefined ? parseFloat(r.sale_price) : undefined,
    sku: r.sku || undefined,
    barcode: r.barcode || undefined,
    brand: r.brand || undefined,
    unit: r.unit || undefined,
    size: r.size || undefined,
    minOrderQty: r.min_order_qty !== null && r.min_order_qty !== undefined ? parseFloat(r.min_order_qty) : undefined,
    stockQuantity: r.stock_quantity !== null && r.stock_quantity !== undefined ? parseInt(r.stock_quantity, 10) : undefined,
    lowStockThreshold: r.low_stock_threshold ? parseInt(r.low_stock_threshold, 10) : 5,
    isAvailable: r.is_available !== false,
    salesChannel: (r.sales_channel as any) || 'both',
    imageUrl: r.image_url || undefined,
    sortOrder: r.sort_order || 0,
    dietaryFlags: typeof r.dietary_flags === 'string' ? JSON.parse(r.dietary_flags) : r.dietary_flags || {},
    variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : r.variants || [],
    addOns: typeof r.add_ons === 'string' ? JSON.parse(r.add_ons) : r.add_ons || [],
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
  };
}

export function mapRowToOrder(r: any): Order {
  return {
    id: r.id,
    businessId: r.business_id,
    sourceType: r.source_type as OrderSourceType,
    tokenNumber: r.token_number,
    trackingId: r.tracking_id,
    customer: typeof r.customer === 'string' ? JSON.parse(r.customer) : r.customer,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    subtotal: parseFloat(r.subtotal),
    tax: parseFloat(r.tax || '0'),
    deliveryFee: parseFloat(r.delivery_fee || '0'),
    discount: parseFloat(r.discount || '0'),
    total: parseFloat(r.total),
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    orderStatus: r.order_status,
    fulfilmentMethod: r.fulfilment_method,
    queueToken: r.queue_token || undefined,
    taxBreakdown: r.tax_breakdown ? (typeof r.tax_breakdown === 'string' ? JSON.parse(r.tax_breakdown) : r.tax_breakdown) : undefined,
    invoiceNumber: r.invoice_number || undefined,
    statusHistory: typeof r.status_history === 'string' ? JSON.parse(r.status_history) : r.status_history || [],
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
  };
}

export function mapRowToQueueToken(r: any): QueueToken {
  return {
    id: r.id,
    businessId: r.business_id,
    sourceType: r.source_type as OrderSourceType,
    tokenNumber: r.token_number,
    sequenceNumber: parseInt(r.sequence_number, 10),
    orderId: r.order_id || undefined,
    customerName: r.customer_name || undefined,
    status: r.status,
    counterNumber: r.counter_number ? parseInt(r.counter_number, 10) : undefined,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    calledAt: r.called_at?.toISOString ? r.called_at.toISOString() : r.called_at,
    servedAt: r.served_at?.toISOString ? r.served_at.toISOString() : r.served_at,
  };
}

export function mapRowToNotification(r: any): NotificationItem {
  return {
    id: r.id,
    businessId: r.business_id,
    sourceType: r.source_type,
    title: r.title,
    message: r.message,
    orderId: r.order_id || undefined,
    tokenNumber: r.token_number || undefined,
    isRead: r.is_read === true,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
  };
}

export function mapRowToSubscriptionPlan(r: any): SubscriptionPlan {
  const isGold = r.id === 'plan_gold';
  const isDiamond = r.id === 'plan_diamond';
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description || '',
    priceMonthly: parseFloat(r.price_monthly),
    priceAnnual: parseFloat(r.price_annual),
    validityDaysMonthly: parseInt(r.validity_days_monthly, 10) || 30,
    validityDaysAnnual: parseInt(r.validity_days_annual, 10) || 365,
    features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features || [],
    maxProducts: r.max_products !== undefined && r.max_products !== null ? parseInt(r.max_products, 10) : (isGold ? 50 : isDiamond ? 99999 : 20),
    maxCategories: r.max_categories !== undefined && r.max_categories !== null ? parseInt(r.max_categories, 10) : (isGold ? 30 : isDiamond ? 9999 : 10),
    maxStaff: parseInt(r.max_staff, 10) || 1,
    allowsStore: r.allows_store === true,
    allowsMenu: r.allows_menu === true,
    allowsTvDisplay: r.allows_tv_display === true,
    allowsAnalytics: r.allows_analytics === true,
    isPopular: r.is_popular === true,
    isVisible: r.is_visible !== false,
    customUpi: r.custom_upi === true,
  };
}

export function mapRowToUpiSettings(r: any) {
  return {
    businessId: r.business_id,
    upiId: r.upi_id,
    payeeName: r.payee_name,
    qrImageUrl: r.qr_image_url || undefined,
    instructions: r.instructions || undefined,
    storeUrl: r.store_url || undefined,
    isEnabled: r.is_enabled !== false,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

export function mapRowToSubscriptionPayment(r: any) {
  return {
    id: r.id,
    businessId: r.business_id,
    planId: r.plan_id,
    amount: parseFloat(r.amount),
    currency: r.currency || 'INR',
    billingCycle: r.billing_cycle || 'monthly',
    status: r.status || 'pending',
    paymentReference: r.payment_reference || undefined,
    paymentMethod: r.payment_method || 'upi',
    paymentProvider: r.payment_provider || 'razorpay',
    razorpayOrderId: r.razorpay_order_id || undefined,
    razorpayPaymentId: r.razorpay_payment_id || undefined,
    razorpaySignature: r.razorpay_signature || undefined,
    previousPlanId: r.previous_plan_id || undefined,
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : undefined,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
    verificationStatus: r.verification_status || 'pending',
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
    notes: r.notes || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function mapRowToSubscriptionHistory(r: any) {
  return {
    id: r.id,
    businessId: r.business_id,
    previousPlanId: r.previous_plan_id || undefined,
    newPlanId: r.new_plan_id,
    changeType: r.change_type,
    paymentId: r.payment_id || undefined,
    amount: r.amount !== null && r.amount !== undefined ? parseFloat(r.amount) : undefined,
    effectiveDate: r.effective_date ? new Date(r.effective_date).toISOString() : new Date().toISOString(),
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapRowToUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as Role,
    businessId: r.business_id || undefined,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions || [],
    status: (r.status as 'active' | 'suspended') || 'active',
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
  };
}

export function mapRowToAuditLog(r: any): AuditLog {
  return {
    id: r.id,
    businessId: r.business_id || undefined,
    userId: r.user_id || undefined,
    userName: r.user_name || undefined,
    action: r.action,
    details: r.details || '',
    ipAddress: r.ip_address || undefined,
    targetEntity: r.target_entity || undefined,
    targetId: r.target_id || undefined,
    reason: r.reason || undefined,
    result: r.result || 'success',
    beforeValues: typeof r.before_values === 'string' ? JSON.parse(r.before_values) : r.before_values || undefined,
    afterValues: typeof r.after_values === 'string' ? JSON.parse(r.after_values) : r.after_values || undefined,
    timestamp: r.timestamp?.toISOString ? r.timestamp.toISOString() : r.timestamp,
  };
}

export function mapRowToHotelRoom(r: any): HotelRoom {
  return {
    id: r.id,
    businessId: r.business_id,
    roomNumber: r.room_number,
    floor: r.floor || undefined,
    roomType: r.room_type || undefined,
    isActive: Boolean(r.is_active),
    notes: r.notes || undefined,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
  };
}

export function mapRowToPosBillItem(r: any): PosBillItem {
  return {
    id: r.id,
    billId: r.bill_id,
    businessId: r.business_id,
    productId: r.product_id || undefined,
    productName: r.product_name,
    variantName: r.variant_name || undefined,
    size: r.size || undefined,
    unit: r.unit || undefined,
    unitPrice: parseFloat(r.unit_price || '0'),
    quantity: parseFloat(r.quantity || '1'),
    totalPrice: parseFloat(r.total_price || '0'),
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
  };
}

export function mapRowToPosBill(r: any): PosBill {
  let items: PosBillItem[] = [];
  if (r.items) {
    items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items;
  }
  return {
    id: r.id,
    businessId: r.business_id,
    billNumber: r.bill_number,
    source: r.bill_source === 'calculator' ? 'calculator' : 'pos',
    customerName: r.customer_name || undefined,
    customerPhone: r.customer_phone || undefined,
    subtotal: parseFloat(r.subtotal || '0'),
    discountType: r.discount_type || 'fixed',
    discountRate: parseFloat(r.discount_rate || '0'),
    discountAmount: parseFloat(r.discount_amount || '0'),
    taxRate: parseFloat(r.tax_rate || '0'),
    taxAmount: parseFloat(r.tax_amount || '0'),
    totalAmount: parseFloat(r.total_amount || '0'),
    paymentMethod: r.payment_method || 'cash',
    paymentStatus: r.payment_status || 'paid',
    status: r.status || 'completed',
    notes: r.notes || undefined,
    createdBy: r.created_by || undefined,
    items,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
  };
}

