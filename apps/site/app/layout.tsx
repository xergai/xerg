import { Analytics } from '@vercel/analytics/next';
import { GeistMono, GeistSans } from 'geist/font';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Xerg',
  description:
    'Most AI tools show spend. Xerg shows where agent workflows are wasting money and what to fix next.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xerg.ai'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="dark" lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
