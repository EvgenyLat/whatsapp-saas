/**
 * Integration test for Unified Message Router in webhook.service.ts
 *
 * @module tests/integration/unified-routing
 * @description Validates Task 1.1 implementation: message routing based on type and intent
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { WhatsAppMessage } from './interfaces';
import { PrismaService } from '@database/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { RemindersService } from '../reminders/reminders.service';
import { ButtonParserService } from './interactive/button-parser.service';
import { ButtonHandlerService } from './interactive/button-handler.service';
import { QuickBookingService } from '../ai/quick-booking.service';
import { LanguageDetectorService } from '../ai/services/language-detector.service';
import { AIIntentService } from '../ai/services/ai-intent.service';
import { IntentType } from '../ai/types/intent.types';

describe('Unified Message Router (Task 1.1)', () => {
  let webhookService: WebhookService;
  let quickBookingService: QuickBookingService;
  let languageDetectorService: LanguageDetectorService;
  let aiIntentService: AIIntentService;

  // Mock dependencies
  const mockPrismaService = {
    message: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: {
      findUnique: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    webhookLog: {
      create: jest.fn(),
    },
  };

  const mockWhatsAppService = {
    sendTextMessage: jest.fn(),
    sendInteractiveMessage: jest.fn(),
  };

  const mockRemindersService = {
    processResponse: jest.fn(),
  };

  const mockButtonParserService = {
    parse: jest.fn(),
  };

  const mockButtonHandlerService = {
    handleSlotSelection: jest.fn(),
    handleBookingConfirmation: jest.fn(),
  };

  beforeEach(async () => {
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
          provide: RemindersService,
          useValue: mockRemindersService,
        },
        {
          provide: ButtonParserService,
          useValue: mockButtonParserService,
        },
        {
          provide: ButtonHandlerService,
          useValue: mockButtonHandlerService,
        },
        {
          provide: QuickBookingService,
          useFactory: () => ({
            handleBookingRequest: jest.fn().mockResolvedValue({
              success: true,
              messageType: 'interactive_card',
              payload: {
                interactive: {
                  type: 'button',
                  body: { text: 'Choose a time slot' },
                  action: {
                    buttons: [
                      { id: 'slot_1', title: '10:00' },
                      { id: 'slot_2', title: '11:00' },
                    ],
                  },
                },
              },
            }),
            handleButtonClick: jest.fn().mockResolvedValue({
              success: true,
              messageType: 'text',
              payload: { text: 'Booking confirmed!' },
            }),
          }),
        },
        {
          provide: LanguageDetectorService,
          useFactory: () => ({
            detect: jest.fn().mockResolvedValue({
              language: 'ru',
              confidence: 0.95,
            }),
          }),
        },
        {
          provide: AIIntentService,
          useFactory: () => ({
            classifyIntent: jest.fn().mockResolvedValue({
              intent: IntentType.BOOKING_REQUEST,
              confidence: 0.85,
              isReliable: true,
              language: 'ru',
              alternativeIntents: [],
              entities: {
                dateReferences: [],
                timeReferences: [],
                emails: [],
                numbers: [],
              },
            }),
          }),
        },
      ],
    }).compile();

    webhookService = module.get<WebhookService>(WebhookService);
    quickBookingService = module.get<QuickBookingService>(QuickBookingService);
    languageDetectorService = module.get<LanguageDetectorService>(LanguageDetectorService);
    aiIntentService = module.get<AIIntentService>(AIIntentService);

    // Setup common mocks
    mockPrismaService.message.findUnique.mockResolvedValue(null);
    mockPrismaService.conversation.findUnique.mockResolvedValue({
      id: 'conv_123',
      message_count: 1,
    });
    mockPrismaService.booking.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Classification', () => {
    it('should classify button clicks as BUTTON_CLICK', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_1',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'slot_2025-10-25_15:00_master_1',
            title: '15:00',
          },
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      // Verify language detection was called
      expect(languageDetectorService.detect).toHaveBeenCalled();

      // Verify button click handler was called (with language parameter)
      expect(quickBookingService.handleButtonClick).toHaveBeenCalledWith(
        'slot_2025-10-25_15:00_master_1',
        '+79001234567',
        'ru',
      );
    });

    it('should classify booking keywords as BOOKING_REQUEST', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_2',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'Хочу записаться на стрижку завтра в 15:00',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      // Verify language detection was called
      expect(languageDetectorService.detect).toHaveBeenCalledWith(
        'Хочу записаться на стрижку завтра в 15:00',
      );

      // Verify booking handler was called with detected language
      expect(quickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'Хочу записаться на стрижку завтра в 15:00',
        customerPhone: '+79001234567',
        salonId: 'salon_123',
        language: 'ru',
      });
    });

    it('should classify general text as CONVERSATION', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_3',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'What are your working hours?',
        },
      } as any;

      // Mock to return English detection
      (languageDetectorService.detect as jest.Mock).mockResolvedValueOnce({
        language: 'en',
        confidence: 0.98,
      });

      // Mock AI intent to return SERVICE_INQUIRY (non-booking intent)
      (aiIntentService.classifyIntent as jest.Mock).mockResolvedValueOnce({
        intent: IntentType.SERVICE_INQUIRY,
        confidence: 0.75,
        isReliable: true,
        language: 'en',
        alternativeIntents: [],
        entities: {
          dateReferences: [],
          timeReferences: [],
          emails: [],
          numbers: [],
        },
      });

      await webhookService.processIncomingMessage('salon_123', message);

      // Verify language detection
      expect(languageDetectorService.detect).toHaveBeenCalledWith('What are your working hours?');

      // Verify AI intent classification was called
      expect(aiIntentService.classifyIntent).toHaveBeenCalledWith(
        'What are your working hours?',
        'en',
      );

      // Conversation messages don't trigger QuickBookingService by default
      // (processBookingRequest will check keywords and not process this)
      expect(quickBookingService.handleBookingRequest).not.toHaveBeenCalled();
    });

    it('should use AI intent classification with confidence threshold', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_ai_1',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'I am thinking about it', // Ambiguous text without booking keywords
        },
      } as any;

      // Mock low confidence booking intent (below 0.7 threshold)
      (aiIntentService.classifyIntent as jest.Mock).mockResolvedValueOnce({
        intent: IntentType.BOOKING_REQUEST,
        confidence: 0.45, // Below 0.7 threshold
        isReliable: false,
        language: 'en',
        alternativeIntents: [{ intent: IntentType.SERVICE_INQUIRY, confidence: 0.35 }],
        entities: {
          dateReferences: [],
          timeReferences: [],
          emails: [],
          numbers: [],
        },
      });

      (languageDetectorService.detect as jest.Mock).mockResolvedValueOnce({
        language: 'en',
        confidence: 0.95,
      });

      await webhookService.processIncomingMessage('salon_123', message);

      // Should not route to booking due to low confidence
      expect(quickBookingService.handleBookingRequest).not.toHaveBeenCalled();
    });
  });

  describe('Language Detection Integration', () => {
    it('should detect Russian and pass to handlers', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_4',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'Запись на маникюр',
        },
      } as any;

      (languageDetectorService.detect as jest.Mock).mockResolvedValueOnce({
        language: 'ru',
        confidence: 0.99,
      });

      await webhookService.processIncomingMessage('salon_123', message);

      expect(quickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'Запись на маникюр',
        customerPhone: '+79001234567',
        salonId: 'salon_123',
        language: 'ru',
      });
    });

    it('should detect Spanish and pass to handlers', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_5',
        from: '+34600123456',
        type: 'text',
        text: {
          body: 'Quiero reservar una cita',
        },
      } as any;

      (languageDetectorService.detect as jest.Mock).mockResolvedValueOnce({
        language: 'es',
        confidence: 0.97,
      });

      await webhookService.processIncomingMessage('salon_123', message);

      expect(quickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'Quiero reservar una cita',
        customerPhone: '+34600123456',
        salonId: 'salon_123',
        language: 'es',
      });
    });

    it('should detect Hebrew and pass to handlers', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_6',
        from: '+972501234567',
        type: 'text',
        text: {
          body: 'אני רוצה לקבוע תור',
        },
      } as any;

      (languageDetectorService.detect as jest.Mock).mockResolvedValueOnce({
        language: 'he',
        confidence: 0.96,
      });

      await webhookService.processIncomingMessage('salon_123', message);

      expect(quickBookingService.handleBookingRequest).toHaveBeenCalledWith({
        text: 'אני רוצה לקבוע תור',
        customerPhone: '+972501234567',
        salonId: 'salon_123',
        language: 'he',
      });
    });
  });

  describe('Response Handling', () => {
    it('should send interactive card when QuickBookingService returns card', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_7',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'Book appointment tomorrow',
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      expect(mockWhatsAppService.sendInteractiveMessage).toHaveBeenCalledWith(
        'system',
        expect.objectContaining({
          salon_id: 'salon_123',
          to: '+79001234567',
          interactive: expect.objectContaining({
            type: 'button',
          }),
        }),
      );
    });

    it('should send text message when QuickBookingService returns text', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_8',
        from: '+79001234567',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'confirm_booking_123',
            title: 'Confirm',
          },
        },
      } as any;

      await webhookService.processIncomingMessage('salon_123', message);

      expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(
        'system',
        expect.objectContaining({
          salon_id: 'salon_123',
          to: '+79001234567',
          text: 'Booking confirmed!',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle QuickBookingService errors gracefully', async () => {
      const message: WhatsAppMessage = {
        id: 'msg_9',
        from: '+79001234567',
        type: 'text',
        text: {
          body: 'Book appointment',
        },
      } as any;

      // Mock service to throw error
      (quickBookingService.handleBookingRequest as jest.Mock).mockRejectedValueOnce(
        new Error('Service unavailable'),
      );

      await webhookService.processIncomingMessage('salon_123', message);

      // Should send error message to customer
      expect(mockWhatsAppService.sendTextMessage).toHaveBeenCalledWith(
        'system',
        expect.objectContaining({
          salon_id: 'salon_123',
          to: '+79001234567',
          text: expect.stringContaining('Sorry'),
        }),
      );
    });
  });
});
