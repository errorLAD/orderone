import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldAlert, Scale, HelpCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

export const metadata: Metadata = {
  title: 'Terms and Conditions | OrderOne.in — InfraBlue Materials Technology Private Limited',
  description:
    'Terms and Conditions governing the use of OrderOne.in, operated by InfraBlue Materials Technology Private Limited. Explaining merchant accounts, subscription plans, 30-day validity, and Razorpay payments.',
  alternates: {
    canonical: 'https://orderone.in/terms',
  },
  openGraph: {
    title: 'Terms and Conditions | OrderOne.in',
    url: 'https://orderone.in/terms',
  },
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <Scale className="w-3.5 h-3.5 text-indigo-600" /> Legal Agreement
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
              Terms and Conditions
            </h1>
            <p className="text-xs text-slate-500">
              Last Updated: {PLATFORM_CONFIG.lastUpdated} • Operated by {PLATFORM_CONFIG.legalCompanyName}
            </p>
          </div>

          {/* Introductory Notice */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900 leading-relaxed">
            Please read these Terms and Conditions carefully before registering an account or utilizing any services provided by <strong>OrderOne.in</strong>, operated by <strong>{PLATFORM_CONFIG.legalCompanyName}</strong>. By accessing the platform, you agree to be legally bound by these terms.
          </div>

          {/* Terms Content Sections */}
          <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
            {/* 1. Acceptance */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">1. Acceptance of Terms</h2>
              <p>
                These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (whether individually or on behalf of a registered business entity, referred to as &quot;Merchant&quot;, &quot;User&quot;, or &quot;You&quot;) and <strong>{PLATFORM_CONFIG.legalCompanyName}</strong> (&quot;Company&quot;, &quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;), regarding your access to and use of the <strong>OrderOne.in</strong> website, software, merchant dashboard, customer storefronts, digital menus, and associated services (collectively, the &quot;Platform&quot;).
              </p>
              <p>
                If you do not agree to all provisions of these Terms, you are expressly prohibited from using the Platform and must immediately discontinue use.
              </p>
            </section>

            {/* 2. Eligibility & Account Registration */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">2. Eligibility & Business Account Registration</h2>
              <p>
                To register a merchant account on OrderOne.in, you must be at least 18 years of age and possess the legal authority to enter into contracts under applicable laws of India. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Provide accurate, current, and complete business information (legal trade name, contact email, phone number, and physical commercial address).</li>
                <li>Maintain and promptly update account details to keep them accurate and truthful.</li>
                <li>Maintain the confidentiality of your login credentials and accept responsibility for all activities that occur under your account.</li>
              </ul>
            </section>

            {/* 3. Nature of Platform & Storefront Operation */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">3. Nature of the Platform & Storefront Operations</h2>
              <p>
                OrderOne.in provides multi-tenant Software-as-a-Service (SaaS) tools enabling merchants to publish digital product catalogs, dining menus, QR codes, and queue tokens.
              </p>
              <p>
                <strong>Independent Merchant Responsibility:</strong> Each registered storefront or menu is operated independently by its merchant. {PLATFORM_CONFIG.legalCompanyName} is not a party to transactions between merchants and their end customers. The merchant is solely responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Accuracy of product listings, specifications, prices, and stock availability.</li>
                <li>Food preparation quality, safety standards, hygiene, and dietary disclosures.</li>
                <li>Compliance with applicable retail, consumer protection, weights and measures, and local commercial licensing laws.</li>
                <li>Collection and settlement of direct customer payments through their own configured payment methods (such as merchant UPI VPAs or cash on delivery).</li>
              </ul>
            </section>

            {/* 4. Subscription Plans, 30-Day Validity & Razorpay Payments */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">4. Subscription Plans, 30-Day Validity & Payment Processing</h2>
              <p>
                OrderOne.in provides subscription tiers for platform access:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Basic Plan — ₹20 for 30 days:</strong> Includes essential catalog and menu management, up to 20 products/items, 10 categories, token queue management, and storefront QR codes.
                </li>
                <li>
                  <strong>Gold Plan — ₹99 for 30 days:</strong> Includes full Store & Menu modules, up to 50 products/items, 30 categories, storefront design appearance customization, custom merchant UPI payment setup, and GST tax invoicing tools.
                </li>
                <li>
                  <strong>Diamond Plan — ₹150 for 30 days:</strong> An enterprise tier managed directly by platform administrators.
                </li>
              </ul>
              <p>
                <strong>30-Day Validity Term:</strong> Each successful subscription payment activates platform access for a term of thirty (30) days, calculated from verified payment completion.
              </p>
              <p>
                <strong>Razorpay Payment Processing:</strong> Platform subscription charges are processed securely through <strong>Razorpay</strong>. By making a payment, you agree to abide by <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">Razorpay’s terms of service</a>. All prices are listed in Indian Rupees (INR).
              </p>
            </section>

            {/* 5. Upgrades, Scheduled Downgrades & Expiry */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">5. Plan Upgrades, Scheduled Downgrades & Expiration</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Plan Upgrade:</strong> Upgrading from Basic to Gold takes effect immediately upon verified Razorpay payment, initiating a fresh 30-day validity term.
                </li>
                <li>
                  <strong>Plan Downgrade:</strong> If a merchant on Gold requests a downgrade to Basic, the change is scheduled to take effect at the conclusion of their current 30-day paid validity period. The merchant retains paid Gold privileges until the scheduled date.
                </li>
                <li>
                  <strong>Data Preservation on Downgrade:</strong> Existing catalog products and categories will never be deleted upon downgrade. However, new item additions will be paused if current usage exceeds the lower plan’s capacity.
                </li>
                <li>
                  <strong>Expiration:</strong> If a subscription is not renewed upon expiration of its 30-day validity, access to Gold-tier features is paused and account limits revert to Basic until renewal.
                </li>
              </ul>
            </section>

            {/* 6. Tax and GST Compliance */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">6. Merchant Tax & GST Responsibility</h2>
              <p>
                Merchants configuring GST settings on OrderOne.in are solely responsible for ensuring the accuracy of their 15-digit GSTIN, legal registered trade name, applicable GST rates, and tax invoice sequence numbers. The Platform provides calculation and invoicing assistance but does not provide certified legal, tax, or accounting advice.
              </p>
            </section>

            {/* 7. Prohibited Uses */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">7. Acceptable Use and Prohibited Activities</h2>
              <p>You agree not to use the Platform to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Offer or advertise illegal goods, prohibited drugs, counterfeit items, or unauthorized materials.</li>
                <li>Engage in fraudulent transactions, deceptive pricing, or misleading claims.</li>
                <li>Attempt to bypass subscription tier restrictions, reverse engineer platform code, or disrupt service integrity.</li>
                <li>Transmit malicious software, viruses, or automated scrapers.</li>
              </ul>
            </section>

            {/* 8. Service Availability & Technical Limitations */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">8. Service Availability & Maintenance</h2>
              <p>
                We strive for continuous platform availability but do not guarantee uninterrupted, error-free uptime. We reserve the right to perform scheduled maintenance, software updates, or database optimizations with or without prior notice.
              </p>
            </section>

            {/* 9. Limitation of Liability */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable Indian law, {PLATFORM_CONFIG.legalCompanyName}, its directors, and employees shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Loss of profits, business interruption, or loss of customer data.</li>
                <li>Disputes between merchants and their storefront patrons.</li>
                <li>Failures or interruptions in third-party banking, UPI networks, or Razorpay payment gateways.</li>
              </ul>
            </section>

            {/* 10. Governing Law & Contact */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">10. Governing Law & Contact Information</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India.
              </p>
              <div className="p-4 bg-slate-100 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</p>
                <p>Platform: {PLATFORM_CONFIG.brandName}</p>
                <p>Support Email: {PLATFORM_CONFIG.supportEmail}</p>
                <p>Billing Inquiries: {PLATFORM_CONFIG.billingEmail}</p>
                <p className="text-[11px] text-slate-500">{PLATFORM_CONFIG.registeredOffice}</p>
                <p className="text-[11px] text-slate-500">{PLATFORM_CONFIG.jurisdiction}</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
