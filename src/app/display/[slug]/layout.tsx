import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live TV Token Display | OrderOne.in',
  description: 'Smart TV and counter display for live order tokens.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
