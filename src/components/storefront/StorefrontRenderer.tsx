'use client';

import React from 'react';
import { Business, Category, Product } from '@/types';
import { StorefrontColors, StorefrontTemplateId } from '@/types';
import { getContrastTextColor } from '@/lib/designPresets';
import { getCategoryFoodImage } from '@/lib/categories';
import { StorefrontTicker } from './StorefrontTicker';
import { formatINR, cn } from '@/lib/utils';
import {
  Store,
  UtensilsCrossed,
  Search,
  PhoneCall,
  ShoppingBag,
  Sparkles,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Layers,
  Wrench,
  Paintbrush,
  Droplets,
  Zap,
  Boxes,
  Shirt,
  Smartphone,
  Flame,
  Award,
  X,
} from 'lucide-react';

interface StorefrontRendererProps {
  business: Business;
  products: Product[];
  categories: Category[];
  templateId: StorefrontTemplateId;
  colors: StorefrontColors;
  coverImageUrl?: string;
  cart: { [productId: string]: number };
  onUpdateQuantity: (productId: string, delta: number) => void;
  onOpenCart?: () => void;
  isPreview?: boolean;
  isRestaurant?: boolean;
  selectedCat: string;
  onSelectCat: (catId: string) => void;
  search: string;
  onSearchChange: (text: string) => void;
  dietaryFilter?: 'all' | 'veg' | 'spicy' | 'jain';
  onDietaryFilterChange?: (filter: 'all' | 'veg' | 'spicy' | 'jain') => void;
}

