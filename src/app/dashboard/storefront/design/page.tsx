'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Check,
  RotateCcw,
  Upload,
  Globe,
  ExternalLink,
  Smartphone,
  Monitor,
  Eye,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Layers,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  StorefrontColors,
  StorefrontTemplateId,
  StorefrontDesignSettings,
  Product,
  Category,
} from '@/types';
import {
  COLOR_PRESETS,
  TEMPLATE_DEFINITIONS,
  getContrastTextColor,
  DEFAULT_STOREFRONT_COLORS,
} from '@/lib/designPresets';
import { StorefrontRenderer } from '@/components/storefront/StorefrontRenderer';
import { cn } from '@/lib/utils';

export default function StorefrontDesignPage() {
  const { currentBusiness, refreshBusinesses } = useApp();

  const isGoldPlan =
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_diamond';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Design State
  const [templateId, setTemplateId] = useState<StorefrontTemplateId>('classic');
  const [colors, setColors] = useState<StorefrontColors>(DEFAULT_STOREFRONT_COLORS);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishedAt, setPublishedAt] = useState<string | undefined>(undefined);

  // Initial saved state for dirty checking & reset
  const [initialState, setInitialState] = useState<{
    templateId: StorefrontTemplateId;
    colors: StorefrontColors;
    coverImageUrl: string;
    isPublished: boolean;
  }>({
    templateId: 'classic',
    colors: DEFAULT_STOREFRONT_COLORS,
    coverImageUrl: '',
    isPublished: false,
  });

  // Preview data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [previewTab, setPreviewTab] = useState<'all' | string>('all');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewDietary, setPreviewDietary] = useState<'all' | 'veg' | 'spicy' | 'jain'>('all');
  const [previewCart, setPreviewCart] = useState<{ [productId: string]: number }>({});

  // Cover image upload state
  const [uploadingCover, setUploadingCover] = useState(false);

  // Upgrade modal state for Basic users
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isFoodCategory = ['restaurant', 'cafe', 'bakery', 'juice_chaat'].includes(
    currentBusiness?.type || ''
  );

  // Fetch current design settings and business catalog
  useEffect(() => {
    if (!currentBusiness) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch design settings
        const designRes = await fetch(`/api/businesses/design?businessId=${currentBusiness.id}`);
        const designData = await designRes.json();

        if (designData.success && designData.design) {
          const d: StorefrontDesignSettings = designData.design;
          setTemplateId(d.templateId || 'classic');
          setColors(d.colors || DEFAULT_STOREFRONT_COLORS);
          setCoverImageUrl(d.coverImageUrl || '');
          setIsPublished(Boolean(d.isPublished));
          setPublishedAt(d.publishedAt);

          setInitialState({
            templateId: d.templateId || 'classic',
            colors: d.colors || DEFAULT_STOREFRONT_COLORS,
            coverImageUrl: d.coverImageUrl || '',
            isPublished: Boolean(d.isPublished),
          });
        }

        // 2. Fetch business products & categories for live preview
        const sourceType = isFoodCategory ? 'menu' : 'store';
        const [catRes, prodRes] = await Promise.all([
          fetch(`/api/categories?businessId=${currentBusiness.id}&sourceType=${sourceType}`),
          fetch(`/api/products?businessId=${currentBusiness.id}&sourceType=${sourceType}`),
        ]);

        const catData = await catRes.json();
        const prodData = await prodRes.json();

        if (catData.success && catData.categories) setCategories(catData.categories);
        if (prodData.success && prodData.products) setProducts(prodData.products);
      } catch (err) {
        console.error('Error fetching design data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentBusiness?.id, isFoodCategory]);

  const isDirty =
    templateId !== initialState.templateId ||
    coverImageUrl !== initialState.coverImageUrl ||
    JSON.stringify(colors) !== JSON.stringify(initialState.colors);

  // Handle Preset Selection
  const handleApplyPreset = (presetColors: StorefrontColors) => {
    setColors(presetColors);
  };

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'storefront');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setCoverImageUrl(data.url);
      } else {
        setErrorMsg(data.error || 'Failed to upload cover banner image');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading image');
    } finally {
      setUploadingCover(false);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    setTemplateId('classic');
    setColors(DEFAULT_STOREFRONT_COLORS);
    setCoverImageUrl('');
  };

  // Discard unsaved changes
  const handleDiscardChanges = () => {
    setTemplateId(initialState.templateId);
    setColors(initialState.colors);
    setCoverImageUrl(initialState.coverImageUrl);
    setErrorMsg(null);
  };

  // Save Draft or Publish to Live Storefront
  const handleSaveDesign = async (publish: boolean) => {
    if (!currentBusiness) return;

    // Check plan access
    if (!isGoldPlan) {
      setShowUpgradeModal(true);
      return;
    }

    if (publish) setPublishing(true);
    else setSaving(true);

    setErrorMsg(null);
    setSaveSuccess(false);
    setPublishSuccess(false);

    try {
      const res = await fetch('/api/businesses/design', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          templateId,
          colors,
          coverImageUrl: coverImageUrl || undefined,
          isPublished: publish ? true : isPublished,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (publish) {
          setIsPublished(true);
          setPublishSuccess(true);
          setPublishedAt(new Date().toISOString());
          setTimeout(() => setPublishSuccess(false), 4000);
        } else {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4000);
        }

        setInitialState({
          templateId,
          colors,
          coverImageUrl,
          isPublished: publish ? true : isPublished,
        });

        await refreshBusinesses();
      } else {
        if (data.requiresUpgrade) {
          setShowUpgradeModal(true);
        }
        setErrorMsg(data.error || 'Failed to save design');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error saving design');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const publicUrl = currentBusiness
    ? isFoodCategory
      ? `/menu/${currentBusiness.slug}`
      : `/store/${currentBusiness.slug}`
    : '#';

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading Storefront Designer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================ */}
      {/* 1. UPGRADE BANNER (FOR BASIC PLAN SUBSCRIBERS)               */}
      {/* ============================================================ */}
      {!isGoldPlan && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-xs text-white shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">
                  Unlock Storefront Design with Gold Plan (₹149/month)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Locked Feature
                </span>
              </div>
              <p className="text-xs text-white/90 mt-1 max-w-2xl leading-relaxed">
                You are currently on the Basic plan. Upgrade to Gold to publish custom brand palettes,
                upload hero cover banners, and choose between the Classic and Modern visual templates.
                You can still test and preview all customizations below!
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/subscription"
            className="px-4 py-2.5 bg-white text-orange-950 font-black text-xs rounded-xl shadow-md hover:bg-amber-50 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <span>Upgrade to Gold (₹149/mo)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. TOP ACTION BAR                                            */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Storefront Design & Appearance
                </h1>
                {isGoldPlan ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Gold Plan Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Preview Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize templates, colors, and visual branding for your public storefront.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Discard unsaved changes */}
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
          )}

          {/* Reset to default */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset to default OrderOne styling"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Default</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSaveDesign(false)}
            disabled={saving || publishing}
            className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save Draft</span>
          </button>

          {/* Publish to Live Storefront */}
          <button
            type="button"
            onClick={() => handleSaveDesign(true)}
            disabled={saving || publishing}
            className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isGoldPlan ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>Publish Changes</span>
          </button>
        </div>
      </div>

      {/* Success & Error Banners */}
      {publishSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Storefront design successfully published to your live public link!</span>
          </div>
          <Link
            href={publicUrl}
            target="_blank"
            className="font-bold underline flex items-center gap-1 text-emerald-900"
          >
            <span>View Live</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Draft design saved. Click &ldquo;Publish Changes&rdquo; when ready to make it live.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MAIN EDITOR GRID: CONTROLS (LEFT) + LIVE PREVIEW (RIGHT)  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: DESIGN CONTROLS (5 COLS)                        */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
          {/* SECTION A: TEMPLATE SELECTOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">1. Select Storefront Template</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between two responsive storefront layouts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_DEFINITIONS.map((tmpl) => {
                const isSelected = templateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplateId(tmpl.id)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all relative cursor-pointer flex flex-col justify-between h-full',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {tmpl.badge}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{tmpl.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tmpl.tagline}</p>
                    </div>

                    <ul className="mt-3 space-y-1 text-[10px] text-slate-600 border-t border-slate-100 pt-2.5">
                      {tmpl.features.slice(0, 3).map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Optional Cover Image Banner for Modern Template */}
            {templateId === 'modern' && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Hero Cover Banner Image (Optional)
                  </label>
                  {coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {coverImageUrl ? (
                  <div className="relative h-28 rounded-xl overflow-hidden border border-slate-200 group">
                    <img
                      src={coverImageUrl}
                      alt="Cover banner preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-2.5 py-1 bg-white text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-slate-50 shadow-xs">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg shadow-xs hover:bg-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                    {uploadingCover ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mb-1" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    )}
                    <span className="text-xs font-bold text-slate-700">
                      {uploadingCover ? 'Uploading Banner...' : 'Upload Cover Banner'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP up to 5MB (1200x400 recommended). Fallback is dynamic gradient.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* SECTION B: COLOR CUSTOMIZATION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">2. Customize Storefront Colors</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick a ready-made palette or customize individual HEX colors.
              </p>
            </div>

            {/* PRESET PALETTES */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Preset Palettes
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isActive =
                    colors.primary === preset.colors.primary &&
                    colors.button === preset.colors.button &&
                    colors.background === preset.colors.background;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.colors)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                        isActive
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: preset.colors.button }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: preset.colors.background }}
                        />
                      </div>
                      <span className="font-bold text-xs text-slate-800 block truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INDIVIDUAL HEX COLOR PICKERS */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Fine-tune Palette Colors (HEX)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Primary Color */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Primary Brand</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.primary}
                      onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.primary}
                      onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* 2. Secondary Color */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Secondary Accent</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.secondary}
                      onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.secondary}
                      onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* 3. Accent Color */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Sale &amp; Highlights</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.accent}
                      onChange={(e) => setColors({ ...colors, accent: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.accent}
                      onChange={(e) => setColors({ ...colors, accent: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* 4. Action Button Color */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Action Button</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.button}
                      onChange={(e) => setColors({ ...colors, button: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.button}
                      onChange={(e) => setColors({ ...colors, button: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* 5. Page Background */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Page Background</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.background}
                      onChange={(e) => setColors({ ...colors, background: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.background}
                      onChange={(e) => setColors({ ...colors, background: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* 6. Typography Text Color */}
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Body Text Color</span>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
                    <input
                      type="color"
                      value={colors.text}
                      onChange={(e) => setColors({ ...colors, text: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={colors.text}
                      onChange={(e) => setColors({ ...colors, text: e.target.value })}
                      className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Accessible Contrast Check Pill */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs mt-2">
                <span className="text-slate-600 font-medium">Automatic Contrast Verification:</span>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-black shadow-2xs"
                    style={{
                      backgroundColor: colors.button,
                      color: getContrastTextColor(colors.button),
                    }}
                  >
                    Button Text ({getContrastTextColor(colors.button)})
                  </span>
                  <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    WCAG Pass
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW (7 COLS)               */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 min-w-0 space-y-3 sticky top-4">
          {/* Preview Header & Device Switcher */}
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-900 tracking-tight">
                Live Storefront Preview
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                {isDirty ? 'Draft Preview' : isPublished ? 'Published' : 'Unpublished'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Device Toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors cursor-pointer',
                    previewDevice === 'mobile'
                      ? 'bg-white shadow-2xs text-indigo-600'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors cursor-pointer',
                    previewDevice === 'desktop'
                      ? 'bg-white shadow-2xs text-indigo-600'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>

              {/* View Live Storefront */}
              <Link
                href={publicUrl}
                target="_blank"
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                title="Open live published storefront in new tab"
              >
                <span>Live Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Preview Viewport Frame */}
          <div className="bg-slate-900/5 p-2 sm:p-4 rounded-3xl border border-slate-200/80 flex justify-center">
            <div
              className={cn(
                'transition-all duration-300 overflow-hidden shadow-2xl bg-white border border-slate-300/80',
                previewDevice === 'mobile'
                  ? 'w-[375px] max-w-full rounded-[28px] sm:rounded-[40px] border-4 sm:border-8 border-slate-800 ring-2 ring-black/10'
                  : 'w-full rounded-2xl'
              )}
              style={{
                height: previewDevice === 'mobile' ? '680px' : '720px',
              }}
            >
              {/* Phone Mock Header Notch (if mobile) */}
              {previewDevice === 'mobile' && (
                <div className="w-full bg-slate-800 py-1 flex items-center justify-center">
                  <div className="w-20 h-3 rounded-full bg-black/60" />
                </div>
              )}

              {/* Scrollable Preview Canvas */}
              <div className="h-full overflow-y-auto">
                {currentBusiness && (
                  <StorefrontRenderer
                    business={currentBusiness}
                    products={products}
                    categories={categories}
                    templateId={templateId}
                    colors={colors}
                    coverImageUrl={coverImageUrl}
                    cart={previewCart}
                    onUpdateQuantity={(prodId, delta) => {
                      setPreviewCart((prev) => {
                        const next = (prev[prodId] || 0) + delta;
                        if (next <= 0) {
                          const copy = { ...prev };
                          delete copy[prodId];
                          return copy;
                        }
                        return { ...prev, [prodId]: next };
                      });
                    }}
                    onOpenCart={() => {
                      alert('Cart drawer preview is active. All items can be added directly in the preview!');
                    }}
                    isPreview={true}
                    isRestaurant={isFoodCategory}
                    selectedCat={previewTab}
                    onSelectCat={setPreviewTab}
                    search={previewSearch}
                    onSearchChange={setPreviewSearch}
                    dietaryFilter={previewDietary}
                    onDietaryFilterChange={setPreviewDietary}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. UPGRADE MODAL FOR BASIC SUBSCRIBERS                       */}
      {/* ============================================================ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Upgrade to Gold to Publish Your Design
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Storefront Design Customization (including the Modern Visual template, hero cover
                banners, and custom brand colors) is exclusively available to businesses with the{' '}
                <strong>Gold Plan (₹149/month)</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold">What you get with Gold (₹149/mo):</div>
              <ul className="space-y-1 text-[11px] text-amber-800">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Choose between Classic and Modern visual templates</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Upload hero cover images and banners</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Custom brand color palette &amp; preset themes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Custom UPI ID &amp; QR Standee customer payment collection</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Keep Previewing
              </button>
              <Link
                href="/dashboard/subscription"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md text-center transition-all flex items-center justify-center gap-1"
              >
                <span>Upgrade to Gold</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
