import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_KEY = 'cache:cacheable';

export interface CacheableOptions {
  key: string | ((args: any[]) => string);
  ttl?: number;
  prefix?: string;
}

/**
 * Cacheable decorator - marks a method for caching
 * Usage:
 * @Cacheable({ key: 'dashboard', ttl: 300 })
 * @Cacheable({ key: (args) => `salon:${args[0]}`, ttl: 1800 })
 */
export const Cacheable = (options: CacheableOptions) => SetMetadata(CACHEABLE_KEY, options);
