const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  const res = await pool.query("SELECT id, name, settings, subscription FROM businesses LIMIT 5");
  for (const row of res.rows) {
    console.log(`\n--- Business: ${row.id} (${row.name}) ---`);
    console.log('Subscription:', row.subscription);
    console.log('Settings:', JSON.stringify(row.settings, null, 2));
  }
  await pool.end();
}

run().catch(err => {
  console.error(err);
  pool.end();
});
