/**
 * Pricing Section Component
 * 3-tier pricing with feature comparison
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Star, Zap } from 'lucide-react';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaLink: string;
  highlighted?: boolean;
  badge?: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses getting started',
    price: '$49',
    period: 'per month',
    features: [
      'Up to 500 conversations/month',
      '1 WhatsApp Business account',
      'Basic AI automation',
      'Appointment scheduling',
      'Customer database',
      'Email support',
      'Mobile app access',
      'Basic analytics',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/register?plan=starter',
  },
  {
    name: 'Professional',
    description: 'For growing businesses that need more power',
    price: '$149',
    period: 'per month',
    features: [
      'Up to 2,500 conversations/month',
      '3 WhatsApp Business accounts',
      'Advanced AI automation',
      'Smart appointment scheduling',
      'Advanced customer management',
      'Priority support (24/7)',
      'Custom branding',
      'Advanced analytics & reports',
      'Marketing automation',
      'Team collaboration tools',
      'API access',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/register?plan=professional',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    price: 'Custom',
    period: 'contact us',
    features: [
      'Unlimited conversations',
      'Unlimited WhatsApp accounts',
      'Enterprise AI features',
      'White-label solution',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Advanced security & compliance',
      'Custom workflows',
      'Onboarding & training',
      'Multi-location support',
    ],
    cta: 'Contact Sales',
    ctaLink: '#contact',
  },
];

/**
 * Pricing Section with 3 tiers and feature comparison
 * Includes highlighted "Most Popular" tier
 */
export function PricingSection() {
  const [mounted, setMounted] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState<
    'monthly' | 'yearly'
  >('monthly');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="pricing"
      className="bg-white px-4 py-20 dark:bg-neutral-800 sm:px-6 lg:px-8 lg:py-32"
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
            <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              Pricing
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl lg:text-5xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              Choose the plan that fits your business. All plans include a
              14-day free trial.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <motion.div
            initial={mounted ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-neutral-100 p-1 dark:bg-neutral-700"
          >
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-300'
              }`}
              aria-pressed={billingPeriod === 'monthly'}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-300'
              }`}
              aria-pressed={billingPeriod === 'yearly'}
            >
              Yearly
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                Save 20%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Pricing cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={mounted ? { opacity: 0, y: 30 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${tier.highlighted ? 'lg:-mt-4' : ''}`}
            >
              <div
                className={`relative h-full overflow-hidden rounded-2xl border bg-white shadow-lg transition-all hover:shadow-xl dark:bg-neutral-900 ${
                  tier.highlighted
                    ? 'border-primary-500 ring-2 ring-primary-500 dark:border-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute right-6 top-6">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      <span>{tier.badge}</span>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Header */}
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {tier.name}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
                        {tier.price}
                      </span>
                      {tier.period !== 'contact us' && (
                        <span className="text-neutral-600 dark:text-neutral-400">
                          /{billingPeriod === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' &&
                      tier.period !== 'contact us' && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                          Billed annually
                        </p>
                      )}
                  </div>

                  {/* CTA */}
                  <div className="mt-8">
                    <Link
                      href={tier.ctaLink}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg hover:from-primary-700 hover:to-secondary-700 focus:ring-primary-500'
                          : 'border-2 border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:border-neutral-500 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {tier.highlighted && (
                        <Zap className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span>{tier.cta}</span>
                    </Link>
                  </div>

                  {/* Features */}
                  <div className="mt-8">
                    <ul className="space-y-3" role="list">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check
                            className="mr-3 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400"
                            aria-hidden="true"
                          />
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Highlight gradient overlay */}
                {tier.highlighted && (
                  <div
                    className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-50 via-transparent to-secondary-50 opacity-50 dark:from-primary-900/10 dark:to-secondary-900/10"
                    aria-hidden="true"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-8 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <Check
                className="h-5 w-5 text-success-600 dark:text-success-400"
                aria-hidden="true"
              />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check
                className="h-5 w-5 text-success-600 dark:text-success-400"
                aria-hidden="true"
              />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check
                className="h-5 w-5 text-success-600 dark:text-success-400"
                aria-hidden="true"
              />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check
                className="h-5 w-5 text-success-600 dark:text-success-400"
                aria-hidden="true"
              />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
