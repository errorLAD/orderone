'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
  ArrowRight,
  Sparkles,
  X,
  Phone,
  MapPin,
  Clock,
  IndianRupee,
  ExternalLink,
  Lock,
  AlertCircle,
  PauseCircle,
  Boxes,
  Layers,
  Paintbrush,
  Droplets,
  Zap,
  Wrench,
  Shirt,
  Smartphone,
  Package,
  UtensilsCrossed,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { Business, Category, Product, OrderSourceType } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { StorefrontTicker } from '@/components/storefront/StorefrontTicker';
import { StorefrontRenderer } from '@/components/storefront/StorefrontRenderer';
import { DEFAULT_STOREFRONT_COLORS, getContrastTextColor } from '@/lib/designPresets';
import { useRouter } from 'next/navigation';
import { calculateOrderTax } from '@/lib/gstCalculator';
import { buildUpiPaymentUri } from '@/lib/upiQr';
import { PostOrderSocialModal } from '@/components/storefront/PostOrderSocialModal';
import { trackConversion } from '@/components/analytics/GoogleAnalytics';
import { getTableRoomLabel } from '@/lib/categories';

export default function PublicStorePage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Cart State (Local for Guest Customer)
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Guest Checkout Form
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [showPhoneField, setShowPhoneField] = useState<boolean>(false);
  const [guestAddress, setGuestAddress] = useState<string>('');
  const [tableOrRoomNumber, setTableOrRoomNumber] = useState<string>('');
  const [guestNotes, setGuestNotes] = useState<string>('');
  const [fulfilmentMethod, setFulfilmentMethod] = useState<'delivery' | 'pickup'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'online'>('upi');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Dynamic label for Table / Room Number as configured by business owner
  const tableRoomConfig = getTableRoomLabel(
    business?.settings?.orderSettings,
    business?.category || business?.type
  );

  // Read URL query parameters for ?room=... or ?table=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const prefill = (sp.get('room') || sp.get('table') || '').trim();
      if (prefill) {
        setTableOrRoomNumber(prefill);
      }
    }
  }, []);

  // Post-Order Social & Review Modal State
  const [placedOrder, setPlacedOrder] = useState<{ tokenNumber: string; trackingId: string } | null>(null);
  const [showSocialModal, setShowSocialModal] = useState<boolean>(false);

  const fetchStoreData = async () => {
    try {
      const bizRes = await fetch(`/api/businesses?slug=${params.slug}`);
      const bizData = await bizRes.json();

      if (bizData.success && bizData.business) {
        const biz: Business = bizData.business;
        setBusiness(biz);

        if (typeof document !== 'undefined') {
          document.title = `${biz.name} | Storefront`;
        }

        const bizCategory = (biz.category || biz.type || '').toLowerCase();
        const isFood = ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat'].includes(bizCategory);
        const hasStore = biz.storeEntitlement?.allowed ?? Boolean(biz.settings?.modules?.store);
        const hasMenu = biz.menuEntitlement?.allowed ?? Boolean(biz.settings?.modules?.menu ?? isFood);

        // Seamless auto-redirect: If this is a food/dining establishment without active retail store, forward directly to its live food menu
        if (!hasStore && hasMenu) {
          router.replace(`/menu/${params.slug}`);
          return;
        }

        const [catRes, prodRes] = await Promise.all([
          fetch(`/api/categories?businessId=${biz.id}&sourceType=store&channel=storefront`),
          fetch(`/api/products?businessId=${biz.id}&sourceType=store&channel=storefront`),
        ]);
        const catData = await catRes.json();
        const prodData = await prodRes.json();

        // Fallback: If retail store has 0 products/categories but dining menu is active, route to menu
        if (
          hasMenu &&
          (!catData.categories || catData.categories.length === 0) &&
          (!prodData.products || prodData.products.length === 0)
        ) {
          router.replace(`/menu/${params.slug}`);
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
      console.error('Error fetching store storefront:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
    const interval = setInterval(fetchStoreData, 4000);
    return () => clearInterval(interval);
  }, [params.slug]);

  const updateQuantity = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      // Check stock
      if (typeof prod.stockQuantity === 'number' && next > prod.stockQuantity) {
        alert(`Sorry, only ${prod.stockQuantity} items in stock!`);
        return prev;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart)
    .map(([prodId, qty]) => {
      const product = products.find((p) => p.id === prodId);
      if (!product) return null;
      const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
      return { product, quantity: qty, itemTotal: price * qty };
    })
    .filter(Boolean) as { product: Product; quantity: number; itemTotal: number }[];

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

  const deliveryFee = fulfilmentMethod === 'delivery' && business?.settings.orderSettings.enableDelivery ? business.settings.orderSettings.deliveryFee || 0 : 0;

  const taxCalculation = calculateOrderTax({
    subtotal: cartSubtotal,
    deliveryFee,
    gstSettings,
    isGoldSubscriber: isGoldPlan,
  });

  const tax = taxCalculation.totalTax;
  const cartTotal = taxCalculation.finalTotal;
  const hasGst = taxCalculation.isGstApplicable;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const upiSettings = (business?.settings as any)?.upiSettings;

  // Submit Order (No Customer Login Required)
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const isStoreOpen = business.isStoreOpen ?? business.settings?.isStoreOpen ?? true;
    const onlineOrderingEnabled =
      business.onlineOrderingEnabled ?? business.settings?.onlineOrderingEnabled ?? true;

    if (!isStoreOpen && !onlineOrderingEnabled) {
      setOrderError('This store is currently closed and online ordering is unavailable.');
      return;
    }
    if (!isStoreOpen) {
      setOrderError('This store is currently closed. Please visit again later.');
      return;
    }
    if (!onlineOrderingEnabled) {
      setOrderError('Online ordering is currently unavailable for this store.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    const items = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

    const orderPayload = {
      businessId: business.id,
      sourceType: 'store' as const, // STRICTLY STORE ORDER
      customer: {
        name: guestName.trim() || 'Guest Customer',
        phone: guestPhone.trim() || undefined,
        address: fulfilmentMethod === 'delivery' ? guestAddress : undefined,
        tableNumber: tableOrRoomNumber.trim() || undefined,
        roomNumber: tableOrRoomNumber.trim() || undefined,
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
        throw new Error(data.error || 'Failed to place store order');
      }

      // Track purchase conversion for Google Analytics & marketing attribution
      trackConversion('purchase', {
        transaction_id: data.order?.id || data.order?.tokenNumber,
        value: cartTotal,
        currency: 'INR',
        items_count: cartItems.length,
        business_slug: params.slug,
        order_source: 'store',
      });

      // Celebrate with confetti!
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
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('aggregate')) {
      return <Boxes className="w-4 h-4 text-amber-600" />;
    }
    if (lower.includes('steel') || lower.includes('rebar') || lower.includes('iron') || lower.includes('metal') || lower.includes('mesh')) {
      return <Layers className="w-4 h-4 text-slate-700" />;
    }
    if (lower.includes('paint') || lower.includes('color') || lower.includes('finish') || lower.includes('varnish')) {
      return <Paintbrush className="w-4 h-4 text-rose-500" />;
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('sanitary') || lower.includes('water') || lower.includes('tap')) {
      return <Droplets className="w-4 h-4 text-sky-600" />;
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('light') || lower.includes('switch') || lower.includes('bulb')) {
      return <Zap className="w-4 h-4 text-amber-500" />;
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw') || lower.includes('nail') || lower.includes('hammer')) {
      return <Wrench className="w-4 h-4 text-indigo-600" />;
    }
    if (lower.includes('cloth') || lower.includes('fashion') || lower.includes('wear') || lower.includes('shirt')) {
      return <Shirt className="w-4 h-4 text-purple-600" />;
    }
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('electronic') || lower.includes('laptop') || lower.includes('gadget')) {
      return <Smartphone className="w-4 h-4 text-blue-600" />;
    }
    return <Package className="w-4 h-4 text-orange-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-10 h-10 text-orange-600 animate-bounce mb-3" />
        <h2 className="text-base font-bold text-slate-800">Loading Store Catalog...</h2>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-black text-slate-800">Storefront Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested store identifier could not be located.
        </p>
      </div>
    );
  }

  const bizCategory = (business.category || business.type || '').toLowerCase();
  const isFoodCategory = ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat'].includes(bizCategory);
  const isRetailCategory = !isFoodCategory;
  const hasStoreAccess =
    business.storeEntitlement?.allowed ??
    Boolean(business.settings?.modules?.store || isRetailCategory);

  if (!hasStoreAccess) {
    const isFood = !isRetailCategory;
    const hasMenuModule = business.menuEntitlement?.allowed ?? Boolean(business.settings?.modules?.menu ?? isFood);

    if (hasMenuModule) {
      return (
        <div className="min-h-screen bg-orange-50/40 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-orange-200/80 p-8 shadow-xs flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-7 h-7 animate-pulse" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 mb-2">
              Restaurant & Food Menu
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              {business.name || 'Restaurant'} Digital Menu
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              This establishment operates a digital restaurant menu for table dining, takeaway, and online food orders.
            </p>
            <Link
              href={`/menu/${params.slug}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Open Live Food Menu & Order</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-black text-slate-800">Digital Store Not Available</h2>
        <p className="text-xs text-slate-500 mt-1">
          This business does not have the retail store module active under their subscription.
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
  const activeCover = designSettings?.coverImageUrl;
  const buttonTextColor = getContrastTextColor(activeColors.button);

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors"
      style={{ backgroundColor: activeColors.background, color: activeColors.text }}
    >
      <StorefrontRenderer
        business={business}
        products={products}
        categories={categories}
        templateId={activeTemplate}
        colors={activeColors}
        coverImageUrl={activeCover}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onOpenCart={() => setIsCartOpen(true)}
        selectedCat={selectedCat}
        onSelectCat={setSelectedCat}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Floating Bottom Bar when Cart has items */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              backgroundColor: activeColors.button,
              color: buttonTextColor,
            }}
            className="w-full p-3.5 rounded-2xl shadow-xl flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white text-orange-700 flex items-center justify-center text-xs font-black">
                {cartCount}
              </span>
              <span className="font-bold text-xs">View Store Cart</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span>{formatINR(cartTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Slide-over Cart / Guest Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Cart Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">
                  {isCheckingOut ? 'Guest Store Checkout' : `Your Cart (${cartCount} items)`}
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

            {/* Error banner if any */}
            {orderError && (
              <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {orderError}
              </div>
            )}

            {!isCheckingOut ? (
              /* CART ITEMS VIEW */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cartItems.map(({ product, quantity, itemTotal }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{product.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {formatINR(product.salePrice || product.price)} each
                          </p>
                        </div>
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

                {/* Bill Summary */}
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
                    <span>Estimated Total:</span>
                    <span>{formatINR(cartTotal)}</span>
                  </div>

                  {!canAcceptOnlineOrders && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-1.5 mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        {!isStoreOpen
                           ? 'This store is currently closed. Please visit again later.'
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
                      ? 'Store Closed · Ordering Unavailable'
                      : !onlineOrderingEnabled
                      ? 'Online Ordering Paused'
                      : 'Proceed to Guest Checkout'}
                  </button>
                </div>
              </div>
            ) : (
              /* GUEST CHECKOUT FORM (NO REGISTRATION REQUIRED) */
              <form onSubmit={handlePlaceOrder} className="flex-1 flex flex-col min-h-0 text-xs">
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200 text-orange-800 text-[11px] font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-orange-600" />
                    <span>Ordering as Guest. No account or password needed!</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma (or leave blank)"
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
                          Mobile Phone (for Token SMS / Status) <span className="font-normal text-slate-500">(Optional)</span>
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
                        placeholder="e.g. 9876543210"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Optional: You can still track your order on your screen without a phone number.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPhoneField(true)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 py-1"
                      >
                        <span>+ Add Mobile Phone for SMS Updates (Optional)</span>
                      </button>
                    </div>
                  )}

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
                      onChange={(e) => setTableOrRoomNumber(e.target.value)}
                      placeholder={tableRoomConfig.placeholder}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Leave blank when ordering takeaway, delivery, or if not applicable.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Fulfilment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfilmentMethod('pickup')}
                        className={cn(
                          'p-2.5 rounded-lg border text-left font-bold transition-all',
                          fulfilmentMethod === 'pickup'
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-600'
                        )}
                      >
                        🏪 Counter Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfilmentMethod('delivery')}
                        className={cn(
                          'p-2.5 rounded-lg border text-left font-bold transition-all',
                          fulfilmentMethod === 'delivery'
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-600'
                        )}
                      >
                        🚚 Home Delivery (+₹{business.settings.orderSettings.deliveryFee})
                      </button>
                    </div>
                  </div>

                  {fulfilmentMethod === 'delivery' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Delivery Address *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="House/Flat No, Landmark, Area..."
                        value={guestAddress}
                        onChange={(e) => setGuestAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

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
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
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
                            ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-600'
                        )}
                      >
                        💵 Cash on Pickup
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
                                      orderReference: `Order - ${business.name}`,
                                      transactionNote: `Store Order - ${business.name}`,
                                    })
                                  )}`
                                }
                                alt="Store UPI QR"
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
                              Payment status will be verified by the merchant upon handover. Order token generated immediately.
                            </p>
                          </>
                        ) : (
                          <div className="text-left text-[11px] text-slate-600 space-y-1">
                            <p className="font-semibold text-slate-800">Direct UPI Payment</p>
                            <p className="text-[10px] text-slate-500">
                              Pay at the store counter via UPI upon collecting your order token.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Order Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ring bell twice, deliver after 6 PM..."
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Final Checkout Button */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2 pb-safe">
                  <div className="flex justify-between font-black text-sm text-slate-900">
                    <span>Total Payable:</span>
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
                          ? 'hover:opacity-90 text-white cursor-pointer active:scale-98'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      )}
                    >
                      {submittingOrder
                        ? 'Generating Store Token...'
                        : !isStoreOpen
                        ? 'Store Closed · Ordering Unavailable'
                        : !onlineOrderingEnabled
                        ? 'Online Ordering Paused'
                        : `Place Store Order (${formatINR(cartTotal)})`}
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
          sourceType="store"
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
