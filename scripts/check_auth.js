const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkAuth() {
  const authTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth'");
  console.log('Auth tables:', authTables.rows.map(r => r.table_name));

  const users = await pool.query("SELECT id, email, created_at FROM auth.users LIMIT 10");
  console.log('Users in auth.users count:', users.rows.length, users.rows);

  // Check vault or secrets
  try {
    const secrets = await pool.query("SELECT * FROM vault.secrets LIMIT 5");
    console.log('Vault secrets:', secrets.rows);
  } catch (e) {
    console.log('Vault secrets not accessible or empty:', e.message);
  }

  // Check jwt secret or supabase configuration if available
  try {
    const jwtSecret = await pool.query("SHOW pgrst.jwt_secret;");
    console.log('PostgREST JWT Secret exists:', !!jwtSecret.rows[0]);
  } catch (e) {
    console.log('pgrst.jwt_secret:', e.message);
  }

  await pool.end();
}

checkAuth().catch(console.error);
