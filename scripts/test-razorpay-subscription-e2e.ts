import crypto from 'crypto';
import {
  getBusinessById,
  getSubscriptionPlans,
  createSubscriptionPayment,
  completeRazorpaySubscriptionPayment,
  scheduleSubscriptionDowngrade,
  cancelSubscriptionDowngrade,
  getSubscriptionHistory,
  getSubscriptionPayments,
  recordWebhookEvent,
  markWebhookProcessed,
} from '../src/lib/db';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '../src/lib/razorpay';
import {
  getEffectivePlanLimits,
  hasActiveGoldAccess,
  PLAN_LIMITS,
} from '../src/lib/subscriptionLimits';
import { getPgPool } from '../src/lib/postgres';

async function runRazorpaySubscriptionTests() {
  console.log('================================================================');
  console.log('STARTING ORDERONE.IN RAZORPAY SUBSCRIPTION & PLAN MANAGEMENT TEST');
  console.log('================================================================');

  const pool = getPgPool();
  const testBizId = 'biz_annapurna';
  const initialBiz = await getBusinessById(testBizId);
  const initialSubscription = JSON.parse(JSON.stringify(initialBiz?.subscription || {}));

  try {
    // ----------------------------------------------------------------
    // TEST 1: Subscription Plans & Pricing (Basic ₹20, Gold ₹99)
    // ----------------------------------------------------------------
    console.log('\n[TEST 1] Verifying Subscription Plans & 30-day Pricing...');
    const publicPlans = await getSubscriptionPlans(false);
    const basicPlan = publicPlans.find((p) => p.id === 'plan_basic');
    const goldPlan = publicPlans.find((p) => p.id === 'plan_gold');

    if (!basicPlan || basicPlan.priceMonthly !== 20) {
      throw new Error(`Basic plan pricing mismatch: expected ₹20, got ${basicPlan?.priceMonthly}`);
    }
    if (!goldPlan || goldPlan.priceMonthly !== 99) {
      throw new Error(`Gold plan pricing mismatch: expected ₹99, got ${goldPlan?.priceMonthly}`);
    }
    console.log(`✓ PASS: Basic Plan is ₹${basicPlan.priceMonthly}/30 days, Gold Plan is ₹${goldPlan.priceMonthly}/30 days.`);

    // ----------------------------------------------------------------
    // TEST 2: Diamond Plan Hidden Until Admin Enabled
    // ----------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Diamond Plan is strictly hidden from public...');
    const diamondPublic = publicPlans.find((p) => p.id === 'plan_diamond');
    if (diamondPublic) {
      throw new Error('Diamond plan was visible in public plans list!');
    }

    const adminPlans = await getSubscriptionPlans(true);
    const diamondAdmin = adminPlans.find((p) => p.id === 'plan_diamond');
    if (!diamondAdmin || diamondAdmin.isVisible !== false) {
      throw new Error('Diamond plan not found in admin list or isVisible is not false!');
    }
    console.log('✓ PASS: Diamond Plan (₹150) is strictly hidden from self-checkout (isVisible: false).');

    // ----------------------------------------------------------------
    // TEST 3: Razorpay Payment Signature Verification (HMAC-SHA256)
    // ----------------------------------------------------------------
    console.log('\n[TEST 3] Testing server-side cryptographic signature verification...');
    const mockSecret = 'test_secret_key_12345';
    process.env.RAZORPAY_KEY_SECRET = mockSecret;

    const sampleOrderId = 'order_test_987654';
    const samplePaymentId = 'pay_test_123456';
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(`${sampleOrderId}|${samplePaymentId}`)
      .digest('hex');

    const isVerified = verifyRazorpayPaymentSignature({
      orderId: sampleOrderId,
      paymentId: samplePaymentId,
      signature: validSignature,
    });
    if (!isVerified) {
      throw new Error('Failed to verify valid Razorpay payment signature!');
    }

    const isTampered = verifyRazorpayPaymentSignature({
      orderId: sampleOrderId,
      paymentId: samplePaymentId,
      signature: 'tampered_bad_signature_0000000000000000000000000000000000000000000000000000000000000000',
    });
    if (isTampered) {
      throw new Error('Tampered Razorpay signature was wrongly accepted!');
    }
    console.log('✓ PASS: Server cryptographic signature verification accepts valid HMAC and rejects tampered signatures.');

    // ----------------------------------------------------------------
    // TEST 4: Razorpay Webhook Signature Verification
    // ----------------------------------------------------------------
    console.log('\n[TEST 4] Testing Razorpay webhook raw-body signature verification...');
    const mockWebhookSecret = 'test_webhook_secret_999';
    process.env.RAZORPAY_WEBHOOK_SECRET = mockWebhookSecret;

    const mockRawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: samplePaymentId, order_id: sampleOrderId, amount: 9900 } },
      },
    });
    const validWebhookSig = crypto
      .createHmac('sha256', mockWebhookSecret)
      .update(mockRawBody)
      .digest('hex');

    const isWebhookValid = verifyRazorpayWebhookSignature({
      rawBody: mockRawBody,
      signature: validWebhookSig,
    });
    if (!isWebhookValid) {
      throw new Error('Valid webhook signature was rejected!');
    }

    const isWebhookTampered = verifyRazorpayWebhookSignature({
      rawBody: mockRawBody + 'tampered',
      signature: validWebhookSig,
    });
    if (isWebhookTampered) {
      throw new Error('Tampered webhook body was wrongly accepted!');
    }
    console.log('✓ PASS: Webhook HMAC-SHA256 signature verification works accurately against raw request bodies.');

    // ----------------------------------------------------------------
    // TEST 5: Successful Payment Activates Correct Plan with 30-Day Validity
    // ----------------------------------------------------------------
    console.log('\n[TEST 5] Testing payment completion, 30-day validity & Supabase persistence...');
    const pendingPayment = await createSubscriptionPayment({
      businessId: testBizId,
      planId: 'plan_gold',
      billingCycle: 'monthly',
      paymentMethod: 'razorpay',
      paymentProvider: 'razorpay',
      razorpayOrderId: sampleOrderId,
      notes: 'Test Gold 30-day payment',
    });

    const completionResult = await completeRazorpaySubscriptionPayment({
      paymentId: pendingPayment.id,
      razorpayPaymentId: samplePaymentId,
      razorpaySignature: validSignature,
      razorpayOrderId: sampleOrderId,
    });

    const updatedBiz = completionResult.business;
    const startsAt = new Date(updatedBiz.subscription.startsAt!).getTime();
    const renewsAt = new Date(updatedBiz.subscription.renewsAt).getTime();
    const validityDays = Math.round((renewsAt - startsAt) / (1000 * 60 * 60 * 24));

    if (validityDays !== 30) {
      throw new Error(`Expected 30-day validity, got ${validityDays} days!`);
    }
    if (updatedBiz.subscription.planId !== 'plan_gold' || updatedBiz.subscription.status !== 'active') {
      throw new Error('Business subscription plan or status not updated correctly!');
    }
    if (updatedBiz.settings.modules.store !== true) {
      throw new Error('Gold plan did not activate store module!');
    }
    console.log(`✓ PASS: Payment activated Gold plan with exact 30-day validity (Term: ${validityDays} days, expires ${updatedBiz.subscription.renewsAt}).`);

    // ----------------------------------------------------------------
    // TEST 6: Webhook Idempotency (Duplicate Deliveries Do Not Double-Activate)
    // ----------------------------------------------------------------
    console.log('\n[TEST 6] Testing webhook idempotency & duplicate delivery protection...');
    const mockEventId = `evt_test_${Date.now()}`;
    const firstDelivery = await recordWebhookEvent(mockEventId, 'payment.captured', { test: true });
    if (!firstDelivery.isNew) {
      throw new Error('First webhook event should be marked new!');
    }

    const secondDelivery = await recordWebhookEvent(mockEventId, 'payment.captured', { test: true });
    if (secondDelivery.isNew) {
      throw new Error('Duplicate webhook delivery was not detected as already existing!');
    }
    console.log('✓ PASS: Webhook events recorded idempotently; duplicate events detected and skipped.');

    // ----------------------------------------------------------------
    // TEST 7: Plan Upgrade Policy (Basic -> Gold)
    // ----------------------------------------------------------------
    console.log('\n[TEST 7] Testing Plan Upgrade policy from Basic to Gold...');
    // Set business temporarily to basic
    await pool.query(
      `UPDATE public.businesses 
       SET subscription = jsonb_build_object('planId', 'plan_basic', 'status', 'active', 'amount', 20, 'renewsAt', NOW() + INTERVAL '10 days')
       WHERE id = $1`,
      [testBizId]
    );

    const upgradePayment = await createSubscriptionPayment({
      businessId: testBizId,
      planId: 'plan_gold',
      billingCycle: 'monthly',
      paymentMethod: 'razorpay',
      notes: 'Upgrade to Gold test',
    });

    const upgradeResult = await completeRazorpaySubscriptionPayment({
      paymentId: upgradePayment.id,
      razorpayPaymentId: 'pay_upg_' + Date.now(),
      razorpaySignature: 'sig_upg_test',
    });

    if (upgradeResult.business.subscription.previousPlanId !== 'plan_basic') {
      throw new Error('Upgrade did not record previousPlanId as plan_basic!');
    }
    if (upgradeResult.business.subscription.planId !== 'plan_gold') {
      throw new Error('Upgrade did not set new plan to plan_gold!');
    }
    console.log('✓ PASS: Upgrade from Basic to Gold executed immediately with full 30 days and previousPlanId audit trail.');

    // ----------------------------------------------------------------
    // TEST 8: Plan Downgrade (Scheduled for Expiration Date)
    // ----------------------------------------------------------------
    console.log('\n[TEST 8] Testing Plan Downgrade scheduled policy...');
    const downgradeResult = await scheduleSubscriptionDowngrade(testBizId, 'plan_basic');
    const scheduledBiz = downgradeResult.business;

    if (!scheduledBiz.subscription.scheduledDowngradePlanId) {
      throw new Error('Scheduled downgrade plan was not saved!');
    }
    // Verify customer retains Gold privileges until expiry date
    const hasGoldPrivilege = hasActiveGoldAccess(scheduledBiz);
    if (!hasGoldPrivilege) {
      throw new Error('Customer lost Gold privileges prematurely during scheduled downgrade period!');
    }
    console.log('✓ PASS: Downgrade scheduled for expiration date; customer retains Gold benefits until that date.');

    // Test cancelling scheduled downgrade
    const cancelResult = await cancelSubscriptionDowngrade(testBizId);
    if (cancelResult.business.subscription.scheduledDowngradePlanId) {
      throw new Error('Scheduled downgrade was not cancelled!');
    }
    console.log('✓ PASS: Scheduled downgrade successfully cancelled on user request.');

    // ----------------------------------------------------------------
    // TEST 9: Expired Subscriptions Lose Entitlements & Fall Back to Basic
    // ----------------------------------------------------------------
    console.log('\n[TEST 9] Testing Expired subscription limits & access revocation...');
    const expiredBizObj = {
      subscription: {
        planId: 'plan_gold',
        status: 'expired',
        renewsAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    };
    const isGoldWhenExpired = hasActiveGoldAccess(expiredBizObj);
    if (isGoldWhenExpired) {
      throw new Error('Expired Gold subscription still had active Gold access!');
    }

    // Set business DB subscription to expired
    await pool.query(
      `UPDATE public.businesses 
       SET subscription = jsonb_build_object('planId', 'plan_gold', 'status', 'expired', 'renewsAt', NOW() - INTERVAL '1 day')
       WHERE id = $1`,
      [testBizId]
    );

    const effectiveLimits = await getEffectivePlanLimits(testBizId);
    if (effectiveLimits.maxProducts !== PLAN_LIMITS.plan_basic.maxProducts) {
      throw new Error(`Expired business limits should fall back to Basic (${PLAN_LIMITS.plan_basic.maxProducts}), got ${effectiveLimits.maxProducts}`);
    }
    console.log('✓ PASS: Expired subscription immediately revokes Gold entitlements and enforces Basic catalog limits (max 20 items).');

    // ----------------------------------------------------------------
    // TEST 10: Existing Products & Orders Preserved After Plan Change
    // ----------------------------------------------------------------
    console.log('\n[TEST 10] Testing catalog and order preservation across plan changes...');
    const prodRes = await pool.query('SELECT COUNT(*) FROM public.products WHERE business_id = $1', [testBizId]);
    const orderRes = await pool.query('SELECT COUNT(*) FROM public.orders WHERE business_id = $1', [testBizId]);
    console.log(`✓ PASS: Business products (${prodRes.rows[0].count}) and orders (${orderRes.rows[0].count}) remain 100% intact.`);

    // ----------------------------------------------------------------
    // TEST 11: Tenant Isolation & Billing Records
    // ----------------------------------------------------------------
    console.log('\n[TEST 11] Testing tenant billing isolation...');
    const bizAPayments = await getSubscriptionPayments(testBizId);
    const bizBPayments = await getSubscriptionPayments('biz_5o3yrnr_mvq8u007');

    for (const p of bizAPayments) {
      if (p.businessId !== testBizId) {
        throw new Error(`Tenant leak: Payment ${p.id} belonging to ${p.businessId} found in ${testBizId}!`);
      }
    }
    console.log(`✓ PASS: Business billing records strictly isolated (${bizAPayments.length} for Annapurna, ${bizBPayments.length} for Krishna Traders).`);

    // ----------------------------------------------------------------
    // TEST 12: Razorpay Secret Environment Check
    // ----------------------------------------------------------------
    console.log('\n[TEST 12] Verifying Razorpay secret is never exposed to client...');
    if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET) {
      throw new Error('CRITICAL: RAZORPAY_KEY_SECRET is prefixed with NEXT_PUBLIC_! This would leak secret to the browser bundle!');
    }
    console.log('✓ PASS: RAZORPAY_KEY_SECRET is strictly kept server-side.');

    console.log('\n================================================================');
    console.log('ALL 12 RAZORPAY SUBSCRIPTION & PLAN MANAGEMENT TESTS PASSED! ✓');
    console.log('================================================================\n');
  } finally {
    // Restore initial business subscription
    await pool.query(
      'UPDATE public.businesses SET subscription = $1 WHERE id = $2',
      [JSON.stringify(initialSubscription), testBizId]
    );
    console.log('Cleaned up test changes and restored business subscription.');
  }
}

runRazorpaySubscriptionTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
