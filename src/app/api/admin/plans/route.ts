import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getAdminPlans, updateAdminPlan, getPlatformSettings, updatePlatformSettings } from '@/lib/adminDb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const [plans, platformSettings] = await Promise.all([
      getAdminPlans(),
      getPlatformSettings(),
    ]);

    return NextResponse.json({
      success: true,
      plans,
      trialSettings: platformSettings?.trial || { enabled: true, durationDays: 7, planId: 'plan_gold' },
    });
  } catch (err: any) {
    console.error('Admin plans GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const updatePlanSchema = z.object({
  planId: z.string().optional(),
  priceMonthly: z.number().min(0, 'Monthly price must be non-negative').optional(),
  priceAnnual: z.number().min(0, 'Annual price must be non-negative').optional(),
  validityDaysMonthly: z.number().int().min(1, 'Validity must be at least 1 day').optional(),
  validityDaysAnnual: z.number().int().min(1, 'Annual validity must be at least 1 day').optional(),
  maxProducts: z.number().int().min(1, 'Max products must be at least 1').optional(),
  maxCategories: z.number().int().min(1, 'Max categories must be at least 1').optional(),
  maxStaff: z.number().int().min(1, 'Max staff must be at least 1').optional(),
  features: z.array(z.string()).optional(),
  description: z.string().optional(),
  isVisible: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  allowsStore: z.boolean().optional(),
  allowsMenu: z.boolean().optional(),
  customUpi: z.boolean().optional(),
  // Free trial configuration
  trial: z
    .object({
      enabled: z.boolean(),
      durationDays: z.number().int().min(1).max(365),
      planId: z.string().min(1),
    })
    .optional(),
  reason: z.string().min(3, 'A clear administrative reason is required for modifications'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    // 1. If trial settings are being updated
    if (data.trial) {
      await updatePlatformSettings({
        settings: {
          trial: data.trial,
        },
        reason: data.reason,
        adminUser: auth.user,
      });
    }

    // 2. If a specific plan is being updated
    if (data.planId) {
      await updateAdminPlan({
        planId: data.planId,
        updates: {
          priceMonthly: data.priceMonthly,
          priceAnnual: data.priceAnnual,
          validityDaysMonthly: data.validityDaysMonthly,
          validityDaysAnnual: data.validityDaysAnnual,
          maxProducts: data.maxProducts,
          maxCategories: data.maxCategories,
          maxStaff: data.maxStaff,
          features: data.features,
          description: data.description,
          isVisible: data.isVisible,
          isPopular: data.isPopular,
          allowsStore: data.allowsStore,
          allowsMenu: data.allowsMenu,
          customUpi: data.customUpi,
        },
        reason: data.reason,
        adminUser: auth.user,
      });
    }

    const [updatedPlans, updatedPlatform] = await Promise.all([
      getAdminPlans(),
      getPlatformSettings(),
    ]);

    return NextResponse.json({
      success: true,
      plans: updatedPlans,
      trialSettings: updatedPlatform?.trial || { enabled: true, durationDays: 7, planId: 'plan_gold' },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin plans PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
