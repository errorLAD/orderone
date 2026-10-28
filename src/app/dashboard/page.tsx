'use client';

import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  ShoppingBag,
  Users,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Clock,
  Store,
  UtensilsCrossed,
  Sparkles,
  ChevronRight,
  Plus,
  Tv,
  QrCode,
  Lock,
  ArrowRight,
  ExternalLink,
  Layers,
  Wrench,
  Boxes,
  Truck,
  Building2,
  BedDouble,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { DashboardAnalytics } from '@/lib/db';
import { formatINR, formatTime, cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/categories';
import Link from 'next/link';
import { StoreOperationsCard } from '@/components/dashboard/StoreOperationsCard';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';

const STATUS_COLORS: { [key: string]: string } = {
  new: '#6366f1',
  accepted: '#3b82f6',
  preparing: '#f59e0b',
  ready: '#10b981',
  completed: '#059669',
  cancelled: '#ef4444',
};

export default function DashboardPage() {
  const { currentBusiness, isLoadingAuth } = useApp();
  const [scope, setScope] = useState<'all' | 'store' | 'menu'>('all');
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today');
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?businessId=${currentBusiness.id}&scope=${scope}&range=${range}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentBusiness?.id, scope, range]);

  if (!currentBusiness) {
    if (isLoadingAuth) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Sparkles className="w-10 h-10 text-indigo-500 mb-3 animate-spin" />
          <h3 className="text-lg font-bold text-slate-800">Loading Business Dashboard...</h3>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto mt-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Business Linked to this Account</h3>
        <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
          You do not have any active business associated with your login yet. Complete the quick onboarding setup to launch your store catalog or food menu.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Onboard Your Business Now
        </Link>
      </div>
    );
  }

  const catConfig = getCategoryConfig(currentBusiness.type);
  const isStorePrimary = ['hardware', 'grocery', 'retail', 'other'].includes(catConfig.id);
  const isBasicPlan = currentBusiness.subscription?.planId === 'plan_basic';
  const showStoreUpgradeNotice = isStorePrimary && isBasicPlan;

  const kpi = analytics?.kpi || {
    todayOrderValue: 0,
    todayOrderValueChange: 0,
    todayEarnings: 0,
    todayPaidAmount: 0,
    todayPendingAmount: 0,
    todayOrdersCount: 0,
    todayOrdersChange: 0,
    todayCustomersCount: 0,
  };

  const statusData = analytics?.orderStatusCounts
    ? [
        { name: 'New', value: analytics.orderStatusCounts.new, color: STATUS_COLORS.new },
        { name: 'Accepted', value: analytics.orderStatusCounts.accepted, color: STATUS_COLORS.accepted },
        { name: 'Preparing', value: analytics.orderStatusCounts.preparing, color: STATUS_COLORS.preparing },
        { name: 'Ready', value: analytics.orderStatusCounts.ready, color: STATUS_COLORS.ready },
        { name: 'Completed', value: analytics.orderStatusCounts.completed, color: STATUS_COLORS.completed },
        { name: 'Cancelled', value: analytics.orderStatusCounts.cancelled, color: STATUS_COLORS.cancelled },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Scope Controls */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-2xs', catConfig.badgeClass)}>
              <span className="text-sm">{catConfig.icon}</span>
              <span>{catConfig.label}</span>
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Operations
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            {catConfig.terminology.dashboardTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            {catConfig.terminology.dashboardSubtitle} for <span className="font-semibold text-slate-700">{currentBusiness.name}</span>
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          {/* Scope: All vs Store vs Menu */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl text-xs font-medium">
            <button
              onClick={() => setScope('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Orders
            </button>
            {currentBusiness.settings.modules.store && (
              <button
                onClick={() => setScope('store')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all',
                  scope === 'store'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-sky-700'
                )}
              >
                <Store className="w-3.5 h-3.5" />
                Store Only
              </button>
            )}
            {currentBusiness.settings.modules.menu && (
              <button
                onClick={() => setScope('menu')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all',
                  scope === 'menu'
                    ? 'bg-orange-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-orange-700'
                )}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Menu Only
              </button>
            )}
          </div>

          {/* Date Range: Today, 7D, 30D */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setRange('today')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                range === 'today' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Today
            </button>
            <button
              onClick={() => setRange('7d')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                range === '7d' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange('30d')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                range === '30d' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-indigo-600')} />
          </button>
        </div>
      </div>

      {/* Prominent Store Operations Card (Store Open/Closed & Online Ordering ON/OFF) */}
      <StoreOperationsCard />

      {/* Plan Usage Card (Products / Menu Items & Categories Quotas) */}
      <PlanUsageCard />

      {/* Upgrade Banner for Retail/Hardware Businesses on Basic Plan */}
      {showStoreUpgradeNotice && (
        <div className="p-4 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <span>{catConfig.label} Inventory Requires Gold Plan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                  Current: Basic ₹20/mo
                </span>
              </h3>
              <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
                Your business is currently subscribed to the Basic plan (₹20/mo, Menu module only). Upgrade to the <span className="font-semibold text-amber-950">Gold Plan (₹99/mo)</span> to unlock complete {catConfig.shortLabel} product SKUs, stock levels, site contractor orders, and custom UPI QR checkout payments.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shrink-0 shadow-xs"
          >
            <span>Upgrade to Gold (₹99/mo)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Category Quick Actions Bar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
          Quick Actions:
        </span>

        {catConfig.primaryModule === 'store' ? (
          <>
            <Link
              href="/dashboard/store/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{catConfig.terminology.addItemButton}</span>
            </Link>
            <Link
              href="/dashboard/store/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              <span>{catConfig.terminology.ordersTitle}</span>
            </Link>
            <Link
              href="/dashboard/store/tokens"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{catConfig.terminology.tokensTitle}</span>
            </Link>
            <a
              href={`/store/${currentBusiness.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>View Online Storefront</span>
            </a>
            {currentBusiness.settings?.modules?.menu && currentBusiness.menuEntitlement?.allowed && (
              <a
                href={`/menu/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                <span>Food Menu</span>
              </a>
            )}
          </>
        ) : (
          <>
            <Link
              href="/dashboard/menu/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{catConfig.terminology.addItemButton}</span>
            </Link>
            <Link
              href="/dashboard/menu/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-slate-500" />
              <span>{catConfig.terminology.ordersTitle}</span>
            </Link>
            {catConfig.id === 'hotel' && (
              <Link
                href="/dashboard/hotel/rooms"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-colors"
              >
                <BedDouble className="w-3.5 h-3.5 text-amber-700" />
                <span>Rooms & Standees</span>
              </Link>
            )}
            <Link
              href="/dashboard/menu/tokens"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{catConfig.terminology.tokensTitle}</span>
            </Link>
            <a
              href={`/menu/${currentBusiness.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open Public Menu</span>
            </a>
            {currentBusiness.settings?.modules?.store && currentBusiness.storeEntitlement?.allowed && (
              <a
                href={`/store/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                <span>Online Storefront</span>
              </a>
            )}
            <a
              href={`/display/${currentBusiness.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <Tv className="w-3.5 h-3.5 text-purple-600" />
              <span>TV Public Display</span>
            </a>
          </>
        )}

        <Link
          href="/dashboard/qr-codes"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors ml-auto"
        >
          <QrCode className="w-3.5 h-3.5 text-slate-500" />
          <span>Counter / Table QR Standees</span>
        </Link>
      </div>

      {/* 4 TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Order Value */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Today's Order Value</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatINR(kpi.todayOrderValue)}
            </div>
            {kpi.todayOrdersCount > 0 && kpi.todayOrderValueChange !== 0 ? (
              <div
                className={cn(
                  'flex items-center gap-1.5 mt-2 text-[11px] font-medium',
                  kpi.todayOrderValueChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                <TrendingUp className={cn('w-3.5 h-3.5', kpi.todayOrderValueChange < 0 && 'rotate-180')} />
                <span>
                  {kpi.todayOrderValueChange > 0 ? `+${kpi.todayOrderValueChange}%` : `${kpi.todayOrderValueChange}%`}{' '}
                  vs yesterday
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                <span>{kpi.todayOrdersCount === 0 ? 'No sales recorded yet today' : 'No change vs yesterday'}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{catConfig.terminology.kpiSalesSubtitle}</span>
            <span className="font-semibold text-slate-700 capitalize">{scope}</span>
          </div>
        </div>

        {/* KPI 2: Today's Earnings / Payments Collected */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Payments Collected</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatINR(kpi.todayEarnings)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Paid: {formatINR(kpi.todayPaidAmount)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pending/Counter:</span>
            <span className="font-semibold text-amber-600">{formatINR(kpi.todayPendingAmount)}</span>
          </div>
        </div>

        {/* KPI 3: Today's Orders */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Today's Total Orders</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {kpi.todayOrdersCount} Orders
            </div>
            {kpi.todayOrdersCount > 0 && kpi.todayOrdersChange !== 0 ? (
              <div
                className={cn(
                  'flex items-center gap-1.5 mt-2 text-[11px] font-medium',
                  kpi.todayOrdersChange > 0 ? 'text-sky-600' : 'text-slate-500'
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {kpi.todayOrdersChange > 0 ? `+${kpi.todayOrdersChange}%` : `${kpi.todayOrdersChange}%`} activity rate
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                <span>{kpi.todayOrdersCount === 0 ? '0 orders received today' : 'Consistent with yesterday'}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{catConfig.terminology.kpiOrdersSubtitle}</span>
            <span className="font-semibold text-indigo-600">
              {(analytics?.orderStatusCounts?.new || 0) + (analytics?.orderStatusCounts?.preparing || 0)} In-Queue
            </span>
          </div>
        </div>

        {/* KPI 4: Today's Unique Customers */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Customers / Tokens</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {kpi.todayCustomersCount} Customers
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
              <span>{kpi.todayCustomersCount === 0 ? 'No customer checkouts yet' : 'Phone / token identified'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fulfillment Mode</span>
            <span className="font-semibold text-purple-600">Counter / Takeaway / Online</span>
          </div>
        </div>
      </div>

      {/* CATEGORY-SPECIFIC OPERATIONAL INSIGHT WIDGET */}
      {catConfig.id === 'hardware' && (
        <div className="p-5 bg-white rounded-2xl border border-indigo-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hardware & Construction Materials Control</h3>
                <p className="text-xs text-slate-500">Multi-unit stocking, site dispatch logistics and contractor bulk orders</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Units Supported:</span>
              <div className="flex flex-wrap gap-1">
                {catConfig.supportedUnits.slice(0, 5).map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] uppercase">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span>Bulk Construction Stocking</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Track materials by 50kg bags (cement), 12m length pieces (steel rebars), or metres/litres (pipes & paints) with automated low-stock warnings.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Site Delivery & Dispatch</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Manage truck and tempo loading queues directly from the Loading Tokens queue with live tracking links for contractors and builders.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>Counter QR Catalog</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Contractors and walk-in buyers can scan your counter QR to view updated prices and place digital orders right from the billing counter.
              </p>
            </div>
          </div>
        </div>
      )}

      {catConfig.id === 'grocery' && (
        <div className="p-5 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kirana & Daily Provisions Control</h3>
                <p className="text-xs text-slate-500">Live grocery inventory, loose grain metric weights and neighborhood delivery baskets</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Units:</span>
              <div className="flex flex-wrap gap-1">
                {catConfig.supportedUnits.map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono text-[11px] uppercase border border-emerald-200">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Packs & Kilogram Weights</div>
              <p className="text-slate-500 text-[11px]">Seamlessly sell packaged goods and loose items with automated quantity updates.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Local Pickup & Delivery</div>
              <p className="text-slate-500 text-[11px]">Customers order daily staples online and receive instant WhatsApp/SMS notification tokens.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Zero-Commission UPI</div>
              <p className="text-slate-500 text-[11px]">Direct UPI QR payments directly to your shop UPI ID with 100% margin retention.</p>
            </div>
          </div>
        </div>
      )}

      {['restaurant', 'cafe', 'bakery', 'juice_chaat', 'hotel'].includes(catConfig.id) && (
        <div className="p-5 bg-white rounded-2xl border border-orange-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-700">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{catConfig.label} Kitchen & Dining Ops</h3>
                <p className="text-xs text-slate-500">Live order tokens, chef KOT status, table ordering and TV display</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/display/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Open Kitchen TV Display</span>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Table QR & Contactless Dining</div>
              <p className="text-slate-500 text-[11px]">Customers scan table QR codes, browse photos and order directly without app downloads.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Kitchen Order Ticket (KOT)</div>
              <p className="text-slate-500 text-[11px]">Orders appear instantly on kitchen screens with token numbers and preparation statuses.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="font-bold text-slate-800 mb-1">Rapid Counter Tokens</div>
              <p className="text-slate-500 text-[11px]">Call out ready orders on large TV displays or counter buzzers for effortless takeaway flow.</p>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS ROW 1: Sales Trend & Hourly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Line/Area Chart */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue & Ordering Trend</h3>
              <p className="text-xs text-slate-500">Comparing Store vs Menu sales over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-slate-600">Store Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-600">Menu Sales</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full min-w-0">
            {analytics?.salesTrend && analytics.salesTrend.some((d) => d.totalSales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="menuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="storeSales" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#storeGrad)" />
                  <Area type="monotone" dataKey="menuSales" stroke="#ea580c" strokeWidth={2.5} fillOpacity={1} fill="url(#menuGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Sales Activity Yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  Orders placed through your public Store or Restaurant Menu will appear on this live chart.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution Donut */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Order Status Breakdown</h3>
            <p className="text-xs text-slate-500">Live operational status</p>
          </div>

          <div className="h-52 w-full my-2 flex items-center justify-center min-w-0">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} Orders`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Orders in Queue</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Live kitchen tokens and fulfillment stages will track here.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-[11px]">
            {statusData.length > 0 ? (
              statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}:</span>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-slate-400 text-[11px] py-1">
                Awaiting incoming orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: Hourly Order Volume & Top-Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Volume Bar Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Hourly Peak Hours</h3>
              <p className="text-xs text-slate-500">Rush hour distribution</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-60 w-full min-w-0">
            {analytics?.hourlyOrders && analytics.hourlyOrders.some((h) => h.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.hourlyOrders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [name === 'count' ? `${val} Orders` : `₹${val}`, name === 'count' ? 'Orders' : 'Sales']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Orders Placed Today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hourly peak distribution will plot automatically as orders arrive.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top-Selling Products Table / Cards */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top-Selling Products & Items</h3>
              <p className="text-xs text-slate-500">Ranked by actual sales volume</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              Real Data
            </span>
          </div>

          <div className="overflow-x-auto">
            {analytics?.topSellingProducts && analytics.topSellingProducts.length > 0 ? (
              <table className="w-full text-left text-xs min-w-[440px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Rank</th>
                    <th className="pb-2">Item</th>
                    <th className="pb-2">Source</th>
                    <th className="pb-2 text-right">Units Sold</th>
                    <th className="pb-2 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.topSellingProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-bold text-slate-500">#{p.rank}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.productName} className="w-7 h-7 rounded-md object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500">
                              {p.productName.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-semibold text-slate-800">{p.productName}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            p.sourceType === 'store'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          )}
                        >
                          {p.sourceType}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-700">{p.quantitySold} units</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{formatINR(p.salesValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No product sales records yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Recent Authorized Orders */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Live Orders</h3>
            <p className="text-xs text-slate-500">Latest orders across your authorized channels</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentBusiness.settings.modules.store && (
              <Link href="/dashboard/store/orders">
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg hover:bg-sky-100 transition-colors">
                  Store Orders →
                </span>
              </Link>
            )}
            {currentBusiness.settings.modules.menu && (
              <Link href="/dashboard/menu/orders">
                <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-colors">
                  Menu KOT →
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile View: High-density order cards */}
        {analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
          <>
            <div className="block sm:hidden space-y-3">
              {analytics.recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-mono font-bold',
                        ord.sourceType === 'store'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-orange-50 text-orange-800 border border-orange-200'
                      )}
                    >
                      {ord.tokenNumber}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        ord.orderStatus === 'new' && 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                        ord.orderStatus === 'accepted' && 'bg-blue-50 text-blue-700 border border-blue-200',
                        ord.orderStatus === 'preparing' && 'bg-amber-50 text-amber-800 border border-amber-200',
                        ord.orderStatus === 'ready' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        ord.orderStatus === 'completed' && 'bg-emerald-100 text-emerald-800',
                        ord.orderStatus === 'cancelled' && 'bg-rose-50 text-rose-700'
                      )}
                    >
                      {ord.orderStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-1">
                    <div>
                      <p className="font-bold text-slate-800">{ord.customer.name || 'Guest'}</p>
                      <p className="text-[10px] text-slate-500">
                        {ord.customer.tableNumber ? `🍽️ ${ord.customer.tableNumber}` : ord.fulfilmentMethod}
                      </p>
                    </div>
                    <span className="font-black text-slate-900 text-sm">{formatINR(ord.total)}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 truncate border-t border-slate-200/60 pt-1.5">
                    {ord.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </p>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400 capitalize">
                      {ord.sourceType === 'store' ? 'Store Order' : 'Dining Menu'}
                    </span>
                    <a
                      href={`/track/${ord.trackingId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      <span>Track Live</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet View: Full table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                    <th className="p-3">Token #</th>
                    <th className="p-3">Source Channel</th>
                    <th className="p-3">Customer / Table</th>
                    <th className="p-3">Items Ordered</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Order Status</th>
                    <th className="p-3 text-right">Customer Tracker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs',
                            ord.sourceType === 'store'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-orange-50 text-orange-800 border border-orange-200'
                          )}
                        >
                          {ord.tokenNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            ord.sourceType === 'store' ? 'bg-sky-50 text-sky-700' : 'bg-orange-50 text-orange-700'
                          )}
                        >
                          {ord.sourceType === 'store' ? 'Retail Store' : 'Restaurant Menu'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{ord.customer.name || 'Guest'}</div>
                        <div className="text-[10px] text-slate-500">
                          {ord.customer.tableNumber ? `🍽️ ${ord.customer.tableNumber}` : ord.fulfilmentMethod}
                        </div>
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-slate-600">
                        {ord.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-3 font-black text-slate-900">{formatINR(ord.total)}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                            ord.orderStatus === 'new' && 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                            ord.orderStatus === 'accepted' && 'bg-blue-50 text-blue-700 border border-blue-200',
                            ord.orderStatus === 'preparing' && 'bg-amber-50 text-amber-800 border border-amber-200',
                            ord.orderStatus === 'ready' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            ord.orderStatus === 'completed' && 'bg-emerald-100 text-emerald-800',
                            ord.orderStatus === 'cancelled' && 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={`/track/${ord.trackingId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <span>View Live</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              When customers place an order through your Digital Store or Restaurant Menu, it will instantly appear here with live tracking.
            </p>
          </div>
        )}
      </div>

      {/* ROW 4: Low-Stock Retail Alerts (Store inventory) */}
      {currentBusiness.settings.modules.store && analytics?.lowStockAlerts && analytics.lowStockAlerts.length > 0 && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Low Stock Inventory Warning for Retail Store</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.lowStockAlerts.map((item) => (
              <div key={item.id} className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[11px] text-slate-500">SKU: {item.sku || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded font-black text-rose-600 bg-rose-50 border border-rose-200">
                    {item.stockQuantity} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
