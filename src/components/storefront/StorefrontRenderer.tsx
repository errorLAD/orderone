'use client';

import React from 'react';
import { Business, Category, Product } from '@/types';
import { StorefrontColors, StorefrontTemplateId } from '@/types';
import { getContrastTextColor } from '@/lib/designPresets';
import { StorefrontTicker } from './StorefrontTicker';
import { formatINR, cn } from '@/lib/utils';
import {
  Store,
  UtensilsCrossed,
  Search,
  ShoppingBag,
  Sparkles,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Layers,
  Wrench,
  Paintbrush,
  Droplets,
  Zap,
  Boxes,
  Shirt,
  Smartphone,
  Flame,
  Award,
} from 'lucide-react';

interface StorefrontRendererProps {
  business: Business;
  products: Product[];
  categories: Category[];
  templateId: StorefrontTemplateId;
  colors: StorefrontColors;
  coverImageUrl?: string;
  cart: { [productId: string]: number };
  onUpdateQuantity: (productId: string, delta: number) => void;
  onOpenCart?: () => void;
  isPreview?: boolean;
  isRestaurant?: boolean;
  selectedCat: string;
  onSelectCat: (catId: string) => void;
  search: string;
  onSearchChange: (text: string) => void;
  dietaryFilter?: 'all' | 'veg' | 'spicy' | 'jain';
  onDietaryFilterChange?: (filter: 'all' | 'veg' | 'spicy' | 'jain') => void;
}

