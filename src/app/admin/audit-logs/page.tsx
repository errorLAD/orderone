'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  User, 
  ShieldCheck, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  X,
  Code2
} from 'lucide-react';

interface AuditLogRecord {
  id: string;
  userId?: string;
  businessId?: string;
  action: string;
  details: string;
  targetEntity?: string;
  targetId?: string;
  reason?: string;
  result?: string;
  beforeValues?: any;
  afterValues?: any;
  ipAddress?: string;
  timestamp: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminAuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Selected Log for JSON payload inspection
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('targetEntity', entityFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter, entityFilter]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Administrative Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable system audit logs tracking account suspensions, plan adjustments, refund authorizations, and credential activity.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Target Entities</option>
          <option value="business">Business</option>
          <option value="user">User Account</option>
          <option value="order">Order (Store / Menu)</option>
          <option value="subscription">Subscription</option>
          <option value="payment">Payment / Ledger</option>
          <option value="plan">Plan Configuration</option>
          <option value="platform_settings">Platform Settings</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Administrative Actions</option>
          <option value="business.update">business.update</option>
          <option value="business.delete">business.delete</option>
          <option value="business.suspend">business.suspend</option>
          <option value="business.reactivate">business.reactivate</option>
          <option value="user.update">user.update</option>
          <option value="user.delete">user.delete</option>
          <option value="user.suspend">user.suspend</option>
          <option value="user.reactivate">user.reactivate</option>
          <option value="order.update">order.update</option>
          <option value="order.cancel">order.cancel</option>
          <option value="payment.update">payment.update</option>
          <option value="payment.cancel">payment.cancel</option>
          <option value="payment.refund">payment.refund</option>
          <option value="subscription.adjust">subscription.adjust</option>
          <option value="subscription.cancel">subscription.cancel</option>
          <option value="plan.update">plan.update</option>
          <option value="settings.update">settings.update</option>
          <option value="admin.login">admin.login</option>
        </select>

        {(entityFilter || actionFilter) && (
          <button
            onClick={() => {
              setEntityFilter('');
              setActionFilter('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details & Reason</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Fetching audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {log.userName || log.userEmail || 'System'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.ipAddress || 'internal'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-700 font-medium">
                        {log.targetEntity || 'platform'}
                      </span>
                      {log.targetId && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                          {log.targetId}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-800 font-medium">{log.details}</p>
                      {log.reason && (
                        <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded mt-1 border border-amber-200/60 inline-block">
                          Reason: {log.reason}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {(log.beforeValues || log.afterValues) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition shadow-xs"
                        >
                          <Code2 className="w-3 h-3" /> Diff
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {logs.length > 0 ? (page - 1) * 20 + 1 : 0} to{' '}
            {Math.min(page * 20, total)} of {total} audit records
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

      {/* Diff / Payload Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  Payload Diff: {selectedLog.action}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record ID: <span className="font-mono text-slate-700">{selectedLog.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <h4 className="font-bold text-slate-700 mb-1">Before State</h4>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto max-h-60 text-slate-800">
                  {selectedLog.beforeValues
                    ? JSON.stringify(selectedLog.beforeValues, null, 2)
                    : 'null'}
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-1">After State</h4>
                <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg overflow-x-auto max-h-60 text-emerald-950">
                  {selectedLog.afterValues
                    ? JSON.stringify(selectedLog.afterValues, null, 2)
                    : 'null'}
                </pre>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
