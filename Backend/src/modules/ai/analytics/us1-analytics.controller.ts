import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { US1AnalyticsService, SuccessCriteriaResults } from './us1-analytics.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

/**
 * US1 Analytics Controller
 *
 * REST endpoints for User Story 1 analytics and success criteria reporting.
 *
 * Endpoints:
 * - GET /api/ai/analytics/us1/success-criteria - Calculate success criteria metrics
 */
@Controller('api/ai/analytics/us1')
@UseGuards(JwtAuthGuard)
export class US1AnalyticsController {
  constructor(private readonly analytics: US1AnalyticsService) {}

  /**
   * Calculate success criteria for a given period
   *
   * @example
   * GET /api/ai/analytics/us1/success-criteria?salonId=123&startDate=2025-01-01&endDate=2025-01-31
   *
   * @returns Success criteria results with detailed breakdown
   */
  @Get('success-criteria')
  async calculateSuccessCriteria(
    @Query('salonId') salonId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ): Promise<SuccessCriteriaResults> {
    // Default to last 30 days if dates not provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Default to 'all' if salonId not provided
    const salon = salonId || 'all';

    return this.analytics.calculateSuccessCriteria(salon, startDate, endDate);
  }

  /**
   * Get session metrics for active session
   *
   * @example
   * GET /api/ai/analytics/us1/session/session_123
   */
  @Get('session/:sessionId')
  async getSessionMetrics(@Query('sessionId') sessionId: string) {
    const metrics = await this.analytics.getSessionMetrics(sessionId);

    if (!metrics) {
      return {
        error: 'Session not found or expired',
        sessionId,
      };
    }

    return {
      sessionId: metrics.sessionId,
      salonId: metrics.salonId,
      customerId: metrics.customerId,
      tapCount: metrics.tapCount,
      typingCount: metrics.typingCount,
      durationMs: Date.now() - metrics.startTime,
      isComplete: metrics.isComplete,
      bookingId: metrics.bookingId,
      eventCount: metrics.events.length,
    };
  }
}
