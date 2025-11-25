/**
 * Features Section Component
 * Showcase key platform features with icons and descriptions
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Calendar,
  Bot,
  Users,
  BarChart3,
  Bell,
  Clock,
  Shield,
  Zap,
  Globe,
  Smartphone,
  TrendingUp,
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: 'AI-Powered Automation',
    description:
      'Intelligent chatbot handles customer inquiries, bookings, and FAQs 24/7 without human intervention.',
    color: 'primary',
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: 'WhatsApp Integration',
    description:
      'Native WhatsApp Business API integration for seamless customer communication on their preferred platform.',
    color: 'primary',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Smart Booking System',
    description:
      'Automated appointment scheduling with real-time availability, reminders, and calendar sync.',
    color: 'secondary',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Customer Management',
    description:
      'Centralized customer database with booking history, preferences, and automated follow-ups.',
    color: 'info',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics Dashboard',
    description:
      'Real-time insights into bookings, revenue, customer behavior, and business performance metrics.',
    color: 'success',
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: 'Automated Reminders',
    description:
      'Smart notifications for appointments, promotions, and follow-ups via WhatsApp messages.',
    color: 'warning',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: '24/7 Availability',
    description:
      'Never miss a booking opportunity with round-the-clock automated customer service.',
    color: 'secondary',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Enterprise Security',
    description:
      'Bank-level encryption, GDPR compliance, and secure data handling for peace of mind.',
    color: 'error',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Instant Responses',
    description:
      'Sub-second response times ensure customers get immediate answers to their questions.',
    color: 'warning',
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: 'Multi-Language Support',
    description:
      'Serve customers in their preferred language with AI-powered translation capabilities.',
    color: 'info',
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: 'Mobile-First Design',
    description:
      'Fully responsive interface optimized for mobile devices and tablets.',
    color: 'primary',
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Growth Tools',
    description:
      'Marketing automation, promotional campaigns, and customer retention features.',
    color: 'success',
  },
];

const colorClasses = {
  primary: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    text: 'text-primary-600 dark:text-primary-400',
  },
  secondary: {
    bg: 'bg-secondary-100 dark:bg-secondary-900/30',
    text: 'text-secondary-600 dark:text-secondary-400',
  },
  success: {
    bg: 'bg-success-100 dark:bg-success-900/30',
    text: 'text-success-600 dark:text-success-400',
  },
  warning: {
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    text: 'text-warning-600 dark:text-warning-400',
  },
  error: {
    bg: 'bg-error-100 dark:bg-error-900/30',
    text: 'text-error-600 dark:text-error-400',
  },
  info: {
    bg: 'bg-info-100 dark:bg-info-900/30',
    text: 'text-info-600 dark:text-info-400',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

/**
 * Features Section showcasing platform capabilities
 * Grid layout with animated feature cards
 */
export function FeaturesSection() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="features"
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
              Features
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl lg:text-5xl">
              Everything You Need to Scale
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              Powerful features designed to automate your business operations
              and delight your customers.
            </p>
          </motion.div>
        </div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10"
        >
          {features.map((feature, index) => {
            const colors =
              colorClasses[feature.color as keyof typeof colorClasses];
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative"
              >
                <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {/* Icon */}
                  <div
                    className={`inline-flex rounded-xl ${colors.bg} p-3 ${colors.text}`}
                  >
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-neutral-600 dark:text-neutral-300">
                    {feature.description}
                  </p>

                  {/* Hover effect */}
                  <div
                    className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-neutral-50 opacity-0 transition-opacity group-hover:opacity-100 dark:to-neutral-800"
                    aria-hidden="true"
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            And many more features to help you grow your business
          </p>
        </motion.div>
      </div>
    </section>
  );
}
