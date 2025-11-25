import { Injectable, Logger } from '@nestjs/common';

/**
 * Button Parser Service
 *
 * Parses interactive button IDs and extracts action data
 *
 * Button ID Format:
 * - slot_[slotId] - Slot selection
 * - confirm_[bookingId] - Booking confirmation
 * - waitlist_[action]_[id] - Waitlist actions
 * - action_[type]_[data] - Generic actions
 * - nav_[direction] - Navigation
 *
 * @see specs/001-whatsapp-quick-booking Phase 3: Interactive Cards
 */
@Injectable()
export class ButtonParserService {
  private readonly logger = new Logger(ButtonParserService.name);

  /**
   * Parse button ID and extract action data
   *
   * @param buttonId - Button ID from webhook
   * @returns Parsed button action
   */
  parseButtonId(buttonId: string): ParsedButton {
    this.logger.debug(`Parsing button ID: ${buttonId}`);

    const parts = buttonId.split('_');
    const type = parts[0];

    switch (type) {
      case 'slot':
        return {
          type: 'slot_selection',
          slotId: parts[1],
          data: { slotId: parts[1] },
        };

      case 'confirm':
        return {
          type: 'booking_confirmation',
          bookingId: parts[1],
          data: { bookingId: parts[1] },
        };

      case 'choice':
        return {
          type: 'choice_selection',
          choiceId: parts[1],
          data: { choiceId: parts[1] },
        };

      case 'waitlist':
        return {
          type: 'waitlist_action',
          action: parts[1] as 'book' | 'pass' | 'join',
          data: {
            action: parts[1],
            waitlistId: parts[2],
          },
        };

      case 'action':
        return {
          type: 'generic_action',
          action: parts[1],
          data: {
            action: parts[1],
            payload: parts.slice(2).join('_'),
          },
        };

      case 'nav':
        return {
          type: 'navigation',
          direction: parts[1] as 'next' | 'prev' | 'back',
          data: { direction: parts[1] },
        };

      default:
        this.logger.warn(`Unknown button type: ${type}`);
        return {
          type: 'unknown',
          data: { raw: buttonId },
        };
    }
  }

  /**
   * Build button ID from components
   *
   * @param type - Button type
   * @param data - Button data
   * @returns Button ID string
   */
  buildButtonId(type: string, data: Record<string, string>): string {
    const parts = [type];

    // Add data values in consistent order
    Object.values(data).forEach((value) => {
      if (value) parts.push(value);
    });

    return parts.join('_');
  }
}

/**
 * Parsed button result
 */
export interface ParsedButton {
  /** Button type */
  type:
    | 'slot_selection'
    | 'booking_confirmation'
    | 'choice_selection'
    | 'waitlist_action'
    | 'generic_action'
    | 'navigation'
    | 'unknown';

  /** Slot ID (for slot_selection) */
  slotId?: string;

  /** Booking ID (for booking_confirmation) */
  bookingId?: string;

  /** Choice ID (for choice_selection) */
  choiceId?: string;

  /** Action (for waitlist_action, generic_action, navigation) */
  action?: string;

  /** Navigation direction */
  direction?: 'next' | 'prev' | 'back';

  /** Additional data */
  data: Record<string, any>;
}
