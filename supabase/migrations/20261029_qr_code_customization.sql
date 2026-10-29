-- Migration: QR Code Customization for Gold Tier Shop Owners
-- Date: 2026-10-29

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
