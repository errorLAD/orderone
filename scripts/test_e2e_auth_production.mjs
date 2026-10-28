const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING PRODUCTION AUTH & DATA INTEGRITY TESTS ===');
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

  // Test 1: Direct Session Check when unauthenticated
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    assert(res.status === 401, 'Unauthenticated /api/auth/me returns 401');
    const data = await res.json();
    assert(data.success === false && data.user === null, 'Payload indicates unauthorized');
  } catch (err) {
    assert(false, `Test 1 failed with error: ${err.message}`);
  }

  // Test 2: Invalid Login Attempt
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@merchant.com', password: 'wrongpassword' }),
    });
    assert(res.status === 401, 'Invalid credentials return 401');
    const data = await res.json();
    assert(data.success === false, 'Invalid login rejected correctly');
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err.message}`);
  }

  // Test 3: Register a Real New Merchant
  const testEmail = `merchant_${Date.now()}@testbusiness.in`;
  const testPassword = 'SecurePassword!123';
  let sessionCookie = '';

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gokul Test Merchant',
        email: testEmail,
        password: testPassword,
        businessId: 'biz_annapurna',
      }),
    });
    assert(res.status === 200, 'Register returns 200 OK');
    const data = await res.json();
    assert(data.success === true && data.user && data.user.email === testEmail, 'User registered and returned');
    
    // Extract set-cookie header
    const rawCookie = res.headers.get('set-cookie');
    assert(rawCookie && rawCookie.includes('saas_session='), 'HTTP-only saas_session cookie set on register');
    sessionCookie = rawCookie ? rawCookie.split(';')[0] : '';
  } catch (err) {
    assert(false, `Test 3 failed with error: ${err.message}`);
  }

  // Test 4: Verify Session via /api/auth/me with Cookie
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, 'Authenticated /api/auth/me returns 200');
    const data = await res.json();
    assert(data.success === true && data.user.email === testEmail, 'Session correctly restored from cookie');
  } catch (err) {
    assert(false, `Test 4 failed with error: ${err.message}`);
  }

  // Test 5: Re-Login with Registered Merchant
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    assert(res.status === 200, 'Login with real credentials returns 200');
    const data = await res.json();
    assert(data.success === true && data.user.email === testEmail, 'User authenticated with hashed password');
    const loginCookie = res.headers.get('set-cookie');
    assert(loginCookie && loginCookie.includes('saas_session='), 'Login cookie refreshed');
  } catch (err) {
    assert(false, `Test 5 failed with error: ${err.message}`);
  }

  // Test 6: Verify Logout
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, 'Logout returns 200');
    
    // Check if session is now rejected
    const checkRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert(checkRes.status === 401, 'Logged out session cookie is rejected (401)');
  } catch (err) {
    assert(false, `Test 6 failed with error: ${err.message}`);
  }

  // Test 7: Real Analytics Calculation (Dynamic Growth & Genuine DB Metrics)
  try {
    const res = await fetch(`${BASE_URL}/api/analytics?businessId=biz_annapurna&scope=all&range=today`);
    assert(res.status === 200, 'Live analytics endpoint returns 200');
    const data = await res.json();
    assert(data.success === true && data.analytics && data.analytics.kpi, 'Analytics object present');
    assert(typeof data.analytics.kpi.todayOrderValue === 'number', 'todayOrderValue is a computed number');
    assert(typeof data.analytics.kpi.todayOrderValueChange === 'number', 'todayOrderValueChange is dynamically calculated');
    assert(typeof data.analytics.kpi.todayOrdersCount === 'number', 'todayOrdersCount is a computed number');
    console.log('Live KPIs from Supabase:', {
      orderValue: data.analytics.kpi.todayOrderValue,
      ordersCount: data.analytics.kpi.todayOrdersCount,
      earnings: data.analytics.kpi.todayEarnings,
      growthChange: data.analytics.kpi.todayOrderValueChange,
    });
  } catch (err) {
    assert(false, `Test 7 failed with error: ${err.message}`);
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests();
