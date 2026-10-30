import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, updateBusiness, checkBusinessModuleAccess } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { validateGstin } from '@/lib/gstCalculator';
import { hasActiveGoldAccess } from '@/lib/subscriptionLimits';
import { GstInvoiceSettings } from '@/types';
import { z } from 'zod';

const gstSettingsSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  isGstRegistered: z.boolean(),
  gstin: z.string().optional().or(z.literal('')),
  legalBusinessName: z.string().optional().or(z.literal('')),
  registeredAddress: z.string().optional().or(z.literal('')),
  defaultGstRate: z.number().min(0).max(28).default(0),
  pricesIncludeGst: z.boolean().default(false),
  invoicePrefix: z.string().optional().default('INV-'),
  invoiceNotes: z.string().optional().or(z.literal('')),
  hsnCodeDefault: z.string().optional().or(z.literal('')),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Check Gold Plan entitlement server-side
    const isGoldPlan = hasActiveGoldAccess(business);

    // Resolve current GST settings
    const gstSettings: GstInvoiceSettings = business.settings.gst || {
      isGstRegistered: Boolean(business.settings.orderSettings.enableGst && business.settings.orderSettings.gstin),
      gstin: business.settings.orderSettings.gstin || '',
      legalBusinessName: business.name || '',
      registeredAddress: business.address || '',
      defaultGstRate: business.settings.orderSettings.taxRatePercentage || 0,
      pricesIncludeGst: false,
      invoicePrefix: 'INV-',
      invoiceNotes: 'Thank you for your business.',
      hsnCodeDefault: '',
    };

    return NextResponse.json({
      success: true,
      isGoldPlan,
      currentPlan: business.subscription,
      gstSettings,
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
    const data = gstSettingsSchema.parse(body);

    const isAuth = await isUserAuthorizedForBusiness(user, data.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage GST settings for this business' },
        { status: 403 }
      );
    }

    const business = await getBusinessById(data.businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Server-side subscription check: Must be on active Gold plan
    const isGoldPlan = hasActiveGoldAccess(business);

    if (!isGoldPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'GST configuration and Tax Invoices require an active Gold subscription plan (₹149/mo). Please upgrade to access tax configuration.',
          code: 'GOLD_PLAN_REQUIRED',
        },
        { status: 403 }
      );
    }

    // Format validation for GSTIN if registered
    if (data.isGstRegistered && data.gstin && data.gstin.trim()) {
      const gstinVal = validateGstin(data.gstin);
      if (!gstinVal.isValid) {
        return NextResponse.json({ success: false, error: gstinVal.error }, { status: 400 });
      }
    }

    const cleanGstSettings: GstInvoiceSettings = {
      isGstRegistered: data.isGstRegistered,
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : undefined,
      legalBusinessName: data.legalBusinessName ? data.legalBusinessName.trim() : business.name,
      registeredAddress: data.registeredAddress ? data.registeredAddress.trim() : business.address,
      defaultGstRate: Number(data.defaultGstRate) || 0,
      pricesIncludeGst: Boolean(data.pricesIncludeGst),
      invoicePrefix: (data.invoicePrefix || 'INV-').trim().toUpperCase(),
      invoiceNotes: data.invoiceNotes ? data.invoiceNotes.trim() : undefined,
      hsnCodeDefault: data.hsnCodeDefault ? data.hsnCodeDefault.trim() : undefined,
    };

    // Update settings in database and keep orderSettings synchronized
    const updatedSettings = {
      ...business.settings,
      gst: cleanGstSettings,
      orderSettings: {
        ...business.settings.orderSettings,
        enableGst: cleanGstSettings.isGstRegistered,
        gstin: cleanGstSettings.gstin,
        taxRatePercentage: cleanGstSettings.defaultGstRate,
      },
    };

    await updateBusiness(data.businessId, { settings: updatedSettings as any });

    return NextResponse.json({
      success: true,
      message: 'GST & Invoice settings saved successfully',
      gstSettings: cleanGstSettings,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
