/**
 * Slot Selection Card Template (T028)
 *
 * WhatsApp interactive card templates for displaying available time slots.
 * Automatically selects Reply Buttons (1-3 slots) or List Message (4-10 slots)
 * based on the number of available slots.
 *
 * Features:
 * - Reply Buttons format for 1-3 slots
 * - List Message format for 4-10 slots (grouped by day)
 * - Multi-language support (EN, RU, ES, PT, HE)
 * - Localized date/time/price formatting
 * - Preferred slot markers (⭐)
 * - WhatsApp API constraint validation
 *
 * @module modules/whatsapp/interactive/card-templates
 */

import {
  InteractiveMessagePayload,
  InteractiveButtons,
  InteractiveList,
  ReplyButton,
  ListSection,
} from '../../../../types/whatsapp.types';
import {
  SupportedLanguage,
  getTranslations,
  interpolate,
  formatDate,
  formatTime,
  getDayName,
  getMonthName,
} from '../translations';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Slot suggestion with booking details
 */
export interface SlotSuggestion {
  /** Slot date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Slot time in 24-hour format (HH:MM) */
  time: string;
  /** Master ID */
  masterId: string;
  /** Master name */
  masterName: string;
  /** Service name */
  serviceName: string;
  /** Service duration in minutes */
  duration: number;
  /** Service price (formatted string with currency) */
  price: string;
  /** Whether this is a preferred/top-ranked slot */
  isPreferred?: boolean;
}

/**
 * Grouped slots by date
 */
interface GroupedSlots {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Human-readable date header (e.g., "Friday, Oct 25") */
  formattedDate: string;
  /** Slots for this date */
  slots: SlotSuggestion[];
}

// ============================================================================
// WHATSAPP CONSTRAINTS
// ============================================================================

const CONSTRAINTS = {
  /** Button ID max length */
  BUTTON_ID_MAX: 256,
  /** Button title max length */
  BUTTON_TITLE_MAX: 20,
  /** Row ID max length */
  ROW_ID_MAX: 200,
  /** Row title max length */
  ROW_TITLE_MAX: 24,
  /** Row description max length */
  ROW_DESCRIPTION_MAX: 72,
  /** Section title max length */
  SECTION_TITLE_MAX: 24,
  /** Body text max length */
  BODY_TEXT_MAX: 1024,
  /** Header text max length */
  HEADER_TEXT_MAX: 60,
  /** Footer text max length */
  FOOTER_TEXT_MAX: 60,
  /** Max reply buttons */
  MAX_REPLY_BUTTONS: 3,
  /** Min slots for list message */
  MIN_SLOTS_FOR_LIST: 4,
  /** Max slots total */
  MAX_SLOTS: 10,
};

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Currency symbols by language
 */
const CURRENCY_SYMBOLS: Record<SupportedLanguage, string> = {
  en: '$',
  ru: '₽',
  es: '€',
  pt: '€',
  he: '₪',
};

/**
 * Formats price according to language preference
 *
 * @param amount - Price amount as number
 * @param language - Target language
 * @returns Formatted price string
 *
 * @example
 * ```typescript
 * formatPrice(50.00, 'en'); // "$50.00"
 * formatPrice(50.00, 'ru'); // "50,00 ₽"
 * formatPrice(50.00, 'es'); // "€50,00"
 * formatPrice(50.00, 'he'); // "₪50.00"
 * ```
 */
function formatPrice(amount: number, language: SupportedLanguage): string {
  const symbol = CURRENCY_SYMBOLS[language];

  if (language === 'en' || language === 'he') {
    // EN: $XX.XX, HE: ₪XX.XX
    const formatted = amount.toFixed(2);
    return language === 'en' ? `${symbol}${formatted}` : `${symbol}${formatted}`;
  } else {
    // RU, ES, PT: XX,XX ₽/€
    const formatted = amount.toFixed(2).replace('.', ',');
    return `${formatted} ${symbol}`;
  }
}

/**
 * Formats date for section headers
 *
 * Format: "{DayName}, {Month} {Day}"
 * Example: "Friday, Oct 25"
 *
 * @param date - Date object
 * @param language - Target language
 * @returns Formatted date string
 */
