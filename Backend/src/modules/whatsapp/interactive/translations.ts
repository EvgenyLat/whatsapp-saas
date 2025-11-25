/**
 * WhatsApp Interactive Message Translations
 *
 * Comprehensive translation constants for WhatsApp Quick Booking feature.
 * Supports 5 languages: English (EN), Russian (RU), Spanish (ES), Portuguese (PT), Hebrew (HE).
 *
 * Features:
 * - Button labels (max 20 chars per WhatsApp API constraint)
 * - Message text templates
 * - Date/time format preferences per language
 * - Right-to-left (RTL) support for Hebrew
 *
 * @module modules/whatsapp/interactive
 */

/**
 * Supported language codes
 */
export type SupportedLanguage = 'en' | 'ru' | 'es' | 'pt' | 'he';

/**
 * Text direction for rendering
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Date format preference
 */
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

/**
 * Time format preference (12-hour or 24-hour)
 */
export type TimeFormat = '12h' | '24h';

/**
 * Language-specific configuration
 */
export interface LanguageConfig {
  /** Language code */
  code: SupportedLanguage;
  /** Language name in native script */
  name: string;
  /** Text direction */
  direction: TextDirection;
  /** Preferred date format */
  dateFormat: DateFormat;
  /** Preferred time format */
  timeFormat: TimeFormat;
}

/**
 * Button label translations
 *
 * All labels are limited to 20 characters per WhatsApp API constraint.
 */
export interface ButtonLabels {
  /** "Confirm" button */
  confirmButton: string;
  /** "Cancel" button */
  cancelButton: string;
  /** "Select Time" button */
  selectTimeButton: string;
  /** "See More" button (for pagination) */
  seeMoreButton: string;
  /** "Call Salon" button */
  callSalonButton: string;
  /** "Join Waitlist" button */
  joinWaitlistButton: string;
  /** "Book Now" button */
  bookNowButton: string;
  /** "Back" button */
  backButton: string;
  /** "Yes" button */
  yesButton: string;
  /** "No" button */
  noButton: string;
  /** "Next" button */
  nextButton: string;
  /** "Previous" button */
  previousButton: string;
}

/**
 * Message text translations
 *
 * Templates may contain placeholders: {placeholder}
 */
export interface MessageText {
  // Time selection messages
  /** "Available times on {day}:" */
  availableTimes: string;
  /** "Tap to select your time" */
  tapToSelect: string;
  /** "No available times" */
  noAvailableTimes: string;
  /** "Next available times" */
  nextAvailableTimes: string;

  // Booking confirmation messages
  /** "Booking confirmed!" */
  bookingConfirmed: string;
  /** "Your appointment is on {date} at {time}" */
  appointmentDetails: string;
  /** "With {masterName}" */
  withMaster: string;
  /** "{serviceName} - {duration} min - {price}" */
  serviceDetails: string;

  // Waitlist messages
  /** "All slots are booked" */
  allSlotsBooked: string;
  /** "Join the waitlist?" */
  joinWaitlistPrompt: string;
  /** "You're on the waitlist" */
  onWaitlist: string;
  /** "We'll notify you if a slot opens" */
  waitlistNotification: string;
  /** "A slot is now available!" */
  slotAvailable: string;
  /** "Book within 15 minutes" */
  bookWithinTime: string;

  // Error messages
  /** "Sorry, this slot was just booked" */
  slotAlreadyBooked: string;
  /** "Something went wrong. Please try again." */
  genericError: string;
  /** "Booking cancelled" */
  bookingCancelled: string;

  // General messages
  /** "Your preferred time" */
  preferredTime: string;
  /** "Popular times" */
  popularTimes: string;
  /** "Book your usual" */
  bookYourUsual: string;
}

/**
 * Day of week names
 */
export interface DayNames {
  /** Monday */
  monday: string;
  /** Tuesday */
  tuesday: string;
  /** Wednesday */
  wednesday: string;
  /** Thursday */
  thursday: string;
  /** Friday */
  friday: string;
  /** Saturday */
  saturday: string;
  /** Sunday */
  sunday: string;
}

/**
 * Short day of week names (3 letters)
 */
