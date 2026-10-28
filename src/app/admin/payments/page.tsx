'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  Eye,
  Edit,
  Ban,
  X
} from 'lucide-react';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface PaymentRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  planId: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
  notes?: string;
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');

  // View modal
  const [viewPayment, setViewPayment] = useState<PaymentRow | null>(null);

  // Edit modal
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editStatus, setEditStatus] = useState('completed');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Refund Modal State
  const [refundPayment, setRefundPayment] = useState<PaymentRow | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  // Cancel / Void Modal State
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    paymentId: string;
    amount: number;
  }>({
    isOpen: false,
    paymentId: '',
    amount: 0,
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (providerFilter) params.set('provider', providerFilter);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, providerFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleProcessRefund = async (reason: string) => {
    if (!refundPayment) return;
    try {
      setRefundLoading(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: refundPayment.id,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setShowRefundModal(false);
      fetchPayments();
    } catch (err: any) {
      alert(`Refund error: ${err.message}`);
    } finally {
      setRefundLoading(false);
    }
  };

  const openEditModal = (p: PaymentRow) => {
    setEditPayment(p);
    setEditStatus(p.status || 'completed');
    setEditNotes(p.notes || '');
    setEditReason('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;
    if (!editReason.trim() || editReason.trim().length < 3) {
      setEditError('A documented reason is required to update payment record.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: editPayment.id,
          status: editStatus,
          notes: editNotes.trim(),
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payment');
      }

      setEditPayment(null);
      fetchPayments();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCancelPayment = async (reason: string) => {
    const res = await fetch('/api/admin/payments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: cancelModal.paymentId,
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to cancel payment');
    }

    fetchPayments();
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments & Gateway Transactions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile Razorpay transactions, inspect gateway payloads, adjust settlement notes, or process refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/reports?format=csv&exportType=payments&period=30d"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV (30d)
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by business name, Razorpay Payment ID or Order ID..."
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
              <option value="">All Statuses</option>
              <option value="completed">Completed / Settled</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Providers</option>
              <option value="razorpay">Razorpay</option>
              <option value="manual">Manual / Offline</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
            >
              Filter
            </button>

            {(search || statusFilter || providerFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setProviderFilter('');
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

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Subscription Transactions ({total})
            </h2>
          </div>
          <button
            onClick={fetchPayments}
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
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway Reference IDs</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Fetching payment records from database...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment transactions recorded matching criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isCompleted = p.status === 'completed';
                  const isRefunded = p.status === 'refunded';
                  const isFailed = p.status === 'failed';
                  const isCancelled = p.status === 'cancelled';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(p.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <Link
                            href={`/admin/businesses/${p.businessId}`}
                            className="hover:underline text-slate-900"
                          >
                            {p.businessName || 'Business'}
                          </Link>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          /{p.businessSlug || p.businessId.slice(0, 8)}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            p.planId === 'plan_gold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : p.planId === 'plan_diamond'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {p.planId === 'plan_gold'
                            ? 'Gold ₹149'
                            : p.planId === 'plan_diamond'
                            ? 'Diamond ₹249'
                            : 'Basic ₹49'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{Number(p.amount || 0).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">
                          {p.paymentProvider || 'razorpay'}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 space-y-0.5">
                        {p.razorpayPaymentId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">PayID:</span>
                            <span className="font-semibold text-slate-800">{p.razorpayPaymentId}</span>
                          </div>
                        ) : null}
                        {p.razorpayOrderId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">OrderID:</span>
                            <span>{p.razorpayOrderId}</span>
                          </div>
                        ) : null}
                        {!p.razorpayPaymentId && !p.razorpayOrderId && (
                          <span className="text-slate-400 italic">No gateway ref</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRefunded
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : isFailed
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isCancelled
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                          {isRefunded && <RotateCcw className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {/* View */}
                        <button
                          onClick={() => setViewPayment(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition shadow-2xs"
                          title="View Payment Details"
                        >
                          <Eye className="w-3 h-3 text-slate-500" /> View
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition shadow-2xs"
                          title="Edit Status / Notes"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" /> Edit
                        </button>

                        {/* Refund if completed */}
                        {isCompleted && (
                          <button
                            onClick={() => {
                              setRefundPayment(p);
                              setShowRefundModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition shadow-xs"
                            title="Process Refund"
                          >
                            <RotateCcw className="w-3 h-3" /> Refund
                          </button>
                        )}

                        {/* Cancel / Void if pending */}
                        {!isCompleted && !isRefunded && !isCancelled && (
                          <button
                            onClick={() =>
                              setCancelModal({
                                isOpen: true,
                                paymentId: p.id,
                                amount: p.amount,
                              })
                            }
                            className="inline-flex items-center p-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded transition"
                            title="Cancel / Void Transaction"
                          >
                            <Ban className="w-3.5 h-3.5 text-slate-500" />
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
            Showing {payments.length > 0 ? (page - 1) * 15 + 1 : 0} to{' '}
            {Math.min(page * 15, total)} of {total} payments
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

      {/* View Transaction Modal */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Payment Transaction Receipt</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {viewPayment.id}</p>
              </div>
              <button onClick={() => setViewPayment(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Business:</span>
                <span className="font-bold text-slate-900">{viewPayment.businessName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900 text-sm">₹{Number(viewPayment.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold uppercase text-emerald-700">{viewPayment.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Provider:</span>
                <span className="font-mono text-slate-800 uppercase">{viewPayment.paymentProvider || 'razorpay'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Razorpay Payment ID:</span>
                <span className="font-mono text-slate-800">{viewPayment.razorpayPaymentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Razorpay Order ID:</span>
                <span className="font-mono text-slate-800">{viewPayment.razorpayOrderId || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-800">{new Date(viewPayment.createdAt).toLocaleString()}</span>
              </div>
              {viewPayment.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-0.5">Notes:</span>
                  <p className="p-2 bg-slate-50 rounded text-slate-700 font-mono text-[11px]">{viewPayment.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Payment Record</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {editPayment.id}</p>
              </div>
              <button onClick={() => setEditPayment(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
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
                <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g., Verified bank NEFT transaction or reconciled chargeback."
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
                  placeholder="Specify documented reason for modifying payment ledger..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditPayment(null)}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundPayment && (
        <AdminConfirmModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onConfirm={handleProcessRefund}
          title="Process Transaction Refund"
          description={`Are you sure you want to mark payment ${refundPayment.razorpayPaymentId || refundPayment.id} (₹${refundPayment.amount}) as refunded? This updates the financial ledger and logs an administrative audit entry.`}
          confirmText="Confirm & Record Refund"
          variant="danger"
          requireReason={true}
        />
      )}

      {/* Cancel / Void Modal */}
      <AdminConfirmModal
        isOpen={cancelModal.isOpen}
        title={`Cancel Payment Transaction #${cancelModal.paymentId.slice(0, 8)}`}
        description={`Cancelling this unverified transaction (₹${cancelModal.amount}) marks it as void in the financial ledger while preserving the accounting trail.`}
        confirmText="Confirm Transaction Cancellation"
        variant="danger"
        requireReason={true}
        onConfirm={handleCancelPayment}
        onClose={() => setCancelModal({ isOpen: false, paymentId: '', amount: 0 })}
      />
    </div>
  );
}
