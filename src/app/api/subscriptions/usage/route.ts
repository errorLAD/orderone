import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { getBusinessPlanUsage } from '@/lib/subscriptionLimits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || user.businessId;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this business' },
        { status: 403 }
      );
    }

    const usage = await getBusinessPlanUsage(businessId);
    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (err: any) {
    console.error('API /api/subscriptions/usage error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
