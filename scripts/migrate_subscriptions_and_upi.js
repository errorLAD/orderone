const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Starting Subscriptions & UPI Schema Migration ---');

  // 1. Alter subscription_plans table to add is_visible and custom_upi
  await pool.query(`
    ALTER TABLE public.subscription_plans 
    ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS custom_upi BOOLEAN DEFAULT FALSE;
  `);
  console.log('✓ Added is_visible & custom_upi columns to subscription_plans');

  // 2. Create business_upi_settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.business_upi_settings (
      business_id TEXT PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
      upi_id VARCHAR(100) NOT NULL,
      payee_name VARCHAR(255) NOT NULL,
      qr_image_url TEXT,
      instructions TEXT,
      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ Created public.business_upi_settings table');

  // 3. Create subscription_payments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.subscription_payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      billing_cycle VARCHAR(20) DEFAULT 'monthly',
      status VARCHAR(30) DEFAULT 'pending',
      payment_reference TEXT,
      payment_method VARCHAR(30) DEFAULT 'upi',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ Created public.subscription_payments table');

  // 4. Update/Upsert the 3 exact Plans specified by the user
  const plans = [
    {
      id: 'plan_basic',
      name: 'Basic',
      slug: 'basic',
      description: 'Essential digital menu and ordering for food stalls, tea cafes & restaurants',
      price_monthly: 49,
      price_annual: 490,
      features: JSON.stringify([
        'Digital Food & Drink Menu',
        'Customer QR Code ordering',
        'Menu Orders Dashboard',
        'Kitchen tokens & real-time alerts',
        'Store module locked'
      ]),
      max_products: 20,
      max_staff: 1,
      allows_store: false,
      allows_menu: true,
      allows_tv_display: false,
      allows_analytics: true,
      is_popular: false,
      is_visible: true,
      custom_upi: false
    },
    {
      id: 'plan_gold',
      name: 'Gold',
      slug: 'gold',
      description: 'Complete retail store + dining menu suite with custom UPI QR payment collection',
      price_monthly: 149,
      price_annual: 1490,
      features: JSON.stringify([
        'All Basic Menu features',
        'Full Retail Store Module',
        'Product catalog & stock management',
        'Separate Store & Menu order queues',
        'Custom UPI ID & QR Code setup',
        'Direct customer UPI payment on checkout',
        'Sales & stock analytics'
      ]),
      max_products: 50,
      max_staff: 5,
      allows_store: true,
      allows_menu: true,
      allows_tv_display: true,
      allows_analytics: true,
      is_popular: true,
      is_visible: true,
      custom_upi: true
    },
    {
      id: 'plan_diamond',
      name: 'Diamond',
      slug: 'diamond',
      description: 'Premium enterprise tier for high-volume operations (Admin Managed)',
      price_monthly: 150,
      price_annual: 1500,
      features: JSON.stringify([
        'Unlimited products & stores',
        'Multi-counter POS stations',
        'Priority 24/7 dedicated account manager',
        'Custom domain branding',
        'Automated GST tax filing export',
        'Dedicated SLA'
      ]),
      max_products: 99999,
      max_staff: 50,
      allows_store: true,
      allows_menu: true,
      allows_tv_display: true,
      allows_analytics: true,
      is_popular: false,
      is_visible: false, // Hidden until enabled by an administrator!
      custom_upi: true
    }
  ];

  for (const p of plans) {
    await pool.query(`
      INSERT INTO public.subscription_plans 
        (id, name, slug, description, price_monthly, price_annual, features, max_products, max_staff, allows_store, allows_menu, allows_tv_display, allows_analytics, is_popular, is_visible, custom_upi)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_annual = EXCLUDED.price_annual,
        features = EXCLUDED.features,
        max_products = EXCLUDED.max_products,
        max_staff = EXCLUDED.max_staff,
        allows_store = EXCLUDED.allows_store,
        allows_menu = EXCLUDED.allows_menu,
        allows_tv_display = EXCLUDED.allows_tv_display,
        allows_analytics = EXCLUDED.allows_analytics,
        is_popular = EXCLUDED.is_popular,
        is_visible = EXCLUDED.is_visible,
        custom_upi = EXCLUDED.custom_upi;
    `, [
      p.id, p.name, p.slug, p.description, p.price_monthly, p.price_annual,
      p.features, p.max_products, p.max_staff, p.allows_store, p.allows_menu,
      p.allows_tv_display, p.allows_analytics, p.is_popular, p.is_visible, p.custom_upi
    ]);
  }
  console.log('✓ Upserted 3 plans (Basic ₹49, Gold ₹149, Diamond ₹249 [hidden])');

  // 5. Clean up old plan references in businesses
  await pool.query(`
    UPDATE public.businesses
    SET subscription = jsonb_set(subscription, '{planId}', '"plan_gold"')
    WHERE subscription->>'planId' IN ('plan_pro', 'plan_enterprise');

    UPDATE public.businesses
    SET subscription = jsonb_set(subscription, '{planId}', '"plan_basic"')
    WHERE subscription->>'planId' = 'plan_starter';
  `);
  console.log('✓ Updated existing business subscriptions to new plan IDs');

  // 6. Delete old unused plan records if any
  await pool.query(`
    DELETE FROM public.subscription_plans 
    WHERE id NOT IN ('plan_basic', 'plan_gold', 'plan_diamond');
  `);
  console.log('✓ Cleaned up deprecated plans');

  const checkPlans = await pool.query('SELECT id, name, price_monthly, allows_store, allows_menu, is_visible, custom_upi FROM public.subscription_plans ORDER BY price_monthly ASC');
  console.log('Current Database Subscription Plans:', checkPlans.rows);

  await pool.end();
  console.log('--- Migration Completed Successfully ---');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
