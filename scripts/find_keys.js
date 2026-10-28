const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function findKeys() {
  try {
    const res = await pool.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name LIKE '%jwt%' OR name LIKE '%secret%' OR name LIKE '%anon%' OR name LIKE '%supabase%';
    `);
    console.log('Settings matching jwt/secret/anon/supabase:', res.rows);
  } catch (e) {
    console.log('pg_settings query error:', e.message);
  }

  try {
    const res2 = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%secret%' OR table_name LIKE '%key%' OR table_name LIKE '%config%';
    `);
    console.log('Tables matching secret/key/config:', res2.rows);
  } catch (e) {
    console.log('information_schema error:', e.message);
  }

  await pool.end();
}

findKeys().catch(console.error);
