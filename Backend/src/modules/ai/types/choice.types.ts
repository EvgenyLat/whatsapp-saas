/**
 * Choice Types for Empathetic AI Dialog
 *
 * @module ai/types/choice
 * @description Type definitions for choice navigation flow and empathetic dialog enhancement
 */

import { SlotSuggestion } from '../types';

/**
 * Type of choice presented to customer
 */
export type ChoiceType = 'same_day_diff_time' | 'diff_day_same_time' | 'popular_times';

/**
 * Supported languages for the system
 */
export type Language = 'ru' | 'en' | 'es' | 'pt' | 'he';

/**
 * Choice option presented to customer
 */
export interface ChoiceOption {
  /** Unique identifier for the choice */
  id: ChoiceType;

  /** Localized label text */
  label: string;

  /** Emoji for visual enhancement */
  emoji: string;

  /** WhatsApp button type */
  buttonType: 'reply' | 'list_item';
}

/**
 * Booking context stored in Redis
 * Maintains conversation state across interactions
 */
export interface BookingContext {
  /** Unique session identifier */
  sessionId: string;

  /** Customer phone number */
  customerId: string;

  /** Salon identifier */
  salonId: string;

  /** Detected or selected language */
  language: Language;

  /** Original booking intent from first message */
  originalIntent: {
    /** Service name from customer message */
    serviceName?: string;

    /** Matched service ID */
    serviceId?: string;

    /** Requested date (ISO format) */
    date?: string;

    /** Requested time (HH:mm format) */
    time?: string;

    /** Preferred master ID */
    masterId?: string;

    /** Master name */
    masterName?: string;
  };

  /** Choice navigation history */
  choices: Array<{
    /** Selected choice ID */
    choiceId: ChoiceType;

    /** Timestamp of selection */
    selectedAt: Date;
  }>;

  /** Session creation timestamp */
  createdAt: Date;

  /** Last interaction timestamp */
  lastInteractionAt: Date;
}

/**
 * Ranked slot with visual indicators and scoring
 */
export interface RankedSlot extends SlotSuggestion {
  /** Proximity score (higher is better) */
  score: number;

  /** Rank position (1-based) */
  rank: number;

  /** Visual indicators for display */
  indicators: {
    /** Show star indicator for top matches */
    showStar: boolean;

    /** Proximity description text */
    proximityText?: string;

    /** Localized proximity text for all languages */
    proximityTextLocalized?: Record<Language, string>;
  };

  /** Display text with indicators */
  displayText?: string;
}

/**
 * Popular time slot based on historical data
 */
export interface PopularTimeSlot {
  /** Day of week (0 = Sunday, 6 = Saturday) */
  dayOfWeek: number;

  /** Hour of day (0-23) */
  hour: number;

  /** Weighted count based on recency */
  weightedCount: number;

  /** Raw booking count */
  rawCount?: number;

  /** Display text for UI */
  displayText: string;

  /** Localized display text */
  displayTextLocalized?: Record<Language, string>;

  /** Whether this slot is currently available */
  isAvailable?: boolean;
}

/**
 * Message template key types
 */
export type MessageKey =
  | 'SLOT_TAKEN'
  | 'SLOT_AVAILABLE'
  | 'SAME_DAY_OPTIONS'
  | 'DIFF_DAY_OPTIONS'
  | 'ALL_DAY_BUSY'
  | 'NO_ALTERNATIVES'
  | 'SESSION_EXPIRED'
  | 'ERROR'
  | 'POPULAR_TIMES';

/**
 * Choice label key types
 */
export type ChoiceLabelKey =
  | 'SAME_DAY_DIFF_TIME'
  | 'DIFF_DAY_SAME_TIME'
  | 'POPULAR_TIMES'
  | 'SEE_MORE'
  | 'CALL_SALON';

/**
 * Interactive message payload structure
 */
export interface InteractiveMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      button?: string;
      sections?: Array<{
        title?: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

/**
 * Service response format
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    durationMs: number;
    timestamp: Date;
  };
}