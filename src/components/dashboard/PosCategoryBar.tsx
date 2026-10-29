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
}

export function PosCategoryBar({
  categories,
  products,
  selectedCategory,
  onSelectCategory,
}: PosCategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getThematicIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('brick') || lower.includes('sand')) {
      return <Boxes className="w-5 h-5 text-amber-700" />;
    }
    if (lower.includes('steel') || lower.includes('iron') || lower.includes('metal') || lower.includes('rebar')) {
      return <Layers className="w-5 h-5 text-slate-700" />;
    }
    if (lower.includes('paint') || lower.includes('primer') || lower.includes('color')) {
      return <Paintbrush className="w-5 h-5 text-rose-600" />;
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('water') || lower.includes('sanitary')) {
      return <Droplets className="w-5 h-5 text-cyan-600" />;
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('switch') || lower.includes('light')) {
      return <Zap className="w-5 h-5 text-amber-500" />;
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw') || lower.includes('fastener')) {
      return <Wrench className="w-5 h-5 text-blue-600" />;
    }
    if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('fashion') || lower.includes('wear') || lower.includes('pant')) {
      return <Shirt className="w-5 h-5 text-violet-600" />;
    }
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('sim') || lower.includes('gadget')) {
      return <Smartphone className="w-5 h-5 text-emerald-600" />;
    }
    if (lower.includes('food') || lower.includes('snack') || lower.includes('dish') || lower.includes('starter') || lower.includes('meal') || lower.includes('roti') || lower.includes('curry')) {
      return <UtensilsCrossed className="w-5 h-5 text-orange-600" />;
    }
    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('juice') || lower.includes('beverage')) {
      return <Coffee className="w-5 h-5 text-amber-800" />;
    }
    if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('perfume')) {
      return <Sparkles className="w-5 h-5 text-pink-600" />;
    }
    return <Package className="w-5 h-5 text-indigo-600" />;
  };

  return (
    <div className="relative group/nav bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
      {/* Left Scroll Arrow Button */}
      <button
        type="button"
        onClick={() => scroll('left')}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Right Scroll Arrow Button */}
      <button
        type="button"
        onClick={() => scroll('right')}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Categories Row */}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 sm:gap-4 overflow-x-auto px-4 py-1 scroll-smooth scrollbar-none"
      >
        {/* "All Items" / "For You" Card (Reference match) */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className="group/item flex flex-col items-center shrink-0 cursor-pointer select-none focus:outline-hidden transition-transform active:scale-95"
        >
          <div
            className={cn(
              'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all p-1',
              selectedCategory === 'all'
                ? 'bg-blue-50/80 border-2 border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-slate-50 border border-slate-200 group-hover/item:bg-slate-100 group-hover/item:border-slate-300'
            )}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <span
            className={cn(
              'mt-1.5 text-xs text-center tracking-tight max-w-[76px] truncate',
              selectedCategory === 'all'
                ? 'font-black text-slate-900'
                : 'font-semibold text-slate-600 group-hover/item:text-slate-900'
            )}
          >
            All Items
          </span>
          <span className="text-[10px] text-slate-400 font-medium">({products.length})</span>
          {/* Active bottom line indicator matching reference */}
          <span
            className={cn(
              'h-0.5 rounded-full mt-1 transition-all',
              selectedCategory === 'all' ? 'w-8 bg-blue-600' : 'w-0 bg-transparent'
            )}
          />
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = products.filter((p) => p.categoryId === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="group/item flex flex-col items-center shrink-0 cursor-pointer select-none focus:outline-hidden transition-transform active:scale-95"
            >
              <div
                className={cn(
                  'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all overflow-hidden p-1',
                  isSelected
                    ? 'bg-blue-50/80 border-2 border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border border-slate-200 group-hover/item:bg-slate-100 group-hover/item:border-slate-300'
                )}
              >
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    {getThematicIcon(cat.name)}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs text-center max-w-[76px] truncate leading-tight',
                  isSelected
                    ? 'font-black text-slate-900'
                    : 'font-semibold text-slate-600 group-hover/item:text-slate-900'
                )}
                title={cat.name}
              >
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">({count})</span>
              {/* Active bottom line indicator */}
              <span
                className={cn(
                  'h-0.5 rounded-full mt-1 transition-all',
                  isSelected ? 'w-8 bg-blue-600' : 'w-0 bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
