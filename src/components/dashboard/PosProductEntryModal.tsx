'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  Trash2,
  Package,
  IndianRupee,
  RotateCcw,
  Calculator as CalcIcon,
  Layers,
} from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { formatINR, cn } from '@/lib/utils';

export interface PosProductEntryData {
  product: Product;
  variant?: ProductVariant;
  unitPrice: number;
  quantity: number;
  unit: string;
  size?: string;
}

interface PosProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialVariant?: ProductVariant;
  initialQuantity?: number;
  initialUnitPrice?: number;
  initialUnit?: string;
  isExistingInCart?: boolean;
  onSave: (data: PosProductEntryData) => void;
  onRemove?: (productId: string, variantId?: string) => void;
}

const COMMON_RETAIL_UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pkt', 'meter'];

export function PosProductEntryModal({
  isOpen,
  onClose,
  product,
  initialVariant,
  initialQuantity = 1,
  initialUnitPrice,
  initialUnit,
  isExistingInCart = false,
  onSave,
  onRemove,
}: PosProductEntryModalProps) {
  if (!isOpen || !product) return null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(initialVariant);
  const [unitPrice, setUnitPrice] = useState<number>(() => {
    if (typeof initialUnitPrice === 'number') return initialUnitPrice;
    if (initialVariant) return initialVariant.price;
    return product.salePrice ?? product.price ?? 0;
  });
  const [quantity, setQuantity] = useState<number>(initialQuantity > 0 ? initialQuantity : 1);
  const [unit, setUnit] = useState<string>(
    initialUnit || initialVariant?.unit || product.unit || 'pcs'
  );
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState<'qty' | 'price'>('qty');

  // Reset or initialize state whenever modal opens with a new product/variant
  useEffect(() => {
    setSelectedVariant(initialVariant);
    const defaultPrice = initialVariant
      ? initialVariant.price
      : (product.salePrice ?? product.price ?? 0);
    setUnitPrice(typeof initialUnitPrice === 'number' ? initialUnitPrice : defaultPrice);
    setQuantity(initialQuantity > 0 ? initialQuantity : 1);
    setUnit(initialUnit || initialVariant?.unit || product.unit || 'pcs');
    setShowKeypad(false);
  }, [product, initialVariant, initialQuantity, initialUnitPrice, initialUnit]);

  // Catalog default price for current variant/product
  const defaultCatalogPrice = selectedVariant
    ? selectedVariant.price
    : (product.salePrice ?? product.price ?? 0);

  // Available stock check
  const availableStock = selectedVariant && typeof selectedVariant.stockQuantity === 'number'
    ? selectedVariant.stockQuantity
    : product.stockQuantity;

  const isStockLimited = typeof availableStock === 'number';
  const isOutOfStock = isStockLimited && availableStock <= 0;

  // Running line total
  const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

  // Switch Variant
  const handleVariantChange = (v: ProductVariant) => {
    setSelectedVariant(v);
    setUnitPrice(v.price);
    if (v.unit) setUnit(v.unit);
  };

  // Quantity helpers
  const handleStepQty = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (isStockLimited && next > (availableStock as number)) {
        return availableStock as number;
      }
      return next;
    });
  };

  const handleSetDirectQty = (val: number) => {
    if (val < 1) val = 1;
    if (isStockLimited && val > (availableStock as number)) {
      val = availableStock as number;
    }
    setQuantity(val);
  };

  // Quick Keypad handlers
  const handleKeypadPress = (key: string) => {
    if (keypadTarget === 'qty') {
      if (key === 'C') {
        setQuantity(1);
      } else if (key === 'BACK') {
        const str = String(quantity);
        if (str.length <= 1) setQuantity(1);
        else setQuantity(parseInt(str.slice(0, -1), 10) || 1);
      } else if (/^[0-9]$/.test(key)) {
        setQuantity((prev) => {
          const str = prev === 1 ? key : `${prev}${key}`;
          const parsed = parseInt(str, 10);
          if (isNaN(parsed) || parsed < 1) return 1;
          if (isStockLimited && parsed > (availableStock as number)) {
            return availableStock as number;
          }
          return parsed;
        });
      }
    } else {
      // Price Target
      if (key === 'C') {
        setUnitPrice(0);
      } else if (key === 'BACK') {
        const str = String(unitPrice);
        if (str.length <= 1) setUnitPrice(0);
        else setUnitPrice(parseFloat(str.slice(0, -1)) || 0);
      } else if (key === '.') {
        // Handled as decimal if not present
      } else if (/^[0-9]$/.test(key)) {
        setUnitPrice((prev) => {
          const str = prev === 0 ? key : `${prev}${key}`;
          const parsed = parseFloat(str);
          return isNaN(parsed) ? 0 : parsed;
        });
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isOutOfStock) return;

    onSave({
      product,
      variant: selectedVariant,
      unitPrice: Math.max(0, unitPrice),
      quantity: Math.max(1, quantity),
      unit: unit.trim() || 'pcs',
      size: selectedVariant?.size || selectedVariant?.name || product.size,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideUp sm:animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail */}
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=100&auto=format&fit=crop&q=80';
                  }}
                />
              ) : (
                <Package className="w-5 h-5 text-slate-400" />
              )}
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 truncate leading-snug">
                {product.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                {product.brand && (
                  <span className="font-semibold text-slate-600 truncate">{product.brand}</span>
                )}
                {isStockLimited ? (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded font-bold text-[10px]',
                      isOutOfStock
                        ? 'bg-rose-100 text-rose-700'
                        : (availableStock as number) <= 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    {isOutOfStock ? 'Sold Out' : `${availableStock} left`}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold text-[10px]">In Stock</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Variant Selector (if product has variants) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-600" />
                <span>Select Size / Variant</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const vOutOfStock = typeof v.stockQuantity === 'number' && v.stockQuantity <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={vOutOfStock}
                      onClick={() => handleVariantChange(v)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer',
                        vOutOfStock
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      <span>{v.name}</span>
                      <span className={cn('text-[11px]', isSelected ? 'text-indigo-100' : 'text-slate-400 font-normal')}>
                        ({formatINR(v.price)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price & Unit Dual Inputs */}
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Editable Unit Price */}
            <div className="col-span-7 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Item Price (₹)
                </label>
                {unitPrice !== defaultCatalogPrice && (
                  <button
                    type="button"
                    onClick={() => setUnitPrice(defaultCatalogPrice)}
                    className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5 hover:underline"
                    title="Reset to default price"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset ({formatINR(defaultCatalogPrice)})</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onFocus={() => {
                    setKeypadTarget('price');
                  }}
                  onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 text-base font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Unit Selector / Input */}
            <div className="col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Billing Unit
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  placeholder="pcs / kg"
                />
              </div>
            </div>
          </div>

          {/* Quick Unit Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Unit:</span>
            {COMMON_RETAIL_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  'px-2 py-0.5 rounded-lg text-[10px] font-bold transition border cursor-pointer',
                  unit.toLowerCase() === u.toLowerCase()
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Quantity Controls & Stepper */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Quantity
              </label>
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <CalcIcon className="w-3 h-3" />
                <span>{showKeypad ? 'Hide Keypad' : 'Quick Keypad'}</span>
              </button>
            </div>

            {/* Stepper with Large Touch Targets */}
            <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleStepQty(-1)}
                disabled={quantity <= 1}
                className="w-12 h-11 rounded-xl bg-white border border-slate-200/90 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-black shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex flex-col items-center justify-center flex-1 px-2">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onFocus={() => {
                    setKeypadTarget('qty');
                  }}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    handleSetDirectQty(isNaN(parsed) ? 1 : parsed);
                  }}
                  className="w-20 text-center font-black text-xl text-slate-900 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-semibold text-slate-400">
                  {unit || 'units'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStepQty(1)}
                disabled={isStockLimited && quantity >= (availableStock as number)}
                className="w-12 h-11 rounded-xl bg-white border border-slate-200/90 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-black shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick Quantity Presets */}
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 5, 10, 25, 50].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSetDirectQty(q)}
                  disabled={isStockLimited && q > (availableStock as number)}
                  className={cn(
                    'py-1 rounded-xl text-xs font-bold transition border text-center cursor-pointer disabled:opacity-30',
                    quantity === q
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Incremental Add Chips */}
            <div className="flex items-center justify-center gap-2 pt-0.5">
              {[
                { label: '+1', val: 1 },
                { label: '+2', val: 2 },
                { label: '+5', val: 5 },
                { label: '+10', val: 10 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleStepQty(chip.val)}
                  disabled={isStockLimited && quantity + chip.val > (availableStock as number)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/70 transition cursor-pointer disabled:opacity-30"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Numeric Keypad (Collapsible) */}
          {showKeypad && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>Keypad Target:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setKeypadTarget('qty')}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold transition',
                      keypadTarget === 'qty'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Quantity ({quantity})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeypadTarget('price')}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold transition',
                      keypadTarget === 'price'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Price (₹{unitPrice})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BACK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className={cn(
                      'py-2.5 rounded-xl font-black text-sm transition border active:scale-95 shadow-2xs cursor-pointer',
                      key === 'C'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : key === 'BACK'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {key === 'BACK' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Running Subtotal Strip */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                Line Subtotal
              </span>
              <span className="text-slate-600 text-[11px]">
                {formatINR(unitPrice)} × {quantity} {unit}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-indigo-700">
                {formatINR(lineTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isOutOfStock}
            className={cn(
              'w-full py-3 px-4 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-md active:scale-98',
              isOutOfStock
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
            )}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isExistingInCart ? 'Update in Bill' : 'Add to Bill'} • {formatINR(lineTotal)}
            </span>
          </button>

          {isExistingInCart && onRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove(product.id, selectedVariant?.id);
                onClose();
              }}
              className="w-full py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Item from Bill</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