function formatDateForSection(date: Date, language: SupportedLanguage): string {
  const dayName = getDayName(date.getDay(), language);
  const monthName = getMonthName(date.getMonth(), language);
  const day = date.getDate();

  // Use short month name (first 3 letters)
  const shortMonth = monthName.substring(0, 3);
  return `${dayName}, ${shortMonth} ${day}`;
}

/**
 * Truncates text to max length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// BUTTON ID BUILDERS
// ============================================================================

/**
 * Builds a button ID for a slot
 *
 * Format: `slot_{date}_{time}_{masterId}`
 *
 * @param slot - Slot suggestion
 * @returns Button ID (max 256 chars)
 *
 * @example
 * ```typescript
 * buildSlotButtonId({ date: '2024-10-25', time: '14:00', masterId: 'master-sarah', ... })
 * // Returns: "slot_2024-10-25_14:00_master-sarah"
 * ```
 */
function buildSlotButtonId(slot: SlotSuggestion): string {
  const id = `slot_${slot.date}_${slot.time}_${slot.masterId}`;
  return truncate(id, CONSTRAINTS.BUTTON_ID_MAX);
}

// ============================================================================
// BUTTON/ROW TITLE BUILDERS
// ============================================================================

/**
 * Builds button title for Reply Buttons (max 20 chars)
 *
 * Format: "{time} - {masterName} ⭐" (star only for preferred)
 *
 * @param slot - Slot suggestion
 * @param language - Target language
 * @returns Button title
 *
 * @example
 * ```typescript
 * buildButtonTitle({ time: '14:00', masterName: 'Sarah', isPreferred: true, ... }, 'en')
 * // Returns: "2:00 PM - Sarah ⭐"
 * ```
 */
function buildButtonTitle(slot: SlotSuggestion, language: SupportedLanguage): string {
  const formattedTime = formatTimeString(slot.time, language);
  const star = slot.isPreferred ? ' ⭐' : '';

  // Try full format: "{time} - {masterName}{star}"
  let title = `${formattedTime} - ${slot.masterName}${star}`;

  // If too long, just show time with star
  if (title.length > CONSTRAINTS.BUTTON_TITLE_MAX) {
    title = `${formattedTime}${star}`;
  }

  return truncate(title, CONSTRAINTS.BUTTON_TITLE_MAX);
}

/**
 * Builds row title for List Messages (max 24 chars)
 *
 * Format: "{time} - {masterName}" (star optional based on space)
 *
 * @param slot - Slot suggestion
 * @param language - Target language
 * @returns Row title
 */
function buildRowTitle(slot: SlotSuggestion, language: SupportedLanguage): string {
  const formattedTime = formatTimeString(slot.time, language);
  const star = slot.isPreferred ? ' ⭐' : '';

  // Try full format
  let title = `${formattedTime} - ${slot.masterName}${star}`;

  // If too long, try without star
  if (title.length > CONSTRAINTS.ROW_TITLE_MAX && star) {
    title = `${formattedTime} - ${slot.masterName}`;
  }

  // If still too long, just show time
  if (title.length > CONSTRAINTS.ROW_TITLE_MAX) {
    title = formattedTime;
  }

  return truncate(title, CONSTRAINTS.ROW_TITLE_MAX);
}

/**
 * Formats time string according to language preference
 */
function formatTimeString(time: string, language: SupportedLanguage): string {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  return formatTime(hours, minutes, language);
}

/**
 * Formats full date according to language preference
 */
function formatDateString(dateStr: string, language: SupportedLanguage): string {
  const date = new Date(dateStr + 'T00:00:00');
  return formatDate(date, language);
}

// ============================================================================
// SLOT GROUPING
// ============================================================================

/**
 * Groups slots by date for List Messages
 *
 * @param slots - Array of slot suggestions
 * @param language - Target language for formatting
 * @returns Grouped slots with formatted date headers
 */
