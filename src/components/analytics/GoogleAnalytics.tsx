'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';

const rawMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const rawMetaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const rawGoogleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(rawMeasurementId) ? rawMeasurementId : '';
const META_PIXEL_ID = /^\d{5,20}$/.test(rawMetaPixelId) ? rawMetaPixelId : '';
const GOOGLE_ADS_ID = /^AW-\d+$/.test(rawGoogleAdsId) ? rawGoogleAdsId : '';
const GOOGLE_ADS_CONVERSIONS = {
  sign_up: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_CONVERSION || '',
  start_trial: process.env.NEXT_PUBLIC_GOOGLE_ADS_TRIAL_CONVERSION || '',
  purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION || '',
};
const googleTagConfigs = [
  GA_MEASUREMENT_ID ? `gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname, transport_type: 'beacon' });` : '',
  GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : '',
].filter(Boolean).join('\n');

/**
 * Global helper to trigger custom conversion events (e.g. order placed, lead submitted)
 */
export function trackConversion(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
    (window as any).gtag('event', eventName, {
      send_to: GA_MEASUREMENT_ID,
      ...params,
    });
  }
  const adsConversion = GOOGLE_ADS_CONVERSIONS[eventName as keyof typeof GOOGLE_ADS_CONVERSIONS];
  if (adsConversion && /^AW-\d+\/[A-Za-z0-9_-]+$/.test(adsConversion) && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', { send_to: adsConversion, ...params });
  }
  const metaEvent = eventName === 'sign_up' ? 'CompleteRegistration' : eventName === 'start_trial' ? 'StartTrial' : eventName === 'purchase' ? 'Purchase' : null;
  if (metaEvent && typeof window !== 'undefined' && (window as any).fbq && META_PIXEL_ID) {
    (window as any).fbq('track', metaEvent, params);
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (GA_MEASUREMENT_ID && (window as any).gtag) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, { page_path: url });
    }
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID && !GOOGLE_ADS_ID && !META_PIXEL_ID) {
    return null;
  }

  return (
    <>
      {(GA_MEASUREMENT_ID || GOOGLE_ADS_ID) && <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID || GOOGLE_ADS_ID}`}
      />}
      {(GA_MEASUREMENT_ID || GOOGLE_ADS_ID) && <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            ${googleTagConfigs}
          `,
        }}
      />}
      {META_PIXEL_ID && <>
        <Script id="meta-pixel-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');` }} />
      </>}
    </>
  );
}
