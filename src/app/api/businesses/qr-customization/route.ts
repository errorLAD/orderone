import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, updateBusiness } from '@/lib/db';
import { pgQuery } from '@/lib/postgres';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { hasActiveGoldAccess } from '@/lib/subscriptionLimits';
import { QrCustomizationSettings, QrDotStyle, QrEyeStyle, QrFrameStyle } from '@/types';
import { DEFAULT_QR_CUSTOMIZATION, isValidHexColor } from '@/lib/qrPresets';

export const dynamic = 'force-dynamic';

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

    // Try fetching from public.business_qr_customizations table
    let customization: QrCustomizationSettings = DEFAULT_QR_CUSTOMIZATION;
    try {
      const res = await pgQuery(
        `SELECT * FROM public.business_qr_customizations WHERE business_id = $1 LIMIT 1;`,
        [businessId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        customization = {
          templateId: row.template_id || 'modern_indigo',
          foregroundColor: row.foreground_color || '#4F46E5',
          backgroundColor: row.background_color || '#FFFFFF',
          eyeColor: row.eye_color || '#312E81',
          dotStyle: row.dot_style || 'rounded',
          eyeStyle: row.eye_style || 'rounded',
          frameStyle: row.frame_style || 'bottom_banner',
          frameText: row.frame_text || 'SCAN TO ORDER',
          frameColor: row.frame_color || '#4F46E5',
          showLogo: row.show_logo === true,
          customLogoUrl: row.custom_logo_url || undefined,
          centerBadgeType: row.center_badge_type || 'logo',
          centerBadgeText: row.center_badge_text || undefined,
          showBusinessName: row.show_business_name !== false,
          headerTitle: row.header_title || business.settings?.qrCustomization?.headerTitle || undefined,
          showHeaderTitle: row.show_header_title !== false,
          headerSubtitle: row.header_subtitle || business.settings?.qrCustomization?.headerSubtitle || 'DIGITAL STOREFRONT & MENU',
          showHeaderLogo: row.show_header_logo === true,
          headerLogoUrl: row.header_logo_url || business.settings?.qrCustomization?.headerLogoUrl || undefined,
          headerLogoScale: business.settings?.qrCustomization?.headerLogoScale ?? 100,
          showHeaderLogoBackground: business.settings?.qrCustomization?.showHeaderLogoBackground === true,
          updatedAt: row.updated_at,
        };
      } else if (business.settings?.qrCustomization) {
        customization = business.settings.qrCustomization;
      }
    } catch (pgErr) {
      console.error('Error fetching business_qr_customizations:', pgErr);
      if (business.settings?.qrCustomization) {
        customization = business.settings.qrCustomization;
      }
    }

    return NextResponse.json({
      success: true,
      isGold,
      isGoldPlan: isGold,
      planId,
      customization,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const {
      businessId,
      templateId,
      foregroundColor,
      backgroundColor,
      eyeColor,
      dotStyle,
      eyeStyle,
      frameStyle,
      frameText,
      frameColor,
      showLogo,
      customLogoUrl,
      centerBadgeType,
      centerBadgeText,
      showBusinessName,
      headerTitle,
      showHeaderTitle,
      headerSubtitle,
      showHeaderLogo,
      headerLogoUrl,
      headerLogoScale,
      showHeaderLogoBackground,
    } = body;

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

    // STRICT SERVER-SIDE ENFORCEMENT: Gold Plan Requirement
    const isGold = hasActiveGoldAccess(business);
    if (!isGold) {
      return NextResponse.json(
        {
          success: false,
          error:
            'QR Code Customization is an exclusive Gold Plan feature. Please upgrade your subscription to customize and save your storefront QR design.',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Validations
    const validDotStyles: QrDotStyle[] = ['square', 'rounded', 'dots', 'diamond', 'classy'];
    const chosenDotStyle: QrDotStyle = validDotStyles.includes(dotStyle) ? dotStyle : 'rounded';

    const validEyeStyles: QrEyeStyle[] = ['square', 'rounded', 'circle', 'leaf'];
    const chosenEyeStyle: QrEyeStyle = validEyeStyles.includes(eyeStyle) ? eyeStyle : 'rounded';

    const validFrameStyles: QrFrameStyle[] = [
      'none',
      'simple_border',
      'top_banner',
      'bottom_banner',
      'card',
      'badge',
    ];
    const chosenFrameStyle: QrFrameStyle = validFrameStyles.includes(frameStyle)
      ? frameStyle
      : 'bottom_banner';

    const cleanForeground = isValidHexColor(foregroundColor)
      ? foregroundColor.trim()
      : DEFAULT_QR_CUSTOMIZATION.foregroundColor;

    const cleanBackground = isValidHexColor(backgroundColor)
      ? backgroundColor.trim()
      : DEFAULT_QR_CUSTOMIZATION.backgroundColor;

    const cleanEyeColor = isValidHexColor(eyeColor)
      ? eyeColor.trim()
      : cleanForeground;

    const cleanFrameColor = isValidHexColor(frameColor)
      ? frameColor.trim()
      : cleanForeground;

    const cleanFrameText =
      typeof frameText === 'string' && frameText.trim().length > 0
        ? frameText.trim().slice(0, 50)
        : 'SCAN TO ORDER';

    const cleanShowLogo = showLogo === true;
    const cleanCenterBadgeType = ['logo', 'table_room', 'both'].includes(centerBadgeType)
      ? centerBadgeType
      : 'logo';
    const cleanCenterBadgeText =
      typeof centerBadgeText === 'string' && centerBadgeText.trim().length > 0
        ? centerBadgeText.trim().slice(0, 30)
        : undefined;

    const cleanShowBusinessName = showBusinessName !== false;
    const cleanShowHeaderTitle = showHeaderTitle !== false;
    const cleanHeaderTitle =
      typeof headerTitle === 'string' && headerTitle.trim().length > 0
        ? headerTitle.trim().slice(0, 50)
        : undefined;
    const cleanHeaderSubtitle =
      typeof headerSubtitle === 'string' && headerSubtitle.trim().length > 0
        ? headerSubtitle.trim().slice(0, 60)
        : 'DIGITAL STOREFRONT & MENU';
    const cleanShowHeaderLogo = showHeaderLogo === true;
    const parsedHeaderLogoScale = Number(headerLogoScale);
    const cleanHeaderLogoScale = Number.isFinite(parsedHeaderLogoScale)
      ? Math.min(250, Math.max(50, Math.round(parsedHeaderLogoScale)))
      : 100;
    const cleanHeaderLogoUrl =
      typeof headerLogoUrl === 'string' && headerLogoUrl.trim().length > 0
        ? headerLogoUrl.trim()
        : undefined;
    const cleanCustomLogoUrl =
      typeof customLogoUrl === 'string' && customLogoUrl.trim().length > 0
        ? customLogoUrl.trim()
        : undefined;

    const now = new Date().toISOString();

    const updatedCustomization: QrCustomizationSettings = {
      templateId: typeof templateId === 'string' ? templateId.trim() : 'custom',
      foregroundColor: cleanForeground,
      backgroundColor: cleanBackground,
      eyeColor: cleanEyeColor,
      dotStyle: chosenDotStyle,
      eyeStyle: chosenEyeStyle,
      frameStyle: chosenFrameStyle,
      frameText: cleanFrameText,
      frameColor: cleanFrameColor,
      showLogo: cleanShowLogo,
      customLogoUrl: cleanCustomLogoUrl,
      centerBadgeType: cleanCenterBadgeType,
      centerBadgeText: cleanCenterBadgeText,
      showBusinessName: cleanShowBusinessName,
      headerTitle: cleanHeaderTitle,
      showHeaderTitle: cleanShowHeaderTitle,
      headerSubtitle: cleanHeaderSubtitle,
      showHeaderLogo: cleanShowHeaderLogo,
      headerLogoUrl: cleanHeaderLogoUrl,
      headerLogoScale: cleanHeaderLogoScale,
      showHeaderLogoBackground: showHeaderLogoBackground === true,
      updatedAt: now,
    };

    // 1. Upsert into public.business_qr_customizations table in Supabase
    try {
      await pgQuery(
        `INSERT INTO public.business_qr_customizations (
          business_id, template_id, foreground_color, background_color, eye_color,
          dot_style, eye_style, frame_style, frame_text, frame_color,
          show_logo, custom_logo_url, center_badge_type, center_badge_text,
          show_business_name, header_title, show_header_title, header_subtitle,
          show_header_logo, header_logo_url, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, NOW()
        )
        ON CONFLICT (business_id) DO UPDATE SET
          template_id = EXCLUDED.template_id,
          foreground_color = EXCLUDED.foreground_color,
          background_color = EXCLUDED.background_color,
          eye_color = EXCLUDED.eye_color,
          dot_style = EXCLUDED.dot_style,
          eye_style = EXCLUDED.eye_style,
          frame_style = EXCLUDED.frame_style,
          frame_text = EXCLUDED.frame_text,
          frame_color = EXCLUDED.frame_color,
          show_logo = EXCLUDED.show_logo,
          custom_logo_url = EXCLUDED.custom_logo_url,
          center_badge_type = EXCLUDED.center_badge_type,
          center_badge_text = EXCLUDED.center_badge_text,
          show_business_name = EXCLUDED.show_business_name,
          header_title = EXCLUDED.header_title,
          show_header_title = EXCLUDED.show_header_title,
          header_subtitle = EXCLUDED.header_subtitle,
          show_header_logo = EXCLUDED.show_header_logo,
          header_logo_url = EXCLUDED.header_logo_url,
          updated_at = NOW();`,
        [
          business.id,
          updatedCustomization.templateId,
          updatedCustomization.foregroundColor,
          updatedCustomization.backgroundColor,
          updatedCustomization.eyeColor,
          updatedCustomization.dotStyle,
          updatedCustomization.eyeStyle,
          updatedCustomization.frameStyle,
          updatedCustomization.frameText,
          updatedCustomization.frameColor,
          updatedCustomization.showLogo,
          updatedCustomization.customLogoUrl || null,
          updatedCustomization.centerBadgeType,
          updatedCustomization.centerBadgeText || null,
          updatedCustomization.showBusinessName,
          updatedCustomization.headerTitle || null,
          updatedCustomization.showHeaderTitle,
          updatedCustomization.headerSubtitle,
          updatedCustomization.showHeaderLogo,
          updatedCustomization.headerLogoUrl || null,
        ]
      );
    } catch (pgErr) {
      console.error('Failed to upsert business_qr_customizations in PG:', pgErr);
    }

    // 2. Also deep-merge into business.settings.qrCustomization for instant caching
    await updateBusiness(business.id, {
      settings: {
        ...business.settings,
        qrCustomization: updatedCustomization,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'QR Code Customization saved successfully',
      customization: updatedCustomization,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
