import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * US1 Analytics Event Interface
 *
 * Tracks all metrics for User Story 1 success criteria validation:
 * - SC-001: 95%+ zero typing after initial message
 * - SC-002: Average 2-3 taps per booking
 * - SC-003: <30 seconds booking time
 */
export interface US1AnalyticsEvent {
  eventType:
    | 'booking_request_received' // Customer sends initial message
    | 'intent_parsed' // AI parsed intent successfully
    | 'slots_shown' // Interactive card sent
    | 'slot_selected' // Customer tapped slot button
    | 'confirmation_shown' // Confirmation card sent
    | 'booking_confirmed' // Customer tapped Confirm button
    | 'booking_completed' // Booking saved to database
    | 'typing_detected' // Customer typed after buttons shown
    | 'error_occurred' // Error during booking flow
    | 'choice_shown' // Choice card shown (phase 5)
    | 'choice_selected'; // Customer selected a choice (phase 5)

  salonId: string;
  customerId: string;
  sessionId: string;
  timestamp: Date;

  metadata: {
    tapCount?: number; // Running tap counter
    typingCount?: number; // Running typing counter
    durationMs?: number; // Time since first message
    intentComplete?: boolean; // Did AI get all info?
    language?: string; // Detected language
    cardType?: 'reply_buttons' | 'list_message' | 'alternative_slots'; // Which card sent
    bookingId?: string; // Final booking ID
    slotId?: string; // Selected slot ID
    errorMessage?: string; // Error details
    errorType?: string; // Error category
    choiceId?: string; // Choice ID (phase 5)
    slotsShown?: number; // Number of slots shown (phase 5)
    reason?: string; // Reason for choice (phase 5)
  };
}

/**
 * Session Metrics Storage
 * Tracks ongoing booking session state
 */
export interface SessionMetrics {
  sessionId: string;
  salonId: string;
  customerId: string;
  startTime: number;
  tapCount: number;
  typingCount: number;
  isComplete: boolean;
  bookingId?: string;
  events: US1AnalyticsEvent[];
}

/**
 * Success Criteria Results
 */
export interface SuccessCriteriaResults {
  SC_001_zeroTyping: number; // % bookings with 0 typing after initial
  SC_002_avgTaps: number; // Average taps per booking
  SC_003_avgBookingTime: number; // Average seconds to book
  totalBookings: number;
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;

  // Detailed breakdown
  breakdown: {
    zeroTypingCount: number;
    zeroTypingPercentage: number;
    tapDistribution: { [taps: number]: number };
    timeDistribution: {
      under10s: number;
      under20s: number;
      under30s: number;
      over30s: number;
    };
  };
}

/**
 * US1 Analytics Service
 *
 * Comprehensive analytics tracking for User Story 1 zero-typing booking flow.
 *
 * Features:
 * - Real-time event tracking
 * - Session state management (in-memory with optional Redis)
 * - Success criteria calculation
 * - Structured JSON logging
 * - Performance metrics aggregation
 *
 * @performance
 * - Event tracking: <10ms (in-memory)
 * - Success criteria calculation: <1s for 10k bookings
 *
 * @storage
 * - Development: In-memory Map (session state)
 * - Production: Redis for session state, PostgreSQL for events
 */
@Injectable()
export class US1AnalyticsService {
  private readonly logger = new Logger(US1AnalyticsService.name);

  // In-memory session storage (in production, use Redis)
  private readonly sessionMetrics = new Map<string, SessionMetrics>();

  constructor(private readonly prisma: PrismaService) {
    // Clean up completed sessions every 5 minutes
    setInterval(() => this.cleanupCompletedSessions(), 5 * 60 * 1000);
  }

