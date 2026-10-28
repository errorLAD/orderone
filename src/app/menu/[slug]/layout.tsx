import React from 'react';
import type { Metadata } from 'next';
import { getBusinessBySlug } from '@/lib/db';
import { SITE_URL, generateRestaurantSchema } from '@/lib/seoConfig';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const business = await getBusinessBySlug(params.slug);

  if (!business) {
    return {
      title: 'Menu Not Found | OrderOne.in',
      robots: { index: false, follow: false },
    };
  }

  const title = `${business.name} | Digital Food Menu & Dining Orders`;
  const description = business.description
    ? `${business.description} — View digital menu, order food, and get live tokens at ${business.name}, ${business.address || 'India'}.`
    : `Explore digital restaurant menu and contactless ordering for ${business.name}. Instant kitchen tickets powered by OrderOne.in.`;
  const canonicalUrl = `${SITE_URL}/menu/${business.slug}`;
  const ogImage = business.logoUrl || `${SITE_URL}/og-image.png`;

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
          width: 800,
          height: 800,
          alt: `${business.name} Restaurant Menu Logo`,
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

export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const business = await getBusinessBySlug(params.slug);
  const jsonLd = business ? generateRestaurantSchema(business) : null;

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
