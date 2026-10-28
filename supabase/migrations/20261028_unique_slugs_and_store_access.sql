-- Migration: Ensure case-insensitive index on businesses.slug and add GIN index on settings for slug aliases
CREATE INDEX IF NOT EXISTS idx_businesses_lower_slug ON public.businesses (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_businesses_settings_gin ON public.businesses USING gin (settings);
