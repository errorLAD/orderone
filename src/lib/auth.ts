import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { pgQuery, mapRowToBusiness } from './postgres';
import { User, Role, Business, BusinessType } from '@/types';
import { generateId } from './utils';
import { getCategoryConfig } from './categories';
import { getAllBusinesses } from './db';
import { generateUniqueBusinessSlug } from './slug';

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const res = await pgQuery(
      `SELECT id, email, name, role, business_id, permissions, password_hash, created_at 
       FROM public.users 
       WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const row = res.rows[0];
    if (!row.password_hash) {
      return { success: false, error: 'Account has no password set. Please reset your password.' };
    }

    const isValid = await bcrypt.compare(password, row.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = generateId('sess');
    // Session expires in 30 days
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    await pgQuery(
      `INSERT INTO public.sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, row.id, token, expiresAt]
    );

    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as Role,
      businessId: row.business_id || undefined,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions || [],
      createdAt: row.created_at?.toISOString ? row.created_at.toISOString() : row.created_at,
    };

    return {
      success: true,
      session: {
        user,
        token,
        expiresAt,
      },
    };
  } catch (err: any) {
    console.error('Authentication database error:', err);
    return { success: false, error: 'An unexpected database error occurred during authentication.' };
  }
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  businessId?: string;
}): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();

  if (!cleanEmail || !data.password || !cleanName) {
    return { success: false, error: 'Name, email and password are required' };
  }

  if (data.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    const existing = await pgQuery(
      `SELECT id FROM public.users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = generateId('user');
    const role: Role = data.role || 'owner';
    const createdAt = new Date().toISOString();

    await pgQuery(
      `INSERT INTO public.users (id, email, name, role, business_id, password_hash, permissions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        cleanEmail,
        cleanName,
        role,
        data.businessId || null,
        passwordHash,
        JSON.stringify(role === 'owner' ? ['*'] : ['orders.view', 'orders.update']),
        createdAt,
      ]
    );

    // Create immediate session
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = generateId('sess');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    await pgQuery(
      `INSERT INTO public.sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, userId, token, expiresAt]
    );

    const user: User = {
      id: userId,
      email: cleanEmail,
      name: cleanName,
      role,
      businessId: data.businessId,
      permissions: role === 'owner' ? ['*'] : ['orders.view', 'orders.update'],
      createdAt,
    };

    return {
      success: true,
      session: {
        user,
        token,
        expiresAt,
      },
    };
  } catch (err: any) {
    console.error('Registration database error:', err);
    return { success: false, error: 'Failed to create user account in database.' };
  }
}

export async function verifySession(token: string): Promise<User | null> {
  if (!token) return null;

  try {
    const res = await pgQuery(
      `SELECT u.id, u.email, u.name, u.role, u.business_id, u.permissions, u.created_at
       FROM public.sessions s
       JOIN public.users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as Role,
      businessId: row.business_id || undefined,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions || [],
      createdAt: row.created_at?.toISOString ? row.created_at.toISOString() : row.created_at,
    };
  } catch (err) {
    console.error('verifySession error:', err);
    return null;
  }
}

export async function destroySession(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await pgQuery(`DELETE FROM public.sessions WHERE token = $1`, [token]);
    return true;
  } catch (err) {
    console.error('destroySession error:', err);
    return false;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get('saas_session')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function getCurrentUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySession(token);
}

/**
 * Authoritatively retrieves only the businesses that the authenticated user is permitted to access.
 * - Admin: All platform businesses
 * - Owner: Businesses where owner_id = user.id OR id = user.businessId
 * - Staff: Businesses where id = user.businessId
 * - Unlinked / Guest: []
 */
export async function getUserAuthorizedBusinesses(user: User): Promise<Business[]> {
  if (!user || !user.id) return [];

  if (user.role === 'admin') {
    return getAllBusinesses();
  }

  try {
    let query: string;
    let params: any[];

    if (user.role === 'staff') {
      if (!user.businessId) return [];
      query = `SELECT b.*, u.name as owner_name 
               FROM public.businesses b 
               LEFT JOIN public.users u ON b.owner_id = u.id 
               WHERE b.id = $1 
               ORDER BY b.created_at ASC`;
      params = [user.businessId];
    } else {
      // Owner or other authorized user roles
      if (user.businessId) {
        query = `SELECT b.*, u.name as owner_name 
                 FROM public.businesses b 
                 LEFT JOIN public.users u ON b.owner_id = u.id 
                 WHERE b.owner_id = $1 OR b.id = $2 
                 ORDER BY b.created_at ASC`;
        params = [user.id, user.businessId];
      } else {
        query = `SELECT b.*, u.name as owner_name 
                 FROM public.businesses b 
                 LEFT JOIN public.users u ON b.owner_id = u.id 
                 WHERE b.owner_id = $1 
                 ORDER BY b.created_at ASC`;
        params = [user.id];
      }
    }

    const res = await pgQuery(query, params);
    if (res.rows.length > 0) {
      const seen = new Set<string>();
      const list: Business[] = [];
      for (const row of res.rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          list.push(mapRowToBusiness(row));
        }
      }
      return list;
    }
  } catch (err) {
    console.error('getUserAuthorizedBusinesses error:', err);
  }

  return [];
}

