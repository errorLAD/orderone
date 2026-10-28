async function runGstTests() {
  console.log('=== STARTING GST PERMISSION & DISPLAY TESTS ===');
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

  const BASE_URL = 'http://localhost:3000';
  const BIZ_ID = 'biz_annapurna';

  // 1. First, fetch products of Annapurna
  const prodRes = await fetch(`${BASE_URL}/api/products?businessId=${BIZ_ID}&sourceType=store`);
  const prodData = await prodRes.json();
  assert(prodData.products && prodData.products.length > 0, 'Fetched active products for testing');
  const testProduct = prodData.products[0];

  // 2. Disable GST for biz_annapurna in settings
  try {
    const disableRes = await fetch(`${BASE_URL}/api/businesses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: BIZ_ID,
        settings: {
          modules: { store: true, menu: true },
          orderSettings: {
            minStoreOrder: 50,
            enableGst: false,
            taxRatePercentage: 0,
            currencySymbol: '₹',
            currencyCode: 'INR',
            enableDelivery: true,
            deliveryFee: 30,
            enableTakeaway: true,
            enableDineIn: true,
            autoAcceptOrders: false,
          },
          tokenPrefixStore: 'S-',
          tokenPrefixMenu: 'M-',
          operatingHours: '08:00 AM - 10:30 PM (Daily)',
        },
      }),
    });
    const disableData = await disableRes.json();
    assert(disableData.success, 'Successfully disabled GST in store settings');
    assert(disableData.business.settings.orderSettings.enableGst === false, 'enableGst is false');
    assert(disableData.business.settings.orderSettings.taxRatePercentage === 0, 'taxRatePercentage is 0');

    // Place an order with GST disabled
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BIZ_ID,
        sourceType: 'store',
        fulfilmentMethod: 'pickup',
        customer: { name: 'Customer Without GST', phone: '+91 99999 88888' },
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });
    const orderData = await orderRes.json();
    assert(orderData.success, 'Order placed successfully when GST is disabled');

    // Verify order tracking
    const trackRes = await fetch(`${BASE_URL}/api/orders/track/${orderData.order.trackingId}`);
    const trackData = await trackRes.json();
    assert(trackData.order.tax === 0, `Order tax is 0 when store has no GST permission (actual: ${trackData.order.tax})`);
    assert(trackData.order.total === trackData.order.subtotal, 'Total equals subtotal exactly (no GST added)');
  } catch (err) {
    assert(false, `Test 1 (GST Disabled) failed with error: ${err.message}`);
  }

  // 3. Now grant permission and Enable GST with 5% and GSTIN
  try {
    const enableRes = await fetch(`${BASE_URL}/api/businesses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: BIZ_ID,
        settings: {
          modules: { store: true, menu: true },
          orderSettings: {
            minStoreOrder: 50,
            enableGst: true,
            gstin: '29AAAAA0000A1Z5',
            taxRatePercentage: 5,
            currencySymbol: '₹',
            currencyCode: 'INR',
            enableDelivery: true,
            deliveryFee: 30,
            enableTakeaway: true,
            enableDineIn: true,
            autoAcceptOrders: false,
          },
          tokenPrefixStore: 'S-',
          tokenPrefixMenu: 'M-',
          operatingHours: '08:00 AM - 10:30 PM (Daily)',
        },
      }),
    });
    const enableData = await enableRes.json();
    assert(enableData.success, 'Successfully enabled GST in store settings');
    assert(enableData.business.settings.orderSettings.enableGst === true, 'enableGst is true');
    assert(enableData.business.settings.orderSettings.taxRatePercentage === 5, 'taxRatePercentage is 5');
    assert(enableData.business.settings.orderSettings.gstin === '29AAAAA0000A1Z5', 'GSTIN recorded');

    // Place an order with GST enabled
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BIZ_ID,
        sourceType: 'store',
        fulfilmentMethod: 'pickup',
        customer: { name: 'Customer With GST', phone: '+91 99999 77777' },
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    });
    const orderData = await orderRes.json();
    assert(orderData.success, 'Order placed successfully with GST enabled');

    const trackRes = await fetch(`${BASE_URL}/api/orders/track/${orderData.order.trackingId}`);
    const trackData = await trackRes.json();
    const expectedTax = Number(((trackData.order.subtotal * 5) / 100).toFixed(2));
    assert(trackData.order.tax === expectedTax, `Order tax is calculated at 5% GST (expected: ${expectedTax}, actual: ${trackData.order.tax})`);
    assert(trackData.order.total === Number((trackData.order.subtotal + expectedTax).toFixed(2)), 'Total equals subtotal + GST');
  } catch (err) {
    assert(false, `Test 2 (GST Enabled) failed with error: ${err.message}`);
  }

  // 4. Verify Public Storefront Data
  try {
    const bizRes = await fetch(`${BASE_URL}/api/businesses?slug=annapurna-foods`);
    const bizData = await bizRes.json();
    assert(bizData.business.settings.orderSettings.enableGst === true, 'Storefront reflects active GST setting');
    assert(bizData.business.settings.orderSettings.gstin === '29AAAAA0000A1Z5', 'Storefront reflects active GSTIN');
  } catch (err) {
    assert(false, `Test 3 (Storefront Check) failed with error: ${err.message}`);
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runGstTests();
