import { pgQuery } from '../src/lib/postgres.js';
import { syncWithPostgres } from '../src/lib/db.js';

async function updatePlan() {
  try {
    const res = await pgQuery(`
      UPDATE public.subscription_plans 
      SET allows_store = true,
          description = 'Essential digital catalog, materials and order tracking for businesses',
          features = '["Materials and Store Catalog (for Hardware and Retail)", "Digital Food Menu (for Restaurants and Cafes)", "Customer Orders and Token Queue (S- and M-)", "Stock Tracking and Multi-unit Inventory", "Storefront QR Codes"]'::jsonb
      WHERE id = 'plan_basic'
    `);
    console.log('✅ Updated subscription_plans in PostgreSQL. Rows affected:', res.rowCount);

    const bizRes = await pgQuery(`
      UPDATE public.businesses
      SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{modules,store}', 'true'::jsonb)
      WHERE type IN ('hardware', 'hardware_building_materials', 'retail', 'retail_shop', 'grocery', 'grocery_kirana', 'other')
    `);
    console.log('✅ Updated hardware/retail businesses settings.modules.store = true. Rows affected:', bizRes.rowCount);

    await syncWithPostgres();
    console.log('✅ In-memory database synchronized.');
  } catch (err) {
    console.error('Error updating plan_basic:', err);
  } finally {
    process.exit(0);
  }
}

updatePlan();
