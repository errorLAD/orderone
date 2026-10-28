'use client';

import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Volume2,
  Tv,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  SkipForward,
  UserCheck,
  Package,
  Truck,
  Layers,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { QueueToken } from '@/types';
import { formatTime, cn } from '@/lib/utils';
import Link from 'next/link';
import { getCategoryConfig, getTokenDisplayConfig } from '@/lib/categories';

export default function StoreTokensPage() {
  const { currentBusiness } = useApp();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [counterNumber, setCounterNumber] = useState<number>(1);

  const catConfig = getCategoryConfig(currentBusiness?.type || (currentBusiness as any)?.category);
  const displayConfig = getTokenDisplayConfig(currentBusiness?.type || (currentBusiness as any)?.category);

  const fetchTokens = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/queue?businessId=${currentBusiness.id}&sourceType=store`);
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens);
      }
    } catch (e) {
      console.error('Error fetching tokens:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [currentBusiness?.id]);

  const handleUpdateToken = async (tokenId: string, status: 'called' | 'served' | 'skipped') => {
    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, status, counterNumber }),
      });
      await fetchTokens();
    } catch (e) {
      console.error('Error updating token:', e);
    }
  };

  const waitingTokens = tokens.filter((t) => t.status === 'waiting');
  const calledTokens = tokens.filter((t) => t.status === 'called');
  const servedTokens = tokens.filter((t) => t.status === 'served');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
              <Package className="w-4 h-4" />
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {catConfig.terminology.tokensTitle || 'Order Fulfilment & Dispatch Queue'}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
              {displayConfig.badgeLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage live loading bay / counter queue, dispatch status, and customer collection tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentBusiness && (
            <Link
              href={`/display/${currentBusiness.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-2xs"
            >
              <Tv className="w-3 h-3" />
              <span>Open Public TV Display</span>
            </Link>
          )}
          <button
            onClick={fetchTokens}
            className="p-1 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Counter / Loading Bay selector */}
      <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px]">
        <span className="font-bold text-slate-700">
          Active {displayConfig.counterLabel}:
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((c) => (
            <button
              key={c}
              onClick={() => setCounterNumber(c)}
              className={cn(
                'px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors',
                counterNumber === c
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {displayConfig.counterLabel} {c}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Columns: Waiting, Called (Ready), Served */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Waiting column */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="font-bold text-slate-800 text-[11px]">
                {displayConfig.column1.title} ({waitingTokens.length})
              </h3>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">In Queue</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {waitingTokens.length === 0 ? (
              <div className="py-7 text-center text-[11px] text-slate-400 font-medium">
                {displayConfig.column1.emptyText}
              </div>
            ) : (
              waitingTokens.map((tok) => (
                <div key={tok.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 tracking-wide font-mono">
                      {tok.tokenNumber}
                    </span>
                    <span className="text-[9px] text-slate-400">{formatTime(tok.createdAt)}</span>
                  </div>
                  {tok.customerName && (
                    <div className="text-[11px] text-slate-600 mt-0.5 font-medium">{tok.customerName}</div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'called')}
                      className="flex-1 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Bell className="w-2.5 h-2.5" />
                      <span>
                        Call to {displayConfig.counterLabel} {counterNumber}
                      </span>
                    </button>
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'skipped')}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg text-[10px]"
                      title="Skip customer"
                    >
                      <SkipForward className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Called (Ready) column */}
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-emerald-950 text-[11px]">
                {displayConfig.column2.title} ({calledTokens.length})
              </h3>
            </div>
            <span className="text-[9px] font-bold text-emerald-700">Live on TV</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {calledTokens.length === 0 ? (
              <div className="py-7 text-center text-[11px] text-slate-400 font-medium">
                {displayConfig.column2.emptyText}
              </div>
            ) : (
              calledTokens.map((tok) => (
                <div key={tok.id} className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-emerald-900 tracking-wide font-mono">
                      {tok.tokenNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                      {displayConfig.counterLabel} {tok.counterNumber || counterNumber}
                    </span>
                  </div>
                  {tok.customerName && (
                    <div className="text-[11px] text-slate-700 mt-0.5 font-medium">{tok.customerName}</div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-emerald-200">
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'served')}
                      className="flex-1 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Mark Dispatched / Collected</span>
                    </button>
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'called')}
                      className="px-2 py-1 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-semibold border border-emerald-300"
                      title="Recall"
                    >
                      Recall
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Served / History column */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h3 className="font-bold text-slate-800 text-[11px]">
                Dispatched / Collected Today ({servedTokens.length})
              </h3>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">History</span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {servedTokens.length === 0 ? (
              <div className="py-7 text-center text-[11px] text-slate-400 font-medium">
                No orders marked dispatched yet today.
              </div>
            ) : (
              servedTokens.slice(0, 15).map((tok) => (
                <div key={tok.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{tok.tokenNumber}</span>
                    {tok.customerName && (
                      <span className="text-[10px] text-slate-500 ml-1.5">({tok.customerName})</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {tok.servedAt ? formatTime(tok.servedAt) : 'Completed'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
