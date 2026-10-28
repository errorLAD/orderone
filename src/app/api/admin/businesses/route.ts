import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminBusinesses, setBusinessAccountStatus } from '@/lib/adminDb';
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
    const category = searchParams.get('category') || undefined;
    const planId = searchParams.get('planId') || undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminBusinesses({
      search,
      category,
      planId,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin businesses GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const statusUpdateSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  status: z.enum(['active', 'suspended']),
  reason: z.string().min(3, 'A clear reason is required for suspension or reactivation'),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = statusUpdateSchema.parse(body);

    const result = await setBusinessAccountStatus({
      businessId: data.businessId,
      newStatus: data.status,
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin businesses POST status error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
