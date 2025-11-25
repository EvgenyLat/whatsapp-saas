/**
 * Unit Tests for MessageBuilderService
 *
 * @module tests/unit/message-builder
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MessageBuilderService } from '../../src/modules/ai/services/message-builder.service';

describe('MessageBuilderService', () => {
  let service: MessageBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageBuilderService],
    }).compile();

    service = module.get<MessageBuilderService>(MessageBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMessage', () => {
    it('should return message in Russian by default', () => {
      const message = service.getMessage('SLOT_TAKEN', 'ru', {
        time: '15:00',
        day: 'пятница',
      });

      expect(message).toContain('К сожалению');
      expect(message).toContain('15:00');
      expect(message).toContain('пятница');
      expect(message).toContain('😔');
    });

    it('should return message in English', () => {
      const message = service.getMessage('SLOT_TAKEN', 'en', {
        time: '15:00',
        day: 'Friday',
      });

      expect(message).toContain('Unfortunately');
      expect(message).toContain('15:00');
      expect(message).toContain('Friday');
      expect(message).toContain('😔');
    });

    it('should return message in Spanish', () => {
      const message = service.getMessage('SLOT_TAKEN', 'es', {
        time: '15:00',
        day: 'viernes',
      });

      expect(message).toContain('Desafortunadamente');
      expect(message).toContain('15:00');
      expect(message).toContain('viernes');
      expect(message).toContain('😔');
    });

    it('should return message in Portuguese', () => {
      const message = service.getMessage('SLOT_TAKEN', 'pt', {
        time: '15:00',
        day: 'sexta-feira',
      });

      expect(message).toContain('Infelizmente');
      expect(message).toContain('15:00');
      expect(message).toContain('sexta-feira');
      expect(message).toContain('😔');
    });

    it('should return message in Hebrew', () => {
      const message = service.getMessage('SLOT_TAKEN', 'he', {
        time: '15:00',
        day: 'יום שישי',
      });

      expect(message).toContain('למרבה הצער');
      expect(message).toContain('15:00');
      expect(message).toContain('יום שישי');
      expect(message).toContain('😔');
    });

    it('should fallback to Russian for unknown language', () => {
      const message = service.getMessage('SLOT_TAKEN', 'unknown' as any, {
        time: '15:00',
        day: 'пятница',
      });

      expect(message).toContain('К сожалению');
    });

    it('should return error message for unknown key', () => {
      const message = service.getMessage('UNKNOWN_KEY' as any, 'ru');

      expect(message).toBe('Произошла ошибка. Пожалуйста, попробуйте позже.');
    });

    it('should handle missing parameters gracefully', () => {
      const message = service.getMessage('SAME_DAY_OPTIONS', 'ru');

      expect(message).toContain('{day}');
      expect(message).toContain('{time}');
    });
  });

  describe('getChoiceLabel', () => {
    it('should return choice label in Russian', () => {
      const label = service.getChoiceLabel('SAME_DAY_DIFF_TIME', 'ru', {
        day: 'пятница',
      });

      expect(label).toContain('✅');
      expect(label).toContain('пятница');
      expect(label).toContain('но другое время');
    });

    it('should return choice label in English', () => {
      const label = service.getChoiceLabel('DIFF_DAY_SAME_TIME', 'en', {
        time: '15:00',
      });

      expect(label).toContain('📅');
      expect(label).toContain('15:00');
      expect(label).toContain('Different day');
    });

    it('should fallback to Russian for unknown label', () => {
      const label = service.getChoiceLabel('UNKNOWN' as any, 'en');

      expect(label).toBe('Выбрать');
    });
  });

  describe('formatDate', () => {
    it('should format date in Russian', () => {
      const formatted = service.formatDate('2025-10-25', 'ru');

      expect(formatted.toLowerCase()).toContain('суббота');
    });

    it('should format date in English', () => {
      const formatted = service.formatDate('2025-10-25', 'en');

      expect(formatted).toBe('Saturday');
    });

    it('should handle invalid date gracefully', () => {
      const formatted = service.formatDate('invalid-date', 'en');

      expect(formatted).toBe('invalid-date');
    });
  });

  describe('getProximityText', () => {
    it('should return "1 hour earlier" in Russian', () => {
      const text = service.getProximityText(-60, 'ru');

      expect(text).toBe('1 час раньше');
    });

    it('should return "2 hours later" in English', () => {
      const text = service.getProximityText(120, 'en');

      expect(text).toBe('2 hours later');
    });

    it('should return minutes when less than an hour', () => {
      const text = service.getProximityText(-30, 'ru');

      expect(text).toBe('30 минут раньше');
    });

    it('should return correct pluralization in Russian', () => {
      expect(service.getProximityText(-60, 'ru')).toBe('1 час раньше');
      expect(service.getProximityText(-120, 'ru')).toBe('2 часа раньше');
      expect(service.getProximityText(-300, 'ru')).toBe('5 часов раньше');
    });

    it('should return correct pluralization in English', () => {
      expect(service.getProximityText(60, 'en')).toBe('1 hour later');
      expect(service.getProximityText(120, 'en')).toBe('2 hours later');
      expect(service.getProximityText(30, 'en')).toBe('30 minutes later');
      expect(service.getProximityText(1, 'en')).toBe('1 minute later');
    });

    it('should handle Spanish proximity text', () => {
      const text = service.getProximityText(-90, 'es');

      expect(text).toContain('antes');
      expect(text).toContain('1');
    });

    it('should handle Portuguese proximity text', () => {
      const text = service.getProximityText(45, 'pt');

      expect(text).toContain('depois');
      expect(text).toContain('45');
    });

    it('should handle Hebrew proximity text', () => {
      const text = service.getProximityText(-120, 'he');

      expect(text).toContain('קודם');
      expect(text).toContain('2');
    });
  });

  describe('interpolation', () => {
    it('should interpolate multiple parameters', () => {
      const message = service.getMessage('SLOT_TAKEN', 'en', {
        time: '15:00',
        day: 'Friday',
      });

      expect(message).not.toContain('{time}');
      expect(message).not.toContain('{day}');
      expect(message).toContain('15:00');
      expect(message).toContain('Friday');
    });

    it('should handle special characters in parameters', () => {
      const message = service.getMessage('SLOT_TAKEN', 'ru', {
        time: '15:00',
        day: 'пятница (25.10)',
      });

      expect(message).toContain('пятница (25.10)');
    });

    it('should handle numeric parameters', () => {
      const label = service.getChoiceLabel('DIFF_DAY_SAME_TIME', 'ru', {
        time: 15,
      });

      expect(label).toContain('15');
    });
  });
});