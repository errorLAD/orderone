'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Mail, ArrowUpRight } from 'lucide-react';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { OrderOneLogo } from '@/components/ui/OrderOneLogo';

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white font-sans text-slate-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
          {/* Brand & Corporate Identity Column */}
          <div className="md:col-span-1 space-y-3">
            <OrderOneLogo href="/" size="sm" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Multi-tenant digital storefront, dining menu, kitchen token, and inventory management platform for Indian retail and food businesses.
            </p>
            <div className="pt-2 text-xs">
              <span className="font-bold text-slate-900 block">Operated by:</span>
              <span className="text-slate-700 font-semibold">{PLATFORM_CONFIG.legalCompanyName}</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Secured Billing
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Platform Modules</h4>
            <ul className="space-y-2">
              <li><Link href="/solutions" className="hover:text-slate-900 transition-colors">Retail POS & Billing Software</Link></li>
              <li><Link href="/solutions/restaurant-billing" className="hover:text-slate-900 transition-colors">Restaurant Billing & QR Menus</Link></li>
              <li><Link href="/solutions/grocery-shop-management" className="hover:text-slate-900 transition-colors">Grocery Shop Management</Link></li>
              <li><Link href="/solutions/hardware-shop-billing" className="hover:text-slate-900 transition-colors">Hardware Shop Billing</Link></li>
              <li><Link href="/solutions/inventory-management" className="hover:text-slate-900 transition-colors">Inventory Management</Link></li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  Digital Online Storefronts
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  Restaurant Menus & QR Ordering
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  Queue Tokens & Live TV Display
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  Hardware & Building Materials Stores
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors">
                  Supermarkets & Grocery Kirana
                </Link>
              </li>
              <li><Link href="/resources" className="hover:text-slate-900 transition-colors">Business Guides</Link></li>
              <li><Link href="/resources/how-to-set-up-a-restaurant-qr-menu" className="hover:text-slate-900 transition-colors">Restaurant QR Menu Guide</Link></li>
              <li><Link href="/resources/retail-billing-software-checklist" className="hover:text-slate-900 transition-colors">Retail Billing Checklist</Link></li>
            </ul>
          </div>

          {/* Subscription & Pricing */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Plans & Billing</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#pricing" className="hover:text-slate-900 transition-colors">
                  Basic Plan — ₹49 / 30 Days
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-slate-900 transition-colors">
                  Gold Plan — ₹149 / 30 Days
                </Link>
              </li>
              <li>
                <span className="text-slate-400">
                  Diamond Plan — ₹150 (Admin Managed)
                </span>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-slate-900 transition-colors">
                  30-Day Validity & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings/payments" className="hover:text-slate-900 transition-colors">
                  Merchant UPI Payment Setup
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Company & Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors font-medium">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 transition-colors font-medium">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors font-medium">
                  Razorpay Terms
                </a>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors font-medium">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="https://razorpay.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors font-medium">
                  Razorpay Privacy Policy
                </a>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-slate-900 transition-colors font-medium">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <a
                  href="/support"
                  className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" /> Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-Footer with Corporate Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">
              © 2026 {PLATFORM_CONFIG.legalCompanyName}. All rights reserved.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              OrderOne.in is an online technology SaaS platform. Individual merchant product catalogs, prices, and orders are managed independently by respective registered business owners.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link href="/terms" className="hover:text-slate-800 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:text-slate-800 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-slate-800 transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
