import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { DEFAULT_SEO, SITE_URL, generatePlatformSchema } from '@/lib/seoConfig';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_SEO.title,
    template: '%s | OrderOne.in',
  },
  description: DEFAULT_SEO.description,
  keywords: DEFAULT_SEO.keywords,
  authors: [{ name: 'InfraBlue Materials Technology Private Limited', url: SITE_URL }],
  creator: 'InfraBlue Materials Technology Private Limited',
  publisher: 'InfraBlue Materials Technology Private Limited',
  alternates: {
    canonical: '/',
  },
  openGraph: DEFAULT_SEO.openGraph,
  twitter: DEFAULT_SEO.twitter,
  robots: DEFAULT_SEO.robots,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.ico',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const platformSchema = generatePlatformSchema();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Platform Organization & WebSite JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(platformSchema) }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
