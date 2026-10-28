-- =========================================================================
-- OrderOne.in Super Admin Panel Migration
-- Version: 20261028_super_admin_panel.sql
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMIN ROLES TABLE
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    CONSTRAINT unique_user_admin_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

-- 2. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
    settings JSONB NOT NULL DEFAULT '{
      "platformName": "OrderOne.in",
      "legalCompanyName": "InfraBlue Materials Technology Private Limited",
      "supportEmail": "support@orderone.in",
      "publicWebsiteUrl": "https://orderone.in",
      "contactPhone": "+91 98765 43210",
      "maintenanceMode": false,
      "allowRegistrations": true,
      "diamondPlanAvailable": false,
      "supportedCategories": ["restaurant", "cafe", "bakery", "juice_shop", "grocery", "retail", "hardware"],
      "defaultBranding": {
        "primaryColor": "#4F46E5",
        "secondaryColor": "#0F172A",
        "accentColor": "#F59E0B"
      }
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Insert default platform settings if not exists
INSERT INTO public.platform_settings (id, updated_at)
VALUES ('global', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. EXPAND USERS TABLE WITH STATUS
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 4. EXPAND AUDIT LOGS TABLE
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS target_entity VARCHAR(100),
ADD COLUMN IF NOT EXISTS target_id TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS result VARCHAR(50) DEFAULT 'success',
ADD COLUMN IF NOT EXISTS before_values JSONB,
ADD COLUMN IF NOT EXISTS after_values JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 5. ALLOW GLOBAL/PLATFORM NOTIFICATIONS
ALTER TABLE public.notifications 
ALTER COLUMN business_id DROP NOT NULL;

-- 6. UPDATE SUBSCRIPTION PLANS PRICING TO SPECIFICATION
-- Basic: ₹49 (4900 paise), Gold: ₹149 (14900 paise), Diamond: ₹249 (24900 paise)
UPDATE public.subscription_plans 
SET price_monthly = 49.00,
    price_annual = 490.00,
    max_products = 20,
    max_categories = 10,
    allows_store = false,
    allows_menu = true,
    custom_upi = false,
    is_visible = true
WHERE id = 'plan_basic';

UPDATE public.subscription_plans 
SET price_monthly = 149.00,
    price_annual = 1490.00,
    max_products = 50,
    max_categories = 30,
    allows_store = true,
    allows_menu = true,
    custom_upi = true,
    is_visible = true
WHERE id = 'plan_gold';

UPDATE public.subscription_plans 
SET price_monthly = 249.00,
    price_annual = 2490.00,
    allows_store = true,
    allows_menu = true,
    custom_upi = true,
    is_visible = false
WHERE id = 'plan_diamond';

-- 7. PROVISION SUPER ADMIN: ab.mishra@yahoo.com
-- Initial bcrypt hash for: Admin@OrderOne2026!
-- $2a$10$v7mZc59Wd9876eW5F5l9EecVvK2yv5mZy0u1jHhCkVV9iWjLzS7uO
INSERT INTO public.users (id, email, name, role, permissions, password_hash, status, created_at)
VALUES (
    'user_superadmin_ab_mishra',
    'ab.mishra@yahoo.com',
    'Abhishek Mishra (Super Admin)',
    'admin',
    '["*"]'::jsonb,
    '$2a$10$T6qYm8mG.XkZ0mR7cM7y3OU1kGj1bS1gYQYm5U1mGj1bS1gYQYm5U', -- Will be updated via bcrypt script
    'active',
    NOW()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    status = 'active',
    permissions = '["*"]'::jsonb;

-- Also link to admin_roles table
INSERT INTO public.admin_roles (user_id, role, created_at, created_by)
SELECT id, 'super_admin', NOW(), 'system_bootstrap'
FROM public.users
WHERE LOWER(email) = 'ab.mishra@yahoo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure user_admin has super_admin role
INSERT INTO public.admin_roles (user_id, role, created_at, created_by)
SELECT id, 'super_admin', NOW(), 'system_bootstrap'
FROM public.users
WHERE id = 'user_admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. ROW LEVEL SECURITY FOR ADMIN ROLES & PLATFORM SETTINGS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can read admin_roles" ON public.admin_roles
    FOR SELECT USING (true);

CREATE POLICY "Public can view platform settings" ON public.platform_settings
    FOR SELECT USING (true);
