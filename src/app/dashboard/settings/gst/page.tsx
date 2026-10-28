'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ReceiptText,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  RefreshCw,
  Eye,
  FileText,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GstInvoiceSettings, SubscriptionPlan } from '@/types';
import { validateGstin } from '@/lib/gstCalculator';
import { formatINR, cn } from '@/lib/utils';

export default function GstInvoiceSettingsPage() {
  const { currentBusiness, refreshBusinesses } = useApp();

  const [isGoldPlan, setIsGoldPlan] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gstinError, setGstinError] = useState<string | null>(null);

  // Form State
  const [isGstRegistered, setIsGstRegistered] = useState<boolean>(false);
  const [gstin, setGstin] = useState<string>('');
  const [legalBusinessName, setLegalBusinessName] = useState<string>('');
  const [registeredAddress, setRegisteredAddress] = useState<string>('');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(5);
  const [pricesIncludeGst, setPricesIncludeGst] = useState<boolean>(false);
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-2026-');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('Thank you for your business. For any queries, please contact store support.');
  const [hsnCodeDefault, setHsnCodeDefault] = useState<string>('');

  const fetchGstData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/gst?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success) {
        setIsGoldPlan(data.isGoldPlan);
        if (data.gstSettings) {
          const s: GstInvoiceSettings = data.gstSettings;
          setIsGstRegistered(s.isGstRegistered);
          setGstin(s.gstin || '');
          setLegalBusinessName(s.legalBusinessName || currentBusiness.name || '');
          setRegisteredAddress(s.registeredAddress || currentBusiness.address || '');
          setDefaultGstRate(s.defaultGstRate !== undefined ? s.defaultGstRate : 5);
          setPricesIncludeGst(Boolean(s.pricesIncludeGst));
          setInvoicePrefix(s.invoicePrefix || 'INV-2026-');
          setInvoiceNotes(s.invoiceNotes || 'Thank you for your business.');
          setHsnCodeDefault(s.hsnCodeDefault || '');
        } else {
          setLegalBusinessName(currentBusiness.name || '');
          setRegisteredAddress(currentBusiness.address || '');
        }
      }
    } catch (err: any) {
      console.error('Error loading GST settings:', err);
      setErrorMsg(err.message || 'Failed to load GST settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstData();
  }, [currentBusiness?.id]);

  const handleGstinBlur = () => {
    if (!isGstRegistered || !gstin.trim()) {
      setGstinError(null);
      return;
    }
    const val = validateGstin(gstin);
    if (!val.isValid) {
      setGstinError(val.error || 'Invalid GSTIN');
    } else {
      setGstinError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    if (isGstRegistered && gstin.trim()) {
      const val = validateGstin(gstin);
      if (!val.isValid) {
        setGstinError(val.error || 'Invalid GSTIN');
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/businesses/gst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          isGstRegistered,
          gstin: gstin.trim().toUpperCase() || undefined,
          legalBusinessName: legalBusinessName.trim() || undefined,
          registeredAddress: registeredAddress.trim() || undefined,
          defaultGstRate: Number(defaultGstRate),
          pricesIncludeGst,
          invoicePrefix: invoicePrefix.trim().toUpperCase() || 'INV-',
          invoiceNotes: invoiceNotes.trim() || undefined,
          hsnCodeDefault: hsnCodeDefault.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        await refreshBusinesses();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to save GST settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving GST settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#4F46E5] mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading GST & Invoice configuration...</p>
      </div>
    );
  }

  // Basic Plan Locked Screen
  if (!isGoldPlan) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight">GST & Invoices Configuration</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure GST registration, tax breakdowns, and automated invoice numbers for customer orders
          </p>
        </div>

        <div className="p-8 bg-white rounded-2xl border border-amber-200 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-7 h-7" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-block mb-3">
            Gold Plan Feature (₹99/month)
          </span>

          <h2 className="text-lg font-black text-[#0F172A] mb-2">
            GST Settings & Tax Invoices are Locked
          </h2>

          <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed mb-6">
            Your store is currently on the <strong>Basic plan (₹20/month)</strong>. Custom GST registration, automated CGST + SGST tax breakdown, and compliant Tax Invoices are exclusive to the <strong>Gold plan</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-[#0F172A]">Basic (₹20/mo)</p>
              <ul className="text-[11px] text-[#64748B] mt-1 space-y-1">
                <li>• Ordinary order receipts only</li>
                <li>• No GST configuration</li>
                <li>• No CGST/SGST tax calculations</li>
                <li>• No custom invoice numbering</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <p className="font-bold text-indigo-900 flex items-center justify-between">
                <span>Gold (₹99/mo)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold">Unlocks This</span>
              </p>
              <ul className="text-[11px] text-indigo-950 mt-1 space-y-1">
                <li>• Official Tax Invoices</li>
                <li>• GSTIN & legal business details</li>
                <li>• Automated CGST + SGST split</li>
                <li>• Inclusive/exclusive price handling</li>
              </ul>
            </div>
          </div>

          <Link
            href="/dashboard/subscription?plan=gold"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-black text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Gold for ₹99/mo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Simulated Calculation Preview
  const sampleSubtotal = 1000;
  const sampleRate = defaultGstRate;
  const sampleTaxable = pricesIncludeGst
    ? Number((sampleSubtotal / (1 + sampleRate / 100)).toFixed(2))
    : sampleSubtotal;
  const sampleTax = pricesIncludeGst
    ? Number((sampleSubtotal - sampleTaxable).toFixed(2))
    : Number(((sampleSubtotal * sampleRate) / 100).toFixed(2));
  const sampleTotal = pricesIncludeGst ? sampleSubtotal : sampleSubtotal + sampleTax;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A] tracking-tight">GST & Invoices</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              Gold Plan Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your GST registration, tax rates, price tax inclusivity, and customer invoice formatting.
          </p>
        </div>

        <Link
          href="/dashboard/subscription"
          className="text-xs font-semibold text-slate-600 hover:text-[#4F46E5] flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-2xs"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Manage Subscription</span>
        </Link>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>GST and invoice settings saved successfully! Customer orders will now calculate tax according to these rules.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statutory Disclaimer */}
      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">GST Notice & Statutory Disclaimer</p>
          <p className="text-amber-800 leading-relaxed">
            GST registration obligations depend on your business turnover, state jurisdiction, and category under Indian Goods and Services Tax laws. OrderOne.in validates GSTIN syntax and calculates CGST/SGST per your configuration. Official taxpayer verification requires integration with government GST portal services.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Configuration */}
        <form onSubmit={handleSave} className="lg:col-span-2 min-w-0 space-y-4">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            {/* GST Registration Status Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">GST Registration Status</h2>
                <p className="text-[11px] text-slate-500">Enable if your business is registered under GST</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGstRegistered}
                  onChange={(e) => setIsGstRegistered(e.target.checked)}
                  className="rounded text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {isGstRegistered ? 'GST Registered' : 'Not GST Registered'}
                </span>
              </label>
            </div>

            {/* GSTIN Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN (Goods & Services Tax Identification Number) {isGstRegistered && '*'}
              </label>
              <input
                type="text"
                required={isGstRegistered}
                disabled={!isGstRegistered}
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={gstin}
                onBlur={handleGstinBlur}
                onChange={(e) => {
                  setGstin(e.target.value.toUpperCase());
                  if (gstinError) setGstinError(null);
                }}
                className={cn(
                  'w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-[#4F46E5]',
                  gstinError ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white disabled:bg-slate-50 disabled:text-slate-400'
                )}
              />
              {gstinError ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{gstinError}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  15-digit code: 2 state digits + 10 PAN characters + 1 entity code + Z + 1 check digit.
                </p>
              )}
            </div>

            {/* Legal Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Legal Business Name (for Tax Invoices)
              </label>
              <input
                type="text"
                placeholder="e.g. Annapurna Foods & Retail Private Limited"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#4F46E5]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                The official business name as registered with the tax authority.
              </p>
            </div>

            {/* Registered Business Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Principal Place of Business Address
              </label>
              <textarea
                rows={2}
                placeholder="Full address registered with GST authority, including State & PIN Code"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Default Applicable GST Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Applicable GST Rate (%)
                </label>
                <select
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                  disabled={!isGstRegistered}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#4F46E5] bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value={0}>0% (Exempt / Nil Rated)</option>
                  <option value={5}>5% (Restaurants, Packed Staples)</option>
                  <option value={12}>12% (Processed Foods, Hardware)</option>
                  <option value={18}>18% (Standard Retail Goods & Dining)</option>
                  <option value={28}>28% (Luxury & Cement/Paints)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Split equally into CGST & SGST for local orders.</p>
              </div>

              {/* Invoice Number Prefix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026- or SL-"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-[#4F46E5]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Example output: {invoicePrefix}00102</p>
              </div>
            </div>

            {/* Price Tax Inclusivity Setting */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pricesIncludeGst}
                  onChange={(e) => setPricesIncludeGst(e.target.checked)}
                  className="mt-0.5 rounded text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Product and Menu Prices Already Include GST (MRP Inclusive)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When enabled, tax is extracted backwards from the item price so the customer is not charged tax twice. When disabled, tax is added on top of the subtotal.
                  </p>
                </div>
              </label>
            </div>

            {/* Invoice Footer Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Invoice Footer Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Subject to Bangalore jurisdiction. Goods once sold will not be taken back."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Changes apply immediately to newly placed orders and invoices.
              </span>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save GST Settings'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Preview: Sample Customer Invoice / Receipt */}
        <div className="lg:col-span-1 min-w-0 space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-xs">Customer Invoice Preview</h3>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sample Order</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-sans space-y-3 text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <p className="text-[10px] uppercase font-black tracking-widest text-[#4F46E5]">
                  {isGstRegistered && gstin ? 'TAX INVOICE' : 'ORDER RECEIPT'}
                </p>
                <p className="font-black text-slate-900 text-sm mt-0.5">
                  {legalBusinessName || currentBusiness?.name || 'Your Business Name'}
                </p>
                <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto truncate">
                  {registeredAddress || currentBusiness?.address || 'Your Business Address'}
                </p>
                {isGstRegistered && gstin && (
                  <p className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                    GSTIN: {gstin}
                  </p>
                )}
              </div>

              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Invoice: {invoicePrefix}00102</span>
                <span>Token: #S-00102</span>
              </div>

              {/* Sample Items */}
              <div className="py-2 border-y border-slate-200/80 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span>1x Sample Catalog Item</span>
                  <span className="font-semibold text-slate-800">{formatINR(sampleSubtotal)}</span>
                </div>
              </div>

              {/* Tax Calculations */}
              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(sampleSubtotal)}</span>
                </div>

                {isGstRegistered && sampleRate > 0 && (
                  <>
                    <div className="flex justify-between text-indigo-900 font-medium">
                      <span>CGST ({sampleRate / 2}%):</span>
                      <span>{formatINR(sampleTax / 2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-900 font-medium">
                      <span>SGST ({sampleRate / 2}%):</span>
                      <span>{formatINR(sampleTax / 2)}</span>
                    </div>
                    {pricesIncludeGst && (
                      <p className="text-[9px] text-emerald-600 font-bold">
                        (Inclusive of ₹{sampleTax.toFixed(2)} total GST)
                      </p>
                    )}
                  </>
                )}

                <div className="flex justify-between font-black text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span>{formatINR(sampleTotal)}</span>
                </div>
              </div>

              {invoiceNotes && (
                <p className="text-[9px] text-slate-400 text-center pt-2 border-t border-dashed border-slate-200">
                  {invoiceNotes}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Immutable Tax Invoices</span>
            </p>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              When an order is placed, its tax breakdown (CGST, SGST, GSTIN, legal name) is permanently sealed with the order record. If you update your GST rates later, historical invoices will never change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
