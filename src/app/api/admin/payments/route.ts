import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { 
  getAdminPayments, 
  processPaymentRefund, 
  updateAdminPayment 
} from '@/lib/adminDb';
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
    const status = searchParams.get('status') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminPayments({
      search,
      status,
      provider,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin payments GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(3, 'A clear documented reason is required to process a refund'),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = refundSchema.parse(body);

    const result = await processPaymentRefund({
      paymentId: data.paymentId,
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin payments POST refund error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const updatePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  status: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().min(3, 'A documented reason is required to update payment record'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = updatePaymentSchema.parse(body);

    const result = await updateAdminPayment({
      paymentId: data.paymentId,
      updates: {
        status: data.status,
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
    console.error('Admin payments PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const cancelPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(3, 'A documented reason is required to cancel/void transaction'),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = cancelPaymentSchema.parse(body);

    // Per specifications: archive or cancel instead of permanent deletion
    const result = await updateAdminPayment({
      paymentId: data.paymentId,
      updates: {
        status: 'cancelled',
        notes: `Cancelled by Admin (${auth.user.name}): ${data.reason}`,
      },
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin payments DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
