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

export function OrderOneLogo({
  className,
  size = 'md',
  showSubtitle = false,
  subtitle,
  href,
  onClick,
  darkBg = false,
}: OrderOneLogoProps) {
  // Height mappings for exact aspect ratio (1024x387 -> 2.64:1)
  const heightMap = {
    xs: 'h-5',  // 20px
    sm: 'h-7',  // 28px
    md: 'h-8 sm:h-9',  // 32-36px
    lg: 'h-10 sm:h-11', // 40-44px
    xl: 'h-12 sm:h-14', // 48-56px
  };

  const content = (
    <div className={cn('inline-flex flex-col items-start justify-center select-none group', className)}>
      <div className="flex items-center gap-1.5">
        <img
          src="/logo.png"
          alt="OrderOne.in Logo"
          className={cn(
            heightMap[size],
            'w-auto object-contain shrink-0 transition-transform group-hover:scale-[1.02]',
            darkBg && 'brightness-110 drop-shadow-sm'
          )}
        />
        {/* Subtle top-level domain tag */}
        <span
          className={cn(
            'text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md self-center font-mono',
            darkBg
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
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
