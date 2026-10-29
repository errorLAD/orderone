'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

interface OrderOneLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  darkBg?: boolean;
}

// Fixed pixel heights to prevent ANY layout shift or unstyled 1024px blowouts
const PIXEL_HEIGHTS: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 22,
  sm: 28,
  md: 34,
  lg: 42,
  xl: 52,
};

// Aspect ratio is 1024 / 387 = ~2.646
export function OrderOneLogo({
  className,
  size = 'md',
  showSubtitle = false,
  subtitle,
  href,
  onClick,
  darkBg = false,
}: OrderOneLogoProps) {
  const pixelHeight = PIXEL_HEIGHTS[size] || 34;
  const calculatedWidth = Math.round(pixelHeight * 2.646);

  const content = (
    <div
      className={cn('inline-flex flex-col items-start justify-center select-none group', className)}
      style={{ maxWidth: '100%' }}
    >
      <div className="flex items-center gap-1.5" style={{ height: `${pixelHeight}px` }}>
        <img
          src="/logo.png"
          alt="OrderOne.in"
          width={calculatedWidth}
          height={pixelHeight}
          style={{
            height: `${pixelHeight}px`,
            maxHeight: `${pixelHeight}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          className={cn(
            'shrink-0 transition-transform group-hover:scale-[1.02]',
            darkBg && 'brightness-110 drop-shadow-xs'
          )}
        />
        <span
          className={cn(
            'text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded font-mono shrink-0',
            darkBg
              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
          )}
        >
          .in
        </span>
      </div>

      {showSubtitle && (
        <span
          className={cn(
            'text-[9px] font-semibold tracking-tight leading-none mt-1 truncate',
            darkBg ? 'text-slate-400' : 'text-slate-500'
          )}
        >
          {subtitle || `By ${PLATFORM_CONFIG.legalCompanyName}`}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
