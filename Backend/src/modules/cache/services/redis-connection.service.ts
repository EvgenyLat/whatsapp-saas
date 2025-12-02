import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';
import { REDIS_POOL, CIRCUIT_BREAKER } from '../constants';

/**
 * Redis Connection Service
 *
 * Manages Redis connection with:
 * - Connection pooling
 * - Automatic reconnection
 * - Health monitoring
 * - Circuit breaker pattern
 */
@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionService.name);
  private client: RedisClient;
  private isConnected = false;
  private reconnectAttempts = 0;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Initialize Redis connection
   */
  private async connect(): Promise<void> {
    const cacheConfig = this.configService.get('cache');

    try {
      this.client = new Redis({
        host: cacheConfig.host,
        port: cacheConfig.port,
        password: cacheConfig.password,
        db: cacheConfig.db,
        connectTimeout: REDIS_POOL.CONNECT_TIMEOUT,
        maxRetriesPerRequest: null, // Unlimited retries per request
        retryStrategy: (times: number) => {
          this.reconnectAttempts = times;

          // Exponential backoff with max delay
          const delay = Math.min(times * REDIS_POOL.RETRY_DELAY, REDIS_POOL.MAX_RETRY_DELAY);

          this.logger.warn(`Redis reconnection attempt ${times}, retrying in ${delay}ms`);

          // Never give up - always retry
          return delay;
        },
        keepAlive: REDIS_POOL.KEEP_ALIVE,
        enableReadyCheck: cacheConfig.enableReadyCheck,
        enableOfflineQueue: cacheConfig.enableOfflineQueue,
        lazyConnect: false,
        // Prevent crashes on connection errors
        showFriendlyErrorStack: true,
      });

      this.setupEventHandlers();

      // Wait for connection to be ready
      await this.client.ping();
      this.isConnected = true;
      this.logger.log(`Redis connected successfully to ${cacheConfig.host}:${cacheConfig.port}`);
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (time: number) => {
      this.logger.warn(`Redis reconnecting in ${time}ms`);
    });

    this.client.on('end', () => {
      this.logger.warn('Redis connection ended');
      this.isConnected = false;
    });
  }

  /**
   * Disconnect from Redis
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis disconnected successfully');
      } catch (error) {
        this.logger.error(`Error disconnecting from Redis: ${error.message}`);
      }
      this.isConnected = false;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClient {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Execute a Redis command with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = CIRCUIT_BREAKER.OPERATION_TIMEOUT,
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.executeWithTimeout(async () => {
        return await this.client.ping();
      });
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis ping failed: ${error.message}`);
      return false;
    }
  }
}
