CREATE TABLE IF NOT EXISTS public.waiter_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'completed')),
  access_token_hash TEXT NOT NULL,
  cooldown_bucket BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  completed_by TEXT,
  UNIQUE (business_id, table_number, cooldown_bucket)
);

CREATE INDEX IF NOT EXISTS idx_waiter_requests_business_status
  ON public.waiter_requests (business_id, status, created_at DESC);

ALTER TABLE public.waiter_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waiter_requests FROM anon, authenticated;
GRANT ALL ON public.waiter_requests TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'waiter_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_requests;
  END IF;
END;
$$;
