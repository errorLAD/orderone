'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Edit2,
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
import { Product, PosBill, Category, ProductVariant } from '@/types';
import { downloadPosBillPdf } from '@/lib/posPdfGenerator';
import { PosCategoryBar } from '@/components/dashboard/PosCategoryBar';
import {
  PosProductEntryModal,
  PosProductEntryData,
} from '@/components/dashboard/PosProductEntryModal';
import {
  PosBillingRegister,
  CartItem,
} from '@/components/dashboard/PosBillingRegister';
import { PosMobileBottomBar } from '@/components/dashboard/PosMobileBottomBar';

export default function PosBillingPage() {
  const { currentBusiness, currentRole, setCurrentBusiness } = useApp();

  // Entitlement Check: POS is included in Basic, Gold, and Diamond plans
  const isSubscriptionExpired =
    currentBusiness?.subscription?.status === 'expired' ||
    currentBusiness?.subscription?.status === 'suspended';

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [notes, setNotes] = useState('');

  // Mobile Billing Drawer & Product Entry Bottom Sheet State
  const [isMobileBillOpen, setIsMobileBillOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryProduct, setEntryProduct] = useState<Product | null>(null);
  const [entryVariant, setEntryVariant] = useState<ProductVariant | undefined>(undefined);
  const [entryQuantity, setEntryQuantity] = useState<number>(1);
  const [entryUnitPrice, setEntryUnitPrice] = useState<number | undefined>(undefined);
  const [entryUnit, setEntryUnit] = useState<string | undefined>(undefined);
  const [isEntryExisting, setIsEntryExisting] = useState(false);

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

  // Open Product Entry Modal / Bottom Sheet
  const handleOpenProductEntry = (product: Product, variant?: ProductVariant) => {
    const targetVariant =
      variant || (product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
    const existingItem = cart.find(
      (c) => c.product.id === product.id && c.selectedVariant?.id === targetVariant?.id
    );

    setEntryProduct(product);
    setEntryVariant(targetVariant);
    if (existingItem) {
      setEntryQuantity(existingItem.quantity);
      setEntryUnitPrice(existingItem.unitPrice);
      setEntryUnit(existingItem.unit || targetVariant?.unit || product.unit || 'pcs');
      setIsEntryExisting(true);
    } else {
      setEntryQuantity(1);
      setEntryUnitPrice(
        targetVariant ? targetVariant.price : (product.salePrice ?? product.price ?? 0)
      );
      setEntryUnit(targetVariant?.unit || product.unit || 'pcs');
      setIsEntryExisting(false);
    }
    setEntryModalOpen(true);
  };

  // Save from Product Entry Modal / Bottom Sheet
  const handleSaveProductEntry = (data: PosProductEntryData) => {
    const { product, variant, unitPrice, quantity, unit, size } = data;
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant?.id === variant?.id
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex] = {
          product,
          quantity,
          unitPrice,
          selectedVariant: variant,
          unit,
          size,
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            unitPrice,
            selectedVariant: variant,
            unit,
            size,
          },
        ];
      }
    });
    setEntryModalOpen(false);
    setErrorMessage(null);
  };

  // Edit an existing cart item from the register
  const handleEditCartItem = (cartItem: CartItem) => {
    setEntryProduct(cartItem.product);
    setEntryVariant(cartItem.selectedVariant);
    setEntryQuantity(cartItem.quantity);
    setEntryUnitPrice(cartItem.unitPrice);
    setEntryUnit(cartItem.unit || cartItem.selectedVariant?.unit || cartItem.product.unit || 'pcs');
    setIsEntryExisting(true);
    setEntryModalOpen(true);
  };

  // Cart Operations
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    const variantId = variant?.id;
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant?.id === variantId
      );
      const targetPrice = variant ? variant.price : (product.salePrice ?? product.price);
      const targetUnit = variant?.unit || product.unit || 'pcs';
      const availableStock = variant && typeof variant.stockQuantity === 'number'
        ? variant.stockQuantity
        : product.stockQuantity;

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (typeof availableStock === 'number' && existing.quantity + 1 > availableStock) {
          setErrorMessage(
            `Only ${availableStock} unit(s) available in stock for "${product.name}${
              variant ? ` (${variant.name})` : ''
            }".`
          );
          return prev;
        }
        const copy = [...prev];
        copy[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
        return copy;
      } else {
        if (typeof availableStock === 'number' && availableStock <= 0) {
          setErrorMessage(
            `"${product.name}${variant ? ` (${variant.name})` : ''}" is currently out of stock.`
          );
          return prev;
        }
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: targetPrice,
            selectedVariant: variant,
            unit: targetUnit,
            size: variant?.size || variant?.name || product.size,
          },
        ];
      }
    });
    setErrorMessage(null);
  };

  const handleUpdateQuantity = (productId: string, delta: number, variantId?: string) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.selectedVariant?.id === variantId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const availableStock =
              item.selectedVariant && typeof item.selectedVariant.stockQuantity === 'number'
                ? item.selectedVariant.stockQuantity
                : item.product.stockQuantity;

            if (typeof availableStock === 'number' && newQty > availableStock) {
              setErrorMessage(
                `Only ${availableStock} unit(s) available for "${item.product.name}${
                  item.selectedVariant ? ` (${item.selectedVariant.name})` : ''
                }".`
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

  const handleRemoveItem = (productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedVariant?.id === variantId)
      )
    );
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
    if (isSubscriptionExpired) {
      setErrorMessage('Your business subscription has expired. Please renew your plan to create counter bills.');
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
          productName: item.selectedVariant
            ? `${item.product.name} (${item.selectedVariant.name})`
            : item.product.size
            ? `${item.product.name} (${item.product.size})`
            : item.product.name,
          variantId: item.selectedVariant?.id,
          variantName: item.selectedVariant?.name,
          size: item.size || item.selectedVariant?.size || item.product.size,
          unit: item.unit || item.selectedVariant?.unit || item.product.unit,
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
      setIsMobileBillOpen(false);

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
    <div className="space-y-3.5 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* 1. Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                POS / Counter Billing
              </h1>
              <span
                className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                  !isSubscriptionExpired
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                )}
              >
                {!isSubscriptionExpired ? '✓ Basic Plan Entitlement Active' : 'Subscription Expired'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              High-speed walk-in counter sales with instant tax calculation, receipts & PDF exports.
            </p>
          </div>
        </div>

        {/* View Toggle Tabs + Store Tax Quick Shortcut */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick GST Tax Setting Button */}
          <button
            type="button"
            onClick={() => {
              setModalTaxRate(taxRate);
              setShowTaxModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Configure Store Tax / GST Rate"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tax: {taxRate}%</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('register')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              <span>Register</span>
              {cart.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold ml-0.5">
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>History</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Subscription Status Alert (Only if subscription is expired) */}
      {isSubscriptionExpired && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-rose-50/70 to-orange-50 border border-rose-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-rose-200 text-rose-900">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                Business Subscription Expired
              </h2>
            </div>
            <p className="text-[11px] text-rose-800 max-w-2xl">
              Your business subscription has expired. Please renew your plan to continue creating walk-in counter bills.
            </p>
          </div>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm shrink-0"
          >
            <span>Renew Subscription</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Success / Error Alerts */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 animate-fadeIn">
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
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-800">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Product Catalog Picker (12 cols on mobile, 7 cols on Desktop) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Unified Compact Search & Categories Bar */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Compact Category Navigation Bar */}
              <PosCategoryBar
                categories={categories}
                products={products}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[660px] overflow-y-auto pr-1">
                {filteredProducts.map((product) => {
                  const productInCartCount = cart
                    .filter((c) => c.product.id === product.id)
                    .reduce((sum, c) => sum + c.quantity, 0);
                  const hasVariants = Boolean(product.variants && product.variants.length > 0);
                  const isOutOfStock = hasVariants
                    ? product.variants!.every((v) => typeof v.stockQuantity === 'number' && v.stockQuantity <= 0)
                    : typeof product.stockQuantity === 'number' && product.stockQuantity <= 0;
                  const isLowStock =
                    !hasVariants &&
                    typeof product.stockQuantity === 'number' &&
                    product.stockQuantity > 0 &&
                    product.stockQuantity <= (product.lowStockThreshold || 5);
                  const price = product.salePrice ?? product.price;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (isOutOfStock) return;
                        const defaultVariant =
                          product.variants && product.variants.length > 0 ? product.variants[0] : undefined;
                        handleAddToCart(product, defaultVariant);
                      }}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition flex flex-col justify-between relative select-none group',
                        isOutOfStock
                          ? 'opacity-65 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : productInCartCount > 0
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20 cursor-pointer active:scale-[0.98]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer active:scale-[0.98]'
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
                        {productInCartCount > 0 && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-md ring-2 ring-white flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>{productInCartCount} in bill</span>
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
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {product.size && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-bold text-[9px] border border-amber-200/80">
                                {product.size}
                              </span>
                            )}
                            {product.unit && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                per {product.unit}
                              </span>
                            )}
                            {product.brand && (
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                • {product.brand}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Variants / Sizes Quick Chips */}
                        {hasVariants && (
                          <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-1">
                            {product.variants!.map((v) => {
                              const vInCart = cart.find(
                                (c) => c.product.id === product.id && c.selectedVariant?.id === v.id
                              );
                              const vOutOfStock = typeof v.stockQuantity === 'number' && v.stockQuantity <= 0;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  disabled={vOutOfStock}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!vOutOfStock) handleAddToCart(product, v);
                                  }}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer active:scale-95',
                                    vOutOfStock
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                      : vInCart
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/70'
                                  )}
                                  title={vOutOfStock ? 'Out of stock' : `Add ${v.name} (${formatINR(v.price)})`}
                                >
                                  <span>{v.name}</span>
                                  <span className="opacity-80 font-normal">({formatINR(v.price)})</span>
                                  {vInCart && <span className="font-black">×{vInCart.quantity}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}

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

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductEntry(product);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer opacity-70 hover:opacity-100"
                              title="Custom price / quantity keypad"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer active:scale-95 select-none',
                                isOutOfStock
                                  ? 'text-slate-400'
                                  : productInCartCount > 0
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                              )}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{productInCartCount > 0 ? `${productInCartCount} in bill` : 'Add'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Billing Register / Terminal (5 cols on Desktop, hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-5">
            <PosBillingRegister
              cart={cart}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              isCustomTax={isCustomTax}
              setIsCustomTax={setIsCustomTax}
              onOpenTaxModal={() => {
                setModalTaxRate(taxRate);
                setShowTaxModal(true);
              }}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              notes={notes}
              setNotes={setNotes}
              calculations={calculations}
              isSubmitting={isSubmitting}
              isSubscriptionExpired={isSubscriptionExpired}
              handleCreateBill={handleCreateBill}
              handleClearRegister={handleClearRegister}
              handleUpdateQuantity={handleUpdateQuantity}
              handleRemoveItem={handleRemoveItem}
              onEditItem={handleEditCartItem}
              isMobileDrawer={false}
            />
          </div>
        </div>
      )}

      {/* Mobile Sticky Running Total & Checkout Bar */}
      {activeTab === 'register' && (
        <PosMobileBottomBar
          cart={cart}
          grandTotal={calculations.grandTotal}
          onViewBill={() => setIsMobileBillOpen(true)}
        />
      )}

      {/* Mobile Full Bill Drawer / Bottom Sheet */}
      {isMobileBillOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn"
          onClick={() => setIsMobileBillOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl max-h-[92vh] w-full flex flex-col overflow-hidden shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
            <div className="overflow-y-auto flex-1">
              <PosBillingRegister
                cart={cart}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                taxRate={taxRate}
                setTaxRate={setTaxRate}
                isCustomTax={isCustomTax}
                setIsCustomTax={setIsCustomTax}
                onOpenTaxModal={() => {
                  setModalTaxRate(taxRate);
                  setShowTaxModal(true);
                }}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                notes={notes}
                setNotes={setNotes}
                calculations={calculations}
                isSubmitting={isSubmitting}
                isSubscriptionExpired={isSubscriptionExpired}
                handleCreateBill={handleCreateBill}
                handleClearRegister={handleClearRegister}
                handleUpdateQuantity={handleUpdateQuantity}
                handleRemoveItem={handleRemoveItem}
                onEditItem={handleEditCartItem}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setIsMobileBillOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Entry Compact Popup / Bottom Sheet */}
      <PosProductEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        product={entryProduct}
        initialVariant={entryVariant}
        initialQuantity={entryQuantity}
        initialUnitPrice={entryUnitPrice}
        initialUnit={entryUnit}
        isExistingInCart={isEntryExisting}
        onSave={handleSaveProductEntry}
        onRemove={handleRemoveItem}
      />

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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition cursor-pointer"
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
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Close Receipt
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeModalBill)}
                disabled={downloadingPdf}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
