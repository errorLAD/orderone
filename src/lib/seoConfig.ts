import { PLATFORM_CONFIG } from './platformConfig';
import { Business } from '@/types';

const configuredSiteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const isLocalSiteUrl = configuredSiteUrl ? /(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(configuredSiteUrl) : true;
export const SITE_URL = (configuredSiteUrl && !isLocalSiteUrl ? configuredSiteUrl : 'https://orderone.in').replace(/\/$/, '');

export const DEFAULT_SEO = {
  title: 'POS, Billing & Online Ordering Software for Indian Businesses',
  titleTemplate: '%s | OrderOne.in',
  description:
    'Manage billing, products, inventory, QR ordering, and customer orders with OrderOne.in. Tools for Indian retail shops, grocery stores, hardware businesses, and restaurants.',
  siteName: 'OrderOne.in',
  keywords: [
    'OrderOne',
    'OrderOne.in',
    'digital store India',
    'online storefront SaaS',
    'QR code restaurant menu',
    'order token management system',
    'retail billing software',
    'restaurant POS software',
    'grocery store billing software',
    'hardware shop billing software',
    'inventory management software',
    'online ordering software',
    'shop management software',
    'QR code ordering',
    'manual billing calculator'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'OrderOne.in',
    title: 'OrderOne.in business billing and ordering software',
    description:
      'Browser-based billing, product catalogs, inventory, digital storefronts, QR menus and order management for Indian retail and food businesses.',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'OrderOne.in business billing and ordering software' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrderOne.in | Billing, inventory and online ordering',
    description:
      'Billing, catalogs, QR ordering and order management tools for retail shops, grocery stores, hardware businesses and restaurants.',
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  },
};

/**
 * Platform Organization & SoftwareApplication JSON-LD Schema
 */
export function generatePlatformSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: PLATFORM_CONFIG.brandName,
        legalName: PLATFORM_CONFIG.legalCompanyName,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
          caption: 'OrderOne.in Logo',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: PLATFORM_CONFIG.supportEmail,
            areaServed: 'IN',
            availableLanguage: ['English', 'Hindi'],
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'OrderOne.in',
        description: 'Multi-business SaaS platform for digital storefronts, dining menus, and order tokens in India.',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        inLanguage: 'en-IN',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: 'OrderOne.in',
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        description:
          'Web-based billing, product catalog, inventory, storefront, QR ordering, and order management tools for Indian businesses.',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

/**
 * FAQPage Schema for Landing Page Rich Results in Google
 */
export function generateFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

/**
 * LocalBusiness / Store JSON-LD Schema for public retail storefronts (/store/[slug])
 */
export function generateStoreSchema(business: Business) {
  const storeUrl = `${SITE_URL}/store/${business.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': storeUrl,
    name: business.name,
    description: business.description || undefined,
    url: storeUrl,
    telephone: business.phone || undefined,
    address: business.address && !/^india$|registered office|\[.*\]/i.test(business.address.trim())
      ? { '@type': 'PostalAddress', streetAddress: business.address, addressCountry: 'IN' }
      : undefined,
    image: business.logoUrl ? [business.logoUrl] : undefined,
    currenciesAccepted: business.settings?.orderSettings?.currencyCode || undefined,
  };
}

/**
 * Restaurant / FoodEstablishment JSON-LD Schema for dining menus (/menu/[slug])
 */
export function generateRestaurantSchema(business: Business) {
  const menuUrl = `${SITE_URL}/menu/${business.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': menuUrl,
    name: business.name,
    description: business.description || undefined,
    url: menuUrl,
    hasMenu: { '@type': 'Menu', url: menuUrl },
    telephone: business.phone || undefined,
    currenciesAccepted: business.settings?.orderSettings?.currencyCode || undefined,
    address: business.address && !/^india$|registered office|\[.*\]/i.test(business.address.trim())
      ? { '@type': 'PostalAddress', streetAddress: business.address, addressCountry: 'IN' }
      : undefined,
    image: business.logoUrl ? [business.logoUrl] : undefined,
  };
}
