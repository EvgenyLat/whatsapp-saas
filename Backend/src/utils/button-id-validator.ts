/**
 * Button ID Validation Utilities
 *
 * Validates and parses WhatsApp interactive button IDs according to the
 * standardized schema defined in research.md.
 *
 * Button ID Schema:
 * - Format: `{type}_{context}`
 * - Type: "slot" | "confirm" | "waitlist" | "action" | "nav"
 * - Context: Underscore-delimited parameters
 * - Max length: 256 characters for buttons, 200 for list items
 * - Pattern: `^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$`
 *
 * @module utils/button-id-validator
 */

import { ButtonIdType, ParsedButtonId } from '../types/whatsapp.types';

/**
 * Regular expression for validating button IDs
 *
 * Pattern breakdown:
 * - `^` - Start of string
 * - `(slot|confirm|waitlist|action|nav)` - Valid type prefix
 * - `_` - Underscore separator
 * - `[a-zA-Z0-9_:-]+` - Context (alphanumeric, underscore, colon, hyphen)
 * - `$` - End of string
 */
export const BUTTON_ID_REGEX = /^(slot|confirm|waitlist|action|nav)_[a-zA-Z0-9_:-]+$/;

/**
 * Maximum button ID length for Reply Buttons
 */
export const MAX_BUTTON_ID_LENGTH = 256;

/**
 * Maximum row ID length for List Message rows
 */
export const MAX_LIST_ROW_ID_LENGTH = 200;

/**
 * Valid button ID type prefixes
 */
export const VALID_BUTTON_TYPES: readonly ButtonIdType[] = ['slot', 'confirm', 'waitlist', 'action', 'nav'] as const;

/**
 * Validates a button ID against the standardized schema
 *
 * @param id - The button ID to validate
 * @param maxLength - Maximum allowed length (default: 256 for buttons)
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * validateButtonId("slot_2024-10-25_15:00_m123"); // true
 * validateButtonId("confirm_booking_b456"); // true
 * validateButtonId("invalid-format"); // false
 * validateButtonId("slot_"); // false (no context)
 * validateButtonId("unknown_type_context"); // false (invalid type)
 * ```
 */
export function validateButtonId(id: string, maxLength: number = MAX_BUTTON_ID_LENGTH): boolean {
  // Check length constraint
  if (id.length === 0 || id.length > maxLength) {
    return false;
  }

  // Check format against regex
  return BUTTON_ID_REGEX.test(id);
}

/**
 * Parses a button ID into type and context components
 *
 * @param id - The button ID to parse
 * @returns Parsed button ID with type and context, or null if invalid
 *
 * @throws Never throws - returns null for invalid IDs
 *
 * @example
 * ```typescript
 * parseButtonId("slot_2024-10-25_15:00_m123");
 * // Returns: { type: "slot", context: "2024-10-25_15:00_m123" }
 *
 * parseButtonId("confirm_booking_b456");
 * // Returns: { type: "confirm", context: "booking_b456" }
 *
 * parseButtonId("invalid-format");
 * // Returns: null
 * ```
 */
export function parseButtonId(id: string): ParsedButtonId | null {
  if (!validateButtonId(id)) {
    return null;
  }

  // Split at first underscore
  const firstUnderscoreIndex = id.indexOf('_');
  const type = id.substring(0, firstUnderscoreIndex) as ButtonIdType;
  const context = id.substring(firstUnderscoreIndex + 1);

  return { type, context };
}

/**
 * Validates and parses a button ID in one step
 *
 * This is a convenience function that combines validation and parsing.
 * Use this when you need to validate and extract data in a single operation.
 *
 * @param id - The button ID to validate and parse
 * @param maxLength - Maximum allowed length (default: 256)
 * @returns Parsed button ID or null if validation fails
 *
 * @example
 * ```typescript
 * const parsed = validateAndParseButtonId("slot_2024-10-25_15:00_m123");
 * if (parsed) {
 *   console.log(`Type: ${parsed.type}, Context: ${parsed.context}`);
 *   // Type: slot, Context: 2024-10-25_15:00_m123
 * }
 * ```
 */
export function validateAndParseButtonId(
  id: string,
  maxLength: number = MAX_BUTTON_ID_LENGTH
): ParsedButtonId | null {
  if (!validateButtonId(id, maxLength)) {
    return null;
  }

  return parseButtonId(id);
}

/**
 * Checks if a button ID is of a specific type
 *
 * @param id - The button ID to check
 * @param type - The expected button type
 * @returns True if button ID is valid and matches the specified type
 *
 * @example
 * ```typescript
 * isButtonIdOfType("slot_2024-10-25_15:00_m123", "slot"); // true
 * isButtonIdOfType("slot_2024-10-25_15:00_m123", "confirm"); // false
 * isButtonIdOfType("invalid-id", "slot"); // false
 * ```
 */
