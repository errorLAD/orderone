import { pgQuery, mapRowToBusiness, mapRowToUser, mapRowToSubscriptionPlan, mapRowToSubscriptionPayment, mapRowToSubscriptionHistory, mapRowToOrder, mapRowToAuditLog, mapRowToHotelRoom } from './postgres';
import { logAdminAction } from './adminAuth';
import { Business, User, SubscriptionPlan, SubscriptionPayment, Order, AuditLog, PlatformSettings } from '@/types';
import { generateId } from './utils';

// ==========================================
// 1. OVERVIEW DASHBOARD AGGREGATES
// ==========================================

export async function getAdminOverviewMetrics(period: string = '30d') {
  // Determine date filter condition
  let dateCondition = "NOW() - INTERVAL '30 days'";
  if (period === 'today') dateCondition = "CURRENT_DATE";
  else if (period === '7d') dateCondition = "NOW() - INTERVAL '7 days'";
  else if (period === 'this_month') dateCondition = "DATE_TRUNC('month', CURRENT_DATE)";
  else if (period === 'prev_month') dateCondition = "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";

  // Run real aggregate queries in parallel
  const [
    bizRes,
    subRes,
    payRes,
    ordersRes,
    recentBizRes,
    recentPaymentsRes,
    recentAuditRes,
    plansRes,
  ] = await Promise.all([
    // Business status aggregates
    pgQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'active') as active,
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE created_at >= ${dateCondition}) as new_in_period
      FROM public.businesses;
    `),

    // Subscription status aggregates
    pgQuery(`
      SELECT 
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'active') as active_subs,
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'expired') as expired_subs,
        COUNT(*) FILTER (WHERE (subscription->>'planId') = 'plan_basic') as basic_count,
        COUNT(*) FILTER (WHERE (subscription->>'planId') = 'plan_gold') as gold_count,
        COUNT(*) FILTER (WHERE (subscription->>'planId') = 'plan_diamond') as diamond_count,
        COUNT(*) FILTER (
          WHERE (subscription->>'status') = 'active' 
          AND (subscription->>'renewsAt')::timestamptz <= NOW() + INTERVAL '7 days'
          AND (subscription->>'renewsAt')::timestamptz >= NOW()
        ) as expiring_7d
      FROM public.businesses;
    `),

    // Payment revenue aggregates (only verified completed payments count)
    pgQuery(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as verified_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as gross_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) as refunds_amount,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunds_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status IN ('pending', 'pending_verification')) as pending_review_count
      FROM public.subscription_payments;
    `),

    // Order counts
    pgQuery(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE source_type = 'store') as store_orders,
        COUNT(*) FILTER (WHERE source_type = 'menu') as menu_orders,
        COUNT(*) FILTER (WHERE order_status IN ('new', 'accepted', 'preparing')) as active_pending_orders
      FROM public.orders;
    `),

    // Recent business registrations
    pgQuery(`
      SELECT id, name, slug, type, email, phone, created_at, subscription
      FROM public.businesses
      ORDER BY created_at DESC
      LIMIT 6;
    `),

    // Recent payments
    pgQuery(`
      SELECT sp.*, b.name as business_name
      FROM public.subscription_payments sp
      LEFT JOIN public.businesses b ON sp.business_id = b.id
      ORDER BY sp.created_at DESC
      LIMIT 6;
    `),

    // Recent audit activity
    pgQuery(`
      SELECT *
      FROM public.audit_logs
      ORDER BY timestamp DESC
      LIMIT 8;
    `),

    // Plans subscriber distribution
    pgQuery(`
      SELECT 
        id, name, slug, price_monthly,
        (SELECT COUNT(*) FROM public.businesses b WHERE (b.subscription->>'planId') = sp.id AND (b.subscription->>'status') = 'active') as active_subscribers
      FROM public.subscription_plans sp;
    `),
  ]);

  const bizCounts = bizRes.rows[0];
  const subCounts = subRes.rows[0];
  const payCounts = payRes.rows[0];
  const orderCounts = ordersRes.rows[0];

  const grossRevenue = parseFloat(payCounts.gross_revenue || '0');
  const refundsAmount = parseFloat(payCounts.refunds_amount || '0');
  const netRevenue = Math.max(0, grossRevenue - refundsAmount);

  // Daily registration & revenue trend over last 14 days
  const trendsRes = await pgQuery(`
    SELECT 
      TO_CHAR(d.day, 'DD Mon') as date_label,
      d.day::date as date_key,
      COUNT(DISTINCT b.id) as registrations,
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as revenue
    FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'::interval) d(day)
    LEFT JOIN public.businesses b ON DATE_TRUNC('day', b.created_at) = d.day
    LEFT JOIN public.subscription_payments p ON DATE_TRUNC('day', p.created_at) = d.day
    GROUP BY d.day
    ORDER BY d.day ASC;
  `);

  return {
    summary: {
      totalBusinesses: parseInt(bizCounts.total, 10),
      activeBusinesses: parseInt(bizCounts.active, 10),
      suspendedBusinesses: parseInt(bizCounts.suspended, 10),
      newBusinessesThisPeriod: parseInt(bizCounts.new_in_period, 10),
      activeSubscriptions: parseInt(subCounts.active_subs, 10),
      expiredSubscriptions: parseInt(subCounts.expired_subs, 10),
      expiringIn7Days: parseInt(subCounts.expiring_7d, 10),
      basicSubscribers: parseInt(subCounts.basic_count, 10),
      goldSubscribers: parseInt(subCounts.gold_count, 10),
      diamondSubscribers: parseInt(subCounts.diamond_count, 10),
      verifiedPaymentsCount: parseInt(payCounts.verified_count, 10),
      grossRevenue,
      refundsAmount,
      refundsCount: parseInt(payCounts.refunds_count, 10),
      netRevenue,
      failedPaymentsCount: parseInt(payCounts.failed_count, 10),
      pendingReviewCount: parseInt(payCounts.pending_review_count, 10),
      totalOrders: parseInt(orderCounts.total_orders, 10),
      storeOrders: parseInt(orderCounts.store_orders, 10),
      menuOrders: parseInt(orderCounts.menu_orders, 10),
      activePendingOrders: parseInt(orderCounts.active_pending_orders, 10),
    },
    trends: trendsRes.rows.map((r) => ({
      date: r.date_label,
      registrations: parseInt(r.registrations, 10),
      revenue: parseFloat(r.revenue),
    })),
    planDistribution: plansRes.rows.map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: parseFloat(p.price_monthly),
      activeSubscribers: parseInt(p.active_subscribers, 10),
    })),
    recentBusinesses: recentBizRes.rows.map(mapRowToBusiness),
    recentPayments: recentPaymentsRes.rows.map(mapRowToSubscriptionPayment),
    recentAuditLogs: recentAuditRes.rows.map(mapRowToAuditLog),
  };
}

// ==========================================
// 2. BUSINESS MANAGEMENT
// ==========================================

export async function getAdminBusinesses(options: {
  search?: string;
  category?: string;
  planId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(b.name) LIKE $${paramIdx} 
      OR LOWER(b.slug) LIKE $${paramIdx} 
      OR LOWER(b.email) LIKE $${paramIdx} 
      OR b.id = $${paramIdx + 1}
      OR LOWER(u.email) LIKE $${paramIdx}
      OR LOWER(u.name) LIKE $${paramIdx}
    )`);
    params.push(q, options.search.trim());
    paramIdx += 2;
  }

  if (options.category && options.category !== 'all') {
    conditions.push(`b.type = $${paramIdx}`);
    params.push(options.category);
    paramIdx++;
  }

  if (options.planId && options.planId !== 'all') {
    conditions.push(`(b.subscription->>'planId') = $${paramIdx}`);
    params.push(options.planId);
    paramIdx++;
  }

  if (options.status && options.status !== 'all') {
    conditions.push(`(b.subscription->>'status') = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const sortCol = options.sortBy === 'name' ? 'b.name' : 'b.created_at';
  const sortDir = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(
      `SELECT COUNT(*) 
       FROM public.businesses b
       LEFT JOIN public.users u ON b.owner_id = u.id
       WHERE ${whereClause};`,
      params
    ),
    pgQuery(
      `SELECT b.*, u.name as owner_name, u.email as owner_email,
              (SELECT COUNT(*) FROM public.orders o WHERE o.business_id = b.id AND o.source_type = 'store') as store_order_count,
              (SELECT COUNT(*) FROM public.orders o WHERE o.business_id = b.id AND o.source_type = 'menu') as menu_order_count,
              (SELECT COUNT(*) FROM public.products p WHERE p.business_id = b.id) as product_count,
              (SELECT COUNT(*) FROM public.categories c WHERE c.business_id = b.id) as category_count,
              (SELECT COUNT(*) FROM public.hotel_rooms hr WHERE hr.business_id = b.id) as room_count
       FROM public.businesses b
       LEFT JOIN public.users u ON b.owner_id = u.id
       WHERE ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  const businesses = rowsRes.rows.map((r) => {
    const biz = mapRowToBusiness(r);
    return {
      ...biz,
      ownerEmail: r.owner_email || undefined,
      storeOrderCount: parseInt(r.store_order_count || '0', 10),
      menuOrderCount: parseInt(r.menu_order_count || '0', 10),
      productCount: parseInt(r.product_count || '0', 10),
      categoryCount: parseInt(r.category_count || '0', 10),
      roomCount: parseInt(r.room_count || '0', 10),
    };
  });

  return {
    businesses,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getAdminBusinessDetail(businessId: string) {
  const [bizRes, prodsRes, catsRes, ordersRes, paymentsRes, subHistoryRes, roomsRes] = await Promise.all([
    // Business profile
    pgQuery(
      `SELECT b.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.id as owner_user_id
       FROM public.businesses b
       LEFT JOIN public.users u ON b.owner_id = u.id
       WHERE b.id = $1 LIMIT 1;`,
      [businessId]
    ),
    // Products counts & sample
    pgQuery(
      `SELECT id, name, price, is_available, source_type, created_at 
       FROM public.products 
       WHERE business_id = $1 
       ORDER BY created_at DESC;`,
      [businessId]
    ),
    // Categories
    pgQuery(
      `SELECT id, name, slug, source_type, is_active, created_at 
       FROM public.categories 
       WHERE business_id = $1 
       ORDER BY sort_order ASC;`,
      [businessId]
    ),
    // Recent orders
    pgQuery(
      `SELECT id, token_number, source_type, total, order_status, payment_status, created_at 
       FROM public.orders 
       WHERE business_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20;`,
      [businessId]
    ),
    // Payments history
    pgQuery(
      `SELECT * FROM public.subscription_payments 
       WHERE business_id = $1 
       ORDER BY created_at DESC;`,
      [businessId]
    ),
    // Subscription history
    pgQuery(
      `SELECT * FROM public.subscription_history 
       WHERE business_id = $1 
       ORDER BY created_at DESC;`,
      [businessId]
    ),
    // Hotel rooms
    pgQuery(
      `SELECT * FROM public.hotel_rooms 
       WHERE business_id = $1 
       ORDER BY room_number ASC;`,
      [businessId]
    ),
  ]);

  if (bizRes.rows.length === 0) return null;

  const rawBiz = bizRes.rows[0];
  const business = mapRowToBusiness(rawBiz);

  const products = prodsRes.rows;
  const categories = catsRes.rows;
  const orders = ordersRes.rows.map(mapRowToOrder);
  const payments = paymentsRes.rows.map(mapRowToSubscriptionPayment);
  const subscriptionHistory = subHistoryRes.rows.map(mapRowToSubscriptionHistory);

  // Applicable plan limits
  const planId = business.subscription.planId;
  const planLimits = planId === 'plan_gold' ? { items: 50, categories: 30 } : { items: 20, categories: 10 };
  const storeProducts = products.filter((p) => p.source_type === 'store');
  const menuProducts = products.filter((p) => p.source_type === 'menu');
  const relevantItemCount = storeProducts.length + menuProducts.length;

  const isItemLimitViolated = relevantItemCount > planLimits.items;
  const isCategoryLimitViolated = categories.length > planLimits.categories;

  return {
    business: {
      ...business,
      ownerEmail: rawBiz.owner_email,
      ownerPhone: rawBiz.owner_phone,
    },
    products: {
      total: products.length,
      storeCount: storeProducts.length,
      menuCount: menuProducts.length,
      itemsLimit: planLimits.items,
      isLimitViolated: isItemLimitViolated,
      list: products.slice(0, 10),
    },
    categories: {
      total: categories.length,
      limit: planLimits.categories,
      isLimitViolated: isCategoryLimitViolated,
      list: categories,
    },
    orders: {
      storeOrders: orders.filter((o) => o.sourceType === 'store'),
      menuOrders: orders.filter((o) => o.sourceType === 'menu'),
    },
    rooms: {
      total: roomsRes.rows.length,
      active: roomsRes.rows.filter((r) => r.is_active).length,
      list: roomsRes.rows.map(mapRowToHotelRoom),
    },
    payments,
    subscriptionHistory,
  };
}

export async function setBusinessAccountStatus(params: {
  businessId: string;
  newStatus: 'active' | 'suspended';
  reason: string;
  adminUser: User;
}) {
  const currentBizRes = await pgQuery(`SELECT * FROM public.businesses WHERE id = $1;`, [params.businessId]);
  if (currentBizRes.rows.length === 0) throw new Error('Business not found');

  const current = currentBizRes.rows[0];
  const sub = typeof current.subscription === 'string' ? JSON.parse(current.subscription) : current.subscription;
  const prevStatus = sub.status;

  sub.status = params.newStatus;
  sub.statusUpdatedAt = new Date().toISOString();
  sub.statusReason = params.reason;

  await pgQuery(
    `UPDATE public.businesses 
     SET subscription = $1, updated_at = NOW() 
     WHERE id = $2;`,
    [JSON.stringify(sub), params.businessId]
  );

  // Log to audit table
  await logAdminAction({
    adminUser: params.adminUser,
    action: params.newStatus === 'suspended' ? 'business.suspend' : 'business.reactivate',
    details: `Business status transitioned from ${prevStatus} to ${params.newStatus}. Reason: ${params.reason}`,
    targetEntity: 'business',
    targetId: params.businessId,
    reason: params.reason,
    beforeValues: { status: prevStatus },
    afterValues: { status: params.newStatus },
    businessId: params.businessId,
  });

  return { success: true, newStatus: params.newStatus };
}

// ==========================================
// 3. USER MANAGEMENT
// ==========================================

export async function getAdminUsers(options: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx} OR u.id = $${paramIdx + 1})`);
    params.push(q, options.search.trim());
    paramIdx += 2;
  }

  if (options.role && options.role !== 'all') {
    conditions.push(`u.role = $${paramIdx}`);
    params.push(options.role);
    paramIdx++;
  }

  if (options.status && options.status !== 'all') {
    conditions.push(`u.status = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(`SELECT COUNT(*) FROM public.users u WHERE ${whereClause};`, params),
    pgQuery(
      `SELECT u.id, u.email, u.name, u.role, u.business_id, u.status, u.created_at,
              b.name as business_name, b.slug as business_slug, b.type as business_type,
              ar.role as admin_role
       FROM public.users u
       LEFT JOIN public.businesses b ON u.business_id = b.id
       LEFT JOIN public.admin_roles ar ON u.id = ar.user_id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    users: rowsRes.rows.map((r) => ({
      ...mapRowToUser(r),
      businessName: r.business_name || undefined,
      businessSlug: r.business_slug || undefined,
      businessType: r.business_type || undefined,
      adminRole: r.admin_role || undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function setUserAccountStatus(params: {
  userId: string;
  newStatus: 'active' | 'suspended';
  reason: string;
  adminUser: User;
}) {
  const userRes = await pgQuery(`SELECT * FROM public.users WHERE id = $1;`, [params.userId]);
  if (userRes.rows.length === 0) throw new Error('User not found');

  const targetUser = userRes.rows[0];
  const prevStatus = targetUser.status || 'active';

  // Protect designated super admin from accidental suspension
  if (targetUser.email === 'ab.mishra@yahoo.com') {
    throw new Error('Action blocked: The primary Super Admin account cannot be suspended.');
  }

  await pgQuery(`UPDATE public.users SET status = $1 WHERE id = $2;`, [params.newStatus, params.userId]);

  // Invalidate any active sessions if suspended
  if (params.newStatus === 'suspended') {
    await pgQuery(`DELETE FROM public.sessions WHERE user_id = $1;`, [params.userId]);
  }

  await logAdminAction({
    adminUser: params.adminUser,
    action: params.newStatus === 'suspended' ? 'user.suspend' : 'user.reactivate',
    details: `User ${targetUser.email} status changed to ${params.newStatus}. Reason: ${params.reason}`,
    targetEntity: 'user',
    targetId: params.userId,
    reason: params.reason,
    beforeValues: { status: prevStatus },
    afterValues: { status: params.newStatus },
    businessId: targetUser.business_id,
  });

  return { success: true, newStatus: params.newStatus };
}

// ==========================================
// 4. SUBSCRIPTION PLANS MANAGEMENT
// ==========================================

export async function getAdminPlans() {
  const plansRes = await pgQuery(`
    SELECT sp.*,
      (SELECT COUNT(*) FROM public.businesses b WHERE (b.subscription->>'planId') = sp.id AND (b.subscription->>'status') = 'active') as active_subscribers,
      (SELECT COUNT(*) FROM public.subscription_payments p WHERE p.plan_id = sp.id AND p.status = 'completed') as total_purchases
    FROM public.subscription_plans sp
    ORDER BY sp.price_monthly ASC;
  `);

  return plansRes.rows.map((r) => ({
    ...mapRowToSubscriptionPlan(r),
    activeSubscribers: parseInt(r.active_subscribers || '0', 10),
    totalPurchases: parseInt(r.total_purchases || '0', 10),
  }));
}

export async function updateAdminPlan(params: {
  planId: string;
  updates: Partial<SubscriptionPlan>;
  reason: string;
  adminUser: User;
}) {
  const currentPlanRes = await pgQuery(`SELECT * FROM public.subscription_plans WHERE id = $1;`, [params.planId]);
  if (currentPlanRes.rows.length === 0) throw new Error('Plan not found');

  const current = currentPlanRes.rows[0];

  const priceMonthly = params.updates.priceMonthly !== undefined ? params.updates.priceMonthly : parseFloat(current.price_monthly);
  const priceAnnual = params.updates.priceAnnual !== undefined ? params.updates.priceAnnual : parseFloat(current.price_annual);
  const maxProducts = params.updates.maxProducts !== undefined ? params.updates.maxProducts : current.max_products;
  const maxCategories = params.updates.maxCategories !== undefined ? params.updates.maxCategories : current.max_categories;
  const description = params.updates.description !== undefined ? params.updates.description : current.description;
  const isVisible = params.updates.isVisible !== undefined ? params.updates.isVisible : current.is_visible;
  const allowsStore = params.updates.allowsStore !== undefined ? params.updates.allowsStore : current.allows_store;
  const customUpi = params.updates.customUpi !== undefined ? params.updates.customUpi : current.custom_upi;

  await pgQuery(
    `UPDATE public.subscription_plans
     SET price_monthly = $1,
         price_annual = $2,
         max_products = $3,
         max_categories = $4,
         description = $5,
         is_visible = $6,
         allows_store = $7,
         custom_upi = $8
     WHERE id = $9;`,
    [
      priceMonthly,
      priceAnnual,
      maxProducts,
      maxCategories,
      description,
      isVisible,
      allowsStore,
      customUpi,
      params.planId,
    ]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'plan.update',
    details: `Updated plan ${current.name} (${params.planId}). Price: ₹${priceMonthly}, Limits: ${maxProducts} items/${maxCategories} cats. Reason: ${params.reason}`,
    targetEntity: 'plan',
    targetId: params.planId,
    reason: params.reason,
    beforeValues: current,
    afterValues: { priceMonthly, priceAnnual, maxProducts, maxCategories, description, isVisible, allowsStore, customUpi },
  });

  return { success: true };
}

// ==========================================
// 5. SUBSCRIPTIONS MANAGEMENT
// ==========================================

export async function getAdminSubscriptions(options: {
  search?: string;
  planId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(LOWER(b.name) LIKE $${paramIdx} OR LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx})`);
    params.push(q);
    paramIdx++;
  }

  if (options.planId && options.planId !== 'all') {
    conditions.push(`(b.subscription->>'planId') = $${paramIdx}`);
    params.push(options.planId);
    paramIdx++;
  }

  if (options.status && options.status !== 'all') {
    conditions.push(`(b.subscription->>'status') = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(
      `SELECT COUNT(*) 
       FROM public.businesses b
       LEFT JOIN public.users u ON b.owner_id = u.id
       WHERE ${whereClause};`,
      params
    ),
    pgQuery(
      `SELECT b.id as business_id, b.name as business_name, b.slug as business_slug, b.type as business_type,
              b.subscription, b.created_at as business_created_at,
              u.name as owner_name, u.email as owner_email,
              (SELECT sp.payment_reference FROM public.subscription_payments sp WHERE sp.business_id = b.id ORDER BY sp.created_at DESC LIMIT 1) as last_payment_reference,
              (SELECT sp.payment_provider FROM public.subscription_payments sp WHERE sp.business_id = b.id ORDER BY sp.created_at DESC LIMIT 1) as last_payment_provider
       FROM public.businesses b
       LEFT JOIN public.users u ON b.owner_id = u.id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  const subscriptions = rowsRes.rows.map((r) => {
    const sub = typeof r.subscription === 'string' ? JSON.parse(r.subscription) : r.subscription;
    return {
      businessId: r.business_id,
      businessName: r.business_name,
      businessSlug: r.business_slug,
      businessType: r.business_type,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      planId: sub.planId || 'plan_basic',
      status: sub.status || 'active',
      amount: sub.amount || (sub.planId === 'plan_gold' ? 149 : sub.planId === 'plan_diamond' ? 249 : 49),
      billingCycle: sub.billingCycle || 'monthly',
      renewsAt: sub.renewsAt || sub.expiresAt,
      startsAt: sub.startsAt || r.business_created_at,
      paymentReference: r.last_payment_reference,
      paymentProvider: r.last_payment_provider || 'razorpay',
    };
  });

  return {
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function adjustBusinessSubscription(params: {
  businessId: string;
  newPlanId: string;
  newStatus: string;
  extendDays?: number;
  reason: string;
  adminUser: User;
}) {
  const bizRes = await pgQuery(`SELECT * FROM public.businesses WHERE id = $1;`, [params.businessId]);
  if (bizRes.rows.length === 0) throw new Error('Business not found');

  const biz = bizRes.rows[0];
  const sub = typeof biz.subscription === 'string' ? JSON.parse(biz.subscription) : biz.subscription;
  const prevSub = { ...sub };

  sub.planId = params.newPlanId;
  sub.status = params.newStatus;

  if (params.extendDays && params.extendDays > 0) {
    const currentExpiry = sub.renewsAt ? new Date(sub.renewsAt) : new Date();
    const baseTime = currentExpiry > new Date() ? currentExpiry.getTime() : Date.now();
    sub.renewsAt = new Date(baseTime + params.extendDays * 86400000).toISOString();
  }

  await pgQuery(
    `UPDATE public.businesses 
     SET subscription = $1, updated_at = NOW() 
     WHERE id = $2;`,
    [JSON.stringify(sub), params.businessId]
  );

  // Record subscription history
  await pgQuery(
    `INSERT INTO public.subscription_history (id, business_id, previous_plan_id, new_plan_id, change_type, notes, effective_date, created_at)
     VALUES ($1, $2, $3, $4, 'admin_adjustment', $5, NOW(), NOW());`,
    [generateId('sub_hist'), params.businessId, prevSub.planId, params.newPlanId, params.reason]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'subscription.adjust',
    details: `Adjusted subscription for business ${biz.name} to plan ${params.newPlanId}, status ${params.newStatus}. Reason: ${params.reason}`,
    targetEntity: 'subscription',
    targetId: params.businessId,
    reason: params.reason,
    beforeValues: prevSub,
    afterValues: sub,
    businessId: params.businessId,
  });

  return { success: true };
}

// ==========================================
// 6. PAYMENTS & RAZORPAY RECONCILIATION
// ==========================================

export async function getAdminPayments(options: {
  search?: string;
  status?: string;
  provider?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(
      p.id = $${paramIdx + 1}
      OR p.razorpay_payment_id = $${paramIdx + 1}
      OR p.razorpay_order_id = $${paramIdx + 1}
      OR LOWER(b.name) LIKE $${paramIdx}
      OR LOWER(b.slug) LIKE $${paramIdx}
    )`);
    params.push(q, options.search.trim());
    paramIdx += 2;
  }

  if (options.status && options.status !== 'all') {
    conditions.push(`p.status = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  if (options.provider && options.provider !== 'all') {
    conditions.push(`p.payment_provider = $${paramIdx}`);
    params.push(options.provider);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(
      `SELECT COUNT(*) 
       FROM public.subscription_payments p
       LEFT JOIN public.businesses b ON p.business_id = b.id
       WHERE ${whereClause};`,
      params
    ),
    pgQuery(
      `SELECT p.*, b.name as business_name, b.slug as business_slug
       FROM public.subscription_payments p
       LEFT JOIN public.businesses b ON p.business_id = b.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    payments: rowsRes.rows.map((r) => ({
      ...mapRowToSubscriptionPayment(r),
      businessName: r.business_name || 'Unknown Business',
      businessSlug: r.business_slug || '',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function processPaymentRefund(params: {
  paymentId: string;
  reason: string;
  adminUser: User;
}) {
  const payRes = await pgQuery(`SELECT * FROM public.subscription_payments WHERE id = $1;`, [params.paymentId]);
  if (payRes.rows.length === 0) throw new Error('Payment transaction not found');

  const payment = payRes.rows[0];
  if (payment.status === 'refunded') {
    throw new Error('This transaction has already been refunded.');
  }

  // Update status to refunded in PostgreSQL
  await pgQuery(
    `UPDATE public.subscription_payments 
     SET status = 'refunded', notes = $1, updated_at = NOW() 
     WHERE id = $2;`,
    [`Refunded by Admin (${params.adminUser.name}): ${params.reason}`, params.paymentId]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'payment.refund',
    details: `Refunded subscription payment #${payment.id} for ₹${payment.amount} (${payment.plan_id}). Reason: ${params.reason}`,
    targetEntity: 'payment',
    targetId: params.paymentId,
    reason: params.reason,
    beforeValues: { status: payment.status, amount: payment.amount },
    afterValues: { status: 'refunded', notes: params.reason },
    businessId: payment.business_id,
  });

  return { success: true, message: 'Payment successfully marked as refunded in database.' };
}

// ==========================================
// 7. ORDERS (STRICT SEPARATION: STORE VS MENU)
// ==========================================

export async function getAdminOrders(options: {
  sourceType: 'store' | 'menu';
  search?: string;
  status?: string;
  businessId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['o.source_type = $1'];
  const params: any[] = [options.sourceType];
  let paramIdx = 2;

  if (options.search?.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    conditions.push(`(
      o.token_number = $${paramIdx + 1}
      OR o.id = $${paramIdx + 1}
      OR LOWER(b.name) LIKE $${paramIdx}
      OR LOWER(o.customer_info->>'name') LIKE $${paramIdx}
      OR (o.customer_info->>'phone') LIKE $${paramIdx}
    )`);
    params.push(q, options.search.trim());
    paramIdx += 2;
  }

  if (options.status && options.status !== 'all') {
    conditions.push(`o.order_status = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  if (options.businessId && options.businessId !== 'all') {
    conditions.push(`o.business_id = $${paramIdx}`);
    params.push(options.businessId);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(
      `SELECT COUNT(*) 
       FROM public.orders o
       LEFT JOIN public.businesses b ON o.business_id = b.id
       WHERE ${whereClause};`,
      params
    ),
    pgQuery(
      `SELECT o.*, b.name as business_name, b.slug as business_slug, b.type as business_type
       FROM public.orders o
       LEFT JOIN public.businesses b ON o.business_id = b.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    orders: rowsRes.rows.map((r) => ({
      ...mapRowToOrder(r),
      businessName: r.business_name || 'Store',
      businessSlug: r.business_slug || '',
      businessType: r.business_type || '',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

// ==========================================
// 8. AUDIT LOGS
// ==========================================

export async function getAdminAuditLogs(options: {
  action?: string;
  targetEntity?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.action && options.action !== 'all') {
    conditions.push(`action = $${paramIdx}`);
    params.push(options.action);
    paramIdx++;
  }

  if (options.targetEntity && options.targetEntity !== 'all') {
    conditions.push(`target_entity = $${paramIdx}`);
    params.push(options.targetEntity);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const [countRes, rowsRes] = await Promise.all([
    pgQuery(`SELECT COUNT(*) FROM public.audit_logs WHERE ${whereClause};`, params),
    pgQuery(
      `SELECT * FROM public.audit_logs 
       WHERE ${whereClause} 
       ORDER BY timestamp DESC 
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1};`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    logs: rowsRes.rows.map(mapRowToAuditLog),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

// ==========================================
// 9. PLATFORM SETTINGS
// ==========================================

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const res = await pgQuery(`SELECT settings FROM public.platform_settings WHERE id = 'global' LIMIT 1;`);
  if (res.rows.length === 0) {
    return {
      platformName: 'OrderOne.in',
      legalCompanyName: 'InfraBlue Materials Technology Private Limited',
      supportEmail: 'support@orderone.in',
      publicWebsiteUrl: 'https://orderone.in',
      contactPhone: '+91 98765 43210',
      maintenanceMode: false,
      allowRegistrations: true,
      diamondPlanAvailable: false,
      supportedCategories: ['restaurant', 'cafe', 'bakery', 'juice_shop', 'grocery', 'retail', 'hardware'],
      defaultBranding: {
        primaryColor: '#4F46E5',
        secondaryColor: '#0F172A',
        accentColor: '#F59E0B',
      },
    };
  }
  return typeof res.rows[0].settings === 'string' ? JSON.parse(res.rows[0].settings) : res.rows[0].settings;
}

export async function updatePlatformSettings(params: {
  settings: Partial<PlatformSettings>;
  reason: string;
  adminUser: User;
}) {
  const current = await getPlatformSettings();
  const merged = { ...current, ...params.settings };

  await pgQuery(
    `INSERT INTO public.platform_settings (id, settings, updated_at, updated_by)
     VALUES ('global', $1, NOW(), $2)
     ON CONFLICT (id) DO UPDATE 
     SET settings = $1, updated_at = NOW(), updated_by = $2;`,
    [JSON.stringify(merged), params.adminUser.email]
  );

  // If diamond plan visibility changed, keep subscription_plans table in sync
  if (params.settings.diamondPlanAvailable !== undefined) {
    await pgQuery(
      `UPDATE public.subscription_plans SET is_visible = $1 WHERE id = 'plan_diamond';`,
      [Boolean(params.settings.diamondPlanAvailable)]
    );
  }

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'settings.update',
    details: `Platform settings updated. Reason: ${params.reason}`,
    targetEntity: 'settings',
    targetId: 'global',
    reason: params.reason,
    beforeValues: current,
    afterValues: merged,
  });

  return { success: true, settings: merged };
}

// ==========================================
// 10. NOTIFICATIONS
// ==========================================

export async function getAdminNotifications(unreadOnly = false) {
  let query = `
    SELECT * FROM public.notifications 
    WHERE (business_id IS NULL OR business_id = 'platform' OR source_type = 'system')
  `;
  if (unreadOnly) {
    query += ` AND is_read = false`;
  }
  query += ` ORDER BY created_at DESC LIMIT 50;`;

  const res = await pgQuery(query);
  return res.rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    orderId: r.order_id || undefined,
    tokenNumber: r.token_number || undefined,
    isRead: r.is_read === true,
    createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
  }));
}

export async function markAdminNotificationRead(notificationId: string) {
  await pgQuery(`UPDATE public.notifications SET is_read = true WHERE id = $1;`, [notificationId]);
  return { success: true };
}

export async function markAllAdminNotificationsRead() {
  await pgQuery(`UPDATE public.notifications SET is_read = true WHERE is_read = false;`);
  return { success: true };
}

export async function clearAllReadAdminNotifications() {
  await pgQuery(`DELETE FROM public.notifications WHERE is_read = true;`);
  return { success: true };
}

// ==========================================
// 11. EXTENDED CRUD MUTATIONS (VIEW, EDIT, DELETE & AUDIT)
// ==========================================

export async function updateAdminBusiness(params: {
  businessId: string;
  updates: {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    isStoreOpen?: boolean;
    onlineOrderingEnabled?: boolean;
    settings?: any;
  };
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.businesses WHERE id = $1;`, [params.businessId]);
  if (currentRes.rows.length === 0) throw new Error('Business not found');
  const current = currentRes.rows[0];

  // If slug is changed, verify uniqueness
  if (params.updates.slug && params.updates.slug !== current.slug) {
    const slugCheck = await pgQuery(`SELECT id FROM public.businesses WHERE slug = $1 AND id != $2;`, [params.updates.slug, params.businessId]);
    if (slugCheck.rows.length > 0) throw new Error('Store slug is already taken by another business.');
  }

  const name = params.updates.name ?? current.name;
  const slug = params.updates.slug ?? current.slug;
  const type = params.updates.type ?? current.type;
  const description = params.updates.description ?? current.description;
  const email = params.updates.email ?? current.email;
  const phone = params.updates.phone ?? current.phone;
  const address = params.updates.address ?? current.address;
  const isStoreOpen = params.updates.isStoreOpen ?? current.is_store_open;
  const onlineOrderingEnabled = params.updates.onlineOrderingEnabled ?? current.online_ordering_enabled;
  const settings = params.updates.settings ?? current.settings;

  await pgQuery(
    `UPDATE public.businesses
     SET name = $1, slug = $2, type = $3, description = $4, email = $5, phone = $6, address = $7,
         is_store_open = $8, online_ordering_enabled = $9, settings = $10, updated_at = NOW()
     WHERE id = $11;`,
    [name, slug, type, description, email, phone, address, isStoreOpen, onlineOrderingEnabled, JSON.stringify(settings), params.businessId]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'business.update',
    details: `Updated profile details for business ${name} (/${slug}). Reason: ${params.reason}`,
    targetEntity: 'business',
    targetId: params.businessId,
    reason: params.reason,
    beforeValues: { name: current.name, slug: current.slug, email: current.email, phone: current.phone, type: current.type },
    afterValues: { name, slug, email, phone, type },
    businessId: params.businessId,
  });

  return { success: true };
}

export async function deleteAdminBusiness(params: {
  businessId: string;
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.businesses WHERE id = $1;`, [params.businessId]);
  if (currentRes.rows.length === 0) throw new Error('Business not found');
  const current = currentRes.rows[0];

  // Dependency check: Cannot delete business with pending active orders
  const pendingOrdersRes = await pgQuery(
    `SELECT COUNT(*) FROM public.orders 
     WHERE business_id = $1 AND order_status IN ('new', 'accepted', 'preparing', 'cooking', 'ready', 'dispatched');`,
    [params.businessId]
  );
  const pendingCount = parseInt(pendingOrdersRes.rows[0].count, 10);
  if (pendingCount > 0) {
    throw new Error(`Cannot delete business: There are ${pendingCount} active unfulfilled orders. Please resolve, complete, or cancel all active orders first.`);
  }

  // Safe Cascade cleanup
  await pgQuery(`DELETE FROM public.orders WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.products WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.categories WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.subscription_payments WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.subscription_history WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.notifications WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`UPDATE public.users SET business_id = NULL WHERE business_id = $1;`, [params.businessId]);
  await pgQuery(`DELETE FROM public.businesses WHERE id = $1;`, [params.businessId]);

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'business.delete',
    details: `Permanently deleted business ${current.name} (/${current.slug}) and unlinked tenants. Reason: ${params.reason}`,
    targetEntity: 'business',
    targetId: params.businessId,
    reason: params.reason,
    beforeValues: { id: current.id, name: current.name, slug: current.slug },
  });

  return { success: true };
}

export async function updateAdminUser(params: {
  userId: string;
  updates: {
    name?: string;
    email?: string;
    role?: string;
    status?: 'active' | 'suspended';
    businessId?: string | null;
  };
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.users WHERE id = $1;`, [params.userId]);
  if (currentRes.rows.length === 0) throw new Error('User not found');
  const current = currentRes.rows[0];

  // Protect super admin email from being altered
  if (current.email === 'ab.mishra@yahoo.com' && params.updates.email && params.updates.email !== 'ab.mishra@yahoo.com') {
    throw new Error('Action blocked: The primary Super Admin email cannot be modified.');
  }

  const name = params.updates.name ?? current.name;
  const email = params.updates.email ?? current.email;
  const role = params.updates.role ?? current.role;
  const status = params.updates.status ?? (current.status || 'active');
  const businessId = params.updates.businessId !== undefined ? params.updates.businessId : current.business_id;

  await pgQuery(
    `UPDATE public.users 
     SET name = $1, email = $2, role = $3, status = $4, business_id = $5 
     WHERE id = $6;`,
    [name, email, role, status, businessId, params.userId]
  );

  // If status is suspended, kill active sessions
  if (status === 'suspended') {
    await pgQuery(`DELETE FROM public.sessions WHERE user_id = $1;`, [params.userId]);
  }

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'user.update',
    details: `Updated user account ${email}. Reason: ${params.reason}`,
    targetEntity: 'user',
    targetId: params.userId,
    reason: params.reason,
    beforeValues: { name: current.name, email: current.email, role: current.role, status: current.status },
    afterValues: { name, email, role, status },
    businessId: businessId || undefined,
  });

  return { success: true };
}

export async function deleteAdminUser(params: {
  userId: string;
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.users WHERE id = $1;`, [params.userId]);
  if (currentRes.rows.length === 0) throw new Error('User not found');
  const current = currentRes.rows[0];

  if (current.email === 'ab.mishra@yahoo.com') {
    throw new Error('Action blocked: The primary Super Admin account cannot be deleted.');
  }

  // Unlink owner_id if user owns any business
  await pgQuery(`UPDATE public.businesses SET owner_id = NULL WHERE owner_id = $1;`, [params.userId]);
  await pgQuery(`DELETE FROM public.sessions WHERE user_id = $1;`, [params.userId]);
  await pgQuery(`DELETE FROM public.admin_roles WHERE user_id = $1;`, [params.userId]);
  await pgQuery(`DELETE FROM public.users WHERE id = $1;`, [params.userId]);

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'user.delete',
    details: `Permanently deleted user account ${current.email}. Reason: ${params.reason}`,
    targetEntity: 'user',
    targetId: params.userId,
    reason: params.reason,
    beforeValues: { id: current.id, email: current.email, name: current.name },
  });

  return { success: true };
}

export async function updateAdminOrder(params: {
  orderId: string;
  updates: {
    orderStatus?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  };
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.orders WHERE id = $1;`, [params.orderId]);
  if (currentRes.rows.length === 0) throw new Error('Order not found');
  const current = currentRes.rows[0];

  const orderStatus = params.updates.orderStatus ?? current.order_status;
  const customer = current.customer || {};
  if (params.updates.customerName !== undefined) customer.name = params.updates.customerName;
  if (params.updates.customerPhone !== undefined) customer.phone = params.updates.customerPhone;
  if (params.updates.notes !== undefined) customer.notes = params.updates.notes;

  let history = current.status_history || [];
  if (typeof history === 'string') {
    try { history = JSON.parse(history); } catch { history = []; }
  }
  if (orderStatus !== current.order_status) {
    history.push({
      status: orderStatus,
      timestamp: new Date().toISOString(),
      note: `Admin override (${params.adminUser.name}): ${params.reason}`,
      updatedBy: params.adminUser.email,
    });
  }

  await pgQuery(
    `UPDATE public.orders
     SET order_status = $1, customer = $2, status_history = $3, updated_at = NOW()
     WHERE id = $4;`,
    [orderStatus, JSON.stringify(customer), JSON.stringify(history), params.orderId]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'order.update',
    details: `Order #${current.token_number || current.id} updated (status: ${orderStatus}). Reason: ${params.reason}`,
    targetEntity: 'order',
    targetId: params.orderId,
    reason: params.reason,
    beforeValues: { orderStatus: current.order_status, customer: current.customer },
    afterValues: { orderStatus, customer },
    businessId: current.business_id,
  });

  return { success: true };
}

export async function cancelAdminOrder(params: {
  orderId: string;
  reason: string;
  adminUser: User;
}) {
  return updateAdminOrder({
    orderId: params.orderId,
    updates: { orderStatus: 'cancelled' },
    reason: params.reason,
    adminUser: params.adminUser,
  });
}

export async function updateAdminPayment(params: {
  paymentId: string;
  updates: {
    status?: string;
    notes?: string;
  };
  reason: string;
  adminUser: User;
}) {
  const currentRes = await pgQuery(`SELECT * FROM public.subscription_payments WHERE id = $1;`, [params.paymentId]);
  if (currentRes.rows.length === 0) throw new Error('Payment record not found');
  const current = currentRes.rows[0];

  const status = params.updates.status ?? current.status;
  const notes = params.updates.notes ?? current.notes;

  await pgQuery(
    `UPDATE public.subscription_payments
     SET status = $1, notes = $2, updated_at = NOW()
     WHERE id = $3;`,
    [status, notes, params.paymentId]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'payment.update',
    details: `Subscription payment #${params.paymentId} updated (status: ${status}). Reason: ${params.reason}`,
    targetEntity: 'payment',
    targetId: params.paymentId,
    reason: params.reason,
    beforeValues: { status: current.status, notes: current.notes },
    afterValues: { status, notes },
    businessId: current.business_id,
  });

  return { success: true };
}

export async function cancelAdminSubscription(params: {
  businessId: string;
  reason: string;
  adminUser: User;
}) {
  const bizRes = await pgQuery(`SELECT id, name, subscription FROM public.businesses WHERE id = $1;`, [params.businessId]);
  if (bizRes.rows.length === 0) throw new Error('Business not found');
  const biz = bizRes.rows[0];
  const sub = typeof biz.subscription === 'string' ? JSON.parse(biz.subscription) : (biz.subscription || {});
  const prevSub = { ...sub };

  sub.status = 'cancelled';
  sub.updatedAt = new Date().toISOString();

  await pgQuery(
    `UPDATE public.businesses SET subscription = $1, updated_at = NOW() WHERE id = $2;`,
    [JSON.stringify(sub), params.businessId]
  );

  await pgQuery(
    `INSERT INTO public.subscription_history (id, business_id, previous_plan_id, new_plan_id, change_type, notes, effective_date, created_at)
     VALUES ($1, $2, $3, $4, 'admin_cancellation', $5, NOW(), NOW());`,
    [generateId('sub_hist'), params.businessId, prevSub.planId || 'plan_basic', prevSub.planId || 'plan_basic', params.reason]
  );

  await logAdminAction({
    adminUser: params.adminUser,
    action: 'subscription.cancel',
    details: `Cancelled subscription for ${biz.name}. Reason: ${params.reason}`,
    targetEntity: 'subscription',
    targetId: params.businessId,
    reason: params.reason,
    beforeValues: prevSub,
    afterValues: sub,
    businessId: params.businessId,
  });

  return { success: true };
}

export async function deleteAdminNotification(notificationId: string) {
  await pgQuery(`DELETE FROM public.notifications WHERE id = $1;`, [notificationId]);
  return { success: true };
}
