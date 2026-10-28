import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'OrderOne.in | Digital Store, Dining Menu & Order Token Platform — InfraBlue Materials Technology Private Limited',
  description:
    'OrderOne.in is operated by InfraBlue Materials Technology Private Limited. A unified digital commerce, storefront, and order-queue platform for Indian retail, hardware, grocery, and dining merchants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
