import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=====================================================');
  console.log('   SUBSCRIPTION PLANS & UPI PAYMENTS E2E TEST SUITE  ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Public Plans API strictly excludes Diamond
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Public Subscription Plans API ---');
    const plansRes = await fetch(`${BASE_URL}/api/subscriptions`);
    const plansData = await plansRes.json();
    assert(plansData.success === true, 'Public subscription plans API returned 200/success');
    assert(Array.isArray(plansData.plans), 'Returned plans is an array');

    const returnedPlanIds = plansData.plans.map(p => p.id);
    console.log('Publicly visible plans:', returnedPlanIds);
    assert(returnedPlanIds.includes('plan_basic'), 'Basic plan is publicly visible');
    assert(returnedPlanIds.includes('plan_gold'), 'Gold plan is publicly visible');
    assert(!returnedPlanIds.includes('plan_diamond'), 'Diamond plan is STRICTLY HIDDEN from public API');
    
    // Check Basic plan properties
    const basicPlan = plansData.plans.find(p => p.id === 'plan_basic');
    assert(basicPlan.priceMonthly === 20, 'Basic plan is ₹20/month');
    assert(basicPlan.allowsMenu === true, 'Basic plan allows Menu module');
    assert(basicPlan.allowsStore === false, 'Basic plan locks Store module');
    assert(basicPlan.customUpi === false, 'Basic plan has customUpi = false');

    // Check Gold plan properties
    const goldPlan = plansData.plans.find(p => p.id === 'plan_gold');
    assert(goldPlan.priceMonthly === 99, 'Gold plan is ₹99/month');
    assert(goldPlan.allowsMenu === true, 'Gold plan allows Menu module');
    assert(goldPlan.allowsStore === true, 'Gold plan allows Store module');
    assert(goldPlan.customUpi === true, 'Gold plan has customUpi = true');

    // Check database directly: Diamond plan exists with is_visible = false
    const dbDiamondRes = await pool.query("SELECT * FROM public.subscription_plans WHERE id = 'plan_diamond'");
    assert(dbDiamondRes.rows.length === 1, 'Diamond plan exists in database');
    assert(dbDiamondRes.rows[0].is_visible === false, 'Diamond plan has is_visible = FALSE in database');
    assert(Number(dbDiamondRes.rows[0].price_monthly) === 150, 'Diamond plan price is ₹150 in database');

    // ----------------------------------------------------
    // TEST 2: Basic Plan Store Lock Enforcement
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Basic Plan Store Lock Enforcement ---');
    const TEST_BIZ_ID = 'biz_royal_grocery';

    // Register a merchant user for TEST_BIZ_ID to obtain a real session cookie
    const testEmail = `owner_${Date.now()}@royalgrocery.in`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Royal Grocery Owner',
        email: testEmail,
        password: 'Password@1234',
        businessId: TEST_BIZ_ID,
      }),
    });
    const regCookie = regRes.headers.get('set-cookie');
    const sessionCookie = regCookie ? regCookie.split(';')[0] : '';
    assert(Boolean(sessionCookie), 'Authenticated session cookie obtained for merchant');

    // Set business to plan_basic via API or DB
    await pool.query(
      `
      UPDATE public.businesses
      SET subscription = jsonb_build_object('planId', 'plan_basic', 'status', 'active', 'billingCycle', 'monthly', 'amount', 20),
          updated_at = NOW()
      WHERE id = $1
      `,
      [TEST_BIZ_ID]
    );

    // Verify DB reflects Basic
    const bizCheck = await pool.query("SELECT subscription->>'planId' as plan_id FROM public.businesses WHERE id = $1", [TEST_BIZ_ID]);
    assert(bizCheck.rows[0].plan_id === 'plan_basic', 'Business is now set to plan_basic');

    // Attempt to create a Store order for Basic business -> MUST FAIL with 403
    const orderAttempt = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: TEST_BIZ_ID,
        sourceType: 'store',
        items: [{ productId: 'dummy_prod', productName: 'Test Item', price: 100, quantity: 1, itemTotal: 100 }],
        subtotal: 100,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        total: 100,
        paymentMethod: 'cash',
        customer: { name: 'Test Customer', phone: '9876543210' }
      }),
    });
    const orderAttemptData = await orderAttempt.json();
    assert(orderAttempt.status === 403, 'Placing store order on Basic plan returns HTTP 403 Forbidden');
    assert(orderAttemptData.error && orderAttemptData.error.includes('Gold'), 'Error message indicates Store requires Gold plan upgrade');

    // Attempt to configure custom UPI settings for Basic business -> MUST FAIL with 403
    const upiAttempt = await fetch(`${BASE_URL}/api/businesses/upi`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        businessId: TEST_BIZ_ID,
        upiId: 'merchant@upi',
        payeeName: 'Merchant Store',
        isEnabled: true,
      }),
    });
    const upiAttemptData = await upiAttempt.json();
    assert(upiAttempt.status === 403, 'Configuring UPI settings on Basic plan returns HTTP 403 Forbidden');
    assert(upiAttemptData.code === 'GOLD_PLAN_REQUIRED', 'Error code is GOLD_PLAN_REQUIRED');

    // ----------------------------------------------------
    // TEST 3: Subscription Checkout & Confirmation Flow
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Subscription Checkout & Activation Flow ---');
    // Call /api/subscriptions/checkout to initiate Gold upgrade
    const checkoutRes = await fetch(`${BASE_URL}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        businessId: TEST_BIZ_ID,
        planId: 'plan_gold',
        billingCycle: 'monthly',
      }),
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutRes.status === 200, 'Subscription checkout returned 200');
    assert(checkoutData.payment && checkoutData.payment.id, 'Checkout returned payment record');
    assert(checkoutData.payment.amount === 99, 'Gold subscription checkout amount is ₹99');
    assert(checkoutData.platformUpi && checkoutData.platformUpi.upiId, 'Checkout provided platform UPI ID for merchant payment');

    const paymentId = checkoutData.payment.id;
    const testUtr = 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);

    // Call /api/subscriptions/confirm with UTR reference
    const confirmRes = await fetch(`${BASE_URL}/api/subscriptions/confirm`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        paymentId,
        paymentReference: testUtr,
      }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200, 'Subscription confirmation returned 200');
    assert(confirmData.success === true, 'Subscription confirmation succeeded');

    // Verify in database that business is upgraded to plan_gold
    const bizUpgraded = await pool.query("SELECT subscription->>'planId' as plan_id, subscription->>'status' as status FROM public.businesses WHERE id = $1", [TEST_BIZ_ID]);
    assert(bizUpgraded.rows[0].plan_id === 'plan_gold', 'Business subscription plan is now plan_gold');
    assert(bizUpgraded.rows[0].status === 'active', 'Business subscription status is active');

    // Verify payment record in public.subscription_payments
    const payRow = await pool.query('SELECT * FROM public.subscription_payments WHERE id = $1', [paymentId]);
    assert(payRow.rows.length === 1, 'Payment record exists in public.subscription_payments');
    assert(payRow.rows[0].status === 'completed', 'Payment record status is completed');
    assert(payRow.rows[0].payment_reference === testUtr, 'Payment record stores exact UTR reference');

    // ----------------------------------------------------
    // TEST 4: Gold Plan UPI Configuration & Customer Flow
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Gold Plan UPI Configuration & Customer Flow ---');
    // Now that business is Gold, configure merchant UPI
    const saveUpiRes = await fetch(`${BASE_URL}/api/businesses/upi`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        businessId: TEST_BIZ_ID,
        upiId: 'royal.grocery@okaxis',
        payeeName: 'Royal Grocery Store',
        instructions: 'Please pay via GooglePay or PhonePe and show confirmation.',
        isEnabled: true,
      }),
    });
    const saveUpiData = await saveUpiRes.json();
    assert(saveUpiRes.status === 200, 'Saving UPI settings on Gold plan returned 200');
    assert(saveUpiData.success === true, 'UPI settings saved successfully');
    assert(saveUpiData.upiSettings && saveUpiData.upiSettings.upiId === 'royal.grocery@okaxis', 'UPI ID persisted correctly');

    // Verify in database public.business_upi_settings
    const upiDb = await pool.query('SELECT * FROM public.business_upi_settings WHERE business_id = $1', [TEST_BIZ_ID]);
    assert(upiDb.rows.length === 1, 'UPI settings persisted in public.business_upi_settings table');
    assert(upiDb.rows[0].upi_id === 'royal.grocery@okaxis', 'Database contains exact merchant UPI ID');

    // ----------------------------------------------------
    // TEST 5: Customer UPI Order with pending_verification
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Customer Checkout with UPI & pending_verification ---');
    // Ensure biz_annapurna has plan_gold
    await pool.query(
      `
      UPDATE public.businesses
      SET subscription = jsonb_build_object('planId', 'plan_gold', 'status', 'active', 'billingCycle', 'monthly', 'amount', 99),
          settings = jsonb_set(settings, '{modules,store}', 'true'::jsonb),
          updated_at = NOW()
      WHERE id = 'biz_annapurna'
      `
    );

    // Fetch active store product
    const prodRes = await fetch(`${BASE_URL}/api/products?businessId=biz_annapurna&sourceType=store`);
    const prodData = await prodRes.json();
    const storeProduct = prodData.products[0];

    // Create an order using UPI payment method
    const upiOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'biz_annapurna',
        sourceType: 'store',
        items: [{ productId: storeProduct.id, quantity: 1 }],
        paymentMethod: 'upi',
        customer: { name: 'Priya Sharma', phone: '9988776655' }
      }),
    });
    const upiOrderData = await upiOrderRes.json();
    assert(upiOrderRes.status === 200 || upiOrderRes.status === 201, 'Customer UPI order placed successfully on Gold plan');
    assert(upiOrderData.order && upiOrderData.order.id, 'Order has valid ID');
    assert(upiOrderData.order.paymentStatus === 'pending_verification', 'Customer UPI payment status defaults to pending_verification (NOT auto-paid!)');

    // Merchant verifies payment and marks it paid
    const verifyPayRes = await fetch(`${BASE_URL}/api/orders/${upiOrderData.order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: 'paid',
        note: 'Verified in bank account statement',
      }),
    });
    const verifyPayData = await verifyPayRes.json();
    assert(verifyPayRes.status === 200, 'Merchant verification endpoint returned 200');
    assert(verifyPayData.order.paymentStatus === 'paid', 'Order payment status updated to paid after merchant verification');

    console.log('\n=====================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('=====================================================');

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    await pool.end();
  }
}

runTests();
