'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Globe,
  Eye,
  Loader2,
  Check,
  Sparkles,
  HelpCircle,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BusinessSocialLinks } from '@/types';
import { cn } from '@/lib/utils';

interface PlatformConfig {
  id: keyof BusinessSocialLinks;
  toggleId: keyof BusinessSocialLinks;
  name: string;
  placeholder: string;
  example: string;
  brandColor: string;
  bgLight: string;
  borderLight: string;
  iconBg: string;
  iconColor: string;
  validateDomain: (url: string) => boolean;
  domainHint: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

// Custom SVG Icons for the platforms
function GoogleBusinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'googleBusiness',
    toggleId: 'googleBusinessEnabled',
    name: 'Google Business Profile',
    placeholder: 'https://share.google/... or https://maps.app.goo.gl/... or https://g.page/...',
    example: 'https://share.google/YourBusiness',
    brandColor: '#4285F4',
    bgLight: 'bg-blue-50/60',
    borderLight: 'border-blue-200',
    iconBg: 'bg-blue-600',
    iconColor: 'text-blue-600',
    domainHint: 'Must be a Google Maps, Google Reviews, share.google, or g.page link',
    validateDomain: (url: string) =>
      /share\.google|google\.[a-z.]+\/(maps|search|place|business)|maps\.google\.[a-z.]+|g\.page|maps\.app\.goo\.gl|goo\.gl\/maps|search\.google\.com|business\.google\.com|google\.com/i.test(url),
    icon: GoogleBusinessIcon,
  },
  {
    id: 'facebook',
    toggleId: 'facebookEnabled',
    name: 'Facebook Page',
    placeholder: 'https://facebook.com/yourbusinesspage',
    example: 'https://facebook.com/yourbusiness',
    brandColor: '#1877F2',
    bgLight: 'bg-sky-50/60',
    borderLight: 'border-sky-200',
    iconBg: 'bg-[#1877F2]',
    iconColor: 'text-[#1877F2]',
    domainHint: 'Must be a valid facebook.com page URL',
    validateDomain: (url: string) => /facebook\.com|fb\.me|fb\.com/i.test(url),
    icon: FacebookIcon,
  },
  {
    id: 'instagram',
    toggleId: 'instagramEnabled',
    name: 'Instagram Profile',
    placeholder: 'https://instagram.com/yourhandle',
    example: 'https://instagram.com/yourbusiness',
    brandColor: '#E4405F',
    bgLight: 'bg-rose-50/60',
    borderLight: 'border-rose-200',
    iconBg: 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600',
    iconColor: 'text-rose-600',
    domainHint: 'Must be a valid instagram.com profile URL',
    validateDomain: (url: string) => /instagram\.com/i.test(url),
    icon: InstagramIcon,
  },
  {
    id: 'youtube',
    toggleId: 'youtubeEnabled',
    name: 'YouTube Channel',
    placeholder: 'https://youtube.com/@yourchannel or https://youtube.com/c/...',
    example: 'https://youtube.com/@yourbusiness',
    brandColor: '#FF0000',
    bgLight: 'bg-red-50/60',
    borderLight: 'border-red-200',
    iconBg: 'bg-[#FF0000]',
    iconColor: 'text-[#FF0000]',
    domainHint: 'Must be a valid youtube.com or youtu.be link',
    validateDomain: (url: string) => /youtube\.com|youtu\.be/i.test(url),
    icon: YouTubeIcon,
  },
];

