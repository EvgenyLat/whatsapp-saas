/**
 * Cache Configuration Interface
 */
export interface CacheConfig {
  /** Redis connection settings */
  redis: RedisConfig;

  /** TTL configurations */
  ttl: TtlConfig;

  /** Performance thresholds */
  performance: PerformanceConfig;

  /** Circuit breaker settings */
  circuitBreaker: CircuitBreakerConfig;

  /** Enable/disable features */
  features: FeatureFlags;
}

/**
 * Redis Connection Configuration
 */
export interface RedisConfig {
  /** Redis host */
  host: string;

  /** Redis port */
  port: number;

  /** Redis password (optional) */
  password?: string;

  /** Redis database number */
  db: number;

  /** Connection timeout in milliseconds */
  connectTimeout: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Enable ready check */
  enableReadyCheck: boolean;

  /** Enable offline queue */
  enableOfflineQueue: boolean;
}

/**
 * TTL Configuration
 */
export interface TtlConfig {
  /** Default TTL in seconds */
  default: number;

  /** AI response cache TTL */
  aiResponse: number;

  /** Statistics cache TTL */
  statistics: number;
}

/**
 * Performance Configuration
 */
export interface PerformanceConfig {
  /** Maximum cache response time in ms */
  maxCacheResponseTime: number;

  /** Target hit rate percentage */
  targetHitRate: number;

  /** Minimum hit rate before alerting */
  minHitRate: number;
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time in ms to wait before attempting to close circuit */
  resetTimeout: number;

  /** Timeout for Redis operations in ms */
  operationTimeout: number;
}

/**
 * Feature Flags
 */
export interface FeatureFlags {
  /** Enable cache warming on startup */
  enableWarmup: boolean;

  /** Enable automatic maintenance */
  enableMaintenance: boolean;

  /** Enable analytics tracking */
  enableAnalytics: boolean;

  /** Enable graceful degradation */
  enableGracefulDegradation: boolean;
}
