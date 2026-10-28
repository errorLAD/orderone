import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminOrders, updateAdminOrder, cancelAdminOrder } from '@/lib/adminDb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const sourceType = (searchParams.get('sourceType') === 'menu' ? 'menu' : 'store') as 'store' | 'menu';
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const businessId = searchParams.get('businessId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminOrders({
      sourceType,
      search,
      status,
      businessId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin orders GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const updateOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderStatus: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().min(3, 'A clear documented reason is required to update this order'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = updateOrderSchema.parse(body);

    const result = await updateAdminOrder({
      orderId: data.orderId,
      updates: {
        orderStatus: data.orderStatus,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        notes: data.notes,
      },
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin orders PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const cancelOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  reason: z.string().min(3, 'A documented reason is required to cancel this order'),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = cancelOrderSchema.parse(body);

    // Cancel order instead of permanently destroying audit history
    const result = await cancelAdminOrder({
      orderId: data.orderId,
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin orders DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
