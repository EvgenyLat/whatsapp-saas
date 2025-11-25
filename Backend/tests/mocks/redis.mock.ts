/**
 * T024: Redis Mock for Integration Tests
 *
 * This module provides a comprehensive mock of the Redis client for testing
 * caching functionality without requiring a real Redis instance.
 *
 * Features:
 * - In-memory Map-based storage
 * - Standard Redis commands: get, set, del, flushall, exists, ttl
 * - TTL (time-to-live) support with automatic expiration
 * - Configurable success/failure modes
 * - Call tracking for test assertions
 * - Async interface matching real Redis client
 *
 * Usage:
 * ```typescript
 * import { createMockRedis, getMockRedisProvider } from './mocks/redis.mock';
 *
 * // In test setup
 * const moduleFixture = await Test.createTestingModule({
 *   imports: [AppModule],
 * })
 *   .overrideProvider('REDIS_CLIENT')
 *   .useValue(createMockRedis())
 *   .compile();
 *
 * // Or use provider helper
 * .overrideProvider(CacheService)
 * .useValue(getMockRedisProvider())
 * ```
 */

/**
 * Redis Cache Entry
 *
 * Stores value with optional TTL expiration
 */
interface CacheEntry {
  value: string;
  expiresAt?: number; // Unix timestamp in milliseconds
}

/**
 * Mock Redis Client
 *
 * Simulates Redis behavior using in-memory Map storage
 */
