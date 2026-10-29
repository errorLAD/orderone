'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Store,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  UtensilsCrossed,
  ChevronDown,
  X,
  Power,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/categories';

interface StoreOperationsCardProps {
  className?: string;
  compact?: boolean;
}

export function StoreOperationsCard({ className, compact = false }: StoreOperationsCardProps) {
  const { currentBusiness, updateStoreOperations } = useApp();
  const [isUpdatingStore, setIsUpdatingStore] = useState<boolean>(false);
  const [isUpdatingOrdering, setIsUpdatingOrdering] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

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
  const primaryUrl = isFood ? `/menu/${currentBusiness.slug}` : `/store/${currentBusiness.slug}`;
  const primaryLabel = isFood ? 'View Public Menu' : 'View Storefront';
  const PrimaryIcon = isFood ? UtensilsCrossed : Store;

  // Secondary link if both channels are active
  const hasDualChannels = hasStoreModule && hasMenuModule;
  const secondaryUrl = isFood ? `/store/${currentBusiness.slug}` : `/menu/${currentBusiness.slug}`;
  const secondaryLabel = isFood ? 'View Store' : 'View Menu';

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
          ? (isFood ? 'Kitchen is now marked OPEN.' : 'Store is now marked OPEN.')
          : (isFood ? 'Kitchen is now marked CLOSED.' : 'Store is now marked CLOSED.'),
      });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update store status.',
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
          : (isFood ? 'Online food ordering is PAUSED.' : 'Online ordering is PAUSED.'),
      });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update ordering status.',
      });
    }
    setIsUpdatingOrdering(false);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all',
        className
      )}
    >
      {/* Sleek, Single-Row Operations Strip */}
      <div className="p-3 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Module Identity & Live Acceptance Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
              isStoreOpen
                ? isFood
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            )}
          >
            <PrimaryIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 truncate">
                {isFood ? 'Kitchen Operations' : 'Store Operations'}
              </span>

              {canAcceptOnlineOrders ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Accepting Orders
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Orders Blocked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: The Two Fast Operational Toggles */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap bg-slate-50/90 px-3 py-1.5 rounded-xl border border-slate-200/70">
          {/* Toggle 1: Kitchen / Store Open */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              disabled={isUpdatingStore}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                isStoreOpen
                  ? isFood
                    ? 'bg-orange-600'
                    : 'bg-emerald-600'
                  : 'bg-slate-300',
                isUpdatingStore && 'opacity-60 cursor-not-allowed'
              )}
              title={isStoreOpen ? 'Mark Closed' : 'Mark Open'}
              aria-label="Toggle Store Open/Closed"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  isStoreOpen ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {isStoreOpen
                ? isFood
                  ? 'Kitchen Open'
                  : 'Store Open'
                : isFood
                ? 'Kitchen Closed'
                : 'Store Closed'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Toggle 2: Online Ordering ON / OFF */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOnlineOrdering}
              disabled={isUpdatingOrdering}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                onlineOrderingEnabled ? 'bg-sky-600' : 'bg-slate-300',
                isUpdatingOrdering && 'opacity-60 cursor-not-allowed'
              )}
              title={onlineOrderingEnabled ? 'Pause Online Orders' : 'Enable Online Orders'}
              aria-label="Toggle Online Ordering"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  onlineOrderingEnabled ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {onlineOrderingEnabled ? 'Online Orders: ON' : 'Online Orders: Paused'}
            </span>
          </div>
        </div>

        {/* Right: Quick Links & Details Expander */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={primaryUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
          >
            <span>{primaryLabel}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {hasDualChannels && (
            <Link
              href={secondaryUrl}
              target="_blank"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
            >
              <span>{secondaryLabel}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Toggle rules & explanations"
            aria-label="Toggle details"
          >
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-200', showDetails && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Collapsible Details Drawer (Out of the way by default) */}
      {showDetails && (
        <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Rule:</strong> Customers can submit orders only when{' '}
              <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">
                {isFood ? 'Kitchen Open' : 'Store Open'}
              </code>{' '}
              AND{' '}
              <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">
                Online Orders ON
              </code>
              .
            </span>
          </div>
          <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
            When online orders are paused, customers can still browse your menu/catalog and prices, but cart checkout is temporarily blocked.
          </p>
        </div>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            'px-4 py-2 text-xs font-semibold flex items-center justify-between border-t transition-all',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
