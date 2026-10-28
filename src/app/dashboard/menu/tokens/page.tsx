'use client';

import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  UtensilsCrossed,
  Tv,
  CheckCircle2,
  RefreshCw,
  Bell,
  SkipForward,
  Flame,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { QueueToken } from '@/types';
import { formatTime, cn } from '@/lib/utils';
import Link from 'next/link';

export default function MenuTokensPage() {
  const { currentBusiness } = useApp();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [counterNumber, setCounterNumber] = useState<number>(1);

  const fetchTokens = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/queue?businessId=${currentBusiness.id}&sourceType=menu`);
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens);
      }
    } catch (e) {
      console.error('Error fetching menu tokens:', e);
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
            <span className="p-1 rounded-md bg-orange-100 text-orange-700">
              <UtensilsCrossed className="w-4 h-4" />
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Restaurant Kitchen Tokens & Order Queue
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
              M-Tokens
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Kitchen queue tokens for food preparation and dining table / pickup calls.
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
              <span>Launch TV Display</span>
            </Link>
          )}
          <button
            onClick={fetchTokens}
            className="p-1 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 3 Columns: Cooking/Preparing, Ready to Serve, Completed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Preparing in Kitchen */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-[11px]">Now Cooking ({waitingTokens.length})</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {waitingTokens.length === 0 ? (
              <div className="py-7 text-center text-[11px] text-slate-400">No pending orders in kitchen</div>
            ) : (
              waitingTokens.map((tok) => (
                <div key={tok.id} className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-amber-900 tracking-wide font-mono">
                      {tok.tokenNumber}
                    </span>
                    <span className="text-[9px] text-slate-500">{formatTime(tok.createdAt)}</span>
                  </div>
                  {tok.customerName && (
                    <div className="text-[11px] text-slate-700 mt-0.5 font-semibold">{tok.customerName}</div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-amber-200">
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'called')}
                      className="flex-1 py-1 bg-orange-600 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 flex items-center justify-center gap-1"
                    >
                      <Bell className="w-2.5 h-2.5" />
                      <span>Ready! Call Token</span>
                    </button>
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'skipped')}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg text-[10px]"
                    >
                      <SkipForward className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ready to Serve */}
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-emerald-900 text-[11px]">Ready for Customer ({calledTokens.length})</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {calledTokens.length === 0 ? (
              <div className="py-7 text-center text-[11px] text-slate-400">No ready tokens pending pickup</div>
            ) : (
              calledTokens.map((tok) => (
                <div key={tok.id} className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-emerald-900 tracking-wide font-mono">
                      {tok.tokenNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                      Pickup Window
                    </span>
                  </div>
                  {tok.customerName && (
                    <div className="text-[11px] text-slate-700 mt-0.5 font-medium">{tok.customerName}</div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-emerald-200">
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'served')}
                      className="flex-1 py-1 bg-emerald-700 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-800 flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Mark Served to Table / Guest</span>
                    </button>
                    <button
                      onClick={() => handleUpdateToken(tok.id, 'called')}
                      className="px-2 py-1 text-emerald-800 hover:bg-emerald-100 rounded-lg text-[10px] font-semibold border border-emerald-300"
                    >
                      Ring Again
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Served Food Tickets */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <h3 className="font-bold text-slate-800 text-[11px]">Served Today ({servedTokens.length})</h3>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {servedTokens.slice(0, 10).map((tok) => (
              <div key={tok.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 font-mono text-[11px]">{tok.tokenNumber}</span>
                <span className="text-[9px] text-slate-400">
                  {tok.servedAt ? formatTime(tok.servedAt) : 'Done'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