export function isButtonIdOfType(id: string, type: ButtonIdType): boolean {
  const parsed = parseButtonId(id);
  return parsed !== null && parsed.type === type;
}

/**
 * Builds a button ID from type and context
 *
 * This is the inverse of parseButtonId - use it to construct valid button IDs.
 *
 * @param type - Button type prefix
 * @param context - Context string (parameters)
 * @returns Constructed button ID
 *
 * @throws Error if the constructed ID would be invalid
 *
 * @example
 * ```typescript
 * buildButtonId("slot", "2024-10-25_15:00_m123");
 * // Returns: "slot_2024-10-25_15:00_m123"
 *
 * buildButtonId("confirm", "booking_b456");
 * // Returns: "confirm_booking_b456"
 *
 * buildButtonId("action", ""); // Throws Error: Invalid context
 * ```
 */
export function buildButtonId(type: ButtonIdType, context: string): string {
  if (!context || context.length === 0) {
    throw new Error('Button ID context cannot be empty');
  }

  // Validate context contains only allowed characters
  const contextRegex = /^[a-zA-Z0-9_:-]+$/;
  if (!contextRegex.test(context)) {
    throw new Error(
      `Invalid context format: "${context}". Must contain only alphanumeric characters, underscores, colons, and hyphens.`
    );
  }

  const buttonId = `${type}_${context}`;

  // Validate the constructed ID
  if (!validateButtonId(buttonId)) {
    throw new Error(`Constructed button ID "${buttonId}" is invalid`);
  }

  return buttonId;
}

/**
 * Sanitizes a context string to ensure it only contains valid characters
 *
 * Removes or replaces invalid characters to create a valid context string.
 *
 * @param context - The raw context string
 * @returns Sanitized context string (safe for use in button IDs)
 *
 * @example
 * ```typescript
 * sanitizeContext("2024-10-25 15:00 m123");
 * // Returns: "2024-10-25_15:00_m123" (space replaced with underscore)
 *
 * sanitizeContext("hello@world#123");
 * // Returns: "helloworld123" (invalid chars removed)
 * ```
 */
export function sanitizeContext(context: string): string {
  return context
    .replace(/\s+/g, '_') // Replace whitespace with underscores
    .replace(/[^a-zA-Z0-9_:-]/g, '') // Remove invalid characters
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
}

/**
 * Extracts the button type from a button ID without full parsing
 *
 * This is faster than parseButtonId when you only need the type.
 *
 * @param id - The button ID
 * @returns The button type, or null if invalid
 *
 * @example
 * ```typescript
 * getButtonType("slot_2024-10-25_15:00_m123"); // "slot"
 * getButtonType("confirm_booking_b456"); // "confirm"
 * getButtonType("invalid"); // null
 * ```
 */
export function getButtonType(id: string): ButtonIdType | null {
  const parsed = parseButtonId(id);
  return parsed ? parsed.type : null;
}

/**
 * Checks if a string is a valid button ID type
 *
 * @param type - The string to check
 * @returns True if the string is a valid ButtonIdType
 *
 * @example
 * ```typescript
 * isValidButtonType("slot"); // true
 * isValidButtonType("confirm"); // true
 * isValidButtonType("unknown"); // false
 * ```
 */
export function isValidButtonType(type: string): type is ButtonIdType {
  return VALID_BUTTON_TYPES.includes(type as ButtonIdType);
}

/**
 * Truncates a button ID to fit within length constraints
 *
 * If the ID exceeds maxLength, truncates the context portion while
 * preserving the type prefix.
 *
 * @param id - The button ID to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated button ID, or null if invalid
 *
 * @example
 * ```typescript
 * const longId = "slot_" + "x".repeat(250);
 * truncateButtonId(longId, 256); // Returns: "slot_xxx..." (256 chars)
 * truncateButtonId(longId, 20); // Returns: "slot_xxxxxxxxxxxxxxx" (20 chars)
 * ```
 */
export function truncateButtonId(id: string, maxLength: number = MAX_BUTTON_ID_LENGTH): string | null {
  const parsed = parseButtonId(id);
  if (!parsed) {
    return null;
  }

  if (id.length <= maxLength) {
    return id;
  }

  // Calculate available space for context
  const typeLength = parsed.type.length + 1; // +1 for underscore
  const maxContextLength = maxLength - typeLength;

  if (maxContextLength < 1) {
    throw new Error(`maxLength ${maxLength} is too short for button type "${parsed.type}"`);
  }

  // Truncate context
  const truncatedContext = parsed.context.substring(0, maxContextLength);
  return `${parsed.type}_${truncatedContext}`;
}
