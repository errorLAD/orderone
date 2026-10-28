const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  console.log('Running database migrations for GST & Invoices...');
  
  // 1. Add tax_breakdown and invoice_number to orders table
  await pool.query(`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS tax_breakdown jsonb,
    ADD COLUMN IF NOT EXISTS invoice_number text;
  `);
  console.log('✓ Added tax_breakdown and invoice_number columns to orders table.');

  // 2. Verify business_upi_settings table has all required columns
  await pool.query(`
    ALTER TABLE business_upi_settings
    ADD COLUMN IF NOT EXISTS store_url text;
  `);
  console.log('✓ Verified business_upi_settings table.');

  await pool.end();
}

run().catch(err => {
  console.error(err);
  pool.end();
  process.exit(1);
});
