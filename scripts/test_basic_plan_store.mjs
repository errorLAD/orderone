import http from 'http';

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
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

async function verify() {
  console.log('\n================================================================');
  console.log('🧪 VERIFYING MATERIALS & INVENTORY IS IN ₹20 PLAN');
  console.log('================================================================\n');

  // 1. Check plan_basic configuration from API
  const planRes = await makeRequest('/api/subscriptions');
  const basicPlan = planRes.data.plans.find(p => p.id === 'plan_basic');
  console.log('Basic Plan Config:', {
    id: basicPlan.id,
    priceMonthly: basicPlan.priceMonthly,
    allowsStore: basicPlan.allowsStore,
    allowsMenu: basicPlan.allowsMenu,
  });

  if (basicPlan.allowsStore !== true) {
    console.error('❌ FAIL: Basic plan must have allowsStore = true!');
    process.exit(1);
  }
  console.log('✅ PASS: Basic plan (₹20/mo) has allowsStore = true');

  // 2. Find or register a hardware business on plan_basic
  const bizRes = await makeRequest('/api/businesses');
  const hwBiz = bizRes.data.businesses.find(b => b.type === 'hardware' && b.subscription?.planId === 'plan_basic');
  
  let targetBiz = hwBiz;
  if (!targetBiz) {
    console.log('Creating a test Hardware business on ₹20 Basic plan...');
    const regRes = await makeRequest('/api/auth/register-business', { method: 'POST' }, {
      businessName: `Test Hardware Store ${Date.now()}`,
      category: 'hardware',
      ownerName: 'Hardware Owner',
      email: `hw_owner_${Date.now()}@testsaas.com`,
      phone: '9988776655',
      address: 'Industrial Area, Phase 2',
      password: 'Password123!',
    });
    targetBiz = regRes.data.business;
  }

  console.log(`Testing Business: "${targetBiz.name}" (${targetBiz.id}) on plan: ${targetBiz.subscription?.planId} (₹${targetBiz.subscription?.amount}/mo)`);

  // 3. Create a hardware product on the ₹20 plan
  const createProdRes = await makeRequest('/api/products', { method: 'POST' }, {
    businessId: targetBiz.id,
    sourceType: 'store',
    name: 'UltraTech Cement 50kg Bag',
    brand: 'UltraTech',
    unit: 'bag',
    sku: `CEM-ULT-${Date.now().toString().slice(-4)}`,
    price: 380,
    stockQuantity: 150,
    lowStockThreshold: 20,
    isAvailable: true,
  });

  if (createProdRes.status !== 200 || !createProdRes.data.success) {
    console.error('❌ FAIL: Failed to create store product on ₹20 plan:', createProdRes.data);
    process.exit(1);
  }
  console.log('✅ PASS: Successfully created store product on ₹20 Basic plan!');

  // 4. Create a store order on the ₹20 plan
  const storeOrderRes = await makeRequest('/api/orders', { method: 'POST' }, {
    businessId: targetBiz.id,
    sourceType: 'store',
    customer: { name: 'Contractor Sharma', phone: '9876543210' },
    items: [{ productId: createProdRes.data.product.id, quantity: 5 }],
    fulfilmentMethod: 'delivery',
    paymentMethod: 'cash'
  });

  if (storeOrderRes.status !== 200 || !storeOrderRes.data.success) {
    console.error('❌ FAIL: Failed to create store order on ₹20 plan:', storeOrderRes.data);
    process.exit(1);
  }
  console.log(`✅ PASS: Successfully created store order on ₹20 plan! Token: ${storeOrderRes.data.order.tokenNumber}`);

  console.log('\n================================================================');
  console.log('🎉 SUCCESS: MATERIALS & INVENTORY IS FULLY ACCESSIBLE IN ₹20 PLAN!');
  console.log('================================================================\n');
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
