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
  Check,
  Receipt,
  FileCheck2,
  AlertTriangle,
  ArrowDownCircle,
  IndianRupee,
  ShieldCheck
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
  scheduledDowngradePlanId?: string;
}

interface PlanOption {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  validityDaysMonthly?: number;
  validityDaysAnnual?: number;
  maxProducts?: number;
  maxCategories?: number;
}

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // View Modal State
  const [viewSub, setViewSub] = useState<SubscriptionRow | null>(null);

  // Edit / Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionRow | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('plan_basic');
  const [targetStatus, setTargetStatus] = useState('active');
  const [scheduleDowngrade, setScheduleDowngrade] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Manual Payment Reconciliation Modal State
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileBiz, setReconcileBiz] = useState<SubscriptionRow | null>(null);
  const [reconcilePlanId, setReconcilePlanId] = useState('plan_gold');
  const [reconcileBillingCycle, setReconcileBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [reconcileAmount, setReconcileAmount] = useState<number>(149);
  const [reconcileMethod, setReconcileMethod] = useState('bank_transfer');
  const [reconcileReference, setReconcileReference] = useState('');
  const [reconcileReason, setReconcileReason] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

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

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

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
    fetchPlans();
  }, []);

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
    setScheduleDowngrade(false);
    setExtendDays(30);
    setAdjustReason('');
    setModalError(null);
    setAdjustModalOpen(true);
  };

  const handlePlanSelectionChange = (newPlanId: string) => {
    setTargetPlanId(newPlanId);
    if (!selectedSub) return;

    // Check if newPlanId represents a downgrade compared to selectedSub.planId
    const planRank: Record<string, number> = {
      plan_basic: 1,
      plan_gold: 2,
      plan_diamond: 3,
    };
    const currentRank = planRank[selectedSub.planId] || 1;
    const nextRank = planRank[newPlanId] || 1;

    if (nextRank < currentRank) {
      // Auto-recommend schedule downgrade for period end
      setScheduleDowngrade(true);
    } else {
      setScheduleDowngrade(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    if (!adjustReason.trim() || adjustReason.trim().length < 5) {
      setModalError('Please provide a specific documented administrative reason (min 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          businessId: selectedSub.businessId,
          newPlanId: targetPlanId,
          newStatus: targetStatus,
          scheduleDowngrade,
          effectiveDate: scheduleDowngrade ? selectedSub.renewsAt : new Date().toISOString(),
          extendDays: Number(extendDays) || 0,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust subscription');
      }

      setAdjustModalOpen(false);
      setFeedbackMsg({
        type: 'success',
        message: `Subscription for ${selectedSub.businessName} successfully adjusted to ${targetPlanId}.`,
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
      fetchSubscriptions();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openReconcileModal = (sub?: SubscriptionRow) => {
    const target = sub || subscriptions[0] || null;
    setReconcileBiz(target);
    const initialPlan = target?.planId || 'plan_gold';
    setReconcilePlanId(initialPlan);
    setReconcileBillingCycle('monthly');

    const matchedPlan = plans.find((p) => p.id === initialPlan);
    setReconcileAmount(matchedPlan?.priceMonthly || 149);
    setReconcileMethod('bank_transfer');
    setReconcileReference('');
    setReconcileReason('');
    setReconcileError(null);
    setReconcileModalOpen(true);
  };

  const handleReconcilePlanChange = (pId: string, cycle: 'monthly' | 'annual') => {
    setReconcilePlanId(pId);
    setReconcileBillingCycle(cycle);
    const matched = plans.find((p) => p.id === pId);
    if (matched) {
      setReconcileAmount(cycle === 'annual' ? matched.priceAnnual : matched.priceMonthly);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileBiz) {
      setReconcileError('Please select a valid business to reconcile.');
      return;
    }
    if (!reconcileReference.trim()) {
      setReconcileError('Payment reference (UTR or Transaction ID) is strictly required.');
      return;
    }
    if (!reconcileReason.trim() || reconcileReason.trim().length < 5) {
      setReconcileError('Please provide a mandatory audit note explaining offline verification (min 5 characters).');
      return;
    }

    try {
      setReconciling(true);
      setReconcileError(null);

      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile_payment',
          businessId: reconcileBiz.businessId,
          planId: reconcilePlanId,
          billingCycle: reconcileBillingCycle,
          amount: Number(reconcileAmount),
          paymentMethod: reconcileMethod,
          paymentReference: reconcileReference.trim(),
          reason: reconcileReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record and reconcile payment');
      }

      setReconcileModalOpen(false);
      setFeedbackMsg({
        type: 'success',
        message: `Offline payment of ₹${reconcileAmount} verified for ${reconcileBiz.businessName}. Subscription is now active.`,
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
      fetchSubscriptions();
    } catch (err: any) {
      setReconcileError(err.message);
    } finally {
      setReconciling(false);
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
          <h1 className="text-xl font-bold text-slate-900">Subscription & Entitlement Operations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise subscription lifecycle: Assign tiers, schedule downgrades without data loss, and reconcile audited offline payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openReconcileModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" /> Reconcile Offline Payment
          </button>
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Manage Plan Pricing <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.message}</span>
        </div>
      )}

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
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.priceMonthly}/mo)
                </option>
              ))}
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
              <option value="suspended">Suspended</option>
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
              Merchant Subscriptions ({total})
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
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Validity</th>
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
                  const isSuspended = sub.status === 'suspended';
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
                        <div className="flex flex-col gap-1 items-start">
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
                          {sub.scheduledDowngradePlanId && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-0.5">
                              <ArrowDownCircle className="w-3 h-3" /> Downgrade queued
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCancelled
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : isSuspended
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
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
                        {sub.daysRemaining !== undefined && !isCancelled && !isSuspended ? (
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
                        ) : isSuspended ? (
                          <span className="text-purple-600 font-semibold">Suspended</span>
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

                        {/* Reconcile Payment */}
                        <button
                          onClick={() => openReconcileModal(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition shadow-2xs"
                          title="Reconcile Offline Payment"
                        >
                          <Receipt className="w-3 h-3" /> Payment
                        </button>

                        {/* Edit / Adjust */}
                        <button
                          onClick={() => openAdjustmentModal(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition shadow-2xs"
                          title="Edit / Adjust Subscription"
                        >
                          <Edit3 className="w-3 h-3" /> Adjust
                        </button>

                        {/* Cancel / Archive */}
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
              {viewSub.scheduledDowngradePlanId && (
                <div className="flex justify-between py-1 border-b border-slate-50 bg-blue-50/50 p-2 rounded">
                  <span className="text-blue-700 font-semibold">Scheduled Downgrade:</span>
                  <span className="font-mono text-blue-900">{viewSub.scheduledDowngradePlanId} (at period end)</span>
                </div>
              )}
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Adjust Business Subscription</h3>
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

            {/* Plan Comparison Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Current Subscription</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedSub.planName}</span>
                <span className="text-slate-500 text-[11px]">
                  Expires: {selectedSub.renewsAt ? new Date(selectedSub.renewsAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Target Plan</span>
                <span className="font-bold text-indigo-700 mt-0.5 block">
                  {plans.find((p) => p.id === targetPlanId)?.name || targetPlanId}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {scheduleDowngrade ? 'Applies at paid period end' : 'Applies immediately'}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Plan Tier
                </label>
                <select
                  value={targetPlanId}
                  onChange={(e) => handlePlanSelectionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {plans.length > 0 ? (
                    plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.priceMonthly}/mo (Max {p.maxProducts} products, {p.maxCategories} categories)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="plan_basic">Basic Plan (Menu only)</option>
                      <option value="plan_gold">Gold Plan (Store + Menu + Custom UPI)</option>
                      <option value="plan_diamond">Diamond Plan (Enterprise)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Downgrade Timing Strategy */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Effective Date Strategy (Downgrade Handling)
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="downgradeSchedule"
                      checked={scheduleDowngrade}
                      onChange={() => setScheduleDowngrade(true)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">
                        Schedule for Current Period Expiry (Recommended for Downgrades)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Business retains current features until{' '}
                        {selectedSub.renewsAt ? new Date(selectedSub.renewsAt).toLocaleDateString() : 'expiry'}. Existing products & categories are never deleted.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="downgradeSchedule"
                      checked={!scheduleDowngrade}
                      onChange={() => setScheduleDowngrade(false)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">
                        Immediate Switch (Effective Now)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Switches entitlements immediately. Existing products and categories are preserved.
                      </p>
                    </div>
                  </label>
                </div>
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
                    <option value="suspended">Suspended</option>
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
                  Documented Administrative Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Upgraded tier by admin request or extended validity by 30 days."
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

      {/* Manual Payment Reconciliation Modal */}
      {reconcileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reconcile Offline Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized manual verification for offline bank transfers, cash, or direct UPI.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reconcileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{reconcileError}</span>
              </div>
            )}

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Business <span className="text-red-500">*</span>
                </label>
                <select
                  value={reconcileBiz?.businessId || ''}
                  onChange={(e) => {
                    const match = subscriptions.find((s) => s.businessId === e.target.value);
                    if (match) setReconcileBiz(match);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-slate-900"
                >
                  {subscriptions.map((s) => (
                    <option key={s.businessId} value={s.businessId}>
                      {s.businessName} (/{s.businessSlug}) — Currently: {s.planName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plan Tier
                  </label>
                  <select
                    value={reconcilePlanId}
                    onChange={(e) => handleReconcilePlanChange(e.target.value, reconcileBillingCycle)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-slate-900"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={reconcileBillingCycle}
                    onChange={(e) =>
                      handleReconcilePlanChange(reconcilePlanId, e.target.value as 'monthly' | 'annual')
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verified Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={reconcileAmount}
                    onChange={(e) => setReconcileAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={reconcileMethod}
                    onChange={(e) => setReconcileMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="bank_transfer">Direct Bank Transfer / NEFT</option>
                    <option value="upi">Direct Merchant UPI Transfer</option>
                    <option value="cash">Cash In-Hand</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Reference / UTR Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., UTR-2026102900987 or Bank Deposit Slip #9921"
                  value={reconcileReference}
                  onChange={(e) => setReconcileReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit & Verification Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Verified bank statement credit for annual subscription payment."
                  value={reconcileReason}
                  onChange={(e) => setReconcileReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReconcileModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconciling}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reconciling && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Verify & Activate Subscription
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
