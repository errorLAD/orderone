import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { SubscriptionLimitError } from '@/lib/subscriptionLimits';
import { OrderSourceType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const sourceType = searchParams.get('sourceType') as OrderSourceType | null;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const categories = await getCategories(businessId, sourceType || undefined);
    return NextResponse.json({ success: true, count: categories.length, categories });
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
    if (!body.businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, body.businessId);
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to manage categories for this business' }, { status: 403 });
    }

    const category = await createCategory(body);
    return NextResponse.json({ success: true, category });
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
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Category id is required' }, { status: 400 });
    }

    const existing = await getCategoryById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, existing.businessId);
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to edit this category' }, { status: 403 });
    }

    const category = await updateCategory(id, updates);
    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Category id is required' }, { status: 400 });
    }

    const existing = await getCategoryById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, existing.businessId);
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to delete this category' }, { status: 403 });
    }

    const success = await deleteCategory(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
