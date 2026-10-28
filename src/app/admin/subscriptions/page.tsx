'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Edit3, 
  ArrowUpRight,
  ShieldAlert,
  RefreshCw,
  X,
  Eye,
  Trash2,
  Ban,
  Check
} from 'lucide-react';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface SubscriptionRow {
  businessId: string;
  businessName: string;
  businessSlug: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  status: string;
  startDate?: string;
  renewsAt?: string;
  daysRemaining?: number;
  paymentProvider?: string;
}

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // View Modal State
  const [viewSub, setViewSub] = useState<SubscriptionRow | null>(null);

  // Edit / Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionRow | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('plan_basic');
  const [targetStatus, setTargetStatus] = useState('active');
  const [extendDays, setExtendDays] = useState<number>(30);
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Cancel / Archive Modal State
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    businessId: string;
    businessName: string;
  }>({
    isOpen: false,
    businessId: '',
    businessName: '',
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (planFilter) params.set('planId', planFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, planFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const openAdjustmentModal = (sub: SubscriptionRow) => {
    setSelectedSub(sub);
    setTargetPlanId(sub.planId || 'plan_basic');
    setTargetStatus(sub.status || 'active');
    setExtendDays(30);
    setAdjustReason('');
    setModalError(null);
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      setModalError('Please provide a specific documented reason.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedSub.businessId,
          newPlanId: targetPlanId,
          newStatus: targetStatus,
          extendDays: Number(extendDays) || 0,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust subscription');
      }

      setAdjustModalOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (reason: string) => {
    const res = await fetch(`/api/admin/subscriptions/${cancelModal.businessId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to cancel subscription');
    }

    await fetchSubscriptions();
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscriptions Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete lifecycle controls: View active validity, Edit plan tier and extend days, or Cancel subscriptions with audit tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Configure Plan Tiers <ArrowUpRight className="w-3.5 h-3.5" />
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
              placeholder="Search by business name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Plans</option>
              <option value="plan_basic">Basic (₹49/mo)</option>
              <option value="plan_gold">Gold (₹149/mo)</option>
              <option value="plan_diamond">Diamond (₹249/mo)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
            >
              Search
            </button>

            {(search || planFilter || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPlanFilter('');
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

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Active & Historic Subscriptions ({total})
            </h2>
          </div>
          <button
            onClick={fetchSubscriptions}
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
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Subscription Status</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Remaining Days</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No subscriptions matching your filters found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isActive = sub.status === 'active';
                  const isCancelled = sub.status === 'cancelled';
                  const isExpiringSoon = sub.daysRemaining !== undefined && sub.daysRemaining <= 5 && sub.daysRemaining > 0;
                  const isExpired = sub.daysRemaining !== undefined && sub.daysRemaining <= 0;

                  return (
                    <tr key={sub.businessId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <Link
                            href={`/admin/businesses/${sub.businessId}`}
                            className="hover:underline text-slate-900"
                          >
                            {sub.businessName}
                          </Link>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          /{sub.businessSlug}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            sub.planId === 'plan_gold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : sub.planId === 'plan_diamond'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {sub.planName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCancelled
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sub.renewsAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(sub.renewsAt).toLocaleDateString()}
                          </div>
                        ) : (
                          'No expiry set'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {sub.daysRemaining !== undefined && !isCancelled ? (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isExpired
                                ? 'text-red-600'
                                : isExpiringSoon
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {sub.daysRemaining > 0 ? `${sub.daysRemaining} days left` : 'Expired'}
                          </span>
                        ) : isCancelled ? (
                          <span className="text-slate-400">Cancelled</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {/* View */}
                        <button
                          onClick={() => setViewSub(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition shadow-2xs"
                          title="View Subscription"
                        >
                          <Eye className="w-3 h-3 text-slate-500" /> View
                        </button>

                        {/* Edit / Adjust */}
                        <button
                          onClick={() => openAdjustmentModal(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition shadow-2xs"
                          title="Edit / Adjust Subscription"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>

                        {/* Cancel / Archive (archive instead of hard deletion) */}
                        {!isCancelled && (
                          <button
                            onClick={() =>
                              setCancelModal({
                                isOpen: true,
                                businessId: sub.businessId,
                                businessName: sub.businessName,
                              })
                            }
                            className="inline-flex items-center p-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition"
                            title="Cancel Subscription"
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
            Showing {subscriptions.length > 0 ? (page - 1) * 15 + 1 : 0} to{' '}
            {Math.min(page * 15, total)} of {total} subscriptions
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

      {/* View Subscription Modal */}
      {viewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Subscription Dossier</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Business: <strong className="text-slate-800">{viewSub.businessName}</strong>
                </p>
              </div>
              <button onClick={() => setViewSub(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Active Tier:</span>
                <span className="font-bold text-slate-900">{viewSub.planName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold uppercase text-emerald-700">{viewSub.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Renewal Timestamp:</span>
                <span className="font-mono text-slate-800">
                  {viewSub.renewsAt ? new Date(viewSub.renewsAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Remaining Period:</span>
                <span className="font-semibold text-slate-800">
                  {viewSub.daysRemaining !== undefined ? `${viewSub.daysRemaining} days` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Owner Email:</span>
                <span className="text-slate-800">{viewSub.ownerEmail || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <Link
                href={`/admin/businesses/${viewSub.businessId}`}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Go to Business Dossier →
              </Link>
              <button
                onClick={() => setViewSub(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Subscription Adjustment Modal */}
      {adjustModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit / Adjust Subscription</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Business: <span className="font-semibold text-slate-800">{selectedSub.businessName}</span>
                </p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Plan Tier
                </label>
                <select
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="plan_basic">Basic Plan — ₹49/mo (Menu only, 20 items / 10 categories)</option>
                  <option value="plan_gold">Gold Plan — ₹149/mo (Store + Menu + UPI + GST, 50 items / 30 categories)</option>
                  <option value="plan_diamond">Diamond Plan — ₹249/mo (Enterprise Admin Tier)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subscription Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Extend Days (+Validity)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documented Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Upgraded to Gold via offline invoice or added 30 courtesy days."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel / Archive Confirmation Modal */}
      <AdminConfirmModal
        isOpen={cancelModal.isOpen}
        title={`Cancel Subscription: ${cancelModal.businessName}`}
        description="Cancelling this subscription revokes paid tier privileges immediately while safely preserving all historical invoices and payment transaction records."
        confirmText="Confirm Subscription Cancellation"
        variant="danger"
        requireReason={true}
        onConfirm={handleCancelSubscription}
        onClose={() => setCancelModal({ isOpen: false, businessId: '', businessName: '' })}
      />
    </div>
  );
}
