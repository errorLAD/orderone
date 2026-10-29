const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  console.log('Connecting to Supabase PostgreSQL...');
  const [bizRes, catRes, prodRes, ordRes, qRes, notifRes, planRes] = await Promise.all([
    pool.query('SELECT * FROM public.businesses ORDER BY created_at ASC'),
    pool.query('SELECT * FROM public.categories ORDER BY sort_order ASC'),
    pool.query('SELECT * FROM public.products ORDER BY sort_order ASC'),
    pool.query('SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 500'),
    pool.query('SELECT * FROM public.queue_tokens ORDER BY created_at ASC LIMIT 200'),
    pool.query('SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 100'),
    pool.query('SELECT * FROM public.subscription_plans ORDER BY price_monthly ASC')
  ]);

  console.log(`Fetched:
- Businesses: ${bizRes.rows.length}
- Categories: ${catRes.rows.length}
- Products: ${prodRes.rows.length}
- Orders: ${ordRes.rows.length}
- Queue Tokens: ${qRes.rows.length}
- Notifications: ${notifRes.rows.length}
- Subscription Plans: ${planRes.rows.length}`);

  const dbPath = path.join(__dirname, '..', 'data', 'saas_database.json');
  let currentDb = {};
  if (fs.existsSync(dbPath)) {
    try {
      currentDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {}
  }

  // Update records
  currentDb.businesses = bizRes.rows.map(r => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type,
    category: r.type,
    ownerId: r.owner_id || undefined,
    description: r.description || '',
    email: r.email,
    phone: r.phone,
    address: r.address,
    logoUrl: r.logo_url || undefined,
    isStoreOpen: r.is_store_open ?? true,
    onlineOrderingEnabled: r.online_ordering_enabled ?? true,
    settings: typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings || {}),
    subscription: typeof r.subscription === 'string' ? JSON.parse(r.subscription) : r.subscription,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  }));

  currentDb.categories = catRes.rows.map(r => ({
    id: r.id,
    businessId: r.business_id,
    sourceType: r.source_type,
    name: r.name,
    slug: r.slug,
    description: r.description || undefined,
    imageUrl: r.image_url || undefined,
    sortOrder: r.sort_order || 0,
    isActive: r.is_active !== false,
    salesChannel: r.sales_channel || 'both',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
  }));

  currentDb.products = prodRes.rows.map(r => ({
    id: r.id,
    businessId: r.business_id,
    categoryId: r.category_id,
    sourceType: r.source_type,
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
    salesChannel: r.sales_channel || 'both',
    imageUrl: r.image_url || undefined,
    sortOrder: r.sort_order || 0,
    dietaryFlags: typeof r.dietary_flags === 'string' ? JSON.parse(r.dietary_flags) : r.dietary_flags || {},
    variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : r.variants || [],
    addOns: typeof r.add_ons === 'string' ? JSON.parse(r.add_ons) : r.add_ons || [],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  }));

  fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf8');
  console.log(`Successfully synchronized ${dbPath} with live PostgreSQL!`);
  await pool.end();
}

sync().catch(err => {
  console.error('Sync failed:', err);
  pool.end();
});
