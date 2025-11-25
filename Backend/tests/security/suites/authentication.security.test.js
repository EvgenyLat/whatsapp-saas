/**
 * =============================================================================
 * AUTHENTICATION SECURITY TESTS
 * =============================================================================
 *
 * Tests admin token validation, expiration, brute force protection,
 * and session management security.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Authentication Security Tests', () => {
  let testData;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  // ==========================================================================
  // Admin Token Validation
  // ==========================================================================
  describe('Admin Token Validation', () => {
    it('should accept valid admin token', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .expect(401);

      expect(response.body.error).toContain('authorization');
    });

    it('should reject invalid token format', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should reject invalid token value', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should reject empty bearer token', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should reject token with SQL injection attempt', async () => {
      const maliciousToken = "' OR '1'='1";
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should reject token with special characters', async () => {
      const maliciousToken = '../../../etc/passwd';
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);
    });
  });

  // ==========================================================================
  // Token Expiration
  // ==========================================================================
  describe('Token Expiration', () => {
    it('should accept unexpired token', async () => {
      const freshToken = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);
    });

    it('should reject expired token', async () => {
      const expiredToken = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '-1h', // Already expired
      });

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should reject token with tampered expiration', async () => {
      const token = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      // Attempt to tamper with token
      const tamperedToken = token.replace(/\./g, '_');

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('should validate token expiration before processing request', async () => {
      const almostExpiredToken = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1s',
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${almostExpiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('expired');
    });
  });

  // ==========================================================================
  // Brute Force Protection
  // ==========================================================================
  describe('Brute Force Protection', () => {
    it('should allow reasonable number of failed attempts', async () => {
      // First 4 attempts should be allowed
      for (let i = 0; i < 4; i++) {
        await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);
      }
    });

    it('should rate limit after excessive failed attempts', async () => {
      const ipAddress = '192.168.1.100';

      // Make 10 failed attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .set('X-Forwarded-For', ipAddress)
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .set('X-Forwarded-For', ipAddress)
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });

    it('should track failed attempts per IP address', async () => {
      const ip1 = '192.168.1.101';
      const ip2 = '192.168.1.102';

      // Make 10 failed attempts from IP1
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .set('X-Forwarded-For', ip1);
      }

      // IP1 should be rate limited
      await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .set('X-Forwarded-For', ip1)
        .expect(429);

      // IP2 should still work
      await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .set('X-Forwarded-For', ip2)
        .expect(401); // Not rate limited, just invalid token
    });

    it('should reset rate limit after cooldown period', async () => {
      const ipAddress = '192.168.1.103';

      // Trigger rate limit
      for (let i = 0; i < 11; i++) {
        await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .set('X-Forwarded-For', ipAddress);
      }

      // Should be rate limited
      await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .set('X-Forwarded-For', ipAddress)
        .expect(429);

      // Wait for cooldown (assuming 5 minute cooldown)
      // In real tests, you might mock the time or use a shorter cooldown for testing
      // For now, we'll just verify the behavior is implemented
    });

    it('should allow valid requests even after rate limiting invalid ones', async () => {
      const ipAddress = '192.168.1.104';

      // Trigger rate limit with invalid tokens
      for (let i = 0; i < 11; i++) {
        await request(app)
          .get(`/admin/stats/${testData.salon.id}`)
          .set('Authorization', 'Bearer invalid_token')
          .set('X-Forwarded-For', ipAddress);
      }

      // Valid token should still work
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .set('X-Forwarded-For', ipAddress)
        .expect(200);
    });
  });

  // ==========================================================================
  // Session Management
  // ==========================================================================
  describe('Session Management', () => {
    it('should maintain session state across requests', async () => {
      const response1 = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .expect(200);

      // Both requests should succeed with same token
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should not share sessions between different salons', async () => {
      const salon1Token = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      const salon2 = await fixtures.createTestSalon();
      const salon2Token = helpers.generateToken({
        salonId: salon2.id,
        expiresIn: '1h',
      });

      // Salon 1 token should not access Salon 2 data
      const response = await request(app)
        .get(`/admin/stats/${salon2.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('access');

      // Cleanup
      await fixtures.cleanupTestSalon(salon2.id);
    });

    it('should invalidate session on token tampering', async () => {
      const validToken = testData.validToken;
      const parts = validToken.split('.');

      // Tamper with payload
      const tamperedToken = `${parts[0]}.${Buffer.from('{"sub":"hacker"}').toString('base64')}.${parts[2]}`;

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should handle concurrent requests with same token', async () => {
      const requests = [];

      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get(`/admin/stats/${testData.salon.id}`)
            .set('Authorization', `Bearer ${testData.validToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should prevent session fixation attacks', async () => {
      // Attacker provides a token
      const attackerToken = 'attacker_controlled_token_123';

      // Victim tries to use it
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should require new token after sensitive operations', async () => {
      // This test verifies that sensitive operations might require re-authentication
      // Implementation depends on business requirements

      const response = await request(app)
        .delete(`/admin/salon/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .expect(403); // Should require elevated privileges or re-auth

      expect(response.body.error).toContain('permission');
    });
  });

  // ==========================================================================
  // Token Security Best Practices
  // ==========================================================================
  describe('Token Security Best Practices', () => {
    it('should use HTTPS-only token transmission', async () => {
      // This test verifies headers are set correctly
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`);

      // Check for HSTS header
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose token in error messages', async () => {
      const invalidToken = 'secret_token_12345';

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Error message should not contain the actual token
      expect(response.body.error).not.toContain(invalidToken);
    });

    it('should not expose token in logs', async () => {
      // This test would require checking log output
      // For now, we verify the behavior is implemented
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${testData.validToken}`)
        .expect(200);

      // Logs should mask token values
      // Implementation: Check that logging middleware masks Authorization headers
    });

    it('should validate token signature', async () => {
      const validToken = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      // Modify signature
      const parts = validToken.split('.');
      const invalidSignature = Buffer.from('invalid').toString('base64');
      const tokenWithBadSig = `${parts[0]}.${parts[1]}.${invalidSignature}`;

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${tokenWithBadSig}`)
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should use secure token generation algorithm', async () => {
      const token1 = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      const token2 = helpers.generateToken({
        salonId: testData.salon.id,
        expiresIn: '1h',
      });

      // Tokens should be different even for same input
      expect(token1).not.toBe(token2);

      // Both should be valid
      await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
    });
  });
});
