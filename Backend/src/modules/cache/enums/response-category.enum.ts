/**
 * Response Category Enum
 *
 * Defines categories for AI responses to determine TTL and handling rules.
 * Each category has specific caching duration based on content volatility.
 */
export enum ResponseCategory {
  /** Greetings and welcome messages - No expiration (static content) */
  GREETING = 'greeting',

  /** Pricing information - 7 days TTL (changes occasionally) */
  PRICING = 'pricing',

  /** Availability queries - 1 hour TTL (dynamic, changes frequently) */
  AVAILABILITY = 'availability',

  /** Service descriptions - 30 days TTL (semi-static) */
  SERVICES = 'services',

  /** Business hours - 7 days TTL (changes seasonally) */
  HOURS = 'hours',

  /** Location information - 30 days TTL (rarely changes) */
  LOCATION = 'location',

  /** Booking-related queries - 1 hour TTL (dynamic) */
  BOOKING = 'booking',

  /** General queries - 24 hours TTL (default category) */
  GENERAL = 'general',
}
