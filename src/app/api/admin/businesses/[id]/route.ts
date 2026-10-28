import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { 
  getAdminBusinessDetail, 
  setBusinessAccountStatus, 
  updateAdminBusiness, 
  deleteAdminBusiness 
} from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const detail = await getAdminBusinessDetail(params.id);
    if (!detail) {
      return NextResponse.json({ success: false, error: 'Business record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...detail });
  } catch (err: any) {
    console.error('Admin business detail GET error:', err);
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
    const { action, status, updates, reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'A clear documented reason is required.' }, { status: 400 });
    }

    // 1. Status transition (suspend / reactivate)
    if (status && (status === 'active' || status === 'suspended')) {
      const result = await setBusinessAccountStatus({
        businessId: params.id,
        newStatus: status,
        reason: reason.trim(),
        adminUser: auth.user,
      });

      return NextResponse.json(result);
    }

    // 2. Profile / Configuration updates
    if (action === 'update_profile' || updates) {
      const payload = updates || body;
      const result = await updateAdminBusiness({
        businessId: params.id,
        updates: {
          name: payload.name,
          slug: payload.slug,
          type: payload.type,
          description: payload.description,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          isStoreOpen: payload.isStoreOpen,
          onlineOrderingEnabled: payload.onlineOrderingEnabled,
          settings: payload.settings,
        },
        reason: reason.trim(),
        adminUser: auth.user,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'No valid action or update payload provided' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin business PATCH error:', err);
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
      return NextResponse.json({ success: false, error: 'A documented reason is required for deletion.' }, { status: 400 });
    }

    const result = await deleteAdminBusiness({
      businessId: params.id,
      reason: reason.trim(),
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Admin business DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
