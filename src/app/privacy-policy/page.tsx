import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Eye, Database, HelpCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

export const metadata: Metadata = {
  title: 'Privacy Policy | OrderOne.in — InfraBlue Materials Technology Private Limited',
  description:
    'Privacy Policy for OrderOne.in, operated by InfraBlue Materials Technology Private Limited. Explaining how merchant and storefront data is collected, stored in Supabase, and processed securely with Razorpay.',
  alternates: {
    canonical: 'https://orderone.in/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | OrderOne.in',
    url: 'https://orderone.in/privacy-policy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <Shield className="w-3.5 h-3.5 text-indigo-600" /> Data Privacy & Protection
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500">
              Effective Date: {PLATFORM_CONFIG.lastUpdated} • Operated by {PLATFORM_CONFIG.legalCompanyName}
            </p>
          </div>

          {/* Privacy Intro */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
            At <strong>OrderOne.in</strong>, operated by <strong>{PLATFORM_CONFIG.legalCompanyName}</strong>, we are committed to respecting your privacy and protecting the business and customer data you entrust to us. This policy outlines our data practices in full transparency.
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
            {/* 1. Information We Collect */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">1. Information We Collect</h2>
              <p>We collect information necessary to operate your digital storefront and platform subscription:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Merchant Account Information:</strong> Owner full name, business trade name, trade category (e.g., Restaurant, Cafe, Hardware, Grocery), physical store address, mobile phone number, email address, and encrypted password credentials.
                </li>
                <li>
                  <strong>Catalog & Storefront Content:</strong> Product names, descriptions, prices, sale prices, inventory stock levels, category structures, brand names, unit measurements, and uploaded product images.
                </li>
                <li>
                  <strong>Order & Queue Records:</strong> Customer orders placed on public storefronts or menus, customer contact numbers (for order pickup updates), token queue numbers (S- and M- sequences), and order notes.
                </li>
                <li>
                  <strong>Billing & Subscription Data:</strong> Subscription tier selections, payment transaction IDs, Razorpay order and payment IDs, 30-day validity timestamps, and GST tax invoice information.
                </li>
              </ul>
            </section>

            {/* 2. How We Use Collected Data */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">2. How We Use Your Data</h2>
              <p>Collected information is used strictly to provide and maintain platform functionality:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Rendering your public online storefront (`/store/[slug]`) and digital menu (`/menu/[slug]`).</li>
                <li>Managing real-time order notifications, kitchen display tokens, and TV order displays.</li>
                <li>Processing subscription payments and issuing official 30-day tax invoices.</li>
                <li>Enforcing subscription tier limits on product counts and category allowances.</li>
                <li>Providing technical support and troubleshooting operational issues.</li>
              </ul>
            </section>

            {/* 3. Third-Party Service Providers */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">3. Third-Party Infrastructure & Payment Partners</h2>
              <p>
                We do not sell, rent, or trade your personal or business data. We share necessary operational data only with trusted infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Supabase & PostgreSQL:</strong> Our cloud database infrastructure is hosted securely via Supabase, employing encrypted connections, authenticated role-based access, and isolated database schemas.
                </li>
                <li>
                  <strong>Razorpay:</strong> Platform subscription purchases are processed via <strong>Razorpay</strong>. When subscribing to Basic (₹20) or Gold (₹99), payment information is transmitted securely to Razorpay using standard PCI-DSS compliant encryption. OrderOne.in does not store your credit card numbers, debit card CVVs, or UPI banking PINs. See the <a href="https://razorpay.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">Razorpay Privacy Policy</a> for more information about its privacy practices.
                </li>
              </ul>
            </section>

            {/* 4. Data Security */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">4. Data Security & Storage</h2>
              <p>
                We implement industry-standard administrative and technical safeguards to protect your data against unauthorized access, disclosure, or alteration:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Passwords are hashed using industry-standard salted hashing algorithms (bcrypt) prior to storage.</li>
                <li>All data transmitted between your browser and our servers is encrypted using Secure Sockets Layer (SSL / HTTPS).</li>
                <li>Strict multi-tenant database isolation ensures that one merchant cannot view or access another merchant’s administrative dashboard or billing records.</li>
              </ul>
            </section>

            {/* 5. Cookies and Local Storage */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">5. Cookies and Browser Storage</h2>
              <p>
                OrderOne.in uses essential session cookies and browser local storage solely to keep you signed in, remember your active business selection in the dashboard, and store shopping cart items on customer storefronts. We do not deploy third-party advertising tracking cookies.
              </p>
            </section>

            {/* 6. Data Retention & Deletion Rights */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">6. Data Retention and Merchant Rights</h2>
              <p>
                You retain ownership of your business data. Registered business owners may:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Update or edit product catalogs, prices, and business profiles at any time through the dashboard.</li>
                <li>Export or print order summaries and tax invoices.</li>
                <li>
                  Request full deletion of their merchant account and associated catalog data by contacting our support team at{' '}
                  <a href={`mailto:${PLATFORM_CONFIG.supportEmail}`} className="text-indigo-600 font-bold hover:underline">
                    {PLATFORM_CONFIG.supportEmail}
                  </a>.
                </li>
              </ul>
            </section>

            {/* 7. Contact Us & Grievance */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">7. Contact & Grievance Officer</h2>
              <p>If you have questions or concerns regarding our privacy practices, please contact us at:</p>
              <div className="p-4 bg-slate-100 rounded-xl space-y-1 text-xs font-mono">
                <p className="font-bold text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</p>
                <p>Attention: Privacy & Grievance Support</p>
                <p>Email: {PLATFORM_CONFIG.supportEmail}</p>
                <p className="text-[11px] text-slate-500 font-sans">{PLATFORM_CONFIG.registeredOffice}</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
