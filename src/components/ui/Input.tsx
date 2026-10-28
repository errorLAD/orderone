import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-bold text-[#0F172A] tracking-tight">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-3.5 py-2 text-xs text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl shadow-2xs placeholder:text-[#94A3B8] transition-all duration-150',
            'focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10',
            'disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed',
            error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/10',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-[#64748B]">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-[#DC2626]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
