/**
 * Unit Tests for AlternativeSuggesterService
 *
 * @module tests/unit/alternative-suggester
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AlternativeSuggesterService } from '../../src/modules/ai/services/alternative-suggester.service';
import { MessageBuilderService } from '../../src/modules/ai/services/message-builder.service';
import { SlotSuggestion } from '../../src/modules/ai/types';

describe('AlternativeSuggesterService', () => {
  let service: AlternativeSuggesterService;
  let messageBuilder: MessageBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlternativeSuggesterService,
        MessageBuilderService,
      ],
    }).compile();

    service = module.get<AlternativeSuggesterService>(AlternativeSuggesterService);
    messageBuilder = module.get<MessageBuilderService>(MessageBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('rankByTimeProximity', () => {
    const createSlot = (time: string): SlotSuggestion => ({
      id: `slot_${time}`,
      date: '2025-10-25',
      startTime: time,
      endTime: time,
      serviceName: 'Haircut',
      serviceId: 'service_1',
      masterId: 'master_1',
      masterName: 'John',
      price: 50,
      currency: 'USD',
      duration: 30,
      available: true,
    });

    it('should rank slots by proximity to target time', async () => {
      const slots = [
        createSlot('13:00'), // 2 hours earlier
        createSlot('16:00'), // 1 hour later
        createSlot('14:00'), // 1 hour earlier
        createSlot('17:30'), // 2.5 hours later
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      expect(ranked[0].startTime).toBe('14:00'); // Closest (1 hour earlier)
      expect(ranked[1].startTime).toBe('16:00'); // Second (1 hour later)
      expect(ranked[2].startTime).toBe('13:00'); // Third (2 hours earlier)
      expect(ranked[3].startTime).toBe('17:30'); // Furthest
    });

    it('should add star indicator to top 3 slots', async () => {
      const slots = [
        createSlot('14:00'),
        createSlot('16:00'),
        createSlot('13:00'),
        createSlot('17:00'),
        createSlot('12:00'),
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      expect(ranked[0].indicators.showStar).toBe(true);
      expect(ranked[1].indicators.showStar).toBe(true);
      expect(ranked[2].indicators.showStar).toBe(true);
      expect(ranked[3].indicators.showStar).toBe(false);
      expect(ranked[4].indicators.showStar).toBe(false);
    });

    it('should add proximity text for slots within 3 hours', async () => {
      const slots = [
        createSlot('14:00'), // 1 hour earlier
        createSlot('16:30'), // 1.5 hours later
        createSlot('12:00'), // 3 hours earlier
        createSlot('19:00'), // 4 hours later
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      expect(ranked[0].indicators.proximityText).toBe('1 час раньше');
      expect(ranked[1].indicators.proximityText).toBe('1 час позже');
      expect(ranked[2].indicators.proximityText).toBe('3 часа раньше');
      expect(ranked[3].indicators.proximityText).toBeUndefined(); // > 3 hours
    });

    it('should handle exact time match', async () => {
      const slots = [
        createSlot('15:00'), // Exact match
        createSlot('14:00'),
        createSlot('16:00'),
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      expect(ranked[0].startTime).toBe('15:00');
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should handle empty slots array', async () => {
      const ranked = await service.rankByTimeProximity([], '15:00');

      expect(ranked).toEqual([]);
    });

    it('should handle minutes in time proximity', async () => {
      const slots = [
        createSlot('15:15'), // 15 minutes later
        createSlot('14:45'), // 15 minutes earlier
        createSlot('15:30'), // 30 minutes later
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      expect(ranked[0].indicators.proximityText).toBe('15 минут раньше');
      expect(ranked[1].indicators.proximityText).toBe('15 минут позже');
      expect(ranked[2].indicators.proximityText).toBe('30 минут позже');
    });

    it('should use correct language for proximity text', async () => {
      const slots = [createSlot('14:00')]; // 1 hour earlier

      const rankedRu = await service.rankByTimeProximity(slots, '15:00', 'ru');
      expect(rankedRu[0].indicators.proximityText).toBe('1 час раньше');

      const rankedEn = await service.rankByTimeProximity(slots, '15:00', 'en');
      expect(rankedEn[0].indicators.proximityText).toBe('1 hour earlier');

      const rankedEs = await service.rankByTimeProximity(slots, '15:00', 'es');
      expect(rankedEs[0].indicators.proximityText).toBe('1 hora antes');

      const rankedPt = await service.rankByTimeProximity(slots, '15:00', 'pt');
      expect(rankedPt[0].indicators.proximityText).toBe('1 hora antes');

      const rankedHe = await service.rankByTimeProximity(slots, '15:00', 'he');
      expect(rankedHe[0].indicators.proximityText).toBe('1 שעה קודם');
    });
  });

  describe('rankByDateProximity', () => {
    const createSlot = (date: string): SlotSuggestion => ({
      id: `slot_${date}`,
      date,
      startTime: '15:00',
      endTime: '15:30',
      serviceName: 'Haircut',
      serviceId: 'service_1',
      masterId: 'master_1',
      masterName: 'John',
      price: 50,
      currency: 'USD',
      duration: 30,
      available: true,
    });

    it('should rank slots by proximity to target date', async () => {
      const slots = [
        createSlot('2025-10-27'), // 2 days later
        createSlot('2025-10-24'), // 1 day earlier
        createSlot('2025-10-26'), // 1 day later
        createSlot('2025-10-30'), // 5 days later
      ];

      const ranked = await service.rankByDateProximity(slots, '2025-10-25', 'ru');

      expect(ranked[0].date).toBe('2025-10-24'); // 1 day earlier
      expect(ranked[1].date).toBe('2025-10-26'); // 1 day later
      expect(ranked[2].date).toBe('2025-10-27'); // 2 days later
      expect(ranked[3].date).toBe('2025-10-30'); // 5 days later
    });

    it('should give highest score to same day', async () => {
      const slots = [
        createSlot('2025-10-25'), // Same day
        createSlot('2025-10-24'),
        createSlot('2025-10-26'),
      ];

      const ranked = await service.rankByDateProximity(slots, '2025-10-25', 'ru');

      expect(ranked[0].date).toBe('2025-10-25');
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should add proximity text for dates', async () => {
      const slots = [
        createSlot('2025-10-25'), // Today
        createSlot('2025-10-26'), // Tomorrow
        createSlot('2025-10-27'), // Day after tomorrow
      ];

      const ranked = await service.rankByDateProximity(slots, '2025-10-25', 'ru');

      expect(ranked[0].indicators.proximityText).toBe('Сегодня');
      expect(ranked[1].indicators.proximityText).toBe('Завтра');
      expect(ranked[2].indicators.proximityText).toBe('Послезавтра');
    });
  });

  describe('addVisualIndicators', () => {
    it('should add localized proximity text', () => {
      const slots = [
        {
          id: 'slot_1',
          date: '2025-10-25',
          startTime: '14:00',
          endTime: '14:30',
          serviceName: 'Haircut',
          serviceId: 'service_1',
          masterId: 'master_1',
          masterName: 'John',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
          score: 600,
          rank: 1,
          indicators: {
            showStar: true,
          },
        },
      ];

      const result = service.addVisualIndicators(slots as any, '15:00', 'en');

      expect(result[0].indicators.proximityText).toBe('1 hour earlier');
      expect(result[0].indicators.proximityTextLocalized?.ru).toBe('1 час раньше');
      expect(result[0].indicators.proximityTextLocalized?.en).toBe('1 hour earlier');
    });

    it('should create display text with indicators', () => {
      const slots = [
        {
          id: 'slot_1',
          date: '2025-10-25',
          startTime: '14:00',
          endTime: '14:30',
          serviceName: 'Haircut',
          serviceId: 'service_1',
          masterId: 'master_1',
          masterName: 'John',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
          score: 600,
          rank: 1,
          indicators: {
            showStar: true,
          },
        },
      ];

      const result = service.addVisualIndicators(slots as any, '15:00', 'ru');

      expect(result[0].displayText).toBe('⭐ 14:00 (1 час раньше)');
    });
  });

  describe('rankByCombinedCriteria', () => {
    const createSlot = (date: string, time: string): SlotSuggestion => ({
      id: `slot_${date}_${time}`,
      date,
      startTime: time,
      endTime: time,
      serviceName: 'Haircut',
      serviceId: 'service_1',
      masterId: 'master_1',
      masterName: 'John',
      price: 50,
      currency: 'USD',
      duration: 30,
      available: true,
    });

    it('should heavily weight same time when preferSameTime is true', async () => {
      const slots = [
        createSlot('2025-10-26', '15:00'), // Different day, same time
        createSlot('2025-10-25', '14:00'), // Same day, different time
        createSlot('2025-10-27', '15:00'), // Different day, same time
      ];

      const ranked = await service.rankByCombinedCriteria(slots, {
        targetTime: '15:00',
        targetDate: '2025-10-25',
        preferSameTime: true,
      });

      expect(ranked[0].startTime).toBe('15:00');
      expect(ranked[1].startTime).toBe('15:00');
      expect(ranked[2].startTime).toBe('14:00');
    });

    it('should heavily weight same day when preferSameDay is true', async () => {
      const slots = [
        createSlot('2025-10-25', '14:00'), // Same day, different time
        createSlot('2025-10-26', '15:00'), // Different day, same time
        createSlot('2025-10-25', '16:00'), // Same day, different time
      ];

      const ranked = await service.rankByCombinedCriteria(slots, {
        targetTime: '15:00',
        targetDate: '2025-10-25',
        preferSameDay: true,
      });

      expect(ranked[0].date).toBe('2025-10-25');
      expect(ranked[1].date).toBe('2025-10-25');
      expect(ranked[2].date).toBe('2025-10-26');
    });

    it('should balance criteria when no preference is specified', async () => {
      const slots = [
        createSlot('2025-10-25', '15:30'), // Same day, close time
        createSlot('2025-10-26', '15:00'), // Next day, exact time
        createSlot('2025-10-30', '14:00'), // Far day, different time
      ];

      const ranked = await service.rankByCombinedCriteria(slots, {
        targetTime: '15:00',
        targetDate: '2025-10-25',
      });

      // Should balance both date and time proximity
      expect(ranked[0].score).toBeGreaterThan(ranked[2].score);
    });

    it('should handle missing criteria', async () => {
      const slots = [
        createSlot('2025-10-25', '15:00'),
        createSlot('2025-10-26', '14:00'),
      ];

      const ranked = await service.rankByCombinedCriteria(slots, {});

      expect(ranked).toHaveLength(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid time format gracefully', async () => {
      const slots = [
        {
          id: 'slot_1',
          date: '2025-10-25',
          startTime: 'invalid',
          endTime: '14:30',
          serviceName: 'Haircut',
          serviceId: 'service_1',
          masterId: 'master_1',
          masterName: 'John',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
        },
      ];

      const ranked = await service.rankByTimeProximity(slots, '15:00', 'ru');

      // Should return unranked slots as fallback
      expect(ranked).toHaveLength(1);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].score).toBe(0);
    });

    it('should handle invalid date format gracefully', async () => {
      const slots = [
        {
          id: 'slot_1',
          date: 'invalid-date',
          startTime: '15:00',
          endTime: '15:30',
          serviceName: 'Haircut',
          serviceId: 'service_1',
          masterId: 'master_1',
          masterName: 'John',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
        },
      ];

      const ranked = await service.rankByDateProximity(slots, '2025-10-25', 'ru');

      // Should return unranked slots as fallback
      expect(ranked).toHaveLength(1);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].score).toBe(0);
    });
  });
});