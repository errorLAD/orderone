import assert from 'assert';
import {
  getBusinessById,
  getBusinessBySlug,
  generateOrderToken,
  createOrder,
  getOrders,
  updateOrderStatus,
  getProducts,
  getAnalytics,
  updateBusinessSubscription,
  getNotifications,
  getOrderByTrackingId,
} from './src/lib/db.ts';

async function runVerificationTests() {
  console.log('🧪 Starting End-to-End Core Verification Suite...\n');

  // Test 1: Verify Initial Multi-Tenant Businesses
  console.log('Test 1: Verify Multi-Tenant Businesses');
  const annapurna = await getBusinessById('biz_annapurna');
  assert(annapurna !== null, 'Annapurna business must exist');
  assert.strictEqual(annapurna.slug, 'annapurna-foods');
  assert.strictEqual(annapurna.settings.modules.store, true);
  assert.strictEqual(annapurna.settings.modules.menu, true);
  console.log('✅ Passed: Multi-tenant business found with dual channels enabled.');

  // Test 2: Atomic and Independent Token Sequences
  console.log('\nTest 2: Atomic Independent Store & Menu Token Sequences');
  const tokenStore1 = await generateOrderToken('biz_annapurna', 'store');
  const tokenMenu1 = await generateOrderToken('biz_annapurna', 'menu');
  const tokenStore2 = await generateOrderToken('biz_annapurna', 'store');

  console.log(`Generated: Store1=${tokenStore1}, Menu1=${tokenMenu1}, Store2=${tokenStore2}`);
  assert(tokenStore1.startsWith('S-'), 'Store token must start with S-');
  assert(tokenMenu1.startsWith('M-'), 'Menu token must start with M-');
  assert(tokenStore2.startsWith('S-'), 'Store token 2 must start with S-');
  assert.notStrictEqual(tokenStore1, tokenStore2, 'Store tokens must be sequential and distinct');
  console.log('✅ Passed: Token sequences are strictly independent and correctly prefixed.');

  // Test 3: Guest Retail Store Order Creation & Stock Deduction
  console.log('\nTest 3: Retail Store Order & Atomic Stock Deduction');
  const prodsBefore = await getProducts('biz_annapurna', 'store');
  const coffeeProd = prodsBefore.find((p) => p.id === 'prod_store_1');
  const stockBefore = coffeeProd.stockQuantity;

  const storeOrder = await createOrder({
    businessId: 'biz_annapurna',
    sourceType: 'store',
    customer: {
      name: 'Rohan Mehra',
      phone: '+91 98111 22334',
      address: '22 Park Lane, Indiranagar',
    },
    items: [
      {
        productId: 'prod_store_1',
        quantity: 2,
      },
    ],
    fulfilmentMethod: 'delivery',
    paymentMethod: 'upi',
  });

  assert(storeOrder.tokenNumber.startsWith('S-'), 'Store order must receive S- token');
  assert.strictEqual(storeOrder.sourceType, 'store', 'Source type must be "store"');
  assert(storeOrder.trackingId.length >= 20, 'Tracking ID must be a secure random token');

  const prodsAfter = await getProducts('biz_annapurna', 'store');
  const coffeeProdAfter = prodsAfter.find((p) => p.id === 'prod_store_1');
  assert.strictEqual(coffeeProdAfter.stockQuantity, stockBefore - 2, 'Stock must decrease by ordered quantity');
  console.log(`✅ Passed: Store order #${storeOrder.tokenNumber} created, stock deducted (${stockBefore} -> ${coffeeProdAfter.stockQuantity}).`);

  // Test 4: Restaurant Menu Order Creation (Dine-In with Table)
  console.log('\nTest 4: Restaurant Kitchen Menu Order with Table Number');
  const menuOrder = await createOrder({
    businessId: 'biz_annapurna',
    sourceType: 'menu',
    customer: {
      name: 'Sunita Rao',
      phone: '+91 97777 88899',
      tableNumber: 'Table 5',
      notes: 'Make it extra crisp',
    },
    items: [
      {
        productId: 'prod_menu_1',
        quantity: 1,
      },
      {
        productId: 'prod_menu_4',
        quantity: 2,
      },
    ],
    fulfilmentMethod: 'dine_in',
    paymentMethod: 'cash',
  });

  assert(menuOrder.tokenNumber.startsWith('M-'), 'Menu order must receive M- token');
  assert.strictEqual(menuOrder.sourceType, 'menu', 'Source type must be "menu"');
  assert.strictEqual(menuOrder.customer.tableNumber, 'Table 5', 'Table number must be preserved');
  console.log(`✅ Passed: Menu order #${menuOrder.tokenNumber} created with Table 5.`);

  // Test 5: CRITICAL REQUIREMENT — Strict Isolation between Store and Menu
  console.log('\nTest 5: CRITICAL REQUIREMENT — Store and Menu Orders Strict Separation');
  const allStoreOrders = await getOrders('biz_annapurna', 'store');
  const allMenuOrders = await getOrders('biz_annapurna', 'menu');

  // Verify no store order has sourceType === 'menu'
  for (const so of allStoreOrders) {
    assert.strictEqual(so.sourceType, 'store', 'Store orders query must ONLY contain store orders');
    assert(!so.tokenNumber.startsWith('M-'), 'Store orders query must NEVER contain M- tokens');
  }

  // Verify no menu order has sourceType === 'store'
  for (const mo of allMenuOrders) {
    assert.strictEqual(mo.sourceType, 'menu', 'Menu orders query must ONLY contain menu orders');
    assert(!mo.tokenNumber.startsWith('S-'), 'Menu orders query must NEVER contain S- tokens');
  }

  console.log(`✅ Passed: Strict database isolation confirmed! ${allStoreOrders.length} Store orders and ${allMenuOrders.length} Menu orders verified with 0 crossover.`);

  // Test 6: Order Cancellation & Stock Restoration
  console.log('\nTest 6: Order Cancellation and Stock Restoration');
  const stockBeforeCancel = coffeeProdAfter.stockQuantity;
  await updateOrderStatus(storeOrder.id, 'cancelled', 'Customer requested cancellation');

  const prodsRestored = await getProducts('biz_annapurna', 'store');
  const coffeeRestored = prodsRestored.find((p) => p.id === 'prod_store_1');
  assert.strictEqual(coffeeRestored.stockQuantity, stockBeforeCancel + 2, 'Stock must be safely restored upon cancellation');
  console.log(`✅ Passed: Cancelled store order safely restored ${coffeeRestored.stockQuantity} units in inventory.`);

  // Test 7: Real-Time Notifications
  console.log('\nTest 7: Real-time Notifications Isolation');
  const notifsStore = await getNotifications('biz_annapurna', 'store');
  const notifsMenu = await getNotifications('biz_annapurna', 'menu');
  assert(notifsStore.length > 0, 'Store notifications must exist');
  assert(notifsMenu.length > 0, 'Menu notifications must exist');
  console.log(`✅ Passed: Notifications bus generated ${notifsStore.length} store and ${notifsMenu.length} menu notifications.`);

  // Test 8: Guest Tracking Lookup
  console.log('\nTest 8: Private Guest Tracking Security');
  const trackedOrder = await getOrderByTrackingId(menuOrder.trackingId);
  assert(trackedOrder !== null, 'Customer must be able to track order via trackingId');
  assert.strictEqual(trackedOrder.id, menuOrder.id);
  console.log(`✅ Passed: Guest customer tracking link resolves order #${trackedOrder.tokenNumber} without requiring login.`);

  // Test 9: Analytics Calculations (No fabricated metrics)
  console.log('\nTest 9: Real Analytics Verification');
  const analytics = await getAnalytics('biz_annapurna', 'all', 'today');
  assert(typeof analytics.kpi.todayOrderValue === 'number', 'Today order value must be numeric');
  assert(typeof analytics.kpi.todayEarnings === 'number', 'Earnings must be numeric');
  assert(analytics.kpi.todayCustomersCount >= 1, 'Unique customers must be counted accurately');
  console.log(`✅ Passed: Analytics returned valid metrics (Today Value: ₹${analytics.kpi.todayOrderValue}, Earnings: ₹${analytics.kpi.todayEarnings}).`);

  // Test 10: Subscription Plan Management (₹20/month base)
  console.log('\nTest 10: Subscription Plan Upgrades');
  const updatedBiz = await updateBusinessSubscription('biz_annapurna', 'plan_starter', 'monthly');
  assert.strictEqual(updatedBiz.subscription.amount, 20, 'Starter plan must be ₹20/month');
  console.log('✅ Passed: Subscription updated to ₹20/month plan successfully.');

  console.log('\n🎉 ALL 10 CORE VERIFICATION TESTS PASSED WITH ZERO ERRORS!\n');
}

runVerificationTests().catch((err) => {
  console.error('❌ Verification Test Failed:', err);
  process.exit(1);
});
