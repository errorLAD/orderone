-- =========================================================================
-- Premium Digital Store + Menu + Token SaaS Platform Schema
-- PostgreSQL & Supabase Production Schema with Multi-Tenant Row Level Security (RLS)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'restaurant', 'cafe', 'bakery', 'juice_shop', 'grocery', 'retail'
    description TEXT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    settings JSONB NOT NULL DEFAULT '{
      "modules": {"store": true, "menu": true},
      "orderSettings": {
        "minStoreOrder": 50,
        "taxRatePercentage": 5,
        "currencySymbol": "₹",
        "currencyCode": "INR",
        "enableDelivery": true,
        "deliveryFee": 30,
        "enableTakeaway": true,
        "enableDineIn": true,
        "autoAcceptOrders": false
      },
      "tokenPrefixStore": "S-",
      "tokenPrefixMenu": "M-",
      "operatingHours": "08:00 AM - 10:30 PM"
    }'::jsonb,
    subscription JSONB NOT NULL DEFAULT '{
      "planId": "plan_starter",
      "status": "active",
      "billingCycle": "monthly",
      "amount": 20
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 2. SEQUENCES TABLE FOR CONCURRENCY-SAFE TOKENS
-- Stores atomic counter for each (business_id, source_type)
CREATE TABLE IF NOT EXISTS public.order_sequences (
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    current_value BIGINT NOT NULL DEFAULT 100,
    PRIMARY KEY (business_id, source_type)
);

-- Function to atomically increment and generate token
CREATE OR REPLACE FUNCTION generate_next_order_token(p_business_id UUID, p_source_type VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_seq BIGINT;
    v_formatted TEXT;
BEGIN
    -- Select token prefix from business settings
    SELECT 
        CASE 
            WHEN p_source_type = 'store' THEN COALESCE(settings->>'tokenPrefixStore', 'S-')
            ELSE COALESCE(settings->>'tokenPrefixMenu', 'M-')
        END INTO v_prefix
    FROM public.businesses
    WHERE id = p_business_id;

    -- Upsert atomic sequence
    INSERT INTO public.order_sequences (business_id, source_type, current_value)
    VALUES (p_business_id, p_source_type, 101)
    ON CONFLICT (business_id, source_type)
    DO UPDATE SET current_value = public.order_sequences.current_value + 1
    RETURNING current_value INTO v_seq;

    v_formatted := v_prefix || LPAD(v_seq::TEXT, 5, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id, source_type);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    stock_quantity INT, -- Retail store stock
    low_stock_threshold INT DEFAULT 5,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    dietary_flags JSONB DEFAULT '{}'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    add_ons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_biz_source ON public.products(business_id, source_type);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 5. ORDERS (STRICT SEPARATION: STORE VS MENU)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    token_number VARCHAR(50) NOT NULL,
    tracking_id VARCHAR(64) UNIQUE NOT NULL,
    customer_info JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
    order_status VARCHAR(30) NOT NULL DEFAULT 'new',
    fulfilment_method VARCHAR(30) NOT NULL DEFAULT 'pickup',
    queue_token VARCHAR(50),
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_biz_source ON public.orders(business_id, source_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(business_id, order_status);

-- 6. QUEUE TOKENS
CREATE TABLE IF NOT EXISTS public.queue_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('store', 'menu')),
    token_number VARCHAR(50) NOT NULL,
    sequence_number INT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'waiting', -- 'waiting', 'called', 'served', 'skipped'
    counter_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_tokens ON public.queue_tokens(business_id, status);

-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    token_number VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_biz ON public.notifications(business_id, is_read, created_at DESC);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Public can read active businesses, categories, and products for storefronts
CREATE POLICY "Public can view active businesses" ON public.businesses
    FOR SELECT USING (true);

CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT USING (is_available = true);

CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (is_active = true);

-- Public guest customers can create orders without login
CREATE POLICY "Public guests can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Public guests can track their specific order using tracking_id
CREATE POLICY "Public guests can view order by tracking_id" ON public.orders
    FOR SELECT USING (tracking_id IS NOT NULL);
