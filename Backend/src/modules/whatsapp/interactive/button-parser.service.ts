/**
 * Button Parser Service
 *
 * NestJS service for parsing WhatsApp interactive button IDs into structured data.
 * Handles parsing for all button types: slot, confirm, waitlist, action, and navigation.
 *
 * @module modules/whatsapp/interactive
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ParsedSlotButton,
  ParsedActionButton,
  ParsedNavigationButton,
  ParsedConfirmButton,
  ParsedWaitlistButton,
  ButtonIdType,
} from '../../../types/whatsapp.types';
import { parseButtonId } from '../../../utils/button-id-validator';

/**
 * Service for parsing WhatsApp button IDs into structured data
 *
 * This service handles the parsing logic for all button types used in the
 * WhatsApp Quick Booking feature. Each parser method validates the button ID
 * format and extracts relevant data.
 *
 * @example
 * ```typescript
 * // In a controller or service
 * constructor(private readonly buttonParser: ButtonParserService) {}
 *
 * // Parse a slot button
 * const slotData = this.buttonParser.parseSlotButton("slot_2024-10-25_15:00_m123");
 * // Returns: { date: "2024-10-25", time: "15:00", masterId: "m123" }
 * ```
 */
@Injectable()
export class ButtonParserService {
  /**
   * Parses a slot button ID into date, time, and master ID
   *
   * Format: `slot_{date}_{time}_{masterId}`
   * - date: ISO date format (YYYY-MM-DD)
   * - time: 24-hour time format (HH:MM)
   * - masterId: Master identifier (e.g., "m123")
   *
   * @param id - The button ID to parse
   * @returns Parsed slot button data
   * @throws BadRequestException if the ID is invalid or not a slot button
   *
   * @example
   * ```typescript
   * parseSlotButton("slot_2024-10-25_15:00_m123");
   * // Returns: { date: "2024-10-25", time: "15:00", masterId: "m123" }
   *
   * parseSlotButton("slot_2024-12-31_09:30_m456");
   * // Returns: { date: "2024-12-31", time: "09:30", masterId: "m456" }
   *
   * parseSlotButton("confirm_booking_b456");
   * // Throws: BadRequestException (wrong button type)
   * ```
   */
  parseSlotButton(id: string): ParsedSlotButton {
    const parsed = parseButtonId(id);

    if (!parsed || parsed.type !== 'slot') {
      throw new BadRequestException(
        `Invalid slot button ID: "${id}". Expected format: slot_YYYY-MM-DD_HH:MM_mXXX`,
      );
    }

    // Parse context: "2024-10-25_15:00_m123"
    const parts = parsed.context.split('_');

    if (parts.length !== 3) {
      throw new BadRequestException(
        `Invalid slot button context: "${parsed.context}". Expected format: YYYY-MM-DD_HH:MM_mXXX`,
      );
    }

    const [date, time, masterId] = parts;

    // Validate date format (YYYY-MM-DD)
    if (!this.isValidDateFormat(date)) {
      throw new BadRequestException(
        `Invalid date format in slot button: "${date}". Expected YYYY-MM-DD`,
      );
    }

    // Validate time format (HH:MM)
    if (!this.isValidTimeFormat(time)) {
      throw new BadRequestException(
        `Invalid time format in slot button: "${time}". Expected HH:MM`,
      );
    }

    // Validate master ID (starts with 'm' or is numeric)
    if (!this.isValidMasterId(masterId)) {
      throw new BadRequestException(
        `Invalid master ID in slot button: "${masterId}". Expected format: mXXX or numeric ID`,
      );
    }

    return { date, time, masterId };
  }

