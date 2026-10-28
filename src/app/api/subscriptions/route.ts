import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionPlans, getBusinessById, updateBusinessSubscription } from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wantsHidden = searchParams.get('includeHidden') === 'true';

    let includeHidden = false;
    if (wantsHidden) {
      const user = await getCurrentUserFromRequest(req);
      if (user?.role === 'admin') {
        includeHidden = true;
      }
    }

    // By default, Diamond plan is strictly omitted (is_visible = false)
    const plans = await getSubscriptionPlans(includeHidden);
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, planId, billingCycle } = body;

    if (!businessId || !planId) {
      return NextResponse.json(
        { success: false, error: 'businessId and planId are required' },
        { status: 400 }
      );
    }

    const updatedBiz = await updateBusinessSubscription(
      businessId,
      planId,
      billingCycle === 'annual' ? 'annual' : 'monthly'
    );

    if (!updatedBiz) {
      return NextResponse.json({ success: false, error: 'Business or Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: updatedBiz.subscription,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
