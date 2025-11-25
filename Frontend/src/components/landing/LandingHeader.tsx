/**
 * Landing Header Component
 * Modern header with navigation, language selector, and CTA buttons
 * Inspired by SalonBot design
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ChevronDown, Menu, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';

interface LandingHeaderProps {
  className?: string;
}

/**
 * Landing Header with sticky navigation
 */
export function LandingHeader({ className }: LandingHeaderProps) {
  const router = useRouter();
  const { t, locale, setLocale, languages } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setMobileMenuOpen(false);
    }
  };

  // Navigation items
  const navItems = [
    { label: t.nav.features, id: 'features' },
    { label: t.nav.demo, id: 'demo' },
    { label: t.nav.pricing, id: 'pricing' },
    { label: t.nav.reviews, id: 'reviews' },
  ];

  // Current language
  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 shadow-md backdrop-blur-md dark:bg-neutral-900/95'
          : 'bg-white dark:bg-neutral-900',
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 shadow-md md:h-10 md:w-10">
              <MessageCircle className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <span className="text-lg font-bold text-neutral-900 dark:text-white md:text-xl">
              WhatsApp SaaS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Section: Language + Buttons */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 md:px-3 md:py-2"
                aria-label="Select language"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    languageMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Language Dropdown */}
              <AnimatePresence>
                {languageMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setLanguageMenuOpen(false)}
                      aria-hidden="true"
                    />

                    {/* Menu */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLocale(lang.code);
                            setLanguageMenuOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                            locale === lang.code
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700'
                          )}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="font-medium">{lang.nativeName}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Sign In Button (Desktop) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
              className="hidden lg:inline-flex"
            >
              {t.nav.signIn}
            </Button>

            {/* Start Free Trial Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/register')}
              className="hidden bg-primary-500 hover:bg-primary-600 sm:inline-flex"
            >
              {t.nav.startFreeTrial}
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 z-40 bg-black/20 backdrop-blur-sm md:top-20 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full z-50 border-t border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 lg:hidden"
            >
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
                {/* Navigation Links */}
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Divider */}
                <div className="my-4 border-t border-neutral-200 dark:border-neutral-700" />

                {/* Auth Buttons */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      router.push('/login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-center"
                  >
                    {t.nav.signIn}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      router.push('/register');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-center bg-primary-500 hover:bg-primary-600"
                  >
                    {t.nav.startFreeTrial}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
