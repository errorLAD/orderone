import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { pgQuery, mapRowToUser, mapRowToBusiness, mapRowToAuditLog } from '@/lib/postgres';
import { updateAdminUser, deleteAdminUser } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const [userRes, bizRes, auditRes] = await Promise.all([
      pgQuery(
        `SELECT u.id, u.email, u.name, u.role, u.business_id, u.status, u.permissions, u.created_at,
                ar.role as admin_role
         FROM public.users u
         LEFT JOIN public.admin_roles ar ON u.id = ar.user_id
         WHERE u.id = $1 LIMIT 1;`,
        [params.id]
      ),
      pgQuery(
        `SELECT * FROM public.businesses 
         WHERE owner_id = $1 OR id = (SELECT business_id FROM public.users WHERE id = $1);`,
        [params.id]
      ),
      pgQuery(
        `SELECT * FROM public.audit_logs 
         WHERE user_id = $1 OR target_id = $1 
         ORDER BY timestamp DESC LIMIT 20;`,
        [params.id]
      ),
    ]);

    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const rawUser = userRes.rows[0];
    const user = {
      ...mapRowToUser(rawUser),
      adminRole: rawUser.admin_role || undefined,
    };

    return NextResponse.json({
      success: true,
      user,
      businesses: bizRes.rows.map(mapRowToBusiness),
      auditLogs: auditRes.rows.map(mapRowToAuditLog),
    });
  } catch (err: any) {
    console.error('Admin user detail GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { name, email, role, status, businessId, reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'A clear documented reason is required.' }, { status: 400 });
    }

    const result = await updateAdminUser({
      userId: params.id,
      updates: {
        name,
        email,
        role,
        status,
        businessId,
      },
      reason: reason.trim(),
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Admin user PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'A documented reason is required for account deletion.' }, { status: 400 });
    }

    const result = await deleteAdminUser({
      userId: params.id,
      reason: reason.trim(),
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Admin user DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
