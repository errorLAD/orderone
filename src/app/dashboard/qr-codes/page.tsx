'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Store,
  UtensilsCrossed,
  Table,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  IndianRupee,
  Lock,
  ArrowRight,
  Info,
  BedDouble,
  Palette,
  Layers,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { buildUpiPaymentUri } from '@/lib/upiQr';
import Link from 'next/link';
import { AcrylicStandeeCard } from '@/components/dashboard/AcrylicStandeeCard';
import { QrCustomizationStudio } from '@/components/dashboard/QrCustomizationStudio';

export default function QrCodesPage() {
  const { currentBusiness } = useApp();
  const [viewMode, setViewMode] = useState<'custom_studio' | 'acrylic_standee'>('custom_studio');
  const [selectedType, setSelectedType] = useState<'store' | 'menu' | 'table' | 'room' | 'payment_qr'>('store');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [roomNumber, setRoomNumber] = useState<string>('101');
  const [hotelRooms, setHotelRooms] = useState<Array<{ id: string; roomNumber: string; floor?: string }>>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('250.00');
  const [orderReference, setOrderReference] = useState<string>('S-00102');
  const [upiSettings, setUpiSettings] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const isHotel = currentBusiness?.category === 'hotel' || currentBusiness?.type === 'hotel';
  const isGoldPlan =
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_diamond';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://orderone.in';

  // Automatically align initial QR code type with the business's active module or URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qType = sp.get('type') as any;
      const qRoom = sp.get('room');
      const qTable = sp.get('table');
      const qMode = sp.get('mode');
      if (qMode === 'standee') {
        setViewMode('acrylic_standee');
      }
      if (qType && ['store', 'menu', 'table', 'room', 'payment_qr'].includes(qType)) {
        setSelectedType(qType);
        if (qRoom) setRoomNumber(qRoom);
        if (qTable) setTableNumber(qTable);
        return;
      }
    }

    if (currentBusiness) {
      if (isHotel) {
        setSelectedType('room');
        return;
      }
      const isFood = ['restaurant', 'cafe', 'bakery', 'juice_chaat'].includes(
        currentBusiness.category || currentBusiness.type || ''
      );
      const hasStore = currentBusiness.settings?.modules?.store ?? false;
      const hasMenu = currentBusiness.settings?.modules?.menu ?? false;

      setSelectedType((prev) => {
        if (prev === 'store' && !hasStore && hasMenu) return 'menu';
        if (prev === 'menu' && !hasMenu && hasStore) return 'store';
        if (prev === 'table' && !hasMenu && hasStore) return 'store';
        if (prev === 'store' && isFood && hasMenu) return 'menu';
        return prev;
      });
    }
  }, [currentBusiness, isHotel]);

  // Fetch hotel rooms if hotel
  useEffect(() => {
    if (currentBusiness?.id && isHotel) {
      fetch(`/api/hotel/rooms?businessId=${currentBusiness.id}&activeOnly=true`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.rooms) && d.rooms.length > 0) {
            setHotelRooms(d.rooms);
            setRoomNumber(d.rooms[0].roomNumber);
          }
        })
        .catch(console.error);
    }
  }, [currentBusiness?.id, isHotel]);

  // Fetch UPI settings for Gold business
  useEffect(() => {
    if (currentBusiness && isGoldPlan) {
      fetch(`/api/businesses/upi?businessId=${currentBusiness.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.upiSettings) {
            setUpiSettings(data.upiSettings);
          }
        })
        .catch(console.error);
    }
  }, [currentBusiness?.id, isGoldPlan]);

  const getTargetUrl = () => {
    if (!currentBusiness) return '';
    if (selectedType === 'store') return `${baseUrl}/store/${currentBusiness.slug}`;
    if (selectedType === 'menu') return `${baseUrl}/menu/${currentBusiness.slug}`;
    if (selectedType === 'table') return `${baseUrl}/menu/${currentBusiness.slug}?table=${encodeURIComponent(tableNumber)}`;
    if (selectedType === 'room') return `${baseUrl}/menu/${currentBusiness.slug}?room=${encodeURIComponent(roomNumber)}`;
    
    // Dynamic Order Payment UPI URI
    const upiId = upiSettings?.upiId || 'merchant@upi';
    const payeeName = upiSettings?.payeeName || currentBusiness.name;
    return buildUpiPaymentUri({
      upiId,
      payeeName,
      amount: parseFloat(paymentAmount) || 0,
      orderReference: orderReference.trim() || 'Order Payment',
      transactionNote: `Order ${orderReference} - ${currentBusiness.name}`,
    });
  };

  const targetUrl = getTargetUrl();

  useEffect(() => {
    if (targetUrl) {
      const darkColor =
        selectedType === 'store'
          ? '#0369a1'
          : selectedType === 'menu'
          ? '#c2410c'
          : selectedType === 'table'
          ? '#312e81'
          : selectedType === 'room'
          ? '#b45309'
          : '#4f46e5';

      QRCode.toDataURL(targetUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: darkColor,
          light: '#ffffff',
        },
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [targetUrl, selectedType, tableNumber, roomNumber, paymentAmount, orderReference, upiSettings]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${currentBusiness?.slug || 'store'}_${selectedType}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <QrCode className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              QR Code Studio & Storefront Posters
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customize branded colors, shapes, logo embeds, or generate print-ready acrylic tabletop standees.
          </p>
        </div>

        {/* View Mode Switcher: Custom Studio (Gold) vs Acrylic Standee */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold no-print">
          <button
            onClick={() => setViewMode('custom_studio')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition',
              viewMode === 'custom_studio'
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Custom QR Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-black">
              Gold
            </span>
          </button>
          <button
            onClick={() => setViewMode('acrylic_standee')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition',
              viewMode === 'acrylic_standee'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Acrylic Standees</span>
          </button>
        </div>
      </div>

      {/* Target Destination Selector Tabs */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select QR Destination Link
          </span>
          <span className="text-[11px] text-slate-500">
            Encoded URL: <code className="font-mono text-slate-700">{targetUrl}</code>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {currentBusiness?.settings.modules.store && (
            <button
              onClick={() => setSelectedType('store')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold border transition-colors',
                selectedType === 'store'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <Store className="w-4 h-4" />
              <span>Retail Store QR</span>
            </button>
          )}

          {currentBusiness?.settings.modules.menu && (
            <button
              onClick={() => setSelectedType('menu')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold border transition-colors',
                selectedType === 'menu'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Food Menu QR</span>
            </button>
          )}

          {currentBusiness?.settings.modules.menu && (
            <button
              onClick={() => setSelectedType('table')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold border transition-colors',
                selectedType === 'table'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <Table className="w-4 h-4" />
              <span>Dining Table Specific QR</span>
            </button>
          )}

          {/* In-Room Dining QR Standee Tab for Hotels */}
          {(isHotel || currentBusiness?.settings.modules.menu) && (
            <button
              onClick={() => setSelectedType('room')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold border transition-colors',
                selectedType === 'room'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <BedDouble className="w-4 h-4" />
              <span>In-Room Dining QR</span>
            </button>
          )}

          {/* Dynamic Order Payment UPI QR Tab (Gold) */}
          <button
            onClick={() => setSelectedType('payment_qr')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold border transition-colors',
              selectedType === 'payment_qr'
                ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>Order Payment UPI QR</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-black">
              Gold
            </span>
          </button>
        </div>
      </div>

      {/* Table Selector if table mode */}
      {selectedType === 'table' && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3 text-xs no-print">
          <span className="font-bold text-slate-700">Select Table Number:</span>
          <select
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-indigo-700 bg-indigo-50/50"
          >
            {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Table 7', 'Table 8'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hotel Room Selector if room mode */}
      {selectedType === 'room' && (
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-3">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-amber-700" />
              Room Number:
            </span>
            {hotelRooms.length > 0 ? (
              <select
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="px-3 py-1.5 border border-amber-300 rounded-lg font-bold text-amber-900 bg-white"
              >
                {hotelRooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Room {r.roomNumber} {r.floor ? `(Floor ${r.floor})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 101"
                className="w-24 px-3 py-1.5 border border-amber-300 rounded-lg font-bold text-amber-900 bg-white"
              />
            )}
          </div>
          <Link
            href="/dashboard/hotel/rooms"
            className="font-semibold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
          >
            <span>Manage All Hotel Rooms</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Order Payment UPI QR Inputs (if payment_qr mode) */}
      {selectedType === 'payment_qr' && isGoldPlan && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs no-print">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#4F46E5]" />
              <span className="font-bold text-slate-800">Dynamic Payment QR Generator</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Merchant UPI: {upiSettings?.upiId || 'Not configured (using demo@upi)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Order Amount (₹ INR) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="250.00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Order Reference / Token Number *
              </label>
              <input
                type="text"
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                placeholder="e.g. S-00102"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 1: CUSTOM QR STUDIO (GOLD FEATURE) */}
      {viewMode === 'custom_studio' && currentBusiness && (
        <QrCustomizationStudio
          businessId={currentBusiness.id}
          businessName={currentBusiness.name}
          businessLogo={currentBusiness.logoUrl}
          businessSlug={currentBusiness.slug}
          targetUrl={targetUrl}
          isGoldPlan={isGoldPlan}
          qrType={selectedType}
          tableNumber={selectedType === 'table' ? tableNumber : undefined}
          roomNumber={selectedType === 'room' ? roomNumber : undefined}
        />
      )}

      {/* MODE 2: ACRYLIC TABLETOP STANDEES (PRINT SIZE REFERENCE) */}
      {viewMode === 'acrylic_standee' && currentBusiness && qrDataUrl && (
        <AcrylicStandeeCard
          businessName={currentBusiness.name}
          businessLogo={currentBusiness.logoUrl}
          businessCategory={currentBusiness.category || currentBusiness.type}
          qrCodeUrl={qrDataUrl}
          targetUrl={targetUrl}
          type={selectedType}
          tableNumber={selectedType === 'table' ? tableNumber : undefined}
          roomNumber={selectedType === 'room' ? roomNumber : undefined}
          floorNumber={
            selectedType === 'room'
              ? hotelRooms.find((r) => r.roomNumber === roomNumber)?.floor
              : undefined
          }
          upiId={upiSettings?.upiId}
          payeeName={upiSettings?.payeeName}
          paymentAmount={selectedType === 'payment_qr' ? paymentAmount : undefined}
          orderReference={selectedType === 'payment_qr' ? orderReference : undefined}
        />
      )}
    </div>
  );
}
