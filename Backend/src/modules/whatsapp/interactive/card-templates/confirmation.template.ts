/**
 * Booking Confirmation Card Template (T029)
 *
 * WhatsApp interactive card template for booking confirmation screen.
 * Shows selected slot details with [Confirm] and [Change Time] buttons.
 *
 * Features:
 * - Confirmation screen with booking details
 * - Multi-language support (EN, RU, ES, PT, HE)
 * - Localized date/time/price formatting
 * - Action buttons: Confirm and Change Time
 * - WhatsApp API constraint validation
 *
 * @module modules/whatsapp/interactive/card-templates
 */

import {
  InteractiveMessagePayload,
  InteractiveButtons,
  ReplyButton,
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
 * Slot suggestion (same as slot-selection.template.ts)
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

// ============================================================================
// WHATSAPP CONSTRAINTS
// ============================================================================

const CONSTRAINTS = {
  /** Button ID max length */
  BUTTON_ID_MAX: 256,
  /** Button title max length */
  BUTTON_TITLE_MAX: 20,
  /** Body text max length */
  BODY_TEXT_MAX: 1024,
  /** Header text max length */
  HEADER_TEXT_MAX: 60,
  /** Footer text max length */
  FOOTER_TEXT_MAX: 60,
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
 * Truncates text to max length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
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
 * Formats date string according to language preference
 */
function formatDateString(dateStr: string, language: SupportedLanguage): string {
  const date = new Date(dateStr + 'T00:00:00');
  return formatDate(date, language);
}

/**
 * Formats date with day name for confirmation display
 *
 * Format: "{DayName}, {Month} {Day}"
 * Example: "Friday, Oct 25"
 *
 * @param dateStr - Date string in ISO format (YYYY-MM-DD)
 * @param language - Target language
 * @returns Formatted date string with day name
 */
function formatDateWithDay(dateStr: string, language: SupportedLanguage): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = getDayName(date.getDay(), language);
  const monthName = getMonthName(date.getMonth(), language);
  const day = date.getDate();

  // Use short month name (first 3 letters)
  const shortMonth = monthName.substring(0, 3);
  return `${dayName}, ${shortMonth} ${day}`;
}

/**
 * Calculates end time based on start time and duration
 *
 * @param startTime - Start time in HH:MM format
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:MM format
 *
 * @example
 * ```typescript
 * calculateEndTime('14:00', 60); // "15:00"
 * calculateEndTime('14:30', 90); // "16:00"
 * ```
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hoursStr, minutesStr] = startTime.split(':');
  const startHours = parseInt(hoursStr, 10);
  const startMinutes = parseInt(minutesStr, 10);

  const totalMinutes = startHours * 60 + startMinutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

// ============================================================================
// CONFIRMATION BUTTON LABELS
// ============================================================================

/**
 * Button labels for confirmation screen
 */
const CONFIRMATION_BUTTONS: Record<SupportedLanguage, { confirm: string; change: string }> = {
  en: {
    confirm: '✅ Confirm',
    change: '⏰ Change Time',
  },
  ru: {
    confirm: '✅ Подтвердить',
    change: '⏰ Изменить',
  },
  es: {
    confirm: '✅ Confirmar',
    change: '⏰ Cambiar',
  },
  pt: {
    confirm: '✅ Confirmar',
    change: '⏰ Alterar',
  },
  he: {
    confirm: '✅ אישור',
    change: '⏰ שינוי',
  },
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Builds a booking confirmation template
 *
 * Shows selected slot details with Confirm and Change Time buttons.
 *
 * @param slot - Selected slot details
 * @param bookingId - Temporary booking ID
 * @param language - Customer language preference
 * @returns Interactive message payload with confirmation buttons
 *
 * @example
 * ```typescript
 * const message = buildConfirmationTemplate(
 *   {
 *     date: '2024-10-25',
 *     time: '14:00',
 *     masterId: 'master-sarah',
 *     masterName: 'Sarah Johnson',
 *     serviceName: 'Haircut',
 *     duration: 60,
 *     price: '50.00',
 *     isPreferred: true
 *   },
 *   'booking123',
 *   'en'
 * );
 *
 * // Result:
 * // {
 * //   type: 'button',
 * //   header: { type: 'text', text: 'Confirm booking? ✅' },
 * //   body: {
 * //     text: '💇 Haircut\n👤 Sarah Johnson\n📅 Friday, Oct 25\n🕐 2:00 PM - 3:00 PM\n⏱️  60 min\n💰 $50.00\n\nConfirm this booking?'
 * //   },
 * //   action: {
 * //     buttons: [
 * //       { type: 'reply', reply: { id: 'confirm_booking123', title: '✅ Confirm' } },
 * //       { type: 'reply', reply: { id: 'nav_change_time', title: '⏰ Change Time' } }
 * //     ]
 * //   },
 * //   footer: { text: 'Tap to confirm or change' }
 * // }
 *
 * // Russian example:
 * const ruMessage = buildConfirmationTemplate(slot, 'booking456', 'ru');
 * // Body text: '💇 Стрижка\n👤 Сара Джонсон\n📅 Пятница, Окт 25\n🕐 14:00 - 15:00\n⏱️  60 мин\n💰 50,00 ₽\n\nПодтвердить запись?'
 * ```
 */
export function buildConfirmationTemplate(
  slot: SlotSuggestion,
  bookingId: string,
  language: SupportedLanguage,
): InteractiveMessagePayload {
  const t = getTranslations(language);

  // Format date and time
  const formattedDate = formatDateWithDay(slot.date, language);
  const startTime = formatTimeString(slot.time, language);
  const endTimeRaw = calculateEndTime(slot.time, slot.duration);
  const endTime = formatTimeString(endTimeRaw, language);

  // Format price
  const priceNum = parseFloat(slot.price) || 0;
  const formattedPrice = formatPrice(priceNum, language);

  // Build body text based on language
  let bodyText = '';

  switch (language) {
    case 'en':
      bodyText = `💇 ${slot.serviceName}\n👤 ${slot.masterName}\n📅 ${formattedDate}\n🕐 ${startTime} - ${endTime}\n⏱️  ${slot.duration} min\n💰 ${formattedPrice}\n\nConfirm this booking?`;
      break;
    case 'ru':
      bodyText = `💇 ${slot.serviceName}\n👤 ${slot.masterName}\n📅 ${formattedDate}\n🕐 ${startTime} - ${endTime}\n⏱️  ${slot.duration} мин\n💰 ${formattedPrice}\n\nПодтвердить запись?`;
      break;
    case 'es':
      bodyText = `💇 ${slot.serviceName}\n👤 ${slot.masterName}\n📅 ${formattedDate}\n🕐 ${startTime} - ${endTime}\n⏱️  ${slot.duration} min\n💰 ${formattedPrice}\n\n¿Confirmar esta reserva?`;
      break;
    case 'pt':
      bodyText = `💇 ${slot.serviceName}\n👤 ${slot.masterName}\n📅 ${formattedDate}\n🕐 ${startTime} - ${endTime}\n⏱️  ${slot.duration} min\n💰 ${formattedPrice}\n\nConfirmar esta reserva?`;
      break;
    case 'he':
      bodyText = `💇 ${slot.serviceName}\n👤 ${slot.masterName}\n📅 ${formattedDate}\n🕐 ${startTime} - ${endTime}\n⏱️  ${slot.duration} דקות\n💰 ${formattedPrice}\n\nלאשר את התור?`;
      break;
  }

  // Truncate if needed
  bodyText = truncate(bodyText, CONSTRAINTS.BODY_TEXT_MAX);

  // Get button labels
  const buttonLabels = CONFIRMATION_BUTTONS[language];

  // Build buttons
  const buttons: ReplyButton[] = [
    {
      type: 'reply',
      reply: {
        id: truncate(`confirm_${bookingId}`, CONSTRAINTS.BUTTON_ID_MAX),
        title: truncate(buttonLabels.confirm, CONSTRAINTS.BUTTON_TITLE_MAX),
      },
    },
    {
      type: 'reply',
      reply: {
        id: 'nav_change_time',
        title: truncate(buttonLabels.change, CONSTRAINTS.BUTTON_TITLE_MAX),
      },
    },
  ];

  // Build header text
  let headerText = '';
  switch (language) {
    case 'en':
      headerText = 'Confirm booking? ✅';
      break;
    case 'ru':
      headerText = 'Подтвердить? ✅';
      break;
    case 'es':
      headerText = '¿Confirmar? ✅';
      break;
    case 'pt':
      headerText = 'Confirmar? ✅';
      break;
    case 'he':
      headerText = 'לאשר? ✅';
      break;
  }

  // Build footer text
  let footerText = '';
  switch (language) {
    case 'en':
      footerText = 'Tap to confirm or change';
      break;
    case 'ru':
      footerText = 'Нажмите для подтверждения';
      break;
    case 'es':
      footerText = 'Toca para confirmar';
      break;
    case 'pt':
      footerText = 'Toque para confirmar';
      break;
    case 'he':
      footerText = 'לחץ לאישור או שינוי';
      break;
  }

  const interactive: InteractiveButtons = {
    type: 'button',
    header: {
      type: 'text',
      text: truncate(headerText, CONSTRAINTS.HEADER_TEXT_MAX),
    },
    body: {
      text: bodyText,
    },
    footer: {
      text: truncate(footerText, CONSTRAINTS.FOOTER_TEXT_MAX),
    },
    action: {
      buttons,
    },
  };

  // Note: customerPhone will be set by the caller
  return {
    messaging_product: 'whatsapp',
    to: '', // To be filled by caller
    type: 'interactive',
    interactive,
  };
}
