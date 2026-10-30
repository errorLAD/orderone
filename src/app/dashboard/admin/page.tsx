'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  IndianRupee,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Business, SubscriptionPlan } from '@/types';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import Link from 'next/link';

export default function PlatformAdminPage() {
  const { currentRole } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (businessId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          businessId,
          status: nextStatus,
        }),
      });
      await fetchAdminData();
    } catch (e) {
      console.error('Error toggling status:', e);
    }
  };

  if (currentRole !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Admin Privileges Required</h2>
        <p className="text-xs text-slate-500 mt-1">
          Switch to "Platform Super Admin" role in the top bar to inspect and manage multi-tenant accounts.
        </p>
      </div>
    );
  }

  const businesses: Business[] = data?.businesses || [];
  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Platform Super Administrator Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-tenant business accounts, OrderOne.in subscription activations and platform health.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Platform Global KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Onboarded Businesses</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {data?.totalBusinesses ?? 0} Tenants
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">100% Isolated Data & Sequences</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Platform Gross Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatINR(data?.totalRevenue ?? 0)}
          </div>
          <span className="text-[11px] text-slate-500">From all retail & food orders</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Processed Order Tokens</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {data?.totalOrders ?? 0} Orders
          </div>
          <span className="text-[11px] text-sky-600 font-medium">Store & Menu Tokens</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Subscriptions</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {data?.activeSubscriptions ?? 0} Active
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">₹49/mo Basic Plan Active</span>
        </div>
      </div>

      {/* Businesses Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-xs">Registered Business Accounts</h3>
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>
        </div>

        {/* Mobile Cards for Business Accounts */}
        <div className="space-y-3 p-4 block sm:hidden">
          {filteredBusinesses.map((biz) => {
            const isSuspended = biz.subscription.status === 'suspended';

            return (
              <div key={biz.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{biz.name}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{biz.type} • {biz.phone}</div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold capitalize shrink-0',
                      biz.subscription.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    )}
                  >
                    {biz.subscription.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700 capitalize">
                    {biz.subscription.planId.replace('plan_', '')} Plan (₹{biz.subscription.amount})
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {biz.settings.modules.store && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        Store
                      </span>
                    )}
                    {biz.settings.modules.menu && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        Menu
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {biz.settings.modules.store && (
                      <a
                        href={`/store/${biz.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline flex items-center gap-0.5 font-medium text-[11px]"
                      >
                        <span>Store</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {biz.settings.modules.menu && (
                      <a
                        href={`/menu/${biz.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 hover:underline flex items-center gap-0.5 font-medium text-[11px]"
                      >
                        <span>Menu</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleStatus(biz.id, biz.subscription.status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs',
                      isSuspended
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    )}
                  >
                    {isSuspended ? 'Reactivate' : 'Suspend'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                <th className="p-3.5">Business Name & Type</th>
                <th className="p-3.5">Active Modules</th>
                <th className="p-3.5">Subscription Plan</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Storefront Links</th>
                <th className="p-3.5 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBusinesses.map((biz) => {
                const isSuspended = biz.subscription.status === 'suspended';

                return (
                  <tr key={biz.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{biz.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{biz.type} • {biz.phone}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {biz.settings.modules.store && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            Store (S-)
                          </span>
                        )}
                        {biz.settings.modules.menu && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            Menu (M-)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 capitalize">
                        {biz.subscription.planId.replace('plan_', '')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ₹{biz.subscription.amount}/{biz.subscription.billingCycle === 'annual' ? 'yr' : 'mo'}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize',
                          biz.subscription.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        )}
                      >
                        {biz.subscription.status}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {biz.settings.modules.store && (
                          <a
                            href={`/store/${biz.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <span>Store</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {biz.settings.modules.menu && (
                          <a
                            href={`/menu/${biz.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <span>Menu</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(biz.id, biz.subscription.status)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors',
                          isSuspended
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        )}
                      >
                        {isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Legal & Corporate Identity (Admin Only) */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-900 text-sm">
              Platform Corporate & Legal Identity
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Platform-Wide Configuration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Brand Name</p>
            <p className="font-black text-slate-900 text-sm">{PLATFORM_CONFIG.brandName}</p>
            <p className="text-slate-400 font-bold uppercase text-[10px] pt-2">Operating Legal Entity</p>
            <p className="font-bold text-slate-900">{PLATFORM_CONFIG.legalCompanyName}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Support & Billing Inquiries</p>
            <p className="font-mono text-slate-800">{PLATFORM_CONFIG.supportEmail}</p>
            <p className="text-slate-400 font-bold uppercase text-[10px] pt-2">Payment Gateway Integration</p>
            <p className="font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Secured Billing (30-day terms)
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">Public Legal Pages:</span>
          <Link
            href="/about"
            target="_blank"
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 font-medium inline-flex items-center gap-1"
          >
            About Us <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/terms"
            target="_blank"
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 font-medium inline-flex items-center gap-1"
          >
            Terms & Conditions <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/privacy-policy"
            target="_blank"
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 font-medium inline-flex items-center gap-1"
          >
            Privacy Policy <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/refund-policy"
            target="_blank"
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 font-medium inline-flex items-center gap-1"
          >
            Refund Policy <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
