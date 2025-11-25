/**
 * Integration Tests for Choice Navigation Flow
 *
 * @module tests/integration/choice-flow
 * @description Tests the complete empathetic dialog choice flow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { QuickBookingService } from '../../src/modules/ai/quick-booking.service';
import { SessionContextService } from '../../src/modules/ai/services/session-context.service';
import { BookingContext } from '../../src/modules/ai/types/choice.types';

describe('Choice Flow Integration (e2e)', () => {
  let app: INestApplication;
  let quickBookingService: QuickBookingService;
  let sessionContext: SessionContextService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    quickBookingService = moduleFixture.get<QuickBookingService>(QuickBookingService);
    sessionContext = moduleFixture.get<SessionContextService>(SessionContextService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Choice Flow', () => {
    const customerPhone = '+1234567890';
    const salonId = 'test_salon_123';

    beforeEach(async () => {
      // Clear any existing session
      await sessionContext.delete(customerPhone);
    });

    it('should handle full choice flow: request → choice → slots', async () => {
      // Step 1: Customer requests a busy time slot
      const bookingRequest = {
        text: 'Стрижка в пятницу в 15:00',
        customerPhone,
        salonId,
        language: 'ru',
      };

      // Mock that exact slot is not available
      jest.spyOn(quickBookingService as any, 'slotFinder')
        .mockImplementation({
          findExactSlot: jest.fn().mockResolvedValue({
            available: false,
            reason: 'SLOT_TAKEN',
          }),
        });

      const response1 = await quickBookingService.handleBookingRequest(bookingRequest);

      // Should return choice card with empathetic message
      expect(response1.success).toBe(true);
      expect(response1.messageType).toBe('interactive_card');

      const payload1 = response1.payload as any;
      expect(payload1.body.text).toContain('К сожалению');
      expect(payload1.body.text).toContain('15:00');
      expect(payload1.body.text).toContain('занято');
      expect(payload1.body.text).toContain('😔');

      // Should have 2 choice buttons
      expect(payload1.action.buttons).toHaveLength(2);
      expect(payload1.action.buttons[0].reply.id).toBe('choice_same_day_diff_time');
      expect(payload1.action.buttons[1].reply.id).toBe('choice_diff_day_same_time');

      // Verify session was saved
      const savedContext = await sessionContext.get(customerPhone);
      expect(savedContext).toBeDefined();
      expect(savedContext?.originalIntent.time).toBe('15:00');
      expect(savedContext?.originalIntent.date).toBeDefined();

      // Step 2: Customer selects "Same day, different time"
      const response2 = await quickBookingService.handleChoice(
        'same_day_diff_time',
        customerPhone,
      );

      expect(response2.success).toBe(true);
      expect(response2.messageType).toBe('interactive_card');

      const payload2 = response2.payload as any;
      expect(payload2.interactive.header.text).toContain('Вот свободные слоты');
      expect(payload2.interactive.header.text).toContain('пятница');

      // Verify context was updated with choice
      const updatedContext = await sessionContext.get(customerPhone);
      expect(updatedContext?.choices).toHaveLength(1);
      expect(updatedContext?.choices[0].choiceId).toBe('same_day_diff_time');
    });

    it('should handle "different day, same time" choice', async () => {
      // Setup initial context
      const initialContext: BookingContext = {
        sessionId: 'sess_test_123',
        customerId: 'cust_456',
        salonId,
        language: 'ru',
        originalIntent: {
          serviceId: 'service_haircut',
          serviceName: 'Стрижка',
          date: '2025-10-25',
          time: '15:00',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save(customerPhone, initialContext);

      // Mock slot finder to return slots
      const mockSlots = [
        {
          id: 'slot_1',
          date: '2025-10-26',
          startTime: '15:00',
          endTime: '15:30',
          serviceName: 'Стрижка',
          serviceId: 'service_haircut',
          masterId: 'master_1',
          masterName: 'Иван',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
        },
        {
          id: 'slot_2',
          date: '2025-10-27',
          startTime: '15:00',
          endTime: '15:30',
          serviceName: 'Стрижка',
          serviceId: 'service_haircut',
          masterId: 'master_2',
          masterName: 'Петр',
          price: 50,
          currency: 'USD',
          duration: 30,
          available: true,
        },
      ];

      jest.spyOn(quickBookingService as any, 'slotFinder')
        .mockImplementation({
          findAvailableSlots: jest.fn().mockResolvedValue({
            slots: mockSlots,
            totalCount: 2,
          }),
        });

      // Customer selects "Different day, same time"
      const response = await quickBookingService.handleChoice(
        'diff_day_same_time',
        customerPhone,
      );

      expect(response.success).toBe(true);
      expect(response.messageType).toBe('interactive_card');

      const payload = response.payload as any;
      expect(payload.interactive.header.text).toContain('доступные дни');
      expect(payload.interactive.header.text).toContain('15:00');

      // Verify slots are ranked properly
      expect(payload.interactive.action.sections).toBeDefined();
      expect(payload.interactive.action.sections[0].rows).toHaveLength(2);
    });

    it('should handle session expiry gracefully', async () => {
      // Try to handle choice without existing session
      const response = await quickBookingService.handleChoice(
        'same_day_diff_time',
        customerPhone,
      );

      expect(response.success).toBe(false);
      expect(response.messageType).toBe('text');

      const payload = response.payload as any;
      expect(payload.text).toContain('Ваша сессия истекла');
    });

    it('should handle no alternatives scenario', async () => {
      // Setup initial context
      const initialContext: BookingContext = {
        sessionId: 'sess_test_123',
        customerId: 'cust_456',
        salonId,
        language: 'en',
        originalIntent: {
          serviceId: 'service_haircut',
          serviceName: 'Haircut',
          date: '2025-10-25',
          time: '15:00',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save(customerPhone, initialContext);

      // Mock slot finder to return no slots
      jest.spyOn(quickBookingService as any, 'slotFinder')
        .mockImplementation({
          findAvailableSlots: jest.fn().mockResolvedValue({
            slots: [],
            totalCount: 0,
          }),
        });

      const response = await quickBookingService.handleChoice(
        'same_day_diff_time',
        customerPhone,
      );

      expect(response.success).toBe(true);
      expect(response.messageType).toBe('text');

      const payload = response.payload as any;
      expect(payload.text).toContain("couldn't find suitable options");
    });

    it('should handle button click for choice selection', async () => {
      // Setup initial context
      const initialContext: BookingContext = {
        sessionId: 'sess_test_123',
        customerId: 'cust_456',
        salonId,
        language: 'ru',
        originalIntent: {
          serviceId: 'service_haircut',
          serviceName: 'Стрижка',
          date: '2025-10-25',
          time: '15:00',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save(customerPhone, initialContext);

      // Mock button parser and handle button click
      const buttonId = 'choice_same_day_diff_time';

      const response = await quickBookingService.handleButtonClick(
        buttonId,
        customerPhone,
      );

      expect(response.success).toBe(true);
      // Response type depends on whether slots are found
    });
  });

  describe('Language Support', () => {
    const customerPhone = '+9876543210';
    const salonId = 'test_salon_456';

    it('should handle choice flow in English', async () => {
      const context: BookingContext = {
        sessionId: 'sess_en_123',
        customerId: 'cust_en',
        salonId,
        language: 'en',
        originalIntent: {
          serviceId: 'service_1',
          time: '15:00',
          date: '2025-10-25',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save(customerPhone, context);

      const response = await quickBookingService.handleChoice(
        'same_day_diff_time',
        customerPhone,
      );

      const payload = response.payload as any;

      // Check for English text
      if (response.messageType === 'interactive_card') {
        expect(payload.interactive.header.text).toContain('free slots');
      } else {
        expect(payload.text).toContain('suitable options');
      }
    });

    it('should handle choice flow in Spanish', async () => {
      const context: BookingContext = {
        sessionId: 'sess_es_123',
        customerId: 'cust_es',
        salonId,
        language: 'es',
        originalIntent: {
          serviceId: 'service_1',
          time: '15:00',
          date: '2025-10-25',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save(customerPhone, context);

      const response = await quickBookingService.handleChoice(
        'diff_day_same_time',
        customerPhone,
      );

      const payload = response.payload as any;

      // Check for Spanish text
      if (response.messageType === 'interactive_card') {
        expect(payload.interactive.header.text).toContain('días disponibles');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failure gracefully', async () => {
      // Mock Redis failure
      jest.spyOn(sessionContext, 'get').mockResolvedValue(null);

      const response = await quickBookingService.handleChoice(
        'same_day_diff_time',
        '+1111111111',
      );

      expect(response.success).toBe(false);
      expect(response.messageType).toBe('text');
    });

    it('should handle invalid choice type', async () => {
      const context: BookingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {
          serviceId: 'service_1',
          time: '15:00',
          date: '2025-10-25',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      await sessionContext.save('+2222222222', context);

      const response = await quickBookingService.handleChoice(
        'invalid_choice' as any,
        '+2222222222',
      );

      expect(response.success).toBe(false);
      expect(response.messageType).toBe('text');
      expect((response.payload as any).text).toContain('ошибка');
    });
  });
});