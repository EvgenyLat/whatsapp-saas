/**
 * Landing Page
 * Main marketing page for WhatsApp SaaS Platform
 * Includes SEO optimization, structured data, and all landing sections
 */

import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { Footer } from '@/components/landing/Footer';

/**
 * SEO Metadata
 * Optimized for search engines and social sharing
 */
export const metadata: Metadata = {
  title: 'Stop Losing Customers While You Sleep - WhatsApp AI Booking for Salons',
  description:
    'Your salon loses 40% of bookings after hours. Our AI answers WhatsApp instantly—24/7, any language. 500+ salons making $2,400+ extra per month. Start free 14-day trial.',
  keywords: [
    'whatsapp booking salon',
    'ai salon booking',
    '24/7 salon booking',
    'automated beauty salon booking',
    'whatsapp business api salon',
    'salon appointment automation',
    'beauty booking software',
    'salon management software',
    'whatsapp automation',
    'hair salon booking system',
    'spa booking software',
    'barbershop booking app',
  ],
  authors: [{ name: 'WhatsApp SaaS Team' }],
  creator: 'WhatsApp SaaS Platform',
  publisher: 'WhatsApp SaaS Platform',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://whatsappsaas.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://whatsappsaas.com',
    title: 'WhatsApp SaaS Platform - AI-Powered Business Automation',
    description:
      'Transform your business with AI-powered WhatsApp automation. Automate bookings, customer service, and grow 24/7. Start free trial today.',
    siteName: 'WhatsApp SaaS Platform',
    images: [
      {
        url: 'https://whatsappsaas.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'WhatsApp SaaS Platform - AI-Powered Business Automation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WhatsApp SaaS Platform - AI-Powered Business Automation',
    description:
      'Transform your business with AI-powered WhatsApp automation. Automate bookings, customer service, and grow 24/7.',
    images: ['https://whatsappsaas.com/twitter-image.jpg'],
    creator: '@whatsappsaas',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
};

/**
 * Landing Page Component
 * Main entry point with all marketing sections
 */
export default function LandingPage() {
  // Structured Data (JSON-LD) for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WhatsApp SaaS Platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '49',
      highPrice: '149',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '5000',
      bestRating: '5',
      worstRating: '1',
    },
    description:
      'AI-powered WhatsApp automation platform for businesses. Automate bookings, customer service, and grow your business 24/7.',
    featureList: [
      'AI-powered automation',
      'WhatsApp Business API integration',
      'Smart booking system',
      'Customer management',
      'Analytics dashboard',
      '24/7 availability',
    ],
    screenshot: 'https://whatsappsaas.com/screenshot.jpg',
    url: 'https://whatsappsaas.com',
    author: {
      '@type': 'Organization',
      name: 'WhatsApp SaaS Platform',
      url: 'https://whatsappsaas.com',
    },
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WhatsApp SaaS Platform',
    url: 'https://whatsappsaas.com',
    logo: 'https://whatsappsaas.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-234-567-890',
      contactType: 'Customer Support',
      email: 'support@whatsappsaas.com',
      availableLanguage: ['English'],
    },
    sameAs: [
      'https://twitter.com/whatsappsaas',
      'https://linkedin.com/company/whatsappsaas',
      'https://github.com/whatsappsaas',
    ],
  };

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How long does it take to set up?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can be up and running in less than 10 minutes. Simply sign up, connect your WhatsApp Business account, configure your services and availability, and start receiving automated bookings.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need technical knowledge to use this platform?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No technical knowledge required! Our platform is designed for business owners, not developers. The interface is intuitive and user-friendly.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do you offer a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.',
        },
      },
    ],
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />

      {/* Landing Header */}
      <LandingHeader />

      {/* Main content */}
      <main className="min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
