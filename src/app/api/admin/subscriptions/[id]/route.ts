import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminBusinessDetail, adjustBusinessSubscription, cancelAdminSubscription } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const detail = await getAdminBusinessDetail(params.id);
    if (!detail) {
      return NextResponse.json({ success: false, error: 'Subscription or business record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        businessId: detail.business.id,
        businessName: detail.business.name,
        businessSlug: detail.business.slug,
        ownerName: detail.business.ownerName,
        ownerEmail: detail.business.ownerEmail,
        ...detail.business.subscription,
      },
      payments: detail.payments,
      history: detail.subscriptionHistory,
    });
  } catch (err: any) {
    console.error('Admin subscription detail GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { newPlanId, newStatus, extendDays, reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'A documented reason is required.' }, { status: 400 });
    }

    const result = await adjustBusinessSubscription({
      businessId: params.id,
      newPlanId: newPlanId || 'plan_basic',
      newStatus: newStatus || 'active',
      extendDays: extendDays !== undefined ? Number(extendDays) : 0,
      reason: reason.trim(),
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Admin subscription PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'A documented reason is required to cancel this subscription.' }, { status: 400 });
    }

    // Per specifications: archive/cancel instead of permanent deletion
    const result = await cancelAdminSubscription({
      businessId: params.id,
      reason: reason.trim(),
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Admin subscription DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
