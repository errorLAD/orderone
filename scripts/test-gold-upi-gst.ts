import { getBusinessById, saveBusinessUpiSettings, createOrder, getOrderById } from '../src/lib/db';
import { calculateOrderTax, validateGstin, generateInvoiceNumber } from '../src/lib/gstCalculator';
import { buildUpiPaymentUri, generateUpiPaymentQrDataUrl } from '../src/lib/upiQr';
import { getPgPool } from '../src/lib/postgres';

async function runTests() {
  console.log('=====================================================');
  console.log('STARTING GOLD UPI, DYNAMIC QR & GST VERIFICATION TEST');
  console.log('=====================================================');

  const pool = getPgPool();
  const basicBizId = 'biz_5o3yrnr_mvq8u007'; // Sri Ram Krishna Traders (Basic Plan)
  const goldBizId = 'biz_annapurna';        // Annapurna Cafe & Retail (Gold Plan)

  // ----------------------------------------------------------------
  // TEST 1: Basic Plan Access Enforcement (No UPI, No GST, No QR)
  // ----------------------------------------------------------------
  console.log('\n[TEST 1] Testing Basic Plan restrictions on UPI and GST...');
  const basicBiz = await getBusinessById(basicBizId);
  console.log('Basic Business Plan:', basicBiz?.subscription?.planId);

  let blockedUpi = false;
  try {
    await saveBusinessUpiSettings(basicBizId, {
      upiId: 'basic.owner@upi',
      payeeName: 'Sri Ram Krishna Traders',
      isEnabled: true,
    });
  } catch (err: any) {
    if (err.message.includes('requires the Gold subscription plan')) {
      blockedUpi = true;
      console.log('✓ PASS: Basic subscriber blocked from saving UPI settings with message:');
      console.log('  ', err.message);
    } else {
      throw err;
    }
  }

  if (!blockedUpi) {
    throw new Error('Basic plan subscriber was NOT blocked from saving UPI settings!');
  }

  // Verify Basic subscriber gets 0 tax even if GST was somehow left enabled
  const basicTaxCalc = calculateOrderTax({
    subtotal: 500,
    deliveryFee: 0,
    gstSettings: {
      isGstRegistered: true,
      gstin: '29AAAAA0000A1Z5',
      legalBusinessName: 'Sri Ram Krishna Traders',
      defaultGstRate: 18,
      pricesIncludeGst: false,
    },
    isGoldSubscriber: false, // Server checks plan: false for Basic
  });

  if (basicTaxCalc.totalTax !== 0 || basicTaxCalc.isGstApplicable !== false) {
    throw new Error(`Basic subscriber should have 0 tax, got ${basicTaxCalc.totalTax}`);
  }
  console.log('✓ PASS: Server enforces GST calculation is 0 for Basic subscribers.');

  // ----------------------------------------------------------------
  // TEST 2: Gold Plan UPI Configuration & Public Store URL
  // ----------------------------------------------------------------
  console.log('\n[TEST 2] Testing Gold Plan UPI Settings & Store URL persistence...');
  const goldBiz = await getBusinessById(goldBizId);
  console.log('Gold Business Plan:', goldBiz?.subscription?.planId);

  const testStoreUrl = `https://orderone.in/store/${goldBiz?.slug}`;
  const savedUpi = await saveBusinessUpiSettings(goldBizId, {
    upiId: 'annapurna.cafe@okaxis',
    payeeName: 'Annapurna Cafe & Retail',
    storeUrl: testStoreUrl,
    instructions: 'Please mention your Token Number in transaction remarks.',
    isEnabled: true,
  });

  if (savedUpi.upiId !== 'annapurna.cafe@okaxis' || savedUpi.storeUrl !== testStoreUrl) {
    throw new Error('Failed to save UPI settings for Gold business');
  }
  console.log('✓ PASS: Gold subscriber saved UPI settings successfully:');
  console.log('  UPI ID:', savedUpi.upiId);
  console.log('  Payee Name:', savedUpi.payeeName);
  console.log('  Store URL:', savedUpi.storeUrl);

  // ----------------------------------------------------------------
  // TEST 3: Dynamic UPI Payment URI & QR Code Generation
  // ----------------------------------------------------------------
  console.log('\n[TEST 3] Testing dynamic UPI URI parameter encoding & QR generation...');
  const upiUri = buildUpiPaymentUri({
    upiId: 'annapurna.cafe@okaxis',
    payeeName: 'Annapurna Cafe & Store',
    amount: 345.50,
    orderReference: 'S-00105',
    transactionNote: 'Order S-00105 Annapurna',
    currency: 'INR',
  });

  console.log('Generated UPI URI:', upiUri);
  if (!upiUri.startsWith('upi://pay?')) {
    throw new Error('URI does not start with upi://pay?');
  }

  const parsedUrl = new URL(upiUri.replace('upi://pay', 'http://localhost'));
  if (parsedUrl.searchParams.get('pa') !== 'annapurna.cafe@okaxis') throw new Error('pa mismatch');
  if (parsedUrl.searchParams.get('pn') !== 'Annapurna Cafe & Store') throw new Error('pn mismatch');
  if (parsedUrl.searchParams.get('am') !== '345.50') throw new Error('am mismatch');
  if (parsedUrl.searchParams.get('cu') !== 'INR') throw new Error('cu mismatch');
  if (parsedUrl.searchParams.get('tn') !== 'S-00105') throw new Error('tn mismatch');

  const { qrDataUrl } = await generateUpiPaymentQrDataUrl({
    upiId: 'annapurna.cafe@okaxis',
    payeeName: 'Annapurna Cafe & Store',
    amount: 345.50,
    orderReference: 'S-00105',
  });

  if (!qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid QR Data URL generated');
  }
  console.log('✓ PASS: Dynamic payment URI parameters safely encoded and QR code generated.');

  // ----------------------------------------------------------------
  // TEST 4: GSTIN Format Validation
  // ----------------------------------------------------------------
  console.log('\n[TEST 4] Testing GSTIN format validation...');
  const validGstinResult = validateGstin('29AAAAA0000A1Z5');
  if (!validGstinResult.isValid) throw new Error('Valid GSTIN failed validation');

  const invalidGstinResult = validateGstin('INVALID123');
  if (invalidGstinResult.isValid) throw new Error('Invalid GSTIN passed validation');
  console.log('✓ PASS: GSTIN regex format validation working as expected.');

  // ----------------------------------------------------------------
  // TEST 5: GST Tax Calculations (Inclusive vs Exclusive)
  // ----------------------------------------------------------------
  console.log('\n[TEST 5] Testing GST calculations...');
  // Case A: Exclusive 18% on ₹1,000 subtotal
  const exclusiveCalc = calculateOrderTax({
    subtotal: 1000,
    deliveryFee: 50,
    gstSettings: {
      isGstRegistered: true,
      gstin: '29AAAAA0000A1Z5',
      legalBusinessName: 'Annapurna Foods Pvt Ltd',
      defaultGstRate: 18,
      pricesIncludeGst: false,
    },
    isGoldSubscriber: true,
  });

  if (exclusiveCalc.taxableAmount !== 1000) throw new Error('Exclusive taxableAmount mismatch');
  if (exclusiveCalc.gstAmount !== 180) throw new Error('Exclusive gstAmount mismatch');
  if (exclusiveCalc.cgst !== 90 || exclusiveCalc.sgst !== 90) throw new Error('Exclusive CGST/SGST split mismatch');
  if (exclusiveCalc.finalTotal !== 1230) throw new Error('Exclusive finalTotal mismatch');
  console.log('✓ PASS: Exclusive tax calculation: ₹1,000 + 18% (₹90 CGST + ₹90 SGST) + ₹50 delivery = ₹1,230 total.');

  // Case B: Inclusive 18% on ₹1,180 subtotal (MRP inclusive, avoid double taxation)
  const inclusiveCalc = calculateOrderTax({
    subtotal: 1180,
    deliveryFee: 50,
    gstSettings: {
      isGstRegistered: true,
      gstin: '29AAAAA0000A1Z5',
      legalBusinessName: 'Annapurna Foods Pvt Ltd',
      defaultGstRate: 18,
      pricesIncludeGst: true,
    },
    isGoldSubscriber: true,
  });

  if (inclusiveCalc.taxableAmount !== 1000) throw new Error(`Inclusive taxableAmount mismatch: got ${inclusiveCalc.taxableAmount}`);
  if (inclusiveCalc.gstAmount !== 180) throw new Error(`Inclusive gstAmount mismatch: got ${inclusiveCalc.gstAmount}`);
  if (inclusiveCalc.cgst !== 90 || inclusiveCalc.sgst !== 90) throw new Error('Inclusive CGST/SGST split mismatch');
  if (inclusiveCalc.finalTotal !== 1230) throw new Error(`Inclusive finalTotal mismatch: got ${inclusiveCalc.finalTotal}`);
  console.log('✓ PASS: Inclusive tax calculation: Subtotal ₹1,180 extracts ₹180 GST (₹90 CGST + ₹90 SGST) without double taxation.');

  // ----------------------------------------------------------------
  // TEST 6: Real Order Creation with Tax Breakdown & Pending Verification
  // ----------------------------------------------------------------
  console.log('\n[TEST 6] Testing real order creation with GST breakdown and pending verification status...');
  // Find a product for annapurna foods
  const prodRes = await pool.query('SELECT id, price FROM products WHERE business_id = $1 LIMIT 1', [goldBizId]);
  if (prodRes.rows.length === 0) throw new Error('No products found for gold business');
  const testProd = prodRes.rows[0];

  const order = await createOrder({
    businessId: goldBizId,
    sourceType: 'store',
    customer: { name: 'GST Test Customer', phone: '9876543210' },
    items: [{ productId: testProd.id, quantity: 1 }],
    fulfilmentMethod: 'pickup',
    paymentMethod: 'upi',
  });

  console.log('Created Order ID:', order.id);
  console.log('Token Number:', order.tokenNumber);
  console.log('Invoice Number:', order.invoiceNumber);
  console.log('Payment Status:', order.paymentStatus);
  console.log('Tax Breakdown:', order.taxBreakdown);

  // Critical requirement verification:
  if (order.paymentStatus !== 'pending_verification') {
    throw new Error(`Expected paymentStatus 'pending_verification', got '${order.paymentStatus}'`);
  }
  console.log('✓ PASS: Order created with paymentStatus = "pending_verification" (NEVER automatically marked paid).');

  if (!order.invoiceNumber) {
    throw new Error('Order missing invoiceNumber');
  }
  console.log('✓ PASS: Order assigned structured invoiceNumber:', order.invoiceNumber);

  // Read back from database to verify persistence
  const orderDb = await getOrderById(order.id);
  if (!orderDb?.taxBreakdown || !orderDb.invoiceNumber) {
    throw new Error('Database did not return taxBreakdown or invoiceNumber');
  }
  console.log('✓ PASS: Database returned persisted tax_breakdown and invoice_number.');

  // Clean up test order
  await pool.query('DELETE FROM orders WHERE id = $1', [order.id]);
  await pool.query('DELETE FROM queue_tokens WHERE order_id = $1', [order.id]);
  await pool.query('DELETE FROM notifications WHERE order_id = $1', [order.id]);
  console.log('Cleaned up test order.');

  console.log('\n=====================================================');
  console.log('ALL GOLD UPI, DYNAMIC QR & GST VERIFICATIONS PASSED!');
  console.log('=====================================================');
  await pool.end();
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
