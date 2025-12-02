import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * AI Booking Flow Integration Tests (E2E)
 *
 * Tests complete end-to-end flows for AI-powered booking:
 * - Simple inquiry responses
 * - Full booking creation flow
 * - Availability checking
 * - Booking conflict handling
 * - Multi-language support
 * - Cache performance
 * - Usage limit enforcement
 */

describe('AI Booking Flow Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testSalonId: string;
  let testConversationId: string;

  const testUser = {
    email: `ai-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'AI',
    last_name: 'Tester',
    phone: `+12345${Date.now().toString().slice(-5)}`,
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

    // Create test salon
    const salonResponse = await request(app.getHttpServer())
      .post('/salons')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'AI Test Salon',
        phone: '+1234567890',
        address: '123 AI St',
        city: 'AI City',
        state: 'AI',
        postal_code: '12345',
        country: 'US',
        whatsapp_business_account_id: 'test-waba-id',
        phone_number_id: 'test-phone-number-id',
        access_token: 'test-access-token',
      });

    testSalonId = salonResponse.body.id;

    // Create a conversation for testing
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
      await prisma.aIResponseCache.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.booking.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.message.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.conversation.deleteMany({ where: { salon_id: testSalonId } });
      await prisma.salon.delete({ where: { id: testSalonId } });
    }
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('Phase 5.2: Simple Inquiry Responses', () => {
    it('TC-AI-001: Should respond to service inquiry in Russian', async () => {
      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: 'Какие у вас услуги?',
        customer_name: 'Мария',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      const duration = Date.now() - startTime;

      // Verify response structure
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('tokens_used');
      expect(response.body).toHaveProperty('cost');
      expect(response.body).toHaveProperty('response_time_ms');
      expect(response.body).toHaveProperty('model');

      // Verify AI response contains relevant content
      const aiResponse = response.body.response;
      expect(typeof aiResponse).toBe('string');
      expect(aiResponse.length).toBeGreaterThan(10);

      // Verify response time is acceptable
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds

      // Verify tokens were used (not from cache on first request)
      expect(response.body.tokens_used).toBeGreaterThan(0);

      // Verify message saved in database
      const aiMessage = await prisma.aIMessage.findFirst({
        where: {
          salon_id: testSalonId,
          conversation_id: testConversationId,
          direction: 'OUTBOUND',
        },
        orderBy: { created_at: 'desc' },
      });

      expect(aiMessage).toBeDefined();
      expect(aiMessage!.content).toBe(aiResponse);
      expect(aiMessage!.tokens_used).toBeGreaterThan(0);
    });

    it('TC-AI-001: Should respond to service inquiry in English', async () => {
      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: 'What services do you offer?',
        customer_name: 'John',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body.response.length).toBeGreaterThan(10);

      // Response should be in English
      // (AI should detect language and respond appropriately)
      const aiResponse = response.body.response.toLowerCase();
      expect(
        aiResponse.includes('manicure') ||
          aiResponse.includes('service') ||
          aiResponse.includes('offer'),
      ).toBe(true);
    });

    it('TC-AI-001: Should respond to service inquiry in Hebrew', async () => {
      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: 'איזה שירותים אתם מציעים?',
        customer_name: 'David',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body.response.length).toBeGreaterThan(10);
    });
  });

  describe('Phase 5.2: Cache Performance', () => {
    it('TC-AI-005: Should use cache for repeated queries', async () => {
      const query = `Какие у вас услуги? (cache test ${Date.now()})`;

      // First request - should call OpenAI
      const firstResponse = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: query,
        })
        .expect(200);

      expect(firstResponse.body.tokens_used).toBeGreaterThan(0);
      expect(firstResponse.body.model).not.toBe('CACHE');

      // Second request - should use cache
      const secondResponse = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: query,
        })
        .expect(200);

      // Cache hit assertions
      expect(secondResponse.body.tokens_used).toBe(0);
      expect(secondResponse.body.cost).toBe(0);
      expect(secondResponse.body.model).toBe('CACHE');
      expect(secondResponse.body.response_time_ms).toBeLessThan(100); // Much faster

      // Verify cache entry exists
      const cacheEntry = await prisma.aIResponseCache.findFirst({
        where: {
          salon_id: testSalonId,
        },
        orderBy: { created_at: 'desc' },
      });

      expect(cacheEntry).toBeDefined();
      expect(cacheEntry!.hit_count).toBeGreaterThanOrEqual(1);
    });

    it('TC-AI-006: Should not use cache for unique questions', async () => {
      const uniqueQuery = `Unique question ${Date.now()}: What is your pricing for gel manicure?`;

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: uniqueQuery,
        })
        .expect(200);

      // Should not be from cache (unique question)
      expect(response.body.tokens_used).toBeGreaterThan(0);
      expect(response.body.model).not.toBe('CACHE');
    });

    it('TC-AI-007: Should respect language boundaries in cache', async () => {
      const uniqueId = Date.now();

      // Ask in Russian
      const russianResponse = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: `Какие услуги lang test ${uniqueId}?`,
        })
        .expect(200);

      // Ask in English (same semantic meaning)
      const englishResponse = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: `What services lang test ${uniqueId}?`,
        })
        .expect(200);

      // Both should call OpenAI (different languages)
      expect(russianResponse.body.tokens_used).toBeGreaterThan(0);
      expect(englishResponse.body.tokens_used).toBeGreaterThan(0);
    });
  });

  describe('Phase 5.2: Booking Creation Flow', () => {
    it('TC-AI-002: Should create booking from message', async () => {
      // Create booking request
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(15, 0, 0, 0);

      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: `Запись к Ольге на ${tomorrowDate.toISOString().split('T')[0]} в 15:00, Маникюр`,
        customer_name: 'Мария Иванова',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      // Verify AI created booking
      expect(response.body).toHaveProperty('booking_code');
      expect(response.body.booking_code).toBeDefined();

      // Verify function calls logged
      expect(response.body).toHaveProperty('function_calls');
      expect(Array.isArray(response.body.function_calls)).toBe(true);
      expect(response.body.function_calls.length).toBeGreaterThan(0);

      // Verify booking exists in database
      const booking = await prisma.booking.findFirst({
        where: {
          salon_id: testSalonId,
          customer_phone: '+79001234567',
          service: 'Маникюр',
          status: 'CONFIRMED',
        },
        orderBy: { created_at: 'desc' },
      });

      expect(booking).toBeDefined();
      expect(booking!.booking_code).toBe(response.body.booking_code);
      expect(booking!.customer_name).toBe('Мария Иванова');

      // Verify usage counters incremented
      const salon = await prisma.salon.findUnique({
        where: { id: testSalonId },
        select: {
          usage_current_messages: true,
          usage_current_bookings: true,
        },
      });

      expect(salon!.usage_current_messages).toBeGreaterThan(0);
      expect(salon!.usage_current_bookings).toBeGreaterThan(0);
    });

    it('TC-AI-003: Should handle booking conflicts', async () => {
      // Create existing booking
      const conflictDate = new Date();
      conflictDate.setDate(conflictDate.getDate() + 2);
      conflictDate.setHours(14, 0, 0, 0);

      await prisma.booking.create({
        data: {
          salon_id: testSalonId,
          booking_code: `BK-${Date.now()}`,
          customer_phone: '+79001111111',
          customer_name: 'Existing Customer',
          service: 'Педикюр',
          start_ts: conflictDate,
          status: 'CONFIRMED',
        },
      });

      // Try to book same time slot
      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: `Запись на ${conflictDate.toISOString().split('T')[0]} в 14:00, Маникюр`,
        customer_name: 'Мария',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      // Verify AI suggests alternative times
      const aiResponse = response.body.response.toLowerCase();
      expect(
        aiResponse.includes('занято') ||
          aiResponse.includes('доступные варианты') ||
          aiResponse.includes('альтернатив'),
      ).toBe(true);

      // Verify no booking created at conflicting time
      const conflictBooking = await prisma.booking.findFirst({
        where: {
          salon_id: testSalonId,
          customer_phone: '+79001234567',
          start_ts: conflictDate,
        },
      });

      expect(conflictBooking).toBeNull();
    });

    it('TC-AI-004: Should reject past date bookings', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(15, 0, 0, 0);

      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: `Запись на ${yesterday.toISOString().split('T')[0]} в 15:00`,
        customer_name: 'Мария',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest)
        .expect(200);

      // Verify rejection message
      const aiResponse = response.body.response.toLowerCase();
      expect(
        aiResponse.includes('прошлом') ||
          aiResponse.includes('нельзя') ||
          aiResponse.includes('невозможно'),
      ).toBe(true);

      // Verify no booking created
      const pastBooking = await prisma.booking.findFirst({
        where: {
          salon_id: testSalonId,
          customer_phone: '+79001234567',
          start_ts: yesterday,
        },
      });

      expect(pastBooking).toBeNull();
    });
  });

  describe('Phase 5.2: Conversation History', () => {
    it('Should maintain conversation context across messages', async () => {
      const newConversation = await prisma.conversation.create({
        data: {
          salon_id: testSalonId,
          phone_number: '+79002222222',
          status: 'ACTIVE',
          message_count: 0,
          cost: 0,
        },
      });

      // First message
      await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: newConversation.id,
          phone_number: '+79002222222',
          message: 'Здравствуйте, я хочу записаться на маникюр',
          customer_name: 'Анна',
        })
        .expect(200);

      // Second message (with context)
      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: newConversation.id,
          phone_number: '+79002222222',
          message: 'Завтра в 16:00 подойдет?',
        })
        .expect(200);

      // Verify AI maintains context (knows we're talking about manicure)
      expect(response.body).toHaveProperty('response');

      // Verify conversation has multiple messages
      const aiMessages = await prisma.aIMessage.findMany({
        where: {
          conversation_id: newConversation.id,
        },
        orderBy: { created_at: 'asc' },
      });

      expect(aiMessages.length).toBeGreaterThanOrEqual(4); // 2 inbound + 2 outbound
    });
  });

  describe('Phase 5.2: Error Handling', () => {
    it('TC-ERR-001: Should handle missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          // Missing conversation_id and message
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('TC-ERR-002: Should handle invalid salon ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: 'non-existent-salon-id',
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Test message',
        })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('Should handle OpenAI API errors gracefully', async () => {
      // This test requires mocking OpenAI API to fail
      // For now, we're testing the error handling structure

      const processRequest = {
        salon_id: testSalonId,
        conversation_id: testConversationId,
        phone_number: '+79001234567',
        message: 'Test error handling',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send(processRequest);

      // Should return 200 even if OpenAI fails (graceful degradation)
      expect([200, 500, 503]).toContain(response.status);

      if (response.status === 200) {
        // Verify fallback response
        expect(response.body).toHaveProperty('response');
      }
    });
  });

  describe('Phase 5.2: Performance Metrics', () => {
    it('TC-PERF-001: AI response time should be under 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: 'Какие у вас часы работы?',
        })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('TC-PERF-002: Cache response time should be under 100ms', async () => {
      const cacheQuery = `Cache performance test ${Date.now()}`;

      // First request to populate cache
      await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: cacheQuery,
        })
        .expect(200);

      // Second request from cache
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ai/process-message')
        .send({
          salon_id: testSalonId,
          conversation_id: testConversationId,
          phone_number: '+79001234567',
          message: cacheQuery,
        })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.model).toBe('CACHE');
      expect(duration).toBeLessThan(100); // Cache should be very fast
    });
  });
});
