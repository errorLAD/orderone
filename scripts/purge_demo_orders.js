const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function purge() {
  console.log('=== PURGING ALL DEMO ORDERS, NOTIFICATIONS & TOKENS ===');

  try {
    // 1. Delete from PostgreSQL Supabase tables
    const delOrders = await pool.query('DELETE FROM public.orders RETURNING id');
    console.log(`✓ Deleted ${delOrders.rows.length} demo orders from public.orders`);

    const delNotifs = await pool.query('DELETE FROM public.notifications RETURNING id');
    console.log(`✓ Deleted ${delNotifs.rows.length} demo notifications from public.notifications`);

    const delTokens = await pool.query('DELETE FROM public.queue_tokens RETURNING id');
    console.log(`✓ Deleted ${delTokens.rows.length} demo queue tokens from public.queue_tokens`);

    // 2. Clear local file cache data/saas_database.json
    const dbFilePath = path.join(__dirname, '..', 'data', 'saas_database.json');
    if (fs.existsSync(dbFilePath)) {
      const db = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
      db.orders = [];
      db.notifications = [];
      db.queueTokens = [];
      db.sequences = {};
      fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
      console.log('✓ Cleaned data/saas_database.json local cache');
    }

    console.log('=== PURGE COMPLETE: Supabase now has 0 demo orders ===');
  } catch (err) {
    console.error('Error during purge:', err);
  } finally {
    await pool.end();
  }
}

purge();
