import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminSubscriptions, adjustBusinessSubscription, reconcileManualPayment } from '@/lib/adminDb';
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

const subscriptionActionSchema = z.object({
  action: z.enum(['adjust', 'reconcile_payment']).default('adjust'),
  businessId: z.string().min(1, 'Business ID is required'),
  // Adjust fields
  newPlanId: z.string().optional(),
  newStatus: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiresAt: z.string().optional(),
  extendDays: z.number().optional(),
  scheduleDowngrade: z.boolean().optional(),
  // Reconcile payment fields
  planId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  amount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  reason: z.string().min(3, 'A clear documented reason is required for manual subscription actions'),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = subscriptionActionSchema.parse(body);

    if (data.action === 'reconcile_payment') {
      if (!data.planId || data.amount === undefined || !data.paymentReference) {
        return NextResponse.json(
          { success: false, error: 'planId, amount, and paymentReference are required for payment reconciliation' },
          { status: 400 }
        );
      }

      const result = await reconcileManualPayment({
        businessId: data.businessId,
        planId: data.planId,
        billingCycle: data.billingCycle || 'monthly',
        amount: data.amount,
        paymentMethod: data.paymentMethod || 'bank_transfer',
        paymentReference: data.paymentReference,
        reason: data.reason,
        adminUser: auth.user,
      });

      return NextResponse.json(result);
    }

    // Default: adjust subscription
    if (!data.newPlanId || !data.newStatus) {
      return NextResponse.json(
        { success: false, error: 'newPlanId and newStatus are required for subscription adjustments' },
        { status: 400 }
      );
    }

    const result = await adjustBusinessSubscription({
      businessId: data.businessId,
      newPlanId: data.newPlanId,
      newStatus: data.newStatus,
      effectiveDate: data.effectiveDate,
      expiresAt: data.expiresAt,
      extendDays: data.extendDays,
      scheduleDowngrade: data.scheduleDowngrade,
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
