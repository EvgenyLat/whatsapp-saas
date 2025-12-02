/**
 * AlternativeSuggesterService - Intelligent slot ranking and suggestion
 *
 * @module ai/services/alternative-suggester
 * @description Ranks available slots by proximity to requested time/date
 * with visual indicators and scoring algorithms
 */

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SlotSuggestion } from '../types';
import { RankedSlot, Language } from '../types/choice.types';
import { MessageBuilderService } from './message-builder.service';

/**
 * Scoring configuration for slot ranking
 */
const SCORING_CONFIG = {
  /** Points for slots within ±1 hour */
  WITHIN_ONE_HOUR_POINTS: 500,

  /** Points for slots within ±2 hours */
  WITHIN_TWO_HOURS_POINTS: 300,

  /** Points for slots within ±3 hours */
  WITHIN_THREE_HOURS_POINTS: 150,

  /** Points for same day */
  SAME_DAY_POINTS: 200,

  /** Points for next day */
  NEXT_DAY_POINTS: 100,

  /** Points for within same week */
  SAME_WEEK_POINTS: 50,

  /** Maximum slots to show star indicator */
  MAX_STAR_SLOTS: 3,
};

/**
 * AlternativeSuggesterService
 *
 * Provides intelligent ranking of alternative time slots
 * based on proximity to original request with visual indicators
 */
@Injectable()
export class AlternativeSuggesterService {
  private readonly logger = new Logger(AlternativeSuggesterService.name);

  constructor(private readonly messageBuilder: MessageBuilderService) {}

