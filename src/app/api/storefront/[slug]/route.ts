import { NextRequest, NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/db';
import { pgQuery, mapRowToCategory, mapRowToProduct } from '@/lib/postgres';
import { getBusinessStoreEntitlement, getBusinessMenuEntitlement } from '@/lib/subscriptionLimits';

/**
 * GET /api/storefront/[slug]
 *
 * Unified public storefront data endpoint.
 * Returns business + categories + products in a SINGLE round-trip.
 * Replaces the three separate API calls previously made by client pages.
 *
 * Cache strategy:
 *   - CDN / Vercel Edge: s-maxage=30 (serve stale for 30 s)
 *   - SWR extension: 120 s (refresh in background while revalidating)
 *   - No authentication required — public read-only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'slug is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    // sourceType is 'store' | 'menu' — no 'both' in type system; use null to skip filter
    const sourceType = searchParams.get('sourceType') as string | null; // e.g. 'menu' or 'store'
    const channel = searchParams.get('channel') || 'storefront';        // e.g. 'storefront'

    // 1. Fetch business
    const biz = await getBusinessBySlug(slug);
    if (!biz) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // 2. Fetch categories + products + entitlements in parallel (single DB round-trip set)
    const [catRows, prodRows, storeEntitlement, menuEntitlement] = await Promise.all([
      pgQuery(
        `SELECT * FROM public.categories
         WHERE business_id = $1
           AND ($2::text IS NULL OR source_type = $2 OR source_type = 'both')
           AND ($3::text IS NULL OR sales_channel = $3 OR sales_channel = 'both' OR sales_channel IS NULL)
           AND is_active != false
         ORDER BY sort_order ASC, created_at ASC`,
        [biz.id, sourceType ?? null, channel]
      ),
      pgQuery(
        `SELECT * FROM public.products
         WHERE business_id = $1
           AND ($2::text IS NULL OR source_type = $2 OR source_type = 'both')
           AND ($3::text IS NULL OR sales_channel = $3 OR sales_channel = 'both' OR sales_channel IS NULL)
           AND is_available != false
         ORDER BY sort_order ASC, created_at ASC`,
        [biz.id, sourceType ?? null, channel]
      ),
      getBusinessStoreEntitlement(biz),
      getBusinessMenuEntitlement(biz),
    ]);

    const categories = catRows.rows.map(mapRowToCategory);
    const products = prodRows.rows.map(mapRowToProduct);

    const enrichedBiz = { ...biz, storeEntitlement, menuEntitlement };

    const response = NextResponse.json({
      success: true,
      business: enrichedBiz,
      categories,
      products,
    });

    // Cache at CDN for 30 s; serve stale for up to 2 min while revalidating
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

    return response;
  } catch (error: any) {
    console.error('[storefront API] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
