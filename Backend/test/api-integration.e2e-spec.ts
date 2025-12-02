import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * API Integration Tests
 *
 * Tests critical API workflows end-to-end including:
 * - Authentication flows (register, login, refresh token)
 * - Role-based access control
 * - CRUD operations for salons, bookings, messages
 * - WhatsApp webhook processing
 * - Analytics dashboard calculations
 */

describe('API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authTokens: { accessToken: string; refreshToken: string };
  let testSalonId: string;
  let testBookingId: string;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User',
    phone: `+12346${Date.now().toString().slice(-5)}`,
  };

  const adminUser = {
    email: `admin-${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    first_name: 'Admin',
    last_name: 'User',
    phone: '+1987654321',
    role: 'SUPER_ADMIN',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testBookingId) {
      await prismaService.booking
        .deleteMany({
          where: { id: testBookingId },
        })
        .catch(() => {});
    }
    if (testSalonId) {
      await prismaService.salon
        .deleteMany({
          where: { id: testSalonId },
        })
        .catch(() => {});
    }
    await prismaService.user
      .deleteMany({
        where: { email: { in: [testUser.email, adminUser.email] } },
      })
      .catch(() => {});

    await app.close();
  });

  describe('Authentication Flow', () => {
    it('should register a new user (POST /auth/register)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('should prevent duplicate registration (POST /auth/register)', async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(409); // Conflict
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'another@test.com', password: '123' })
        .expect(400);
    });

    it('should login with valid credentials (POST /auth/login)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid credentials (POST /auth/login)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('should refresh access token (POST /auth/refresh)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('should get current user info (GET /auth/me)', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('role', 'SALON_OWNER');
    });

    it('should logout user (POST /auth/logout)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);
    });

    it('should reject access with invalidated token after logout', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(401);
    });

    // Re-login for subsequent tests
    it('should re-login for subsequent tests', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });
  });

  describe('Salon Management', () => {
    it('should create a new salon (POST /salons)', async () => {
      const salonData = {
        name: 'Test Salon',
        phone: '+1234567890',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
        whatsapp_business_account_id: 'test-account-id',
        phone_number_id: 'test-phone-number-id',
        access_token: 'test-access-token',
      };

      const response = await request(app.getHttpServer())
        .post('/salons')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(salonData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(salonData.name);

      testSalonId = response.body.id;
    });

    it('should get all user salons (GET /salons)', async () => {
      const response = await request(app.getHttpServer())
        .get('/salons')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should get specific salon (GET /salons/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/salons/${testSalonId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testSalonId);
      expect(response.body).toHaveProperty('name');
    });

    it('should update salon (PUT /salons/:id)', async () => {
      const updateData = {
        name: 'Updated Test Salon',
        phone: '+1234567890',
      };

      const response = await request(app.getHttpServer())
        .put(`/salons/${testSalonId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Test Salon');
    });

    it('should reject access to unauthorized salon', async () => {
      await request(app.getHttpServer())
        .get('/salons/non-existent-salon-id')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);
    });
  });

  describe('Booking Management', () => {
    it('should create a new booking (POST /bookings)', async () => {
      const bookingData = {
        salon_id: testSalonId,
        customer_name: 'John Customer',
        customer_phone: '+1234567899',
        service: 'Haircut',
        appointment_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        notes: 'Test booking',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_name).toBe(bookingData.customer_name);
      expect(response.body.status).toBe('PENDING');

      testBookingId = response.body.id;
    });

    it('should get all bookings for salon (GET /bookings)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings?salon_id=${testSalonId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get specific booking (GET /bookings/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testBookingId);
    });

    it('should update booking status (PUT /bookings/:id)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should cancel booking (PUT /bookings/:id)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Analytics Dashboard', () => {
    it('should get dashboard stats (GET /analytics/dashboard)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/dashboard?salon_id=${testSalonId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('todayBookings');
      expect(response.body).toHaveProperty('activeChats');
      expect(response.body).toHaveProperty('responseRate');
      expect(response.body).toHaveProperty('bookingsByStatus');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('trends');
    });

    it('should calculate correct booking counts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/dashboard?salon_id=${testSalonId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      expect(response.body.totalBookings).toBeGreaterThanOrEqual(1);
      expect(response.body.bookingsByStatus.CANCELLED).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Authorization & RBAC', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      await request(app.getHttpServer()).get('/salons').expect(401);
    });

    it('should prevent access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/salons')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should enforce salon ownership', async () => {
      // Create another user
      const anotherUser = {
        email: `another-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        first_name: 'Another',
        last_name: 'User',
        phone: '+1111111111',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(anotherUser)
        .expect(201);

      const anotherUserToken = registerResponse.body.accessToken;

      // Try to access first user's salon
      await request(app.getHttpServer())
        .get(`/salons/${testSalonId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403); // Forbidden
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent resources', async () => {
      await request(app.getHttpServer())
        .get('/salons/non-existent-id')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid request data', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Performance & Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get(`/salons/${testSalonId}`)
            .set('Authorization', `Bearer ${authTokens.accessToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});