/**
 * Checks whether an authenticated user is authorized for a specific businessId.
 */
export async function isUserAuthorizedForBusiness(
  user: User | null,
  businessId: string
): Promise<boolean> {
  if (!user || !businessId) return false;
  if (user.role === 'admin') return true;
  if (user.businessId === businessId) return true;

  if (user.role === 'owner') {
    try {
      const res = await pgQuery(
        `SELECT id FROM public.businesses WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [businessId, user.id]
      );
      if (res.rows.length > 0) return true;
    } catch (err) {
      console.error('isUserAuthorizedForBusiness check error:', err);
    }
  }

  return false;
}

/**
 * Guard helper for API routes: verifies authenticated user and their access to a businessId.
 */
export async function requireBusinessAuthorization(
  req: NextRequest,
  businessId?: string | null
): Promise<
  | { authorized: true; user: User; business: Business }
  | { authorized: false; response: NextResponse }
> {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to continue.' },
        { status: 401 }
      ),
    };
  }

  const authorizedBizs = await getUserAuthorizedBusinesses(user);
  if (authorizedBizs.length === 0) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'No business is linked to this account.', code: 'NO_LINKED_BUSINESS' },
        { status: 403 }
      ),
    };
  }

  if (businessId) {
    const matched = authorizedBizs.find((b) => b.id === businessId);
    if (!matched) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Forbidden: You are not authorized to access this business.', code: 'BUSINESS_FORBIDDEN' },
          { status: 403 }
        ),
      };
    }
    return { authorized: true, user, business: matched };
  }

  return { authorized: true, user, business: authorizedBizs[0] };
}

export async function registerBusinessOwner(data: {
  businessName: string;
  category: BusinessType;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
}): Promise<{ success: boolean; session?: AuthSession; business?: Business; error?: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanOwnerName = data.ownerName.trim();
  const cleanBizName = data.businessName.trim();
  const cleanPhone = data.phone.trim();
  const cleanAddress = data.address.trim();

  if (!cleanBizName) return { success: false, error: 'Business name is required' };
  if (!data.category) return { success: false, error: 'Business category is required' };
  if (!cleanOwnerName) return { success: false, error: 'Owner name is required' };
  if (!cleanEmail) return { success: false, error: 'Email address is required' };
  if (!cleanPhone) return { success: false, error: 'Phone number is required' };
  if (!cleanAddress) return { success: false, error: 'Business address is required' };
  if (!data.password || data.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    // Check email uniqueness
    const existing = await pgQuery(`SELECT id FROM public.users WHERE LOWER(email) = $1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = generateId('user');
    const bizId = generateId('biz');
    const now = new Date().toISOString();

    // Generate unique, stable slug supporting duplicate business names across any location
    const finalSlug = await generateUniqueBusinessSlug(cleanBizName, cleanAddress, bizId);

    // Determine category setup & default modules
    const config = getCategoryConfig(data.category);
    const isFood = config.primaryModule === 'menu';
    const modules = {
      menu: isFood,
      store: !isFood,
    };

    const businessSettings = {
      modules,
      orderSettings: {
        minStoreOrder: 50,
        enableGst: false,
        taxRatePercentage: 0,
        currencySymbol: '₹',
        currencyCode: 'INR',
        enableDelivery: true,
        deliveryFee: 30,
        enableTakeaway: true,
        enableDineIn: isFood,
        autoAcceptOrders: false,
      },
      tokenPrefixStore: 'S-',
      tokenPrefixMenu: 'M-',
      operatingHours: '09:00 AM - 09:00 PM (Daily)',
      onboardingCompleted: false,
    };

    // Load trial and plan configuration dynamically from platform_settings and subscription_plans
    let trialEnabled = true;
    let trialDays = 7;
    let trialPlanId = 'plan_gold';

    try {
      const platRes = await pgQuery(`SELECT settings FROM public.platform_settings WHERE id = 'global';`);
      if (platRes.rows.length > 0) {
        const pSettings = typeof platRes.rows[0].settings === 'string' ? JSON.parse(platRes.rows[0].settings) : platRes.rows[0].settings;
        if (pSettings?.trial) {
          trialEnabled = pSettings.trial.enabled !== false;
          trialDays = parseInt(pSettings.trial.durationDays || '7', 10);
          trialPlanId = pSettings.trial.planId || 'plan_gold';
        }
      }
    } catch (tErr) {
      console.error('Failed to load trial settings in auth:', tErr);
    }

    let businessSubscription: any;
    if (trialEnabled) {
      businessSubscription = {
        planId: trialPlanId,
        status: 'trial' as const,
        billingCycle: 'monthly' as const,
        renewsAt: new Date(Date.now() + trialDays * 86400000).toISOString(),
        startsAt: now,
        amount: 0,
      };
    } else {
      let basicPrice = 49;
      let basicValidity = 30;
      try {
        const planRes = await pgQuery(`SELECT price_monthly, validity_days_monthly FROM public.subscription_plans WHERE id = 'plan_basic';`);
        if (planRes.rows.length > 0) {
          basicPrice = parseFloat(planRes.rows[0].price_monthly || '49');
          basicValidity = parseInt(planRes.rows[0].validity_days_monthly || '30', 10);
        }
      } catch {}

      businessSubscription = {
        planId: 'plan_basic',
        status: 'active' as const,
        billingCycle: 'monthly' as const,
        renewsAt: new Date(Date.now() + basicValidity * 86400000).toISOString(),
        startsAt: now,
        amount: basicPrice,
      };
    }

    // Insert business in PostgreSQL
    await pgQuery(
      `INSERT INTO public.businesses (id, slug, name, type, owner_id, description, email, phone, address, settings, subscription, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        bizId,
        finalSlug,
        cleanBizName,
        data.category,
        userId,
        `${cleanBizName} - ${config.label}`,
        cleanEmail,
        cleanPhone,
        cleanAddress,
        JSON.stringify(businessSettings),
        JSON.stringify(businessSubscription),
        now,
        now,
      ]
    );

    // Record initial subscription history
    try {
      await pgQuery(
        `INSERT INTO public.subscription_history (id, business_id, new_plan_id, change_type, amount, effective_date, expires_at, notes, created_at)
         VALUES ($1, $2, $3, 'initial', $4, NOW(), $5, $6, NOW());`,
        [
          generateId('sub_hist'),
          bizId,
          businessSubscription.planId,
          businessSubscription.amount,
          businessSubscription.renewsAt,
          trialEnabled ? `Free Trial initiated upon registration (${trialDays} days)` : 'Initial subscription activated',
        ]
      );
    } catch (hErr) {
      console.error('Failed to record initial subscription history:', hErr);
    }

    // Insert user linked to business
    await pgQuery(
      `INSERT INTO public.users (id, email, name, role, business_id, password_hash, permissions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        cleanEmail,
        cleanOwnerName,
        'owner',
        bizId,
        passwordHash,
        JSON.stringify(['*']),
        now,
      ]
    );

    // Initialize sequence counters
    await pgQuery(
      `INSERT INTO public.order_sequences (business_id, source_type, current_value)
       VALUES ($1, 'store', 100), ($1, 'menu', 100)
       ON CONFLICT DO NOTHING;`,
      [bizId]
    );

    // Create default category
    const starterCategoryName = config.starterCategories[0] || 'Featured Catalog';
    await pgQuery(
      `INSERT INTO public.categories (id, business_id, source_type, name, slug, sort_order, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, true, NOW())`,
      [generateId('cat'), bizId, config.primaryModule, starterCategoryName, 'featured']
    );

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = generateId('sess');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    await pgQuery(
      `INSERT INTO public.sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, userId, token, expiresAt]
    );

    const user: User = {
      id: userId,
      email: cleanEmail,
      name: cleanOwnerName,
      role: 'owner',
      businessId: bizId,
      permissions: ['*'],
      createdAt: now,
    };

    const business: Business = {
      id: bizId,
      slug: finalSlug,
      name: cleanBizName,
      type: data.category,
      ownerId: userId,
      description: `${cleanBizName} - ${config.label}`,
      email: cleanEmail,
      phone: cleanPhone,
      address: cleanAddress,
      settings: businessSettings,
      subscription: businessSubscription,
      createdAt: now,
      updatedAt: now,
    };

    return {
      success: true,
      session: {
        user,
        token,
        expiresAt,
      },
      business,
    };
  } catch (err: any) {
    console.error('registerBusinessOwner database error:', err);
    return { success: false, error: err.message || 'Failed to complete registration in database.' };
  }
}
