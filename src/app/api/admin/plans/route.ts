import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminPlans, updateAdminPlan } from '@/lib/adminDb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const plans = await getAdminPlans();
    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    console.error('Admin plans GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const updatePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  priceMonthly: z.number().min(0, 'Monthly price must be non-negative').optional(),
  priceAnnual: z.number().min(0, 'Annual price must be non-negative').optional(),
  maxProducts: z.number().min(1, 'Max products must be at least 1').optional(),
  maxCategories: z.number().min(1, 'Max categories must be at least 1').optional(),
  description: z.string().optional(),
  isVisible: z.boolean().optional(),
  allowsStore: z.boolean().optional(),
  customUpi: z.boolean().optional(),
  reason: z.string().min(3, 'A clear administrative reason is required for plan modifications'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    await updateAdminPlan({
      planId: data.planId,
      updates: {
        priceMonthly: data.priceMonthly,
        priceAnnual: data.priceAnnual,
        maxProducts: data.maxProducts,
        maxCategories: data.maxCategories,
        description: data.description,
        isVisible: data.isVisible,
        allowsStore: data.allowsStore,
        customUpi: data.customUpi,
      },
      reason: data.reason,
      adminUser: auth.user,
    });

    const updatedPlans = await getAdminPlans();
    return NextResponse.json({ success: true, plans: updatedPlans });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin plans PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
