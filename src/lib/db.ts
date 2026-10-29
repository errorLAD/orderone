import fs from 'fs';
import path from 'path';
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
  OrderSourceType,
  OrderStatus,
  BusinessUpiSettings,
  SubscriptionPayment,
  SubscriptionHistory,
  HotelRoom,
  CustomerDetails,
  PosBill,
  PosBillItem,
  CreatePosBillInput,
  StorefrontDesignSettings,
  QrCustomizationSettings,
  GstInvoiceSettings,
} from '@/types';
import { generateId, generateTrackingId } from './utils';
import { resolveBusinessByIdOrSlug, generateUniqueBusinessSlug } from './slug';
import {
  pgQuery,
  mapRowToBusiness,
  mapRowToCategory,
  mapRowToProduct,
  mapRowToOrder,
  mapRowToQueueToken,
  mapRowToNotification,
  mapRowToSubscriptionPlan,
  mapRowToUpiSettings,
  mapRowToSubscriptionPayment,
  mapRowToSubscriptionHistory,
  mapRowToHotelRoom,
  mapRowToPosBill,
  mapRowToPosBillItem,
} from './postgres';
import { assertCanCreateRecord, hasActiveGoldAccess } from './subscriptionLimits';
import { calculateOrderTax, generateInvoiceNumber } from './gstCalculator';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'saas_database.json');

export interface DatabaseSchema {
  businesses: Business[];
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  queueTokens: QueueToken[];
  notifications: NotificationItem[];
  subscriptionPlans: SubscriptionPlan[];
  auditLogs: AuditLog[];
  hotelRooms?: HotelRoom[];
  sequences: {
    [key: string]: number; // key format: `${businessId}_${sourceType}`
  };
}

// Initial Clean Empty Schema (Production Supabase Driven)
const EMPTY_DB: DatabaseSchema = {
  businesses: [],
  users: [],
  categories: [],
  products: [],
  orders: [],
  queueTokens: [],
  notifications: [],
  subscriptionPlans: [],
  auditLogs: [],
  hotelRooms: [],
  sequences: {},
};

// Database Initializer & Persistence Engine
function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = { ...EMPTY_DB };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db: DatabaseSchema = JSON.parse(raw);
    return db;
  } catch (error) {
    console.error('Failed to load database, using empty schema:', error);
    return { ...EMPTY_DB };
  }
}

let cachedDb: DatabaseSchema = loadDatabase();

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(cachedDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Failed to save database atomically:', error);
  }
}

// Synchronize in-memory cache with live Supabase PostgreSQL
export async function syncWithPostgres(): Promise<boolean> {
  try {
    const [bizRes, catRes, prodRes, ordRes, qRes, notifRes, planRes] = await Promise.all([
      pgQuery('SELECT * FROM public.businesses ORDER BY created_at ASC'),
      pgQuery('SELECT * FROM public.categories ORDER BY sort_order ASC'),
      pgQuery('SELECT * FROM public.products ORDER BY sort_order ASC'),
      pgQuery('SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 500'),
      pgQuery('SELECT * FROM public.queue_tokens ORDER BY created_at ASC LIMIT 200'),
      pgQuery('SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 100'),
      pgQuery('SELECT * FROM public.subscription_plans ORDER BY price_monthly ASC'),
    ]);

    if (bizRes.rows.length > 0) {
      cachedDb.businesses = bizRes.rows.map(mapRowToBusiness);
    }
    if (catRes.rows.length > 0) {
      cachedDb.categories = catRes.rows.map(mapRowToCategory);
    }
    if (prodRes.rows.length > 0) {
      cachedDb.products = prodRes.rows.map(mapRowToProduct);
    }
    if (ordRes.rows.length > 0) {
      cachedDb.orders = ordRes.rows.map(mapRowToOrder);
    }
    if (qRes.rows.length > 0) {
      cachedDb.queueTokens = qRes.rows.map(mapRowToQueueToken);
    }
    if (notifRes.rows.length > 0) {
      cachedDb.notifications = notifRes.rows.map(mapRowToNotification);
    }
    if (planRes.rows.length > 0) {
      cachedDb.subscriptionPlans = planRes.rows.map(mapRowToSubscriptionPlan);
    }

    // Persist latest PG sync into local file cache so cold restarts load the real database
    saveDatabase();
    return true;
  } catch (err) {
    console.error('syncWithPostgres failed:', err);
    return false;
  }
}

// Background initial sync
syncWithPostgres().catch(() => {});

// Memory Realtime Subscribers for Live Server-Sent Events / Order Updates
type OrderListener = (event: { type: string; order: Order; notification: NotificationItem }) => void;

const globalForOrders = globalThis as unknown as {
  __orderone_order_listeners__?: OrderListener[];
};

if (!globalForOrders.__orderone_order_listeners__) {
  globalForOrders.__orderone_order_listeners__ = [];
}

const orderListeners: OrderListener[] = globalForOrders.__orderone_order_listeners__;

export function subscribeToOrders(listener: OrderListener): () => void {
  orderListeners.push(listener);
  return () => {
    const idx = orderListeners.indexOf(listener);
    if (idx !== -1) orderListeners.splice(idx, 1);
  };
}

function broadcastOrderEvent(order: Order, notification: NotificationItem) {
  const currentListeners = globalForOrders.__orderone_order_listeners__ || orderListeners;
  for (const listener of currentListeners) {
    try {
      listener({ type: 'ORDER_CREATED', order, notification });
    } catch (e) {
      console.error('Error in order listener:', e);
    }
  }
}

// --- DATABASE OPERATIONS ---

// 1. Business Management & Isolation
export async function getBusinessById(businessId: string): Promise<Business | null> {
  let business: Business | null = null;
  try {
    const res = await pgQuery(
      `SELECT b.*, u.name as owner_name 
       FROM public.businesses b 
       LEFT JOIN public.users u ON b.owner_id = u.id 
       WHERE b.id = $1`,
      [businessId]
    );
    if (res.rows.length > 0) {
      business = mapRowToBusiness(res.rows[0]);
      const idx = cachedDb.businesses.findIndex((b) => b.id === businessId);
      if (idx !== -1) cachedDb.businesses[idx] = business;
      else cachedDb.businesses.push(business);
    }
  } catch (err) {}
  if (!business) {
    business = cachedDb.businesses.find((b) => b.id === businessId) || null;
  }
  if (!business || !business.subscription) return business;

  const nowMs = Date.now();
  const sub = business.subscription;
  const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : 0;

  // Apply scheduled downgrade if due
  if (
    sub.scheduledDowngradePlanId &&
    sub.scheduledDowngradeDate &&
    nowMs >= new Date(sub.scheduledDowngradeDate).getTime()
  ) {
    sub.previousPlanId = sub.planId;
    sub.planId = sub.scheduledDowngradePlanId;
    delete sub.scheduledDowngradePlanId;
    delete sub.scheduledDowngradeDate;
    if (sub.planId === 'plan_basic') {
      business.settings.modules.store = false;
    }
  }

  // Apply expiration if due
  if (sub.status === 'active' && renewsAtMs > 0 && nowMs > renewsAtMs) {
    sub.status = 'expired';
  }

  return business;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  try {
    const resolved = await resolveBusinessByIdOrSlug(slug);
    if (resolved) {
      const idx = cachedDb.businesses.findIndex((b) => b.id === resolved.id);
      if (idx !== -1) cachedDb.businesses[idx] = resolved;
      else cachedDb.businesses.push(resolved);
      return resolved;
    }
  } catch (err) {
    console.error('getBusinessBySlug postgres resolution error:', err);
  }
  const clean = (slug || '').toLowerCase().trim();
  return (
    cachedDb.businesses.find(
      (b) =>
        b.slug.toLowerCase() === clean ||
        b.id === clean ||
        b.settings?.previousSlugs?.some((ps) => ps.toLowerCase() === clean) ||
        b.settings?.aliases?.some((al) => al.toLowerCase() === clean)
    ) || null
  );
}

export async function getAllBusinesses(): Promise<Business[]> {
  try {
    const res = await pgQuery(
      `SELECT b.*, u.name as owner_name 
       FROM public.businesses b 
       LEFT JOIN public.users u ON b.owner_id = u.id 
       ORDER BY b.created_at ASC`
    );
    if (res.rows.length > 0) {
      const items = res.rows.map(mapRowToBusiness);
      cachedDb.businesses = items;
      return items;
    }
  } catch (err) {}
  return [...cachedDb.businesses];
}

export async function getBusinessesByOwnerId(ownerId: string): Promise<Business[]> {
  try {
    const res = await pgQuery(
      `SELECT b.*, u.name as owner_name 
       FROM public.businesses b 
       LEFT JOIN public.users u ON b.owner_id = u.id 
       WHERE b.owner_id = $1 
       ORDER BY b.created_at ASC`,
      [ownerId]
    );
    if (res.rows.length > 0) {
      const items = res.rows.map(mapRowToBusiness);
      for (const b of items) {
        const idx = cachedDb.businesses.findIndex((x) => x.id === b.id);
        if (idx !== -1) cachedDb.businesses[idx] = b;
        else cachedDb.businesses.push(b);
      }
      return items;
    }
  } catch (err) {}
  return cachedDb.businesses.filter((b) => b.ownerId === ownerId);
}

