import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminUsers, setUserAccountStatus } from '@/lib/adminDb';
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
    const role = searchParams.get('role') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminUsers({
      search,
      role,
      status,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const userStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['active', 'suspended']),
  reason: z.string().min(3, 'A clear reason is required for status change'),
});

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = userStatusSchema.parse(body);

    const result = await setUserAccountStatus({
      userId: data.userId,
      newStatus: data.status,
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin users POST status error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
