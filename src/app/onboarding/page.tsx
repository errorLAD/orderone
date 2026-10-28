'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Package,
  Layers,
  QrCode,
  ExternalLink,
  Download,
  Copy,
  Check,
  Plus,
  Clock,
  Truck,
  UtensilsCrossed,
  Store,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Wrench,
  Boxes,
  Edit2,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '@/context/AppContext';
import { getCategoryConfig, normalizeCategoryKey, BUSINESS_CATEGORIES } from '@/lib/categories';
import { BusinessType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const router = useRouter();
  const { currentBusiness, setCurrentBusiness, refreshBusinesses, isLoadingAuth, currentUser } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCategorySwitcher, setShowCategorySwitcher] = useState(false);

  // Business setup state for users without a linked business
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState<BusinessType>('hardware');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizAddress, setNewBizAddress] = useState('');
  const [isCreatingBiz, setIsCreatingBiz] = useState(false);
  const [createBizError, setCreateBizError] = useState<string | null>(null);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBizError(null);
    if (!newBizName.trim()) {
      setCreateBizError('Please enter your business or store name');
      return;
    }
    setIsCreatingBiz(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBizName.trim(),
          type: newBizType,
          phone: newBizPhone.trim() || '+91 98765 43210',
          address: newBizAddress.trim() || 'India',
        }),
      });
      const data = await res.json();
      if (data.success && data.business) {
        setCurrentBusiness(data.business);
        if (typeof window !== 'undefined') {
          localStorage.setItem('orderone_active_biz_id', data.business.id);
        }
        await refreshBusinesses();
      } else {
        setCreateBizError(data.error || 'Failed to create business');
      }
    } catch (err: any) {
      setCreateBizError(err.message || 'Connection error');
    } finally {
      setIsCreatingBiz(false);
    }
  };

  // Directly fetch & synchronize the authenticated business from the server
  useEffect(() => {
    async function syncActiveBusiness() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setCurrentBusiness(data.business);
            if (typeof window !== 'undefined') {
              localStorage.setItem('orderone_active_biz_id', data.business.id);
            }
          }
        }
      } catch (err) {
        console.error('Error synchronizing active business:', err);
      }
    }
    syncActiveBusiness();
  }, []);

  // Category Configuration based on active business
  const currentCategoryKey = normalizeCategoryKey(currentBusiness?.type);
  const categoryConfig = getCategoryConfig(currentCategoryKey);
  const isFoodCategory = categoryConfig.primaryModule === 'menu';

  // Step 1: Starter Catalog Selection State (OPTIONAL - user explicitly chooses)
  const [selectedStarterIndexes, setSelectedStarterIndexes] = useState<number[]>([]);

  // Step 1: Custom Product / Material Form State (Store Flow)
  const [customProdName, setCustomProdName] = useState('');
  const [customProdBrand, setCustomProdBrand] = useState('');
  const [customProdCategory, setCustomProdCategory] = useState(categoryConfig.starterCategories[0] || 'General');
  const [customProdUnit, setCustomProdUnit] = useState(categoryConfig.supportedUnits[0] || 'piece');
  const [customProdPrice, setCustomProdPrice] = useState('');
  const [customProdStock, setCustomProdStock] = useState('50');
  const [customProdSku, setCustomProdSku] = useState('');

  // Step 1: Custom Food Menu Item Form State (Menu Flow)
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodCategory, setCustomFoodCategory] = useState(categoryConfig.starterCategories[0] || 'Starters');
  const [customFoodPrice, setCustomFoodPrice] = useState('');
  const [customFoodUnit, setCustomFoodUnit] = useState(categoryConfig.supportedUnits[0] || 'portion');
  const [customFoodIsVeg, setCustomFoodIsVeg] = useState(true);
  const [customFoodDesc, setCustomFoodDesc] = useState('');

  // Step 2: Ordering & Operations Preferences State
  const [enableDelivery, setEnableDelivery] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [enableDineIn, setEnableDineIn] = useState(isFoodCategory);
  const [deliveryFee, setDeliveryFee] = useState('30');
  const [operatingHours, setOperatingHours] = useState('08:00 AM - 09:00 PM (Daily)');
  const [enableGst, setEnableGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [taxRate, setTaxRate] = useState(categoryConfig.id === 'hardware' ? '18' : '5');

  // Reset custom form defaults when business category switches
  useEffect(() => {
    setSelectedStarterIndexes([]);
    setCustomProdCategory(categoryConfig.starterCategories[0] || 'General');
    setCustomProdUnit(categoryConfig.supportedUnits[0] || 'piece');
    setCustomFoodCategory(categoryConfig.starterCategories[0] || 'Main Course');
    setCustomFoodUnit(categoryConfig.supportedUnits[0] || 'portion');
    setEnableDineIn(isFoodCategory);
    setTaxRate(categoryConfig.id === 'hardware' ? '18' : '5');
  }, [categoryConfig.id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const storefrontUrl = currentBusiness
    ? `${origin}/${isFoodCategory ? 'menu' : 'store'}/${currentBusiness.slug}`
    : '';

  // Generate QR Code on Step 3
  useEffect(() => {
    if (storefrontUrl && step === 3) {
      QRCode.toDataURL(storefrontUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: isFoodCategory ? '#c2410c' : '#4338ca',
          light: '#ffffff',
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [storefrontUrl, step, isFoodCategory]);

  // Handle switching category mid-onboarding
  const handleSwitchCategory = async (newCatId: BusinessType) => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBusiness.id,
          type: newCatId,
        }),
      });
      const data = await res.json();
      if (data.success && data.business) {
        setCurrentBusiness(data.business);
        setShowCategorySwitcher(false);
      }
    } catch (e) {
      console.error('Error switching category:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleStarterItem = (idx: number) => {
    if (selectedStarterIndexes.includes(idx)) {
      setSelectedStarterIndexes(selectedStarterIndexes.filter((i) => i !== idx));
    } else {
      setSelectedStarterIndexes([...selectedStarterIndexes, idx]);
    }
  };

  const selectAllStarters = () => {
    setSelectedStarterIndexes(categoryConfig.starterItems.map((_, i) => i));
  };

  const clearAllStarters = () => {
    setSelectedStarterIndexes([]);
  };

  // Handle Save Starter Catalog (Step 1 -> Step 2)
  const handleSaveCatalog = async () => {
    if (!currentBusiness) return;
    setLoading(true);

    try {
      // 1. Get or create category in Supabase
      const catRes = await fetch(`/api/categories?businessId=${currentBusiness.id}&sourceType=${categoryConfig.primaryModule}`);
      const catData = await catRes.json();
      let targetCategoryId = catData.categories?.[0]?.id;

      if (!targetCategoryId) {
        const createCatRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusiness.id,
            sourceType: categoryConfig.primaryModule,
            name: categoryConfig.starterCategories[0] || (isFoodCategory ? 'Specialties' : 'Core Inventory'),
            slug: 'core-catalog',
            sortOrder: 1,
            isActive: true,
          }),
        });
        const newCat = await createCatRes.json();
        targetCategoryId = newCat.category?.id;
      }

      // 2. Prepare items to add
      const itemsToSave: any[] = [];

      // Add only explicitly selected starter items
      for (const idx of selectedStarterIndexes) {
        const item = categoryConfig.starterItems[idx];
        if (item) {
          itemsToSave.push({
            businessId: currentBusiness.id,
            categoryId: targetCategoryId,
            sourceType: categoryConfig.primaryModule,
            name: item.name,
            description: item.description || '',
            price: item.price,
            sku: item.sku,
            brand: item.brand,
            unit: item.unit,
            stockQuantity: item.stockQuantity || 50,
            isAvailable: true,
            dietaryFlags: item.isVegetarian ? { isVegetarian: true } : undefined,
          });
        }
      }

      // Add custom store product if provided
      if (!isFoodCategory && customProdName.trim() && customProdPrice) {
        itemsToSave.push({
          businessId: currentBusiness.id,
          categoryId: targetCategoryId,
          sourceType: 'store',
          name: customProdName.trim(),
          brand: customProdBrand.trim() || undefined,
          unit: customProdUnit,
          price: Number(customProdPrice),
          stockQuantity: Number(customProdStock) || 50,
          sku: customProdSku.trim() || undefined,
          isAvailable: true,
        });
      }

      // Add custom food item if provided
      if (isFoodCategory && customFoodName.trim() && customFoodPrice) {
        itemsToSave.push({
          businessId: currentBusiness.id,
          categoryId: targetCategoryId,
          sourceType: 'menu',
          name: customFoodName.trim(),
          price: Number(customFoodPrice),
          unit: customFoodUnit,
          description: customFoodDesc.trim() || undefined,
          dietaryFlags: { isVegetarian: customFoodIsVeg },
          isAvailable: true,
        });
      }

      // Persist items to Supabase products table
      for (const payload of itemsToSave) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setStep(2);
    } catch (err) {
      console.error('Error saving starter catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Operations & Preferences (Step 2 -> Step 3)
  const handleSavePreferences = async () => {
    if (!currentBusiness) return;
    setLoading(true);

    try {
      await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBusiness.id,
          settings: {
            ...currentBusiness.settings,
            orderSettings: {
              ...currentBusiness.settings.orderSettings,
              enableDelivery,
              deliveryFee: Number(deliveryFee) || 30,
              enableTakeaway,
              enableDineIn: isFoodCategory ? enableDineIn : false,
              operatingHours,
              enableGst,
              gstin: enableGst ? gstin.trim() : undefined,
              taxRatePercentage: enableGst ? Number(taxRate || 0) : 0,
            },
            onboardingCompleted: true,
          },
        }),
      });

      setStep(3);
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    await refreshBusinesses();
    router.push('/dashboard');
  };

  const copyStorefrontLink = () => {
    if (storefrontUrl) {
      navigator.clipboard.writeText(storefrontUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <Sparkles className="w-8 h-8 text-[#4F46E5] animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-700">Loading your business session...</p>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                OrderOne<span className="text-indigo-600">.in</span>
              </span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Setup Your Business Storefront</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Select your business type and enter your details to launch your custom catalog, order tokens, and storefront.
            </p>
          </div>

          <Card className="p-6 sm:p-8 shadow-card border-slate-200">
            <form onSubmit={handleCreateBusiness} className="space-y-6">
              {createBizError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createBizError}</span>
                </div>
              )}

              {/* 1. Business Name */}
              <Input
                label="Store or Business Name *"
                placeholder="e.g. Sri Ram Krishna Traders, Royal Groceries, Chai Junction"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                required
              />

              {/* 2. Business Category Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 tracking-tight">
                  Select Business Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUSINESS_CATEGORIES.map((cat) => {
                    const isSelected = newBizType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewBizType(cat.id)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all duration-150 flex items-start gap-3 relative',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        )}
                      >
                        <span className="text-2xl shrink-0 p-1 bg-white rounded-lg border border-slate-100 shadow-2xs">
                          {cat.icon}
                        </span>
                        <div className="min-w-0 pr-5">
                          <p className="text-xs font-bold text-slate-900 truncate">{cat.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Phone & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact / WhatsApp Mobile *"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value)}
                  required
                />
                <Input
                  label="Store Address / City *"
                  placeholder="e.g. Shop 12, Main Market, Bengaluru"
                  value={newBizAddress}
                  onChange={(e) => setNewBizAddress(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isCreatingBiz}
                className="w-full py-3 text-xs font-bold shadow-md gap-2"
              >
                {isCreatingBiz ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Your Store...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Business & Launch Catalog</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        {/* Top Header Card */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
            <span className="text-xl">{categoryConfig.icon}</span>
            <span className="text-xs font-bold text-slate-900">{categoryConfig.label}</span>
            <button
              type="button"
              onClick={() => setShowCategorySwitcher(!showCategorySwitcher)}
              className="text-[10px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1 ml-1 pl-2 border-l border-slate-200"
            >
              <span>{showCategorySwitcher ? 'Cancel' : 'Change Category'}</span>
              <Edit2 className="w-3 h-3" />
            </button>
          </div>

          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Welcome to {currentBusiness.name}
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
            {categoryConfig.terminology.dashboardSubtitle}
          </p>
        </div>

        {/* Optional Category Switcher Overlay */}
        {showCategorySwitcher && (
          <div className="p-5 bg-white rounded-2xl border-2 border-[#4F46E5] shadow-lg space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Switch Business Category</p>
                <p className="text-[11px] text-slate-500">Select the correct category for {currentBusiness.name} to update all templates.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategorySwitcher(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {BUSINESS_CATEGORIES.map((cat) => {
                const isSelected = categoryConfig.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSwitchCategory(cat.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20',
                      isSelected
                        ? 'bg-[#EEF2FF] border-[#4F46E5] ring-2 ring-[#4F46E5]/20 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    )}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-[11px] font-bold text-slate-800 truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-Step Progress Tracker with Category-Tailored Labels */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 pb-2">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors',
                step >= 1 ? 'bg-[#4F46E5] text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              1
            </span>
            <span className={cn('text-xs font-semibold', step >= 1 ? 'text-slate-900' : 'text-slate-400')}>
              {isFoodCategory ? '1. Starter Menu' : '1. Starter Products'}
            </span>
          </div>
          <div className="w-8 h-px bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors',
                step >= 2 ? 'bg-[#4F46E5] text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              2
            </span>
            <span className={cn('text-xs font-semibold', step >= 2 ? 'text-slate-900' : 'text-slate-400')}>
              {isFoodCategory ? '2. Fulfilment & Operations' : '2. Inventory & Operations'}
            </span>
          </div>
          <div className="w-8 h-px bg-slate-200" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors',
                step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              3
            </span>
            <span className={cn('text-xs font-semibold', step === 3 ? 'text-emerald-700' : 'text-slate-400')}>
              {isFoodCategory ? '3. Launch Menu & QR' : '3. Launch Store & QR'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: STARTER CATALOG (DEDICATED STORE VS FOOD FLOWS) */}
        {/* ========================================================================= */}
        {step === 1 && (
          <Card className="p-6 sm:p-8 border-[#E2E8F0] shadow-card space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{categoryConfig.terminology.step1Title}</span>
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllStarters}
                    className="text-[#4F46E5] font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={clearAllStarters}
                    className="text-slate-500 font-semibold hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {categoryConfig.terminology.step1Subtitle} These templates are optional suggestions — select only the items you provide.
              </p>
            </div>

            {/* A. STORE / HARDWARE / RETAIL PRODUCT STARTER GRID */}
            {!isFoodCategory ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryConfig.starterItems.map((item, idx) => {
                    const isSelected = selectedStarterIndexes.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStarterItem(idx)}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all',
                          isSelected
                            ? 'bg-[#EEF2FF] border-[#4F46E5] ring-1 ring-[#4F46E5]/30 shadow-2xs'
                            : 'bg-white border-[#E2E8F0] hover:bg-slate-50/70'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-colors',
                              isSelected ? 'bg-[#4F46E5] border-[#4F46E5] text-white' : 'border-slate-300 bg-white'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 leading-snug">{item.name}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {item.brand && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {item.brand}
                                </span>
                              )}
                              {item.unit && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] uppercase">
                                  Unit: {item.unit}
                                </span>
                              )}
                              {item.sku && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono text-[9px]">
                                  {item.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Stock: <span className="font-semibold text-slate-700">{item.stockQuantity || 50}</span>
                          </span>
                          <span className="text-xs font-black text-slate-900">₹{item.price}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Store Product Form (Hardware / Retail specific) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 mt-4">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#4F46E5]" />
                    <span>Add Custom {categoryConfig.label} Product (Optional)</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Product / Material Name</label>
                      <input
                        type="text"
                        value={customProdName}
                        onChange={(e) => setCustomProdName(e.target.value)}
                        placeholder={categoryConfig.id === 'hardware' ? 'e.g. UltraTech Super Cement (50kg)' : 'e.g. Premium Cotton Shirt'}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Brand / Maker</label>
                      <input
                        type="text"
                        value={customProdBrand}
                        onChange={(e) => setCustomProdBrand(e.target.value)}
                        placeholder="e.g. UltraTech, Tata"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        value={customProdPrice}
                        onChange={(e) => setCustomProdPrice(e.target.value)}
                        placeholder="380"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit of Measure</label>
                      <select
                        value={customProdUnit}
                        onChange={(e) => setCustomProdUnit(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white capitalize font-medium"
                      >
                        {categoryConfig.supportedUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        value={customProdStock}
                        onChange={(e) => setCustomProdStock(e.target.value)}
                        placeholder="50"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">SKU (Optional)</label>
                      <input
                        type="text"
                        value={customProdSku}
                        onChange={(e) => setCustomProdSku(e.target.value)}
                        placeholder="SKU-001"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* B. FOOD / RESTAURANT / CAFE MENU STARTER GRID */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryConfig.starterItems.map((item, idx) => {
                    const isSelected = selectedStarterIndexes.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStarterItem(idx)}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all',
                          isSelected
                            ? 'bg-[#EEF2FF] border-[#4F46E5] ring-1 ring-[#4F46E5]/30 shadow-2xs'
                            : 'bg-white border-[#E2E8F0] hover:bg-slate-50/70'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-colors',
                              isSelected ? 'bg-[#4F46E5] border-[#4F46E5] text-white' : 'border-slate-300 bg-white'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {item.isVegetarian ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Vegetarian" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" title="Non-Vegetarian" />
                              )}
                              <p className="text-xs font-bold text-slate-900 leading-snug">{item.name}</p>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-semibold border border-orange-200">
                                {item.categoryName}
                              </span>
                              {item.unit && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Chef Recipe</span>
                          <span className="text-xs font-black text-slate-900">₹{item.price}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Food Item Form */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 mt-4">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#4F46E5]" />
                    <span>Add Custom Food / Drink Item (Optional)</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Dish / Drink Name</label>
                      <input
                        type="text"
                        value={customFoodName}
                        onChange={(e) => setCustomFoodName(e.target.value)}
                        placeholder="e.g. Special Paneer Tikka or Cold Brew"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        value={customFoodPrice}
                        onChange={(e) => setCustomFoodPrice(e.target.value)}
                        placeholder="180"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Portion / Serving Unit</label>
                      <select
                        value={customFoodUnit}
                        onChange={(e) => setCustomFoodUnit(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white capitalize"
                      >
                        {categoryConfig.supportedUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="isVeg"
                        checked={customFoodIsVeg}
                        onChange={(e) => setCustomFoodIsVeg(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <label htmlFor="isVeg" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Vegetarian Item
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                {selectedStarterIndexes.length} {isFoodCategory ? 'menu items' : 'products'} selected
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveCatalog}
                isLoading={loading}
                className="text-xs font-bold px-6 py-2.5"
              >
                <span>Save Offerings & Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: OPERATIONS & PREFERENCES */}
        {/* ========================================================================= */}
        {step === 2 && (
          <Card className="p-6 sm:p-8 border-[#E2E8F0] shadow-card space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {categoryConfig.terminology.step2Title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {categoryConfig.terminology.step2Subtitle}
              </p>
            </div>

            <div className="space-y-4">
              {/* Fulfillment toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setEnableTakeaway(!enableTakeaway)}
                  className={cn(
                    'p-3.5 rounded-xl border cursor-pointer transition-all',
                    enableTakeaway ? 'bg-[#EEF2FF] border-[#4F46E5]' : 'bg-white border-slate-200'
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">
                    {isFoodCategory ? 'Counter Takeaway' : 'Counter Billing & Pickup'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isFoodCategory ? 'Takeaway customer orders' : 'In-store collection & pickup'}
                  </p>
                  <span className="text-[10px] font-bold text-[#4F46E5] mt-2 inline-block">
                    {enableTakeaway ? '✓ Active' : 'Disabled'}
                  </span>
                </div>

                <div
                  onClick={() => setEnableDelivery(!enableDelivery)}
                  className={cn(
                    'p-3.5 rounded-xl border cursor-pointer transition-all',
                    enableDelivery ? 'bg-[#EEF2FF] border-[#4F46E5]' : 'bg-white border-slate-200'
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">
                    {categoryConfig.id === 'hardware' ? 'Site / Truck Delivery' : 'Local Delivery'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {categoryConfig.id === 'hardware' ? 'Dispatch to construction site' : 'Doorstep home delivery'}
                  </p>
                  <span className="text-[10px] font-bold text-[#4F46E5] mt-2 inline-block">
                    {enableDelivery ? '✓ Active' : 'Disabled'}
                  </span>
                </div>

                {isFoodCategory ? (
                  <div
                    onClick={() => setEnableDineIn(!enableDineIn)}
                    className={cn(
                      'p-3.5 rounded-xl border cursor-pointer transition-all',
                      enableDineIn ? 'bg-[#EEF2FF] border-[#4F46E5]' : 'bg-white border-slate-200'
                    )}
                  >
                    <p className="text-xs font-bold text-slate-900">
                      {categoryConfig.id === 'hotel' ? 'In-Room Dining' : 'Table Dine-In'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {categoryConfig.id === 'hotel' ? 'QR room standee ordering' : 'QR table code ordering'}
                    </p>
                    <span className="text-[10px] font-bold text-[#4F46E5] mt-2 inline-block">
                      {enableDineIn ? '✓ Active' : 'Disabled'}
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
                    <p className="text-xs font-bold text-slate-800">
                      {categoryConfig.id === 'hardware' ? 'Contractor Bulk Orders' : 'Store Catalog QR'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Direct phone & digital orders</p>
                    <span className="text-[10px] font-bold text-emerald-600 mt-2 inline-block">
                      ✓ Supported
                    </span>
                  </div>
                )}
              </div>

              {/* Operating Hours */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="08:00 AM - 09:00 PM (Daily)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white font-medium"
                />
              </div>

              {/* GST Optional Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">GST Registration (Optional)</p>
                    <p className="text-[11px] text-slate-500">Enable if your business collects GST and issues formal tax invoices.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableGst}
                    onChange={(e) => setEnableGst(e.target.checked)}
                    className="w-4 h-4 text-[#4F46E5] rounded"
                  />
                </div>
                {enableGst && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        placeholder="29AAAAA0000A1Z5"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GST Rate (%)</label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        placeholder={categoryConfig.id === 'hardware' ? '18' : '5'}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs font-bold px-4 py-2.5"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSavePreferences}
                isLoading={loading}
                className="text-xs font-bold px-6 py-2.5"
              >
                <span>Save & Generate QR Code</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: LAUNCH & QR CODE */}
        {/* ========================================================================= */}
        {step === 3 && (
          <Card className="p-6 sm:p-8 border-[#E2E8F0] shadow-card text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {categoryConfig.terminology.step3Title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {categoryConfig.terminology.step3Subtitle}
              </p>
            </div>

            {/* QR Code Card */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-xs mx-auto space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs inline-block">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Storefront QR Code" className="w-52 h-52 mx-auto rounded-lg" />
                ) : (
                  <div className="w-52 h-52 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900">{currentBusiness.name}</p>
                <p className="text-[11px] text-slate-500 capitalize">{categoryConfig.label}</p>
              </div>

              {qrCodeUrl && (
                <a
                  href={qrCodeUrl}
                  download={`qrcode_${currentBusiness.slug}.png`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F46E5] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Printable QR Standee</span>
                </a>
              )}
            </div>

            {/* Public Link Box */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-left">
              <div className="truncate">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {isFoodCategory ? 'Public Dining Menu URL' : 'Public Digital Storefront URL'}
                </p>
                <p className="text-xs font-mono font-semibold text-slate-800 truncate">{storefrontUrl}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={copyStorefrontLink}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors border border-[#4F46E5]/30"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Launch Dashboard Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleFinish}
                className="w-full py-3 text-xs font-bold shadow-md flex items-center justify-center gap-2"
              >
                <span>Open {categoryConfig.label} Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
