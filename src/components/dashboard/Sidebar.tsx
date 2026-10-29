'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Sparkles,
  ExternalLink,
  Layers,
  Share2,
  Building2,
  Palette,
  X,
  Lock,
  Clock,
  BedDouble,
  Calculator,
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
  isLocked?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentBusiness, currentRole } = useApp();

  const isStoreEnabled = currentBusiness?.settings?.modules?.store ?? true;
  const isMenuEnabled = currentBusiness?.settings?.modules?.menu ?? true;
  const catConfig = getCategoryConfig(currentBusiness?.type);
  const isFoodCategory = ['restaurant', 'cafe', 'bakery', 'juice_chaat', 'hotel'].includes(catConfig.id);
  const isHotel = catConfig.id === 'hotel';
  const isGoldPlan =
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_diamond';

  // Section collapse state (remembered in localStorage for user convenience)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orderone_sidebar_collapsed');
      if (saved) {
        setCollapsedSections(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('orderone_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Dynamic module operations configuration based on category
  const getMenuSectionConfig = () => {
    switch (catConfig.id) {
      case 'restaurant':
        return {
          title: 'Kitchen & Dining Operations',
          ordersName: 'Kitchen Orders & KOT',
          tokensName: 'Table & Token Queue',
          catalogName: 'Food Menu & Recipes',
          categoriesName: 'Menu Categories',
        };
      case 'cafe':
        return {
          title: 'Barista & Cafe Counter',
          ordersName: 'Barista Orders',
          tokensName: 'Pickup Calling Tokens',
          catalogName: 'Beverages & Bites Menu',
          categoriesName: 'Menu Categories',
        };
      case 'bakery':
        return {
          title: 'Bakery Operations',
          ordersName: 'Bakery & Cake Orders',
          tokensName: 'Pre-Order Pickup Tokens',
          catalogName: 'Cakes, Breads & Pastries',
          categoriesName: 'Bakery Categories',
        };
      case 'juice_chaat':
        return {
          title: 'Live Counter Operations',
          ordersName: 'Live Counter Orders',
          tokensName: 'Rapid Token Calling',
          catalogName: 'Juices & Chaat Menu',
          categoriesName: 'Menu Categories',
        };
      case 'hotel':
        return {
          title: 'Hotel & In-Room Dining',
          ordersName: 'Room Service Orders',
          tokensName: 'Kitchen Token Queue',
          catalogName: 'In-Room Dining Menu',
          categoriesName: 'Food & Beverage Categories',
        };
      default:
        return {
          title: 'Food Menu & Kitchen',
          ordersName: 'Kitchen Orders',
          tokensName: 'Dining Queue & Tokens',
          catalogName: 'Digital Food Menu',
          categoriesName: 'Menu Categories',
        };
    }
  };

  const getStoreSectionConfig = () => {
    return {
      title: catConfig.id === 'hardware' ? 'Hardware & Material Ops' : 'Retail Store Operations',
      ordersName: 'Store Orders',
      tokensName: 'Store Tokens & Queue',
      catalogName: 'Store Catalog & Stock',
      categoriesName: 'Product Categories',
    };
  };

  const storeSection = getStoreSectionConfig();
  const menuSection = getMenuSectionConfig();

  // Clean, focused navigation structure ordered by operational priority
  const navSections: NavSection[] = [
    // 1. Overview
    {
      id: 'main',
      title: 'Main',
      collapsible: false,
      items: [
        {
          name: 'Dashboard Overview',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },

    // 2. Core Daily Operations (Prioritized above marketing/display)
    ...(isMenuEnabled
      ? [
          {
            id: 'menu_ops',
            title: menuSection.title,
            collapsible: true,
            items: [
              {
                name: menuSection.ordersName,
                href: '/dashboard/menu/orders',
                icon: ReceiptText,
              },
              ...(isHotel
                ? [
                    {
                      name: 'Rooms & In-Room QR',
                      href: '/dashboard/hotel/rooms',
                      icon: BedDouble,
                    },
                  ]
                : []),
              {
                name: menuSection.tokensName,
                href: '/dashboard/menu/tokens',
                icon: Clock,
              },
              {
                name: menuSection.catalogName,
                href: '/dashboard/menu/catalog',
                icon: UtensilsCrossed,
              },
              {
                name: menuSection.categoriesName,
                href: '/dashboard/menu/categories',
                icon: Layers,
              },
            ],
          },
        ]
      : []),

    ...(isStoreEnabled
      ? [
          {
            id: 'store_ops',
            title: storeSection.title,
            collapsible: true,
            items: [
              {
                name: storeSection.ordersName,
                href: '/dashboard/store/orders',
                icon: ShoppingBag,
              },
              {
                name: storeSection.tokensName,
                href: '/dashboard/store/tokens',
                icon: Clock,
              },
              {
                name: storeSection.catalogName,
                href: '/dashboard/store/catalog',
                icon: Store,
              },
              {
                name: storeSection.categoriesName,
                href: '/dashboard/store/categories',
                icon: Layers,
              },
            ],
          },
        ]
      : []),

    // 3. Storefront, QR Standees & Public Displays
    {
      id: 'storefront',
      title: 'Storefront & Display',
      collapsible: true,
      items: [
        {
          name: isHotel ? 'Guest In-Room Menu' : isFoodCategory ? 'Public Dining Menu' : 'Public Storefront',
          href: currentBusiness
            ? (isFoodCategory ? `/menu/${currentBusiness.slug}` : `/store/${currentBusiness.slug}`)
            : '/menu/royal-kitchen',
          icon: isFoodCategory ? UtensilsCrossed : Store,
          external: true,
        },
        {
          name: 'TV Token Screen',
          href: currentBusiness ? `/display/${currentBusiness.slug}` : '/display/royal-kitchen',
          icon: Tv,
          external: true,
        },
        {
          name: 'QR Standees & Posters',
          href: '/dashboard/qr-codes',
          icon: QrCode,
        },
        {
          name: 'Branding & Appearance',
          href: '/dashboard/storefront/design',
          icon: Palette,
          isLocked: !isGoldPlan,
        },
        {
          name: 'Social Media & Links',
          href: '/dashboard/storefront/social',
          icon: Share2,
        },
      ],
    },

    // 4. Counter & POS Register
    {
      id: 'pos_ops',
      title: 'Counter & POS',
      collapsible: true,
      items: [
        {
          name: 'POS Counter Billing',
          href: '/dashboard/pos',
          icon: Calculator,
          badge: isGoldPlan ? 'Gold' : null,
          badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
          isLocked: !isGoldPlan,
        },
      ],
    },

    // 5. Settings & Account
    {
      id: 'settings',
      title: 'Settings & Billing',
      collapsible: true,
      items: [
        {
          name: 'Business Profile',
          href: '/dashboard/settings/profile',
          icon: Building2,
        },
        {
          name: 'Store & Operations Settings',
          href: '/dashboard/settings',
          icon: Settings,
        },
        {
          name: 'Payments & UPI Setup',
          href: '/dashboard/settings/payments',
          icon: QrCode,
          isLocked: !isGoldPlan,
        },
        {
          name: 'GST & Invoicing',
          href: '/dashboard/settings/gst',
          icon: ReceiptText,
          isLocked: !isGoldPlan,
        },
        {
          name: 'Plans & Subscription',
          href: '/dashboard/subscription',
          icon: CreditCard,
          badge: currentBusiness?.subscription?.planId === 'plan_gold' ? 'Gold' : 'Basic',
          badgeClass:
            currentBusiness?.subscription?.planId === 'plan_gold'
              ? 'bg-amber-50 text-amber-700 border border-amber-200/80 font-bold'
              : 'bg-slate-100 text-slate-600 font-semibold',
        },
        ...(currentRole === 'admin'
          ? [
              {
                name: 'Super Admin',
                href: '/dashboard/admin',
                icon: ShieldCheck,
                badge: 'Admin',
                badgeClass: 'bg-purple-100 text-purple-800 font-bold',
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
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 max-w-[85vw] bg-white border-r border-slate-200/80 transition-transform duration-200 ease-in-out lg:translate-x-0 pt-safe pb-safe',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight leading-none text-base">
                OrderOne<span className="text-indigo-600">.in</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Store • Menu • Tokens
              </div>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Merchant Quick Identity Badge */}
        {currentBusiness && (
          <div className="px-3 py-2 mx-3 mt-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentBusiness.logoUrl ? (
                <img
                  src={currentBusiness.logoUrl}
                  alt={currentBusiness.name}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200/80 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                  {currentBusiness.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentBusiness.name}
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Store Live" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <span className="capitalize">{catConfig.shortLabel || catConfig.label}</span>
                  <span>•</span>
                  <span className="capitalize">{currentBusiness.subscription?.planId === 'plan_gold' ? 'Gold' : 'Basic'}</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/settings/profile"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Edit Profile"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section) => {
            // If any item inside this section is active, keep it expanded
            const isAnyItemActive = section.items.some((item) => pathname === item.href);
            const isCollapsed = section.collapsible && collapsedSections[section.id] && !isAnyItemActive;

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Section Header */}
                <div
                  onClick={() => section.collapsible && toggleSection(section.id)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors',
                    section.collapsible ? 'cursor-pointer hover:text-slate-600 select-none' : 'cursor-default'
                  )}
                >
                  <span>{section.title}</span>
                  {section.collapsible && (
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 text-slate-400 transition-transform duration-200',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                  )}
                </div>

                {/* Section Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pt-0.5">
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
                            className="group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0 transition-opacity" />
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={itemIdx}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all',
                            isActive
                              ? 'bg-indigo-50/90 text-indigo-700 font-bold border border-indigo-200/60 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={cn(
                                'w-4 h-4 shrink-0 transition-colors',
                                isActive
                                  ? 'text-indigo-600'
                                  : 'text-slate-400 group-hover:text-slate-600'
                              )}
                            />
                            <span className="truncate">{item.name}</span>
                          </div>

                          {/* Refined right indicators: Lock or Plan pill */}
                          {item.isLocked && (
                            <Lock className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                          )}

                          {item.badge && !item.isLocked && (
                            <span
                              className={cn(
                                'px-1.5 py-0.5 text-[9px] rounded-md font-semibold tracking-wider shrink-0',
                                item.badgeClass || 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Clean Footer Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-1 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center justify-between">
            <span className="truncate text-slate-500 font-medium max-w-[140px]">
              {PLATFORM_CONFIG.brandName}
            </span>
            <span className="text-emerald-600 font-semibold text-[10px] flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
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
