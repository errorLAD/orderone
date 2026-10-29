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
  Code2,
  Calendar,
  Gift,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  validityDaysMonthly?: number;
  validityDaysAnnual?: number;
  maxProducts: number;
  maxCategories: number;
  maxStaff?: number;
  description: string;
  features: string[];
  isVisible: boolean;
  isPopular?: boolean;
  allowsStore: boolean;
  allowsMenu?: boolean;
  customUpi: boolean;
  activeSubscribers?: number;
  totalPurchases?: number;
}

interface TrialSettings {
  enabled: boolean;
  durationDays: number;
  planId: string;
}

export default function AdminPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trialSettings, setTrialSettings] = useState<TrialSettings>({
    enabled: true,
    durationDays: 7,
    planId: 'plan_gold',
  });
  const [trialReason, setTrialReason] = useState('');
  const [savingTrial, setSavingTrial] = useState(false);
  const [trialSuccessMsg, setTrialSuccessMsg] = useState<string | null>(null);
  const [trialErrorMsg, setTrialErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [priceMonthly, setPriceMonthly] = useState<number>(0);
  const [priceAnnual, setPriceAnnual] = useState<number>(0);
  const [validityDaysMonthly, setValidityDaysMonthly] = useState<number>(30);
  const [validityDaysAnnual, setValidityDaysAnnual] = useState<number>(365);
  const [maxProducts, setMaxProducts] = useState<number>(20);
  const [maxCategories, setMaxCategories] = useState<number>(10);
  const [maxStaff, setMaxStaff] = useState<number>(5);
  const [description, setDescription] = useState<string>('');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isPopular, setIsPopular] = useState<boolean>(false);
  const [allowsStore, setAllowsStore] = useState<boolean>(false);
  const [allowsMenu, setAllowsMenu] = useState<boolean>(true);
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
      if (data.trialSettings) {
        setTrialSettings(data.trialSettings);
      }
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
    setPriceAnnual(p.priceAnnual ?? p.priceMonthly * 10);
    setValidityDaysMonthly(p.validityDaysMonthly ?? 30);
    setValidityDaysAnnual(p.validityDaysAnnual ?? 365);
    setMaxProducts(p.maxProducts);
    setMaxCategories(p.maxCategories);
    setMaxStaff(p.maxStaff ?? 5);
    setDescription(p.description || '');
    setFeatures(Array.isArray(p.features) ? [...p.features] : []);
    setNewFeatureText('');
    setIsVisible(p.isVisible);
    setIsPopular(p.isPopular ?? false);
    setAllowsStore(p.allowsStore);
    setAllowsMenu(p.allowsMenu !== false);
    setCustomUpi(p.customUpi);
    setReason('');
    setModalError(null);
    setEditModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
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
          priceAnnual: Number(priceAnnual),
          validityDaysMonthly: Number(validityDaysMonthly),
          validityDaysAnnual: Number(validityDaysAnnual),
          maxProducts: Number(maxProducts),
          maxCategories: Number(maxCategories),
          maxStaff: Number(maxStaff),
          features,
          description,
          isVisible,
          isPopular,
          allowsStore,
          allowsMenu,
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

  const handleSaveTrialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialReason.trim() || trialReason.trim().length < 5) {
      setTrialErrorMsg('Please provide an administrative reason (min 5 characters) to update trial settings.');
      return;
    }

    try {
      setSavingTrial(true);
      setTrialErrorMsg(null);
      setTrialSuccessMsg(null);

      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trial: trialSettings,
          reason: trialReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update trial configuration');
      }

      setTrialSuccessMsg('Free trial configuration saved successfully and synced across registrations.');
      setTrialReason('');
      setTimeout(() => setTrialSuccessMsg(null), 4000);
    } catch (err: any) {
      setTrialErrorMsg(err.message);
    } finally {
      setSavingTrial(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscription Plans & Dynamic Pricing</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic monthly & annual pricing, quota limits, trial policies, and Diamond tier rollout.
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

      {/* Free Trial Policy Configuration Card */}
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-indigo-50 text-[#4F46E5] rounded-xl">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Free Trial Configuration & Signup Entitlement</h2>
            <p className="text-xs text-slate-500">
              Configure automated trial parameters granted to new merchant registrations without upfront credit card requirements.
            </p>
          </div>
        </div>

        {trialSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{trialSuccessMsg}</span>
          </div>
        )}

        {trialErrorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{trialErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveTrialSettings} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Trial Status</label>
            <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="checkbox"
                id="trialEnabled"
                checked={trialSettings.enabled}
                onChange={(e) => setTrialSettings({ ...trialSettings, enabled: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="trialEnabled" className="text-xs font-medium text-slate-800 cursor-pointer">
                {trialSettings.enabled ? 'Enabled on Signup' : 'Disabled'}
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Trial Duration (Days)</label>
            <input
              type="number"
              min="1"
              max="90"
              required
              value={trialSettings.durationDays}
              onChange={(e) => setTrialSettings({ ...trialSettings, durationDays: parseInt(e.target.value, 10) || 7 })}
              className="h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Entitlement Plan Tier</label>
            <select
              value={trialSettings.planId}
              onChange={(e) => setTrialSettings({ ...trialSettings, planId: e.target.value })}
              className="h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="plan_gold">Gold Plan (Store + Menu + Custom UPI)</option>
              <option value="plan_basic">Basic Plan (Menu Only)</option>
              <option value="plan_diamond">Diamond Enterprise Plan</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-3">
            <label className="text-xs font-semibold text-slate-700">
              Audit Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Setting 7-day Gold trial for newly onboarded merchants"
              value={trialReason}
              onChange={(e) => setTrialReason(e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={savingTrial}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {savingTrial ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Save Trial Policy
            </button>
          </div>
        </form>
      </div>

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
                className={`bg-white rounded-2xl border flex flex-col justify-between p-6 shadow-sm relative transition hover:shadow-md ${
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
                      {plan.isPopular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-[#4F46E5]">
                          <Sparkles className="w-3 h-3" /> Popular
                        </span>
                      )}
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
                        title="Edit Plan Quotas & Pricing"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">₹{plan.priceMonthly}</span>
                      <span className="text-xs text-slate-500 font-medium">/ {plan.validityDaysMonthly ?? 30} days</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Annual: <strong className="text-slate-900 font-bold">₹{plan.priceAnnual ?? plan.priceMonthly * 10}</strong> / {plan.validityDaysAnnual ?? 365} days
                    </div>
                    <p className="text-xs text-slate-500 mt-2 min-h-[32px]">{plan.description}</p>
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
                  <div className="space-y-2.5 py-3 border-t border-b border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Product Quota:</span>
                      <span className="font-bold text-slate-900">{plan.maxProducts} items</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Category Quota:</span>
                      <span className="font-bold text-slate-900">{plan.maxCategories} categories</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Staff Accounts:</span>
                      <span className="font-bold text-slate-900">{plan.maxStaff ?? 5} accounts</span>
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

                  {/* Features Bullet List Preview */}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Features:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                        {plan.features.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{plan.features.length - 4} more features</span>
                        )}
                      </div>
                    </div>
                  )}
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
                    <Edit3 className="w-3.5 h-3.5" /> Edit Plan
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
                <span className="text-[11px] text-slate-500 font-medium block">Monthly ({viewPlan.validityDaysMonthly ?? 30}d)</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">₹{viewPlan.priceMonthly}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Annual ({viewPlan.validityDaysAnnual ?? 365}d)</span>
                <span className="text-base font-bold text-indigo-700 mt-0.5 block">₹{viewPlan.priceAnnual ?? viewPlan.priceMonthly * 10}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Active Subscribers</span>
                <span className="text-base font-bold text-blue-700 mt-0.5 block">{viewPlan.activeSubscribers ?? 0}</span>
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
                  <span className="text-slate-600">Staff Limit:</span>
                  <span className="font-bold text-slate-900">{viewPlan.maxStaff ?? 5} team members</span>
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
                  <span className="text-slate-600 block mb-1">Features:</span>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {(viewPlan.features || []).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Configure Tier: {selectedPlan.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan ID: <span className="font-mono text-slate-800">{selectedPlan.id}</span>
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

            {/* Active subscribers notice */}
            {(selectedPlan.activeSubscribers ?? 0) > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-bold">Historical Integrity Protected:</span>
                  <p className="mt-0.5">
                    Modifying pricing or limits applies to future renewals and new checkouts. There are currently {selectedPlan.activeSubscribers} active businesses who maintain their paid validity.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              {/* Pricing & Validity Grid */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-indigo-600" /> Pricing & Validity Configuration
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={validityDaysMonthly}
                      onChange={(e) => setValidityDaysMonthly(parseInt(e.target.value, 10) || 30)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Annual Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={priceAnnual}
                      onChange={(e) => setPriceAnnual(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Annual Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={validityDaysAnnual}
                      onChange={(e) => setValidityDaysAnnual(parseInt(e.target.value, 10) || 365)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Quotas Grid */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Resource Limits & Quotas
                </h4>
                <div className="grid grid-cols-3 gap-3">
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Staff Accounts
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxStaff}
                      onChange={(e) => setMaxStaff(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
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

              {/* Features Editor */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Plan Feature Bullets ({features.length})
                  </h4>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="flex-1 text-slate-800">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Remove feature"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new feature bullet point..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
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
                  <span>Publicly visible on landing page & available for self-service business checkout</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Mark with &quot;Most Popular&quot; / Recommended badge</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowsMenu}
                    onChange={(e) => setAllowsMenu(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Enable Food & Menu Ordering module</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowsStore}
                    onChange={(e) => setAllowsStore(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Enable Store / Retail ordering module (inventory & product catalog)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customUpi}
                    onChange={(e) => setCustomUpi(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Enable Custom merchant UPI QR generator and GST tax invoicing</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Updating dynamic pricing and quota allowances for OrderOne.in."
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
