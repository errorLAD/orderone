import { getPgPool, pgQuery } from './postgres';
import { getBusinessById } from './db';
import { BusinessPlanUsage } from '@/types';

export interface PlanLimitConfig {
  planId: string;
  name: string;
  priceMonthly: number;
  maxProducts: number;
  maxCategories: number;
  allowsStore: boolean;
  allowsMenu: boolean;
}

export const PLAN_LIMITS: { [planId: string]: PlanLimitConfig } = {
  plan_basic: {
    planId: 'plan_basic',
    name: 'Basic',
    priceMonthly: 20,
    maxProducts: 20,
    maxCategories: 10,
    allowsStore: false, // Menu only (except hardware/retail category special allowance)
    allowsMenu: true,
  },
  plan_gold: {
    planId: 'plan_gold',
    name: 'Gold',
    priceMonthly: 99,
    maxProducts: 50,
    maxCategories: 30,
    allowsStore: true,
    allowsMenu: true,
  },
  plan_diamond: {
    planId: 'plan_diamond',
    name: 'Diamond',
    priceMonthly: 150,
    maxProducts: 99999,
    maxCategories: 9999,
    allowsStore: true,
    allowsMenu: true,
  },
};

/**
 * Returns whether a business currently has active Gold (or Diamond) plan access.
 * Enforces 30-day validity, status, and scheduled downgrade timestamps.
 */
export function hasActiveGoldAccess(business: { subscription?: any } | null | undefined): boolean {
  if (!business || !business.subscription) return false;
  const sub = business.subscription;
  const nowMs = Date.now();
  const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : null;

  // Check 30-day expiry
  if (renewsAtMs && nowMs > renewsAtMs) {
    return false;
  }
  if (sub.status === 'expired' || sub.status === 'suspended') {
    return false;
  }

  let planId = sub.planId || 'plan_basic';
  // Check if scheduled downgrade took effect
  if (
    sub.scheduledDowngradePlanId &&
    sub.scheduledDowngradeDate &&
    nowMs >= new Date(sub.scheduledDowngradeDate).getTime()
  ) {
    planId = sub.scheduledDowngradePlanId;
  }

  return planId === 'plan_gold' || planId === 'plan_diamond';
}

/**
 * Returns the effective limits for a business based on its active subscription.
 * If expired, suspended, or unassigned, defaults to Basic plan limits.
 */
export async function getEffectivePlanLimits(businessId: string): Promise<PlanLimitConfig> {
  try {
    const res = await pgQuery(
      `SELECT b.id, b.subscription, sp.max_products, sp.max_categories, sp.name AS plan_name, sp.price_monthly, sp.allows_store, sp.allows_menu
       FROM public.businesses b
       LEFT JOIN public.subscription_plans sp ON sp.id = (b.subscription->>'planId')
       WHERE b.id = $1`,
      [businessId]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription || {};
      let planId = sub.planId || 'plan_basic';
      let status = sub.status || 'active';
      const nowMs = Date.now();
      const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : null;

      // Check if scheduled downgrade has arrived
      if (
        sub.scheduledDowngradePlanId &&
        sub.scheduledDowngradeDate &&
        nowMs >= new Date(sub.scheduledDowngradeDate).getTime()
      ) {
        planId = sub.scheduledDowngradePlanId;
      }

      // Check 30-day expiry
      if (renewsAtMs && nowMs > renewsAtMs) {
        status = 'expired';
      }

      // If subscription is expired or suspended, downgrade limits to basic
      if (status === 'expired' || status === 'suspended') {
        return PLAN_LIMITS.plan_basic;
      }

      if (row.max_products !== null && row.max_products !== undefined && planId === sub.planId) {
        return {
          planId,
          name: row.plan_name || (planId === 'plan_gold' ? 'Gold' : planId === 'plan_diamond' ? 'Diamond' : 'Basic'),
          priceMonthly: parseFloat(row.price_monthly || (planId === 'plan_gold' ? '99' : '20')),
          maxProducts: parseInt(row.max_products, 10),
          maxCategories: parseInt(row.max_categories || (planId === 'plan_gold' ? '30' : '10'), 10),
          allowsStore: row.allows_store === true,
          allowsMenu: row.allows_menu === true,
        };
      }

      if (PLAN_LIMITS[planId]) {
        return PLAN_LIMITS[planId];
      }
    }
  } catch (err) {
    console.error('Error fetching effective plan limits from PostgreSQL:', err);
  }

  // Fallback to reading business from db
  const biz = await getBusinessById(businessId);
  let planId = biz?.subscription?.planId || 'plan_basic';
  let status = biz?.subscription?.status || 'active';
  const nowMs = Date.now();
  const renewsAtMs = biz?.subscription?.renewsAt ? new Date(biz.subscription.renewsAt).getTime() : null;

  if (
    biz?.subscription?.scheduledDowngradePlanId &&
    biz?.subscription?.scheduledDowngradeDate &&
    nowMs >= new Date(biz.subscription.scheduledDowngradeDate).getTime()
  ) {
    planId = biz.subscription.scheduledDowngradePlanId;
  }

  if (renewsAtMs && nowMs > renewsAtMs) {
    status = 'expired';
  }

  if (status === 'expired' || status === 'suspended') {
    return PLAN_LIMITS.plan_basic;
  }

  return PLAN_LIMITS[planId] || PLAN_LIMITS.plan_basic;
}

