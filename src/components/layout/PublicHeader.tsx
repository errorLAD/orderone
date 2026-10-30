'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Menu, X } from 'lucide-react';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { OrderOneLogo } from '@/components/ui/OrderOneLogo';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 font-sans">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Operator Tag */}
        <OrderOneLogo
          href="/"
          size="md"
          showSubtitle={true}
          subtitle={`By ${PLATFORM_CONFIG.legalCompanyName}`}
        />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <Link href="/about" className="hover:text-slate-900 transition-colors">
            About Us
          </Link>
          <Link href="/solutions" className="hover:text-slate-900 transition-colors">Solutions</Link>
          <Link href="/resources" className="hover:text-slate-900 transition-colors">Guides</Link>
          <Link href="/#pricing" className="hover:text-slate-900 transition-colors">
            Plans & Pricing
          </Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">
            Terms
          </Link>
          <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-slate-900 transition-colors">
            Refunds
          </Link>
          <Link href="/support" className="text-indigo-700 hover:text-indigo-900 transition-colors">Support</Link>
        </nav>

        {/* Right CTA & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/login"
            className="hidden sm:inline-flex min-h-10 items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=register"
            className="min-h-10 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-all flex items-center gap-1"
          >
            <span>Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10 shrink-0 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
            aria-label="Toggle Public Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2 text-xs font-semibold text-slate-700">
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              About Us & Platform Architecture
            </Link>
            <Link href="/solutions" onClick={() => setMobileMenuOpen(false)} className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Business Solutions</Link>
            <Link href="/resources" onClick={() => setMobileMenuOpen(false)} className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Guides & Resources</Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Plans & Pricing
            </Link>
            <Link
              href="/terms"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Terms and Conditions
            </Link>
            <Link
              href="/privacy-policy"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/refund-policy"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-10 flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Refund & Cancellation Policy
            </Link>
            <Link href="/support" onClick={() => setMobileMenuOpen(false)} className="min-h-10 flex items-center px-3 py-2 rounded-lg text-indigo-700 hover:bg-slate-50">Contact Support</Link>
          </nav>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg"
            >
              Sign In to Account
            </Link>
            <span className="text-[10px] text-slate-400">
              Operated by {PLATFORM_CONFIG.legalCompanyName}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
