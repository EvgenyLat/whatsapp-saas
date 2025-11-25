import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefixes: Record<string, string>;
  private readonly ttls: Record<string, number>;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    const cacheConfig = this.configService.get('cache');
    this.prefixes = cacheConfig?.prefixes || {};
    this.ttls = cacheConfig?.ttl || {};
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get cache key ${key}: ${message}`);
      return undefined;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl || 'default'}s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to set cache key ${key}: ${message}`);
    }
  }

  /**
   * Delete a specific cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete cache key ${key}: ${message}`);
    }
  }

  /**
   * Clear all cache
   * Note: cache-manager may not support reset() in all stores
   */
  async reset(): Promise<void> {
    try {
      // Cast to any to avoid TypeScript error with cache-manager
      await (this.cacheManager as any).reset();
      this.logger.warn('Cache reset: All keys cleared');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to reset cache: ${message}`);
    }
  }

  /**
   * Dashboard analytics cache methods
   */
  async getDashboardStats(userId: string, salonId?: string): Promise<any> {
    const key = this.buildDashboardKey(userId, salonId);
    return this.get(key);
  }

  async setDashboardStats(
    userId: string,
    stats: any,
    salonId?: string,
  ): Promise<void> {
    const key = this.buildDashboardKey(userId, salonId);
    await this.set(key, stats, this.ttls.dashboard);
  }

  async invalidateDashboardStats(userId: string, salonId?: string): Promise<void> {
    const key = this.buildDashboardKey(userId, salonId);
    await this.del(key);
  }

  /**
   * Salon cache methods
   */
  async getSalon(salonId: string): Promise<any> {
    const key = this.buildSalonKey(salonId);
    return this.get(key);
  }

  async setSalon(salonId: string, salon: any): Promise<void> {
    const key = this.buildSalonKey(salonId);
    await this.set(key, salon, this.ttls.salon);
  }

  async invalidateSalon(salonId: string): Promise<void> {
    const key = this.buildSalonKey(salonId);
    await this.del(key);
  }

  /**
   * Template cache methods
   */
  async getTemplate(templateId: string): Promise<any> {
    const key = this.buildTemplateKey(templateId);
    return this.get(key);
  }

  async setTemplate(templateId: string, template: any): Promise<void> {
    const key = this.buildTemplateKey(templateId);
    await this.set(key, template, this.ttls.template);
  }

  async invalidateTemplate(templateId: string): Promise<void> {
    const key = this.buildTemplateKey(templateId);
    await this.del(key);
  }

  async invalidateAllTemplates(salonId: string): Promise<void> {
    // Note: This is a simplified approach. For production, consider using Redis SCAN
    // to find and delete all template keys for a salon
    this.logger.debug(`Invalidating all templates for salon: ${salonId}`);
  }

  /**
   * Conversation cache methods
   */
  async getConversation(conversationId: string): Promise<any> {
    const key = this.buildConversationKey(conversationId);
    return this.get(key);
  }

  async setConversation(conversationId: string, conversation: any): Promise<void> {
    const key = this.buildConversationKey(conversationId);
    await this.set(key, conversation, this.ttls.conversation);
  }

  async invalidateConversation(conversationId: string): Promise<void> {
    const key = this.buildConversationKey(conversationId);
    await this.del(key);
  }

  /**
   * Key builder methods
   */
  private buildDashboardKey(userId: string, salonId?: string): string {
    const base = `${this.prefixes.dashboard}${userId}`;
    return salonId ? `${base}:${salonId}` : base;
  }

  private buildSalonKey(salonId: string): string {
    return `${this.prefixes.salon}${salonId}`;
  }

  private buildTemplateKey(templateId: string): string {
    return `${this.prefixes.template}${templateId}`;
  }

  private buildConversationKey(conversationId: string): string {
    return `${this.prefixes.conversation}${conversationId}`;
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== undefined) {
        this.logger.debug(`Cache hit: ${key}`);
        return cached;
      }

      this.logger.debug(`Cache miss: ${key}`);
      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache wrap error for ${key}: ${message}`);
      // Fallback to executing the function without caching
      return fn();
    }
  }
}
