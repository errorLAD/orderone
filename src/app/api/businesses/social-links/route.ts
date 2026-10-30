import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, updateBusiness } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { BusinessSocialLinks } from '@/types';

export const dynamic = 'force-dynamic';

function validateUrl(url: string | undefined): boolean {
  if (!url || url.trim() === '') return true;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeBackendUrl(url: string | undefined): string {
  if (!url || url.trim() === '') return '';
  let trimmed = url.trim();
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.slice(1);
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

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

    const socialLinks: BusinessSocialLinks = business.settings.socialLinks || {
      googleBusiness: '',
      facebook: '',
      instagram: '',
      youtube: '',
      whatsapp: '',
      googleBusinessEnabled: false,
      facebookEnabled: false,
      instagramEnabled: false,
      youtubeEnabled: false,
      whatsappEnabled: false,
    };

    return NextResponse.json({ success: true, socialLinks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, socialLinks } = body;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    // Verify authentication & ownership
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
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

    // Normalize URLs
    const normalizedGoogle = normalizeBackendUrl(socialLinks.googleBusiness);
    const normalizedFacebook = normalizeBackendUrl(socialLinks.facebook);
    const normalizedInstagram = normalizeBackendUrl(socialLinks.instagram);
    const normalizedYoutube = normalizeBackendUrl(socialLinks.youtube);
    const normalizedWhatsapp = normalizeBackendUrl(socialLinks.whatsapp);

    // Validate URLs
    if (!validateUrl(normalizedGoogle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google Business URL. Must start with http:// or https://' },
        { status: 400 }
      );
    }
    if (!validateUrl(normalizedFacebook)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Facebook Page URL. Must start with http:// or https://' },
        { status: 400 }
      );
    }
    if (!validateUrl(normalizedInstagram)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Instagram URL. Must start with http:// or https://' },
        { status: 400 }
      );
    }
    if (!validateUrl(normalizedYoutube)) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube Channel URL. Must start with http:// or https://' },
        { status: 400 }
      );
    }
    if (!validateUrl(normalizedWhatsapp) || (normalizedWhatsapp && !/wa\.me|whatsapp\.com/i.test(normalizedWhatsapp))) {
      return NextResponse.json(
        { success: false, error: 'Invalid WhatsApp link. Use a wa.me or whatsapp.com URL.' },
        { status: 400 }
      );
    }

    const cleanSocialLinks: BusinessSocialLinks = {
      googleBusiness: normalizedGoogle,
      facebook: normalizedFacebook,
      instagram: normalizedInstagram,
      youtube: normalizedYoutube,
      whatsapp: normalizedWhatsapp,
      googleBusinessEnabled: Boolean(socialLinks.googleBusinessEnabled),
      facebookEnabled: Boolean(socialLinks.facebookEnabled),
      instagramEnabled: Boolean(socialLinks.instagramEnabled),
      youtubeEnabled: Boolean(socialLinks.youtubeEnabled),
      whatsappEnabled: Boolean(socialLinks.whatsappEnabled),
    };

    const updatedSettings = {
      ...business.settings,
      socialLinks: cleanSocialLinks,
    };

    await updateBusiness(businessId, { settings: updatedSettings });

    return NextResponse.json({
      success: true,
      message: 'Social media links updated successfully',
      socialLinks: cleanSocialLinks,
    });
  } catch (error: any) {
    console.error('Save social links error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
