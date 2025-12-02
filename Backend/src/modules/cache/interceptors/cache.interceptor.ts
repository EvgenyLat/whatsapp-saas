import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHEABLE_KEY, CacheableOptions } from '../decorators/cacheable.decorator';
import { CACHE_EVICT_KEY, CacheEvictOptions } from '../decorators/cache-evict.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheableOptions = this.reflector.get<CacheableOptions>(
      CACHEABLE_KEY,
      context.getHandler(),
    );

    const cacheEvictOptions = this.reflector.get<CacheEvictOptions>(
      CACHE_EVICT_KEY,
      context.getHandler(),
    );

    const args = context.getArgs();

    // Handle cache eviction
    if (cacheEvictOptions) {
      return next.handle().pipe(
        tap(async () => {
          await this.evictCache(cacheEvictOptions, args);
        }),
      );
    }

    // Handle caching
    if (cacheableOptions) {
      const cacheKey = this.buildCacheKey(cacheableOptions, args);

      try {
        const cachedValue = await this.cacheService.get(cacheKey);
        if (cachedValue !== undefined) {
          this.logger.debug(`Cache hit: ${cacheKey}`);
          return of(cachedValue);
        }

        this.logger.debug(`Cache miss: ${cacheKey}`);
        return next.handle().pipe(
          tap(async (data) => {
            await this.cacheService.set(cacheKey, data, cacheableOptions.ttl);
          }),
        );
      } catch (error) {
        this.logger.error(`Cache error: ${error.message}`);
        return next.handle();
      }
    }

    return next.handle();
  }

  private buildCacheKey(options: CacheableOptions, args: any[]): string {
    let key: string;

    if (typeof options.key === 'function') {
      key = options.key(args);
    } else {
      key = options.key;
    }

    return options.prefix ? `${options.prefix}${key}` : key;
  }

  private async evictCache(options: CacheEvictOptions, args: any[]): Promise<void> {
    try {
      if (options.allEntries) {
        await (this.cacheService as any).reset();
        this.logger.debug('Cache cleared: all entries');
        return;
      }

      let keys: string[];

      if (typeof options.keys === 'function') {
        const result = options.keys(args);
        keys = Array.isArray(result) ? result : [result];
      } else if (Array.isArray(options.keys)) {
        keys = options.keys;
      } else {
        keys = [options.keys];
      }

      for (const key of keys) {
        await this.cacheService.del(key);
      }

      this.logger.debug(`Cache evicted: ${keys.join(', ')}`);
    } catch (error) {
      this.logger.error(`Cache eviction error: ${error.message}`);
    }
  }
}
