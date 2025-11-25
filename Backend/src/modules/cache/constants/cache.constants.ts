import { ResponseCategory } from '../enums';

/**
 * Cache TTL (Time To Live) values in seconds
 */
export const CACHE_TTL = {
  // Category-specific TTLs
  [ResponseCategory.GREETING]: null, // No expiration for greetings
  [ResponseCategory.PRICING]: 7 * 24 * 60 * 60, // 7 days
  [ResponseCategory.AVAILABILITY]: 60 * 60, // 1 hour
  [ResponseCategory.SERVICES]: 30 * 24 * 60 * 60, // 30 days
  [ResponseCategory.HOURS]: 7 * 24 * 60 * 60, // 7 days
  [ResponseCategory.LOCATION]: 30 * 24 * 60 * 60, // 30 days
  [ResponseCategory.BOOKING]: 60 * 60, // 1 hour
  [ResponseCategory.GENERAL]: 24 * 60 * 60, // 24 hours (default)

  // Special TTLs
  DEFAULT: 24 * 60 * 60, // 24 hours
  AI_RESPONSE: 24 * 60 * 60, // 24 hours for AI responses
} as const;

/**
 * Cache key prefixes for namespacing
 */
export const CACHE_PREFIX = {
  AI_RESPONSE: 'ai:response:',
  QUERY_PATTERN: 'ai:pattern:',
  STATISTICS: 'ai:stats:',
  HEALTH: 'ai:health:',
} as const;

/**
 * Confidence thresholds for caching decisions
 */
export const CONFIDENCE_THRESHOLD = {
  /** Minimum confidence to cache a response */
  MIN_CACHE: 0.7,

  /** Minimum confidence to consider quality acceptable */
  MIN_QUALITY: 0.5,

  /** High confidence threshold for priority caching */
  HIGH_CONFIDENCE: 0.9,
} as const;

/**
 * Cache performance thresholds
 */
export const PERFORMANCE_THRESHOLD = {
  /** Maximum acceptable cache response time in milliseconds */
  MAX_CACHE_RESPONSE_TIME: 100,

  /** Target cache hit rate percentage */
  TARGET_HIT_RATE: 90,

  /** Minimum hit rate before alerting */
  MIN_HIT_RATE: 80,

  /** Maximum cache response time before degradation */
  MAX_RESPONSE_TIME_DEGRADATION: 200,
} as const;

/**
 * Cache maintenance thresholds
 */
export const MAINTENANCE_THRESHOLD = {
  /** Days before considering an entry low-value if hit count is low */
  LOW_VALUE_DAYS: 30,

  /** Minimum hit count to avoid low-value classification */
  MIN_HIT_COUNT: 2,

  /** Maximum cache size in bytes (100MB) */
  MAX_CACHE_SIZE: 100 * 1024 * 1024,

  /** Maximum number of cache entries */
  MAX_ENTRIES: 10000,
} as const;

/**
 * Circuit breaker configuration
 */
export const CIRCUIT_BREAKER = {
  /** Number of failures before opening circuit */
  FAILURE_THRESHOLD: 5,

  /** Time in milliseconds to wait before attempting to close circuit */
  RESET_TIMEOUT: 60000, // 1 minute

  /** Timeout for Redis operations in milliseconds */
  OPERATION_TIMEOUT: 1000, // 1 second
} as const;

/**
 * OpenAI cost calculation constants
 */
export const COST_CALCULATION = {
  /** Cost per AI API request in USD (approximate for GPT-4) */
  COST_PER_REQUEST: 0.002,

  /** Cost per 1K tokens for GPT-4 (input) */
  COST_PER_1K_INPUT_TOKENS: 0.03,

  /** Cost per 1K tokens for GPT-4 (output) */
  COST_PER_1K_OUTPUT_TOKENS: 0.06,

  /** Average tokens per request (estimate) */
  AVG_TOKENS_PER_REQUEST: 500,
} as const;

/**
 * Redis connection pool configuration
 */
export const REDIS_POOL = {
  /** Minimum pool size */
  MIN_SIZE: 2,

  /** Maximum pool size */
  MAX_SIZE: 10,

  /** Connection timeout in milliseconds */
  CONNECT_TIMEOUT: 10000,

  /** Maximum retry attempts (Infinity for unlimited retries) */
  MAX_RETRIES: Infinity,

  /** Retry delay in milliseconds */
  RETRY_DELAY: 1000,

  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 10000,

  /** Keep alive interval in milliseconds */
  KEEP_ALIVE: 30000,
} as const;

/**
 * Query normalization configuration
 */
export const NORMALIZATION = {
  /** Maximum query length to process */
  MAX_QUERY_LENGTH: 500,

  /** Words to remove during normalization (stop words) */
  STOP_WORDS: {
    en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'],
    ru: ['и', 'в', 'на', 'с', 'по', 'для', 'к', 'от', 'за', 'из'],
    es: ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'de', 'a'],
    pt: ['o', 'a', 'os', 'as', 'um', 'uma', 'e', 'ou', 'em', 'de', 'para'],
    he: ['את', 'של', 'על', 'אל', 'מן', 'עם', 'לפני', 'אחרי'],
  },
} as const;
