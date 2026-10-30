import React from 'react';
import type { Metadata } from 'next';
import { getBusinessBySlug } from '@/lib/db';
import { SITE_URL, generateStoreSchema } from '@/lib/seoConfig';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const business = await getBusinessBySlug(params.slug);

  if (!business) {
    return {
      title: 'Store Not Found | OrderOne.in',
      robots: { index: false, follow: false },
    };
  }

  const title = `${business.name} | Online Store & Products`;
  const description = (business.description?.trim() || `Browse the products listed by ${business.name} on its OrderOne storefront.`).slice(0, 155);
  const canonicalUrl = `${SITE_URL}/store/${business.slug}`;
  const ogImage = business.logoUrl || `${SITE_URL}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: canonicalUrl,
      title,
      description,
      siteName: 'OrderOne.in',
      images: [
        {
          url: ogImage,
          alt: `${business.name} Storefront Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const business = await getBusinessBySlug(params.slug);
  const jsonLd = business ? generateStoreSchema(business) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
