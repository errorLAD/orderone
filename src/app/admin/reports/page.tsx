'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  IndianRupee, 
  FileSpreadsheet, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Building2, 
  Calendar, 
  Layers, 
  Download,
  ShoppingBag,
  UtensilsCrossed
} from 'lucide-react';

interface Financials {
  grossCollected: number;
  refundsRecorded: number;
  netCollected: number;
  successfulPayments: number;
  failedPayments: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface LimitUsage {
  businessId: string;
  businessName: string;
  category: string;
  planId: string;
  subscriptionStatus: string;
  totalItems: number;
  itemLimit: number;
  totalCategories: number;
  categoryLimit: number;
  isLimitExceeded: boolean;
}

interface OrderBreakdown {
  sourceType: string;
  status: string;
  count: number;
  volume: number;
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [limitUsage, setLimitUsage] = useState<LimitUsage[]>([]);
  const [orders, setOrders] = useState<OrderBreakdown[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setFinancials(data.financials);
        setCategories(data.categoryBreakdown || []);
        setLimitUsage(data.limitUsage || []);
        setOrders(data.orderBreakdown || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const totalBusinessesInCategories = categories.reduce((acc, c) => acc + c.count, 0) || 1;
  const storeOrders = orders.filter((o) => o.sourceType === 'store');
  const menuOrders = orders.filter((o) => o.sourceType === 'menu');

  return (
    <div className="space-y-6">
      {/* Header & Period Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics & Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform revenue aggregates, catalog quota monitoring, category distribution, and raw CSV exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="prev_month">Previous Month</option>
          </select>

          <button
            onClick={fetchReports}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-xs"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CSV Export Quick Toolbar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Export Audit & Financial Datasets</h3>
            <p className="text-xs text-slate-400">
              Sanitized CSV downloads with spreadsheet formula-injection protection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/reports?format=csv&exportType=payments&period=${period}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Payments CSV
          </a>
          <a
            href={`/api/admin/reports?format=csv&exportType=businesses&period=${period}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> Businesses CSV
          </a>
          <a
            href={`/api/admin/reports?format=csv&exportType=orders&period=${period}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> Orders CSV
          </a>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Subscription Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{financials ? financials.grossCollected.toLocaleString() : '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total collections via Razorpay & Gateway</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refunds Issued</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">
            ₹{financials ? financials.refundsRecorded.toLocaleString() : '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Documented admin refund transactions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Realized Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{financials ? financials.netCollected.toLocaleString() : '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Gross minus issued refunds</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {financials && financials.successfulPayments + financials.failedPayments > 0
              ? `${Math.round(
                  (financials.successfulPayments /
                    (financials.successfulPayments + financials.failedPayments)) *
                    100
                )}%`
              : '100%'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {financials?.successfulPayments || 0} succeeded • {financials?.failedPayments || 0} failed
          </p>
        </div>
      </div>

      {/* Grid: Category Distribution & Order Fulfilment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Tenant Category Distribution</h2>
            </div>
            <span className="text-xs text-slate-400">Total: {totalBusinessesInCategories}</span>
          </div>

          <div className="space-y-3">
            {categories.map((c) => {
              const pct = Math.round((c.count / totalBusinessesInCategories) * 100) || 0;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 capitalize">{c.category || 'Other'}</span>
                    <span className="text-slate-500">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Separated Order Volumes: Store vs Menu */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Order Volumes (Store vs Menu)</h2>
            </div>
            <span className="text-xs text-slate-400">Strictly Separated Channels</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Retail Store Volume */}
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" /> Retail Stores
              </div>
              <div className="text-xl font-extrabold text-blue-950">
                {storeOrders.reduce((a, b) => a + b.count, 0)} orders
              </div>
              <p className="text-[11px] text-blue-700">
                Volume: ₹{storeOrders.reduce((a, b) => a + b.volume, 0).toLocaleString()}
              </p>
              <div className="pt-2 border-t border-blue-200/60 text-[10px] space-y-0.5 text-blue-800">
                {storeOrders.map((o) => (
                  <div key={o.status} className="flex justify-between">
                    <span className="capitalize">{o.status}:</span>
                    <span className="font-semibold">{o.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kitchen Menu Volume */}
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" /> Dining / Menus
              </div>
              <div className="text-xl font-extrabold text-amber-950">
                {menuOrders.reduce((a, b) => a + b.count, 0)} orders
              </div>
              <p className="text-[11px] text-amber-700">
                Volume: ₹{menuOrders.reduce((a, b) => a + b.volume, 0).toLocaleString()}
              </p>
              <div className="pt-2 border-t border-amber-200/60 text-[10px] space-y-0.5 text-amber-800">
                {menuOrders.map((o) => (
                  <div key={o.status} className="flex justify-between">
                    <span className="capitalize">{o.status}:</span>
                    <span className="font-semibold">{o.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Quota & Violation Monitoring */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Catalog Quota & Violation Sentinel</h2>
          </div>
          <span className="text-xs text-slate-400">Basic: 20 items / 10 cats • Gold: 50 items / 30 cats</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Active Plan</th>
                <th className="py-3 px-4">Products / Item Quota</th>
                <th className="py-3 px-4">Category Quota</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {limitUsage.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No business records found.
                  </td>
                </tr>
              ) : (
                limitUsage.map((u) => {
                  const itemExceeded = u.totalItems > u.itemLimit;
                  const catExceeded = u.totalCategories > u.categoryLimit;
                  const hasViolation = itemExceeded || catExceeded;

                  return (
                    <tr
                      key={u.businessId}
                      className={hasViolation ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{u.businessName}</span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">{u.category || 'Retail'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            u.planId === 'plan_gold'
                              ? 'bg-amber-100 text-amber-900'
                              : u.planId === 'plan_diamond'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {u.planId === 'plan_gold'
                            ? 'Gold'
                            : u.planId === 'plan_diamond'
                            ? 'Diamond'
                            : 'Basic'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${itemExceeded ? 'text-red-700' : 'text-slate-800'}`}>
                          {u.totalItems} / {u.itemLimit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${catExceeded ? 'text-red-700' : 'text-slate-800'}`}>
                          {u.totalCategories} / {u.categoryLimit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasViolation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> Limit Exceeded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Compliant
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/businesses/${u.businessId}`}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
