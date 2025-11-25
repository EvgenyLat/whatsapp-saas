import { Test, TestingModule } from '@nestjs/testing';
import { US1AnalyticsService } from './us1-analytics.service';
import { PrismaService } from '@database/prisma.service';

/**
 * US1 Analytics Service Unit Tests
 *
 * Tests:
 * - Event tracking
 * - Session management
 * - Success criteria calculation
 * - Metrics aggregation
 */
describe('US1AnalyticsService', () => {
  let service: US1AnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        US1AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            $executeRaw: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<US1AnalyticsService>(US1AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track booking_request_received event', async () => {
      const event = {
        eventType: 'booking_request_received' as const,
        salonId: 'salon_123',
        customerId: 'customer_456',
        sessionId: 'session_789',
        timestamp: new Date(),
        metadata: {
          language: 'en',
          typingCount: 1,
        },
      };

      await service.trackEvent(event);

      // Session should be created with typingCount = 1
      const session = await service.getSessionMetrics(event.sessionId);
      expect(session).toBeDefined();
      expect(session?.typingCount).toBe(1);
      expect(session?.tapCount).toBe(0);
    });

    it('should track slot_selected event with tap increment', async () => {
      const sessionId = 'session_test_123';

      // Initialize session
      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      // Track slot selection
      await service.trackEvent({
        eventType: 'slot_selected',
        salonId: 'salon_123',
        customerId: 'customer_456',
        sessionId,
        timestamp: new Date(),
        metadata: {
          slotId: 'slot_001',
          tapCount: 1,
        },
      });

      const session = await service.getSessionMetrics(sessionId);
      expect(session?.tapCount).toBe(1);
    });

    it('should track booking_completed event', async () => {
      const sessionId = 'session_complete_123';

      // Initialize session
      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      // Complete booking
      await service.trackEvent({
        eventType: 'booking_completed',
        salonId: 'salon_123',
        customerId: 'customer_456',
        sessionId,
        timestamp: new Date(),
        metadata: {
          bookingId: 'booking_xyz',
          tapCount: 2,
          typingCount: 1,
          durationMs: 24500,
        },
      });

      const session = await service.getSessionMetrics(sessionId);
      expect(session?.isComplete).toBe(true);
      expect(session?.bookingId).toBe('booking_xyz');
      expect(session?.tapCount).toBe(2);
      expect(session?.typingCount).toBe(1);
    });

    it('should track typing_detected event', async () => {
      const sessionId = 'session_typing_123';

      // Initialize session
      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      // Customer types additional message
      await service.trackEvent({
        eventType: 'typing_detected',
        salonId: 'salon_123',
        customerId: 'customer_456',
        sessionId,
        timestamp: new Date(),
        metadata: {},
      });

      const session = await service.getSessionMetrics(sessionId);
      expect(session?.typingCount).toBe(2); // Initial + 1 additional
    });
  });

  describe('initializeSession', () => {
    it('should initialize new session with default values', async () => {
      const sessionId = 'session_init_123';

      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      const session = await service.getSessionMetrics(sessionId);
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.salonId).toBe('salon_123');
      expect(session?.customerId).toBe('customer_456');
      expect(session?.tapCount).toBe(0);
      expect(session?.typingCount).toBe(1);
      expect(session?.isComplete).toBe(false);
    });
  });

  describe('completeSession', () => {
    it('should mark session as complete', async () => {
      const sessionId = 'session_complete_test_123';

      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      await service.completeSession(sessionId, 'booking_xyz');

      const session = await service.getSessionMetrics(sessionId);
      expect(session?.isComplete).toBe(true);
      expect(session?.bookingId).toBe('booking_xyz');
    });
  });

  describe('calculateSuccessCriteria', () => {
    it('should calculate SC-001 (zero typing) correctly', async () => {
      // Mock completed sessions
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        {
          session_id: 'session_1',
          tap_count: 2,
          typing_count: 1, // Zero typing (only initial message)
          duration_ms: 20000,
        },
        {
          session_id: 'session_2',
          tap_count: 2,
          typing_count: 1, // Zero typing
          duration_ms: 25000,
        },
        {
          session_id: 'session_3',
          tap_count: 3,
          typing_count: 2, // Additional typing
          duration_ms: 35000,
        },
      ]);

      const results = await service.calculateSuccessCriteria(
        'salon_123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      // 2 out of 3 sessions had zero typing
      expect(results.SC_001_zeroTyping).toBeCloseTo(66.67, 1);
      expect(results.breakdown.zeroTypingCount).toBe(2);
    });

    it('should calculate SC-002 (avg taps) correctly', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { session_id: 's1', tap_count: 2, typing_count: 1, duration_ms: 20000 },
        { session_id: 's2', tap_count: 2, typing_count: 1, duration_ms: 25000 },
        { session_id: 's3', tap_count: 3, typing_count: 1, duration_ms: 30000 },
      ]);

      const results = await service.calculateSuccessCriteria(
        'salon_123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      // (2 + 2 + 3) / 3 = 2.33
      expect(results.SC_002_avgTaps).toBeCloseTo(2.33, 2);
    });

    it('should calculate SC-003 (avg time) correctly', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { session_id: 's1', tap_count: 2, typing_count: 1, duration_ms: 20000 },
        { session_id: 's2', tap_count: 2, typing_count: 1, duration_ms: 25000 },
        { session_id: 's3', tap_count: 2, typing_count: 1, duration_ms: 30000 },
      ]);

      const results = await service.calculateSuccessCriteria(
        'salon_123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      // (20 + 25 + 30) / 3 = 25 seconds
      expect(results.SC_003_avgBookingTime).toBe(25);
    });

    it('should handle empty dataset', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([]);

      const results = await service.calculateSuccessCriteria(
        'salon_123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(results.SC_001_zeroTyping).toBe(0);
      expect(results.SC_002_avgTaps).toBe(0);
      expect(results.SC_003_avgBookingTime).toBe(0);
      expect(results.totalBookings).toBe(0);
    });

    it('should generate detailed breakdown', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
        { session_id: 's1', tap_count: 2, typing_count: 1, duration_ms: 15000 },
        { session_id: 's2', tap_count: 2, typing_count: 1, duration_ms: 25000 },
        { session_id: 's3', tap_count: 3, typing_count: 2, duration_ms: 35000 },
      ]);

      const results = await service.calculateSuccessCriteria(
        'salon_123',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(results.breakdown).toBeDefined();
      expect(results.breakdown.tapDistribution).toEqual({
        2: 2,
        3: 1,
      });
      expect(results.breakdown.timeDistribution).toEqual({
        under10s: 0,
        under20s: 1, // 15s
        under30s: 1, // 25s
        over30s: 1, // 35s
      });
    });
  });

  describe('getSessionMetrics', () => {
    it('should return null for non-existent session', async () => {
      const session = await service.getSessionMetrics('non_existent_session');
      expect(session).toBeNull();
    });

    it('should return session metrics', async () => {
      const sessionId = 'session_get_123';

      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      const session = await service.getSessionMetrics(sessionId);
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });
  });

  describe('performance', () => {
    it('should track events in <10ms', async () => {
      const startTime = Date.now();

      await service.trackEvent({
        eventType: 'booking_request_received',
        salonId: 'salon_123',
        customerId: 'customer_456',
        sessionId: 'session_perf_123',
        timestamp: new Date(),
        metadata: { language: 'en' },
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('session cleanup', () => {
    it('should not clean up active sessions', async () => {
      const sessionId = 'session_active_123';

      await service.initializeSession(
        sessionId,
        'salon_123',
        'customer_456',
      );

      // Session should still exist
      const session = await service.getSessionMetrics(sessionId);
      expect(session).toBeDefined();
    });
  });
});
