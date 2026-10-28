import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seoConfig';
import { pgQuery } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString();

  // Core Static Marketing & Legal Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic Storefront & Menu URLs from Real PostgreSQL Businesses
  const dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await pgQuery(
      `SELECT slug, settings, updated_at, created_at 
       FROM public.businesses 
       WHERE is_active = true OR is_active IS NULL 
       ORDER BY updated_at DESC LIMIT 500;`
    );

    for (const row of res.rows) {
      const slug = row.slug;
      if (!slug) continue;

      const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
      const modules = settings.modules || { store: true, menu: true };
      const lastMod = row.updated_at ? new Date(row.updated_at).toISOString() : currentDate;

      if (modules.store !== false) {
        dynamicRoutes.push({
          url: `${SITE_URL}/store/${slug}`,
          lastModified: lastMod,
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }

      if (modules.menu !== false) {
        dynamicRoutes.push({
          url: `${SITE_URL}/menu/${slug}`,
          lastModified: lastMod,
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }
    }
  } catch (err) {
    console.warn('Could not query dynamic businesses for sitemap:', err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
