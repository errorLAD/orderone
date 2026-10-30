import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, updateBusiness } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { hasActiveGoldAccess } from '@/lib/subscriptionLimits';
import { StorefrontDesignSettings, StorefrontTemplateId, StorefrontColors } from '@/types';
import {
  DEFAULT_STOREFRONT_COLORS,
  DEFAULT_DESIGN_SETTINGS as DEFAULT_STOREFRONT_DESIGN,
} from '@/lib/designPresets';

export const dynamic = 'force-dynamic';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHexColor(color: string | undefined): boolean {
  if (!color || typeof color !== 'string') return false;
  return HEX_COLOR_REGEX.test(color.trim());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view this business' },
        { status: 403 }
      );
    }

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const planId = business.subscription?.planId || 'plan_basic';
    const isGold = hasActiveGoldAccess(business);

    const design: StorefrontDesignSettings =
      business.settings?.storefrontDesign || DEFAULT_STOREFRONT_DESIGN;

    return NextResponse.json({
      success: true,
      isGold,
      isGoldPlan: isGold,
      planId,
      design,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, templateId, colors, coverImageUrl, isPublished } = body;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to modify this business' },
        { status: 403 }
      );
    }

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // STRICT SERVER-SIDE ENFORCEMENT: Gold Plan Requirement (₹149/month)
    const planId = business.subscription?.planId || 'plan_basic';
    const isGold = hasActiveGoldAccess(business);
    if (!isGold) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Storefront Design Customization is a Gold feature (₹149/month). Please upgrade your subscription to customize and publish your storefront.',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Validate templateId
    const validTemplates: StorefrontTemplateId[] = ['classic', 'modern'];
    const chosenTemplate: StorefrontTemplateId = validTemplates.includes(templateId)
      ? templateId
      : 'classic';

    // Validate colors
    const cleanColors: StorefrontColors = {
      primary: isValidHexColor(colors?.primary) ? colors.primary.trim() : DEFAULT_STOREFRONT_COLORS.primary,
      secondary: isValidHexColor(colors?.secondary) ? colors.secondary.trim() : DEFAULT_STOREFRONT_COLORS.secondary,
      accent: isValidHexColor(colors?.accent) ? colors.accent.trim() : DEFAULT_STOREFRONT_COLORS.accent,
      background: isValidHexColor(colors?.background) ? colors.background.trim() : DEFAULT_STOREFRONT_COLORS.background,
      text: isValidHexColor(colors?.text) ? colors.text.trim() : DEFAULT_STOREFRONT_COLORS.text,
      button: isValidHexColor(colors?.button) ? colors.button.trim() : DEFAULT_STOREFRONT_COLORS.button,
    };

    const now = new Date().toISOString();
    const existingDesign = business.settings?.storefrontDesign;

    const updatedDesign: StorefrontDesignSettings = {
      templateId: chosenTemplate,
      colors: cleanColors,
      coverImageUrl: coverImageUrl && typeof coverImageUrl === 'string' ? coverImageUrl.trim() : undefined,
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? (existingDesign?.publishedAt || now) : existingDesign?.publishedAt,
      updatedAt: now,
    };

    const updatedSettings = {
      ...business.settings,
      storefrontDesign: updatedDesign,
    };

    await updateBusiness(businessId, { settings: updatedSettings as any });

    return NextResponse.json({
      success: true,
      message: isPublished
        ? 'Storefront design published successfully!'
        : 'Storefront design draft saved successfully.',
      design: updatedDesign,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
