'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Table,
  ArrowRight,
  Sparkles,
  X,
  Phone,
  MapPin,
  Flame,
  Clock,
  IndianRupee,
  ExternalLink,
  Lock,
  AlertCircle,
  PauseCircle,
  Store,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { Business, Category, Product, OrderSourceType } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import { StorefrontTicker } from '@/components/storefront/StorefrontTicker';
import { StorefrontRenderer } from '@/components/storefront/StorefrontRenderer';
import { DEFAULT_STOREFRONT_COLORS, getContrastTextColor } from '@/lib/designPresets';
import { calculateOrderTax } from '@/lib/gstCalculator';
import { buildUpiPaymentUri } from '@/lib/upiQr';
import { PostOrderSocialModal } from '@/components/storefront/PostOrderSocialModal';
import { trackConversion } from '@/components/analytics/GoogleAnalytics';
import { getTableRoomLabel } from '@/lib/categories';

export default function PublicMenuPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'spicy' | 'jain'>('all');

  // Cart State (Guest Order)
  const [cart, setCart] = useState<{
    [productId: string]: {
      quantity: number;
      variantId?: string;
      addOnIds?: string[];
      instructions?: string;
    };
  }>({});
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Guest Checkout Form
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [showPhoneField, setShowPhoneField] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [tableOrRoomNumber, setTableOrRoomNumber] = useState<string>('');
  const [guestNotes, setGuestNotes] = useState<string>('');
  const [fulfilmentMethod, setFulfilmentMethod] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('cash');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Check if hotel business
  const isHotel = Boolean(
    business?.type === 'hotel' ||
    business?.category === 'hotel' ||
    roomNumber
  );

  // Dynamic label for Table / Room Number as configured by business owner
  const tableRoomConfig = getTableRoomLabel(
    business?.settings?.orderSettings,
    business?.category || business?.type
  );

  // Read URL query parameters for ?room=... or ?table=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get('room');
      const t = sp.get('table');
      const prefill = (r || t || '').trim();
      if (prefill) {
        setTableOrRoomNumber(prefill);
        setRoomNumber(r ? r.trim() : prefill);
        setTableNumber(t ? t.trim() : prefill);
        setFulfilmentMethod('dine_in');
      }
    }
  }, []);

  // Post-Order Social & Review Modal State
  const [placedOrder, setPlacedOrder] = useState<{ tokenNumber: string; trackingId: string } | null>(null);
  const [showSocialModal, setShowSocialModal] = useState<boolean>(false);

  // Derived simple cart format for StorefrontRenderer (unconditionally declared at top to obey React Hook rules)
  const simpleCart = React.useMemo(() => {
    const result: { [productId: string]: number } = {};
    for (const [k, v] of Object.entries(cart)) {
      result[k] = v.quantity;
    }
    return result;
  }, [cart]);

  const fetchMenuData = async () => {
    try {
      // Single unified API call — replaces 3 sequential fetches
      const sfRes = await fetch(`/api/storefront/${params.slug}?sourceType=menu&channel=storefront`);
      const sfData = await sfRes.json();

      if (sfData.success && sfData.business) {
        const biz: Business = sfData.business;
        setBusiness(biz);

        if (typeof document !== 'undefined') {
          document.title = `${biz.name} | Dining Menu`;
        }

        const bizCategory = (biz.category || biz.type || '').toLowerCase();
        const isFood = ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat'].includes(bizCategory);
        const hasStore = biz.storeEntitlement?.allowed ?? Boolean(biz.settings?.modules?.store ?? !isFood);
        const hasMenu = biz.menuEntitlement?.allowed ?? Boolean(biz.settings?.modules?.menu);

        // Seamless auto-redirect: If this is a retail business without active menu module, forward directly to its retail storefront
        if (!hasMenu && hasStore) {
          router.replace(`/store/${params.slug}`);
          return;
        }

        const catData = { success: true, categories: sfData.categories || [] };
        const prodData = { success: true, products: sfData.products || [] };

        // Fallback: If menu has 0 items but store has items, route to store
        if (
          hasStore &&
          (!catData.categories || catData.categories.length === 0) &&
          (!prodData.products || prodData.products.length === 0)
        ) {
          router.replace(`/store/${params.slug}`);
          return;
        }

        if (catData.success) {
          setCategories((catData.categories || []).filter((c: Category) => c.salesChannel !== 'pos'));
        }
        if (prodData.success) {
          setProducts((prodData.products || []).filter((p: Product) => p.isAvailable && p.salesChannel !== 'pos'));
        }
      }
    } catch (e) {
      console.error('Error fetching menu storefront:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
    // Poll every 30 s — frequent enough to reflect menu changes, light enough on Supabase
    const interval = setInterval(fetchMenuData, 30000);
    return () => clearInterval(interval);
  }, [params.slug]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId]?.quantity || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          quantity: next,
          variantId: prev[productId]?.variantId,
          addOnIds: prev[productId]?.addOnIds,
        },
      };
    });
  };

  const cartItems = Object.entries(cart)
    .map(([prodId, details]) => {
      const product = products.find((p) => p.id === prodId);
      if (!product) return null;
      let unitPrice = product.price;
      if (details.variantId && product.variants) {
        const v = product.variants.find((vr) => vr.id === details.variantId);
        if (v) unitPrice = v.price;
      }
      return {
        product,
        quantity: details.quantity,
        unitPrice,
        itemTotal: unitPrice * details.quantity,
      };
    })
    .filter(Boolean) as { product: Product; quantity: number; unitPrice: number; itemTotal: number }[];

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const isGoldPlan = Boolean(
    business?.subscription?.planId === 'plan_gold' ||
    business?.subscription?.planId === 'plan_diamond'
  );

  const gstSettings = business?.settings?.gst || (business?.settings?.orderSettings?.enableGst && business?.settings?.orderSettings?.gstin ? {
    isGstRegistered: true,
    gstin: business.settings.orderSettings.gstin,
    legalBusinessName: business.name,
    registeredAddress: business.address,
    defaultGstRate: business.settings.orderSettings.taxRatePercentage || 0,
    pricesIncludeGst: false,
    invoicePrefix: 'INV-',
  } : undefined);

  const taxCalculation = calculateOrderTax({
    subtotal: cartSubtotal,
    deliveryFee: 0,
    gstSettings,
    isGoldSubscriber: isGoldPlan,
  });

  const tax = taxCalculation.totalTax;
  const cartTotal = taxCalculation.finalTotal;
  const hasGst = taxCalculation.isGstApplicable;
  const cartCount = Object.values(cart).reduce((a, b) => a + b.quantity, 0);
  const upiSettings = (business?.settings as any)?.upiSettings;

  // Submit Menu Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const isStoreOpen = business.isStoreOpen ?? business.settings?.isStoreOpen ?? true;
    const onlineOrderingEnabled =
      business.onlineOrderingEnabled ?? business.settings?.onlineOrderingEnabled ?? true;

    if (!isStoreOpen && !onlineOrderingEnabled) {
      setOrderError('This restaurant is currently closed and online ordering is unavailable.');
      return;
    }
    if (!isStoreOpen) {
      setOrderError('This restaurant is currently closed. Please visit again later.');
      return;
    }
    if (!onlineOrderingEnabled) {
      setOrderError('Online ordering is currently unavailable for this restaurant.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    const items = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      variantId: cart[item.product.id]?.variantId,
      addOnIds: cart[item.product.id]?.addOnIds,
    }));

    // Optional Table / Room Number
    const finalTableRoom = (tableOrRoomNumber || roomNumber || tableNumber).trim() || undefined;

    const orderPayload = {
      businessId: business.id,
      sourceType: 'menu' as const, // STRICTLY MENU ORDER
      customer: {
        name: guestName.trim() || 'Guest Customer',
        phone: guestPhone.trim() || undefined,
        tableNumber: finalTableRoom,
        roomNumber: finalTableRoom,
        notes: guestNotes,
      },
      items,
      fulfilmentMethod,
      paymentMethod,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to place food order');
      }

      // Track purchase conversion for Google Analytics & marketing attribution
      trackConversion('purchase', {
        transaction_id: data.order?.id || data.order?.tokenNumber,
        value: cartTotal,
        currency: 'INR',
        items_count: cartItems.length,
        business_slug: params.slug,
        order_source: 'menu',
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Clear cart and close checkout modal
      setCart({});
      setIsCheckingOut(false);
      setIsCartOpen(false);

      const hasGoogle = Boolean(
        business.settings?.socialLinks?.googleBusiness?.trim() &&
        business.settings?.socialLinks?.googleBusinessEnabled !== false
      );
      const hasInstagram = Boolean(
        business.settings?.socialLinks?.instagram?.trim() &&
        business.settings?.socialLinks?.instagramEnabled !== false
      );

      // Only show popup if store owner has configured Google Review or Instagram URL
      if (hasGoogle || hasInstagram) {
        setPlacedOrder({
          tokenNumber: data.order.tokenNumber,
          trackingId: data.order.trackingId,
        });
        setShowSocialModal(true);
      } else {
        // If neither link is configured, proceed directly without interrupting order confirmation
        router.push(`/track/${data.order.trackingId}`);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Something went wrong');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
    if (dietaryFilter === 'veg' && !p.dietaryFlags?.isVeg) return false;
    if (dietaryFilter === 'spicy' && !p.dietaryFlags?.isSpicy) return false;
    if (dietaryFilter === 'jain' && !p.dietaryFlags?.isJain) return false;
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50/30 flex flex-col items-center justify-center p-6 text-center">
        <UtensilsCrossed className="w-10 h-10 text-orange-600 animate-bounce mb-3" />
        <h2 className="text-base font-bold text-slate-800">Opening Digital Food Menu...</h2>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <UtensilsCrossed className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-black text-slate-800">Menu Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested menu identifier could not be located.
        </p>
      </div>
    );
  }

  const bizCategory = (business.category || business.type || '').toLowerCase();
  const isFoodCategory = ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat'].includes(bizCategory);
  const hasMenuAccess =
    business.menuEntitlement?.allowed ??
    Boolean(business.settings?.modules?.menu || isFoodCategory);

  if (!hasMenuAccess) {
    const isRetail = !isFoodCategory;
    const hasStoreModule = business.storeEntitlement?.allowed ?? Boolean(business.settings?.modules?.store ?? isRetail);

    if (hasStoreModule) {
      return (
        <div className="min-h-screen bg-sky-50/40 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-sky-200/80 p-8 shadow-xs flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 animate-pulse" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 mb-2">
              Retail Store & Catalog
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              {business.name || 'Store'} Online Storefront
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              This establishment operates an online retail storefront for product browsing and counter orders.
            </p>
            <Link
              href={`/store/${params.slug}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <Store className="w-4 h-4" />
              <span>Open Online Storefront & Catalog</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <UtensilsCrossed className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-black text-slate-800">Food Menu Not Available</h2>
        <p className="text-xs text-slate-500 mt-1">
          This business does not have the food menu module active under their subscription.
        </p>
      </div>
    );
  }

  const isStoreOpen = business?.isStoreOpen ?? business?.settings?.isStoreOpen ?? true;
  const onlineOrderingEnabled =
    business?.onlineOrderingEnabled ?? business?.settings?.onlineOrderingEnabled ?? true;
  const canAcceptOnlineOrders = isStoreOpen && onlineOrderingEnabled;

  const designSettings = business?.settings?.storefrontDesign;
  const activeTemplate = designSettings?.templateId || 'classic';
  const activeColors = designSettings?.colors || DEFAULT_STOREFRONT_COLORS;
  const activeCover = business?.coverImageUrl || business?.settings?.coverImageUrl || designSettings?.coverImageUrl;
  const buttonTextColor = getContrastTextColor(activeColors.button);

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors"
      style={{ backgroundColor: activeColors.background, color: activeColors.text }}
    >
      {/* Table / Room Indicator Banner */}
      {(tableOrRoomNumber || isHotel) && (
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-base">{isHotel ? '🏨' : '🍽️'}</span>
            <span>
              {tableOrRoomNumber ? (
                <>Delivering to <strong className="font-extrabold underline decoration-white/60">{tableRoomConfig.label}: {tableOrRoomNumber}</strong></>
              ) : (
                <>{isHotel ? 'Hotel In-Room Dining & Room Service' : 'Table Dine-In & Ordering'}</>
              )}
            </span>
          </div>
          <button
            onClick={() => {
              const next = prompt(`Enter ${tableRoomConfig.label} (or leave empty to clear):`, tableOrRoomNumber || '');
              if (next !== null) {
                setTableOrRoomNumber(next.trim());
                setRoomNumber(next.trim());
                setTableNumber(next.trim());
              }
            }}
            className="text-[11px] bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-md text-white font-bold transition-colors"
          >
            {tableOrRoomNumber ? 'Change' : `Set ${tableRoomConfig.label}`}
          </button>
        </div>
      )}

      <StorefrontRenderer
        business={business}
        products={products}
        categories={categories}
        templateId={activeTemplate}
        colors={activeColors}
        coverImageUrl={activeCover}
        cart={simpleCart}
        onUpdateQuantity={updateQuantity}
        onOpenCart={() => setIsCartOpen(true)}
        isRestaurant={true}
        selectedCat={selectedCat}
        onSelectCat={setSelectedCat}
        search={search}
        onSearchChange={setSearch}
        dietaryFilter={dietaryFilter}
        onDietaryFilterChange={setDietaryFilter}
      />



      {/* Floating Bottom Bar */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto bottom-safe">
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              backgroundColor: activeColors.button,
              color: buttonTextColor,
            }}
            className="w-full p-3.5 rounded-2xl shadow-xl flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  backgroundColor: buttonTextColor,
                  color: activeColors.button,
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
              >
                {cartCount}
              </span>
              <span className="font-bold text-xs">View Food Order</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span>{formatINR(cartTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Slide-over Cart / Guest Dining Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">
                  {isCheckingOut ? 'Kitchen Guest Checkout' : `Your Food Order (${cartCount} items)`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckingOut(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderError && (
              <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {orderError}
              </div>
            )}

            {!isCheckingOut ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cartItems.map(({ product, quantity, itemTotal }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{product.name}</p>
                        <p className="text-[10px] text-slate-500">{formatINR(product.price)} each</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 font-bold">
                          <button onClick={() => updateQuantity(product.id, -1)} className="px-1 text-slate-500">
                            -
                          </button>
                          <span>{quantity}</span>
                          <button onClick={() => updateQuantity(product.id, 1)} className="px-1 text-slate-500">
                            +
                          </button>
                        </div>
                        <span className="font-black text-slate-900 w-14 text-right">
                          {formatINR(itemTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-2 text-xs pb-safe">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatINR(cartSubtotal)}</span>
                  </div>
                  {hasGst && tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <div>
                        <span>GST ({business.settings.orderSettings.taxRatePercentage}%):</span>
                        {business.settings.orderSettings.gstin && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            GSTIN: {business.settings.orderSettings.gstin}
                          </span>
                        )}
                      </div>
                      <span>{formatINR(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                    <span>Total Bill:</span>
                    <span>{formatINR(cartTotal)}</span>
                  </div>

                  {!canAcceptOnlineOrders && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-1.5 mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        {!isStoreOpen
                          ? 'This restaurant is currently closed. Please visit again later.'
                          : 'Online ordering is currently unavailable.'}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setIsCheckingOut(true)}
                    disabled={!canAcceptOnlineOrders}
                    style={
                      canAcceptOnlineOrders
                        ? { backgroundColor: activeColors.button, color: buttonTextColor }
                        : undefined
                    }
                    className={cn(
                      'w-full mt-3 py-3 rounded-xl font-bold text-xs shadow-md transition-all',
                      canAcceptOnlineOrders
                        ? 'hover:opacity-90 cursor-pointer active:scale-98'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {!isStoreOpen
                      ? 'Restaurant Closed · Ordering Unavailable'
                      : !onlineOrderingEnabled
                      ? 'Online Ordering Paused'
                      : 'Proceed to Table / Dining Checkout'}
                  </button>
                </div>
              </div>
            ) : (
              /* GUEST DINING CHECKOUT */
              <form onSubmit={handlePlaceOrder} className="flex-1 flex flex-col min-h-0 text-xs">
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200 text-orange-900 text-[11px] font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-orange-600" />
                    <span>Instant Kitchen Token generation. No registration required!</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sundaram (or leave blank)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Mobile Phone (Optional & Hidden by default) */}
                  {showPhoneField ? (
                    <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 text-xs">
                          Mobile Phone (for Token SMS) <span className="font-normal text-slate-500">(Optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhoneField(false);
                            setGuestPhone('');
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          ✕ Hide
                        </button>
                      </div>
                      <input
                        type="tel"
                        placeholder="e.g. 9123456789"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Optional: Token status is tracked live on your screen and the public TV display.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPhoneField(true)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 py-1"
                      >
                        <span>+ Add Mobile Phone for SMS Status (Optional)</span>
                      </button>
                    </div>
                  )}

                  {/* Dining / Fulfilment Option */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      {isHotel ? 'Service Option' : 'Dining Option'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfilmentMethod('dine_in')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5',
                          fulfilmentMethod === 'dine_in'
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <span>{isHotel ? '🛏️ In-Room Delivery' : '🍽️ Dine-In'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfilmentMethod('takeaway')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left font-bold transition-all text-xs flex items-center gap-1.5',
                          fulfilmentMethod === 'takeaway'
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <span>🥡 Takeaway / Pickup</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional Table / Room Number Field */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 text-xs">
                        {tableRoomConfig.fieldLabel}
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={tableOrRoomNumber}
                      onChange={(e) => {
                        setTableOrRoomNumber(e.target.value);
                        setRoomNumber(e.target.value);
                        setTableNumber(e.target.value);
                      }}
                      placeholder={tableRoomConfig.placeholder}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {isHotel
                        ? 'Enter your hotel room number (or leave blank if picking up from counter).'
                        : 'Enter your table or room number (leave blank for takeaway or if not applicable).'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cooking Instructions (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Less spicy, make dosa extra crisp, separate chutney..."
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={cn(
                          'p-2.5 rounded-lg border text-left font-bold transition-all',
                          paymentMethod === 'upi'
                            ? 'bg-orange-50 border-orange-500 text-orange-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        )}
                      >
                        📱 Pay via UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={cn(
                          'p-2.5 rounded-lg border text-left font-bold transition-all',
                          paymentMethod === 'cash'
                            ? 'bg-orange-50 border-orange-500 text-orange-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        )}
                      >
                        💵 Pay at Counter
                      </button>
                    </div>

                    {paymentMethod === 'upi' && (
                      <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                        {isGoldPlan && upiSettings?.isEnabled && upiSettings?.upiId ? (
                          <>
                            <div className="text-[11px] font-bold text-slate-800">
                              Scan & Pay {formatINR(cartTotal)} to {upiSettings.payeeName || business.name}
                            </div>
                            <div className="w-36 h-36 mx-auto bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                              <img
                                src={
                                  upiSettings.qrImageUrl ||
                                  `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                                    buildUpiPaymentUri({
                                      upiId: upiSettings.upiId,
                                      payeeName: upiSettings.payeeName || business.name,
                                      amount: cartTotal,
                                      orderReference: `Dining Order - ${business.name}`,
                                      transactionNote: `Dining Order - ${business.name}`,
                                    })
                                  )}`
                                }
                                alt="Menu Dining UPI QR"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <p className="font-mono text-xs font-bold text-slate-900">{upiSettings.upiId}</p>
                            {upiSettings.instructions && (
                              <p className="text-[10px] text-slate-600 bg-white p-1.5 rounded border border-slate-200 text-left">
                                Note: {upiSettings.instructions}
                              </p>
                            )}
                            <p className="text-[10px] text-amber-800 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                              Payment status will be verified by the counter staff upon order collection. Token generated immediately.
                            </p>
                          </>
                        ) : (
                          <div className="text-left text-[11px] text-slate-600 space-y-1">
                            <p className="font-semibold text-slate-800">Direct UPI Scan</p>
                            <p className="text-[10px] text-slate-500">
                              Pay at the billing counter via the restaurant UPI QR standee after your meal or upon token collection.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2 pb-safe">
                  <div className="flex justify-between font-black text-sm text-slate-900">
                    <span>Total Bill:</span>
                    <span>{formatINR(cartTotal)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="px-3 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingOrder || !canAcceptOnlineOrders}
                      style={
                        canAcceptOnlineOrders && !submittingOrder
                          ? { backgroundColor: activeColors.button, color: buttonTextColor }
                          : undefined
                      }
                      className={cn(
                        'flex-1 py-3 rounded-xl font-black shadow-md flex items-center justify-center gap-1.5 transition-all',
                        canAcceptOnlineOrders && !submittingOrder
                          ? 'hover:opacity-90 cursor-pointer active:scale-98'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      )}
                    >
                      {submittingOrder
                        ? 'Sending to Kitchen...'
                        : !isStoreOpen
                        ? 'Restaurant Closed · Ordering Unavailable'
                        : !onlineOrderingEnabled
                        ? 'Online Ordering Paused'
                        : `Send to Kitchen (${formatINR(cartTotal)})`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post-Order Social & Review Modal */}
      {placedOrder && business && (
        <PostOrderSocialModal
          isOpen={showSocialModal}
          onClose={() => {
            setShowSocialModal(false);
            router.push(`/track/${placedOrder.trackingId}`);
          }}
          businessName={business.name}
          tokenNumber={placedOrder.tokenNumber}
          sourceType="menu"
          socialLinks={business.settings?.socialLinks}
          onContinueToTracking={() => {
            setShowSocialModal(false);
            router.push(`/track/${placedOrder.trackingId}`);
          }}
        />
      )}
    </div>
  );
}
