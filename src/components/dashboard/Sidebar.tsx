'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  ReceiptText,
  Tv,
  QrCode,
  CreditCard,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers,
  Wrench,
  Boxes,
  Share2,
  Building2,
  Palette,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/categories';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | null;
  badgeClass?: string;
  external?: boolean;
}

interface NavSection {
  title: string;
  badgeText?: string;
  badgeClass?: string;
  items: NavItem[];
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentBusiness, currentRole } = useApp();

  const isStoreEnabled = currentBusiness?.settings?.modules?.store ?? true;
  const isMenuEnabled = currentBusiness?.settings?.modules?.menu ?? true;
  const catConfig = getCategoryConfig(currentBusiness?.type);
  const isFoodCategory = ['restaurant', 'cafe', 'bakery', 'juice_chaat'].includes(catConfig.id);
  const isGoldPlan =
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_diamond';

  // Dynamic module section labels based on category
  const getStoreSectionConfig = () => {
    return {
      title: 'Store Module (Retail)',
      badgeText: 'Store',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      catalogName: 'Store Catalog & Stock',
      categoriesName: 'Categories',
      ordersName: 'Store Orders',
      tokensName: 'Store Tokens & Queue',
    };
  };

  const getMenuSectionConfig = () => {
    switch (catConfig.id) {
      case 'restaurant':
        return {
          title: 'Kitchen & Dining Operations',
          badgeText: 'Dining',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          catalogName: 'Food Menu & Recipes',
          ordersName: 'Kitchen Orders & KOT',
          tokensName: 'Table & Token Queue',
        };
      case 'cafe':
        return {
          title: 'Barista & Cafe Counter',
          badgeText: 'Barista',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          catalogName: 'Beverages & Bites Menu',
          ordersName: 'Barista & Cafe Orders',
          tokensName: 'Pickup Calling Tokens',
        };
      case 'bakery':
        return {
          title: 'Bakery & Fresh Bakes',
          badgeText: 'Bakery',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          catalogName: 'Cakes, Breads & Pastries',
          ordersName: 'Bakery & Cake Orders',
          tokensName: 'Pre-Order Pickup Tokens',
        };
      case 'juice_chaat':
        return {
          title: 'Juice & Chaat Counter',
          badgeText: 'Counter',
          badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
          catalogName: 'Juices, Shakes & Snacks',
          ordersName: 'Live Counter Orders',
          tokensName: 'Rapid Token Calling',
        };
      default:
        return {
          title: 'Menu Module (Dining/Food)',
          badgeText: 'Menu',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          catalogName: 'Digital Food Menu',
          ordersName: 'Menu Orders (Kitchen)',
          tokensName: 'Menu Kitchen Queue',
        };
    }
  };

  const storeSection = getStoreSectionConfig();
  const menuSection = getMenuSectionConfig();

  const navItems: NavSection[] = [
    {
      title: 'Main',
      items: [
        {
          name: 'Dashboard Overview',
          href: '/dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: 'Storefront & Display',
      items: [
        {
          name: isFoodCategory ? 'Public Dining Menu' : 'Public Online Storefront',
          href: currentBusiness
            ? (isFoodCategory ? `/menu/${currentBusiness.slug}` : `/store/${currentBusiness.slug}`)
            : '/store/annapurna-foods',
          icon: isFoodCategory ? UtensilsCrossed : Store,
          external: true,
          badge: 'Online',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
          name: 'TV Public Token Display',
          href: currentBusiness ? `/display/${currentBusiness.slug}` : '/display/annapurna-foods',
          icon: Tv,
          external: true,
          badge: 'Live',
        },
        {
          name: 'QR Codes & Posters',
          href: '/dashboard/qr-codes',
          icon: QrCode,
          badge: null,
        },
        {
          name: 'Social Media & Links',
          href: '/dashboard/storefront/social',
          icon: Share2,
          badge: null,
        },
        {
          name: 'Design & Appearance',
          href: '/dashboard/storefront/design',
          icon: Palette,
          badge: isGoldPlan ? 'Gold' : 'Locked',
          badgeClass: isGoldPlan
            ? 'bg-amber-100 text-amber-800 font-semibold text-[10px]'
            : 'bg-slate-100 text-slate-500 font-medium text-[10px]',
        },
      ],
    },
    // STORE MODULE SECTION (Materials & Inventory / Retail / Kirana)
    ...(isStoreEnabled
      ? [
          {
            title: storeSection.title,
            badgeText: storeSection.badgeText,
            badgeClass: storeSection.badgeClass,
            items: [
              {
                name: storeSection.catalogName,
                href: '/dashboard/store/catalog',
                icon: Store,
                badge: null,
              },
              {
                name: storeSection.categoriesName || 'Categories',
                href: '/dashboard/store/categories',
                icon: Layers,
                badge: null,
              },
              {
                name: storeSection.ordersName,
                href: '/dashboard/store/orders',
                icon: ShoppingBag,
                badge: 'Live',
                badgeClass: 'bg-sky-100 text-sky-700',
              },
              {
                name: storeSection.tokensName,
                href: '/dashboard/store/tokens',
                icon: ReceiptText,
                badge: null,
              },
            ],
          },
        ]
      : []),
    // MENU MODULE SECTION (Kitchen / Dining / Barista)
    ...(isMenuEnabled
      ? [
          {
            title: menuSection.title,
            badgeText: menuSection.badgeText,
            badgeClass: menuSection.badgeClass,
            items: [
              {
                name: menuSection.catalogName,
                href: '/dashboard/menu/catalog',
                icon: UtensilsCrossed,
                badge: null,
              },
              {
                name: 'Menu Categories',
                href: '/dashboard/menu/categories',
                icon: Layers,
                badge: null,
              },
              {
                name: menuSection.ordersName,
                href: '/dashboard/menu/orders',
                icon: ReceiptText,
                badge: 'KOT',
                badgeClass: 'bg-orange-100 text-orange-700',
              },
              {
                name: menuSection.tokensName,
                href: '/dashboard/menu/tokens',
                icon: ReceiptText,
                badge: null,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Settings & Billing',
      items: [
        {
          name: 'Business Profile',
          href: '/dashboard/settings/profile',
          icon: Building2,
          badge: null,
        },
        {
          name: 'Plans & Subscription',
          href: '/dashboard/subscription',
          icon: CreditCard,
          badge: currentBusiness?.subscription?.planId === 'plan_gold' ? 'Gold' : 'Basic',
          badgeClass: currentBusiness?.subscription?.planId === 'plan_gold' ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-emerald-100 text-emerald-800 font-semibold',
        },
        {
          name: 'Payments & UPI Setup',
          href: '/dashboard/settings/payments',
          icon: QrCode,
          badge: isGoldPlan ? 'Gold' : 'Locked',
          badgeClass: isGoldPlan ? 'bg-amber-100 text-amber-800 font-semibold text-[10px]' : 'bg-slate-100 text-slate-500 font-medium text-[10px]',
        },
        {
          name: 'GST & Invoices',
          href: '/dashboard/settings/gst',
          icon: ReceiptText,
          badge: isGoldPlan ? 'Gold' : 'Locked',
          badgeClass: isGoldPlan ? 'bg-amber-100 text-amber-800 font-semibold text-[10px]' : 'bg-slate-100 text-slate-500 font-medium text-[10px]',
        },
        {
          name: 'Business Settings',
          href: '/dashboard/settings',
          icon: Settings,
          badge: null,
        },
        ...(currentRole === 'admin'
          ? [
              {
                name: 'Platform Super Admin',
                href: '/dashboard/admin',
                icon: ShieldCheck,
                badge: 'Admin',
                badgeClass: 'bg-purple-100 text-purple-800',
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 max-w-[85vw] bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 pt-safe pb-safe',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-indigo-500 text-white font-black shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight leading-none text-base">
                OrderOne<span className="text-indigo-600">.in</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-1">
                Store + Menu + Tokens
              </div>
            </div>
          </Link>

          {/* Explicit Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Business Quick Card */}
        {currentBusiness && (
          <div className="px-3.5 py-2.5 mx-3 mt-3 bg-slate-50/90 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              {currentBusiness.logoUrl ? (
                <img
                  src={currentBusiness.logoUrl}
                  alt={currentBusiness.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                  {currentBusiness.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {currentBusiness.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold border inline-flex items-center gap-1', catConfig.badgeClass)}>
                    <span>{catConfig.icon}</span>
                    <span>{catConfig.shortLabel || catConfig.label}</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500">
                    {currentBusiness.subscription?.planId === 'plan_gold' ? 'Gold' : 'Basic'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navItems.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <span>{section.title}</span>
                {section.badgeText && (
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-bold border',
                      section.badgeClass
                    )}
                  >
                    {section.badgeText}
                  </span>
                )}
              </div>
              <div className="space-y-0.5 mt-1">
                {section.items.map((item, itemIdx) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  if (item.external) {
                    return (
                      <a
                        key={itemIdx}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-slate-600" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                            {item.badge}
                          </span>
                        )}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            'w-4 h-4',
                            isActive ? 'text-white' : 'text-slate-600'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded font-semibold',
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badgeClass || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate max-w-[170px]" title={PLATFORM_CONFIG.legalCompanyName}>
              By {PLATFORM_CONFIG.legalCompanyName}
            </span>
            <span className="text-emerald-700 font-medium shrink-0">● Connected</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <Link href="/terms" target="_blank" className="hover:text-slate-600 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" target="_blank" className="hover:text-slate-600 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/refund-policy" target="_blank" className="hover:text-slate-600 transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
