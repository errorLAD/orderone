'use client';

import React, { useState } from 'react';
import {
  Calculator,
  User,
  Phone,
  Trash2,
  Plus,
  Minus,
  Edit2,
  X,
  Settings,
  Banknote,
  QrCode,
  CreditCard,
  FileText,
  Check,
  RefreshCw,
  ArrowLeft,
  IndianRupee,
  Sparkles,
} from 'lucide-react';
import { formatINR, cn } from '@/lib/utils';
import { Product, ProductVariant } from '@/types';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  selectedVariant?: ProductVariant;
  unit?: string;
  size?: string;
}

interface PosBillingRegisterProps {
  cart: CartItem[];
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  discountType: 'fixed' | 'percentage';
  setDiscountType: React.Dispatch<React.SetStateAction<'fixed' | 'percentage'>>;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  taxRate: number;
  setTaxRate: (rate: number) => void;
  isCustomTax: boolean;
  setIsCustomTax: (val: boolean) => void;
  onOpenTaxModal: () => void;
  paymentMethod: 'cash' | 'upi' | 'card';
  setPaymentMethod: (pm: 'cash' | 'upi' | 'card') => void;
  notes: string;
  setNotes: (val: string) => void;
  calculations: {
    subtotal: number;
    discountAmount: number;
    taxable: number;
    taxAmount: number;
    grandTotal: number;
  };
  isSubmitting: boolean;
  isSubscriptionExpired: boolean;
  handleCreateBill: (options: { viewBillImmediately: boolean }) => void;
  handleClearRegister: () => void;
  handleUpdateQuantity: (productId: string, delta: number, variantId?: string) => void;
  handleRemoveItem: (productId: string, variantId?: string) => void;
  onEditItem?: (item: CartItem) => void;
  // Mobile drawer controls
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function PosBillingRegister({
  cart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  taxRate,
  setTaxRate,
  isCustomTax,
  setIsCustomTax,
  onOpenTaxModal,
  paymentMethod,
  setPaymentMethod,
  notes,
  setNotes,
  calculations,
  isSubmitting,
  isSubscriptionExpired,
  handleCreateBill,
  handleClearRegister,
  handleUpdateQuantity,
  handleRemoveItem,
  onEditItem,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: PosBillingRegisterProps) {
  // Cash Tender Calculator State
  const [cashTendered, setCashTendered] = useState<string>('');

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeToReturn = tenderedAmount >= calculations.grandTotal
    ? Math.round((tenderedAmount - calculations.grandTotal) * 100) / 100
    : 0;
  const cashShortage = tenderedAmount > 0 && tenderedAmount < calculations.grandTotal
    ? Math.round((calculations.grandTotal - tenderedAmount) * 100) / 100
    : 0;

  // Preset cash suggestions (Exact, next round hundreds)
  const cashPresets = React.useMemo(() => {
    const total = Math.ceil(calculations.grandTotal);
    const presets: number[] = [total];
    [50, 100, 200, 500, 1000, 2000].forEach((denom) => {
      if (denom > total && !presets.includes(denom)) {
        presets.push(denom);
      }
    });
    return presets.slice(0, 4);
  }, [calculations.grandTotal]);

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={cn(
        'bg-white space-y-4',
        isMobileDrawer
          ? 'p-4 sm:p-6 overflow-y-auto'
          : 'rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 sticky top-6'
      )}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition mr-1"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>{isMobileDrawer ? 'Order & Checkout' : 'Current Register Bill'}</span>
              {cart.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                  {cart.length} item{cart.length > 1 ? 's' : ''} ({totalItemCount} units)
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              {cart.length === 0
                ? 'No items in bill'
                : `Ready for checkout • ${formatINR(calculations.grandTotal)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearRegister}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Optional Customer Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
            <User className="w-3 h-3 text-indigo-600" />
            <span>Customer Name (Opt)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Kumar"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
            <Phone className="w-3 h-3 text-indigo-600" />
            <span>Mobile Number (Opt)</span>
          </label>
          <input
            type="tel"
            placeholder="10-digit number"
            maxLength={10}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* 3. Cart Line Items List */}
      {cart.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
          <Calculator className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Register is empty</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Tap any product from the catalog to configure price, quantity, and add to bill.
          </p>
          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white"
            >
              <span>Browse Catalog</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Billed Items</span>
            <span>Tap item to edit price/unit</span>
          </div>

          <div
            className={cn(
              'space-y-2 pr-1 divide-y divide-slate-100 overflow-y-auto',
              isMobileDrawer ? 'max-h-[320px]' : 'max-h-[220px]'
            )}
          >
            {cart.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedVariant?.id || 'base'}`}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-2.5 text-xs group"
              >
                {/* Item Details (Click to Edit) */}
                <div
                  onClick={() => onEditItem?.(item)}
                  className="min-w-0 flex-1 cursor-pointer hover:opacity-85 transition"
                  title="Click to edit item price or quantity"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                    {item.selectedVariant?.name ? (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200/80 text-[10px] font-bold text-indigo-700">
                        {item.selectedVariant.name}
                      </span>
                    ) : item.size ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-200/70">
                        {item.size}
                      </span>
                    ) : null}
                    {item.unit && (
                      <span className="text-[10px] font-medium text-slate-400">
                        ({item.unit})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-bold text-slate-700">{formatINR(item.unitPrice)}</span>
                    <span>×</span>
                    <span className="font-bold text-slate-800">{item.quantity}</span>
                    <span>=</span>
                    <span className="font-black text-indigo-700">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                    <Edit2 className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />
                  </div>
                </div>

                {/* Quantity Controls Stepper */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateQuantity(item.product.id, -1, item.selectedVariant?.id)
                    }
                    className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 font-bold shadow-2xs active:scale-95 transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-black text-slate-900 text-xs">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateQuantity(item.product.id, 1, item.selectedVariant?.id)
                    }
                    className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 font-bold shadow-2xs active:scale-95 transition"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Remove Item */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.product.id, item.selectedVariant?.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition"
                  title="Remove from bill"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Discounts & Taxes Section */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
        {/* Discount Box */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
            <span>Discount</span>
            <button
              type="button"
              onClick={() => setDiscountType((d) => (d === 'fixed' ? 'percentage' : 'fixed'))}
              className="text-indigo-600 hover:underline lowercase font-bold cursor-pointer"
            >
              ({discountType === 'fixed' ? '₹ flat' : '% pct'})
            </button>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              placeholder="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">
              {discountType === 'fixed' ? '₹' : '%'}
            </span>
          </div>
        </div>

        {/* Tax Box */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <span>GST Rate</span>
              <span className="text-slate-400 font-normal">({taxRate}%)</span>
            </label>
            <button
              type="button"
              onClick={onOpenTaxModal}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
              title="Configure & Save Store Default Tax Rate"
            >
              <Settings className="w-2.5 h-2.5" />
              <span>Defaults</span>
            </button>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {[0, 5, 12, 18, 28].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  setTaxRate(rate);
                  setIsCustomTax(false);
                }}
                className={cn(
                  'px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer',
                  !isCustomTax && taxRate === rate
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {rate === 0 ? '0%' : `${rate}%`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomTax(!isCustomTax)}
              className={cn(
                'px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer',
                isCustomTax || ![0, 5, 12, 18, 28].includes(taxRate)
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Custom
            </button>
          </div>

          {(isCustomTax || ![0, 5, 12, 18, 28].includes(taxRate)) && (
            <div className="mt-1.5 relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                placeholder="Rate %"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                %
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Payment Method Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Payment Method
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={cn(
              'py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              paymentMethod === 'cash'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={cn(
              'py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              paymentMethod === 'upi'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>UPI / QR</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={cn(
              'py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              paymentMethod === 'card'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
        </div>
      </div>

      {/* 6. Cash Tender Calculator (When Cash is Selected) */}
      {paymentMethod === 'cash' && cart.length > 0 && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Calculator className="w-3 h-3 text-indigo-600" />
              <span>Cash Tendered</span>
            </span>
            {cashTendered && (
              <button
                type="button"
                onClick={() => setCashTendered('')}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
              ₹
            </span>
            <input
              type="number"
              step="1"
              min="0"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder={`Total: ₹${calculations.grandTotal}`}
              className="w-full pl-7 pr-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Cash Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {cashPresets.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashTendered(String(amt))}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Return Change Result */}
          {tenderedAmount > 0 && (
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between font-bold">
              {changeToReturn > 0 ? (
                <>
                  <span className="text-emerald-700">Change to Return:</span>
                  <span className="text-sm font-black text-emerald-700">
                    {formatINR(changeToReturn)}
                  </span>
                </>
              ) : cashShortage > 0 ? (
                <>
                  <span className="text-amber-700">Short / Due:</span>
                  <span className="text-sm font-black text-amber-700">
                    {formatINR(cashShortage)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-slate-600">Exact Cash Paid:</span>
                  <span className="text-xs font-black text-indigo-700">✓ Settled</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. Live Calculations Breakdown */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <span>Subtotal ({totalItemCount} units):</span>
          <span className="font-semibold text-slate-900">{formatINR(calculations.subtotal)}</span>
        </div>
        {calculations.discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600">
            <span>Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}:</span>
            <span className="font-bold">- {formatINR(calculations.discountAmount)}</span>
          </div>
        )}
        {calculations.taxAmount > 0 && (
          <div className="flex items-center justify-between text-slate-600">
            <span>GST / Tax ({taxRate}%):</span>
            <span className="font-semibold text-slate-900">+ {formatINR(calculations.taxAmount)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 uppercase">Grand Total:</span>
          <span className="text-lg font-black text-indigo-600">{formatINR(calculations.grandTotal)}</span>
        </div>
      </div>

      {/* 8. Primary Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => handleCreateBill({ viewBillImmediately: true })}
          disabled={isSubmitting || cart.length === 0 || isSubscriptionExpired}
          className={cn(
            'w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98',
            isSubscriptionExpired || cart.length === 0 || isSubmitting
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
          )}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Processing Bill...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Create & View Bill • {formatINR(calculations.grandTotal)}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleCreateBill({ viewBillImmediately: false })}
          disabled={isSubmitting || cart.length === 0 || isSubscriptionExpired}
          className={cn(
            'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer active:scale-98',
            isSubscriptionExpired || cart.length === 0 || isSubmitting
              ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
          )}
        >
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quick Bill & Clear (Next Customer)</span>
        </button>

        {isMobileDrawer && onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Keep Shopping / Add More Products</span>
          </button>
        )}
      </div>
    </div>
  );
}
