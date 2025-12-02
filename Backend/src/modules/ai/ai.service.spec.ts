import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { AIConversationRepository } from './repositories/ai-conversation.repository';
import { AIMessageRepository } from './repositories/ai-message.repository';

describe('AIService', () => {
  let service: AIService;
  let bookingsService: BookingsService;
  let bookingsRepository: BookingsRepository;
  let aiConversationRepository: AIConversationRepository;
  let aiMessageRepository: AIMessageRepository;

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

  const mockBookingsService = {
    create: jest.fn(),
  };

  const mockBookingsRepository = {
    findAll: jest.fn(),
    create: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
        {
          provide: BookingsRepository,
          useValue: mockBookingsRepository,
        },
        {
          provide: AIConversationRepository,
          useValue: mockAIConversationRepository,
        },
        {
          provide: AIMessageRepository,
          useValue: mockAIMessageRepository,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    bookingsService = module.get<BookingsService>(BookingsService);
    bookingsRepository = module.get<BookingsRepository>(BookingsRepository);
    aiConversationRepository = module.get<AIConversationRepository>(AIConversationRepository);
    aiMessageRepository = module.get<AIMessageRepository>(AIMessageRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should return available when no conflicts', async () => {
      // Mock no existing bookings
      mockBookingsRepository.findAll.mockResolvedValue([]);

      const result = await service.checkAvailability('salon-id', 'Аня', '2025-10-25T15:00:00Z');

      expect(result.available).toBe(true);
      expect(result.masterName).toBe('Аня');
    });

    it('should return unavailable with alternatives when slot is occupied', async () => {
      // Mock existing booking at requested time
      mockBookingsRepository.findAll.mockResolvedValue([
        {
          id: 'booking-1',
          start_ts: new Date('2025-10-25T15:00:00Z'),
          status: 'CONFIRMED',
        },
      ]);

      const result = await service.checkAvailability('salon-id', 'Аня', '2025-10-25T15:00:00Z');

      expect(result.available).toBe(false);
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives?.length).toBeGreaterThan(0);
    });

    it('should reject past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await service.checkAvailability('salon-id', 'Аня', pastDate.toISOString());

      expect(result.available).toBe(false);
      expect(result.message).toContain('прошлом');
    });
  });

  describe('createBookingFromAI', () => {
    it('should create booking when time is available', async () => {
      // Mock availability check
      mockBookingsRepository.findAll.mockResolvedValue([]);

      // Mock booking creation
      const mockBooking = {
        id: 'booking-1',
        booking_code: 'BK-ABC123',
        salon_id: 'salon-id',
        customer_phone: '+79001234567',
        customer_name: 'Test User',
        service: 'Маникюр',
        start_ts: new Date('2025-10-25T15:00:00Z'),
        status: 'CONFIRMED',
      };
      mockBookingsRepository.create.mockResolvedValue(mockBooking);

      const result = await service.createBookingFromAI({
        salon_id: 'salon-id',
        customer_name: 'Test User',
        customer_phone: '+79001234567',
        master_name: 'Аня',
        service: 'Маникюр',
        date_time: '2025-10-25T15:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.bookingCode).toBeDefined();
      expect(mockBookingsRepository.create).toHaveBeenCalled();
    });

    it('should not create booking when time is unavailable', async () => {
      // Mock existing booking
      mockBookingsRepository.findAll.mockResolvedValue([
        {
          id: 'booking-1',
          start_ts: new Date('2025-10-25T15:00:00Z'),
          status: 'CONFIRMED',
        },
      ]);

      const result = await service.createBookingFromAI({
        salon_id: 'salon-id',
        customer_name: 'Test User',
        customer_phone: '+79001234567',
        service: 'Маникюр',
        date_time: '2025-10-25T15:00:00Z',
      });

      expect(result.success).toBe(false);
      expect(mockBookingsRepository.create).not.toHaveBeenCalled();
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
