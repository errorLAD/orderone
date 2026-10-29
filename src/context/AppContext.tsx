'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Business, Role, OrderSourceType, OrderItem, NotificationItem, User } from '@/types';

export interface CartItem extends OrderItem {
  image?: string;
}

interface AppContextType {
  // Real Authentication & Session
  currentUser: User | null;
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; hasBusiness?: boolean }>;
  register: (data: { email: string; password: string; name: string; businessId?: string }) => Promise<{ success: boolean; error?: string }>;
  registerBusiness: (data: {
    businessName: string;
    category: any;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    password: string;
  }) => Promise<{ success: boolean; business?: Business; error?: string }>;
  logout: () => Promise<void>;

  // Business & Role State
  currentBusiness: Business | null;
  setCurrentBusiness: (biz: Business) => void;
  updateStoreOperations: (params: { isStoreOpen?: boolean; onlineOrderingEnabled?: boolean }) => Promise<{ success: boolean; error?: string }>;
  businesses: Business[];
  refreshBusinesses: () => Promise<void>;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;

  // Real-time Notifications & Audio
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playOrderChime: (sourceType: OrderSourceType) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  // Public Store/Menu Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('owner');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Authenticate & Restore Active Session
  const checkSession = async (preferredBizId?: string) => {
    try {
      setIsLoadingAuth(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('orderone_auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = preferredBizId ? `/api/auth/me?businessId=${encodeURIComponent(preferredBizId)}` : '/api/auth/me';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setCurrentRole(data.user.role);
          const authorized: Business[] = data.authorizedBusinesses || (data.business ? [data.business] : []);
          setBusinesses(authorized);

          // Check if localStorage has an ID, and verify it strictly belongs to authorized businesses
          const savedBizId = typeof window !== 'undefined'
            ? localStorage.getItem('orderone_active_biz_id')
            : null;

          let chosenBiz: Business | null = null;
          if (savedBizId && authorized.some((b) => b.id === savedBizId)) {
            chosenBiz = authorized.find((b) => b.id === savedBizId) || null;
          } else if (data.business && authorized.some((b) => b.id === data.business.id)) {
            chosenBiz = data.business;
          } else if (authorized.length > 0) {
            chosenBiz = authorized[0];
          }

          setCurrentBusiness(chosenBiz);
          if (typeof window !== 'undefined') {
            if (chosenBiz) {
              localStorage.setItem('orderone_active_biz_id', chosenBiz.id);
            } else {
              localStorage.removeItem('orderone_active_biz_id');
              localStorage.removeItem('antigravity_active_biz_id');
            }
          }
          return { user: data.user, business: chosenBiz, businesses: authorized };
        }
      }
      // If unauthenticated or session expired:
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orderone_auth_token');
        localStorage.removeItem('orderone_active_biz_id');
        localStorage.removeItem('antigravity_active_biz_id');
      }
    } catch (e) {
      console.error('Session check failed:', e);
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orderone_auth_token');
        localStorage.removeItem('orderone_active_biz_id');
        localStorage.removeItem('antigravity_active_biz_id');
      }
    } finally {
      setIsLoadingAuth(false);
    }
    return null;
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Immediately clear any previous session or cached business state
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orderone_auth_token');
        localStorage.removeItem('orderone_active_biz_id');
        localStorage.removeItem('antigravity_active_biz_id');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('orderone_auth_token', data.token);
        }

        // Authoritatively set user and roles from verified server response
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);

        const authorized: Business[] = data.authorizedBusinesses || (data.business ? [data.business] : []);
        setBusinesses(authorized);

        const chosenBiz: Business | null = data.business || (authorized.length > 0 ? authorized[0] : null);
        setCurrentBusiness(chosenBiz);

        if (typeof window !== 'undefined' && chosenBiz) {
          localStorage.setItem('orderone_active_biz_id', chosenBiz.id);
        }

        return {
          success: true,
          hasBusiness: Boolean(chosenBiz),
        };
      }
      return { success: false, error: data.error || 'Invalid email or password' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const register = async (formData: { email: string; password: string; name: string; businessId?: string }) => {
    try {
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orderone_auth_token');
        localStorage.removeItem('orderone_active_biz_id');
        localStorage.removeItem('antigravity_active_biz_id');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('orderone_auth_token', data.token);
        }
        await checkSession();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to create account' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const registerBusiness = async (formData: {
    businessName: string;
    category: any;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    password: string;
  }) => {
    try {
      setCurrentUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orderone_auth_token');
        localStorage.removeItem('orderone_active_biz_id');
        localStorage.removeItem('antigravity_active_biz_id');
      }

      const res = await fetch('/api/auth/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.user && data.business) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('orderone_auth_token', data.token);
        }
        await checkSession();
        return { success: true, business: data.business };
      }
      return { success: false, error: data.error || 'Failed to register business' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('orderone_auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/auth/logout', { method: 'POST', headers });
    } catch (err) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orderone_auth_token');
      localStorage.removeItem('orderone_active_biz_id');
      localStorage.removeItem('antigravity_active_biz_id');
    }
    setCurrentUser(null);
    setCurrentBusiness(null);
    setBusinesses([]);
    window.location.href = '/login';
  };

  const handleSetCurrentBusiness = (biz: Business) => {
    if (businesses.length > 0 && !businesses.some((b) => b.id === biz.id)) {
      console.warn('Attempted to select unauthorized business:', biz.id);
      return;
    }
    setCurrentBusiness(biz);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderone_active_biz_id', biz.id);
    }
  };

  // Synthesize clean audio chimes for new orders strictly inside the shop dashboard
  const playOrderChime = (sourceType: OrderSourceType) => {
    if (!soundEnabled) return;
    // Strict safety guard: NEVER ring on customer-facing storefronts, menus, tracking, or outside dashboard
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard')) {
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = sourceType === 'store' ? 'triangle' : 'sine';
      const now = ctx.currentTime;
      if (sourceType === 'store') {
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      } else {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
      }

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio playback not permitted or not supported:', e);
    }
  };

  // Fetch Businesses strictly for current user
  const refreshBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      if (data.success && Array.isArray(data.businesses)) {
        const authorized = data.businesses;
        setBusinesses(authorized);

        setCurrentBusiness((prev) => {
          if (prev && authorized.some((b: Business) => b.id === prev.id)) {
            return authorized.find((b: Business) => b.id === prev.id) || prev;
          }
          if (authorized.length > 0) {
            if (typeof window !== 'undefined') localStorage.setItem('orderone_active_biz_id', authorized[0].id);
            return authorized[0];
          }
          if (typeof window !== 'undefined') {
            localStorage.removeItem('orderone_active_biz_id');
            localStorage.removeItem('antigravity_active_biz_id');
          }
          return null;
        });
      }
    } catch (e) {
      console.error('Error fetching businesses:', e);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Fetch Notifications when currentBusiness changes
  const fetchNotifications = async () => {
    if (!currentBusiness) return;
    try {
      const res = await fetch(`/api/notifications?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      fetchNotifications();
    }
  }, [currentBusiness?.id]);

  // Real-time SSE Connection strictly for authorized merchant dashboard & admin
  useEffect(() => {
    if (!currentBusiness) return;
    // Do not connect SSE notifications or play alerts on customer storefront, menu, or tracking pages
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard') && !window.location.pathname.startsWith('/admin')) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/realtime?businessId=${currentBusiness.id}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ORDER_CREATED') {
            const { order, notification } = payload;
            setNotifications((prev) => [notification, ...prev]);
            // Only play chime strictly if currently on the merchant dashboard
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
              playOrderChime(order.sourceType);
            }
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Auto-reconnect after 4s
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentBusiness?.id, soundEnabled]);

  // Mark notification read
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!currentBusiness) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusiness.id, markAll: true }),
      });
    } catch (e) {
      console.error('Error marking all notifications read:', e);
    }
  };

  // Cart operations
  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.selectedVariant?.id === item.selectedVariant?.id
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += item.quantity;
        next[existingIndex].itemTotal = next[existingIndex].price * next[existingIndex].quantity;
        return next;
      }
      return [...prev, item];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number, variantId?: string) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter(
          (i) => !(i.productId === productId && i.selectedVariant?.id === variantId)
        );
      }
      return prev.map((item) => {
        if (item.productId === productId && item.selectedVariant?.id === variantId) {
          return {
            ...item,
            quantity,
            itemTotal: item.price * quantity,
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.selectedVariant?.id === variantId))
    );
  };

  const clearCart = () => setCart([]);

  const updateStoreOperations = async (params: { isStoreOpen?: boolean; onlineOrderingEnabled?: boolean }) => {
    if (!currentBusiness) {
      return { success: false, error: 'No active business selected' };
    }

    const previousBiz = currentBusiness;
    const newIsStoreOpen =
      params.isStoreOpen !== undefined
        ? params.isStoreOpen
        : (currentBusiness.isStoreOpen ?? currentBusiness.settings?.isStoreOpen ?? true);

    const newOnlineOrderingEnabled =
      params.onlineOrderingEnabled !== undefined
        ? params.onlineOrderingEnabled
        : (currentBusiness.onlineOrderingEnabled ?? currentBusiness.settings?.onlineOrderingEnabled ?? true);

    // Optimistic update
    const updatedBiz: Business = {
      ...currentBusiness,
      isStoreOpen: newIsStoreOpen,
      onlineOrderingEnabled: newOnlineOrderingEnabled,
      settings: {
        ...currentBusiness.settings,
        isStoreOpen: newIsStoreOpen,
        onlineOrderingEnabled: newOnlineOrderingEnabled,
      },
    };

    setCurrentBusiness(updatedBiz);
    setBusinesses((prev) => prev.map((b) => (b.id === updatedBiz.id ? updatedBiz : b)));

    try {
      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBusiness.id,
          isStoreOpen: newIsStoreOpen,
          onlineOrderingEnabled: newOnlineOrderingEnabled,
          settings: updatedBiz.settings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback
        setCurrentBusiness(previousBiz);
        setBusinesses((prev) => prev.map((b) => (b.id === previousBiz.id ? previousBiz : b)));
        return { success: false, error: data.error || 'Failed to update store operational status' };
      }

      if (data.business) {
        setCurrentBusiness(data.business);
        setBusinesses((prev) => prev.map((b) => (b.id === data.business.id ? data.business : b)));
      }

      return { success: true };
    } catch (err: any) {
      // Rollback
      setCurrentBusiness(previousBiz);
      setBusinesses((prev) => prev.map((b) => (b.id === previousBiz.id ? previousBiz : b)));
      return { success: false, error: err.message || 'Network error updating store settings' };
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoadingAuth,
        login,
        register,
        registerBusiness,
        logout,
        currentBusiness,
        setCurrentBusiness: handleSetCurrentBusiness,
        updateStoreOperations,
        businesses,
        refreshBusinesses,
        currentRole,
        setCurrentRole,
        notifications,
        unreadNotifsCount,
        soundEnabled,
        setSoundEnabled,
        playOrderChime,
        markAsRead,
        markAllAsRead,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
