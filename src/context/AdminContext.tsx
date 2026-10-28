'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';

interface AdminContextType {
  adminUser: User | null;
  adminRole: 'super_admin' | 'admin';
  loading: boolean;
  unreadNotifications: number;
  refreshAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin'>('super_admin');
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const fetchAdminSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      const data = await res.json();

      if (data.success && data.user) {
        setAdminUser(data.user);
        setAdminRole(data.adminRole || 'super_admin');

        // Fetch unread notifications count
        try {
          const notifRes = await fetch('/api/admin/notifications?unread=true');
          const notifData = await notifRes.json();
          if (notifData.success) {
            setUnreadNotifications(notifData.notifications?.length || 0);
          }
        } catch {}
      } else {
        setAdminUser(null);
        if (pathname && !pathname.startsWith('/admin/login')) {
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    } catch (e) {
      console.error('Failed to load admin session:', e);
      setAdminUser(null);
      if (pathname && !pathname.startsWith('/admin/login')) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }
    fetchAdminSession();
  }, [pathname, fetchAdminSession]);

  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Error logging out admin:', e);
    } finally {
      setAdminUser(null);
      router.push('/admin/login');
    }
  };

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        adminRole,
        loading,
        unreadNotifications,
        refreshAdmin: fetchAdminSession,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
