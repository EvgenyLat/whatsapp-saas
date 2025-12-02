import { Injectable, Logger } from '@nestjs/common';
import {
  SlotSuggestion,
  InteractiveMessagePayload,
  InteractiveButton,
  InteractiveSection,
} from './types/booking-intent.types';

/**
 * Interactive Card Builder Service
 *
 * Builds WhatsApp interactive messages (Reply Buttons or List Messages)
 * for the zero-typing booking flow
 *
 * @see specs/001-whatsapp-quick-booking Phase 3: Interactive Cards
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages
 */
@Injectable()
export class InteractiveCardBuilderService {
  private readonly logger = new Logger(InteractiveCardBuilderService.name);

  /**
   * Build interactive card for slot selection
   *
   * Uses Reply Buttons (max 3 slots) or List Message (4-10 slots)
   *
   * @param slots - Available time slots
   * @param language - Language code
   * @param message - Optional custom message to display
   * @returns Interactive message payload
   */
  buildSlotSelectionCard(
    slots: SlotSuggestion[],
    language: string = 'en',
    message?: string, // New optional parameter
  ): InteractiveMessagePayload {
    this.logger.debug(`Building slot selection card for ${slots.length} slots`);

    if (slots.length === 0) {
      throw new Error('No slots provided for card building');
    }

    // Use Reply Buttons for 1-3 slots, List Message for 4-10 slots
    if (slots.length <= 3) {
      return this.buildButtonCard(slots, language, message);
    } else {
      return this.buildListCard(slots, language, message);
    }
  }

  /**
   * Build choice navigation card
   *
   * Creates a card with 2-3 choice buttons for navigation
   * (e.g., "Same day, different time" vs "Different day, same time")
   *
   * @param options - Card configuration
   * @returns Interactive message payload
   *
   * @example
   * buildChoiceCard({
   *   language: 'ru',
   *   message: 'К сожалению, 15:00 занято...',
   *   choices: [
   *     { id: 'same_day_diff_time', label: '✅ Пятница, но другое время', emoji: '✅' },
   *     { id: 'diff_day_same_time', label: '📅 Другой день, но в 15:00', emoji: '📅' }
   *   ],
   *   customerPhone: '+1234567890'
   * })
   */
  buildChoiceCard(options: {
    language: string;
    message: string;
    choices: Array<{
      id: string;
      label: string;
      emoji: string;
    }>;
    customerPhone: string;
  }): InteractiveMessagePayload {
    this.logger.debug(`Building choice card with ${options.choices.length} choices`);

    const buttons: InteractiveButton[] = options.choices.map((choice) => ({
      type: 'reply',
      reply: {
        id: `choice_${choice.id}`,
        title: choice.label,
      },
    }));

    return {
      type: 'button',
      body: {
        text: options.message,
      },
      action: {
        buttons,
      },
    };
  }

  /**
   * Build Reply Buttons card (1-3 options)
   */
  private buildButtonCard(
    slots: SlotSuggestion[],
    language: string,
    message?: string, // New optional parameter
  ): InteractiveMessagePayload {
    const buttons: InteractiveButton[] = slots.slice(0, 3).map((slot) => ({
      type: 'reply',
      reply: {
        id: `slot_${slot.id}`,
        title: this.formatSlotButton(slot, language),
      },
    }));

    return {
      type: 'button',
      header: message
        ? {
            type: 'text',
            text: message,
          }
        : {
            type: 'text',
            text: this.getHeaderText(language),
          },
      body: {
        text: this.getBodyText(slots[0].serviceName, language),
      },
      footer: {
        text: this.getFooterText(language),
      },
      action: {
        buttons,
      },
    };
  }

