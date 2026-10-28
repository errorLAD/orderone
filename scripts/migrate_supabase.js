const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schemaSQL = `
-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    subscription JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 2. SEQUENCES TABLE FOR CONCURRENCY-SAFE TOKENS
CREATE TABLE IF NOT EXISTS public.order_sequences (
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    current_value BIGINT NOT NULL DEFAULT 100,
    PRIMARY KEY (business_id, source_type)
);

-- Function to atomically increment and generate token
CREATE OR REPLACE FUNCTION generate_next_order_token(p_business_id TEXT, p_source_type VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_seq BIGINT;
    v_formatted TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN p_source_type = 'store' THEN COALESCE(settings->>'tokenPrefixStore', 'S-')
            ELSE COALESCE(settings->>'tokenPrefixMenu', 'M-')
        END INTO v_prefix
    FROM public.businesses
    WHERE id = p_business_id;

    IF v_prefix IS NULL THEN
        IF p_source_type = 'store' THEN v_prefix := 'S-';
        ELSE v_prefix := 'M-';
        END IF;
    END IF;

    INSERT INTO public.order_sequences (business_id, source_type, current_value)
    VALUES (p_business_id, p_source_type, 101)
    ON CONFLICT (business_id, source_type)
    DO UPDATE SET current_value = public.order_sequences.current_value + 1
    RETURNING current_value INTO v_seq;

    v_formatted := v_prefix || LPAD(v_seq::TEXT, 5, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id, source_type);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    stock_quantity INT,
    low_stock_threshold INT DEFAULT 5,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    dietary_flags JSONB DEFAULT '{}'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    add_ons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_biz_source ON public.products(business_id, source_type);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 5. ORDERS (STRICT SEPARATION: STORE VS MENU)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    token_number VARCHAR(50) NOT NULL,
    tracking_id VARCHAR(64) UNIQUE NOT NULL,
    customer JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
    order_status VARCHAR(30) NOT NULL DEFAULT 'new',
    fulfilment_method VARCHAR(30) NOT NULL DEFAULT 'pickup',
    queue_token VARCHAR(50),
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_biz_source ON public.orders(business_id, source_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(tracking_id);

-- 6. QUEUE TOKENS
CREATE TABLE IF NOT EXISTS public.queue_tokens (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    token_number VARCHAR(50) NOT NULL,
    sequence_number INT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'waiting',
    counter_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_tokens ON public.queue_tokens(business_id, status);

-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    token_number VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_biz ON public.notifications(business_id, is_read, created_at DESC);

-- 8. USERS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_annual NUMERIC(10, 2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_products INT NOT NULL DEFAULT 100,
    max_staff INT NOT NULL DEFAULT 1,
    allows_store BOOLEAN NOT NULL DEFAULT true,
    allows_menu BOOLEAN NOT NULL DEFAULT true,
    allows_tv_display BOOLEAN NOT NULL DEFAULT false,
    allows_analytics BOOLEAN NOT NULL DEFAULT true,
    is_popular BOOLEAN NOT NULL DEFAULT false
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    business_id TEXT,
    user_id TEXT,
    user_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  console.log('🚀 Connecting to Supabase PostgreSQL...');
  const client = await pool.connect();

  try {
    console.log('1. Applying schema definition...');
    await client.query(schemaSQL);
    console.log('✅ Schema tables, indexes, and functions created successfully.');

    // Load initial JSON data
    const dbFilePath = path.join(process.cwd(), 'data', 'saas_database.json');
    if (fs.existsSync(dbFilePath)) {
      console.log('2. Seeding initial data from local JSON database...');
      const dbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

      // Seed Businesses
      for (const b of dbData.businesses || []) {
        await client.query(`
          INSERT INTO public.businesses (id, slug, name, type, description, email, phone, address, logo_url, settings, subscription, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            settings = EXCLUDED.settings,
            subscription = EXCLUDED.subscription,
            updated_at = NOW();
        `, [
          b.id, b.slug, b.name, b.type, b.description, b.email, b.phone, b.address,
          b.logoUrl || null, JSON.stringify(b.settings), JSON.stringify(b.subscription),
          b.createdAt, b.updatedAt
        ]);
      }
      console.log(`✅ Seeded ${dbData.businesses?.length || 0} businesses`);

      // Seed Sequences
      for (const [key, val] of Object.entries(dbData.sequences || {})) {
        // key is format: `${businessId}_${sourceType}`
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const bizId = key.substring(0, lastUnderscore);
          const srcType = key.substring(lastUnderscore + 1);
          if (['store', 'menu'].includes(srcType)) {
            await client.query(`
              INSERT INTO public.order_sequences (business_id, source_type, current_value)
              VALUES ($1, $2, $3)
              ON CONFLICT (business_id, source_type) DO UPDATE SET current_value = EXCLUDED.current_value;
            `, [bizId, srcType, val]);
          }
        }
      }
      console.log('✅ Seeded order sequences');

      // Seed Users
      for (const u of dbData.users || []) {
        await client.query(`
          INSERT INTO public.users (id, email, name, role, business_id, permissions, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [u.id, u.email, u.name, u.role, u.businessId || null, JSON.stringify(u.permissions || []), u.createdAt]);
      }
      console.log(`✅ Seeded ${dbData.users?.length || 0} users`);

      // Seed Plans
      for (const p of dbData.subscriptionPlans || []) {
        await client.query(`
          INSERT INTO public.subscription_plans (id, name, slug, description, price_monthly, price_annual, features, max_products, max_staff, allows_store, allows_menu, allows_tv_display, allows_analytics, is_popular)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING;
        `, [
          p.id, p.name, p.slug, p.description, p.priceMonthly, p.priceAnnual,
          JSON.stringify(p.features), p.maxProducts, p.maxStaff,
          p.allowsStore, p.allowsMenu, p.allowsTvDisplay, p.allowsAnalytics, !!p.isPopular
        ]);
      }
      console.log(`✅ Seeded ${dbData.subscriptionPlans?.length || 0} subscription plans`);

      // Seed Categories
      for (const c of dbData.categories || []) {
        await client.query(`
          INSERT INTO public.categories (id, business_id, source_type, name, slug, description, sort_order, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
        `, [c.id, c.businessId, c.sourceType, c.name, c.slug, c.description || null, c.sortOrder || 0, c.isActive !== false, c.createdAt]);
      }
      console.log(`✅ Seeded ${dbData.categories?.length || 0} categories`);

      // Seed Products
      for (const p of dbData.products || []) {
        await client.query(`
          INSERT INTO public.products (id, business_id, category_id, source_type, name, description, price, sale_price, sku, barcode, stock_quantity, low_stock_threshold, is_available, image_url, sort_order, dietary_flags, variants, add_ons, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity;
        `, [
          p.id, p.businessId, p.categoryId, p.sourceType, p.name, p.description || null,
          p.price, p.salePrice || null, p.sku || null, p.barcode || null,
          p.stockQuantity !== undefined ? p.stockQuantity : null,
          p.lowStockThreshold || 5, p.isAvailable !== false, p.imageUrl || null,
          p.sortOrder || 0, JSON.stringify(p.dietaryFlags || {}),
          JSON.stringify(p.variants || []), JSON.stringify(p.addOns || []),
          p.createdAt, p.updatedAt
        ]);
      }
      console.log(`✅ Seeded ${dbData.products?.length || 0} products`);

      // Seed Orders
      for (const o of dbData.orders || []) {
        await client.query(`
          INSERT INTO public.orders (id, business_id, source_type, token_number, tracking_id, customer, items, subtotal, tax, delivery_fee, discount, total, payment_status, payment_method, order_status, fulfilment_method, queue_token, status_history, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO NOTHING;
        `, [
          o.id, o.businessId, o.sourceType, o.tokenNumber, o.trackingId,
          JSON.stringify(o.customer), JSON.stringify(o.items),
          o.subtotal, o.tax, o.deliveryFee, o.discount, o.total,
          o.paymentStatus, o.paymentMethod, o.orderStatus, o.fulfilmentMethod,
          o.queueToken || null, JSON.stringify(o.statusHistory || []),
          o.createdAt, o.updatedAt
        ]);
      }
      console.log(`✅ Seeded ${dbData.orders?.length || 0} orders`);

      // Seed Queue Tokens
      for (const q of dbData.queueTokens || []) {
        await client.query(`
          INSERT INTO public.queue_tokens (id, business_id, source_type, token_number, sequence_number, order_id, customer_name, status, counter_number, created_at, called_at, served_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING;
        `, [
          q.id, q.businessId, q.sourceType, q.tokenNumber, q.sequenceNumber,
          q.orderId || null, q.customerName || null, q.status, q.counterNumber || null,
          q.createdAt, q.calledAt || null, q.servedAt || null
        ]);
      }
      console.log(`✅ Seeded ${dbData.queueTokens?.length || 0} queue tokens`);

      // Seed Notifications
      for (const n of dbData.notifications || []) {
        await client.query(`
          INSERT INTO public.notifications (id, business_id, source_type, title, message, order_id, token_number, is_read, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
        `, [
          n.id, n.businessId, n.sourceType, n.title, n.message,
          n.orderId || null, n.tokenNumber || null, n.isRead, n.createdAt
        ]);
      }
      console.log(`✅ Seeded ${dbData.notifications?.length || 0} notifications`);
    }

    // Verify all counts
    console.log('3. Verifying PostgreSQL live data...');
    const tables = ['businesses', 'categories', 'products', 'orders', 'queue_tokens', 'notifications', 'order_sequences'];
    for (const t of tables) {
      const countRes = await client.query(`SELECT count(*) FROM public.${t}`);
      console.log(`- Table ${t}: ${countRes.rows[0].count} records`);
    }

    console.log('🎉 SUPABASE POSTGRESQL MIGRATION COMPLETE AND VERIFIED!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
