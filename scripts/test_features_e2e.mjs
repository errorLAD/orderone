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

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`, extra !== null ? JSON.stringify(extra) : '');
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 TESTING PRODUCTS, MENU, ORDERS & SOCIAL MEDIA E2E');
  console.log('================================================================\n');

  // Find a business or create one
  const bizRes = await makeRequest('/api/businesses');
  assert(bizRes.status === 200, 'Businesses API returned 200');
  const businesses = bizRes.data.businesses || [];
  assert(businesses.length > 0, `Found ${businesses.length} businesses in database`);
  const testBiz = businesses[0];
  console.log(`Using Business: "${testBiz.name}" (${testBiz.id})`);

  // Fetch or create a category for testBiz
  const catRes = await makeRequest(`/api/categories?businessId=${testBiz.id}&sourceType=store`);
  let testCatId = catRes.data.categories?.[0]?.id;
  if (!testCatId) {
    const newCatRes = await makeRequest('/api/categories', { method: 'POST' }, {
      businessId: testBiz.id,
      sourceType: 'store',
      name: 'Power Tools',
    });
    testCatId = newCatRes.data.category?.id;
  }

  // --- 1. PRODUCT MANAGEMENT ---
  console.log('\n--- TEST 1: Product Management (CRUD, Specs, Units, Variants) ---');
  const uniqueSKU = `SKU-${Date.now().toString().slice(-6)}`;
  const createProdRes = await makeRequest('/api/products', { method: 'POST' }, {
    businessId: testBiz.id,
    categoryId: testCatId,
    sourceType: 'store',
    name: 'Bosch Pro Impact Drill 13mm',
    brand: 'Bosch',
    unit: 'piece',
    sku: uniqueSKU,
    price: 3499,
    salePrice: 3199,
    stockQuantity: 45,
    lowStockThreshold: 10,
    isAvailable: true,
    description: 'Heavy duty impact drill with variable speed control',
    imageUrl: '/uploads/products/test_drill.jpg',
    variants: [
      { id: 'v1', name: 'Drill with Kit Box', price: 3999, sku: `${uniqueSKU}-BOX` }
    ]
  });

  assert(createProdRes.status === 200, 'Create product returned 200');
  assert(createProdRes.data.success === true, 'Product created successfully');
  const createdProd = createProdRes.data.product;
  assert(createdProd.name === 'Bosch Pro Impact Drill 13mm', 'Product name matches');
  assert(createdProd.sku === uniqueSKU, 'Product SKU matches');
  assert(createdProd.unit === 'piece', 'Unit is configured as piece');
  assert(createdProd.stockQuantity === 45, 'Stock quantity is 45');
  assert(createdProd.variants && createdProd.variants.length === 1, 'Product variant saved');

  // Update product
  console.log('\n--- TEST 2: Update Product Details & Stock Adjust ---');
  const updateProdRes = await makeRequest('/api/products', { method: 'PUT' }, {
    id: createdProd.id,
    price: 3399,
    stockQuantity: 40,
    isAvailable: true,
    description: 'Updated heavy duty impact drill',
  });
  assert(updateProdRes.status === 200, 'Update product returned 200', updateProdRes);
  assert(updateProdRes.data.success === true, 'Product updated successfully');
  assert(updateProdRes.data.product.stockQuantity === 40, 'Updated stock to 40');

  // Search & Filter Products
  console.log('\n--- TEST 3: Search & Stock Status Filters ---');
  const searchRes = await makeRequest(`/api/products?businessId=${testBiz.id}&sourceType=store&search=${uniqueSKU}`);
  assert(searchRes.status === 200, 'Search products returned 200');
  assert(searchRes.data.products.length === 1, `Search found exact 1 product for SKU ${uniqueSKU}`);

  // Delete product
  console.log('\n--- TEST 4: Delete Product ---');
  const delProdRes = await makeRequest(`/api/products?id=${createdProd.id}`, { method: 'DELETE' });
  assert(delProdRes.status === 200, 'Delete product returned 200');
  assert(delProdRes.data.success === true, 'Product deleted successfully');

  // --- 2. MENU MANAGEMENT ---
  console.log('\n--- TEST 5: Menu Management (Food Dishes, Dietary Flags, Variants, Addons) ---');
  const menuCatRes = await makeRequest(`/api/categories?businessId=${testBiz.id}&sourceType=menu`);
  let menuCatId = menuCatRes.data.categories?.[0]?.id;
  if (!menuCatId) {
    const newMenuCatRes = await makeRequest('/api/categories', { method: 'POST' }, {
      businessId: testBiz.id,
      sourceType: 'menu',
      name: 'Main Course',
    });
    menuCatId = newMenuCatRes.data.category?.id;
  }

  const createMenuRes = await makeRequest('/api/products', { method: 'POST' }, {
    businessId: testBiz.id,
    categoryId: menuCatId,
    sourceType: 'menu',
    name: 'Special Paneer Tikka Masala',
    price: 280,
    description: 'Charcoal grilled cottage cheese in spiced tomato butter gravy',
    imageUrl: '/uploads/menu/paneer_tikka.jpg',
    isAvailable: true,
    dietaryFlags: {
      isVeg: true,
      isNonVeg: false,
      isSpicy: true,
      isJain: true,
      isVegan: false,
    },
    variants: [
      { id: 'm1', name: 'Half Portion', price: 160 },
      { id: 'm2', name: 'Full Portion', price: 280 }
    ],
    addOns: [
      { id: 'a1', name: 'Extra Butter Cube', price: 25 },
      { id: 'a2', name: 'Butter Naan (2 pcs)', price: 60 }
    ]
  });

  assert(createMenuRes.status === 200, 'Create menu item returned 200');
  assert(createMenuRes.data.success === true, 'Menu item created successfully');
  const menuItem = createMenuRes.data.product;
  assert(menuItem.dietaryFlags.isVeg === true, 'Dietary flag isVeg is true');
  assert(menuItem.dietaryFlags.isSpicy === true, 'Dietary flag isSpicy is true');
  assert(menuItem.variants.length === 2, '2 portion sizes saved');
  assert(menuItem.addOns.length === 2, '2 add-ons saved');

  // Clean up test menu item
  await makeRequest(`/api/products?id=${menuItem.id}`, { method: 'DELETE' });

  // --- 3. ORDERS ISOLATION ---
  console.log('\n--- TEST 6: Strict Order Isolation (Store S-token vs Menu M-token) ---');

  // Create real store product for order testing
  const orderProdRes = await makeRequest('/api/products', { method: 'POST' }, {
    businessId: testBiz.id,
    categoryId: testCatId,
    sourceType: 'store',
    name: 'Hardware Testing Cement Bag',
    brand: 'UltraTech',
    unit: 'bag',
    sku: `CEM-${Date.now().toString().slice(-4)}`,
    price: 380,
    stockQuantity: 100,
    isAvailable: true,
  });
  const realStoreProd = orderProdRes.data.product;

  const storeOrderRes = await makeRequest('/api/orders', { method: 'POST' }, {
    businessId: testBiz.id,
    sourceType: 'store',
    customer: { name: 'Ramesh Patel', phone: '9876543210' },
    items: [{ productId: realStoreProd.id, quantity: 2 }],
    fulfilmentMethod: 'pickup',
    paymentMethod: 'cash'
  });
  assert(storeOrderRes.status === 200, 'Create store order returned 200', storeOrderRes);
  assert(storeOrderRes.data.order.tokenNumber.startsWith('S-'), `Store order got S- prefix: ${storeOrderRes.data.order.tokenNumber}`);
  assert(storeOrderRes.data.order.sourceType === 'store', 'Order source type is store');

  // Create real menu product for menu order testing
  const orderMenuProdRes = await makeRequest('/api/products', { method: 'POST' }, {
    businessId: testBiz.id,
    categoryId: menuCatId,
    sourceType: 'menu',
    name: 'Kitchen Testing Masala Chai',
    price: 30,
    isAvailable: true,
    dietaryFlags: { isVeg: true },
  });
  const realMenuProd = orderMenuProdRes.data.product;

  const menuOrderRes = await makeRequest('/api/orders', { method: 'POST' }, {
    businessId: testBiz.id,
    sourceType: 'menu',
    customer: { name: 'Priya Sharma', phone: '9876543211', tableNumber: 'Table 4' },
    items: [{ productId: realMenuProd.id, quantity: 1 }],
    fulfilmentMethod: 'dine_in',
    paymentMethod: 'upi'
  });
  assert(menuOrderRes.status === 200, 'Create menu order returned 200', menuOrderRes);
  assert(menuOrderRes.data.order.tokenNumber.startsWith('M-'), `Menu order got M- prefix: ${menuOrderRes.data.order.tokenNumber}`);
  assert(menuOrderRes.data.order.sourceType === 'menu', 'Order source type is menu');

  // Clean up order testing products
  await makeRequest(`/api/products?id=${realStoreProd.id}`, { method: 'DELETE' });
  await makeRequest(`/api/products?id=${realMenuProd.id}`, { method: 'DELETE' });

  // Verify filter isolation
  const getStoreOrders = await makeRequest(`/api/orders?businessId=${testBiz.id}&sourceType=store`);
  assert(getStoreOrders.data.orders.every(o => o.sourceType === 'store'), 'All returned store orders have sourceType=store');

  const getMenuOrders = await makeRequest(`/api/orders?businessId=${testBiz.id}&sourceType=menu`);
  assert(getMenuOrders.data.orders.every(o => o.sourceType === 'menu'), 'All returned menu orders have sourceType=menu');

  // --- 4. SOCIAL MEDIA & BUSINESS LINKS ---
  console.log('\n--- TEST 7: Social Media & Business Links (Save, Validate, Retrieve) ---');
  const saveSocialRes = await makeRequest('/api/businesses/social-links', { method: 'PUT' }, {
    businessId: testBiz.id,
    socialLinks: {
      googleBusiness: 'https://maps.app.goo.gl/SampleBiz123',
      facebook: 'https://facebook.com/samplebusiness',
      instagram: 'https://instagram.com/samplebusiness',
      youtube: 'https://youtube.com/@samplechannel',
      googleBusinessEnabled: true,
      facebookEnabled: true,
      instagramEnabled: true,
      youtubeEnabled: false,
    }
  });
  assert(saveSocialRes.status === 200, 'Save social links returned 200');
  assert(saveSocialRes.data.success === true, 'Social links saved successfully');

  // Retrieve and verify
  const getSocialRes = await makeRequest(`/api/businesses/social-links?businessId=${testBiz.id}`);
  assert(getSocialRes.status === 200, 'Get social links returned 200');
  const links = getSocialRes.data.socialLinks;
  assert(links.googleBusiness === 'https://maps.app.goo.gl/SampleBiz123', 'Google Business URL persisted');
  assert(links.instagram === 'https://instagram.com/samplebusiness', 'Instagram URL persisted');
  assert(links.facebook === 'https://facebook.com/samplebusiness', 'Facebook URL persisted');
  assert(links.googleBusinessEnabled === true, 'Google Business is enabled');
  assert(links.youtubeEnabled === false, 'YouTube is disabled');

  // Test URL validation rejection
  const invalidSocialRes = await makeRequest('/api/businesses/social-links', { method: 'PUT' }, {
    businessId: testBiz.id,
    socialLinks: {
      googleBusiness: 'not-a-valid-url',
      facebook: '',
      instagram: '',
      youtube: '',
    }
  });
  assert(invalidSocialRes.status === 400, 'Invalid URL properly rejected with 400');

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! ALL 4 REQUIREMENTS VERIFIED');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
