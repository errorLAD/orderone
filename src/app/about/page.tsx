import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  Store,
  UtensilsCrossed,
  Layers,
  QrCode,
  ShieldCheck,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

export const metadata: Metadata = {
  title: 'About Us | OrderOne.in — Operated by InfraBlue Materials Technology Private Limited',
  description:
    'Learn about OrderOne.in, a comprehensive digital storefront, menu, and token management platform operated by InfraBlue Materials Technology Private Limited for Indian retail and dining businesses.',
  alternates: {
    canonical: 'https://orderone.in/about',
  },
  openGraph: {
    title: 'About OrderOne.in — InfraBlue Materials Technology Private Limited',
    description:
      'Learn about OrderOne.in, an Indian multi-business digital storefront, QR menu, and token queue SaaS platform.',
    url: 'https://orderone.in/about',
  },
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" /> Corporate & Platform Overview
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              About OrderOne<span className="text-[#4F46E5]">.in</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              OrderOne.in is an Indian business-management, online storefront, and ordering platform operated by{' '}
              <strong className="text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</strong>.
            </p>
          </section>

          {/* Mission & Purpose */}
          <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Our Purpose</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              OrderOne.in was engineered to solve the operational and digital ordering challenges faced by diverse Indian retail and dining businesses. Many small and mid-sized enterprises struggle with complex, expensive software that forces mismatched layouts—such as displaying restaurant menu terminology to hardware traders or forcing retail checkout flows onto live food counters.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our platform delivers tailored modules that adapt specifically to the merchant’s trade category. Whether managing building materials and wholesale hardware, or preparing fast-moving cafe beverages and dine-in food tokens, OrderOne.in provides intuitive, high-performance tools designed for everyday commerce.
            </p>
          </section>

          {/* Categories Supported */}
          <section className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Businesses We Power</h2>
              <p className="text-xs text-slate-500">Tailored digital workflows for traditional retail and food service</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Retail, Grocery & Hardware</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hardware and building materials dealers, electrical shops, supermarkets, kirana stores, and retail boutiques utilize our product catalog, category navigation, inventory stock counters, and Store queue tokens (S-00101).
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Restaurants, Cafes & Food Counters</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dining restaurants, tea stalls, bakeries, juice centers, and cloud kitchens deploy contactless digital menus, QR ordering, kitchen display tokens (M-00101), and audio announcement readiness chimes.
                </p>
              </div>
            </div>
          </section>

          {/* Platform Features Grid */}
          <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Core Platform Capabilities</h2>
              <p className="text-xs text-slate-500">Built on modern, robust web infrastructure</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-700">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Branded QR Ordering & Storefronts</h4>
                  <p className="text-slate-500 mt-0.5">
                    Every business receives high-resolution downloadable QR code posters that customers scan to access live storefronts and digital menus.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Dual S- & M- Token Queues</h4>
                  <p className="text-slate-500 mt-0.5">
                    Separated order streams keep store and dining orders organized with public TV order-status display screens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Palette className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Storefront Design Customization</h4>
                  <p className="text-slate-500 mt-0.5">
                    Gold subscribers can choose Classic or Modern responsive templates and customize theme colors with live real-time previews.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">UPI & Dynamic Order QR Codes</h4>
                  <p className="text-slate-500 mt-0.5">
                    Gold merchants can configure custom UPI VPAs and generate amount-specific UPI payment QR codes for seamless zero-fee checkout.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Legal Operator Information */}
          <section className="p-6 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Operating Entity & Corporate Identity</h3>
            <p>
              OrderOne.in is wholly owned and operated by:
            </p>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-800">
              <p className="font-bold text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</p>
              <p>Platform Brand: {PLATFORM_CONFIG.brandName}</p>
              <p>Support Inquiries: {PLATFORM_CONFIG.supportEmail}</p>
              <p>Billing & Invoices: {PLATFORM_CONFIG.billingEmail}</p>
            </div>
            <p className="text-[11px] text-slate-500">
              All subscription payments are securely processed through Razorpay with 30-day validity terms. Merchant-customer transactions take place directly between registered storefront owners and their patrons.
            </p>
          </section>

          {/* CTA Banner */}
          <section className="p-8 bg-gradient-to-br from-[#0F172A] to-slate-900 rounded-3xl text-white text-center space-y-4">
            <h2 className="text-2xl font-black tracking-tight">Ready to launch your digital store?</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Get started with OrderOne.in in under two minutes with our Basic (₹49/30 days) or Gold (₹149/30 days) plans.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Register Your Business</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/subscription"
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 transition-all"
              >
                View 30-Day Plans
              </Link>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
