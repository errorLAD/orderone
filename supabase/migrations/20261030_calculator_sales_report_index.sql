-- Speeds up the business/date range scan used by the combined calculator sales report.
-- This is additive and preserves all existing orders.
CREATE INDEX IF NOT EXISTS idx_orders_sales_report_business_created_at
  ON public.orders (business_id, created_at DESC)
  INCLUDE (source_type, total)
  WHERE order_status NOT IN ('cancelled', 'rejected');