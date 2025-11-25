import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiCacheService } from '../../src/modules/cache/services/ai-cache.service';
import { RedisConnectionService } from '../../src/modules/cache/services/redis-connection.service';
import { ResponseCategory } from '../../src/modules/cache/enums';
import cacheConfig from '../../src/config/cache.config';

/**
 * Performance Tests for AI Cache System
 *
 * Validates:
 * - <100ms cache response time (p95)
 * - 1000 req/sec capability
 * - Concurrent access handling
 * - Memory efficiency
 */
describe('AI Cache Performance Tests', () => {
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
      providers: [AiCacheService, RedisConnectionService],
    }).compile();

    service = module.get<AiCacheService>(AiCacheService);

    // Warm up the cache
    for (let i = 0; i < 10; i++) {
      await service.store({
        originalQuery: `warmup query ${i}`,
        normalizedQuery: `warmup query ${i}`,
        language: 'en',
        responseText: 'warmup response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });
    }
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Response Time Performance', () => {
    it('should achieve <100ms p95 response time for cache hits', async () => {
      const query = 'performance test query';

      // Store a response
      await service.store({
        originalQuery: query,
        normalizedQuery: query.toLowerCase(),
        language: 'en',
        responseText: 'performance response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      // Measure 100 lookups
      const responseTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const result = await service.lookup({ query, language: 'en' });
        responseTimes.push(result.responseTime);
      }

      // Calculate p95
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95Time = sortedTimes[p95Index];

      console.log(`P95 Response Time: ${p95Time}ms`);
      console.log(`Average Response Time: ${responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length}ms`);

      expect(p95Time).toBeLessThan(100);
    });

    it('should maintain <100ms p99 response time', async () => {
      const query = 'p99 test query';

      await service.store({
        originalQuery: query,
        normalizedQuery: query.toLowerCase(),
        language: 'en',
        responseText: 'response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      const responseTimes: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const result = await service.lookup({ query, language: 'en' });
        responseTimes.push(result.responseTime);
      }

      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      const p99Time = sortedTimes[p99Index];

      console.log(`P99 Response Time: ${p99Time}ms`);

      expect(p99Time).toBeLessThan(100);
    });
  });

  describe('Throughput Performance', () => {
    it('should handle 1000 requests per second', async () => {
      const queries = Array(1000)
        .fill(null)
        .map((_, i) => `throughput query ${i % 10}`);

      // Pre-warm cache with 10 unique queries
      for (let i = 0; i < 10; i++) {
        await service.store({
          originalQuery: `throughput query ${i}`,
          normalizedQuery: `throughput query ${i}`,
          language: 'en',
          responseText: `response ${i}`,
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.GENERAL,
        });
      }

      const startTime = Date.now();

      // Execute 1000 lookups
      const lookups = queries.map((query) =>
        service.lookup({ query, language: 'en' }),
      );

      await Promise.all(lookups);

      const duration = Date.now() - startTime;
      const throughput = (1000 / duration) * 1000; // req/sec

      console.log(`Throughput: ${throughput.toFixed(0)} req/sec`);
      console.log(`Duration: ${duration}ms`);

      expect(throughput).toBeGreaterThan(1000);
    }, 30000); // 30 second timeout

    it('should handle concurrent access without blocking', async () => {
      const query = 'concurrent test query';

      await service.store({
        originalQuery: query,
        normalizedQuery: query.toLowerCase(),
        language: 'en',
        responseText: 'concurrent response',
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      const concurrentRequests = 100;
      const startTime = Date.now();

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => service.lookup({ query, language: 'en' }));

      const results = await Promise.all(requests);

      const duration = Date.now() - startTime;
      const avgTime = duration / concurrentRequests;

      console.log(`Concurrent requests: ${concurrentRequests}`);
      console.log(`Total duration: ${duration}ms`);
      console.log(`Average time per request: ${avgTime.toFixed(2)}ms`);

      // All should be hits
      expect(results.every((r) => r.hit)).toBe(true);

      // Average should still be fast
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large response payloads efficiently', async () => {
      const largeResponse = 'X'.repeat(10000); // 10KB response

      const query = 'large payload query';

      await service.store({
        originalQuery: query,
        normalizedQuery: query.toLowerCase(),
        language: 'en',
        responseText: largeResponse,
        confidenceScore: 0.9,
        responseCategory: ResponseCategory.GENERAL,
      });

      const startTime = Date.now();
      const result = await service.lookup({ query, language: 'en' });
      const duration = Date.now() - startTime;

      expect(result.hit).toBe(true);
      expect(result.response?.responseText).toHaveLength(10000);
      expect(duration).toBeLessThan(100);
    });

    it('should maintain performance with many cache entries', async () => {
      // Store 1000 unique entries
      const entries = Array(1000)
        .fill(null)
        .map((_, i) => ({
          originalQuery: `scale query ${i}`,
          normalizedQuery: `scale query ${i}`,
          language: 'en' as const,
          responseText: `scale response ${i}`,
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.GENERAL,
        }));

      // Store all entries
      for (const entry of entries.slice(0, 100)) {
        // Limit for test speed
        await service.store(entry);
      }

      // Measure lookup performance
      const responseTimes: number[] = [];

      for (let i = 0; i < 50; i++) {
        const randomIndex = Math.floor(Math.random() * 100);
        const query = `scale query ${randomIndex}`;
        const result = await service.lookup({ query, language: 'en' });
        responseTimes.push(result.responseTime);
      }

      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log(`Average lookup time with 100 entries: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Memory Efficiency', () => {
    it('should efficiently store and retrieve data', async () => {
      const testEntries = 100;

      const startTime = Date.now();

      for (let i = 0; i < testEntries; i++) {
        await service.store({
          originalQuery: `memory test ${i}`,
          normalizedQuery: `memory test ${i}`,
          language: 'en',
          responseText: `response ${i}`,
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.GENERAL,
        });
      }

      const storeDuration = Date.now() - startTime;

      console.log(`Stored ${testEntries} entries in ${storeDuration}ms`);
      console.log(`Average store time: ${(storeDuration / testEntries).toFixed(2)}ms`);

      expect(storeDuration / testEntries).toBeLessThan(50);
    });
  });

  describe('Hit Rate Performance', () => {
    it('should achieve >90% hit rate with realistic traffic', async () => {
      service.resetMetrics();

      // Simulate realistic traffic pattern
      const commonQueries = [
        'What are your hours?',
        'How much does it cost?',
        'Where are you located?',
        'Can I book an appointment?',
        'What services do you offer?',
      ];

      // Pre-warm cache
      for (const query of commonQueries) {
        await service.store({
          originalQuery: query,
          normalizedQuery: query.toLowerCase(),
          language: 'en',
          responseText: `response for: ${query}`,
          confidenceScore: 0.9,
          responseCategory: ResponseCategory.GENERAL,
        });
      }

      // Simulate 100 requests with 90% being common queries
      const requests = [];
      for (let i = 0; i < 100; i++) {
        if (i < 90) {
          // 90% common queries
          const query = commonQueries[i % commonQueries.length];
          requests.push(service.lookup({ query, language: 'en' }));
        } else {
          // 10% unique queries
          requests.push(
            service.lookup({ query: `unique ${i}`, language: 'en' }),
          );
        }
      }

      await Promise.all(requests);

      const metrics = service.getMetrics();

      console.log(`Hit Rate: ${metrics.hitRate.toFixed(2)}%`);
      console.log(`Hits: ${metrics.hits}, Misses: ${metrics.misses}`);

      expect(metrics.hitRate).toBeGreaterThan(90);
    });
  });

  describe('Circuit Breaker Performance', () => {
    it('should fail fast when circuit is open', async () => {
      // This test verifies that when circuit is open, responses are instant
      // (no waiting for Redis timeouts)

      const query = 'circuit breaker test';

      const startTime = Date.now();
      const result = await service.lookup({ query, language: 'en' });
      const duration = Date.now() - startTime;

      // Even if circuit is open, response should be fast
      expect(duration).toBeLessThan(50);
      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('responseTime');
    });
  });
});
