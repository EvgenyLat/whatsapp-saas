/**
 * How It Works Section Component
 * 3-step process visualization
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Zap, DollarSign, Clock } from 'lucide-react';

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time?: string;
  example?: string;
}

const steps: Step[] = [
  {
    number: '01',
    icon: <MessageCircle className="h-8 w-8" />,
    title: 'Customer Texts You',
    description: "11:00 PM: 'Can I book a manicure for Friday 3 PM?'",
    time: 'Anytime, 24/7',
    example: 'Even while you sleep',
  },
  {
    number: '02',
    icon: <Zap className="h-8 w-8" />,
    title: 'AI Responds in 8 Seconds',
    description: 'Shows 3 available time slots with tap-to-book buttons. No typing needed.',
    time: '8 seconds',
    example: 'Instant response',
  },
  {
    number: '03',
    icon: <Clock className="h-8 w-8" />,
    title: 'Customer Taps Button',
    description: 'One tap to select time. Booking confirmed. Payment collected instantly.',
    time: '30 seconds total',
    example: 'Zero friction',
  },
  {
    number: '04',
    icon: <DollarSign className="h-8 w-8" />,
    title: 'You Wake Up to Revenue',
    description: 'Next morning: $600+ in new bookings. Zero phone calls. Zero missed customers.',
    time: 'While you slept',
    example: '+$2,400/month extra',
  },
];

/**
 * How It Works Section with step-by-step visualization
 * Shows the simple 3-step onboarding process
 */
export function HowItWorksSection() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="how-it-works"
      className="bg-neutral-50 px-4 py-20 dark:bg-neutral-900 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center">
          <motion.div
            initial={mounted ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-secondary-100 px-4 py-1.5 text-sm font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
              How It Works
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl lg:text-5xl">
              See How It Works: Book in 30 Seconds
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              (Zero Typing Required!)
            </p>
          </motion.div>
        </div>

        {/* Steps */}
        <div className="mt-16 lg:mt-24">
          <div className="relative">
            {/* Connecting line - desktop only */}
            <div
              className="absolute left-0 top-24 hidden h-0.5 w-full lg:block"
              aria-hidden="true"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary-200 via-secondary-200 to-primary-200 dark:from-primary-900/30 dark:via-secondary-900/30 dark:to-primary-900/30"
                initial={mounted ? { scaleX: 0 } : false}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                style={{ transformOrigin: 'left' }}
              />
            </div>

            {/* Steps grid */}
            <div className="relative grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={mounted ? { opacity: 0, y: 30 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  {/* Card */}
                  <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg transition-shadow hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {/* Step number badge */}
                    <div className="absolute -top-6 left-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-lg font-bold text-white shadow-lg">
                        {step.number}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="mt-8 inline-flex rounded-xl bg-primary-100 p-4 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      {step.icon}
                    </div>

                    {/* Content */}
                    <h3 className="mt-6 text-xl font-bold text-neutral-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-neutral-600 dark:text-neutral-300">
                      {step.description}
                    </p>

                    {/* Time and example */}
                    {(step.time || step.example) && (
                      <div className="mt-4 space-y-1">
                        {step.time && (
                          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            ⏱ {step.time}
                          </div>
                        )}
                        {step.example && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {step.example}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arrow indicator - desktop only */}
                    {index < steps.length - 1 && (
                      <div
                        className="absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block"
                        aria-hidden="true"
                      >
                        <svg
                          className="h-8 w-8 text-primary-400 dark:text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Vertical connector - mobile only */}
                  {index < steps.length - 1 && (
                    <div
                      className="mx-auto my-8 h-12 w-0.5 bg-gradient-to-b from-primary-200 to-secondary-200 dark:from-primary-900/30 dark:to-secondary-900/30 lg:hidden"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid gap-8 sm:grid-cols-3 lg:mt-24"
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              5 min
            </div>
            <div className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Average setup time
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              24/7
            </div>
            <div className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Automated customer service
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              10x
            </div>
            <div className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Faster booking process
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
