/**
 * =============================================================================
 * AUTHORIZATION SECURITY TESTS
 * =============================================================================
 *
 * Tests endpoint access control, data access control, and salon isolation.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('Authorization Security Tests', () => {
  let testData;
  let salon1;
  let salon2;
  let salon1Token;
  let salon2Token;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();

    // Create two separate salons for isolation testing
    salon1 = await fixtures.createTestSalon();
    salon2 = await fixtures.createTestSalon();

    salon1Token = helpers.generateToken({
      salonId: salon1.id,
      expiresIn: '1h',
    });

    salon2Token = helpers.generateToken({
      salonId: salon2.id,
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
    await fixtures.cleanupTestSalon(salon1.id);
    await fixtures.cleanupTestSalon(salon2.id);
  });

  // ==========================================================================
  // Endpoint Access Control
  // ==========================================================================
  describe('Endpoint Access Control', () => {
    it('should allow access to public endpoints without token', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should allow access to webhook endpoint with valid signature', async () => {
      const payload = fixtures.createWebhookPayload({
        from: '+1234567890',
        to: salon1.phone,
        body: 'Test message',
      });

      const signature = helpers.generateWebhookSignature(payload);

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);
    });

    it('should deny access to admin endpoints without token', async () => {
      const endpoints = [
        `/admin/stats/${salon1.id}`,
        `/admin/bookings/${salon1.id}`,
        `/admin/messages/${salon1.id}`,
        `/admin/ai/analytics/${salon1.id}`,
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.error).toContain('authorization');
      }
    });

    it('should deny access to admin endpoints with invalid token', async () => {
      const response = await request(app)
        .get(`/admin/stats/${salon1.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toContain('invalid');
    });

    it('should allow access to admin endpoints with valid token', async () => {
      const endpoints = [
        `/admin/stats/${salon1.id}`,
        `/admin/bookings/${salon1.id}`,
        `/admin/messages/${salon1.id}`,
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${salon1Token}`)
          .expect(200);
      }
    });

    it('should enforce method-level permissions', async () => {
      // GET should be allowed
      await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // DELETE might require elevated privileges
      const booking = await fixtures.createTestBooking(salon1.id);

      const response = await request(app)
        .delete(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('permission');
    });

    it('should prevent unauthorized method access', async () => {
      // Try to use unsupported HTTP method
      const response = await request(app)
        .patch(`/admin/stats/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(405);

      expect(response.body.error).toContain('method not allowed');
    });
  });

  // ==========================================================================
  // Data Access Control
  // ==========================================================================
  describe('Data Access Control', () => {
    it('should only return data for authorized salon', async () => {
      // Create bookings for salon1
      await fixtures.createTestBooking(salon1.id);
      await fixtures.createTestBooking(salon1.id);

      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
      expect(Array.isArray(response.body.bookings)).toBe(true);

      // All bookings should belong to salon1
      response.body.bookings.forEach(booking => {
        expect(booking.salon_id).toBe(salon1.id);
      });
    });

    it('should prevent cross-salon data access', async () => {
      // Try to access salon2 data with salon1 token
      const response = await request(app)
        .get(`/admin/bookings/${salon2.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('access');
    });

    it('should prevent access to individual records from other salons', async () => {
      // Create booking for salon2
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Try to access with salon1 token
      const response = await request(app)
        .get(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('access');
    });

    it('should prevent modification of data from other salons', async () => {
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Try to update with salon1 token
      const response = await request(app)
        .put(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body.error).toContain('access');
    });

    it('should prevent deletion of data from other salons', async () => {
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Try to delete with salon1 token
      const response = await request(app)
        .delete(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('access');
    });

    it('should filter aggregated data by salon', async () => {
      // Create bookings for both salons
      await fixtures.createTestBooking(salon1.id);
      await fixtures.createTestBooking(salon2.id);

      const response = await request(app)
        .get(`/admin/stats/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // Stats should only include salon1 data
      expect(response.body.stats.salon_id).toBe(salon1.id);
    });

    it('should prevent parameter tampering to access other salon data', async () => {
      // Try to tamper with query parameters
      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .query({ salon_id: salon2.id }) // Attempt to override
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // Should still return only salon1 data
      if (response.body.bookings && response.body.bookings.length > 0) {
        response.body.bookings.forEach(booking => {
          expect(booking.salon_id).toBe(salon1.id);
        });
      }
    });
  });

  // ==========================================================================
  // Salon Isolation
  // ==========================================================================
  describe('Salon Isolation', () => {
    beforeEach(async () => {
      // Create test data for both salons
      await fixtures.createTestBooking(salon1.id);
      await fixtures.createTestBooking(salon2.id);
    });

    it('should maintain complete data isolation between salons', async () => {
      // Get bookings for salon1
      const salon1Response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // Get bookings for salon2
      const salon2Response = await request(app)
        .get(`/admin/bookings/${salon2.id}`)
        .set('Authorization', `Bearer ${salon2Token}`)
        .expect(200);

      // Extract booking IDs
      const salon1BookingIds = salon1Response.body.bookings.map(b => b.id);
      const salon2BookingIds = salon2Response.body.bookings.map(b => b.id);

      // No overlap should exist
      const overlap = salon1BookingIds.filter(id => salon2BookingIds.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should isolate messages between salons', async () => {
      // Create messages for both salons
      await fixtures.createTestMessage(salon1.id, '+1111111111');
      await fixtures.createTestMessage(salon2.id, '+2222222222');

      const salon1Messages = await request(app)
        .get(`/admin/messages/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      const salon2Messages = await request(app)
        .get(`/admin/messages/${salon2.id}`)
        .set('Authorization', `Bearer ${salon2Token}`)
        .expect(200);

      // Messages should be isolated
      salon1Messages.body.messages.forEach(msg => {
        expect(msg.salon_id).toBe(salon1.id);
      });

      salon2Messages.body.messages.forEach(msg => {
        expect(msg.salon_id).toBe(salon2.id);
      });
    });

    it('should isolate AI analytics between salons', async () => {
      const salon1Analytics = await request(app)
        .get(`/admin/ai/analytics/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      const salon2Analytics = await request(app)
        .get(`/admin/ai/analytics/${salon2.id}`)
        .set('Authorization', `Bearer ${salon2Token}`)
        .expect(200);

      // Analytics should be salon-specific
      expect(salon1Analytics.body.salon_id).toBe(salon1.id);
      expect(salon2Analytics.body.salon_id).toBe(salon2.id);
    });

    it('should prevent IDOR attacks via ID enumeration', async () => {
      const salon1Booking = await fixtures.createTestBooking(salon1.id);
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Try sequential IDs
      const bookingId1 = salon1Booking.id;
      const bookingId2 = salon2Booking.id;

      // Salon1 token should not access salon2 booking even if ID is guessed
      const response = await request(app)
        .get(`/admin/bookings/${bookingId2}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toContain('access');
    });

    it('should prevent mass assignment across salon boundaries', async () => {
      const salon1Booking = await fixtures.createTestBooking(salon1.id);

      // Try to change salon_id via mass assignment
      const response = await request(app)
        .put(`/admin/bookings/${salon1Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          status: 'confirmed',
          salon_id: salon2.id, // Attempt to reassign to different salon
        })
        .expect(200);

      // Verify salon_id was not changed
      const updatedBooking = await db.models.Booking.findByPk(salon1Booking.id);
      expect(updatedBooking.salon_id).toBe(salon1.id);
    });

    it('should isolate search results to salon scope', async () => {
      // Create bookings with similar customer names
      await fixtures.createTestBooking(salon1.id, {
        customer_name: 'John Doe',
        customer_phone: '+1111111111',
      });

      await fixtures.createTestBooking(salon2.id, {
        customer_name: 'John Doe',
        customer_phone: '+2222222222',
      });

      // Search from salon1
      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .query({ search: 'John Doe' })
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // Should only return salon1 results
      response.body.bookings.forEach(booking => {
        expect(booking.salon_id).toBe(salon1.id);
      });
    });

    it('should prevent bulk operations across salon boundaries', async () => {
      const salon1Booking1 = await fixtures.createTestBooking(salon1.id);
      const salon1Booking2 = await fixtures.createTestBooking(salon1.id);
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Try to bulk update including salon2 booking
      const response = await request(app)
        .put('/admin/bookings/bulk')
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          booking_ids: [salon1Booking1.id, salon1Booking2.id, salon2Booking.id],
          status: 'confirmed',
        })
        .expect(403);

      expect(response.body.error).toContain('access');
    });
  });

  // ==========================================================================
  // Role-Based Access Control (if applicable)
  // ==========================================================================
  describe('Role-Based Access Control', () => {
    it('should enforce read-only access for viewer role', async () => {
      const viewerToken = helpers.generateToken({
        salonId: salon1.id,
        role: 'viewer',
        expiresIn: '1h',
      });

      // Should allow GET
      await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // Should deny POST
      const response = await request(app)
        .post(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ customer_name: 'Test' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });

    it('should enforce full access for admin role', async () => {
      const adminToken = helpers.generateToken({
        salonId: salon1.id,
        role: 'admin',
        expiresIn: '1h',
      });

      // Should allow GET
      await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should allow POST
      await request(app)
        .post(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fixtures.createBookingData())
        .expect(201);
    });

    it('should prevent privilege escalation', async () => {
      const viewerToken = helpers.generateToken({
        salonId: salon1.id,
        role: 'viewer',
        expiresIn: '1h',
      });

      // Try to elevate privileges via request
      const response = await request(app)
        .put(`/admin/users/self`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  // ==========================================================================
  // API Key Authorization (if applicable)
  // ==========================================================================
  describe('API Key Authorization', () => {
    it('should accept valid API key for programmatic access', async () => {
      const apiKey = helpers.generateApiKey(salon1.id);

      const response = await request(app)
        .get(`/api/v1/bookings`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get(`/api/v1/bookings`)
        .set('X-API-Key', 'invalid_api_key')
        .expect(401);

      expect(response.body.error).toContain('API key');
    });

    it('should enforce API key scopes', async () => {
      const readOnlyApiKey = helpers.generateApiKey(salon1.id, {
        scopes: ['read:bookings'],
      });

      // Should allow read
      await request(app)
        .get(`/api/v1/bookings`)
        .set('X-API-Key', readOnlyApiKey)
        .expect(200);

      // Should deny write
      const response = await request(app)
        .post(`/api/v1/bookings`)
        .set('X-API-Key', readOnlyApiKey)
        .send(fixtures.createBookingData())
        .expect(403);

      expect(response.body.error).toContain('scope');
    });
  });
});
