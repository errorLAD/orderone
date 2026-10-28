const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function runMigration() {
  console.log('--- Starting Razorpay & 30-Day Subscription Schema Migration ---');

  // 1. Update subscription_payments table to support Razorpay IDs and dates
  await pool.query(`
    ALTER TABLE public.subscription_payments
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
    ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) DEFAULT 'razorpay',
    ADD COLUMN IF NOT EXISTS previous_plan_id TEXT,
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `);
  console.log('✓ Updated public.subscription_payments with Razorpay columns');

  // 2. Create subscription_history table for auditing plan changes and upgrades/downgrades
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.subscription_history (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
      previous_plan_id TEXT,
      new_plan_id TEXT NOT NULL,
      change_type VARCHAR(30) NOT NULL, -- 'initial', 'upgrade', 'downgrade_scheduled', 'downgrade_applied', 'downgrade_cancelled', 'renewal', 'expired'
      payment_id TEXT,
      amount NUMERIC(10, 2),
      effective_date TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ Created public.subscription_history table');

  // 3. Create webhook_events table for idempotent Razorpay webhook handling
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.webhook_events (
      id TEXT PRIMARY KEY,
      provider VARCHAR(30) DEFAULT 'razorpay',
      event_type VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ Created public.webhook_events table');

  // 4. Verify subscription_plans pricing and 30-day configuration
  // Basic: 20 INR / 30 days
  // Gold: 99 INR / 30 days
  // Diamond: 150 INR / 30 days, is_visible = false
  await pool.query(`
    UPDATE public.subscription_plans 
    SET price_monthly = 20, is_visible = true 
    WHERE id = 'plan_basic';
  `);
  await pool.query(`
    UPDATE public.subscription_plans 
    SET price_monthly = 99, is_visible = true 
    WHERE id = 'plan_gold';
  `);
  await pool.query(`
    UPDATE public.subscription_plans 
    SET price_monthly = 150, is_visible = false 
    WHERE id = 'plan_diamond';
  `);
  console.log('✓ Verified subscription_plans pricing & Diamond hidden flag');

  const plansRes = await pool.query(`
    SELECT id, name, price_monthly, is_visible 
    FROM public.subscription_plans 
    ORDER BY price_monthly ASC
  `);
  console.log('Current Plans in DB:');
  console.table(plansRes.rows);

  await pool.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
