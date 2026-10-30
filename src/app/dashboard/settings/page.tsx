'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  UtensilsCrossed,
  Save,
  CheckCircle2,
  Building,
  Phone,
  Clock,
  Coins,
  Percent,
  Receipt,
  Volume2,
  VolumeX,
  BellRing,
  Bell,
  Laptop,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrderAlert } from '@/context/OrderAlertContext';
import { Business } from '@/types';
import { cn } from '@/lib/utils';

export default function BusinessSettingsPage() {
  const { currentBusiness, refreshBusinesses } = useApp();
  const {
    soundEnabled,
    setSoundEnabled,
    volume,
    setVolume,
    testSound,
    desktopNotifsAllowed,
    requestDesktopNotifications,
  } = useOrderAlert();

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Modules & Order Configuration
  const [enableStore, setEnableStore] = useState(true);
  const [enableMenu, setEnableMenu] = useState(true);
  const [tokenPrefixStore, setTokenPrefixStore] = useState('S-');
  const [tokenPrefixMenu, setTokenPrefixMenu] = useState('M-');
  const [minStoreOrder, setMinStoreOrder] = useState('50');
  const [enableGst, setEnableGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [taxRatePercentage, setTaxRatePercentage] = useState('5');
  const [deliveryFee, setDeliveryFee] = useState('30');
  const [enableDelivery, setEnableDelivery] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [tableRoomLabelMode, setTableRoomLabelMode] = useState<'table' | 'room' | 'table_or_room'>('table_or_room');
  const [customTableRoomLabel, setCustomTableRoomLabel] = useState('');
  const [waiterCallsEnabled, setWaiterCallsEnabled] = useState(true);
  const [waiterAlertInterval, setWaiterAlertInterval] = useState('6');
  const canOfferWaiterCalls = currentBusiness?.type === 'restaurant' || currentBusiness?.category === 'restaurant';

  useEffect(() => {
    if (currentBusiness) {
      setName(currentBusiness.name);
      setDescription(currentBusiness.description);
      setPhone(currentBusiness.phone);
      setAddress(currentBusiness.address);
      setOperatingHours(currentBusiness.settings.operatingHours);
      setLogoUrl(currentBusiness.logoUrl || '');

      setEnableStore(currentBusiness.settings.modules.store);
      setEnableMenu(currentBusiness.settings.modules.menu);
      setTokenPrefixStore(currentBusiness.settings.tokenPrefixStore || 'S-');
      setTokenPrefixMenu(currentBusiness.settings.tokenPrefixMenu || 'M-');
      setMinStoreOrder(String(currentBusiness.settings.orderSettings.minStoreOrder || 50));
      
      const hasGst = currentBusiness.settings.orderSettings.enableGst ?? (Number(currentBusiness.settings.orderSettings.taxRatePercentage) > 0);
      setEnableGst(hasGst);
      setGstin(currentBusiness.settings.orderSettings.gstin || '');
      setTaxRatePercentage(String(currentBusiness.settings.orderSettings.taxRatePercentage ?? (hasGst ? 5 : 0)));

      setDeliveryFee(String(currentBusiness.settings.orderSettings.deliveryFee || 30));
      setEnableDelivery(currentBusiness.settings.orderSettings.enableDelivery);
      setAutoAcceptOrders(currentBusiness.settings.orderSettings.autoAcceptOrders);
      setTableRoomLabelMode(
        currentBusiness.settings.orderSettings.tableRoomLabelMode ||
        (currentBusiness.type === 'hotel' ? 'room' : 'table_or_room')
      );
      setCustomTableRoomLabel(currentBusiness.settings.orderSettings.customTableRoomLabel || '');
      setWaiterCallsEnabled(currentBusiness.settings.waiterCalls?.enabled !== false);
      setWaiterAlertInterval(String(currentBusiness.settings.waiterCalls?.alertIntervalSeconds || 6));
    }
  }, [currentBusiness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setLoading(true);
    setSuccess(false);

    try {
      const updates = {
        name,
        description,
        phone,
        address,
        logoUrl,
        settings: {
          modules: {
            store: enableStore,
            menu: enableMenu,
          },
          orderSettings: {
            minStoreOrder: Number(minStoreOrder),
            enableGst,
            gstin: enableGst ? gstin.trim() : undefined,
            taxRatePercentage: enableGst ? Number(taxRatePercentage || 0) : 0,
            currencySymbol: '₹',
            currencyCode: 'INR',
            enableDelivery,
            deliveryFee: Number(deliveryFee),
            enableTakeaway: true,
            enableDineIn: true,
            autoAcceptOrders,
            tableRoomLabelMode,
            customTableRoomLabel: customTableRoomLabel.trim() || undefined,
          },
          tokenPrefixStore,
          tokenPrefixMenu,
          operatingHours,
          waiterCalls: canOfferWaiterCalls ? {
            enabled: waiterCallsEnabled,
            alertIntervalSeconds: Math.min(60, Math.max(3, Number(waiterAlertInterval) || 6)),
          } : undefined,
        },
      };

      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentBusiness.id, ...updates }),
      });

      const data = await res.json();
      if (data.success) {
        await refreshBusinesses();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeDemoData = async () => {
    if (!currentBusiness) return;
    if (
      !confirm(
        'Are you sure you want to permanently clear all demo and test orders, queue tokens, and notifications? This will reset your dashboard to a 100% clean live slate.'
      )
    ) {
      return;
    }
    setPurging(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_demo_data', businessId: currentBusiness.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('All demo and test data has been purged successfully.');
        window.location.reload();
      }
    } catch (err: any) {
      alert('Error purging data: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Business & Storefront Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Toggle Store and Menu modules, customize token prefixes, taxes and delivery rates.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved and applied to live storefronts!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Module Toggles: Store vs Menu */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Active Channels & Modules</h3>
          <p className="text-slate-500 text-xs">
            A business may enable the retail Store, the restaurant Menu, or both simultaneously.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Store Module Toggle */}
            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 text-xs">Digital Retail Store</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    For selling packaged products, groceries, snacks & physical goods.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableStore}
                onChange={(e) => setEnableStore(e.target.checked)}
                className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
              />
            </div>

            {/* Menu Module Toggle */}
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 text-xs">Digital Restaurant Menu</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    For food ordering, dining tables, kitchen tickets & beverages.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableMenu}
                onChange={(e) => setEnableMenu(e.target.checked)}
                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {canOfferWaiterCalls && (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BellRing className="h-4 w-4 text-amber-600" /> Table Service · Call a Waiter</h3>
                <p className="mt-1 max-w-2xl text-xs text-slate-500">Let dine-in guests call your team from the menu. Calls appear on this dashboard and keep alerting until staff acknowledges them.</p>
              </div>
              <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700">
                <input type="checkbox" checked={waiterCallsEnabled} onChange={(event) => setWaiterCallsEnabled(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                Enable waiter calls
              </label>
            </div>
            <label className="flex max-w-sm flex-col gap-1.5 text-xs font-semibold text-slate-700">
              Repeat alert every
              <span className="flex items-center gap-2">
                <input type="number" min={3} max={60} value={waiterAlertInterval} onChange={(event) => setWaiterAlertInterval(event.target.value)} disabled={!waiterCallsEnabled} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
                seconds
              </span>
              <span className="text-[11px] font-normal text-slate-500">The distinct call-bell repeats until acknowledged. Staff can silence it without dismissing the request.</span>
            </label>
          </div>
        )}

        {/* Real-Time Order Sound & Notifications Alerts */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Real-Time Order Sound & Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Play a continuous ringing alarm whenever a new Store or Menu order arrives until acknowledged.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
            </label>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
            {/* Status & Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    Ringing Audio Alarm
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    soundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {soundEnabled ? 'Active' : 'Muted'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">
                  When enabled, incoming orders ring continuously until staff clicks &quot;Stop Alert&quot; or acknowledges the order.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1.5 flex items-center justify-between">
                  <span>Chime Volume: {Math.round(volume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  disabled={!soundEnabled}
                  className="w-full accent-indigo-600 cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>

            {/* Test Sound Buttons */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 mr-2">Test Melodies:</span>
              <button
                type="button"
                onClick={() => testSound('store')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition"
              >
                <Store className="w-3.5 h-3.5 text-sky-600" />
                <span>Test Store Chime (Retail)</span>
              </button>

              <button
                type="button"
                onClick={() => testSound('menu')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-semibold transition"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                <span>Test Menu Chime (Kitchen)</span>
              </button>
            </div>

            {/* Desktop Push Notifications */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Desktop Operating System Notifications</span>
                  <span className="text-[11px] text-slate-500">
                    Receive OS popups even when working in another tab or minimized.
                  </span>
                </div>
              </div>

              {desktopNotifsAllowed ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Permission Granted</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await requestDesktopNotifications();
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                >
                  Enable Desktop Notifications
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Token Prefixes */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Independent Token Sequences</h3>
          <p className="text-slate-500 text-xs">
            Store orders and Menu orders use separate sequences to guarantee zero mix-ups.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Store Token Prefix</label>
              <input
                type="text"
                value={tokenPrefixStore}
                onChange={(e) => setTokenPrefixStore(e.target.value)}
                placeholder="S-"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Preview: {tokenPrefixStore}00101
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Menu Token Prefix</label>
              <input
                type="text"
                value={tokenPrefixMenu}
                onChange={(e) => setTokenPrefixMenu(e.target.value)}
                placeholder="M-"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Preview: {tokenPrefixMenu}00101
              </span>
            </div>
          </div>
        </div>

        {/* GST Billing & Tax Configuration */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">GST Billing & Tax Permission</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Grant this store permission to charge GST. If disabled, the GST section is completely hidden from all customer bills and checkouts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableGst}
                onChange={(e) => setEnableGst(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
            </label>
          </div>

          {enableGst ? (
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span>GST is Enabled — GST rate and GSTIN will be calculated on storefronts and receipts</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    GSTIN / Tax Identification Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Optional 15-digit GSTIN printed on tax invoices & receipts
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    GST Rate (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={taxRatePercentage}
                      onChange={(e) => setTaxRatePercentage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-bold focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-1 shrink-0">
                      {['5', '12', '18'].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setTaxRatePercentage(rate)}
                          className={cn(
                            'px-2 py-1 text-xs font-bold rounded border transition-colors',
                            taxRatePercentage === rate
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Select standard Indian GST slab (e.g. 5% food & beverages, 12%/18% packaged goods)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>
                <strong>GST Section Hidden:</strong> Store does not charge GST. The GST line item is completely hidden from customer checkout, order tokens, and invoices.
              </span>
            </div>
          )}
        </div>

        {/* Pricing & Order Rules */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Order Rules & Delivery Charges</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Store Order (₹)</label>
              <input
                type="number"
                value={minStoreOrder}
                onChange={(e) => setMinStoreOrder(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Delivery Charge (₹)</label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoAccept"
              checked={autoAcceptOrders}
              onChange={(e) => setAutoAcceptOrders(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="autoAccept" className="font-semibold text-slate-700">
              Auto-Accept new orders immediately upon checkout
            </label>
          </div>
        </div>

        {/* Table / Room Number Checkout Field Configuration */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Table / Room Number Field (Checkout)</h3>
              <p className="text-slate-500 text-xs">
                Configure how the optional seating or room location field is labeled for customers during checkout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTableRoomLabelMode('table_or_room')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                tableRoomLabelMode === 'table_or_room'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div className="font-bold text-xs text-slate-900 mb-0.5">Table / Room Number</div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Flexible label. Recommended for multi-purpose spaces or dual restaurant & lodge operations.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTableRoomLabelMode('table')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                tableRoomLabelMode === 'table'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div className="font-bold text-xs text-slate-900 mb-0.5">Table Number</div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Recommended for restaurants, cafes, bakeries, and bars with dining tables.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTableRoomLabelMode('room')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                tableRoomLabelMode === 'room'
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div className="font-bold text-xs text-slate-900 mb-0.5">Room Number</div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Recommended for hotels, resorts, and homestays offering in-room dining delivery.
              </p>
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-700">Customer Checkout Preview: </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-indigo-700">
                {customTableRoomLabel.trim()
                  ? `${customTableRoomLabel.trim()} (Optional)`
                  : tableRoomLabelMode === 'room'
                  ? 'Room No. (Optional)'
                  : tableRoomLabelMode === 'table'
                  ? 'Table No. (Optional)'
                  : 'Table / Room No. (Optional)'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Customers can always leave this blank for takeaway or delivery.
            </span>
          </div>
        </div>

        {/* Business Profile Details */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Business Profile & Contact</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Tagline</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Store / Restaurant Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="08:00 AM - 10:30 PM"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Data & Test Order Management */}
        <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-rose-950 text-sm">Purge Test & Demo Orders</h3>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Permanently purge all sample orders, notifications, and queue tokens to ensure your analytics and orders are 100% real.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePurgeDemoData}
              disabled={purging}
              className="self-start sm:self-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
            >
              {purging ? 'Purging Data...' : 'Purge Demo Data'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
