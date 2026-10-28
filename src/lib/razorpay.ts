import crypto from 'crypto';
import Razorpay from 'razorpay';

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const isConfigured = Boolean(keyId && keySecret);

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured,
  };
}

export function getRazorpayClient(): Razorpay | null {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Creates a Razorpay Order for subscription payment
 * Note: amount is in INR, Razorpay requires amount in paise (1 INR = 100 paise)
 */
export async function createRazorpayOrder(params: {
  amount: number; // in INR (e.g. 20 or 99)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; receipt: string } | null> {
  const client = getRazorpayClient();
  if (!client) {
    throw new Error(
      'Razorpay is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in server environment.'
    );
  }

  const amountInPaise = Math.round(params.amount * 100);

  const order = await client.orders.create({
    amount: amountInPaise,
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: order.receipt || params.receipt,
  };
}

/**
 * Verifies Razorpay Payment Signature after client completes checkout
 * formula: hmac_sha256(order_id + "|" + payment_id, key_secret) === signature
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured on server.');
  }

  try {
    const body = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(params.signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    console.error('Error verifying Razorpay payment signature:', err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook Signature using raw body
 * formula: hmac_sha256(raw_body, webhook_secret) === x-razorpay-signature
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured on server.');
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(params.rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(params.signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    console.error('Error verifying Razorpay webhook signature:', err);
    return false;
  }
}