export type ShortDayNames = {
  [K in keyof DayNames]: string;
};

/**
 * Month names
 */
export interface MonthNames {
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
}

/**
 * Translation bundle for a single language
 */
export interface TranslationBundle {
  config: LanguageConfig;
  buttons: ButtonLabels;
  messages: MessageText;
  days: DayNames;
  shortDays: ShortDayNames;
  months: MonthNames;
}

// ============================================================================
// ENGLISH (EN) TRANSLATIONS
// ============================================================================

const EN_TRANSLATIONS: TranslationBundle = {
  config: {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  buttons: {
    confirmButton: 'Confirm',
    cancelButton: 'Cancel',
    selectTimeButton: 'Select Time',
    seeMoreButton: 'See More',
    callSalonButton: 'Call Salon',
    joinWaitlistButton: 'Join Waitlist',
    bookNowButton: 'Book Now',
    backButton: 'Back',
    yesButton: 'Yes',
    noButton: 'No',
    nextButton: 'Next',
    previousButton: 'Previous',
  },
  messages: {
    availableTimes: 'Available times on {day}:',
    tapToSelect: 'Tap to select your time',
    noAvailableTimes: 'No available times on {day}',
    nextAvailableTimes: 'Next available times',
    bookingConfirmed: 'Booking confirmed! ✅',
    appointmentDetails: 'Your appointment is on {date} at {time}',
    withMaster: 'With {masterName}',
    serviceDetails: '{serviceName} • {duration} min • {price}',
    allSlotsBooked: 'All slots are fully booked',
    joinWaitlistPrompt: 'Would you like to join the waitlist?',
    onWaitlist: "You're on the waitlist 📋",
    waitlistNotification: "We'll notify you if a slot opens",
    slotAvailable: 'Good news! A slot is now available 🎉',
    bookWithinTime: 'Book within 15 minutes to secure it',
    slotAlreadyBooked: 'Sorry, this slot was just booked',
    genericError: 'Something went wrong. Please try again.',
    bookingCancelled: 'Booking cancelled',
    preferredTime: 'Your preferred time ⭐',
    popularTimes: 'Popular times',
    bookYourUsual: 'Book Your Usual',
  },
  days: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  shortDays: {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  },
  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },
};

// ============================================================================
// RUSSIAN (RU) TRANSLATIONS
// ============================================================================

