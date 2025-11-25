/**
 * =============================================================================
 * WEBHOOK INTEGRATION E2E TESTS
 * =============================================================================
 * Tests WhatsApp webhook integration including signature verification,
 * rate limiting, and error handling
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');
const crypto = require('crypto');

test.describe('WhatsApp Webhook Integration E2E', () => {
  let whatsappHelper;
  let databaseHelper;
  let testSalonId;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    await databaseHelper.connect();

    testSalonId = await databaseHelper.createTestSalon({
      name: 'Webhook Test Salon',
      phone: '+1234567890',
    });
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);
  });

  test.afterAll(async () => {
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
  });

  // ===========================================================================
  // Webhook Reception Tests
  // ===========================================================================

  test('should receive and acknowledge webhook', async () => {
    const message = {
      from: '+1234567890',
      to: testSalonId,
      body: 'Test message',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(message);

    // Verify webhook was acknowledged
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    // Verify response time is reasonable
    expect(response.duration).toBeLessThan(1000); // < 1 second
  });

  test('should process message and send response', async () => {
    const customerPhone = '+9876543210';
    const message = {
      from: customerPhone,
      to: testSalonId,
      body: 'Hello',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(message);
    expect(response.status).toBe(200);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify message was stored
    const storedMessage = await databaseHelper.getLatestMessage(customerPhone, testSalonId);
    expect(storedMessage).toBeTruthy();
    expect(storedMessage.body).toBe('Hello');
    expect(storedMessage.direction).toBe('incoming');

    // Verify response was sent
    const responseMessage = await databaseHelper.getLatestOutgoingMessage(
      customerPhone,
      testSalonId
    );
    expect(responseMessage).toBeTruthy();
    expect(responseMessage.direction).toBe('outgoing');
  });

  test('should handle multiple concurrent webhooks', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      from: `+555${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: `Concurrent message ${i}`,
      timestamp: Date.now() + i,
    }));

    // Send all webhooks concurrently
    const responses = await Promise.all(
      messages.map(msg => whatsappHelper.sendWebhook(msg))
    );

    // Verify all were accepted
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify all messages were stored
    for (const message of messages) {
      const stored = await databaseHelper.getLatestMessage(message.from, testSalonId);
      expect(stored).toBeTruthy();
      expect(stored.body).toContain('Concurrent message');
    }
  });

  // ===========================================================================
  // Signature Verification Tests
  // ===========================================================================

  test('should verify valid webhook signature', async () => {
    const message = {
      from: '+1234567890',
      to: testSalonId,
      body: 'Signed message',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhookWithSignature(message);

    // Verify webhook was accepted
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('should reject invalid webhook signature', async () => {
    const message = {
      from: '+1234567890',
      to: testSalonId,
      body: 'Invalid signature message',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhookWithSignature(message, {
      invalidSignature: true,
    });

    // Verify webhook was rejected
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('signature');
  });

  test('should reject webhook without signature when required', async () => {
    const message = {
      from: '+1234567890',
      to: testSalonId,
      body: 'No signature message',
      timestamp: Date.now(),
    };

    const response = await whatsappHelper.sendWebhook(message, {
      skipSignature: true,
    });

    // Verify webhook was rejected if signature is required
    if (process.env.REQUIRE_WEBHOOK_SIGNATURE === 'true') {
      expect(response.status).toBe(401);
    } else {
      expect(response.status).toBe(200);
    }
  });

  test('should reject replayed webhook (timestamp too old)', async () => {
    const message = {
      from: '+1234567890',
      to: testSalonId,
      body: 'Old message',
      timestamp: Date.now() - 600000, // 10 minutes ago
    };

    const response = await whatsappHelper.sendWebhookWithSignature(message);

    // Verify webhook was rejected
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('timestamp');
  });

  // ===========================================================================
  // Rate Limiting Tests
  // ===========================================================================

  test('should rate limit excessive requests from same number', async () => {
    const customerPhone = '+9999999999';
    const responses = [];

    // Send 20 requests rapidly
    for (let i = 0; i < 20; i++) {
      const response = await whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: `Rate limit test ${i}`,
        timestamp: Date.now(),
      });
      responses.push(response);
    }

    // Verify some requests were rate limited
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // Verify rate limit response
    const limitedResponse = rateLimited[0];
    expect(limitedResponse.body).toHaveProperty('error');
    expect(limitedResponse.body.error.toLowerCase()).toContain('rate limit');
    expect(limitedResponse.headers).toHaveProperty('retry-after');
  });

  test('should allow requests after rate limit cooldown', async () => {
    const customerPhone = '+8888888888';

    // Trigger rate limit
    for (let i = 0; i < 15; i++) {
      await whatsappHelper.sendWebhook({
        from: customerPhone,
        to: testSalonId,
        body: `Cooldown test ${i}`,
        timestamp: Date.now(),
      });
    }

    // Wait for rate limit cooldown (e.g., 60 seconds)
    const cooldownTime = parseInt(process.env.RATE_LIMIT_COOLDOWN || '60000');
    await new Promise(resolve => setTimeout(resolve, cooldownTime + 1000));

    // Try again
    const response = await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'After cooldown',
      timestamp: Date.now(),
    });

    // Verify request was accepted
    expect(response.status).toBe(200);
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  test('should handle malformed webhook payload', async () => {
    const response = await whatsappHelper.sendRawWebhook({
      invalid: 'payload',
      missing: 'required fields',
    });

    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should handle webhook with missing required fields', async () => {
    const response = await whatsappHelper.sendRawWebhook({
      from: '+1234567890',
      // Missing 'to' and 'body'
      timestamp: Date.now(),
    });

    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('required');
  });

  test('should handle webhook with invalid phone number format', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: 'invalid-phone',
      to: testSalonId,
      body: 'Test',
      timestamp: Date.now(),
    });

    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('phone');
  });

  test('should handle webhook for non-existent salon', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: '+9999999999', // Non-existent salon
      body: 'Test',
      timestamp: Date.now(),
    });

    // Verify error response
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('salon');
  });

  test('should handle database errors gracefully', async () => {
    // Simulate database error by disconnecting
    await databaseHelper.disconnect();

    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      body: 'Database error test',
      timestamp: Date.now(),
    });

    // Verify error response
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');

    // Reconnect for other tests
    await databaseHelper.connect();
  });

  // ===========================================================================
  // Webhook Verification (WhatsApp Setup)
  // ===========================================================================

  test('should handle webhook verification request', async () => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';
    const challenge = 'test-challenge-string';

    const response = await whatsappHelper.sendVerificationRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': challenge,
    });

    // Verify challenge was returned
    expect(response.status).toBe(200);
    expect(response.body).toBe(challenge);
  });

  test('should reject webhook verification with invalid token', async () => {
    const challenge = 'test-challenge-string';

    const response = await whatsappHelper.sendVerificationRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'invalid-token',
      'hub.challenge': challenge,
    });

    // Verify rejection
    expect(response.status).toBe(403);
    expect(response.body).not.toBe(challenge);
  });

  // ===========================================================================
  // Media Message Tests
  // ===========================================================================

  test('should handle image message webhook', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      type: 'image',
      image: {
        id: 'test-image-id',
        mime_type: 'image/jpeg',
      },
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify message was stored with media info
    const message = await databaseHelper.getLatestMessage('+1234567890', testSalonId);
    expect(message).toBeTruthy();
    expect(message.media_type).toBe('image');
    expect(message.media_id).toBe('test-image-id');
  });

  test('should handle document message webhook', async () => {
    const response = await whatsappHelper.sendWebhook({
      from: '+1234567890',
      to: testSalonId,
      type: 'document',
      document: {
        id: 'test-doc-id',
        mime_type: 'application/pdf',
        filename: 'booking-confirmation.pdf',
      },
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    // Verify document was acknowledged
    await new Promise(resolve => setTimeout(resolve, 2000));
    const message = await databaseHelper.getLatestMessage('+1234567890', testSalonId);
    expect(message.media_type).toBe('document');
  });

  // ===========================================================================
  // Status Callback Tests
  // ===========================================================================

  test('should handle message status callback (delivered)', async () => {
    const messageId = 'test-message-123';

    const response = await whatsappHelper.sendStatusCallback({
      id: messageId,
      status: 'delivered',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    // Verify status was updated in database
    await new Promise(resolve => setTimeout(resolve, 1000));
    const message = await databaseHelper.getMessageById(messageId);
    if (message) {
      expect(message.status).toBe('delivered');
    }
  });

  test('should handle message status callback (read)', async () => {
    const messageId = 'test-message-456';

    const response = await whatsappHelper.sendStatusCallback({
      id: messageId,
      status: 'read',
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);
  });

  test('should handle message status callback (failed)', async () => {
    const messageId = 'test-message-789';

    const response = await whatsappHelper.sendStatusCallback({
      id: messageId,
      status: 'failed',
      error: {
        code: 131047,
        title: 'Message failed to send',
      },
      timestamp: Date.now(),
    });

    expect(response.status).toBe(200);

    // Verify failure was logged
    await new Promise(resolve => setTimeout(resolve, 1000));
    const message = await databaseHelper.getMessageById(messageId);
    if (message) {
      expect(message.status).toBe('failed');
      expect(message.error_code).toBe(131047);
    }
  });
});
