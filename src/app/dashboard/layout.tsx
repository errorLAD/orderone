'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { useApp } from '@/context/AppContext';
import { OrderAlertProvider } from '@/context/OrderAlertContext';
import { OrderAlertOverlay } from '@/components/dashboard/OrderAlertOverlay';
import { WaiterCallAlert } from '@/components/dashboard/WaiterCallAlert';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, isLoadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.replace('/login');
    }
  }, [isLoadingAuth, currentUser, router]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5] mb-2" />
        <p className="text-xs font-semibold text-[#64748B]">Verifying authorized session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <OrderAlertProvider>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative">
        <OrderAlertOverlay />
        <WaiterCallAlert />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </OrderAlertProvider>
  );
}
