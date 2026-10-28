import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminOverviewMetrics } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    const overview = await getAdminOverviewMetrics(period);
    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (err: any) {
    console.error('Admin overview API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to load metrics' }, { status: 500 });
  }
}
