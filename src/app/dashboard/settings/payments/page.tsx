'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  Smartphone,
  Save,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink,
  Check,
  Globe,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BusinessUpiSettings, SubscriptionPlan } from '@/types';
import { formatINR } from '@/lib/utils';
import { buildUpiPaymentUri } from '@/lib/upiQr';

export default function PaymentsUpiSettingsPage() {
  const { currentBusiness, refreshBusinesses } = useApp();

  const [isGoldPlan, setIsGoldPlan] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [upiId, setUpiId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [copiedStoreUrl, setCopiedStoreUrl] = useState<boolean>(false);
  const [copiedUpiUri, setCopiedUpiUri] = useState<boolean>(false);

  // Fetch UPI settings and check Gold subscription
  const fetchUpiData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/upi?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success) {
        setIsGoldPlan(data.isGoldPlan);
        setCurrentPlan(data.currentPlan);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://orderone.in';
        const defaultUrl = data.defaultStoreUrl || `${origin}/store/${currentBusiness.slug}`;
        if (data.upiSettings) {
          setUpiId(data.upiSettings.upiId || '');
          setPayeeName(data.upiSettings.payeeName || currentBusiness.name || '');
          setStoreUrl(data.upiSettings.storeUrl || defaultUrl);
          setQrImageUrl(data.upiSettings.qrImageUrl || '');
          setInstructions(data.upiSettings.instructions || '');
          setIsEnabled(data.upiSettings.isEnabled !== false);
        } else {
          setPayeeName(currentBusiness.name || '');
          setStoreUrl(defaultUrl);
        }
      }
    } catch (err: any) {
      console.error('Error loading UPI settings:', err);
      setErrorMsg(err.message || 'Failed to load UPI settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpiData();
  }, [currentBusiness?.id]);

  const handleCopyStoreUrl = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopiedStoreUrl(true);
    setTimeout(() => setCopiedStoreUrl(false), 2000);
  };

  const handleCopyUpiUri = () => {
    if (!upiId) return;
    const uri = buildUpiPaymentUri({
      upiId,
      payeeName: payeeName || 'Store',
      amount: 0,
      orderReference: 'Store Checkout',
    });
    navigator.clipboard.writeText(uri);
    setCopiedUpiUri(true);
    setTimeout(() => setCopiedUpiUri(false), 2000);
  };

  // Handle QR image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/businesses/upi-qr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setQrImageUrl(data.url);
      } else {
        setErrorMsg(data.error || 'Failed to upload QR code image');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading QR image');
    } finally {
      setUploading(false);
    }
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/businesses/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          upiId: upiId.trim(),
          payeeName: payeeName.trim(),
          storeUrl: storeUrl.trim() || undefined,
          qrImageUrl: qrImageUrl || undefined,
          instructions: instructions.trim() || undefined,
          isEnabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        await refreshBusinesses();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Generate dynamic standard UPI QR URL preview (using QR Server API for fast preview)
  const dynamicQrPreviewUrl = upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(payeeName || 'Store')}&cu=INR`
      )}`
    : '';

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#4F46E5] mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading UPI configuration & plan entitlements...</p>
      </div>
    );
  }

  // If Basic plan, show the locked feature screen with Gold upgrade CTA
  if (!isGoldPlan) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight">Payments & UPI Settings</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure direct customer UPI payment collection for your digital storefronts
          </p>
        </div>

        <div className="p-8 bg-white rounded-2xl border border-amber-200 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-7 h-7" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-block mb-3">
            Gold Plan Feature (₹149/month)
          </span>

          <h2 className="text-lg font-black text-[#0F172A] mb-2">
            Custom UPI QR & Direct Payment is Locked
          </h2>

          <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed mb-6">
            Your business is currently on the <strong>Basic plan (₹49/month)</strong>. Direct customer UPI QR code setup, instant checkout QR generation, and the Retail Store catalog are exclusive to the <strong>Gold plan</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-6 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-[#0F172A]">Basic (₹49/mo)</p>
              <ul className="text-[11px] text-[#64748B] mt-1 space-y-1">
                <li>• Digital Food Menu only</li>
                <li>• Pay-at-counter fulfillment</li>
                <li>• Store module locked</li>
                <li>• No custom UPI QR</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <p className="font-bold text-indigo-900 flex items-center justify-between">
                <span>Gold (₹149/mo)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold">Unlocks This</span>
              </p>
              <ul className="text-[11px] text-indigo-950 mt-1 space-y-1">
                <li>• Custom UPI ID & QR Code</li>
                <li>• Both Store & Menu enabled</li>
                <li>• Separate Store & Menu tokens</li>
                <li>• Product inventory & stock</li>
              </ul>
            </div>
          </div>

          <Link
            href="/dashboard/subscription?plan=gold"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-black text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Gold for ₹149/mo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A] tracking-tight">Payments & UPI Settings</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              Gold Plan Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure your merchant UPI ID and QR code to collect payments directly into your bank account.
          </p>
        </div>

        <Link
          href="/dashboard/subscription"
          className="text-xs font-semibold text-slate-600 hover:text-[#4F46E5] flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-2xs"
        >
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          <span>Manage Subscription</span>
        </Link>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>UPI payment configuration saved successfully! Your customer checkout pages will now display this QR code.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Configuration */}
        <form onSubmit={handleSave} className="lg:col-span-2 min-w-0 space-y-4">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Merchant UPI Details</h2>
                <p className="text-[11px] text-slate-500">Payments will be sent directly to this UPI address</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">Accept Customer UPI</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merchant UPI ID (VPA) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. annapurna@okhdfcbank or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Supported handles: @okaxis, @okhdfcbank, @okicici, @paytm, @ybl, @upi, etc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payee / Business Name (Display Name) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annapurna Cafe & Store"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This exact name is displayed on customer payment apps (GPay, PhonePe, Paytm).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Public Storefront URL
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://orderone.in/store/your-slug"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent bg-slate-50/70"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyStoreUrl}
                  className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shrink-0 text-slate-700 shadow-2xs"
                  title="Copy Storefront URL"
                >
                  {copiedStoreUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStoreUrl ? 'Copied' : 'Copy'}</span>
                </button>
                {storeUrl && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#4F46E5] hover:bg-slate-50 shadow-2xs"
                    title="Open Storefront in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Public URL customers visit to order. Storefront QR codes point to this URL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Payment Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please mention your Order Token number in the UPI note/remarks."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
              />
            </div>

            {/* Upload Static / Standee QR Image */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Upload Your Existing UPI Standee / QR Image (Optional)
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                If you already have a physical Paytm/PhonePe/GPay QR standee sticker, upload its photo here so customers see your exact familiar QR.
              </p>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload QR Image'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>

                {qrImageUrl && (
                  <button
                    type="button"
                    onClick={() => setQrImageUrl('')}
                    className="text-[11px] text-red-600 hover:underline font-medium"
                  >
                    Remove uploaded image
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer UPI payments go directly to your account. No platform commission.</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save UPI Settings'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right 1 Col: Live Customer Checkout Preview */}
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-xs">Customer Checkout Preview</h3>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Preview</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="text-[11px] font-bold text-slate-800">
                Pay via UPI ({payeeName || 'Your Business Name'})
              </div>

              {/* QR Image Display */}
              <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="Merchant UPI QR"
                    className="w-full h-full object-contain"
                  />
                ) : dynamicQrPreviewUrl ? (
                  <img
                    src={dynamicQrPreviewUrl}
                    alt="Generated UPI QR"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-3 text-slate-400 text-[10px]">
                    <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-1" />
                    Enter your UPI ID to generate live QR code
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scan with any UPI App</p>
                <p className="text-xs font-mono font-bold text-[#0F172A] mt-0.5">{upiId || 'yourname@upi'}</p>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] text-slate-500 font-semibold">
                  <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                </div>
                {upiId && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCopyUpiUri}
                      className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1 shadow-2xs"
                    >
                      {copiedUpiUri ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>{copiedUpiUri ? 'UPI URI Copied!' : 'Copy UPI URI'}</span>
                    </button>
                  </div>
                )}
              </div>

              {instructions && (
                <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-[10px] text-indigo-900 text-left">
                  <p className="font-bold mb-0.5">Note from Merchant:</p>
                  <p>{instructions}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                Payment verification: Order token is generated immediately with status <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono">pending_verification</code>.
              </div>
            </div>
          </div>

          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-sky-900 text-xs space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-600" />
              <span>Direct Bank Settlement</span>
            </p>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              When customers scan this QR and pay, funds settle immediately into your own bank account. There is no middleman gateway hold or 2-3% platform deduction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
