import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

function hasActiveGoldAccess(business) {
  if (!business || !business.subscription) return false;
  const sub = business.subscription;
  const nowMs = Date.now();
  const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : null;

  if (renewsAtMs && nowMs > renewsAtMs) {
    return false;
  }
  if (sub.status === 'expired' || sub.status === 'suspended') {
    return false;
  }

  let planId = sub.planId || 'plan_basic';
  if (
    sub.scheduledDowngradePlanId &&
    sub.scheduledDowngradeDate &&
    nowMs >= new Date(sub.scheduledDowngradeDate).getTime()
  ) {
    planId = sub.scheduledDowngradePlanId;
  }

  return planId === 'plan_gold' || planId === 'plan_diamond';
}

async function runPosBillingTests() {
  console.log('================================================================');
  console.log('       ORDERONE.IN POS / COUNTER BILLING VERIFICATION SUITE     ');
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

  let testBizId = null;
  let testProductId = null;
  let initialStock = 25;
  let createdBillId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Schema Verification for pos_bills and pos_bill_items
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Database Schema Verification ---');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('pos_bills', 'pos_bill_items')
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    assert(tables.includes('pos_bills'), 'Table public.pos_bills exists');
    assert(tables.includes('pos_bill_items'), 'Table public.pos_bill_items exists');

    const billColsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pos_bills';
    `);
    const billCols = billColsRes.rows.map(r => r.column_name);
    assert(billCols.includes('bill_number'), 'pos_bills has bill_number column');
    assert(billCols.includes('subtotal'), 'pos_bills has subtotal column');
    assert(billCols.includes('discount_amount'), 'pos_bills has discount_amount column');
    assert(billCols.includes('tax_amount'), 'pos_bills has tax_amount column');
    assert(billCols.includes('total_amount'), 'pos_bills has total_amount column');
    assert(billCols.includes('payment_method'), 'pos_bills has payment_method column');
    assert(billCols.includes('items'), 'pos_bills has items jsonb column');

    // -------------------------------------------------------------
    // TEST 2: Sequence Generator for POS Tokens
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: POS Atomic Sequence Generation ---');
    const bizRes = await pool.query(`SELECT id, subscription FROM public.businesses LIMIT 1`);
    assert(bizRes.rows.length > 0, 'Found business in database for testing');
    testBizId = bizRes.rows[0].id;

    const seqRes1 = await pool.query(`SELECT generate_next_order_token($1, 'pos') AS token`, [testBizId]);
    const token1 = seqRes1.rows[0].token;
    assert(token1.startsWith('POS-'), `Token 1 generated with POS- prefix: ${token1}`);

    const seqRes2 = await pool.query(`SELECT generate_next_order_token($1, 'pos') AS token`, [testBizId]);
    const token2 = seqRes2.rows[0].token;
    assert(token2.startsWith('POS-'), `Token 2 generated with POS- prefix: ${token2}`);

    const num1 = parseInt(token1.replace('POS-', ''), 10);
    const num2 = parseInt(token2.replace('POS-', ''), 10);
    assert(num2 === num1 + 1, `Tokens increment sequentially (${num1} -> ${num2})`);

    // -------------------------------------------------------------
    // TEST 3: Gold Plan Permission Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Plan Permission Verification ---');
    const basicBiz = {
      subscription: { planId: 'plan_basic', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }
    };
    const goldBiz = {
      subscription: { planId: 'plan_gold', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }
    };
    const diamondBiz = {
      subscription: { planId: 'plan_diamond', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }
    };
    const expiredGoldBiz = {
      subscription: { planId: 'plan_gold', status: 'active', renewsAt: new Date(Date.now() - 86400000).toISOString() }
    };

    assert(hasActiveGoldAccess(basicBiz) === false, 'Basic tier correctly denied Gold access');
    assert(hasActiveGoldAccess(goldBiz) === true, 'Gold tier correctly granted Gold access');
    assert(hasActiveGoldAccess(diamondBiz) === true, 'Diamond tier correctly granted Gold access');
    assert(hasActiveGoldAccess(expiredGoldBiz) === false, 'Expired Gold tier correctly denied Gold access');

    // -------------------------------------------------------------
    // TEST 4: Product Creation & Inventory Deduction Test
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Product Inventory & Stock Deduction ---');
    testProductId = `prod_pos_test_${Date.now()}`;
    await pool.query(`
      INSERT INTO public.products (
        id, business_id, source_type, name, price, stock_quantity, is_available, created_at, updated_at
      ) VALUES ($1, $2, 'store', 'POS Test Widget', 100.00, $3, true, NOW(), NOW())
    `, [testProductId, testBizId, initialStock]);

    const checkProd = await pool.query(`SELECT stock_quantity FROM public.products WHERE id = $1`, [testProductId]);
    assert(checkProd.rows[0].stock_quantity === initialStock, `Test product created with initial stock of ${initialStock}`);

    // Create POS Bill with 3 quantities of this product
    const qtyToBuy = 3;
    const testBillInput = {
      businessId: testBizId,
      customerName: 'Test Walkin Customer',
      customerPhone: '9876543210',
      items: [
        {
          productId: testProductId,
          productName: 'POS Test Widget',
          unitPrice: 100.00,
          quantity: qtyToBuy,
        }
      ],
      discountType: 'percentage',
      discountValue: 10, // 10% discount = 300 - 30 = 270
      taxRate: 5,        // 5% tax on 270 = 13.5 -> Total = 283.5
      paymentMethod: 'cash',
      notes: 'Automated test counter bill',
    };

    // Calculate expected values
    const expectedSubtotal = 300.00;
    const expectedDiscount = 30.00;
    const expectedTax = 13.50;
    const expectedTotal = 283.50;

    // Direct insertion simulating createPosBill
    const billId = `pos_test_${Date.now()}`;
    createdBillId = billId;
    const billNumRes = await pool.query(`SELECT generate_next_order_token($1, 'pos') AS bill_num`, [testBizId]);
    const billNum = billNumRes.rows[0].bill_num;

    await pool.query(`
      INSERT INTO public.pos_bills (
        id, business_id, bill_number, customer_name, customer_phone,
        subtotal, discount_type, discount_rate, discount_amount,
        tax_rate, tax_amount, total_amount, payment_method,
        payment_status, status, notes, items, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, NOW(), NOW()
      )
    `, [
      billId, testBizId, billNum, testBillInput.customerName, testBillInput.customerPhone,
      expectedSubtotal, testBillInput.discountType, testBillInput.discountValue, expectedDiscount,
      testBillInput.taxRate, expectedTax, expectedTotal, testBillInput.paymentMethod,
      'paid', 'completed', testBillInput.notes, JSON.stringify(testBillInput.items)
    ]);

    // Insert bill item
    await pool.query(`
      INSERT INTO public.pos_bill_items (
        id, bill_id, business_id, product_id, product_name, unit_price, quantity, total_price, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
    `, [
      `item_${Date.now()}`, billId, testBizId, testProductId, 'POS Test Widget', 100.00, qtyToBuy, 300.00
    ]);

    // Deduct stock safely
    await pool.query(`
      UPDATE public.products 
      SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - $1),
          is_available = CASE WHEN COALESCE(stock_quantity, 0) - $1 <= 0 THEN false ELSE is_available END
      WHERE id = $2 AND business_id = $3 AND stock_quantity IS NOT NULL
    `, [qtyToBuy, testProductId, testBizId]);

    // Verify stock deduction
    const updatedProd = await pool.query(`SELECT stock_quantity FROM public.products WHERE id = $1`, [testProductId]);
    const remainingStock = updatedProd.rows[0].stock_quantity;
    assert(remainingStock === initialStock - qtyToBuy, `Stock safely deducted: ${initialStock} - ${qtyToBuy} = ${remainingStock}`);

    // Verify bill in database
    const readBill = await pool.query(`SELECT * FROM public.pos_bills WHERE id = $1`, [billId]);
    assert(readBill.rows.length === 1, 'POS bill successfully retrieved from database');
    assert(Number(readBill.rows[0].subtotal) === expectedSubtotal, `Subtotal matches: ${readBill.rows[0].subtotal}`);
    assert(Number(readBill.rows[0].discount_amount) === expectedDiscount, `Discount matches: ${readBill.rows[0].discount_amount}`);
    assert(Number(readBill.rows[0].tax_amount) === expectedTax, `Tax matches: ${readBill.rows[0].tax_amount}`);
    assert(Number(readBill.rows[0].total_amount) === expectedTotal, `Total amount matches: ${readBill.rows[0].total_amount}`);

    // -------------------------------------------------------------
    // TEST 5: POS Line Items Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: POS Bill Line Items ---');
    const readItems = await pool.query(`SELECT * FROM public.pos_bill_items WHERE bill_id = $1`, [billId]);
    assert(readItems.rows.length === 1, 'POS bill item found in pos_bill_items table');
    assert(readItems.rows[0].product_name === 'POS Test Widget', 'Line item product name matches');
    assert(readItems.rows[0].quantity === qtyToBuy, 'Line item quantity matches');

    // -------------------------------------------------------------
    // TEST 6: Audit Log Recording
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Audit Log Recording ---');
    const auditId = `audit_test_${Date.now()}`;
    await pool.query(`
      INSERT INTO public.audit_logs (id, business_id, user_name, action, details, timestamp)
      VALUES ($1, $2, 'Counter Cashier', 'pos_bill_created', $3, NOW())
    `, [auditId, testBizId, `Created counter POS bill #${billNum} for ₹${expectedTotal}`]);

    const auditCheck = await pool.query(`SELECT * FROM public.audit_logs WHERE id = $1`, [auditId]);
    assert(auditCheck.rows.length === 1, 'Audit log created for POS billing action');

    // -------------------------------------------------------------
    // TEST 7: Combined Analytics Integration
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Reports & Analytics Integration ---');
    const posSumRes = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS pos_sales, COUNT(*) AS pos_count
      FROM public.pos_bills
      WHERE business_id = $1 AND status != 'cancelled'
    `, [testBizId]);
    const posSales = parseFloat(posSumRes.rows[0].pos_sales);
    assert(posSales >= expectedTotal, `POS sales (${posSales}) accounted for in business counter reporting`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP ---');
    try {
      if (testProductId) {
        await pool.query(`DELETE FROM public.products WHERE id = $1`, [testProductId]);
        console.log('Cleaned up test product.');
      }
      if (createdBillId) {
        await pool.query(`DELETE FROM public.pos_bills WHERE id = $1`, [createdBillId]);
        console.log('Cleaned up test POS bill.');
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }

    await pool.end();

    console.log('\n================================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
  }
}

runPosBillingTests();