  /**
   * Track analytics event
   *
   * Records event to database and updates session metrics in real-time.
   *
   * @param event - Analytics event to track
   */
  async trackEvent(event: US1AnalyticsEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Update session metrics
      this.updateSessionMetrics(event);

      // 2. Log structured event
      this.logEvent(event);

      // 3. Store event in database (async, non-blocking)
      this.storeEventAsync(event).catch((error) => {
        this.logger.error(`Failed to store analytics event: ${error.message}`, error.stack);
      });

      const duration = Date.now() - startTime;
      if (duration > 10) {
        this.logger.warn(`Analytics tracking took ${duration}ms (expected <10ms)`);
      }
    } catch (error) {
      this.logger.error(
        `Error tracking analytics event: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Calculate success criteria metrics for a given period
   *
   * Analyzes completed bookings and calculates:
   * - SC-001: % with zero typing after initial message
   * - SC-002: Average taps per booking
   * - SC-003: Average booking completion time
   *
   * @param salonId - Salon ID (or 'all' for platform-wide)
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Success criteria results with detailed breakdown
   */
  async calculateSuccessCriteria(
    salonId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SuccessCriteriaResults> {
    const startTime = Date.now();
    this.logger.log(
      `Calculating success criteria for salon ${salonId} (${startDate.toISOString()} to ${endDate.toISOString()})`,
    );

    try {
      // Get completed booking sessions
      const completedSessions = await this.getCompletedSessions(salonId, startDate, endDate);

      if (completedSessions.length === 0) {
        this.logger.warn('No completed bookings found in period');
        return this.getEmptyResults(startDate, endDate);
      }

      // SC-001: Calculate % with 0 typing after initial message
      const zeroTypingCount = completedSessions.filter((s) => s.typingCount === 1).length;
      const SC_001 = (zeroTypingCount / completedSessions.length) * 100;

      // SC-002: Calculate average taps per booking
      const totalTaps = completedSessions.reduce((sum, s) => sum + s.tapCount, 0);
      const SC_002 = totalTaps / completedSessions.length;

      // SC-003: Calculate average booking time in seconds
      const totalDuration = completedSessions.reduce((sum, s) => sum + s.durationMs, 0);
      const SC_003 = totalDuration / completedSessions.length / 1000;

      // Generate detailed breakdown
      const breakdown = this.generateBreakdown(completedSessions);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Success criteria calculated in ${duration}ms. Results: SC-001=${SC_001.toFixed(2)}%, SC-002=${SC_002.toFixed(2)} taps, SC-003=${SC_003.toFixed(2)}s`,
      );

      return {
        SC_001_zeroTyping: Number(SC_001.toFixed(2)),
        SC_002_avgTaps: Number(SC_002.toFixed(2)),
        SC_003_avgBookingTime: Number(SC_003.toFixed(2)),
        totalBookings: completedSessions.length,
        sampleSize: completedSessions.length,
        periodStart: startDate,
        periodEnd: endDate,
        breakdown,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating success criteria: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Get session metrics for active session
   *
   * @param sessionId - Session ID
   * @returns Current session metrics or null if not found
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    return this.sessionMetrics.get(sessionId) || null;
  }

  /**
   * Initialize new booking session
   *
   * @param sessionId - Unique session ID
   * @param salonId - Salon ID
   * @param customerId - Customer ID
   */
  async initializeSession(sessionId: string, salonId: string, customerId: string): Promise<void> {
    this.sessionMetrics.set(sessionId, {
      sessionId,
      salonId,
      customerId,
      startTime: Date.now(),
      tapCount: 0,
      typingCount: 1, // Initial message counts as typing
      isComplete: false,
      events: [],
    });

    this.logger.debug(`Session initialized: ${sessionId}`);
  }

  /**
   * Mark session as complete
   *
   * @param sessionId - Session ID
   * @param bookingId - Final booking ID
   */
  async completeSession(sessionId: string, bookingId: string): Promise<void> {
    const session = this.sessionMetrics.get(sessionId);
    if (session) {
      session.isComplete = true;
      session.bookingId = bookingId;
      this.logger.debug(`Session completed: ${sessionId} -> ${bookingId}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Update session metrics based on event
   */
  private updateSessionMetrics(event: US1AnalyticsEvent): void {
    let session = this.sessionMetrics.get(event.sessionId);

    // Initialize session if first event
    if (!session) {
      session = {
        sessionId: event.sessionId,
        salonId: event.salonId,
        customerId: event.customerId,
        startTime: event.timestamp.getTime(),
        tapCount: 0,
        typingCount: 0,
        isComplete: false,
        events: [],
      };
      this.sessionMetrics.set(event.sessionId, session);
    }

    // Update counters based on event type
    switch (event.eventType) {
      case 'booking_request_received':
        session.typingCount = 1; // Initial message counts as typing
        break;

      case 'slot_selected':
      case 'booking_confirmed':
        session.tapCount = event.metadata.tapCount || session.tapCount + 1;
        break;

      case 'typing_detected':
        session.typingCount++;
        break;

      case 'booking_completed':
        session.isComplete = true;
        session.bookingId = event.metadata.bookingId;
        session.tapCount = event.metadata.tapCount || session.tapCount;
        session.typingCount = event.metadata.typingCount || session.typingCount;
        break;
    }

    // Store event in session history
    session.events.push(event);
  }

  /**
   * Log structured JSON event
   */
  private logEvent(event: US1AnalyticsEvent): void {
    const session = this.sessionMetrics.get(event.sessionId);
    const durationMs = session ? Date.now() - session.startTime : event.metadata.durationMs || 0;

    this.logger.log({
      event: `us1.${event.eventType}`,
      sessionId: event.sessionId,
      salonId: event.salonId,
      customerId: event.customerId,
      timestamp: event.timestamp.toISOString(),
      durationMs,
      metrics: {
        tapCount: session?.tapCount || event.metadata.tapCount || 0,
        typingCount: session?.typingCount || event.metadata.typingCount || 0,
      },
      metadata: event.metadata,
    });
  }

  /**
   * Store event in database (async, non-blocking)
   */
  private async storeEventAsync(event: US1AnalyticsEvent): Promise<void> {
    try {
      // Store in database using raw SQL for better performance
      await this.prisma.$executeRaw`
        INSERT INTO us1_analytics_events (
          id,
          event_type,
          salon_id,
          customer_id,
          session_id,
          timestamp,
          metadata
        ) VALUES (
          gen_random_uuid(),
          ${event.eventType},
          ${event.salonId},
          ${event.customerId},
          ${event.sessionId},
          ${event.timestamp},
          ${JSON.stringify(event.metadata)}::jsonb
        )
      `;
    } catch (error) {
      // If table doesn't exist, log warning (table will be created in migration)
      if ((error as any).code === '42P01') {
        this.logger.warn('us1_analytics_events table does not exist. Run migration to create it.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get completed booking sessions from database
   */
  private async getCompletedSessions(
    salonId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      sessionId: string;
      tapCount: number;
      typingCount: number;
      durationMs: number;
    }>
  > {
    try {
      // Query completed bookings from analytics events
      const results = await this.prisma.$queryRaw<
        Array<{
          session_id: string;
          tap_count: number;
          typing_count: number;
          duration_ms: number;
        }>
      >`
        SELECT DISTINCT ON (session_id)
          session_id,
          (metadata->>'tapCount')::int as tap_count,
          (metadata->>'typingCount')::int as typing_count,
          (metadata->>'durationMs')::int as duration_ms
        FROM us1_analytics_events
        WHERE event_type = 'booking_completed'
          AND salon_id = ${salonId === 'all' ? '' : salonId}
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
        ORDER BY session_id, timestamp DESC
      `;

      return results.map((r) => ({
        sessionId: r.session_id,
        tapCount: r.tap_count || 0,
        typingCount: r.typing_count || 1,
        durationMs: r.duration_ms || 0,
      }));
    } catch (error) {
      // If table doesn't exist, return empty array
      if ((error as any).code === '42P01') {
        this.logger.warn('us1_analytics_events table does not exist. Returning empty results.');
        return [];
      }
      throw error;
    }
  }

  /**
   * Generate detailed breakdown of metrics
   */
  private generateBreakdown(
    sessions: Array<{
      tapCount: number;
      typingCount: number;
      durationMs: number;
    }>,
  ): SuccessCriteriaResults['breakdown'] {
    const zeroTypingCount = sessions.filter((s) => s.typingCount === 1).length;

    // Tap distribution
    const tapDistribution: { [taps: number]: number } = {};
    sessions.forEach((s) => {
      tapDistribution[s.tapCount] = (tapDistribution[s.tapCount] || 0) + 1;
    });

    // Time distribution
    const timeDistribution = {
      under10s: sessions.filter((s) => s.durationMs < 10000).length,
      under20s: sessions.filter((s) => s.durationMs >= 10000 && s.durationMs < 20000).length,
      under30s: sessions.filter((s) => s.durationMs >= 20000 && s.durationMs < 30000).length,
      over30s: sessions.filter((s) => s.durationMs >= 30000).length,
    };

    return {
      zeroTypingCount,
      zeroTypingPercentage: (zeroTypingCount / sessions.length) * 100,
      tapDistribution,
      timeDistribution,
    };
  }

  /**
   * Return empty results structure
   */
  private getEmptyResults(startDate: Date, endDate: Date): SuccessCriteriaResults {
    return {
      SC_001_zeroTyping: 0,
      SC_002_avgTaps: 0,
      SC_003_avgBookingTime: 0,
      totalBookings: 0,
      sampleSize: 0,
      periodStart: startDate,
      periodEnd: endDate,
      breakdown: {
        zeroTypingCount: 0,
        zeroTypingPercentage: 0,
        tapDistribution: {},
        timeDistribution: {
          under10s: 0,
          under20s: 0,
          under30s: 0,
          over30s: 0,
        },
      },
    };
  }

  /**
   * Clean up completed sessions older than 1 hour
   */
  private cleanupCompletedSessions(): void {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.sessionMetrics.entries());
    for (const [sessionId, session] of entries) {
      if (session.isComplete && now - session.startTime > ONE_HOUR) {
        this.sessionMetrics.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} completed sessions`);
    }
  }
}
