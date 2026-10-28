import { NextRequest, NextResponse } from 'next/server';
import { getQueueTokens, updateQueueTokenStatus } from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { OrderSourceType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const sourceType = searchParams.get('sourceType') as OrderSourceType | null;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const tokens = await getQueueTokens(businessId, sourceType || undefined);

    // Group for public TV display: Preparing vs Ready
    const preparing = tokens.filter((t) => t.status === 'waiting');
    const ready = tokens.filter((t) => t.status === 'called');

    return NextResponse.json({
      success: true,
      tokens,
      display: {
        preparing,
        ready,
      },
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
    const { tokenId, status, counterNumber } = body;

    if (!tokenId || !status) {
      return NextResponse.json(
        { success: false, error: 'tokenId and status are required' },
        { status: 400 }
      );
    }

    const updated = await updateQueueTokenStatus(tokenId, status, counterNumber);

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, token: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
