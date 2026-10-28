'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Check, 
  X as CloseIcon, 
  Edit3, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Layers, 
  CreditCard, 
  IndianRupee, 
  Store, 
  QrCode, 
  RefreshCw,
  AlertCircle,
  Users,
  ShoppingCart,
  Code2
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxProducts: number;
  maxCategories: number;
  description: string;
  features: string[];
  isVisible: boolean;
  allowsStore: boolean;
  customUpi: boolean;
  activeSubscribers?: number;
  totalPurchases?: number;
}

export default function AdminPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [priceMonthly, setPriceMonthly] = useState<number>(0);
  const [maxProducts, setMaxProducts] = useState<number>(20);
  const [maxCategories, setMaxCategories] = useState<number>(10);
  const [description, setDescription] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [allowsStore, setAllowsStore] = useState<boolean>(false);
  const [customUpi, setCustomUpi] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch plans');
      }
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openViewModal = (p: Plan) => {
    setViewPlan(p);
    setViewModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setSelectedPlan(p);
    setPriceMonthly(p.priceMonthly);
    setMaxProducts(p.maxProducts);
    setMaxCategories(p.maxCategories);
    setDescription(p.description || '');
    setIsVisible(p.isVisible);
    setAllowsStore(p.allowsStore);
    setCustomUpi(p.customUpi);
    setReason('');
    setModalError(null);
    setEditModalOpen(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!reason.trim() || reason.trim().length < 5) {
      setModalError('Please supply a clear administrative justification (min 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          priceMonthly: Number(priceMonthly),
          maxProducts: Number(maxProducts),
          maxCategories: Number(maxCategories),
          description,
          isVisible,
          allowsStore,
          customUpi,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update plan tier');
      }

      setEditModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscription Plans & Entitlements</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage pricing tiers, product/category quotas, feature gating, and Diamond tier market rollout.
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading && plans.length === 0 ? (
          <div className="col-span-3 py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
            Loading subscription configurations from Supabase...
          </div>
        ) : (
          plans.map((plan) => {
            const isBasic = plan.id === 'plan_basic';
            const isGold = plan.id === 'plan_gold';
            const isDiamond = plan.id === 'plan_diamond';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border flex flex-col justify-between p-6 shadow-sm relative transition hover:shadow-md ${
                  isGold
                    ? 'border-amber-300 ring-1 ring-amber-300/40'
                    : isDiamond
                    ? 'border-purple-300 ring-1 ring-purple-300/40'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Badge */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isGold
                            ? 'bg-amber-100 text-amber-900'
                            : isDiamond
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {plan.name}
                      </span>
                      {!plan.isVisible && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openViewModal(plan)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                        title="View Plan Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(plan)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                        title="Edit Plan Quotas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">₹{plan.priceMonthly}</span>
                      <span className="text-xs text-slate-500 font-medium">/ 30 days</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>
                  </div>

                  {/* Active Subscribers & Adoption Stats */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Active Businesses:</span>
                    </div>
                    <span className="font-bold text-slate-900">{plan.activeSubscribers ?? 0}</span>
                  </div>

                  {/* Quotas & Entitlements */}
                  <div className="space-y-3 py-3 border-t border-b border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Product / Item Quota:</span>
                      <span className="font-bold text-slate-900">{plan.maxProducts} items</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Category Quota:</span>
                      <span className="font-bold text-slate-900">{plan.maxCategories} categories</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Menu Ordering Module:</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Included
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Store / Retail Module:</span>
                      {plan.allowsStore ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Enabled
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <CloseIcon className="w-3.5 h-3.5" /> Locked
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">UPI Payment & Dynamic QR:</span>
                      {plan.customUpi ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Enabled
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <CloseIcon className="w-3.5 h-3.5" /> Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openViewModal(plan)}
                    className="py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Quotas
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Plan Details Modal */}
      {viewModalOpen && viewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewPlan.name} Tier Dossier
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {viewPlan.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Price (30 Days)</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">₹{viewPlan.priceMonthly}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Active Subscribers</span>
                <span className="text-base font-bold text-blue-700 mt-0.5 block">{viewPlan.activeSubscribers ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Total Purchases</span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block">{viewPlan.totalPurchases ?? 0}</span>
              </div>
            </div>

            {/* Specification Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Entitlement Specifications
              </h4>
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Product / Menu Item Limit:</span>
                  <span className="font-bold text-slate-900">{viewPlan.maxProducts} active items</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Category Limit:</span>
                  <span className="font-bold text-slate-900">{viewPlan.maxCategories} active categories</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Store / Retail Ordering:</span>
                  <span className={`font-semibold ${viewPlan.allowsStore ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {viewPlan.allowsStore ? 'Enabled' : 'Disabled (Menu Only)'}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Custom UPI QR & GST Invoicing:</span>
                  <span className={`font-semibold ${viewPlan.customUpi ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {viewPlan.customUpi ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Public Visibility:</span>
                  <span className={`font-semibold ${viewPlan.isVisible ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {viewPlan.isVisible ? 'Publicly Available' : 'Hidden from Purchase Portal'}
                  </span>
                </div>
                <div className="p-3">
                  <span className="text-slate-600 block mb-1">Description:</span>
                  <p className="text-slate-800 italic">{viewPlan.description || 'No description configured.'}</p>
                </div>
              </div>
            </div>

            {/* Raw JSON */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <Code2 className="w-3.5 h-3.5" /> Raw Database Record
              </div>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                {JSON.stringify(viewPlan, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  openEditModal(viewPlan);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit This Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Configure Tier: {selectedPlan.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Internal Identifier: <span className="font-mono text-slate-800">{selectedPlan.id}</span>
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Dependency Warning */}
            {(selectedPlan.activeSubscribers ?? 0) > 0 && !isVisible && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Active Subscriptions Warning:</span>
                  <p className="mt-0.5">
                    There are currently {selectedPlan.activeSubscribers} active businesses on this tier. Hiding it will prevent new businesses from purchasing it, but current subscribers will retain their existing quotas until expiry.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Products / Items
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxProducts}
                    onChange={(e) => setMaxProducts(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Categories
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxCategories}
                    onChange={(e) => setMaxCategories(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Visible to public and available for purchase in store dashboards</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowsStore}
                    onChange={(e) => setAllowsStore(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Enable Store / Retail module (otherwise limited strictly to Menu)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customUpi}
                    onChange={(e) => setCustomUpi(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Enable Custom UPI QR generator and GST tax calculation</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Adjusting tier pricing and quota parameters for 2026 platform launch."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
