import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { PrismaService } from '@database/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { ServicesService } from '../services/services.service';
import { MastersService } from '../masters/masters.service';
import { RemindersService } from '../reminders/reminders.service';
import { UsageTrackingService } from '../salons/services/usage-tracking.service';
import { AIConversationRepository } from './repositories/ai-conversation.repository';
import { AIMessageRepository } from './repositories/ai-message.repository';
import { CacheService } from './services/cache.service';
import { LanguageDetectorService } from './services/language-detector.service';

describe('AIService', () => {
  let service: AIService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        OPENAI_API_KEY: 'test-api-key',
        OPENAI_MODEL: 'gpt-4',
        OPENAI_MAX_TOKENS: 1000,
        OPENAI_TEMPERATURE: 0.7,
      };
      return config[key] || defaultValue;
    }),
  };

  const mockPrismaService = {
    salon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockBookingsService = {
    create: jest.fn(),
  };

  const mockBookingsRepository = {
    findAll: jest.fn(),
    create: jest.fn(),
    findPaginatedWithFilters: jest.fn(),
  };

  const mockServicesService = {
    findBySalonId: jest.fn().mockResolvedValue([]),
  };

  const mockMastersService = {
    findBySalonId: jest.fn().mockResolvedValue([]),
  };

  const mockRemindersService = {
    scheduleBookingReminders: jest.fn(),
  };

  const mockUsageTrackingService = {
    checkBookingLimit: jest.fn().mockResolvedValue({ allowed: true }),
    incrementBookingCount: jest.fn(),
  };

  const mockAIConversationRepository = {
    findOrCreate: jest.fn(),
    updateTokens: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAIMessageRepository = {
    create: jest.fn(),
    getLastN: jest.fn(),
    getStats: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockLanguageDetectorService = {
    detectLanguage: jest.fn().mockReturnValue('ru'),
  };

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: 'OPENAI_CLIENT', useValue: mockOpenAI },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BookingsService, useValue: mockBookingsService },
        { provide: BookingsRepository, useValue: mockBookingsRepository },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: MastersService, useValue: mockMastersService },
        { provide: RemindersService, useValue: mockRemindersService },
        { provide: UsageTrackingService, useValue: mockUsageTrackingService },
        { provide: AIConversationRepository, useValue: mockAIConversationRepository },
        { provide: AIMessageRepository, useValue: mockAIMessageRepository },
        { provide: CacheService, useValue: mockCacheService },
        { provide: LanguageDetectorService, useValue: mockLanguageDetectorService },
      ],
    }).compile();

    service = module.get<AIService>(AIService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should return available when no conflicts', async () => {
      // Use future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(15, 0, 0, 0);

      // Mock no existing bookings
      mockBookingsRepository.findAll.mockResolvedValue([]);

      const result = await service.checkAvailability('salon-id', 'Аня', futureDate.toISOString());

      expect(result.available).toBe(true);
      expect(result.masterName).toBe('Аня');
    });

    it('should return unavailable when slot is occupied', async () => {
      // Use future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(15, 0, 0, 0);

      // Mock existing booking at requested time
      mockBookingsRepository.findAll.mockResolvedValue([
        {
          id: 'booking-1',
          start_ts: futureDate,
          status: 'CONFIRMED',
        },
      ]);

      const result = await service.checkAvailability('salon-id', 'Аня', futureDate.toISOString());

      expect(result.available).toBe(false);
    });

    it('should reject past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await service.checkAvailability('salon-id', 'Аня', pastDate.toISOString());

      expect(result.available).toBe(false);
      expect(result.message).toContain('past');
    });
  });

  describe('createBookingFromAI', () => {
    it('should create booking when time is available', async () => {
      // Use a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(15, 0, 0, 0);

      // Mock booking creation
      const mockBooking = {
        id: 'booking-1',
        booking_code: 'BK-ABC123',
        salon_id: 'salon-id',
        customer_phone: '+79001234567',
        customer_name: 'Test User',
        service: 'Маникюр',
        start_ts: futureDate,
        status: 'CONFIRMED',
      };

      // Mock Prisma transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          booking: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue(mockBooking),
          },
        });
      });

      const result = await service.createBookingFromAI({
        salon_id: 'salon-id',
        customer_name: 'Test User',
        customer_phone: '+79001234567',
        master_name: 'Аня',
        service: 'Маникюр',
        date_time: futureDate.toISOString(),
      });

      expect(result.success).toBe(true);
      expect(result.bookingCode).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should not create booking when time is unavailable', async () => {
      // Use a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(15, 0, 0, 0);

      // Mock Prisma transaction that finds existing booking
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          booking: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'booking-1',
                start_ts: futureDate,
                status: 'CONFIRMED',
              },
            ]),
            create: jest.fn(),
          },
        });
      });

      const result = await service.createBookingFromAI({
        salon_id: 'salon-id',
        customer_name: 'Test User',
        customer_phone: '+79001234567',
        service: 'Маникюр',
        date_time: futureDate.toISOString(),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getConversationHistory', () => {
    it('should return formatted message history', async () => {
      const mockMessages = [
        {
          id: '1',
          conversation_id: 'conv-1',
          salon_id: 'salon-1',
          phone_number: '+79001234567',
          direction: 'INBOUND',
          content: 'Hello',
          created_at: new Date(),
        },
        {
          id: '2',
          conversation_id: 'conv-1',
          salon_id: 'salon-1',
          phone_number: '+79001234567',
          direction: 'OUTBOUND',
          content: 'Hi! How can I help?',
          created_at: new Date(),
        },
      ];

      mockAIMessageRepository.getLastN.mockResolvedValue(mockMessages);

      const result = await service.getConversationHistory('conv-1');

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('getConversationStats', () => {
    it('should return aggregated stats', async () => {
      const mockStats = {
        totalConversations: 10,
        totalMessages: 50,
        totalTokens: 25000,
        totalCost: 0.75,
      };

      mockAIConversationRepository.getStats.mockResolvedValue(mockStats);

      const result = await service.getConversationStats('salon-id');

      expect(result.totalConversations).toBe(10);
      expect(result.totalTokens).toBe(25000);
    });
  });

  describe('getMessageStats', () => {
    it('should return message statistics', async () => {
      const mockStats = {
        totalMessages: 50,
        inboundMessages: 25,
        outboundMessages: 25,
        totalTokens: 25000,
        totalCost: 0.75,
        averageResponseTime: 1200,
      };

      mockAIMessageRepository.getStats.mockResolvedValue(mockStats);

      const result = await service.getMessageStats('salon-id');

      expect(result.totalMessages).toBe(50);
      expect(result.totalCost).toBe(0.75);
    });
  });

  // TODO: Add integration tests with real OpenAI API (using test API key)
  // TODO: Add tests for processMessage method (requires OpenAI mock)
});
