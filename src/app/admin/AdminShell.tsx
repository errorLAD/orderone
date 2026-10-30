'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminProvider } from '@/context/AdminContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

function AdminFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (pathname === '/admin/login') return <>{children}</>;
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <AdminTopBar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminProvider><AdminFrame>{children}</AdminFrame></AdminProvider>;
}
