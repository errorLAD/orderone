import { pgQuery } from '../src/lib/postgres.js';

async function main() {
  try {
    const res = await pgQuery(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories';
    `);
    console.log('Categories columns:', res.rows.map(r => r.column_name));

    await pgQuery(`ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;`);
    console.log('Successfully ensured image_url column in public.categories!');

    const after = await pgQuery(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories';
    `);
    console.log('Updated categories columns:', after.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
