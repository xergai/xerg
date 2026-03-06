import { Analytics } from '@vercel/analytics/next';
import { GeistMono, GeistSans } from 'geist/font';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Xerg',
  description: 'Know what your AI agents are worth.',
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
