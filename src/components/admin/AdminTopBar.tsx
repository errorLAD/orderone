'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, ExternalLink, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

interface AdminTopBarProps {
  onOpenMobile: () => void;
}

export function AdminTopBar({ onOpenMobile }: AdminTopBarProps) {
  const pathname = usePathname();
  const { adminUser, unreadNotifications, logout } = useAdmin();

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Overview Dashboard';
    if (pathname.startsWith('/admin/businesses')) return 'Business Management';
    if (pathname.startsWith('/admin/users')) return 'User Management';
    if (pathname.startsWith('/admin/subscriptions')) return 'Subscription Management';
    if (pathname.startsWith('/admin/plans')) return 'Subscription Plans & Entitlements';
    if (pathname.startsWith('/admin/payments')) return 'Payments & Razorpay Transactions';
    if (pathname.startsWith('/admin/orders/store')) return 'Retail Store Orders (S-Tokens)';
    if (pathname.startsWith('/admin/orders/menu')) return 'Kitchen Menu Orders (M-Tokens)';
    if (pathname.startsWith('/admin/reports')) return 'Reports & Analytics';
    if (pathname.startsWith('/admin/notifications')) return 'Platform Notifications';
    if (pathname.startsWith('/admin/audit-logs')) return 'Security & Audit Logs';
    if (pathname.startsWith('/admin/settings')) return 'Platform Settings';
    if (pathname.startsWith('/admin/profile')) return 'Super Admin Profile';
    return 'Super Admin Panel';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors hidden sm:inline">
            Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <h1 className="text-sm font-black text-slate-900 tracking-tight">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Right: Notification pill, Admin badge, logout */}
      <div className="flex items-center gap-3">
        {/* Link to public landing */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
          title="Open OrderOne.in public homepage"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Notification Bell */}
        <Link
          href="/admin/notifications"
          className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
          title="Platform Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </Link>

        {/* Super Admin Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
              {adminUser?.email || 'ab.mishra@yahoo.com'}
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">
              Super Admin
            </span>
          </div>
        </div>

        {/* Quick Logout */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
