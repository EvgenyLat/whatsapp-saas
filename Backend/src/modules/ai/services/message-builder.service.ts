/**
 * MessageBuilderService - Multi-language empathetic message generation
 *
 * @module ai/services/message-builder
 * @description Generates contextual empathetic messages in 5 languages
 * Supporting Russian, English, Spanish, Portuguese, and Hebrew
 */

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Language, MessageKey, ChoiceLabelKey } from '../types/choice.types';

/**
 * Empathetic message templates
 * Supporting 5 languages with contextual parameters
 */
const MESSAGES: Record<MessageKey, Record<Language, string>> = {
  SLOT_TAKEN: {
    ru: 'К сожалению, {time} в {day} уже занято 😔\n\nНо не переживайте! Я нашёл отличные варианты 🎯\n\nЧто вам удобнее?',
    en: "Unfortunately, {time} on {day} is already booked 😔\n\nBut don't worry! I found great options 🎯\n\nWhat works better for you?",
    es: 'Desafortunadamente, {time} el {day} ya está reservado 😔\n\n¡Pero no te preocupes! Encontré excelentes opciones 🎯\n\n¿Qué te conviene más?',
    pt: 'Infelizmente, {time} na {day} já está reservado 😔\n\nMas não se preocupe! Encontrei ótimas opções 🎯\n\nO que funciona melhor para você?',
    he: 'למרבה הצער, {time} ביום {day} כבר תפוס 😔\n\nאבל אל דאגה! מצאתי אפשרויות מעולות 🎯\n\nמה נוח לך יותר?',
  },

  SAME_DAY_OPTIONS: {
    ru: 'Вот свободные слоты на {day} рядом с {time}:',
    en: 'Here are free slots on {day} near {time}:',
    es: 'Aquí están los horarios libres el {day} cerca de {time}:',
    pt: 'Aqui estão os horários livres na {day} perto de {time}:',
    he: 'הנה משבצות פנויות ביום {day} ליד {time}:',
  },

  DIFF_DAY_OPTIONS: {
    ru: 'Вот доступные дни с {time}:',
    en: 'Here are available days at {time}:',
    es: 'Aquí están los días disponibles a las {time}:',
    pt: 'Aqui estão os dias disponíveis às {time}:',
    he: 'הנה ימים זמינים בשעה {time}:',
  },

  ALL_DAY_BUSY: {
    ru: 'Ой! {day} полностью забронирована 📅\n\nМы очень популярны в этот день! 🎉\n\nНо у меня есть для вас варианты:',
    en: "Oh! {day} is fully booked 📅\n\nWe're very popular that day! 🎉\n\nBut I have options for you:",
    es: '¡Oh! {day} está completamente reservado 📅\n\n¡Somos muy populares ese día! 🎉\n\nPero tengo opciones para ti:',
    pt: 'Oh! {day} está totalmente reservado 📅\n\nSomos muito populares nesse dia! 🎉\n\nMas tenho opções para você:',
    he: 'אופס! {day} תפוס לגמרי 📅\n\nאנחנו מאוד פופולריים באותו יום! 🎉\n\nאבל יש לי אפשרויות עבורך:',
  },

  SLOT_AVAILABLE: {
    ru: 'Отлично! {day} в {time} свободна 🎉\n\nВот доступные мастера на это время:',
    en: 'Great! {day} at {time} is available 🎉\n\nHere are available masters at this time:',
    es: '¡Genial! {day} a las {time} está disponible 🎉\n\nAquí están los maestros disponibles:',
    pt: 'Ótimo! {day} às {time} está disponível 🎉\n\nAqui estão os mestres disponíveis:',
    he: 'מעולה! {day} בשעה {time} פנוי 🎉\n\nהנה המומחים הזמינים בשעה זו:',
  },

  NO_ALTERNATIVES: {
    ru: 'К сожалению, я не нашёл подходящих вариантов в ближайшее время 😔\n\nПопробуйте выбрать другую дату или свяжитесь с салоном напрямую 📞',
    en: "Unfortunately, I couldn't find suitable options in the near future 😔\n\nTry selecting a different date or contact the salon directly 📞",
    es: 'Desafortunadamente, no encontré opciones adecuadas en el futuro cercano 😔\n\nIntenta seleccionar otra fecha o contacta al salón directamente 📞',
    pt: 'Infelizmente, não encontrei opções adequadas no futuro próximo 😔\n\nTente selecionar outra data ou entre em contato com o salão diretamente 📞',
    he: 'למרבה הצער, לא מצאתי אפשרויות מתאימות בזמן הקרוב 😔\n\nנסו לבחור תאריך אחר או צרו קשר עם הסלון ישירות 📞',
  },

  SESSION_EXPIRED: {
    ru: 'Ваша сессия истекла ⏰\n\nПожалуйста, начните заново, написав желаемую услугу и время.',
    en: 'Your session has expired ⏰\n\nPlease start over by typing your desired service and time.',
    es: 'Tu sesión ha expirado ⏰\n\nPor favor, comienza de nuevo escribiendo el servicio y hora deseados.',
    pt: 'Sua sessão expirou ⏰\n\nPor favor, comece novamente digitando o serviço e horário desejados.',
    he: 'הסשן שלך פג תוקף ⏰\n\nאנא התחל מחדש על ידי הקלדת השירות והזמן הרצויים.',
  },

  ERROR: {
    ru: 'Произошла ошибка при обработке вашего запроса 🙏\n\nПожалуйста, попробуйте ещё раз или свяжитесь с салоном.',
    en: 'An error occurred while processing your request 🙏\n\nPlease try again or contact the salon.',
    es: 'Se produjo un error al procesar tu solicitud 🙏\n\nPor favor, inténtalo de nuevo o contacta al salón.',
    pt: 'Ocorreu um erro ao processar sua solicitação 🙏\n\nPor favor, tente novamente ou entre em contato com o salão.',
    he: 'אירעה שגיאה בעיבוד הבקשה שלך 🙏\n\nאנא נסה שוב או צור קשר עם הסלון.',
  },

  POPULAR_TIMES: {
    ru: 'Вот популярные времена, когда обычно есть места ✨',
    en: 'Here are popular times when slots are usually available ✨',
    es: 'Aquí están los horarios populares cuando suele haber disponibilidad ✨',
    pt: 'Aqui estão os horários populares quando geralmente há disponibilidade ✨',
    he: 'הנה הזמנים הפופולריים שבהם בדרך כלל יש מקום ✨',
  },
};

