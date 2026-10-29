'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Search,
  Plus,
  Minus,
  Trash2,
  Download,
  Eye,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  Clock,
  User,
  Phone,
  Percent,
  IndianRupee,
  RefreshCw,
  FileText,
  Lock,
  ArrowRight,
  Package,
  Settings,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, formatTime, cn } from '@/lib/utils';
import { Product, PosBill, Category } from '@/types';
import { downloadPosBillPdf } from '@/lib/posPdfGenerator';
import { PosCategoryBar } from '@/components/dashboard/PosCategoryBar';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function PosBillingPage() {
  const { currentBusiness, currentRole, setCurrentBusiness } = useApp();

  // Entitlement Check: Gold or Diamond
  const isGoldPlan =
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_diamond';

  // Navigation Tabs: Register (Billing) vs History
  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');

  // Products & Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Register Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<number>(() => {
    return currentBusiness?.settings?.orderSettings?.taxRatePercentage || 0;
  });
  const [isCustomTax, setIsCustomTax] = useState<boolean>(false);
  const [showTaxModal, setShowTaxModal] = useState<boolean>(false);
  const [modalTaxRate, setModalTaxRate] = useState<number>(() => {
    return currentBusiness?.settings?.orderSettings?.taxRatePercentage ?? 0;
  });
  const [modalGstin, setModalGstin] = useState<string>(() => {
    return currentBusiness?.settings?.orderSettings?.gstin || currentBusiness?.settings?.gst?.gstin || '';
  });
  const [isSavingTax, setIsSavingTax] = useState<boolean>(false);

  // Sync default tax rate when currentBusiness changes or from localStorage cache
  useEffect(() => {
    if (typeof window !== 'undefined' && currentBusiness?.id) {
      const cached = localStorage.getItem(`pos_tax_rate_${currentBusiness.id}`);
      if (cached !== null && !isNaN(Number(cached))) {
        setTaxRate(Number(cached));
        return;
      }
    }
    if (currentBusiness?.settings?.orderSettings?.taxRatePercentage !== undefined) {
      setTaxRate(currentBusiness.settings.orderSettings.taxRatePercentage);
    }
  }, [currentBusiness?.id, currentBusiness?.settings?.orderSettings?.taxRatePercentage]);

  // Save Store Default Tax / GST Rate Handler
  const handleSaveStoreTaxRate = async (rateToSave: number, gstinToSave?: string) => {
    if (!currentBusiness) return;
    setIsSavingTax(true);
    try {
      const updatedSettings = {
        ...(currentBusiness.settings || {}),
        orderSettings: {
          ...(currentBusiness.settings?.orderSettings || {}),
          taxRatePercentage: rateToSave,
          enableGst: rateToSave > 0,
          gstin: gstinToSave !== undefined ? gstinToSave.trim() : (currentBusiness.settings?.orderSettings?.gstin || ''),
        },
      };

      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBusiness.id,
          settings: updatedSettings,
        }),
      });

      const data = await res.json();
      if (data.success && data.business) {
        if (setCurrentBusiness) {
          setCurrentBusiness(data.business);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pos_tax_rate_${currentBusiness.id}`, String(rateToSave));
        }
        setTaxRate(rateToSave);
        setShowTaxModal(false);
        setSuccessToast(`Store default GST rate saved as ${rateToSave}%!`);
        setTimeout(() => setSuccessToast(null), 3500);
      } else {
        setErrorMessage(data.error || 'Failed to update store tax settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating tax settings');
    } finally {
      setIsSavingTax(false);
    }
  };
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [notes, setNotes] = useState('');

  // Creation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Bill Receipt Modal State
  const [activeModalBill, setActiveModalBill] = useState<PosBill | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Sales History State
  const [historyBills, setHistoryBills] = useState<PosBill[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // 1. Fetch Catalog (Products + Categories)
  const fetchCatalog = async () => {
    if (!currentBusiness) return;
    setLoadingCatalog(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products?businessId=${currentBusiness.id}&channel=pos&limit=500`),
        fetch(`/api/categories?businessId=${currentBusiness.id}&channel=pos`),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.success) {
        setProducts(prodData.products || []);
      }
      if (catData.success) {
        setCategories(catData.categories || []);
      }
    } catch (err) {
      console.error('Failed to load catalog products for POS:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // 2. Fetch Sales History
  const fetchHistory = async () => {
    if (!currentBusiness) return;
    setLoadingHistory(true);
    try {
      let url = `/api/pos/bills?businessId=${currentBusiness.id}&limit=100`;
      if (historySearch.trim()) {
        url += `&search=${encodeURIComponent(historySearch.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHistoryBills(data.bills || []);
        setHistoryTotal(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch POS sales history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [currentBusiness]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, currentBusiness, historySearch]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Strictly exclude storefront-only items from POS counter
      if (p.salesChannel === 'storefront') {
        return false;
      }
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        return matchName || matchSku || matchBarcode;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Check stock if tracked
        if (
          typeof product.stockQuantity === 'number' &&
          existing.quantity + 1 > product.stockQuantity
        ) {
          setErrorMessage(`Only ${product.stockQuantity} unit(s) available in stock for "${product.name}".`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        if (
          typeof product.stockQuantity === 'number' &&
          product.stockQuantity <= 0
        ) {
          setErrorMessage(`"${product.name}" is currently out of stock.`);
          return prev;
        }
        return [...prev, { product, quantity: 1, unitPrice: product.salePrice ?? product.price }];
      }
    });
    setErrorMessage(null);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (
              typeof item.product.stockQuantity === 'number' &&
              newQty > item.product.stockQuantity
            ) {
              setErrorMessage(
                `Only ${item.product.stockQuantity} unit(s) available for "${item.product.name}".`
              );
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
    setErrorMessage(null);
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearRegister = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountValue('0');
    setNotes('');
    setErrorMessage(null);
  };

  // Live Calculations
  const calculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const parsedDisc = parseFloat(discountValue) || 0;
    let discountAmount = 0;

    if (parsedDisc > 0) {
      if (discountType === 'percentage') {
        discountAmount = Math.min(subtotal, Math.round(((subtotal * parsedDisc) / 100) * 100) / 100);
      } else {
        discountAmount = Math.min(subtotal, Math.round(parsedDisc * 100) / 100);
      }
    }

    const taxable = Math.max(0, subtotal - discountAmount);
    let taxAmount = 0;
    if (taxRate > 0) {
      taxAmount = Math.round(((taxable * taxRate) / 100) * 100) / 100;
    }

    const grandTotal = Math.max(0, Math.round((taxable + taxAmount) * 100) / 100);

    return {
      subtotal,
      discountAmount,
      taxable,
      taxAmount,
      grandTotal,
    };
  }, [cart, discountType, discountValue, taxRate]);

  // Submit Bill
  const handleCreateBill = async (options: { viewBillImmediately: boolean }) => {
    if (!currentBusiness) return;
    if (!isGoldPlan) {
      setErrorMessage('POS Counter Billing is a Gold Plan feature. Please upgrade your subscription.');
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Please add at least one product to create a bill.');
      return;
    }

    if (customerPhone.trim() && !/^\d{10}$/.test(customerPhone.trim())) {
      setErrorMessage('Please enter a valid 10-digit customer mobile number, or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        businessId: currentBusiness.id,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        taxRate,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/pos/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create bill');
      }

      const createdBill: PosBill = data.bill;

      // Update local product stock quantities if tracked
      setProducts((prev) =>
        prev.map((p) => {
          const billedItem = cart.find((c) => c.product.id === p.id);
          if (billedItem && typeof p.stockQuantity === 'number') {
            const nextStock = Math.max(0, p.stockQuantity - billedItem.quantity);
            return {
              ...p,
              stockQuantity: nextStock,
              isAvailable: nextStock > 0 ? p.isAvailable : false,
            };
          }
          return p;
        })
      );

      // Flash success toast
      setSuccessToast(`Bill #${createdBill.billNumber} created successfully! Total: ₹${createdBill.totalAmount}`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Reset Register
      handleClearRegister();

      // Show receipt modal if requested
      if (options.viewBillImmediately) {
        setActiveModalBill(createdBill);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating the bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (bill: PosBill) => {
    try {
      setDownloadingPdf(true);
      await downloadPosBillPdf(bill, currentBusiness);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  POS / Counter Billing
                </h1>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                    isGoldPlan
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  )}
                >
                  {isGoldPlan ? '★ Gold Entitlement Active' : 'Gold Feature (Locked)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate high-speed bills for walk-in counter customers with automatic taxes, custom discounts & PDF receipts.
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('register')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition',
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            <span>Counter Register</span>
            {cart.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold ml-1">
                {cart.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition',
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>POS Sales History</span>
          </button>
        </div>
      </div>

      {/* 2. Upgrade Banner for Basic Plan Users */}
      {!isGoldPlan && (
        <div className="p-6 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-200 text-amber-900">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                Gold Plan Upgrade Required for POS Counter Billing
              </h2>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
              POS Counter Billing is an exclusive Gold tier feature. Upgrade now to generate walk-in bills, apply discounts & GST, safely deduct catalog inventory, and download print-ready PDF receipts without hardware printer dependencies.
            </p>
          </div>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm shrink-0"
          >
            <span>Upgrade to Gold (₹149/mo)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Success / Error Alerts */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. TAB 1: COUNTER REGISTER (Split Grid: Left Catalog, Right Register) */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Catalog Picker (7 cols on Desktop) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Catalog Search & Category Navigation Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Categories Bar (Reference Match with Images & Active Indicator) */}
            <PosCategoryBar
              categories={categories}
              products={products}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Products Grid with Photos */}
            {loadingCatalog ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading catalog products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No products found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery ? `No results match "${searchQuery}". Try a different keyword.` : 'Add products to your catalog to begin counter billing.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((c) => c.product.id === product.id);
                  const isOutOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity <= 0;
                  const isLowStock =
                    typeof product.stockQuantity === 'number' &&
                    product.stockQuantity > 0 &&
                    product.stockQuantity <= (product.lowStockThreshold || 5);
                  const price = product.salePrice ?? product.price;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition flex flex-col justify-between relative select-none group',
                        isOutOfStock
                          ? 'opacity-65 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : cartItem
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20 cursor-pointer'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer'
                      )}
                    >
                      {/* Product Item Photo */}
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100 mb-2 shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=300&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400">
                            <Package className="w-7 h-7 text-slate-300 mb-1" />
                            <span className="text-[10px] text-slate-400 font-medium">No photo</span>
                          </div>
                        )}

                        {/* Floating in-cart badge */}
                        {cartItem && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-md ring-2 ring-white flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>{cartItem.quantity} in bill</span>
                          </span>
                        )}

                        {/* Floating stock badge */}
                        {isOutOfStock ? (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[9px] font-bold shadow-2xs backdrop-blur-xs">
                            Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-bold shadow-2xs backdrop-blur-xs">
                            {product.stockQuantity} left
                          </span>
                        ) : null}

                        {/* Channel tag */}
                        {product.salesChannel === 'pos' && (
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 rounded bg-purple-900/80 text-white text-[9px] font-semibold backdrop-blur-xs">
                            POS Only
                          </span>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="space-y-1 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                            {product.name}
                          </h4>
                          {product.brand && (
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              {product.brand} {product.unit && `• ${product.unit}`}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-1 flex items-end justify-between">
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              {formatINR(price)}
                            </div>
                            {product.salePrice && product.price > product.salePrice && (
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatINR(product.price)}
                              </div>
                            )}
                          </div>

                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-0.5',
                              isOutOfStock
                                ? 'text-slate-400'
                                : cartItem
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-indigo-600 hover:bg-indigo-50'
                            )}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{cartItem ? 'Add' : 'Add'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Billing Register / Terminal (5 cols on Desktop) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Register Bill</h3>
                <p className="text-[11px] text-slate-500">
                  {cart.length === 0 ? 'No items in bill' : `${cart.length} unique item(s) selected`}
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRegister}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Optional Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <User className="w-3 h-3" /> Customer Name (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> Mobile Number (Opt)
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                <Calculator className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Register is empty</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click any product from the catalog on the left to add items to this counter bill.
                </p>
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatINR(item.unitPrice)} × {item.quantity} = <span className="font-semibold text-slate-700">{formatINR(item.unitPrice * item.quantity)}</span>
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="w-5 h-5 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 font-bold shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-slate-800 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="w-5 h-5 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 font-bold shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Discounts & Taxes Inputs */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                  <span>Discount</span>
                  <button
                    type="button"
                    onClick={() => setDiscountType((d) => (d === 'fixed' ? 'percentage' : 'fixed'))}
                    className="text-indigo-600 hover:underline lowercase font-bold"
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
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">
                    {discountType === 'fixed' ? '₹' : '%'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <span>Tax / GST</span>
                    <span className="text-slate-400 font-normal">({taxRate}%)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalTaxRate(taxRate);
                      setModalGstin(currentBusiness?.settings?.orderSettings?.gstin || currentBusiness?.settings?.gst?.gstin || '');
                      setShowTaxModal(true);
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                    title="Configure & Save Store Default Tax Rate"
                  >
                    <Settings className="w-2.5 h-2.5" />
                    <span>Store Default</span>
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
                        'px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer',
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
                      'px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer',
                      isCustomTax || ![0, 5, 12, 18, 28].includes(taxRate)
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    Custom
                  </button>
                </div>

                {(isCustomTax || ![0, 5, 12, 18, 28].includes(taxRate)) && (
                  <div className="mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <div className="relative flex-1">
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
                    <button
                      type="button"
                      onClick={() => handleSaveStoreTaxRate(taxRate)}
                      disabled={isSavingTax}
                      className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition whitespace-nowrap cursor-pointer"
                      title="Save this rate as store default"
                    >
                      {isSavingTax ? 'Saving...' : 'Set Default'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition',
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
                    'py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition',
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
                    'py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition',
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

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal:</span>
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
                  <span>Tax / GST ({taxRate}%):</span>
                  <span className="font-semibold text-slate-900">+ {formatINR(calculations.taxAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 uppercase">Grand Total:</span>
                <span className="text-lg font-black text-indigo-600">{formatINR(calculations.grandTotal)}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleCreateBill({ viewBillImmediately: true })}
                disabled={isSubmitting || cart.length === 0 || !isGoldPlan}
                className={cn(
                  'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs',
                  !isGoldPlan || cart.length === 0 || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
                    <span>Create & View Bill</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCreateBill({ viewBillImmediately: false })}
                disabled={isSubmitting || cart.length === 0 || !isGoldPlan}
                className={cn(
                  'w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border',
                  !isGoldPlan || cart.length === 0 || isSubmitting
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                )}
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quick Bill & Clear (Next Customer)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: POS SALES HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Search & Stats Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history by bill #, customer name or phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loadingHistory && 'animate-spin')} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Table of Bills */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading sales history...</span>
              </div>
            ) : historyBills.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No POS transactions yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bills created at the counter register will automatically be logged here with complete line items and receipts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Bill #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyBills.map((bill) => {
                      const itemsPreview = bill.items
                        .map((i) => `${i.productName} (x${i.quantity})`)
                        .join(', ');

                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-indigo-600">
                            {bill.billNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatDate(bill.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {bill.customerName ? (
                              <div>
                                <span>{bill.customerName}</span>
                                {bill.customerPhone && (
                                  <span className="text-[10px] text-slate-400 block">{bill.customerPhone}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Walk-in Customer</span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={itemsPreview}>
                            <span className="font-bold text-slate-700 mr-1">
                              {bill.items.reduce((s, i) => s + i.quantity, 0)} items:
                            </span>
                            {itemsPreview}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/60">
                              {bill.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900 text-right whitespace-nowrap">
                            {formatINR(bill.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setActiveModalBill(bill)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Bill</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. VIEW BILL RECEIPT MODAL (On-Screen & PDF Export - No hardware printer required) */}
      {activeModalBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden space-y-0 my-8">
            {/* Modal Top Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Counter Receipt #{activeModalBill.billNumber}
                </span>
              </div>
              <button
                onClick={() => setActiveModalBill(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body (Clean Invoice layout) */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Business Info Header */}
              <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                <h2 className="text-base font-extrabold text-slate-900">
                  {currentBusiness?.name || 'ORDERONE STORE'}
                </h2>
                {currentBusiness?.address && (
                  <p className="text-[11px] text-slate-500">{currentBusiness.address}</p>
                )}
                {currentBusiness?.phone && (
                  <p className="text-[11px] text-slate-500">Contact: {currentBusiness.phone}</p>
                )}
                {(currentBusiness?.settings?.orderSettings?.gstin || currentBusiness?.settings?.gst?.gstin) && (
                  <p className="text-[11px] font-semibold text-slate-600">
                    GSTIN: {currentBusiness?.settings?.orderSettings?.gstin || currentBusiness?.settings?.gst?.gstin}
                  </p>
                )}
              </div>

              {/* Bill Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block">Bill Number</span>
                  <span className="font-bold text-slate-800">{activeModalBill.billNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date & Time</span>
                  <span className="font-bold text-slate-800">{formatDate(activeModalBill.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer</span>
                  <span className="font-bold text-slate-800">
                    {activeModalBill.customerName || 'Walk-in Customer'}
                    {activeModalBill.customerPhone ? ` (${activeModalBill.customerPhone})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Mode</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {activeModalBill.paymentMethod} (PAID)
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                  {activeModalBill.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 py-2 text-xs">
                      <span className="col-span-6 font-semibold text-slate-800 truncate pr-1">
                        {item.productName}
                      </span>
                      <span className="col-span-2 text-right text-slate-500">
                        {formatINR(item.unitPrice)}
                      </span>
                      <span className="col-span-2 text-center font-bold text-slate-700">
                        {item.quantity}
                      </span>
                      <span className="col-span-2 text-right font-extrabold text-slate-900">
                        {formatINR(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatINR(activeModalBill.subtotal)}</span>
                </div>
                {activeModalBill.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>
                      Discount {activeModalBill.discountType === 'percentage' ? `(${activeModalBill.discountRate}%)` : ''}:
                    </span>
                    <span className="font-bold">- {formatINR(activeModalBill.discountAmount)}</span>
                  </div>
                )}
                {activeModalBill.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax / GST ({activeModalBill.taxRate}%):</span>
                    <span className="font-semibold text-slate-800">+ {formatINR(activeModalBill.taxAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-900 uppercase">Total Amount:</span>
                  <span className="font-black text-indigo-600 text-base">
                    {formatINR(activeModalBill.totalAmount)}
                  </span>
                </div>
              </div>

              {activeModalBill.notes && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                  Note: {activeModalBill.notes}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModalBill(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Close Receipt
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeModalBill)}
                disabled={downloadingPdf}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. STORE TAX & GST CONFIGURATION MODAL */}
      {showTaxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Percent className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Store Tax & GST Settings</h3>
                  <p className="text-[11px] text-slate-500">Configure default tax for counter bills</p>
                </div>
              </div>
              <button
                onClick={() => setShowTaxModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default GST / Tax Rate (%)
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[0, 5, 12, 18, 28].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setModalTaxRate(r)}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer',
                        modalTaxRate === r
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={modalTaxRate}
                    onChange={(e) => setModalTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Or enter custom %"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store GSTIN / Tax ID <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={modalGstin}
                  onChange={(e) => setModalGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Printed automatically on counter bills and downloaded receipts.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTaxModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingTax}
                onClick={() => handleSaveStoreTaxRate(modalTaxRate, modalGstin)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingTax ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Store Default</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
