import React from 'react';
import { Store, Calculator, Check, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SalesChannel = 'both' | 'storefront' | 'pos';

interface SalesChannelSelectorProps {
  value: SalesChannel;
  onChange: (val: SalesChannel) => void;
  entityType?: 'category' | 'item' | 'product';
  disabled?: boolean;
}

export function SalesChannelSelector({
  value,
  onChange,
  entityType = 'product',
  disabled = false,
}: SalesChannelSelectorProps) {
  const options: Array<{
    id: SalesChannel;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'both',
      label: 'Both (Storefront & POS)',
      sublabel: `Visible on online storefront & available at in-store POS counter billing.`,
      icon: <ArrowRightLeft className="w-4 h-4 text-emerald-600" />,
      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500',
    },
    {
      id: 'storefront',
      label: 'Storefront Only (Online)',
      sublabel: `Visible only to online customers. Hidden from in-store POS register.`,
      icon: <Store className="w-4 h-4 text-blue-600" />,
      color: 'border-blue-500 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500',
    },
    {
      id: 'pos',
      label: 'POS Counter Only (In-store)',
      sublabel: `Only available for counter staff at POS billing. Hidden from public storefront.`,
      icon: <Calculator className="w-4 h-4 text-purple-600" />,
      color: 'border-purple-500 bg-purple-50/50 text-purple-950 ring-1 ring-purple-500',
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-800">
        Sales Channel Availability *
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer',
                isSelected
                  ? opt.color
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                    {opt.icon}
                  </div>
                  <span className="text-xs font-bold">{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {opt.sublabel}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SalesChannelBadge({
  channel = 'both',
  size = 'sm',
}: {
  channel?: SalesChannel | null;
  size?: 'xs' | 'sm';
}) {
  const ch = channel || 'both';

  if (ch === 'pos') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200',
          size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        )}
        title="Only available at in-store POS register"
      >
        <Calculator className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>POS Only</span>
      </span>
    );
  }

  if (ch === 'storefront') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200',
          size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        )}
        title="Only available on online storefront"
      >
        <Store className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>Storefront Only</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
      title="Available on both Online Storefront & POS Counter"
    >
      <ArrowRightLeft className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>Both (Store & POS)</span>
    </span>
  );
}
