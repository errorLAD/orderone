import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCcw, AlertCircle, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | OrderOne.in — InfraBlue Materials Technology Private Limited',
  description:
    'Refund and Cancellation Policy for OrderOne.in subscriptions, operated by InfraBlue Materials Technology Private Limited. Explaining 30-day validity terms, upgrades, downgrades, and payment error resolutions.',
  alternates: {
    canonical: 'https://orderone.in/refund-policy',
  },
  openGraph: {
    title: 'Refund & Cancellation Policy | OrderOne.in',
    description: 'Learn about OrderOne.in subscription billing terms, 30-day validity, and cancellation policies.',
    url: 'https://orderone.in/refund-policy',
    siteName: 'OrderOne.in',
    type: 'website',
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <RefreshCcw className="w-3.5 h-3.5 text-indigo-600" /> Billing Policies
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs text-slate-500">
              Last Updated: {PLATFORM_CONFIG.lastUpdated} • Operated by {PLATFORM_CONFIG.legalCompanyName}
            </p>
          </div>

          {/* Policy Overview Notice */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
            This policy applies to subscription fees paid by business merchants to <strong>OrderOne.in</strong> (operated by <strong>{PLATFORM_CONFIG.legalCompanyName}</strong>) via <strong>Razorpay</strong>. Merchant transactions with their own storefront customers are governed directly between the merchant and customer. For information about Razorpay’s handling of payment data, see its <a href="https://razorpay.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">Privacy Policy</a>.
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
            {/* 1. Subscription Duration & 30-Day Terms */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">1. Subscription Validity & Billing Terms</h2>
              <p>
                Platform subscriptions on OrderOne.in operate on a fixed <strong>30-day validity term</strong> per payment cycle:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Basic Plan (₹20 / 30 days):</strong> Essential digital menu, token management, up to 20 products, 10 categories.
                </li>
                <li>
                  <strong>Gold Plan (₹99 / 30 days):</strong> Dual Store & Menu modules, up to 50 products, 30 categories, storefront design appearance customization, custom merchant UPI, and GST invoicing.
                </li>
              </ul>
              <p>
                Once a subscription is verified and activated, access is granted immediately for the full 30-day period. Because our software services are provisioned digitally upon payment, fees paid for an active 30-day cycle are generally non-refundable once the term has commenced, except in cases of technical double charges or verified billing errors described below.
              </p>
            </section>

            {/* 2. Cancellation & Scheduled Downgrades */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">2. Plan Cancellation & Scheduled Downgrades</h2>
              <p>
                Merchants have complete control over their subscription status and may choose not to renew at any time:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Non-Renewal:</strong> Subscriptions do not carry automatic unauthorized charges. If a merchant chooses not to renew before the 30-day term ends, their subscription simply expires gracefully on the scheduled expiration date without penalty.
                </li>
                <li>
                  <strong>Scheduled Downgrade:</strong> If a merchant on the Gold plan chooses to downgrade to Basic, the downgrade is scheduled to take effect at the conclusion of their current paid 30-day term. The merchant retains all Gold features until that date.
                </li>
                <li>
                  <strong>Catalog Preservation:</strong> Cancelling or downgrading will never delete existing catalog products or categories. New item creation is simply paused if current usage exceeds the lower plan’s capacity.
                </li>
              </ul>
            </section>

            {/* 3. Upgrades Policy */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">3. Plan Upgrades</h2>
              <p>
                When upgrading from Basic to Gold (₹99), the upgraded Gold tier activates immediately upon verified Razorpay payment, initiating a fresh 30-day validity term from the date and timestamp of payment. The transaction is recorded in your billing history with full receipt access.
              </p>
            </section>

            {/* 4. Technical Double Charges & Duplicate Payments */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">4. Duplicate Charges & Technical Errors</h2>
              <p>
                In the rare event of a technical anomaly during checkout (such as a network timeout resulting in a double debit for a single subscription period), we will rectify the issue promptly:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  <strong>Duplicate Payments:</strong> If duplicate charges occur for the same subscription period, the redundant charge will be refunded in full.
                </li>
                <li>
                  <strong>Failed Activations:</strong> If your bank account or card was debited by Razorpay but your platform subscription failed to activate due to an unexpected system error, our system will either automatically reconcile the activation via webhook or process a full refund.
                </li>
              </ul>
            </section>

            {/* 5. How to Request Assistance / Refund Process */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">5. Refund Request Process & Timelines</h2>
              <p>To request review or assistance regarding a billing issue, please follow these steps:</p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-800">1. Email Support:</p>
                <p className="text-slate-600">
                  Send an email to{' '}
                  <a href={`mailto:${PLATFORM_CONFIG.billingEmail}`} className="text-indigo-600 font-bold hover:underline">
                    {PLATFORM_CONFIG.billingEmail}
                  </a>{' '}
                  with the subject line &quot;Billing Inquiry — [Your Business Name]&quot;.
                </p>
                <p className="font-bold text-slate-800">2. Include Transaction Details:</p>
                <p className="text-slate-600">
                  Provide your registered business email, Business ID, Razorpay Payment ID (`pay_...`), transaction date, and a brief description of the issue.
                </p>
                <p className="font-bold text-slate-800">3. Resolution & Processing:</p>
                <p className="text-slate-600">
                  Our billing team investigates inquiries within <strong>2 business days</strong>. Approved refunds are initiated via Razorpay directly back to the original payment source (bank account, UPI, credit/debit card) and typically reflect within <strong>5 to 7 business days</strong> depending on your issuing bank.
                </p>
              </div>
            </section>

            {/* 6. Merchant Storefront Disclaimer */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">6. Customer Purchases on Merchant Storefronts</h2>
              <p>
                <strong>Important Notice Regarding Storefront Patrons:</strong> OrderOne.in does not sell retail products or food items directly to the public. If you are an end customer who placed an order with a restaurant, bakery, or hardware merchant using an OrderOne.in storefront or QR code, any returns, order cancellations, or refunds for goods must be handled directly with the respective merchant from whom you purchased.
              </p>
            </section>

            {/* 7. Contact Details */}
            <section className="pt-6 space-y-3">
              <h2 className="text-base font-black text-slate-900">7. Billing Support Contact</h2>
              <div className="p-4 bg-slate-100 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</p>
                <p>Platform: {PLATFORM_CONFIG.brandName}</p>
                <p>Billing Email: {PLATFORM_CONFIG.billingEmail}</p>
                <p>Customer Support: {PLATFORM_CONFIG.supportEmail}</p>
                <p className="text-[11px] text-slate-500">{PLATFORM_CONFIG.registeredOffice}</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
