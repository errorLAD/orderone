import { NextRequest, NextResponse } from 'next/server';
import { getPosBillById } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const billId = params.id;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId query parameter is required.' },
        { status: 400 }
      );
    }

    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in.' },
        { status: 401 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied for this business.' },
        { status: 403 }
      );
    }

    const bill = await getPosBillById(businessId, billId);
    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'POS Bill not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bill,
    });
  } catch (error: any) {
    console.error('GET /api/pos/bills/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bill details.' },
      { status: 500 }
    );
  }
}
