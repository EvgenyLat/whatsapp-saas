import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * Usage Tracking Service
 *
 * Отслеживает использование для бесплатного плана (Free Trial)
 * БЕЗ платежей - для тестирования функционала
 *
 * Функции:
 * - Инкремент счетчиков сообщений/бронирований
 * - Проверка лимитов перед операциями
 * - Автоматический сброс счетчиков (ежемесячно)
 * - Уведомления о достижении лимитов (80%, 90%, 100%)
 *
 * Лимиты бесплатного плана:
 * - 1000 AI сообщений/месяц
 * - 500 бронирований/месяц
 */

export interface UsageStats {
  salon_id: string;
  salon_name: string;
  trial_status: string;
  trial_started_at: Date;

  // Лимиты
  usage_limit_messages: number;
  usage_limit_bookings: number;

  // Текущее использование
  usage_current_messages: number;
  usage_current_bookings: number;

  // Процент использования
  messages_usage_percent: number;
  bookings_usage_percent: number;

  // Статус лимитов
  messages_limit_reached: boolean;
  bookings_limit_reached: boolean;

  // Дата сброса
  usage_reset_at: Date;
  days_until_reset: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  usage_percent: number;
  warning_level?: 'none' | 'warning_80' | 'warning_90' | 'limit_reached';
  message?: string;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  // Пороги для уведомлений
  private readonly WARNING_THRESHOLD_80 = 0.8; // 80%
  private readonly WARNING_THRESHOLD_90 = 0.9; // 90%

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверить, можно ли отправить AI сообщение (не превышен лимит)
   *
   * @param salon_id ID салона
   * @returns Результат проверки лимита
   */
  async checkMessageLimit(salon_id: string): Promise<UsageCheckResult> {
    const salon = await this.getSalonUsage(salon_id);

    if (!salon) {
      throw new Error(`Salon ${salon_id} not found`);
    }

    // Проверить, нужен ли сброс счетчиков
    await this.checkAndResetUsageIfNeeded(salon_id);

    const current = salon.usage_current_messages;
    const limit = salon.usage_limit_messages;
    const usage_percent = limit > 0 ? current / limit : 0;

    // Определить уровень предупреждения
    let warning_level: UsageCheckResult['warning_level'] = 'none';
    let message = '';

    if (current >= limit) {
      warning_level = 'limit_reached';
      message = `Достигнут лимит AI сообщений (${limit}/месяц). Счетчики обнулятся ${this.formatDate(salon.usage_reset_at)}.`;
    } else if (usage_percent >= this.WARNING_THRESHOLD_90) {
      warning_level = 'warning_90';
      message = `Использовано ${Math.round(usage_percent * 100)}% лимита AI сообщений (${current}/${limit}).`;
    } else if (usage_percent >= this.WARNING_THRESHOLD_80) {
      warning_level = 'warning_80';
      message = `Использовано ${Math.round(usage_percent * 100)}% лимита AI сообщений (${current}/${limit}).`;
    }

    const allowed = current < limit;

    if (!allowed) {
      this.logger.warn(`Salon ${salon_id} reached message limit: ${current}/${limit}`);
    }

    return {
      allowed,
      current_usage: current,
      limit,
      usage_percent,
      warning_level,
      message,
    };
  }

  /**
   * Проверить, можно ли создать бронирование (не превышен лимит)
   *
   * @param salon_id ID салона
   * @returns Результат проверки лимита
   */
  async checkBookingLimit(salon_id: string): Promise<UsageCheckResult> {
    const salon = await this.getSalonUsage(salon_id);

    if (!salon) {
      throw new Error(`Salon ${salon_id} not found`);
    }

    await this.checkAndResetUsageIfNeeded(salon_id);

    const current = salon.usage_current_bookings;
    const limit = salon.usage_limit_bookings;
    const usage_percent = limit > 0 ? current / limit : 0;

    let warning_level: UsageCheckResult['warning_level'] = 'none';
    let message = '';

    if (current >= limit) {
      warning_level = 'limit_reached';
      message = `Достигнут лимит бронирований (${limit}/месяц). Счетчики обнулятся ${this.formatDate(salon.usage_reset_at)}.`;
    } else if (usage_percent >= this.WARNING_THRESHOLD_90) {
      warning_level = 'warning_90';
      message = `Использовано ${Math.round(usage_percent * 100)}% лимита бронирований (${current}/${limit}).`;
    } else if (usage_percent >= this.WARNING_THRESHOLD_80) {
      warning_level = 'warning_80';
      message = `Использовано ${Math.round(usage_percent * 100)}% лимита бронирований (${current}/${limit}).`;
    }

    const allowed = current < limit;

    if (!allowed) {
      this.logger.warn(`Salon ${salon_id} reached booking limit: ${current}/${limit}`);
    }

    return {
      allowed,
      current_usage: current,
      limit,
      usage_percent,
      warning_level,
      message,
    };
  }

  /**
   * Инкрементировать счетчик AI сообщений
   *
   * @param salon_id ID салона
   * @returns Новое значение счетчика
   */
  async incrementMessageUsage(salon_id: string): Promise<number> {
    const salon = await this.prisma.salon.update({
      where: { id: salon_id },
      data: {
        usage_current_messages: { increment: 1 },
      },
      select: {
        usage_current_messages: true,
        usage_limit_messages: true,
      },
    });

    this.logger.debug(
      `Message usage incremented for salon ${salon_id}: ${salon.usage_current_messages}/${salon.usage_limit_messages}`,
    );

    return salon.usage_current_messages;
  }

