/**
 * Cache Usage Examples
 *
 * This file demonstrates how to use the Redis caching system
 * in your application services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../modules/cache/cache.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CacheExamplesService {
  private readonly logger = new Logger(CacheExamplesService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Example 1: Basic Cache Operations
   */
  async basicCacheOperations() {
    // Set a value
    await this.cacheService.set('user:123', { name: 'John' }, 3600);

    // Get a value
    const user = await this.cacheService.get('user:123');
    console.log('Cached user:', user);

    // Delete a value
    await this.cacheService.del('user:123');

    // Clear all cache (use with caution!)
    // await this.cacheService.reset();
  }

  /**
   * Example 2: Cache Dashboard Statistics
   *
   * This provides 90%+ performance improvement for dashboard loads
   */
  async getDashboardStats(userId: string, salonId?: string) {
    // Try cache first
    const cached = await this.cacheService.getDashboardStats(userId, salonId);
    if (cached) {
      this.logger.debug('Dashboard cache hit');
      return cached;
    }

    // Cache miss - fetch from database
    this.logger.debug('Dashboard cache miss, querying database');
    const stats = await this.calculateDashboardStats(userId, salonId);

    // Cache for 5 minutes
    await this.cacheService.setDashboardStats(userId, stats, salonId);

    return stats;
  }

  /**
   * Example 3: Cache with Invalidation on Update
   *
   * Pattern: Cache data, invalidate when it changes
   */
  async getSalon(salonId: string) {
    // Try cache
    const cached = await this.cacheService.getSalon(salonId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      include: { owner: true },
    });

    // Cache for 30 minutes
    await this.cacheService.setSalon(salonId, salon);

    return salon;
  }

  async updateSalon(salonId: string, data: any) {
    // Update in database
    const salon = await this.prisma.salon.update({
      where: { id: salonId },
      data,
    });

    // Invalidate cache
    await this.cacheService.invalidateSalon(salonId);

    return salon;
  }

  /**
   * Example 4: Template Caching
   *
   * Templates rarely change, cache for longer periods
   */
  async getTemplate(templateId: string) {
    // Try cache
    const cached = await this.cacheService.getTemplate(templateId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    // Cache for 1 hour
    await this.cacheService.setTemplate(templateId, template);

    return template;
  }

  /**
   * Example 5: Wrap Pattern (Auto-Cache)
   *
   * Automatically cache the result of a function
   */
  async getExpensiveData(key: string) {
    return this.cacheService.wrap(
      `expensive:${key}`,
      async () => {
        // This expensive operation only runs on cache miss
        return await this.performExpensiveCalculation(key);
      },
      600, // Cache for 10 minutes
    );
  }

  /**
   * Example 6: Cache Frequently Accessed Lists
   */
  async getActiveConversations(salonId: string) {
    const cacheKey = `conversations:active:${salonId}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return await this.prisma.conversation.findMany({
          where: {
            salon_id: salonId,
            status: 'ACTIVE',
          },
        });
      },
      300, // Cache for 5 minutes
    );
  }

  /**
   * Example 7: Invalidate Related Caches
   *
   * When creating a booking, invalidate dashboard cache
   */
  async createBooking(bookingData: any) {
    // Create booking
    const booking = await this.prisma.booking.create({
      data: bookingData,
      include: { salon: true },
    });

    // Invalidate related caches
    await this.cacheService.invalidateDashboardStats(booking.salon.owner_id, booking.salon_id);

    return booking;
  }

  /**
   * Example 8: Cache API Responses
   *
   * Cache external API calls to reduce latency
   */
  async getWhatsAppTemplates(salonId: string) {
    const cacheKey = `whatsapp:templates:${salonId}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        // Make external API call
        const response = await fetch(`https://graph.facebook.com/v18.0/templates`);
        return response.json();
      },
      3600, // Cache for 1 hour
    );
  }

  /**
   * Example 9: Cache User Sessions
   */
  async getUserSession(sessionId: string) {
    const cacheKey = `session:${sessionId}`;

    const session = await this.cacheService.get(cacheKey);
    if (session) {
      return session;
    }

    // Session not in cache or expired
    return null;
  }

  async saveUserSession(sessionId: string, sessionData: any) {
    const cacheKey = `session:${sessionId}`;
    // Cache for 24 hours
    await this.cacheService.set(cacheKey, sessionData, 86400);
  }

  /**
   * Example 10: Cache with Custom TTL Based on Data
   */
  async getCachedDataWithDynamicTTL(dataId: string) {
    const cacheKey = `dynamic:${dataId}`;

    // Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch data
    const data = await this.fetchData(dataId);

    // Determine TTL based on data characteristics
    const ttl = this.calculateOptimalTTL(data);

    // Cache with calculated TTL
    await this.cacheService.set(cacheKey, data, ttl);

    return data;
  }

  /**
   * Example 11: Prevent Cache Stampede
   *
   * Multiple requests for same data at once
   */
  private pendingRequests = new Map<string, Promise<any>>();

  async getCachedDataSafe(key: string) {
    // Check cache
    const cached = await this.cacheService.get(key);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const promise = this.fetchAndCacheData(key);
    this.pendingRequests.set(key, promise);

    try {
      const data = await promise;
      return data;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async fetchAndCacheData(key: string) {
    const data = await this.fetchData(key);
    await this.cacheService.set(key, data, 600);
    return data;
  }

  /**
   * Example 12: Cache Warming
   *
   * Pre-populate cache with frequently accessed data
   */
  async warmCache() {
    this.logger.log('Starting cache warm-up...');

    // Get all active salons
    const salons = await this.prisma.salon.findMany({
      where: { is_active: true },
      take: 100,
    });

    // Cache each salon
    for (const salon of salons) {
      await this.cacheService.setSalon(salon.id, salon);
    }

    this.logger.log(`Cache warmed with ${salons.length} salons`);
  }

  // Helper methods
  private async calculateDashboardStats(_userId: string, _salonId?: string) {
    // Complex database queries...
    return {
      totalBookings: 150,
      todayBookings: 12,
      activeChats: 8,
      responseRate: 95.5,
    };
  }

  private async performExpensiveCalculation(key: string) {
    // Simulate expensive operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { key, result: Math.random() };
  }

  private async fetchData(dataId: string) {
    return await this.prisma.salon.findUnique({
      where: { id: dataId },
    });
  }

  private calculateOptimalTTL(data: any): number {
    // Example: Cache more frequently updated data for shorter time
    if (data.lastUpdated && Date.now() - data.lastUpdated < 3600000) {
      return 300; // 5 minutes for recently updated data
    }
    return 3600; // 1 hour for stable data
  }
}

/**
 * Real-World Integration Example: Analytics Service with Caching
 */
@Injectable()
export class AnalyticsServiceWithCache {
  private readonly logger = new Logger(AnalyticsServiceWithCache.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getDashboardAnalytics(userId: string, salonId?: string) {
    // Build cache key
    const cacheKey = salonId ? `dashboard:${userId}:${salonId}` : `dashboard:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return { ...cached, cached: true };
    }

    this.logger.debug(`Cache miss for ${cacheKey}, fetching from DB`);

    // Build query
    const where: any = {};
    if (salonId) {
      where.salon_id = salonId;
    }

    // Fetch all data in parallel
    const [bookings, messages, conversations] = await Promise.all([
      this.prisma.booking.findMany({ where }),
      this.prisma.message.findMany({ where }),
      this.prisma.conversation.count({ where: { ...where, status: 'ACTIVE' } }),
    ]);

    // Calculate statistics
    const stats = {
      totalBookings: bookings.length,
      todayBookings: bookings.filter(
        (b) => b.created_at >= new Date(new Date().setHours(0, 0, 0, 0)),
      ).length,
      activeChats: conversations,
      totalMessages: messages.length,
      responseRate: this.calculateResponseRate(messages),
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, 300);
    this.logger.debug(`Cached dashboard stats for ${cacheKey}`);

    return { ...stats, cached: false };
  }

  async invalidateUserDashboard(userId: string, salonId?: string) {
    const cacheKey = salonId ? `dashboard:${userId}:${salonId}` : `dashboard:${userId}`;

    await this.cacheService.del(cacheKey);
    this.logger.debug(`Invalidated cache for ${cacheKey}`);
  }

  private calculateResponseRate(messages: any[]): number {
    const inbound = messages.filter((m) => m.direction === 'INBOUND').length;
    const outbound = messages.filter((m) => m.direction === 'OUTBOUND').length;
    return inbound > 0 ? (outbound / inbound) * 100 : 0;
  }
}
