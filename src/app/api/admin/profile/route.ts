import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAction } from '@/lib/adminAuth';
import { pgQuery } from '@/lib/postgres';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  return NextResponse.json({
    success: true,
    user: auth.user,
    adminRole: auth.adminRole,
  });
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = passwordChangeSchema.parse(body);

    // Fetch stored password hash
    const userRes = await pgQuery(`SELECT password_hash FROM public.users WHERE id = $1;`, [auth.user.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User record not found' }, { status: 404 });
    }

    const currentHash = userRes.rows[0].password_hash || '';
    const isCurrentValid = await bcrypt.compare(currentPassword, currentHash);
    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: 'Current password does not match.' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pgQuery(`UPDATE public.users SET password_hash = $1 WHERE id = $2;`, [newHash, auth.user.id]);

    await logAdminAction({
      req,
      adminUser: auth.user,
      action: 'admin.password_change',
      details: `Super Admin ${auth.user.email} changed their password.`,
      targetEntity: 'admin_profile',
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin profile PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
