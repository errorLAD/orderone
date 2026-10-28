import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { getBusinessById, completeRazorpaySubscriptionPayment } from '@/lib/db';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { pgQuery } from '@/lib/postgres';
import { z } from 'zod';

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay Order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay Payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay Signature is required'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = verifyPaymentSchema.parse(body);

    // Retrieve pending payment record to verify business authorization
    const payRes = await pgQuery('SELECT * FROM public.subscription_payments WHERE id = $1', [data.paymentId]);
    if (payRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subscription payment record not found' }, { status: 404 });
    }
    const paymentRecord = payRes.rows[0];

    const isAuth = await isUserAuthorizedForBusiness(user, paymentRecord.business_id);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to verify payments for this business' },
        { status: 403 }
      );
    }

    // Server-side cryptographic signature verification
    const isValidSignature = verifyRazorpayPaymentSignature({
      orderId: data.razorpayOrderId,
      paymentId: data.razorpayPaymentId,
      signature: data.razorpaySignature,
    });

    if (!isValidSignature) {
      // Mark payment failed in database
      await pgQuery(
        `UPDATE public.subscription_payments 
         SET status = 'failed', verification_status = 'failed', notes = 'Invalid Razorpay signature', updated_at = NOW() 
         WHERE id = $1`,
        [data.paymentId]
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: cryptographic signature does not match.',
          code: 'INVALID_SIGNATURE',
        },
        { status: 400 }
      );
    }

    // Signature verified! Complete subscription activation (30 days validity)
    const result = await completeRazorpaySubscriptionPayment({
      paymentId: data.paymentId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      razorpayOrderId: data.razorpayOrderId,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      subscription: result.business.subscription,
      payment: result.payment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    console.error('Error in razorpay verify-payment route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