export async function createBusiness(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> {
  const newBusiness: Business = {
    ...data,
    id: generateId('biz'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cachedDb.businesses.push(newBusiness);
  // Initialize sequence counters
  cachedDb.sequences[`${newBusiness.id}_store`] = 100;
  cachedDb.sequences[`${newBusiness.id}_menu`] = 100;

  try {
    await pgQuery(`
      INSERT INTO public.businesses (id, slug, name, type, owner_id, description, email, phone, address, logo_url, settings, subscription, is_store_open, online_ordering_enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      newBusiness.id, newBusiness.slug, newBusiness.name, newBusiness.type, newBusiness.ownerId || null, newBusiness.description,
      newBusiness.email, newBusiness.phone, newBusiness.address, newBusiness.logoUrl || null,
      JSON.stringify(newBusiness.settings), JSON.stringify(newBusiness.subscription),
      newBusiness.isStoreOpen ?? true, newBusiness.onlineOrderingEnabled ?? true,
      newBusiness.createdAt, newBusiness.updatedAt
    ]);

    await pgQuery(`
      INSERT INTO public.order_sequences (business_id, source_type, current_value)
      VALUES ($1, 'store', 100), ($1, 'menu', 100)
      ON CONFLICT DO NOTHING;
    `, [newBusiness.id]);
  } catch (err) {
    console.error('pg createBusiness write error:', err);
  }

  // Add default owner user
  const newOwner: User = {
    id: generateId('user_owner'),
    email: newBusiness.email,
    name: `${newBusiness.name} Owner`,
    role: 'owner',
    businessId: newBusiness.id,
    createdAt: new Date().toISOString(),
  };
  cachedDb.users.push(newOwner);

  // Add sample categories for the selected modules
  if (newBusiness.settings.modules.store) {
    await createCategory({
      businessId: newBusiness.id,
      sourceType: 'store',
      name: 'Featured Products',
      slug: 'featured-products',
      sortOrder: 1,
      isActive: true,
    });
  }
  if (newBusiness.settings.modules.menu) {
    await createCategory({
      businessId: newBusiness.id,
      sourceType: 'menu',
      name: 'Chef Specials',
      slug: 'chef-specials',
      sortOrder: 1,
      isActive: true,
    });
  }

  saveDatabase();
  return newBusiness;
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<Business>
): Promise<Business | null> {
  // 1. Fetch live current state from PostgreSQL first
  let current: Business | null = await getBusinessById(businessId);
  if (!current) {
    current = cachedDb.businesses.find((b) => b.id === businessId) || null;
  }
  if (!current) return null;

  // Deep-merge settings if provided to preserve existing configurations (storefront design, QR, GST, etc.)
  let newSettings = { ...(current.settings || {}) };
  if (updates.settings) {
    newSettings = {
      ...newSettings,
      ...updates.settings,
      modules: updates.settings.modules
        ? {
            ...(current.settings?.modules || { store: true, menu: true }),
            ...updates.settings.modules,
          }
        : (current.settings?.modules || { store: true, menu: true }),
      orderSettings: updates.settings.orderSettings
        ? {
            ...(current.settings?.orderSettings || {}),
            ...updates.settings.orderSettings,
          }
        : (current.settings?.orderSettings || {}),
      socialLinks: updates.settings.socialLinks
        ? {
            ...(current.settings?.socialLinks || {}),
            ...updates.settings.socialLinks,
          }
        : current.settings?.socialLinks,
      storefrontDesign: updates.settings.storefrontDesign
        ? ({
            ...(current.settings?.storefrontDesign || {}),
            ...updates.settings.storefrontDesign,
          } as StorefrontDesignSettings)
        : current.settings?.storefrontDesign,
      qrCustomization: updates.settings.qrCustomization
        ? ({
            ...(current.settings?.qrCustomization || {}),
            ...updates.settings.qrCustomization,
          } as QrCustomizationSettings)
        : current.settings?.qrCustomization,
      gst: updates.settings.gst
        ? ({
            ...(current.settings?.gst || {}),
            ...updates.settings.gst,
          } as GstInvoiceSettings)
        : current.settings?.gst,
    };
  }

  const newSubscription = updates.subscription
    ? { ...(current.subscription || {}), ...updates.subscription }
    : current.subscription;

  // Synchronize isStoreOpen & onlineOrderingEnabled between top-level & settings
  let isStoreOpen = updates.isStoreOpen !== undefined
    ? updates.isStoreOpen
    : (updates.settings?.isStoreOpen !== undefined
      ? updates.settings.isStoreOpen
      : (current.isStoreOpen ?? current.settings?.isStoreOpen ?? true));

  let onlineOrderingEnabled = updates.onlineOrderingEnabled !== undefined
    ? updates.onlineOrderingEnabled
    : (updates.settings?.onlineOrderingEnabled !== undefined
      ? updates.settings.onlineOrderingEnabled
      : (current.onlineOrderingEnabled ?? current.settings?.onlineOrderingEnabled ?? true));

  newSettings.isStoreOpen = isStoreOpen;
  newSettings.onlineOrderingEnabled = onlineOrderingEnabled;

  const coverImageUrl = updates.coverImageUrl !== undefined
    ? (updates.coverImageUrl ? updates.coverImageUrl.trim() : '')
    : (updates.settings?.coverImageUrl !== undefined
      ? updates.settings.coverImageUrl
      : (current.coverImageUrl || current.settings?.coverImageUrl || current.settings?.storefrontDesign?.coverImageUrl || ''));

  if (coverImageUrl) {
    newSettings.coverImageUrl = coverImageUrl;
    if (newSettings.storefrontDesign) {
      newSettings.storefrontDesign.coverImageUrl = coverImageUrl;
    }
  } else if (updates.coverImageUrl === null || updates.coverImageUrl === '') {
    delete newSettings.coverImageUrl;
    if (newSettings.storefrontDesign) {
      delete newSettings.storefrontDesign.coverImageUrl;
    }
  }

  if (updates.ownerName) {
    newSettings.ownerName = updates.ownerName.trim();
  }

  // Safely handle slug updates and track previous slugs for seamless redirection
  let targetSlug = current.slug;
  if (updates.slug && updates.slug.trim() && updates.slug.trim().toLowerCase() !== current.slug.toLowerCase()) {
    const cleanSlug = updates.slug.trim().toLowerCase().replace(/[^\w-]/g, '-').replace(/^-+|-+$/g, '');
    try {
      const existing = await pgQuery(
        `SELECT id FROM public.businesses WHERE LOWER(slug) = LOWER($1) AND id != $2`,
        [cleanSlug, businessId]
      );
      if (existing.rows.length === 0) {
        targetSlug = cleanSlug;
        const prevSlugs = Array.isArray(newSettings.previousSlugs) ? newSettings.previousSlugs : [];
        if (!prevSlugs.includes(current.slug)) {
          newSettings.previousSlugs = [...prevSlugs, current.slug];
        }
      }
    } catch (sErr) {
      console.error('Slug check error in updateBusiness:', sErr);
    }
  }

  const b: Business = {
    ...current,
    ...updates,
    slug: targetSlug,
    isStoreOpen,
    onlineOrderingEnabled,
    ownerName: updates.ownerName ? updates.ownerName.trim() : (current.ownerName || newSettings.ownerName),
    coverImageUrl: coverImageUrl || undefined,
    settings: newSettings,
    subscription: newSubscription,
    updatedAt: new Date().toISOString(),
  };

  if (updates.ownerName && b.ownerId) {
    try {
      await pgQuery(`UPDATE public.users SET name = $1 WHERE id = $2`, [updates.ownerName.trim(), b.ownerId]);
      const userIdx = cachedDb.users.findIndex((u) => u.id === b.ownerId);
      if (userIdx !== -1) cachedDb.users[userIdx].name = updates.ownerName.trim();
    } catch (uErr) {
      console.error('pg update user ownerName error:', uErr);
    }
  }

  try {
    await pgQuery(`
      UPDATE public.businesses 
      SET name = $1, description = $2, phone = $3, address = $4, email = $5, type = $6, logo_url = $7, settings = $8, subscription = $9, is_store_open = $10, online_ordering_enabled = $11, slug = $12, updated_at = NOW()
      WHERE id = $13
    `, [
      b.name,
      b.description,
      b.phone,
      b.address,
      b.email,
      b.type,
      b.logoUrl || null,
      JSON.stringify(b.settings),
      JSON.stringify(b.subscription),
      isStoreOpen,
      onlineOrderingEnabled,
      targetSlug,
      businessId
    ]);
  } catch (err) {
    console.error('pg updateBusiness error:', err);
  }

  const idx = cachedDb.businesses.findIndex((item) => item.id === businessId);
  if (idx !== -1) {
    cachedDb.businesses[idx] = b;
  } else {
    cachedDb.businesses.push(b);
  }

  saveDatabase();
  return b;
}

// 2. Categories
export async function getCategories(
  businessId: string,
  sourceType?: OrderSourceType,
  channel?: 'both' | 'storefront' | 'pos'
): Promise<Category[]> {
  try {
    let sql = 'SELECT * FROM public.categories WHERE business_id = $1';
    const params: any[] = [businessId];
    if (sourceType) {
      params.push(sourceType);
      sql += ' AND source_type = $' + params.length;
    }
    if (channel === 'storefront') {
      sql += " AND sales_channel IN ('both', 'storefront')";
    } else if (channel === 'pos') {
      sql += " AND sales_channel IN ('both', 'pos')";
    }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const res = await pgQuery(sql, params);
    if (res.rows.length > 0) {
      const cats = res.rows.map(mapRowToCategory);
      for (const cat of cats) {
        const idx = cachedDb.categories.findIndex((item) => item.id === cat.id);
        if (idx !== -1) cachedDb.categories[idx] = cat;
        else cachedDb.categories.push(cat);
      }
      return cats;
    }

    // Fallback: If 0 categories were returned for this specific sourceType,
    // check if the business has categories created under the alternative sourceType.
    // This ensures business owners always see their catalog categories across storefront, menu, and dashboard.
    if (sourceType) {
      let fbSql = 'SELECT * FROM public.categories WHERE business_id = $1';
      const fbParams: any[] = [businessId];
      if (channel === 'storefront') {
        fbSql += " AND sales_channel IN ('both', 'storefront')";
      } else if (channel === 'pos') {
        fbSql += " AND sales_channel IN ('both', 'pos')";
      }
      fbSql += ' ORDER BY sort_order ASC, created_at ASC';
      const fbRes = await pgQuery(fbSql, fbParams);
      if (fbRes.rows.length > 0) {
        const fbCats = fbRes.rows.map(mapRowToCategory);
        for (const cat of fbCats) {
          const idx = cachedDb.categories.findIndex((item) => item.id === cat.id);
          if (idx !== -1) cachedDb.categories[idx] = cat;
          else cachedDb.categories.push(cat);
        }
        return fbCats;
      }
    }
  } catch (err) {}

  const exactMatches = cachedDb.categories
    .filter((c) => {
      if (c.businessId !== businessId) return false;
      if (sourceType && c.sourceType !== sourceType) return false;
      if (channel === 'storefront' && c.salesChannel && c.salesChannel !== 'both' && c.salesChannel !== 'storefront') return false;
      if (channel === 'pos' && c.salesChannel && c.salesChannel !== 'both' && c.salesChannel !== 'pos') return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (exactMatches.length > 0 || !sourceType) {
    return exactMatches;
  }

  // Fallback in cache: return categories for this business regardless of sourceType
  return cachedDb.categories
    .filter((c) => {
      if (c.businessId !== businessId) return false;
      if (channel === 'storefront' && c.salesChannel && c.salesChannel !== 'both' && c.salesChannel !== 'storefront') return false;
      if (channel === 'pos' && c.salesChannel && c.salesChannel !== 'both' && c.salesChannel !== 'pos') return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.categories WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      const cat = mapRowToCategory(res.rows[0]);
      const idx = cachedDb.categories.findIndex((c) => c.id === id);
      if (idx !== -1) cachedDb.categories[idx] = cat;
      else cachedDb.categories.push(cat);
      return cat;
    }
  } catch (err) {}
  return cachedDb.categories.find((c) => c.id === id) || null;
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
  let sourceType = data.sourceType;
  if (!sourceType) {
    const biz = await getBusinessById(data.businessId);
    const isFood = biz && ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat', 'hotel'].includes((biz.category || biz.type || '').toLowerCase());
    sourceType = isFood ? 'menu' : 'store';
  }

  if (sourceType === 'store') {
    const access = await checkBusinessModuleAccess(data.businessId, 'store');
    if (!access.allowed) {
      throw new Error(access.message || 'Store categories require an upgraded subscription plan. Please upgrade.');
    }
  }

  // Strict Subscription Limit Enforcement for Categories
  await assertCanCreateRecord(data.businessId, 'category');

  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') ||
    generateId('cat');

  const salesChannel = data.salesChannel || 'both';

  const cat: Category = {
    ...data,
    sourceType,
    slug,
    isActive: data.isActive !== false,
    salesChannel,
    id: generateId('cat'),
    createdAt: new Date().toISOString(),
  };
  cachedDb.categories.push(cat);

  try {
    await pgQuery(`
      INSERT INTO public.categories (id, business_id, source_type, name, slug, description, image_url, sort_order, is_active, sales_channel, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [cat.id, cat.businessId, cat.sourceType, cat.name, cat.slug, cat.description || null, cat.imageUrl || null, cat.sortOrder, cat.isActive, cat.salesChannel || 'both', cat.createdAt]);
  } catch (err) {
    console.error('pg createCategory error:', err);
  }

  saveDatabase();
  return cat;
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category | null> {
  let current: Category | null = await getCategoryById(id);
  if (!current) {
    current = cachedDb.categories.find((c) => c.id === id) || null;
  }
  if (!current) return null;

  const c: Category = {
    ...current,
    ...updates,
  };

  try {
    await pgQuery(`
      UPDATE public.categories 
      SET name = $1, description = $2, image_url = $3, sort_order = $4, is_active = $5, sales_channel = $6
      WHERE id = $7
    `, [c.name, c.description || null, c.imageUrl || null, c.sortOrder, c.isActive, c.salesChannel || 'both', id]);
  } catch (err) {
    console.error('pg updateCategory error:', err);
  }

  const idx = cachedDb.categories.findIndex((item) => item.id === id);
  if (idx !== -1) {
    cachedDb.categories[idx] = c;
  } else {
    cachedDb.categories.push(c);
  }

  saveDatabase();
  return c;
}

export async function deleteCategory(id: string): Promise<boolean> {
  let deletedFromPg = false;
  try {
    const res = await pgQuery('DELETE FROM public.categories WHERE id = $1', [id]);
    deletedFromPg = (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('pg deleteCategory error:', err);
  }

  const initialLen = cachedDb.categories.length;
  cachedDb.categories = cachedDb.categories.filter((c) => c.id !== id);
  const deletedFromCache = cachedDb.categories.length !== initialLen;

  if (deletedFromPg || deletedFromCache) {
    saveDatabase();
    return true;
  }
  return false;
}

// 3. Products & Stock Management
export async function getProducts(
  businessId: string,
  sourceType?: OrderSourceType,
  categoryId?: string,
  channel?: 'both' | 'storefront' | 'pos'
): Promise<Product[]> {
  try {
    let sql = 'SELECT * FROM public.products WHERE business_id = $1';
    const params: any[] = [businessId];
    if (sourceType) {
      params.push(sourceType);
      sql += ` AND source_type = $${params.length}`;
    }
    if (categoryId) {
      params.push(categoryId);
      sql += ` AND category_id = $${params.length}`;
    }
    if (channel === 'storefront') {
      sql += " AND sales_channel IN ('both', 'storefront')";
    } else if (channel === 'pos') {
      sql += " AND sales_channel IN ('both', 'pos')";
    }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const res = await pgQuery(sql, params);
    if (res.rows.length > 0) {
      const prods = res.rows.map(mapRowToProduct);
      for (const prod of prods) {
        const idx = cachedDb.products.findIndex((item) => item.id === prod.id);
        if (idx !== -1) cachedDb.products[idx] = prod;
        else cachedDb.products.push(prod);
      }
      return prods;
    }

    // Fallback: If 0 products were returned for this specific sourceType,
    // check if the business has products created under the alternative sourceType.
    // This ensures business owners always see their catalog products across storefront, menu, and dashboard.
    if (sourceType) {
      let fbSql = 'SELECT * FROM public.products WHERE business_id = $1';
      const fbParams: any[] = [businessId];
      if (categoryId) {
        fbParams.push(categoryId);
        fbSql += ` AND category_id = $${fbParams.length}`;
      }
      if (channel === 'storefront') {
        fbSql += " AND sales_channel IN ('both', 'storefront')";
      } else if (channel === 'pos') {
        fbSql += " AND sales_channel IN ('both', 'pos')";
      }
      fbSql += ' ORDER BY sort_order ASC, created_at ASC';
      const fbRes = await pgQuery(fbSql, fbParams);
      if (fbRes.rows.length > 0) {
        const fbProds = fbRes.rows.map(mapRowToProduct);
        for (const prod of fbProds) {
          const idx = cachedDb.products.findIndex((item) => item.id === prod.id);
          if (idx !== -1) cachedDb.products[idx] = prod;
          else cachedDb.products.push(prod);
        }
        return fbProds;
      }
    }
  } catch (err) {}

  return cachedDb.products
    .filter((p) => {
      if (p.businessId !== businessId) return false;
      if (sourceType && p.sourceType !== sourceType) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (channel === 'storefront' && p.salesChannel && p.salesChannel !== 'both' && p.salesChannel !== 'storefront') return false;
      if (channel === 'pos' && p.salesChannel && p.salesChannel !== 'both' && p.salesChannel !== 'pos') return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.products WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      const prod = mapRowToProduct(res.rows[0]);
      const idx = cachedDb.products.findIndex((p) => p.id === id);
      if (idx !== -1) cachedDb.products[idx] = prod;
      else cachedDb.products.push(prod);
      return prod;
    }
  } catch (err) {}
  return cachedDb.products.find((p) => p.id === id) || null;
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  if (data.sourceType === 'store') {
    const access = await checkBusinessModuleAccess(data.businessId, 'store');
    if (!access.allowed) {
      throw new Error(access.message || 'Store products require an upgraded subscription plan. Please upgrade.');
    }
  }

  // Strict Subscription Limit Enforcement for Products & Menu Items
  await assertCanCreateRecord(data.businessId, 'product');

  const salesChannel = data.salesChannel || 'both';

  const prod: Product = {
    ...data,
    salesChannel,
    id: generateId('prod'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cachedDb.products.push(prod);

  try {
    await pgQuery(`
      INSERT INTO public.products (
        id, business_id, category_id, source_type, name, description,
        price, sale_price, sku, barcode, brand, unit, size, min_order_qty,
        stock_quantity, low_stock_threshold, is_available, sales_channel,
        image_url, sort_order, dietary_flags, variants, add_ons, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `, [
      prod.id,
      prod.businessId,
      prod.categoryId ? prod.categoryId : null,
      prod.sourceType,
      prod.name,
      prod.description || null,
      prod.price,
      prod.salePrice !== undefined && prod.salePrice !== null ? Number(prod.salePrice) : null,
      prod.sku || null,
      prod.barcode || null,
      prod.brand || null,
      prod.unit || null,
      prod.size || null,
      prod.minOrderQty || 1,
      prod.stockQuantity !== undefined && prod.stockQuantity !== null ? Number(prod.stockQuantity) : null,
      prod.lowStockThreshold || 5,
      prod.isAvailable !== false,
      prod.salesChannel || 'both',
      prod.imageUrl || null,
      prod.sortOrder || 0,
      JSON.stringify(prod.dietaryFlags || {}),
      JSON.stringify(prod.variants || []),
      JSON.stringify(prod.addOns || []),
      prod.createdAt,
      prod.updatedAt
    ]);
  } catch (err) {
    console.error('pg createProduct error:', err);
  }

  saveDatabase();
  return prod;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  let current: Product | null = await getProductById(id);
  if (!current) {
    current = cachedDb.products.find((p) => p.id === id) || null;
  }
  if (!current) return null;

  const dietaryFlags = updates.dietaryFlags !== undefined
    ? { ...(current.dietaryFlags || {}), ...updates.dietaryFlags }
    : (current.dietaryFlags || {});

  const p: Product = {
    ...current,
    ...updates,
    dietaryFlags,
    variants: updates.variants !== undefined ? updates.variants : (current.variants || []),
    addOns: updates.addOns !== undefined ? updates.addOns : (current.addOns || []),
    updatedAt: new Date().toISOString(),
  };

  try {
    await pgQuery(`
      UPDATE public.products 
      SET name = $1, description = $2, price = $3, sale_price = $4, stock_quantity = $5, 
          is_available = $6, brand = $7, unit = $8, size = $9, min_order_qty = $10, sku = $11, 
          barcode = $12, image_url = $13, category_id = $14, low_stock_threshold = $15,
          dietary_flags = $16, variants = $17, add_ons = $18, sales_channel = $19, updated_at = NOW()
      WHERE id = $20
    `, [
      p.name,
      p.description || null,
      p.price,
      p.salePrice !== undefined && p.salePrice !== null ? Number(p.salePrice) : null,
      p.stockQuantity !== undefined && p.stockQuantity !== null ? Number(p.stockQuantity) : null,
      p.isAvailable,
      p.brand || null,
      p.unit || null,
      p.size || null,
      p.minOrderQty || 1,
      p.sku || null,
      p.barcode || null,
      p.imageUrl || null,
      p.categoryId || null,
      p.lowStockThreshold || 5,
      JSON.stringify(p.dietaryFlags || {}),
      JSON.stringify(p.variants || []),
      JSON.stringify(p.addOns || []),
      p.salesChannel || 'both',
      id
    ]);
  } catch (err) {
    console.error('pg updateProduct error:', err);
  }

  const idx = cachedDb.products.findIndex((item) => item.id === id);
  if (idx !== -1) {
    cachedDb.products[idx] = p;
  } else {
    cachedDb.products.push(p);
  }

  saveDatabase();
  return p;
}

export async function deleteProduct(id: string): Promise<boolean> {
  let deletedFromPg = false;
  try {
    const res = await pgQuery('DELETE FROM public.products WHERE id = $1', [id]);
    deletedFromPg = (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('pg deleteProduct error:', err);
  }

  const initialLen = cachedDb.products.length;
  cachedDb.products = cachedDb.products.filter((p) => p.id !== id);
  const deletedFromCache = cachedDb.products.length !== initialLen;

  if (deletedFromPg || deletedFromCache) {
    saveDatabase();
    return true;
  }
  return false;
}

// 4. ATOMIC TOKEN GENERATOR (Separate Store & Menu Sequences)
export async function generateOrderToken(
  businessId: string,
  sourceType: OrderSourceType
): Promise<string> {
  try {
    const res = await pgQuery('SELECT generate_next_order_token($1, $2) as token', [businessId, sourceType]);
    if (res.rows.length > 0 && res.rows[0].token) {
      const token = res.rows[0].token;
      const sequenceKey = `${businessId}_${sourceType}`;
      cachedDb.sequences[sequenceKey] = (cachedDb.sequences[sequenceKey] || 100) + 1;
      return token;
    }
  } catch (err) {
    console.error('pg generateOrderToken error, falling back:', err);
  }

  const business = await getBusinessById(businessId);
  const prefix =
    sourceType === 'store'
      ? business?.settings.tokenPrefixStore || 'S-'
      : business?.settings.tokenPrefixMenu || 'M-';

  const sequenceKey = `${businessId}_${sourceType}`;
  const currentSeq = cachedDb.sequences[sequenceKey] || 100;
  const nextSeq = currentSeq + 1;
  cachedDb.sequences[sequenceKey] = nextSeq;

  // Format: S-00102 or M-00102
  const formattedToken = `${prefix}${String(nextSeq).padStart(5, '0')}`;
  saveDatabase();
  return formattedToken;
}

// 5. ATOMIC ORDER CREATION & VALIDATION
export interface CreateOrderInput {
  businessId: string;
  sourceType: OrderSourceType;
  customer: CustomerDetails;
  items: {
    productId: string;
    quantity: number;
    variantId?: string;
    addOnIds?: string[];
    specialInstructions?: string;
  }[];
  fulfilmentMethod: 'pickup' | 'delivery' | 'dine_in' | 'takeaway';
  fulfillmentType?: 'pickup' | 'delivery' | 'dine_in' | 'takeaway';
  paymentMethod: 'upi' | 'cash' | 'card' | 'online' | 'counter';
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'pay_at_counter';
  tableNumber?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const business = await getBusinessById(input.businessId);
  if (!business) {
    throw new Error('Business not found');
  }

  // Check Store Open & Online Ordering operational status
  const isStoreOpen = business.isStoreOpen ?? business.settings.isStoreOpen ?? true;
  const onlineOrderingEnabled = business.onlineOrderingEnabled ?? business.settings.onlineOrderingEnabled ?? true;

  if (!isStoreOpen && !onlineOrderingEnabled) {
    throw new Error('This store is currently closed and online ordering is unavailable.');
  }
  if (!isStoreOpen) {
    throw new Error('This store is currently closed. Please visit again later.');
  }
  if (!onlineOrderingEnabled) {
    throw new Error('Online ordering is currently unavailable for this store.');
  }

  // Validate module active & subscription plan entitlements
  if (input.sourceType === 'store') {
    const access = await checkBusinessModuleAccess(input.businessId, 'store');
    if (!access.allowed) {
      throw new Error(access.message || 'Store orders require an active Store-enabled subscription tier. Please upgrade.');
    }
    if (!business.settings.modules.store) {
      throw new Error('Digital Store is currently disabled for this business');
    }
  }
  if (input.sourceType === 'menu' && !business.settings.modules.menu) {
    throw new Error('Digital Menu is currently disabled for this business');
  }

  // Validate & recalculate prices strictly on server
  let subtotal = 0;
  const verifiedItems = [];

  for (const itemInput of input.items) {
    let product: Product | null = await getProductById(itemInput.productId);
    if (!product) {
      product = cachedDb.products.find(
        (p) => p.id === itemInput.productId && p.businessId === input.businessId && p.sourceType === input.sourceType
      ) || null;
    }

    if (!product || product.businessId !== input.businessId || product.sourceType !== input.sourceType) {
      throw new Error(`Product not found or unavailable for ${input.sourceType}`);
    }

    if (!product.isAvailable) {
      throw new Error(`Item "${product.name}" is currently sold out`);
    }

    // Check retail inventory for Store products (and variant stock if present)
    let matchedVariant = undefined;
    if (itemInput.variantId && product.variants?.length) {
      matchedVariant = product.variants.find((vr) => vr.id === itemInput.variantId);
    }

    if (matchedVariant && typeof matchedVariant.stockQuantity === 'number') {
      if (matchedVariant.stockQuantity < itemInput.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name} (${matchedVariant.name})". Available: ${matchedVariant.stockQuantity}, requested: ${itemInput.quantity}`
        );
      }
    } else if (input.sourceType === 'store' && typeof product.stockQuantity === 'number') {
      if (product.stockQuantity < itemInput.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, requested: ${itemInput.quantity}`
        );
      }
    }

    let unitPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    let selectedVariantObj = undefined;

    if (matchedVariant) {
      unitPrice = matchedVariant.price;
      selectedVariantObj = {
        id: matchedVariant.id,
        name: matchedVariant.name,
        price: matchedVariant.price,
        unit: matchedVariant.unit || product.unit,
        size: matchedVariant.size || product.size,
      };
    }

    const selectedAddOnsObj = [];
    if (itemInput.addOnIds?.length && product.addOns?.length) {
      for (const aId of itemInput.addOnIds) {
        const ao = product.addOns.find((a) => a.id === aId);
        if (ao) {
          unitPrice += ao.price;
          selectedAddOnsObj.push({ id: ao.id, name: ao.name, price: ao.price });
        }
      }
    }

    const itemTotal = unitPrice * itemInput.quantity;
    subtotal += itemTotal;

    verifiedItems.push({
      productId: product.id,
      productName: product.name,
      price: unitPrice,
      quantity: itemInput.quantity,
      unit: matchedVariant?.unit || product.unit,
      size: matchedVariant?.size || product.size,
      selectedVariant: selectedVariantObj,
      selectedAddOns: selectedAddOnsObj.length ? selectedAddOnsObj : undefined,
      specialInstructions: itemInput.specialInstructions,
      itemTotal,
    });

    // Deduct stock for store products and variant inventory atomically
    if (matchedVariant && typeof matchedVariant.stockQuantity === 'number') {
      matchedVariant.stockQuantity = Math.max(0, matchedVariant.stockQuantity - itemInput.quantity);
      pgQuery('UPDATE public.products SET variants = $1 WHERE id = $2', [
        JSON.stringify(product.variants || []),
        product.id,
      ]).catch(() => {});
    }
    if (input.sourceType === 'store' && typeof product.stockQuantity === 'number') {
      product.stockQuantity -= itemInput.quantity;
      if (product.stockQuantity <= 0) {
        product.stockQuantity = 0;
        product.isAvailable = false;
      }
    }
  }

  // Minimum order check for store
  if (input.sourceType === 'store' && business.settings.orderSettings.minStoreOrder > 0) {
    if (subtotal < business.settings.orderSettings.minStoreOrder) {
      throw new Error(
        `Minimum order value for store delivery/pickup is ₹${business.settings.orderSettings.minStoreOrder}`
      );
    }
  }

  // Check if business has Gold Plan access for GST calculations
  const isGoldSubscriber = Boolean(
    business.subscription?.planId === 'plan_gold' ||
    business.subscription?.planId === 'plan_diamond'
  );

  const deliveryFee =
    input.fulfilmentMethod === 'delivery' && business.settings.orderSettings.enableDelivery
      ? business.settings.orderSettings.deliveryFee || 0
      : 0;

  // Resolve GST Settings (from business.settings.gst or orderSettings fallback)
  const gstSettings = business.settings.gst || (business.settings.orderSettings.enableGst && business.settings.orderSettings.gstin ? {
    isGstRegistered: true,
    gstin: business.settings.orderSettings.gstin,
    legalBusinessName: business.name,
    registeredAddress: business.address,
    defaultGstRate: business.settings.orderSettings.taxRatePercentage || 0,
    pricesIncludeGst: false,
    invoicePrefix: 'INV-',
  } : undefined);

  // Calculate tax with Gold plan entitlement enforcement & inclusive/exclusive handling
  const taxResult = calculateOrderTax({
    subtotal,
    deliveryFee,
    gstSettings,
    isGoldSubscriber,
  });

  const tax = taxResult.totalTax;
  const total = taxResult.finalTotal;

  // Atomic token generation (Store and Menu use completely independent sequences)
  const tokenNumber = await generateOrderToken(input.businessId, input.sourceType);
  const trackingId = generateTrackingId();
  const rawSeq = tokenNumber.replace(/^[A-Za-z]+-/, '');
  const invoiceNumber = generateInvoiceNumber(gstSettings?.invoicePrefix || 'INV-', rawSeq);
  const taxBreakdown = {
    ...taxResult.taxBreakdown,
    invoiceNumber,
  };

  // Create queue token for active customer orders
  const queueTokenString: string = tokenNumber;
  cachedDb.queueTokens.push({
    id: generateId('qtok'),
    businessId: input.businessId,
    sourceType: input.sourceType,
    tokenNumber,
    sequenceNumber: cachedDb.queueTokens.length + 1,
    customerName: input.customer.name,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  });

  const initialStatus: OrderStatus = business.settings.orderSettings.autoAcceptOrders ? 'accepted' : 'new';

  const newOrder: Order = {
    id: generateId('ord'),
    businessId: input.businessId,
    sourceType: input.sourceType, // Critical separation
    tokenNumber,
    trackingId,
    customer: input.customer,
    items: verifiedItems,
    subtotal,
    tax,
    deliveryFee,
    discount: 0,
    total,
    paymentStatus:
      input.paymentStatus ||
      (input.paymentMethod === 'upi'
        ? 'pending_verification'
        : input.paymentMethod === 'online'
        ? 'paid'
        : 'pay_at_counter'),
    paymentMethod: input.paymentMethod,
    orderStatus: initialStatus,
    fulfilmentMethod: input.fulfilmentMethod,
    queueToken: queueTokenString,
    taxBreakdown,
    invoiceNumber,
    statusHistory: [
      {
        status: 'new',
        timestamp: new Date().toISOString(),
        note: `Order placed via ${input.sourceType === 'store' ? 'Digital Store' : 'Digital Menu'}`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedDb.orders.unshift(newOrder);

  // Generate Notification for Owner/Staff Dashboard
  const tableOrRoom = (input.customer.tableNumber || input.customer.roomNumber || '').trim();
  const isHotel = business.type === 'hotel' || business.category === 'hotel';
  const locationTag = tableOrRoom
    ? (/^(table|room)\b/i.test(tableOrRoom) ? tableOrRoom : (isHotel ? `Room ${tableOrRoom}` : `Table ${tableOrRoom}`))
    : '';

  const notificationTitle = locationTag
    ? `New Order #${tokenNumber} (${locationTag})`
    : input.sourceType === 'store'
    ? `New Store Order #${tokenNumber}`
    : `New Kitchen Menu Order #${tokenNumber}`;

  const notificationMessage = locationTag
    ? `${locationTag} • ${input.customer.name || 'Guest'} ordered ₹${total.toFixed(2)} (${input.fulfilmentMethod})`
    : `${input.customer.name || 'Guest'} placed an order of ₹${total.toFixed(2)} (${input.fulfilmentMethod})`;

  const notification: NotificationItem = {
    id: generateId('notif'),
    businessId: input.businessId,
    sourceType: input.sourceType,
    title: notificationTitle,
    message: notificationMessage,
    orderId: newOrder.id,
    tokenNumber,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  cachedDb.notifications.unshift(notification);

  // Write through to Supabase PostgreSQL
  try {
    await pgQuery(`
      INSERT INTO public.orders (id, business_id, source_type, token_number, tracking_id, customer, items, subtotal, tax, delivery_fee, discount, total, payment_status, payment_method, order_status, fulfilment_method, queue_token, status_history, tax_breakdown, invoice_number, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [
      newOrder.id, newOrder.businessId, newOrder.sourceType, newOrder.tokenNumber, newOrder.trackingId,
      JSON.stringify(newOrder.customer), JSON.stringify(newOrder.items),
      newOrder.subtotal, newOrder.tax, newOrder.deliveryFee, newOrder.discount, newOrder.total,
      newOrder.paymentStatus, newOrder.paymentMethod, newOrder.orderStatus, newOrder.fulfilmentMethod,
      newOrder.queueToken || null, JSON.stringify(newOrder.statusHistory),
      JSON.stringify(newOrder.taxBreakdown || {}), newOrder.invoiceNumber || null,
      newOrder.createdAt, newOrder.updatedAt
    ]);

    if (queueTokenString) {
      await pgQuery(`
        INSERT INTO public.queue_tokens (id, business_id, source_type, token_number, sequence_number, order_id, customer_name, status, created_at)
        VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM public.queue_tokens WHERE business_id = $2), $5, $6, 'waiting', NOW())
      `, [generateId('qtok'), input.businessId, input.sourceType, tokenNumber, newOrder.id, input.customer.name || null]);
    }

    await pgQuery(`
      INSERT INTO public.notifications (id, business_id, source_type, title, message, order_id, token_number, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
    `, [notification.id, notification.businessId, notification.sourceType, notification.title, notification.message, notification.orderId, notification.tokenNumber]);

    for (const item of verifiedItems) {
      if (input.sourceType === 'store') {
        await pgQuery(`
          UPDATE public.products 
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - $1),
              is_available = CASE WHEN COALESCE(stock_quantity, 0) - $1 <= 0 THEN false ELSE is_available END
          WHERE id = $2
        `, [item.quantity, item.productId]);
      }
    }
  } catch (err) {
    console.error('PostgreSQL createOrder write error:', err);
  }

  saveDatabase();

  // Broadcast to realtime listeners
  broadcastOrderEvent(newOrder, notification);

  return newOrder;
}

// 6. ORDER QUERIES WITH STRICT SOURCE_TYPE SEPARATION
export async function getOrders(
  businessId: string,
  sourceType?: OrderSourceType, // 'store' or 'menu'
  status?: OrderStatus,
  search?: string
): Promise<Order[]> {
  try {
    let sql = 'SELECT * FROM public.orders WHERE business_id = $1';
    const params: any[] = [businessId];
    if (sourceType) {
      params.push(sourceType);
      sql += ` AND source_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND order_status = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await pgQuery(sql, params);
    let orders = res.rows.map(mapRowToOrder);
    for (const ord of orders) {
      const idx = cachedDb.orders.findIndex((o) => o.id === ord.id);
      if (idx !== -1) cachedDb.orders[idx] = ord;
      else cachedDb.orders.unshift(ord);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter((o) => {
        const matchToken = o.tokenNumber.toLowerCase().includes(q);
        const matchName = o.customer.name?.toLowerCase().includes(q);
        const matchPhone = o.customer.phone?.toLowerCase().includes(q);
        return matchToken || matchName || matchPhone;
      });
    }
    return orders;
  } catch (err) {}

  return cachedDb.orders.filter((o) => {
    if (o.businessId !== businessId) return false;
    // Strict isolation: if sourceType specified, match exactly!
    if (sourceType && o.sourceType !== sourceType) return false;
    if (status && o.orderStatus !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchToken = o.tokenNumber.toLowerCase().includes(q);
      const matchName = o.customer.name?.toLowerCase().includes(q);
      const matchPhone = o.customer.phone?.toLowerCase().includes(q);
      if (!matchToken && !matchName && !matchPhone) return false;
    }
    return true;
  });
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.orders WHERE id = $1', [orderId]);
    if (res.rows.length > 0) {
      const ord = mapRowToOrder(res.rows[0]);
      const idx = cachedDb.orders.findIndex((o) => o.id === orderId);
      if (idx !== -1) cachedDb.orders[idx] = ord;
      else cachedDb.orders.unshift(ord);
      return ord;
    }
  } catch (err) {}
  return cachedDb.orders.find((o) => o.id === orderId) || null;
}

export async function getOrderByTrackingId(trackingId: string): Promise<Order | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.orders WHERE tracking_id = $1', [trackingId]);
    if (res.rows.length > 0) {
      const ord = mapRowToOrder(res.rows[0]);
      const idx = cachedDb.orders.findIndex((o) => o.id === ord.id);
      if (idx !== -1) cachedDb.orders[idx] = ord;
      else cachedDb.orders.unshift(ord);
      return ord;
    }
  } catch (err) {}
  return cachedDb.orders.find((o) => o.trackingId === trackingId) || null;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
  updatedBy?: string
): Promise<Order | null> {
  let order: Order | null = await getOrderById(orderId);
  if (!order) {
    order = cachedDb.orders.find((o) => o.id === orderId) || null;
  }
  if (!order) return null;

  const previousStatus = order.orderStatus;
  order.orderStatus = newStatus;
  order.updatedAt = new Date().toISOString();

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  order.statusHistory.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note: note || `Status changed from ${previousStatus} to ${newStatus}`,
    updatedBy: updatedBy || 'System',
  });

  // If order cancelled or rejected, restore stock if it's a store order
  if ((newStatus === 'cancelled' || newStatus === 'rejected') && previousStatus !== 'cancelled' && previousStatus !== 'rejected') {
    if (order.sourceType === 'store') {
      for (const item of order.items) {
        try {
          await pgQuery(
            'UPDATE public.products SET stock_quantity = stock_quantity + $1, is_available = true WHERE id = $2',
            [item.quantity, item.productId]
          );
        } catch (e) {}

        const prod = cachedDb.products.find((p) => p.id === item.productId);
        if (prod && typeof prod.stockQuantity === 'number') {
          prod.stockQuantity += item.quantity;
          if (prod.stockQuantity > 0) {
            prod.isAvailable = true;
          }
        }
      }
    }
  }

  // Update linked queue token if any
  let qTokenStatus: 'waiting' | 'called' | 'served' | 'skipped' | null = null;
  if (newStatus === 'ready') qTokenStatus = 'called';
  else if (newStatus === 'completed') qTokenStatus = 'served';
  else if (newStatus === 'cancelled' || newStatus === 'rejected') qTokenStatus = 'skipped';
  else if (newStatus === 'new' || newStatus === 'accepted' || newStatus === 'preparing') qTokenStatus = 'waiting';

  if (order.tokenNumber && qTokenStatus) {
    try {
      await pgQuery(`
        UPDATE public.queue_tokens
        SET status = $1::text,
            called_at = CASE WHEN $1::text = 'called' THEN NOW() ELSE called_at END,
            served_at = CASE WHEN $1::text = 'served' THEN NOW() ELSE served_at END
        WHERE business_id = $2 AND token_number = $3
      `, [qTokenStatus, order.businessId, order.tokenNumber]);
    } catch (e) {
      console.error('pg queue_tokens update error:', e);
    }

    const qToken = cachedDb.queueTokens.find(
      (qt) => qt.businessId === order!.businessId && qt.tokenNumber === order!.tokenNumber
    );
    if (qToken) {
      qToken.status = qTokenStatus;
      if (qTokenStatus === 'called') qToken.calledAt = new Date().toISOString();
      if (qTokenStatus === 'served') qToken.servedAt = new Date().toISOString();
    }
  }

  try {
    await pgQuery(`
      UPDATE public.orders 
      SET order_status = $1, status_history = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, JSON.stringify(order.statusHistory), orderId]);
  } catch (err) {
    console.error('pg updateOrderStatus error:', err);
  }

  const idx = cachedDb.orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    cachedDb.orders[idx] = order;
  } else {
    cachedDb.orders.unshift(order);
  }

  saveDatabase();
  return order;
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'paid' | 'pending' | 'failed' | 'pay_at_counter' | 'pending_verification'
): Promise<Order | null> {
  let order: Order | null = await getOrderById(orderId);
  if (!order) {
    order = cachedDb.orders.find((o) => o.id === orderId) || null;
  }
  if (!order) return null;

  order.paymentStatus = paymentStatus;
  order.updatedAt = new Date().toISOString();

  try {
    await pgQuery(`
      UPDATE public.orders 
      SET payment_status = $1, updated_at = NOW() 
      WHERE id = $2
    `, [paymentStatus, orderId]);
  } catch (err) {
    console.error('pg updateOrderPaymentStatus error:', err);
  }

  const idx = cachedDb.orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    cachedDb.orders[idx] = order;
  } else {
    cachedDb.orders.unshift(order);
  }

  saveDatabase();
  return order;
}

// 7. QUEUE AND TV DISPLAY OPERATIONS
export async function getQueueTokens(
  businessId: string,
  sourceType?: OrderSourceType
): Promise<QueueToken[]> {
  try {
    let sql = 'SELECT * FROM public.queue_tokens WHERE business_id = $1';
    const params: any[] = [businessId];
    if (sourceType) {
      params.push(sourceType);
      sql += ` AND source_type = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await pgQuery(sql, params);
    return res.rows.map(mapRowToQueueToken);
  } catch (err) {}

  return cachedDb.queueTokens
    .filter((qt) => qt.businessId === businessId && (!sourceType || qt.sourceType === sourceType))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateQueueTokenStatus(
  tokenId: string,
  status: 'waiting' | 'called' | 'served' | 'skipped',
  counterNumber?: number
): Promise<QueueToken | null> {
  let token = cachedDb.queueTokens.find((t) => t.id === tokenId) || null;

  try {
    const res = await pgQuery(`
      UPDATE public.queue_tokens 
      SET status = $1, counter_number = $2,
          called_at = CASE WHEN $1 = 'called' THEN NOW() ELSE called_at END,
          served_at = CASE WHEN $1 = 'served' THEN NOW() ELSE served_at END
      WHERE id = $3
      RETURNING *
    `, [status, counterNumber || null, tokenId]);
    if (res.rows.length > 0) {
      token = mapRowToQueueToken(res.rows[0]);
    }
  } catch (err) {
    console.error('pg updateQueueTokenStatus error:', err);
  }

  if (token) {
    token.status = status;
    if (status === 'called') {
      token.calledAt = new Date().toISOString();
      if (counterNumber) token.counterNumber = counterNumber;
    }
    if (status === 'served') {
      token.servedAt = new Date().toISOString();
    }
    const idx = cachedDb.queueTokens.findIndex((t) => t.id === tokenId);
    if (idx !== -1) cachedDb.queueTokens[idx] = token;
    else cachedDb.queueTokens.unshift(token);
    saveDatabase();
  }

  return token;
}

// 8. NOTIFICATIONS
export async function getNotifications(
  businessId: string,
  sourceType?: OrderSourceType
): Promise<NotificationItem[]> {
  try {
    let sql = 'SELECT * FROM public.notifications WHERE business_id = $1';
    const params: any[] = [businessId];
    if (sourceType) {
      params.push(sourceType);
      sql += ` AND (source_type = $${params.length} OR source_type = 'system')`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const res = await pgQuery(sql, params);
    return res.rows.map(mapRowToNotification);
  } catch (err) {}

  return cachedDb.notifications
    .filter((n) => n.businessId === businessId && (!sourceType || n.sourceType === sourceType || n.sourceType === 'system'))
    .slice(0, 30);
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  const notif = cachedDb.notifications.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    try {
      await pgQuery('UPDATE public.notifications SET is_read = true WHERE id = $1', [id]);
    } catch (e) {}
    saveDatabase();
    return true;
  }
  return false;
}

export async function markAllNotificationsAsRead(businessId: string): Promise<void> {
  cachedDb.notifications.forEach((n) => {
    if (n.businessId === businessId) {
      n.isRead = true;
    }
  });
  try {
    await pgQuery('UPDATE public.notifications SET is_read = true WHERE business_id = $1', [businessId]);
  } catch (e) {}
  saveDatabase();
}

// 9. ANALYTICS CALCULATION (Real Database Metrics)
export interface DashboardAnalytics {
  kpi: {
    todayOrderValue: number;
    todayOrderValueChange: number; // percentage vs yesterday
    todayEarnings: number;
    todayPaidAmount: number;
    todayPendingAmount: number;
    todayOrdersCount: number;
    todayOrdersChange: number;
    todayCustomersCount: number;
  };
  orderStatusCounts: {
    new: number;
    accepted: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
  };
  salesTrend: { date: string; label: string; storeSales: number; menuSales: number; posSales?: number; totalSales: number }[];
  hourlyOrders: { hour: string; count: number; value: number }[];
  topSellingProducts: {
    productId: string;
    productName: string;
    sourceType: OrderSourceType;
    quantitySold: number;
    salesValue: number;
    rank: number;
    imageUrl?: string;
  }[];
  lowStockAlerts: Product[];
  recentOrders: Order[];
}

export async function getAnalytics(
  businessId: string,
  scope: 'all' | 'store' | 'menu' = 'all',
  timeRange: 'today' | '7d' | '30d' = 'today'
): Promise<DashboardAnalytics> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  // Retrieve actual orders from PostgreSQL database
  let allBizOrders = await getOrders(businessId);
  if (scope !== 'all') {
    allBizOrders = allBizOrders.filter((o) => o.sourceType === scope);
  }

  // Load POS counter bills if viewing unified overview
  let allPosBills: PosBill[] = [];
  if (scope === 'all') {
    try {
      const posRes = await pgQuery(
        "SELECT * FROM public.pos_bills WHERE business_id = $1 AND status != 'cancelled'",
        [businessId]
      );
      allPosBills = posRes.rows.map(mapRowToPosBill);
    } catch (e) {}
  }

  // Calculate Today's orders & POS bills
  const todayOrders = allBizOrders.filter((o) => new Date(o.createdAt).getTime() >= startOfToday);
  const todayPosBills = allPosBills.filter((b) => new Date(b.createdAt).getTime() >= startOfToday);
  const todayPosRevenue = todayPosBills.reduce((sum, b) => sum + b.totalAmount, 0);

  // Exclude cancelled/rejected orders from revenue KPI
  const validTodayOrders = todayOrders.filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected');
  const todayOrderValue = validTodayOrders.reduce((sum, o) => sum + o.total, 0) + todayPosRevenue;

  // Calculate Yesterday's orders for genuine growth percentage
  const yesterdayOrders = allBizOrders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= startOfYesterday && t < startOfToday;
  });
  const yesterdayPosBills = allPosBills.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= startOfYesterday && t < startOfToday;
  });
  const yesterdayPosRevenue = yesterdayPosBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const validYesterdayOrders = yesterdayOrders.filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected');
  const yesterdayOrderValue = validYesterdayOrders.reduce((sum, o) => sum + o.total, 0) + yesterdayPosRevenue;

  const todayOrderValueChange = yesterdayOrderValue === 0
    ? (todayOrderValue > 0 ? 100 : 0)
    : Math.round(((todayOrderValue - yesterdayOrderValue) / yesterdayOrderValue) * 1000) / 10;

  const totalTodayOrdersCount = todayOrders.length + todayPosBills.length;
  const totalYesterdayOrdersCount = yesterdayOrders.length + yesterdayPosBills.length;

  const todayOrdersChange = totalYesterdayOrdersCount === 0
    ? (totalTodayOrdersCount > 0 ? 100 : 0)
    : Math.round(((totalTodayOrdersCount - totalYesterdayOrdersCount) / totalYesterdayOrdersCount) * 1000) / 10;

  // Today's Payments Collected (Earnings)
  const paidTodayOrders = todayOrders.filter((o) => o.paymentStatus === 'paid');
  const todayEarnings = paidTodayOrders.reduce((sum, o) => sum + o.total, 0) + todayPosRevenue;

  const pendingTodayOrders = todayOrders.filter(
    (o) => o.paymentStatus === 'pending' || o.paymentStatus === 'pay_at_counter'
  );
  const todayPendingAmount = pendingTodayOrders.reduce((sum, o) => sum + o.total, 0);

  // Unique customers today (phone number or name)
  const customerSet = new Set<string>();
  todayOrders.forEach((o) => {
    if (o.customer.phone) customerSet.add(o.customer.phone);
    else if (o.customer.name) customerSet.add(o.customer.name);
    else customerSet.add(o.trackingId);
  });
  const todayCustomersCount = customerSet.size;

  // Status breakdown
  const orderStatusCounts = {
    new: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };
  todayOrders.forEach((o) => {
    if (o.orderStatus === 'new') orderStatusCounts.new++;
    else if (o.orderStatus === 'accepted') orderStatusCounts.accepted++;
    else if (o.orderStatus === 'preparing') orderStatusCounts.preparing++;
    else if (o.orderStatus === 'ready') orderStatusCounts.ready++;
    else if (o.orderStatus === 'completed') orderStatusCounts.completed++;
    else if (o.orderStatus === 'cancelled' || o.orderStatus === 'rejected') orderStatusCounts.cancelled++;
  });

  // Hourly breakdown for Today
  const hourlyMap: { [hour: number]: { count: number; value: number } } = {};
  for (let h = 8; h <= 22; h += 2) {
    hourlyMap[h] = { count: 0, value: 0 };
  }
  todayOrders.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    const bucket = Math.floor(hour / 2) * 2;
    if (hourlyMap[bucket]) {
      hourlyMap[bucket].count += 1;
      if (o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
        hourlyMap[bucket].value += o.total;
      }
    }
  });

  const hourlyOrders = Object.entries(hourlyMap).map(([hour, data]) => {
    const h = Number(hour);
    const label = `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
    return { hour: label, count: data.count, value: Math.round(data.value) };
  });

  // Sales Trend for last 7 or 30 days
  const salesTrend = [];
  const days = timeRange === '30d' ? 30 : 7;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    let storeSales = 0;
    let menuSales = 0;
    let posSales = 0;

    allBizOrders.forEach((o) => {
      const oTime = new Date(o.createdAt).getTime();
      if (oTime >= dayStart && oTime < dayEnd && o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
        if (o.sourceType === 'store') storeSales += o.total;
        if (o.sourceType === 'menu') menuSales += o.total;
      }
    });

    allPosBills.forEach((b) => {
      const bTime = new Date(b.createdAt).getTime();
      if (bTime >= dayStart && bTime < dayEnd && b.status !== 'cancelled') {
        posSales += b.totalAmount;
      }
    });

    salesTrend.push({
      date: d.toISOString().split('T')[0],
      label,
      storeSales: Math.round(storeSales),
      menuSales: Math.round(menuSales),
      posSales: Math.round(posSales),
      totalSales: Math.round(storeSales + menuSales + posSales),
    });
  }

  // Top Selling Products using live product inventory
  const bizProducts = await getProducts(businessId);
  const productSalesMap = new Map<
    string,
    { productId: string; name: string; sourceType: OrderSourceType; qty: number; sales: number; image?: string }
  >();

  allBizOrders.forEach((o) => {
    if (o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
      o.items.forEach((item) => {
        const existing = productSalesMap.get(item.productId);
        const prod = bizProducts.find((p) => p.id === item.productId);
        if (existing) {
          existing.qty += item.quantity;
          existing.sales += item.itemTotal;
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            sourceType: o.sourceType,
            qty: item.quantity,
            sales: item.itemTotal,
            image: prod?.imageUrl,
          });
        }
      });
    }
  });

  const topSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((item, idx) => ({
      productId: item.productId,
      productName: item.name,
      sourceType: item.sourceType,
      quantitySold: item.qty,
      salesValue: Math.round(item.sales),
      rank: idx + 1,
      imageUrl: item.image,
    }));

  // Low stock retail products
  const lowStockAlerts = bizProducts.filter(
    (p) =>
      p.sourceType === 'store' &&
      typeof p.stockQuantity === 'number' &&
      p.stockQuantity <= (p.lowStockThreshold || 5)
  );

  return {
    kpi: {
      todayOrderValue,
      todayOrderValueChange,
      todayEarnings,
      todayPaidAmount: todayEarnings,
      todayPendingAmount,
      todayOrdersCount: todayOrders.length,
      todayOrdersChange,
      todayCustomersCount,
    },
    orderStatusCounts,
    salesTrend,
    hourlyOrders,
    topSellingProducts,
    lowStockAlerts,
    recentOrders: allBizOrders.slice(0, 10),
  };
}

// 10. SUBSCRIPTION & BILLING
export async function getSubscriptionPlans(includeHidden = false): Promise<SubscriptionPlan[]> {
  try {
    const sql = includeHidden
      ? 'SELECT * FROM public.subscription_plans ORDER BY price_monthly ASC'
      : 'SELECT * FROM public.subscription_plans WHERE is_visible = true ORDER BY price_monthly ASC';
    const res = await pgQuery(sql);
    if (res.rows.length > 0) return res.rows.map(mapRowToSubscriptionPlan);
  } catch (err) {
    console.error('pg getSubscriptionPlans error:', err);
  }
  return cachedDb.subscriptionPlans.filter((p) => includeHidden || p.isVisible !== false);
}

export async function checkBusinessModuleAccess(
  businessId: string,
  module: 'store' | 'menu'
): Promise<{ allowed: boolean; plan: SubscriptionPlan | null; message?: string }> {
  const biz = await getBusinessById(businessId);
  if (!biz) return { allowed: false, plan: null, message: 'Business not found' };

  const planId = biz.subscription?.planId || 'plan_basic';
  const plans = await getSubscriptionPlans(true);
  const plan = plans.find((p) => p.id === planId) || null;

  const isStoreCategory = [
    'hardware',
    'hardware_building_materials',
    'retail',
    'retail_shop',
    'grocery',
    'grocery_kirana',
    'other',
  ].includes(biz.type);

  if (module === 'store') {
    // Starter plan includes Materials & Inventory for Hardware and Retail businesses
    if (isStoreCategory || plan?.allowsStore !== false) {
      return { allowed: true, plan };
    }
    return {
      allowed: false,
      plan,
      message: 'Store module requires an upgraded subscription plan or a retail/hardware business category.',
    };
  }

  return { allowed: true, plan };
}

export async function getBusinessUpiSettings(businessId: string): Promise<BusinessUpiSettings | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.business_upi_settings WHERE business_id = $1', [businessId]);
    if (res.rows.length > 0) {
      return mapRowToUpiSettings(res.rows[0]);
    }
  } catch (err) {
    console.error('pg getBusinessUpiSettings error:', err);
  }

  // Fallback to settings.upiSettings
  const biz = await getBusinessById(businessId);
  return (biz?.settings as any)?.upiSettings || null;
}

export async function saveBusinessUpiSettings(
  businessId: string,
  data: {
    upiId: string;
    payeeName: string;
    qrImageUrl?: string;
    instructions?: string;
    storeUrl?: string;
    isEnabled?: boolean;
  }
): Promise<BusinessUpiSettings> {
  const biz = await getBusinessById(businessId);
  if (!biz || !hasActiveGoldAccess(biz)) {
    throw new Error('Custom UPI payment configuration requires an upgraded subscription plan with UPI support. Please upgrade your subscription to enable direct UPI customer payments.');
  }

  const isEnabled = data.isEnabled !== false;
  const now = new Date().toISOString();

  try {
    await pgQuery(
      `
      INSERT INTO public.business_upi_settings (business_id, upi_id, payee_name, qr_image_url, instructions, store_url, is_enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (business_id) DO UPDATE SET
        upi_id = EXCLUDED.upi_id,
        payee_name = EXCLUDED.payee_name,
        qr_image_url = EXCLUDED.qr_image_url,
        instructions = EXCLUDED.instructions,
        store_url = EXCLUDED.store_url,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW()
      `,
      [businessId, data.upiId.trim(), data.payeeName.trim(), data.qrImageUrl || null, data.instructions || null, data.storeUrl || null, isEnabled]
    );

    // Also persist inside business.settings.upiSettings
    const biz = await getBusinessById(businessId);
    if (biz) {
      const updatedSettings = {
        ...biz.settings,
        upiSettings: {
          businessId,
          upiId: data.upiId.trim(),
          payeeName: data.payeeName.trim(),
          qrImageUrl: data.qrImageUrl,
          instructions: data.instructions,
          storeUrl: data.storeUrl,
          isEnabled,
          updatedAt: now,
        },
      };
      await updateBusiness(businessId, { settings: updatedSettings as any });
    }
  } catch (err) {
    console.error('pg saveBusinessUpiSettings error:', err);
  }

  return {
    businessId,
    upiId: data.upiId.trim(),
    payeeName: data.payeeName.trim(),
    qrImageUrl: data.qrImageUrl,
    instructions: data.instructions,
    storeUrl: data.storeUrl,
    isEnabled,
    updatedAt: now,
  };
}

export async function createSubscriptionPayment(data: {
  businessId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  notes?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  razorpayOrderId?: string;
  previousPlanId?: string;
}): Promise<SubscriptionPayment> {
  const plans = await getSubscriptionPlans(true);
  const plan = plans.find((p) => p.id === data.planId);
  if (!plan) throw new Error('Selected subscription plan not found');

  if (plan.isVisible === false) {
    throw new Error('This subscription plan is not currently open for public registration');
  }

  const paymentId = generateId('subpay');
  const amount = data.billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  const now = new Date().toISOString();

  const record: SubscriptionPayment = {
    id: paymentId,
    businessId: data.businessId,
    planId: data.planId,
    amount,
    currency: 'INR',
    billingCycle: data.billingCycle,
    status: 'pending',
    paymentMethod: data.paymentMethod || 'razorpay',
    paymentProvider: data.paymentProvider || 'razorpay',
    razorpayOrderId: data.razorpayOrderId || undefined,
    previousPlanId: data.previousPlanId || undefined,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await pgQuery(
      `
      INSERT INTO public.subscription_payments (
        id, business_id, plan_id, amount, currency, billing_cycle,
        status, payment_method, payment_provider, razorpay_order_id,
        previous_plan_id, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `,
      [
        record.id,
        record.businessId,
        record.planId,
        record.amount,
        record.currency,
        record.billingCycle,
        record.status,
        record.paymentMethod,
        record.paymentProvider,
        record.razorpayOrderId || null,
        record.previousPlanId || null,
        record.notes || null,
      ]
    );
  } catch (err) {
    console.error('pg createSubscriptionPayment error:', err);
  }

  return record;
}

export async function completeRazorpaySubscriptionPayment(params: {
  paymentId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  razorpayOrderId?: string;
}): Promise<{ success: boolean; payment: SubscriptionPayment; business: Business; message: string }> {
  const { paymentId, razorpayPaymentId, razorpaySignature, razorpayOrderId } = params;

  // Retrieve payment
  const res = await pgQuery('SELECT * FROM public.subscription_payments WHERE id = $1', [paymentId]);
  if (res.rows.length === 0) {
    throw new Error('Subscription payment record not found');
  }
  const payment = mapRowToSubscriptionPayment(res.rows[0]);

  const business = await getBusinessById(payment.businessId);
  if (!business) {
    throw new Error('Associated business not found');
  }

  // Idempotency: if already completed, return without double-activation
  if (payment.status === 'completed' && payment.verificationStatus === 'verified') {
    return {
      success: true,
      payment,
      business,
      message: 'Subscription payment was already verified and active.',
    };
  }

  const plans = await getSubscriptionPlans(true);
  const plan = plans.find((p) => p.id === payment.planId);
  if (!plan) {
    throw new Error('Target subscription plan not found');
  }

  const nowMs = Date.now();
  const startsAt = new Date(nowMs).toISOString();
  const daysToAdd = payment.billingCycle === 'annual'
    ? (plan.validityDaysAnnual || 365)
    : (plan.validityDaysMonthly || 30);
  const expiresAt = new Date(nowMs + daysToAdd * 86400000).toISOString();

  // 1. Update subscription_payments record
  await pgQuery(
    `
    UPDATE public.subscription_payments
    SET status = 'completed',
        verification_status = 'verified',
        payment_reference = $1,
        razorpay_payment_id = $1,
        razorpay_signature = $2,
        razorpay_order_id = COALESCE($3, razorpay_order_id),
        starts_at = $4,
        expires_at = $5,
        updated_at = NOW()
    WHERE id = $6
    `,
    [razorpayPaymentId, razorpaySignature, razorpayOrderId || null, startsAt, expiresAt, paymentId]
  );

  payment.status = 'completed';
  payment.verificationStatus = 'verified';
  payment.paymentReference = razorpayPaymentId;
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.startsAt = startsAt;
  payment.expiresAt = expiresAt;

  // 2. Update business subscription & modules
  const prevPlanId = business.subscription?.planId || 'plan_basic';
  const isUpgrade = prevPlanId !== payment.planId;

  business.subscription = {
    planId: payment.planId,
    status: 'active',
    billingCycle: payment.billingCycle,
    startsAt,
    renewsAt: expiresAt,
    amount: payment.amount,
    previousPlanId: prevPlanId,
    paymentProvider: 'razorpay',
    lastPaymentId: payment.id,
    scheduledDowngradePlanId: undefined,
    scheduledDowngradeDate: undefined,
  };

  if (!plan.allowsStore) {
    business.settings.modules.store = false;
  } else {
    business.settings.modules.store = true;
  }

  await pgQuery(
    `
    UPDATE public.businesses
    SET subscription = $1, settings = $2, updated_at = NOW()
    WHERE id = $3
    `,
    [JSON.stringify(business.subscription), JSON.stringify(business.settings), business.id]
  );

  // 3. Record in subscription_history for complete audit trail
  const historyId = generateId('subhist');
  const changeType = isUpgrade ? 'upgrade' : 'renewal';
  await pgQuery(
    `
    INSERT INTO public.subscription_history (
      id, business_id, previous_plan_id, new_plan_id, change_type,
      payment_id, amount, effective_date, expires_at, notes, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `,
    [
      historyId,
      business.id,
      prevPlanId,
      payment.planId,
      changeType,
      payment.id,
      payment.amount,
      startsAt,
      expiresAt,
      `Razorpay payment verified: ${plan.name} plan activated for 30 days`,
    ]
  );

  // 4. Audit Log
  await addAuditLog({
    action: isUpgrade ? 'SUBSCRIPTION_UPGRADED' : 'SUBSCRIPTION_RENEWED',
    businessId: business.id,
    details: JSON.stringify({
      entityType: 'subscription',
      paymentId: payment.id,
      previousPlanId: prevPlanId,
      newPlanId: payment.planId,
      amount: payment.amount,
      razorpayPaymentId,
      expiresAt,
    }),
  });

  return {
    success: true,
    payment,
    business,
    message: `Payment verified successfully! Your business is now on the ${plan.name} plan with 30-day validity until ${new Date(expiresAt).toLocaleDateString('en-IN')}.`,
  };
}

export async function scheduleSubscriptionDowngrade(
  businessId: string,
  targetPlanId: string
): Promise<{ success: boolean; business: Business; message: string }> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const plans = await getSubscriptionPlans(true);
  const targetPlan = plans.find((p) => p.id === targetPlanId);
  if (!targetPlan) throw new Error('Target plan not found');

  const currentPlanId = business.subscription?.planId || 'plan_basic';
  if (currentPlanId === targetPlanId) {
    throw new Error('Business is already on this plan');
  }

  // Downgrade takes effect at current plan expiry date
  const effectiveDate = business.subscription?.renewsAt || new Date().toISOString();

  business.subscription.scheduledDowngradePlanId = targetPlanId;
  business.subscription.scheduledDowngradeDate = effectiveDate;

  await pgQuery(
    `
    UPDATE public.businesses
    SET subscription = $1, updated_at = NOW()
    WHERE id = $2
    `,
    [JSON.stringify(business.subscription), business.id]
  );

  const historyId = generateId('subhist');
  await pgQuery(
    `
    INSERT INTO public.subscription_history (
      id, business_id, previous_plan_id, new_plan_id, change_type,
      effective_date, notes, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
    [
      historyId,
      business.id,
      currentPlanId,
      targetPlanId,
      'downgrade_scheduled',
      effectiveDate,
      `Downgrade to ${targetPlan.name} scheduled for ${new Date(effectiveDate).toLocaleDateString('en-IN')}. Paid Gold benefits retained until then.`,
    ]
  );

  await addAuditLog({
    action: 'SUBSCRIPTION_DOWNGRADE_SCHEDULED',
    businessId: business.id,
    details: JSON.stringify({
      fromPlan: currentPlanId,
      toPlan: targetPlanId,
      effectiveDate,
    }),
  });

  return {
    success: true,
    business,
    message: `Downgrade scheduled! You will retain full Gold benefits until ${new Date(effectiveDate).toLocaleDateString('en-IN')}. Afterwards, your account will switch to ${targetPlan.name} without deleting any catalog items.`,
  };
}

export async function cancelSubscriptionDowngrade(
  businessId: string
): Promise<{ success: boolean; business: Business; message: string }> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  if (!business.subscription?.scheduledDowngradePlanId) {
    throw new Error('No scheduled downgrade found to cancel');
  }

  const cancelledTarget = business.subscription.scheduledDowngradePlanId;
  delete business.subscription.scheduledDowngradePlanId;
  delete business.subscription.scheduledDowngradeDate;

  await pgQuery(
    `
    UPDATE public.businesses
    SET subscription = $1, updated_at = NOW()
    WHERE id = $2
    `,
    [JSON.stringify(business.subscription), business.id]
  );

  const historyId = generateId('subhist');
  await pgQuery(
    `
    INSERT INTO public.subscription_history (
      id, business_id, previous_plan_id, new_plan_id, change_type,
      notes, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [
      historyId,
      business.id,
      cancelledTarget,
      business.subscription.planId,
      'downgrade_cancelled',
      `Scheduled downgrade to ${cancelledTarget} was cancelled by user.`,
    ]
  );

  return {
    success: true,
    business,
    message: 'Scheduled downgrade cancelled. Your current subscription continues unchanged.',
  };
}

export async function checkAndApplySubscriptionExpiry(businessId: string): Promise<Business | null> {
  const business = await getBusinessById(businessId);
  if (!business || !business.subscription) return business;

  const nowMs = Date.now();
  const sub = business.subscription;
  const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : 0;

  // 1. Check if scheduled downgrade has arrived
  if (sub.scheduledDowngradePlanId && sub.scheduledDowngradeDate) {
    const downgradeDateMs = new Date(sub.scheduledDowngradeDate).getTime();
    if (nowMs >= downgradeDateMs) {
      const targetPlanId = sub.scheduledDowngradePlanId;
      const plans = await getSubscriptionPlans(true);
      const targetPlan = plans.find((p) => p.id === targetPlanId);

      sub.previousPlanId = sub.planId;
      sub.planId = targetPlanId;
      delete sub.scheduledDowngradePlanId;
      delete sub.scheduledDowngradeDate;

      if (targetPlan && !targetPlan.allowsStore) {
        business.settings.modules.store = false;
      }

      await pgQuery(
        `UPDATE public.businesses SET subscription = $1, settings = $2, updated_at = NOW() WHERE id = $3`,
        [JSON.stringify(sub), JSON.stringify(business.settings), business.id]
      );

      const historyId = generateId('subhist');
      await pgQuery(
        `INSERT INTO public.subscription_history (id, business_id, previous_plan_id, new_plan_id, change_type, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [historyId, business.id, sub.previousPlanId, targetPlanId, 'downgrade_applied', 'Scheduled downgrade took effect at expiration date. Existing catalog preserved.']
      );

      return business;
    }
  }

  // 2. Check 30-day expiry
  if (sub.status === 'active' && renewsAtMs > 0 && nowMs > renewsAtMs) {
    sub.status = 'expired';
    await pgQuery(
      `UPDATE public.businesses SET subscription = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(sub), business.id]
    );

    const historyId = generateId('subhist');
    await pgQuery(
      `INSERT INTO public.subscription_history (id, business_id, previous_plan_id, new_plan_id, change_type, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [historyId, business.id, sub.planId, sub.planId, 'expired', 'Subscription expired after 30-day term.']
    );
  }

  return business;
}

export async function getSubscriptionHistory(businessId: string): Promise<SubscriptionHistory[]> {
  try {
    const res = await pgQuery(
      `SELECT * FROM public.subscription_history WHERE business_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [businessId]
    );
    return res.rows.map(mapRowToSubscriptionHistory);
  } catch (err) {
    console.error('getSubscriptionHistory error:', err);
    return [];
  }
}

export async function recordWebhookEvent(
  id: string,
  eventType: string,
  payload: any
): Promise<{ isNew: boolean }> {
  try {
    const res = await pgQuery(
      `
      INSERT INTO public.webhook_events (id, provider, event_type, payload, processed, created_at)
      VALUES ($1, 'razorpay', $2, $3, FALSE, NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
      `,
      [id, eventType, JSON.stringify(payload)]
    );
    return { isNew: res.rows.length > 0 };
  } catch (err) {
    console.error('recordWebhookEvent error:', err);
    return { isNew: false };
  }
}

export async function markWebhookProcessed(id: string): Promise<void> {
  try {
    await pgQuery(
      `UPDATE public.webhook_events SET processed = TRUE, processed_at = NOW() WHERE id = $1`,
      [id]
    );
  } catch (err) {
    console.error('markWebhookProcessed error:', err);
  }
}

export async function confirmSubscriptionPayment(
  paymentId: string,
  paymentReference: string,
  autoActivate: boolean = true
): Promise<{ success: boolean; payment: SubscriptionPayment; message: string }> {
  try {
    const res = await pgQuery('SELECT * FROM public.subscription_payments WHERE id = $1', [paymentId]);
    if (res.rows.length === 0) {
      throw new Error('Subscription payment record not found');
    }
    const payment = mapRowToSubscriptionPayment(res.rows[0]);

    if (payment.status === 'completed') {
      return { success: true, payment, message: 'Subscription is already active.' };
    }

    const newStatus = autoActivate ? 'completed' : 'pending_verification';

    await pgQuery(
      `
      UPDATE public.subscription_payments 
      SET status = $1, payment_reference = $2, updated_at = NOW()
      WHERE id = $3
      `,
      [newStatus, paymentReference.trim(), paymentId]
    );

    payment.status = newStatus;
    payment.paymentReference = paymentReference.trim();

    if (autoActivate) {
      await updateBusinessSubscription(payment.businessId, payment.planId, payment.billingCycle);
      await addAuditLog({
        action: 'SUBSCRIPTION_ACTIVATED',
        businessId: payment.businessId,
        details: JSON.stringify({
          entityType: 'subscription',
          entityId: paymentId,
          planId: payment.planId,
          amount: payment.amount,
          reference: paymentReference,
        }),
      });
    }

    return {
      success: true,
      payment,
      message: autoActivate
        ? 'Subscription payment verified and plan activated successfully.'
        : 'Payment reference submitted. Your subscription will be activated upon admin confirmation.',
    };
  } catch (err: any) {
    console.error('confirmSubscriptionPayment error:', err);
    throw err;
  }
}

export async function getSubscriptionPayments(businessId?: string): Promise<SubscriptionPayment[]> {
  try {
    let sql = 'SELECT * FROM public.subscription_payments';
    const params: any[] = [];
    if (businessId) {
      params.push(businessId);
      sql += ' WHERE business_id = $1';
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const res = await pgQuery(sql, params);
    if (res.rows.length > 0) {
      return res.rows.map(mapRowToSubscriptionPayment);
    }
  } catch (err) {}
  return [];
}

export async function updateBusinessSubscription(
  businessId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual'
): Promise<Business | null> {
  const business = await getBusinessById(businessId);
  const plans = await getSubscriptionPlans(true);
  const plan = plans.find((p) => p.id === planId);
  if (!business || !plan) return null;

  const amount = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  const daysToAdd = billingCycle === 'annual'
    ? (plan.validityDaysAnnual || 365)
    : (plan.validityDaysMonthly || 30);

  business.subscription = {
    planId,
    status: 'active',
    billingCycle,
    renewsAt: new Date(Date.now() + daysToAdd * 86400000).toISOString(),
    amount,
  };

  // If plan allows store, enable store module; if Basic, disable store module
  if (!plan.allowsStore) {
    business.settings.modules.store = false;
  } else {
    business.settings.modules.store = true;
  }

  try {
    await pgQuery(`
      UPDATE public.businesses 
      SET subscription = $1, settings = $2, updated_at = NOW() 
      WHERE id = $3
    `, [JSON.stringify(business.subscription), JSON.stringify(business.settings), businessId]);
  } catch (err) {
    console.error('pg updateBusinessSubscription error:', err);
  }

  // Update memory cache
  const idx = cachedDb.businesses.findIndex((b) => b.id === businessId);
  if (idx !== -1) {
    cachedDb.businesses[idx] = business;
  } else {
    cachedDb.businesses.push(business);
  }
  saveDatabase();

  return business;
}

// 11. AUDIT LOGS & PLATFORM ADMIN
export async function getAuditLogs(): Promise<AuditLog[]> {
  return [...cachedDb.auditLogs].slice(0, 50);
}

export async function addAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  cachedDb.auditLogs.unshift({
    ...data,
    id: generateId('audit'),
    timestamp: new Date().toISOString(),
  });
  saveDatabase();
}

export async function getPlatformOverview() {
  try {
    const [bizCountRes, orderCountRes, revenueRes, activeSubRes, plansRes] = await Promise.all([
      pgQuery('SELECT COUNT(*) as count FROM public.businesses'),
      pgQuery('SELECT COUNT(*) as count FROM public.orders'),
      pgQuery("SELECT COALESCE(SUM(total), 0) as total FROM public.orders WHERE payment_status = 'paid'"),
      pgQuery("SELECT COUNT(*) as count FROM public.businesses WHERE subscription->>'status' = 'active'"),
      pgQuery('SELECT * FROM public.subscription_plans ORDER BY price_monthly ASC'),
    ]);

    const totalBusinesses = parseInt(bizCountRes.rows[0]?.count || '0', 10);
    const totalOrders = parseInt(orderCountRes.rows[0]?.count || '0', 10);
    const totalRevenue = parseFloat(revenueRes.rows[0]?.total || '0');
    const activeSubscriptions = parseInt(activeSubRes.rows[0]?.count || '0', 10);
    const plans = plansRes.rows.map(mapRowToSubscriptionPlan);

    return {
      totalBusinesses,
      totalOrders,
      totalRevenue,
      activeSubscriptions,
      businesses: cachedDb.businesses,
      plans,
    };
  } catch (e) {
    console.error('getPlatformOverview error:', e);
  }

  const totalBusinesses = cachedDb.businesses.length;
  const totalOrders = cachedDb.orders.length;
  const totalRevenue = cachedDb.orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
  const activeSubscriptions = cachedDb.businesses.filter((b) => b.subscription?.status === 'active').length;

  return {
    totalBusinesses,
    totalOrders,
    totalRevenue,
    activeSubscriptions,
    businesses: cachedDb.businesses,
    plans: cachedDb.subscriptionPlans,
  };
}

export async function clearDemoData(businessId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (businessId) {
      await pgQuery('DELETE FROM public.orders WHERE business_id = $1', [businessId]);
      await pgQuery('DELETE FROM public.notifications WHERE business_id = $1', [businessId]);
      await pgQuery('DELETE FROM public.queue_tokens WHERE business_id = $1', [businessId]);
      cachedDb.orders = cachedDb.orders.filter((o) => o.businessId !== businessId);
      cachedDb.notifications = cachedDb.notifications.filter((n) => n.businessId !== businessId);
      cachedDb.queueTokens = cachedDb.queueTokens.filter((q) => q.businessId !== businessId);
    } else {
      await pgQuery('DELETE FROM public.orders');
      await pgQuery('DELETE FROM public.notifications');
      await pgQuery('DELETE FROM public.queue_tokens');
      cachedDb.orders = [];
      cachedDb.notifications = [];
      cachedDb.queueTokens = [];
    }
    saveDatabase();
    return { success: true, message: 'All demo and test orders, notifications, and queue tokens successfully purged.' };
  } catch (err: any) {
    console.error('clearDemoData error:', err);
    throw err;
  }
}

// ==========================================
// HOTEL ROOM OPERATIONS (TENANT ISOLATED)
// ==========================================

export async function getHotelRooms(
  businessId: string,
  onlyActive = false
): Promise<HotelRoom[]> {
  try {
    let sql = 'SELECT * FROM public.hotel_rooms WHERE business_id = $1';
    const params: any[] = [businessId];
    if (onlyActive) {
      sql += ' AND is_active = true';
    }
    sql += ' ORDER BY room_number ASC';
    const res = await pgQuery(sql, params);
    return res.rows.map(mapRowToHotelRoom);
  } catch (err) {
    console.error('getHotelRooms error:', err);
    return (cachedDb.hotelRooms || [])
      .filter((r) => r.businessId === businessId && (!onlyActive || r.isActive))
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  }
}

export async function getHotelRoomById(id: string): Promise<HotelRoom | null> {
  try {
    const res = await pgQuery('SELECT * FROM public.hotel_rooms WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length > 0) return mapRowToHotelRoom(res.rows[0]);
  } catch (err) {
    console.error('getHotelRoomById error:', err);
  }
  return (cachedDb.hotelRooms || []).find((r) => r.id === id) || null;
}

export async function getHotelRoomByNumber(
  businessId: string,
  roomNumber: string
): Promise<HotelRoom | null> {
  try {
    const res = await pgQuery(
      'SELECT * FROM public.hotel_rooms WHERE business_id = $1 AND LOWER(TRIM(room_number)) = LOWER(TRIM($2)) LIMIT 1',
      [businessId, roomNumber]
    );
    if (res.rows.length > 0) return mapRowToHotelRoom(res.rows[0]);
  } catch (err) {
    console.error('getHotelRoomByNumber error:', err);
  }
  return (
    (cachedDb.hotelRooms || []).find(
      (r) => r.businessId === businessId && r.roomNumber.toLowerCase().trim() === roomNumber.toLowerCase().trim()
    ) || null
  );
}

export async function createHotelRoom(
  data: Omit<HotelRoom, 'id' | 'createdAt' | 'updatedAt'>
): Promise<HotelRoom> {
  const id = generateId('room');
  const now = new Date().toISOString();
  const roomNumber = data.roomNumber.trim();
  const floor = data.floor?.trim() || null;
  const roomType = data.roomType?.trim() || null;
  const notes = data.notes?.trim() || null;
  const isActive = data.isActive !== undefined ? data.isActive : true;

  try {
    const res = await pgQuery(
      `INSERT INTO public.hotel_rooms (id, business_id, room_number, floor, room_type, is_active, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, data.businessId, roomNumber, floor, roomType, isActive, notes, now, now]
    );
    if (res.rows.length > 0) {
      const room = mapRowToHotelRoom(res.rows[0]);
      if (!cachedDb.hotelRooms) cachedDb.hotelRooms = [];
      cachedDb.hotelRooms.push(room);
      return room;
    }
  } catch (err: any) {
    if (err?.code === '23505') {
      throw new Error(`Room number "${roomNumber}" already exists for this hotel.`);
    }
    console.error('createHotelRoom pg error:', err);
    throw err;
  }

  const newRoom: HotelRoom = {
    id,
    businessId: data.businessId,
    roomNumber,
    floor: floor || undefined,
    roomType: roomType || undefined,
    isActive,
    notes: notes || undefined,
    createdAt: now,
    updatedAt: now,
  };
  if (!cachedDb.hotelRooms) cachedDb.hotelRooms = [];
  cachedDb.hotelRooms.push(newRoom);
  return newRoom;
}

export async function createHotelRoomsBatch(
  businessId: string,
  rooms: Array<{ roomNumber: string; floor?: string; roomType?: string; notes?: string }>
): Promise<{ created: HotelRoom[]; skipped: string[] }> {
  const created: HotelRoom[] = [];
  const skipped: string[] = [];

  for (const item of rooms) {
    const trimmed = item.roomNumber.trim();
    if (!trimmed) continue;
    try {
      const existing = await getHotelRoomByNumber(businessId, trimmed);
      if (existing) {
        skipped.push(trimmed);
        continue;
      }
      const room = await createHotelRoom({
        businessId,
        roomNumber: trimmed,
        floor: item.floor,
        roomType: item.roomType,
        isActive: true,
        notes: item.notes,
      });
      created.push(room);
    } catch (e) {
      skipped.push(trimmed);
    }
  }

  return { created, skipped };
}

export async function updateHotelRoom(
  id: string,
  updates: Partial<Omit<HotelRoom, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
): Promise<HotelRoom | null> {
  const now = new Date().toISOString();
  try {
    const setClauses: string[] = ['updated_at = $2'];
    const params: any[] = [id, now];
    let paramIndex = 3;

    if (updates.roomNumber !== undefined) {
      setClauses.push(`room_number = $${paramIndex++}`);
      params.push(updates.roomNumber.trim());
    }
    if (updates.floor !== undefined) {
      setClauses.push(`floor = $${paramIndex++}`);
      params.push(updates.floor?.trim() || null);
    }
    if (updates.roomType !== undefined) {
      setClauses.push(`room_type = $${paramIndex++}`);
      params.push(updates.roomType?.trim() || null);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(updates.isActive);
    }
    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(updates.notes?.trim() || null);
    }

    const sql = `UPDATE public.hotel_rooms SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
    const res = await pgQuery(sql, params);
    if (res.rows.length > 0) {
      const updated = mapRowToHotelRoom(res.rows[0]);
      if (cachedDb.hotelRooms) {
        const idx = cachedDb.hotelRooms.findIndex((r) => r.id === id);
        if (idx !== -1) cachedDb.hotelRooms[idx] = updated;
      }
      return updated;
    }
  } catch (err: any) {
    if (err?.code === '23505') {
      throw new Error(`Room number "${updates.roomNumber}" already exists for this hotel.`);
    }
    console.error('updateHotelRoom error:', err);
    throw err;
  }
  return null;
}

export async function deleteHotelRoom(id: string, businessId?: string): Promise<boolean> {
  try {
    let sql = 'DELETE FROM public.hotel_rooms WHERE id = $1';
    const params: any[] = [id];
    if (businessId) {
      sql += ' AND business_id = $2';
      params.push(businessId);
    }
    const res = await pgQuery(sql, params);
    if (cachedDb.hotelRooms) {
      cachedDb.hotelRooms = cachedDb.hotelRooms.filter((r) => r.id !== id);
    }
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('deleteHotelRoom error:', err);
    return false;
  }
}

export async function getHotelRoomStats(businessId: string): Promise<{
  total: number;
  active: number;
  floors: string[];
}> {
  const rooms = await getHotelRooms(businessId);
  const floors = Array.from(new Set(rooms.map((r) => r.floor).filter((f): f is string => Boolean(f)))).sort();
  return {
    total: rooms.length,
    active: rooms.filter((r) => r.isActive).length,
    floors,
  };
}

// ============================================================
// 12. POS / COUNTER BILLING OPERATIONS
// ============================================================

export async function createPosBill(input: CreatePosBillInput): Promise<PosBill> {
  const business = await getBusinessById(input.businessId);
  if (!business) {
    throw new Error('Business not found');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('At least one item is required to generate a bill');
  }

  // Fetch all business products
  const products = await getProducts(input.businessId);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const billId = generateId('pos_bill');
  const billItems: PosBillItem[] = [];
  let subtotal = 0;

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new Error(`Quantity for ${item.productName || 'item'} must be greater than zero`);
    }

    let unitPrice = item.unitPrice;
    let prodName = item.productName;
    let variantName = item.variantName;
    let itemSize = item.size;
    let itemUnit = item.unit;

    if (item.productId) {
      const prod = productMap.get(item.productId);
      if (prod) {
        prodName = prod.name;
        itemUnit = itemUnit || prod.unit;
        itemSize = itemSize || prod.size;

        if (item.variantId && prod.variants?.length) {
          const v = prod.variants.find((vr) => vr.id === item.variantId);
          if (v) {
            variantName = v.name;
            itemSize = v.size || v.name;
            itemUnit = v.unit || itemUnit;
            unitPrice = typeof item.unitPrice === 'number' && item.unitPrice >= 0 ? item.unitPrice : (v.price || unitPrice);
            if (typeof v.stockQuantity === 'number' && v.stockQuantity < item.quantity) {
              throw new Error(`Insufficient stock for "${prod.name} (${v.name})". Available: ${v.stockQuantity}, Requested: ${item.quantity}`);
            }
            if (typeof v.stockQuantity === 'number') {
              v.stockQuantity = Math.max(0, v.stockQuantity - item.quantity);
              pgQuery('UPDATE public.products SET variants = $1 WHERE id = $2', [
                JSON.stringify(prod.variants),
                prod.id,
              ]).catch(() => {});
            }
          }
        } else if (typeof prod.stockQuantity === 'number' && prod.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stockQuantity}, Requested: ${item.quantity}`);
        }
      }
    }

    if (variantName || itemSize) {
      const spec = variantName || itemSize;
      if (spec && !prodName.includes(spec)) {
        prodName = `${prodName} (${spec})`;
      }
    }

    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
    subtotal += lineTotal;

    billItems.push({
      id: generateId('pos_item'),
      billId,
      businessId: input.businessId,
      productId: item.productId || undefined,
      productName: prodName,
      variantName: variantName || undefined,
      size: itemSize || undefined,
      unit: itemUnit || undefined,
      unitPrice,
      quantity: item.quantity,
      totalPrice: lineTotal,
      createdAt: new Date().toISOString(),
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Compute discount
  let discountAmount = 0;
  const discountType = input.discountType || 'fixed';
  const discountVal = Number(input.discountValue || 0);

  if (discountVal > 0) {
    if (discountType === 'percentage') {
      discountAmount = Math.min(subtotal, Math.round(((subtotal * discountVal) / 100) * 100) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.round(discountVal * 100) / 100);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Compute tax
  const taxRate = typeof input.taxRate === 'number' ? input.taxRate : (business.settings?.orderSettings?.taxRatePercentage || 0);
  let taxAmount = 0;
  if (taxRate > 0) {
    taxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
  }

  const totalAmount = Math.max(0, Math.round((taxableAmount + taxAmount) * 100) / 100);

  // Generate unique atomic Bill Number (e.g. POS-00101)
  let billNumber = '';
  try {
    const res = await pgQuery('SELECT generate_next_order_token($1, $2) as bill_num', [input.businessId, 'pos']);
    if (res.rows.length > 0 && res.rows[0].bill_num) {
      billNumber = res.rows[0].bill_num;
    }
  } catch (err) {
    console.error('Error generating pos bill number via DB function, fallback sequence:', err);
  }

  if (!billNumber) {
    const seqKey = `${input.businessId}_pos`;
    const nextSeq = (cachedDb.sequences[seqKey] || 100) + 1;
    cachedDb.sequences[seqKey] = nextSeq;
    const prefix = business.settings?.tokenPrefixPos || 'POS-';
    billNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  const nowIso = new Date().toISOString();

  const newBill: PosBill = {
    id: billId,
    businessId: input.businessId,
    billNumber,
    customerName: input.customerName?.trim() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    subtotal,
    discountType,
    discountRate: discountVal,
    discountAmount,
    taxRate,
    taxAmount,
    totalAmount,
    paymentMethod: input.paymentMethod || 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    notes: input.notes?.trim() || undefined,
    createdBy: input.createdBy || undefined,
    items: billItems,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Insert into PostgreSQL pos_bills
  await pgQuery(
    `INSERT INTO public.pos_bills (
      id, business_id, bill_number, customer_name, customer_phone,
      subtotal, discount_type, discount_rate, discount_amount,
      tax_rate, tax_amount, total_amount, payment_method,
      payment_status, status, notes, created_by, items,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20
    )`,
    [
      newBill.id,
      newBill.businessId,
      newBill.billNumber,
      newBill.customerName || null,
      newBill.customerPhone || null,
      newBill.subtotal,
      newBill.discountType,
      newBill.discountRate,
      newBill.discountAmount,
      newBill.taxRate,
      newBill.taxAmount,
      newBill.totalAmount,
      newBill.paymentMethod,
      newBill.paymentStatus,
      newBill.status,
      newBill.notes || null,
      newBill.createdBy || null,
      JSON.stringify(newBill.items),
      newBill.createdAt,
      newBill.updatedAt,
    ]
  );

  // Insert items into public.pos_bill_items
  for (const item of billItems) {
    await pgQuery(
      `INSERT INTO public.pos_bill_items (
        id, bill_id, business_id, product_id, product_name, variant_name, size, unit, unit_price, quantity, total_price, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        item.id,
        item.billId,
        item.businessId,
        item.productId || null,
        item.productName,
        item.variantName || null,
        item.size || null,
        item.unit || null,
        item.unitPrice,
        item.quantity,
        item.totalPrice,
        item.createdAt,
      ]
    );

    // Safely update inventory stock if stockQuantity is tracked
    if (item.productId) {
      await pgQuery(
        `UPDATE public.products 
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - $1),
            is_available = CASE WHEN COALESCE(stock_quantity, 0) - $1 <= 0 THEN false ELSE is_available END
        WHERE id = $2 AND business_id = $3 AND stock_quantity IS NOT NULL`,
        [item.quantity, item.productId, input.businessId]
      );
    }
  }

  // Audit log
  try {
    await pgQuery(
      `INSERT INTO public.audit_logs (id, business_id, user_name, action, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateId('audit'),
        input.businessId,
        input.createdBy || 'Counter Staff',
        'pos_bill_created',
        `Created counter POS bill #${billNumber} for ₹${totalAmount} (${input.paymentMethod || 'cash'})`,
        nowIso,
      ]
    );
  } catch (auditErr) {
    console.error('Audit log error for POS bill creation:', auditErr);
  }

  return newBill;
}

export async function getPosBills(
  businessId: string,
  options?: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ bills: PosBill[]; totalCount: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const search = options?.search?.trim() || '';

  let query = 'SELECT * FROM public.pos_bills WHERE business_id = $1';
  let countQuery = 'SELECT COUNT(*)::int AS count FROM public.pos_bills WHERE business_id = $1';
  const params: any[] = [businessId];
  let paramIdx = 2;

  if (search) {
    const searchFilter = ` AND (bill_number ILIKE $${paramIdx} OR customer_name ILIKE $${paramIdx} OR customer_phone ILIKE $${paramIdx})`;
    query += searchFilter;
    countQuery += searchFilter;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (options?.startDate) {
    const startFilter = ` AND created_at >= $${paramIdx}`;
    query += startFilter;
    countQuery += startFilter;
    params.push(options.startDate);
    paramIdx++;
  }

  if (options?.endDate) {
    const endFilter = ` AND created_at <= $${paramIdx}`;
    query += endFilter;
    countQuery += endFilter;
    params.push(options.endDate);
    paramIdx++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  const queryParams = [...params, limit, offset];

  const [res, countRes] = await Promise.all([
    pgQuery(query, queryParams),
    pgQuery(countQuery, params),
  ]);

  return {
    bills: res.rows.map(mapRowToPosBill),
    totalCount: countRes.rows[0]?.count || 0,
  };
}

export async function getPosBillById(businessId: string, billId: string): Promise<PosBill | null> {
  const res = await pgQuery(
    'SELECT * FROM public.pos_bills WHERE id = $1 AND business_id = $2',
    [billId, businessId]
  );
  if (res.rows.length === 0) return null;
  return mapRowToPosBill(res.rows[0]);
}

