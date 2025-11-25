/**
 * WhatsApp Interactive Message Builder Service
 *
 * Builds WhatsApp interactive messages (Reply Buttons and List Messages)
 * for the Quick Booking feature. Automatically selects the appropriate
 * message format based on the number of available slots.
 *
 * Features:
 * - Reply Buttons (1-3 slots)
 * - List Messages (4-10 slots)
 * - Booking confirmation cards
 * - Multi-language support (EN, RU, ES, PT, HE)
 * - Date/time formatting per language
 * - WhatsApp API constraint validation
 *
 * References:
 * - specs/001-whatsapp-quick-booking/contracts/whatsapp/reply-buttons-message.json
 * - specs/001-whatsapp-quick-booking/contracts/whatsapp/list-message.json
 *
 * @module modules/whatsapp/interactive
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  InteractiveMessagePayload,
  InteractiveButtons,
  InteractiveList,
  ReplyButton,
  ListSection,
  ListRow,
} from '../../../types/whatsapp.types';
import {
  SupportedLanguage,
  getTranslations,
  interpolate,
  formatDate as formatDateTranslation,
  formatTime as formatTimeTranslation,
  getDayName,
  getMonthName,
} from './translations';

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Available time slot for booking
 */
export interface TimeSlot {
  /** Slot date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Slot time in 24-hour format (HH:MM) */
  time: string;
  /** Master ID */
  masterId: string;
  /** Master name */
  masterName: string;
  /** Whether this is a preferred time slot (marked with star) */
  isPreferred?: boolean;
  /** Service duration in minutes (optional, for display) */
  duration?: number;
  /** Service price (optional, for display) */
  price?: string;
}

/**
 * Booking details for confirmation card
 */
export interface BookingDetails {
  /** Booking ID */
  bookingId: string;
  /** Service name */
  serviceName: string;
  /** Booking date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Booking time in 24-hour format (HH:MM) */
  time: string;
  /** Master name */
  masterName: string;
  /** Master ID */
  masterId: string;
  /** Service duration in minutes */
  duration: number;
  /** Service price */
  price: string;
}

/**
 * Parameters for slot selection card
 */
export interface SlotSelectionParams {
  /** Available time slots (1-10 slots) */
  slots: TimeSlot[];
  /** Customer language preference */
  language: SupportedLanguage;
  /** Customer phone number in E.164 format */
  customerPhone: string;
  /** Optional: Service name for context */
  serviceName?: string;
  /** Optional: Target day description (e.g., "Friday") */
  targetDay?: string;
}

/**
 * Parameters for reply buttons card
 */
export interface ReplyButtonsParams {
  /** Time slots (max 3) */
  slots: TimeSlot[];
  /** Customer language preference */
  language: SupportedLanguage;
  /** Customer phone number in E.164 format */
  customerPhone: string;
  /** Optional: Service name for context */
  serviceName?: string;
  /** Optional: Service duration in minutes */
  duration?: number;
  /** Optional: Service price */
  price?: string;
}

/**
 * Parameters for list message card
 */
export interface ListMessageParams {
  /** Time slots (4-10) */
  slots: TimeSlot[];
  /** Customer language preference */
  language: SupportedLanguage;
  /** Customer phone number in E.164 format */
  customerPhone: string;
  /** Optional: Service name for context */
  serviceName?: string;
  /** Optional: Service duration in minutes */
  duration?: number;
  /** Optional: Service price */
  price?: string;
}

/**
 * Parameters for confirmation card
 */
export interface ConfirmationParams {
  /** Booking details */
  booking: BookingDetails;
  /** Customer language preference */
  language: SupportedLanguage;
  /** Customer phone number in E.164 format */
  customerPhone: string;
}

// ============================================================================
// GROUPED SLOTS
// ============================================================================

/**
 * Slots grouped by date
 */
interface GroupedSlots {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Human-readable date (e.g., "Friday, Oct 25") */
  formattedDate: string;
  /** Slots for this date */
  slots: TimeSlot[];
}

// ============================================================================
// WHATSAPP CONSTRAINTS
// ============================================================================

