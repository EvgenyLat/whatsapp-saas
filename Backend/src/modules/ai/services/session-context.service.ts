/**
 * SessionContextService - Redis-based session context management
 *
 * @module ai/services/session-context
 * @description Manages booking conversation context in Redis
 * with TTL management and graceful degradation
 */

import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { BookingContext } from '../types/choice.types';
import Redis from 'ioredis';

/**
 * Session configuration constants
 */
const SESSION_CONFIG = {
  /** Default TTL in seconds (30 minutes) */
  TTL_SECONDS: 1800,

  /** Redis operation timeout in ms */
  OPERATION_TIMEOUT_MS: 100,

  /** Key prefix for Redis storage */
  KEY_PREFIX: 'booking:session:',

  /** Maximum retry attempts */
  MAX_RETRIES: 2,

  /** Retry delay in ms */
  RETRY_DELAY_MS: 50,
};

/**
 * SessionContextService
 *
 * Provides persistent session storage for booking conversations
 * with automatic TTL management and graceful Redis failure handling
 */
@Injectable()
export class SessionContextService {
  private readonly logger = new Logger(SessionContextService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Save booking context to Redis
   *
   * @param customerPhone - Customer phone number (session identifier)
   * @param context - Booking context to save
   * @returns Promise resolving when save completes
   *
   * @example
   * await sessionContext.save('+1234567890', {
   *   sessionId: 'sess_123',
   *   salonId: 'salon_456',
   *   language: 'ru',
   *   ...
   * });
   */
  async save(customerPhone: string, context: BookingContext): Promise<void> {
    const startTime = Date.now();
    const key = this.getRedisKey(customerPhone);

    try {
      // Serialize context to JSON
      const serialized = JSON.stringify(context);

      // Save to Redis with TTL
      await this.executeWithTimeout(
        this.redis.setex(key, SESSION_CONFIG.TTL_SECONDS, serialized),
        SESSION_CONFIG.OPERATION_TIMEOUT_MS,
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Session saved for ${customerPhone} in ${duration}ms`);
    } catch (error) {
      this.logger.warn(`Failed to save session for ${customerPhone}: ${(error as Error).message}`);
      // Graceful degradation - don't throw, allow stateless operation
    }
  }

  /**
   * Retrieve booking context from Redis
   *
   * @param customerPhone - Customer phone number
   * @returns Booking context or null if not found/expired
   *
   * @example
   * const context = await sessionContext.get('+1234567890');
   * if (context) {
   *   // Continue conversation with context
   * } else {
   *   // Start new conversation
   * }
   */
  async get(customerPhone: string): Promise<BookingContext | null> {
    const startTime = Date.now();
    const key = this.getRedisKey(customerPhone);

    try {
      // Get from Redis
      const data = await this.executeWithTimeout(
        this.redis.get(key),
        SESSION_CONFIG.OPERATION_TIMEOUT_MS,
      );

      if (!data) {
        this.logger.debug(`No session found for ${customerPhone}`);
        return null;
      }

      // Parse and validate
      const context = this.parseContext(data);

      if (!context) {
        this.logger.warn(`Invalid session data for ${customerPhone}`);
        return null;
      }

      // Extend TTL on successful retrieval
      await this.extendTTL(key);

      const duration = Date.now() - startTime;
      this.logger.debug(`Session retrieved for ${customerPhone} in ${duration}ms`);

      return context;
    } catch (error) {
      this.logger.warn(
        `Redis unavailable for ${customerPhone}, falling back to stateless mode: ${(error as Error).message}`,
      );
      return null; // Graceful degradation
    }
  }

  /**
   * Update existing booking context
   *
   * @param customerPhone - Customer phone number
   * @param updates - Partial context updates to apply
   * @returns Promise resolving when update completes
   *
   * @example
   * await sessionContext.update('+1234567890', {
   *   choices: [...existing, newChoice],
   *   lastInteractionAt: new Date(),
   * });
   */
  async update(customerPhone: string, updates: Partial<BookingContext>): Promise<void> {
    const startTime = Date.now();

    try {
      // Get existing context
      const existing = await this.get(customerPhone);

      if (!existing) {
        this.logger.warn(`Cannot update non-existent session for ${customerPhone}`);
        return;
      }

      // Merge updates
      const updated: BookingContext = {
        ...existing,
        ...updates,
        lastInteractionAt: new Date(), // Always update interaction time
      };

      // Save updated context
      await this.save(customerPhone, updated);

      const duration = Date.now() - startTime;
      this.logger.debug(`Session updated for ${customerPhone} in ${duration}ms`);
    } catch (error) {
      this.logger.warn(
        `Failed to update session for ${customerPhone}: ${(error as Error).message}`,
      );
      // Graceful degradation
    }
  }

  /**
   * Delete booking context
   *
   * @param customerPhone - Customer phone number
   * @returns Promise resolving when deletion completes
   *
   * @example
   * await sessionContext.delete('+1234567890');
   */
  async delete(customerPhone: string): Promise<void> {
    const key = this.getRedisKey(customerPhone);

    try {
      await this.executeWithTimeout(this.redis.del(key), SESSION_CONFIG.OPERATION_TIMEOUT_MS);

      this.logger.debug(`Session deleted for ${customerPhone}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete session for ${customerPhone}: ${(error as Error).message}`,
      );
      // Graceful degradation
    }
  }

  /**
   * Extend TTL for active session
   *
   * @param key - Redis key
   * @private
   */
  private async extendTTL(key: string): Promise<void> {
    try {
      await this.executeWithTimeout(
        this.redis.expire(key, SESSION_CONFIG.TTL_SECONDS),
        SESSION_CONFIG.OPERATION_TIMEOUT_MS,
      );
    } catch {
      // Silent failure - non-critical operation
      this.logger.debug(`Failed to extend TTL for ${key}`);
    }
  }

  /**
   * Execute Redis operation with timeout
   *
   * @param promise - Redis operation promise
   * @param timeoutMs - Timeout in milliseconds
   * @returns Operation result or throws on timeout
   *
   * @private
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Parse and validate context from Redis
   *
   * @param data - Raw Redis data
   * @returns Parsed context or null if invalid
   *
   * @private
   */
  private parseContext(data: string): BookingContext | null {
    try {
      const parsed = JSON.parse(data);

      // Basic validation
      if (!parsed.sessionId || !parsed.customerId || !parsed.salonId) {
        return null;
      }

      // Parse dates
      if (parsed.createdAt) {
        parsed.createdAt = new Date(parsed.createdAt);
      }
      if (parsed.lastInteractionAt) {
        parsed.lastInteractionAt = new Date(parsed.lastInteractionAt);
      }

      // Parse choices dates
      if (parsed.choices && Array.isArray(parsed.choices)) {
        parsed.choices = parsed.choices.map((choice: any) => ({
          ...choice,
          selectedAt: new Date(choice.selectedAt),
        }));
      }

      return parsed as BookingContext;
    } catch (error) {
      this.logger.error(`Failed to parse context: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get Redis key for customer session
   *
   * @param customerPhone - Customer phone number
   * @returns Redis key string
   *
   * @private
   */
  private getRedisKey(customerPhone: string): string {
    // Normalize phone number (remove special characters)
    const normalized = customerPhone.replace(/[^0-9+]/g, '');
    return `${SESSION_CONFIG.KEY_PREFIX}${normalized}`;
  }

  /**
   * Generate unique session ID
   *
   * @returns Session ID string
   */
  generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Get all active sessions (for monitoring)
   *
   * @returns Array of active session keys
   */
  async getActiveSessions(): Promise<string[]> {
    try {
      const pattern = `${SESSION_CONFIG.KEY_PREFIX}*`;
      const keys = await this.executeWithTimeout(
        this.redis.keys(pattern),
        SESSION_CONFIG.OPERATION_TIMEOUT_MS * 2,
      );
      return keys;
    } catch (error) {
      this.logger.error(`Failed to get active sessions: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Clear expired sessions (maintenance task)
   *
   * @returns Number of cleared sessions
   */
  async clearExpiredSessions(): Promise<number> {
    try {
      const keys = await this.getActiveSessions();
      let cleared = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleared++;
        }
      }

      this.logger.log(`Cleared ${cleared} expired sessions`);
      return cleared;
    } catch (error) {
      this.logger.error(`Failed to clear expired sessions: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get session statistics
   *
   * @returns Session statistics object
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    averageTTL: number;
  }> {
    try {
      const keys = await this.getActiveSessions();
      let totalTTL = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        totalTTL += Math.max(0, ttl);
      }

      return {
        totalSessions: keys.length,
        averageTTL: keys.length > 0 ? Math.floor(totalTTL / keys.length) : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${(error as Error).message}`);
      return {
        totalSessions: 0,
        averageTTL: 0,
      };
    }
  }
}
