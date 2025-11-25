/**
 * New Landing Page (Version 2.0)
 * Complete redesign with customer-focused copy
 * Route: /new
 */

import type { Metadata } from 'next';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { ValuePropositionSection } from '@/components/landing/ValuePropositionSection';
import { ProblemSolutionSection } from '@/components/landing/ProblemSolutionSection';
import { InteractiveDemoSection } from '@/components/landing/InteractiveDemoSection';
import { NewPricingSection } from '@/components/landing/NewPricingSection';

export const metadata: Metadata = {
  title: 'Stop Losing Customers While You Sleep - WhatsApp AI Booking',
  description: 'Your salon loses 40% of bookings after hours. Our AI answers WhatsApp instantly—24/7. 500+ salons making $2,400+ extra per month.',
};

export default function NewLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <NewHeroSection />
      <ValuePropositionSection />
      <ProblemSolutionSection />
      <InteractiveDemoSection />
      <NewPricingSection />
      
      <footer className="border-t border-neutral-200 bg-neutral-50 py-12 text-center">
        <p className="text-sm text-neutral-600">
          © 2025 WhatsApp SaaS Platform. All rights reserved.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          ✨ This is the NEW landing page (Version 2.0)
        </p>
      </footer>
    </main>
  );
}
