'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  Search, 
  Filter, 
  Coffee, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Building2, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Phone, 
  Clock, 
  ChefHat, 
  Flame,
  Ban,
  AlertCircle
} from 'lucide-react';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

interface OrderRecord {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessType: string;
  tokenNumber: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    table?: string;
  };
  items: OrderItem[];
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  notes?: string;
}

export default function AdminMenuOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Edit Order Modal State
  const [editOrder, setEditOrder] = useState<OrderRecord | null>(null);
  const [editStatus, setEditStatus] = useState('new');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editTable, setEditTable] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Cancel Order Modal State
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    orderId: string;
    tokenNumber: string;
  }>({
    isOpen: false,
    orderId: '',
    tokenNumber: '',
  });

  const fetchMenuOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('sourceType', 'menu');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load menu orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMenuOrders();
  };

  const openEditModal = (o: OrderRecord) => {
    setEditOrder(o);
    setEditStatus(o.orderStatus || 'new');
    setEditCustomerName(o.customerInfo?.name || '');
    setEditCustomerPhone(o.customerInfo?.phone || '');
    setEditTable(o.customerInfo?.table || '');
    setEditNotes(o.notes || '');
    setEditReason('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    if (!editReason.trim() || editReason.trim().length < 3) {
      setEditError('A documented reason is required to update this kitchen ticket.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editOrder.id,
          orderStatus: editStatus,
          customerName: editCustomerName.trim(),
          customerPhone: editCustomerPhone.trim(),
          notes: editTable ? `[Table #${editTable}] ${editNotes.trim()}` : editNotes.trim(),
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update kitchen ticket');
      }

      setEditOrder(null);
      if (selectedOrder?.id === editOrder.id) {
        setSelectedOrder(null);
      }
      fetchMenuOrders();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCancelOrder = async (reason: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: cancelModal.orderId,
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to cancel order');
    }

    fetchMenuOrders();
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'served' || s === 'completed' || s === 'delivered') {
      return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Served / Completed</span>;
    }
    if (s === 'ready') {
      return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Ready for Service</span>;
    }
    if (s === 'cooking' || s === 'preparing') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Flame className="w-3 h-3 text-amber-600" /> Cooking
        </span>
      );
    }
    if (s === 'accepted') {
      return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Accepted by Kitchen</span>;
    }
    if (s === 'cancelled' || s === 'rejected') {
      return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Cancelled</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">New Order</span>;
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Kitchen & Dining Menu Orders</h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-semibold">
              Restaurants & Cafes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time kitchen order tickets (KOT), live token status, and dining room fulfillment across food businesses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders/store"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            Switch to Retail Store Orders →
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by token #, restaurant name, diner name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Kitchen Statuses</option>
              <option value="new">New Ticket</option>
              <option value="accepted">Accepted</option>
              <option value="cooking">Cooking / In Preparation</option>
              <option value="ready">Ready to Serve</option>
              <option value="served">Served / Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
            >
              Filter
            </button>

            {(search || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Kitchen Orders Directory ({total})
            </h2>
          </div>
          <button
            onClick={fetchMenuOrders}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Token & Time</th>
                <th className="py-3 px-4">Restaurant / Cafe</th>
                <th className="py-3 px-4">Diner / Table</th>
                <th className="py-3 px-4">Menu Items</th>
                <th className="py-3 px-4">Bill Total</th>
                <th className="py-3 px-4">Kitchen Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Fetching kitchen order tickets...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No kitchen orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const itemCount = o.items ? o.items.reduce((acc, i) => acc + (i.quantity || 1), 0) : 0;
                  const isCancelled = o.orderStatus === 'cancelled';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          #{o.tokenNumber || o.id.slice(0, 6)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(o.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <Link
                            href={`/admin/businesses/${o.businessId}`}
                            className="hover:underline text-slate-900"
                          >
                            {o.businessName}
                          </Link>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          /{o.businessSlug}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {o.customerInfo?.name || 'Walk-in Diner'}
                        </div>
                        {o.customerInfo?.table && (
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Table #{o.customerInfo.table}
                          </div>
                        )}
                        {o.customerInfo?.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {o.customerInfo.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{itemCount} items</span>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {o.items?.map((it) => it.name).join(', ') || 'No item details'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{Number(o.total || 0).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          {o.paymentStatus || 'pending'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(o.orderStatus)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {/* View */}
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition shadow-2xs"
                          title="View Order Details"
                        >
                          <Eye className="w-3 h-3 text-slate-500" /> View
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition shadow-2xs"
                          title="Edit Kitchen Status"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" /> Edit
                        </button>

                        {/* Cancel / Archive */}
                        {!isCancelled && (
                          <button
                            onClick={() =>
                              setCancelModal({
                                isOpen: true,
                                orderId: o.id,
                                tokenNumber: o.tokenNumber || o.id.slice(0, 6),
                              })
                            }
                            className="inline-flex items-center p-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition"
                            title="Cancel Order"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {orders.length > 0 ? (page - 1) * 15 + 1 : 0} to{' '}
            {Math.min(page * 15, total)} of {total} kitchen orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Kitchen Order #{selectedOrder.tokenNumber || selectedOrder.id.slice(0, 6)}
                  </h3>
                  {getStatusBadge(selectedOrder.orderStatus)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restaurant: <span className="font-semibold text-slate-800">{selectedOrder.businessName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diner Info */}
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Diner:</span>
                <span className="font-semibold text-slate-800">{selectedOrder.customerInfo?.name || 'Walk-in'}</span>
              </div>
              {selectedOrder.customerInfo?.table && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Table Number:</span>
                  <span className="font-bold text-slate-900">Table #{selectedOrder.customerInfo.table}</span>
                </div>
              )}
              {selectedOrder.customerInfo?.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-800">{selectedOrder.customerInfo.phone}</span>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Kitchen Instructions:</span>
                  <span className="text-slate-700 italic">{selectedOrder.notes}</span>
                </div>
              )}
            </div>

            {/* Dishes Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dishes & Items</h4>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{it.name}</span>
                      <span className="text-slate-400 ml-2">x{it.quantity || 1}</span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      ₹{((it.price || 0) * (it.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Bill Total</span>
              <span className="text-lg font-extrabold text-slate-900">
                ₹{Number(selectedOrder.total || 0).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const o = selectedOrder;
                  setSelectedOrder(null);
                  openEditModal(o);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Kitchen Status
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Kitchen Order #{editOrder.tokenNumber || editOrder.id.slice(0, 6)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Restaurant: {editOrder.businessName}</p>
              </div>
              <button onClick={() => setEditOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kitchen Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="new">New Ticket</option>
                  <option value="accepted">Accepted by Kitchen</option>
                  <option value="cooking">Cooking / In Preparation</option>
                  <option value="ready">Ready to Serve</option>
                  <option value="served">Served / Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diner Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diner Phone</label>
                  <input
                    type="text"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Table Number</label>
                  <input
                    type="text"
                    value={editTable}
                    onChange={(e) => setEditTable(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kitchen Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify documented reason for modifying kitchen status..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {editSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Order Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      <AdminConfirmModal
        isOpen={cancelModal.isOpen}
        title={`Cancel Kitchen Ticket #${cancelModal.tokenNumber}`}
        description="Cancelling this order alerts the kitchen display and records an administrative audit cancellation."
        confirmText="Confirm Order Cancellation"
        variant="danger"
        requireReason={true}
        onConfirm={handleCancelOrder}
        onClose={() => setCancelModal({ isOpen: false, orderId: '', tokenNumber: '' })}
      />
    </div>
  );
}
