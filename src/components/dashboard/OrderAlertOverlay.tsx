'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Store, 
  UtensilsCrossed, 
  ExternalLink, 
  Check, 
  CheckCheck,
  Clock, 
  ShoppingBag, 
  User, 
  MapPin, 
  Volume2, 
  VolumeX,
  X,
  AlertCircle,
  BedDouble,
} from 'lucide-react';
import { useOrderAlert } from '@/context/OrderAlertContext';
import { useApp } from '@/context/AppContext';
import { formatTime } from '@/lib/utils';

export function OrderAlertOverlay() {
  const { 
    activeAlertOrders, 
    isRinging, 
    stopAlert, 
    acknowledgeOrder, 
    acknowledgeAllOrders,
    autoplayBlocked,
    enableAudio
  } = useOrderAlert();
  const { currentBusiness } = useApp();

  if (activeAlertOrders.length === 0 && !autoplayBlocked) {
    return null;
  }

  // Determine business category context
  const bizType = currentBusiness?.type || 'restaurant';
  const isFoodBiz = ['restaurant', 'cafe', 'bakery', 'food_truck'].includes(bizType);

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-6">
      {/* 1. Autoplay Unlock Banner (if browser blocked AudioContext) */}
      {autoplayBlocked && (
        <div className="pointer-events-auto mb-3 max-w-lg w-full bg-amber-500 text-white rounded-xl shadow-xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing className="w-5 h-5 shrink-0 text-white animate-pulse" />
            <div className="text-xs">
              <p className="font-bold">Sound Alert Needs Permission</p>
              <p className="text-amber-100 text-[11px]">Click to enable incoming order ringing</p>
            </div>
          </div>
          <button
            onClick={() => enableAudio()}
            className="shrink-0 px-3 py-1.5 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition shadow-sm"
          >
            Enable Sound
          </button>
        </div>
      )}

      {/* 2. Active New Order(s) Visual Alert Modal / Banner */}
      {activeAlertOrders.length > 0 && (
        <div className="pointer-events-auto max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 overflow-hidden animate-in slide-in-from-top-4 duration-200">
          {/* Header Bar with Live Ringing Indicator */}
          <div className={`px-4 py-2.5 flex items-center justify-between text-white transition-colors ${
            isRinging ? 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 animate-pulse' : 'bg-slate-900'
          }`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                {isRinging ? (
                  <BellRing className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Bell className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  {activeAlertOrders.length === 1 
                    ? '🚨 New Order Received!' 
                    : `🚨 ${activeAlertOrders.length} New Orders Received!`}
                </span>
                <span className="text-[10px] text-white/80 font-medium">
                  {isRinging ? '🔊 Ringing in progress — click Stop Alert to silence' : 'Alert silenced'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isRinging && (
                <button
                  onClick={stopAlert}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 hover:bg-red-50 rounded-lg text-xs font-black shadow-md transition transform active:scale-95"
                  title="Silence the ringing alarm"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Stop Alert</span>
                </button>
              )}

              {activeAlertOrders.length > 1 && (
                <button
                  onClick={acknowledgeAllOrders}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition"
                  title="Acknowledge all received orders"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Acknowledge All</span>
                </button>
              )}
            </div>
          </div>

          {/* Orders Stack / List */}
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto p-1 bg-slate-50/50">
            {activeAlertOrders.map((order) => {
              const isStore = order.sourceType === 'store';
              const targetUrl = isStore ? '/dashboard/store/orders' : '/dashboard/menu/orders';

              return (
                <div 
                  key={order.id} 
                  className="p-3 sm:p-4 bg-white rounded-xl m-1 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Order Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      order.customer?.roomNumber
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : isStore
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {order.customer?.roomNumber ? (
                        <BedDouble className="w-5 h-5 text-amber-700" />
                      ) : isStore ? (
                        <Store className="w-5 h-5" />
                      ) : (
                        <UtensilsCrossed className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          Token #{order.tokenNumber}
                        </span>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          order.customer?.roomNumber
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                            : isStore 
                            ? 'bg-sky-100 text-sky-800 border border-sky-300' 
                            : 'bg-orange-100 text-orange-800 border border-orange-300'
                        }`}>
                          {order.customer?.roomNumber
                            ? `Room Service • Room ${order.customer.roomNumber}`
                            : isStore
                            ? 'Store Order'
                            : 'Menu Order'}
                        </span>

                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {order.customer?.roomNumber
                            ? `In-Room Dining ${order.customer.floorNumber ? `(Floor ${order.customer.floorNumber})` : ''}`
                            : isFoodBiz 
                            ? (isStore ? 'Takeout Merch' : `Kitchen Ticket ${order.customer?.tableNumber ? `• ${/^(table|room)\b/i.test(order.customer.tableNumber) ? order.customer.tableNumber : `Table #${order.customer.tableNumber}`}` : ''}`)
                            : (isStore ? (order.customer?.tableNumber ? `Store • ${order.customer.tableNumber}` : 'Online Storefront') : 'Counter Inquiry')}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">
                          {order.customer?.name || 'Guest Diner'}
                        </span>
                        
                        {order.customer?.phone && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {order.customer.phone}
                          </span>
                        )}

                        <span className="text-slate-400">•</span>

                        <span className="font-bold text-slate-900">
                          ₹{order.total}
                        </span>

                        <span className="text-slate-500 text-[11px]">
                          ({order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'items'})
                        </span>

                        <span className="text-slate-400">•</span>

                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {order.createdAt ? formatTime(order.createdAt) : 'Just now'}
                        </span>
                      </div>

                      {/* Line items preview if available */}
                      {order.items && order.items.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-slate-500 truncate max-w-md">
                          <span className="font-medium text-slate-700">Items: </span>
                          {order.items.map((i) => `${i.quantity}x ${i.productName || 'Product'}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => acknowledgeOrder(order.id)}
                      className="px-3 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                      title="Mark acknowledged and dismiss"
                    >
                      Dismiss
                    </button>

                    <Link
                      href={targetUrl}
                      onClick={() => acknowledgeOrder(order.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition shadow-sm ${
                        isStore ? 'bg-sky-600 hover:bg-sky-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      <span>View Order</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
