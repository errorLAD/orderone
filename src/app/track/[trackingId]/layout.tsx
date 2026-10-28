import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order Status | OrderOne.in',
  description: 'Live order token tracking and digital receipt.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
