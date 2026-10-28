import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionHistory } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || user.businessId;

    if (!businessId && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 });
    }

    if (businessId && user.role !== 'admin') {
      const isAuth = await isUserAuthorizedForBusiness(user, businessId);
      if (!isAuth) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const history = await getSubscriptionHistory(businessId!);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
