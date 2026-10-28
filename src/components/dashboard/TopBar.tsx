'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  Volume2,
  VolumeX,
  ExternalLink,
  Store,
  UtensilsCrossed,
  Shield,
  UserCheck,
  Building2,
  Check,
  ChevronDown,
  Sparkles,
  PlusCircle,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types';
import { formatTime, cn } from '@/lib/utils';
import { useOrderAlert } from '@/context/OrderAlertContext';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const {
    currentUser,
    logout,
    currentBusiness,
    setCurrentBusiness,
    businesses,
    currentRole,
    notifications,
    unreadNotifsCount,
    markAsRead,
    markAllAsRead,
  } = useApp();

  const {
    isRinging,
    stopAlert,
    soundEnabled,
    setSoundEnabled,
  } = useOrderAlert();

  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      {/* Left: Mobile hamburger & business selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Business Selector: Strictly authorized businesses only */}
        {!currentBusiness && businesses.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 rounded-lg border border-amber-200">
            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">No business is linked to this account</span>
            <span className="sm:hidden">No business linked</span>
            <Link
              href="/onboarding"
              className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
            >
              <PlusCircle className="w-3 h-3" />
              Onboard
            </Link>
          </div>
        ) : businesses.length === 1 ? (
          /* Single authorized business: display clearly with dropdown arrow & switching hidden */
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100/80 rounded-lg border border-slate-200 select-none">
            {currentBusiness?.logoUrl ? (
              <img
                src={currentBusiness.logoUrl}
                alt={currentBusiness.name}
                className="w-4 h-4 rounded-md object-cover border border-slate-300 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            )}
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {currentBusiness?.name}
            </span>
            <span className="text-[10px] text-slate-500 font-normal capitalize hidden sm:inline">
              ({currentBusiness?.type})
            </span>
          </div>
        ) : (
          /* Multiple authorized businesses: interactive switcher showing ONLY this user's businesses */
          <div className="relative">
            <button
              onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 rounded-lg transition-colors border border-slate-200"
            >
              {currentBusiness?.logoUrl ? (
                <img
                  src={currentBusiness.logoUrl}
                  alt={currentBusiness.name}
                  className="w-4 h-4 rounded-md object-cover border border-slate-300 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              )}
              <span className="max-w-[140px] sm:max-w-[180px] truncate">
                {currentBusiness?.name || 'Select Business'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showBusinessDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBusinessDropdown(false)}
                />
                <div className="absolute left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Your Authorized Businesses ({businesses.length})
                  </div>
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setCurrentBusiness(biz);
                        setShowBusinessDropdown(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors',
                        currentBusiness?.id === biz.id
                          ? 'bg-indigo-50/80 text-indigo-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {biz.logoUrl ? (
                          <img
                            src={biz.logoUrl}
                            alt={biz.name}
                            className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {biz.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-medium text-slate-900 truncate">{biz.name}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{biz.type}</p>
                        </div>
                      </div>
                      {currentBusiness?.id === biz.id && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <Link
                      href="/onboarding"
                      onClick={() => setShowBusinessDropdown(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Onboard Another Business</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Live Storefront Shortcuts */}
        {currentBusiness && (
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
            {currentBusiness.settings.modules.store && (
              <a
                href={`/store/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                title="Open Public Retail Storefront"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Store</span>
                <ExternalLink className="w-3 h-3 text-sky-500" />
              </a>
            )}

            {currentBusiness.settings.modules.menu && (
              <a
                href={`/menu/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors"
                title="Open Public Dining Menu"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Menu</span>
                <ExternalLink className="w-3 h-3 text-orange-500" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Right: Audio toggle, Role switcher & Notifications */}
      <div className="flex items-center gap-2.5">
        {/* Sound Chimes & Ringing Control */}
        {isRinging ? (
          <button
            onClick={stopAlert}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 animate-pulse transition shadow-sm border border-red-700"
            title="Alarm is actively ringing! Click to stop alert"
          >
            <VolumeX className="w-4 h-4 animate-bounce" />
            <span className="hidden sm:inline">Stop Ringing</span>
          </button>
        ) : (
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2 rounded-lg text-xs font-medium transition-colors border',
              soundEnabled
                ? 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'
            )}
            title={soundEnabled ? 'Live Order Audio Alerts: Active (Click to Mute)' : 'Audio Alerts: Muted (Click to Enable)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}

        {/* User Profile & Session Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <div className="w-5 h-5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="font-semibold text-slate-900 max-w-[100px] truncate">
                {currentUser?.name || 'Account'}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{currentUser?.role || currentRole}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-xs bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.name || 'Authorized User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email || 'No email session'}
                  </p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                      Role: {currentUser?.role || currentRole}
                    </span>
                  </div>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="p-1">
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Super Admin Panel</span>
                    </Link>
                  </div>
                )}

                <div className="border-t border-slate-100 mt-1 pt-1 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title="Real-time Order Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full animate-pulse-subtle">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadNotifsCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700 rounded-full">
                        {unreadNotifsCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet. New orders will appear here in real-time.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          'p-3 cursor-pointer transition-colors',
                          notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase',
                                notif.sourceType === 'store'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : notif.sourceType === 'menu'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              )}
                            >
                              {notif.sourceType}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {notif.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
