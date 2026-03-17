import { Analytics } from '@vercel/analytics/next';
import { GeistMono, GeistSans } from 'geist/font';
import type { Metadata } from 'next';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

import './globals.css';

export const metadata: Metadata = {
  title: 'Xerg — Know what your AI is worth',
  description:
    'Xerg reads your agent logs and shows exactly where money is leaking across retries, context bloat, wrong-model calls, and runaway loops.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xerg.ai'),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="dark" lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] antialiased`}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