  /**
   * Rank slots by time proximity to target time
   *
   * @param slots - Available slots to rank
   * @param targetTime - Target time in HH:mm format
   * @param language - Language for proximity text (default: 'ru')
   * @returns Ranked slots with scores and indicators
   *
   * @example
   * const ranked = await suggester.rankByTimeProximity(
   *   slots,
   *   '15:00',
   *   'en'
   * );
   * // Returns slots sorted by proximity to 15:00
   * // with stars for closest matches
   */
  async rankByTimeProximity(
    slots: SlotSuggestion[],
    targetTime: string,
    language: Language = 'ru',
  ): Promise<RankedSlot[]> {
    const startTime = Date.now();

    try {
      // Parse target time
      const targetMinutes = this.timeToMinutes(targetTime);

      // Score each slot
      const scoredSlots = slots.map((slot) => {
        const slotMinutes = this.timeToMinutes(slot.startTime);
        const diffMinutes = slotMinutes - targetMinutes;
        const absDiffMinutes = Math.abs(diffMinutes);

        // Calculate proximity score
        let score = 1000; // Base score

        if (absDiffMinutes <= 60) {
          score += SCORING_CONFIG.WITHIN_ONE_HOUR_POINTS;
        } else if (absDiffMinutes <= 120) {
          score += SCORING_CONFIG.WITHIN_TWO_HOURS_POINTS;
        } else if (absDiffMinutes <= 180) {
          score += SCORING_CONFIG.WITHIN_THREE_HOURS_POINTS;
        }

        // Reduce score for larger differences
        score -= absDiffMinutes * 2;

        return {
          ...slot,
          score,
          rank: 0, // Will be set after sorting
          indicators: {
            showStar: false, // Will be set for top slots
            proximityText: undefined, // Will be set with localized text
          },
          // Store diffMinutes temporarily (not part of RankedSlot interface)
          _diffMinutes: diffMinutes,
        } as RankedSlot & { _diffMinutes: number };
      });

      // Sort by score (highest first)
      scoredSlots.sort((a, b) => b.score - a.score);

      // Set ranks and add indicators
      const rankedSlots = scoredSlots.map((slot, index) => {
        slot.rank = index + 1;

        // Add star to top slots
        if (index < SCORING_CONFIG.MAX_STAR_SLOTS && slot.score > 500) {
          slot.indicators.showStar = true;
        }

        // Add proximity text
        const slotWithDiff = slot as RankedSlot & { _diffMinutes?: number };
        if (slotWithDiff._diffMinutes !== undefined && Math.abs(slotWithDiff._diffMinutes) <= 180) {
          slot.indicators.proximityText = this.messageBuilder.getProximityText(
            slotWithDiff._diffMinutes,
            language, // Use language parameter
          );
        }

        return slot;
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`Ranked ${slots.length} slots by time proximity in ${duration}ms`);

      return rankedSlots;
    } catch (error) {
      this.logger.error(
        `Error ranking slots by time: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Return unranked slots as fallback
      return slots.map((slot, index) => ({
        ...slot,
        score: 0,
        rank: index + 1,
        indicators: {
          showStar: false,
        },
      }));
    }
  }

  /**
   * Rank slots by date proximity to target date
   *
   * @param slots - Available slots to rank
   * @param targetDate - Target date in YYYY-MM-DD format
   * @param language - Language for proximity text (default: 'ru')
   * @returns Ranked slots with scores and indicators
   *
   * @example
   * const ranked = await suggester.rankByDateProximity(
   *   slots,
   *   '2025-10-25',
   *   'en'
   * );
   * // Returns slots sorted by proximity to target date
   */
  async rankByDateProximity(
    slots: SlotSuggestion[],
    targetDate: string,
    language: Language = 'ru',
  ): Promise<RankedSlot[]> {
    const startTime = Date.now();

    try {
      const target = new Date(targetDate);
      const targetDay = this.getDayOfYear(target);

      // Score each slot
      const scoredSlots = slots.map((slot) => {
        const slotDate = new Date(slot.date);
        const slotDay = this.getDayOfYear(slotDate);
        const dayDiff = slotDay - targetDay;
        const absDayDiff = Math.abs(dayDiff);

        // Calculate proximity score
        let score = 1000; // Base score

        if (absDayDiff === 0) {
          score += SCORING_CONFIG.SAME_DAY_POINTS;
        } else if (absDayDiff === 1) {
          score += SCORING_CONFIG.NEXT_DAY_POINTS;
        } else if (absDayDiff <= 7) {
          score += SCORING_CONFIG.SAME_WEEK_POINTS;
        }

        // Reduce score for larger differences
        score -= absDayDiff * 10;

        return {
          ...slot,
          score,
          rank: 0, // Will be set after sorting
          indicators: {
            showStar: false, // Will be set for top slots
            proximityText: this.getDateProximityText(dayDiff, language),
          },
        } as RankedSlot;
      });

      // Sort by score (highest first)
      scoredSlots.sort((a, b) => b.score - a.score);

      // Set ranks and add indicators
      const rankedSlots = scoredSlots.map((slot, index) => {
        slot.rank = index + 1;

        // Add star to top slots
        if (index < SCORING_CONFIG.MAX_STAR_SLOTS && slot.score > 500) {
          slot.indicators.showStar = true;
        }

        return slot;
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`Ranked ${slots.length} slots by date proximity in ${duration}ms`);

      return rankedSlots;
    } catch (error) {
      this.logger.error(
        `Error ranking slots by date: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Return unranked slots as fallback
      return slots.map((slot, index) => ({
        ...slot,
        score: 0,
        rank: index + 1,
        indicators: {
          showStar: false,
        },
      }));
    }
  }

  /**
   * Add visual indicators to ranked slots
   *
   * @param rankedSlots - Slots already ranked by score
   * @param targetTime - Original requested time
   * @param language - Language for proximity text
   * @returns Slots with visual indicators added
   */
  addVisualIndicators(
    rankedSlots: RankedSlot[],
    targetTime: string,
    language: Language = 'ru',
  ): RankedSlot[] {
    const targetMinutes = this.timeToMinutes(targetTime);

    return rankedSlots.map((slot, index) => {
      const slotMinutes = this.timeToMinutes(slot.startTime);
      const diffMinutes = slotMinutes - targetMinutes;

      // Update proximity text with correct language
      if (Math.abs(diffMinutes) <= 180) {
        slot.indicators.proximityText = this.messageBuilder.getProximityText(diffMinutes, language);

        // Add localized proximity text for all languages
        slot.indicators.proximityTextLocalized = {
          ru: this.messageBuilder.getProximityText(diffMinutes, 'ru'),
          en: this.messageBuilder.getProximityText(diffMinutes, 'en'),
          es: this.messageBuilder.getProximityText(diffMinutes, 'es'),
          pt: this.messageBuilder.getProximityText(diffMinutes, 'pt'),
          he: this.messageBuilder.getProximityText(diffMinutes, 'he'),
        };
      }

      // Create display text with indicators
      let displayText = slot.startTime;
      if (slot.indicators.showStar) {
        displayText = `⭐ ${displayText}`;
      }
      if (slot.indicators.proximityText) {
        displayText = `${displayText} (${slot.indicators.proximityText})`;
      }
      slot.displayText = displayText;

      return slot;
    });
  }

  /**
   * Combine and rank slots by multiple criteria
   *
   * @param slots - Available slots
   * @param criteria - Ranking criteria
   * @returns Ranked slots
   */
  async rankByCombinedCriteria(
    slots: SlotSuggestion[],
    criteria: {
      targetTime?: string;
      targetDate?: string;
      preferSameDay?: boolean;
      preferSameTime?: boolean;
    },
  ): Promise<RankedSlot[]> {
    const scoredSlots = slots.map((slot) => {
      let score = 1000; // Base score

      // Time proximity scoring
      if (criteria.targetTime) {
        const targetMinutes = this.timeToMinutes(criteria.targetTime);
        const slotMinutes = this.timeToMinutes(slot.startTime);
        const timeDiff = Math.abs(slotMinutes - targetMinutes);

        if (criteria.preferSameTime) {
          // Heavily weight exact time matches
          if (timeDiff === 0) {
            score += 1000;
          } else {
            score -= timeDiff * 5;
          }
        } else {
          // Normal time proximity scoring
          if (timeDiff <= 60) {
            score += SCORING_CONFIG.WITHIN_ONE_HOUR_POINTS;
          } else if (timeDiff <= 120) {
            score += SCORING_CONFIG.WITHIN_TWO_HOURS_POINTS;
          }
          score -= timeDiff;
        }
      }

      // Date proximity scoring
      if (criteria.targetDate) {
        const target = new Date(criteria.targetDate);
        const slotDate = new Date(slot.date);
        const dayDiff = Math.abs(this.getDayOfYear(slotDate) - this.getDayOfYear(target));

        if (criteria.preferSameDay) {
          // Heavily weight same day matches
          if (dayDiff === 0) {
            score += 1000;
          } else {
            score -= dayDiff * 100;
          }
        } else {
          // Normal date proximity scoring
          if (dayDiff === 0) {
            score += SCORING_CONFIG.SAME_DAY_POINTS;
          } else if (dayDiff === 1) {
            score += SCORING_CONFIG.NEXT_DAY_POINTS;
          }
          score -= dayDiff * 10;
        }
      }

      return {
        ...slot,
        score,
        rank: 0,
        indicators: {
          showStar: false,
        },
      } as RankedSlot;
    });

    // Sort by score
    scoredSlots.sort((a, b) => b.score - a.score);

    // Set ranks and indicators
    return scoredSlots.map((slot, index) => {
      slot.rank = index + 1;
      if (index < SCORING_CONFIG.MAX_STAR_SLOTS && slot.score > 1500) {
        slot.indicators.showStar = true;
      }
      return slot;
    });
  }

  /**
   * Convert time string to minutes since midnight
   *
   * @param time - Time in HH:mm format
   * @returns Minutes since midnight
   *
   * @private
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get day of year for date
   *
   * @param date - Date object
   * @returns Day of year (1-365/366)
   *
   * @private
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Find nearby alternative slots when primary slot is unavailable
   *
   * Returns top 3-5 alternatives ranked by proximity:
   * - Same day ±1-2 hours
   * - Next/previous day at same time
   * - ±2 days at same time
   *
   * @param allSlots - All available slots
   * @param targetDate - Original requested date
   * @param targetTime - Original requested time
   * @param maxAlternatives - Maximum number of alternatives to return (default: 5)
   * @param language - Language for proximity text (default: 'en')
   * @returns Top ranked alternative slots with proximity indicators
   *
   * @example
   * const alternatives = await suggester.findNearbyAlternatives(
   *   allSlots,
   *   '2025-11-10',
   *   '14:00',
   *   5,
   *   'en'
   * );
   * // Returns ranked alternatives like:
   * // 1. ⭐ 14:30 (30 minutes later)
   * // 2. ⭐ 13:30 (30 minutes earlier)
   * // 3. ⭐ 14:00 Tomorrow
   * // 4. 15:00 (1 hour later)
   * // 5. 14:00 Day after tomorrow
   */
  async findNearbyAlternatives(
    allSlots: SlotSuggestion[],
    targetDate: string,
    targetTime: string,
    maxAlternatives: number = 5,
    language: Language = 'en',
  ): Promise<RankedSlot[]> {
    if (allSlots.length === 0) {
      return [];
    }

    const startTime = Date.now();

    try {
      // Use combined ranking with heavy preference for proximity
      const rankedSlots = await this.rankByCombinedCriteria(allSlots, {
        targetTime,
        targetDate,
        preferSameDay: false, // We want both same-day and next-day alternatives
        preferSameTime: true, // But we strongly prefer same time on different days
      });

      // Add visual indicators with language support
      const slotsWithIndicators = this.addVisualIndicators(rankedSlots, targetTime, language);

      // Add date proximity indicators for alternatives on different days
      const enhancedSlots = slotsWithIndicators.map((slot) => {
        const targetDateObj = new Date(targetDate);
        const slotDateObj = new Date(slot.date);
        const dayDiff = this.getDayOfYear(slotDateObj) - this.getDayOfYear(targetDateObj);

        // If different day, add date proximity text
        if (dayDiff !== 0 && !slot.indicators.proximityText) {
          const dateProximity = this.getDateProximityText(dayDiff, language);
          if (dateProximity) {
            slot.indicators.proximityText = dateProximity;
            // Update display text to include date proximity
            const timeWithStar = slot.indicators.showStar ? `⭐ ${slot.startTime}` : slot.startTime;
            slot.displayText = `${timeWithStar} (${dateProximity})`;
          }
        }

        return slot;
      });

      // Return top N alternatives
      const alternatives = enhancedSlots.slice(0, maxAlternatives);

      const duration = Date.now() - startTime;
      this.logger.debug(`Found ${alternatives.length} nearby alternatives in ${duration}ms`);

      return alternatives;
    } catch (error) {
      this.logger.error(
        `Error finding nearby alternatives: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get date proximity text
   *
   * @param dayDiff - Difference in days
   * @param language - Language for proximity text (default: 'en')
   * @returns Proximity text or undefined
   *
   * @private
   */
  private getDateProximityText(dayDiff: number, language: Language = 'en'): string | undefined {
    if (language === 'en') {
      // English proximity text
      if (dayDiff === 0) {
        return 'Today';
      } else if (dayDiff === 1) {
        return 'Tomorrow';
      } else if (dayDiff === -1) {
        return 'Yesterday';
      } else if (dayDiff === 2) {
        return 'Day after tomorrow';
      } else if (dayDiff > 0 && dayDiff <= 7) {
        return `In ${dayDiff} ${dayDiff === 1 ? 'day' : 'days'}`;
      }
    } else {
      // Russian proximity text (fallback)
      if (dayDiff === 0) {
        return 'Сегодня';
      } else if (dayDiff === 1) {
        return 'Завтра';
      } else if (dayDiff === -1) {
        return 'Вчера';
      } else if (dayDiff === 2) {
        return 'Послезавтра';
      } else if (dayDiff > 0 && dayDiff <= 7) {
        return `Через ${dayDiff} ${this.pluralizeDays(dayDiff)}`;
      }
    }
    return undefined;
  }

  /**
   * Russian pluralization for days
   *
   * @private
   */
  private pluralizeDays(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod100 >= 11 && mod100 <= 14) {
      return 'дней';
    }

    if (mod10 === 1) {
      return 'день';
    }

    if (mod10 >= 2 && mod10 <= 4) {
      return 'дня';
    }

    return 'дней';
  }
}
