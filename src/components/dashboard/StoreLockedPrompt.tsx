'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, Check, ArrowRight } from 'lucide-react';

interface StoreLockedPromptProps {
  featureName?: string;
  description?: string;
}

export function StoreLockedPrompt({
  featureName = 'Custom Merchant UPI QR Setup',
  description = 'Your business is currently subscribed to the Basic plan (₹20/month). Custom merchant UPI QR code payment collections, dual Store + Menu modules, and unlimited products are exclusive to the Gold plan (₹99/month).',
}: StoreLockedPromptProps) {
  return (
    <div className="max-w-2xl mx-auto my-10 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center font-sans">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
        <Lock className="w-7 h-7" />
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-block mb-3">
        Gold Plan Exclusive (₹99/month)
      </span>

      <h2 className="text-xl font-black text-[#0F172A] mb-2">
        {featureName} Requires Gold Plan
      </h2>

      <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto mb-6 text-xs space-y-2">
        <p className="font-bold text-[#0F172A] mb-1">Upgrade to Gold (₹99/mo) to unlock:</p>
        <div className="flex items-center gap-2 text-slate-700">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Custom merchant UPI ID & QR payment setup for customer checkout</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Simultaneous Dual-Engine: Store + Dining Menu active together</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Unlimited product & material catalog (1000+ items)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Advanced sales analytics & multi-staff management</span>
        </div>
      </div>

      <Link
        href="/dashboard/subscription?plan=gold"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-black text-xs shadow-md transition-all"
      >
        <Sparkles className="w-4 h-4" />
        <span>Upgrade to Gold for ₹99/month</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
