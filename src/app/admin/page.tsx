'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { formatINR, formatDate, cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (selectedPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/overview?period=${selectedPeriod}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load platform metrics.');
      }
    } catch (err: any) {
      console.error('Error fetching admin overview:', err);
      setError(err.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(period);
  }, [period]);

  const PLAN_COLORS: Record<string, string> = {
    plan_basic: '#3B82F6',   // Blue
    plan_gold: '#F59E0B',    // Amber / Gold
    plan_diamond: '#8B5CF6', // Purple / Diamond
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Super Admin Overview</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Database
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-tenant health, verified revenue, subscriptions and order volume across OrderOne.in.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'prev_month', label: 'Previous Month' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all border text-xs',
                period === item.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => fetchOverview(period)}
            className="p-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs ml-1"
            title="Refresh metrics"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-indigo-600')} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. FINANCIAL SUMMARY TILES                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Collected Revenue */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Net Collected Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatINR(data?.summary?.netRevenue || 0)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Gross: {formatINR(data?.summary?.grossRevenue || 0)}</span>
            <span className="text-rose-600">Refunds: {formatINR(data?.summary?.refundsAmount || 0)}</span>
          </div>
        </div>

        {/* Verified Successful Payments */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Verified Payments</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.summary?.verifiedPaymentsCount ?? 0} Txns
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Refunded: {data?.summary?.refundsCount ?? 0}</span>
            <span className="text-amber-600">Under Review: {data?.summary?.pendingReviewCount ?? 0}</span>
          </div>
        </div>

        {/* Active Businesses & Subscriptions */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Registered Businesses</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.summary?.totalBusinesses ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-emerald-600 font-semibold">{data?.summary?.activeBusinesses ?? 0} Active</span>
            <span className="text-rose-600">{data?.summary?.suspendedBusinesses ?? 0} Suspended</span>
          </div>
        </div>

        {/* Total Platform Orders */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Orders (S & M)</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {data?.summary?.totalOrders ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Store: {data?.summary?.storeOrders ?? 0}</span>
            <span>Menu: {data?.summary?.menuOrders ?? 0}</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SECONDARY METRICS: PLANS & EXPIRATIONS                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">Basic (₹49)</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {data?.summary?.basicSubscribers ?? 0}
          </div>
          <span className="text-[10px] text-blue-600 font-semibold">Menu Only</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">Gold (₹149)</span>
          <div className="text-lg font-black text-amber-600 mt-0.5">
            {data?.summary?.goldSubscribers ?? 0}
          </div>
          <span className="text-[10px] text-amber-600 font-semibold">Store + Menu + UPI</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">Diamond (₹249)</span>
          <div className="text-lg font-black text-purple-600 mt-0.5">
            {data?.summary?.diamondSubscribers ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Hidden / Admin</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">New in Period</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">
            +{data?.summary?.newBusinessesThisPeriod ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Registrations</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">Expiring (7 Days)</span>
          <div className="text-lg font-black text-amber-600 mt-0.5">
            {data?.summary?.expiringIn7Days ?? 0}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold">Renewal Due</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px]">Expired Accounts</span>
          <div className="text-lg font-black text-rose-600 mt-0.5">
            {data?.summary?.expiredSubscriptions ?? 0}
          </div>
          <span className="text-[10px] text-rose-700 font-semibold">Locked Paid Access</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CHARTS SECTION (REAL DATA)                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Registration & Revenue Trends */}
        <div className="lg:col-span-2 min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Daily Registrations & Revenue (Last 14 Days)
              </h2>
              <p className="text-xs text-slate-400">Verified platform transaction & business sign-up trends</p>
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Live Aggregates
            </span>
          </div>

          <div className="h-64 w-full min-w-0">
            {data?.trends && data.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue (₹)"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    name="New Businesses"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend activity recorded in this date range.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Subscription Plan Breakdown */}
        <div className="lg:col-span-1 min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Active Subscribers by Plan</h2>
              <Link href="/admin/plans" className="text-xs font-bold text-indigo-600 hover:underline">
                Manage Plans
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of active paying businesses</p>
          </div>

          <div className="space-y-3 pt-2">
            {data?.planDistribution?.map((p: any) => {
              const totalActive = data?.summary?.activeSubscriptions || 1;
              const percent = Math.round((p.activeSubscribers / totalActive) * 100) || 0;
              const color = PLAN_COLORS[p.id] || '#64748B';

              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{p.name} Plan (₹{p.priceMonthly})</span>
                    <span className="font-mono text-slate-600">{p.activeSubscribers} ({percent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percent}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Verified 30-Day Cycles</span>
            <span className="font-bold text-slate-800">{data?.summary?.activeSubscriptions ?? 0} Total Active</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. RECENT ACTIVITY: BUSINESSES, PAYMENTS & AUDIT LOGS         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Recent Business Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Latest Businesses</h3>
            <Link href="/admin/businesses" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recentBusinesses?.map((biz: any) => (
              <Link
                key={biz.id}
                href={`/admin/businesses/${biz.id}`}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 truncate max-w-[180px]">
                    {biz.name}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase px-1.5 py-0.2 rounded',
                      biz.subscription?.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    )}
                  >
                    {biz.subscription?.status || 'active'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span className="capitalize">{biz.type}</span>
                  <span>{formatDate(biz.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Col 2: Recent Verified Payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recent Payments</h3>
            <Link href="/admin/payments" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recentPayments?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent payment transactions.</p>
            ) : (
              data?.recentPayments?.map((pay: any) => (
                <div
                  key={pay.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate max-w-[160px]">
                      {pay.businessName || pay.planId}
                    </span>
                    <span className="font-black text-slate-900">{formatINR(pay.amount)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="font-mono">{pay.razorpayPaymentId || pay.id}</span>
                    <span
                      className={cn(
                        'font-bold uppercase text-[9px]',
                        pay.status === 'completed'
                          ? 'text-emerald-600'
                          : pay.status === 'refunded'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      )}
                    >
                      {pay.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Immutable Audit Logs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Administrative Audit</h3>
            <Link href="/admin/audit-logs" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recentAuditLogs?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No administrative changes recorded yet.</p>
            ) : (
              data?.recentAuditLogs?.map((log: any) => (
                <div key={log.id} className="p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{log.details}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Admin: {log.userName || 'Super Admin'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
