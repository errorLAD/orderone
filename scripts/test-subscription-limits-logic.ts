import {
  getEffectivePlanLimits,
  getBusinessPlanUsage,
  assertCanCreateRecord,
  SubscriptionLimitError,
} from '../src/lib/subscriptionLimits';
import { getPgPool } from '../src/lib/postgres';

async function main() {
  console.log('--- TESTING SUBSCRIPTION LIMITS BUSINESS LOGIC ---');

  // Test 1: Sri Ram Krishna Traders (Basic Plan)
  const basicBizId = 'biz_5o3yrnr_mvq8u007';
  console.log('\n[1] Testing Basic Plan limits & usage for Sri Ram Krishna Traders...');
  const basicLimits = await getEffectivePlanLimits(basicBizId);
  console.log('Effective Limits:', basicLimits);
  if (basicLimits.maxProducts !== 20 || basicLimits.maxCategories !== 10) {
    throw new Error(`Expected Basic limits 20/10, got ${basicLimits.maxProducts}/${basicLimits.maxCategories}`);
  }

  const basicUsage = await getBusinessPlanUsage(basicBizId);
  console.log('Business Plan Usage:', basicUsage);
  if (basicUsage.products.max !== 20 || basicUsage.categories.max !== 10) {
    throw new Error(`Expected usage max limits 20/10, got ${basicUsage.products.max}/${basicUsage.categories.max}`);
  }
  console.log('✓ PASS: Basic Plan limits and usage calculation verified.');

  // Test 2: Annapurna Cafe & Retail (Gold Plan)
  const goldBizId = 'biz_annapurna';
  console.log('\n[2] Testing Gold Plan limits & usage for Annapurna Cafe & Retail...');
  const goldLimits = await getEffectivePlanLimits(goldBizId);
  console.log('Effective Limits:', goldLimits);
  if (goldLimits.maxProducts !== 50 || goldLimits.maxCategories !== 30) {
    throw new Error(`Expected Gold limits 50/30, got ${goldLimits.maxProducts}/${goldLimits.maxCategories}`);
  }

  const goldUsage = await getBusinessPlanUsage(goldBizId);
  console.log('Business Plan Usage:', goldUsage);
  if (goldUsage.products.max !== 50 || goldUsage.categories.max !== 30) {
    throw new Error(`Expected usage max limits 50/30, got ${goldUsage.products.max}/${goldUsage.categories.max}`);
  }
  console.log('✓ PASS: Gold Plan limits and usage calculation verified.');

  // Test 3: Temporary Business at Limit
  console.log('\n[3] Testing assertCanCreateRecord limit assertions...');
  const pool = getPgPool();
  const testBizId = 'biz_test_assert_' + Date.now();
  const subData = JSON.stringify({
    planId: 'plan_basic',
    status: 'active',
    billingCycle: 'monthly',
    amount: 49.00,
  });

  await pool.query(
    `INSERT INTO businesses (id, name, slug, type, phone, email, address, is_store_open, subscription)
     VALUES ($1, 'Assert Test Store', $2, 'hardware', '9999999999', 'assert@test.com', 'Test Address', true, $3::jsonb)`,
    [testBizId, 'assert-test-' + Date.now(), subData]
  );

  try {
    // Fill to 20 products
    for (let i = 1; i <= 20; i++) {
      await pool.query(
        `INSERT INTO products (id, business_id, name, price, source_type, is_available)
         VALUES ($1, $2, $3, 10, 'store', true)`,
        [`prod_assert_${i}_${Date.now()}`, testBizId, `Product ${i}`]
      );
    }

    // Now assertCanCreateRecord('product') should throw SubscriptionLimitError
    let productBlocked = false;
    try {
      await assertCanCreateRecord(testBizId, 'product');
    } catch (err: any) {
      if (err instanceof SubscriptionLimitError) {
        console.log('Caught expected SubscriptionLimitError for product:');
        console.log('  Message:', err.message);
        console.log('  Requires upgrade:', err.requiresUpgrade);
        console.log('  Current count:', err.currentCount);
        console.log('  Max limit:', err.maxLimit);
        if (!err.message.includes("You've reached the Basic plan limit of 20 products or menu items")) {
          throw new Error('Unexpected error message: ' + err.message);
        }
        productBlocked = true;
      } else {
        throw err;
      }
    }
    if (!productBlocked) {
      throw new Error('assertCanCreateRecord did NOT block product addition at limit 20!');
    }
    console.log('✓ PASS: Basic product addition blocked at 20 with exact required error message.');

    // Fill to 10 categories
    for (let i = 1; i <= 10; i++) {
      await pool.query(
        `INSERT INTO categories (id, business_id, name, slug, source_type, sort_order)
         VALUES ($1, $2, $3, $4, 'store', $5)`,
        [`cat_assert_${i}_${Date.now()}`, testBizId, `Category ${i}`, `cat-slug-${i}-${Date.now()}`, i]
      );
    }

    // Now assertCanCreateRecord('category') should throw SubscriptionLimitError
    let categoryBlocked = false;
    try {
      await assertCanCreateRecord(testBizId, 'category');
    } catch (err: any) {
      if (err instanceof SubscriptionLimitError) {
        console.log('Caught expected SubscriptionLimitError for category:');
        console.log('  Message:', err.message);
        console.log('  Requires upgrade:', err.requiresUpgrade);
        console.log('  Current count:', err.currentCount);
        console.log('  Max limit:', err.maxLimit);
        if (!err.message.includes("You've reached the Basic plan limit of 10 categories")) {
          throw new Error('Unexpected error message: ' + err.message);
        }
        categoryBlocked = true;
      } else {
        throw err;
      }
    }
    if (!categoryBlocked) {
      throw new Error('assertCanCreateRecord did NOT block category addition at limit 10!');
    }
    console.log('✓ PASS: Basic category addition blocked at 10 with exact required error message.');

    // Test Gold business assertion
    await pool.query(
      `UPDATE businesses SET subscription = $1::jsonb WHERE id = $2`,
      [JSON.stringify({ planId: 'plan_gold', status: 'active', billingCycle: 'monthly', amount: 149.00 }), testBizId]
    );

    // With Gold, 20 products and 10 categories should now NOT be blocked
    await assertCanCreateRecord(testBizId, 'product');
    await assertCanCreateRecord(testBizId, 'category');
    console.log('✓ PASS: Upgrading to Gold immediately unlocked creation beyond 20 products and 10 categories!');

  } finally {
    await pool.query('DELETE FROM products WHERE business_id = $1', [testBizId]);
    await pool.query('DELETE FROM categories WHERE business_id = $1', [testBizId]);
    await pool.query('DELETE FROM businesses WHERE id = $1', [testBizId]);
    console.log('Test business cleaned up.');
  }

  console.log('\n=========================================');
  console.log('ALL SUBSCRIPTION LIMIT ASSERTIONS PASSED!');
  console.log('=========================================');
  await pool.end();
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
