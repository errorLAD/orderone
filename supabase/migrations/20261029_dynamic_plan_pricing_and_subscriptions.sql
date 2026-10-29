-- =========================================================================
-- OrderOne.in Dynamic Plan Pricing & Subscription Management Migration
-- Version: 20261029_dynamic_plan_pricing_and_subscriptions.sql
-- =========================================================================

-- 1. Add validity days columns to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS validity_days_monthly INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS validity_days_annual INTEGER NOT NULL DEFAULT 365;

-- 2. Populate default validity days for existing plans if missing
UPDATE public.subscription_plans
SET validity_days_monthly = 30,
    validity_days_annual = 365
WHERE validity_days_monthly IS NULL OR validity_days_annual IS NULL;

-- 3. Ensure platform_settings has default trial configuration
UPDATE public.platform_settings
SET settings = jsonb_set(
    settings,
    '{trial}',
    COALESCE(settings->'trial', '{"enabled": true, "durationDays": 7, "planId": "plan_gold"}'::jsonb),
    true
)
WHERE id = 'global';

-- 4. Create performance indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_sub_history_biz ON public.subscription_history(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_payments_biz ON public.subscription_payments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON public.subscription_payments(status);

-- 5. Enable RLS on subscription_plans if not already enabled
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to visible subscription plans
DROP POLICY IF EXISTS "Public can view visible subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view visible subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_visible = true);

-- Allow authenticated super admins to manage all subscription plans
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles ar 
        WHERE ar.user_id = auth.uid()::text AND ar.role = 'super_admin'
    )
);
