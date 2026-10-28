const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log('Setting up real auth tables in Supabase Postgres...');

  // Add password_hash column to public.users if not exists
  await pool.query(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);

  // Create public.sessions table for persistent server-side session management
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
  `);

  // Hash password for existing users
  const defaultHash = await bcrypt.hash('password123', 10);
  await pool.query(`
    UPDATE public.users 
    SET password_hash = $1 
    WHERE password_hash IS NULL;
  `, [defaultHash]);

  const users = await pool.query('SELECT id, email, role, business_id, (password_hash IS NOT NULL) as has_password FROM public.users');
  console.log('Current users in PostgreSQL:', users.rows);

  console.log('✅ Real PostgreSQL auth & sessions schema ready!');
  await pool.end();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