function groupSlotsByDate(slots: SlotSuggestion[], language: SupportedLanguage): GroupedSlots[] {
  const grouped = new Map<string, SlotSuggestion[]>();

  // Group by date
  for (const slot of slots) {
    if (!grouped.has(slot.date)) {
      grouped.set(slot.date, []);
    }
    grouped.get(slot.date)!.push(slot);
  }

  // Convert to array with formatted dates
  const result: GroupedSlots[] = [];
  grouped.forEach((dateSlots, dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const formattedDate = formatDateForSection(date, language);

    result.push({
      date: dateStr,
      formattedDate,
      slots: dateSlots,
    });
  });

  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

// ============================================================================
// REPLY BUTTONS TEMPLATE (1-3 slots)
// ============================================================================

/**
 * Builds a Reply Buttons message for 1-3 slots
 *
 * @param slots - Available slots (1-3)
 * @param language - Customer language preference
 * @returns Interactive message payload with Reply Buttons
 *
 * @example
 * ```typescript
 * const message = buildReplyButtonsTemplate([
 *   {
 *     date: '2024-10-25',
 *     time: '14:00',
 *     masterId: 'master-sarah',
 *     masterName: 'Sarah',
 *     serviceName: 'Haircut',
 *     duration: 60,
 *     price: '50',
 *     isPreferred: true
 *   }
 * ], 'en');
 * ```
 */
function buildReplyButtonsTemplate(
  slots: SlotSuggestion[],
  language: SupportedLanguage,
): InteractiveButtons {
  if (slots.length === 0 || slots.length > CONSTRAINTS.MAX_REPLY_BUTTONS) {
    throw new Error(
      `Invalid slot count for Reply Buttons: ${slots.length} (must be 1-${CONSTRAINTS.MAX_REPLY_BUTTONS})`,
    );
  }

  const t = getTranslations(language);

  // Build body text
  const firstSlot = slots[0];
  const serviceName = firstSlot.serviceName;
  const duration = firstSlot.duration;
  const priceNum = parseFloat(firstSlot.price) || 0;
  const price = formatPrice(priceNum, language);

  let bodyText = `💇 ${serviceName}\n⏱️  ${duration} min\n💰 ${price}\n\nTap to select:`;

  // Truncate if needed
  bodyText = truncate(bodyText, CONSTRAINTS.BODY_TEXT_MAX);

  // Build buttons
  const buttons: ReplyButton[] = slots.map((slot) => ({
    type: 'reply',
    reply: {
      id: buildSlotButtonId(slot),
      title: buildButtonTitle(slot, language),
    },
  }));

  return {
    type: 'button',
    header: {
      type: 'text',
      text: truncate('Available times 📅', CONSTRAINTS.HEADER_TEXT_MAX),
    },
    body: {
      text: bodyText,
    },
    footer: {
      text: truncate('Tap a time slot to book', CONSTRAINTS.FOOTER_TEXT_MAX),
    },
    action: {
      buttons,
    },
  };
}

// ============================================================================
// LIST MESSAGE TEMPLATE (4-10 slots)
// ============================================================================

/**
 * Builds a List Message for 4-10 slots, grouped by day
 *
 * @param slots - Available slots (4-10)
 * @param language - Customer language preference
 * @returns Interactive message payload with List Message
 *
 * @example
 * ```typescript
 * const message = buildListMessageTemplate([...], 'en');
 * ```
 */
function buildListMessageTemplate(
  slots: SlotSuggestion[],
  language: SupportedLanguage,
): InteractiveList {
  if (slots.length < CONSTRAINTS.MIN_SLOTS_FOR_LIST || slots.length > CONSTRAINTS.MAX_SLOTS) {
    throw new Error(
      `Invalid slot count for List Message: ${slots.length} (must be ${CONSTRAINTS.MIN_SLOTS_FOR_LIST}-${CONSTRAINTS.MAX_SLOTS})`,
    );
  }

  const t = getTranslations(language);

  // Build body text
  const bodyText = truncate('Select your preferred time:', CONSTRAINTS.BODY_TEXT_MAX);

  // Group slots by date
  const groupedSlots = groupSlotsByDate(slots, language);

  // Build sections
  const sections: ListSection[] = groupedSlots.map((group) => {
    const sectionTitle = truncate(group.formattedDate, CONSTRAINTS.SECTION_TITLE_MAX);

    const rows = group.slots.map((slot) => {
      const priceNum = parseFloat(slot.price) || 0;
      const price = formatPrice(priceNum, language);
      const description = `${slot.duration} min • ${price}`;

      return {
        id: truncate(buildSlotButtonId(slot), CONSTRAINTS.ROW_ID_MAX),
        title: buildRowTitle(slot, language),
        description: truncate(description, CONSTRAINTS.ROW_DESCRIPTION_MAX),
      };
    });

    return {
      title: sectionTitle,
      rows,
    };
  });

  return {
    type: 'list',
    header: {
      type: 'text',
      text: truncate('Available times 📅', CONSTRAINTS.HEADER_TEXT_MAX),
    },
    body: {
      text: bodyText,
    },
    action: {
      button: t.buttons.selectTimeButton,
      sections,
    },
  };
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Builds a slot selection template with automatic format selection
 *
 * Automatically chooses:
 * - Reply Buttons (1-3 slots)
 * - List Message (4-10 slots)
 *
 * @param slots - Available time slots (1-10)
 * @param language - Customer language preference
 * @returns Interactive message payload ready to send
 * @throws Error if slot count is invalid (0 or >10)
 *
 * @example
 * ```typescript
 * // Example 1: Reply Buttons (3 slots)
 * const message = buildSlotSelectionTemplate([
 *   {
 *     date: '2024-10-25',
 *     time: '14:00',
 *     masterId: 'master-sarah',
 *     masterName: 'Sarah',
 *     serviceName: 'Haircut',
 *     duration: 60,
 *     price: '50.00',
 *     isPreferred: false
 *   },
 *   {
 *     date: '2024-10-25',
 *     time: '15:00',
 *     masterId: 'master-sarah',
 *     masterName: 'Sarah',
 *     serviceName: 'Haircut',
 *     duration: 60,
 *     price: '50.00',
 *     isPreferred: true
 *   },
 *   {
 *     date: '2024-10-25',
 *     time: '16:00',
 *     masterId: 'master-john',
 *     masterName: 'John',
 *     serviceName: 'Haircut',
 *     duration: 60,
 *     price: '50.00',
 *     isPreferred: false
 *   }
 * ], 'en');
 *
 * // Result: Reply Buttons message
 * // {
 * //   type: 'button',
 * //   header: { type: 'text', text: 'Available times 📅' },
 * //   body: { text: '💇 Haircut\n⏱️  60 min\n💰 $50.00\n\nTap to select:' },
 * //   action: {
 * //     buttons: [
 * //       { type: 'reply', reply: { id: 'slot_2024-10-25_14:00_master-sarah', title: '2:00 PM - Sarah' } },
 * //       { type: 'reply', reply: { id: 'slot_2024-10-25_15:00_master-sarah', title: '3:00 PM - Sarah ⭐' } },
 * //       { type: 'reply', reply: { id: 'slot_2024-10-25_16:00_master-john', title: '4:00 PM - John' } }
 * //     ]
 * //   },
 * //   footer: { text: 'Tap a time slot to book' }
 * // }
 *
 * // Example 2: List Message (5 slots, multiple days)
 * const listMessage = buildSlotSelectionTemplate([...5 slots...], 'ru');
 *
 * // Result: List Message grouped by day
 * // {
 * //   type: 'list',
 * //   header: { type: 'text', text: 'Available times 📅' },
 * //   body: { text: 'Select your preferred time:' },
 * //   action: {
 * //     button: 'Выбрать время',
 * //     sections: [
 * //       {
 * //         title: 'Пятница, Окт 25',
 * //         rows: [
 * //           { id: 'slot_2024-10-25_14:00_master-sarah', title: '14:00 - Sarah', description: '60 min • 50,00 ₽' }
 * //         ]
 * //       },
 * //       {
 * //         title: 'Суббота, Окт 26',
 * //         rows: [...]
 * //       }
 * //     ]
 * //   }
 * // }
 * ```
 */
export function buildSlotSelectionTemplate(
  slots: SlotSuggestion[],
  language: SupportedLanguage,
): InteractiveMessagePayload {
  if (slots.length === 0) {
    throw new Error('Cannot build slot selection: no slots provided');
  }

  if (slots.length > CONSTRAINTS.MAX_SLOTS) {
    throw new Error(`Too many slots: ${slots.length} (max ${CONSTRAINTS.MAX_SLOTS})`);
  }

  // Auto-select format based on slot count
  const interactive =
    slots.length <= CONSTRAINTS.MAX_REPLY_BUTTONS
      ? buildReplyButtonsTemplate(slots, language)
      : buildListMessageTemplate(slots, language);

  // Note: customerPhone will be set by the caller
  return {
    messaging_product: 'whatsapp',
    to: '', // To be filled by caller
    type: 'interactive',
    interactive,
  };
}
