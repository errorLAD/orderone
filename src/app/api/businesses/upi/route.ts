import { NextRequest, NextResponse } from 'next/server';
import { getBusinessUpiSettings, saveBusinessUpiSettings, checkBusinessModuleAccess, getBusinessById } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { hasActiveGoldAccess } from '@/lib/subscriptionLimits';
import { z } from 'zod';

const upiSettingsSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  upiId: z.string().min(3, 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank)'),
  payeeName: z.string().min(2, 'Please enter Payee or Business display name'),
  qrImageUrl: z.string().optional(),
  instructions: z.string().optional(),
  storeUrl: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 });
    }

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const access = await checkBusinessModuleAccess(businessId, 'store');
    const isGoldPlan = Boolean(access.plan?.customUpi && access.plan?.allowsStore);

    const upiSettings = await getBusinessUpiSettings(businessId);

    const host = req.headers.get('host') || 'orderone.in';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const defaultStoreUrl = `${protocol}://${host}/store/${business.slug}`;

    return NextResponse.json({
      success: true,
      isGoldPlan,
      currentPlan: access.plan,
      defaultStoreUrl,
      upiSettings: upiSettings
        ? {
            ...upiSettings,
            storeUrl: upiSettings.storeUrl || defaultStoreUrl,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const data = upiSettingsSchema.parse(body);

    const isAuth = await isUserAuthorizedForBusiness(user, data.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage UPI settings for this business' },
        { status: 403 }
      );
    }

    // Verify active Gold plan entitlements
    const business = await getBusinessById(data.businessId);
    if (!business || !hasActiveGoldAccess(business)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Custom UPI payment configuration requires the Gold subscription plan (₹149/mo). Please upgrade your subscription to enable custom UPI payments.',
          code: 'GOLD_PLAN_REQUIRED',
        },
        { status: 403 }
      );
    }

    const saved = await saveBusinessUpiSettings(data.businessId, {
      upiId: data.upiId,
      payeeName: data.payeeName,
      qrImageUrl: data.qrImageUrl,
      instructions: data.instructions,
      storeUrl: data.storeUrl,
      isEnabled: data.isEnabled,
    });

    return NextResponse.json({
      success: true,
      message: 'UPI payment settings saved successfully',
      upiSettings: saved,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
