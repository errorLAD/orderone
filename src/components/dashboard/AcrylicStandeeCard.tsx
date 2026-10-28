'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  Palette,
  Maximize2,
  QrCode,
  ShieldCheck,
  Smartphone,
  BedDouble,
  UtensilsCrossed,
  Store,
  CreditCard,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StandeeSize = 'a5' | '4x6' | 'a4';
export type StandeeTheme = 'purple' | 'indigo' | 'amber' | 'emerald' | 'slate';

export interface StandeeCardProps {
  businessName: string;
  businessLogo?: string;
  businessCategory?: string;
  qrCodeUrl: string;
  targetUrl: string;
  type: 'store' | 'menu' | 'table' | 'room' | 'payment_qr';
  tableNumber?: string;
  roomNumber?: string;
  floorNumber?: string;
  upiId?: string;
  payeeName?: string;
  paymentAmount?: string;
  orderReference?: string;
}

export const STANDEE_SIZES: Record<
  StandeeSize,
  {
    id: StandeeSize;
    name: string;
    subtitle: string;
    aspectRatio: string;
    widthMm: number;
    heightMm: number;
    canvasW: number;
    canvasH: number;
  }
> = {
  a5: {
    id: 'a5',
    name: 'A5 Acrylic Standee',
    subtitle: '5.8" × 8.3" (148 × 210 mm) • Reference Size',
    aspectRatio: '148 / 210',
    widthMm: 148,
    heightMm: 210,
    canvasW: 1480,
    canvasH: 2100,
  },
  '4x6': {
    id: '4x6',
    name: '4" × 6" Table Tent',
    subtitle: '4.0" × 6.0" (102 × 152 mm) • Compact A6',
    aspectRatio: '4 / 6',
    widthMm: 102,
    heightMm: 152,
    canvasW: 1200,
    canvasH: 1800,
  },
  a4: {
    id: 'a4',
    name: 'A4 Counter Stand',
    subtitle: '8.3" × 11.7" (210 × 297 mm) • Large Display',
    aspectRatio: '210 / 297',
    widthMm: 210,
    heightMm: 297,
    canvasW: 2100,
    canvasH: 2970,
  },
};

export const STANDEE_THEMES: Record<
  StandeeTheme,
  {
    id: StandeeTheme;
    name: string;
    primaryHex: string;
    secondaryHex: string;
    lightHex: string;
    accentHex: string;
    badgeBg: string;
    borderClass: string;
    textClass: string;
    bgClass: string;
  }
> = {
  purple: {
    id: 'purple',
    name: 'PhonePe Purple (Reference)',
    primaryHex: '#5f259f',
    secondaryHex: '#48197d',
    lightHex: '#f5f0fb',
    accentHex: '#8b5cf6',
    badgeBg: 'bg-[#5f259f] text-white',
    borderClass: 'border-[#5f259f]',
    textClass: 'text-[#5f259f]',
    bgClass: 'bg-[#5f259f]',
  },
  indigo: {
    id: 'indigo',
    name: 'OrderOne Indigo',
    primaryHex: '#4338ca',
    secondaryHex: '#312e81',
    lightHex: '#eef2ff',
    accentHex: '#6366f1',
    badgeBg: 'bg-[#4338ca] text-white',
    borderClass: 'border-[#4338ca]',
    textClass: 'text-[#4338ca]',
    bgClass: 'bg-[#4338ca]',
  },
  amber: {
    id: 'amber',
    name: 'Dining & Room Amber',
    primaryHex: '#b45309',
    secondaryHex: '#78350f',
    lightHex: '#fffbeb',
    accentHex: '#f59e0b',
    badgeBg: 'bg-[#b45309] text-white',
    borderClass: 'border-[#b45309]',
    textClass: 'text-[#b45309]',
    bgClass: 'bg-[#b45309]',
  },
  emerald: {
    id: 'emerald',
    name: 'Merchant Green',
    primaryHex: '#047857',
    secondaryHex: '#064e3b',
    lightHex: '#ecfdf5',
    accentHex: '#10b981',
    badgeBg: 'bg-[#047857] text-white',
    borderClass: 'border-[#047857]',
    textClass: 'text-[#047857]',
    bgClass: 'bg-[#047857]',
  },
  slate: {
    id: 'slate',
    name: 'Minimalist Onyx',
    primaryHex: '#0f172a',
    secondaryHex: '#020617',
    lightHex: '#f8fafc',
    accentHex: '#475569',
    badgeBg: 'bg-[#0f172a] text-white',
    borderClass: 'border-[#0f172a]',
    textClass: 'text-[#0f172a]',
    bgClass: 'bg-[#0f172a]',
  },
};

