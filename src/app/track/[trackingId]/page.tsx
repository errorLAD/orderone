'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Package,
  BellRing,
  Phone,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  Printer,
  FileText,
  X,
  CreditCard,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { formatINR, formatTime, cn } from '@/lib/utils';
import Link from 'next/link';

export default function GuestOrderTrackingPage({ params }: { params: { trackingId: string } }) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders/track/${params.trackingId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Order tracking not found');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000); // Polling every 4s for live customer updates
    return () => clearInterval(interval);
  }, [params.trackingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <Sparkles className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <h2 className="text-base font-bold text-slate-800">Tracking Your Order...</h2>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <Package className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-black text-slate-800">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Please check the tracking link or ask at the counter.
        </p>
      </div>
    );
  }

  const isHotelOrder = Boolean(order.businessType === 'hotel' || (order.customer?.roomNumber && !order.customer?.tableNumber && !/table/i.test(order.customer?.roomNumber)));
  const cleanRoom = order.customer?.roomNumber ? order.customer.roomNumber.replace(/^(room|table)\s*(no\.?|#)?\s*/i, '').trim() : '';
  const rawTable = (order.tableNumber || order.customer?.tableNumber || (!isHotelOrder ? order.customer?.roomNumber : '') || '').trim();
  const cleanTable = rawTable ? rawTable.replace(/^(table|room)\s*(no\.?|#)?\s*/i, '').trim() : '';

  const steps = [
    { key: 'new', label: 'Order Received', desc: isHotelOrder ? 'Sent to kitchen for room service' : 'Sent to kitchen & counter' },
    { key: 'accepted', label: 'Accepted', desc: 'Confirmed by kitchen staff' },
    { key: 'preparing', label: 'Preparing', desc: order.sourceType === 'menu' ? 'Cooking in kitchen' : 'Packing items' },
    {
      key: 'ready',
      label: isHotelOrder ? 'Ready for Delivery' : 'Ready!',
      desc: isHotelOrder
        ? `Fresh food ready, dispatching to Room ${cleanRoom || order.customer?.roomNumber}`
        : cleanTable
        ? `Fresh food ready for Table No. ${cleanTable}`
        : order.sourceType === 'menu'
        ? 'Pick up from counter / serving'
        : 'Ready for pickup / dispatch',
    },
    {
      key: 'completed',
      label: isHotelOrder ? 'Delivered to Room' : 'Completed',
      desc: isHotelOrder
        ? `Delivered to Room ${cleanRoom || order.customer?.roomNumber}. Enjoy your meal!`
        : 'Enjoy your meal!',
    },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'new': return 0;
      case 'accepted': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(order.orderStatus);

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-8 px-4 flex flex-col items-center">
      <div className="max-w-md w-full space-y-4">
        {/* Token Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-center shadow-lg relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {order.sourceType === 'store' ? 'Store Order Token' : 'Kitchen Food Token'}
          </div>

          <div
            className={cn(
              'text-5xl font-black font-mono tracking-widest my-2',
              order.sourceType === 'store' ? 'text-sky-600' : 'text-orange-600'
            )}
          >
            {order.tokenNumber}
          </div>

          <p className="text-xs font-bold text-slate-800 mt-1">
            {order.businessName}
          </p>

          {isHotelOrder ? (
            <div className="inline-block mt-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
              🛏️ Delivering to Room No. {cleanRoom || order.customer?.roomNumber}
              {order.customer?.floorNumber ? ` (Floor ${order.customer.floorNumber})` : ''}
            </div>
          ) : cleanTable ? (
            <div className="inline-block mt-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200">
              🍽️ Table No. {cleanTable}
            </div>
          ) : null}

          {/* Current Status Pill */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-xs',
                order.orderStatus === 'new' && 'bg-indigo-100 text-indigo-800',
                order.orderStatus === 'accepted' && 'bg-blue-100 text-blue-800',
                order.orderStatus === 'preparing' && 'bg-amber-100 text-amber-900 animate-pulse-subtle',
                order.orderStatus === 'ready' && 'bg-emerald-500 text-white animate-bounce',
                order.orderStatus === 'completed' && 'bg-emerald-100 text-emerald-800',
                order.orderStatus === 'cancelled' && 'bg-rose-100 text-rose-800'
              )}
            >
              {order.orderStatus === 'ready' ? (
                <>
                  <BellRing className="w-4 h-4" />
                  <span>{isHotelOrder ? `READY FOR ROOM DELIVERY!` : `READY FOR PICKUP!`}</span>
                </>
              ) : order.orderStatus === 'completed' && isHotelOrder ? (
                <span>DELIVERED TO ROOM</span>
              ) : (
                <span>Status: {order.orderStatus}</span>
              )}
            </span>
          </div>
        </div>

        {/* Status Stepper Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-xs mb-4">Live Order Progress</h3>
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-3 top-6 w-0.5 h-7',
                        isPast ? 'bg-emerald-500' : 'bg-slate-200'
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 transition-colors',
                      isPast && 'bg-emerald-500 text-white',
                      isCurrent && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                      !isPast && !isCurrent && 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-bold leading-none',
                        isCurrent ? 'text-indigo-600' : isPast ? 'text-slate-900' : 'text-slate-400'
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {order.paymentStatus === 'pending_verification' && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>📱 UPI Payment Pending Verification</span>
            </p>
            <p className="text-[11px] text-amber-800">
              Your order token is generated! The merchant will verify your UPI transaction reference against token #{order.tokenNumber} upon order handover.
            </p>
          </div>
        )}

        {/* Order Items & Receipt Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
          <h3 className="font-bold text-slate-900">Order Summary</h3>
          <div className="space-y-2 divide-y divide-slate-100">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="pt-2 first:pt-0 flex justify-between">
                <div>
                  <span className="font-semibold text-slate-800">
                    {item.quantity}x {item.productName}
                  </span>
                  {item.selectedVariant && (
                    <p className="text-[10px] text-slate-500">Portion: {item.selectedVariant.name}</p>
                  )}
                </div>
                <span className="font-bold text-slate-900">{formatINR(item.itemTotal)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            {order.tax > 0 && (
              <>
                <div className="flex justify-between">
                  <span>
                    GST {order.taxBreakdown?.gstRate ? `(${order.taxBreakdown.gstRate}%)` : ''}:
                  </span>
                  <span>{formatINR(order.tax)}</span>
                </div>
                {order.taxBreakdown?.cgst > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                    <span>• CGST:</span>
                    <span>{formatINR(order.taxBreakdown.cgst)}</span>
                  </div>
                )}
                {order.taxBreakdown?.sgst > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                    <span>• SGST:</span>
                    <span>{formatINR(order.taxBreakdown.sgst)}</span>
                  </div>
                )}
                {order.taxBreakdown?.isTaxInclusive && (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    (Prices are inclusive of GST)
                  </p>
                )}
              </>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span>{formatINR(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
              <span>Total Paid / Payable:</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>

          {/* Invoice / Receipt Action Button */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>
                {order.taxBreakdown?.gstin ? 'View Official Tax Invoice' : 'View Order Receipt'}
              </span>
            </button>
          </div>
        </div>

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl relative font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#4F46E5]">
                  {order.taxBreakdown?.gstin ? 'OFFICIAL TAX INVOICE' : 'CUSTOMER ORDER RECEIPT'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <h3 className="font-black text-slate-900 text-base">
                  {order.taxBreakdown?.legalBusinessName || order.businessName}
                </h3>
                {order.taxBreakdown?.registeredAddress && (
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                    {order.taxBreakdown.registeredAddress}
                  </p>
                )}
                {order.taxBreakdown?.gstin && (
                  <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                    GSTIN: {order.taxBreakdown.gstin}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold text-slate-700">Invoice No:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {order.invoiceNumber || (order.taxBreakdown?.invoiceNumber) || `INV-${order.tokenNumber}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700">Token:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">#{order.tokenNumber}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Customer:</span>{' '}
                  <span>{order.customer?.name || 'Guest Customer'}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700">Date:</span>{' '}
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-y border-slate-200 divide-y divide-slate-100 text-xs">
                {order.items.map((it: any, idx: number) => (
                  <div key={idx} className="py-2 flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {it.quantity}x {it.productName}
                      </p>
                      {it.selectedVariant && (
                        <p className="text-[10px] text-slate-500">{it.selectedVariant.name}</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {formatINR(it.itemTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono">{formatINR(order.taxBreakdown?.taxableAmount || order.subtotal)}</span>
                </div>

                {order.tax > 0 && (
                  <>
                    <div className="flex justify-between text-indigo-900 font-medium">
                      <span>CGST ({((order.taxBreakdown?.gstRate || 0) / 2)}%):</span>
                      <span className="font-mono">{formatINR(order.taxBreakdown?.cgst || order.tax / 2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-900 font-medium">
                      <span>SGST ({((order.taxBreakdown?.gstRate || 0) / 2)}%):</span>
                      <span className="font-mono">{formatINR(order.taxBreakdown?.sgst || order.tax / 2)}</span>
                    </div>
                  </>
                )}

                {order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span className="font-mono">{formatINR(order.deliveryFee)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatINR(order.total)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400">
                Payment Status: <span className="font-bold text-slate-700 uppercase">{order.paymentStatus}</span> ({order.paymentMethod})
              </div>
            </div>
          </div>
        )}

        {/* Social & Google Reviews Card (Only if configured by business owner) */}
        {(() => {
          const rawGoogle = order.socialLinks?.googleBusiness?.trim() || '';
          const isGoogleEnabled = order.socialLinks?.googleBusinessEnabled !== false;
          const googleUrl = isGoogleEnabled && rawGoogle 
            ? (rawGoogle.startsWith('http') ? rawGoogle : `https://${rawGoogle}`) 
            : '';

          const rawInstagram = order.socialLinks?.instagram?.trim() || '';
          const isInstagramEnabled = order.socialLinks?.instagramEnabled !== false;
          const instagramUrl = isInstagramEnabled && rawInstagram 
            ? (rawInstagram.startsWith('http') ? rawInstagram : `https://${rawInstagram.startsWith('@') ? `instagram.com/${rawInstagram.slice(1)}` : rawInstagram}`) 
            : '';

          if (!googleUrl && !instagramUrl) return null;

          return (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Support {order.businessName}</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Loved your experience? Leave a review or follow us online:
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {googleUrl && (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl transition text-xs font-semibold text-slate-800 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <div className="truncate">
                        <span>Rate store on Google</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                  </a>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-xl transition text-xs font-semibold text-slate-800 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shrink-0 text-white">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <span>Follow on Instagram</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition" />
                  </a>
                )}
              </div>
            </div>
          );
        })()}

        {/* Contact info */}
        {order.businessPhone && (
          <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>Questions? Call Store:</span>
            </div>
            <a href={`tel:${order.businessPhone}`} className="font-bold text-indigo-600 hover:underline">
              {order.businessPhone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
