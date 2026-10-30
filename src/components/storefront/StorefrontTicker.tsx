'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Business } from '@/types';
import { cn } from '@/lib/utils';

interface StorefrontTickerProps {
  business: Business;
  isRestaurant?: boolean;
}

// Custom SVGs for brand identities
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <radialGradient id="ig-grad-ticker" cx="20%" cy="100%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        fill="url(#ig-grad-ticker)"
      />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface SocialItem {
  key: string;
  label: string;
  url: string;
  icon: React.ReactNode;
  colorClasses: string;
  extra?: React.ReactNode;
}

function WalkingCartPuller() {
  return (
    <svg
      viewBox="0 0 44 56"
      className="storefront-cart-puller"
      aria-hidden="true"
      focusable="false"
    >
      <g className="storefront-puller-bob">
        <path d="M31 29 42 33" className="storefront-puller-lead-arm" />
        <circle cx="19" cy="10" r="7" fill="#b86d42" />
        <path d="M12 10c0-5 3-8 8-8 4 0 7 3 7 7-2-1-4-2-6-4-2 3-5 4-9 5Z" fill="#263247" />
        <path d="m13 10-3 1 3 2" fill="#b86d42" />
        <path d="M17 18c-4 1-7 5-7 10l2 12h18l1-14c0-5-3-8-8-9Z" fill="#c9512b" />
        <path d="m16 20 6 5 5-6" fill="none" stroke="#ffd27a" strokeWidth="2" />
        <path d="M13 24 8 31 3 30" className="storefront-puller-free-arm" />
        <g className="storefront-puller-leg storefront-puller-leg-a">
          <path d="m15 39-2 9 5 5" />
          <path d="m18 53 4 1" className="storefront-puller-shoe" />
        </g>
        <g className="storefront-puller-leg storefront-puller-leg-b">
          <path d="m25 39 3 8-2 6" />
          <path d="m25 53 4 1" className="storefront-puller-shoe" />
        </g>
      </g>
    </svg>
  );
}

export function StorefrontTicker({ business }: StorefrontTickerProps) {
  const social = business?.settings?.socialLinks;

  // Collect ONLY genuine social media links that the business has actually configured and enabled
  const activeItems: SocialItem[] = [];

  if (social?.whatsapp && social.whatsapp.trim() !== '' && social.whatsappEnabled) {
    activeItems.push({
      key: 'whatsapp',
      label: 'Chat on WhatsApp',
      url: social.whatsapp.trim(),
      icon: <MessageCircle className="w-3 h-3 shrink-0" />,
      colorClasses: 'bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 hover:border-emerald-300',
    });
  }

  if (
    social?.googleBusiness &&
    social.googleBusiness.trim() !== '' &&
    social.googleBusinessEnabled !== false
  ) {
    activeItems.push({
      key: 'google',
      label: 'Rate on Google',
      url: social.googleBusiness.trim(),
      icon: <GoogleIcon className="w-3 h-3 shrink-0" />,
      colorClasses: 'bg-blue-50/70 border-blue-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 hover:border-blue-300',
      extra: <span className="text-amber-500 font-black text-[9px] tracking-tight">★★★★★</span>,
    });
  }

  if (
    social?.instagram &&
    social.instagram.trim() !== '' &&
    social.instagramEnabled !== false
  ) {
    activeItems.push({
      key: 'instagram',
      label: 'Follow on Instagram',
      url: social.instagram.trim(),
      icon: <InstagramIcon className="w-3 h-3 shrink-0" />,
      colorClasses: 'bg-pink-50/70 border-pink-100 hover:bg-pink-50 text-slate-800 hover:text-pink-600 hover:border-pink-300',
    });
  }

  if (
    social?.youtube &&
    social.youtube.trim() !== '' &&
    social.youtubeEnabled !== false
  ) {
    activeItems.push({
      key: 'youtube',
      label: 'Watch on YouTube',
      url: social.youtube.trim(),
      icon: <YouTubeIcon className="w-3 h-3 shrink-0" />,
      colorClasses: 'bg-red-50/70 border-red-100 hover:bg-red-50 text-slate-800 hover:text-red-600 hover:border-red-300',
    });
  }

  if (
    social?.facebook &&
    social.facebook.trim() !== '' &&
    social.facebookEnabled !== false
  ) {
    activeItems.push({
      key: 'facebook',
      label: 'Follow on Facebook',
      url: social.facebook.trim(),
      icon: <FacebookIcon className="w-3 h-3 shrink-0" />,
      colorClasses: 'bg-sky-50/70 border-sky-100 hover:bg-sky-50 text-slate-800 hover:text-[#1877F2] hover:border-sky-300',
    });
  }

  // If no social media has been added by the owner: render nothing
  if (activeItems.length === 0) {
    return null;
  }

  // Clean, seamless pill without yellow background strip
  const renderItem = (item: SocialItem) => (
    <a
      key={item.key}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'storefront-social-chip-enter inline-flex h-7 items-center gap-1 px-2 rounded-[9px] bg-white border border-slate-200 text-slate-800 font-bold text-[10px] leading-none shadow-2xs hover:shadow-xs transition-all active:scale-95 shrink-0',
        item.colorClasses
      )}
      title={item.label}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.extra}
    </a>
  );

  // Keep the puller, cart, and the owner's configured links together as one scrolling unit.
  const renderPills = () => (
    <div className="storefront-social-cart-scene">
      <WalkingCartPuller />
      <div className="storefront-social-cart" role="group" aria-label="Store social media links">
        <div className="storefront-social-cart-canopy" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="storefront-social-cart-cargo">
          {activeItems.map((item) => renderItem(item))}
        </div>
        <span className="storefront-social-cart-hub storefront-social-cart-hub-a" aria-hidden="true" />
        <span className="storefront-social-cart-hub storefront-social-cart-hub-b" aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <div className="storefront-social-notification-bar relative overflow-hidden py-1 flex items-center group">
      {/* Left/Right Fade Masks matching page background */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-50 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-slate-50 to-transparent z-10" />

      {/* Person and traditional social-link cart loop across the notification bar */}
      <div className="flex overflow-hidden relative w-full select-none cursor-pointer">
        <div className="animate-marquee-infinite">
          {renderPills()}
          {renderPills()}
        </div>
        <div className="animate-marquee-infinite" aria-hidden="true">
          {renderPills()}
          {renderPills()}
        </div>
      </div>
    </div>
  );
}
