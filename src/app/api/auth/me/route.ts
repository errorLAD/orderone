import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, getUserAuthorizedBusinesses } from '@/lib/auth';
import { Business } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', user: null, business: null, authorizedBusinesses: [] },
        { status: 401 }
      );
    }

    // Fetch authoritatively authorized businesses for this user only
    const authorizedBusinesses = await getUserAuthorizedBusinesses(user);

    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get('businessId');

    let business: Business | null = null;

    // 1. If explicit business requested, verify it is among authorized
    if (requestedBizId) {
      business = authorizedBusinesses.find((b) => b.id === requestedBizId) || null;
    }

    // 2. Otherwise default to user's linked businessId if authorized
    if (!business && user.businessId) {
      business = authorizedBusinesses.find((b) => b.id === user.businessId) || null;
    }

    // 3. Otherwise default to first authorized business
    if (!business && authorizedBusinesses.length > 0) {
      business = authorizedBusinesses[0];
    }

    return NextResponse.json({
      success: true,
      user,
      business,
      authorizedBusinesses,
    });
  } catch (err) {
    console.error('/api/auth/me error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', user: null, business: null, authorizedBusinesses: [] },
      { status: 500 }
    );
  }
}
