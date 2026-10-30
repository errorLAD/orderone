import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seoConfig';
import { pgQuery } from '@/lib/postgres';
import { SEO_ARTICLES, SEO_SOLUTIONS } from '@/lib/marketingContent';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Core Static Marketing & Legal Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/terms`,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      priority: 0.5,
    },
    { url: `${SITE_URL}/solutions`, priority: 0.85 },
    { url: `${SITE_URL}/resources`, priority: 0.75 },
    ...SEO_SOLUTIONS.map((solution) => ({
      url: `${SITE_URL}/solutions/${solution.slug}`,
      priority: 0.8,
    })),
    ...SEO_ARTICLES.map((article) => ({
      url: `${SITE_URL}/resources/${article.slug}`,
      priority: 0.7,
    })),
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
      const sourceDate = row.updated_at || row.created_at;
      const lastMod = sourceDate ? new Date(sourceDate).toISOString() : undefined;

      if (modules.store !== false) {
        dynamicRoutes.push({
          url: `${SITE_URL}/store/${slug}`,
          ...(lastMod ? { lastModified: lastMod } : {}),
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }

      if (modules.menu !== false) {
        dynamicRoutes.push({
          url: `${SITE_URL}/menu/${slug}`,
          ...(lastMod ? { lastModified: lastMod } : {}),
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
