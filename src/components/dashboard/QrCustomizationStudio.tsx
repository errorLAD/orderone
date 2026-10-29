'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Palette,
  Layers,
  Image as ImageIcon,
  Check,
  Download,
  FileText,
  Save,
  Lock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Sliders,
  Type,
  Square,
  Circle,
  HelpCircle,
  Copy,
  ExternalLink,
  Upload,
  Trash2,
  BedDouble,
  UtensilsCrossed,
} from 'lucide-react';
import { QrCustomizationSettings, QrDotStyle, QrEyeStyle, QrFrameStyle, QrCenterBadgeType } from '@/types';
import {
  DEFAULT_QR_CUSTOMIZATION,
  QR_PRESET_TEMPLATES,
  COLOR_SWATCHES,
  DOT_STYLES,
  EYE_STYLES,
  FRAME_STYLES,
  isValidHexColor,
} from '@/lib/qrPresets';
import { CustomQrCanvas, downloadQrPdf } from './CustomQrCanvas';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QrCustomizationStudioProps {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessSlug: string;
  targetUrl: string;
  isGoldPlan: boolean;
  qrType?: 'store' | 'menu' | 'table' | 'room' | 'payment_qr';
  tableNumber?: string;
  roomNumber?: string;
}

export function QrCustomizationStudio({
  businessId,
  businessName,
  businessLogo,
  businessSlug,
  targetUrl,
  isGoldPlan,
  qrType,
  tableNumber,
  roomNumber,
}: QrCustomizationStudioProps) {
  const [customization, setCustomization] = useState<QrCustomizationSettings>(DEFAULT_QR_CUSTOMIZATION);
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'patterns' | 'frames'>('presets');
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>('');
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // File upload refs and state for logo uploads
  const centerLogoFileRef = useRef<HTMLInputElement | null>(null);
  const headerLogoFileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<'center' | 'header' | null>(null);

  // Automatically sync table or room number into center badge text when switching destinations
  useEffect(() => {
    if (tableNumber) {
      setCustomization((prev) => ({
        ...prev,
        centerBadgeText: prev.centerBadgeText || tableNumber,
      }));
    } else if (roomNumber) {
      setCustomization((prev) => ({
        ...prev,
        centerBadgeText: prev.centerBadgeText || `Room ${roomNumber}`,
      }));
    }
  }, [tableNumber, roomNumber]);

  // Handle uploading logo file to server storage
  const handleUploadLogo = async (file: File, target: 'center' | 'header') => {
    try {
      setUploadingLogo(target);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload logo image');
      }

      if (target === 'center') {
        setCustomization((prev) => ({
          ...prev,
          customLogoUrl: data.url,
          showLogo: true,
          templateId: 'custom',
        }));
      } else {
        setCustomization((prev) => ({
          ...prev,
          headerLogoUrl: data.url,
          showHeaderLogo: true,
          showBusinessName: true,
          templateId: 'custom',
        }));
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setErrorMsg(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingLogo(null);
    }
  };

  // Fetch saved customization from backend on mount
  useEffect(() => {
    if (!businessId) return;

    fetch(`/api/businesses/qr-customization?businessId=${businessId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.customization) {
          setCustomization(data.customization);
        }
      })
      .catch((err) => console.error('Error loading QR customization:', err))
      .finally(() => setLoadingInitial(false));
  }, [businessId]);

  const handleApplyPreset = (presetSettings: QrCustomizationSettings) => {
    setCustomization({
      ...presetSettings,
      showLogo: customization.showLogo,
      customLogoUrl: customization.customLogoUrl,
    });
  };

  const handleSave = async () => {
    if (!isGoldPlan) {
      setErrorMsg('QR Code Customization is an exclusive Gold feature. Please upgrade to save your design.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSavedSuccess(false);

      const res = await fetch('/api/businesses/qr-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...customization,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save QR customization');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPng = () => {
    if (!isGoldPlan) {
      setErrorMsg('Please upgrade to the Gold Plan to download customized high-resolution QR codes.');
      return;
    }

    if (!generatedDataUrl) return;
    const a = document.createElement('a');
    a.href = generatedDataUrl;
    a.download = `${businessSlug}-custom-qr.png`;
    a.click();
  };

  const handleDownloadPdf = async () => {
    if (!isGoldPlan) {
      setErrorMsg('Please upgrade to the Gold Plan to download print-ready PDF posters.');
      return;
    }

    if (!activeCanvas) return;
    try {
      setDownloadingPdf(true);
      await downloadQrPdf({
        canvas: activeCanvas,
        businessName: (customization.showHeaderTitle !== false && customization.headerTitle) || businessName,
        targetUrl,
        frameText: customization.frameText,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleResetToDefault = () => {
    setCustomization(DEFAULT_QR_CUSTOMIZATION);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Scannability Assurance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Branded QR Code Studio</h2>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                  isGoldPlan
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                )}
              >
                {isGoldPlan ? '★ Gold Entitlement Active' : 'Gold Feature (Locked)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize colors, designer dot patterns, frame borders, and embed your business logo for print & digital display.
            </p>
          </div>
        </div>

        {/* Live Scannability Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Scannable (Level H)</span>
        </div>
      </div>

      {/* Upgrade Banner for Basic Plan Users */}
      {!isGoldPlan && (
        <div className="p-6 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-200 text-amber-900">
                <Lock className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-amber-950">
                Unlock Custom QR Branding with Gold Plan
              </h3>
            </div>
            <p className="text-xs text-amber-900 max-w-xl">
              Basic accounts receive standard black-and-white QR codes. Upgrade to Gold to customize brand colors, patterns, corner eyes, embed your custom logo, and export print-ready high-resolution PDFs.
            </p>
          </div>
          <Link
            href="/dashboard/subscription?plan=gold"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
          >
            <span>Upgrade to Gold Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Studio Grid: Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          {/* Studio Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('presets')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap',
                activeTab === 'presets' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ready Presets (8)</span>
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap',
                activeTab === 'colors' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Colors & Background</span>
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap',
                activeTab === 'patterns' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Patterns & Eyes</span>
            </button>
            <button
              onClick={() => setActiveTab('frames')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap',
                activeTab === 'frames' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Type className="w-3.5 h-3.5 text-indigo-600" />
              <span>Header, Frames & Logo</span>
            </button>
          </div>

          {/* TAB 1: Ready-Made Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ready-Made Designer Templates
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any design preset to immediately apply brand-tested palettes, frames, and patterns.
                  </p>
                </div>
                <button
                  onClick={handleResetToDefault}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {QR_PRESET_TEMPLATES.map((preset) => {
                  const isSelected = customization.templateId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.settings)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between gap-2.5',
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Swatch Preview Bar */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.settings.foregroundColor }}
                          title={`Foreground: ${preset.settings.foregroundColor}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.settings.backgroundColor }}
                          title={`Background: ${preset.settings.backgroundColor}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.settings.eyeColor }}
                          title={`Eye: ${preset.settings.eyeColor}`}
                        />
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                          {preset.settings.dotStyle}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-tight">{preset.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Colors & Background */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              {/* Foreground Color */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    QR Pattern / Foreground Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customization.foregroundColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          foregroundColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customization.foregroundColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          foregroundColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      onClick={() =>
                        setCustomization({
                          ...customization,
                          foregroundColor: swatch.hex,
                          templateId: 'custom',
                        })
                      }
                      className={cn(
                        'w-6 h-6 rounded-lg border border-black/10 transition transform hover:scale-110 shrink-0',
                        customization.foregroundColor.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'ring-2 ring-indigo-600 scale-110'
                          : ''
                      )}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Background Canvas Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customization.backgroundColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          backgroundColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customization.backgroundColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          backgroundColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {[
                    { label: 'Pure White', hex: '#FFFFFF' },
                    { label: 'Warm Cream', hex: '#FFFBEB' },
                    { label: 'Soft Mint', hex: '#F0FDF4' },
                    { label: 'Soft Slate', hex: '#F8FAFC' },
                    { label: 'Midnight Onyx', hex: '#0F172A' },
                  ].map((bgOpt) => (
                    <button
                      key={bgOpt.hex}
                      onClick={() =>
                        setCustomization({
                          ...customization,
                          backgroundColor: bgOpt.hex,
                          templateId: 'custom',
                        })
                      }
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition',
                        customization.backgroundColor.toLowerCase() === bgOpt.hex.toLowerCase()
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: bgOpt.hex }}
                      />
                      <span>{bgOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Eye Accent Color */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Corner Eyes Accent Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customization.eyeColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          eyeColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={customization.eyeColor}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          eyeColor: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCustomization({
                        ...customization,
                        eyeColor: customization.foregroundColor,
                        templateId: 'custom',
                      })
                    }
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Match Pattern Color
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Patterns & Eyes */}
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              {/* Dot / Module Patterns */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  QR Module Dot Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {DOT_STYLES.map((d) => {
                    const isSelected = customization.dotStyle === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() =>
                          setCustomization({
                            ...customization,
                            dotStyle: d.id,
                            templateId: 'custom',
                          })
                        }
                        className={cn(
                          'p-3 rounded-xl border text-left transition',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <span className="text-xs font-bold text-slate-900 block">{d.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{d.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corner Eye Styles */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Corner Eye (Finder Pattern) Shape
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {EYE_STYLES.map((eye) => {
                    const isSelected = customization.eyeStyle === eye.id;
                    return (
                      <button
                        key={eye.id}
                        onClick={() =>
                          setCustomization({
                            ...customization,
                            eyeStyle: eye.id,
                            templateId: 'custom',
                          })
                        }
                        className={cn(
                          'p-3 rounded-xl border text-left transition',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <span className="text-xs font-bold text-slate-900 block">{eye.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{eye.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Header, Center Badge & Frames */}
          {activeTab === 'frames' && (
            <div className="space-y-4">
              {/* SECTION 1: Upper Standee Header (Optional Title, Subtitle, & Header Logo) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      1. Upper Header: Store / Restaurant Title & Logo
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Display your store name, header logo, and category tagline at the top of the standee.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.showBusinessName !== false}
                    onChange={(e) =>
                      setCustomization({
                        ...customization,
                        showBusinessName: e.target.checked,
                        templateId: 'custom',
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {customization.showBusinessName !== false && (
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    {/* Header Title (Store Name) - Optional Toggle & Custom Text */}
                    <div className="space-y-1.5 p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Header Store / Restaurant Title</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={customization.showHeaderTitle !== false}
                          onChange={(e) =>
                            setCustomization({
                              ...customization,
                              showHeaderTitle: e.target.checked,
                              templateId: 'custom',
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </div>

                      {customization.showHeaderTitle !== false && (
                        <div className="pt-1.5">
                          <input
                            type="text"
                            maxLength={50}
                            value={customization.headerTitle || ''}
                            onChange={(e) =>
                              setCustomization({
                                ...customization,
                                headerTitle: e.target.value,
                                templateId: 'custom',
                              })
                            }
                            placeholder={businessName || 'e.g. ROYAL KITCHEN'}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 uppercase bg-white focus:ring-2 focus:ring-slate-900"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Leave empty to automatically use default business name: <strong>{businessName}</strong>.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Header Logo Upload & Toggle */}
                    <div className="space-y-1.5 p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Header Brand Logo</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={customization.showHeaderLogo === true}
                          onChange={(e) =>
                            setCustomization({
                              ...customization,
                              showHeaderLogo: e.target.checked,
                              templateId: 'custom',
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </div>

                      {customization.showHeaderLogo && (
                        <div className="space-y-2 pt-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={headerLogoFileRef}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadLogo(file, 'header');
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => headerLogoFileRef.current?.click()}
                              disabled={uploadingLogo === 'header'}
                              className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              {uploadingLogo === 'header' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>Upload Header Logo</span>
                            </button>

                            {customization.headerLogoUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomization({
                                    ...customization,
                                    headerLogoUrl: undefined,
                                    templateId: 'custom',
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 bg-white"
                                title="Remove Header Logo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="url"
                            value={customization.headerLogoUrl || ''}
                            onChange={(e) =>
                              setCustomization({
                                ...customization,
                                headerLogoUrl: e.target.value,
                                templateId: 'custom',
                              })
                            }
                            placeholder={businessLogo || 'https://orderone.in/logo.png'}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Subtitle / Category Tagline */}
                    <div className="space-y-1.5 p-3 bg-white rounded-xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-800">
                        Tagline / Subtitle (Under Store Name)
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={customization.headerSubtitle || ''}
                        onChange={(e) =>
                          setCustomization({
                            ...customization,
                            headerSubtitle: e.target.value,
                            templateId: 'custom',
                          })
                        }
                        placeholder="e.g. DIGITAL STOREFRONT & MENU"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase bg-white focus:ring-2 focus:ring-slate-900"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                        {[
                          'DIGITAL STOREFRONT & MENU',
                          'SCAN • ORDER • PAY',
                          'IN-ROOM DINING',
                          'DINING TABLE MENU',
                          'OFFICIAL STORE QR',
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() =>
                              setCustomization({
                                ...customization,
                                headerSubtitle: sug,
                                templateId: 'custom',
                              })
                            }
                            className="text-[10px] font-semibold text-indigo-600 hover:underline bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Middle Center Badge (OPTIONAL - Logo, Room No, Table No) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      2. Middle Center Badge: Optional
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Keep center clean (pure QR matrix) or embed your Logo, Room No, or Table No.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.showLogo}
                    onChange={(e) =>
                      setCustomization({
                        ...customization,
                        showLogo: e.target.checked,
                        templateId: 'custom',
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {customization.showLogo && (
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    {/* Content Selector: Logo, Room/Table, or Both */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Choose Middle Center Badge Content:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'logo', label: 'Store Logo / Monogram', icon: ImageIcon },
                          { id: 'table_room', label: 'Room / Table No', icon: BedDouble },
                          { id: 'both', label: 'Logo + Room / Table', icon: Sparkles },
                        ].map((bType) => {
                          const isSel = (customization.centerBadgeType || 'logo') === bType.id;
                          const IconComp = bType.icon;
                          return (
                            <button
                              key={bType.id}
                              type="button"
                              onClick={() =>
                                setCustomization({
                                  ...customization,
                                  centerBadgeType: bType.id as QrCenterBadgeType,
                                  templateId: 'custom',
                                })
                              }
                              className={cn(
                                'p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1',
                                isSel
                                  ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-xs'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              )}
                            >
                              <IconComp className={cn('w-4 h-4', isSel ? 'text-indigo-600' : 'text-slate-500')} />
                              <span className={cn('text-[11px] font-bold leading-tight', isSel ? 'text-indigo-900' : 'text-slate-700')}>
                                {bType.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Room / Table Number Label (if table_room or both) */}
                    {(customization.centerBadgeType === 'table_room' || customization.centerBadgeType === 'both') && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                          Middle Room / Table / Counter Number Label
                        </label>
                        <input
                          type="text"
                          maxLength={25}
                          value={customization.centerBadgeText ?? (tableNumber || (roomNumber ? `Room ${roomNumber}` : ''))}
                          onChange={(e) =>
                            setCustomization({
                              ...customization,
                              centerBadgeText: e.target.value,
                              templateId: 'custom',
                            })
                          }
                          placeholder={tableNumber || (roomNumber ? `Room ${roomNumber}` : 'e.g. Table 4 or Room 101')}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 uppercase bg-white focus:ring-2 focus:ring-slate-900"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400">Presets:</span>
                          {[
                            'Table 1',
                            'Table 2',
                            'Table 4',
                            'Room 101',
                            'Room 102',
                            'Room 201',
                            'Temple 1',
                            'Counter 1',
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() =>
                                setCustomization({
                                  ...customization,
                                  centerBadgeText: chip,
                                  templateId: 'custom',
                                })
                              }
                              className="text-[10px] font-semibold text-indigo-600 hover:underline bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Logo Upload (if logo or both) */}
                    {(customization.centerBadgeType === 'logo' || customization.centerBadgeType === 'both' || !customization.centerBadgeType) && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            Middle Business Logo
                          </label>
                          <input
                            type="file"
                            ref={centerLogoFileRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadLogo(file, 'center');
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => centerLogoFileRef.current?.click()}
                            disabled={uploadingLogo === 'center'}
                            className="px-3 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            {uploadingLogo === 'center' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>Upload Logo File</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={customization.customLogoUrl || ''}
                            onChange={(e) =>
                              setCustomization({
                                ...customization,
                                customLogoUrl: e.target.value,
                                templateId: 'custom',
                              })
                            }
                            placeholder={businessLogo || 'https://orderone.in/logo.png'}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 bg-white"
                          />
                          {customization.customLogoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setCustomization({
                                  ...customization,
                                  customLogoUrl: undefined,
                                  templateId: 'custom',
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 bg-white shrink-0"
                              title="Clear Custom Logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Leave empty to automatically use your business monogram or initial.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: Frame Style & CTA Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  3. Standee Frame & CTA Banner Layout
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FRAME_STYLES.map((frame) => {
                    const isSelected = customization.frameStyle === frame.id;
                    return (
                      <button
                        key={frame.id}
                        type="button"
                        onClick={() =>
                          setCustomization({
                            ...customization,
                            frameStyle: frame.id,
                            templateId: 'custom',
                          })
                        }
                        className={cn(
                          'p-3 rounded-xl border text-left transition',
                          isSelected
                            ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <span className="text-xs font-bold text-slate-900 block">{frame.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{frame.description}</span>
                      </button>
                    );
                  })}
                </div>

                {customization.frameStyle !== 'none' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/60">
                    <label className="block text-xs font-bold text-slate-800">
                      Call to Action Banner Text
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={customization.frameText}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          frameText: e.target.value,
                          templateId: 'custom',
                        })
                      }
                      placeholder="e.g. SCAN TO ORDER"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 uppercase bg-white focus:ring-2 focus:ring-slate-900"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Suggestions:</span>
                      {['SCAN TO ORDER', 'SCAN FOR MENU', 'ORDER HERE', 'SCAN & PAY'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() =>
                            setCustomization({
                              ...customization,
                              frameText: sug,
                              templateId: 'custom',
                            })
                          }
                          className="text-[10px] font-semibold text-indigo-600 hover:underline bg-white px-2 py-0.5 rounded border border-slate-200"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Standee Verification Footer */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">
                    4. Standee Footer: Powered by OrderOne.in
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Official verification badge with brand logo and .in tag is rendered at the bottom of the standee.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shrink-0">
                  <span className="text-[10px] font-medium text-slate-500">Powered by</span>
                  <img src="/logo.png" alt="OrderOne" className="h-3 w-auto object-contain" />
                  <span className="text-[8px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded">
                    .in
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer: Save & Status */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {savedSuccess ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Customization saved in Supabase!
                </span>
              ) : errorMsg ? (
                <span className="text-red-600 font-semibold">{errorMsg}</span>
              ) : (
                <span>Changes apply live immediately to canvas.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isGoldPlan}
                className={cn(
                  'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs',
                  isGoldPlan
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Design to Cloud</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview & Download Column (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Live Interactive Preview
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {customization.dotStyle} • {customization.eyeStyle}
            </span>
          </div>

          {/* The Canvas Renderer */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[360px]">
            <CustomQrCanvas
              targetUrl={targetUrl}
              customization={customization}
              businessName={businessName}
              businessLogo={businessLogo}
              size={360}
              tableNumber={tableNumber}
              roomNumber={roomNumber}
              onGenerated={(dataUrl, canvas) => {
                setGeneratedDataUrl(dataUrl);
                setActiveCanvas(canvas);
              }}
            />
          </div>

          {/* Target URL Reference & Copy Link */}
          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-mono text-[11px] text-slate-600">{targetUrl}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyLink}
                className="p-1 text-slate-600 hover:text-slate-900 bg-white rounded border border-slate-200"
                title="Copy Target Storefront Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-600 hover:text-slate-900 bg-white rounded border border-slate-200"
                title="Open Link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Export & Download Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPng}
                disabled={!isGoldPlan}
                className={cn(
                  'py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs border',
                  isGoldPlan
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                )}
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={!isGoldPlan || downloadingPdf}
                className={cn(
                  'py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs',
                  isGoldPlan
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                {downloadingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>Export PDF</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              PDF exports are calibrated in standard A4 portrait for instant commercial or tabletop printing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