const RU_TRANSLATIONS: TranslationBundle = {
  config: {
    code: 'ru',
    name: 'Русский',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  buttons: {
    confirmButton: 'Подтвердить',
    cancelButton: 'Отменить',
    selectTimeButton: 'Выбрать время',
    seeMoreButton: 'Ещё',
    callSalonButton: 'Позвонить',
    joinWaitlistButton: 'В лист ожидания',
    bookNowButton: 'Записаться',
    backButton: 'Назад',
    yesButton: 'Да',
    noButton: 'Нет',
    nextButton: 'Далее',
    previousButton: 'Назад',
  },
  messages: {
    availableTimes: 'Доступное время на {day}:',
    tapToSelect: 'Нажмите, чтобы выбрать время',
    noAvailableTimes: 'Нет свободного времени на {day}',
    nextAvailableTimes: 'Ближайшее свободное время',
    bookingConfirmed: 'Запись подтверждена! ✅',
    appointmentDetails: 'Ваша запись на {date} в {time}',
    withMaster: 'К мастеру {masterName}',
    serviceDetails: '{serviceName} • {duration} мин • {price}',
    allSlotsBooked: 'Все слоты заняты',
    joinWaitlistPrompt: 'Хотите встать в лист ожидания?',
    onWaitlist: 'Вы в листе ожидания 📋',
    waitlistNotification: 'Мы уведомим вас, если освободится место',
    slotAvailable: 'Отличные новости! Появилось свободное место 🎉',
    bookWithinTime: 'Запишитесь в течение 15 минут',
    slotAlreadyBooked: 'Извините, это время уже заняли',
    genericError: 'Что-то пошло не так. Попробуйте снова.',
    bookingCancelled: 'Запись отменена',
    preferredTime: 'Ваше любимое время ⭐',
    popularTimes: 'Популярное время',
    bookYourUsual: 'Обычная запись',
  },
  days: {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
  },
  shortDays: {
    monday: 'Пн',
    tuesday: 'Вт',
    wednesday: 'Ср',
    thursday: 'Чт',
    friday: 'Пт',
    saturday: 'Сб',
    sunday: 'Вс',
  },
  months: {
    january: 'Январь',
    february: 'Февраль',
    march: 'Март',
    april: 'Апрель',
    may: 'Май',
    june: 'Июнь',
    july: 'Июль',
    august: 'Август',
    september: 'Сентябрь',
    october: 'Октябрь',
    november: 'Ноябрь',
    december: 'Декабрь',
  },
};

// ============================================================================
// SPANISH (ES) TRANSLATIONS
// ============================================================================

const ES_TRANSLATIONS: TranslationBundle = {
  config: {
    code: 'es',
    name: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  buttons: {
    confirmButton: 'Confirmar',
    cancelButton: 'Cancelar',
    selectTimeButton: 'Seleccionar hora',
    seeMoreButton: 'Ver más',
    callSalonButton: 'Llamar salón',
    joinWaitlistButton: 'Lista de espera',
    bookNowButton: 'Reservar ahora',
    backButton: 'Atrás',
    yesButton: 'Sí',
    noButton: 'No',
    nextButton: 'Siguiente',
    previousButton: 'Anterior',
  },
  messages: {
    availableTimes: 'Horarios disponibles el {day}:',
    tapToSelect: 'Toca para seleccionar tu horario',
    noAvailableTimes: 'No hay horarios disponibles el {day}',
    nextAvailableTimes: 'Próximos horarios disponibles',
    bookingConfirmed: '¡Reserva confirmada! ✅',
    appointmentDetails: 'Tu cita es el {date} a las {time}',
    withMaster: 'Con {masterName}',
    serviceDetails: '{serviceName} • {duration} min • {price}',
    allSlotsBooked: 'Todos los horarios están reservados',
    joinWaitlistPrompt: '¿Te gustaría unirte a la lista de espera?',
    onWaitlist: 'Estás en la lista de espera 📋',
    waitlistNotification: 'Te notificaremos si se abre un horario',
    slotAvailable: '¡Buenas noticias! Hay un horario disponible 🎉',
    bookWithinTime: 'Reserva en 15 minutos para asegurarlo',
    slotAlreadyBooked: 'Lo sentimos, este horario acaba de ser reservado',
    genericError: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    bookingCancelled: 'Reserva cancelada',
    preferredTime: 'Tu horario preferido ⭐',
    popularTimes: 'Horarios populares',
    bookYourUsual: 'Tu Reserva Habitual',
  },
  days: {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  },
  shortDays: {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom',
  },
  months: {
    january: 'Enero',
    february: 'Febrero',
    march: 'Marzo',
    april: 'Abril',
    may: 'Mayo',
    june: 'Junio',
    july: 'Julio',
    august: 'Agosto',
    september: 'Septiembre',
    october: 'Octubre',
    november: 'Noviembre',
    december: 'Diciembre',
  },
};

// ============================================================================
// PORTUGUESE (PT) TRANSLATIONS
// ============================================================================

const PT_TRANSLATIONS: TranslationBundle = {
  config: {
    code: 'pt',
    name: 'Português',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  buttons: {
    confirmButton: 'Confirmar',
    cancelButton: 'Cancelar',
    selectTimeButton: 'Selecionar horário',
    seeMoreButton: 'Ver mais',
    callSalonButton: 'Ligar salão',
    joinWaitlistButton: 'Lista de espera',
    bookNowButton: 'Reservar agora',
    backButton: 'Voltar',
    yesButton: 'Sim',
    noButton: 'Não',
    nextButton: 'Próximo',
    previousButton: 'Anterior',
  },
  messages: {
    availableTimes: 'Horários disponíveis em {day}:',
    tapToSelect: 'Toque para selecionar seu horário',
    noAvailableTimes: 'Sem horários disponíveis em {day}',
    nextAvailableTimes: 'Próximos horários disponíveis',
    bookingConfirmed: 'Reserva confirmada! ✅',
    appointmentDetails: 'Seu agendamento é em {date} às {time}',
    withMaster: 'Com {masterName}',
    serviceDetails: '{serviceName} • {duration} min • {price}',
    allSlotsBooked: 'Todos os horários estão reservados',
    joinWaitlistPrompt: 'Gostaria de entrar na lista de espera?',
    onWaitlist: 'Você está na lista de espera 📋',
    waitlistNotification: 'Vamos notificá-lo se abrir um horário',
    slotAvailable: 'Boas notícias! Um horário está disponível 🎉',
    bookWithinTime: 'Reserve em 15 minutos para garantir',
    slotAlreadyBooked: 'Desculpe, este horário acabou de ser reservado',
    genericError: 'Algo deu errado. Por favor, tente novamente.',
    bookingCancelled: 'Reserva cancelada',
    preferredTime: 'Seu horário preferido ⭐',
    popularTimes: 'Horários populares',
    bookYourUsual: 'Sua Reserva Habitual',
  },
  days: {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  },
  shortDays: {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
  },
  months: {
    january: 'Janeiro',
    february: 'Fevereiro',
    march: 'Março',
    april: 'Abril',
    may: 'Maio',
    june: 'Junho',
    july: 'Julho',
    august: 'Agosto',
    september: 'Setembro',
    october: 'Outubro',
    november: 'Novembro',
    december: 'Dezembro',
  },
};

// ============================================================================
// HEBREW (HE) TRANSLATIONS
// ============================================================================

const HE_TRANSLATIONS: TranslationBundle = {
  config: {
    code: 'he',
    name: 'עברית',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  buttons: {
    confirmButton: 'אישור',
    cancelButton: 'ביטול',
    selectTimeButton: 'בחירת שעה',
    seeMoreButton: 'עוד',
    callSalonButton: 'התקשרות למכון',
    joinWaitlistButton: 'רשימת המתנה',
    bookNowButton: 'קביעת תור',
    backButton: 'חזרה',
    yesButton: 'כן',
    noButton: 'לא',
    nextButton: 'הבא',
    previousButton: 'הקודם',
  },
  messages: {
    availableTimes: 'שעות פנויות ביום {day}:',
    tapToSelect: 'לחץ לבחירת השעה',
    noAvailableTimes: 'אין שעות פנויות ביום {day}',
    nextAvailableTimes: 'השעות הפנויות הבאות',
    bookingConfirmed: 'התור אושר! ✅',
    appointmentDetails: 'התור שלך ב-{date} בשעה {time}',
    withMaster: 'אצל {masterName}',
    serviceDetails: '{serviceName} • {duration} דקות • {price}',
    allSlotsBooked: 'כל השעות תפוסות',
    joinWaitlistPrompt: 'האם תרצה להצטרף לרשימת ההמתנה?',
    onWaitlist: 'אתה ברשימת ההמתנה 📋',
    waitlistNotification: 'נודיע לך אם תתפנה שעה',
    slotAvailable: 'חדשות טובות! יש שעה פנויה 🎉',
    bookWithinTime: 'קבע תור תוך 15 דקות כדי להבטיח',
    slotAlreadyBooked: 'סליחה, השעה הזו כבר נתפסה',
    genericError: 'משהו השתבש. נסה שוב.',
    bookingCancelled: 'התור בוטל',
    preferredTime: 'השעה המועדפת שלך ⭐',
    popularTimes: 'שעות פופולריות',
    bookYourUsual: 'התור הרגיל שלך',
  },
  days: {
    monday: 'יום שני',
    tuesday: 'יום שלישי',
    wednesday: 'יום רביעי',
    thursday: 'יום חמישי',
    friday: 'יום שישי',
    saturday: 'שבת',
    sunday: 'יום ראשון',
  },
  shortDays: {
    monday: "ב'",
    tuesday: "ג'",
    wednesday: "ד'",
    thursday: "ה'",
    friday: "ו'",
    saturday: "ש'",
    sunday: "א'",
  },
  months: {
    january: 'ינואר',
    february: 'פברואר',
    march: 'מרץ',
    april: 'אפריל',
    may: 'מאי',
    june: 'יוני',
    july: 'יולי',
    august: 'אוגוסט',
    september: 'ספטמבר',
    october: 'אוקטובר',
    november: 'נובמבר',
    december: 'דצמבר',
  },
};

// ============================================================================
// TRANSLATION MAP
// ============================================================================

/**
 * Map of all available translations
 */
export const TRANSLATIONS: Record<SupportedLanguage, TranslationBundle> = {
  en: EN_TRANSLATIONS,
  ru: RU_TRANSLATIONS,
  es: ES_TRANSLATIONS,
  pt: PT_TRANSLATIONS,
  he: HE_TRANSLATIONS,
};

/**
 * Default language fallback (Primary language is English)
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the translation bundle for a specific language
 *
 * @param language - The language code
 * @returns The translation bundle (falls back to English if not found)
 *
 * @example
 * ```typescript
 * const t = getTranslations('ru');
 * console.log(t.buttons.confirmButton); // "Подтвердить"
 * ```
 */
export function getTranslations(language: SupportedLanguage): TranslationBundle {
  return TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
}

/**
 * Checks if a language is supported
 *
 * @param language - The language code to check
 * @returns True if supported, false otherwise
 */
export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return language in TRANSLATIONS;
}

/**
 * Replaces placeholders in a translated string
 *
 * @param template - The template string with {placeholder} markers
 * @param values - Object with placeholder values
 * @returns The interpolated string
 *
 * @example
 * ```typescript
 * const template = "Your appointment is on {date} at {time}";
 * const result = interpolate(template, { date: "10/25/2024", time: "3:00 PM" });
 * // Returns: "Your appointment is on 10/25/2024 at 3:00 PM"
 * ```
 */
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Formats a date according to language preference
 *
 * @param date - The date to format
 * @param language - The language code
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * const date = new Date(2024, 9, 25); // October 25, 2024
 * formatDate(date, 'en'); // "10/25/2024"
 * formatDate(date, 'ru'); // "25/10/2024"
 * formatDate(date, 'he'); // "25/10/2024"
 * ```
 */
export function formatDate(date: Date, language: SupportedLanguage): string {
  const config = getTranslations(language).config;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (config.dateFormat) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Formats a time according to language preference
 *
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @param language - The language code
 * @returns Formatted time string
 *
 * @example
 * ```typescript
 * formatTime(15, 30, 'en'); // "3:30 PM"
 * formatTime(15, 30, 'ru'); // "15:30"
 * formatTime(9, 0, 'en'); // "9:00 AM"
 * ```
 */
export function formatTime(hours: number, minutes: number, language: SupportedLanguage): string {
  const config = getTranslations(language).config;
  const minutesStr = minutes.toString().padStart(2, '0');

  if (config.timeFormat === '24h') {
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutesStr}`;
  } else {
    // 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutesStr} ${period}`;
  }
}

/**
 * Gets the day name for a given day of week index
 *
 * @param dayIndex - Day of week (0 = Sunday, 6 = Saturday)
 * @param language - The language code
 * @param short - Use short form if true
 * @returns Day name in the specified language
 *
 * @example
 * ```typescript
 * getDayName(1, 'en'); // "Monday"
 * getDayName(1, 'en', true); // "Mon"
 * getDayName(1, 'ru'); // "Понедельник"
 * getDayName(1, 'ru', true); // "Пн"
 * ```
 */
export function getDayName(dayIndex: number, language: SupportedLanguage, short: boolean = false): string {
  const t = getTranslations(language);
  const days = short ? t.shortDays : t.days;

  const dayKeys: (keyof DayNames)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const key = dayKeys[dayIndex];

  return days[key] || '';
}

/**
 * Gets the month name for a given month index
 *
 * @param monthIndex - Month index (0 = January, 11 = December)
 * @param language - The language code
 * @returns Month name in the specified language
 *
 * @example
 * ```typescript
 * getMonthName(0, 'en'); // "January"
 * getMonthName(0, 'ru'); // "Январь"
 * getMonthName(11, 'es'); // "Diciembre"
 * ```
 */
export function getMonthName(monthIndex: number, language: SupportedLanguage): string {
  const t = getTranslations(language);
  const monthKeys: (keyof MonthNames)[] = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  const key = monthKeys[monthIndex];
  return t.months[key] || '';
}
