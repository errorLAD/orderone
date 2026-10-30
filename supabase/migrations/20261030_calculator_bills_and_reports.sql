-- Manual calculator bills use the existing Supabase POS bill ledger so they
-- remain durable and keep the full bill snapshot alongside the item rows.
ALTER TABLE public.pos_bills
  ADD COLUMN IF NOT EXISTS bill_source TEXT NOT NULL DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS request_id TEXT;

ALTER TABLE public.pos_bills
  DROP CONSTRAINT IF EXISTS pos_bills_bill_source_check;
ALTER TABLE public.pos_bills
  ADD CONSTRAINT pos_bills_bill_source_check CHECK (bill_source IN ('pos', 'calculator'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_bills_business_request
  ON public.pos_bills (business_id, request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_bills_business_source_created
  ON public.pos_bills (business_id, bill_source, created_at DESC);

ALTER TABLE public.pos_bill_items
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.pos_bill_items
  ALTER COLUMN quantity TYPE NUMERIC(12, 3) USING quantity::NUMERIC(12, 3);

-- These tables are written only by the authenticated server, which verifies
-- the custom OrderOne session and business membership before every query.
-- Remove the older allow-all policies and deny direct client access.
ALTER TABLE public.pos_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_bill_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for app on pos_bills" ON public.pos_bills;
DROP POLICY IF EXISTS "Allow all operations for app on pos_bill_items" ON public.pos_bill_items;
DROP POLICY IF EXISTS "pos_bills_service_role_access" ON public.pos_bills;
DROP POLICY IF EXISTS "pos_bill_items_service_role_access" ON public.pos_bill_items;
REVOKE ALL ON TABLE public.pos_bills FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pos_bill_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pos_bills TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pos_bill_items TO service_role;
CREATE POLICY "pos_bills_service_role_access" ON public.pos_bills
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pos_bill_items_service_role_access" ON public.pos_bill_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
