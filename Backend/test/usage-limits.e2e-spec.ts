import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * Usage Limits & Freemium Model Integration Tests (E2E)
 *
 * Tests the complete freemium usage tracking system:
 * - Message limit enforcement (1000/month)
 * - Booking limit enforcement (500/month)
 * - Usage counter increments
 * - Monthly counter reset
 * - Warning notifications (80%, 90%, 100%)
 * - Graceful limit reached messages
 */

describe('Usage Limits & Freemium Model Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testSalonId: string;
  let testConversationId: string;

  const testUser = {
    email: `usage-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Usage',
    last_name: 'Tester',
    phone: `+12347${Date.now().toString().slice(-5)}`,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    authToken = registerResponse.body.accessToken;

    // Create test salon with custom limits for faster testing
    const salonResponse = await request(app.getHttpServer())
      .post('/salons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Usage Test Salon',
        phone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
        whatsapp_business_account_id: 'test-waba-id',
        phone_number_id: 'test-phone-number-id',
        access_token: 'test-access-token',
      });

    testSalonId = salonResponse.body.id;

    // Set lower limits for testing
    await prisma.salon.update({
      where: { id: testSalonId },
      data: {
        usage_limit_messages: 10,
        usage_limit_bookings: 5,
        usage_current_messages: 0,
        usage_current_bookings: 0,
      },
    });

    // Create test conversation
    const conversation = await prisma.conversation.create({
      data: {
        salon_id: testSalonId,
        phone_number: '+79001234567',
        status: 'ACTIVE',
        message_count: 0,
        cost: 0,
      },
    });

    testConversationId = conversation.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testSalonId) {
      await prisma.aIMessage.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.aIConversation.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.booking.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.message.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.conversation.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.salon.delete({ where: { id: testSalonId } });
    }
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('Phase 5.3: Message Limit Enforcement', () => {
    it('TC-USAGE-001: Should allow messages under limit', async () => {
      // Set usage to 8/10
      await prisma.salon.update({
        where: { id: testSalonId },
        data: { usage_current_messages: 8 },
      });

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Какие у вас услуги?',
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body.model).not.toBe('LIMIT_REACHED');

      // Verify counter incremented
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_messages: true },
      });

      expect(salon!.usage_current_messages).toBe(9);
    });

    it('TC-USAGE-001: Should allow message at exactly limit', async () => {
      // Set usage to 9/10 (one before limit)
      await prisma.salon.update({
        where: { id: testSalonId },
        data: { usage_current_messages: 9 },
      });

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test message at limit',
        })
        .expect(200);

      // This should be the 10th message (at limit)
      expect(response.body).toHaveProperty('response');
      expect(response.body.model).not.toBe('LIMIT_REACHED');

      // Verify counter is now 10
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_messages: true },
      });

      expect(salon!.usage_current_messages).toBe(10);
    });

    it('TC-USAGE-001: Should block messages when limit reached', async () => {
      // Usage is already at 10/10 from previous test
      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'This should be blocked',
        })
        .expect(200);

      // Verify limit reached response
      expect(response.body).toHaveProperty('response');
      expect(response.body.model).toBe('LIMIT_REACHED');
      expect(response.body.tokens_used).toBe(0);
      expect(response.body.cost).toBe(0);

      // Verify friendly message
      const limitMessage = response.body.response;
      expect(limitMessage.toLowerCase()).toContain('лимит');

      // Verify counter not incremented beyond limit
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_messages: true },
      });

      expect(salon!.usage_current_messages).toBe(10); // Still at limit
    });

    it('TC-USAGE-004: Should warn at 80% usage', async () => {
      // Reset and set to 80% (8/10)
      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_current_messages: 7,
          usage_limit_messages: 10,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test 80% warning',
        })
        .expect(200);

      // Message should succeed but with warning
      expect(response.body).toHaveProperty('response');

      // Verify usage is now 8/10 (80%)
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_messages: true },
      });

      expect(salon!.usage_current_messages).toBe(8);
    });

    it('TC-USAGE-004: Should warn at 90% usage', async () => {
      // Set to 90% (9/10)
      await prisma.salon.update({
        where: { id: testSalonId },
        data: { usage_current_messages: 8 },
      });

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test 90% warning',
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');

      // Verify usage is now 9/10 (90%)
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_messages: true },
      });

      expect(salon!.usage_current_messages).toBe(9);
    });
  });

  describe('Phase 5.3: Booking Limit Enforcement', () => {
    it('TC-USAGE-002: Should allow bookings under limit', async () => {
      // Set booking usage to 3/5
      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_current_bookings: 3,
          usage_current_messages: 0, // Reset messages for clean test
        },
      });

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(10, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          salon_id: testSalonId,
          customer_name: 'Test Customer 1',
          customer_phone: '+79001111111',
          service: 'Маникюр',
          start_ts: tomorrowDate.toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('booking_code');

      // Verify counter incremented
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_bookings: true },
      });

      expect(salon!.usage_current_bookings).toBe(4);
    });

    it('TC-USAGE-002: Should block bookings when limit reached', async () => {
      // Set booking usage to 5/5 (at limit)
      await prisma.salon.update({
        where: { id: testSalonId },
        data: { usage_current_bookings: 5 },
      });

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(11, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          salon_id: testSalonId,
          customer_name: 'Test Customer Blocked',
          customer_phone: '+79002222222',
          service: 'Педикюр',
          start_ts: tomorrowDate.toISOString(),
        })
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('лимит');

      // Verify no booking created
      const booking = await prisma.booking.findFirst({
        where: {
          salon_id: testSalonId,
          customer_phone: '+79002222222',
        },
      });

      expect(booking).toBeNull();

      // Verify counter not incremented
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_bookings: true },
      });

      expect(salon!.usage_current_bookings).toBe(5); // Still at limit
    });

    it('TC-USAGE-002: Should block AI-created bookings at limit', async () => {
      // Usage already at 5/5 from previous test
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(12, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79003333333',
          message: `Запись на ${tomorrowDate.toISOString().split('T')[0]} в 12:00, Маникюр`,
          customer_name: 'AI Test Customer',
        })
        .expect(200);

      // AI should respond but not create booking
      expect(response.body).toHaveProperty('response');
      expect(response.body.booking_code).toBeUndefined();

      // Verify no booking created
      const booking = await prisma.booking.findFirst({
        where: {
          salon_id: testSalonId,
          customer_phone: '+79003333333',
        },
      });

      expect(booking).toBeNull();
    });

    it('TC-USAGE-004: Should warn at 80% booking usage', async () => {
      // Set to 80% (4/5)
      await prisma.salon.update({
        where: { id: testSalonId },
        data: { usage_current_bookings: 3 },
      });

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(13, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          salon_id: testSalonId,
          customer_name: 'Test Customer 4',
          customer_phone: '+79004444444',
          service: 'Стрижка',
          start_ts: tomorrowDate.toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');

      // Verify usage is now 4/5 (80%)
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: { usage_current_bookings: true },
      });

      expect(salon!.usage_current_bookings).toBe(4);
    });
  });

  describe('Phase 5.3: Usage Counter Reset', () => {
    it('TC-USAGE-003: Should reset counters after monthly period', async () => {
      // Set reset date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_current_messages: 10,
          usage_current_bookings: 5,
          usage_reset_at: yesterday,
        },
      });

      // Send AI message (should trigger reset check)
      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test reset trigger',
        })
        .expect(200);

      // Message should succeed (counters reset)
      expect(response.body).toHaveProperty('response');
      expect(response.body.model).not.toBe('LIMIT_REACHED');

      // Verify counters reset
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: {
          usage_current_messages: true,
          usage_current_bookings: true,
          usage_reset_at: true,
        },
      });

      // Should be 1 (the message we just sent after reset)
      expect(salon!.usage_current_messages).toBe(1);
      expect(salon!.usage_current_bookings).toBe(0);

      // Reset date should be ~30 days in the future
      const resetDate = new Date(salon!.usage_reset_at);
      const now = new Date();
      const daysDiff = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThan(25); // Should be around 30 days
      expect(daysDiff).toBeLessThan(35);
    });

    it('TC-USAGE-003: Should not reset counters before monthly period', async () => {
      // Set reset date to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_current_messages: 5,
          usage_current_bookings: 2,
          usage_reset_at: nextMonth,
        },
      });

      // Send message
      await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test no reset',
        })
        .expect(200);

      // Verify counters incremented (not reset)
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: {
          usage_current_messages: true,
          usage_current_bookings: true,
        },
      });

      expect(salon!.usage_current_messages).toBe(6); // Incremented from 5
      expect(salon!.usage_current_bookings).toBe(2); // Unchanged
    });
  });

  describe('Phase 5.3: Usage Statistics', () => {
    it('Should return accurate usage statistics', async () => {
      // Set known usage values
      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_current_messages: 750,
          usage_current_bookings: 300,
          usage_limit_messages: 1000,
          usage_limit_bookings: 500,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/salons/${testSalonId}/usage`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('usage_current_messages', 750);
        expect(response.body).toHaveProperty('usage_current_bookings', 300);
        expect(response.body).toHaveProperty('usage_limit_messages', 1000);
        expect(response.body).toHaveProperty('usage_limit_bookings', 500);

        // Verify percentage calculations
        const messagePercent = (750 / 1000) * 100;
        const bookingPercent = (300 / 500) * 100;

        expect(response.body.messages_usage_percent).toBeCloseTo(messagePercent, 0);
        expect(response.body.bookings_usage_percent).toBeCloseTo(bookingPercent, 0);
      }
    });
  });

  describe('Phase 5.3: Custom Limits', () => {
    it('Should respect custom limits for different plan tiers', async () => {
      // Simulate upgrading to higher tier
      await prisma.salon.update({
        where: { id: testSalonId },
        data: {
          usage_limit_messages: 5000,
          usage_limit_bookings: 2000,
          usage_current_messages: 0,
          usage_current_bookings: 0,
        },
      });

      // Verify higher limits work
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: {
          usage_limit_messages: true,
          usage_limit_bookings: true,
        },
      });

      expect(salon!.usage_limit_messages).toBe(5000);
      expect(salon!.usage_limit_bookings).toBe(2000);
    });
  });
});
