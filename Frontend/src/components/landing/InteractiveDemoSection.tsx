/**
 * Interactive Demo Section - Simplified
 * Version 2.0
 */

'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, MessageSquare } from 'lucide-react';

export function InteractiveDemoSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-white px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
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
            See How It Works: Book in 30 Seconds
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-neutral-600">
            <span className="font-semibold text-neutral-800">(Zero Typing Required!)</span>
          </p>
        </motion.div>

        {/* Demo Content */}
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-12 shadow-2xl"
          >
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-emerald-100 p-6">
                  <MessageSquare className="h-16 w-16 text-emerald-600" />
                </div>
              </div>
              <h3 className="mb-4 text-3xl font-bold text-neutral-900">
                WhatsApp Chat Demo
              </h3>
              <p className="mb-8 text-lg text-neutral-600">
                Interactive demo coming soon! Watch how customers book in 3 taps.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <div>
                  <div className="text-2xl font-black text-emerald-600">28s</div>
                  <div className="text-xs text-neutral-600">Total Time</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">0</div>
                  <div className="text-xs text-neutral-600">Words Typed</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">$45</div>
                  <div className="text-xs text-neutral-600">Revenue</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 space-y-4"
          >
            <h3 className="text-2xl font-bold text-neutral-900 text-center mb-6">
              Why This Works So Well:
            </h3>
            <ul className="space-y-3">
              {[
                'No typing = No friction. Customers tap buttons in 3 clicks.',
                'AI responds in 8 seconds. Customers never wait.',
                'Smart suggestions keep options open. Never loses a booking.',
                'Works 24/7 in 5 languages. Never sleeps, never misses.',
              ].map((benefit, index) => (
                <li key={index} className="flex gap-3">
                  <Check className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                  <span className="text-neutral-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
