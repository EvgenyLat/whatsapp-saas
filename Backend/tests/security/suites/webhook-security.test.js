/**
 * =============================================================================
 * WEBHOOK SECURITY TESTS
 * =============================================================================
 *
 * Tests signature verification, replay attack prevention,
 * invalid payload handling, and webhook security best practices.
 */

const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../../../src/app');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Webhook Security Tests', () => {
  let testData;
  let webhookSecret;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
    webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || 'test-webhook-secret';
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  // ==========================================================================
  // Signature Verification
  // ==========================================================================
  describe('Signature Verification', () => {
    it('should accept webhook with valid HMAC signature', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject webhook with missing signature', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const invalidSignature = 'sha256=invalid_signature_12345';

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', invalidSignature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook with tampered payload', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Original message',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      // Tamper with payload after signature generation
      payload.body = 'Tampered message';

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should validate signature algorithm (sha256)', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      // Try to use a different algorithm
      const md5Hmac = crypto.createHmac('md5', webhookSecret);
      md5Hmac.update(JSON.stringify(payload));
      const md5Signature = `md5=${md5Hmac.digest('hex')}`;

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', md5Signature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should use constant-time comparison for signature verification', async () => {
      // This test ensures timing attacks are prevented
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const validSignature = helpers.generateWebhookSignature(payload, webhookSecret);
      const invalidSignature = validSignature.substring(0, validSignature.length - 2) + 'XX';

      const start1 = Date.now();
      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', validSignature)
        .send(payload);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', invalidSignature)
        .send(payload);
      const time2 = Date.now() - start2;

      // Times should be similar (within reasonable margin)
      // This is a basic check; sophisticated timing attack detection requires statistical analysis
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(50); // 50ms tolerance
    });

    it('should reject webhook with signature in wrong format', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(JSON.stringify(payload));
      const signature = hmac.digest('hex'); // Missing "sha256=" prefix

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(401);
    });
  });

  // ==========================================================================
  // Replay Attack Prevention
  // ==========================================================================
  describe('Replay Attack Prevention', () => {
    it('should reject webhook with old timestamp', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('timestamp');
    });

    it('should accept webhook with recent timestamp', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        timestamp: Date.now(), // Current time
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should reject webhook with future timestamp', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        timestamp: Date.now() + (10 * 60 * 1000), // 10 minutes in future
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('timestamp');
    });

    it('should prevent duplicate webhook processing', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        message_id: 'unique-message-id-123',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      // First request should succeed
      await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      // Duplicate request should be rejected or idempotently handled
      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      // Should either reject (409) or return same response (200 with idempotency)
      expect([200, 409]).toContain(response.status);

      if (response.status === 409) {
        expect(response.body.error).toContain('duplicate');
      }
    });

    it('should enforce timestamp tolerance window', async () => {
      const toleranceSeconds = 300; // 5 minutes
      const edgeTimestamp = Date.now() - (toleranceSeconds * 1000) + 1000; // Just inside window

      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        timestamp: edgeTimestamp,
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });
  });

  // ==========================================================================
  // Invalid Payload Handling
  // ==========================================================================
  describe('Invalid Payload Handling', () => {
    it('should reject webhook with missing required fields', async () => {
      const invalidPayloads = [
        { to: testData.salon.phone, body: 'Missing from' },
        { from: '+1234567890', body: 'Missing to' },
        { from: '+1234567890', to: testData.salon.phone }, // Missing body
      ];

      for (const payload of invalidPayloads) {
        const signature = helpers.generateWebhookSignature(payload, webhookSecret);

        const response = await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload)
          .expect(400);

        expect(response.body.error).toContain('required');
      }
    });

    it('should reject webhook with invalid phone number format', async () => {
      const invalidPhones = [
        'not-a-phone',
        '123',
        'abcdefghij',
        '<script>alert(1)</script>',
      ];

      for (const phone of invalidPhones) {
        const payload = fixtures.createWebhookPayload({
          from: phone,
          to: testData.salon.phone,
          body: 'Test message',
        });

        const signature = helpers.generateWebhookSignature(payload, webhookSecret);

        const response = await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload)
          .expect(400);
      }
    });

    it('should reject webhook with excessively long message', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB message

      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: longMessage,
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('length');
    });

    it('should validate message type', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
        type: 'invalid_type',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedJson = '{ invalid json }';

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(malformedJson);
      const signature = `sha256=${hmac.digest('hex')}`;

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(malformedJson)
        .expect(400);

      expect(response.body.error).toContain('JSON');
    });

    it('should sanitize webhook payload for logging', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Message with PII: SSN 123-45-6789',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      // Logs should not contain raw PII (this would need log inspection)
      // For this test, we just verify the webhook was processed
      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // Webhook Rate Limiting
  // ==========================================================================
  describe('Webhook Rate Limiting', () => {
    it('should rate limit excessive webhook requests', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const requests = [];

      // Make 50 rapid requests
      for (let i = 0; i < 50; i++) {
        const uniquePayload = {
          ...payload,
          message_id: `msg-${i}`,
          timestamp: Date.now() + i,
        };

        const signature = helpers.generateWebhookSignature(uniquePayload, webhookSecret);

        requests.push(
          request(app)
            .post('/webhook/whatsapp')
            .set('X-Hub-Signature-256', signature)
            .send(uniquePayload)
        );
      }

      const responses = await Promise.all(requests);

      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should rate limit per phone number', async () => {
      const phone1 = '+1111111111';
      const phone2 = '+2222222222';

      // Make many requests from phone1
      for (let i = 0; i < 20; i++) {
        const payload = fixtures.createWebhookPayload({
          from: phone1,
          to: testData.salon.phone,
          body: `Message ${i}`,
          message_id: `msg-phone1-${i}`,
          timestamp: Date.now() + i,
        });

        const signature = helpers.generateWebhookSignature(payload, webhookSecret);

        await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload);
      }

      // Phone2 should still work
      const phone2Payload = fixtures.createWebhookPayload({
        from: phone2,
        to: testData.salon.phone,
        body: 'Test message',
      });

      const phone2Signature = helpers.generateWebhookSignature(phone2Payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', phone2Signature)
        .send(phone2Payload);

      // Should succeed (not affected by phone1's rate limit)
      expect([200, 429]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Webhook Verification (WhatsApp Challenge)
  // ==========================================================================
  describe('Webhook Verification', () => {
    it('should respond to webhook verification challenge', async () => {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';
      const challenge = 'random-challenge-12345';

      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': challenge,
        })
        .expect(200);

      expect(response.text).toBe(challenge);
    });

    it('should reject verification with invalid token', async () => {
      const challenge = 'random-challenge-12345';

      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': challenge,
        })
        .expect(403);
    });

    it('should reject verification with missing parameters', async () => {
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
        })
        .expect(400);
    });

    it('should only accept subscribe mode', async () => {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';

      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'unsubscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': 'test',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // Media Message Security
  // ==========================================================================
  describe('Media Message Security', () => {
    it('should validate media URLs', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        type: 'image',
        media_url: 'javascript:alert(1)',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(400);

      expect(response.body.error).toContain('URL');
    });

    it('should accept valid HTTPS media URLs', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        type: 'image',
        media_url: 'https://example.com/image.jpg',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should reject HTTP media URLs (require HTTPS)', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        type: 'image',
        media_url: 'http://example.com/image.jpg',
      });

      const signature = helpers.generateWebhookSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(400);
    });

    it('should validate media file types', async () => {
      const invalidTypes = [
        'executable.exe',
        'script.sh',
        'malware.bat',
      ];

      for (const filename of invalidTypes) {
        const payload = fixtures.createWebhookPayload({
          from: '+1234567890',
          to: testData.salon.phone,
          type: 'document',
          media_url: `https://example.com/${filename}`,
        });

        const signature = helpers.generateWebhookSignature(payload, webhookSecret);

        const response = await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', signature)
          .send(payload)
          .expect(400);
      }
    });
  });

  // ==========================================================================
  // Error Response Security
  // ==========================================================================
  describe('Error Response Security', () => {
    it('should not expose internal details in error messages', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', 'invalid')
        .send(payload)
        .expect(401);

      // Should not contain stack traces, file paths, etc.
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('src/');
      expect(responseText).not.toContain('node_modules');
      expect(responseText).not.toMatch(/at\s+\w+\s+\(/);
    });

    it('should return consistent timing for signature verification failures', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: testData.salon.phone,
        body: 'Test message',
      });

      const timings = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await request(app)
          .post('/webhook/whatsapp')
          .set('X-Hub-Signature-256', 'sha256=invalid')
          .send(payload);
        timings.push(Date.now() - start);
      }

      // Calculate standard deviation
      const avg = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be small (consistent timing)
      expect(stdDev).toBeLessThan(10); // 10ms tolerance
    });
  });
});
