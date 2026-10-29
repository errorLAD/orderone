import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  console.log('Running QR Code Customization migration...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.business_qr_customizations (
        business_id TEXT PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
        template_id TEXT DEFAULT 'modern_indigo',
        foreground_color TEXT NOT NULL DEFAULT '#4F46E5',
        background_color TEXT NOT NULL DEFAULT '#FFFFFF',
        eye_color TEXT NOT NULL DEFAULT '#312E81',
        dot_style TEXT NOT NULL DEFAULT 'rounded',
        eye_style TEXT NOT NULL DEFAULT 'rounded',
        frame_style TEXT NOT NULL DEFAULT 'bottom_banner',
        frame_text TEXT NOT NULL DEFAULT 'SCAN TO ORDER',
        frame_color TEXT NOT NULL DEFAULT '#4F46E5',
        show_logo BOOLEAN NOT NULL DEFAULT true,
        custom_logo_url TEXT,
        show_business_name BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_qr_custom_biz ON public.business_qr_customizations(business_id);
      
      -- Enable Row Level Security
      ALTER TABLE public.business_qr_customizations ENABLE ROW LEVEL SECURITY;
      
      -- Create permissive policies for authenticated and service role
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'business_qr_customizations' AND policyname = 'Allow all operations for app'
        ) THEN
          CREATE POLICY "Allow all operations for app" ON public.business_qr_customizations
          FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END
      $$;
    `);

    console.log('[SUCCESS] Migration applied: public.business_qr_customizations created with index and RLS.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
