import { Service, Master } from '@prisma/client';

/**
 * Confirmation Formatter Helper
 *
 * Formats booking confirmations with all relevant details
 * in multiple languages
 */

export interface BookingDetails {
  bookingCode: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  masterName: string;
  dateTime: Date;
  customerName: string;
  currency?: string;
}

export class ConfirmationFormatter {
  /**
   * Format booking confirmation message
   */
  static formatConfirmation(
    details: BookingDetails,
    language: string = 'en'
  ): string {
    const currency = details.currency || '₽';

    switch (language) {
      case 'ru':
        return this.formatRussian(details, currency);
      case 'en':
        return this.formatEnglish(details, currency);
      case 'es':
        return this.formatSpanish(details, currency);
      case 'pt':
        return this.formatPortuguese(details, currency);
      case 'he':
        return this.formatHebrew(details, currency);
      default:
        return this.formatEnglish(details, currency);
    }
  }

  /**
   * Format in Russian
   */
  private static formatRussian(details: BookingDetails, currency: string): string {
    const date = this.formatDateRussian(details.dateTime);
    const time = this.formatTime(details.dateTime);
    const price = `${details.servicePrice}${currency}`;

    return `✅ Запись подтверждена!

📋 Детали записи:
━━━━━━━━━━━━━━━━━━━━
👤 Имя: ${details.customerName}
💅 Услуга: ${details.serviceName}
⏱ Длительность: ${details.serviceDuration} мин
💰 Стоимость: ${price}
👨‍🎨 Мастер: ${details.masterName}
📅 Дата: ${date}
🕐 Время: ${time}
🔖 Код брони: ${details.bookingCode}
━━━━━━━━━━━━━━━━━━━━

⚠️ Важно:
• Если нужно отменить или перенести запись, сообщите за 24 часа
• Опоздание более 15 минут может привести к отмене записи
• Оплата принимается наличными и картой

Ждем вас! 🌟`;
  }

  /**
   * Format in English
   */
  private static formatEnglish(details: BookingDetails, currency: string): string {
    const date = this.formatDateEnglish(details.dateTime);
    const time = this.formatTime(details.dateTime);
    const price = `${currency}${details.servicePrice}`;

    return `✅ Booking Confirmed!

📋 Booking Details:
━━━━━━━━━━━━━━━━━━━━
👤 Name: ${details.customerName}
💅 Service: ${details.serviceName}
⏱ Duration: ${details.serviceDuration} min
💰 Price: ${price}
👨‍🎨 Stylist: ${details.masterName}
📅 Date: ${date}
🕐 Time: ${time}
🔖 Booking Code: ${details.bookingCode}
━━━━━━━━━━━━━━━━━━━━

⚠️ Important:
• Please notify us 24 hours in advance to cancel or reschedule
• Arriving more than 15 minutes late may result in cancellation
• We accept cash and card payments

See you soon! 🌟`;
  }

  /**
   * Format in Spanish
   */
  private static formatSpanish(details: BookingDetails, currency: string): string {
    const date = this.formatDateSpanish(details.dateTime);
    const time = this.formatTime(details.dateTime);
    const price = `${currency}${details.servicePrice}`;

    return `✅ ¡Reserva Confirmada!

📋 Detalles de la Reserva:
━━━━━━━━━━━━━━━━━━━━
👤 Nombre: ${details.customerName}
💅 Servicio: ${details.serviceName}
⏱ Duración: ${details.serviceDuration} min
💰 Precio: ${price}
👨‍🎨 Estilista: ${details.masterName}
📅 Fecha: ${date}
🕐 Hora: ${time}
🔖 Código: ${details.bookingCode}
━━━━━━━━━━━━━━━━━━━━

⚠️ Importante:
• Notifique con 24 horas de anticipación para cancelar o reprogramar
• Llegar más de 15 minutos tarde puede resultar en cancelación
• Aceptamos pagos en efectivo y tarjeta

¡Hasta pronto! 🌟`;
  }

