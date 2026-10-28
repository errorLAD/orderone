import http from 'http';
import { getCategoryConfig, normalizeCategoryKey } from '../src/lib/categories.js';

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, options = {}, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (cookie) {
      reqOptions.headers['Cookie'] = cookie;
    }

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

function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(';')[0];
}

async function runTests() {
  console.log('================================================================');
  console.log('🛠️ TESTING CATEGORY ONBOARDING ROOT CAUSE FIX & TEMPLATES E2E');
  console.log('================================================================\n');

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

    // -----------------------------------------------------------------
    // TEST 1: CATEGORY NORMALIZATION RESILIENCY
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Category Normalization Resiliency ---');
    assert(normalizeCategoryKey('hardware_building_materials') === 'hardware', 'hardware_building_materials -> hardware');
    assert(normalizeCategoryKey('Hardware & Building Materials') === 'hardware', 'Hardware & Building Materials -> hardware');
    assert(normalizeCategoryKey('retail_shop') === 'retail', 'retail_shop -> retail');
    assert(normalizeCategoryKey('grocery_kirana') === 'grocery', 'grocery_kirana -> grocery');
    assert(normalizeCategoryKey('bakery_pastry') === 'bakery', 'bakery_pastry -> bakery');
    assert(normalizeCategoryKey('cafe_coffee_bar') === 'cafe', 'cafe_coffee_bar -> cafe');
    assert(normalizeCategoryKey('restaurant') === 'restaurant', 'restaurant -> restaurant');

    // -----------------------------------------------------------------
    // TEST 2: HARDWARE & BUILDING MATERIALS ONBOARDING TEMPLATES
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Register Hardware Business & Verify Starter Templates ---');
    const hardEmail = `test_hw_user_${timestamp}@saas.local`;
    const hardReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Shree Balaji Building Materials & Steel ${timestamp}`,
      category: 'hardware_building_materials',
      ownerName: 'Vipin Aggarwal',
      email: hardEmail,
      phone: '+91 99888 77665',
      address: 'Plot 12, Heavy Material Yard, Ring Road, Jaipur',
      password: 'HardwareSafe123!',
    });

    assert(hardReg.status === 200, `Registration status 200 (got ${hardReg.status})`);
    assert(hardReg.data.success === true, 'Registration succeeded');
    assert(hardReg.data.business.type === 'hardware', `Business category normalized to 'hardware' (got ${hardReg.data.business?.type})`);

    const hardCookie = extractCookie(hardReg);
    assert(hardCookie !== null, 'Received valid session cookie for hardware owner');

    // Verify /api/auth/me returns this exact hardware business
    const meRes = await makeRequest('/api/auth/me', {}, null, hardCookie);
    assert(meRes.status === 200, `Auth/me status 200 (got ${meRes.status})`);
    assert(meRes.data.business !== null, 'Auth/me returned business object');
    assert(meRes.data.business.id === hardReg.data.business.id, 'Auth/me returned user business ID');
    assert(meRes.data.business.type === 'hardware', 'Auth/me confirmed business type is hardware (NOT cafe!)');

    // Verify Hardware Config & Templates
    const hwConfig = getCategoryConfig(meRes.data.business.type);
    assert(hwConfig.id === 'hardware', 'Config ID is hardware');
    assert(hwConfig.primaryModule === 'store', 'Primary module is store');

    // Check all 8 required material types are present
    const itemNames = hwConfig.starterItems.map((i) => i.name.toLowerCase());
    const hasCement = itemNames.some((n) => n.includes('cement'));
    const hasSteel = itemNames.some((n) => n.includes('tmt') || n.includes('rebar') || n.includes('steel'));
    const hasPvc = itemNames.some((n) => n.includes('pvc') || n.includes('pipe'));
    const hasElec = itemNames.some((n) => n.includes('switch') || n.includes('socket') || n.includes('modular'));
    const hasPlumb = itemNames.some((n) => n.includes('plumbing') || n.includes('elbow') || n.includes('valve'));
    const hasPaint = itemNames.some((n) => n.includes('paint') || n.includes('emulsion'));
    const hasTools = itemNames.some((n) => n.includes('drill') || n.includes('tool'));
    const hasMaterials = itemNames.some((n) => n.includes('sand') || n.includes('aggregate') || n.includes('concrete'));

    assert(hasCement, 'Template includes Cement');
    assert(hasSteel, 'Template includes Steel / TMT rebars');
    assert(hasPvc, 'Template includes PVC pipes & fittings');
    assert(hasElec, 'Template includes Electrical switches & sockets');
    assert(hasPlumb, 'Template includes Plumbing materials');
    assert(hasPaint, 'Template includes Paint & accessories');
    assert(hasTools, 'Template includes Hand / Power tools');
    assert(hasMaterials, 'Template includes Building materials / Aggregates');

    // CRITICAL ACCEPTANCE CHECK: Must NEVER contain Cappuccino, Latte, Toast, etc.
    const hasCappuccino = itemNames.some((n) => n.includes('cappuccino') || n.includes('latte') || n.includes('chai') || n.includes('toast'));
    assert(!hasCappuccino, 'CRITICAL ACCEPTANCE: Hardware templates DO NOT contain Cappuccino, Latte, Chai, or Toast');

    // -----------------------------------------------------------------
    // TEST 3: SAVE HARDWARE TEMPLATES IN DATABASE VIA ONBOARDING FLOW
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Save Selected Hardware Templates & Preferences ---');
    // Save selected hardware items
    const catList = await makeRequest(`/api/categories?businessId=${hardReg.data.business.id}&sourceType=store`, {}, null, hardCookie);
    const catId = catList.data.categories?.[0]?.id;
    assert(catId !== undefined, 'Found or auto-created category for hardware business');

    const cementItem = hwConfig.starterItems.find((i) => i.name.includes('Cement'));
    const steelItem = hwConfig.starterItems.find((i) => i.name.includes('TMT'));

    const saveCement = await makeRequest('/api/products', { method: 'POST' }, {
      businessId: hardReg.data.business.id,
      categoryId: catId,
      sourceType: 'store',
      name: cementItem.name,
      description: cementItem.description,
      price: cementItem.price,
      brand: cementItem.brand,
      unit: cementItem.unit,
      sku: cementItem.sku,
      stockQuantity: cementItem.stockQuantity,
      isAvailable: true,
    }, hardCookie);

    assert(saveCement.status === 200, `Saved cement product (got status ${saveCement.status})`);
    assert(saveCement.data.product.brand === 'UltraTech', 'Persisted brand: UltraTech');
    assert(saveCement.data.product.unit === 'bag', 'Persisted unit: bag');
    assert(saveCement.data.product.sku === 'CEM-ULT-50KG', 'Persisted SKU: CEM-ULT-50KG');

    // -----------------------------------------------------------------
    // TEST 4: PAGE REFRESH & SESSION RESUME PRESERVATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Verify Page Refresh & Incomplete Onboarding Resume ---');
    // Simulate user refreshing browser by calling /api/auth/me with the same session cookie
    const refreshMe = await makeRequest('/api/auth/me', {}, null, hardCookie);
    assert(refreshMe.status === 200, 'Page refresh returned 200');
    assert(refreshMe.data.business.id === hardReg.data.business.id, 'Preserved same business after refresh');
    assert(refreshMe.data.business.type === 'hardware', 'Preserved category "hardware" after refresh (NOT Annapurna Cafe)');

    // -----------------------------------------------------------------
    // TEST 5: RESTAURANT CATEGORY VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Register Restaurant Business & Verify Starter Menu ---');
    const restEmail = `test_rest_user_${timestamp}@saas.local`;
    const restReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Pind Punjab Heritage Dhaba ${timestamp}`,
      category: 'restaurant',
      ownerName: 'Harpreet Singh',
      email: restEmail,
      phone: '+91 97777 66554',
      address: 'GT Road Highway Mile 42, Karnal',
      password: 'RestPassword123!',
    });

    assert(restReg.status === 200, `Restaurant registration status 200`);
    assert(restReg.data.business.type === 'restaurant', 'Business category is restaurant');
    const restConfig = getCategoryConfig(restReg.data.business.type);
    assert(restConfig.primaryModule === 'menu', 'Restaurant primary module is menu');
    assert(restConfig.starterItems.some((i) => i.name.includes('Paneer')), 'Restaurant template includes Paneer');
    assert(restConfig.starterItems.some((i) => i.name.includes('Roti')), 'Restaurant template includes Roti');

    // -----------------------------------------------------------------
    // TEST 6: GROCERY / KIRANA CATEGORY VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Register Grocery / Kirana Business & Verify Products ---');
    const grocEmail = `test_groc_user_${timestamp}@saas.local`;
    const grocReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Mahalaxmi Kirana Store ${timestamp}`,
      category: 'grocery_kirana',
      ownerName: 'Mahesh Patel',
      email: grocEmail,
      phone: '+91 96666 55443',
      address: 'Main Bazaar, Surat',
      password: 'GrocPassword123!',
    });

    assert(grocReg.status === 200, `Grocery registration status 200`);
    assert(grocReg.data.business.type === 'grocery', 'Business category normalized to grocery');
    const grocConfig = getCategoryConfig(grocReg.data.business.type);
    assert(grocConfig.primaryModule === 'store', 'Grocery primary module is store');
    assert(grocConfig.starterItems.some((i) => i.name.includes('Rice')), 'Grocery template includes Rice');
    assert(grocConfig.starterItems.some((i) => i.name.includes('Dal')), 'Grocery template includes Dal');

    // -----------------------------------------------------------------
    // TEST 7: RETAIL SHOP CATEGORY VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Register Retail Shop Business & Verify Products ---');
    const retailEmail = `test_ret_user_${timestamp}@saas.local`;
    const retailReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Gadget Point Electronics ${timestamp}`,
      category: 'retail_shop',
      ownerName: 'Amit Verma',
      email: retailEmail,
      phone: '+91 95555 44332',
      address: 'Nehru Place Complex, New Delhi',
      password: 'RetailPassword123!',
    });

    assert(retailReg.status === 200, `Retail registration status 200`);
    assert(retailReg.data.business.type === 'retail', 'Business category normalized to retail');
    const retailConfig = getCategoryConfig(retailReg.data.business.type);
    assert(retailConfig.primaryModule === 'store', 'Retail primary module is store');
    assert(retailConfig.starterItems.some((i) => i.name.includes('Cable')), 'Retail template includes Cable');

    // -----------------------------------------------------------------
    // TEST 8: BAKERY & PASTRY CATEGORY VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Register Bakery Business & Verify Fresh Bakes ---');
    const bakeryEmail = `test_bake_user_${timestamp}@saas.local`;
    const bakeReg = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Crust & Crumb Artisan Bakes ${timestamp}`,
      category: 'bakery_pastry',
      ownerName: 'Priya Dsouza',
      email: bakeryEmail,
      phone: '+91 94444 33221',
      address: 'Bandra West, Mumbai',
      password: 'BakePassword123!',
    });

    assert(bakeReg.status === 200, `Bakery registration status 200`);
    assert(bakeReg.data.business.type === 'bakery', 'Business category normalized to bakery');
    const bakeConfig = getCategoryConfig(bakeReg.data.business.type);
    assert(bakeConfig.primaryModule === 'menu', 'Bakery primary module is menu');
    assert(bakeConfig.starterItems.some((i) => i.name.includes('Truffle') || i.name.includes('Cake')), 'Bakery template includes Cake');

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

runTests();
