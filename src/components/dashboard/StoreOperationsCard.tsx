'use client';

import React, { useState } from 'react';
import {
  Store,
  Power,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Info,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/categories';
import Link from 'next/link';

interface StoreOperationsCardProps {
  className?: string;
  compact?: boolean;
}

export function StoreOperationsCard({ className, compact = false }: StoreOperationsCardProps) {
  const { currentBusiness, updateStoreOperations } = useApp();
  const [isUpdatingStore, setIsUpdatingStore] = useState<boolean>(false);
  const [isUpdatingOrdering, setIsUpdatingOrdering] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!currentBusiness) return null;

  const catConfig = getCategoryConfig(currentBusiness.type);
  const isFood = catConfig.primaryModule === 'menu';
  const hasStoreModule =
    currentBusiness.storeEntitlement?.allowed ??
    Boolean(currentBusiness.settings?.modules?.store);
  const hasMenuModule =
    currentBusiness.menuEntitlement?.allowed ??
    Boolean(currentBusiness.settings?.modules?.menu);

  // Primary live storefront link:
  // For food category (e.g. Royal Kitchen): /menu/[slug]
  // For retail category: /store/[slug]
  const primaryUrl = isFood ? `/menu/${currentBusiness.slug}` : `/store/${currentBusiness.slug}`;
  const primaryLabel = isFood ? 'View Public Menu' : 'View Public Storefront';
  const PrimaryIcon = isFood ? UtensilsCrossed : Store;

  // Secondary link if both channels are active
  const hasDualChannels = hasStoreModule && hasMenuModule;
  const secondaryUrl = isFood ? `/store/${currentBusiness.slug}` : `/menu/${currentBusiness.slug}`;
  const secondaryLabel = isFood ? 'View Retail Store' : 'View Menu';

  const isStoreOpen = currentBusiness.isStoreOpen ?? currentBusiness.settings?.isStoreOpen ?? true;
  const onlineOrderingEnabled =
    currentBusiness.onlineOrderingEnabled ?? currentBusiness.settings?.onlineOrderingEnabled ?? true;

  const canAcceptOnlineOrders = isStoreOpen && onlineOrderingEnabled;

  const handleToggleStoreStatus = async () => {
    setIsUpdatingStore(true);
    setFeedback(null);
    const targetStatus = !isStoreOpen;

    const res = await updateStoreOperations({ isStoreOpen: targetStatus });
    if (res.success) {
      setFeedback({
        type: 'success',
        message: targetStatus
          ? (isFood ? 'Kitchen is now marked OPEN for dining and online orders.' : 'Store is now marked OPEN for business.')
          : (isFood ? 'Kitchen is now marked CLOSED. Customers cannot place new food orders.' : 'Store is now marked CLOSED. Customers cannot place new orders.'),
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update store status. Rolled back.',
      });
    }
    setIsUpdatingStore(false);
  };

  const handleToggleOnlineOrdering = async () => {
    setIsUpdatingOrdering(true);
    setFeedback(null);
    const targetStatus = !onlineOrderingEnabled;

    const res = await updateStoreOperations({ onlineOrderingEnabled: targetStatus });
    if (res.success) {
      setFeedback({
        type: 'success',
        message: targetStatus
          ? 'Online ordering is now ENABLED.'
          : (isFood ? 'Online food ordering is PAUSED. Customers can still browse menu items.' : 'Online ordering is PAUSED. Customers can still browse products.'),
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update ordering status. Rolled back.',
      });
    }
    setIsUpdatingOrdering(false);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all',
        className
      )}
    >
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-slate-50 via-white to-slate-50/50 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl border transition-colors',
              isStoreOpen
                ? (isFood ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}
          >
            <PrimaryIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                {isFood ? 'Restaurant & Kitchen Operations' : 'Store Operations'}
              </h2>
              {/* Status Badge */}
              {isStoreOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isFood ? 'Kitchen Open' : 'Store Open'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {isFood ? 'Kitchen Closed' : 'Store Closed'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFood
                ? 'Manage live dining kitchen operating status and public digital menu ordering independently.'
                : 'Manage live physical store operating status and public online ordering independently.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <Link
            href={primaryUrl}
            target="_blank"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl shadow-2xs border transition-all',
              isFood
                ? 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
            )}
          >
            <PrimaryIcon className="w-3.5 h-3.5" />
            <span>{primaryLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>

          {hasDualChannels && (
            <Link
              href={secondaryUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
            >
              <span>{secondaryLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          )}
        </div>
      </div>

      {/* Control Grid: Control A & Control B */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CONTROL A: STORE / KITCHEN STATUS (OPEN / CLOSED) */}
        <div
          className={cn(
            'p-4 rounded-xl border transition-all flex flex-col justify-between',
            isStoreOpen
              ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
              : 'bg-rose-50/40 border-rose-200/80 shadow-2xs'
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Power className={cn('w-4 h-4', isStoreOpen ? 'text-emerald-600' : 'text-rose-600')} />
                <h3 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                  {isFood ? 'Control A: Kitchen / Dining Status' : 'Control A: Store Status'}
                </h3>
              </div>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                  isStoreOpen
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                )}
              >
                {isStoreOpen ? (isFood ? 'Kitchen Open' : 'Store Open') : (isFood ? 'Kitchen Closed' : 'Store Closed')}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {isStoreOpen
                ? (isFood
                    ? 'Kitchen is open for food orders. Customers can dine in, takeaway, or order delivery if online ordering is also ON.'
                    : 'Store is open for business. Customers can visit and place orders if online ordering is also ON.')
                : (isFood
                    ? 'Kitchen is temporarily closed. The menu displays "Kitchen Closed" banner and pauses order checkout while keeping dishes browseable.'
                    : 'Store is temporarily closed. The storefront shows "Store Closed" banner and prevents checkout while keeping catalog browseable.')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {isStoreOpen ? (isFood ? 'Mark Kitchen Closed' : 'Mark Store Closed') : (isFood ? 'Mark Kitchen Open' : 'Mark Store Open')}
            </span>
            <button
              onClick={handleToggleStoreStatus}
              disabled={isUpdatingStore}
              className={cn(
                'relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
                isStoreOpen ? 'bg-emerald-600' : 'bg-slate-300',
                isUpdatingStore && 'opacity-60 cursor-not-allowed'
              )}
              title={isStoreOpen ? 'Click to close' : 'Click to open'}
              aria-label="Toggle store open/closed"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                  isStoreOpen ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* CONTROL B: ONLINE ORDERING (ON / OFF) */}
        <div
          className={cn(
            'p-4 rounded-xl border transition-all flex flex-col justify-between',
            onlineOrderingEnabled
              ? 'bg-sky-50/40 border-sky-200/80 shadow-2xs'
              : 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag
                  className={cn('w-4 h-4', onlineOrderingEnabled ? 'text-sky-600' : 'text-amber-600')}
                />
                <h3 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                  Control B: Online Ordering
                </h3>
              </div>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                  onlineOrderingEnabled
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                )}
              >
                {onlineOrderingEnabled ? 'Ordering ON' : 'Ordering OFF'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {onlineOrderingEnabled
                ? (isFood
                    ? 'Online food ordering is active. Customers can add items to cart and submit food orders (requires Kitchen Open).'
                    : 'Online orders are accepted. Customers can add items to cart and submit orders (requires Store Open).')
                : (isFood
                    ? 'Online food ordering is paused. Customers can browse dishes and prices, but Add to Cart and KOT are disabled.'
                    : 'Online ordering is paused. Customers can browse products and prices, but Add to Cart and Checkout are disabled.')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {onlineOrderingEnabled ? 'Pause Online Orders' : 'Enable Online Orders'}
            </span>
            <button
              onClick={handleToggleOnlineOrdering}
              disabled={isUpdatingOrdering}
              className={cn(
                'relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-sky-600 focus:ring-offset-2',
                onlineOrderingEnabled ? 'bg-sky-600' : 'bg-slate-300',
                isUpdatingOrdering && 'opacity-60 cursor-not-allowed'
              )}
              title={onlineOrderingEnabled ? 'Click to pause online ordering' : 'Click to enable online ordering'}
              aria-label="Toggle online ordering ON/OFF"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                  onlineOrderingEnabled ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Rules Summary Matrix Bar */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-600">
            <strong>Rule:</strong> Can Accept Online Orders = <code>Store Open</code> AND{' '}
            <code>Online Ordering ON</code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Customer New Order Status:</span>
          {canAcceptOnlineOrders ? (
            <span className="font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
              ✓ ACCEPTING ORDERS
            </span>
          ) : (
            <span className="font-black text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-300">
              ✕ ORDERS BLOCKED
            </span>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            'px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-t transition-all',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
