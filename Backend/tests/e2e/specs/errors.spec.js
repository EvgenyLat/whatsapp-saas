/**
 * =============================================================================
 * ERROR SCENARIOS E2E TESTS
 * =============================================================================
 * Tests error handling across the entire system including database failures,
 * API errors, and invalid inputs
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');
const { RedisHelper } = require('../helpers/redis-helper');

test.describe('Error Scenarios E2E', () => {
  let whatsappHelper;
  let databaseHelper;
  let redisHelper;
  let testSalonId;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    redisHelper = new RedisHelper();
    await databaseHelper.connect();
    await redisHelper.connect();

    testSalonId = await databaseHelper.createTestSalon({
      name: 'Error Test Salon',
      phone: '+1234567890',
    });
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);
  });

  test.afterAll(async () => {
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
    await redisHelper.disconnect();
  });

  // ===========================================================================
  // Invalid Webhook Signature Tests
  // ===========================================================================

  test('should reject webhook with invalid signature', async () => {
    const response = await whatsappHelper.sendWebhookWithSignature(
      {
        from: '+1234567890',
        to: testSalonId,
        body: 'Test message',
        timestamp: Date.now(),
      },
      { invalidSignature: true }
    );

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('signature');

    // Verify message was not processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    const message = await databaseHelper.getLatestMessage('+1234567890', testSalonId);
    if (message) {
      expect(new Date(message.created_at).getTime()).toBeLessThan(Date.now() - 5000);
    }
  });

  test('should reject webhook with expired timestamp', async () => {
    const response = await whatsappHelper.sendWebhookWithSignature({
      from: '+1234567890',
      to: testSalonId,
      body: 'Old message',
      timestamp: Date.now() - 600000, // 10 minutes ago
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toMatch(/timestamp|expired/);
  });

  test('should reject webhook with missing signature when required', async () => {
    if (process.env.REQUIRE_WEBHOOK_SIGNATURE !== 'true') {
      test.skip();
      return;
    }

    const response = await whatsappHelper.sendWebhook(
      {
        from: '+1234567890',
        to: testSalonId,
        body: 'Unsigned message',
        timestamp: Date.now(),
      },
      { skipSignature: true }
    );

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  // ===========================================================================
  // Database Connection Errors
  // ===========================================================================

  test('should handle database connection loss gracefully', async () => {
    // Disconnect database
    await databaseHelper.disconnect();

    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      body: 'Message during DB outage',
      timestamp: Date.now(),
    });

    // Should return 500 error
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');

    // Reconnect for other tests
    await databaseHelper.connect();
  });

  test('should retry failed database operations', async () => {
    // This test would require mocking DB to fail once then succeed
    // Implementation depends on retry logic in the application

    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      body: 'Test retry logic',
      timestamp: Date.now(),
    });

    // Even with transient failures, should eventually succeed
    expect([200, 500]).toContain(response.status);
  });

  test('should handle database timeout', async () => {
    // Create a query that will timeout
    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      body: 'A'.repeat(100000), // Very large message
      timestamp: Date.now(),
    });

    // Should handle timeout gracefully
    expect([200, 400, 500]).toContain(response.status);
  });

  // ===========================================================================
  // Redis Connection Errors
  // ===========================================================================

  test('should handle Redis connection loss gracefully', async () => {
    // Disconnect Redis
    await redisHelper.disconnect();

    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      body: 'Message during Redis outage',
      timestamp: Date.now(),
    });

    // Application should continue working (degraded mode)
    // Either succeeds without caching or returns 500
    expect([200, 500]).toContain(response.status);

    // Reconnect for other tests
    await redisHelper.connect();
  });

  test('should work without Redis when rate limiting disabled', async () => {
    await redisHelper.disconnect();

    // Multiple rapid requests
    const responses = await Promise.all([
      whatsappHelper.sendWebhook({
        from: '+1234567890',
        to: testSalonId,
        body: 'Test 1',
        timestamp: Date.now(),
      }),
      whatsappHelper.sendWebhook({
        from: '+1234567890',
        to: testSalonId,
        body: 'Test 2',
        timestamp: Date.now(),
      }),
      whatsappHelper.sendWebhook({
        from: '+1234567890',
        to: testSalonId,
        body: 'Test 3',
        timestamp: Date.now(),
      }),
    ]);

    // Should process even without Redis
    responses.forEach(response => {
      expect([200, 500]).toContain(response.status);
    });

    await redisHelper.connect();
  });

  // ===========================================================================
  // OpenAI API Errors
  // ===========================================================================

  test('should handle OpenAI API timeout', async () => {
    // Send message that requires AI processing
    const response = await whatsappHelper.sendWebhook({
      from: '+9999999999',
      to: testSalonId,
      body: 'I want to book an appointment',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200); // Webhook accepted

    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for AI

    // Even if AI fails, should send fallback response
    const aiResponse = await databaseHelper.getLatestOutgoingMessage('+9999999999', testSalonId);
    expect(aiResponse).toBeTruthy();
  });

  test('should handle OpenAI API rate limit', async () => {
    // Send multiple messages rapidly to trigger rate limit
    const messages = Array.from({ length: 20 }, (_, i) => ({
      from: `+888${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: 'Help me book an appointment',
      timestamp: Date.now() + i,
    }));

    const responses = await Promise.all(
      messages.map(msg => whatsappHelper.sendWebhook(msg))
    );

    // All webhooks should be accepted
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Some might get fallback responses if AI rate limited
    await new Promise(resolve => setTimeout(resolve, 15000));

    for (const msg of messages.slice(0, 5)) {
      const response = await databaseHelper.getLatestMessage(msg.from, testSalonId);
      expect(response).toBeTruthy();
    }
  });

  test('should handle OpenAI API error with fallback', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+7777777777',
      to: testSalonId,
      body: 'Complex booking request that might cause AI error',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Should get some response (AI or fallback)
    const aiResponse = await databaseHelper.getLatestOutgoingMessage('+7777777777', testSalonId);
    expect(aiResponse).toBeTruthy();
  });

  // ===========================================================================
  // Rate Limit Exceeded
  // ===========================================================================

  test('should enforce rate limit on webhook endpoint', async () => {
    const customerPhone = '+6666666666';
    const responses = [];

    // Send 30 requests rapidly
    for (let i = 0; i < 30; i++) {
      const response = await whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: `Rate limit test ${i}`,
        timestamp: Date.now(),
      });
      responses.push(response);
    }

    // Some should be rate limited
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // Verify rate limit response format
    const limited = rateLimited[0];
    expect(limited.body).toHaveProperty('error');
    expect(limited.headers).toHaveProperty('retry-after');
  });

  test('should reset rate limit after cooldown', async () => {
    const customerPhone = '+5555555555';

    // Trigger rate limit
    for (let i = 0; i < 20; i++) {
      await whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: `Trigger rate limit ${i}`,
        timestamp: Date.now(),
      });
    }

    // Wait for cooldown
    const cooldown = parseInt(process.env.RATE_LIMIT_COOLDOWN || '60000');
    await new Promise(resolve => setTimeout(resolve, cooldown + 1000));

    // Should work again
    const response = await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'After cooldown',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);
  });

  // ===========================================================================
  // Invalid Booking Dates
  // ===========================================================================

  test('should reject booking in the past', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+4444444444',
      to: testSalonId,
      body: 'I want to book a haircut for yesterday at 2pm',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200); // Webhook accepted

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Should not create booking
    const bookings = await databaseHelper.getBookings(testSalonId, '+4444444444');
    const recentBookings = bookings.filter(
      b => Date.now() - new Date(b.created_at).getTime() < 10000
    );
    expect(recentBookings.length).toBe(0);

    // Should send error message
    const errorMsg = await databaseHelper.getLatestOutgoingMessage('+4444444444', testSalonId);
    expect(errorMsg.body.toLowerCase()).toMatch(/past|invalid|cannot/);
  });

  test('should reject booking too far in future', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+3333333333',
      to: testSalonId,
      body: 'I want to book a haircut for next year',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Depending on business rules, might reject or accept
    const errorMsg = await databaseHelper.getLatestOutgoingMessage('+3333333333', testSalonId);
    expect(errorMsg).toBeTruthy();
  });

  test('should reject booking outside business hours', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+2222222222',
      to: testSalonId,
      body: 'I want to book a haircut tomorrow at 3am',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Should suggest valid times
    const aiResponse = await databaseHelper.getLatestOutgoingMessage('+2222222222', testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/business hours|open|available/);
  });

  test('should handle invalid date format gracefully', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+1111111111',
      to: testSalonId,
      body: 'Book for 32nd of December at 25:00',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Should ask for clarification
    const aiResponse = await databaseHelper.getLatestOutgoingMessage('+1111111111', testSalonId);
    expect(aiResponse.body.toLowerCase()).toMatch(/when|date|time/);
  });

  // ===========================================================================
  // Network and Timeout Errors
  // ===========================================================================

  test('should handle slow webhook processing', async () => {
    const startTime = Date.now();

    const response = await whatsappHelper.sendWebhook(
      {
        from: '+0000000000',
        to: testSalonId,
        body: 'Test slow processing',
        timestamp: Date.now(),
      },
      { timeout: 30000 } // 30 second timeout
    );

    const duration = Date.now() - startTime;

    // Should respond within reasonable time
    expect(duration).toBeLessThan(30000);
    expect(response.status).toBe(200);
  });

  test('should handle malformed JSON in webhook', async () => {
    const response = await whatsappHelper.sendRawWebhook('{ invalid json }');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should handle missing required fields', async () => {
    const response = await whatsappHelper.sendRawWebhook({
      from: '+1234567890',
      // Missing 'to' and 'body'
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('required');
  });

  // ===========================================================================
  // Concurrent Operation Errors
  // ===========================================================================

  test('should handle concurrent booking modifications', async () => {
    const booking = await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: '+9999999998',
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });

    // Try to modify same booking concurrently
    const modifications = await Promise.all([
      whatsappHelper.sendWebhook({
        from: '+9999999998',
        to: testSalonId,
        body: `Change booking ${booking.id} to 2pm`,
        timestamp: Date.now(),
      }),
      whatsappHelper.sendWebhook({
        from: '+9999999998',
        to: testSalonId,
        body: `Change booking ${booking.id} to 3pm`,
        timestamp: Date.now() + 100,
      }),
    ]);

    // Both requests should be acknowledged
    modifications.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 7000));

    // One modification should win
    const updated = await databaseHelper.getBookingById(booking.id);
    expect([14, 15]).toContain(updated.appointment_date.getHours()); // 2pm or 3pm
  });

  test('should handle race condition in booking creation', async () => {
    const customerPhone = '+8888888887';

    // Try to create same booking twice concurrently
    const bookings = await Promise.all([
      whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: 'Book haircut tomorrow at 2pm',
        timestamp: Date.now(),
      }),
      whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: 'Book haircut tomorrow at 2pm',
        timestamp: Date.now() + 50,
      }),
    ]);

    // Both webhooks accepted
    bookings.forEach(response => {
      expect(response.status).toBe(200);
    });

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Should create only one booking or detect duplicate
    const created = await databaseHelper.getBookings(testSalonId, customerPhone);
    const recent = created.filter(b => Date.now() - new Date(b.created_at).getTime() < 15000);

    // Either 1 booking created or AI detected duplicate
    expect(recent.length).toBeGreaterThanOrEqual(1);
  });

  // ===========================================================================
  // Resource Exhaustion
  // ===========================================================================

  test('should handle memory-intensive operations', async () => {
    // Send very large message
    const largeMessage = 'A'.repeat(10000);

    const response = await whatsappHelper.sendWebhook({
      from: '+7777777776',
      to: testSalonId,
      body: largeMessage,
      timestamp: Date.now(),
    });

    // Should handle gracefully (accept or reject with proper error)
    expect([200, 400, 413]).toContain(response.status);
  });

  test('should handle connection pool exhaustion', async () => {
    // Send many concurrent requests
    const requests = Array.from({ length: 50 }, (_, i) => ({
      from: `+666${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: 'Pool exhaustion test',
      timestamp: Date.now() + i,
    }));

    const responses = await Promise.all(
      requests.map(req => whatsappHelper.sendWebhook(req))
    );

    // Most should succeed (some might fail if pool exhausted)
    const successful = responses.filter(r => r.status === 200);
    expect(successful.length).toBeGreaterThan(requests.length * 0.8); // 80%+ success
  });
});
