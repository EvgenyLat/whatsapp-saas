/**
 * NEW Hero Section Component
 * Modern, conversion-optimized hero with professional copywriting
 * Version 2.0 - Complete redesign
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Rocket, ArrowRight, Check } from 'lucide-react';

/**
 * Hero Section with compelling value proposition
 * Focus: Customer problem → Solution → Social proof
 */
export function NewHeroSection() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white px-4 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Loading...
            </h1>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white px-4 pt-24 sm:px-6 lg:px-8"
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -left-4 top-0 h-96 w-96 rounded-full bg-sky-200/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -right-4 top-20 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.2, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative mx-auto max-w-7xl pb-16 pt-8 sm:pb-24 sm:pt-12 lg:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
                <Rocket className="h-4 w-4" aria-hidden="true" />
                <span>🚀 Trusted by 500+ Beauty Salons Worldwide</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl lg:text-7xl"
            >
              Stop Losing Customers{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                  While You Sleep
                </span>
                <motion.span
                  className="absolute bottom-2 left-0 -z-10 h-3 w-full bg-sky-200/50"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl lg:mx-0"
            >
              Your salon loses{' '}
              <span className="font-bold text-neutral-900">40% of potential bookings</span>{' '}
              after hours. Our AI answers instantly on WhatsApp—
              <span className="font-semibold text-emerald-600">24/7, in any language</span>.
              <br />
              <span className="mt-2 inline-block font-medium text-neutral-800">
                Book more. Work less. Grow faster.
              </span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
            >
              {/* Primary CTA */}
              <button
                onClick={() => router.push('/register')}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-sky-600 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:w-auto"
              >
                <span>Start Free 14-Day Trial</span>
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 text-sm text-neutral-600 sm:flex-row lg:justify-start"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Setup in 10 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Cancel anytime</span>
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 inline-flex flex-col items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-sm lg:items-start"
            >
              <div className="flex items-center gap-1">
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
                <span className="ml-2 text-sm font-semibold text-neutral-900">4.9/5</span>
              </div>
              <p className="text-xs text-neutral-600">
                127 reviews on G2 • Rated #1 WhatsApp Booking Automation
              </p>
            </motion.div>
          </div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Simple placeholder - replace with actual product screenshot */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-2xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                  WhatsApp AI Demo
                </h3>
                <p className="text-neutral-600">
                  Interactive demo coming soon!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
