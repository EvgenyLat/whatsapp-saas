/**
 * Alternative Suggester Service Interface
 *
 * Ranks booking alternatives by proximity to user's original request.
 * Uses time and date proximity scoring with visual indicators.
 *
 * @module contracts/alternative-suggester
 * @see spec.md FR-003 Alternative Ranking Algorithm
 */

import { SlotSuggestion, RankedSlot, ProximityScore } from '../types';

/**
 * Service for ranking alternative booking slots
 */
export interface IAlternativeSuggesterService {
  /**
   * Rank slots by proximity to target date
   *
   * @param slots - Available slot suggestions
   * @param targetDate - User's originally requested date (ISO format)
   * @returns Slots ranked by date proximity, closest first
   *
   * @example
   * ```typescript
   * const ranked = await suggester.rankByDateProximity(
   *   slots,
   *   '2025-10-25'
   * );
   * // Returns slots ordered: Oct 24, Oct 26, Oct 23, Oct 27...
   * ```
   *
   * @performance O(n log n) sorting, <20ms for 100 slots
   */
  rankByDateProximity(
    slots: SlotSuggestion[],
    targetDate: string
  ): Promise<RankedSlot[]>;

  /**
   * Rank slots by proximity to target time
   *
   * @param slots - Available slot suggestions
   * @param targetTime - User's originally requested time (HH:mm format)
   * @returns Slots ranked by time proximity, closest first
   *
   * @example
   * ```typescript
   * const ranked = await suggester.rankByTimeProximity(
   *   slots,
   *   '15:00'
   * );
   * // Returns slots ordered: 14:00 (⭐), 16:00 (⭐), 13:00, 17:00...
   * ```
   *
   * @scoring
   * - ±1 hour: score +500, show ⭐
   * - ±2 hours: score +300
   * - ±3 hours: score +100
   * - >3 hours: score +0
   *
   * @performance O(n log n) sorting, <20ms for 100 slots
   */
  rankByTimeProximity(
    slots: SlotSuggestion[],
    targetTime: string
  ): Promise<RankedSlot[]>;

  /**
   * Rank slots by combined factors (date, time, master match)
   *
   * @param slots - Available slot suggestions
   * @param preferences - User preferences for ranking
   * @returns Comprehensively ranked slots
   *
   * @example
   * ```typescript
   * const ranked = await suggester.rankByMultipleFactors(slots, {
   *   targetDate: '2025-10-25',
   *   targetTime: '15:00',
   *   preferredMasterId: 'master-123',
   *   weights: {
   *     dateWeight: 0.3,
   *     timeWeight: 0.5,
   *     masterWeight: 0.2
   *   }
   * });
   * ```
   *
   * @scoring
   * - Master match: +1000 points
   * - Time proximity: up to +500 points
   * - Date proximity: up to +300 points
   *
   * @performance O(n log n) sorting, <30ms for 100 slots
   */
  rankByMultipleFactors(
    slots: SlotSuggestion[],
    preferences: RankingPreferences
  ): Promise<RankedSlot[]>;

  /**
   * Calculate proximity score for a single slot
   *
   * @param slot - Slot to score
   * @param target - Target date/time to compare against
   * @returns Detailed proximity scoring breakdown
   *
   * @internal Used internally by ranking methods
   */
  calculateProximityScore(
    slot: SlotSuggestion,
    target: {
      date?: string;
      time?: string;
      masterId?: string;
    }
  ): ProximityScore;

  /**
   * Add visual indicators to ranked slots
   *
   * @param rankedSlots - Slots already ranked by score
   * @param limit - Number of top slots to mark with ⭐ (default: 3)
   * @returns Slots with visual indicators added
   *
   * @example
   * ```typescript
   * const withIndicators = suggester.addVisualIndicators(ranked, 3);
   * // Top 3 slots get ⭐ indicator
   * // Slots within 1 hour get proximity text: "1 hour earlier"
   * ```
   */
  addVisualIndicators(
    rankedSlots: RankedSlot[],
    limit?: number
  ): RankedSlot[];
}

/**
 * Preferences for multi-factor ranking
 */
export interface RankingPreferences {
  /** Target date (ISO format) */
  targetDate?: string;

  /** Target time (HH:mm format) */
  targetTime?: string;

  /** Preferred master ID */
  preferredMasterId?: string;

  /** Preferred service ID */
  preferredServiceId?: string;

  /** Custom weights for scoring factors */
  weights?: {
    /** Weight for date proximity (0-1) */
    dateWeight?: number;

    /** Weight for time proximity (0-1) */
    timeWeight?: number;

    /** Weight for master match (0-1) */
    masterWeight?: number;
  };

  /** Maximum results to return */
  limit?: number;
}

/**
 * Ranked slot with scoring metadata
 */
export interface RankedSlot extends SlotSuggestion {
  /** Calculated proximity score */
  score: ProximityScore;

  /** Rank position (1-based) */
  rank: number;

  /** Visual indicators for display */
  indicators: {
    /** Show star indicator */
    showStar: boolean;

    /** Proximity description */
    proximityText?: string;

    /** Highlight color */
    highlightColor?: 'gold' | 'silver' | 'bronze';
  };

  /** Display-ready text with indicators */
  displayText: string;
}

/**
 * Service configuration
 */
export interface AlternativeSuggesterConfig {
  /** Maximum slots to rank at once */
  maxSlots?: number;

  /** Number of top slots to mark with ⭐ */
  starredCount?: number;

  /** Enable debug logging */
  debug?: boolean;
}