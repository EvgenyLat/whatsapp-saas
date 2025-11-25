import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiCacheService } from '../../../src/modules/cache/services/ai-cache.service';
import { RedisConnectionService } from '../../../src/modules/cache/services/redis-connection.service';
import { ResponseCategory, Language } from '../../../src/modules/cache/enums';
import { CONFIDENCE_THRESHOLD } from '../../../src/modules/cache/constants';

describe('AiCacheService', () => {
  let service: AiCacheService;
  let redisConnection: RedisConnectionService;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
      scan: jest.fn(),
    };

    // Mock Redis connection service
    const mockRedisConnection = {
      isRedisConnected: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      getConnectionInfo: jest.fn().mockReturnValue({
        connected: true,
        reconnectAttempts: 0,
      }),
    };

    // Mock Config service
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        aiCache: {
          enabled: true,
          minConfidence: 0.7,
          enableWarmup: false,
          enableMaintenance: true,
          enableAnalytics: true,
          enableGracefulDegradation: true,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCacheService,
        {
          provide: RedisConnectionService,
          useValue: mockRedisConnection,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AiCacheService>(AiCacheService);
    redisConnection = module.get<RedisConnectionService>(RedisConnectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('lookup', () => {
    it('should return cache hit when response exists', async () => {
      const cachedData = {
        id: '123',
        cacheKey: 'test-key',
        originalQuery: 'What are your hours?',
        normalizedQuery: 'hours your',
        language: 'en',
        responseText: 'We are open 9-5',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.HOURS,
        hitCount: 5,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      mockRedisClient.ttl.mockResolvedValue(3600);

      const result = await service.lookup({
        query: 'What are your hours?',
        language: 'en',
      });

      expect(result.hit).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.responseText).toBe('We are open 9-5');
      expect(result.responseTime).toBeLessThan(100); // Should be fast
    });

    it('should return cache miss when response does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.lookup({
        query: 'What is your address?',
        language: 'en',
      });

      expect(result.hit).toBe(false);
      expect(result.response).toBeUndefined();
    });

    it('should handle query normalization correctly', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.lookup({
        query: '  What ARE your HOURS???  ',
        language: 'en',
      });

      // Should have called get with normalized query hash
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should return miss when circuit is open', async () => {
      // Trigger circuit breaker by causing failures
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      for (let i = 0; i < 5; i++) {
        await service.lookup({ query: 'test', language: 'en' });
      }

      // Circuit should now be open
      const result = await service.lookup({ query: 'test', language: 'en' });
      expect(result.hit).toBe(false);
    });
  });

  describe('store', () => {
    it('should store response with sufficient confidence', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.store({
        originalQuery: 'What are your hours?',
        normalizedQuery: 'hours your',
        language: 'en',
        responseText: 'We are open 9-5',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.HOURS,
      });

      expect(result).toBe(true);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should not store response with low confidence', async () => {
      const result = await service.store({
        originalQuery: 'What are your hours?',
        normalizedQuery: 'hours your',
        language: 'en',
        responseText: 'We are open 9-5',
        confidenceScore: 0.5, // Below threshold
        responseCategory: ResponseCategory.HOURS,
      });

      expect(result).toBe(false);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should apply correct TTL for category', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.store({
        originalQuery: 'Hello',
        normalizedQuery: 'hello',
        language: 'en',
        responseText: 'Hi there!',
        confidenceScore: 0.95,
        responseCategory: ResponseCategory.GREETING,
      });

      // Greetings should have no expiration (set, not setex)
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should not store when circuit is open', async () => {
      // Trigger circuit breaker
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      for (let i = 0; i < 5; i++) {
        await service.store({
          originalQuery: 'test',
          normalizedQuery: 'test',
          language: 'en',
          responseText: 'test',
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.GENERAL,
        });
      }

      // Circuit should now be open
      const result = await service.store({
        originalQuery: 'test',
        normalizedQuery: 'test',
        language: 'en',
        responseText: 'test',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      expect(result).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should invalidate a specific cache entry', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.invalidate('What are your hours?', 'en');

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should handle invalidation errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await service.invalidate('test', 'en');

      expect(result).toBe(false);
    });
  });

  describe('invalidateByCategory', () => {
    it('should invalidate entries by category', async () => {
      const mockEntries = [
        {
          responseCategory: ResponseCategory.PRICING,
          cacheKey: 'key1',
        },
        {
          responseCategory: ResponseCategory.HOURS,
          cacheKey: 'key2',
        },
      ];

      mockRedisClient.scan.mockResolvedValue(['0', ['key1', 'key2']]);
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockEntries[0]))
        .mockResolvedValueOnce(JSON.stringify(mockEntries[1]));
      mockRedisClient.del.mockResolvedValue(1);

      const count = await service.invalidateByCategory(ResponseCategory.PRICING);

      expect(count).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      // Generate some metrics
      await service.lookup({ query: 'test1', language: 'en' });
      await service.lookup({ query: 'test2', language: 'en' });

      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics.requestCount).toBe(2);
    });

    it('should calculate hit rate correctly', async () => {
      const cachedData = {
        id: '123',
        cacheKey: 'test-key',
        originalQuery: 'test',
        normalizedQuery: 'test',
        language: 'en',
        responseText: 'response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
        hitCount: 1,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockRedisClient.ttl.mockResolvedValue(3600);

      // 2 hits, 1 miss
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(cachedData))
        .mockResolvedValueOnce(JSON.stringify(cachedData))
        .mockResolvedValueOnce(null);

      await service.lookup({ query: 'test', language: 'en' });
      await service.lookup({ query: 'test', language: 'en' });
      await service.lookup({ query: 'other', language: 'en' });

      const metrics = service.getMetrics();

      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection failed'));

      // Cause 5 failures
      for (let i = 0; i < 5; i++) {
        await service.lookup({ query: 'test', language: 'en' });
      }

      const metrics = service.getMetrics();
      expect(metrics.circuitOpen).toBe(true);
      expect(metrics.failureCount).toBeGreaterThanOrEqual(5);
    });

    it('should reset circuit after successful operation', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      // Successful store should reset circuit
      await service.store({
        originalQuery: 'test',
        normalizedQuery: 'test',
        language: 'en',
        responseText: 'test',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      const metrics = service.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.circuitOpen).toBe(false);
    });
  });

  describe('multi-language support', () => {
    it('should handle different languages correctly', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const languages: Array<'ru' | 'en' | 'es' | 'pt' | 'he'> = ['ru', 'en', 'es', 'pt', 'he'];

      for (const language of languages) {
        const result = await service.lookup({
          query: 'What are your hours?',
          language,
        });

        expect(result.hit).toBe(false);
        expect(mockRedisClient.get).toHaveBeenCalled();
      }
    });

    it('should create separate cache keys for each language', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.store({
        originalQuery: 'Hello',
        normalizedQuery: 'hello',
        language: 'en',
        responseText: 'Hi!',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GREETING,
      });

      await service.store({
        originalQuery: 'Привет',
        normalizedQuery: 'привет',
        language: 'ru',
        responseText: 'Здравствуйте!',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GREETING,
      });

      // Both should have different cache keys
      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
    });
  });
});
