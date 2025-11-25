/**
 * i18n Context Provider
 * Manages language state and provides translations
 */

'use client';

import * as React from 'react';
import { translations, type Translations } from './translations';
import { languages, defaultLanguage, getLanguageByCode } from './languages';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: Translations;
  languages: typeof languages;
  dir: 'ltr' | 'rtl';
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'whatsapp-saas-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Initialize locale from localStorage or browser language
  const [locale, setLocaleState] = React.useState<string>(defaultLanguage);
  const [mounted, setMounted] = React.useState(false);

  // Initialize locale on client side only
  React.useEffect(() => {
    setMounted(true);

    // Try localStorage first
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
      return;
    }

    // Try browser language
    if (typeof window !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang && translations[browserLang]) {
        setLocaleState(browserLang);
      }
    }
  }, []);

  // Get current language direction
  const dir = React.useMemo(() => {
    const lang = getLanguageByCode(locale);
    return lang?.dir || 'ltr';
  }, [locale]);

  // Update locale and save to localStorage
  const setLocale = React.useCallback((newLocale: string) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

      // Update document direction
      document.documentElement.dir = getLanguageByCode(newLocale)?.dir || 'ltr';
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Set initial document direction and lang
  React.useEffect(() => {
    if (mounted) {
      document.documentElement.dir = dir;
      document.documentElement.lang = locale;
    }
  }, [mounted, dir, locale]);

  // Get translations for current locale
  const t = React.useMemo(() => {
    return (translations[locale] || translations[defaultLanguage]) as Translations;
  }, [locale]);

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
      t,
      languages,
      dir,
    }),
    [locale, setLocale, t, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to use i18n context
 */
export function useI18n() {
  const context = React.useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

/**
 * Shorthand hook to get translations
 */
export function useTranslations() {
  const { t } = useI18n();
  return t;
}
