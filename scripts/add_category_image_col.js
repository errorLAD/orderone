const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories';
    `);
    console.log('Current categories columns:', res.rows.map(r => r.column_name));

    await pool.query(`ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;`);
    console.log('✅ Added image_url column to public.categories!');

    const after = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories';
    `);
    console.log('Updated categories columns:', after.rows.map(r => r.column_name));
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
  }
}

main();
