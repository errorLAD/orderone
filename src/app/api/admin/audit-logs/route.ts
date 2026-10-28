import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminAuditLogs } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const targetEntity = searchParams.get('targetEntity') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getAdminAuditLogs({
      action,
      targetEntity,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin audit logs GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
