import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, getBusinessBySlug } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { pgQuery } from '@/lib/postgres';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const COOLDOWN_SECONDS = 20;

function isEligibleRestaurant(business: Awaited<ReturnType<typeof getBusinessById>>) {
  return Boolean(
    business &&
    (business.type === 'restaurant' || business.category === 'restaurant') &&
    business.settings?.orderSettings?.enableDineIn &&
    business.settings?.waiterCalls?.enabled !== false
  );
}

function publicRequest(row: Record<string, any>) {
  const { access_token_hash, cooldown_bucket, ...safeRow } = row;
  return {
    id: safeRow.id,
    businessId: safeRow.business_id,
    tableNumber: safeRow.table_number,
    status: safeRow.status,
    createdAt: safeRow.created_at,
    updatedAt: safeRow.updated_at,
    acknowledgedAt: safeRow.acknowledged_at || undefined,
    completedAt: safeRow.completed_at || undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('stream') === '1') return createWaiterStream(req, searchParams.get('businessId'));
    const requestId = searchParams.get('requestId');

    if (requestId) {
      const accessToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (!accessToken || accessToken.length > 128) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }
      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      const result = await pgQuery(
        `SELECT * FROM public.waiter_requests WHERE id = $1 AND access_token_hash = $2 LIMIT 1`,
        [requestId, tokenHash]
      );
      if (!result.rows[0]) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, request: publicRequest(result.rows[0]) });
    }

    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (!(await isUserAuthorizedForBusiness(user, businessId))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const business = await getBusinessById(businessId);
    if (!isEligibleRestaurant(business)) {
      return NextResponse.json({ success: false, error: 'Waiter calls are not enabled for this business' }, { status: 403 });
    }

    const result = await pgQuery(
      `SELECT id, business_id, table_number, status, created_at, updated_at, acknowledged_at, completed_at
       FROM public.waiter_requests
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [businessId]
    );
    return NextResponse.json({ success: true, requests: result.rows.map(publicRequest) });
  } catch (error: any) {
    console.error('Waiter request lookup failed:', error);
    return NextResponse.json({ success: false, error: 'Waiter requests are unavailable. Apply the waiter calls migration.' }, { status: 500 });
  }
}

async function createWaiterStream(req: NextRequest, businessId: string | null) {
  if (!businessId) return new Response('businessId is required', { status: 400 });
  const user = await getCurrentUserFromRequest(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!(await isUserAuthorizedForBusiness(user, businessId))) return new Response('Forbidden', { status: 403 });
  const business = await getBusinessById(businessId);
  if (!isEligibleRestaurant(business)) return new Response('Waiter calls are not enabled for this business', { status: 403 });

  const encoder = new TextEncoder();
  const supabase = getSupabaseAdminClient();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
      const knownUpdates = new Map<string, string>();
      const send = (request: Record<string, any>) => {
        if (closed || request.business_id !== businessId) return;
        const updatedAt = request.updated_at ? new Date(request.updated_at).toISOString() : '';
        if (updatedAt && knownUpdates.get(request.id) === updatedAt) return;
        if (updatedAt) knownUpdates.set(request.id, updatedAt);
        const safeRequest = publicRequest(request);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'WAITER_REQUEST_CHANGED', request: safeRequest })}\n\n`));
        } catch { cleanup(); }
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`));
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { cleanup(); }
      }, 20000);
      const poll = async () => {
        try {
          const result = await pgQuery(
            `SELECT id, business_id, table_number, status, created_at, updated_at, acknowledged_at, completed_at
             FROM public.waiter_requests
             WHERE business_id = $1 AND updated_at >= NOW() - INTERVAL '10 minutes'
             ORDER BY updated_at DESC LIMIT 50`, [businessId]
          );
          for (const row of result.rows) {
            const updatedAt = new Date(row.updated_at).toISOString();
            if (knownUpdates.get(row.id) !== updatedAt) {
              send(row);
            }
          }
        } catch (error) { console.error('Waiter event fallback failed:', error); }
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeat) clearInterval(heartbeat);
        if (channel && supabase) void supabase.removeChannel(channel);
      };

      // Keep the stream reliable even when Realtime credentials/publication are
      // unavailable or a serverless connection drops its channel subscription.
      void poll();
      pollTimer = setInterval(poll, 3000);

      if (supabase) {
        channel = supabase.channel(`waiter-requests-${businessId}-${crypto.randomUUID()}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'waiter_requests', filter: `business_id=eq.${businessId}`,
          }, (payload) => {
            if (payload.new && Object.keys(payload.new).length) send(payload.new as Record<string, any>);
          })
          .subscribe();
      }
      req.signal.addEventListener('abort', cleanup, { once: true });
    },
    cancel() { /* request abort triggers cleanup */ },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const rawTable = typeof body.tableNumber === 'string' ? body.tableNumber.trim() : '';
    const tableNumber = rawTable.replace(/^(table\s*(no\.?|#)?\s*)/i, '').trim();
    if (!slug || !tableNumber || tableNumber.length > 32) {
      return NextResponse.json({ success: false, error: 'Enter a valid table number' }, { status: 400 });
    }

    const business = await getBusinessBySlug(slug);
    if (!business || !isEligibleRestaurant(business)) {
      return NextResponse.json({ success: false, error: 'Waiter calls are not available for this restaurant' }, { status: 404 });
    }

    const accessToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const bucket = Math.floor(Date.now() / (COOLDOWN_SECONDS * 1000));
    const recentRequest = await pgQuery(
      `SELECT id FROM public.waiter_requests
       WHERE business_id = $1 AND table_number = $2
         AND created_at > NOW() - ($3 * INTERVAL '1 second')
       LIMIT 1`,
      [business.id, tableNumber, COOLDOWN_SECONDS]
    );
    if (recentRequest.rows.length) {
      return NextResponse.json({ success: false, error: 'A waiter was just called for this table. Please wait a moment.' }, { status: 429 });
    }
    const inserted = await pgQuery(
      `INSERT INTO public.waiter_requests (business_id, table_number, access_token_hash, cooldown_bucket)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (business_id, table_number, cooldown_bucket) DO NOTHING
       RETURNING id, business_id, table_number, status, created_at, updated_at, acknowledged_at, completed_at`,
      [business.id, tableNumber, tokenHash, bucket]
    );
    if (!inserted.rows[0]) {
      return NextResponse.json({ success: false, error: 'A waiter was just called for this table. Please wait a moment.' }, { status: 429 });
    }
    return NextResponse.json({ success: true, request: publicRequest(inserted.rows[0]), accessToken }, { status: 201 });
  } catch (error: any) {
    console.error('Waiter request creation failed:', error);
    return NextResponse.json({ success: false, error: 'Could not send the waiter request. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { businessId, requestId, status } = body;
    if (!businessId || !requestId || !['acknowledged', 'completed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid waiter request update' }, { status: 400 });
    }
    if (!(await isUserAuthorizedForBusiness(user, businessId))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const business = await getBusinessById(businessId);
    if (!isEligibleRestaurant(business)) {
      return NextResponse.json({ success: false, error: 'Waiter calls are not enabled for this business' }, { status: 403 });
    }

    const result = status === 'acknowledged'
      ? await pgQuery(
          `UPDATE public.waiter_requests
           SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $3, updated_at = NOW()
           WHERE id = $1 AND business_id = $2 AND status = 'pending'
           RETURNING id, business_id, table_number, status, created_at, updated_at, acknowledged_at, completed_at`,
          [requestId, businessId, user.id]
        )
      : await pgQuery(
          `UPDATE public.waiter_requests
           SET status = 'completed', completed_at = NOW(), completed_by = $3, updated_at = NOW()
           WHERE id = $1 AND business_id = $2 AND status IN ('pending', 'acknowledged')
           RETURNING id, business_id, table_number, status, created_at, updated_at, acknowledged_at, completed_at`,
          [requestId, businessId, user.id]
        );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Request is already updated or unavailable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, request: publicRequest(result.rows[0]) });
  } catch (error: any) {
    console.error('Waiter request update failed:', error);
    return NextResponse.json({ success: false, error: 'Could not update waiter request' }, { status: 500 });
  }
}
