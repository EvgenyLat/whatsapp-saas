import { ResponseCategory, LanguageCode } from '../enums';

/**
 * CachedResponse Interface
 *
 * Represents a stored AI response with metadata for cache management.
 */
export interface CachedResponse {
  /** Primary identifier (UUID v4) */
  id: string;

  /** SHA256 hash of normalized query - used as cache key */
  cacheKey: string;

  /** Original customer query (for debugging and analytics) */
  originalQuery: string;

  /** Normalized version of query (lowercase, trimmed, sorted tokens) */
  normalizedQuery: string;

  /** Language code of the query */
  language: LanguageCode;

  /** The cached AI response text */
  responseText: string;

  /** Optional metadata (e.g., formatting hints, links) */
  responseMetadata?: Record<string, any>;

  /** Confidence score (0.0 to 1.0), minimum 0.7 for caching */
  confidenceScore: number;

  /** Category determining TTL and handling */
  responseCategory: ResponseCategory;

  /** Number of times served from cache */
  hitCount: number;

  /** Last time this cache entry was accessed */
  lastAccessedAt: Date;

  /** When the response was originally cached */
  createdAt: Date;

  /** When the cache entry expires (null = no expiration) */
  expiresAt: Date | null;

  /** Soft delete flag for maintenance */
  isActive: boolean;

  /** Original AI response time in milliseconds */
  originalResponseTime?: number;

  /** Average cache retrieval time in milliseconds */
  averageCacheResponseTime?: number;
}

/**
 * Cache Entry Creation Input
 */
export interface CreateCachedResponseInput {
  originalQuery: string;
  normalizedQuery: string;
  language: LanguageCode;
  responseText: string;
  responseMetadata?: Record<string, any>;
  confidenceScore: number;
  responseCategory: ResponseCategory;
  originalResponseTime?: number;
}

/**
 * Cache Lookup Input
 */
export interface CacheLookupInput {
  query: string;
  language: LanguageCode;
}

/**
 * Cache Lookup Result
 */
export interface CacheLookupResult {
  /** Whether a cache hit occurred */
  hit: boolean;

  /** The cached response (if hit) */
  response?: CachedResponse;

  /** Cache key used for lookup */
  cacheKey: string;

  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Cache Statistics Summary
 */
export interface CacheStatsSummary {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgCacheResponseTime: number;
  avgAiResponseTime: number;
  estimatedCostSavings: number;
}
