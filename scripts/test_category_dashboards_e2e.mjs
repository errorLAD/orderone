import http from 'http';

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (body) {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING CATEGORY DASHBOARD & REAL SAAS E2E TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();

    // ----------------------------------------------------
    // TEST 1: Register Restaurant Business
    // ----------------------------------------------------
    console.log('--- TEST 1: Register Restaurant Business (/api/auth/register-business) ---');
    const restEmail = `test_chef_${timestamp}@saas.local`;
    const restReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Royal Rasoi Restaurant ${timestamp}`,
      category: 'restaurant',
      ownerName: 'Chef Sanjay Kapoor',
      email: restEmail,
      phone: '+91 98111 22233',
      address: 'Shop 14, Connaught Place, New Delhi',
      password: 'RestaurantPass123!',
    });

    assert(restReg.status === 200, `Registration status 200 (got ${restReg.status})`);
    assert(restReg.data.success === true, 'Restaurant registration succeeded');
    assert(restReg.data.business.type === 'restaurant', `Business category is 'restaurant' (got ${restReg.data.business?.type})`);
    assert(restReg.data.business.settings.modules.menu === true, 'Restaurant has Menu module enabled');
    assert(restReg.headers['set-cookie'] !== undefined, 'HTTP-only auth session cookie set');

    const restBizId = restReg.data.business.id;

    // ----------------------------------------------------
    // TEST 2: Restaurant Menu Creation on Basic Plan (₹49/mo)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Restaurant Menu Creation on Basic Plan (₹49/mo) ---');
    const restCatRes = await makeRequest(`/api/categories?businessId=${restBizId}&sourceType=menu`);
    let restCatId = restCatRes.data.categories?.[0]?.id;
    if (!restCatId) {
      const createMenuCat = await makeRequest('/api/categories', { method: 'POST' }, {
        businessId: restBizId,
        sourceType: 'menu',
        name: 'Main Course & Specialties',
        slug: 'main-course',
        sortOrder: 1,
        isActive: true,
      });
      restCatId = createMenuCat.data.category.id;
    }

    const foodItemRes = await makeRequest('/api/products', { method: 'POST' }, {
      businessId: restBizId,
      categoryId: restCatId,
      sourceType: 'menu',
      name: 'Paneer Tikka Butter Masala',
      description: 'Charcoal grilled cottage cheese simmered in rich tomato makhani gravy',
      price: 260,
      unit: 'portion',
      isAvailable: true,
      sortOrder: 1,
    });
    assert(foodItemRes.status === 200, `Food item creation status 200 on Basic Plan (got ${foodItemRes.status})`);
    assert(foodItemRes.data.success === true, 'Food menu item created successfully on Basic Plan');
    assert(foodItemRes.data.product.sourceType === 'menu', 'Product is menu sourceType');

    // ----------------------------------------------------
    // TEST 3: Register Hardware Business
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Register Hardware & Building Materials Business ---');
    const hardEmail = `test_hardware_${timestamp}@saas.local`;
    const hardReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Ultra Builders Hardware & Cement ${timestamp}`,
      category: 'hardware',
      ownerName: 'Sunil Aggarwal',
      email: hardEmail,
      phone: '+91 98444 55566',
      address: 'Plot 45, Industrial Hardware Corridor, Gurugram',
      password: 'HardwarePass123!',
    });

    assert(hardReg.status === 200, `Hardware registration status 200 (got ${hardReg.status})`);
    assert(hardReg.data.success === true, 'Hardware registration succeeded');
    assert(hardReg.data.business.type === 'hardware', `Business category is 'hardware' (got ${hardReg.data.business?.type})`);
    assert(hardReg.data.business.settings.modules.store === true, 'Hardware has Store module enabled');

    const hardBizId = hardReg.data.business.id;

    // ----------------------------------------------------
    // TEST 4: Verify Server-Side Store Lock on Basic Plan
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Verify Store Module Lock on Basic Plan (₹49/mo) ---');
    const hardCatRes = await makeRequest(`/api/categories?businessId=${hardBizId}&sourceType=store`);
    let hardCatId = hardCatRes.data.categories?.[0]?.id;
    if (!hardCatId) {
      const createStoreCat = await makeRequest('/api/categories', { method: 'POST' }, {
        businessId: hardBizId,
        sourceType: 'store',
        name: 'Cement & Building Materials',
        slug: 'cement-building-materials',
        sortOrder: 1,
        isActive: true,
      });
      hardCatId = createStoreCat.data.category.id;
    }

    const lockedStoreAttempt = await makeRequest('/api/products', { method: 'POST' }, {
      businessId: hardBizId,
      categoryId: hardCatId,
      sourceType: 'store',
      name: 'UltraTech Cement 50kg',
      price: 395,
      brand: 'UltraTech',
      unit: 'bag',
    });
    assert(lockedStoreAttempt.status === 400, `Locked attempt returned 400 status (got ${lockedStoreAttempt.status})`);
    assert(lockedStoreAttempt.data.error.includes('Gold'), `Error explains Gold plan requirement (got: "${lockedStoreAttempt.data.error}")`);

    // ----------------------------------------------------
    // TEST 5: Upgrade Hardware Business to Gold Plan (₹149/mo)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Upgrade Hardware Business to Gold Plan (₹149/mo) ---');
    const upgradeRes = await makeRequest('/api/subscriptions', { method: 'POST' }, {
      businessId: hardBizId,
      planId: 'plan_gold',
      billingCycle: 'monthly',
    });
    assert(upgradeRes.status === 200, `Upgrade status 200 (got ${upgradeRes.status})`);
    assert(upgradeRes.data.success === true, 'Subscription upgraded to Gold');
    assert(upgradeRes.data.subscription.planId === 'plan_gold', 'Plan ID is now plan_gold');

    // ----------------------------------------------------
    // TEST 6: Create Hardware Products with Brand, Unit & MinOrderQty
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Create Hardware Products on Gold Plan with Brand & Unit ---');
    const cementRes = await makeRequest('/api/products', { method: 'POST' }, {
      businessId: hardBizId,
      categoryId: hardCatId,
      sourceType: 'store',
      name: 'UltraTech OPC 53 Grade Cement (50kg Bag)',
      description: 'OPC 53 grade high-strength construction cement for RCC slab and pillar work',
      price: 395,
      brand: 'UltraTech',
      unit: 'bag',
      minOrderQty: 20,
      stockQuantity: 150,
      isAvailable: true,
      sortOrder: 1,
    });
    assert(cementRes.status === 200, `Cement product created status 200 (got ${cementRes.status})`);
    assert(cementRes.data.success === true, 'Cement product saved to database');
    assert(cementRes.data.product.brand === 'UltraTech', `Brand is UltraTech (got ${cementRes.data.product?.brand})`);
    assert(cementRes.data.product.unit === 'bag', `Unit is bag (got ${cementRes.data.product?.unit})`);
    assert(cementRes.data.product.minOrderQty === 20, `MinOrderQty is 20 (got ${cementRes.data.product?.minOrderQty})`);

    const steelRes = await makeRequest('/api/products', { method: 'POST' }, {
      businessId: hardBizId,
      categoryId: hardCatId,
      sourceType: 'store',
      name: 'Tata Tiscon 12mm TMT Rebars (12 Metre)',
      description: 'Fe 550D grade high ductility earthquake resistant rebar',
      price: 585,
      brand: 'Tata Tiscon',
      unit: 'piece',
      minOrderQty: 10,
      stockQuantity: 80,
      isAvailable: true,
      sortOrder: 2,
    });
    assert(steelRes.status === 200, `Steel product created status 200 (got ${steelRes.status})`);
    assert(steelRes.data.product.brand === 'Tata Tiscon', 'Brand is Tata Tiscon');
    assert(steelRes.data.product.unit === 'piece', 'Unit is piece');

    // ----------------------------------------------------
    // TEST 7: Fetch Hardware Catalog & Verify Database Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Fetch Hardware Catalog & Verify Database Schema ---');
    const prodList = await makeRequest(`/api/products?businessId=${hardBizId}&sourceType=store`);
    assert(prodList.status === 200, `Products fetch status 200 (got ${prodList.status})`);
    assert(prodList.data.success === true, 'Products API returned success');
    assert(prodList.data.products.length >= 2, `Created 2 hardware items (got ${prodList.data.products.length})`);

    const cementItem = prodList.data.products.find((p) => p.name.includes('Cement'));
    assert(cementItem !== undefined, 'Found UltraTech Cement product');
    if (cementItem) {
      assert(cementItem.unit === 'bag', `Unit is 'bag' (got ${cementItem.unit})`);
      assert(cementItem.brand === 'UltraTech', `Brand is 'UltraTech' (got ${cementItem.brand})`);
      assert(cementItem.minOrderQty === 20, `MinOrderQty is 20 (got ${cementItem.minOrderQty})`);
      assert(cementItem.stockQuantity === 150, `Stock is 150 (got ${cementItem.stockQuantity})`);
    }

    // ----------------------------------------------------
    // TEST 8: Sign In Existing Owner Direct to Category Dashboard
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Sign In with Existing Hardware Owner ---');
    const loginRes = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: hardEmail,
      password: 'HardwarePass123!',
    });

    assert(loginRes.status === 200, `Login status 200 (got ${loginRes.status})`);
    assert(loginRes.data.success === true, 'Login successful');
    assert(loginRes.data.user.email === hardEmail, 'User authenticated with real Supabase credentials');

    const userBizRes = await makeRequest(`/api/businesses?id=${loginRes.data.user.businessId}`);
    assert(userBizRes.status === 200, `Business fetch status 200 (got ${userBizRes.status})`);
    assert(userBizRes.data.business.type === 'hardware', 'Business correctly loaded with type "hardware"');

    // ----------------------------------------------------
    // TEST 9: Real Analytics Endpoint (No Fake/Demo Fallbacks)
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Live Analytics Endpoint Verification ---');
    const analyticsRes = await makeRequest(`/api/analytics?businessId=${hardBizId}&scope=all&range=today`);
    assert(analyticsRes.status === 200, `Analytics status 200 (got ${analyticsRes.status})`);
    assert(analyticsRes.data.success === true, 'Analytics returned real data');
    assert(typeof analyticsRes.data.analytics.kpi.todayOrderValue === 'number', 'Order value is a real number');
    assert(analyticsRes.data.analytics.recentOrders.length === 0, 'Zero demo orders present in clean new business');

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
