import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionPayment, getSubscriptionPlans, getBusinessById } from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = checkoutSchema.parse(body);

    const business = await getBusinessById(data.businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const plans = await getSubscriptionPlans(user.role === 'admin');
    const selectedPlan = plans.find((p) => p.id === data.planId);
    if (!selectedPlan) {
      return NextResponse.json(
        { success: false, error: 'Selected subscription plan is not available or is hidden' },
        { status: 400 }
      );
    }

    const payment = await createSubscriptionPayment({
      businessId: data.businessId,
      planId: data.planId,
      billingCycle: data.billingCycle,
      notes: `Subscription payment for ${selectedPlan.name} plan (${data.billingCycle})`,
    });

    const payeeName = 'OrderOne.in Platform';
    const platformUpiId = 'orderone.in@icici';
    const transactionNote = `Sub-${payment.id.slice(-6)}`;
    const dynamicUpiUri = `upi://pay?pa=${platformUpiId}&pn=${encodeURIComponent(payeeName)}&am=${payment.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        billingCycle: payment.billingCycle,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        status: payment.status,
      },
      platformUpi: {
        upiId: platformUpiId,
        payeeName,
        qrUri: dynamicUpiUri,
        transactionNote,
        instructions: 'Pay using Google Pay, PhonePe, Paytm, or BHIM. After paying, submit your 12-digit UPI Reference Number / UTR to confirm and activate your subscription.',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