export function StorefrontRenderer({
  business,
  products,
  categories,
  templateId,
  colors,
  coverImageUrl,
  cart,
  onUpdateQuantity,
  onOpenCart,
  isPreview = false,
  isRestaurant = false,
  selectedCat,
  onSelectCat,
  search,
  onSearchChange,
  dietaryFilter = 'all',
  onDietaryFilterChange,
}: StorefrontRendererProps) {
  const contrastButtonText = getContrastTextColor(colors.button);
  const contrastPrimaryText = getContrastTextColor(colors.primary);

  const isStoreOpen = business?.isStoreOpen ?? business?.settings?.isStoreOpen ?? true;
  const onlineOrderingEnabled =
    business?.onlineOrderingEnabled ?? business?.settings?.onlineOrderingEnabled ?? true;
  const canAcceptOnlineOrders = isStoreOpen && onlineOrderingEnabled;

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(Boolean(search?.trim()));
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [waiterDialogOpen, setWaiterDialogOpen] = React.useState(false);
  const [waiterTable, setWaiterTable] = React.useState('');
  const [waiterRequest, setWaiterRequest] = React.useState<{ id: string; tableNumber: string; status: 'pending' | 'acknowledged' | 'completed'; createdAt: string } | null>(null);
  const [waiterAccessToken, setWaiterAccessToken] = React.useState('');
  const [waiterSending, setWaiterSending] = React.useState(false);
  const [waiterError, setWaiterError] = React.useState('');
  const isWaiterCallEligible = !isPreview &&
    (business.type === 'restaurant' || business.category === 'restaurant') &&
    Boolean(business.settings?.orderSettings?.enableDineIn) &&
    business.settings?.waiterCalls?.enabled !== false &&
    Boolean(waiterTable.trim());

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrTable = params.get('table') || params.get('tableNumber');
    setWaiterTable(qrTable ? qrTable.replace(/^(table\s*(no\.?|#)?\s*)/i, '').trim() : '');
  }, [business.slug]);

  React.useEffect(() => {
    if (!waiterRequest || !waiterAccessToken || waiterRequest.status === 'completed') return;
    const refreshStatus = async () => {
      try {
        const params = new URLSearchParams({ requestId: waiterRequest.id });
        const response = await fetch(`/api/waiter-requests?${params.toString()}`, {
          cache: 'no-store', headers: { Authorization: `Bearer ${waiterAccessToken}` },
        });
        const data = await response.json();
        if (data.success && data.request) setWaiterRequest(data.request);
      } catch { /* keep showing the last known status while offline */ }
    };
    const timer = window.setInterval(refreshStatus, 4000);
    return () => window.clearInterval(timer);
  }, [waiterRequest?.id, waiterRequest?.status, waiterAccessToken]);

  const callWaiter = async () => {
    if (!waiterTable.trim() || waiterSending || !isWaiterCallEligible) return;
    setWaiterSending(true);
    setWaiterError('');
    try {
      const response = await fetch('/api/waiter-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: business.slug, tableNumber: waiterTable.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not call a waiter.');
      setWaiterRequest(data.request);
      setWaiterAccessToken(data.accessToken);
    } catch (error: any) {
      setWaiterError(error.message || 'Could not call a waiter. Please try again.');
    } finally {
      setWaiterSending(false);
    }
  };

  const handleWaiterCallClick = () => {
    setWaiterDialogOpen(true);
    setWaiterError('');
    if (waiterRequest && waiterRequest.status !== 'completed') return;
    setWaiterRequest(null);
    setWaiterAccessToken('');
    void callWaiter();
  };

  const renderCategoryTabIcon = (name: string) => {
    const lower = name.toLowerCase();

    // 1. Pizzas
    if (lower.includes('pizza')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4 5 24a18 18 0 0 0 22 0L16 4Z" />
          <path d="M5 24a18 18 0 0 0 22 0" fill="#FACC15" stroke="#1e293b" />
          <circle cx="16" cy="14" r="1.5" fill="#FACC15" stroke="#1e293b" />
          <circle cx="12" cy="19" r="1.5" fill="#FACC15" stroke="#1e293b" />
          <circle cx="20" cy="19" r="1.5" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 2. Rolls / Wrap / Shawarma / Kathi
    if (lower.includes('roll') || lower.includes('wrap') || lower.includes('shawarma') || lower.includes('kathi')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="11" width="18" height="10" rx="5" transform="rotate(-30 16 16)" />
          <circle cx="23" cy="9" r="3" fill="#FACC15" stroke="#1e293b" />
          <line x1="12" y1="21" x2="16" y2="19" stroke="#FACC15" />
        </svg>
      );
    }

    // 3. Burger / Burgers
    if (lower.includes('burger')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 14a10 10 0 0 1 20 0H6Z" />
          <rect x="5" y="16" width="22" height="4" rx="1.5" fill="#FACC15" stroke="#1e293b" />
          <rect x="6" y="22" width="20" height="5" rx="2.5" />
        </svg>
      );
    }

    // 4. Chinese / Noodles / Momos / Chowmein / Manchurian
    if (lower.includes('chinese') || lower.includes('noodle') || lower.includes('momo') || lower.includes('chow') || lower.includes('manchurian')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 15h22a11 11 0 0 1-22 0Z" />
          <path d="M7 15c2-3 5-3 8 0s6 3 8 0" fill="#FACC15" stroke="#1e293b" />
          <path d="M22 6 15 15" />
          <path d="M26 7 17 15" />
        </svg>
      );
    }

    // 5. Dessert / Cakes / Sweets / Pastry
    if (lower.includes('dessert') || lower.includes('cake') || lower.includes('sweet') || lower.includes('pastry') || lower.includes('bakery')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 17h20v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9Z" />
          <path d="M6 17c1.5-2.5 3.5-2.5 5 0s3.5 2.5 5 0 3.5-2.5 5 0 3.5 2.5 5 0" fill="#FACC15" stroke="#1e293b" />
          <path d="M16 8v5" />
          <circle cx="16" cy="6" r="2" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 6. North Indian / Thali / Curry / Dal / Paneer / Roti
    if (lower.includes('north') || lower.includes('thali') || lower.includes('curry') || lower.includes('dal') || lower.includes('paneer') || lower.includes('roti')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" />
          <circle cx="12" cy="13" r="3" fill="#FACC15" stroke="#1e293b" />
          <circle cx="20" cy="13" r="3" fill="#FACC15" stroke="#1e293b" />
          <ellipse cx="16" cy="21" rx="4" ry="2" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 7. South Indian / Dosa / Idli / Sambar / Vada
    if (lower.includes('south') || lower.includes('dosa') || lower.includes('idli') || lower.includes('sambar') || lower.includes('vada')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="10" width="22" height="6" rx="3" transform="rotate(-15 16 13)" fill="#FACC15" stroke="#1e293b" />
          <ellipse cx="16" cy="22" rx="10" ry="4" />
          <circle cx="16" cy="22" r="2.5" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 8. Ice cream / Icecream / Kulfi / Gelato
    if (lower.includes('ice') || lower.includes('cream') || lower.includes('kulfi') || lower.includes('gelato')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 16 16 28 21 16" />
          <path d="M11 16a5 5 0 0 1 10 0" fill="#FACC15" stroke="#1e293b" />
          <circle cx="16" cy="11" r="5" />
        </svg>
      );
    }

    // 9. Biryani / Pulao / Rice
    if (lower.includes('biryani') || lower.includes('rice') || lower.includes('pulao')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 14h16v8a8 8 0 0 1-16 0v-8Z" />
          <path d="M8 14c2-4 6-4 8 0s6 4 8 0" fill="#FACC15" stroke="#1e293b" />
          <path d="M13 8c1 2 2 2 3 0s2-2 3 0" stroke="#FACC15" />
        </svg>
      );
    }

    // 10. Beverages / Drinks / Tea / Coffee / Chai / Juice / Shake
    if (lower.includes('beverage') || lower.includes('drink') || lower.includes('tea') || lower.includes('chai') || lower.includes('coffee') || lower.includes('juice') || lower.includes('shake')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10h15v9a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-9Z" />
          <path d="M21 12h2a3 3 0 0 1 0 6h-2" />
          <rect x="8" y="12" width="11" height="4" rx="2" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 11. Sandwich / Toast
    if (lower.includes('sandwich') || lower.includes('toast')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 24 24 6l2 2-18 18H6v-2Z" />
          <path d="M10 16l6-6" stroke="#FACC15" />
          <rect x="7" y="21" width="14" height="4" rx="1" fill="#FACC15" stroke="#1e293b" transform="rotate(-45 14 23)" />
        </svg>
      );
    }

    // 12. Starters / Chaat / Snacks / Appetizers
    if (lower.includes('starter') || lower.includes('chaat') || lower.includes('snack') || lower.includes('appetizer')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16h18a9 9 0 0 1-18 0Z" />
          <circle cx="12" cy="12" r="2.5" fill="#FACC15" stroke="#1e293b" />
          <circle cx="17" cy="10" r="2.5" fill="#FACC15" stroke="#1e293b" />
          <circle cx="21" cy="13" r="2" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 13. Fashion / Clothing / Shirts / Apparel / Wear
    if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('shirt') || lower.includes('wear') || lower.includes('apparel')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 6a5 5 0 0 0 10 0l5 3-2 5-3-1v13H11V13l-3 1-2-5 5-3Z" />
          <rect x="11" y="23" width="10" height="3" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 14. Mobiles / Phones / Smartphone
    if (lower.includes('mobile') || lower.includes('phone') || lower.includes('gadget')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="4" width="14" height="24" rx="3" />
          <line x1="14" y1="7" x2="18" y2="7" />
          <rect x="13" y="23" width="6" height="2" rx="1" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 15. Electronics / Laptops / Computers
    if (lower.includes('electr') || lower.includes('laptop') || lower.includes('computer')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="18" height="13" rx="2" />
          <path d="M4 24h24l-2-4H6l-2 4Z" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 16. Beauty / Cosmetics / Makeup / Skincare
    if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('makeup') || lower.includes('skin')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="11" y="14" width="10" height="14" rx="2" />
          <path d="M13 14V9l6-3v8" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 17. Home / Lamp / Furniture / Decor
    if (lower.includes('home') || lower.includes('lamp') || lower.includes('decor') || lower.includes('furniture')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14h14l-3-8H12l-3 8Z" fill="#FACC15" stroke="#1e293b" />
          <line x1="16" y1="14" x2="16" y2="24" />
          <line x1="11" y1="24" x2="21" y2="24" />
        </svg>
      );
    }

    // 18. Appliances / TV
    if (lower.includes('appliance') || lower.includes('tv')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="6" width="22" height="16" rx="2" />
          <path d="M12 26l4-4 4 4" fill="#FACC15" stroke="#1e293b" />
          <line x1="10" y1="26" x2="22" y2="26" />
        </svg>
      );
    }

    // 19. Toys / Baby / Kids
    if (lower.includes('toy') || lower.includes('baby') || lower.includes('kid')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="13" r="5" />
          <circle cx="11" cy="9" r="2.5" />
          <circle cx="21" cy="9" r="2.5" />
          <circle cx="16" cy="22" r="6" />
          <circle cx="16" cy="22" r="2.5" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 20. Food & Health / Grocery / Provisions
    if (lower.includes('food') || lower.includes('grocery') || lower.includes('health') || lower.includes('provision')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="11" width="16" height="17" rx="3" />
          <rect x="11" y="6" width="10" height="5" rx="1.5" />
          <rect x="8" y="15" width="16" height="5" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 21. Hardware / Cement / Paints / Tools / Pipes / Steel
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('aggregate')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10h18l2 16H5L7 10Z" />
          <circle cx="16" cy="18" r="4" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }
    if (lower.includes('paint') || lower.includes('color') || lower.includes('finish')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 14h20v8a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-8Z" />
          <path d="M6 14c2-4 8-4 10 0s8 4 10 0" fill="#FACC15" stroke="#1e293b" />
          <path d="M16 6v4" />
        </svg>
      );
    }
    if (lower.includes('steel') || lower.includes('iron') || lower.includes('rebar') || lower.includes('mesh')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="8" width="20" height="4" rx="1" fill="#FACC15" stroke="#1e293b" />
          <rect x="6" y="14" width="20" height="4" rx="1" />
          <rect x="6" y="20" width="20" height="4" rx="1" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('sanitary') || lower.includes('water')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8h10v6h10v10h-6v-4H10V8H6" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('light') || lower.includes('switch')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 4 7 17h8l-2 11 11-13h-8l2-11Z" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw') || lower.includes('fastener')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 6a6 6 0 0 1 8 8l-10 12-4-4L16 10a6 6 0 0 1-2-4Z" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // 22. Featured / Star / Special / Best
    if (lower.includes('featured') || lower.includes('special') || lower.includes('best') || lower.includes('top')) {
      return (
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="16 3 20.5 12 30 13.5 23 20 25 29.5 16 25 7 29.5 9 20 2 13.5 11.5 12 16 3" fill="#FACC15" stroke="#1e293b" />
        </svg>
      );
    }

    // Default Fallback Icon
    return (
      <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="7" width="20" height="18" rx="3" />
        <path d="M6 13h20" fill="#FACC15" stroke="#1e293b" />
        <circle cx="16" cy="19" r="2" fill="#FACC15" stroke="#1e293b" />
      </svg>
    );
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cement') || lower.includes('concrete') || lower.includes('aggregate')) {
      return <Boxes className="w-4 h-4" />;
    }
    if (lower.includes('steel') || lower.includes('rebar') || lower.includes('iron') || lower.includes('metal')) {
      return <Layers className="w-4 h-4" />;
    }
    if (lower.includes('paint') || lower.includes('color') || lower.includes('finish')) {
      return <Paintbrush className="w-4 h-4" />;
    }
    if (lower.includes('pipe') || lower.includes('plumb') || lower.includes('sanitary') || lower.includes('water')) {
      return <Droplets className="w-4 h-4" />;
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('light') || lower.includes('switch')) {
      return <Zap className="w-4 h-4" />;
    }
    if (lower.includes('tool') || lower.includes('hardware') || lower.includes('screw')) {
      return <Wrench className="w-4 h-4" />;
    }
    if (lower.includes('cloth') || lower.includes('fashion') || lower.includes('wear')) {
      return <Shirt className="w-4 h-4" />;
    }
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('gadget')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Package className="w-4 h-4" />;
  };

  const visibleCategories = categories.filter((c) => c.salesChannel !== 'pos');
  const visibleProducts = products.filter((p) => p.salesChannel !== 'pos');

  const filteredProducts = visibleProducts.filter((p) => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    if (isRestaurant && dietaryFilter !== 'all') {
      const flags = p.dietaryFlags || {};
      if (dietaryFilter === 'veg' && !flags.isVeg) return false;
      if (dietaryFilter === 'spicy' && !flags.isSpicy) return false;
      if (dietaryFilter === 'jain' && !flags.isJain) return false;
    }
    return true;
  });

  const effectiveCover =
    coverImageUrl ||
    business.coverImageUrl ||
    business.settings?.coverImageUrl ||
    business.settings?.storefrontDesign?.coverImageUrl;

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {/* ============================================================ */}
      {/* TEMPLATE 1: CLASSIC HEADER — Full Hero Cover Style          */}
      {/* ============================================================ */}
      {templateId === 'classic' && (
        <div className="relative w-full" style={{ minHeight: '150px' }}>
          {/* Hero Background: cover image from DB, or brand gradient fallback */}
          <div
            className="relative w-full overflow-hidden rounded-b-3xl"
            style={{ minHeight: '150px', maxHeight: '210px' }}
          >
            {effectiveCover ? (
              <img
                src={effectiveCover}
                alt={business.name}
                className="w-full h-full object-cover absolute inset-0"
                style={{ minHeight: '150px', maxHeight: '210px' }}
                fetchPriority="high"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary || colors.primary}cc 100%)`,
                }}
              />
            )}

            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Top bar: cart icon top, search icon below */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
              {/* Cart icon + badge (TOP) */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg transition-all hover:bg-white/30 active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center border border-white"
                    style={{ backgroundColor: colors.button, color: contrastButtonText }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Search Toggle Icon (BELOW cart) */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => searchInputRef.current?.focus(), 60);
                    }
                    return next;
                  });
                }}
                className={cn(
                  'relative w-9 h-9 rounded-full backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg transition-all hover:bg-white/30 active:scale-95 cursor-pointer',
                  isSearchOpen ? 'bg-white/35 ring-2 ring-white/60' : 'bg-white/20'
                )}
                title={isSearchOpen ? 'Close Search' : 'Search Products'}
              >
                <Search className="w-4 h-4" />
              </button>
              {isWaiterCallEligible && (
                <button
                  type="button"
                  onClick={handleWaiterCallClick}
                  disabled={waiterSending}
                  className="relative w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg transition-all hover:bg-white/30 active:scale-95 cursor-pointer"
                  title="Call a waiter"
                  aria-label="Call a waiter"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Text overlay: left-aligned, upper area */}
            <div className="absolute inset-0 z-10 flex flex-col items-start justify-start px-4 pt-12">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                {business.name}
              </h1>
              {business.description && (
                <p className="mt-0.5 text-xs text-white/80 leading-snug max-w-xs drop-shadow line-clamp-1">
                  {business.description}
                </p>
              )}
            </div>
          </div>

          {/* Thin sticky top-bar after scrolling past hero (transparent, just for spacing) */}
          <div className="sticky top-0 z-30 pointer-events-none h-0" />
        </div>
      )}

      {/* ============================================================ */}
      {/* TEMPLATE 2: MODERN HERO BANNER                               */}
      {/* ============================================================ */}
      {templateId === 'modern' && (
        <div className="relative">
          {/* Hero Banner Section */}
          <div
            className="relative w-full h-44 sm:h-56 overflow-hidden flex items-end"
            style={{
              background: effectiveCover
                ? `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.15) 100%), url(${effectiveCover}) center/cover no-repeat`
                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            {/* Ambient decorative shine */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />

            <div className="max-w-4xl mx-auto w-full px-4 pb-4 flex items-end justify-between gap-3 relative z-10">
              <div className="flex items-end gap-3.5">
                {/* Elevated Store Logo with Ring */}
                <div className="relative -mb-1 shrink-0">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white shadow-xl bg-white"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center font-black text-xl"
                      style={{
                        backgroundColor: colors.primary,
                        color: contrastPrimaryText,
                      }}
                    >
                      {business.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {canAcceptOnlineOrders && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-xs"
                      title="Open & Accepting Orders"
                    />
                  )}
                </div>

                <div className="text-white pb-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-xl font-black tracking-tight drop-shadow-md">
                      {business.name}
                    </h1>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-white/20 text-white border border-white/30"
                    >
                      {isRestaurant ? 'Dining' : 'Retail'}
                    </span>
                  </div>
                  {business.description ? (
                    <p className="text-xs text-white/90 line-clamp-1 mt-0.5 drop-shadow-xs max-w-md">
                      {business.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/80 mt-0.5">
                      {business.settings?.operatingHours || '09:00 AM - 09:00 PM'}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Button on Modern Header */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => searchInputRef.current?.focus(), 60);
                    }
                    return next;
                  });
                }}
                className={cn(
                  'relative flex items-center justify-center w-9 h-9 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0 mb-0.5 border border-white/20',
                  isSearchOpen ? 'bg-white/35 text-white ring-2 ring-white/60' : 'bg-white/20 text-white hover:bg-white/30'
                )}
                title={isSearchOpen ? 'Close Search' : 'Search Products'}
              >
                <Search className="w-4 h-4" />
              </button>

              {isWaiterCallEligible && (
                <button
                  type="button"
                  onClick={handleWaiterCallClick}
                  disabled={waiterSending}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-white/20 bg-white/20 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 cursor-pointer shrink-0 mb-0.5"
                  title="Call a waiter"
                  aria-label="Call a waiter"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              )}

              {/* Cart Button on Modern Header */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0 mb-0.5"
                style={{
                  backgroundColor: colors.button,
                  color: contrastButtonText,
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{isRestaurant ? 'Your Order' : 'Store Cart'}</span>
                {cartCount > 0 && (
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.button,
                    }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog Body */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-2 pb-12 space-y-2 flex-1">
        {/* Moving Notification & Social Links Ribbon (if configured) */}
        <StorefrontTicker business={business} isRestaurant={isRestaurant} />

        {/* Search Input Bar (Toggled by Search Icon) */}
        {isSearchOpen && (
          <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                isRestaurant
                  ? 'Search dishes, drinks, biryani, combos...'
                  : business.type.includes('hardware')
                  ? 'Search cement, TMT steel, pipes, paints, tools, electrical...'
                  : 'Search products, brand, items...'
              }
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                'w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200/90 text-xs focus:outline-none shadow-2xs transition-all',
                templateId === 'modern' ? 'rounded-2xl' : 'rounded-xl'
              )}
              style={{
                borderColor: search ? colors.primary : undefined,
              }}
              autoFocus
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* CATEGORIES NAVIGATION (Reference Tab Bar Style)              */}
        {/* ============================================================ */}
        <div className="w-full border-b border-slate-200/80 pt-1.5 pb-0 select-none">
          <div className="flex items-end gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none px-1.5 scroll-smooth">
            {/* First Tab: "For You" */}
            <button
              type="button"
              onClick={() => onSelectCat('all')}
              className="group flex flex-col items-center shrink-0 text-center cursor-pointer focus:outline-none min-w-[60px] sm:min-w-[68px] px-1"
            >
              <div
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                  selectedCat === 'all'
                    ? 'bg-[#CFEAFF]'
                    : 'bg-transparent group-hover:bg-slate-200/50'
                )}
              >
                {/* Shopping bag with curved yellow accent (Flipkart / Meesho reference) */}
                <svg viewBox="0 0 32 32" className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="7" y="9" width="18" height="18" rx="4" />
                  <path d="M12 9V7a4 4 0 0 1 8 0v2" />
                  <path d="M11 14a5 5 0 0 0 10 0" fill="#FACC15" stroke="#1e293b" />
                </svg>
              </div>
              <span
                className={cn(
                  'mt-1.5 text-[11px] sm:text-xs tracking-tight leading-tight truncate max-w-[60px] sm:max-w-[68px] text-center transition-colors',
                  selectedCat === 'all'
                    ? 'font-bold text-slate-900'
                    : 'font-medium text-slate-600 group-hover:text-slate-900'
                )}
              >
                For You
              </span>
              <div
                className={cn(
                  'w-full h-[3px] rounded-full mt-1.5 transition-all',
                  selectedCat === 'all' ? 'bg-[#397CF4]' : 'bg-transparent'
                )}
              />
            </button>

            {/* Dynamic Categories from Database Backend */}
            {visibleCategories.map((c) => {
              const isSelected = selectedCat === c.id;
              const catImage = c.imageUrl || (isRestaurant ? getCategoryFoodImage(c.name) : undefined);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCat(c.id)}
                  className="group flex flex-col items-center shrink-0 text-center cursor-pointer focus:outline-none min-w-[60px] sm:min-w-[68px] px-1"
                >
                  <div
                    className={cn(
                      'relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-150 overflow-hidden',
                      isSelected
                        ? 'bg-[#CFEAFF]'
                        : 'bg-transparent group-hover:bg-slate-200/50'
                    )}
                  >
                    {catImage ? (
                      <img
                        src={catImage}
                        alt={c.name}
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={cn(catImage ? 'hidden' : 'flex', 'items-center justify-center w-full h-full')}>
                      {renderCategoryTabIcon(c.name)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'mt-1.5 text-[11px] sm:text-xs tracking-tight leading-tight truncate max-w-[60px] sm:max-w-[68px] text-center transition-colors',
                      isSelected
                        ? 'font-bold text-slate-900'
                        : 'font-medium text-slate-600 group-hover:text-slate-900'
                    )}
                    title={c.name}
                  >
                    {c.name}
                  </span>
                  <div
                    className={cn(
                      'w-full h-[3px] rounded-full mt-1.5 transition-all',
                      isSelected ? 'bg-[#397CF4]' : 'bg-transparent'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRODUCT CATALOG GRID                                         */}
        {/* ============================================================ */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="font-bold text-sm text-slate-800">
              {products.length === 0 ? 'No products available yet' : 'No items match your search'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {products.length === 0
                ? isPreview
                  ? 'Add products or menu items from the dashboard catalog to display them here.'
                  : 'Please check back soon. The store owner will add items shortly.'
                : 'Try clearing your search query or choosing another category above.'}
            </p>
          </div>
        ) : templateId === 'classic' ? (
          /* ============================================================ */
          /* CLASSIC PRODUCT CARDS GRID                                   */
          /* ============================================================ */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((p) => {
              const inCartQty = cart[p.id] || 0;
              const hasDiscount = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
              const effectivePrice = hasDiscount ? p.salePrice! : p.price;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-soft transition-all flex flex-col justify-between"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        {isRestaurant ? <UtensilsCrossed className="w-8 h-8 opacity-40" /> : <Package className="w-8 h-8 opacity-40" />}
                      </div>
                    )}
                    {hasDiscount && (
                      <span
                        className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs text-white"
                        style={{ backgroundColor: colors.accent }}
                      >
                        SALE
                      </span>
                    )}
                  </div>

                  {/* Product Content */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {p.size && (
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {p.size}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 font-medium">/{p.unit || 'pc'}</span>
                        {p.variants && p.variants.length > 0 && (
                          <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 font-semibold">
                            {p.variants.length} sizes
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-black text-xs text-slate-900">{formatINR(effectivePrice)}</span>
                        {hasDiscount && (
                          <span className="text-[10px] text-slate-400 line-through ml-1">
                            {formatINR(p.price)}
                          </span>
                        )}
                      </div>

                      {inCartQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(p.id, 1)}
                          className="px-2.5 py-1 rounded-lg font-bold text-xs transition-transform active:scale-95 cursor-pointer"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          Add
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, -1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            -
                          </button>
                          <span className="text-[11px]">{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, 1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* MODERN PRODUCT CARDS GRID (Visual & Prominent)               */
          /* ============================================================ */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredProducts.map((p) => {
              const inCartQty = cart[p.id] || 0;
              const hasDiscount = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
              const effectivePrice = hasDiscount ? p.salePrice! : p.price;
              const discountPercent = hasDiscount
                ? Math.round(((p.price - p.salePrice!) / p.price) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-card transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Modern Product Image Container with Zoom */}
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        {isRestaurant ? (
                          <UtensilsCrossed className="w-10 h-10 opacity-30" />
                        ) : (
                          <Package className="w-10 h-10 opacity-30" />
                        )}
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {hasDiscount ? (
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full shadow-md text-white tracking-tight"
                          style={{ backgroundColor: colors.accent }}
                        >
                          {discountPercent}% OFF
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* Stock / Unit info for retail */}
                      {!isRestaurant && p.unit && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                          {p.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Modern Product Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {p.size && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {p.size}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium">per {p.unit || 'piece'}</span>
                        {p.variants && p.variants.length > 0 && (
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                            {p.variants.length} sizes available
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-sm text-slate-900">
                            {formatINR(effectivePrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-slate-400 line-through font-medium">
                              {formatINR(p.price)}
                            </span>
                          )}
                        </div>
                        {!isRestaurant && p.stockQuantity !== undefined && p.stockQuantity <= 5 && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            Only {p.stockQuantity} left
                          </span>
                        )}
                      </div>

                      {inCartQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(p.id, 1)}
                          className="px-3.5 py-1.5 rounded-xl font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs"
                          style={{
                            backgroundColor: colors.button,
                            color: contrastButtonText,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, -1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            -
                          </button>
                          <span>{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(p.id, 1)}
                            className="w-4 h-4 flex items-center justify-center hover:opacity-80"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* STOREFRONT FOOTER                                             */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 pb-3 sm:pb-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            {/* Hours, Contact Phone & Address */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-slate-600">
              {business.settings?.operatingHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{business.settings.operatingHours}</span>
                </div>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-1.5 hover:underline transition-colors"
                >
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{business.phone}</span>
                </a>
              )}
              {business.address && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{business.address}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {business.settings?.socialLinks && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {business.settings.socialLinks.googleBusinessEnabled &&
                  business.settings.socialLinks.googleBusiness && (
                    <a
                      href={business.settings.socialLinks.googleBusiness}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-blue-600 font-bold hover:bg-blue-50 text-[9px] sm:text-[10px] transition-colors"
                    >
                      <span>Google</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                {business.settings.socialLinks.instagramEnabled &&
                  business.settings.socialLinks.instagram && (
                    <a
                      href={business.settings.socialLinks.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-rose-600 font-bold hover:bg-rose-50 text-[9px] sm:text-[10px] transition-colors"
                    >
                      <span>Instagram</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                {business.settings.socialLinks.youtubeEnabled &&
                  business.settings.socialLinks.youtube && (
                    <a
                      href={business.settings.socialLinks.youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-red-600 font-bold hover:bg-red-50 text-[9px] sm:text-[10px] transition-colors"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] sm:text-[10px] text-slate-400">
            <span>
              © {new Date().getFullYear()} {business.name}. All rights reserved.
            </span>
            <span>Powered by OrderOne.in</span>
          </div>
        </div>
      </footer>
      {waiterDialogOpen && isWaiterCallEligible && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setWaiterDialogOpen(false);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiter-call-title"
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl pb-safe"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="waiter-call-title" className="text-lg font-black text-slate-900">Call a waiter</h2>
                <p className="mt-1 text-sm text-slate-500">Requesting service for Table {waiterTable}.</p>
              </div>
              <button type="button" onClick={() => setWaiterDialogOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {waiterRequest ? (
              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <p className="font-bold text-slate-900">Table {waiterRequest.tableNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Request sent at {new Date(waiterRequest.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-700">
                  <span className={cn('h-2 w-2 rounded-full', waiterRequest.status === 'completed' ? 'bg-emerald-500' : waiterRequest.status === 'acknowledged' ? 'bg-amber-500' : 'bg-indigo-500 animate-pulse')} />
                  {waiterRequest.status === 'completed' ? 'Completed' : waiterRequest.status === 'acknowledged' ? 'Acknowledged' : 'Pending'}
                </div>
                {waiterRequest.status === 'completed' && (
                  <button type="button" onClick={() => { setWaiterRequest(null); setWaiterAccessToken(''); setWaiterError(''); }} className="mt-4 block text-xs font-bold text-indigo-700 hover:underline">
                    Make another request
                  </button>
                )}
              </div>
            ) : waiterSending ? (
              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm font-semibold text-indigo-800" role="status">
                Sending a waiter request for Table {waiterTable}…
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {waiterError ? (
                  <p role="alert" className="text-sm font-medium text-rose-600">{waiterError}</p>
                ) : (
                  <p className="text-sm text-slate-600">Table number detected from this table’s QR code.</p>
                )}
                {waiterError && (
                  <button type="button" onClick={() => void callWaiter()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                    <PhoneCall className="h-4 w-4" /> Try again for Table {waiterTable}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
