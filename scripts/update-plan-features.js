const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function update() {
  const basicFeatures = JSON.stringify([
    'Up to 20 products or menu items',
    'Up to 10 categories',
    'Materials and Store Catalog (for Hardware and Retail)',
    'Digital Food Menu (for Restaurants and Cafes)',
    'Customer Orders and Token Queue (S- and M-)',
    'Storefront QR Codes'
  ]);

  const goldFeatures = JSON.stringify([
    'Up to 50 products or menu items',
    'Up to 30 categories',
    'Full Store & Menu modules enabled',
    'Product catalog & stock management',
    'Storefront Design & Appearance customization',
    'Custom UPI ID & QR Code setup',
    'Direct customer UPI payment on checkout',
    'Sales & stock analytics'
  ]);

  await pool.query('UPDATE subscription_plans SET features = $1::jsonb WHERE id = $2', [basicFeatures, 'plan_basic']);
  await pool.query('UPDATE subscription_plans SET features = $1::jsonb WHERE id = $2', [goldFeatures, 'plan_gold']);

  const res = await pool.query('SELECT id, name, max_products, max_categories, features FROM subscription_plans WHERE is_visible = true');
  console.log('Updated subscription_plans:', JSON.stringify(res.rows, null, 2));

  await pool.end();
}

update().catch(err => {
  console.error(err);
  pool.end();
});
