/**
 * AI Intent Classification Types
 * Defines types and interfaces for intent detection and classification
 */

/**
 * Supported intent types for the booking platform
 */
export enum IntentType {
  /** User wants to make a booking/appointment */
  BOOKING_REQUEST = 'BOOKING_REQUEST',

  /** User wants to cancel an existing booking */
  BOOKING_CANCEL = 'BOOKING_CANCEL',

  /** User wants to modify/reschedule a booking */
  BOOKING_MODIFY = 'BOOKING_MODIFY',

  /** User asking for available times/slots */
  AVAILABILITY_INQUIRY = 'AVAILABILITY_INQUIRY',

  /** User asking about services offered */
  SERVICE_INQUIRY = 'SERVICE_INQUIRY',

  /** User asking about pricing */
  PRICE_INQUIRY = 'PRICE_INQUIRY',

  /** User asking about location/address */
  LOCATION_INQUIRY = 'LOCATION_INQUIRY',

  /** User asking general questions */
  GENERAL_QUESTION = 'GENERAL_QUESTION',

  /** User sending a greeting */
  GREETING = 'GREETING',

  /** User expressing thanks */
  THANKS = 'THANKS',

  /** User confirming something */
  CONFIRMATION = 'CONFIRMATION',

  /** User negating/declining something */
  NEGATION = 'NEGATION',

  /** User requesting help */
  HELP_REQUEST = 'HELP_REQUEST',

  /** User providing feedback/complaint */
  FEEDBACK = 'FEEDBACK',

  /** Intent cannot be determined */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Confidence level thresholds for intent classification
 */
export enum ConfidenceLevel {
  /** Very high confidence (>= 0.8) */
  VERY_HIGH = 'VERY_HIGH',

  /** High confidence (>= 0.6) */
  HIGH = 'HIGH',

  /** Medium confidence (>= 0.4) */
  MEDIUM = 'MEDIUM',

  /** Low confidence (>= 0.2) */
  LOW = 'LOW',

  /** Very low confidence (< 0.2) */
  VERY_LOW = 'VERY_LOW',
}

/**
 * Extracted entities from the user's message
 */
export interface ExtractedEntities {
  /** Detected date references (e.g., "tomorrow", "next Monday") */
  readonly dateReferences?: string[];

  /** Detected time references (e.g., "3pm", "morning") */
  readonly timeReferences?: string[];

  /** Detected service mentions */
  readonly serviceMentions?: string[];

  /** Detected numbers (could be phone, booking ID, etc.) */
  readonly numbers?: string[];

  /** Detected email addresses */
  readonly emails?: string[];
}

/**
 * Result of intent classification with confidence scoring
 */
export interface IntentClassificationResult {
  /** The primary detected intent */
  readonly intent: IntentType;

  /** Confidence score from 0.0 to 1.0 */
  readonly confidence: number;

  /** Confidence level category */
  readonly confidenceLevel: ConfidenceLevel;

  /** Alternative intents with their scores (sorted by score descending) */
  readonly alternativeIntents: ReadonlyArray<{
    readonly intent: IntentType;
    readonly confidence: number;
  }>;

  /** Entities extracted from the message */
  readonly entities: ExtractedEntities;

  /** Language of the analyzed text */
  readonly language: string;

  /** Original text that was classified */
  readonly originalText: string;

  /** Normalized/cleaned text used for classification */
  readonly normalizedText: string;

  /** Whether the classification should be considered reliable */
  readonly isReliable: boolean;
}

/**
 * Pattern matching rule for intent detection
 */
export interface IntentPattern {
  /** Keywords that indicate this intent */
  readonly keywords: ReadonlyArray<string>;

  /** Regex patterns for more complex matching */
  readonly patterns?: ReadonlyArray<RegExp>;

  /** Weight/score contribution (0.0 to 1.0) */
  readonly weight: number;

  /** Whether this is a strong indicator (requires fewer matches) */
  readonly isStrong?: boolean;
}

/**
 * Language-specific intent patterns
 */
export type LanguageIntentPatterns = {
  readonly [key in IntentType]?: IntentPattern;
};

/**
 * Multi-language intent pattern configuration
 */
export type MultiLanguageIntentPatterns = {
  readonly [language: string]: LanguageIntentPatterns;
};