/**
 * Choice button labels
 */
const CHOICE_LABELS: Record<ChoiceLabelKey, Record<Language, string>> = {
  SAME_DAY_DIFF_TIME: {
    ru: '✅ {day}, но другое время',
    en: '✅ {day}, but different time',
    es: '✅ {day}, pero diferente hora',
    pt: '✅ {day}, mas horário diferente',
    he: '✅ {day}, אבל שעה אחרת',
  },

  DIFF_DAY_SAME_TIME: {
    ru: '📅 Другой день, но в {time}',
    en: '📅 Different day, but at {time}',
    es: '📅 Otro día, pero a las {time}',
    pt: '📅 Dia diferente, mas às {time}',
    he: '📅 יום אחר, אבל בשעה {time}',
  },

  POPULAR_TIMES: {
    ru: '✨ Популярные времена',
    en: '✨ Popular times',
    es: '✨ Horarios populares',
    pt: '✨ Horários populares',
    he: '✨ זמנים פופולריים',
  },

  SEE_MORE: {
    ru: '👀 Показать ещё',
    en: '👀 Show more',
    es: '👀 Mostrar más',
    pt: '👀 Mostrar mais',
    he: '👀 הצג עוד',
  },

  CALL_SALON: {
    ru: '📞 Позвонить в салон',
    en: '📞 Call salon',
    es: '📞 Llamar al salón',
    pt: '📞 Ligar para o salão',
    he: '📞 התקשר לסלון',
  },
};

/**
 * MessageBuilderService
 *
 * Provides multi-language empathetic message generation
 * with parameter interpolation and template caching
 */
@Injectable()
export class MessageBuilderService {
  private readonly logger = new Logger(MessageBuilderService.name);

