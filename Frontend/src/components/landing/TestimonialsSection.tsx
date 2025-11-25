/**
 * Testimonials Section Component
 * Customer success stories and social proof
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  location?: string;
  rating: number;
  image?: string;
  results?: string[];
  period?: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "I was skeptical at first. But after the first week, I made $1,200 from bookings that came in after midnight. That's money I would have lost.\n\nNow I make an extra $2,800 per month from after-hours bookings alone. The AI never sleeps, never takes a break, and never misses a customer.\n\nBest investment I've made for my business.",
    author: 'Sarah Martinez',
    role: 'Owner',
    company: 'Glow Beauty Salon',
    location: 'Miami, FL',
    rating: 5,
    results: [
      '+340% after-hours bookings',
      '+$33,600 annual revenue',
      '18 hours/week time saved',
      '4.9★ Google rating (was 4.2★)'
    ],
    period: '3 months',
  },
  {
    quote:
      "We have 3 salons and were drowning in phone calls. Now all bookings happen automatically on WhatsApp. Our staff can focus on doing great work instead of answering 'Are you available?' calls all day.\n\nThe Spanish language support was a game-changer for us—60% of our customers prefer Spanish.",
    author: 'Carlos Rodriguez',
    role: 'Owner',
    company: 'Belleza Beauty Group',
    location: 'Los Angeles, CA',
    rating: 5,
    results: [
      '22 hours/week saved across 3 salons',
      '+$7,200/month revenue increase',
      '94% booking completion rate',
      'Zero missed appointments'
    ],
    period: '6 months',
  },
  {
    quote:
      "I'm a solo esthetician and I was losing sleep worrying about missed bookings. Now I sleep peacefully knowing the AI is handling everything.\n\nLast month I woke up to 11 new bookings that came in overnight. That's $880 I would have never made before. Plus, my customers love the instant responses!",
    author: 'Emma Thompson',
    role: 'Licensed Esthetician',
    company: 'Pure Glow Skincare',
    location: 'Austin, TX',
    rating: 5,
    results: [
      '+180% after-hours bookings',
      '+$1,400/month extra income',
      '12 hours/week time saved',
      'Doubled client base in 2 months'
    ],
    period: '2 months',
  },
  {
    quote:
      'We tested 3 other booking systems before this. None came close. The difference? Zero typing for customers. They tap buttons, choose times, done. Booking takes 30 seconds instead of 5 minutes of back-and-forth.',
    author: 'Michael Kim',
    role: 'General Manager',
    company: 'Premier Wellness Spa',
    location: 'Chicago, IL',
    rating: 5,
    results: [
      '73% reduction in booking time',
      '+$4,100/month revenue',
      '91% customer satisfaction',
      '5x faster than competitors'
    ],
    period: '4 months',
  },
  {
    quote:
      'The ROI is insane. We pay $79 per month and make an extra $3,200. Our no-show rate dropped from 25% to 5% with automated reminders. The system paid for itself on day one.',
    author: 'Jessica Chen',
    role: 'Co-Founder',
    company: 'Luxe Nails Studio',
    location: 'Seattle, WA',
    rating: 5,
    results: [
      '80% reduction in no-shows',
      '40x return on investment',
      '+250% weekend bookings',
      'Saved $800/month on reception costs'
    ],
    period: '5 months',
  },
  {
    quote:
      'Hebrew language support opened up a whole new customer base for us. The AI switches languages automatically - no setup needed. We went from 0 to 120 Hebrew-speaking customers in 3 months.',
    author: 'David Goldstein',
    role: 'Owner',
    company: 'Tel Aviv Hair Studio',
    location: 'New York, NY',
    rating: 5,
    results: [
      '+120 new customers',
      '5 languages, zero setup',
      '+$5,500/month from new market',
      '100% accurate translations'
    ],
    period: '3 months',
  },
];

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
 * Testimonials Section showcasing customer success stories
 * Grid layout with ratings and quotes
 */
export function TestimonialsSection() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="reviews"
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
            <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              Real Results
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl lg:text-5xl">
              Don't Just Take Our Word For It
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              Real Salons. Real Results. Real Growth.<br />
              Join 500+ beauty businesses making more money with less effort.
            </p>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 grid gap-8 sm:grid-cols-3"
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              500+
            </div>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Salons Trust Us
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              4.9/5
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-warning-400 text-warning-400"
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              127 reviews on G2
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              98%
            </div>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Would Recommend
            </div>
          </div>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {/* Quote icon */}
                <div className="absolute right-6 top-6 opacity-10" aria-hidden="true">
                  <Quote className="h-12 w-12 text-primary-600 dark:text-primary-400" />
                </div>

                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-warning-400 text-warning-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="relative mt-6">
                  <p className="text-neutral-700 dark:text-neutral-300">
                    "{testimonial.quote}"
                  </p>
                </blockquote>

                {/* Results if available */}
                {testimonial.results && (
                  <div className="mt-4 space-y-1">
                    {testimonial.results.map((result, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {result}
                        </span>
                      </div>
                    ))}
                    {testimonial.period && (
                      <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Results achieved in {testimonial.period}
                      </div>
                    )}
                  </div>
                )}

                {/* Author */}
                <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-lg font-bold text-white">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {testimonial.role}, {testimonial.company}
                        {testimonial.location && <> • {testimonial.location}</>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover gradient */}
                <div
                  className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-primary-50/50 opacity-0 transition-opacity group-hover:opacity-100 dark:to-primary-900/10"
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Join these successful businesses today
          </p>
        </motion.div>
      </div>
    </section>
  );
}
