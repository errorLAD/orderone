import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { getPlatformSettings, updatePlatformSettings } from '@/lib/adminDb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('Admin settings GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

const updateSettingsSchema = z.object({
  supportEmail: z.string().email().optional(),
  publicWebsiteUrl: z.string().optional(),
  contactPhone: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistrations: z.boolean().optional(),
  diamondPlanAvailable: z.boolean().optional(),
  supportedCategories: z.array(z.string()).optional(),
  reason: z.string().min(3, 'A clear documented reason is required to modify global platform settings'),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const data = updateSettingsSchema.parse(body);

    const result = await updatePlatformSettings({
      settings: {
        supportEmail: data.supportEmail,
        publicWebsiteUrl: data.publicWebsiteUrl,
        contactPhone: data.contactPhone,
        maintenanceMode: data.maintenanceMode,
        allowRegistrations: data.allowRegistrations,
        diamondPlanAvailable: data.diamondPlanAvailable,
        supportedCategories: data.supportedCategories,
      },
      reason: data.reason,
      adminUser: auth.user,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Admin settings PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