export default function SocialMediaSettingsPage() {
  const { currentBusiness, refreshBusinesses } = useApp();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [links, setLinks] = useState<BusinessSocialLinks>({
    googleBusiness: '',
    facebook: '',
    instagram: '',
    youtube: '',
    googleBusinessEnabled: false,
    facebookEnabled: false,
    instagramEnabled: false,
    youtubeEnabled: false,
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!currentBusiness) return;
    const fetchSocialLinks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/businesses/social-links?businessId=${currentBusiness.id}`);
        const data = await res.json();
        if (data.success && data.socialLinks) {
          setLinks(data.socialLinks);
        }
      } catch (err) {
        console.error('Error fetching social links:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSocialLinks();
  }, [currentBusiness?.id]);

  const normalizeUrl = (platformId: keyof BusinessSocialLinks, val: string): string => {
    if (!val || val.trim() === '') return '';
    let trimmed = val.trim();
    if (platformId === 'instagram' && trimmed.startsWith('@')) {
      return `https://instagram.com/${trimmed.slice(1)}`;
    }
    if (platformId === 'youtube' && trimmed.startsWith('@')) {
      return `https://youtube.com/${trimmed}`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const validateField = (platform: PlatformConfig, val: string) => {
    if (!val || val.trim() === '') {
      return '';
    }
    let trimmed = val.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    try {
      new URL(trimmed);
    } catch {
      return 'Invalid URL format';
    }
    if (!platform.validateDomain(trimmed)) {
      return platform.domainHint;
    }
    return '';
  };

  const handleChangeUrl = (platform: PlatformConfig, val: string) => {
    setLinks((prev) => ({ ...prev, [platform.id]: val }));
    if (!val || val.trim() === '') {
      setValidationErrors((prev) => ({ ...prev, [platform.id]: '' }));
      return;
    }
    const normalized = normalizeUrl(platform.id, val);
    const err = validateField(platform, normalized);
    setValidationErrors((prev) => ({ ...prev, [platform.id]: err }));
  };

  const handleToggle = (platform: PlatformConfig, checked: boolean) => {
    setLinks((prev) => ({ ...prev, [platform.toggleId]: checked }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setErrorMsg('');
    setSaveSuccess(false);

    // Auto-normalize links before saving
    const normalizedLinks = { ...links };
    const errors: { [key: string]: string } = {};

    for (const p of PLATFORMS) {
      const rawVal = (links[p.id] as string) || '';
      const isEnabled = Boolean(links[p.toggleId]);
      if (isEnabled && (!rawVal || rawVal.trim() === '')) {
        errors[p.id] = `Please enter a valid ${p.name} URL before enabling.`;
      } else if (rawVal.trim() !== '') {
        const norm = normalizeUrl(p.id, rawVal);
        (normalizedLinks as any)[p.id] = norm;
        const err = validateField(p, norm);
        if (err) errors[p.id] = err;
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMsg('Please fix the URL errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/businesses/social-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          socialLinks: normalizedLinks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        await refreshBusinesses();
      } else {
        setErrorMsg(data.error || 'Failed to save social links');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const storefrontUrl = currentBusiness
    ? currentBusiness.type.includes('restaurant') ||
      currentBusiness.type.includes('cafe') ||
      currentBusiness.type.includes('bakery') ||
      currentBusiness.type.includes('juice')
      ? `/menu/${currentBusiness.slug}`
      : `/store/${currentBusiness.slug}`
    : '/store';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Social Media & Business Links
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Storefront Integration
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your Google Business Profile, Facebook, Instagram, and YouTube. Active links will display on your public customer storefront.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Public Storefront</span>
            <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading social media configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Platform Inputs & Toggles */}
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Social media and business profile links saved to Supabase successfully!</span>
                </div>
              )}

              {PLATFORMS.map((platform) => {
                const IconComponent = platform.icon;
                const urlVal = (links[platform.id] as string) || '';
                const isEnabled = Boolean(links[platform.toggleId]);
                const hasError = Boolean(validationErrors[platform.id]);

                return (
                  <div
                    key={platform.id}
                    className={cn(
                      'p-4 bg-white rounded-xl border transition-all shadow-2xs space-y-3',
                      isEnabled ? 'border-slate-300' : 'border-slate-200/80 bg-slate-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xs',
                            platform.iconBg
                          )}
                        >
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{platform.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {isEnabled ? 'Displayed on storefront' : 'Hidden from customers'}
                          </div>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleToggle(platform, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* URL Input */}
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="url"
                          value={urlVal}
                          onChange={(e) => handleChangeUrl(platform, e.target.value)}
                          onBlur={() => {
                            if (urlVal.trim()) {
                              const norm = normalizeUrl(platform.id, urlVal);
                              if (norm !== urlVal) {
                                setLinks((prev) => ({ ...prev, [platform.id]: norm }));
                                const err = validateField(platform, norm);
                                setValidationErrors((prev) => ({ ...prev, [platform.id]: err }));
                              }
                            }
                          }}
                          placeholder={platform.placeholder}
                          className={cn(
                            'w-full px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 font-mono transition-all',
                            hasError
                              ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30 text-rose-900'
                              : 'border-slate-200 focus:ring-indigo-500 bg-white text-slate-800'
                          )}
                        />
                        {urlVal && !hasError && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {hasError ? (
                        <p className="text-[11px] text-rose-600 font-medium">
                          {validationErrors[platform.id]}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Example: <span className="font-mono">{platform.example}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Social Media Links</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Live Storefront Preview */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Storefront Live Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Realtime
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Here is how your verified social media badges will look to customers on your public digital storefront.
              </p>

              {/* Mock Customer Storefront Header Card */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentBusiness?.name.slice(0, 2).toUpperCase() || 'BZ'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {currentBusiness?.name || 'Your Business Name'}
                    </div>
                    <div className="text-[10px] text-slate-400">Verified Business Storefront</div>
                  </div>
                </div>

                {/* Social Media Badges on Storefront */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Connect With Us:
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => {
                      const Icon = p.icon;
                      const isEnabled = Boolean(links[p.toggleId]);
                      const urlVal = (links[p.id] as string) || '';

                      if (!isEnabled || !urlVal) return null;

                      return (
                        <a
                          key={p.id}
                          href={urlVal}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs hover:shadow-xs transition-all"
                        >
                          <span className={cn('w-2 h-2 rounded-full', p.iconBg)} />
                          <span>{p.name.split(' ')[0]}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                        </a>
                      );
                    })}

                    {!PLATFORMS.some((p) => links[p.toggleId] && links[p.id]) && (
                      <div className="text-[11px] text-slate-400 italic py-1">
                        No active social media links enabled yet. Toggle and save above.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Notice */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Google Business Review Boost</span>
                </div>
                <p className="text-indigo-700/90 leading-relaxed">
                  Adding your Google Business Profile link lets customers leave 5-star ratings directly from their online order tracking page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
