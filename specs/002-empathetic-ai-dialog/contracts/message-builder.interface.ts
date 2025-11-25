/**
 * Message Builder Service Interface
 *
 * Generates empathetic, multi-language messages with emotion indicators.
 * Handles template interpolation and business context variations.
 *
 * @module contracts/message-builder
 * @see spec.md FR-001 Message Builder Service
 */

import { Language, Emotion, MessageKey, ChoiceCard } from '../types';

/**
 * Service for building empathetic messages
 */
export interface IMessageBuilderService {
  /**
   * Get a localized message with parameter interpolation
   *
   * @param key - Message template key
   * @param language - Target language
   * @param params - Dynamic parameters to interpolate
   * @returns Formatted message string
   *
   * @example
   * ```typescript
   * const message = messageBuilder.getMessage(
   *   'SLOT_TAKEN',
   *   'ru',
   *   { time: '15:00', day: 'пятница' }
   * );
   * // Returns: "К сожалению, 15:00 в пятница уже занято 😔\n\n..."
   * ```
   *
   * @performance <20ms with caching
   * @cache In-memory cache with no TTL
   */
  getMessage(
    key: MessageKey | string,
    language: Language | string,
    params?: Record<string, any>
  ): string;

  /**
   * Get a message with business context variation
   *
   * @param key - Message template key
   * @param language - Target language
   * @param context - Business context for variations
   * @returns Context-appropriate message
   *
   * @example
   * ```typescript
   * const message = messageBuilder.getContextualMessage(
   *   'GREETING',
   *   'en',
   *   {
   *     businessType: 'barbershop',
   *     preferredTone: 'casual'
   *   }
   * );
   * // Returns barbershop-specific casual greeting
   * ```
   */
  getContextualMessage(
    key: MessageKey | string,
    language: Language | string,
    context: BusinessContext
  ): string;

  /**
   * Build a choice card for categorical decisions
   *
   * @param scenario - Choice scenario identifier
   * @param language - Target language
   * @param context - Additional context for card generation
   * @returns Complete choice card for WhatsApp
   *
   * @example
   * ```typescript
   * const card = messageBuilder.getChoiceCard(
   *   'time_unavailable',
   *   'ru',
   *   {
   *     originalTime: '15:00',
   *     originalDate: 'пятница'
   *   }
   * );
   * // Returns card with "same day" vs "same time" choices
   * ```
   */
  getChoiceCard(
    scenario: ChoiceScenario,
    language: Language | string,
    context?: Record<string, any>
  ): ChoiceCard;

  /**
   * Get all available message keys
   *
   * @returns Array of message template keys
   */
  getAvailableMessages(): MessageKey[];

  /**
   * Get supported languages
   *
   * @returns Array of language codes
   */
  getSupportedLanguages(): Language[];

  /**
   * Validate message parameters
   *
   * @param key - Message template key
   * @param params - Parameters to validate
   * @returns Validation result with missing parameters
   *
   * @example
   * ```typescript
   * const validation = messageBuilder.validateParameters(
   *   'SLOT_TAKEN',
   *   { time: '15:00' }
   * );
   * // Returns: { valid: false, missing: ['day'] }
   * ```
   */
  validateParameters(
    key: MessageKey | string,
    params: Record<string, any>
  ): ValidationResult;

  /**
   * Get emotion indicator for a message
   *
   * @param key - Message template key
   * @returns Emotion type and emoji
   *
   * @example
   * ```typescript
   * const emotion = messageBuilder.getEmotion('SLOT_TAKEN');
   * // Returns: { type: 'empathetic', emoji: '😔' }
   * ```
   */
  getEmotion(key: MessageKey | string): EmotionIndicator;

  /**
   * Format a message with line limits
   *
   * @param message - Message to format
   * @param maxLines - Maximum number of lines
   * @returns Formatted message within limits
   */
  formatWithLimits(message: string, maxLines: number): string;
}

/**
 * Business context for message variations
 */
export interface BusinessContext {
  /** Type of business */
  businessType?: 'beauty_salon' | 'barbershop' | 'spa' | 'generic';

  /** Preferred communication tone */
  preferredTone?: 'formal' | 'casual' | 'friendly';

  /** Custom business name */
  businessName?: string;

  /** Additional context parameters */
  params?: Record<string, any>;
}

/**
 * Choice scenario types
 */
export type ChoiceScenario =
  | 'time_unavailable'     // Requested time not available
  | 'day_full'             // Entire day booked
  | 'week_full'            // Entire week booked
  | 'incomplete_request'   // Missing info from user
  | 'multiple_options'     // Many slots available
  | 'popular_times';       // Show popular booking times

/**
 * Parameter validation result
 */
export interface ValidationResult {
  /** Whether all required parameters are present */
  valid: boolean;

  /** Missing parameter names */
  missing?: string[];

  /** Extra parameters provided */
  extra?: string[];

  /** Validation errors */
  errors?: Array<{
    param: string;
    error: string;
  }>;
}

/**
 * Emotion indicator metadata
 */
export interface EmotionIndicator {
  /** Emotion type */
  type: Emotion;

  /** Associated emoji */
  emoji: string;

  /** Emotion intensity (0-1) */
  intensity?: number;
}

/**
 * Message template definition
 */
export interface MessageTemplate {
  /** Unique key */
  key: string;

  /** Translations by language */
  templates: Record<Language, string>;

  /** Required parameters */
  parameters?: string[];

  /** Emotion indicator */
  emotion: Emotion;

  /** Associated emoji */
  emoji: string;

  /** Maximum line count */
  maxLines: number;

  /** Business variations */
  variations?: Record<string, Record<Language, string>>;
}

/**
 * Service configuration
 */
export interface MessageBuilderConfig {
  /** Default language if not specified */
  defaultLanguage?: Language;

  /** Enable message caching */
  enableCache?: boolean;

  /** Cache size limit */
  maxCacheSize?: number;

  /** Custom message templates */
  customTemplates?: MessageTemplate[];

  /** Enable debug logging */
  debug?: boolean;
}