/**
 * Integration tests for Unified Booking Flow (Task 1.3)
 * Tests the complete flow from WhatsApp message → Language Detection → AI Intent → QuickBooking → Interactive Buttons
 *
 * @module tests/integration/unified-booking-flow.spec.ts
 * @coverage Target: >80%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../../database/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { ButtonParserService } from './interactive/button-parser.service';
import { ButtonHandlerService } from './interactive/button-handler.service';
import { QuickBookingService } from '../ai/quick-booking.service';
import { LanguageDetectorService } from '../ai/services/language-detector.service';
import { AIIntentService } from '../ai/services/ai-intent.service';
import { SessionContextService } from '../ai/services/session-context.service';
import { WhatsAppMessage } from './interfaces';
import { IntentType } from '../ai/types/intent.types';

describe('Unified Booking Flow Integration (Task 1.3)', () => {
  let webhookService: WebhookService;

  // Mock tracking
  let sentMessages: any[] = [];
  let sentInteractiveMessages: any[] = [];
  let savedSessions = new Map<string, any>();

  // Mock services
  const mockWhatsAppService = {
    sendTextMessage: jest.fn().mockImplementation(async (sender, params) => {
      sentMessages.push({ sender, ...params });
      return { success: true };
    }),
    sendInteractiveMessage: jest.fn().mockImplementation(async (sender, params) => {
      sentInteractiveMessages.push({ sender, ...params });
      return { success: true };
    }),
  };

  const mockPrismaService = {
    message: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn().mockResolvedValue({ id: 'conv_123', message_count: 1 }),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'salon_123',
        name: 'Test Salon',
        phone: '+1234567890',
        timezone: 'Europe/Moscow',
      }),
    },
    booking: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'booking_123' }),
    },
    slot: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'slot_1',
          date: '2025-11-02',
          time: '10:00',
          master_id: 'master_1',
          available: true,
        },
        {
          id: 'slot_2',
          date: '2025-11-02',
          time: '14:00',
          master_id: 'master_1',
          available: true,
        },
      ]),
    },
    master: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'master_1', name: 'Anna', specialization: 'Haircut' }]),
    },
    webhookLog: {
      create: jest.fn(),
    },
  };

  const mockQuickBookingService = {
    handleBookingRequest: jest.fn().mockImplementation(async (request) => {
      // Store session for this customer
      savedSessions.set(request.customerPhone, {
        language: request.language,
        salonId: request.salonId,
      });

      return {
        success: true,
        messageType: 'interactive_card',
        payload: {
          interactive: {
            type: 'button',
            body: {
              text:
                request.language === 'ru' ? 'Выберите удобное время' : 'Choose a convenient time',
            },
            action: {
              buttons: [
                { id: 'slot_1', title: '10:00' },
                { id: 'slot_2', title: '14:00' },
              ],
            },
          },
        },
      };
    }),
    handleButtonClick: jest.fn().mockImplementation(async (buttonId, customerPhone, language) => {
      const session = savedSessions.get(customerPhone);
      const lang = language || session?.language || 'en';

      if (buttonId.startsWith('slot_')) {
        // Slot selection
        return {
          success: true,
          messageType: 'interactive_card',
          payload: {
            interactive: {
              type: 'button',
              body: {
                text: lang === 'ru' ? 'Подтвердите бронирование' : 'Confirm your booking',
              },
              action: {
                buttons: [
                  {
                    id: 'confirm_booking',
                    title: lang === 'ru' ? 'Подтвердить' : 'Confirm',
                  },
                  {
                    id: 'cancel_booking',
                    title: lang === 'ru' ? 'Отменить' : 'Cancel',
                  },
                ],
              },
            },
          },
        };
      } else if (buttonId === 'confirm_booking') {
        // Booking confirmation
        savedSessions.delete(customerPhone); // Clear session
        return {
          success: true,
          messageType: 'text',
          payload: {
            text: lang === 'ru' ? 'Ваше бронирование подтверждено!' : 'Your booking is confirmed!',
          },
        };
      } else if (buttonId === 'cancel_booking') {
        // Booking cancellation
        savedSessions.delete(customerPhone);
        return {
          success: true,
          messageType: 'text',
          payload: {
            text: lang === 'ru' ? 'Бронирование отменено' : 'Booking cancelled',
          },
        };
      }

      return {
        success: false,
        messageType: 'text',
        payload: {
          text: lang === 'ru' ? 'Произошла ошибка' : 'An error occurred',
        },
      };
    }),
  };

  const mockLanguageDetectorService = {
    detect: jest.fn().mockImplementation(async (text: string) => {
      if (text.includes('записаться') || text.includes('стрижк') || text.includes('маникюр')) {
        return { language: 'ru', confidence: 0.95 };
      } else if (
        text.includes('appointment') ||
        text.includes('book') ||
        text.includes('haircut')
      ) {
        return { language: 'en', confidence: 0.95 };
      } else if (text.includes('reservar') || text.includes('cita')) {
        return { language: 'es', confidence: 0.95 };
      } else if (text.includes('agendar') || text.includes('marcar')) {
        return { language: 'pt', confidence: 0.95 };
      } else if (text.includes('תור') || text.includes('לקבוע')) {
        return { language: 'he', confidence: 0.95 };
      }
      return { language: 'en', confidence: 0.5 };
    }),
  };

  const mockAIIntentService = {
    classifyIntent: jest.fn().mockImplementation(async (text: string, language: string) => {
      const bookingKeywords = [
        'book',
        'appointment',
        'reservation',
        'schedule',
        'записаться',
        'запись',
        'хочу',
        'нужно',
        'reservar',
        'cita',
        'agendar',
        'agendamento',
        'marcar',
        'תור',
        'לקבוע',
      ];

      const hasBookingIntent = bookingKeywords.some((kw) => text.toLowerCase().includes(kw));

      if (hasBookingIntent) {
        return {
          intent: IntentType.BOOKING_REQUEST,
          confidence: 0.85,
          isReliable: true,
          language,
          alternativeIntents: [],
          entities: {
            dateReferences:
              text.includes('tomorrow') || text.includes('завтра') ? ['tomorrow'] : [],
            timeReferences: [],
            emails: [],
            numbers: [],
          },
        };
      }

      return {
        intent: IntentType.GENERAL_QUESTION,
        confidence: 0.6,
        isReliable: false,
        language,
        alternativeIntents: [],
        entities: {
          dateReferences: [],
          timeReferences: [],
          emails: [],
          numbers: [],
        },
      };
    }),
  };

  const mockSessionContextService = {
    save: jest.fn().mockImplementation(async (phone: string, data: any) => {
      savedSessions.set(phone, data);
      return true;
    }),
    get: jest.fn().mockImplementation(async (phone: string) => {
      return savedSessions.get(phone) || null;
    }),
    delete: jest.fn().mockImplementation(async (phone: string) => {
      savedSessions.delete(phone);
      return true;
    }),
  };

  beforeEach(async () => {
    // Clear mocks before each test
    sentMessages = [];
    sentInteractiveMessages = [];
    savedSessions.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
        {
          provide: QuickBookingService,
          useValue: mockQuickBookingService,
        },
        {
          provide: LanguageDetectorService,
          useValue: mockLanguageDetectorService,
        },
        {
          provide: AIIntentService,
          useValue: mockAIIntentService,
        },
        {
          provide: SessionContextService,
          useValue: mockSessionContextService,
        },
        {
          provide: RemindersService,
          useValue: { processResponse: jest.fn() },
        },
        {
          provide: ButtonParserService,
          useValue: { parse: jest.fn() },
        },
        {
          provide: ButtonHandlerService,
          useValue: {
            handleSlotSelection: jest.fn(),
            handleBookingConfirmation: jest.fn(),
          },
        },
      ],
    }).compile();

    webhookService = module.get<WebhookService>(WebhookService);
  });

  describe('Russian Booking Flow', () => {
    it('should handle complete Russian booking flow from initial message to confirmation', async () => {
      // Step 1: Customer sends initial booking request in Russian
      const initialMessage: WhatsAppMessage = {
        id: 'msg_ru_1',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'Хочу записаться на стрижку завтра',
        },
        metadata: {
          phone_number_id: 'phone_123',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', initialMessage);

      // Verify language detection was called
      expect(mockLanguageDetectorService.detect).toHaveBeenCalledWith(
        'Хочу записаться на стрижку завтра',
      );

      // Verify AI intent classification was called
      expect(mockAIIntentService.classifyIntent).toHaveBeenCalledWith(
        'Хочу записаться на стрижку завтра',
        'ru',
      );

      // Verify QuickBookingService was called with Russian language
      expect(mockQuickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'Хочу записаться на стрижку завтра',
        customerPhone: '+79001234567',
        salonId: 'salon_123',
        language: 'ru',
      });

      // Verify interactive card was sent in Russian
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.body.text).toBe('Выберите удобное время');
    });

    it('should handle Russian button clicks and maintain language context', async () => {
      // Setup: Initial booking request
      await webhookService.processIncomingMessage('salon_123', {
        id: 'setup_msg',
        from: '+79001234567',
        type: 'text',
        text: { body: 'Запись на маникюр' },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      // Clear previous messages
      sentInteractiveMessages = [];

      // Customer clicks on a time slot button
      const buttonClick: WhatsAppMessage = {
        id: 'msg_ru_button',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'slot_1',
            title: '10:00',
          },
        },
        metadata: {
          phone_number_id: 'phone_123',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', buttonClick);

      // Verify QuickBookingService.handleButtonClick was called
      expect(mockQuickBookingService.handleButtonClick).toHaveBeenCalledWith(
        'slot_1',
        '+79001234567',
        expect.any(String), // language parameter may vary
      );

      // Verify confirmation card sent in Russian
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.body.text).toBe('Подтвердите бронирование');
    });

    it('should complete Russian booking confirmation', async () => {
      // Setup initial session
      savedSessions.set('+79001234567', {
        language: 'ru',
        salonId: 'salon_123',
      });

      // Send confirmation button click
      const confirmClick: WhatsAppMessage = {
        id: 'msg_ru_confirm',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'confirm_booking',
            title: 'Подтвердить',
          },
        },
        metadata: {
          phone_number_id: 'phone_123',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', confirmClick);

      // Verify confirmation message sent in Russian
      expect(sentMessages.length).toBe(1);
      expect(sentMessages[0].text).toBe('Ваше бронирование подтверждено!');

      // Verify session was cleared
      expect(savedSessions.has('+79001234567')).toBe(false);
    });
  });

  describe('English Booking Flow', () => {
    it('should handle complete English booking flow', async () => {
      // Customer sends booking request in English
      const englishMessage: WhatsAppMessage = {
        id: 'msg_en_1',
        from: '+12025551234',
        type: 'text',
        text: {
          body: 'I want to book a haircut appointment',
        },
        metadata: {
          phone_number_id: 'phone_123',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', englishMessage);

      // Verify language detection
      expect(mockLanguageDetectorService.detect).toHaveBeenCalledWith(
        'I want to book a haircut appointment',
      );

      // Verify intent classification
      expect(mockAIIntentService.classifyIntent).toHaveBeenCalledWith(
        'I want to book a haircut appointment',
        'en',
      );

      // Verify QuickBookingService called with English
      expect(mockQuickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'I want to book a haircut appointment',
        customerPhone: '+12025551234',
        salonId: 'salon_123',
        language: 'en',
      });

      // Verify interactive message sent in English
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.body.text).toBe('Choose a convenient time');
    });

    it('should handle English button clicks', async () => {
      // Setup English session
      savedSessions.set('+12025551234', {
        language: 'en',
        salonId: 'salon_123',
      });

      // Customer selects a time
      const timeSelection: WhatsAppMessage = {
        id: 'msg_en_button',
        from: '+12025551234',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'slot_2',
            title: '2:00 PM',
          },
        },
        metadata: {
          phone_number_id: 'phone_123',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', timeSelection);

      // Verify confirmation card in English
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.body.text).toBe('Confirm your booking');
      expect(sentInteractiveMessages[0].interactive.action.buttons[0].title).toBe('Confirm');
    });
  });

  describe('Multi-Language Support', () => {
    const testCases = [
      {
        language: 'es',
        text: 'Quiero reservar una cita',
        phone: '+34600123456',
      },
      {
        language: 'pt',
        text: 'Gostaria de agendar um horário',
        phone: '+5511999887766',
      },
      {
        language: 'he',
        text: 'אני רוצה לקבוע תור',
        phone: '+972501234567',
      },
    ];

    testCases.forEach(({ language, text, phone }) => {
      it(`should handle ${language.toUpperCase()} booking request`, async () => {
        const message: WhatsAppMessage = {
          id: `msg_${language}_1`,
          from: phone,
          type: 'text',
          text: { body: text },
          metadata: { phone_number_id: 'phone_123' },
        } as any;

        await webhookService.processIncomingMessage('salon_123', message);

        // Verify language detection and booking service called
        expect(mockLanguageDetectorService.detect).toHaveBeenCalledWith(text);
        expect(mockQuickBookingService.handleBookingRequest).toHaveBeenCalledWith({
          text,
          customerPhone: phone,
          salonId: 'salon_123',
          language,
        });
      });
    });
  });

  describe('Button Click Handling', () => {
    it('should handle slot selection buttons', async () => {
      const slotButton: WhatsAppMessage = {
        id: 'msg_button_slot',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'slot_1',
            title: '10:00',
          },
        },
        metadata: { phone_number_id: 'phone_123' },
      } as any;

      await webhookService.processIncomingMessage('salon_123', slotButton);

      // Verify button handler was called
      expect(mockQuickBookingService.handleButtonClick).toHaveBeenCalledWith(
        'slot_1',
        '+79001234567',
        expect.any(String),
      );

      // Verify confirmation card sent
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.action.buttons).toHaveLength(2);
    });

    it('should handle cancel buttons', async () => {
      // Setup session
      savedSessions.set('+79001234567', {
        language: 'ru',
        salonId: 'salon_123',
      });

      const cancelButton: WhatsAppMessage = {
        id: 'msg_cancel',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'cancel_booking',
            title: 'Cancel',
          },
        },
        metadata: { phone_number_id: 'phone_123' },
      } as any;

      await webhookService.processIncomingMessage('salon_123', cancelButton);

      // Verify cancellation message sent
      expect(sentMessages.length).toBe(1);
      expect(sentMessages[0].text).toContain('отменено');

      // Verify session cleared
      expect(savedSessions.has('+79001234567')).toBe(false);
    });
  });

  describe('Language Switching', () => {
    it('should detect language change between messages', async () => {
      // First message in Russian
      await webhookService.processIncomingMessage('salon_123', {
        id: 'msg_switch_1',
        from: '+79001234567',
        type: 'text',
        text: { body: 'Хочу записаться' },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      expect(mockQuickBookingService.handleBookingRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ language: 'ru' }),
      );

      // Clear session to simulate new conversation
      savedSessions.clear();

      // Next message in English
      await webhookService.processIncomingMessage('salon_123', {
        id: 'msg_switch_2',
        from: '+79001234567',
        type: 'text',
        text: { body: 'I want to book an appointment' },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      expect(mockQuickBookingService.handleBookingRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ language: 'en' }),
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle AI service failures gracefully', async () => {
      // Mock AI service to fail
      mockAIIntentService.classifyIntent.mockRejectedValueOnce(new Error('AI Service unavailable'));

      const message: WhatsAppMessage = {
        id: 'msg_error_ai',
        from: '+79001234567',
        type: 'text',
        text: { body: 'Book appointment' },
        metadata: { phone_number_id: 'phone_123' },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      // Should send error message
      expect(sentMessages.length).toBeGreaterThan(0);
      expect(sentMessages[0].text).toMatch(/sorry|error|unavailable/i);
    });

    it('should handle booking service failures', async () => {
      // Mock booking service to fail
      mockQuickBookingService.handleBookingRequest.mockRejectedValueOnce(
        new Error('Service unavailable'),
      );

      const message: WhatsAppMessage = {
        id: 'msg_error_booking',
        from: '+79001234567',
        type: 'text',
        text: { body: 'Book appointment' },
        metadata: { phone_number_id: 'phone_123' },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      // Should handle error gracefully
      expect(sentMessages.length).toBeGreaterThan(0);
    });

    it('should handle invalid message formats', async () => {
      const invalidMessage = {
        id: 'msg_invalid',
        from: '+79001234567',
        // Missing required fields
        metadata: { phone_number_id: 'phone_123' },
      } as any;

      // Should not throw
      await expect(
        webhookService.processIncomingMessage('salon_123', invalidMessage),
      ).resolves.not.toThrow();
    });
  });

  describe('Complete Booking Flow', () => {
    it('should complete full booking flow from start to confirmation', async () => {
      const customerPhone = '+79001234567';

      // Step 1: Initial booking request
      await webhookService.processIncomingMessage('salon_123', {
        id: 'flow_1',
        from: customerPhone,
        type: 'text',
        text: { body: 'Хочу записаться на маникюр' },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      // Verify slots card sent
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.type).toBe('button');

      // Step 2: Select time slot
      sentInteractiveMessages = [];
      await webhookService.processIncomingMessage('salon_123', {
        id: 'flow_2',
        from: customerPhone,
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'slot_2', title: '14:00' },
        },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      // Verify confirmation card sent
      expect(sentInteractiveMessages.length).toBe(1);
      expect(sentInteractiveMessages[0].interactive.body.text).toContain('Подтвердите');

      // Step 3: Confirm booking
      sentMessages = [];
      await webhookService.processIncomingMessage('salon_123', {
        id: 'flow_3',
        from: customerPhone,
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'confirm_booking', title: 'Подтвердить' },
        },
        metadata: { phone_number_id: 'phone_123' },
      } as any);

      // Verify booking confirmed
      expect(sentMessages.length).toBe(1);
      expect(sentMessages[0].text).toContain('подтверждено');

      // Verify session cleared
      expect(savedSessions.has(customerPhone)).toBe(false);
    });
  });

  describe('Performance and Coverage', () => {
    it('should handle concurrent bookings from multiple customers', async () => {
      const customers = [
        { phone: '+79001234567', text: 'Запись на стрижку' },
        { phone: '+12025551234', text: 'Book haircut' },
        { phone: '+34600123456', text: 'Reservar cita' },
      ];

      // Send all messages concurrently
      const promises = customers.map((customer) => {
        const message: WhatsAppMessage = {
          id: `concurrent_${customer.phone}`,
          from: customer.phone,
          type: 'text',
          text: { body: customer.text },
          metadata: { phone_number_id: 'phone_123' },
        } as any;

        return webhookService.processIncomingMessage('salon_123', message);
      });

      await Promise.all(promises);

      // Verify all handled
      expect(mockQuickBookingService.handleBookingRequest).toHaveBeenCalledTimes(3);
      expect(sentInteractiveMessages.length).toBe(3);
    });

    it('should maintain performance with rapid button clicks', async () => {
      const customerPhone = '+79001234567';
      const clicks = Array.from({ length: 5 }, (_, i) => ({
        id: `rapid_${i}`,
        from: customerPhone,
        type: 'interactive' as const,
        interactive: {
          type: 'button_reply' as const,
          button_reply: {
            id: `slot_${i}`,
            title: `Slot ${i}`,
          },
        },
        metadata: { phone_number_id: 'phone_123' },
      }));

      const startTime = Date.now();
      await Promise.all(
        clicks.map((click) => webhookService.processIncomingMessage('salon_123', click as any)),
      );
      const endTime = Date.now();

      // Should process all within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockQuickBookingService.handleButtonClick).toHaveBeenCalledTimes(5);
    });
  });
});
