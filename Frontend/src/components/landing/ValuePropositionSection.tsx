/**
 * Value Proposition Section
 * Shows real results with animated counters
 * Version 2.0
 */

'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Clock, DollarSign, Check } from 'lucide-react';

export function ValuePropositionSection() {
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
          className="text-center"
        >
          <h2 className="text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl">
            Real Results from Real Salons
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Join 500+ beauty businesses making more money with less effort
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Stat 1 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0 }}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-sky-50 via-white to-white p-8 shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-sky-100 p-3 text-sky-600 ring-4 ring-sky-50">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div className="mb-2 text-5xl font-black text-sky-600">+250%</div>
              <h3 className="mb-3 text-xl font-bold text-neutral-900">After-Hours Bookings</h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                Customers book while you sleep. Wake up to $600+ in new appointments.
              </p>
            </div>
          </motion.div>

          {/* Stat 2 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-sky-50 via-white to-white p-8 shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-sky-100 p-3 text-sky-600 ring-4 ring-sky-50">
                <Clock className="h-8 w-8" />
              </div>
              <div className="mb-2 text-5xl font-black text-sky-600">15h/week</div>
              <h3 className="mb-3 text-xl font-bold text-neutral-900">Time Saved</h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                No more "Can you hold?" calls. AI handles everything automatically.
              </p>
            </div>
          </motion.div>

          {/* Stat 3 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-50 via-white to-white p-8 shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <div className="relative z-10">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600 ring-4 ring-emerald-50">
                <DollarSign className="h-8 w-8" />
              </div>
              <div className="mb-2 text-5xl font-black text-emerald-600">$2,400+</div>
              <h3 className="mb-3 text-xl font-bold text-neutral-900">Extra Revenue Per Month</h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                Average salon makes $28,800 more per year. Guaranteed.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Social Proof Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12"
        >
          <div className="text-center">
            <div className="text-3xl font-black text-sky-600">500+</div>
            <div className="mt-1 text-sm font-medium text-neutral-600">Salons Trust Us</div>
          </div>

          <div className="hidden h-12 w-px bg-neutral-300 sm:block" aria-hidden="true" />

          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="h-5 w-5 fill-yellow-400"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="mt-1 text-3xl font-black text-sky-600">4.9/5</div>
            <div className="mt-1 text-sm font-medium text-neutral-600">Average Rating</div>
          </div>

          <div className="hidden h-12 w-px bg-neutral-300 sm:block" aria-hidden="true" />

          <div className="text-center">
            <div className="text-3xl font-black text-sky-600">98%</div>
            <div className="mt-1 text-sm font-medium text-neutral-600">Would Recommend</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
