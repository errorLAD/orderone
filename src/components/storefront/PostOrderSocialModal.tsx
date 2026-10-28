'use client';

import React from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Sparkles, 
  Star, 
  ArrowRight,
  ShoppingBag,
  UtensilsCrossed
} from 'lucide-react';
import { BusinessSocialLinks } from '@/types';

interface PostOrderSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  tokenNumber: string;
  sourceType?: 'store' | 'menu';
  socialLinks?: BusinessSocialLinks | null;
  onContinueToTracking: () => void;
}

function normalizeUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  let trimmed = url.trim();
  if (trimmed.startsWith('@')) {
    trimmed = `https://instagram.com/${trimmed.slice(1)}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

export function PostOrderSocialModal({
  isOpen,
  onClose,
  businessName,
  tokenNumber,
  sourceType = 'store',
  socialLinks,
  onContinueToTracking,
}: PostOrderSocialModalProps) {
  if (!isOpen) return null;

  // Determine if valid Google link exists
  const rawGoogle = socialLinks?.googleBusiness?.trim() || '';
  const isGoogleEnabled = socialLinks?.googleBusinessEnabled !== false;
  const googleUrl = isGoogleEnabled && rawGoogle ? normalizeUrl(rawGoogle) : '';

  // Determine if valid Instagram link exists
  const rawInstagram = socialLinks?.instagram?.trim() || '';
  const isInstagramEnabled = socialLinks?.instagramEnabled !== false;
  const instagramUrl = isInstagramEnabled && rawInstagram ? normalizeUrl(rawInstagram) : '';

  // If neither link is available, do not render popup
  if (!googleUrl && !instagramUrl) {
    return null;
  }

  const isStore = sourceType === 'store';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gradient Accent */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          aria-label="Close popup and view order"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="text-center pt-2 pb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Order Placed Successfully!
          </span>

          <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
            Token #{tokenNumber}
          </div>

          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            Thank you for shopping with <strong className="text-slate-900 font-semibold">{businessName}</strong>. Your order has been received!
          </p>
        </div>

        {/* Social & Review Invitation Box */}
        <div className="my-2 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Enjoyed your experience?</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Support our business by rating us or following us online:
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Google Review Button - Render ONLY if Google link is configured */}
            {googleUrl && (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full group flex items-center justify-between p-3 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl transition shadow-xs text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {/* Multi-Color Google G Icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>

                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      Rate us on Google
                    </span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-[10px] text-slate-500 font-medium ml-1">Write a Review</span>
                    </div>
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
              </a>
            )}

            {/* Instagram Button - Render ONLY if Instagram link is configured */}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full group flex items-center justify-between p-3 bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-xl transition shadow-xs text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shrink-0 shadow-2xs text-white group-hover:scale-105 transition-transform">
                    {/* Official Instagram Camera SVG */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>

                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      Follow on Instagram
                    </span>
                    <span className="text-[10px] text-rose-600 font-medium">@ Updates, Offers & New Items</span>
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition shrink-0 ml-2" />
              </a>
            )}
          </div>
        </div>

        {/* Primary Action Button: View / Track Order */}
        <div className="pt-3 flex flex-col gap-2">
          <button
            onClick={onContinueToTracking}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
          >
            <span>View Order Status & Receipt</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
