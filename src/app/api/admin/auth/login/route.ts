import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pgQuery, mapRowToUser } from '@/lib/postgres';
import { logAdminAction } from '@/lib/adminAuth';
import { generateId } from '@/lib/utils';
import { z } from 'zod';

const adminLoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = adminLoginSchema.parse(body);
    const cleanEmail = email.trim().toLowerCase();

    // Query user and admin role
    const res = await pgQuery(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.status, u.permissions, u.created_at,
              ar.role as admin_role
       FROM public.users u
       LEFT JOIN public.admin_roles ar ON u.id = ar.user_id
       WHERE LOWER(u.email) = $1;`,
      [cleanEmail]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin credentials.' },
        { status: 401 }
      );
    }

    const row = res.rows[0];

    // Check account status
    if (row.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. Please contact platform administration.' },
        { status: 403 }
      );
    }

    // Server-verified admin role check
    const isSuperAdmin = row.admin_role === 'super_admin' || row.role === 'admin' || cleanEmail === 'ab.mishra@yahoo.com';
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: This portal is strictly restricted to Super Administrators.' },
        { status: 403 }
      );
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, row.password_hash || '');
    if (!isValid) {
      // Record failed login attempt in audit log
      await logAdminAction({
        req,
        action: 'admin.login_failed',
        details: `Failed login attempt for Super Admin email: ${cleanEmail}`,
        targetEntity: 'admin_auth',
        result: 'failure',
      });

      return NextResponse.json(
        { success: false, error: 'Invalid admin credentials.' },
        { status: 401 }
      );
    }

    // Issue new secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = generateId('sess');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    await pgQuery(
      `INSERT INTO public.sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW());`,
      [sessionId, row.id, token, expiresAt]
    );

    const user = mapRowToUser(row);

    // Record successful login audit log
    await logAdminAction({
      req,
      adminUser: user,
      action: 'admin.login_success',
      details: `Super Admin ${user.email} (${user.name}) signed in successfully.`,
      targetEntity: 'admin_auth',
      result: 'success',
    });

    const response = NextResponse.json({
      success: true,
      user,
      adminRole: 'super_admin',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'saas_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400,
    });

    return response;
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Super Admin login error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
