'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Package,
  Boxes,
  Truck,
  ShoppingBag,
  Coffee,
  Store,
  MapPin,
  Layers,
} from 'lucide-react';
import { QueueToken, Business, Order } from '@/types';
import { cn } from '@/lib/utils';
import { getTokenDisplayConfig, normalizeCategoryKey, TokenDisplayConfig } from '@/lib/categories';

interface DisplayOrderItem {
  id: string;
  tokenNumber: string;
  customerName?: string;
  sourceType: 'store' | 'menu';
  fulfilmentMethod?: string;
  orderStatus: string;
  itemsSummary: { name: string; quantity: number }[];
  total?: number;
  timeString: string;
  counterNumber?: number;
}

export default function PublicTvDisplayPage({ params }: { params: { slug: string } }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [displayConfig, setDisplayConfig] = useState<TokenDisplayConfig>(getTokenDisplayConfig('hardware'));
  const [preparingItems, setPreparingItems] = useState<DisplayOrderItem[]>([]);
  const [readyItems, setReadyItems] = useState<DisplayOrderItem[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previousReadyTokensRef = useRef<Set<string>>(new Set());

  // Play audio chime and voice synthesis when an order becomes ready
  const announceReadyToken = (token: string, fulfilmentMethod?: string, counterNumber?: number) => {
    if (!soundEnabled) return;

    // 1. Audio chime via Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880.0, now + 0.15); // A5
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.warn('Audio chime error:', e);
    }

    // 2. Speech synthesis announcement tailored to category
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const announcement = displayConfig.voiceAnnouncementTemplate(
          token,
          counterNumber || 1,
          fulfilmentMethod
        );
        const utterance = new SpeechSynthesisUtterance(announcement);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Voice announcement error:', e);
    }
  };

  const fetchDisplayData = async () => {
    try {
      // 1. Fetch business details
      const bizRes = await fetch(`/api/businesses?slug=${params.slug}`);
      const bizData = await bizRes.json();
      if (!bizData.success || !bizData.business) return;

      const biz: Business = bizData.business;
      setBusiness(biz);

      // 2. Determine category configuration
      const categoryKey = normalizeCategoryKey(biz.type || (biz as any).category);
      const config = getTokenDisplayConfig(categoryKey);
      setDisplayConfig(config);

      // Set browser page title dynamically
      if (typeof document !== 'undefined') {
        document.title = `${biz.name} - ${config.browserTitle}`;
      }

      // 3. Determine module separation (Hardware/Grocery/Retail use Store; Food businesses use Menu)
      const isStoreModule =
        categoryKey === 'hardware' ||
        categoryKey === 'grocery' ||
        categoryKey === 'retail' ||
        (biz.settings?.modules?.store && !biz.settings?.modules?.menu);

      const targetSource = isStoreModule ? 'store' : 'menu';

      // 4. Fetch real orders from database
      const [ordersRes, queueRes] = await Promise.all([
        fetch(`/api/orders?businessId=${biz.id}&sourceType=${targetSource}`).catch(() => null),
        fetch(`/api/queue?businessId=${biz.id}&sourceType=${targetSource}`).catch(() => null),
      ]);

      const ordersData = ordersRes ? await ordersRes.json() : null;
      const queueData = queueRes ? await queueRes.json() : null;

      const realOrders: Order[] = ordersData?.success && Array.isArray(ordersData.orders) ? ordersData.orders : [];
      const queueTokens: QueueToken[] = queueData?.success && Array.isArray(queueData.tokens) ? queueData.tokens : [];

      const preparingList: DisplayOrderItem[] = [];
      const readyList: DisplayOrderItem[] = [];
      const processedTokens = new Set<string>();

      // Process real orders first
      for (const ord of realOrders) {
        const status = ord.orderStatus;
        // Completed, dispatched, cancelled or rejected orders are removed from active TV display
        if (['completed', 'cancelled', 'rejected'].includes(status)) {
          continue;
        }

        const itemsSummary = (ord.items || []).map((it) => ({
          name: it.productName,
          quantity: it.quantity,
        }));

        const createdAtDate = ord.createdAt ? new Date(ord.createdAt) : new Date();
        const timeString = createdAtDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        // Find linked queue token if counter number is assigned
        const linkedQueueToken = queueTokens.find((qt) => qt.tokenNumber === ord.tokenNumber);

        const item: DisplayOrderItem = {
          id: ord.id,
          tokenNumber: ord.tokenNumber,
          customerName: ord.customer?.name && ord.customer.name !== 'Guest Customer' ? ord.customer.name : undefined,
          sourceType: ord.sourceType,
          fulfilmentMethod: ord.fulfilmentMethod,
          orderStatus: status,
          itemsSummary,
          total: ord.total,
          timeString,
          counterNumber: linkedQueueToken?.counterNumber || 1,
        };

        processedTokens.add(ord.tokenNumber);

        if (status === 'ready') {
          readyList.push(item);
        } else if (['new', 'accepted', 'preparing'].includes(status)) {
          preparingList.push(item);
        }
      }

      // Include any standalone queue tokens not already represented by orders
      for (const qtok of queueTokens) {
        if (processedTokens.has(qtok.tokenNumber)) continue;
        if (qtok.status === 'served' || qtok.status === 'skipped') continue;

        const createdAtDate = qtok.createdAt ? new Date(qtok.createdAt) : new Date();
        const timeString = createdAtDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const item: DisplayOrderItem = {
          id: qtok.id,
          tokenNumber: qtok.tokenNumber,
          customerName: qtok.customerName || undefined,
          sourceType: qtok.sourceType,
          fulfilmentMethod: 'pickup',
          orderStatus: qtok.status === 'called' ? 'ready' : 'preparing',
          itemsSummary: [],
          timeString,
          counterNumber: qtok.counterNumber || 1,
        };

        if (qtok.status === 'called') {
          readyList.push(item);
        } else if (qtok.status === 'waiting') {
          preparingList.push(item);
        }
      }

      // Check for newly ready tokens and announce them
      const currentReadyTokenSet = new Set(readyList.map((r) => r.tokenNumber));
      if (previousReadyTokensRef.current.size > 0) {
        for (const r of readyList) {
          if (!previousReadyTokensRef.current.has(r.tokenNumber)) {
            announceReadyToken(r.tokenNumber, r.fulfilmentMethod, r.counterNumber);
            break;
          }
        }
      }
      previousReadyTokensRef.current = currentReadyTokenSet;

      setPreparingItems(preparingList);
      setReadyItems(readyList);
    } catch (e) {
      console.error('Error fetching display data:', e);
    }
  };

  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [params.slug]);

  // Digital Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const tInterval = setInterval(updateTime, 1000);
    return () => clearInterval(tInterval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Helper icon renderer based on category config
  const renderColumn1Icon = () => {
    switch (displayConfig.column1.icon) {
      case 'package':
        return <Package className="w-6 h-6 animate-pulse" />;
      case 'boxes':
        return <Boxes className="w-6 h-6 animate-pulse" />;
      case 'shopping-bag':
        return <ShoppingBag className="w-6 h-6 animate-pulse" />;
      case 'coffee':
        return <Coffee className="w-6 h-6 animate-pulse" />;
      case 'flame':
      default:
        return <Flame className="w-6 h-6 animate-pulse" />;
    }
  };

  const renderColumn2Icon = () => {
    switch (displayConfig.column2.icon) {
      case 'truck':
        return <Truck className="w-6 h-6 animate-bounce" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6 animate-bounce" />;
      case 'check-circle':
      default:
        return <CheckCircle2 className="w-6 h-6 animate-bounce" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-x-hidden overflow-y-auto md:overflow-hidden">
      {/* Top TV Bar Header */}
      <header className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md border border-indigo-500/40 shrink-0">
              {business?.name ? business.name.slice(0, 2).toUpperCase() : 'TV'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                {business?.name || 'Order Fulfilment Display'}
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                {displayConfig.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">
              {displayConfig.headerSubtitle}
            </p>
          </div>
        </div>

        {/* Live Clock & Fullscreen / Sound Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm sm:text-lg font-mono font-bold text-slate-100 shadow-inner">
            {currentTime}
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2.5 sm:p-3 border rounded-xl transition-colors',
              soundEnabled
                ? 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-500'
            )}
            title={soundEnabled ? 'Voice & chime alerts active' : 'Audio muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </header>

      {/* Main Split Screen: Column 1 (Prepared / In Progress) vs Column 2 (Ready / Dispatch) */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0">
        {/* COLUMN 1: PREPARING / PROCESSING */}
        <div className="flex flex-col p-4 sm:p-6 md:p-8 bg-slate-950 min-h-0">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {renderColumn1Icon()}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wide text-amber-400 uppercase">
                  {displayConfig.column1.title}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {displayConfig.column1.subtitle}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {preparingItems.length} In Progress
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {preparingItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm py-16">
                <Clock className="w-12 h-12 mb-3 opacity-20" />
                <span className="font-medium text-slate-400">{displayConfig.column1.emptyText}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {preparingItems.map((item) => {
                  const statusLabel =
                    displayConfig.column1.statusMap[item.orderStatus] ||
                    displayConfig.column1.badgeText;
                  const fulfilmentLabel = item.fulfilmentMethod
                    ? (displayConfig.fulfilmentLabels as any)[item.fulfilmentMethod] || item.fulfilmentMethod
                    : 'Standard Order';

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Token Number & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-3xl sm:text-4xl font-black tracking-widest text-slate-100 font-mono">
                            {item.tokenNumber}
                          </div>
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                            {statusLabel}
                          </span>
                        </div>

                        {/* Customer Name */}
                        {item.customerName && (
                          <div className="text-xs font-bold text-slate-300 mt-2 truncate">
                            {item.customerName}
                          </div>
                        )}

                        {/* Items & Quantities Summary */}
                        {item.itemsSummary.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
                            {item.itemsSummary.slice(0, 3).map((it, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-slate-400 flex items-center justify-between truncate"
                              >
                                <span className="truncate pr-2">{it.name}</span>
                                <span className="font-mono font-bold text-slate-300">
                                  × {it.quantity}
                                </span>
                              </div>
                            ))}
                            {item.itemsSummary.length > 3 && (
                              <div className="text-[10px] text-slate-500 italic">
                                + {item.itemsSummary.length - 3} more items
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Fulfilment method & Time */}
                      <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          {item.fulfilmentMethod === 'delivery' ? (
                            <Truck className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{fulfilmentLabel}</span>
                        </span>
                        <span className="font-mono">{item.timeString}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: READY / DISPATCH */}
        <div className="flex flex-col p-4 sm:p-6 md:p-8 bg-slate-900/30 min-h-0 border-l border-emerald-950/20">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {renderColumn2Icon()}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wide text-emerald-400 uppercase">
                  {displayConfig.column2.title}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {displayConfig.column2.subtitle}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
              {readyItems.length} Ready
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {readyItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm py-16">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                <span className="font-medium text-slate-400">{displayConfig.column2.emptyText}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {readyItems.map((item) => {
                  const fulfilmentLabel = item.fulfilmentMethod
                    ? (displayConfig.fulfilmentLabels as any)[item.fulfilmentMethod] || item.fulfilmentMethod
                    : 'Pickup / Ready';

                  return (
                    <div
                      key={item.id}
                      className="p-6 rounded-3xl bg-linear-to-b from-emerald-950/40 to-slate-900 border-2 border-emerald-500/60 shadow-2xl relative overflow-hidden ring-4 ring-emerald-500/10 flex flex-col justify-between"
                    >
                      <div className="absolute top-3 right-3">
                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      </div>

                      <div>
                        {/* Token Number & Counter/Bay Badge */}
                        <div className="flex items-center justify-between">
                          <div className="text-4xl sm:text-5xl font-black tracking-widest text-emerald-300 font-mono drop-shadow-[0_2px_14px_rgba(16,185,129,0.35)]">
                            {item.tokenNumber}
                          </div>
                        </div>

                        {/* Counter or Loading Bay Assignment */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                            {displayConfig.counterLabel} {item.counterNumber || 1}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wide">
                            {displayConfig.column2.badgeText}
                          </span>
                        </div>

                        {/* Customer Name */}
                        {item.customerName && (
                          <div className="text-xs font-bold text-slate-200 mt-2 truncate">
                            {item.customerName}
                          </div>
                        )}

                        {/* Items Summary */}
                        {item.itemsSummary.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-emerald-900/30 space-y-1">
                            {item.itemsSummary.slice(0, 3).map((it, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-slate-300 flex items-center justify-between truncate"
                              >
                                <span className="truncate pr-2">{it.name}</span>
                                <span className="font-mono font-bold text-emerald-300">
                                  × {it.quantity}
                                </span>
                              </div>
                            ))}
                            {item.itemsSummary.length > 3 && (
                              <div className="text-[10px] text-slate-400 italic">
                                + {item.itemsSummary.length - 3} more items
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Fulfilment status & Ready time */}
                      <div className="mt-4 pt-3 border-t border-emerald-900/30 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5 text-emerald-300">
                          {item.fulfilmentMethod === 'delivery' ? (
                            <Truck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Store className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{fulfilmentLabel}</span>
                        </span>
                        <span className="font-mono text-slate-400">{item.timeString}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="px-4 sm:px-8 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-400">Real-time Order Fulfilment Engine</span>
        </div>
        <div className="font-medium text-slate-400 text-center sm:text-right">
          {displayConfig.footerNote}
        </div>
      </footer>
    </div>
  );
}
