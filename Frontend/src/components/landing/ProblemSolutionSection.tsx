/**
 * Problem Solution Section - Simplified Version
 * Version 2.0
 */

'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { X, Check } from 'lucide-react';

export function ProblemSolutionSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
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
            Your Customers Want to Book{' '}
            <span className="text-sky-600">NOW</span>.
            <br />
            Not Wait Until Tomorrow Morning.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-neutral-600">
            Every missed message is a lost customer—and lost revenue.
            <br />
            <span className="font-semibold text-neutral-800">
              Here's what's costing you thousands every month:
            </span>
          </p>
        </motion.div>

        {/* Comparison Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Problem Column */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0 }}
            className="relative overflow-hidden rounded-2xl border-2 border-red-500 bg-white p-8 shadow-lg"
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-2 inline-flex items-center gap-2 text-2xl font-black text-red-600">
                <X className="h-6 w-6" />
                <span>WITHOUT OUR PLATFORM</span>
              </div>
              <div className="text-sm font-semibold text-neutral-600">The $14,400 Problem</div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              <div className="flex gap-3">
                <X className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    11:00 PM
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    Customer texts. You're asleep. No response.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <X className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    11:15 PM
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    Customer books with competitor.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <X className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Next Morning
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    You wake up. Too late.
                  </div>
                </div>
              </div>
            </div>

            {/* Result Box */}
            <div className="mt-8 rounded-xl border-2 border-red-500 bg-red-50 p-6 text-center">
              <div className="mb-2 text-4xl">😱</div>
              <div className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-700">
                THIS HAPPENS 12-15 TIMES PER MONTH
              </div>
              <div className="text-3xl font-black text-red-600">= $14,400 lost annually</div>
            </div>
          </motion.div>

          {/* Solution Column */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white p-8 shadow-lg"
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-2 inline-flex items-center gap-2 text-2xl font-black text-emerald-600">
                <Check className="h-6 w-6" />
                <span>WITH OUR PLATFORM</span>
              </div>
              <div className="text-sm font-semibold text-neutral-600">The $28,800 Solution</div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              <div className="flex gap-3">
                <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    11:00:08 PM
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    AI responds in 8 seconds. Always.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    11:00:25 PM
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    Customer clicks time. Booking confirmed.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Next Morning
                  </div>
                  <div className="text-base leading-relaxed font-semibold text-neutral-900">
                    You wake up to $600+ in bookings.
                  </div>
                </div>
              </div>
            </div>

            {/* Result Box */}
            <div className="mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
              <div className="mb-2 text-4xl">🎉</div>
              <div className="mb-1 text-sm font-bold uppercase tracking-wide text-neutral-700">
                YOU NEVER MISS A CUSTOMER AGAIN
              </div>
              <div className="text-3xl font-black text-emerald-600">= $28,800 saved!</div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="mb-6 text-xl font-semibold text-neutral-800">
            Stop losing $14,400 every year. Start making $28,800 extra instead.
          </p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-sky-600 hover:shadow-xl hover:scale-105">
            <span>Start Your Free Trial Now</span>
            <Check className="h-5 w-5" />
          </button>
          <p className="mt-4 text-sm text-neutral-600">
            No credit card required • Setup in 10 minutes • 30x ROI guaranteed
          </p>
        </motion.div>
      </div>
    </section>
  );
}