export function StorefrontRenderer({
  business,
  products,
  categories,
  templateId,
  colors,
  coverImageUrl,
  cart,
  onUpdateQuantity,
  onOpenCart,
  isPreview = false,
  isRestaurant = false,
  selectedCat,
  onSelectCat,
  search,
  onSearchChange,
  dietaryFilter = 'all',
  onDietaryFilterChange,
}: StorefrontRendererProps) {
  const contrastButtonText = getContrastTextColor(colors.button);
  const contrastPrimaryText = getContrastTextColor(colors.primary);

  const isStoreOpen = business?.isStoreOpen ?? business?.settings?.isStoreOpen ?? true;
  const onlineOrderingEnabled =
    business?.onlineOrderingEnabled ?? business?.settings?.onlineOrderingEnabled ?? true;
  const canAcceptOnlineOrders = isStoreOpen && onlineOrderingEnabled;

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('aggregate')) {
      return <Boxes className="w-4 h-4" />;
    }
    if (lower.includes('steel') || lower.includes('rebar') || lower.includes('iron') || lower.includes('metal')) {
      return <Layers className="w-4 h-4" />;
    }
    if (lower.includes('paint') || lower.includes('color') || lower.includes('finish')) {
      return <Paintbrush className="w-4 h-4" />;
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('sanitary') || lower.includes('water')) {
      return <Droplets className="w-4 h-4" />;
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('light') || lower.includes('switch')) {
      return <Zap className="w-4 h-4" />;
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw')) {
      return <Wrench className="w-4 h-4" />;
    }
    if (lower.includes('cloth') || lower.includes('fashion') || lower.includes('wear')) {
      return <Shirt className="w-4 h-4" />;
    }
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('gadget')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Package className="w-4 h-4" />;
  };

  const visibleCategories = categories.filter((c) => c.salesChannel !== 'pos');
  const visibleProducts = products.filter((p) => p.salesChannel !== 'pos');

  const filteredProducts = visibleProducts.filter((p) => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    if (isRestaurant && dietaryFilter !== 'all') {
      const flags = p.dietaryFlags || {};
      if (dietaryFilter === 'veg' && !flags.isVeg) return false;
      if (dietaryFilter === 'spicy' && !flags.isSpicy) return false;
      if (dietaryFilter === 'jain' && !flags.isJain) return false;
    }
    return true;
  });

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {/* ============================================================ */}
      {/* TEMPLATE 1: CLASSIC HEADER                                   */}
      {/* ============================================================ */}
      {templateId === 'classic' && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xs"
                  style={{
                    backgroundColor: colors.primary,
                    color: contrastPrimaryText,
                  }}
                >
                  {business.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm font-black tracking-tight" style={{ color: colors.text }}>
                    {business.name}
                  </h1>
                  {!isStoreOpen && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Closed
                    </span>
                  )}
                </div>
                {business.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">{business.description}</p>
                )}
              </div>
            </div>

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
              style={{
                backgroundColor: colors.button,
                color: contrastButtonText,
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isRestaurant ? 'Order' : 'Cart'}</span>
              {cartCount > 0 && (
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.button,
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* ============================================================ */}
      {/* TEMPLATE 2: MODERN HERO BANNER                               */}
      {/* ============================================================ */}
      {templateId === 'modern' && (
        <div className="relative">
          {/* Hero Banner Section */}
          <div
            className="relative w-full h-44 sm:h-56 overflow-hidden flex items-end"
            style={{
              background: coverImageUrl
                ? `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.15) 100%), url(${coverImageUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            {/* Ambient decorative shine */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />

            <div className="max-w-4xl mx-auto w-full px-4 pb-4 flex items-end justify-between gap-3 relative z-10">
              <div className="flex items-end gap-3.5">
                {/* Elevated Store Logo with Ring */}
                <div className="relative -mb-1 shrink-0">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white shadow-xl bg-white"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center font-black text-xl"
                      style={{
                        backgroundColor: colors.primary,
                        color: contrastPrimaryText,
                      }}
                    >
                      {business.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {canAcceptOnlineOrders && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-xs"
                      title="Open & Accepting Orders"
                    />
                  )}
                </div>

                <div className="text-white pb-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-xl font-black tracking-tight drop-shadow-md">
                      {business.name}
                    </h1>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-white/20 text-white border border-white/30"
                    >
                      {isRestaurant ? 'Dining' : 'Retail'}
                    </span>
                  </div>
                  {business.description ? (
                    <p className="text-xs text-white/90 line-clamp-1 mt-0.5 drop-shadow-xs max-w-md">
                      {business.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/80 mt-0.5">
                      {business.settings?.operatingHours || '09:00 AM - 09:00 PM'}
                    </p>
                  )}
                </div>
              </div>

              {/* Cart Button on Modern Header */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0 mb-0.5"
                style={{
                  backgroundColor: colors.button,
                  color: contrastButtonText,
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{isRestaurant ? 'Your Order' : 'Store Cart'}</span>
                {cartCount > 0 && (
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.button,
                    }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog Body */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-3 pb-12 space-y-3 flex-1">
        {/* Moving Notification & Social Links Ribbon (if configured) */}
        <StorefrontTicker business={business} isRestaurant={isRestaurant} />

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              isRestaurant
                ? 'Search dishes, drinks, biryani, combos...'
                : business.type.includes('hardware')
                ? 'Search cement, TMT steel, pipes, paints, tools, electrical...'
                : 'Search products, brand, items...'
            }
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 text-xs focus:outline-none shadow-2xs transition-all',
              templateId === 'modern' ? 'rounded-2xl' : 'rounded-xl'
            )}
            style={{
              borderColor: search ? colors.primary : undefined,
            }}
          />
        </div>

        {/* ============================================================ */}
        {/* RESTAURANT DIETARY FILTERS (IF DINING MENU)                 */}
        {/* ============================================================ */}
        {isRestaurant && onDietaryFilterChange && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <button
              onClick={() => onDietaryFilterChange('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors',
                dietaryFilter === 'all'
                  ? 'text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              )}
              style={
                dietaryFilter === 'all'
                  ? { backgroundColor: colors.primary, color: contrastPrimaryText }
                  : undefined
              }
            >
              All Items
            </button>
            <button
              onClick={() => onDietaryFilterChange('veg')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1',
                dietaryFilter === 'veg'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-emerald-800 border border-emerald-300'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Veg Only
            </button>
            <button
              onClick={() => onDietaryFilterChange('spicy')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors',
                dietaryFilter === 'spicy'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-800 border border-amber-300'
              )}
            >
              🌶️ Spicy
            </button>
            <button
              onClick={() => onDietaryFilterChange('jain')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors',
                dietaryFilter === 'jain'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-indigo-800 border border-indigo-200'
              )}
            >
              Jain
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CATEGORIES NAVIGATION                                        */}
        {/* ============================================================ */}
        {/* CLASSIC: Horizontal Minimal Pills */}
        {templateId === 'classic' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectCat('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border shrink-0',
                selectedCat === 'all'
                  ? 'shadow-xs'
                  : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
              )}
              style={
                selectedCat === 'all'
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      color: contrastPrimaryText,
                    }
                  : undefined
              }
            >
              All {isRestaurant ? 'Dishes' : 'Products'} ({visibleProducts.length})
            </button>
            {visibleCategories.map((c) => {
              const isSelected = selectedCat === c.id;
              const count = visibleProducts.filter((p) => p.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCat(c.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border shrink-0',
                    isSelected
                      ? 'shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          color: contrastPrimaryText,
                        }
                  : undefined
                  }
                >
                  {c.name} {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* MODERN: Visual Category Cards with Icons */}
        {templateId === 'modern' && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1.5 text-xs scrollbar-none">
            {/* All Category Pill */}
            <button
              type="button"
              onClick={() => onSelectCat('all')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-2xl font-bold whitespace-nowrap transition-all border shrink-0 shadow-2xs',
                selectedCat === 'all'
                  ? 'ring-2 ring-offset-1'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              )}
              style={
                selectedCat === 'all'
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      color: contrastPrimaryText,
                    }
                  : undefined
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All ({visibleProducts.length})</span>
            </button>

            {visibleCategories.map((c) => {
              const isSelected = selectedCat === c.id;
              const count = visibleProducts.filter((p) => p.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCat(c.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold whitespace-nowrap transition-all border shrink-0 shadow-2xs',
                    isSelected
                      ? 'ring-2 ring-offset-1'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          color: contrastPrimaryText,
                        }
                      : undefined
                  }
                >
                  <span className="opacity-80">{getCategoryIcon(c.name)}</span>
                  <span>{c.name}</span>
                  {count > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9px] font-black"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                        color: isSelected ? contrastPrimaryText : '#475569',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ============================================================ */}
        {/* PRODUCT CATALOG GRID                                         */}
        {/* ============================================================ */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="font-bold text-sm text-slate-800">
              {products.length === 0 ? 'No products available yet' : 'No items match your search'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {products.length === 0
                ? isPreview
                  ? 'Add products or menu items from the dashboard catalog to display them here.'
                  : 'Please check back soon. The store owner will add items shortly.'
                : 'Try clearing your search query or choosing another category above.'}
            </p>
          </div>
        ) : templateId === 'classic' ? (
          /* ============================================================ */
          /* CLASSIC PRODUCT CARDS GRID                                   */
          /* ============================================================ */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((p) => {
              const inCartQty = cart[p.id] || 0;
              const hasDiscount = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
              const effectivePrice = hasDiscount ? p.salePrice! : p.price;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-soft transition-all flex flex-col justify-between"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        {isRestaurant ? <UtensilsCrossed className="w-8 h-8 opacity-40" /> : <Package className="w-8 h-8 opacity-40" />}
                      </div>
                    )}
                    {hasDiscount && (
                      <span
                        className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs text-white"
                        style={{ backgroundColor: colors.accent }}
                      >
                        SALE
                      </span>
                    )}
                  </div>

                  {/* Product Content */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                      {p.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-black text-xs text-slate-900">{formatINR(effectivePrice)}</span>
                        {hasDiscount && (
                          <span className="text-[10px] text-slate-400 line-through ml-1">
                            {formatINR(p.price)}
                          </span>
                        )}
                      </div>

                      {inCartQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(p.id, 1)}
                          className="px-2.5 py-1 rounded-lg font-bold text-xs transition-transform active:scale-95 cursor-pointer"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          Add
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, -1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            -
                          </button>
                          <span className="text-[11px]">{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, 1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* MODERN PRODUCT CARDS GRID (Visual & Prominent)               */
          /* ============================================================ */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredProducts.map((p) => {
              const inCartQty = cart[p.id] || 0;
              const hasDiscount = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
              const effectivePrice = hasDiscount ? p.salePrice! : p.price;
              const discountPercent = hasDiscount
                ? Math.round(((p.price - p.salePrice!) / p.price) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-card transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Modern Product Image Container with Zoom */}
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        {isRestaurant ? (
                          <UtensilsCrossed className="w-10 h-10 opacity-30" />
                        ) : (
                          <Package className="w-10 h-10 opacity-30" />
                        )}
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {hasDiscount ? (
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full shadow-md text-white tracking-tight"
                          style={{ backgroundColor: colors.accent }}
                        >
                          {discountPercent}% OFF
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* Stock / Unit info for retail */}
                      {!isRestaurant && p.unit && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                          {p.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Modern Product Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-sm text-slate-900">
                            {formatINR(effectivePrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-slate-400 line-through font-medium">
                              {formatINR(p.price)}
                            </span>
                          )}
                        </div>
                        {!isRestaurant && p.stockQuantity !== undefined && p.stockQuantity <= 5 && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            Only {p.stockQuantity} left
                          </span>
                        )}
                      </div>

                      {inCartQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(p.id, 1)}
                          className="px-3.5 py-1.5 rounded-xl font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, -1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            -
                          </button>
                          <span>{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, 1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* STOREFRONT FOOTER                                             */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Hours, Contact Phone & Address */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-slate-600">
              {business.settings?.operatingHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{business.settings.operatingHours}</span>
                </div>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-1.5 hover:underline transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{business.phone}</span>
                </a>
              )}
              {business.address && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{business.address}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {business.settings?.socialLinks && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {business.settings.socialLinks.googleBusinessEnabled &&
                  business.settings.socialLinks.googleBusiness && (
                    <a
                      href={business.settings.socialLinks.googleBusiness}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-blue-600 font-bold hover:bg-blue-50 text-[10px] transition-colors"
                    >
                      <span>Google</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                {business.settings.socialLinks.instagramEnabled &&
                  business.settings.socialLinks.instagram && (
                    <a
                      href={business.settings.socialLinks.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-rose-600 font-bold hover:bg-rose-50 text-[10px] transition-colors"
                    >
                      <span>Instagram</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                {business.settings.socialLinks.youtubeEnabled &&
                  business.settings.socialLinks.youtube && (
                    <a
                      href={business.settings.socialLinks.youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-red-600 font-bold hover:bg-red-50 text-[10px] transition-colors"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-400">
            <span>
              © {new Date().getFullYear()} {business.name}. All rights reserved.
            </span>
            <span>Powered by OrderOne.in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
