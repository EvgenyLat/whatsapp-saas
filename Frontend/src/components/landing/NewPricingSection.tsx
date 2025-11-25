/**
 * New Pricing Section - Simplified
 * Version 2.0
 */

'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight, Star } from 'lucide-react';

export function NewPricingSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      id="pricing"
      className="relative overflow-hidden bg-neutral-50 px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl">
            Simple Pricing. Massive ROI.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-neutral-600">
            Pay <span className="font-bold text-neutral-900">$79/month</span>. Make{' '}
            <span className="font-bold text-emerald-600">$2,400+ extra per month</span>.
            <br />
            That's <span className="font-black text-sky-600">30x return on investment</span>.
            Guaranteed.
          </p>
        </motion.div>

        {/* Pricing Grid */}
        <div className="mb-16 grid gap-8 lg:grid-cols-3">
          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0 }}
            className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg"
          >
            <div className="flex flex-1 flex-col p-8">
              <div className="mb-6 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
                  STARTER
                </h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-neutral-900">$29</span>
                  <span className="text-sm text-neutral-600">per month</span>
                </div>
                <p className="mt-4 text-sm text-neutral-600">Perfect for solo stylists</p>
              </div>

              <ul className="mb-6 flex-1 space-y-3">
                {[
                  '1 salon location',
                  '500 conversations/month',
                  'Up to 3 staff members',
                  'WhatsApp AI booking 24/7',
                  '5 languages supported',
                ].map((feature, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span className="text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Expected ROI
                </div>
                <div className="mt-1 text-sm font-black text-emerald-600">
                  Make $800/month = 28x return 📈
                </div>
              </div>

              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-sky-500 bg-white px-6 py-4 text-center font-semibold text-sky-600 transition-all hover:bg-sky-50"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </motion.div>

          {/* Pro (Featured) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-sky-500 bg-white shadow-2xl lg:scale-105"
          >
            <div className="absolute -right-12 top-6 rotate-45 bg-sky-500 px-12 py-1 text-center text-xs font-bold text-white shadow-md">
              ⭐ MOST POPULAR
            </div>

            <div className="flex flex-1 flex-col p-8">
              <div className="mb-6 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
                  PRO
                </h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-neutral-900">$79</span>
                  <span className="text-sm text-neutral-600">per month</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  Save $120/year (annual plan)
                </p>
                <p className="mt-2 text-sm text-neutral-600">Perfect for growing salons</p>
              </div>

              <ul className="mb-6 flex-1 space-y-3">
                <li className="flex gap-3 text-sm">
                  <Check className="h-5 w-5 flex-shrink-0 text-sky-500" />
                  <span className="font-semibold text-neutral-900">Everything in STARTER, plus:</span>
                </li>
                {[
                  'Up to 3 salon locations',
                  '2,000 conversations/month',
                  'Up to 15 staff members',
                  'Advanced analytics',
                  'Custom branding',
                  'Payment collection',
                  'Priority support',
                ].map((feature, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <Check className="h-5 w-5 flex-shrink-0 text-sky-500" />
                    <span className="text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Expected ROI
                </div>
                <div className="mt-1 text-sm font-black text-emerald-600">
                  Make $2,400/month = 30x return 🚀
                </div>
              </div>

              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-4 text-center font-semibold text-white transition-all hover:bg-sky-600 hover:shadow-xl"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-lg"
          >
            <div className="flex flex-1 flex-col p-8">
              <div className="mb-6 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-600">
                  ENTERPRISE
                </h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-neutral-900">$199</span>
                  <span className="text-sm text-neutral-600">per month</span>
                </div>
                <p className="mt-4 text-sm text-neutral-600">Perfect for large chains</p>
              </div>

              <ul className="mb-6 flex-1 space-y-3">
                <li className="flex gap-3 text-sm">
                  <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <span className="font-semibold text-neutral-900">Everything in PRO, plus:</span>
                </li>
                {[
                  'Unlimited salon locations',
                  'Unlimited conversations',
                  'Unlimited staff',
                  'White-label solution',
                  'Custom AI training',
                  'Dedicated manager',
                ].map((feature, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span className="text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Expected ROI
                </div>
                <div className="mt-1 text-sm font-black text-emerald-600">
                  Make $8,000+/month = 40x return 💎
                </div>
              </div>

              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-sky-500 bg-white px-6 py-4 text-center font-semibold text-sky-600 transition-all hover:bg-sky-50"
              >
                <span>Contact Sales</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* All Plans Include */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto max-w-4xl rounded-2xl border-2 border-neutral-200 bg-white p-8 shadow-lg"
        >
          <h3 className="mb-6 text-center text-2xl font-bold text-neutral-900">
            All Plans Include:
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              '14-day free trial (no CC required)',
              'Cancel anytime, keep your data',
              '30x ROI guarantee or refund',
              'Free WhatsApp setup',
              'Free migration',
              '99.9% uptime SLA',
              'SOC 2 + GDPR compliant',
              'No hidden fees ever',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                <span className="text-sm text-neutral-700">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
