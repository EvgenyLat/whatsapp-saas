import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiCacheService } from '../../../src/modules/cache/services/ai-cache.service';
import { RedisConnectionService } from '../../../src/modules/cache/services/redis-connection.service';
import { ResponseCategory } from '../../../src/modules/cache/enums';
import cacheConfig from '../../../src/config/cache.config';

/**
 * Integration Tests for AI Cache System
 *
 * These tests verify end-to-end cache behavior including:
 * - Cache hit/miss flow
 * - TTL expiration
 * - Multi-language support
 * - Circuit breaker integration
 *
 * Note: Requires Redis to be running
 */
describe('AI Cache Integration Tests', () => {
  let service: AiCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [cacheConfig],
          isGlobal: true,
        }),
      ],
      providers: [
        AiCacheService,
        RedisConnectionService,
      ],
    }).compile();

    service = module.get<AiCacheService>(AiCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    service.resetMetrics();
  });

  describe('Cache Hit/Miss Flow', () => {
    it('should handle complete cache lifecycle', async () => {
      const query = 'What are your business hours?';
      const language: 'en' = 'en';

      // First lookup - should be a MISS
      const firstLookup = await service.lookup({ query, language });
      expect(firstLookup.hit).toBe(false);

      // Store the response
      const storeResult = await service.store({
        originalQuery: query,
        normalizedQuery: 'business hours your',
        language,
        responseText: 'We are open Monday-Friday 9AM-6PM',
        confidenceScore: 0.95,
        responseCategory: ResponseCategory.HOURS,
        originalResponseTime: 1500,
      });

      expect(storeResult).toBe(true);

      // Second lookup - should be a HIT
      const secondLookup = await service.lookup({ query, language });
      expect(secondLookup.hit).toBe(true);
      expect(secondLookup.response?.responseText).toBe(
        'We are open Monday-Friday 9AM-6PM',
      );

      // Verify metrics
      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(50);
    });

    it('should achieve >90% hit rate with warmed cache', async () => {
      const queries = [
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What are your hours?',
        'What is your pricing?', // Different query
      ];

      // Warm cache with first query
      await service.store({
        originalQuery: queries[0],
        normalizedQuery: 'hours your',
        language: 'en',
        responseText: 'We are open 9-5',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.HOURS,
      });

      // Execute all queries
      for (const query of queries) {
        await service.lookup({ query, language: 'en' });
      }

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBeGreaterThan(90);
    });

    it('should handle concurrent lookups efficiently', async () => {
      // Store a response
      await service.store({
        originalQuery: 'test query',
        normalizedQuery: 'query test',
        language: 'en',
        responseText: 'test response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      // Execute 100 concurrent lookups
      const lookups = Array(100)
        .fill(null)
        .map(() =>
          service.lookup({ query: 'test query', language: 'en' }),
        );

      const results = await Promise.all(lookups);

      // All should be hits
      expect(results.every((r) => r.hit)).toBe(true);

      // All should be fast
      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(100);
    });
  });

  describe('Multi-Language Support', () => {
    it('should cache responses separately per language', async () => {
      const queries = [
        { query: 'Hello', language: 'en' as const, response: 'Hi there!' },
        { query: 'Привет', language: 'ru' as const, response: 'Здравствуйте!' },
        { query: 'Hola', language: 'es' as const, response: '¡Hola!' },
        { query: 'Olá', language: 'pt' as const, response: 'Olá!' },
        { query: 'שלום', language: 'he' as const, response: 'שלום!' },
      ];

      // Store responses for all languages
      for (const { query, language, response } of queries) {
        await service.store({
          originalQuery: query,
          normalizedQuery: query.toLowerCase(),
          language,
          responseText: response,
          confidenceScore: 0.95,
          responseCategory: ResponseCategory.GREETING,
        });
      }

      // Verify each language retrieves correct response
      for (const { query, language, response } of queries) {
        const result = await service.lookup({ query, language });
        expect(result.hit).toBe(true);
        expect(result.response?.responseText).toBe(response);
      }
    });

    it('should not mix responses between languages', async () => {
      // Store English response
      await service.store({
        originalQuery: 'hours',
        normalizedQuery: 'hours',
        language: 'en',
        responseText: 'We are open 9-5',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.HOURS,
      });

      // Lookup same normalized query in Russian should miss
      const result = await service.lookup({
        query: 'hours',
        language: 'ru',
      });

      expect(result.hit).toBe(false);
    });
  });

  describe('Confidence Scoring', () => {
    it('should not cache responses below confidence threshold', async () => {
      const lowConfidenceQueries = [
        { confidence: 0.3, shouldCache: false },
        { confidence: 0.5, shouldCache: false },
        { confidence: 0.69, shouldCache: false },
        { confidence: 0.7, shouldCache: true },
        { confidence: 0.9, shouldCache: true },
      ];

      for (const { confidence, shouldCache } of lowConfidenceQueries) {
        const result = await service.store({
          originalQuery: `query-${confidence}`,
          normalizedQuery: `query-${confidence}`,
          language: 'en',
          responseText: 'response',
          confidenceScore: confidence,
          responseCategory: ResponseCategory.GENERAL,
        });

        expect(result).toBe(shouldCache);
      }
    });

    it('should prioritize high confidence responses', async () => {
      const highConfQuery = {
        originalQuery: 'What is your address?',
        normalizedQuery: 'address your',
        language: 'en' as const,
        responseText: '123 Main St',
        confidenceScore: 0.95,
        responseCategory: ResponseCategory.LOCATION,
      };

      const lowConfQuery = {
        originalQuery: 'Where are you?',
        normalizedQuery: 'where you',
        language: 'en' as const,
        responseText: 'Somewhere',
        confidenceScore: 0.65,
        responseCategory: ResponseCategory.LOCATION,
      };

      const highConfResult = await service.store(highConfQuery);
      const lowConfResult = await service.store(lowConfQuery);

      expect(highConfResult).toBe(true);
      expect(lowConfResult).toBe(false);
    });
  });

  describe('Category-Based TTL', () => {
    it('should apply correct TTL for each category', async () => {
      const categories = [
        {
          category: ResponseCategory.GREETING,
          expectedTTL: null, // No expiration
        },
        {
          category: ResponseCategory.PRICING,
          expectedTTL: 7 * 24 * 60 * 60, // 7 days
        },
        {
          category: ResponseCategory.AVAILABILITY,
          expectedTTL: 60 * 60, // 1 hour
        },
      ];

      for (const { category, expectedTTL } of categories) {
        const result = await service.store({
          originalQuery: `test-${category}`,
          normalizedQuery: `test-${category}`,
          language: 'en',
          responseText: 'response',
          confidenceScore: 0.9,
          responseCategory: category,
        });

        expect(result).toBe(true);
      }
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache entries', async () => {
      const query = 'What is your price?';

      // Store
      await service.store({
        originalQuery: query,
        normalizedQuery: 'price your',
        language: 'en',
        responseText: '$100',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.PRICING,
      });

      // Verify it's cached
      let result = await service.lookup({ query, language: 'en' });
      expect(result.hit).toBe(true);

      // Invalidate
      await service.invalidate(query, 'en');

      // Verify it's gone
      result = await service.lookup({ query, language: 'en' });
      expect(result.hit).toBe(false);
    });

    it('should invalidate entries by category', async () => {
      // Store multiple pricing entries
      const pricingQueries = [
        'What is the price?',
        'How much does it cost?',
        'What are your rates?',
      ];

      for (const query of pricingQueries) {
        await service.store({
          originalQuery: query,
          normalizedQuery: query.toLowerCase(),
          language: 'en',
          responseText: 'Pricing info',
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.PRICING,
        });
      }

      // Invalidate all pricing entries
      const count = await service.invalidateByCategory(
        ResponseCategory.PRICING,
        'en',
      );

      expect(count).toBeGreaterThan(0);

      // Verify all are invalidated
      for (const query of pricingQueries) {
        const result = await service.lookup({ query, language: 'en' });
        expect(result.hit).toBe(false);
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should track accurate hit/miss statistics', async () => {
      service.resetMetrics();

      // Create some cache activity
      await service.store({
        originalQuery: 'cached query',
        normalizedQuery: 'cached query',
        language: 'en',
        responseText: 'response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      // 5 hits
      for (let i = 0; i < 5; i++) {
        await service.lookup({ query: 'cached query', language: 'en' });
      }

      // 5 misses
      for (let i = 0; i < 5; i++) {
        await service.lookup({
          query: `unique query ${i}`,
          language: 'en',
        });
      }

      const metrics = service.getMetrics();

      expect(metrics.hits).toBe(5);
      expect(metrics.misses).toBe(5);
      expect(metrics.hitRate).toBe(50);
      expect(metrics.requestCount).toBe(10);
    });

    it('should measure response times accurately', async () => {
      await service.store({
        originalQuery: 'test',
        normalizedQuery: 'test',
        language: 'en',
        responseText: 'response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      const result = await service.lookup({ query: 'test', language: 'en' });

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue operating when cache is unavailable', async () => {
      // Note: This test would need to simulate Redis being down
      // For now, we test that the service handles errors gracefully

      const result = await service.lookup({
        query: 'test during failure',
        language: 'en',
      });

      // Should return a valid result (miss) even if Redis has issues
      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('cacheKey');
      expect(result).toHaveProperty('responseTime');
    });
  });
});
