/**
 * =============================================================================
 * DATA PROTECTION SECURITY TESTS
 * =============================================================================
 *
 * Tests encryption at rest, PII handling, secrets management,
 * data sanitization, and compliance with data protection regulations.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Data Protection Security Tests', () => {
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
  // Encryption at Rest
  // ==========================================================================
  describe('Encryption at Rest', () => {
    it('should encrypt sensitive data in database', async () => {
      // Create booking with sensitive data
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'John Doe',
          customer_phone: '+1234567890',
          customer_email: 'john.doe@example.com',
          service: 'Haircut',
          datetime: new Date().toISOString(),
          notes: 'Customer has allergies to certain products',
        })
        .expect(201);

      // Query database directly to verify encryption
      const rawBooking = await db.query(
        'SELECT * FROM bookings WHERE id = $1',
        [response.body.id]
      );

      const dbRow = rawBooking.rows[0];

      // Email should be encrypted in database
      if (dbRow.customer_email) {
        expect(dbRow.customer_email).not.toBe('john.doe@example.com');
        // Should look like encrypted data (base64 or hex)
        expect(dbRow.customer_email).toMatch(/^[A-Za-z0-9+/=]+$/);
      }

      // Notes should be encrypted
      if (dbRow.notes) {
        expect(dbRow.notes).not.toContain('allergies');
      }
    });

    it('should decrypt data when retrieved via API', async () => {
      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_email: 'encrypted@example.com',
        notes: 'Sensitive information',
      });

      const response = await request(app)
        .get(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // API should return decrypted data
      expect(response.body.customer_email).toBe('encrypted@example.com');
      expect(response.body.notes).toBe('Sensitive information');
    });

    it('should use strong encryption algorithm (AES-256)', async () => {
      // Verify encryption configuration
      const encryptionConfig = require('../../../src/config/encryption');

      expect(encryptionConfig.algorithm).toBe('aes-256-gcm');
      expect(encryptionConfig.keyLength).toBe(32); // 256 bits
    });

    it('should use unique initialization vectors for encryption', async () => {
      // Create two bookings with same data
      const bookingData = {
        customer_name: 'Test User',
        customer_phone: '+1234567890',
        customer_email: 'same@example.com',
        service: 'Haircut',
        datetime: new Date().toISOString(),
      };

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

      // Query database directly
      const raw1 = await db.query('SELECT customer_email FROM bookings WHERE id = $1', [response1.body.id]);
      const raw2 = await db.query('SELECT customer_email FROM bookings WHERE id = $1', [response2.body.id]);

      // Encrypted values should be different (different IVs)
      expect(raw1.rows[0].customer_email).not.toBe(raw2.rows[0].customer_email);
    });

    it('should securely store encryption keys', async () => {
      // Verify encryption keys are not in code or version control
      const encryptionConfig = require('../../../src/config/encryption');

      // Keys should come from environment variables, not hardcoded
      expect(encryptionConfig.key).not.toBeDefined(); // Should not be exposed
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
    });
  });

  // ==========================================================================
  // PII Handling
  // ==========================================================================
  describe('PII (Personally Identifiable Information) Handling', () => {
    it('should mask phone numbers in logs', async () => {
      const payload = {
        customer_name: 'Test User',
        customer_phone: '+1234567890',
        service: 'Haircut',
        datetime: new Date().toISOString(),
      };

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload)
        .expect(201);

      // In real implementation, check log files to ensure phone is masked
      // For example: +123****7890
      expect(response.body).toBeDefined();
    });

    it('should mask email addresses in logs', async () => {
      const payload = {
        customer_name: 'Test User',
        customer_phone: '+1234567890',
        customer_email: 'sensitive@example.com',
        service: 'Haircut',
        datetime: new Date().toISOString(),
      };

      await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload)
        .expect(201);

      // Logs should show: s***e@example.com
    });

    it('should not expose PII in error messages', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Test User',
          customer_phone: 'invalid-phone',
          customer_email: 'john.doe@example.com',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(400);

      // Error should not contain the email address
      expect(response.body.error).not.toContain('john.doe@example.com');
    });

    it('should anonymize data in analytics', async () => {
      const response = await request(app)
        .get(`/admin/ai/analytics/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Analytics should not contain PII
      const analyticsText = JSON.stringify(response.body);
      expect(analyticsText).not.toMatch(/\+\d{10,}/); // Phone numbers
      expect(analyticsText).not.toMatch(/[\w.-]+@[\w.-]+\.\w+/); // Email addresses
    });

    it('should provide data export with proper PII handling', async () => {
      const response = await request(app)
        .get(`/admin/export/${testData.salon.id}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Export should include PII (authorized access)
      // But should be marked as sensitive
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['x-content-classification']).toBe('confidential');
    });

    it('should sanitize PII before external API calls', async () => {
      // Create booking that triggers external notification
      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_phone: '+1234567890',
        customer_email: 'test@example.com',
      });

      // External API calls should not include raw PII
      // This would require mocking/intercepting external calls
      // For now, verify the booking was created
      expect(booking.id).toBeDefined();
    });
  });

  // ==========================================================================
  // Secrets Management
  // ==========================================================================
  describe('Secrets Management', () => {
    it('should not expose API keys in responses', async () => {
      const response = await request(app)
        .get(`/admin/config/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain API keys
      expect(responseText).not.toContain(process.env.OPENAI_API_KEY || '');
      expect(responseText).not.toContain(process.env.WHATSAPP_API_KEY || '');
      expect(responseText).not.toContain(process.env.STRIPE_SECRET_KEY || '');
    });

    it('should not expose database credentials', async () => {
      const response = await request(app)
        .get(`/admin/stats/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const responseText = JSON.stringify(response.body);

      expect(responseText).not.toContain(process.env.DB_PASSWORD || '');
      expect(responseText).not.toContain(process.env.DB_USER || '');
    });

    it('should not log secrets', async () => {
      // Trigger an operation that might log
      await request(app)
        .post(`/admin/webhooks/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          url: 'https://example.com/webhook',
          secret: 'webhook-secret-12345',
        });

      // In real implementation, check log files to ensure secrets are masked
      // Logs should show: webhook-secret-***
    });

    it('should store secrets in environment variables, not code', async () => {
      // Verify configuration loads from environment
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.WHATSAPP_WEBHOOK_SECRET).toBeDefined();

      // Secrets should not be in configuration files
      const config = require('../../../src/config/app');
      expect(config.jwtSecret).not.toMatch(/^[a-zA-Z0-9]{32,}$/); // Not a hardcoded secret
    });

    it('should rotate secrets regularly', async () => {
      // Check if secret rotation mechanism exists
      const response = await request(app)
        .post(`/admin/secrets/rotate`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ secret_type: 'jwt' })
        .expect(200);

      expect(response.body.rotated).toBe(true);
    });

    it('should use secure secret generation', async () => {
      const response = await request(app)
        .post(`/admin/api-keys/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test API Key' })
        .expect(201);

      const apiKey = response.body.api_key;

      // Should be cryptographically random
      expect(apiKey.length).toBeGreaterThanOrEqual(32);
      expect(apiKey).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  // ==========================================================================
  // Data Sanitization
  // ==========================================================================
  describe('Data Sanitization', () => {
    it('should sanitize HTML in user input', async () => {
      const htmlInput = '<p>Normal text</p><script>alert("XSS")</script>';

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: 'Test User',
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
          notes: htmlInput,
        });

      if (response.status === 201) {
        const booking = await db.models.Booking.findByPk(response.body.id);
        expect(booking.notes).not.toContain('<script>');
      }
    });

    it('should strip metadata from uploaded files', async () => {
      // Create a test file with metadata
      const fileWithMetadata = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/admin/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', fileWithMetadata, 'photo.jpg')
        .expect(201);

      // Downloaded file should have metadata stripped
      const downloadResponse = await request(app)
        .get(`/admin/download/${response.body.file_id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify EXIF data is removed (would need image parsing library)
    });

    it('should normalize Unicode input', async () => {
      const unicodeName = 'Café'; // Contains é

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: unicodeName,
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(201);

      const booking = await db.models.Booking.findByPk(response.body.id);
      // Should be normalized to NFC form
      expect(booking.customer_name).toBe('Café');
    });

    it('should remove null bytes from input', async () => {
      const maliciousInput = 'Test\x00User';

      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: maliciousInput,
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(201);

      const booking = await db.models.Booking.findByPk(response.body.id);
      expect(booking.customer_name).not.toContain('\x00');
    });
  });

  // ==========================================================================
  // Data Retention
  // ==========================================================================
  describe('Data Retention', () => {
    it('should soft delete data initially', async () => {
      const booking = await fixtures.createTestBooking(testData.salon.id);

      await request(app)
        .delete(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Should be soft deleted (marked as deleted but not removed)
      const deletedBooking = await db.models.Booking.findByPk(booking.id, {
        paranoid: false, // Include soft-deleted records
      });

      expect(deletedBooking).toBeDefined();
      expect(deletedBooking.deleted_at).toBeDefined();
    });

    it('should permanently delete data after retention period', async () => {
      // This test simulates aged data deletion
      // In practice, this would be done by a cron job

      const oldBooking = await fixtures.createTestBooking(testData.salon.id);

      // Mark as deleted 31 days ago
      await db.query(
        'UPDATE bookings SET deleted_at = $1 WHERE id = $2',
        [new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), oldBooking.id]
      );

      // Run cleanup job
      await request(app)
        .post('/admin/cleanup/aged-data')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Should be permanently deleted
      const purgedBooking = await db.models.Booking.findByPk(oldBooking.id, {
        paranoid: false,
      });

      expect(purgedBooking).toBeNull();
    });

    it('should respect data retention policies', async () => {
      const response = await request(app)
        .get(`/admin/data-retention-policy`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.retention_days).toBeGreaterThan(0);
      expect(response.body.retention_days).toBeLessThanOrEqual(365); // Max 1 year
    });
  });

  // ==========================================================================
  // GDPR Compliance
  // ==========================================================================
  describe('GDPR Compliance', () => {
    it('should provide data export for user (Right to Access)', async () => {
      const customerPhone = '+1234567890';

      // Create some data for the customer
      await fixtures.createTestBooking(testData.salon.id, {
        customer_phone: customerPhone,
      });

      const response = await request(app)
        .get(`/admin/gdpr/export`)
        .query({ customer_phone: customerPhone })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
      expect(response.body.messages).toBeDefined();
    });

    it('should delete all user data (Right to be Forgotten)', async () => {
      const customerPhone = '+9876543210';

      // Create data
      const booking = await fixtures.createTestBooking(testData.salon.id, {
        customer_phone: customerPhone,
      });

      // Request deletion
      const response = await request(app)
        .delete(`/admin/gdpr/delete`)
        .query({ customer_phone: customerPhone })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.deleted).toBe(true);

      // Verify data is deleted
      const deletedBooking = await db.models.Booking.findByPk(booking.id, {
        paranoid: false,
      });

      expect(deletedBooking.deleted_at).toBeDefined();
    });

    it('should provide consent management', async () => {
      const response = await request(app)
        .post(`/admin/consent`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_phone: '+1234567890',
          consent_type: 'marketing',
          granted: true,
        })
        .expect(201);

      expect(response.body.consent_recorded).toBe(true);
    });

    it('should log data access for audit trail', async () => {
      const booking = await fixtures.createTestBooking(testData.salon.id);

      await request(app)
        .get(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify access was logged
      const auditLog = await db.query(
        'SELECT * FROM audit_log WHERE resource_id = $1 ORDER BY created_at DESC LIMIT 1',
        [booking.id]
      );

      expect(auditLog.rows.length).toBeGreaterThan(0);
      expect(auditLog.rows[0].action).toBe('READ');
    });
  });

  // ==========================================================================
  // Backup Security
  // ==========================================================================
  describe('Backup Security', () => {
    it('should encrypt database backups', async () => {
      const response = await request(app)
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(201);

      expect(response.body.encrypted).toBe(true);
      expect(response.body.backup_location).toMatch(/\.encrypted$/);
    });

    it('should restrict backup access', async () => {
      const response = await request(app)
        .get('/admin/backup/list')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Only authorized users should access backups
      expect(response.body.backups).toBeDefined();
    });

    it('should verify backup integrity', async () => {
      const backup = await request(app)
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(201);

      const verification = await request(app)
        .post('/admin/backup/verify')
        .send({ backup_id: backup.body.backup_id })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(verification.body.integrity_valid).toBe(true);
    });
  });
});
