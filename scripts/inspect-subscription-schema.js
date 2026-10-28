const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function inspect() {
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('All public tables:', tablesRes.rows.map(r => r.table_name));

  const targetTables = ['subscription_plans', 'subscriptions', 'subscription_payments', 'subscription_history', 'businesses'];
  for (const table of targetTables) {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    console.log(`\n--- Table: ${table} ---`);
    console.table(cols.rows);
  }

  // Also query subscription_plans and current subscriptions
  const plans = await pool.query('SELECT * FROM subscription_plans');
  console.log('\n--- Current Subscription Plans ---');
  console.log(plans.rows);

  const subs = await pool.query('SELECT * FROM subscriptions LIMIT 5');
  console.log('\n--- Sample Subscriptions ---');
  console.log(subs.rows);

  const payments = await pool.query('SELECT * FROM subscription_payments LIMIT 5');
  console.log('\n--- Sample Subscription Payments ---');
  console.log(payments.rows);

  await pool.end();
}

inspect().catch(err => {
  console.error(err);
  pool.end();
});
