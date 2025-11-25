/**
 * Root Layout
 * Next.js 14 App Router root layout
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { AuthProvider } from '@/providers/auth-provider';
import { WebVitalsReporter } from './web-vitals-reporter';
import '@/styles/globals.css';

// PERFORMANCE: Optimize font loading with 'swap' strategy
// Font will be displayed with fallback initially, then swap when loaded
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true, // Preload font for faster loading
  fallback: ['system-ui', 'arial'], // Fallback fonts
});

export const metadata: Metadata = {
  title: {
    default: 'WhatsApp SaaS Platform',
    template: '%s | WhatsApp SaaS Platform',
  },
  description: 'Multi-tenant salon management system with WhatsApp integration',
  keywords: ['WhatsApp', 'SaaS', 'Salon', 'Booking', 'Management'],
  authors: [{ name: 'WhatsApp SaaS Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#25D366',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 antialiased">
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
        <WebVitalsReporter />
      </body>
    </html>
  );
}
