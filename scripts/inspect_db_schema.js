const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectDb() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables in public schema:', tables.rows.map(r => r.table_name));

    const plansCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscription_plans';
    `);
    console.log('subscription_plans columns:', plansCols.rows);

    const existingPlans = await pool.query('SELECT * FROM public.subscription_plans');
    console.log('Existing plans in DB:', existingPlans.rows);

    const bizCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'businesses';
    `);
    console.log('businesses columns:', bizCols.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
  }
}

inspectDb();
