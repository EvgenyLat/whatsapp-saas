import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Simple in-memory cache interceptor for API responses
 * PERFORMANCE: Reduces database load for frequently accessed endpoints
 *
 * Usage: @UseInterceptors(CacheInterceptor)
 *
 * For production, consider using Redis for distributed caching
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private cache = new Map<string, { data: any; timestamp: number }>();

  // Cache TTL in milliseconds (default: 5 minutes)
  private readonly cacheTTL = 5 * 60 * 1000;

  // Maximum cache size (prevent memory leaks)
  private readonly maxCacheSize = 100;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = this.cache.get(cacheKey);

    // Check if cached response exists and is not expired
    if (cachedResponse) {
      const age = Date.now() - cachedResponse.timestamp;

      if (age < this.cacheTTL) {
        this.logger.debug(`Cache HIT for ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
        return of(cachedResponse.data);
      } else {
        // Remove expired entry
        this.cache.delete(cacheKey);
      }
    }

    this.logger.debug(`Cache MISS for ${cacheKey}`);

    // Execute request and cache response
    return next.handle().pipe(
      tap((data) => {
        // Implement LRU-like eviction if cache is full
        if (this.cache.size >= this.maxCacheSize) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey !== undefined) {
            this.cache.delete(firstKey);
          }
        }

        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }

  /**
   * Generate unique cache key from request
   */
  private generateCacheKey(request: any): string {
    const url = request.url;
    const userId = request.user?.id || 'anonymous';
    const queryParams = JSON.stringify(request.query);

    return `${userId}:${url}:${queryParams}`;
  }

  /**
   * Clear all cached entries (useful for invalidation)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache invalidated for ${key}`);
  }
}
