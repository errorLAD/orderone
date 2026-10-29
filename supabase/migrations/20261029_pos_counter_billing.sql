-- Migration: POS / Counter Billing for OrderOne.in
-- Date: 2026-10-29

-- 1. POS Bills Table
CREATE TABLE IF NOT EXISTS public.pos_bills (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  discount_rate NUMERIC(6, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6, 2) DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_by TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pos_bills_biz_number UNIQUE (business_id, bill_number)
);

-- 2. POS Bill Items Table
CREATE TABLE IF NOT EXISTS public.pos_bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES public.pos_bills(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_pos_bills_biz ON public.pos_bills(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_bills_created ON public.pos_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_bill ON public.pos_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_biz ON public.pos_bill_items(business_id);

-- 4. Enable Row Level Security
ALTER TABLE public.pos_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_bill_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pos_bills' AND policyname = 'Allow all operations for app on pos_bills'
  ) THEN
    CREATE POLICY "Allow all operations for app on pos_bills" ON public.pos_bills
    FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pos_bill_items' AND policyname = 'Allow all operations for app on pos_bill_items'
  ) THEN
    CREATE POLICY "Allow all operations for app on pos_bill_items" ON public.pos_bill_items
    FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- 5. Update order_sequences constraint to allow 'pos'
ALTER TABLE public.order_sequences DROP CONSTRAINT IF EXISTS order_sequences_source_type_check;
ALTER TABLE public.order_sequences ADD CONSTRAINT order_sequences_source_type_check CHECK (source_type IN ('store', 'menu', 'pos'));

-- 6. Update generate_next_order_token function to support POS sequence
CREATE OR REPLACE FUNCTION public.generate_next_order_token(p_business_id text, p_source_type character varying)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_prefix TEXT;
    v_seq BIGINT;
    v_formatted TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN p_source_type = 'store' THEN COALESCE(settings->>'tokenPrefixStore', 'S-')
            WHEN p_source_type = 'pos' THEN COALESCE(settings->>'tokenPrefixPos', 'POS-')
            ELSE COALESCE(settings->>'tokenPrefixMenu', 'M-')
        END INTO v_prefix
    FROM public.businesses
    WHERE id = p_business_id;

    IF v_prefix IS NULL THEN
        IF p_source_type = 'store' THEN v_prefix := 'S-';
        ELSIF p_source_type = 'pos' THEN v_prefix := 'POS-';
        ELSE v_prefix := 'M-';
        END IF;
    END IF;

    INSERT INTO public.order_sequences (business_id, source_type, current_value)
    VALUES (p_business_id, p_source_type, 101)
    ON CONFLICT (business_id, source_type)
    DO UPDATE SET current_value = public.order_sequences.current_value + 1
    RETURNING current_value INTO v_seq;

    v_formatted := v_prefix || LPAD(v_seq::TEXT, 5, '0');
    RETURN v_formatted;
END;
$function$;
