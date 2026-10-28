import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminSubscriptions, adjustBusinessSubscription } from '@/lib/adminDb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const planId = searchParams.get('planId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminSubscriptions({
      search,
      planId,
      status,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin subscriptions GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const adjustSubSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  newPlanId: z.string().min(1, 'Plan ID is required'),
  newStatus: z.string().min(1, 'Status is required'),
  extendDays: z.number().optional(),
  reason: z.string().min(3, 'A clear documented reason is required for manual subscription adjustments'),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = adjustSubSchema.parse(body);

    const result = await adjustBusinessSubscription({
      businessId: data.businessId,
      newPlanId: data.newPlanId,
      newStatus: data.newStatus,
      extendDays: data.extendDays,
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin subscriptions POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
