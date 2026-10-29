'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Store,
  UtensilsCrossed,
  ReceiptText,
  Tv,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  LayoutDashboard,
  IndianRupee,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Flame,
  Clock,
  Layers,
  Smartphone,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { OrderOneLogo } from '@/components/ui/OrderOneLogo';
import { cn, formatINR } from '@/lib/utils';
import { generateFaqSchema } from '@/lib/seoConfig';

interface PlanData {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxProducts: number;
  maxCategories: number;
  description: string;
  features: string[];
  isVisible: boolean;
  isPopular?: boolean;
  allowsStore: boolean;
  allowsMenu?: boolean;
  customUpi: boolean;
}

const DEFAULT_PLANS: PlanData[] = [
  {
    id: 'plan_basic',
    name: 'Basic',
    priceMonthly: 49,
    priceAnnual: 490,
    maxProducts: 20,
    maxCategories: 10,
    description: 'Essential digital menu & customer QR ordering for cafes, tea stalls and restaurants',
    features: [
      'Digital Food & Drink Menu included',
      'Customer QR code ordering (no login required)',
      'Kitchen Menu Orders dashboard & live sound alerts',
      'Instant M-00101 kitchen token generation',
    ],
    isVisible: true,
    isPopular: false,
    allowsStore: false,
    allowsMenu: true,
    customUpi: false,
  },
  {
    id: 'plan_gold',
    name: 'Gold',
    priceMonthly: 149,
    priceAnnual: 1490,
    maxProducts: 50,
    maxCategories: 30,
    description: 'Complete dual-channel suite with custom merchant UPI QR code configuration',
    features: [
      'Both Store & Menu modules included simultaneously',
      'Custom UPI ID & QR Code setup for customer checkout',
      'Direct bank payments (GPay, PhonePe, Paytm, BHIM)',
      'Separate Store Orders (S-) and Menu Orders (M-)',
      'Retail product catalog, barcode, and stock inventory',
      'Public TV queue token display & sales analytics',
    ],
    isVisible: true,
    isPopular: true,
    allowsStore: true,
    allowsMenu: true,
    customUpi: true,
  },
];

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activeTab, setActiveTab] = useState<'store' | 'menu' | 'tokens' | 'tv'>('store');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PlanData[]>(DEFAULT_PLANS);

  React.useEffect(() => {
    fetch('/api/subscriptions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch((err) => console.error('Failed to load dynamic plans on home:', err));
  }, []);

  const basicPlan = plans.find((p) => p.id === 'plan_basic') || plans[0] || DEFAULT_PLANS[0];
  const goldPlan = plans.find((p) => p.id === 'plan_gold') || plans[1] || DEFAULT_PLANS[1];
  const visiblePlans = plans.filter((p) => p.isVisible !== false);

  const faqs = [
    {
      q: 'How does the platform ensure Store orders and Menu orders never mix?',
      a: 'Store orders and Menu orders are treated as strictly independent data pipelines. Every order is stamped with source_type = "store" or "menu", filtered at the database level, and issued tokens from independent atomic sequence counters (S-00101 vs M-00101). Store orders never appear in kitchen views, and menu orders never appear in retail stock views.',
    },
    {
      q: 'Do customers need to register or install an app to order?',
      a: 'Zero registration is required! Customers simply scan the QR code on the table or storefront banner with their phone camera, browse items, and tap submit. They receive an immediate token number and private live tracking link.',
    },
    {
      q: `How does the ₹${basicPlan.priceMonthly}/month subscription pricing work?`,
      a: `Our starter plan is designed specifically for small Indian merchants, tea stalls, juice corners, and bakeries. At just ₹${basicPlan.priceMonthly} per month (or ₹${basicPlan.priceAnnual} billed annually), you receive full digital catalog capabilities, automated tokens, and QR poster downloads.`,
    },
    {
      q: 'Can I display orders on a wall-mounted TV or tablet?',
      a: 'Yes! Every business gets a dedicated public display link (/display/[slug]) that formats cleanly for any smart TV, tablet, or monitor. It presents "Preparing Now" and "Ready for Collection" columns with audio announcement chimes while keeping customer personal details hidden for privacy.',
    },
  ];

  const faqSchema = generateFaqSchema(faqs);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white flex flex-col relative overflow-hidden">
      {/* FAQ Rich Results Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Light SaaS Ambient Background Glow & Grid Texture */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[560px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent_80%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <OrderOneLogo
              href="/"
              size="md"
              showSubtitle={true}
              subtitle={`By ${PLATFORM_CONFIG.legalCompanyName}`}
            />
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              ₹{basicPlan.priceMonthly} / 30 Days
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <Link href="/about" className="hover:text-slate-900 transition-colors font-semibold">
              About Us
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-slate-900 transition-colors">
              Live Preview
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="hidden xs:inline-flex">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-2xs px-2.5 sm:px-3 text-xs sm:text-sm">
                <span className="hidden sm:inline">Launch </span>Dashboard
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>

            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-2 text-xs font-semibold text-slate-700">
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                About Us & Platform Architecture
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                SaaS Features & Capabilities
              </a>
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Interactive Live Preview
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Plans & Pricing (from ₹{basicPlan.priceMonthly}/mo)
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Frequently Asked Questions
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Sign In to Account
              </Link>
              <Link
                href="/dashboard/subscription"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-indigo-600"
              >
                View Plans →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        {/* Modern Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs text-xs text-slate-700 hover:border-slate-300 transition-all duration-200 backdrop-blur-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <span className="text-slate-600 font-medium">
            Unified SaaS Engine • <span className="font-semibold text-slate-900">Separate Store & Dining Pipelines</span>
          </span>
          <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
            from ₹{basicPlan.priceMonthly}/mo
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] text-slate-900 leading-[1.14] max-w-4xl mx-auto">
          The Complete Digital Storefront & Token Engine for{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Indian Merchants
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Provide your customers with instant zero-login ordering. Separate retail goods from dining menus, issue automated atomic tokens, and synchronize live updates across kitchen and counter screens.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs shadow-slate-900/10 border border-slate-900/80 rounded-xl px-5 py-2.5 transition-all flex items-center gap-2 text-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-300" />
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-200/90 shadow-2xs rounded-xl px-5 py-2.5 transition-all text-sm"
            >
              <span>Register Business</span>
            </Button>
          </Link>
          <Link href="/display/annapurna-foods" target="_blank">
            <Button
              variant="ghost"
              size="lg"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium rounded-xl px-4 py-2.5 transition-all flex items-center gap-2 text-sm"
            >
              <Tv className="w-4 h-4 text-slate-500" />
              <span>Live TV Queue</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </Link>
        </div>

        {/* Live Social Proof Metrics */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-xs text-slate-600 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            </div>
            <span className="font-medium text-slate-700">Separate S- & M- Sequences</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            </div>
            <span className="font-medium text-slate-700">Zero-Login Guest Ordering</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            </div>
            <span className="font-medium text-slate-700">Realtime TV & Audio Chimes</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            </div>
            <span className="font-medium text-slate-700">Micro Starter from ₹{basicPlan.priceMonthly}/mo</span>
          </div>
        </div>
      </section>

      {/* Interactive Feature Demo Tabs */}
      <section id="preview" className="py-12 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Interactive Live Switcher
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2.5">
            Explore All 4 Dedicated SaaS Channels
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto font-normal">
            Toggle between independent channels to test live customer ordering, kitchen operations, and TV displays.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 shadow-2xs max-w-xl mx-auto mb-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all ${
              activeTab === 'store'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>Retail Store (S-)</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span>Food Menu (M-)</span>
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all ${
              activeTab === 'tokens'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <ReceiptText className="w-4 h-4 shrink-0" />
            <span>Queue Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all ${
              activeTab === 'tv'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Tv className="w-4 h-4 shrink-0" />
            <span>TV Display</span>
          </button>
        </div>

        {/* Tab Content Cards */}
        <Card className="p-6 md:p-8 border-slate-200/80 shadow-soft bg-white rounded-2xl">
          {activeTab === 'store' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="store">Channel: Retail Digital Store</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Packaged Goods, Groceries & Retail Products
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Sell retail items with real-time stock deduction, SKU barcode tracking, and low-stock alerts. Customers browse, add to cart, and checkout without login.
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Independent Store token sequence (e.g. <strong>S-00101</strong>)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Deducts inventory stock and prevents overselling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Appears exclusively in Store Orders dashboard</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <a href="/store/annapurna-foods" target="_blank">
                    <Button variant="store" size="sm">
                      <span>Open Customer Storefront</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Link href="/dashboard/store/orders">
                    <Button variant="outline" size="sm">
                      View Store Orders
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Store Order Preview</span>
                  <Badge variant="store">Token: S-00101</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center shadow-2xs">
                    <div>
                      <p className="font-semibold text-slate-900">Filter Coffee Powder (500g)</p>
                      <p className="text-[10px] text-slate-500">SKU: COF-500G • 40 units in stock</p>
                    </div>
                    <span className="font-bold text-slate-900">₹299</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex justify-between items-center shadow-2xs">
                    <div>
                      <p className="font-semibold text-slate-900">Spiced Roasted Cashews (250g)</p>
                      <p className="text-[10px] text-slate-500">SKU: CAS-PEP-250 • 18 units in stock</p>
                    </div>
                    <span className="font-bold text-slate-900">₹350</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="menu">Channel: Digital Food Menu & KOT</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Dining Table Ordering & Kitchen Tickets
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Food catalog designed for restaurants and cafes. Displays dietary tags (Veg, Non-Veg, Spicy, Jain), portion sizes, add-ons, and table numbers.
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    <span>Independent Kitchen token sequence (e.g. <strong>M-00101</strong>)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    <span>Table selection for Dine-in or Takeaway parcel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    <span>Kitchen progress: Accept → Cooking → Ring Ready → Served</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <a href="/menu/annapurna-foods" target="_blank">
                    <Button variant="menu" size="sm">
                      <span>Open Customer Dining Menu</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Link href="/dashboard/menu/orders">
                    <Button variant="outline" size="sm">
                      View Kitchen KOT Orders
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Kitchen KOT Ticket</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">🍽️ Table 4</Badge>
                    <Badge variant="menu">M-00101</Badge>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>2x Ghee Podi Butter Dosa</span>
                      <span>₹220</span>
                    </div>
                    <p className="text-[11px] text-orange-600 mt-0.5 font-medium">
                      + Extra Pure Cow Ghee (₹20) • "Make extra crisp"
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>2x Kumbakonam Filter Coffee</span>
                      <span>₹80</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Standard brass dabarah</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="indigo">Operations: Counter Queue Engine</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Multi-Counter Calling & Wait Queue
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Call the next customer, recall, skip, or mark served with one click. Configure Counter 1, 2, 3 or 4 stations and coordinate busy rush hours.
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Waiting Queue, Now Serving, and Served history</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Live audio synthesizer chimes for instant awareness</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Customer tracking link updates live on their mobile screen</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <Link href="/dashboard/store/tokens">
                    <Button variant="primary" size="sm">
                      Open Store Tokens
                    </Button>
                  </Link>
                  <Link href="/dashboard/menu/tokens">
                    <Button variant="secondary" size="sm">
                      Open Kitchen Tokens
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Counter 1 • Now Calling</p>
                <div className="text-4xl font-bold font-mono tracking-widest text-indigo-600">
                  S-00101
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60 shadow-2xs">
                  ● Active At Counter 1
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tv' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="neutral">Display: Public Wall-Mounted TV</Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  High-Contrast Fullscreen TV Display
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Designed for 4K and 1080p wall displays in waiting lounges and food courts. Shows large readable token numbers with Preparing and Ready columns.
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Zero customer personal data exposed on public screen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Audio gong chime rings when token is called</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Fullscreen mode (F11) with real-time sync</span>
                  </div>
                </div>
                <div className="pt-2">
                  <a href="/display/annapurna-foods" target="_blank">
                    <Button variant="primary" size="sm">
                      <span>Launch Public TV Display</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              </div>

              <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-card">
                <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-medium">Annapurna Foods TV</span>
                  <span className="text-emerald-400 font-semibold">● Live Sync</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Preparing</span>
                    <div className="text-2xl font-bold font-mono mt-1 text-slate-200">M-00102</div>
                  </div>
                  <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/40">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Ready</span>
                    <div className="text-2xl font-bold font-mono mt-1 text-emerald-300">S-00101</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Dynamic Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
            Affordable SaaS Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2.5">
            Simple, Transparent Pricing for Indian Businesses
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto font-normal">
            Start at just ₹{basicPlan.priceMonthly} per month. No hidden commissions, no per-transaction cuts.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs mt-6 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white shadow-xs font-medium'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all ${
                billingCycle === 'annual'
                  ? 'bg-emerald-600 text-white shadow-xs font-medium'
                  : 'text-slate-600 hover:text-emerald-700 font-medium'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Pricing Cards */}
        <div className={cn(
          'grid gap-8 mx-auto',
          visiblePlans.length >= 3 ? 'grid-cols-1 md:grid-cols-3 max-w-5xl' : 'grid-cols-1 md:grid-cols-2 max-w-4xl'
        )}>
          {visiblePlans.map((plan) => {
            const isGold = plan.id === 'plan_gold';
            const isDiamond = plan.id === 'plan_diamond';
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'p-7 flex flex-col justify-between transition-all bg-white rounded-3xl relative',
                  isGold
                    ? 'border-[#4F46E5] shadow-card ring-2 ring-[#4F46E5]/20'
                    : isDiamond
                    ? 'border-purple-500 shadow-card ring-2 ring-purple-500/20'
                    : 'border-slate-200/90 shadow-soft hover:shadow-card'
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-[#4F46E5] text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2 mt-1">
                    <h3 className="font-black text-slate-900 text-lg">{plan.name}</h3>
                    <Badge variant={isGold ? 'success' : isDiamond ? 'indigo' : 'indigo'}>
                      {isDiamond ? 'Enterprise' : isGold ? 'Store + Menu + Custom UPI' : 'Menu Tier'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 min-h-[32px]">{plan.description}</p>

                  <div className="my-5">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">
                      ₹{price}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">
                      {billingCycle === 'annual' ? '/ year' : '/ month'}
                    </span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {!plan.allowsStore && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-slate-300 font-bold ml-0.5 mr-1">✕</span>
                        <span>Retail Store module (Locked)</span>
                      </div>
                    )}
                    {!plan.customUpi && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-slate-300 font-bold ml-0.5 mr-1">✕</span>
                        <span>Custom merchant UPI QR setup (Locked)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100">
                  <Link href="/login">
                    <Button
                      variant={isGold || isDiamond ? 'primary' : 'outline'}
                      className="w-full py-2.5 font-bold shadow-xs"
                    >
                      Start with {plan.name} (₹{price}/{billingCycle === 'annual' ? 'yr' : 'mo'})
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden max-w-4xl mx-auto">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Plan Feature Comparison</h3>
            <span className="text-[11px] text-slate-500">Live active pricing tier matrix</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[#64748B] font-semibold bg-white">
                  <th className="p-3.5">Feature</th>
                  {visiblePlans.map((p) => (
                    <th
                      key={p.id}
                      className={cn(
                        'p-3.5 text-center font-bold',
                        p.id === 'plan_gold' ? 'text-[#4F46E5]' : 'text-slate-900'
                      )}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-3.5 font-semibold">Monthly Price</td>
                  {visiblePlans.map((p) => (
                    <td key={p.id} className="p-3.5 text-center font-black text-slate-900">
                      ₹{p.priceMonthly}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold">Annual Price</td>
                  {visiblePlans.map((p) => (
                    <td key={p.id} className="p-3.5 text-center font-black text-slate-900">
                      ₹{p.priceAnnual}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5">Product / Item Quota</td>
                  {visiblePlans.map((p) => (
                    <td key={p.id} className="p-3.5 text-center font-bold text-slate-900">
                      {p.maxProducts} items
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5">Category Quota</td>
                  {visiblePlans.map((p) => (
                    <td key={p.id} className="p-3.5 text-center font-bold text-slate-900">
                      {p.maxCategories} categories
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5">Menu Module</td>
                  {visiblePlans.map((p) => (
                    <td key={p.id} className="p-3.5 text-center text-emerald-600 font-bold">
                      Included
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5">Store Module</td>
                  {visiblePlans.map((p) => (
                    <td
                      key={p.id}
                      className={cn(
                        'p-3.5 text-center font-bold',
                        p.allowsStore ? 'text-emerald-600' : 'text-slate-400'
                      )}
                    >
                      {p.allowsStore ? 'Included' : 'Locked'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5">Custom UPI QR Configuration</td>
                  {visiblePlans.map((p) => (
                    <td
                      key={p.id}
                      className={cn(
                        'p-3.5 text-center font-bold',
                        p.customUpi ? 'text-emerald-600' : 'text-slate-400'
                      )}
                    >
                      {p.customUpi ? 'Included' : 'Locked'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2.5">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Card
                key={idx}
                className="overflow-hidden border-slate-200/80 transition-all cursor-pointer bg-white rounded-2xl hover:border-slate-300"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div className="p-4.5 flex items-center justify-between font-semibold text-xs sm:text-sm text-slate-900">
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </div>
                {isOpen && (
                  <div className="px-4.5 pb-4.5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white text-center space-y-4 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.25),transparent_70%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white relative z-10">
            Launch Your Digital Store & Food Menu in 2 Minutes
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-normal relative z-10 leading-relaxed">
            Join Indian merchants streamlining customer orders, table dining, and automated token management today.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3 relative z-10">
            <Link href="/login">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-sm font-semibold rounded-xl px-5 py-2.5">
                Register Business
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/20 rounded-xl px-5 py-2.5 font-medium">
                Explore Demo Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
