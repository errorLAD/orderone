import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature, getRazorpayConfig } from '@/lib/razorpay';
import {
  completeRazorpaySubscriptionPayment,
  recordWebhookEvent,
  markWebhookProcessed,
} from '@/lib/db';
import { pgQuery } from '@/lib/postgres';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const { webhookSecret } = getRazorpayConfig();

    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not configured. Webhook rejected.');
      return NextResponse.json(
        { success: false, error: 'Webhook secret is not configured on server' },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 1. Verify webhook signature using raw body
    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Idempotency Check: record event in public.webhook_events
    const { isNew } = await recordWebhookEvent(eventId, eventType, payload);
    if (!isNew) {
      console.log(`Razorpay webhook event ${eventId} already processed (idempotent skip).`);
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }

    // 3. Process events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || payload.payload?.order?.entity?.notes || {};

      let subscriptionPaymentId = notes.paymentId;

      // If notes didn't have paymentId, lookup by razorpay_order_id
      if (!subscriptionPaymentId && orderId) {
        const res = await pgQuery(
          'SELECT id FROM public.subscription_payments WHERE razorpay_order_id = $1 LIMIT 1',
          [orderId]
        );
        if (res.rows.length > 0) {
          subscriptionPaymentId = res.rows[0].id;
        }
      }

      if (subscriptionPaymentId) {
        try {
          await completeRazorpaySubscriptionPayment({
            paymentId: subscriptionPaymentId,
            razorpayPaymentId: paymentId || `pay_wh_${Date.now()}`,
            razorpaySignature: signature,
            razorpayOrderId: orderId,
          });
          console.log(`Webhook successfully activated subscription for payment ${subscriptionPaymentId}`);
        } catch (subErr: any) {
          console.error(`Error activating subscription via webhook for ${subscriptionPaymentId}:`, subErr);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const notes = paymentEntity?.notes || {};
      const subscriptionPaymentId = notes.paymentId;

      if (subscriptionPaymentId || orderId) {
        await pgQuery(
          `UPDATE public.subscription_payments
           SET status = 'failed',
               verification_status = 'failed',
               notes = COALESCE($1, notes),
               updated_at = NOW()
           WHERE id = $2 OR razorpay_order_id = $3`,
          [paymentEntity?.error_description || 'Payment failed via webhook', subscriptionPaymentId || null, orderId || null]
        );
      }
    }

    // Mark webhook processed in database
    await markWebhookProcessed(eventId);

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Error handling Razorpay webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
