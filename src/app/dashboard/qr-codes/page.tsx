'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { buildUpiPaymentUri } from '@/lib/upiQr';
import Link from 'next/link';

export default function QrCodesPage() {
  const { currentBusiness } = useApp();
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

  // Automatically align initial QR code type with the business's active module
  useEffect(() => {
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
              QR Code Posters & Storefront URLs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and print branded tabletop posters for your store, food menu, and individual dining tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Branded Poster</span>
          </button>
        </div>
      </div>

      {/* Target Selector Tabs (No print) */}
      <div className="flex flex-wrap items-center gap-2 no-print text-xs">
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

      {/* Storefront QR vs Payment QR Explanation Banner */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">QR Type Guide: </span>
            <span>
              {selectedType === 'payment_qr'
                ? 'Payment QR initiates a direct UPI payment in the customer phone with merchant & amount prefilled.'
                : 'Storefront QR opens your public catalog website in the customer browser for browsing and ordering.'}
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/settings/payments"
          className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Configure Merchant UPI</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Order Payment UPI QR Inputs (if payment_qr mode) */}
      {selectedType === 'payment_qr' && !isGoldPlan && (
        <div className="p-6 bg-white rounded-2xl border border-amber-200 shadow-sm text-center max-w-xl mx-auto space-y-3 no-print">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">Order Payment QR Code is Locked</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Dynamic amount-based UPI payment QR generation is exclusive to the <strong>Gold plan (₹99/mo)</strong>. Upgrade to generate direct checkout QR codes.
          </p>
          <Link
            href="/dashboard/subscription?plan=gold"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-bold text-xs shadow-xs hover:bg-[#4338CA]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Gold Plan</span>
          </Link>
        </div>
      )}

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

      {/* Shareable Link Box (No print) */}
      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs no-print">
        <div className="truncate font-mono text-slate-700">{targetUrl}</div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Print-Ready Branded Poster Preview Card */}
      <div className="flex justify-center pt-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-slate-300 p-5 sm:p-8 text-center shadow-xl flex flex-col items-center print:shadow-none print:border print:m-0 print:max-w-none">
          {/* Business branding */}
          {currentBusiness?.logoUrl ? (
            <img
              src={currentBusiness.logoUrl}
              alt={currentBusiness.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl mb-3">
              {currentBusiness?.name.slice(0, 2).toUpperCase() || 'SAAS'}
            </div>
          )}

          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {currentBusiness?.name || 'Store / Restaurant'}
          </h2>

          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {selectedType === 'store'
              ? 'Scan to browse products & order online'
              : selectedType === 'menu'
              ? 'Scan to view our digital menu & order food'
              : selectedType === 'table'
              ? `Order directly to ${tableNumber}`
              : selectedType === 'room'
              ? `In-room dining & food delivery directly to Room ${roomNumber}`
              : `Scan with any UPI App to Pay ₹${paymentAmount || '0.00'}`}
          </p>

          {/* Room pill, Table pill or Payment pill */}
          {selectedType === 'room' && (
            <div className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black tracking-wide shadow-xs">
              🛏️ Delivering to Room {roomNumber}
            </div>
          )}

          {selectedType === 'table' && (
            <div className="mt-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black tracking-wide">
              🍽️ {tableNumber}
            </div>
          )}

          {selectedType === 'payment_qr' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-wide border border-emerald-300">
              <span>💳 Pay ₹{paymentAmount} • Ref: {orderReference}</span>
            </div>
          )}

          {/* High-res QR Canvas */}
          <div className="my-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-md">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Store QR Code" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800">
              {selectedType === 'payment_qr'
                ? '⚡ GPay • PhonePe • Paytm • BHIM UPI Accepted'
                : '⚡ Instant Guest Ordering • No App Needed'}
            </div>
            <div className="text-[11px] text-slate-400">
              {selectedType === 'payment_qr'
                ? `Direct to ${upiSettings?.payeeName || currentBusiness?.name} • Powered by OrderOne.in`
                : 'Point your camera to scan • Powered by OrderOne.in'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
