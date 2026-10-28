import { NextRequest, NextResponse } from 'next/server';
import { getPlatformOverview, updateBusiness, addAuditLog, clearDemoData } from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const overview = await getPlatformOverview();
    return NextResponse.json({ success: true, ...overview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, businessId, status } = body;

    if (action === 'clear_demo_data') {
      const result = await clearDemoData(businessId);
      return NextResponse.json(result);
    }

    if (action === 'toggle_status' && businessId && status) {
      await updateBusiness(businessId, {
        subscription: {
          planId: 'plan_starter',
          status,
          billingCycle: 'monthly',
          renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          amount: 20,
        },
      });

      await addAuditLog({
        businessId,
        action: `Business subscription changed to ${status}`,
        details: `Platform admin set business status to ${status}`,
      });

      return NextResponse.json({ success: true, message: `Business set to ${status}` });
    }

    return NextResponse.json({ success: false, error: 'Unsupported admin action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