  /**
   * Инкрементировать счетчик бронирований
   *
   * @param salon_id ID салона
   * @returns Новое значение счетчика
   */
  async incrementBookingUsage(salon_id: string): Promise<number> {
    const salon = await this.prisma.salon.update({
      where: { id: salon_id },
      data: {
        usage_current_bookings: { increment: 1 },
      },
      select: {
        usage_current_bookings: true,
        usage_limit_bookings: true,
      },
    });

    this.logger.debug(
      `Booking usage incremented for salon ${salon_id}: ${salon.usage_current_bookings}/${salon.usage_limit_bookings}`,
    );

    return salon.usage_current_bookings;
  }

  /**
   * Получить статистику использования салона
   *
   * @param salon_id ID салона
   * @returns Статистика использования
   */
  async getUsageStats(salon_id: string): Promise<UsageStats> {
    const salon = await this.getSalonUsage(salon_id);

    if (!salon) {
      throw new Error(`Salon ${salon_id} not found`);
    }

    await this.checkAndResetUsageIfNeeded(salon_id);

    const messages_usage_percent =
      salon.usage_limit_messages > 0
        ? salon.usage_current_messages / salon.usage_limit_messages
        : 0;

    const bookings_usage_percent =
      salon.usage_limit_bookings > 0
        ? salon.usage_current_bookings / salon.usage_limit_bookings
        : 0;

    const days_until_reset = Math.ceil(
      (salon.usage_reset_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return {
      salon_id: salon.id,
      salon_name: salon.name,
      trial_status: salon.trial_status,
      trial_started_at: salon.trial_started_at,

      usage_limit_messages: salon.usage_limit_messages,
      usage_limit_bookings: salon.usage_limit_bookings,

      usage_current_messages: salon.usage_current_messages,
      usage_current_bookings: salon.usage_current_bookings,

      messages_usage_percent: Math.round(messages_usage_percent * 100),
      bookings_usage_percent: Math.round(bookings_usage_percent * 100),

      messages_limit_reached: salon.usage_current_messages >= salon.usage_limit_messages,
      bookings_limit_reached: salon.usage_current_bookings >= salon.usage_limit_bookings,

      usage_reset_at: salon.usage_reset_at,
      days_until_reset: Math.max(0, days_until_reset),
    };
  }

  /**
   * Проверить и сбросить счетчики если прошел месяц
   *
   * @param salon_id ID салона
   */
  private async checkAndResetUsageIfNeeded(salon_id: string): Promise<void> {
    const salon = await this.getSalonUsage(salon_id);

    if (!salon) return;

    const now = new Date();
    const shouldReset = now >= salon.usage_reset_at;

    if (shouldReset) {
      // Вычислить следующую дату сброса (через месяц)
      const nextResetDate = new Date(salon.usage_reset_at);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      await this.prisma.salon.update({
        where: { id: salon_id },
        data: {
          usage_current_messages: 0,
          usage_current_bookings: 0,
          usage_reset_at: nextResetDate,
          limit_warning_sent: false, // Сбросить флаг уведомлений
        },
      });

      this.logger.log(
        `Usage counters reset for salon ${salon_id}. Next reset: ${nextResetDate.toISOString()}`,
      );
    }
  }

  /**
   * Получить данные салона по использованию
   *
   * @param salon_id ID салона
   * @returns Данные салона или null
   */
  private async getSalonUsage(salon_id: string) {
    return this.prisma.salon.findUnique({
      where: { id: salon_id },
      select: {
        id: true,
        name: true,
        trial_status: true,
        trial_started_at: true,
        usage_limit_messages: true,
        usage_limit_bookings: true,
        usage_current_messages: true,
        usage_current_bookings: true,
        usage_reset_at: true,
        limit_warning_sent: true,
      },
    });
  }

  /**
   * Форматировать дату для отображения
   *
   * @param date Дата
   * @returns Форматированная строка
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Установить кастомные лимиты для салона
   * (для тестирования или особых случаев)
   *
   * @param salon_id ID салона
   * @param messages_limit Лимит сообщений
   * @param bookings_limit Лимит бронирований
   */
  async setCustomLimits(
    salon_id: string,
    messages_limit?: number,
    bookings_limit?: number,
  ): Promise<void> {
    const data: any = {};

    if (messages_limit !== undefined) {
      data.usage_limit_messages = messages_limit;
    }

    if (bookings_limit !== undefined) {
      data.usage_limit_bookings = bookings_limit;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.salon.update({
        where: { id: salon_id },
        data,
      });

      this.logger.log(
        `Custom limits set for salon ${salon_id}: messages=${messages_limit}, bookings=${bookings_limit}`,
      );
    }
  }

  /**
   * Сбросить счетчики использования вручную
   * (для администратора)
   *
   * @param salon_id ID салона
   */
  async resetUsageManually(salon_id: string): Promise<void> {
    await this.prisma.salon.update({
      where: { id: salon_id },
      data: {
        usage_current_messages: 0,
        usage_current_bookings: 0,
        limit_warning_sent: false,
      },
    });

    this.logger.log(`Usage counters manually reset for salon ${salon_id}`);
  }
}
