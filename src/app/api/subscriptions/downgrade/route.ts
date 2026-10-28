import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { scheduleSubscriptionDowngrade, cancelSubscriptionDowngrade, getBusinessById } from '@/lib/db';
import { z } from 'zod';

const downgradeSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  targetPlanId: z.string().default('plan_basic'),
  action: z.enum(['schedule', 'cancel']).default('schedule'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = downgradeSchema.parse(body);

    const isAuth = await isUserAuthorizedForBusiness(user, data.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage this business' },
        { status: 403 }
      );
    }

    if (data.action === 'cancel') {
      const result = await cancelSubscriptionDowngrade(data.businessId);
      return NextResponse.json({
        success: true,
        message: result.message,
        subscription: result.business.subscription,
      });
    }

    // Schedule downgrade
    const result = await scheduleSubscriptionDowngrade(data.businessId, data.targetPlanId);
    return NextResponse.json({
      success: true,
      message: result.message,
      subscription: result.business.subscription,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    console.error('Error in subscriptions/downgrade route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
