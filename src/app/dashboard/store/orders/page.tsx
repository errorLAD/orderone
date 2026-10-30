'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Truck,
  Package,
  XCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  IndianRupee,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, OrderStatus } from '@/types';
import { formatINR, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { StoreLockedPrompt } from '@/components/dashboard/StoreLockedPrompt';

export default function StoreOrdersPage() {
  const { currentBusiness, currentRole } = useApp();
  const businessType = (currentBusiness?.category || currentBusiness?.type || '').toLowerCase();
  const isFoodBusiness = ['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'icecream', 'juice_bar', 'juice_chaat', 'hotel'].includes(businessType);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchStoreOrders = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      // Restaurant businesses use the same dashboard page for both order channels.
      // Keep the channel on each order so staff can still distinguish Store and Menu orders.
      let url = `/api/orders?businessId=${currentBusiness.id}`;
      if (!isFoodBusiness) url += '&sourceType=store';
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const nextOrders = Array.isArray(data.orders) ? data.orders : [];
        setOrders(nextOrders);
        if (selectedOrder) {
          const fresh = nextOrders.find((o: Order) => o.id === selectedOrder.id);
          if (fresh) setSelectedOrder(fresh);
        }
      }
    } catch (e) {
      console.error('Error fetching store orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreOrders();
  }, [currentBusiness?.id, selectedStatus, searchQuery]);

  // Realtime Supabase / SSE Live Updates & Polling Fallback
  useEffect(() => {
    if (!currentBusiness) return;

    let eventSource: EventSource | null = null;
    try {
      const realtimeUrl = `/api/realtime?businessId=${currentBusiness.id}${isFoodBusiness ? '' : '&sourceType=store'}`;
      eventSource = new EventSource(realtimeUrl);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'ORDER_CREATED' || parsed.type === 'NEW_ORDER' || parsed.type === 'ORDER_UPDATED') {
            fetchStoreOrders();
          }
        } catch (e) {}
      };
    } catch (err) {}

    // 8-second polling fallback
    const interval = setInterval(() => {
      fetchStoreOrders();
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [currentBusiness?.id, isFoodBusiness]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updatedBy: `${currentRole.toUpperCase()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStoreOrders();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: 'paid' | 'pending') => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setSelectedOrder(data.order);
        await fetchStoreOrders();
      }
    } catch (e) {
      console.error('Error updating payment status:', e);
    }
  };

  const statusTabs = [
    { id: 'all', label: isFoodBusiness ? 'All Orders' : 'All Store Orders' },
    { id: 'new', label: 'New Orders' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'preparing', label: isFoodBusiness ? 'Preparing / Packing' : 'Packing' },
    { id: 'ready', label: isFoodBusiness ? 'Ready' : 'Ready for Dispatch' },
    { id: 'completed', label: isFoodBusiness ? 'Completed' : 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Restaurant accounts can view both order channels here; each order remains source-labelled. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Store className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {isFoodBusiness ? 'Restaurant & Store Orders' : 'Retail Store Orders'}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
              {isFoodBusiness ? 'Dining Menu + Store' : 'Store Only (S-Prefix)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isFoodBusiness
              ? 'Dining Menu and Store orders are shown together here and marked by source.'
              : 'Orders placed via the digital Store storefront.'}
            {isFoodBusiness && (
              <> For kitchen tickets and table service, open{' '}
                <Link href="/dashboard/menu/orders" className="font-semibold text-indigo-600 hover:underline">Kitchen Orders &amp; KOT</Link>.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStoreOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {statusTabs.map((tab) => {
            const count =
              tab.id === 'all'
                ? orders.length
                : orders.filter((o) => o.orderStatus === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border flex items-center gap-1.5',
                  selectedStatus === tab.id
                    ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      selectedStatus === tab.id
                        ? 'bg-white/25 text-white'
                        : tab.id === 'new'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isFoodBusiness ? 'Search by token, customer or phone...' : 'Search by S-token, customer or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>
      </div>

      {/* Orders List & Drawer View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Orders Table/Cards */}
        <div className="lg:col-span-2 space-y-3">
          {loading && orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-6">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">
                {isFoodBusiness ? 'No Restaurant or Store Orders Found' : 'No Store Orders Found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isFoodBusiness
                  ? 'No orders match the selected filters. New Store and Dining Menu orders will appear here.'
                  : 'No orders match your filter. Customers ordering from the public Store storefront will generate tokens here.'}
              </p>
              {isFoodBusiness && (
                <Link
                  href="/dashboard/menu/orders"
                  className="inline-flex min-h-10 items-center justify-center mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                >
                  Open Kitchen Orders &amp; KOT
                </Link>
              )}
            </div>
          ) : (
            orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    'p-4 bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-xs',
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/10'
                      : 'border-slate-200/80 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 font-black text-sky-700 text-sm tracking-wide">
                        {order.tokenNumber}
                      </div>
                      {isFoodBusiness && (
                        <span className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap',
                          order.sourceType === 'menu' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        )}>
                          {order.sourceType === 'menu' ? 'Dining Menu' : 'Store'}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold text-slate-900">
                            {order.customer.name}
                          </div>
                          {(order.customer.tableNumber || order.customer.roomNumber) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {order.customer.roomNumber ? `Room ${order.customer.roomNumber}` : order.customer.tableNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {order.customer.phone || 'No phone'} • {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {formatINR(order.total)}
                      </div>
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1',
                          order.orderStatus === 'new' && 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                          order.orderStatus === 'accepted' && 'bg-blue-50 text-blue-700 border border-blue-200',
                          order.orderStatus === 'preparing' && 'bg-amber-50 text-amber-700 border border-amber-200',
                          order.orderStatus === 'ready' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          order.orderStatus === 'completed' && 'bg-emerald-100 text-emerald-800 font-bold',
                          order.orderStatus === 'cancelled' && 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Items */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="truncate max-w-[280px] sm:max-w-[400px]">
                      {order.items
                        .map((i) => {
                          const variantOrSize =
                            i.selectedVariant?.name || [i.size, i.unit].filter(Boolean).join(' ');
                          return `${i.productName}${
                            variantOrSize ? ` (${variantOrSize})` : ''
                          } (x${i.quantity})`;
                        })
                        .join(', ')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 shrink-0">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      <span className="capitalize">{order.fulfilmentMethod}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Detailed Order Card (Desktop sticky view) */}
        <div className="hidden lg:block lg:col-span-1">
          {selectedOrder ? (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                    {selectedOrder.sourceType === 'menu' ? 'Dining Menu Order Details' : 'Store Order Details'}
                  </span>
                  <div className="text-xl font-black text-slate-900">
                    {selectedOrder.tokenNumber}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/track/${selectedOrder.trackingId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    <span>Customer View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">{selectedOrder.customer.name}</p>
                  {(selectedOrder.customer.tableNumber || selectedOrder.customer.roomNumber) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                      📍 {selectedOrder.customer.roomNumber ? `Room ${selectedOrder.customer.roomNumber}` : selectedOrder.customer.tableNumber}
                    </span>
                  )}
                </div>
                <p className="text-slate-500">{selectedOrder.customer.phone || 'No phone'}</p>
                {selectedOrder.customer.address && (
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                    📍 {selectedOrder.customer.address}
                  </p>
                )}
                {selectedOrder.customer.notes && (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded-lg text-[11px]">
                    Note: {selectedOrder.customer.notes}
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Purchased Items ({selectedOrder.items.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">
                          {item.quantity}x {item.productName}
                        </span>
                        {item.selectedVariant ? (
                          <div className="text-[10px] text-sky-700 font-semibold">
                            Size / Variant: {item.selectedVariant.name}
                          </div>
                        ) : (item.size || item.unit) ? (
                          <div className="text-[10px] text-slate-500 font-medium">
                            Unit / Size: {[item.size, item.unit].filter(Boolean).join(' • ')}
                          </div>
                        ) : null}
                      </div>
                      <span className="font-medium text-slate-900">{formatINR(item.itemTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.tax > 0 && (
                  <div className="flex justify-between">
                    <span>GST / Taxes:</span>
                    <span>{formatINR(selectedOrder.tax)}</span>
                  </div>
                )}
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>{formatINR(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Amount:</span>
                  <span>{formatINR(selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span>Payment:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'capitalize font-bold px-1.5 py-0.5 rounded text-[10px]',
                        selectedOrder.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : selectedOrder.paymentStatus === 'pending_verification'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {selectedOrder.paymentStatus.replace('_', ' ')} ({selectedOrder.paymentMethod})
                    </span>
                    {selectedOrder.paymentStatus === 'pending_verification' && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'paid')}
                        className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                      >
                        Verify & Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Store Owner / Staff */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500">Update Order Status:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedOrder.orderStatus === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted')}
                      className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 col-span-2"
                    >
                      Accept Order
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                      className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 col-span-2"
                    >
                      {selectedOrder.sourceType === 'menu' ? 'Start Preparing' : 'Mark as Packing / Preparing'}
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 col-span-2"
                    >
                      {selectedOrder.sourceType === 'menu' ? 'Mark as Ready' : 'Ready for Pickup / Dispatch'}
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 col-span-2"
                    >
                      {selectedOrder.sourceType === 'menu' ? 'Mark as Completed / Served' : 'Mark as Completed / Delivered'}
                    </button>
                  )}

                  {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100 col-span-2"
                    >
                      Cancel Order & Restore Stock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              Select an order from the list to view items, address, and dispatch controls.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Modal / Bottom Sheet for Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom-4 duration-200 pb-safe">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                  {selectedOrder.sourceType === 'menu' ? 'Dining Menu Order Details' : 'Store Order Details'}
                </span>
                <div className="text-xl font-black text-slate-900">
                  {selectedOrder.tokenNumber}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/track/${selectedOrder.trackingId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  <span>Track Live</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800">{selectedOrder.customer.name}</p>
                {(selectedOrder.customer.tableNumber || selectedOrder.customer.roomNumber) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                    📍 {selectedOrder.customer.roomNumber ? `Room ${selectedOrder.customer.roomNumber}` : selectedOrder.customer.tableNumber}
                  </span>
                )}
              </div>
              <p className="text-slate-500">{selectedOrder.customer.phone || 'No phone'}</p>
              {selectedOrder.customer.address && (
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                  📍 {selectedOrder.customer.address}
                </p>
              )}
              {selectedOrder.customer.notes && (
                <p className="text-amber-800 bg-amber-50 p-2.5 rounded-lg text-[11px]">
                  Note: {selectedOrder.customer.notes}
                </p>
              )}
            </div>

            {/* Items List */}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Purchased Items ({selectedOrder.items.length})
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {item.quantity}x {item.productName}
                      </span>
                      {item.selectedVariant ? (
                        <div className="text-[10px] text-sky-700 font-semibold">
                          Size / Variant: {item.selectedVariant.name}
                        </div>
                      ) : (item.size || item.unit) ? (
                        <div className="text-[10px] text-slate-500 font-medium">
                          Unit / Size: {[item.size, item.unit].filter(Boolean).join(' • ')}
                        </div>
                      ) : null}
                    </div>
                    <span className="font-medium text-slate-900">{formatINR(item.itemTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing breakdown */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatINR(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.tax > 0 && (
                <div className="flex justify-between">
                  <span>GST / Taxes:</span>
                  <span>{formatINR(selectedOrder.tax)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>{formatINR(selectedOrder.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Total Amount:</span>
                <span>{formatINR(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span>Payment:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'capitalize font-bold px-1.5 py-0.5 rounded text-[10px]',
                      selectedOrder.paymentStatus === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedOrder.paymentStatus === 'pending_verification'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {selectedOrder.paymentStatus.replace('_', ' ')} ({selectedOrder.paymentMethod})
                  </span>
                  {selectedOrder.paymentStatus === 'pending_verification' && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'paid')}
                      className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    >
                      Verify & Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons for Store Owner / Staff */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-500">Update Order Status:</div>
              <div className="grid grid-cols-2 gap-2">
                {selectedOrder.orderStatus === 'new' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted')}
                    className="px-3 py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 col-span-2 shadow-xs"
                  >
                    Accept Order
                  </button>
                )}

                {selectedOrder.orderStatus === 'accepted' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                    className="px-3 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 col-span-2 shadow-xs"
                  >
                    {selectedOrder.sourceType === 'menu' ? 'Start Preparing' : 'Mark as Packing / Preparing'}
                  </button>
                )}

                {selectedOrder.orderStatus === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                    className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 col-span-2 shadow-xs"
                  >
                    {selectedOrder.sourceType === 'menu' ? 'Mark as Ready' : 'Ready for Pickup / Dispatch'}
                  </button>
                )}

                {selectedOrder.orderStatus === 'ready' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    className="px-3 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 col-span-2 shadow-xs"
                  >
                    {selectedOrder.sourceType === 'menu' ? 'Mark as Completed / Served' : 'Mark as Completed / Delivered'}
                  </button>
                )}

                {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium hover:bg-rose-100 col-span-2"
                  >
                    Cancel Order & Restore Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
