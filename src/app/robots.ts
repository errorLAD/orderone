import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seoConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/terms',
          '/privacy-policy',
          '/refund-policy',
          '/store/',
          '/menu/',
        ],
        disallow: [
          '/admin/',
          '/dashboard/',
          '/api/',
          '/track/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
