import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'store' | 'menu' | 'indigo';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    neutral: 'bg-slate-100/90 text-slate-700 border-slate-200/80 font-medium',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-medium',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/70 font-medium',
    error: 'bg-rose-50 text-rose-700 border-rose-200/70 font-medium',
    info: 'bg-sky-50 text-sky-700 border-sky-200/70 font-medium',
    store: 'bg-sky-50 text-sky-700 border-sky-200/70 font-mono font-medium',
    menu: 'bg-orange-50 text-orange-800 border-orange-200/70 font-mono font-medium',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 font-medium',
  };

  const dots = {
    neutral: 'bg-slate-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    store: 'bg-sky-500',
    menu: 'bg-orange-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight shadow-2xs',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />}
      {children}
    </span>
  );
}
