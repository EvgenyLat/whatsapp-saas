/**
 * =============================================================================
 * OWASP A01:2021 - BROKEN ACCESS CONTROL TESTS
 * =============================================================================
 *
 * Tests for unauthorized access, privilege escalation, and access control bypasses.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('OWASP A01:2021 - Broken Access Control', () => {
  let salon1, salon2;
  let salon1Token, salon2Token;
  let viewerToken, adminToken;

  beforeAll(async () => {
    // Create two salons for isolation testing
    salon1 = await fixtures.createTestSalon();
    salon2 = await fixtures.createTestSalon();

    salon1Token = helpers.generateToken({ salonId: salon1.id, role: 'admin' });
    salon2Token = helpers.generateToken({ salonId: salon2.id, role: 'admin' });

    // Create tokens with different roles
    viewerToken = helpers.generateToken({ salonId: salon1.id, role: 'viewer' });
    adminToken = helpers.generateToken({ salonId: salon1.id, role: 'admin' });
  });

  afterAll(async () => {
    await fixtures.cleanupTestSalon(salon1.id);
    await fixtures.cleanupTestSalon(salon2.id);
  });

  // ==========================================================================
  // Test Unauthorized Endpoint Access
  // ==========================================================================
  describe('Unauthorized Endpoint Access', () => {
    it('should deny access to admin endpoints without authentication', async () => {
      const protectedEndpoints = [
        `/admin/stats/${salon1.id}`,
        `/admin/bookings/${salon1.id}`,
        `/admin/messages/${salon1.id}`,
        `/admin/ai/analytics/${salon1.id}`,
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.error).toMatch(/unauthorized|authentication/i);
      }
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get(`/admin/stats/${salon1.id}`)
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);

      expect(response.body.error).toMatch(/invalid|unauthorized/i);
    });

    it('should deny access with expired token', async () => {
      const expiredToken = helpers.generateToken({
        salonId: salon1.id,
        expiresIn: '-1h',
      });

      const response = await request(app)
        .get(`/admin/stats/${salon1.id}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/expired|unauthorized/i);
    });

    it('should deny access to internal/debug endpoints', async () => {
      const internalEndpoints = [
        '/internal/debug',
        '/internal/metrics',
        '/admin/internal/users',
      ];

      for (const endpoint of internalEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([403, 404]).toContain(response.status);
      }
    });

    it('should enforce authentication on all sensitive operations', async () => {
      const booking = await fixtures.createTestBooking(salon1.id);

      // Try to modify without auth
      const response = await request(app)
        .put(`/admin/bookings/${booking.id}`)
        .send({ status: 'confirmed' })
        .expect(401);
    });
  });

  // ==========================================================================
  // Test Horizontal Privilege Escalation
  // ==========================================================================
  describe('Horizontal Privilege Escalation', () => {
    it('should prevent accessing other salon data', async () => {
      // Salon1 trying to access Salon2 data
      const response = await request(app)
        .get(`/admin/stats/${salon2.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toMatch(/access|permission/i);
    });

    it('should prevent IDOR attacks on bookings', async () => {
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      // Salon1 trying to access Salon2 booking
      const response = await request(app)
        .get(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);

      expect(response.body.error).toMatch(/access|permission/i);
    });

    it('should prevent IDOR attacks on messages', async () => {
      const salon2Message = await fixtures.createTestMessage(
        salon2.id,
        '+1234567890'
      );

      const response = await request(app)
        .get(`/admin/messages/${salon2Message.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);
    });

    it('should prevent modifying other salon bookings', async () => {
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      const response = await request(app)
        .put(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({ status: 'confirmed' })
        .expect(403);
    });

    it('should prevent deleting other salon data', async () => {
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      const response = await request(app)
        .delete(`/admin/bookings/${salon2Booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);
    });

    it('should prevent parameter tampering to access other salon data', async () => {
      const booking = await fixtures.createTestBooking(salon1.id);

      // Try to change salon_id in update
      const response = await request(app)
        .put(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          status: 'confirmed',
          salon_id: salon2.id, // Attempt to reassign
        })
        .expect(200);

      // Verify salon_id didn't change
      const updated = await db.models.Booking.findByPk(booking.id);
      expect(updated.salon_id).toBe(salon1.id);
    });

    it('should prevent accessing other salon via query parameters', async () => {
      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .query({ salon_id: salon2.id })
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(200);

      // Should only return salon1 bookings
      if (response.body.bookings) {
        response.body.bookings.forEach(booking => {
          expect(booking.salon_id).toBe(salon1.id);
        });
      }
    });

    it('should prevent ID enumeration attacks', async () => {
      const booking = await fixtures.createTestBooking(salon2.id);

      // Try sequential IDs
      const ids = [
        booking.id - 1,
        booking.id,
        booking.id + 1,
      ];

      for (const id of ids) {
        const response = await request(app)
          .get(`/admin/bookings/${id}`)
          .set('Authorization', `Bearer ${salon1Token}`);

        // Should either return 403 or 404, never 200 with other salon data
        if (response.status === 200) {
          expect(response.body.salon_id).toBe(salon1.id);
        } else {
          expect([403, 404]).toContain(response.status);
        }
      }
    });
  });

  // ==========================================================================
  // Test Vertical Privilege Escalation
  // ==========================================================================
  describe('Vertical Privilege Escalation', () => {
    it('should prevent viewer from accessing admin-only endpoints', async () => {
      const adminOnlyEndpoints = [
        { method: 'post', path: `/admin/users/${salon1.id}` },
        { method: 'delete', path: `/admin/salon/${salon1.id}` },
        { method: 'put', path: `/admin/settings/${salon1.id}` },
      ];

      for (const endpoint of adminOnlyEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({})
          .expect(403);

        expect(response.body.error).toMatch(/permission|forbidden/i);
      }
    });

    it('should prevent viewer from modifying data', async () => {
      const booking = await fixtures.createTestBooking(salon1.id);

      const response = await request(app)
        .put(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: 'confirmed' })
        .expect(403);
    });

    it('should prevent viewer from deleting data', async () => {
      const booking = await fixtures.createTestBooking(salon1.id);

      const response = await request(app)
        .delete(`/admin/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should allow viewer to read data', async () => {
      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
    });

    it('should prevent role escalation via request body', async () => {
      const response = await request(app)
        .put('/admin/users/self')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.error).toMatch(/permission/i);
    });

    it('should prevent role escalation via headers', async () => {
      const response = await request(app)
        .get(`/admin/settings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-User-Role', 'admin') // Attempt to override role
        .expect(403);
    });

    it('should enforce method-level permissions', async () => {
      // GET should work for viewer
      await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // POST should not work for viewer
      await request(app)
        .post(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(fixtures.createBookingData())
        .expect(403);
    });

    it('should allow admin full access', async () => {
      // Create
      const createResponse = await request(app)
        .post(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fixtures.createBookingData())
        .expect(201);

      // Read
      await request(app)
        .get(`/admin/bookings/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Update
      await request(app)
        .put(`/admin/bookings/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      // Delete
      await request(app)
        .delete(`/admin/bookings/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ==========================================================================
  // Test Access Control Bypass Techniques
  // ==========================================================================
  describe('Access Control Bypass Techniques', () => {
    it('should prevent bypassing via HTTP verb tampering', async () => {
      const booking = await fixtures.createTestBooking(salon1.id);

      // Try to use GET to modify (if improperly implemented)
      const response = await request(app)
        .get(`/admin/bookings/${booking.id}?_method=DELETE`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).not.toBe(200);
    });

    it('should prevent bypassing via URL encoding', async () => {
      // Try encoded salon ID
      const encodedId = encodeURIComponent(salon2.id);

      const response = await request(app)
        .get(`/admin/stats/${encodedId}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .expect(403);
    });

    it('should prevent bypassing via path traversal in URLs', async () => {
      const response = await request(app)
        .get(`/admin/bookings/${salon1.id}/../${salon2.id}`)
        .set('Authorization', `Bearer ${salon1Token}`);

      expect([400, 403, 404]).toContain(response.status);
    });

    it('should prevent bypassing via header injection', async () => {
      const response = await request(app)
        .get(`/admin/stats/${salon1.id}`)
        .set('Authorization', `Bearer ${salon1Token}`)
        .set('X-Salon-ID', salon2.id) // Attempt to override
        .expect(200);

      // Should return salon1 data, not salon2
      expect(response.body.salon_id).toBe(salon1.id);
    });

    it('should prevent bypassing via missing function level access control', async () => {
      // Direct object access without going through controller
      const response = await request(app)
        .get(`/api/models/Booking/${salon2.id}`)
        .set('Authorization', `Bearer ${salon1Token}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should validate access on every request (no caching bypass)', async () => {
      // First request should work
      await request(app)
        .get(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Revoke admin role (simulate)
      const revokedToken = helpers.generateToken({
        salonId: salon1.id,
        role: 'viewer',
      });

      // Next request should be restricted
      await request(app)
        .post(`/admin/bookings/${salon1.id}`)
        .set('Authorization', `Bearer ${revokedToken}`)
        .send(fixtures.createBookingData())
        .expect(403);
    });
  });

  // ==========================================================================
  // Test Bulk Operations Access Control
  // ==========================================================================
  describe('Bulk Operations Access Control', () => {
    it('should prevent bulk operations crossing salon boundaries', async () => {
      const salon1Booking = await fixtures.createTestBooking(salon1.id);
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      const response = await request(app)
        .put('/admin/bookings/bulk')
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          booking_ids: [salon1Booking.id, salon2Booking.id],
          status: 'confirmed',
        })
        .expect(403);

      expect(response.body.error).toMatch(/access|permission/i);
    });

    it('should validate each item in bulk operation', async () => {
      const salon1Booking1 = await fixtures.createTestBooking(salon1.id);
      const salon1Booking2 = await fixtures.createTestBooking(salon1.id);

      // This should work (all belong to salon1)
      const response = await request(app)
        .put('/admin/bookings/bulk')
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          booking_ids: [salon1Booking1.id, salon1Booking2.id],
          status: 'confirmed',
        })
        .expect(200);
    });

    it('should prevent partial bulk operations on failure', async () => {
      const salon1Booking = await fixtures.createTestBooking(salon1.id);
      const salon2Booking = await fixtures.createTestBooking(salon2.id);

      await request(app)
        .delete('/admin/bookings/bulk')
        .set('Authorization', `Bearer ${salon1Token}`)
        .send({
          booking_ids: [salon1Booking.id, salon2Booking.id],
        })
        .expect(403);

      // Verify salon1 booking still exists (transaction rolled back)
      const stillExists = await db.models.Booking.findByPk(salon1Booking.id);
      expect(stillExists).not.toBeNull();
    });
  });

  // ==========================================================================
  // Test API Key Access Control
  // ==========================================================================
  describe('API Key Access Control', () => {
    it('should enforce API key scopes', async () => {
      const readOnlyKey = helpers.generateApiKey(salon1.id, {
        scopes: ['read:bookings'],
      });

      // Read should work
      await request(app)
        .get(`/api/v1/bookings`)
        .set('X-API-Key', readOnlyKey)
        .expect(200);

      // Write should not work
      await request(app)
        .post(`/api/v1/bookings`)
        .set('X-API-Key', readOnlyKey)
        .send(fixtures.createBookingData())
        .expect(403);
    });

    it('should prevent API key from accessing other salon data', async () => {
      const salon1ApiKey = helpers.generateApiKey(salon1.id);

      const response = await request(app)
        .get(`/api/v1/bookings`)
        .query({ salon_id: salon2.id })
        .set('X-API-Key', salon1ApiKey)
        .expect(200);

      // Should only return salon1 data
      if (response.body.bookings) {
        response.body.bookings.forEach(booking => {
          expect(booking.salon_id).toBe(salon1.id);
        });
      }
    });
  });
});
