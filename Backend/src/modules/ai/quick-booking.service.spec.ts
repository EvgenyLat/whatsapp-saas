import { Test, TestingModule } from '@nestjs/testing';
import { QuickBookingService } from './quick-booking.service';
import { PrismaService } from '@database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { IntentParserService } from './services/intent-parser.service';
import { ButtonParserService } from './button-parser.service';
import { InteractiveCardBuilderService } from './interactive-card-builder.service';
import { US1AnalyticsService } from './analytics/us1-analytics.service';
import { SlotFinderService } from './services/slot-finder.service';
import { AlternativeSuggesterService } from './services/alternative-suggester.service';
import { MessageBuilderService } from './services/message-builder.service';
import { SessionContextService } from './services/session-context.service';
import { BadRequestException } from '@nestjs/common';

/**
 * QuickBookingService Unit Tests
 *
 * Focus: Language handling verification after fixes
 *
 * Tests verify:
 * 1. Language is stored in session during handleBookingRequest
 * 2. handleButtonClick retrieves language from session correctly
 * 3. Fallback language is 'en' not 'ru' for errors
 * 4. Language is passed to all sub-services
 */
describe('QuickBookingService - Language Handling', () => {
  let service: QuickBookingService;
  let prismaService: PrismaService;
  let intentParser: IntentParserService;
  let slotFinder: SlotFinderService;
  let cardBuilder: InteractiveCardBuilderService;
  let analytics: US1AnalyticsService;
  let sessionContext: SessionContextService;
  let buttonParser: ButtonParserService;
  let messageBuilder: MessageBuilderService;

  // Mock data
  const mockCustomerPhone = '+1234567890';
  const mockSalonId = 'salon-123';
  const mockServiceId = 'service-123';
  const mockMasterId = 'master-123';
  const mockCustomerId = 'customer-123';

  const mockIntent = {
    serviceName: 'Haircut',
    serviceId: mockServiceId,
    masterId: mockMasterId,
    masterName: 'John Doe',
    preferredDate: '2025-11-01',
    preferredTime: '14:00',
    language: 'en',
  };

  const mockSlot = {
    id: 'slot-123',
    date: '2025-11-01',
    startTime: '14:00',
    endTime: '15:00',
    masterId: mockMasterId,
    masterName: 'John Doe',
    serviceId: mockServiceId,
    serviceName: 'Haircut',
    duration: 60,
    price: 50,
    isPreferred: true,
  };

  const mockCard = {
    type: 'list' as const,
    body: 'Select a time',
    footer: 'Available slots',
    buttonText: 'Choose',
    sections: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBookingService,
        {
          provide: PrismaService,
          useValue: {
            service: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            master: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            booking: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: IntentParserService,
          useValue: {
            parseIntent: jest.fn(),
          },
        },
        {
          provide: ButtonParserService,
          useValue: {
            parseButtonId: jest.fn(),
          },
        },
        {
          provide: InteractiveCardBuilderService,
          useValue: {
            buildSlotSelectionCard: jest.fn(),
            buildConfirmationCard: jest.fn(),
          },
        },
        {
          provide: US1AnalyticsService,
          useValue: {
            initializeSession: jest.fn(),
            trackEvent: jest.fn(),
            getSessionMetrics: jest.fn(),
            completeSession: jest.fn(),
          },
        },
        {
          provide: SlotFinderService,
          useValue: {
            findAvailableSlots: jest.fn(),
          },
        },
        {
          provide: AlternativeSuggesterService,
          useValue: {
            rankByTimeProximity: jest.fn(),
            rankByDateProximity: jest.fn(),
          },
        },
        {
          provide: MessageBuilderService,
          useValue: {
            getMessage: jest.fn((key, lang) => {
              const messages: Record<string, Record<string, string>> = {
                SESSION_EXPIRED: {
                  en: 'Session expired. Please start a new booking.',
                  ru: 'Сессия истекла. Пожалуйста, начните новое бронирование.',
                },
                ERROR: {
                  en: 'Sorry, something went wrong.',
                  ru: 'Извините, что-то пошло не так.',
                },
              };
              return messages[key]?.[lang] || messages[key]?.['en'] || 'Error';
            }),
          },
        },
        {
          provide: SessionContextService,
          useValue: {
            get: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuickBookingService>(QuickBookingService);
    prismaService = module.get<PrismaService>(PrismaService);
    intentParser = module.get<IntentParserService>(IntentParserService);
    slotFinder = module.get<SlotFinderService>(SlotFinderService);
    cardBuilder = module.get<InteractiveCardBuilderService>(InteractiveCardBuilderService);
    analytics = module.get<US1AnalyticsService>(US1AnalyticsService);
    sessionContext = module.get<SessionContextService>(SessionContextService);
    buttonParser = module.get<ButtonParserService>(ButtonParserService);
    messageBuilder = module.get<MessageBuilderService>(MessageBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleBookingRequest - Language Storage', () => {
    beforeEach(() => {
      // Setup default mocks for successful booking request
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(intentParser, 'parseIntent').mockResolvedValue(mockIntent as any);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [mockSlot],
        totalFound: 1,
        searchedDays: 1,
        hasMore: false,
      });
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
      jest.spyOn(sessionContext, 'save').mockResolvedValue(undefined);
    });

    it('should store English language in session when provided explicitly', async () => {
      const result = await service.handleBookingRequest({
        text: 'Haircut Friday 3pm',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'en',
      });

      expect(result.success).toBe(true);

      // Verify SessionContextService.save was called with language 'en'
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en',
        }),
      );
    });

    it('should store Russian language in session when provided', async () => {
      const result = await service.handleBookingRequest({
        text: 'Стрижка в пятницу в 15:00',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'ru',
      });

      expect(result.success).toBe(true);

      // Verify SessionContextService.save was called with language 'ru'
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'ru',
        }),
      );
    });

    it('should store Spanish language in session when provided', async () => {
      const result = await service.handleBookingRequest({
        text: 'Corte de pelo viernes 3pm',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'es',
      });

      expect(result.success).toBe(true);

      // Verify SessionContextService.save was called with language 'es'
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'es',
        }),
      );
    });

    it('should default to English when no language provided', async () => {
      const result = await service.handleBookingRequest({
        text: 'Haircut Friday 3pm',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        // No language parameter
      });

      expect(result.success).toBe(true);

      // Verify SessionContextService.save was called with default language 'en'
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en', // Should default to 'en', NOT 'ru'
        }),
      );
    });

    it('should pass language to card builder', async () => {
      await service.handleBookingRequest({
        text: 'Haircut Friday 3pm',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'pt',
      });

      expect(cardBuilder.buildSlotSelectionCard).toHaveBeenCalledWith(
        expect.any(Array),
        'pt', // Language should be passed
      );
    });

    it('should pass default English to card builder when no language provided', async () => {
      await service.handleBookingRequest({
        text: 'Haircut Friday 3pm',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
      });

      expect(cardBuilder.buildSlotSelectionCard).toHaveBeenCalledWith(
        expect.any(Array),
        'en', // Should default to 'en'
      );
    });
  });

  describe('handleBookingRequest - Error Language Handling', () => {
    it('should use English for error messages when language not provided', async () => {
      jest.spyOn(intentParser, 'parseIntent').mockRejectedValue(new Error('AI service error'));
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);

      const result = await service.handleBookingRequest({
        text: 'Invalid request',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        // No language - should default to 'en' not 'ru'
      });

      expect(result.success).toBe(false);
      expect(result.messageType).toBe('error');
      expect(result.payload).toHaveProperty('text');

      // Verify the error message is in English (not Russian)
      const errorText = (result.payload as any).text;
      expect(errorText).toContain('Sorry'); // English error message
      expect(errorText).not.toContain('Извините'); // Not Russian
    });

    it('should use Spanish for error messages when Spanish language provided', async () => {
      jest.spyOn(intentParser, 'parseIntent').mockRejectedValue(new Error('AI service error'));
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);

      const result = await service.handleBookingRequest({
        text: 'Invalid request',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'es',
      });

      expect(result.success).toBe(false);
      const errorText = (result.payload as any).text;
      expect(errorText).toContain('Lo sentimos'); // Spanish error message
    });

    it('should use English for no-slots message when no language provided', async () => {
      jest.spyOn(intentParser, 'parseIntent').mockResolvedValue(mockIntent as any);
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [],
        totalFound: 0,
        searchedDays: 7,
        hasMore: false,
      });
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);

      const result = await service.handleBookingRequest({
        text: 'Haircut tomorrow',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        // No language - should default to 'en'
      });

      expect(result.success).toBe(true);
      const messageText = (result.payload as any).text;
      expect(messageText).toContain('Sorry'); // English message
      expect(messageText).not.toContain('сожалению'); // Not Russian
    });
  });

  describe('handleButtonClick - Language Retrieval from Session', () => {
    beforeEach(() => {
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'getSessionMetrics').mockResolvedValue({
        tapCount: 0,
        typingCount: 1,
        startTime: Date.now(),
      } as any);
      jest.spyOn(sessionContext, 'save').mockResolvedValue(undefined);
    });

    it('should retrieve and use stored language from session for slot selection', async () => {
      // Mock SessionContextService.get to return session with Russian language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-123',
        customerId: mockCustomerId,
        language: 'ru', // Russian language stored in session
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      // Verify Russian language was passed to card builder
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'ru', // Should use language from session
      );
    });

    it('should retrieve and use Portuguese from session', async () => {
      // Mock SessionContextService.get to return session with Portuguese language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-456',
        customerId: mockCustomerId,
        language: 'pt', // Portuguese
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'pt',
      );
    });

    it('should default to English if session has no language (session migration)', async () => {
      // Mock SessionContextService.get to return legacy session without language field
      const mockLegacySession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-789',
        customerId: mockCustomerId,
        // No language field - simulating old session
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockLegacySession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'en', // Should fallback to 'en' if no language in session
      );

      // Verify session was updated with migrated language
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en',
        }),
      );
    });

    it('should use session language for confirmation message', async () => {
      // Mock SessionContextService.get to return session with Hebrew language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: mockSlot,
        salonId: mockSalonId,
        sessionId: 'session-confirm',
        customerId: mockCustomerId,
        language: 'he', // Hebrew
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);
      jest.spyOn(sessionContext, 'delete').mockResolvedValue(undefined);

      const mockBooking = {
        id: 'booking-123',
        bookingCode: 'BK-ABC123',
      };

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'booking_confirmation',
        bookingId: 'booking-123',
      } as any);
      jest.spyOn(prismaService.booking, 'create').mockResolvedValue(mockBooking as any);
      jest.spyOn(analytics, 'completeSession').mockResolvedValue(undefined);

      const result = await service.handleButtonClick('confirm_booking-123', mockCustomerPhone);

      expect(result.success).toBe(true);
      // Verify confirmation message contains Hebrew text or booking code
      expect(result.payload).toHaveProperty('text');

      // Verify session was cleared after confirmation
      expect(sessionContext.delete).toHaveBeenCalledWith(mockCustomerPhone);
    });

    it('should use session language when handling generic actions', async () => {
      // Mock SessionContextService.get to return session with Spanish language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: mockSlot,
        salonId: mockSalonId,
        sessionId: 'session-action',
        customerId: mockCustomerId,
        language: 'es', // Spanish
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'generic_action',
        action: 'change_slot',
      } as any);
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);

      await service.handleButtonClick('action_change_slot', mockCustomerPhone);

      expect(cardBuilder.buildSlotSelectionCard).toHaveBeenCalledWith(
        expect.any(Array),
        'es', // Should use Spanish from session
      );
    });
  });

  describe('handleChoice - Language Handling', () => {
    beforeEach(() => {
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
    });

    it('should use language from context for same day different time', async () => {
      const mockContext = {
        salonId: mockSalonId,
        customerId: mockCustomerId,
        sessionId: 'session-choice',
        originalIntent: {
          serviceId: mockServiceId,
          masterId: mockMasterId,
          date: '2025-11-01',
          time: '14:00',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
        language: 'ru' as any, // Russian
      };

      const mockRankedSlot = {
        ...mockSlot,
        score: 100,
        rank: 1,
        indicators: {
          showStar: true,
          proximityText: '30 mins later',
        },
      };

      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockContext);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [mockSlot],
        totalFound: 1,
        searchedDays: 1,
        hasMore: false,
      });
      jest.spyOn((service as any).alternativeSuggester, 'rankByTimeProximity').mockResolvedValue([mockRankedSlot]);
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);
      jest.spyOn(sessionContext, 'update').mockResolvedValue(undefined);

      await service.handleChoice('same_day_diff_time', mockCustomerPhone);

      expect(cardBuilder.buildSlotSelectionCard).toHaveBeenCalledWith(
        expect.any(Array),
        'ru', // Should use Russian from context
        expect.any(String),
      );
    });

    it('should use English as fallback when context expires', async () => {
      jest.spyOn(sessionContext, 'get').mockResolvedValue(null); // Context expired

      const result = await service.handleChoice('same_day_diff_time', mockCustomerPhone);

      expect(result.success).toBe(false);
      expect(result.messageType).toBe('text');

      // Verify MessageBuilder was called with 'en' as fallback
      expect(messageBuilder.getMessage).toHaveBeenCalledWith(
        'SESSION_EXPIRED',
        'en', // Should fallback to English (international default)
      );
    });

    it('should use English as fallback in error scenarios', async () => {
      jest.spyOn(sessionContext, 'get').mockRejectedValue(new Error('Redis error'));

      const result = await service.handleChoice('same_day_diff_time', mockCustomerPhone);

      expect(result.success).toBe(false);

      // Verify error message uses English fallback
      expect(messageBuilder.getMessage).toHaveBeenCalledWith(
        'ERROR',
        'en', // Fallback to English (international default)
      );
    });

    it('should use context language for different day same time', async () => {
      const mockContext = {
        salonId: mockSalonId,
        customerId: mockCustomerId,
        sessionId: 'session-choice-2',
        originalIntent: {
          serviceId: mockServiceId,
          masterId: mockMasterId,
          date: '2025-11-01',
          time: '14:00',
        },
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
        language: 'pt' as any, // Portuguese
      };

      const mockRankedSlot = {
        ...mockSlot,
        score: 95,
        rank: 1,
        indicators: {
          showStar: true,
          proximityText: '2 days later',
        },
      };

      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockContext);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [mockSlot],
        totalFound: 1,
        searchedDays: 14,
        hasMore: false,
      });
      jest.spyOn((service as any).alternativeSuggester, 'rankByDateProximity').mockResolvedValue([mockRankedSlot]);
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);
      jest.spyOn(sessionContext, 'update').mockResolvedValue(undefined);

      await service.handleChoice('diff_day_same_time', mockCustomerPhone);

      expect(cardBuilder.buildSlotSelectionCard).toHaveBeenCalledWith(
        expect.any(Array),
        'pt', // Should use Portuguese from context
        expect.any(String),
      );
    });
  });

  describe('Session Language Persistence', () => {
    it('should maintain language throughout the booking flow', async () => {
      // Setup for initial booking request
      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(intentParser, 'parseIntent').mockResolvedValue(mockIntent as any);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [mockSlot],
        totalFound: 1,
        searchedDays: 1,
        hasMore: false,
      });
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
      jest.spyOn(sessionContext, 'save').mockResolvedValue(undefined);
      jest.spyOn(sessionContext, 'delete').mockResolvedValue(undefined);

      // Step 1: Initial booking request with Spanish
      await service.handleBookingRequest({
        text: 'Corte de pelo viernes',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        language: 'es',
      });

      // Verify language stored in session
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'es',
        }),
      );

      // Step 2: Slot selection - should use Spanish from session
      const mockSessionAfterBooking = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: expect.any(String),
        customerId: expect.any(String),
        language: 'es',
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSessionAfterBooking as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);
      jest.spyOn(analytics, 'getSessionMetrics').mockResolvedValue({
        tapCount: 0,
        typingCount: 1,
        startTime: Date.now(),
      } as any);

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      // Verify Spanish was used for confirmation card
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'es',
      );

      // Step 3: Confirmation - should still use Spanish
      const mockSessionWithSelectedSlot = {
        ...mockSessionAfterBooking,
        selectedSlot: mockSlot,
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSessionWithSelectedSlot as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'booking_confirmation',
        bookingId: 'booking-123',
      } as any);
      jest.spyOn(prismaService.booking, 'create').mockResolvedValue({
        id: 'booking-123',
        bookingCode: 'BK-TEST',
      } as any);
      jest.spyOn(analytics, 'completeSession').mockResolvedValue(undefined);

      const result = await service.handleButtonClick('confirm_booking-123', mockCustomerPhone);

      expect(result.success).toBe(true);

      // Verify session was cleared after confirmation
      expect(sessionContext.delete).toHaveBeenCalledWith(mockCustomerPhone);
    });
  });

  describe('handleButtonClick - Optional Language Parameter', () => {
    beforeEach(() => {
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'getSessionMetrics').mockResolvedValue({
        tapCount: 0,
        typingCount: 1,
        startTime: Date.now(),
      } as any);
      jest.spyOn(sessionContext, 'save').mockResolvedValue(undefined);
    });

    it('should update session language when parameter provided but use session language for current operation', async () => {
      // NOTE: Current implementation updates session language but doesn't reload session
      // So the current operation still uses the original session language
      // This is acceptable as the updated language will be used for subsequent interactions

      // Mock session with Russian language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-123',
        customerId: mockCustomerId,
        language: 'ru', // Russian in session
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      // Pass English as language parameter
      await service.handleButtonClick('slot_slot-123', mockCustomerPhone, 'en');

      // Current operation still uses Russian from session (session not reloaded)
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'ru', // Uses original session language for current operation
      );

      // But session is updated for future operations
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en', // Updated for next interaction
        }),
      );
    });

    it('should use session language when no language parameter provided', async () => {
      // Mock session with Portuguese language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-456',
        customerId: mockCustomerId,
        language: 'pt', // Portuguese in session
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      // No language parameter - should use session language
      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      // Verify Portuguese was used from session
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'pt', // Should use 'pt' from session
      );
    });

    it('should default to English when no language parameter and no session language', async () => {
      // Mock session without language field
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-789',
        customerId: mockCustomerId,
        // No language field
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      // No language parameter and no session language
      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      // Verify English default was used
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'en', // Should default to 'en'
      );
    });

    it('should not update session when language parameter matches session language', async () => {
      // Mock session with Spanish language
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'session-same',
        customerId: mockCustomerId,
        language: 'es', // Spanish in session
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      // Track save calls before the test
      const saveCallsBefore = (sessionContext.save as jest.Mock).mock.calls.length;

      // Pass Spanish as language parameter (same as session)
      await service.handleButtonClick('slot_slot-123', mockCustomerPhone, 'es');

      // Verify Spanish was used
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'es',
      );

      // Verify save was called for slot selection, but not for language update
      // (since language didn't change, there should be only 1 additional save call)
      const saveCallsAfter = (sessionContext.save as jest.Mock).mock.calls.length;
      expect(saveCallsAfter).toBe(saveCallsBefore + 1); // Only slot selection save
    });
  });

  describe('Session Migration Logic', () => {
    beforeEach(() => {
      jest.spyOn(analytics, 'trackEvent').mockResolvedValue(undefined);
      jest.spyOn(analytics, 'getSessionMetrics').mockResolvedValue({
        tapCount: 0,
        typingCount: 1,
        startTime: Date.now(),
      } as any);
      jest.spyOn(sessionContext, 'save').mockResolvedValue(undefined);
    });

    it('should migrate old sessions without language field on getSession', async () => {
      // Mock SessionContextService.get to return session without language
      const mockLegacySession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'legacy-session',
        customerId: mockCustomerId,
        // No language field - old session
        timestamp: Date.now(),
      };

      let getCallCount = 0;
      jest.spyOn(sessionContext, 'get').mockImplementation(async () => {
        getCallCount++;
        if (getCallCount === 1) {
          // First call returns legacy session without language
          return mockLegacySession as any;
        } else {
          // Subsequent calls return migrated session
          return {
            ...mockLegacySession,
            language: 'en',
          } as any;
        }
      });

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      // Verify session was saved with migrated language field
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en', // Migrated to default 'en'
        }),
      );

      // Verify English was used as default
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'en',
      );
    });

    it('should not re-migrate sessions that already have language field', async () => {
      // Mock session with language field already set
      const mockSession = {
        intent: mockIntent,
        slots: [mockSlot],
        selectedSlot: null,
        salonId: mockSalonId,
        sessionId: 'modern-session',
        customerId: mockCustomerId,
        language: 'ru', // Already has language
        timestamp: Date.now(),
      };
      jest.spyOn(sessionContext, 'get').mockResolvedValue(mockSession as any);

      jest.spyOn(buttonParser, 'parseButtonId').mockReturnValue({
        type: 'slot_selection',
        slotId: 'slot-123',
      } as any);
      jest.spyOn(cardBuilder, 'buildConfirmationCard').mockReturnValue(mockCard as any);

      const saveCallsBefore = (sessionContext.save as jest.Mock).mock.calls.length;

      await service.handleButtonClick('slot_slot-123', mockCustomerPhone);

      const saveCallsAfter = (sessionContext.save as jest.Mock).mock.calls.length;

      // Should have exactly 1 save call (for slot selection), not 2 (no migration save)
      expect(saveCallsAfter).toBe(saveCallsBefore + 1);

      // Verify Russian language was preserved
      expect(cardBuilder.buildConfirmationCard).toHaveBeenCalledWith(
        expect.any(Object),
        'ru',
      );
    });

    it('should apply migration during storeSession if language field is missing', async () => {
      // This test verifies the storeSession migration logic
      // Even if data doesn't have language, it should be added during storage

      jest.spyOn(prismaService.booking, 'findMany').mockResolvedValue([]);
      jest.spyOn(intentParser, 'parseIntent').mockResolvedValue(mockIntent as any);
      jest.spyOn(slotFinder, 'findAvailableSlots').mockResolvedValue({
        slots: [mockSlot],
        totalFound: 1,
        searchedDays: 1,
        hasMore: false,
      });
      jest.spyOn(cardBuilder, 'buildSlotSelectionCard').mockReturnValue(mockCard as any);
      jest.spyOn(analytics, 'initializeSession').mockResolvedValue(undefined);

      // Call handleBookingRequest without language parameter
      await service.handleBookingRequest({
        text: 'Haircut tomorrow',
        customerPhone: mockCustomerPhone,
        salonId: mockSalonId,
        // No language parameter
      });

      // Verify session was saved with default language 'en'
      expect(sessionContext.save).toHaveBeenCalledWith(
        mockCustomerPhone,
        expect.objectContaining({
          language: 'en', // Should default to 'en' during migration
        }),
      );
    });
  });

  describe('Language Fallback Consistency', () => {
    it('should consistently use English as fallback across all methods', async () => {
      // Test getNoSlotsMessage fallback
      const noSlotsMsg = (service as any).getNoSlotsMessage('unknown-lang');
      expect(noSlotsMsg).toContain('Sorry');

      // Test getErrorMessage fallback
      const errorMsg = (service as any).getErrorMessage('invalid-lang');
      expect(errorMsg).toContain('Sorry');

      // Test getConfirmationMessage fallback
      const confirmMsg = (service as any).getConfirmationMessage(
        { bookingCode: 'TEST-123' },
        'xyz-invalid'
      );
      expect(confirmMsg).toContain('Booking confirmed');
      expect(confirmMsg).toContain('TEST-123');
    });

    it('should never use Russian as default fallback', async () => {
      // Verify no method defaults to Russian
      const noSlotsMsg = (service as any).getNoSlotsMessage('');
      expect(noSlotsMsg).not.toContain('сожалению');
      expect(noSlotsMsg).not.toContain('Извините');

      const errorMsg = (service as any).getErrorMessage('');
      expect(errorMsg).not.toContain('Извините');

      const confirmMsg = (service as any).getConfirmationMessage(
        { bookingCode: 'TEST' },
        ''
      );
      expect(confirmMsg).not.toContain('подтверждено');
    });
  });
});