  /**
   * Format in Portuguese
   */
  private static formatPortuguese(details: BookingDetails, currency: string): string {
    const date = this.formatDatePortuguese(details.dateTime);
    const time = this.formatTime(details.dateTime);
    const price = `${currency}${details.servicePrice}`;

    return `✅ Agendamento Confirmado!

📋 Detalhes do Agendamento:
━━━━━━━━━━━━━━━━━━━━
👤 Nome: ${details.customerName}
💅 Serviço: ${details.serviceName}
⏱ Duração: ${details.serviceDuration} min
💰 Preço: ${price}
👨‍🎨 Profissional: ${details.masterName}
📅 Data: ${date}
🕐 Horário: ${time}
🔖 Código: ${details.bookingCode}
━━━━━━━━━━━━━━━━━━━━

⚠️ Importante:
• Avise com 24 horas de antecedência para cancelar ou remarcar
• Chegar mais de 15 minutos atrasado pode resultar em cancelamento
• Aceitamos pagamento em dinheiro e cartão

Até breve! 🌟`;
  }

  /**
   * Format in Hebrew
   */
  private static formatHebrew(details: BookingDetails, currency: string): string {
    const date = this.formatDateHebrew(details.dateTime);
    const time = this.formatTime(details.dateTime);
    const price = `${details.servicePrice}${currency}`;

    return `✅ התור אושר!

📋 פרטי התור:
━━━━━━━━━━━━━━━━━━━━
👤 שם: ${details.customerName}
💅 שירות: ${details.serviceName}
⏱ משך: ${details.serviceDuration} דקות
💰 מחיר: ${price}
👨‍🎨 מעצב: ${details.masterName}
📅 תאריך: ${date}
🕐 שעה: ${time}
🔖 קוד הזמנה: ${details.bookingCode}
━━━━━━━━━━━━━━━━━━━━

⚠️ חשוב:
• יש להודיע 24 שעות מראש לביטול או שינוי תור
• איחור של יותר מ-15 דקות עלול לגרום לביטול התור
• מקבלים תשלום במזומן ובכרטיס

נתראה בקרוב! 🌟`;
  }

  /**
   * Format date in Russian
   */
  private static formatDateRussian(date: Date): string {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const dayOfWeek = days[date.getDay()];

    return `${day} ${month}, ${dayOfWeek}`;
  }

  /**
   * Format date in English
   */
  private static formatDateEnglish(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Format date in Spanish
   */
  private static formatDateSpanish(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('es-ES', options);
  }

  /**
   * Format date in Portuguese
   */
  private static formatDatePortuguese(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('pt-BR', options);
  }

  /**
   * Format date in Hebrew
   */
  private static formatDateHebrew(date: Date): string {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const dayOfWeek = days[date.getDay()];

    return `יום ${dayOfWeek}, ${day} ב${month}`;
  }

  /**
   * Format time (24-hour format)
   */
  private static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format price with currency
   */
  static formatPrice(
    price: number,
    currency: string,
    language: string = 'en'
  ): string {
    if (language === 'ru' || language === 'he') {
      return `${price}${currency}`;
    } else {
      return `${currency}${price}`;
    }
  }

  /**
   * Format duration
   */
  static formatDuration(
    minutes: number,
    language: string = 'en'
  ): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (language === 'ru') {
      if (hours > 0 && mins > 0) {
        return `${hours} ч ${mins} мин`;
      } else if (hours > 0) {
        return `${hours} ч`;
      } else {
        return `${mins} мин`;
      }
    } else if (language === 'en') {
      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}m`;
      }
    } else if (language === 'es' || language === 'pt') {
      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}min`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}min`;
      }
    } else if (language === 'he') {
      if (hours > 0 && mins > 0) {
        return `${hours} שעות ${mins} דקות`;
      } else if (hours > 0) {
        return `${hours} שעות`;
      } else {
        return `${mins} דקות`;
      }
    }

    return `${minutes} min`;
  }
}
