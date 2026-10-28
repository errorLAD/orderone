import { NextRequest, NextResponse } from 'next/server';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { SubscriptionLimitError } from '@/lib/subscriptionLimits';
import { OrderSourceType } from '@/types';

// Helper to verify business ownership
async function verifyBusinessOwnership(req: NextRequest, businessId: string): Promise<{ authorized: boolean; error?: string; status?: number }> {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return { authorized: false, error: 'Unauthorized: Please log in to manage products.', status: 401 };
  }
  const isAuth = await isUserAuthorizedForBusiness(user, businessId);
  if (!isAuth) {
    return { authorized: false, error: 'Forbidden: You do not have permission to manage products for this business.', status: 403 };
  }
  return { authorized: true };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const sourceType = searchParams.get('sourceType') as OrderSourceType | null;
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search')?.toLowerCase().trim();
    const stockStatus = searchParams.get('stockStatus'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    let products = await getProducts(businessId, sourceType || undefined, categoryId);

    // Apply search filter
    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.sku && p.sku.toLowerCase().includes(search)) ||
          (p.brand && p.brand.toLowerCase().includes(search)) ||
          (p.description && p.description.toLowerCase().includes(search))
      );
    }

    // Apply stock status filter
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock') {
        products = products.filter((p) => !p.isAvailable || (p.stockQuantity !== undefined && p.stockQuantity <= 0));
      } else if (stockStatus === 'low_stock') {
        products = products.filter(
          (p) =>
            p.isAvailable &&
            p.stockQuantity !== undefined &&
            p.stockQuantity > 0 &&
            p.stockQuantity <= (p.lowStockThreshold || 5)
        );
      } else if (stockStatus === 'in_stock') {
        products = products.filter(
          (p) =>
            p.isAvailable &&
            (p.stockQuantity === undefined || p.stockQuantity > (p.lowStockThreshold || 5))
        );
      }
    }

    const total = products.length;

    // Apply pagination if limit is specified
    if (limit && limit > 0) {
      const startIndex = (page - 1) * limit;
      products = products.slice(startIndex, startIndex + limit);
      return NextResponse.json({
        success: true,
        count: products.length,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        products,
      });
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      total,
      products,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    const authCheck = await verifyBusinessOwnership(req, body.businessId);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status || 403 });
    }

    const product = await createProduct(body);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (error instanceof SubscriptionLimitError || error.name === 'SubscriptionLimitError') {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          requiresUpgrade: error.requiresUpgrade,
          limitType: error.limitType,
          currentCount: error.currentCount,
          maxLimit: error.maxLimit,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product id is required' }, { status: 400 });
    }

    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const authCheck = await verifyBusinessOwnership(req, existing.businessId);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status || 403 });
    }

    const product = await updateProduct(id, updates);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product id is required' }, { status: 400 });
    }

    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const authCheck = await verifyBusinessOwnership(req, existing.businessId);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status || 403 });
    }

    const success = await deleteProduct(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
