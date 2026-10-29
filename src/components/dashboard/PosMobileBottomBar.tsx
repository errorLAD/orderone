'use client';

import React from 'react';
import { Calculator, ArrowRight, ShoppingBag } from 'lucide-react';
import { formatINR, cn } from '@/lib/utils';
import { CartItem } from './PosBillingRegister';

interface PosMobileBottomBarProps {
  cart: CartItem[];
  grandTotal: number;
  onViewBill: () => void;
  className?: string;
}

export function PosMobileBottomBar({
  cart,
  grandTotal,
  onViewBill,
  className,
}: PosMobileBottomBarProps) {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = cart.length > 0;

  return (
    <div
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Left Side: Running Grand Total */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
            {hasItems && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-xs ring-2 ring-white">
                {totalItemCount}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Running Total
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
              {formatINR(grandTotal)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              {hasItems
                ? `${cart.length} item${cart.length > 1 ? 's' : ''} (${totalItemCount} units)`
                : 'Tap items to start bill'}
            </div>
          </div>
        </div>

        {/* Right Side: Prominent "View Bill / Checkout" Button */}
        <button
          type="button"
          onClick={onViewBill}
          disabled={!hasItems}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-md shrink-0 active:scale-95 cursor-pointer',
            !hasItems
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 ring-2 ring-indigo-500/20'
          )}
        >
          <span>View Bill / Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
