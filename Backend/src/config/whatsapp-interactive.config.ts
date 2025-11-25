/**
 * WhatsApp Interactive Messages Configuration
 *
 * Type-safe configuration for WhatsApp Quick Booking feature flags and settings.
 * Uses environment variables with proper validation and type safety.
 *
 * @module config/whatsapp-interactive
 */

import { registerAs } from '@nestjs/config';

/**
 * Type definition for WhatsApp Interactive Messages configuration
 */
export interface WhatsAppInteractiveConfig {
  /**
   * Enable/disable WhatsApp interactive message features (buttons, lists, quick booking)
   * @default true
   */
  enabled: boolean;

  /**
   * Maximum number of days to search for available booking slots
   * Valid range: 1-90 days
   * @default 30
   */
  maxSlotSearchDays: number;

  /**
   * Enable/disable waitlist functionality when no slots are available
   * @default true
   */
  waitlistEnabled: boolean;
}

/**
 * Validates and parses a boolean environment variable
 * @param value - The environment variable value
 * @param defaultValue - The default value if parsing fails
 * @returns Parsed boolean value
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Validates and parses an integer environment variable with range checking
 * @param value - The environment variable value
 * @param defaultValue - The default value if parsing fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Parsed integer value
 * @throws Error if value is outside allowed range
 */
function parseInteger(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.warn(
      `Invalid integer value for environment variable: "${value}". Using default: ${defaultValue}`,
    );
    return defaultValue;
  }

  if (parsed < min || parsed > max) {
    throw new Error(
      `Value ${parsed} is outside allowed range [${min}, ${max}]. Using default: ${defaultValue}`,
    );
  }

  return parsed;
}

/**
 * WhatsApp Interactive Messages configuration factory
 *
 * Usage in services:
 * ```typescript
 * constructor(private configService: ConfigService) {}
 *
 * const isEnabled = this.configService.get<boolean>('whatsapp.interactive.enabled');
 * const maxDays = this.configService.get<number>('whatsapp.interactive.maxSlotSearchDays');
 * const waitlistEnabled = this.configService.get<boolean>('whatsapp.interactive.waitlistEnabled');
 * ```
 */
export default registerAs(
  'whatsapp.interactive',
  (): WhatsAppInteractiveConfig => ({
    enabled: parseBoolean(process.env.WHATSAPP_INTERACTIVE_ENABLED, true),
    maxSlotSearchDays: parseInteger(
      process.env.MAX_SLOT_SEARCH_DAYS,
      30, // default
      1,  // min: at least 1 day
      90, // max: no more than 3 months
    ),
    waitlistEnabled: parseBoolean(process.env.WAITLIST_ENABLED, true),
  }),
);
