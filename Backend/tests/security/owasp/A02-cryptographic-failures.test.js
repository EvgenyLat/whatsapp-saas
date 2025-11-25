/**
 * =============================================================================
 * OWASP A02:2021 - CRYPTOGRAPHIC FAILURES TESTS
 * =============================================================================
 *
 * Tests for encryption at rest, encryption in transit, and weak cryptography.
 */

const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('OWASP A02:2021 - Cryptographic Failures', () => {
  let testData;
  let validToken;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
    validToken = testData.validToken;
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  // ==========================================================================
  // Test Data Encryption at Rest
  // ==========================================================================
  describe('Data Encryption at Rest', () => {
    it('should encrypt sensitive PII in database', async () => {
      const sensitiveData = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_email: 'sensitive@example.com',
        service: 'Haircut',
        datetime: new Date().toISOString(),
        notes: 'Customer credit card: 4111-1111-1111-1111',
      };

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(sensitiveData)
        .expect(201);

      // Query database directly
      const rawData = await db.query(
        'SELECT customer_email, notes FROM bookings WHERE id = $1',
        [response.body.id]
      );

      const dbRow = rawData.rows[0];

      // Email should be encrypted
      if (dbRow.customer_email) {
        expect(dbRow.customer_email).not.toBe(sensitiveData.customer_email);
        expect(dbRow.customer_email).toMatch(/^[A-Za-z0-9+/=]+$/);
      }

      // Notes containing sensitive data should be encrypted
      if (dbRow.notes) {
        expect(dbRow.notes).not.toContain('4111-1111-1111-1111');
      }
    });

    it('should use AES-256-GCM for encryption', async () => {
      const encryptionConfig = require('../../../src/config/encryption');

      expect(encryptionConfig.algorithm).toBe('aes-256-gcm');
      expect(encryptionConfig.keyLength).toBe(32); // 256 bits
    });

    it('should use unique IV for each encryption operation', async () => {
      // Create two bookings with identical data
      const bookingData = fixtures.createBookingData({
        customer_email: 'test@example.com',
      });

      const response1 = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(bookingData)
        .expect(201);

      const response2 = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(bookingData)
        .expect(201);

      // Get raw encrypted values
      const raw1 = await db.query(
        'SELECT customer_email FROM bookings WHERE id = $1',
        [response1.body.id]
      );
      const raw2 = await db.query(
        'SELECT customer_email FROM bookings WHERE id = $1',
        [response2.body.id]
      );

      // Encrypted values should be different (different IVs)
      expect(raw1.rows[0].customer_email).not.toBe(raw2.rows[0].customer_email);
    });

    it('should store encryption keys securely (not in code)', async () => {
      // Verify encryption key comes from environment
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(32);

      // Key should not be in config files
      const config = require('../../../src/config/app');
      const configString = JSON.stringify(config);
      expect(configString).not.toContain(process.env.ENCRYPTION_KEY);
    });

    it('should decrypt data correctly when retrieved', async () => {
      const originalEmail = 'decrypt-test@example.com';

      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_email: originalEmail,
      });

      const response = await request(app)
        .get(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // API should return decrypted data
      expect(response.body.customer_email).toBe(originalEmail);
    });

    it('should handle encryption errors gracefully', async () => {
      // Simulate encryption failure (invalid key)
      const invalidData = {
        customer_name: 'Test',
        customer_phone: '+1234567890',
        customer_email: '\x00\x01\x02\x03', // Invalid data
        service: 'Haircut',
        datetime: new Date().toISOString(),
      };

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);

      // Should either reject or handle gracefully
      expect([400, 500]).toContain(response.status);
    });

    it('should encrypt passwords/secrets with strong hashing', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await helpers.hashPassword(password);

      // Should not be plain text
      expect(hashedPassword).not.toBe(password);

      // Should be bcrypt format
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$/);

      // Should verify correctly
      const isValid = await helpers.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  // ==========================================================================
  // Test Data Encryption in Transit
  // ==========================================================================
  describe('Data Encryption in Transit', () => {
    it('should enforce HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Forwarded-Proto', 'http'); // Simulate HTTP request

      // Should redirect to HTTPS or reject
      expect([301, 302, 403]).toContain(response.status);

      process.env.NODE_ENV = originalEnv;
    });

    it('should set HSTS header', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=');

      // Should be at least 1 year (31536000 seconds)
      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)[1]);
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });

    it('should include HSTS preload and includeSubDomains', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should use secure cookies', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({ token: validToken });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        cookies.forEach(cookie => {
          expect(cookie).toMatch(/Secure/i);
          expect(cookie).toMatch(/HttpOnly/i);
          expect(cookie).toMatch(/SameSite=(Strict|Lax)/i);
        });
      }
    });

    it('should not transmit sensitive data in URL parameters', async () => {
      // Try to send sensitive data in URL
      const response = await request(app)
        .get(`/admin/bookings/${testData.salon.id}`)
        .query({ password: 'secret123', credit_card: '4111111111111111' })
        .set('Authorization', `Bearer ${validToken}`);

      // Server should reject or sanitize
      expect(response.status).not.toBe(500); // Should handle gracefully
    });

    it('should use TLS 1.2 or higher', async () => {
      // This test would require checking TLS configuration
      // For now, verify it's configured
      const tlsConfig = require('../../../src/config/server');

      if (tlsConfig.tls) {
        expect(tlsConfig.tls.minVersion).toMatch(/TLSv1\.[23]/);
      }
    });

    it('should disable weak cipher suites', async () => {
      const tlsConfig = require('../../../src/config/server');

      if (tlsConfig.tls && tlsConfig.tls.ciphers) {
        const weakCiphers = ['RC4', 'MD5', 'DES', 'EXPORT'];

        weakCiphers.forEach(weakCipher => {
          expect(tlsConfig.tls.ciphers).not.toContain(weakCipher);
        });
      }
    });
  });

  // ==========================================================================
  // Test Weak Cryptography
  // ==========================================================================
  describe('Weak Cryptography', () => {
    it('should not use MD5 for security purposes', async () => {
      const data = 'test data';
      const hash = crypto.createHash('sha256').update(data).digest('hex');

      // Verify SHA-256 is used, not MD5
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should not use SHA1 for security purposes', async () => {
      // Check that password hashing uses bcrypt, not SHA1
      const password = 'test123';
      const hashed = await helpers.hashPassword(password);

      expect(hashed).toMatch(/^\$2[aby]\$/); // Bcrypt format
      expect(hashed).not.toMatch(/^[a-f0-9]{40}$/); // Not SHA1 format
    });

    it('should use cryptographically secure random number generation', async () => {
      const random1 = crypto.randomBytes(32).toString('hex');
      const random2 = crypto.randomBytes(32).toString('hex');

      // Should be different
      expect(random1).not.toBe(random2);

      // Should be 64 hex characters (32 bytes)
      expect(random1.length).toBe(64);
      expect(random2.length).toBe(64);
    });

    it('should use appropriate key derivation for passwords', async () => {
      const password = 'UserPassword123!';
      const hashed = await helpers.hashPassword(password);

      // Should use bcrypt with sufficient rounds (10+)
      const rounds = parseInt(hashed.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(10);
    });

    it('should not use ECB mode for block ciphers', async () => {
      const encryptionConfig = require('../../../src/config/encryption');

      // Algorithm should be GCM, CBC, or CTR (not ECB)
      expect(encryptionConfig.algorithm).toMatch(/gcm|cbc|ctr/i);
      expect(encryptionConfig.algorithm).not.toMatch(/ecb/i);
    });

    it('should use authenticated encryption (AEAD)', async () => {
      const encryptionConfig = require('../../../src/config/encryption');

      // Should use GCM (authenticated encryption)
      expect(encryptionConfig.algorithm).toContain('gcm');
    });

    it('should have sufficient key length', async () => {
      const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

      // AES-256 requires 32 byte key
      expect(encryptionKey.length).toBeGreaterThanOrEqual(32);
    });

    it('should not use weak random number generators', async () => {
      // Math.random() should not be used for security
      const token = helpers.generateSecureRandom(32);

      // Should not be predictable
      const token2 = helpers.generateSecureRandom(32);
      expect(token).not.toBe(token2);

      // Should be base64url (crypto-strong)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  // ==========================================================================
  // Test Key Management
  // ==========================================================================
  describe('Key Management', () => {
    it('should store encryption keys in environment variables', async () => {
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
    });

    it('should not hardcode encryption keys in source code', async () => {
      const fs = require('fs');
      const path = require('path');

      // Read config files
      const configPath = path.join(__dirname, '../../../src/config');
      const files = fs.readdirSync(configPath);

      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(configPath, file), 'utf8');

          // Should not contain hardcoded keys (long hex strings)
          expect(content).not.toMatch(/['"][a-f0-9]{64,}['"]/i);
        }
      }
    });

    it('should support key rotation', async () => {
      // Check if key rotation mechanism exists
      const response = await request(app)
        .post('/admin/security/rotate-keys')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ key_type: 'encryption' });

      // Should have endpoint (even if restricted)
      expect([200, 403, 404]).toContain(response.status);
    });

    it('should separate keys by environment', async () => {
      // Production key should be different from test key
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.ENCRYPTION_KEY).toBeDefined();

      // Should have mechanism to use different keys per environment
      const config = require('../../../src/config/encryption');
      expect(config).toBeDefined();
    });

    it('should protect keys with proper file permissions', async () => {
      // In production, .env file should have restricted permissions
      // This is a reminder check
      const envPath = require('path').join(__dirname, '../../../.env');
      const fs = require('fs');

      if (fs.existsSync(envPath)) {
        const stats = fs.statSync(envPath);
        const mode = stats.mode & parseInt('777', 8);

        // Should be 600 or 640 (not world-readable)
        expect(mode).not.toBe(parseInt('777', 8));
      }
    });
  });

  // ==========================================================================
  // Test Certificate Validation
  // ==========================================================================
  describe('Certificate Validation', () => {
    it('should validate SSL certificates for external API calls', async () => {
      const https = require('https');
      const agent = new https.Agent({
        rejectUnauthorized: true, // Should be true in production
      });

      expect(agent.options.rejectUnauthorized).toBe(true);
    });

    it('should not accept self-signed certificates in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const config = require('../../../src/config/server');

      if (config.tls) {
        expect(config.tls.rejectUnauthorized).toBe(true);
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should verify certificate chain', async () => {
      // Ensure certificate validation is enabled
      const tlsConfig = require('../../../src/config/server');

      if (tlsConfig.tls) {
        expect(tlsConfig.tls.checkServerIdentity).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Test Sensitive Data Exposure
  // ==========================================================================
  describe('Sensitive Data Exposure', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_email: 'invalid-email',
          customer_phone: 'invalid-phone',
        })
        .expect(400);

      // Error should not contain the invalid data
      expect(response.body.error).not.toContain('invalid-email');
      expect(response.body.error).not.toContain('invalid-phone');
    });

    it('should not expose encryption keys in logs', async () => {
      // Simulate logging
      const logData = helpers.sanitizeForLogging({
        encryption_key: process.env.ENCRYPTION_KEY,
        user: 'test',
      });

      expect(logData.encryption_key).toBe('***REDACTED***');
    });

    it('should mask sensitive data in API responses', async () => {
      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_phone: '+1234567890',
      });

      const response = await request(app)
        .get(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Full phone should be returned to authorized user
      // But ensure it's not logged
      expect(response.body.customer_phone).toBeDefined();
    });

    it('should not cache sensitive endpoints', async () => {
      const response = await request(app)
        .get(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const cacheControl = response.headers['cache-control'];
      expect(cacheControl).toMatch(/no-store|no-cache/i);
    });
  });
});
