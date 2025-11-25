/**
 * Language Enum
 *
 * Supported languages for multi-language cache entries.
 * Each language has separate cache entries to ensure proper localization.
 */
export enum Language {
  /** Russian */
  RUSSIAN = 'ru',

  /** English */
  ENGLISH = 'en',

  /** Spanish */
  SPANISH = 'es',

  /** Portuguese */
  PORTUGUESE = 'pt',

  /** Hebrew */
  HEBREW = 'he',
}

/**
 * Language code type for type safety
 */
export type LanguageCode = 'ru' | 'en' | 'es' | 'pt' | 'he';
