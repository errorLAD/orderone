import { NextRequest, NextResponse } from 'next/server';
import { getAllBusinesses, getBusinessById, getBusinessBySlug, createBusiness, updateBusiness } from '@/lib/db';
import { getCurrentUserFromRequest, getUserAuthorizedBusinesses, isUserAuthorizedForBusiness } from '@/lib/auth';
import { getCategoryConfig } from '@/lib/categories';
import { pgQuery } from '@/lib/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (id) {
      const biz = await getBusinessById(id);
      if (!biz) return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
      return NextResponse.json({ success: true, business: biz });
    }

    if (slug) {
      const biz = await getBusinessBySlug(slug);
      if (!biz) return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
      return NextResponse.json({ success: true, business: biz });
    }

    // Unrestricted business list requires authentication and returns ONLY user-authorized businesses
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view businesses', businesses: [] },
        { status: 401 }
      );
    }

    if (currentUser.role === 'admin') {
      const businesses = await getAllBusinesses();
      return NextResponse.json({ success: true, businesses });
    }

    const businesses = await getUserAuthorizedBusinesses(currentUser);
    return NextResponse.json({ success: true, businesses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const bizName = (body.name || '').trim();
    const category = body.type || 'hardware';

    if (!bizName) {
      return NextResponse.json({ success: false, error: 'Business name is required' }, { status: 400 });
    }

    const config = getCategoryConfig(category);
    const isFood = config.primaryModule === 'menu';

    // Generate unique slug
    let baseSlug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'store';
    const slugCheck = await pgQuery(`SELECT id FROM public.businesses WHERE slug = $1`, [baseSlug]);
    const finalSlug = slugCheck.rows.length > 0 ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}` : baseSlug;

    const businessSettings = {
      modules: {
        menu: isFood,
        store: !isFood,
      },
      orderSettings: {
        minStoreOrder: 50,
        enableGst: false,
        taxRatePercentage: 0,
        currencySymbol: '₹',
        currencyCode: 'INR',
        enableDelivery: true,
        deliveryFee: 30,
        enableTakeaway: true,
        enableDineIn: isFood,
        autoAcceptOrders: false,
      },
      tokenPrefixStore: 'S-',
      tokenPrefixMenu: 'M-',
      operatingHours: '09:00 AM - 09:00 PM (Daily)',
      onboardingCompleted: false,
    };

    const businessSubscription = {
      planId: 'plan_basic',
      status: 'active' as const,
      billingCycle: 'monthly' as const,
      renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      amount: 20,
    };

    const newBiz = await createBusiness({
      name: bizName,
      slug: finalSlug,
      type: category,
      description: body.description || `${bizName} - ${config.label}`,
      email: body.email || currentUser.email,
      phone: body.phone || '+91 98765 43210',
      address: body.address || 'India',
      settings: businessSettings,
      subscription: businessSubscription,
      isStoreOpen: true,
      onlineOrderingEnabled: true,
      ownerId: currentUser.id,
    });

    // Link user to this new business if user had no business_id
    if (!currentUser.businessId) {
      await pgQuery(`UPDATE public.users SET business_id = $1 WHERE id = $2`, [newBiz.id, currentUser.id]);
    }

    return NextResponse.json({ success: true, business: newBiz });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 });
    }

    // Security check: Only authorized owner or platform admin can modify their business profile
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const isAuthorized = await isUserAuthorizedForBusiness(currentUser, id);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You can only modify your own business profile' },
        { status: 403 }
      );
    }

    // Validation
    if (updates.name !== undefined && !updates.name.trim()) {
      return NextResponse.json({ success: false, error: 'Business name cannot be empty' }, { status: 400 });
    }
    if (updates.email !== undefined && updates.email.trim() && !updates.email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid contact email format' }, { status: 400 });
    }
    if (updates.phone !== undefined && updates.phone.trim() && updates.phone.trim().length < 7) {
      return NextResponse.json({ success: false, error: 'Phone number must be at least 7 digits' }, { status: 400 });
    }

    const updated = await updateBusiness(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
