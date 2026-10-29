-- Migration: Sales Channel Availability for Categories and Products
-- Date: 2026-10-29

-- 1. Add sales_channel column to public.categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sales_channel VARCHAR(30) NOT NULL DEFAULT 'both';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_categories_sales_channel'
  ) THEN
    ALTER TABLE public.categories 
    ADD CONSTRAINT chk_categories_sales_channel CHECK (sales_channel IN ('both', 'storefront', 'pos'));
  END IF;
END $$;

-- 2. Add sales_channel column to public.products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sales_channel VARCHAR(30) NOT NULL DEFAULT 'both';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_sales_channel'
  ) THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT chk_products_sales_channel CHECK (sales_channel IN ('both', 'storefront', 'pos'));
  END IF;
END $$;

-- 3. Indexes for fast channel filtering
CREATE INDEX IF NOT EXISTS idx_categories_sales_channel ON public.categories(business_id, sales_channel);
CREATE INDEX IF NOT EXISTS idx_products_sales_channel ON public.products(business_id, sales_channel);
