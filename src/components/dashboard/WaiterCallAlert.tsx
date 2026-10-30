'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, CheckCircle2, Clock3, HandHelping, VolumeX } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { waiterAlertSound } from '@/lib/waiterAlertSound';

type WaiterRequest = {
  id: string;
  businessId: string;
  tableNumber: string;
  status: 'pending' | 'acknowledged' | 'completed';
  createdAt: string;
  updatedAt: string;
};

function statusLabel(status: WaiterRequest['status']) {
  return status === 'completed' ? 'Completed' : status === 'acknowledged' ? 'Acknowledged' : 'Pending';
}

export function WaiterCallAlert() {
  const { currentBusiness } = useApp();
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [muted, setMuted] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isRestaurant = currentBusiness?.type === 'restaurant' || currentBusiness?.category === 'restaurant';
  const enabled = Boolean(isRestaurant && currentBusiness?.settings?.orderSettings?.enableDineIn && currentBusiness?.settings?.waiterCalls?.enabled !== false);
  const businessId = currentBusiness?.id;
  const alertInterval = currentBusiness?.settings?.waiterCalls?.alertIntervalSeconds || 6;

  const mergeRequest = useCallback((request: WaiterRequest) => {
    setRequests((previous) => [request, ...previous.filter((item) => item.id !== request.id)].slice(0, 50));
    if (request.status === 'pending') setMuted(false);
  }, []);

  useEffect(() => {
    setRequests([]);
    setMuted(false);
    if (!enabled || !businessId) return;

    let cancelled = false;
    const fetchExisting = async () => {
      try {
        const response = await fetch(`/api/waiter-requests?businessId=${encodeURIComponent(businessId)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!cancelled && data.success && Array.isArray(data.requests)) {
          setRequests(data.requests);
          if (data.requests.some((item: WaiterRequest) => item.status === 'pending')) setMuted(false);
        }
      } catch { /* reconnecting stream will deliver new changes */ }
    };
    void fetchExisting();

    const source = new EventSource(`/api/waiter-requests?stream=1&businessId=${encodeURIComponent(businessId)}`);
    eventSourceRef.current = source;
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'WAITER_REQUEST_CHANGED' && payload.request?.businessId === businessId) {
          mergeRequest(payload.request);
        }
      } catch { /* ignore malformed events and keep the stream */ }
    };

    return () => {
      cancelled = true;
      source.close();
      if (eventSourceRef.current === source) eventSourceRef.current = null;
      waiterAlertSound.stop();
    };
  }, [businessId, enabled, mergeRequest]);

  useEffect(() => {
    if (enabled && !muted && requests.some((request) => request.status === 'pending')) {
      waiterAlertSound.start(alertInterval);
    } else {
      waiterAlertSound.stop();
    }
    return () => waiterAlertSound.stop();
  }, [enabled, muted, requests, alertInterval]);

  const updateRequest = async (requestId: string, status: 'acknowledged' | 'completed') => {
    if (!businessId) return;
    setUpdating(requestId);
    try {
      const response = await fetch('/api/waiter-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, requestId, status }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not update waiter request.');
      mergeRequest(data.request);
    } catch (error) {
      console.error('Waiter request update failed:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (!enabled || requests.length === 0) return null;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <aside className="pointer-events-none fixed right-3 top-[4.75rem] z-40 w-[min(24rem,calc(100vw-1.5rem))] sm:right-5 sm:top-20" aria-label="Waiter calls">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 bg-amber-500 px-3.5 py-3 text-white sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <BellRing className="h-4 w-4 shrink-0" />
            <p className="truncate text-sm font-black">Waiter calls{pendingCount ? ` · ${pendingCount} pending` : ''}</p>
          </div>
          {pendingCount > 0 && (
            <button type="button" onClick={() => { waiterAlertSound.stop(); setMuted(true); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 text-xs font-bold hover:bg-white/30" title="Stop waiter alert sound">
              <VolumeX className="h-3.5 w-3.5" /> Stop Alert
            </button>
          )}
        </div>
        {muted && pendingCount > 0 && <p className="bg-amber-50 px-4 py-1.5 text-[11px] font-medium text-amber-800">Sound stopped · pending request remains</p>}
        <div className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
          {requests.slice(0, 12).map((request) => (
            <div key={request.id} className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-700"><HandHelping className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-snug text-slate-900">Table {request.tableNumber} – Customer Calling Waiter</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{new Date(request.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${request.status === 'pending' ? 'bg-amber-100 text-amber-800' : request.status === 'acknowledged' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {statusLabel(request.status)}
                </span>
              </div>
              {request.status !== 'completed' && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {request.status === 'pending' && (
                    <button type="button" disabled={updating === request.id} onClick={() => void updateRequest(request.id, 'acknowledged')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> Acknowledge
                    </button>
                  )}
                  <button type="button" disabled={updating === request.id} onClick={() => void updateRequest(request.id, 'completed')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark served
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
