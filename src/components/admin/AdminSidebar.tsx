'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Layers,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Bell,
  ScrollText,
  Sliders,
  UserCheck,
  LogOut,
  X,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/context/AdminContext';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { adminUser, unreadNotifications, logout } = useAdmin();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'Subscription Plans', href: '/admin/plans', icon: Layers },
    { label: 'Payments', href: '/admin/payments', icon: Receipt },
    { label: 'Store Orders', href: '/admin/orders/store', icon: ShoppingBag },
    { label: 'Menu Orders', href: '/admin/orders/menu', icon: UtensilsCrossed },
    { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
    { label: 'Notifications', href: '/admin/notifications', icon: Bell, badge: unreadNotifications },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
    { label: 'Platform Settings', href: '/admin/settings', icon: Sliders },
    { label: 'Admin Profile', href: '/admin/profile', icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Persistent Sidebar (Desktop) + Slide-over Drawer (Mobile) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#0B132B] text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 pt-safe pb-safe',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-sm tracking-tight">OrderOne.in</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-bold text-[9px] uppercase tracking-wider border border-indigo-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Platform Administration</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all group',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Admin Info & Logout */}
        <div className="p-3 border-t border-slate-800/80 shrink-0 space-y-2">
          <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-bold text-white truncate">
                {adminUser?.name || 'Super Admin'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {adminUser?.email || 'ab.mishra@yahoo.com'}
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Active Session" />
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
