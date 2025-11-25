/**
 * Popular Times Service Interface
 *
 * Analyzes historical booking patterns to suggest popular time slots.
 * Uses recency weighting and statistical confidence thresholds.
 *
 * @module contracts/popular-times
 * @see spec.md FR-004 Popular Times Analysis
 */

import { PopularTimeSlot, Language } from '../types';

/**
 * Service for analyzing popular booking times
 */
export interface IPopularTimesService {
  /**
   * Get popular booking times for a salon
   *
   * @param salonId - Salon to analyze
   * @param options - Analysis options
   * @returns Array of popular time slots with confidence scores
   *
   * @example
   * ```typescript
   * const popularTimes = await popularTimesService.getPopularTimes(
   *   'salon-123',
   *   {
   *     serviceId: 'haircut-456',
   *     limit: 5,
   *     minConfidence: 0.7
   *   }
   * );
   * // Returns top 5 popular times with >70% confidence
   * ```
   *
   * @sql 90-day weighted query with recency buckets
   * @cache Redis 1-hour TTL at key `popular:${salonId}:${serviceId}`
   * @performance <200ms with cache hit, <500ms cache miss
   */
  getPopularTimes(
    salonId: string,
    options?: PopularTimesOptions
  ): Promise<PopularTimeSlot[]>;

  /**
   * Get industry-standard default popular times
   *
   * @param businessType - Type of business for defaults
   * @returns Standard popular times for business type
   *
   * @example
   * ```typescript
   * const defaults = popularTimesService.getDefaultTimes('beauty_salon');
   * // Returns: Friday 2pm, Friday 3pm, Saturday 10am, Saturday 2pm
   * ```
   *
   * @fallback Used when salon has insufficient booking history
   */
  getDefaultTimes(
    businessType?: BusinessType
  ): PopularTimeSlot[];

  /**
   * Check current availability for popular times
   *
   * @param popularTimes - Times to check
   * @param date - Date to check availability
   * @returns Popular times with availability status
   *
   * @example
   * ```typescript
   * const withAvailability = await popularTimesService.checkAvailability(
   *   popularTimes,
   *   '2025-10-25'
   * );
   * // Each slot now has isAvailable and nextAvailableSlot
   * ```
   */
  checkAvailability(
    popularTimes: PopularTimeSlot[],
    date: string
  ): Promise<PopularTimeSlot[]>;

  /**
   * Calculate weighted booking score
   *
   * @param bookings - Historical bookings to analyze
   * @param options - Weighting options
   * @returns Weighted scores by day/hour
   *
   * @internal Used internally for popular times calculation
   *
   * @weighting
   * - Last 30 days: 2.0x weight
   * - 31-60 days: 1.5x weight
   * - 61-90 days: 1.0x weight
   */
  calculateWeightedScores(
    bookings: BookingRecord[],
    options?: WeightingOptions
  ): WeightedScore[];

  /**
   * Invalidate cached popular times
   *
   * @param salonId - Salon to invalidate
   * @param serviceId - Optional service filter
   * @returns True if cache was cleared
   *
   * @example
   * ```typescript
   * // After new booking, invalidate cache
   * await popularTimesService.invalidateCache('salon-123');
   * ```
   */
  invalidateCache(
    salonId: string,
    serviceId?: string
  ): Promise<boolean>;

  /**
   * Warm cache for active salons
   *
   * @param salonIds - Salons to warm cache for
   * @returns Number of caches warmed
   *
   * @background Run every 30 minutes for active salons
   */
  warmCache(salonIds: string[]): Promise<number>;

  /**
   * Format popular times for display
   *
   * @param popularTimes - Times to format
   * @param language - Display language
   * @returns Formatted display strings
   *
   * @example
   * ```typescript
   * const formatted = popularTimesService.formatForDisplay(
   *   popularTimes,
   *   'ru'
   * );
   * // "Пятница 15:00 ⭐ 23 брони"
   * ```
   */
  formatForDisplay(
    popularTimes: PopularTimeSlot[],
    language: Language
  ): string[];

  /**
   * Get statistical confidence for a time slot
   *
   * @param bookingCount - Number of bookings
   * @param totalBookings - Total salon bookings
   * @returns Confidence score (0-1)
   *
   * @formula Modified Wilson confidence interval
   */
  calculateConfidence(
    bookingCount: number,
    totalBookings: number
  ): number;

  /**
   * Detect seasonal patterns
   *
   * @param salonId - Salon to analyze
   * @param options - Pattern detection options
   * @returns Detected seasonal patterns
   *
   * @future Enhancement for holiday detection
   */
  detectSeasonalPatterns(
    salonId: string,
    options?: SeasonalOptions
  ): Promise<SeasonalPattern[]>;
}

/**
 * Popular times query options
 */
export interface PopularTimesOptions {
  /** Filter by service */
  serviceId?: string;

  /** Filter by master */
  masterId?: string;

  /** Maximum results to return */
  limit?: number;

  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;

  /** Minimum booking count for inclusion */
  minBookings?: number;

  /** Include unavailable times */
  includeUnavailable?: boolean;

  /** Days to look back (default: 90) */
  lookbackDays?: number;

  /** Use cache if available */
  useCache?: boolean;
}

/**
 * Booking record for analysis
 */
export interface BookingRecord {
  /** Booking ID */
  id: string;

  /** Start timestamp */
  startTime: Date;

  /** Service ID */
  serviceId: string;

  /** Master ID */
  masterId: string;

  /** Booking status */
  status: 'confirmed' | 'completed' | 'cancelled';
}

/**
 * Weighting configuration
 */
export interface WeightingOptions {
  /** Weight for last 30 days */
  recentWeight?: number;

  /** Weight for 31-60 days */
  mediumWeight?: number;

  /** Weight for 61-90 days */
  oldWeight?: number;

  /** Exclude cancelled bookings */
  excludeCancelled?: boolean;
}

/**
 * Weighted score result
 */
export interface WeightedScore {
  /** Day of week (0-6) */
  dayOfWeek: number;

  /** Hour of day (0-23) */
  hour: number;

  /** Raw booking count */
  count: number;

  /** Weighted score */
  score: number;

  /** Statistical confidence */
  confidence: number;
}

/**
 * Business type for defaults
 */
export type BusinessType =
  | 'beauty_salon'
  | 'barbershop'
  | 'spa'
  | 'nail_salon'
  | 'generic';

/**
 * Seasonal pattern detection
 */
export interface SeasonalPattern {
  /** Pattern type */
  type: 'weekly' | 'monthly' | 'holiday';

  /** Pattern description */
  description: string;

  /** Affected time slots */
  affectedSlots: PopularTimeSlot[];

  /** Confidence in pattern */
  confidence: number;
}

/**
 * Seasonal detection options
 */
export interface SeasonalOptions {
  /** Include holiday detection */
  includeHolidays?: boolean;

  /** Country for holiday calendar */
  country?: string;

  /** Minimum pattern occurrences */
  minOccurrences?: number;
}

/**
 * Service configuration
 */
export interface PopularTimesConfig {
  /** Redis URL for caching */
  redisUrl?: string;

  /** Cache TTL in seconds (default: 3600) */
  cacheTTL?: number;

  /** Default lookback days (default: 90) */
  defaultLookback?: number;

  /** Minimum bookings for significance (default: 3) */
  minBookings?: number;

  /** Default confidence threshold (default: 0.5) */
  defaultConfidence?: number;

  /** Enable background cache warming */
  enableCacheWarming?: boolean;

  /** Cache warming interval in minutes */
  warmingInterval?: number;

  /** Enable debug logging */
  debug?: boolean;
}