  /**
   * Parses an action button ID into action name
   *
   * Format: `action_{actionName}`
   * - actionName: Action identifier (e.g., "cancel", "call_salon", "join_waitlist")
   *
   * @param id - The button ID to parse
   * @returns Parsed action button data
   * @throws BadRequestException if the ID is invalid or not an action button
   *
   * @example
   * ```typescript
   * parseActionButton("action_cancel");
   * // Returns: { action: "cancel" }
   *
   * parseActionButton("action_call_salon");
   * // Returns: { action: "call_salon" }
   *
   * parseActionButton("action_join_waitlist");
   * // Returns: { action: "join_waitlist" }
   * ```
   */
  parseActionButton(id: string): ParsedActionButton {
    const parsed = parseButtonId(id);

    if (!parsed || parsed.type !== 'action') {
      throw new BadRequestException(
        `Invalid action button ID: "${id}". Expected format: action_<action_name>`,
      );
    }

    // Context is the action name
    const action = parsed.context;

    if (!action || action.length === 0) {
      throw new BadRequestException(`Invalid action button: action name cannot be empty`);
    }

    return { action };
  }

  /**
   * Parses a navigation button ID into direction and optional page number
   *
   * Format: `nav_{direction}` or `nav_{direction}_{page}`
   * - direction: Navigation direction (e.g., "next", "prev", "back")
   * - page: Optional page number
   *
   * @param id - The button ID to parse
   * @returns Parsed navigation button data
   * @throws BadRequestException if the ID is invalid or not a navigation button
   *
   * @example
   * ```typescript
   * parseNavigationButton("nav_next");
   * // Returns: { direction: "next", page: undefined }
   *
   * parseNavigationButton("nav_prev");
   * // Returns: { direction: "prev", page: undefined }
   *
   * parseNavigationButton("nav_page_2");
   * // Returns: { direction: "page", page: "2" }
   *
   * parseNavigationButton("nav_back");
   * // Returns: { direction: "back", page: undefined }
   * ```
   */
  parseNavigationButton(id: string): ParsedNavigationButton {
    const parsed = parseButtonId(id);

    if (!parsed || parsed.type !== 'nav') {
      throw new BadRequestException(
        `Invalid navigation button ID: "${id}". Expected format: nav_<direction> or nav_<direction>_<page>`,
      );
    }

    // Parse context: "next" or "page_2"
    const parts = parsed.context.split('_');
    const direction = parts[0];
    const page = parts.length > 1 ? parts.slice(1).join('_') : undefined;

    if (!direction || direction.length === 0) {
      throw new BadRequestException(`Invalid navigation button: direction cannot be empty`);
    }

    return { direction, page };
  }

  /**
   * Parses a confirm button ID into action and entity ID
   *
   * Format: `confirm_{action}_{entityId}`
   * - action: Confirmation action (e.g., "booking", "cancel", "waitlist")
   * - entityId: Entity being confirmed (e.g., "b456", "w789")
   *
   * @param id - The button ID to parse
   * @returns Parsed confirm button data
   * @throws BadRequestException if the ID is invalid or not a confirm button
   *
   * @example
   * ```typescript
   * parseConfirmButton("confirm_booking_b456");
   * // Returns: { action: "booking", entityId: "b456" }
   *
   * parseConfirmButton("confirm_cancel_b789");
   * // Returns: { action: "cancel", entityId: "b789" }
   *
   * parseConfirmButton("confirm_waitlist_w123");
   * // Returns: { action: "waitlist", entityId: "w123" }
   * ```
   */
  parseConfirmButton(id: string): ParsedConfirmButton {
    const parsed = parseButtonId(id);

    if (!parsed || parsed.type !== 'confirm') {
      throw new BadRequestException(
        `Invalid confirm button ID: "${id}". Expected format: confirm_<action>_<entity_id>`,
      );
    }

    // Parse context: "booking_b456"
    const underscoreIndex = parsed.context.indexOf('_');

    if (underscoreIndex === -1) {
      throw new BadRequestException(
        `Invalid confirm button context: "${parsed.context}". Expected format: <action>_<entity_id>`,
      );
    }

    const action = parsed.context.substring(0, underscoreIndex);
    const entityId = parsed.context.substring(underscoreIndex + 1);

    if (!action || action.length === 0) {
      throw new BadRequestException(`Invalid confirm button: action cannot be empty`);
    }

    if (!entityId || entityId.length === 0) {
      throw new BadRequestException(`Invalid confirm button: entity ID cannot be empty`);
    }

    return { action, entityId };
  }