export function AcrylicStandeeCard({
  businessName,
  businessLogo,
  businessCategory,
  qrCodeUrl,
  targetUrl,
  type,
  tableNumber,
  roomNumber,
  floorNumber,
  upiId,
  payeeName,
  paymentAmount,
  orderReference,
}: StandeeCardProps) {
  const [selectedSize, setSelectedSize] = useState<StandeeSize>('a5');
  const [selectedTheme, setSelectedTheme] = useState<StandeeTheme>(
    type === 'payment_qr' ? 'purple' : type === 'room' ? 'amber' : type === 'menu' ? 'purple' : 'indigo'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const standeeRef = useRef<HTMLDivElement>(null);

  const theme = STANDEE_THEMES[selectedTheme];
  const sizeConfig = STANDEE_SIZES[selectedSize];

  // Title & Subtitle logic
  const isHotel = type === 'room' || businessCategory === 'hotel';
  const isTable = type === 'table';
  const isPayment = type === 'payment_qr';

  const badgeText = isPayment
    ? 'BHIM UPI • INSTANT PAYMENT'
    : isHotel
    ? `IN-ROOM DINING • ROOM ${roomNumber || ''}`
    : isTable
    ? `DIGITAL MENU • ${tableNumber || 'TABLE'}`
    : type === 'store'
    ? 'DIGITAL STOREFRONT'
    : 'DIGITAL MENU';

  const ctaHeading = isPayment
    ? 'Scan and Pay with any BHIM UPI app'
    : isHotel
    ? 'Scan to View Menu & Order In-Room Dining'
    : isTable
    ? `Scan to View Menu & Order to ${tableNumber || 'Table'}`
    : 'Scan to View Catalog & Order Online';

  const ctaSubtext = isPayment
    ? 'PhonePe • Google Pay • Paytm • BHIM • Any Bank UPI'
    : '⚡ Instant Guest Ordering • No App Download Required';

  const locationSubtitle = isHotel && roomNumber
    ? `Room ${roomNumber}${floorNumber ? ` (Floor ${floorNumber})` : ''}`
    : isTable && tableNumber
    ? tableNumber
    : isPayment
    ? `Merchant: ${payeeName || businessName}`
    : 'Order directly on your phone';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate 300-DPI high-res image on an offscreen HTML5 canvas
  const handleDownloadStandeePng = async () => {
    try {
      setIsGenerating(true);
      const canvas = document.createElement('canvas');
      canvas.width = sizeConfig.canvasW;
      canvas.height = sizeConfig.canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. White Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Helper for rounded rect with fallback
      const drawRoundRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        fillColor?: string,
        strokeColor?: string,
        lineWidth?: number
      ) => {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, width, height, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        if (strokeColor && lineWidth) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // 2. Acrylic Insert Colored Outer Frame (like PhonePe reference standee)
      const outerMargin = 40;
      const frameBorderWidth = 55;
      const innerCornerRadius = 36;
      drawRoundRect(
        outerMargin,
        outerMargin,
        w - outerMargin * 2,
        h - outerMargin * 2,
        48,
        theme.primaryHex
      );

      // 3. Inner White Card
      const innerCardX = outerMargin + frameBorderWidth;
      const innerCardY = outerMargin + frameBorderWidth;
      const innerCardW = w - (outerMargin + frameBorderWidth) * 2;
      const innerCardH = h - (outerMargin + frameBorderWidth) * 2;
      drawRoundRect(innerCardX, innerCardY, innerCardW, innerCardH, innerCornerRadius, '#ffffff');

      // 4. Top Header Section: BHIM UPI / Brand Banner
      const headerY = innerCardY + 80;

      // Draw Top Brand / UPI Header
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // BHIM UPI Badge or Category Badge
      drawRoundRect(
        w / 2 - 320,
        headerY,
        640,
        74,
        37,
        theme.lightHex,
        theme.primaryHex,
        3
      );

      ctx.fillStyle = theme.primaryHex;
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(badgeText, w / 2, headerY + 38);

      // Business Name
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 64px system-ui, -apple-system, sans-serif';
      const maxBizNameW = innerCardW - 120;
      ctx.fillText(businessName, w / 2, headerY + 160, maxBizNameW);

      // Business Sub-Location (Table / Room / City)
      ctx.fillStyle = '#64748b';
      ctx.font = '600 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(locationSubtitle, w / 2, headerY + 225);

      // If Room or Table, draw a prominent colored highlight pill
      let qrTop = headerY + 280;
      if (roomNumber || tableNumber) {
        const pillText = roomNumber ? `ROOM ${roomNumber}` : tableNumber ? `${tableNumber.toUpperCase()}` : '';
        if (pillText) {
          const pillW = 420;
          const pillH = 76;
          drawRoundRect(
            w / 2 - pillW / 2,
            headerY + 270,
            pillW,
            pillH,
            20,
            theme.primaryHex
          );
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 40px system-ui, -apple-system, sans-serif';
          ctx.fillText(pillText, w / 2, headerY + 270 + pillH / 2);
          qrTop = headerY + 380;
        }
      }

      // 5. Draw QR Code in Center
      const qrBoxSize = innerCardW * 0.62;
      const qrBoxX = w / 2 - qrBoxSize / 2;
      const qrBoxY = qrTop + 20;

      // QR container card with soft border & subtle shadow
      drawRoundRect(
        qrBoxX - 25,
        qrBoxY - 25,
        qrBoxSize + 50,
        qrBoxSize + 50,
        32,
        '#ffffff',
        '#e2e8f0',
        4
      );

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrCodeUrl;
      });
      ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      // 6. Call to Action Heading & Subtext
      const ctaY = qrBoxY + qrBoxSize + 90;
      ctx.fillStyle = '#1e293b';
      ctx.font = '800 42px system-ui, -apple-system, sans-serif';
      ctx.fillText(ctaHeading, w / 2, ctaY);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(ctaSubtext, w / 2, ctaY + 54);

      // 7. Payment / App Badges (PhonePe, GPay, Paytm, BHIM, WhatsApp, Camera)
      const appsY = ctaY + 140;
      const appIcons = [
        { name: 'PhonePe', color: '#5f259f', text: 'पे' },
        { name: 'GPay', color: '#1a73e8', text: 'G' },
        { name: 'Paytm', color: '#00baf2', text: '₹' },
        { name: 'BHIM', color: '#097939', text: 'UPI' },
        { name: 'WhatsApp', color: '#25d366', text: 'WA' },
        { name: 'Camera', color: '#475569', text: '📷' },
      ];

      const iconRadius = 38;
      const iconSpacing = (innerCardW - 140) / appIcons.length;
      const startX = innerCardX + 70 + iconSpacing / 2;

      appIcons.forEach((app, idx) => {
        const cx = startX + idx * iconSpacing;
        ctx.beginPath();
        ctx.arc(cx, appsY, iconRadius, 0, Math.PI * 2);
        ctx.fillStyle = app.color;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(app.text, cx, appsY);

        ctx.fillStyle = '#64748b';
        ctx.font = '600 20px system-ui, sans-serif';
        ctx.fillText(app.name, cx, appsY + 55);
      });

      // 8. Bottom Colored Strip inside inner card (Matching reference PhonePe footer)
      const footerH = 80;
      const footerY = innerCardY + innerCardH - footerH;
      drawRoundRect(
        innerCardX,
        footerY,
        innerCardW,
        footerH,
        0,
        theme.primaryHex
      );

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ 100% Secure • Powered by OrderOne.in', w / 2, footerY + footerH / 2);

      // Export canvas to PNG and trigger download
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      const cleanSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const itemLabel = roomNumber ? `_room_${roomNumber}` : tableNumber ? `_${tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
      link.download = `acrylic_standee_${cleanSlug}${itemLabel}_${selectedSize}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to generate acrylic standee image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Bar: Standee Size & Theme Selector (No Print) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Acrylic Standee Specifications</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select standard acrylic holder dimensions and brand frame color matching your counter/table stand.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Standee</span>
            </button>
            <button
              onClick={handleDownloadStandeePng}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Rendering High-Res...' : 'Download Standee Card (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* 1. Size Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            1. Acrylic Stand Size (Standard Table & Counter Sizes):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(Object.keys(STANDEE_SIZES) as StandeeSize[]).map((sizeKey) => {
              const sz = STANDEE_SIZES[sizeKey];
              const isSelected = selectedSize === sizeKey;
              return (
                <button
                  key={sizeKey}
                  type="button"
                  onClick={() => setSelectedSize(sizeKey)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all relative',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900">{sz.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sz.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Color Theme Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            2. Brand Frame Color Theme:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(STANDEE_THEMES) as StandeeTheme[]).map((thmKey) => {
              const thm = STANDEE_THEMES[thmKey];
              const isSelected = selectedTheme === thmKey;
              return (
                <button
                  key={thmKey}
                  type="button"
                  onClick={() => setSelectedTheme(thmKey)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                    isSelected
                      ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50 text-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: thm.primaryHex }}
                  />
                  <span>{thm.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Realistic 3D Acrylic Stand Preview Container */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-100/80 rounded-3xl border border-slate-200/80 overflow-hidden relative">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 no-print">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Acrylic Table Stand Live Preview ({sizeConfig.name})</span>
        </div>

        {/* ============================================================== */}
        {/* PHYSICAL ACRYLIC STAND CARD INSERT (Matches reference photo) */}
        {/* ============================================================== */}
        <div
          ref={standeeRef}
          id="acrylic-standee-card"
          className="relative max-w-sm w-full mx-auto transition-transform duration-300"
          style={{
            filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15))',
          }}
        >
          {/* Acrylic outer glass sheen and border container */}
          <div
            className="p-3 sm:p-4 rounded-3xl shadow-2xl transition-colors duration-200 relative overflow-hidden"
            style={{
              backgroundColor: theme.primaryHex,
            }}
          >
            {/* Glossy Acrylic Corner Highlights */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/20 to-transparent pointer-events-none rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-black/15 to-transparent pointer-events-none" />

            {/* Inner White Printable Card Insert */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center shadow-xs relative">
              {/* Top Header Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2 border"
                style={{
                  backgroundColor: theme.lightHex,
                  color: theme.primaryHex,
                  borderColor: theme.primaryHex + '40',
                }}
              >
                <span>{badgeText}</span>
              </div>

              {/* Business Name */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight max-w-[260px] truncate">
                {businessName}
              </h2>

              {/* Sub-location info */}
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {locationSubtitle}
              </p>

              {/* Prominent Table / Room Pill */}
              {(roomNumber || tableNumber) && (
                <div
                  className="mt-2 px-4 py-1 rounded-xl text-white font-black text-xs tracking-wider uppercase shadow-xs"
                  style={{ backgroundColor: theme.primaryHex }}
                >
                  {roomNumber ? `ROOM ${roomNumber}` : tableNumber ? tableNumber.toUpperCase() : ''}
                </div>
              )}

              {/* Center Sharp QR Code */}
              <div className="my-4 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-md">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`${businessName} QR Code`}
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center bg-slate-50 text-xs text-slate-400">
                    Generating Standee QR...
                  </div>
                )}
              </div>

              {/* Call to action */}
              <div className="space-y-0.5 max-w-[280px]">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  {ctaHeading}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  {ctaSubtext}
                </p>
              </div>

              {/* Payment App / Camera Badges Row (PhonePe, GPay, Paytm, BHIM, WhatsApp) */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 w-full flex items-center justify-around text-slate-600 px-1">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#5f259f] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    पे
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">PhonePe</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    G
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">GPay</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#00baf2] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    ₹
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">Paytm</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#097939] text-white flex items-center justify-center text-[8px] font-bold shadow-2xs">
                    UPI
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">BHIM</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#25d366] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                    WA
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">WhatsApp</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[9px] shadow-2xs">
                    📷
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5">Camera</span>
                </div>
              </div>

              {/* Bottom Strip */}
              <div
                className="mt-3 py-1.5 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 rounded-b-2xl w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-inner"
                style={{ backgroundColor: theme.primaryHex }}
              >
                <span>⚡ 100% Secure • Powered by OrderOne.in</span>
              </div>
            </div>
          </div>

          {/* 3D Acrylic Base / Foot (Visual representation of acrylic stand bottom) */}
          <div className="w-[108%] -ml-[4%] h-6 bg-gradient-to-b from-white/90 via-slate-200/80 to-slate-300/80 rounded-b-2xl shadow-xl border-t border-white/80 border-b border-slate-300/60 -mt-1 backdrop-blur-xs flex items-center justify-center no-print">
            <div className="w-16 h-1 bg-slate-400/30 rounded-full" />
          </div>
        </div>

        {/* Quick Share / Download Floating Bar (No print) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 no-print">
          <button
            onClick={handleDownloadStandeePng}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating High-Res...' : `Download ${sizeConfig.name} (PNG)`}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Standee</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Copy Direct URL'}</span>
          </button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Link</span>
          </a>
        </div>
      </div>
    </div>
  );
}
