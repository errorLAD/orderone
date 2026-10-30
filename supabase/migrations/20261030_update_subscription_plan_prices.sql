-- Current catalog pricing only. Historical subscriptions and payment records are immutable.
UPDATE public.subscription_plans
SET price_monthly = 49,
    price_annual = 490
WHERE id = 'plan_basic';

UPDATE public.subscription_plans
SET price_monthly = 149,
    price_annual = 1490
WHERE id = 'plan_gold';
