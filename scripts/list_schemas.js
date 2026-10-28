const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function listAll() {
  const schemas = await pool.query("SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema'");
  console.log('User schemas:', schemas.rows.map(r => r.nspname));

  for (const s of schemas.rows) {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = $1", [s.nspname]);
    console.log(`Schema ${s.nspname}:`, tables.rows.map(r => r.tablename));
  }
  await pool.end();
}

listAll().catch(console.error);
