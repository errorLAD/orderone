const { Pool } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('--- Setting up Category Schema Enhancements ---');

  // Check columns of public.products
  const pCols = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products'
  `);
  const colNames = pCols.rows.map(r => r.column_name);
  console.log('Existing products columns:', colNames);

  if (!colNames.includes('unit')) {
    await pool.query('ALTER TABLE public.products ADD COLUMN unit VARCHAR(50);');
    console.log('✓ Added unit column to public.products');
  }

  if (!colNames.includes('brand')) {
    await pool.query('ALTER TABLE public.products ADD COLUMN brand VARCHAR(100);');
    console.log('✓ Added brand column to public.products');
  }

  if (!colNames.includes('min_order_qty')) {
    await pool.query('ALTER TABLE public.products ADD COLUMN min_order_qty NUMERIC DEFAULT 1;');
    console.log('✓ Added min_order_qty column to public.products');
  }

  // Ensure businesses table owner_id or user mapping
  const bCols = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses'
  `);
  const bColNames = bCols.rows.map(r => r.column_name);
  console.log('Existing businesses columns:', bColNames);

  if (!bColNames.includes('owner_id')) {
    await pool.query('ALTER TABLE public.businesses ADD COLUMN owner_id TEXT;');
    console.log('✓ Added owner_id column to public.businesses');
  }

  console.log('--- Schema setup complete ---');
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