  /**
   * Build List Message card (4-10 options)
   */
  private buildListCard(
    slots: SlotSuggestion[],
    language: string,
    message?: string, // New optional parameter
  ): InteractiveMessagePayload {
    // Group slots by date for better organization
    const slotsByDate = this.groupSlotsByDate(slots);

    const sections: InteractiveSection[] = [];

    for (const [date, dateSlots] of Object.entries(slotsByDate)) {
      sections.push({
        title: this.formatDate(date, language),
        rows: dateSlots.map((slot) => ({
          id: `slot_${slot.id}`,
          title: this.formatSlotTitle(slot, language),
          description: this.formatSlotDescription(slot, language),
        })),
      });
    }

    return {
      type: 'list',
      header: message
        ? {
            type: 'text',
            text: message,
          }
        : {
            type: 'text',
            text: this.getHeaderText(language),
          },
      body: {
        text: this.getBodyText(slots[0].serviceName, language),
      },
      footer: {
        text: this.getFooterText(language),
      },
      action: {
        button: this.getListButtonText(language),
        sections,
      },
    };
  }

  /**
   * Build booking confirmation card
   */
  buildConfirmationCard(slot: SlotSuggestion, language: string = 'en'): InteractiveMessagePayload {
    this.logger.debug(`Building confirmation card for slot ${slot.id}`);

    return {
      type: 'button',
      body: {
        text: this.getConfirmationText(slot, language),
      },
      footer: {
        text: this.getFooterText(language),
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `confirm_${slot.id}`,
              title: this.getConfirmButtonText(language),
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'action_change_slot',
              title: this.getChangeButtonText(language),
            },
          },
        ],
      },
    };
  }

  /**
   * Build alternative slots card
   *
   * Shows ranked alternative slots when original slot is unavailable.
   * Each alternative includes proximity indicators (star + proximity text).
   *
   * @param alternatives - Array of ranked alternative slots with indicators
   * @param language - Target language
   * @param headerMessage - Optional custom header message
   * @returns Interactive message payload with alternative slots
   *
   * @example
   * buildAlternativeSlotsCard(
   *   [
   *     { id: '1', displayText: '⭐ 14:30 (30 minutes later)', ... },
   *     { id: '2', displayText: '⭐ 13:30 (30 minutes earlier)', ... },
   *     { id: '3', displayText: '⭐ 14:00 Tomorrow', ... }
   *   ],
   *   'en',
   *   'This time is no longer available. Here are nearby alternatives:'
   * )
   */
  buildAlternativeSlotsCard(
    alternatives: any[], // RankedSlot[] with displayText
    language: string = 'en',
    headerMessage?: string,
  ): InteractiveMessagePayload {
    this.logger.debug(`Building alternative slots card for ${alternatives.length} alternatives`);

    if (alternatives.length === 0) {
      throw new Error('No alternatives provided for card building');
    }

    // Convert RankedSlot to SlotSuggestion format for card builder
    const slots: SlotSuggestion[] = alternatives.map((alt) => ({
      id: alt.id,
      date: alt.date,
      startTime: alt.startTime,
      endTime: alt.endTime,
      masterId: alt.masterId,
      masterName: alt.masterName,
      serviceId: alt.serviceId,
      serviceName: alt.serviceName,
      duration: alt.duration,
      price: alt.price,
      // Add displayText for enriched display
      displayText: alt.displayText,
    }));

    // Use existing slot selection card builder with custom message
    return this.buildSlotSelectionCard(slots, language, headerMessage);
  }

  /**
   * Group slots by date
   */
  private groupSlotsByDate(slots: SlotSuggestion[]): Record<string, SlotSuggestion[]> {
    const grouped: Record<string, SlotSuggestion[]> = {};

    for (const slot of slots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    }

    return grouped;
  }

  /**
   * Format slot for button (max 20 chars)
   */
  private formatSlotButton(slot: SlotSuggestion, language: string): string {
    const day = this.formatDateShort(slot.date, language);
    return `${day} ${slot.startTime}`;
  }

  /**
   * Format slot title for list row (max 24 chars)
   */
  private formatSlotTitle(slot: SlotSuggestion, _language: string): string {
    return `${slot.startTime} - ${slot.masterName}`;
  }

  /**
   * Format slot description for list row
   */
  private formatSlotDescription(slot: SlotSuggestion, language: string): string {
    const price = this.formatPrice(slot.price, language);
    const duration = this.formatDuration(slot.duration, language);
    return `${duration} • ${price}`;
  }

  /**
   * Format date (e.g., "Friday, Oct 25")
   */
  private formatDate(dateStr: string, language: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString(this.getLocale(language), options);
  }

  /**
   * Format date short (e.g., "Fri 25")
   */
  private formatDateShort(dateStr: string, language: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString(this.getLocale(language), options);
  }

  /**
   * Format price
   */
  private formatPrice(priceInCents: number, language: string): string {
    const price = priceInCents / 100;
    return new Intl.NumberFormat(this.getLocale(language), {
      style: 'currency',
      currency: this.getCurrency(language),
    }).format(price);
  }

  /**
   * Format duration
   */
  private formatDuration(minutes: number, _language: string): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  /**
   * Get locale for language
   */
  private getLocale(language: string): string {
    const locales: Record<string, string> = {
      en: 'en-US',
      ru: 'ru-RU',
      es: 'es-ES',
      pt: 'pt-BR',
      he: 'he-IL',
    };
    return locales[language] || 'en-US';
  }

  /**
   * Get currency for language
   */
  private getCurrency(language: string): string {
    const currencies: Record<string, string> = {
      en: 'USD',
      ru: 'RUB',
      es: 'EUR',
      pt: 'BRL',
      he: 'ILS',
    };
    return currencies[language] || 'USD';
  }

  // Localized text methods
  private getHeaderText(language: string): string {
    const texts: Record<string, string> = {
      en: 'Available Times',
      ru: 'Доступное время',
      es: 'Horarios Disponibles',
      pt: 'Horários Disponíveis',
      he: 'זמנים פנויים',
    };
    return texts[language] || texts.en;
  }

  private getBodyText(serviceName: string, language: string): string {
    const templates: Record<string, string> = {
      en: `Choose a time for ${serviceName}:`,
      ru: `Выберите время для ${serviceName}:`,
      es: `Elige un horario para ${serviceName}:`,
      pt: `Escolha um horário para ${serviceName}:`,
      he: `בחר זמן עבור ${serviceName}:`,
    };
    return templates[language] || templates.en;
  }

  private getFooterText(language: string): string {
    const texts: Record<string, string> = {
      en: 'Tap to book instantly',
      ru: 'Нажмите, чтобы забронировать',
      es: 'Toca para reservar',
      pt: 'Toque para reservar',
      he: 'הקש כדי להזמין',
    };
    return texts[language] || texts.en;
  }

  private getListButtonText(language: string): string {
    const texts: Record<string, string> = {
      en: 'View Times',
      ru: 'Показать время',
      es: 'Ver Horarios',
      pt: 'Ver Horários',
      he: 'הצג זמנים',
    };
    return texts[language] || texts.en;
  }

  private getConfirmationText(slot: SlotSuggestion, language: string): string {
    const date = this.formatDate(slot.date, language);
    const templates: Record<string, string> = {
      en: `Confirm booking:\n\n${slot.serviceName}\n${date} at ${slot.startTime}\nwith ${slot.masterName}`,
      ru: `Подтвердите бронирование:\n\n${slot.serviceName}\n${date} в ${slot.startTime}\nу ${slot.masterName}`,
      es: `Confirmar reserva:\n\n${slot.serviceName}\n${date} a las ${slot.startTime}\ncon ${slot.masterName}`,
      pt: `Confirmar reserva:\n\n${slot.serviceName}\n${date} às ${slot.startTime}\ncom ${slot.masterName}`,
      he: `אשר הזמנה:\n\n${slot.serviceName}\n${date} בשעה ${slot.startTime}\nעם ${slot.masterName}`,
    };
    return templates[language] || templates.en;
  }

  private getConfirmButtonText(language: string): string {
    const texts: Record<string, string> = {
      en: 'Confirm',
      ru: 'Подтвердить',
      es: 'Confirmar',
      pt: 'Confirmar',
      he: 'אישור',
    };
    return texts[language] || texts.en;
  }

  private getChangeButtonText(language: string): string {
    const texts: Record<string, string> = {
      en: 'Change',
      ru: 'Изменить',
      es: 'Cambiar',
      pt: 'Mudar',
      he: 'שנה',
    };
    return texts[language] || texts.en;
  }
}
