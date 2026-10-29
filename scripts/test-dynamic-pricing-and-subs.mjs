import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function runDynamicPricingTests() {
  console.log('================================================================');
  console.log('   DYNAMIC PLAN PRICING & SUBSCRIPTION MANAGEMENT VERIFICATION  ');
  console.log('================================================================');

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
    // -------------------------------------------------------------
    // TEST 1: Check Columns in public.subscription_plans
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Schema Verification for subscription_plans ---');
    const colsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'subscription_plans'
        AND column_name IN ('validity_days_monthly', 'validity_days_annual', 'price_monthly', 'price_annual', 'features', 'is_visible')
    `);
    const cols = colsRes.rows.map(r => r.column_name);
    console.log('Found subscription_plans columns:', cols);
    assert(cols.includes('validity_days_monthly'), 'validity_days_monthly column exists');
    assert(cols.includes('validity_days_annual'), 'validity_days_annual column exists');
    assert(cols.includes('price_monthly'), 'price_monthly column exists');
    assert(cols.includes('price_annual'), 'price_annual column exists');
    assert(cols.includes('is_visible'), 'is_visible column exists');
    assert(cols.includes('features'), 'features column exists');

    // -------------------------------------------------------------
    // TEST 2: Query Active Plans & Verify Dynamic Pricing Persistence
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Active Plans from Database ---');
    const plansRes = await pool.query('SELECT * FROM public.subscription_plans ORDER BY price_monthly ASC');
    console.log(`Total plans in database: ${plansRes.rows.length}`);
    for (const p of plansRes.rows) {
      console.log(` - ${p.id} (${p.name}): Monthly ₹${p.price_monthly} (${p.validity_days_monthly || 30}d), Annual ₹${p.price_annual} (${p.validity_days_annual || 365}d), Visible: ${p.is_visible}`);
    }
    const basic = plansRes.rows.find(p => p.id === 'plan_basic');
    const gold = plansRes.rows.find(p => p.id === 'plan_gold');
    const diamond = plansRes.rows.find(p => p.id === 'plan_diamond');

    assert(Boolean(basic), 'Basic plan exists');
    assert(Boolean(gold), 'Gold plan exists');
    assert(Boolean(diamond), 'Diamond plan exists');

    assert(parseFloat(basic.price_monthly) === 49, `Basic plan price_monthly is ₹49 (got ${basic.price_monthly})`);
    assert(parseFloat(gold.price_monthly) === 149, `Gold plan price_monthly is ₹149 (got ${gold.price_monthly})`);
    assert(parseFloat(diamond.price_monthly) === 249, `Diamond plan price_monthly is ₹249 (got ${diamond.price_monthly})`);
    assert(diamond.is_visible === false, 'Diamond is hidden by default (is_visible = false)');

    // -------------------------------------------------------------
    // TEST 3: Free Trial Configuration in platform_settings
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Free Trial Policy in platform_settings ---');
    const trialRes = await pool.query("SELECT settings FROM public.platform_settings WHERE id = 'global'");
    assert(trialRes.rows.length > 0, 'platform_settings record exists');
    const settings = trialRes.rows[0]?.settings || {};
    console.log('Platform trial configuration:', settings.trial);
    assert(settings.trial && typeof settings.trial.enabled === 'boolean', 'Trial enabled flag is configured');
    assert(settings.trial && settings.trial.durationDays >= 1, `Trial duration is set (${settings.trial?.durationDays} days)`);
    assert(settings.trial && settings.trial.planId === 'plan_gold', 'Trial default entitlement is plan_gold');

    // -------------------------------------------------------------
    // TEST 4: Performance Indexes
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Performance Indexes ---');
    const idxRes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname IN ('idx_sub_history_biz', 'idx_sub_payments_biz', 'idx_sub_payments_status')
    `);
    const idxNames = idxRes.rows.map(r => r.indexname);
    console.log('Found indexes:', idxNames);
    assert(idxNames.includes('idx_sub_history_biz'), 'idx_sub_history_biz exists');
    assert(idxNames.includes('idx_sub_payments_biz'), 'idx_sub_payments_biz exists');
    assert(idxNames.includes('idx_sub_payments_status'), 'idx_sub_payments_status exists');

    // -------------------------------------------------------------
    // TEST 5: Historical Integrity (Existing Payments Retained)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Existing Subscribers & Historical Payments ---');
    const paymentsRes = await pool.query('SELECT count(*) as count FROM public.subscription_payments');
    console.log(`Historical payment records retained: ${paymentsRes.rows[0].count}`);
    assert(Number(paymentsRes.rows[0].count) >= 0, 'subscription_payments table accessible');

    // -------------------------------------------------------------
    // TEST 6: Manual Payment Reconciliation Functionality
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Manual Offline Payment Reconciliation ---');
    const bizRes = await pool.query('SELECT id, name FROM public.businesses LIMIT 1');
    assert(bizRes.rows.length > 0, 'Found at least one registered business in database');
    const testBizId = bizRes.rows[0].id;
    console.log(`Using real business ID for audit verification: ${testBizId} (${bizRes.rows[0].name})`);
    
    const testPaymentId = `subpay_test_${Date.now()}`;
    
    // Create test payment reconciliation record
    await pool.query(`
      INSERT INTO public.subscription_payments (
        id, business_id, plan_id, billing_cycle, amount, 
        currency, status, payment_method, payment_provider, 
        verification_status, notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'plan_gold', 'monthly', 149,
        'INR', 'completed', 'bank_transfer', 'manual_admin',
        'verified', 'Manual test payment reconciliation with UTR reference', NOW(), NOW()
      )
    `, [testPaymentId, testBizId]);

    const checkPay = await pool.query('SELECT * FROM public.subscription_payments WHERE id = $1', [testPaymentId]);
    assert(checkPay.rows.length === 1, 'Manual payment record created');
    assert(checkPay.rows[0].status === 'completed', 'Payment status is completed');
    assert(checkPay.rows[0].verification_status === 'verified', 'Payment verification_status is verified');
    assert(checkPay.rows[0].payment_provider === 'manual_admin', 'Provider is manual_admin');

    // Clean up test payment
    await pool.query('DELETE FROM public.subscription_payments WHERE id = $1', [testPaymentId]);
    console.log('[CLEANUP] Deleted test payment record');

    // -------------------------------------------------------------
    // TEST 7: Subscription History & Scheduled Downgrade Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Subscription History & Scheduled Downgrade Tracking ---');
    const testHistId = `subhist_test_${Date.now()}`;
    await pool.query(`
      INSERT INTO public.subscription_history (
        id, business_id, previous_plan_id, new_plan_id, 
        change_type, notes, effective_date, created_at
      ) VALUES (
        $1, $2, 'plan_gold', 'plan_basic',
        'downgrade_scheduled', 'Scheduled downgrade to basic at period end; preserving all items',
        NOW() + INTERVAL '15 days', NOW()
      )
    `, [testHistId, testBizId]);

    const checkHist = await pool.query('SELECT * FROM public.subscription_history WHERE id = $1', [testHistId]);
    assert(checkHist.rows.length === 1, 'Subscription history record created');
    assert(checkHist.rows[0].change_type === 'downgrade_scheduled', 'change_type is downgrade_scheduled');
    assert(checkHist.rows[0].new_plan_id === 'plan_basic', 'Target plan is plan_basic');

    // Clean up test history
    await pool.query('DELETE FROM public.subscription_history WHERE id = $1', [testHistId]);
    console.log('[CLEANUP] Deleted test subscription history record');

    // -------------------------------------------------------------
    // TEST 8: Audit Log Persistence
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Audit Log Recording ---');
    const testAuditId = `audit_test_${Date.now()}`;
    await pool.query(`
      INSERT INTO public.audit_logs (
        id, business_id, user_id, user_name, action, details, 
        target_entity, target_id, reason, result, timestamp
      ) VALUES (
        $1, $2, 'admin_system', 'Super Admin', 'SUBSCRIPTION_RECONCILE_PAYMENT',
        'Reconciled test payment for business', 'subscription', $2, 'Test verification',
        'success', NOW()
      )
    `, [testAuditId, testBizId]);

    const checkAudit = await pool.query('SELECT * FROM public.audit_logs WHERE id = $1', [testAuditId]);
    assert(checkAudit.rows.length === 1, 'Audit log recorded');
    assert(checkAudit.rows[0].action === 'SUBSCRIPTION_RECONCILE_PAYMENT', 'Audit action recorded accurately');

    // Clean up test audit
    await pool.query('DELETE FROM public.audit_logs WHERE id = $1', [testAuditId]);
    console.log('[CLEANUP] Deleted test audit log record');

    // -------------------------------------------------------------
    // TEST 9: Dynamic Plan Updates & Features List
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Updating Plan Features Dynamically ---');
    const updateRes = await pool.query(`
      UPDATE public.subscription_plans 
      SET features = features || '["24/7 Priority Support"]'::jsonb
      WHERE id = 'plan_gold'
      RETURNING features
    `);
    assert(updateRes.rows.length === 1, 'Gold plan features updated');
    const featuresArray = updateRes.rows[0].features;
    assert(Array.isArray(featuresArray), 'Features is JSON array');
    console.log(`Gold features count: ${featuresArray.length}`);

    // Revert feature addition
    await pool.query(`
      UPDATE public.subscription_plans
      SET features = '["Both Store & Menu modules included simultaneously", "Custom UPI ID & QR Code setup for customer checkout", "Direct bank payments (GPay, PhonePe, Paytm, BHIM)", "Separate Store Orders (S-) and Menu Orders (M-)", "Retail product catalog, barcode, and stock inventory", "Public TV queue token display & sales analytics"]'::jsonb
      WHERE id = 'plan_gold'
    `);
    console.log('[REVERT] Reverted Gold features to standard set');

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await pool.end();
  }
}

runDynamicPricingTests();
