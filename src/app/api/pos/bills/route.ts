import { NextRequest, NextResponse } from 'next/server';
import { createPosBill, getPosBills, getBusinessById } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { CreatePosBillInput } from '@/types';

// Helper to authenticate user for business
async function checkAuth(req: NextRequest, businessId: string) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return { authorized: false, status: 401, error: 'Unauthorized: Please log in.' };
  }
  const isAuth = await isUserAuthorizedForBusiness(user, businessId);
  if (!isAuth) {
    return { authorized: false, status: 403, error: 'Forbidden: Access denied for this business.' };
  }
  return { authorized: true, user };
}

// GET /api/pos/bills?businessId=...&limit=50&offset=0&search=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId query parameter is required.' },
        { status: 400 }
      );
    }

    const auth = await checkAuth(req, businessId);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const result = await getPosBills(businessId, {
      limit,
      offset,
      search,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      bills: result.bills,
      totalCount: result.totalCount,
    });
  } catch (error: any) {
    console.error('GET /api/pos/bills error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch POS bills.' },
      { status: 500 }
    );
  }
}

// POST /api/pos/bills
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, items, customerName, customerPhone, discountType, discountValue, taxRate, paymentMethod, notes } = body;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required.' },
        { status: 400 }
      );
    }

    const auth = await checkAuth(req, businessId);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // 1. Verify business & active subscription entitlement (Included in Basic, Gold, Diamond)
    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found.' },
        { status: 404 }
      );
    }

    const sub = business.subscription;
    const nowMs = Date.now();
    const renewsAtMs = sub?.renewsAt ? new Date(sub.renewsAt).getTime() : null;
    const isExpired =
      (renewsAtMs && nowMs > renewsAtMs) ||
      sub?.status === 'expired' ||
      sub?.status === 'suspended';

    if (isExpired) {
      return NextResponse.json(
        {
          success: false,
          error: 'SUBSCRIPTION_EXPIRED',
          message: 'Your business subscription has expired. Please renew your plan to create counter bills.',
        },
        { status: 403 }
      );
    }

    // 2. Validate line items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one product to generate a bill.' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productName || typeof item.productName !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid product item in request.' },
          { status: 400 }
        );
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return NextResponse.json(
          { success: false, error: `Invalid price for item "${item.productName}".` },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { success: false, error: `Invalid quantity for item "${item.productName}". Quantity must be a positive integer.` },
          { status: 400 }
        );
      }
    }

    // 3. Create POS Bill
    const input: CreatePosBillInput = {
      businessId,
      customerName: typeof customerName === 'string' ? customerName : undefined,
      customerPhone: typeof customerPhone === 'string' ? customerPhone : undefined,
      items: items.map((i: any) => ({
        productId: i.productId || undefined,
        productName: String(i.productName),
        variantId: i.variantId || undefined,
        variantName: i.variantName || undefined,
        size: i.size || undefined,
        unit: i.unit || undefined,
        unitPrice: Number(i.unitPrice),
        quantity: Number(i.quantity),
      })),
      discountType: discountType === 'percentage' ? 'percentage' : 'fixed',
      discountValue: typeof discountValue === 'number' && discountValue >= 0 ? discountValue : 0,
      taxRate: typeof taxRate === 'number' && taxRate >= 0 ? taxRate : undefined,
      paymentMethod: ['cash', 'upi', 'card'].includes(paymentMethod) ? paymentMethod : 'cash',
      notes: typeof notes === 'string' ? notes : undefined,
      createdBy: auth.user?.name || auth.user?.email || 'Counter Staff',
    };

    const bill = await createPosBill(input);

    return NextResponse.json({
      success: true,
      message: `Bill #${bill.billNumber} created successfully.`,
      bill,
    });
  } catch (error: any) {
    console.error('POST /api/pos/bills error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create POS bill.' },
      { status: 400 }
    );
  }
}