export class MockRedis {
  private store: Map<string, CacheEntry> = new Map();
  private shouldFail: boolean = false;
  private failureError: Error | null = null;
  private callCount: number = 0;
  private callHistory: Array<{ command: string; args: any[] }> = [];

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   *
   * @example
   * ```typescript
   * const value = await redis.get('user:123');
   * ```
   */
  public get = jest.fn().mockImplementation(async (key: string): Promise<string | null> => {
    this.trackCall('get', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const entry = this.store.get(key);

    // Check if entry exists
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  });

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache (will be converted to string)
   * @param ttlSeconds - Time to live in seconds (optional)
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * await redis.set('user:123', JSON.stringify(user), 3600); // 1 hour TTL
   * ```
   */
  public set = jest.fn().mockImplementation(
    async (key: string, value: string | number, ttlSeconds?: number): Promise<string> => {
      this.trackCall('set', [key, value, ttlSeconds]);

      if (this.shouldFail) {
        throw this.failureError || new Error('Redis mock failure');
      }

      const stringValue = typeof value === 'string' ? value : String(value);

      const entry: CacheEntry = {
        value: stringValue,
      };

      // Set expiration if TTL provided
      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        entry.expiresAt = Date.now() + ttlSeconds * 1000;
      }

      this.store.set(key, entry);
      return 'OK';
    },
  );

  /**
   * Set value with expiration (EX option)
   *
   * @param key - Cache key
   * @param seconds - TTL in seconds
   * @param value - Value to cache
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * await redis.setex('session:abc', 3600, JSON.stringify(session));
   * ```
   */
  public setex = jest.fn().mockImplementation(
    async (key: string, seconds: number, value: string): Promise<string> => {
      return this.set(key, value, seconds);
    },
  );

  /**
   * Delete key from cache
   *
   * @param key - Cache key or array of keys
   * @returns Number of keys deleted
   *
   * @example
   * ```typescript
   * await redis.del('user:123');
   * await redis.del(['user:123', 'user:456']);
   * ```
   */
  public del = jest.fn().mockImplementation(async (key: string | string[]): Promise<number> => {
    const keys = Array.isArray(key) ? key : [key];
    this.trackCall('del', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    let deletedCount = 0;
    for (const k of keys) {
      if (this.store.delete(k)) {
        deletedCount++;
      }
    }

    return deletedCount;
  });

  /**
   * Clear all keys from cache
   *
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * await redis.flushall();
   * ```
   */
  public flushall = jest.fn().mockImplementation(async (): Promise<string> => {
    this.trackCall('flushall', []);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    this.store.clear();
    return 'OK';
  });

  /**
   * Check if key exists
   *
   * @param key - Cache key
   * @returns 1 if exists, 0 if not
   *
   * @example
   * ```typescript
   * const exists = await redis.exists('user:123');
   * if (exists) {
   *   console.log('Key exists');
   * }
   * ```
   */
  public exists = jest.fn().mockImplementation(async (key: string): Promise<number> => {
    this.trackCall('exists', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const entry = this.store.get(key);

    // Check if entry exists and not expired
    if (!entry) {
      return 0;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return 0;
    }

    return 1;
  });

  /**
   * Get time to live for key
   *
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   *
   * @example
   * ```typescript
   * const ttl = await redis.ttl('user:123');
   * console.log(`Key expires in ${ttl} seconds`);
   * ```
   */
  public ttl = jest.fn().mockImplementation(async (key: string): Promise<number> => {
    this.trackCall('ttl', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const entry = this.store.get(key);

    // Key doesn't exist
    if (!entry) {
      return -2;
    }

    // No expiration set
    if (!entry.expiresAt) {
      return -1;
    }

    // Calculate remaining TTL
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }

    return Math.ceil(remainingMs / 1000);
  });

  /**
   * Get multiple values at once
   *
   * @param keys - Array of cache keys
   * @returns Array of values (null for missing/expired keys)
   *
   * @example
   * ```typescript
   * const [user1, user2] = await redis.mget(['user:123', 'user:456']);
   * ```
   */
  public mget = jest.fn().mockImplementation(async (keys: string[]): Promise<(string | null)[]> => {
    this.trackCall('mget', [keys]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    return Promise.all(keys.map((key) => this.get(key)));
  });

  /**
   * Increment value by 1
   *
   * @param key - Cache key
   * @returns New value after increment
   *
   * @example
   * ```typescript
   * const count = await redis.incr('counter:bookings');
   * ```
   */
  public incr = jest.fn().mockImplementation(async (key: string): Promise<number> => {
    this.trackCall('incr', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const currentValue = await this.get(key);
    const numValue = currentValue ? parseInt(currentValue, 10) : 0;
    const newValue = numValue + 1;

    await this.set(key, String(newValue));
    return newValue;
  });

  /**
   * Decrement value by 1
   *
   * @param key - Cache key
   * @returns New value after decrement
   *
   * @example
   * ```typescript
   * const count = await redis.decr('counter:available_slots');
   * ```
   */
  public decr = jest.fn().mockImplementation(async (key: string): Promise<number> => {
    this.trackCall('decr', [key]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const currentValue = await this.get(key);
    const numValue = currentValue ? parseInt(currentValue, 10) : 0;
    const newValue = numValue - 1;

    await this.set(key, String(newValue));
    return newValue;
  });

  /**
   * Set expiration on existing key
   *
   * @param key - Cache key
   * @param seconds - TTL in seconds
   * @returns 1 if TTL set, 0 if key doesn't exist
   *
   * @example
   * ```typescript
   * await redis.expire('session:abc', 3600);
   * ```
   */
  public expire = jest.fn().mockImplementation(async (key: string, seconds: number): Promise<number> => {
    this.trackCall('expire', [key, seconds]);

    if (this.shouldFail) {
      throw this.failureError || new Error('Redis mock failure');
    }

    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    entry.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, entry);
    return 1;
  });

  /**
   * Disconnect (no-op for mock)
   */
  public disconnect = jest.fn().mockImplementation(async (): Promise<void> => {
    this.trackCall('disconnect', []);
    // No-op for mock
  });

  /**
   * Quit (no-op for mock)
   */
  public quit = jest.fn().mockImplementation(async (): Promise<void> => {
    this.trackCall('quit', []);
    // No-op for mock
  });

  // ============================================================================
  // Mock Control Methods
  // ============================================================================

  /**
   * Configure mock to succeed
   */
  public succeed(): void {
    this.shouldFail = false;
    this.failureError = null;
  }

  /**
   * Configure mock to fail
   *
   * @param error - Error to throw (default: generic error)
   */
  public fail(error?: Error): void {
    this.shouldFail = true;
    this.failureError = error || new Error('Redis mock failure');
  }

  /**
   * Get number of commands executed
   */
  public getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get command history
   */
  public getCallHistory(): Array<{ command: string; args: any[] }> {
    return this.callHistory;
  }

  /**
   * Get current store size
   */
  public getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Get all keys in store
   */
  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Reset mock state (clear store and history)
   */
  public reset(): void {
    this.store.clear();
    this.callCount = 0;
    this.callHistory = [];
    this.shouldFail = false;
    this.failureError = null;
    this.clearMockCalls();
  }

  /**
   * Clear only jest mock call history
   */
  private clearMockCalls(): void {
    (this.get as jest.Mock).mockClear();
    (this.set as jest.Mock).mockClear();
    (this.setex as jest.Mock).mockClear();
    (this.del as jest.Mock).mockClear();
    (this.flushall as jest.Mock).mockClear();
    (this.exists as jest.Mock).mockClear();
    (this.ttl as jest.Mock).mockClear();
    (this.mget as jest.Mock).mockClear();
    (this.incr as jest.Mock).mockClear();
    (this.decr as jest.Mock).mockClear();
    (this.expire as jest.Mock).mockClear();
    (this.disconnect as jest.Mock).mockClear();
    (this.quit as jest.Mock).mockClear();
  }

  /**
   * Track command execution
   */
  private trackCall(command: string, args: any[]): void {
    this.callCount++;
    this.callHistory.push({ command, args });
  }
}

/**
 * Create a fresh mock Redis instance
 *
 * @returns Mock Redis client
 *
 * @example
 * ```typescript
 * const redis = createMockRedis();
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 * ```
 */
export function createMockRedis(): MockRedis {
  return new MockRedis();
}

/**
 * Create mock Redis provider for NestJS dependency injection
 *
 * @returns Provider configuration object
 *
 * @example
 * ```typescript
 * const moduleFixture = await Test.createTestingModule({
 *   imports: [AppModule],
 * })
 *   .overrideProvider('REDIS_CLIENT')
 *   .useFactory(getMockRedisProvider())
 *   .compile();
 * ```
 */
export function getMockRedisProvider() {
  return {
    provide: 'REDIS_CLIENT',
    useFactory: () => createMockRedis(),
  };
}

/**
 * Test Utilities
 */

/**
 * Populate mock Redis with test data
 *
 * @param redis - Mock Redis instance
 * @param data - Key-value pairs to populate
 *
 * @example
 * ```typescript
 * const redis = createMockRedis();
 * await populateMockRedis(redis, {
 *   'user:123': JSON.stringify({ name: 'John' }),
 *   'counter:bookings': '42'
 * });
 * ```
 */
export async function populateMockRedis(
  redis: MockRedis,
  data: Record<string, string>,
): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    await redis.set(key, value);
  }
}

/**
 * Assert that key exists in mock Redis
 *
 * @param redis - Mock Redis instance
 * @param key - Cache key
 * @returns True if key exists
 *
 * @example
 * ```typescript
 * expect(await assertKeyExists(redis, 'user:123')).toBe(true);
 * ```
 */
export async function assertKeyExists(redis: MockRedis, key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Assert that key has expected value
 *
 * @param redis - Mock Redis instance
 * @param key - Cache key
 * @param expectedValue - Expected value
 * @returns True if value matches
 *
 * @example
 * ```typescript
 * expect(await assertKeyValue(redis, 'counter', '42')).toBe(true);
 * ```
 */
export async function assertKeyValue(
  redis: MockRedis,
  key: string,
  expectedValue: string,
): Promise<boolean> {
  const value = await redis.get(key);
  return value === expectedValue;
}
