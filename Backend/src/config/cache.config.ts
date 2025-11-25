import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Redis connection
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Cache TTL configurations (in seconds)
  ttl: {
    default: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10), // 1 hour
    dashboard: parseInt(process.env.DASHBOARD_CACHE_TTL_SECONDS || '300', 10), // 5 minutes
    salon: parseInt(process.env.SALON_CACHE_TTL_SECONDS || '1800', 10), // 30 minutes
    template: parseInt(process.env.TEMPLATE_CACHE_TTL_SECONDS || '3600', 10), // 1 hour
    conversation: parseInt(process.env.CONVERSATION_CACHE_TTL_SECONDS || '600', 10), // 10 minutes
    aiResponse: parseInt(process.env.AI_CACHE_TTL_SECONDS || '86400', 10), // 24 hours
    statistics: parseInt(process.env.STATS_CACHE_TTL_SECONDS || '300', 10), // 5 minutes
  },

  // Cache key prefixes for namespacing
  prefixes: {
    dashboard: 'dashboard:',
    salon: 'salon:',
    template: 'template:',
    conversation: 'conversation:',
    analytics: 'analytics:',
    user: 'user:',
    aiResponse: 'ai:response:',
    aiPattern: 'ai:pattern:',
    aiStats: 'ai:stats:',
  },

  // Cache settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // AI Cache specific settings
  aiCache: {
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
    minConfidence: parseFloat(process.env.AI_CACHE_MIN_CONFIDENCE || '0.7'),
    enableWarmup: process.env.AI_CACHE_ENABLE_WARMUP === 'true',
    enableMaintenance: process.env.AI_CACHE_ENABLE_MAINTENANCE !== 'false',
    enableAnalytics: process.env.AI_CACHE_ENABLE_ANALYTICS !== 'false',
    enableGracefulDegradation: process.env.AI_CACHE_ENABLE_GRACEFUL_DEGRADATION !== 'false',
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    operationTimeout: 1000, // 1 second
  },

  // Performance thresholds
  performance: {
    maxCacheResponseTime: 100, // ms
    targetHitRate: 90, // percent
    minHitRate: 80, // percent
  },
}));
