import pg from 'pg';
import fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log('--- Applying Migration: 20261029_category_and_product_sales_channels.sql ---');
  const sql = fs.readFileSync('supabase/migrations/20261029_category_and_product_sales_channels.sql', 'utf-8');

  try {
    await pool.query(sql);
    console.log('Migration applied successfully!');

    // Verify columns
    const catRes = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'sales_channel';
    `);
    console.log('Verified categories column:', catRes.rows);

    const prodRes = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'sales_channel';
    `);
    console.log('Verified products column:', prodRes.rows);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
