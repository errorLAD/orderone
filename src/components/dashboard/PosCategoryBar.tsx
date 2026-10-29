'use client';

import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Shirt,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
  Droplets,
  Paintbrush,
  Wrench,
  Coffee,
  Zap,
} from 'lucide-react';
import { Category, Product } from '@/types';
import { cn } from '@/lib/utils';

interface PosCategoryBarProps {
  categories: Category[];
  products: Product[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function PosCategoryBar({
  categories,
  products,
  selectedCategory,
  onSelectCategory,
  className,
}: PosCategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -180 : 180;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getThematicIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('brick') || lower.includes('sand')) {
      return <Boxes className="w-3.5 h-3.5 text-amber-700" />;
    }
    if (lower.includes('steel') || lower.includes('iron') || lower.includes('metal') || lower.includes('rebar')) {
      return <Layers className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (lower.includes('paint') || lower.includes('primer') || lower.includes('color')) {
      return <Paintbrush className="w-3.5 h-3.5 text-rose-600" />;
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('water') || lower.includes('sanitary')) {
      return <Droplets className="w-3.5 h-3.5 text-cyan-600" />;
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('switch') || lower.includes('light')) {
      return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw') || lower.includes('fastener')) {
      return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('fashion') || lower.includes('wear') || lower.includes('pant')) {
      return <Shirt className="w-3.5 h-3.5 text-violet-600" />;
    }
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('sim') || lower.includes('gadget')) {
      return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (lower.includes('food') || lower.includes('snack') || lower.includes('dish') || lower.includes('starter') || lower.includes('meal') || lower.includes('roti') || lower.includes('curry')) {
      return <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />;
    }
    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('juice') || lower.includes('beverage')) {
      return <Coffee className="w-3.5 h-3.5 text-amber-800" />;
    }
    if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('perfume')) {
      return <Sparkles className="w-3.5 h-3.5 text-pink-600" />;
    }
    return <Package className="w-3.5 h-3.5 text-indigo-600" />;
  };

  return (
    <div className={cn('relative group/nav flex items-center', className)}>
      {/* Left Scroll Arrow */}
      <button
        type="button"
        onClick={() => scroll('left')}
        className="absolute -left-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shrink-0"
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Right Scroll Arrow */}
      <button
        type="button"
        onClick={() => scroll('right')}
        className="absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shrink-0"
        aria-label="Scroll categories right"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Compact Categories Rail */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto px-4 py-0.5 scroll-smooth scrollbar-none w-full"
      >
        {/* "All Items" Chip */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer select-none',
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
              selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
            )}
          >
            <ShoppingBag className="w-3 h-3" />
          </div>
          <span className="whitespace-nowrap">All Items</span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
              selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            )}
          >
            {products.length}
          </span>
        </button>

        {/* Dynamic Category Chips */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = products.filter((p) => p.categoryId === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer select-none',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center shrink-0 overflow-hidden',
                  isSelected ? 'bg-white/20' : 'bg-slate-100'
                )}
              >
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className={cn(isSelected ? 'text-white' : '')}>
                    {getThematicIcon(cat.name)}
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap max-w-[110px] truncate" title={cat.name}>
                {cat.name}
              </span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