  /**
   * Get a message by key with parameter interpolation
   *
   * @param key - Message template key
   * @param language - Target language
   * @param params - Parameters to interpolate
   * @returns Formatted message string
   *
   * @example
   * getMessage('SLOT_TAKEN', 'ru', { time: '15:00', day: 'пятница' })
   * // => "К сожалению, 15:00 в пятница уже занято 😔..."
   */
  getMessage(key: MessageKey, language: Language = 'en', params?: Record<string, any>): string {
    try {
      // Get template for language, fallback to English if not found
      const template = MESSAGES[key]?.[language] || MESSAGES[key]?.en;

      if (!template) {
        this.logger.error(`Message template not found for key: ${key}`);
        return 'An error occurred. Please try again later.';
      }

      // Interpolate parameters
      if (params) {
        return this.interpolate(template, params);
      }

      return template;
    } catch (error) {
      this.logger.error(
        `Error building message: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return 'An error occurred. Please try again later.';
    }
  }

  /**
   * Get a choice button label
   *
   * @param choiceType - Type of choice
   * @param language - Target language
   * @param params - Parameters to interpolate
   * @returns Formatted choice label
   *
   * @example
   * getChoiceLabel('SAME_DAY_DIFF_TIME', 'en', { day: 'Friday' })
   * // => "✅ Friday, but different time"
   */
  getChoiceLabel(
    choiceType: ChoiceLabelKey,
    language: Language = 'en',
    params?: Record<string, any>,
  ): string {
    try {
      // Get label for language, fallback to English
      const template = CHOICE_LABELS[choiceType]?.[language] || CHOICE_LABELS[choiceType]?.en;

      if (!template) {
        this.logger.error(`Choice label not found for type: ${choiceType}`);
        return 'Select';
      }

      // Interpolate parameters
      if (params) {
        return this.interpolate(template, params);
      }

      return template;
    } catch (error) {
      this.logger.error(
        `Error building choice label: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return 'Select';
    }
  }

  /**
   * Interpolate parameters into template string
   *
   * @param template - Template string with {param} placeholders
   * @param params - Parameters to replace
   * @returns Interpolated string
   *
   * @private
   */
  private interpolate(template: string, params: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return result;
  }

  /**
   * Format date for display in specified language
   *
   * @param date - ISO date string
   * @param language - Target language
   * @returns Formatted date string
   *
   * @example
   * formatDate('2025-10-25', 'ru') // => "пятница"
   * formatDate('2025-10-25', 'en') // => "Friday"
   */
  formatDate(date: string, language: Language = 'en'): string {
    try {
      const d = new Date(date);

      // Map language codes to locale codes
      const localeMap: Record<Language, string> = {
        en: 'en-US',
        ru: 'ru-RU',
        es: 'es-ES',
        pt: 'pt-BR',
        he: 'he-IL',
      };

      const locale = localeMap[language] || 'en-US';

      // Format as weekday
      const formatter = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        timeZone: 'UTC', // Ensure consistent timezone handling
      });

      return formatter.format(d);
    } catch (error) {
      this.logger.error(
        `Error formatting date: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return date; // Return original if formatting fails
    }
  }

  /**
   * Format time for display
   *
   * @param time - Time in HH:mm format
   * @param language - Target language (for future localization)
   * @returns Formatted time string
   */
  formatTime(time: string, _language: Language = 'en'): string {
    // Currently just returns the time as-is
    // Could be extended for 12/24 hour format based on locale
    return time;
  }

  /**
   * Get proximity text for time differences
   *
   * @param diffMinutes - Difference in minutes
   * @param language - Target language
   * @returns Localized proximity text
   *
   * @example
   * getProximityText(-60, 'ru') // => "1 час раньше"
   * getProximityText(120, 'en') // => "2 hours later"
   */
  getProximityText(diffMinutes: number, language: Language = 'en'): string {
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;

    const isEarlier = diffMinutes < 0;

    const proximityTexts: Record<Language, { earlier: string; later: string }> = {
      ru: {
        earlier:
          hours > 0
            ? `${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')} раньше`
            : `${minutes} ${this.pluralize(minutes, 'минута', 'минуты', 'минут')} раньше`,
        later:
          hours > 0
            ? `${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')} позже`
            : `${minutes} ${this.pluralize(minutes, 'минута', 'минуты', 'минут')} позже`,
      },
      en: {
        earlier:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hour' : 'hours'} earlier`
            : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} earlier`,
        later:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hour' : 'hours'} later`
            : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} later`,
      },
      es: {
        earlier:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hora' : 'horas'} antes`
            : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} antes`,
        later:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hora' : 'horas'} después`
            : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} después`,
      },
      pt: {
        earlier:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hora' : 'horas'} antes`
            : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} antes`,
        later:
          hours > 0
            ? `${hours} ${hours === 1 ? 'hora' : 'horas'} depois`
            : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} depois`,
      },
      he: {
        earlier:
          hours > 0
            ? `${hours} ${hours === 1 ? 'שעה' : 'שעות'} קודם`
            : `${minutes} ${minutes === 1 ? 'דקה' : 'דקות'} קודם`,
        later:
          hours > 0
            ? `${hours} ${hours === 1 ? 'שעה' : 'שעות'} אחרי`
            : `${minutes} ${minutes === 1 ? 'דקה' : 'דקות'} אחרי`,
      },
    };

    const texts = proximityTexts[language] || proximityTexts.ru;
    return isEarlier ? texts.earlier : texts.later;
  }

  /**
   * Build message for alternative slot suggestions
   *
   * Used when original slot is unavailable and alternatives are found
   *
   * @param alternatives - Array of ranked alternative slots
   * @param language - Target language
   * @returns Formatted message with alternatives header
   *
   * @example
   * buildAlternativeSlotsMessage(rankedSlots, 'en')
   * // => "This time is no longer available. Here are nearby alternatives:"
   */
  buildAlternativeSlotsMessage(alternatives: any[], language: Language = 'en'): string {
    if (alternatives.length === 0) {
      return this.getMessage('NO_ALTERNATIVES', language);
    }

    const messages: Record<Language, string> = {
      en: 'This time is no longer available. Here are nearby alternatives:',
      ru: 'Это время уже занято. Вот ближайшие альтернативы:',
      es: 'Este horario ya no está disponible. Aquí hay alternativas cercanas:',
      pt: 'Este horário não está mais disponível. Aqui estão alternativas próximas:',
      he: 'זמן זה כבר לא זמין. הנה אלטרנטיבות קרובות:',
    };

    return messages[language] || messages.en;
  }

  /**
   * Russian pluralization helper
   *
   * @private
   */
  private pluralize(n: number, one: string, two: string, five: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod100 >= 11 && mod100 <= 14) {
      return five;
    }

    if (mod10 === 1) {
      return one;
    }

    if (mod10 >= 2 && mod10 <= 4) {
      return two;
    }

    return five;
  }
}
