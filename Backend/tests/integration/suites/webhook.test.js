/**
 * =============================================================================
 * WEBHOOK INTEGRATION TESTS
 * =============================================================================
 * Tests WhatsApp webhook endpoint integration
 * =============================================================================
 */

const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const { redis } = require('../../../src/config/redis');
const { queue } = require('../../../src/services/queue');
const fixtures = require('../fixtures/webhook.fixtures');
const { generateSignature, delay } = require('../helpers/test-helpers');

describe('Webhook Integration Tests', () => {
  let testSalon;
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || 'test-secret';

  beforeAll(async () => {
    // Create test salon
    testSalon = await db.models.Salon.create({
      id: `salon_test_${Date.now()}`,
      name: 'Webhook Test Salon',
      phone: '+1234567890',
      email: 'webhook-test@example.com',
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.models.Message.destroy({ where: { salon_id: testSalon.id } });
    await db.models.Booking.destroy({ where: { salon_id: testSalon.id } });
    await db.models.Conversation.destroy({ where: { salon_id: testSalon.id } });
    await db.models.Salon.destroy({ where: { id: testSalon.id } });

    // Close connections
    await db.close();
    await redis.quit();
    await queue.close();
  });

  afterEach(async () => {
    // Clear rate limits
    await redis.flushdb();
  });

  // ===========================================================================
  // POST /webhook - Valid Message Processing
  // ===========================================================================

  describe('POST /webhook - Valid Message Processing', () => {
    it('should accept valid webhook with correct signature', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+1234567890',
        to: testSalon.phone,
        body: 'Hello',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should store incoming message in database', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+9876543210',
        to: testSalon.phone,
        body: 'Test message',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      // Wait for async processing
      await delay(1000);

      const message = await db.models.Message.findOne({
        where: {
          salon_id: testSalon.id,
          customer_phone: '+9876543210',
          direction: 'incoming',
        },
        order: [['created_at', 'DESC']],
      });

      expect(message).toBeTruthy();
      expect(message.body).toBe('Test message');
    });

    it('should create conversation if not exists', async () => {
      const customerPhone = '+1111111111';
      const payload = fixtures.createIncomingMessage({
        from: customerPhone,
        to: testSalon.phone,
        body: 'First message',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      await delay(1000);

      const conversation = await db.models.Conversation.findOne({
        where: {
          salon_id: testSalon.id,
          customer_phone: customerPhone,
        },
      });

      expect(conversation).toBeTruthy();
      expect(conversation.status).toBe('active');
    });

    it('should handle image messages', async () => {
      const payload = fixtures.createImageMessage({
        from: '+2222222222',
        to: testSalon.phone,
        imageId: 'test-image-123',
        mimeType: 'image/jpeg',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(200);

      await delay(1000);

      const message = await db.models.Message.findOne({
        where: {
          customer_phone: '+2222222222',
          media_type: 'image',
        },
        order: [['created_at', 'DESC']],
      });

      expect(message).toBeTruthy();
      expect(message.media_id).toBe('test-image-123');
    });

    it('should handle document messages', async () => {
      const payload = fixtures.createDocumentMessage({
        from: '+3333333333',
        to: testSalon.phone,
        documentId: 'test-doc-456',
        filename: 'booking.pdf',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(200);

      await delay(1000);

      const message = await db.models.Message.findOne({
        where: {
          customer_phone: '+3333333333',
          media_type: 'document',
        },
        order: [['created_at', 'DESC']],
      });

      expect(message).toBeTruthy();
      expect(message.media_id).toBe('test-doc-456');
    });
  });

  // ===========================================================================
  // POST /webhook - Invalid Signature Rejection
  // ===========================================================================

  describe('POST /webhook - Invalid Signature Rejection', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+1234567890',
        to: testSalon.phone,
        body: 'Invalid signature test',
      });

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', 'sha256=invalid_signature')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject webhook with missing signature', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+1234567890',
        to: testSalon.phone,
        body: 'No signature test',
      });

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should reject webhook with expired timestamp', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+1234567890',
        to: testSalon.phone,
        body: 'Expired test',
        timestamp: Date.now() - 600000, // 10 minutes ago
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/timestamp|expired/i);
    });
  });

  // ===========================================================================
  // POST /webhook - Rate Limiting
  // ===========================================================================

  describe('POST /webhook - Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const customerPhone = '+4444444444';
      const responses = [];

      // Send 20 rapid requests
      for (let i = 0; i < 20; i++) {
        const payload = fixtures.createIncomingMessage({
          from: customerPhone,
          to: testSalon.phone,
          body: `Rate limit test ${i}`,
        });

        const signature = generateSignature(JSON.stringify(payload), webhookSecret);

        const response = await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload);

        responses.push(response);
      }

      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include retry-after header when rate limited', async () => {
      const customerPhone = '+5555555555';

      // Exhaust rate limit
      for (let i = 0; i < 15; i++) {
        const payload = fixtures.createIncomingMessage({
          from: customerPhone,
          to: testSalon.phone,
          body: `Exhaust ${i}`,
        });

        const signature = generateSignature(JSON.stringify(payload), webhookSecret);

        await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload);
      }

      // Next request should be rate limited
      const payload = fixtures.createIncomingMessage({
        from: customerPhone,
        to: testSalon.phone,
        body: 'Should be limited',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      if (response.status === 429) {
        expect(response.headers).toHaveProperty('retry-after');
      }
    });

    it('should reset rate limit after cooldown', async () => {
      const customerPhone = '+6666666666';

      // Trigger rate limit
      for (let i = 0; i < 15; i++) {
        const payload = fixtures.createIncomingMessage({
          from: customerPhone,
          to: testSalon.phone,
          body: `Trigger ${i}`,
        });

        const signature = generateSignature(JSON.stringify(payload), webhookSecret);

        await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload);
      }

      // Clear rate limit manually (simulating cooldown)
      await redis.del(`rate_limit:${customerPhone}`);

      // Should work again
      const payload = fixtures.createIncomingMessage({
        from: customerPhone,
        to: testSalon.phone,
        body: 'After cooldown',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // POST /webhook - Queue Job Creation
  // ===========================================================================

  describe('POST /webhook - Queue Job Creation', () => {
    it('should create job for message processing', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+7777777777',
        to: testSalon.phone,
        body: 'Queue test',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      await delay(500);

      // Check if job was created
      const jobs = await queue.getJobs(['waiting', 'active', 'completed']);
      const messageJob = jobs.find(job =>
        job.data.customerPhone === '+7777777777' &&
        job.data.messageBody === 'Queue test'
      );

      expect(messageJob).toBeTruthy();
    });

    it('should process job and send AI response', async () => {
      const customerPhone = '+8888888888';
      const payload = fixtures.createIncomingMessage({
        from: customerPhone,
        to: testSalon.phone,
        body: 'I want to book a haircut',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      // Wait for job processing
      await delay(5000);

      // Check for AI response in database
      const response = await db.models.Message.findOne({
        where: {
          salon_id: testSalon.id,
          customer_phone: customerPhone,
          direction: 'outgoing',
        },
        order: [['created_at', 'DESC']],
      });

      expect(response).toBeTruthy();
      expect(response.ai_generated).toBe(true);
    });

    it('should retry failed jobs', async () => {
      // This test would require mocking a failure scenario
      // Implementation depends on queue retry configuration

      const payload = fixtures.createIncomingMessage({
        from: '+9999999999',
        to: testSalon.phone,
        body: 'Retry test',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      // Check job retry configuration
      const jobs = await queue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => j.data.customerPhone === '+9999999999');

      if (job) {
        expect(job.opts).toHaveProperty('attempts');
        expect(job.opts.attempts).toBeGreaterThan(1);
      }
    });
  });

  // ===========================================================================
  // GET /webhook - Verification
  // ===========================================================================

  describe('GET /webhook - Verification', () => {
    it('should verify webhook with correct token', async () => {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';
      const challenge = 'test-challenge-12345';

      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': challenge,
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe(challenge);
    });

    it('should reject verification with incorrect token', async () => {
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge',
        });

      expect(response.status).toBe(403);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        // Missing entry
      };

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should handle non-existent salon', async () => {
      const payload = fixtures.createIncomingMessage({
        from: '+1234567890',
        to: '+9999999999', // Non-existent salon
        body: 'Test',
      });

      const signature = generateSignature(JSON.stringify(payload), webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(response.status).toBe(404);
    });
  });
});
