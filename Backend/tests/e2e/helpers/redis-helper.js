/**
 * =============================================================================
 * REDIS HELPER
 * =============================================================================
 * Helper functions for Redis operations in E2E tests
 * =============================================================================
 */

const Redis = require('ioredis');

class RedisHelper {
  constructor() {
    this.client = null;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };
  }

  async connect() {
    if (!this.client) {
      this.client = new Redis(this.config);
      await this.client.ping();
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  // ============================================================================
  // Key Operations
  // ============================================================================

  async get(key) {
    return await this.client.get(key);
  }

  async set(key, value, expiry = null) {
    if (expiry) {
      return await this.client.set(key, value, 'EX', expiry);
    }
    return await this.client.set(key, value);
  }

  async del(key) {
    return await this.client.del(key);
  }

  async exists(key) {
    return (await this.client.exists(key)) === 1;
  }

  async ttl(key) {
    return await this.client.ttl(key);
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  async getRateLimitCount(identifier) {
    const key = `rate_limit:${identifier}`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 0;
  }

  async clearRateLimit(identifier) {
    const key = `rate_limit:${identifier}`;
    await this.client.del(key);
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setSession(sessionId, data, expiry = 3600) {
    const key = `session:${sessionId}`;
    await this.client.set(key, JSON.stringify(data), 'EX', expiry);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  async getCache(cacheKey) {
    const key = `cache:${cacheKey}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setCache(cacheKey, data, expiry = 300) {
    const key = `cache:${cacheKey}`;
    await this.client.set(key, JSON.stringify(data), 'EX', expiry);
  }

  async clearCache(pattern = '*') {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
    return keys.length;
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  async flushTestData() {
    await this.client.del(await this.client.keys('test:*'));
  }

  async flushAll() {
    await this.client.flushdb();
  }

  // ============================================================================
  // Info
  // ============================================================================

  async getInfo() {
    const info = await this.client.info();
    return this.parseInfo(info);
  }

  async getKeyCount() {
    return await this.client.dbsize();
  }

  parseInfo(infoString) {
    const lines = infoString.split('\r\n');
    const info = {};

    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          info[key] = value;
        }
      }
    });

    return info;
  }
}

module.exports = { RedisHelper };