  /**
   * Parses a waitlist button ID into action and waitlist ID
   *
   * Format: `waitlist_{action}_{waitlistId}` or `waitlist_{action}`
   * - action: Waitlist action (e.g., "join", "leave", "accept")
   * - waitlistId: Optional waitlist entry ID
   *
   * @param id - The button ID to parse
   * @returns Parsed waitlist button data
   * @throws BadRequestException if the ID is invalid or not a waitlist button
   *
   * @example
   * ```typescript
   * parseWaitlistButton("waitlist_join_w789");
   * // Returns: { action: "join", waitlistId: "w789" }
   *
   * parseWaitlistButton("waitlist_leave_w456");
   * // Returns: { action: "leave", waitlistId: "w456" }
   *
   * parseWaitlistButton("waitlist_accept_w123");
   * // Returns: { action: "accept", waitlistId: "w123" }
   * ```
   */
  parseWaitlistButton(id: string): ParsedWaitlistButton {
    const parsed = parseButtonId(id);

    if (!parsed || parsed.type !== 'waitlist') {
      throw new BadRequestException(
        `Invalid waitlist button ID: "${id}". Expected format: waitlist_<action>_<waitlist_id>`,
      );
    }

    // Parse context: "join_w789" or "join"
    const underscoreIndex = parsed.context.indexOf('_');

    if (underscoreIndex === -1) {
      // No waitlist ID (e.g., "waitlist_join" for generic join action)
      const action = parsed.context;

      if (!action || action.length === 0) {
        throw new BadRequestException(`Invalid waitlist button: action cannot be empty`);
      }

      return { action, waitlistId: '' };
    }

    const action = parsed.context.substring(0, underscoreIndex);
    const waitlistId = parsed.context.substring(underscoreIndex + 1);

    if (!action || action.length === 0) {
      throw new BadRequestException(`Invalid waitlist button: action cannot be empty`);
    }

    if (!waitlistId || waitlistId.length === 0) {
      throw new BadRequestException(`Invalid waitlist button: waitlist ID cannot be empty`);
    }

    return { action, waitlistId };
  }

  /**
   * Generic parser that routes to the appropriate type-specific parser
   *
   * Use this when you don't know the button type in advance.
   *
   * @param id - The button ID to parse
   * @returns Parsed button data (type depends on button type)
   * @throws BadRequestException if the ID is invalid
   *
   * @example
   * ```typescript
   * parse("slot_2024-10-25_15:00_m123");
   * // Returns: { type: "slot", data: { date: "2024-10-25", time: "15:00", masterId: "m123" } }
   *
   * parse("action_cancel");
   * // Returns: { type: "action", data: { action: "cancel" } }
   * ```
   */
  parse(id: string): {
    type: ButtonIdType;
    data:
      | ParsedSlotButton
      | ParsedActionButton
      | ParsedNavigationButton
      | ParsedConfirmButton
      | ParsedWaitlistButton;
  } {
    const parsed = parseButtonId(id);

    if (!parsed) {
      throw new BadRequestException(`Invalid button ID format: "${id}"`);
    }

    switch (parsed.type) {
      case 'slot':
        return { type: 'slot', data: this.parseSlotButton(id) };
      case 'action':
        return { type: 'action', data: this.parseActionButton(id) };
      case 'nav':
        return { type: 'nav', data: this.parseNavigationButton(id) };
      case 'confirm':
        return { type: 'confirm', data: this.parseConfirmButton(id) };
      case 'waitlist':
        return { type: 'waitlist', data: this.parseWaitlistButton(id) };
      default:
        throw new BadRequestException(`Unknown button type: "${parsed.type}"`);
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION HELPERS
  // ============================================================================

  /**
   * Validates date format (YYYY-MM-DD)
   */
  private isValidDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    // Additional validation: check if it's a valid date
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    return (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    );
  }

  /**
   * Validates time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return false;
    }

    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  /**
   * Validates master ID format
   */
  private isValidMasterId(masterId: string): boolean {
    // Accept "mXXX" format or pure numeric IDs
    return /^m\d+$/.test(masterId) || /^\d+$/.test(masterId);
  }
}
