/**
 * Unit Tests for SessionContextService
 *
 * @module tests/unit/session-context
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionContextService } from '../../src/modules/ai/services/session-context.service';
import { BookingContext } from '../../src/modules/ai/types/choice.types';
import Redis from 'ioredis';

// Mock Redis client
const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  ttl: jest.fn(),
};

describe('SessionContextService', () => {
  let service: SessionContextService;
  let redisClient: typeof mockRedis;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionContextService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<SessionContextService>(SessionContextService);
    redisClient = module.get('REDIS_CLIENT');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('save', () => {
    it('should save context to Redis with TTL', async () => {
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

      mockRedis.setex.mockResolvedValue('OK');

      await service.save('+1234567890', context);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'booking:session:1234567890',
        1800, // 30 minutes TTL
        JSON.stringify(context),
      );
    });

    it('should normalize phone number', async () => {
      const context: BookingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'en',
        originalIntent: {},
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      mockRedis.setex.mockResolvedValue('OK');

      await service.save('+1 (234) 567-8900', context);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'booking:session:12345678900',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should handle Redis failure gracefully', async () => {
      const context: BookingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error
      await expect(service.save('+1234567890', context)).resolves.not.toThrow();
    });

    it('should handle timeout', async () => {
      const context: BookingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [],
        createdAt: new Date(),
        lastInteractionAt: new Date(),
      };

      // Simulate timeout
      mockRedis.setex.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 200))
      );

      await expect(service.save('+1234567890', context)).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    it('should retrieve context from Redis', async () => {
      const storedContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [],
        createdAt: '2025-10-25T10:00:00.000Z',
        lastInteractionAt: '2025-10-25T10:00:00.000Z',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedContext));
      mockRedis.expire.mockResolvedValue(1);

      const context = await service.get('+1234567890');

      expect(context).toBeDefined();
      expect(context?.sessionId).toBe('sess_123');
      expect(context?.createdAt).toBeInstanceOf(Date);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'booking:session:1234567890',
        1800,
      );
    });

    it('should return null if context not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const context = await service.get('+1234567890');

      expect(context).toBeNull();
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should parse choices dates correctly', async () => {
      const storedContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [
          {
            choiceId: 'same_day_diff_time',
            selectedAt: '2025-10-25T10:00:00.000Z',
          },
        ],
        createdAt: '2025-10-25T10:00:00.000Z',
        lastInteractionAt: '2025-10-25T10:00:00.000Z',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedContext));
      mockRedis.expire.mockResolvedValue(1);

      const context = await service.get('+1234567890');

      expect(context?.choices[0].selectedAt).toBeInstanceOf(Date);
    });

    it('should return null for invalid JSON', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const context = await service.get('+1234567890');

      expect(context).toBeNull();
    });

    it('should handle Redis failure gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const context = await service.get('+1234567890');

      expect(context).toBeNull();
    });

    it('should handle missing required fields', async () => {
      const invalidContext = {
        // Missing sessionId
        customerId: 'cust_456',
        salonId: 'salon_789',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(invalidContext));

      const context = await service.get('+1234567890');

      expect(context).toBeNull();
    });
  });

  describe('update', () => {
    it('should update existing context', async () => {
      const existingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [],
        createdAt: '2025-10-25T10:00:00.000Z',
        lastInteractionAt: '2025-10-25T10:00:00.000Z',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingContext));
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);

      const updates = {
        choices: [
          {
            choiceId: 'same_day_diff_time' as const,
            selectedAt: new Date(),
          },
        ],
      };

      await service.update('+1234567890', updates);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'booking:session:1234567890',
        1800,
        expect.stringContaining('same_day_diff_time'),
      );
    });

    it('should not update non-existent context', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.update('+1234567890', { language: 'en' });

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should always update lastInteractionAt', async () => {
      const existingContext = {
        sessionId: 'sess_123',
        customerId: 'cust_456',
        salonId: 'salon_789',
        language: 'ru',
        originalIntent: {},
        choices: [],
        createdAt: '2025-10-25T10:00:00.000Z',
        lastInteractionAt: '2025-10-25T10:00:00.000Z',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingContext));
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);

      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      await service.update('+1234567890', {});

      const savedData = JSON.parse(mockRedis.setex.mock.calls[0][2]);
      expect(new Date(savedData.lastInteractionAt).getTime()).toBe(now.getTime());
    });
  });

  describe('delete', () => {
    it('should delete context from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.delete('+1234567890');

      expect(mockRedis.del).toHaveBeenCalledWith('booking:session:1234567890');
    });

    it('should handle deletion failure gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.delete('+1234567890')).resolves.not.toThrow();
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = service.generateSessionId();
      const id2 = service.generateSessionId();

      expect(id1).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getActiveSessions', () => {
    it('should return list of active session keys', async () => {
      mockRedis.keys.mockResolvedValue([
        'booking:session:1234567890',
        'booking:session:0987654321',
      ]);

      const sessions = await service.getActiveSessions();

      expect(sessions).toHaveLength(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('booking:session:*');
    });

    it('should handle error gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const sessions = await service.getActiveSessions();

      expect(sessions).toEqual([]);
    });
  });

  describe('clearExpiredSessions', () => {
    it('should clear expired sessions', async () => {
      mockRedis.keys.mockResolvedValue([
        'booking:session:1234567890',
        'booking:session:0987654321',
      ]);
      mockRedis.ttl.mockResolvedValueOnce(-1).mockResolvedValueOnce(100);
      mockRedis.del.mockResolvedValue(1);

      const cleared = await service.clearExpiredSessions();

      expect(cleared).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('booking:session:1234567890');
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const cleared = await service.clearExpiredSessions();

      expect(cleared).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return session statistics', async () => {
      mockRedis.keys.mockResolvedValue([
        'booking:session:1234567890',
        'booking:session:0987654321',
      ]);
      mockRedis.ttl.mockResolvedValueOnce(600).mockResolvedValueOnce(1200);

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        totalSessions: 2,
        averageTTL: 900,
      });
    });

    it('should handle empty sessions', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        totalSessions: 0,
        averageTTL: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        totalSessions: 0,
        averageTTL: 0,
      });
    });
  });
});