const WHATSAPP_CONSTRAINTS = {
  /** Button ID max length */
  BUTTON_ID_MAX_LENGTH: 256,
  /** Button title max length */
  BUTTON_TITLE_MAX_LENGTH: 20,
  /** Row ID max length */
  ROW_ID_MAX_LENGTH: 200,
  /** Row title max length */
  ROW_TITLE_MAX_LENGTH: 24,
  /** Row description max length */
  ROW_DESCRIPTION_MAX_LENGTH: 72,
  /** Section title max length */
  SECTION_TITLE_MAX_LENGTH: 24,
  /** Body text max length */
  BODY_TEXT_MAX_LENGTH: 1024,
  /** Header text max length */
  HEADER_TEXT_MAX_LENGTH: 60,
  /** Footer text max length */
  FOOTER_TEXT_MAX_LENGTH: 60,
  /** List button text max length */
  LIST_BUTTON_MAX_LENGTH: 20,
  /** Max reply buttons per message */
  MAX_REPLY_BUTTONS: 3,
  /** Max rows per list section */
  MAX_ROWS_PER_SECTION: 10,
  /** Min slots for list message */
  MIN_SLOTS_FOR_LIST: 4,
  /** Max slots for list message */
  MAX_SLOTS_FOR_LIST: 10,
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * WhatsApp Interactive Message Builder Service
 *
 * Creates interactive messages for WhatsApp Quick Booking:
 * - Reply Buttons (1-3 slots)
 * - List Messages (4-10 slots)
 * - Booking confirmations
 *
 * @example
 * ```typescript
 * const builder = new InteractiveCardBuilder();
 *
 * // Build slot selection (auto-selects Reply Buttons vs List Message)
 * const message = builder.buildSlotSelectionCard({
 *   slots: availableSlots,
 *   language: 'en',
 *   customerPhone: '+1234567890',
 *   serviceName: 'Women\'s Haircut',
 * });
 *
 * // Send via WhatsApp API
 * await whatsappService.sendMessage(message);
 * ```
 */
@Injectable()
export class InteractiveCardBuilder {
  private readonly logger = new Logger(InteractiveCardBuilder.name);

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Builds a slot selection card with automatic format selection
   *
   * Automatically chooses Reply Buttons (1-3 slots) or List Message (4-10 slots)
   * based on the number of available slots.
   *
   * @param params - Slot selection parameters
   * @returns Interactive message payload ready to send
   * @throws Error if slot count is invalid (0 or >10)
   *
   * @example
   * ```typescript
   * // 3 slots -> Reply Buttons
   * const message = builder.buildSlotSelectionCard({
   *   slots: [
   *     { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
   *     { date: '2024-10-25', time: '15:00', masterId: 'm123', masterName: 'Sarah', isPreferred: true },
   *     { date: '2024-10-25', time: '16:00', masterId: 'm123', masterName: 'Sarah' },
   *   ],
   *   language: 'en',
   *   customerPhone: '+1234567890',
   *   serviceName: 'Women\'s Haircut',
   * });
   *
   * // 5 slots -> List Message
   * const message = builder.buildSlotSelectionCard({
   *   slots: fiveSlots,
   *   language: 'en',
   *   customerPhone: '+1234567890',
   * });
   * ```
   */
  buildSlotSelectionCard(params: SlotSelectionParams): InteractiveMessagePayload {
    const { slots, language, customerPhone } = params;

    this.logger.log(
      `Building slot selection card: ${slots.length} slots, language=${language}, phone=${customerPhone}`,
    );

    // Validate slot count
    if (slots.length === 0) {
      throw new Error('Cannot build slot selection card: no slots provided');
    }

    if (slots.length > WHATSAPP_CONSTRAINTS.MAX_SLOTS_FOR_LIST) {
      throw new Error(
        `Too many slots: ${slots.length} (max ${WHATSAPP_CONSTRAINTS.MAX_SLOTS_FOR_LIST})`,
      );
    }

    // Choose format based on slot count
    if (slots.length <= WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS) {
      this.logger.log(`Using Reply Buttons format (${slots.length} slots)`);
      return this.buildReplyButtonsCard({
        slots,
        language,
        customerPhone,
        serviceName: params.serviceName,
      });
    } else {
      this.logger.log(`Using List Message format (${slots.length} slots)`);
      return this.buildListMessageCard({
        slots,
        language,
        customerPhone,
        serviceName: params.serviceName,
      });
    }
  }

  /**
   * Builds a Reply Buttons card (max 3 buttons)
   *
   * Creates a WhatsApp Reply Buttons message showing up to 3 time slots.
   * Each button shows the time and master name.
   *
   * @param params - Reply buttons parameters
   * @returns Interactive message payload with Reply Buttons
   * @throws Error if more than 3 slots provided
   *
   * @example
   * ```typescript
   * const message = builder.buildReplyButtonsCard({
   *   slots: [
   *     { date: '2024-10-25', time: '14:00', masterId: 'm123', masterName: 'Sarah' },
   *     { date: '2024-10-25', time: '15:00', masterId: 'm123', masterName: 'Sarah', isPreferred: true },
   *   ],
   *   language: 'en',
   *   customerPhone: '+1234567890',
   *   serviceName: 'Women\'s Haircut',
   *   duration: 60,
   *   price: '$50',
   * });
   * ```
   */
  buildReplyButtonsCard(params: ReplyButtonsParams): InteractiveMessagePayload {
    const { slots, language, customerPhone, serviceName, duration, price } = params;

    // Validate slot count
    if (slots.length > WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS) {
      throw new Error(
        `Too many slots for Reply Buttons: ${slots.length} (max ${WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS})`,
      );
    }

    const t = getTranslations(language);

    // Build body text
    let bodyText = '';

    // Add day context if all slots are on the same day
    const allSameDay = slots.every((slot) => slot.date === slots[0].date);
    if (allSameDay && slots.length > 0) {
      const date = new Date(slots[0].date + 'T00:00:00');
      const dayName = getDayName(date.getDay(), language);
      bodyText += interpolate(t.messages.availableTimes, { day: dayName }) + '\n\n';
    } else {
      bodyText += t.messages.nextAvailableTimes + '\n\n';
    }

    // Add service details if provided
    if (serviceName) {
      bodyText += `${serviceName}\n`;
      if (duration && price) {
        bodyText += `⏱️  ${duration} min\n💰 ${price}\n`;
      } else if (duration) {
        bodyText += `⏱️  ${duration} min\n`;
      } else if (price) {
        bodyText += `💰 ${price}\n`;
      }
    }

    // Validate body text length
    bodyText = this.truncateText(bodyText, WHATSAPP_CONSTRAINTS.BODY_TEXT_MAX_LENGTH);

    // Build buttons
    const buttons: ReplyButton[] = slots.map((slot) => {
      const buttonId = this.buildSlotButtonId(slot);
      const buttonTitle = this.buildSlotButtonTitle(slot, language);

      return {
        type: 'reply',
        reply: {
          id: buttonId,
          title: buttonTitle,
        },
      };
    });

    // Build interactive message
    const interactive: InteractiveButtons = {
      type: 'button',
      body: {
        text: bodyText,
      },
      footer: {
        text: t.messages.tapToSelect,
      },
      action: {
        buttons,
      },
    };

    return {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: 'interactive',
      interactive,
    };
  }

  /**
   * Builds a List Message card (4-10 rows)
   *
   * Creates a WhatsApp List Message showing 4-10 time slots grouped by day.
   * Each section represents one day, and each row shows time + master name.
   *
   * @param params - List message parameters
   * @returns Interactive message payload with List Message
   * @throws Error if slot count is invalid (<4 or >10)
   *
   * @example
   * ```typescript
   * const message = builder.buildListMessageCard({
   *   slots: [
   *     { date: '2024-10-26', time: '10:00', masterId: 'm123', masterName: 'Sarah' },
   *     { date: '2024-10-26', time: '14:00', masterId: 'm123', masterName: 'Sarah', isPreferred: true },
   *     { date: '2024-10-27', time: '11:00', masterId: 'm456', masterName: 'Alex' },
   *     { date: '2024-10-27', time: '15:00', masterId: 'm123', masterName: 'Sarah' },
   *   ],
   *   language: 'en',
   *   customerPhone: '+1234567890',
   *   serviceName: 'Women\'s Haircut',
   *   duration: 60,
   *   price: '$50',
   * });
   * ```
   */
  buildListMessageCard(params: ListMessageParams): InteractiveMessagePayload {
    const { slots, language, customerPhone, serviceName, duration, price } = params;

    // Validate slot count
    if (slots.length < WHATSAPP_CONSTRAINTS.MIN_SLOTS_FOR_LIST) {
      throw new Error(
        `Too few slots for List Message: ${slots.length} (min ${WHATSAPP_CONSTRAINTS.MIN_SLOTS_FOR_LIST})`,
      );
    }

    if (slots.length > WHATSAPP_CONSTRAINTS.MAX_SLOTS_FOR_LIST) {
      throw new Error(
        `Too many slots for List Message: ${slots.length} (max ${WHATSAPP_CONSTRAINTS.MAX_SLOTS_FOR_LIST})`,
      );
    }

    const t = getTranslations(language);

    // Group slots by day
    const groupedSlots = this.groupByDay(slots, language);

    // Build body text
    let bodyText = t.messages.nextAvailableTimes;
    if (serviceName) {
      bodyText += `\n\n${serviceName}`;
      if (duration && price) {
        bodyText += `\n⏱️  ${duration} min • 💰 ${price}`;
      } else if (duration) {
        bodyText += `\n⏱️  ${duration} min`;
      } else if (price) {
        bodyText += `\n💰 ${price}`;
      }
    }

    // Validate body text length
    bodyText = this.truncateText(bodyText, WHATSAPP_CONSTRAINTS.BODY_TEXT_MAX_LENGTH);

    // Build sections
    const sections: ListSection[] = groupedSlots.map((group) => {
      const sectionTitle = this.truncateText(
        group.formattedDate,
        WHATSAPP_CONSTRAINTS.SECTION_TITLE_MAX_LENGTH,
      );

      const rows: ListRow[] = group.slots.map((slot) => {
        const rowId = this.buildSlotButtonId(slot);
        const rowTitle = this.buildSlotRowTitle(slot, language);
        const rowDescription =
          duration && price
            ? `${duration} min • ${price}`
            : duration
              ? `${duration} min`
              : price
                ? price
                : undefined;

        return {
          id: rowId,
          title: rowTitle,
          description: rowDescription
            ? this.truncateText(rowDescription, WHATSAPP_CONSTRAINTS.ROW_DESCRIPTION_MAX_LENGTH)
            : undefined,
        };
      });

      return {
        title: sectionTitle,
        rows,
      };
    });

    // Build interactive message
    const interactive: InteractiveList = {
      type: 'list',
      header: {
        type: 'text',
        text: t.messages.nextAvailableTimes,
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: t.messages.tapToSelect,
      },
      action: {
        button: t.buttons.selectTimeButton,
        sections,
      },
    };

    return {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: 'interactive',
      interactive,
    };
  }

  /**
   * Builds a booking confirmation card
   *
   * Creates a confirmation message with booking details and action buttons
   * ([Confirm] and [Change Time]).
   *
   * @param params - Confirmation parameters
   * @returns Interactive message payload with confirmation buttons
   *
   * @example
   * ```typescript
   * const message = builder.buildConfirmationCard({
   *   booking: {
   *     bookingId: 'b456',
   *     serviceName: 'Women\'s Haircut',
   *     date: '2024-10-25',
   *     time: '15:00',
   *     masterName: 'Sarah',
   *     masterId: 'm123',
   *     duration: 60,
   *     price: '$50',
   *   },
   *   language: 'en',
   *   customerPhone: '+1234567890',
   * });
   * ```
   */
  buildConfirmationCard(params: ConfirmationParams): InteractiveMessagePayload {
    const { booking, language, customerPhone } = params;

    const t = getTranslations(language);

    // Format date and time
    const date = new Date(booking.date + 'T00:00:00');
    const formattedDate = this.formatDate(date, language);
    const formattedTime = this.formatTime(booking.time, language);

    // Build body text
    const appointmentText = interpolate(t.messages.appointmentDetails, {
      date: formattedDate,
      time: formattedTime,
    });
    const masterText = interpolate(t.messages.withMaster, { masterName: booking.masterName });
    const serviceText = interpolate(t.messages.serviceDetails, {
      serviceName: booking.serviceName,
      duration: booking.duration.toString(),
      price: booking.price,
    });

    const bodyText = `${appointmentText}\n${masterText}\n\n${serviceText}`;

    // Validate body text length
    const truncatedBodyText = this.truncateText(
      bodyText,
      WHATSAPP_CONSTRAINTS.BODY_TEXT_MAX_LENGTH,
    );

    // Build buttons
    const buttons: ReplyButton[] = [
      {
        type: 'reply',
        reply: {
          id: `confirm_booking_${booking.bookingId}`,
          title: t.buttons.confirmButton,
        },
      },
      {
        type: 'reply',
        reply: {
          id: `action_change_time`,
          title: 'Change Time', // Keeping short for 20-char limit
        },
      },
    ];

    // Build interactive message
    const interactive: InteractiveButtons = {
      type: 'button',
      body: {
        text: truncatedBodyText,
      },
      action: {
        buttons,
      },
    };

    return {
      messaging_product: 'whatsapp',
      to: customerPhone,
      type: 'interactive',
      interactive,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Formats a time string according to language preferences
   *
   * @param time - Time in 24-hour format (HH:MM)
   * @param language - Target language
   * @returns Formatted time string
   *
   * @example
   * ```typescript
   * formatTime('15:30', 'en'); // "3:30 PM"
   * formatTime('15:30', 'ru'); // "15:30"
   * ```
   */
  formatTime(time: string, language: SupportedLanguage): string {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    return formatTimeTranslation(hours, minutes, language);
  }

  /**
   * Formats a date according to language preferences
   *
   * @param date - Date object
   * @param language - Target language
   * @returns Formatted date string
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 9, 25); // October 25, 2024
   * formatDate(date, 'en'); // "10/25/2024"
   * formatDate(date, 'ru'); // "25/10/2024"
   * ```
   */
  formatDate(date: Date, language: SupportedLanguage): string {
    return formatDateTranslation(date, language);
  }

  /**
   * Groups time slots by day
   *
   * Groups slots by date and returns sections with formatted date headers.
   *
   * @param slots - Time slots to group
   * @param language - Target language for date formatting
   * @returns Grouped slots with formatted date headers
   *
   * @example
   * ```typescript
   * const slots = [
   *   { date: '2024-10-25', time: '14:00', ... },
   *   { date: '2024-10-25', time: '15:00', ... },
   *   { date: '2024-10-26', time: '10:00', ... },
   * ];
   * const grouped = groupByDay(slots, 'en');
   * // [
   * //   { date: '2024-10-25', formattedDate: 'Friday, Oct 25', slots: [...] },
   * //   { date: '2024-10-26', formattedDate: 'Saturday, Oct 26', slots: [...] },
   * // ]
   * ```
   */
  groupByDay(slots: TimeSlot[], language: SupportedLanguage): GroupedSlots[] {
    const grouped = new Map<string, TimeSlot[]>();

    // Group by date
    for (const slot of slots) {
      if (!grouped.has(slot.date)) {
        grouped.set(slot.date, []);
      }
      grouped.get(slot.date)!.push(slot);
    }

    // Convert to array with formatted dates
    const result: GroupedSlots[] = [];
    grouped.forEach((daySlots, dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      const formattedDate = this.formatDateForSection(date, language);

      result.push({
        date: dateStr,
        formattedDate,
        slots: daySlots,
      });
    });

    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Builds a button ID for a time slot
   *
   * Format: `slot_{date}_{time}_{masterId}`
   *
   * @param slot - Time slot
   * @returns Button ID (max 256 chars)
   *
   * @example
   * ```typescript
   * buildSlotButtonId({ date: '2024-10-25', time: '15:00', masterId: 'm123', ... })
   * // Returns: "slot_2024-10-25_15:00_m123"
   * ```
   */
  private buildSlotButtonId(slot: TimeSlot): string {
    const buttonId = `slot_${slot.date}_${slot.time}_${slot.masterId}`;

    // Validate length
    if (buttonId.length > WHATSAPP_CONSTRAINTS.BUTTON_ID_MAX_LENGTH) {
      this.logger.warn(
        `Button ID exceeds max length: ${buttonId.length} > ${WHATSAPP_CONSTRAINTS.BUTTON_ID_MAX_LENGTH}`,
      );
      return buttonId.substring(0, WHATSAPP_CONSTRAINTS.BUTTON_ID_MAX_LENGTH);
    }

    return buttonId;
  }

  /**
   * Builds a button title for a time slot (Reply Buttons)
   *
   * Format: `{time} - {masterName}` with optional star for preferred slots
   *
   * @param slot - Time slot
   * @param language - Target language
   * @returns Button title (max 20 chars)
   *
   * @example
   * ```typescript
   * buildSlotButtonTitle({ time: '15:00', masterName: 'Sarah', isPreferred: true, ... }, 'en')
   * // Returns: "3:00 PM - Sarah ⭐"
   * ```
   */
  private buildSlotButtonTitle(slot: TimeSlot, language: SupportedLanguage): string {
    const formattedTime = this.formatTime(slot.time, language);
    const star = slot.isPreferred ? ' ⭐' : '';

    // Try to fit: "{time} - {masterName}{star}"
    let title = `${formattedTime} - ${slot.masterName}${star}`;

    // If too long, try without master name: "{time}{star}"
    if (title.length > WHATSAPP_CONSTRAINTS.BUTTON_TITLE_MAX_LENGTH) {
      title = `${formattedTime}${star}`;
    }

    // Final truncation if still too long
    return this.truncateText(title, WHATSAPP_CONSTRAINTS.BUTTON_TITLE_MAX_LENGTH);
  }

  /**
   * Builds a row title for a time slot (List Messages)
   *
   * Format: `{time} - {masterName}` with optional star for preferred slots
   *
   * @param slot - Time slot
   * @param language - Target language
   * @returns Row title (max 24 chars)
   *
   * @example
   * ```typescript
   * buildSlotRowTitle({ time: '15:00', masterName: 'Sarah', isPreferred: true, ... }, 'en')
   * // Returns: "3:00 PM - Sarah ⭐"
   * ```
   */
  private buildSlotRowTitle(slot: TimeSlot, language: SupportedLanguage): string {
    const formattedTime = this.formatTime(slot.time, language);
    const star = slot.isPreferred ? ' ⭐' : '';

    // Try to fit: "{time} - {masterName}{star}"
    let title = `${formattedTime} - ${slot.masterName}${star}`;

    // If too long, try without master name: "{time}{star}"
    if (title.length > WHATSAPP_CONSTRAINTS.ROW_TITLE_MAX_LENGTH) {
      title = `${formattedTime}${star}`;
    }

    // Final truncation if still too long
    return this.truncateText(title, WHATSAPP_CONSTRAINTS.ROW_TITLE_MAX_LENGTH);
  }

  /**
   * Formats a date for section titles
   *
   * Format: `{DayName}, {Month} {Day}`
   * Example: "Friday, Oct 25"
   *
   * @param date - Date object
   * @param language - Target language
   * @returns Formatted date string
   */
  private formatDateForSection(date: Date, language: SupportedLanguage): string {
    const dayName = getDayName(date.getDay(), language);
    const monthName = getMonthName(date.getMonth(), language);
    const day = date.getDate();

    // Format: "Friday, Oct 25"
    const shortMonth = monthName.substring(0, 3);
    return `${dayName}, ${shortMonth} ${day}`;
  }

  /**
   * Truncates text to max length
   *
   * Adds ellipsis (...) if truncated.
   *
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }
}
