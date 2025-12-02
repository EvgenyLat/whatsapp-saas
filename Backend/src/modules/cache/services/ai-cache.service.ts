import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisConnectionService } from './redis-connection.service';
import { QueryNormalizer } from '../utils/query-normalizer';
import { CacheKeyGenerator } from '../utils/cache-key.generator';
import {
  CachedResponse,
  CreateCachedResponseInput,
  CacheLookupInput,
  CacheLookupResult,
} from '../interfaces';
import { ResponseCategory, LanguageCode } from '../enums';
import { CACHE_TTL, CONFIDENCE_THRESHOLD, CIRCUIT_BREAKER } from '../constants';

/**
 * AI Cache Service
 *
 * Core service for caching AI responses with:
 * - Query normalization and hashing
 * - Confidence-based caching (>= 0.7)
 * - Circuit breaker for Redis failures
 * - Graceful degradation
 * - Category-based TTL management
 */
@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly isEnabled: boolean;
  private readonly minConfidence: number;
  private readonly enableGracefulDegradation: boolean;

  // Circuit breaker state
  private circuitOpen = false;
  private failureCount = 0;
  private lastFailureTime: number | null = null;

  // Performance metrics
  private metricsBuffer: {
    hits: number;
    misses: number;
    errors: number;
    totalResponseTime: number;
    requestCount: number;
  } = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalResponseTime: 0,
    requestCount: 0,
  };

  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly configService: ConfigService,
  ) {
    const cacheConfig = this.configService.get('cache');
    this.isEnabled = cacheConfig?.aiCache?.enabled ?? true;
    this.minConfidence = cacheConfig?.aiCache?.minConfidence ?? CONFIDENCE_THRESHOLD.MIN_CACHE;
    this.enableGracefulDegradation = cacheConfig?.aiCache?.enableGracefulDegradation ?? true;

    if (!this.isEnabled) {
      this.logger.warn('AI Cache is disabled via configuration');
    }
  }

  /**
   * Lookup a cached AI response
   */
  async lookup(input: CacheLookupInput): Promise<CacheLookupResult> {
    const startTime = Date.now();

    try {
      // Check if cache is enabled and circuit is closed
      if (!this.isEnabled || this.isCircuitOpen()) {
        return {
          hit: false,
          cacheKey: '',
          responseTime: Date.now() - startTime,
        };
      }

      // Normalize query and generate cache key
      const normalizedQuery = QueryNormalizer.normalize(input.query, input.language);
      const cacheKey = CacheKeyGenerator.generateResponseKey(normalizedQuery, input.language);

      // Try to retrieve from cache
      const cached = await this.get(cacheKey);
      const responseTime = Date.now() - startTime;

      if (cached) {
        this.metricsBuffer.hits++;
        this.metricsBuffer.totalResponseTime += responseTime;
        this.metricsBuffer.requestCount++;

        this.logger.debug(`Cache HIT for key: ${cacheKey} (${responseTime}ms)`);

        // Update hit count and last accessed time
        await this.incrementHitCount(cacheKey, cached);

        return {
          hit: true,
          response: cached,
          cacheKey,
          responseTime,
        };
      }

      this.metricsBuffer.misses++;
      this.metricsBuffer.requestCount++;

      this.logger.debug(`Cache MISS for key: ${cacheKey}`);

      return {
        hit: false,
        cacheKey,
        responseTime,
      };
    } catch (error) {
      this.handleError('lookup', error);
      return {
        hit: false,
        cacheKey: '',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Store an AI response in cache
   */
  async store(input: CreateCachedResponseInput): Promise<boolean> {
    try {
      // Check if cache is enabled and circuit is closed
      if (!this.isEnabled || this.isCircuitOpen()) {
        return false;
      }

      // Validate confidence score
      if (input.confidenceScore < this.minConfidence) {
        this.logger.debug(
          `Skipping cache: confidence ${input.confidenceScore} < ${this.minConfidence}`,
        );
        return false;
      }

      // Normalize query and generate cache key
      const cacheKey = CacheKeyGenerator.generateResponseKey(input.normalizedQuery, input.language);

      // Create cached response object
      const cachedResponse: CachedResponse = {
        id: uuidv4(),
        cacheKey,
        originalQuery: input.originalQuery,
        normalizedQuery: input.normalizedQuery,
        language: input.language,
        responseText: input.responseText,
        responseMetadata: input.responseMetadata,
        confidenceScore: input.confidenceScore,
        responseCategory: input.responseCategory,
        hitCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        expiresAt: this.calculateExpirationDate(input.responseCategory),
        isActive: true,
        originalResponseTime: input.originalResponseTime,
        averageCacheResponseTime: 0,
      };

      // Determine TTL
      const ttl = this.getTtlForCategory(input.responseCategory);

      // Store in Redis
      await this.set(cacheKey, cachedResponse, ttl);

      this.logger.log(
        `Cached response for category ${input.responseCategory} with confidence ${input.confidenceScore} (TTL: ${ttl}s)`,
      );

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      return true;
    } catch (error) {
      this.handleError('store', error);
      return false;
    }
  }

  /**
   * Invalidate a specific cache entry
   */
  async invalidate(query: string, language: LanguageCode): Promise<boolean> {
    try {
      const normalizedQuery = QueryNormalizer.normalize(query, language);
      const cacheKey = CacheKeyGenerator.generateResponseKey(normalizedQuery, language);

      await this.delete(cacheKey);
      this.logger.log(`Invalidated cache key: ${cacheKey}`);

      return true;
    } catch (error) {
      this.handleError('invalidate', error);
      return false;
    }
  }

  /**
   * Invalidate cache entries by category
   */
  async invalidateByCategory(category: ResponseCategory, language?: LanguageCode): Promise<number> {
    try {
      const client = this.redisConnection.getClient();
      const pattern = language ? `ai:response:${language}:*` : `ai:response:*`;

      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;

        for (const key of keys) {
          const cached = await this.get(key);
          if (cached && cached.responseCategory === category) {
            await this.delete(key);
            deletedCount++;
          }
        }
      } while (cursor !== '0');

      this.logger.log(`Invalidated ${deletedCount} entries for category: ${category}`);

      return deletedCount;
    } catch (error) {
      this.handleError('invalidateByCategory', error);
      return 0;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const hitRate =
      this.metricsBuffer.requestCount > 0
        ? (this.metricsBuffer.hits / this.metricsBuffer.requestCount) * 100
        : 0;

    const avgResponseTime =
      this.metricsBuffer.requestCount > 0
        ? this.metricsBuffer.totalResponseTime / this.metricsBuffer.requestCount
        : 0;

    return {
      ...this.metricsBuffer,
      hitRate,
      avgResponseTime,
      circuitOpen: this.circuitOpen,
      failureCount: this.failureCount,
    };
  }

  /**
   * Reset metrics buffer
   */
  resetMetrics(): void {
    this.metricsBuffer = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalResponseTime: 0,
      requestCount: 0,
    };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get value from Redis
   */
  private async get(key: string): Promise<CachedResponse | null> {
    const client = this.redisConnection.getClient();
    const data = await client.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Set value in Redis with TTL
   */
  private async set(key: string, value: CachedResponse, ttlSeconds: number | null): Promise<void> {
    const client = this.redisConnection.getClient();
    const serialized = JSON.stringify(value);

    if (ttlSeconds === null) {
      await client.set(key, serialized);
    } else {
      await client.setex(key, ttlSeconds, serialized);
    }
  }

  /**
   * Delete value from Redis
   */
  private async delete(key: string): Promise<void> {
    const client = this.redisConnection.getClient();
    await client.del(key);
  }

  /**
   * Increment hit count for a cached response
   */
  private async incrementHitCount(key: string, cached: CachedResponse): Promise<void> {
    try {
      cached.hitCount++;
      cached.lastAccessedAt = new Date();

      const ttl = await this.getTtlRemaining(key);
      await this.set(key, cached, ttl);
    } catch {
      // Non-critical error, just log it
      this.logger.warn(`Failed to increment hit count for ${key}`);
    }
  }

  /**
   * Get remaining TTL for a key
   */
  private async getTtlRemaining(key: string): Promise<number | null> {
    const client = this.redisConnection.getClient();
    const ttl = await client.ttl(key);

    if (ttl === -1) {
      return null; // No expiration
    }

    return ttl > 0 ? ttl : null;
  }

  /**
   * Get TTL in seconds for a response category
   */
  private getTtlForCategory(category: ResponseCategory): number | null {
    return CACHE_TTL[category] ?? CACHE_TTL.DEFAULT;
  }

  /**
   * Calculate expiration date for a category
   */
  private calculateExpirationDate(category: ResponseCategory): Date | null {
    const ttl = this.getTtlForCategory(category);

    if (ttl === null) {
      return null; // No expiration
    }

    return new Date(Date.now() + ttl * 1000);
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) {
      return false;
    }

    // Check if we should attempt to close the circuit
    if (this.lastFailureTime && Date.now() - this.lastFailureTime > CIRCUIT_BREAKER.RESET_TIMEOUT) {
      this.logger.log('Circuit breaker: Attempting to close circuit');
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  /**
   * Reset circuit breaker on successful operation
   */
  private resetCircuitBreaker(): void {
    if (this.failureCount > 0 || this.circuitOpen) {
      this.logger.log('Circuit breaker: Reset');
      this.failureCount = 0;
      this.circuitOpen = false;
      this.lastFailureTime = null;
    }
  }

  /**
   * Handle errors and update circuit breaker
   */
  private handleError(operation: string, error: any): void {
    this.metricsBuffer.errors++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.logger.error(`Cache ${operation} error: ${error.message}`, error.stack);

    // Open circuit if threshold reached
    if (this.failureCount >= CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
      this.circuitOpen = true;
      this.logger.error(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }

    // Graceful degradation: swallow error if enabled
    if (!this.enableGracefulDegradation) {
      throw error;
    }
  }
}
