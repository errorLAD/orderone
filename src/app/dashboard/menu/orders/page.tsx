'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Search,
  CheckCircle,
  Clock,
  Flame,
  BellRing,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Table,
  IndianRupee,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, OrderStatus } from '@/types';
import { formatINR, formatDate, cn } from '@/lib/utils';

export default function MenuOrdersPage() {
  const { currentBusiness, currentRole } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchMenuOrders = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      // STRICT REQUIREMENT: sourceType=menu is explicitly enforced on backend!
      let url = `/api/orders?businessId=${currentBusiness.id}&sourceType=menu`;
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        if (selectedOrder) {
          const fresh = data.orders.find((o: Order) => o.id === selectedOrder.id);
          if (fresh) setSelectedOrder(fresh);
        }
      }
    } catch (e) {
      console.error('Error fetching menu orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuOrders();
  }, [currentBusiness?.id, selectedStatus, searchQuery]);

  // Realtime Supabase / SSE Live Updates & Polling Fallback
  useEffect(() => {
    if (!currentBusiness) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/realtime?businessId=${currentBusiness.id}&sourceType=menu`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'ORDER_CREATED' || parsed.type === 'NEW_ORDER' || parsed.type === 'ORDER_UPDATED') {
            fetchMenuOrders();
          }
        } catch (e) {}
      };
    } catch (err) {}

    const interval = setInterval(() => {
      fetchMenuOrders();
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [currentBusiness?.id]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updatedBy: `Kitchen Staff (${currentRole})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMenuOrders();
      }
    } catch (e) {
      console.error('Error updating menu status:', e);
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
        await fetchMenuOrders();
      }
    } catch (e) {
      console.error('Error updating payment status:', e);
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All Menu Orders' },
    { id: 'new', label: 'New Kitchen Tickets' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'preparing', label: 'Cooking Now' },
    { id: 'ready', label: 'Ready to Serve' },
    { id: 'completed', label: 'Served' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Strict Menu Isolation Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Restaurant & Cafe Kitchen Orders (KOT)
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
              Source: Menu Only (M-Prefix)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Orders from dining tables, takeaways & beverage counters. Retail store products will never mix here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMenuOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>Refresh KOT</span>
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
                    ? 'bg-orange-600 text-white border-orange-600 font-bold shadow-xs'
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
            placeholder="Search by token, room #, table, or guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
        </div>
      </div>

      {/* Orders List & Kitchen Ticket Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Orders Table/Cards */}
        <div className="lg:col-span-2 space-y-3">
          {loading && orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              Loading Kitchen Menu tickets...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-6">
              <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Food Menu Orders</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No orders match your filter. Dine-in and takeaway orders placed via the public Menu storefront appear here.
              </p>
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
                      ? 'border-orange-500 ring-2 ring-orange-500/10'
                      : 'border-slate-200/80 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 font-black text-orange-700 text-sm tracking-wide">
                        {order.tokenNumber}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{order.customer.name}</span>
                          {order.customer.roomNumber ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                              🛏️ Room {order.customer.roomNumber}{order.customer.floorNumber ? ` (Fl ${order.customer.floorNumber})` : ''}
                            </span>
                          ) : order.customer.tableNumber ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                              🍽️ {/^(table|room)\b/i.test(order.customer.tableNumber) ? order.customer.tableNumber : `Table ${order.customer.tableNumber}`}
                            </span>
                          ) : null}
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
                          order.orderStatus === 'preparing' && 'bg-amber-100 text-amber-900 font-bold animate-pulse-subtle',
                          order.orderStatus === 'ready' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          order.orderStatus === 'completed' && 'bg-emerald-100 text-emerald-800 font-bold',
                          order.orderStatus === 'cancelled' && 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {order.orderStatus === 'preparing'
                          ? '🔥 Cooking'
                          : order.orderStatus === 'ready' && order.customer.roomNumber
                          ? '🛎️ Room Ready'
                          : order.orderStatus === 'completed' && order.customer.roomNumber
                          ? '✓ Delivered'
                          : order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Items */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="truncate max-w-[280px] sm:max-w-[400px]">
                      {order.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 shrink-0">
                      <span className="capitalize">{order.fulfilmentMethod.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Kitchen Ticket Details & Fast Prep Controls (Desktop View) */}
        <div className="hidden lg:block lg:col-span-1">
          {selectedOrder ? (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                    Kitchen Order Ticket
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
                    className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:underline"
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

              {/* Table & Customer Info */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{selectedOrder.customer.name}</span>
                  {selectedOrder.customer.roomNumber ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                      🛏️ Room {selectedOrder.customer.roomNumber}{selectedOrder.customer.floorNumber ? ` (Fl ${selectedOrder.customer.floorNumber})` : ''}
                    </span>
                  ) : selectedOrder.customer.tableNumber ? (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      🍽️ {/^(table|room)\b/i.test(selectedOrder.customer.tableNumber) ? selectedOrder.customer.tableNumber : `Table ${selectedOrder.customer.tableNumber}`}
                    </span>
                  ) : null}
                </div>
                <p className="text-slate-500">{selectedOrder.customer.phone || 'No phone provided'}</p>
                {selectedOrder.customer.notes && (
                  <p className="text-amber-900 bg-amber-50 p-2 rounded-lg text-[11px] font-medium border border-amber-200">
                    Special Request: {selectedOrder.customer.notes}
                  </p>
                )}
              </div>

              {/* Food Items with Add-ons and custom instructions */}
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Kitchen Items ({selectedOrder.items.length})
                </div>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span>{formatINR(item.itemTotal)}</span>
                      </div>
                      {item.selectedVariant && (
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Portion: {item.selectedVariant.name}
                        </div>
                      )}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <div className="text-[11px] text-orange-700 mt-0.5 font-medium">
                          Add-ons: {item.selectedAddOns.map((a) => a.name).join(', ')}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                          "{item.specialInstructions}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.tax > 0 && (
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>{formatINR(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
                  <span>Bill Total:</span>
                  <span>{formatINR(selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span>Payment Status:</span>
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

              {/* Kitchen Action Buttons */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500">Kitchen Operations:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedOrder.orderStatus === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted')}
                      className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 col-span-2"
                    >
                      Accept Ticket
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                      className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 col-span-2 flex items-center justify-center gap-1.5"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Cooking in Kitchen</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 col-span-2 flex items-center justify-center gap-1.5"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>
                        {selectedOrder.customer.roomNumber
                          ? `Ready (Dispatch to Room ${selectedOrder.customer.roomNumber})`
                          : 'Food Ready (Ring Bell / Notify Display)'}
                      </span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 col-span-2"
                    >
                      {selectedOrder.customer.roomNumber
                        ? `Mark Delivered to Room ${selectedOrder.customer.roomNumber} ✓`
                        : 'Mark as Served to Customer'}
                    </button>
                  )}

                  {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100 col-span-2"
                    >
                      Cancel Kitchen Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              Select a kitchen ticket from the list to view item instructions and cooking stages.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Modal / Bottom Sheet for Kitchen Ticket Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom-4 duration-200 pb-safe">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                  Kitchen Order Ticket
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
                  className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:underline"
                >
                  <span>Customer View</span>
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

            {/* Table & Customer Info */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{selectedOrder.customer.name}</span>
                {selectedOrder.customer.roomNumber ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                    🛏️ Room {selectedOrder.customer.roomNumber}{selectedOrder.customer.floorNumber ? ` (Fl ${selectedOrder.customer.floorNumber})` : ''}
                  </span>
                ) : selectedOrder.customer.tableNumber ? (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    🍽️ {/^(table|room)\b/i.test(selectedOrder.customer.tableNumber) ? selectedOrder.customer.tableNumber : `Table ${selectedOrder.customer.tableNumber}`}
                  </span>
                ) : null}
              </div>
              <p className="text-slate-500">{selectedOrder.customer.phone || 'No phone provided'}</p>
              {selectedOrder.customer.notes && (
                <p className="text-amber-900 bg-amber-50 p-2 rounded-lg text-[11px] font-medium border border-amber-200">
                  Special Request: {selectedOrder.customer.notes}
                </p>
              )}
            </div>

            {/* Food Items with Add-ons and custom instructions */}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Kitchen Items ({selectedOrder.items.length})
              </div>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <span>{formatINR(item.itemTotal)}</span>
                    </div>
                    {item.selectedVariant && (
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Portion: {item.selectedVariant.name}
                      </div>
                    )}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-[11px] text-orange-700 mt-0.5 font-medium">
                        Add-ons: {item.selectedAddOns.map((a) => a.name).join(', ')}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        "{item.specialInstructions}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatINR(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.tax > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>{formatINR(selectedOrder.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
                <span>Bill Total:</span>
                <span>{formatINR(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span>Payment Status:</span>
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

            {/* Kitchen Action Buttons */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-500">Kitchen Operations:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {selectedOrder.orderStatus === 'new' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted')}
                    className="px-3 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 col-span-2 shadow-xs"
                  >
                    Accept Ticket
                  </button>
                )}

                {selectedOrder.orderStatus === 'accepted' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                    className="px-3 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 col-span-2 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Start Cooking in Kitchen</span>
                  </button>
                )}

                {selectedOrder.orderStatus === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                    className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 col-span-2 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>
                      {selectedOrder.customer.roomNumber
                        ? `Ready (Dispatch to Room ${selectedOrder.customer.roomNumber})`
                        : 'Food Ready (Ring Bell / Notify Display)'}
                    </span>
                  </button>
                )}

                {selectedOrder.orderStatus === 'ready' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    className="px-3 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 col-span-2 shadow-xs"
                  >
                    {selectedOrder.customer.roomNumber
                      ? `Mark Delivered to Room ${selectedOrder.customer.roomNumber} ✓`
                      : 'Mark as Served to Customer'}
                  </button>
                )}

                {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium hover:bg-rose-100 col-span-2"
                  >
                    Cancel Kitchen Ticket
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
