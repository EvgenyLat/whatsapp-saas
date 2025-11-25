/**
 * FAQ Section Component
 * Frequently asked questions with accordion
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How long does setup actually take? Be honest.',
    answer:
      '5 minutes to connect WhatsApp. 10 minutes to add your services and prices. First booking usually comes within 24 hours. Sarah from Glow Beauty Salon made her first $200 booking 3 hours after setup. No joke.',
  },
  {
    question: 'What if the AI makes a mistake with a booking?',
    answer:
      'In 18 months, our AI has processed 127,000+ bookings with 99.2% accuracy. If it ever makes a mistake (super rare), you get instant notification, can fix it with one click, and we credit your account $50 for the inconvenience. Plus, you can always review and approve bookings before confirming.',
  },
  {
    question: 'How quickly will I see ROI?',
    answer:
      'Average salon sees first after-hours booking within 48 hours (worth $80-150). By week 2, most make back their monthly investment. By month 2, average extra revenue is $2,400. Jessica from Luxe Nails says: "Made $320 on day one. 40x ROI now."',
  },
  {
    question: 'What\'s your refund policy?',
    answer:
      '14-day free trial, no credit card needed. After that, cancel anytime with one click. Unhappy in first 30 days? Full refund, no questions asked. We even let you export all your data. Zero risk.',
  },
  {
    question: 'I\'m not tech-savvy. Will I struggle with this?',
    answer:
      'Emma, 62-year-old salon owner who "can barely use Facebook" set it up in 12 minutes. It\'s literally: 1) Click connect WhatsApp, 2) Type your services and prices, 3) Done. If you can send a text, you can use this. Plus, we\'ll do the setup FOR you if needed (free).',
  },
  {
    question: 'What if my customers don\'t use WhatsApp?',
    answer:
      'WhatsApp has 2+ billion users. 78% of your customers already have it. But here\'s the thing: younger customers (18-35) who spend the most on beauty services? 94% use WhatsApp daily. You\'re missing them right now.',
  },
  {
    question: 'Can I cancel anytime? No contracts?',
    answer:
      'Cancel with one click. No contracts. No cancellation fees. No "please stay" calls. Month-to-month billing. Cancel Monday, stop paying Tuesday. We earn your business every single month or you leave. Simple.',
  },
  {
    question: 'Will this work for my specific type of salon/spa?',
    answer:
      'Works for: hair salons, nail salons, barbershops, spas, lash studios, brow bars, massage therapists, estheticians, tattoo parlors, med spas, beauty clinics. If you take appointments, it works. 500+ different beauty businesses already using it successfully.',
  },
  {
    question: 'How is this different from other booking systems or chatbots?',
    answer:
      'Other systems: Customer types → waits → types more → gets confused → gives up. Us: Customer texts normally → AI responds in 8 seconds → shows 3 buttons → customer taps one → booked. No apps to download. No passwords. No typing. That\'s why our booking completion rate is 94% vs industry average 31%.',
  },
  {
    question: 'What happens to my customer data if I cancel?',
    answer:
      'Your data = your data. Period. Cancel and we\'ll send you everything in Excel/CSV format within 24 hours. All customer contacts, booking history, conversations - everything. Then we delete it from our servers after 30 days. You own your business data, not us.',
  },
];

/**
 * FAQ Section with expandable accordion
 * Handles keyboard navigation and ARIA attributes
 */
export function FAQSection() {
  const [mounted, setMounted] = React.useState(false);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFAQ(index);
    }
  };

  return (
    <section
      id="faq"
      className="bg-white px-4 py-20 dark:bg-neutral-800 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-4xl">
        {/* Section header */}
        <div className="text-center">
          <motion.div
            initial={mounted ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-secondary-100 px-4 py-1.5 text-sm font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
              Real Answers
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl lg:text-5xl">
              Your Concerns, Addressed Honestly
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
              No marketing fluff. Real answers to the questions keeping you from
              making $2,400 more per month.
            </p>
          </motion.div>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-16 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={mounted ? { opacity: 0, y: 20 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
                  <button
                    onClick={() => toggleFAQ(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="flex w-full items-start justify-between gap-4 p-6 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                  >
                    <span className="flex-1 text-lg font-semibold text-neutral-900 dark:text-white">
                      {faq.question}
                    </span>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition-colors dark:bg-primary-900/30 dark:text-primary-400"
                      aria-hidden="true"
                    >
                      {isOpen ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </span>
                  </button>

                  {/* Answer */}
                  <motion.div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    initial={false}
                    animate={{
                      height: isOpen ? 'auto' : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeInOut',
                    }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-6 dark:border-neutral-700 dark:bg-neutral-800/50">
                      <p className="text-neutral-600 dark:text-neutral-300">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-primary-50 to-secondary-50 p-8 dark:border-neutral-700 dark:from-primary-900/20 dark:to-secondary-900/20">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Ready to Stop Losing $2,400/Month?
            </h3>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">
              Every night you wait = 5-7 lost bookings. Start your free trial now.
              Set up in 5 minutes. First booking tonight.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600"
              >
                Start Free 14-Day Trial →
              </a>
              <a
                href="https://wa.me/1234567890?text=I want to see a demo"
                className="inline-flex items-center justify-center rounded-lg border-2 border-neutral-300 bg-white px-6 py-3 text-base font-semibold text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
              >
                💬 Text Us for Demo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
