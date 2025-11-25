/**
 * Hero Section Component
 * Modern landing page hero inspired by SalonBot
 * Includes WhatsApp demo, multilingual support, and strong CTAs
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Rocket, ArrowRight, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { WhatsAppDemo } from './WhatsAppDemo';

/**
 * Hero Section with demo and compelling value proposition
 */
export function HeroSection() {
  const router = useRouter();
  const { t } = useI18n();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white px-4 pt-24 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl">
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
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white px-4 pt-24 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 sm:px-6 lg:px-8"
      data-demo-section
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -left-4 top-0 h-96 w-96 rounded-full bg-primary-200/20 blur-3xl dark:bg-primary-500/10"
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
          className="absolute -right-4 top-20 h-96 w-96 rounded-full bg-secondary-200/20 blur-3xl dark:bg-secondary-500/10"
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

      <div className="relative mx-auto max-w-7xl pb-16 pt-8 sm:pb-24 sm:pt-12 lg:pb-32" id="demo">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm dark:bg-primary-900/30 dark:text-primary-300">
                <Rocket className="h-4 w-4" aria-hidden="true" />
                <span>{t.hero.badge}</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl"
            >
              {t.hero.title}{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-secondary-400">
                  {t.hero.titleHighlight}
                </span>
                <motion.span
                  className="absolute bottom-2 left-0 -z-10 h-3 w-full bg-primary-200/50 dark:bg-primary-900/30"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  aria-hidden="true"
                />
              </span>{' '}
              and Increase Revenue by 40%
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-xl lg:mx-0"
            >
              {t.hero.subtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <button
                onClick={() => router.push('/register')}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
              >
                <span>{t.hero.cta.primary}</span>
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              <button
                onClick={() => {
                  const demoSection = document.getElementById('demo');
                  if (demoSection) {
                    const offset = 80;
                    const elementPosition = demoSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  }
                }}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition-all hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:border-neutral-500 dark:hover:bg-neutral-700 sm:w-auto"
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                <span>{t.hero.cta.secondary}</span>
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-600 dark:text-neutral-400 lg:justify-start lg:gap-8"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{t.hero.trustIndicators.freeTrial}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{t.hero.trustIndicators.noCard}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{t.hero.trustIndicators.cancelAnytime}</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column - WhatsApp Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <WhatsAppDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