/**
 * Returns live Supabase record counts and usage statistics for a business.
 */
export async function getBusinessPlanUsage(businessId: string): Promise<BusinessPlanUsage> {
  const planLimits = await getEffectivePlanLimits(businessId);

  let productsCount = 0;
  let categoriesCount = 0;

  try {
    const [prodRes, catRes] = await Promise.all([
      pgQuery('SELECT COUNT(*)::int AS count FROM public.products WHERE business_id = $1', [businessId]),
      pgQuery('SELECT COUNT(*)::int AS count FROM public.categories WHERE business_id = $1', [businessId]),
    ]);

    productsCount = prodRes.rows[0]?.count || 0;
    categoriesCount = catRes.rows[0]?.count || 0;
  } catch (err) {
    console.error('Error fetching usage counts from PostgreSQL:', err);
  }

  const productsRemaining = Math.max(0, planLimits.maxProducts - productsCount);
  const categoriesRemaining = Math.max(0, planLimits.maxCategories - categoriesCount);

  return {
    plan: {
      id: planLimits.planId,
      name: planLimits.name,
      priceMonthly: planLimits.priceMonthly,
      allowsStore: planLimits.allowsStore,
      allowsMenu: planLimits.allowsMenu,
    },
    products: {
      count: productsCount,
      max: planLimits.maxProducts,
      remaining: productsRemaining,
      percentage: Math.min(100, Math.round((productsCount / planLimits.maxProducts) * 100)),
      isLimitReached: productsCount >= planLimits.maxProducts,
    },
    categories: {
      count: categoriesCount,
      max: planLimits.maxCategories,
      remaining: categoriesRemaining,
      percentage: Math.min(100, Math.round((categoriesCount / planLimits.maxCategories) * 100)),
      isLimitReached: categoriesCount >= planLimits.maxCategories,
    },
  };
}

export class SubscriptionLimitError extends Error {
  public limitType: 'product' | 'category';
  public currentCount: number;
  public maxLimit: number;
  public planName: string;
  public requiresUpgrade: boolean;

  constructor(
    limitType: 'product' | 'category',
    currentCount: number,
    maxLimit: number,
    planName: string
  ) {
    let message = '';
    const isBasic = planName.toLowerCase().includes('basic');

    if (limitType === 'product') {
      message = isBasic
        ? `You've reached the Basic plan limit of 20 products or menu items. Upgrade to Gold for higher limits and Store access.`
        : `You've reached the ${planName} plan limit of ${maxLimit} products or menu items.`;
    } else {
      message = isBasic
        ? `You've reached the Basic plan limit of 10 categories. Upgrade to Gold for higher limits and Store access.`
        : `You've reached the ${planName} plan limit of ${maxLimit} categories.`;
    }

    super(message);
    this.name = 'SubscriptionLimitError';
    this.limitType = limitType;
    this.currentCount = currentCount;
    this.maxLimit = maxLimit;
    this.planName = planName;
    this.requiresUpgrade = isBasic;
  }
}

/**
 * Validates capacity before creating a product or category.
 * If at or over capacity, throws SubscriptionLimitError.
 */
export async function assertCanCreateRecord(
  businessId: string,
  type: 'product' | 'category',
  requestedCount = 1
): Promise<{ currentCount: number; maxLimit: number; planName: string }> {
  const limits = await getEffectivePlanLimits(businessId);

  const query =
    type === 'product'
      ? 'SELECT COUNT(*)::int AS count FROM public.products WHERE business_id = $1'
      : 'SELECT COUNT(*)::int AS count FROM public.categories WHERE business_id = $1';

  const res = await pgQuery(query, [businessId]);
  const currentCount = res.rows[0]?.count || 0;
  const maxLimit = type === 'product' ? limits.maxProducts : limits.maxCategories;

  if (currentCount + requestedCount > maxLimit) {
    throw new SubscriptionLimitError(type, currentCount, maxLimit, limits.name);
  }

  return {
    currentCount,
    maxLimit,
    planName: limits.name,
  };
}
