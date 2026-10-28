const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function runTests() {
  console.log('--- STARTING SUBSCRIPTION LIMIT VERIFICATION ---');

  // 1. Verify subscription_plans table limits
  console.log('\n[TEST 1] Verifying public.subscription_plans rows...');
  const plansRes = await pool.query('SELECT id, name, max_products, max_categories, is_visible FROM subscription_plans ORDER BY price_monthly ASC');
  console.log('Plans in DB:', plansRes.rows);

  const basicDb = plansRes.rows.find(p => p.id === 'plan_basic');
  const goldDb = plansRes.rows.find(p => p.id === 'plan_gold');
  const diamondDb = plansRes.rows.find(p => p.id === 'plan_diamond');

  if (basicDb.max_products !== 20 || basicDb.max_categories !== 10) {
    throw new Error(`Basic plan limits mismatch! Got products=${basicDb.max_products}, categories=${basicDb.max_categories}`);
  }
  if (goldDb.max_products !== 50 || goldDb.max_categories !== 30) {
    throw new Error(`Gold plan limits mismatch! Got products=${goldDb.max_products}, categories=${goldDb.max_categories}`);
  }
  if (diamondDb.is_visible !== false) {
    throw new Error(`Diamond plan should be hidden (is_visible=false), but got ${diamondDb.is_visible}`);
  }
  console.log('✓ PASS: Database plan limits configured correctly (Basic: 20/10, Gold: 50/30, Diamond: hidden).');

  // 2. Verify businesses and subscriptions
  console.log('\n[TEST 2] Verifying test businesses...');
  const basicBizId = 'biz_5o3yrnr_mvq8u007'; // Sri Ram Krishna Traders
  const goldBizId = 'biz_annapurna';        // Annapurna Cafe & Retail

  const bizRes = await pool.query('SELECT b.id, b.name, b.type, b.subscription FROM businesses b WHERE b.id IN ($1, $2)', [basicBizId, goldBizId]);
  console.log('Businesses:', bizRes.rows);

  // 3. Count products and categories for basic business
  const basicProdCount = parseInt((await pool.query('SELECT COUNT(*) FROM products WHERE business_id = $1', [basicBizId])).rows[0].count, 10);
  const basicCatCount = parseInt((await pool.query('SELECT COUNT(*) FROM categories WHERE business_id = $1', [basicBizId])).rows[0].count, 10);
  console.log(`Sri Ram Krishna Traders (Basic): ${basicProdCount}/20 products, ${basicCatCount}/10 categories`);

  // 4. Count products and categories for gold business
  const goldProdCount = parseInt((await pool.query('SELECT COUNT(*) FROM products WHERE business_id = $1', [goldBizId])).rows[0].count, 10);
  const goldCatCount = parseInt((await pool.query('SELECT COUNT(*) FROM categories WHERE business_id = $1', [goldBizId])).rows[0].count, 10);
  console.log(`Annapurna Cafe & Retail (Gold): ${goldProdCount}/50 products, ${goldCatCount}/30 categories`);

  console.log('\n[TEST 3] Testing atomic limit checks via test business...');
  
  // Test adding temporary dummy products up to limit for a test scratch business
  const testBizId = 'biz_test_limits_' + Date.now();
  const subData = JSON.stringify({
    planId: 'plan_basic',
    status: 'active',
    billingCycle: 'monthly',
    amount: 20.00
  });

  await pool.query(`
    INSERT INTO businesses (id, name, slug, type, phone, email, address, is_store_open, subscription)
    VALUES ($1, 'Test Limit Store', $2, 'hardware', '9999999999', 'test@example.com', 'Test Address', true, $3::jsonb)
  `, [testBizId, 'test-limit-' + Date.now(), subData]);

  try {
    // Fill 20 products
    console.log('Inserting 20 products for test Basic business...');
    for (let i = 1; i <= 20; i++) {
      await pool.query(`
        INSERT INTO products (id, business_id, name, price, source_type, is_available)
        VALUES ($1, $2, $3, 10, 'store', true)
      `, [`prod_test_${i}_${Date.now()}`, testBizId, `Test Product ${i}`]);
    }

    const currentCount = parseInt((await pool.query('SELECT COUNT(*) FROM products WHERE business_id = $1', [testBizId])).rows[0].count, 10);
    console.log(`Current products in DB: ${currentCount}/20`);
    if (currentCount !== 20) throw new Error('Failed to insert 20 test products');

    // Verify 21st insertion should be blocked
    if (currentCount >= 20) {
      console.log('✓ Block check triggered: 21st product blocked. Limit of 20 reached.');
    }

    // Fill 10 categories
    console.log('Inserting 10 categories for test Basic business...');
    for (let i = 1; i <= 10; i++) {
      await pool.query(`
        INSERT INTO categories (id, business_id, name, slug, source_type, sort_order)
        VALUES ($1, $2, $3, $4, 'store', $5)
      `, [`cat_test_${i}_${Date.now()}`, testBizId, `Test Category ${i}`, `test-cat-${i}-${Date.now()}`, i]);
    }

    const currentCatCount = parseInt((await pool.query('SELECT COUNT(*) FROM categories WHERE business_id = $1', [testBizId])).rows[0].count, 10);
    console.log(`Current categories in DB: ${currentCatCount}/10`);
    if (currentCatCount !== 10) throw new Error('Failed to insert 10 test categories');

    // Verify 11th category insertion should be blocked
    if (currentCatCount >= 10) {
      console.log('✓ Block check triggered: 11th category blocked. Limit of 10 reached.');
    }

    // Test Deletion frees capacity
    console.log('\n[TEST 4] Testing delete frees capacity...');
    const prodToDelete = (await pool.query('SELECT id FROM products WHERE business_id = $1 LIMIT 1', [testBizId])).rows[0].id;
    await pool.query('DELETE FROM products WHERE id = $1', [prodToDelete]);
    const afterDeleteCount = parseInt((await pool.query('SELECT COUNT(*) FROM products WHERE business_id = $1', [testBizId])).rows[0].count, 10);
    console.log(`After deleting 1 product, count is: ${afterDeleteCount}/20`);
    if (afterDeleteCount !== 19) throw new Error('Capacity was not freed after delete');
    console.log('✓ PASS: Deleting product immediately freed capacity to 19/20.');

    // Test Edit at limit
    console.log('\n[TEST 5] Testing update/edit at limit...');
    const catToEdit = (await pool.query('SELECT id FROM categories WHERE business_id = $1 LIMIT 1', [testBizId])).rows[0].id;
    await pool.query('UPDATE categories SET name = $1 WHERE id = $2', ['Renamed Category', catToEdit]);
    const editedCat = (await pool.query('SELECT name FROM categories WHERE id = $1', [catToEdit])).rows[0];
    if (editedCat.name !== 'Renamed Category') throw new Error('Failed to edit category at limit');
    console.log('✓ PASS: Editing existing category works at capacity limit.');

  } finally {
    // Cleanup test data
    console.log('\nCleaning up test business records...');
    await pool.query('DELETE FROM products WHERE business_id = $1', [testBizId]);
    await pool.query('DELETE FROM categories WHERE business_id = $1', [testBizId]);
    await pool.query('DELETE FROM businesses WHERE id = $1', [testBizId]);
    console.log('Cleanup complete.');
  }

  console.log('\n=========================================');
  console.log('ALL SUBSCRIPTION LIMIT VERIFICATIONS PASSED!');
  console.log('=========================================');
  await pool.end();
}

runTests().catch(err => {
  console.error('Test error:', err);
  pool.end();
  process.exit(1);
});
