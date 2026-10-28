import { NextRequest, NextResponse } from 'next/server';
import { getBusinessById, getSubscriptionPlans, createSubscriptionPayment } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { createRazorpayOrder, getRazorpayConfig } from '@/lib/razorpay';
import { z } from 'zod';

const createOrderSchema = z.object({
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
    const data = createOrderSchema.parse(body);

    const isAuth = await isUserAuthorizedForBusiness(user, data.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to manage subscriptions for this business' },
        { status: 403 }
      );
    }

    const business = await getBusinessById(data.businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Verify requested plan
    const plans = await getSubscriptionPlans(user.role === 'admin');
    const targetPlan = plans.find((p) => p.id === data.planId);
    if (!targetPlan) {
      return NextResponse.json(
        { success: false, error: 'Selected subscription plan is unavailable or hidden' },
        { status: 400 }
      );
    }

    // Diamond plan protection: must be admin or explicitly visible
    if (targetPlan.id === 'plan_diamond' && targetPlan.isVisible === false && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'The Diamond plan is an enterprise tier managed by administration and is not open for self-checkout.' },
        { status: 403 }
      );
    }

    // Check Razorpay Configuration
    const { keyId, isConfigured } = getRazorpayConfig();
    if (!isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Razorpay credentials are not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.',
          code: 'RAZORPAY_NOT_CONFIGURED',
          requiredEnvVars: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
        },
        { status: 503 }
      );
    }

    const amountInInr = data.billingCycle === 'annual' ? targetPlan.priceAnnual : targetPlan.priceMonthly;
    const currentPlanId = business.subscription?.planId || 'plan_basic';

    // 1. Create a pending SubscriptionPayment record in PostgreSQL
    const payment = await createSubscriptionPayment({
      businessId: business.id,
      planId: targetPlan.id,
      billingCycle: data.billingCycle,
      paymentMethod: 'razorpay',
      paymentProvider: 'razorpay',
      previousPlanId: currentPlanId,
      notes: `Subscription payment for ${targetPlan.name} plan (${data.billingCycle} - 30 days validity)`,
    });

    // 2. Call Razorpay API to generate the Razorpay Order
    const rzpOrder = await createRazorpayOrder({
      amount: amountInInr,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        businessId: business.id,
        businessName: business.name,
        planId: targetPlan.id,
        planName: targetPlan.name,
        paymentId: payment.id,
        billingCycle: data.billingCycle,
      },
    });

    if (!rzpOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to create Razorpay payment order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      amountInInr,
      currency: rzpOrder.currency,
      keyId,
      paymentId: payment.id,
      plan: {
        id: targetPlan.id,
        name: targetPlan.name,
        validityDays: data.billingCycle === 'annual' ? 365 : 30,
      },
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    console.error('Error in razorpay create-order route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
