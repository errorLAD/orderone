'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BusinessPlanUsage } from '@/types';
import { cn } from '@/lib/utils';

interface PlanUsageCardProps {
  className?: string;
  compact?: boolean;
  typeFilter?: 'all' | 'products' | 'categories';
  onUsageLoaded?: (usage: BusinessPlanUsage) => void;
}

export function PlanUsageCard({
  className,
  compact = false,
  typeFilter = 'all',
  onUsageLoaded,
}: PlanUsageCardProps) {
  const { currentBusiness } = useApp();
  const [usage, setUsage] = useState<BusinessPlanUsage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsage = async () => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/subscriptions/usage?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success && data.usage) {
        setUsage(data.usage);
        if (onUsageLoaded) {
          onUsageLoaded(data.usage);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();

    const handleUsageChanged = () => {
      fetchUsage();
    };

    window.addEventListener('subscription_usage_changed', handleUsageChanged);
    return () => {
      window.removeEventListener('subscription_usage_changed', handleUsageChanged);
    };
  }, [currentBusiness?.id]);

  if (loading && !usage) {
    return (
      <div className={cn('p-4 bg-white rounded-2xl border border-slate-200 animate-pulse', className)}>
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
        <div className="h-2.5 bg-slate-100 rounded w-full mb-2" />
        <div className="h-2.5 bg-slate-100 rounded w-3/4" />
      </div>
    );
  }

  if (!usage) return null;

  const isBasic = usage.plan.name.toLowerCase().includes('basic');
  const isGold = usage.plan.name.toLowerCase().includes('gold');
  const prodLimitReached = usage.products.isLimitReached;
  const catLimitReached = usage.categories.isLimitReached;

  // Compact Banner View (For catalog & category headers)
  if (compact) {
    return (
      <div className={cn('p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5', className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-md font-black text-[10px] tracking-wide uppercase',
                isGold ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-200'
              )}
            >
              {usage.plan.name} Plan
            </span>
            <span className="text-slate-500 font-medium">Catalog Capacity</span>
          </div>

          {isBasic && (prodLimitReached || catLimitReached || usage.products.percentage >= 70) && (
            <Link
              href="/dashboard/subscription?plan=gold"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Upgrade to Gold</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Products Meter */}
          {(typeFilter === 'all' || typeFilter === 'products') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  Products / Menu Items
                </span>
                <span className="font-black text-slate-900">
                  {usage.products.count} / {usage.products.max}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    ({usage.products.remaining} left)
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    prodLimitReached
                      ? 'bg-rose-500'
                      : usage.products.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  )}
                  style={{ width: `${usage.products.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Categories Meter */}
          {(typeFilter === 'all' || typeFilter === 'categories') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Categories
                </span>
                <span className="font-black text-slate-900">
                  {usage.categories.count} / {usage.categories.max}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    ({usage.categories.remaining} left)
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    catLimitReached
                      ? 'bg-rose-500'
                      : usage.categories.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  )}
                  style={{ width: `${usage.categories.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Limit reached warning alert */}
        {((typeFilter === 'all' || typeFilter === 'products') && prodLimitReached) && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              {isBasic ? (
                <>
                  <span className="font-bold">You've reached the Basic plan limit of 20 products or menu items.</span>{' '}
                  <span>Upgrade to Gold for higher limits (50 items) and full Retail Store access.</span>
                </>
              ) : (
                <span className="font-bold">
                  You've reached the {usage.plan.name} plan limit of {usage.products.max} products or menu items.
                </span>
              )}
            </div>
          </div>
        )}

        {((typeFilter === 'all' || typeFilter === 'categories') && catLimitReached) && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              {isBasic ? (
                <>
                  <span className="font-bold">You've reached the Basic plan limit of 10 categories.</span>{' '}
                  <span>Upgrade to Gold for higher limits (30 categories) and full Retail Store access.</span>
                </>
              ) : (
                <span className="font-bold">
                  You've reached the {usage.plan.name} plan limit of {usage.categories.max} categories.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Plan Usage Card (for Dashboard Overview & Subscription Page)
  return (
    <div className={cn('p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-sm tracking-tight">Subscription Usage</h3>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full font-black text-[10px] tracking-wide uppercase',
                isGold
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              )}
            >
              {usage.plan.name} Plan • ₹{usage.plan.priceMonthly}/mo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time catalog quotas enforced across Store and Menu
          </p>
        </div>

        {isBasic && (
          <Link
            href="/dashboard/subscription?plan=gold"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Gold (₹99)</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Products / Menu Items Gauge */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              Products / Menu Items
            </span>
            <span className="font-black text-slate-900">
              {usage.products.count} <span className="text-slate-400 font-normal">/</span> {usage.products.max}
            </span>
          </div>

          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                prodLimitReached
                  ? 'bg-rose-500'
                  : usage.products.percentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              )}
              style={{ width: `${usage.products.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{usage.products.percentage}% capacity used</span>
            <span className={cn('font-bold', prodLimitReached ? 'text-rose-600' : 'text-slate-700')}>
              {usage.products.remaining} remaining
            </span>
          </div>
        </div>

        {/* Categories Gauge */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Categories
            </span>
            <span className="font-black text-slate-900">
              {usage.categories.count} <span className="text-slate-400 font-normal">/</span> {usage.categories.max}
            </span>
          </div>

          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                catLimitReached
                  ? 'bg-rose-500'
                  : usage.categories.percentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              )}
              style={{ width: `${usage.categories.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{usage.categories.percentage}% capacity used</span>
            <span className={cn('font-bold', catLimitReached ? 'text-rose-600' : 'text-slate-700')}>
              {usage.categories.remaining} remaining
            </span>
          </div>
        </div>
      </div>

      {/* Clear Guidance Banners if Limits Reached */}
      {prodLimitReached && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-xs">
              {isBasic
                ? `You've reached the Basic plan limit of 20 products or menu items.`
                : `You've reached the ${usage.plan.name} plan limit of ${usage.products.max} products or menu items.`}
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              {isBasic
                ? 'Upgrade to Gold (₹99/mo) to unlock up to 50 products/items, 30 categories, custom UPI payments, and dual Store + Menu modules.'
                : 'Deleting unused or out-of-stock items will immediately free up capacity, or you can contact support for enterprise quotas.'}
            </p>
            {isBasic && (
              <Link
                href="/dashboard/subscription?plan=gold"
                className="inline-flex items-center gap-1 font-black text-rose-700 hover:text-rose-900 text-[11px] underline mt-1"
              >
                <span>Upgrade to Gold for higher limits and Store access</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {catLimitReached && !prodLimitReached && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-xs">
              {isBasic
                ? `You've reached the Basic plan limit of 10 categories.`
                : `You've reached the ${usage.plan.name} plan limit of ${usage.categories.max} categories.`}
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              {isBasic
                ? 'Upgrade to Gold (₹99/mo) to expand your capacity up to 30 categories and 50 items.'
                : 'Delete unused categories to free up slots for new collections.'}
            </p>
            {isBasic && (
              <Link
                href="/dashboard/subscription?plan=gold"
                className="inline-flex items-center gap-1 font-black text-rose-700 hover:text-rose-900 text-[11px] underline mt-1"
              >
                <span>Upgrade to Gold for higher limits and Store access</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
