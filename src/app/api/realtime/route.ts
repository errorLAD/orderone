import { NextRequest } from 'next/server';
import { subscribeToOrders } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  const sourceType = searchParams.get('sourceType'); // optional filter: 'store' or 'menu'

  if (!businessId) {
    return new Response('businessId is required', { status: 400 });
  }

  const user = await getCurrentUserFromRequest(req);
  if (user) {
    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`)
      );

      // Heartbeat interval to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 20000);

      // Subscribe to real-time order creation events
      const unsubscribe = subscribeToOrders((event) => {
        try {
          // Verify business authorization
          if (businessId && event.order.businessId !== businessId) {
            return;
          }
          // Filter by module if specified (Store orders notify store dashboard only, Menu orders notify menu dashboard only)
          if (sourceType && event.order.sourceType !== sourceType) {
            return;
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch (e) {
          console.error('Error broadcasting to SSE client:', e);
        }
      });

      // Cleanup on connection abort
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
