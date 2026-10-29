import pg from 'pg';
import fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log('--- Applying Migration: 20261029_pos_counter_billing.sql ---');
  const sql = fs.readFileSync('supabase/migrations/20261029_pos_counter_billing.sql', 'utf-8');

  try {
    await pool.query(sql);
    console.log('Migration applied successfully!');

    // Verify tables
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('pos_bills', 'pos_bill_items');
    `);
    console.log('Verified tables:', res.rows.map(r => r.table_name));

    // Verify token generation with pos
    const bizRes = await pool.query(`SELECT id FROM public.businesses LIMIT 1`);
    if (bizRes.rows.length > 0) {
      const bizId = bizRes.rows[0].id;
      const tokRes = await pool.query(`SELECT generate_next_order_token($1, 'pos') AS bill_num`, [bizId]);
      console.log('Generated test POS bill token for', bizId, ':', tokRes.rows[0].bill_num);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
