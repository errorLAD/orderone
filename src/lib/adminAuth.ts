import { NextRequest, NextResponse } from 'next/server';
import { pgQuery, mapRowToUser } from './postgres';
import { User, AdminRoleRecord } from '@/types';
import { generateId } from './utils';

export interface SuperAdminAuthResult {
  authorized: boolean;
  user?: User;
  adminRole?: 'super_admin' | 'admin';
  error?: string;
  statusCode?: number;
}

/**
 * Extracts session token from HTTP-only cookie or Authorization header
 */
export function getAdminTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get('saas_session')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Verifies that the session token belongs to an active user with verified Super Admin credentials in Supabase
 */
export async function getSuperAdminFromToken(token: string): Promise<{ user: User; adminRole: 'super_admin' | 'admin' } | null> {
  if (!token) return null;

  try {
    const res = await pgQuery(
      `SELECT u.id, u.email, u.name, u.role, u.business_id, u.permissions, u.status, u.created_at,
              COALESCE(ar.role, 'admin') as admin_role
       FROM public.sessions s
       JOIN public.users u ON s.user_id = u.id
       LEFT JOIN public.admin_roles ar ON u.id = ar.user_id
       WHERE s.token = $1 
         AND s.expires_at > NOW() 
         AND (u.status IS NULL OR u.status = 'active')
         AND (u.role = 'admin' OR ar.role IN ('super_admin', 'admin'))
       LIMIT 1;`,
      [token]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const user = mapRowToUser(row);
    const adminRole = (row.admin_role === 'super_admin' ? 'super_admin' : 'admin') as 'super_admin' | 'admin';

    return { user, adminRole };
  } catch (err) {
    console.error('getSuperAdminFromToken database error:', err);
    return null;
  }
}

/**
 * Guard for Super Admin API routes.
 * Authoritatively verifies Super Admin status on the server.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<
  | { authorized: true; user: User; adminRole: 'super_admin' | 'admin' }
  | { authorized: false; response: NextResponse }
> {
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication session required.' },
        { status: 401 }
      ),
    };
  }

  const adminAuth = await getSuperAdminFromToken(token);
  if (!adminAuth) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required. Ordinary business accounts cannot access this endpoint.' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: adminAuth.user,
    adminRole: adminAuth.adminRole,
  };
}

/**
 * Records an immutable administrative audit log entry directly into Supabase PostgreSQL
 */
export async function logAdminAction(params: {
  req?: NextRequest;
  adminUser?: User;
  action: string;
  details: string;
  targetEntity?: string;
  targetId?: string;
  reason?: string;
  result?: 'success' | 'failure';
  beforeValues?: any;
  afterValues?: any;
  businessId?: string;
}): Promise<void> {
  try {
    const id = generateId('audit');
    const ipAddress = params.req
      ? (params.req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1')
      : '127.0.0.1';

    await pgQuery(
      `INSERT INTO public.audit_logs (
        id, business_id, user_id, user_name, action, details, ip_address,
        target_entity, target_id, reason, result, before_values, after_values, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW());`,
      [
        id,
        params.businessId || null,
        params.adminUser?.id || 'admin_system',
        params.adminUser?.name || 'Super Admin',
        params.action,
        params.details,
        ipAddress,
        params.targetEntity || null,
        params.targetId || null,
        params.reason || null,
        params.result || 'success',
        params.beforeValues ? JSON.stringify(params.beforeValues) : null,
        params.afterValues ? JSON.stringify(params.afterValues) : null,
      ]
    );
  } catch (err) {
    console.error('Failed to write admin audit log:', err);
  }
}
