import { SetMetadata } from '@nestjs/common';

export const CACHE_EVICT_KEY = 'cache:evict';

export interface CacheEvictOptions {
  keys: string | string[] | ((args: any[]) => string | string[]);
  allEntries?: boolean;
}

/**
 * CacheEvict decorator - marks a method to invalidate cache
 * Usage:
 * @CacheEvict({ keys: 'dashboard' })
 * @CacheEvict({ keys: ['dashboard', 'analytics'] })
 * @CacheEvict({ keys: (args) => `salon:${args[0].id}` })
 */
export const CacheEvict = (options: CacheEvictOptions) => SetMetadata(CACHE_EVICT_KEY, options);
