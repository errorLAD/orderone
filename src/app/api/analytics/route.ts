import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const scope = (searchParams.get('scope') as 'all' | 'store' | 'menu') || 'all';
    const timeRange = (searchParams.get('range') as 'today' | '7d' | '30d') || 'today';

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view analytics for this business' },
        { status: 403 }
      );
    }

    const data = await getAnalytics(businessId, scope, timeRange);

    return NextResponse.json({
      success: true,
      scope,
      timeRange,
      analytics: data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
