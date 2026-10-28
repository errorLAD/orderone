import { PLATFORM_CONFIG } from './platformConfig';
import { Business } from '@/types';

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orderone.in';

export const DEFAULT_SEO = {
  title: 'OrderOne.in | Digital Store, Dining Menu & Order Token Platform — InfraBlue Materials Technology Private Limited',
  titleTemplate: '%s | OrderOne.in',
  description:
    'OrderOne.in is operated by InfraBlue Materials Technology Private Limited. A unified digital commerce, storefront, and order-queue platform for Indian retail, hardware, grocery, and dining merchants.',
  siteName: 'OrderOne.in',
  canonical: SITE_URL,
  keywords: [
    'OrderOne',
    'OrderOne.in',
    'digital store India',
    'online storefront SaaS',
    'QR code restaurant menu',
    'order token management system',
    'InfraBlue Materials Technology Private Limited',
    'retail billing software',
    'hardware store online catalog',
    'grocery store digital orders',
    'UPI dynamic QR payment',
    'GST invoice generator India',
    'kitchen order ticket KOT',
    'restaurant token display screen'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'OrderOne.in',
    title: 'OrderOne.in — Unified Digital Store, Menu & Order Token Platform',
    description:
      'Transform Indian retail shops, hardware stores, grocery counters, and restaurants with digital storefronts, QR menus, live tokens, UPI payments, and GST invoicing.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'OrderOne.in - Digital Store & Token Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@OrderOneIn',
    creator: '@OrderOneIn',
    title: 'OrderOne.in — Digital Store, Menu & Token Platform',
    description:
      'Empowering Indian retail, grocery, and dining businesses with zero-commission digital catalogs and live token displays.',
    images: [`${SITE_URL}/og-image.png`],
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
          url: `${SITE_URL}/favicon.ico`,
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
        address: {
          '@type': 'PostalAddress',
          streetAddress: PLATFORM_CONFIG.registeredOffice,
          addressCountry: 'IN',
        },
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
        name: 'OrderOne.in SaaS Platform',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All web browsers (Desktop, Tablet, Mobile)',
        offers: {
          '@type': 'Offer',
          price: '20.00',
          priceCurrency: 'INR',
          description: 'Basic plan starting at ₹20 for 30 days',
        },
        description:
          'Unified digital storefront, dining menu QR, order token queuing, and UPI/GST management for Indian businesses.',
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
    description: business.description || `Digital store and product catalog for ${business.name}`,
    url: storeUrl,
    telephone: business.phone || undefined,
    priceRange: '₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Online',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address || 'India',
      addressCountry: 'IN',
    },
    image: business.logoUrl ? [business.logoUrl] : undefined,
    parentOrganization: {
      '@type': 'Organization',
      name: PLATFORM_CONFIG.legalCompanyName,
      url: SITE_URL,
    },
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
    description: business.description || `Digital dining menu and food ordering for ${business.name}`,
    url: menuUrl,
    hasMenu: menuUrl,
    telephone: business.phone || undefined,
    servesCuisine: business.type || 'Indian',
    priceRange: '₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Online',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address || 'India',
      addressCountry: 'IN',
    },
    image: business.logoUrl ? [business.logoUrl] : undefined,
  };
}
