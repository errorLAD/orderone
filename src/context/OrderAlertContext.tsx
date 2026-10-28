'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Order, OrderSourceType } from '@/types';
import { useApp } from '@/context/AppContext';
import { orderSound } from '@/lib/orderSound';

interface OrderAlertContextType {
  activeAlertOrders: Order[];
  isRinging: boolean;
  soundEnabled: boolean;
  volume: number;
  autoplayBlocked: boolean;
  desktopNotifsAllowed: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  acknowledgeOrder: (orderId: string) => void;
  acknowledgeAllOrders: () => void;
  stopAlert: () => void;
  testSound: (sourceType?: OrderSourceType) => void;
  enableAudio: () => Promise<boolean>;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  requestDesktopNotifications: () => Promise<boolean>;
}

const OrderAlertContext = createContext<OrderAlertContextType | undefined>(undefined);

export function OrderAlertProvider({ children }: { children: React.ReactNode }) {
  const { currentBusiness } = useApp();
  const [activeAlertOrders, setActiveAlertOrders] = useState<Order[]>([]);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [desktopNotifsAllowed, setDesktopNotifsAllowed] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Track historical & acknowledged orders to guarantee zero duplicate alerts
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const acknowledgedOrderIdsRef = useRef<Set<string>>(new Set());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize settings & check notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSoundEnabledState(orderSound.getSoundEnabled());
      setVolumeState(orderSound.getVolume());
      setAutoplayBlocked(orderSound.isAutoplayBlocked());

      orderSound.setAutoplayBlockedListener((blocked) => {
        setAutoplayBlocked(blocked);
      });

      if ('Notification' in window) {
        setDesktopNotifsAllowed(Notification.permission === 'granted');
      }
    }
  }, []);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    orderSound.setSoundEnabled(enabled);
    if (!enabled && isRinging) {
      stopAlert();
    }
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    orderSound.setVolume(vol);
  };

  const enableAudio = async () => {
    const unlocked = await orderSound.unlockAudio();
    if (unlocked) {
      setAutoplayBlocked(false);
      // If there are pending active orders that haven't been silenced, resume ringing!
      if (activeAlertOrders.length > 0 && soundEnabled && !isRinging) {
        orderSound.startRinging(activeAlertOrders[0].sourceType);
        setIsRinging(true);
      }
    }
    return unlocked;
  };

  const requestDesktopNotifications = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setDesktopNotifsAllowed(granted);
      return granted;
    } catch (e) {
      console.warn('Error requesting desktop notification permission:', e);
      return false;
    }
  };

  const triggerDesktopNotification = (order: Order) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    try {
      const isStore = order.sourceType === 'store';
      const title = `🚨 New ${isStore ? 'Store' : 'Menu'} Order! #${order.tokenNumber}`;
      const body = `${order.customer?.name || 'Customer'} • ₹${order.total} • ${order.items?.length || 1} items`;
      
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `order-${order.id}`,
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        stopAlert();
        notif.close();
      };
    } catch (e) {
      console.warn('Desktop notification error:', e);
    }
  };

  // Stop Ringing Sound without clearing visual alerts
  const stopAlert = useCallback(() => {
    orderSound.stopRinging();
    setIsRinging(false);
  }, []);

  // Acknowledge a single order: removes it from active alert queue and silences if no more orders
  const acknowledgeOrder = useCallback((orderId: string) => {
    acknowledgedOrderIdsRef.current.add(orderId);
    
    // Save to localStorage
    if (typeof window !== 'undefined' && currentBusiness) {
      try {
        const stored = Array.from(acknowledgedOrderIdsRef.current).slice(-200);
        localStorage.setItem(`orderone_ack_orders_${currentBusiness.id}`, JSON.stringify(stored));
      } catch (e) {}
    }

    setActiveAlertOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      if (updated.length === 0) {
        stopAlert();
      }
      return updated;
    });
  }, [currentBusiness, stopAlert]);

  // Acknowledge all active orders
  const acknowledgeAllOrders = useCallback(() => {
    activeAlertOrders.forEach((o) => {
      acknowledgedOrderIdsRef.current.add(o.id);
    });

    if (typeof window !== 'undefined' && currentBusiness) {
      try {
        const stored = Array.from(acknowledgedOrderIdsRef.current).slice(-200);
        localStorage.setItem(`orderone_ack_orders_${currentBusiness.id}`, JSON.stringify(stored));
      } catch (e) {}
    }

    setActiveAlertOrders([]);
    stopAlert();
  }, [activeAlertOrders, currentBusiness, stopAlert]);

  // Test sound function
  const testSound = (sourceType: OrderSourceType = 'store') => {
    enableAudio();
    orderSound.playChime(sourceType);
  };

  // Process incoming newly detected order
  const handleNewOrder = useCallback((order: Order) => {
    if (!order || !order.id) return;

    // Check duplicate prevention
    if (seenOrderIdsRef.current.has(order.id) || acknowledgedOrderIdsRef.current.has(order.id)) {
      return;
    }

    // Mark as seen
    seenOrderIdsRef.current.add(order.id);

    // Save seen cache to localStorage (keep last 200 items)
    if (typeof window !== 'undefined' && currentBusiness) {
      try {
        const stored = Array.from(seenOrderIdsRef.current).slice(-200);
        localStorage.setItem(`orderone_seen_orders_${currentBusiness.id}`, JSON.stringify(stored));
      } catch (e) {}
    }

    // Add to active alert queue
    setActiveAlertOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });

    // Start ringing sound
    if (orderSound.getSoundEnabled()) {
      orderSound.startRinging(order.sourceType);
      setIsRinging(true);
    }

    // Trigger desktop notification
    triggerDesktopNotification(order);
  }, [currentBusiness]);

  // Sync / catch-up missed orders created during disconnection or background tab
  const fetchMissedOrders = useCallback(async () => {
    if (!currentBusiness) return;
    try {
      const res = await fetch(`/api/orders?businessId=${currentBusiness.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        for (const ord of data.orders) {
          // If this order is already known, skip
          if (seenOrderIdsRef.current.has(ord.id) || acknowledgedOrderIdsRef.current.has(ord.id)) {
            continue;
          }
          // Only alert for orders created after this session started
          const orderTime = new Date(ord.createdAt).getTime();
          if (orderTime >= sessionStartTimeRef.current - 5000) {
            handleNewOrder(ord);
          } else {
            // Historical order: mark seen without alerting
            seenOrderIdsRef.current.add(ord.id);
          }
        }
      }
    } catch (e) {
      console.warn('Error checking missed orders:', e);
    }
  }, [currentBusiness, handleNewOrder]);

  // Set up business-level realtime listener & seed historical cache
  useEffect(() => {
    if (!currentBusiness?.id) {
      setActiveAlertOrders([]);
      stopAlert();
      return;
    }

    const businessId = currentBusiness.id;
    sessionStartTimeRef.current = Date.now();

    // 1. Restore acknowledged orders from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedAck = localStorage.getItem(`orderone_ack_orders_${businessId}`);
        if (savedAck) {
          const parsed = JSON.parse(savedAck);
          if (Array.isArray(parsed)) {
            acknowledgedOrderIdsRef.current = new Set(parsed);
          }
        }
      } catch (e) {}

      try {
        const savedSeen = localStorage.getItem(`orderone_seen_orders_${businessId}`);
        if (savedSeen) {
          const parsed = JSON.parse(savedSeen);
          if (Array.isArray(parsed)) {
            seenOrderIdsRef.current = new Set(parsed);
          }
        }
      } catch (e) {}
    }

    // 2. Pre-seed cache with existing historical orders so they NEVER trigger false rings
    const seedHistoricalOrders = async () => {
      try {
        const res = await fetch(`/api/orders?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            data.orders.forEach((o: Order) => {
              seenOrderIdsRef.current.add(o.id);
            });
            if (typeof window !== 'undefined') {
              const stored = Array.from(seenOrderIdsRef.current).slice(-200);
              localStorage.setItem(`orderone_seen_orders_${businessId}`, JSON.stringify(stored));
            }
          }
        }
      } catch (e) {
        console.warn('Error seeding historical orders:', e);
      }
    };

    seedHistoricalOrders();

    // 3. Connect to Realtime Server-Sent Events
    const connectSSE = () => {
      setConnectionStatus('connecting');

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const sse = new EventSource(`/api/realtime?businessId=${businessId}`);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setConnectionStatus('connected');
        // Fetch any orders that might have been missed while connecting
        fetchMissedOrders();
      };

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ORDER_CREATED' && payload.order) {
            handleNewOrder(payload.order);
          }
        } catch (e) {
          console.error('Error handling SSE order event:', e);
        }
      };

      sse.onerror = () => {
        setConnectionStatus('disconnected');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        // Auto reconnect with backoff
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 4000);
      };
    };

    connectSSE();

    // 4. Background tab / network reconnection handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMissedOrders();
      }
    };

    const handleOnline = () => {
      connectSSE();
      fetchMissedOrders();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // 5. Periodic polling fallback every 15s for 100% reliability
    const fallbackPollInterval = setInterval(() => {
      fetchMissedOrders();
    }, 15000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(fallbackPollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      stopAlert();
    };
  }, [currentBusiness?.id, fetchMissedOrders, handleNewOrder, stopAlert]);

  return (
    <OrderAlertContext.Provider
      value={{
        activeAlertOrders,
        isRinging,
        soundEnabled,
        volume,
        autoplayBlocked,
        desktopNotifsAllowed,
        connectionStatus,
        acknowledgeOrder,
        acknowledgeAllOrders,
        stopAlert,
        testSound,
        enableAudio,
        setSoundEnabled,
        setVolume,
        requestDesktopNotifications,
      }}
    >
      {children}
    </OrderAlertContext.Provider>
  );
}

export function useOrderAlert() {
  const context = useContext(OrderAlertContext);
  if (!context) {
    throw new Error('useOrderAlert must be used within an OrderAlertProvider');
  }
  return context;
}
