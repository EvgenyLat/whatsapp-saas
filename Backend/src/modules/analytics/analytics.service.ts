import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';
import { CacheService } from '../cache/cache.service';
import { AnalyticsFilterDto, DashboardStatsDto } from './dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => SalonsService))
    private readonly salonsService: SalonsService,
  ) {}

  async getDashboardStats(
    userId: string,
    userRole: string,
    filters: AnalyticsFilterDto,
  ): Promise<DashboardStatsDto> {
    // Try to get from cache first
    const cached = await this.cacheService.getDashboardStats(userId, filters.salon_id);
    if (cached) {
      this.logger.debug(`Dashboard cache hit for user ${userId}`);
      return cached;
    }

    this.logger.debug(`Dashboard cache miss for user ${userId}, fetching from database`);

    const where: any = {};

    if (filters.salon_id) {
      if (userRole !== 'SUPER_ADMIN') {
        await this.salonsService.verifySalonOwnership(filters.salon_id, userId);
      }
      where.salon_id = filters.salon_id;
    } else if (userRole !== 'SUPER_ADMIN') {
      const userSalons = await this.salonsService.findAll(userId, userRole);
      where.salon_id = { in: userSalons.map((s) => s.id) };
    }

    // Define time periods for comparisons
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // PERFORMANCE OPTIMIZATION: Single query to fetch all bookings with selective fields
    // Reduces memory usage by only fetching needed columns
    const allBookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        created_at: true,
        customer_phone: true,
      },
    });

    // PERFORMANCE OPTIMIZATION: Single query for all messages with selective fields
    const allMessages = await this.prisma.message.findMany({
      where,
      select: {
        id: true,
        direction: true,
        created_at: true,
      },
    });

    // PERFORMANCE OPTIMIZATION: Single efficient query for active conversations count
    const activeConversationsCount = await this.prisma.conversation.count({
      where: { ...where, status: 'ACTIVE' },
    });

    // Process bookings in memory (much faster than multiple DB queries)
    const todayBookings = allBookings.filter((b) => b.created_at >= todayStart);
    const last7DaysBookings = allBookings.filter((b) => b.created_at >= last7DaysStart);
    const previous7DaysBookings = allBookings.filter(
      (b) => b.created_at >= last14DaysStart && b.created_at < last7DaysStart,
    );
    const last30DaysBookings = allBookings.filter((b) => b.created_at >= last30DaysStart);
    const previous30DaysBookings = allBookings.filter(
      (b) => b.created_at >= last60DaysStart && b.created_at < last30DaysStart,
    );

    // Process messages in memory
    const last7DaysMessages = allMessages.filter((m) => m.created_at >= last7DaysStart);
    const previous7DaysMessages = allMessages.filter(
      (m) => m.created_at >= last14DaysStart && m.created_at < last7DaysStart,
    );

    // Calculate total bookings
    const totalBookings = allBookings.length;
    const todayBookingsCount = todayBookings.length;

    // Calculate bookings by status (all time)
    const bookingsByStatus = {
      PENDING: allBookings.filter((b) => b.status === 'PENDING').length,
      CONFIRMED: allBookings.filter((b) => b.status === 'CONFIRMED').length,
      CANCELLED: allBookings.filter((b) => b.status === 'CANCELLED').length,
      COMPLETED: allBookings.filter((b) => b.status === 'COMPLETED').length,
      NO_SHOW: allBookings.filter((b) => b.status === 'NO_SHOW').length,
    };

    // Calculate active chats
    const activeChats = activeConversationsCount;

    // Calculate response rate (percentage of conversations with responses)
    // For now, we'll use a simple calculation based on message counts
    const inboundMessages = allMessages.filter((m) => m.direction === 'INBOUND').length;
    const outboundMessages = allMessages.filter((m) => m.direction === 'OUTBOUND').length;
    const responseRate =
      inboundMessages > 0 ? Math.min((outboundMessages / inboundMessages) * 100, 100) : 0;

    // Calculate recent activity (last 7 days)
    const recentActivityBookings = last7DaysBookings.length;
    const recentActivityMessages = last7DaysMessages.length;

    // Calculate new customers (unique phone numbers in last 7 days)
    const uniqueCustomersLast7Days = new Set(last7DaysBookings.map((b) => b.customer_phone)).size;

    // Calculate trends (percentage change vs previous period)
    const bookingsChange =
      previous30DaysBookings.length > 0
        ? ((last30DaysBookings.length - previous30DaysBookings.length) /
            previous30DaysBookings.length) *
          100
        : last30DaysBookings.length > 0
          ? 100
          : 0;

    const messagesChange =
      previous7DaysMessages.length > 0
        ? ((last7DaysMessages.length - previous7DaysMessages.length) /
            previous7DaysMessages.length) *
          100
        : last7DaysMessages.length > 0
          ? 100
          : 0;

    // Calculate response rate change
    const inboundLast7 = last7DaysMessages.filter((m) => m.direction === 'INBOUND').length;
    const outboundLast7 = last7DaysMessages.filter((m) => m.direction === 'OUTBOUND').length;
    const responseRateLast7 =
      inboundLast7 > 0 ? Math.min((outboundLast7 / inboundLast7) * 100, 100) : 0;

    const inboundPrevious7 = previous7DaysMessages.filter((m) => m.direction === 'INBOUND').length;
    const outboundPrevious7 = previous7DaysMessages.filter(
      (m) => m.direction === 'OUTBOUND',
    ).length;
    const responseRatePrevious7 =
      inboundPrevious7 > 0 ? Math.min((outboundPrevious7 / inboundPrevious7) * 100, 100) : 0;

    const responseRateChange =
      responseRatePrevious7 > 0
        ? ((responseRateLast7 - responseRatePrevious7) / responseRatePrevious7) * 100
        : responseRateLast7 > 0
          ? 100
          : 0;

    const stats = {
      totalBookings,
      todayBookings: todayBookingsCount,
      activeChats,
      responseRate: Math.round(responseRate * 100) / 100, // Round to 2 decimal places
      bookingsByStatus,
      recentActivity: {
        bookings: recentActivityBookings,
        messages: recentActivityMessages,
        newCustomers: uniqueCustomersLast7Days,
      },
      trends: {
        bookingsChange: Math.round(bookingsChange * 100) / 100,
        messagesChange: Math.round(messagesChange * 100) / 100,
        responseRateChange: Math.round(responseRateChange * 100) / 100,
      },
    };

    // Cache the results
    await this.cacheService.setDashboardStats(userId, stats, filters.salon_id);
    this.logger.debug(`Dashboard stats cached for user ${userId}`);

    return stats;
  }

  /**
   * Invalidate dashboard cache when bookings or messages are updated
   */
  async invalidateDashboardCache(userId: string, salonId?: string): Promise<void> {
    await this.cacheService.invalidateDashboardStats(userId, salonId);
    this.logger.debug(`Dashboard cache invalidated for user ${userId}`);
  }
}
