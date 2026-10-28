import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, authorized: false, user: null },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      authorized: true,
      user: auth.user,
      adminRole: auth.adminRole,
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}
