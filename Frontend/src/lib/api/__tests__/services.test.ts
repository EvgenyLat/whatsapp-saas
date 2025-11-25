/**
 * API Services Tests
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Tests for all API service endpoints:
 * - Authentication API (10 methods)
 * - Bookings API (6 methods)
 * - Messages API (5 methods)
 * - Conversations API (3 methods)
 * - Salons API (5 methods)
 * - Templates API (5 methods)
 * - Analytics API (4 methods)
 * - Customers API (2 methods)
 */

import { api, authApi, bookingsApi, messagesApi, conversationsApi, salonsApi, templatesApi, analyticsApi, customersApi } from '../index';
import { server, http, HttpResponse } from '@/__mocks__/server';
import { setupAuth, clearAuth, createMockPaginatedResponse, createMockBooking } from '@/__tests__/utils/test-utils';
import { BookingStatus, TemplateStatus } from '@/types/enums';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

describe('API Services', () => {
  beforeEach(() => {
    clearAuth();
  });

  afterEach(() => {
    clearAuth();
  });

  // ===== AUTHENTICATION API =====

  describe('Authentication API', () => {
    test('login returns token and user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authApi.login(credentials);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(credentials.email);
    });

    test('login throws error on invalid credentials', async () => {
      const credentials = {
        email: 'wrong@example.com',
        password: 'wrong',
      };

      await expect(authApi.login(credentials)).rejects.toThrow();
    });

    test('register creates new account', async () => {
      const data = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = await authApi.register(data);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(data.email);
      expect(result.user.name).toBe(data.name);
    });

    test('register throws error on existing email', async () => {
      const data = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      await expect(authApi.register(data)).rejects.toThrow();
    });

    test('logout calls correct endpoint', async () => {
      setupAuth(true);

      let called = false;
      server.use(
        http.post(`${API_URL}/api/auth/logout`, () => {
          called = true;
          return HttpResponse.json({ message: 'Logged out successfully' });
        })
      );

      await authApi.logout();

      expect(called).toBe(true);
    });

    test('refreshToken returns new token', async () => {
      const result = await authApi.refreshToken('mock-refresh-token-67890');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.token).toBeTruthy();
    });

    test('refreshToken throws error on invalid token', async () => {
      await expect(authApi.refreshToken('invalid-token')).rejects.toThrow();
    });

    test('getCurrentUser returns user data', async () => {
      setupAuth(true);

      const user = await authApi.getCurrentUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
    });

    test('getCurrentUser throws error when not authenticated', async () => {
      clearAuth();

      await expect(authApi.getCurrentUser()).rejects.toThrow();
    });

    test('updateProfile updates user', async () => {
      setupAuth(true);

      const updates = {
        name: 'Updated Name',
      };

      const user = await authApi.updateProfile(updates);

      expect(user.name).toBe(updates.name);
    });

    test('changePassword calls correct endpoint', async () => {
      setupAuth(true);

      let requestBody: any = null;
      server.use(
        http.post(`${API_URL}/api/auth/change-password`, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({ message: 'Password changed successfully' });
        })
      );

      const data = {
        currentPassword: 'password123',
        password: 'newPassword456',
        confirmPassword: 'newPassword456',
      };

      await authApi.changePassword(data);

      expect(requestBody).toEqual(data);
    });

    test('changePassword throws error on wrong current password', async () => {
      setupAuth(true);

      const data = {
        currentPassword: 'wrong',
        password: 'newPassword456',
        confirmPassword: 'newPassword456',
      };

      await expect(authApi.changePassword(data)).rejects.toThrow();
    });

    test('requestPasswordReset sends email', async () => {
      let called = false;
      server.use(
        http.post(`${API_URL}/api/auth/forgot-password`, () => {
          called = true;
          return HttpResponse.json({ message: 'Password reset email sent' });
        })
      );

      await authApi.requestPasswordReset({ email: 'test@example.com' });

      expect(called).toBe(true);
    });

    test('confirmPasswordReset resets password', async () => {
      let requestBody: any = null;
      server.use(
        http.post(`${API_URL}/api/auth/reset-password`, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({ message: 'Password reset successfully' });
        })
      );

      const data = {
        token: 'valid-reset-token',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      await authApi.confirmPasswordReset(data);

      expect(requestBody.token).toBe(data.token);
      expect(requestBody.password).toBe(data.password);
    });

    test('confirmPasswordReset throws error on invalid token', async () => {
      const data = {
        token: 'invalid-token',
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      await expect(authApi.confirmPasswordReset(data)).rejects.toThrow();
    });
  });

  // ===== BOOKINGS API =====

  describe('Bookings API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getAll returns paginated bookings', async () => {
      const salonId = 'salon-123';
      const params = { page: 1, limit: 10 };

      const result = await bookingsApi.getAll(salonId, params);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination.page).toBe(params.page);
      expect(result.pagination.limit).toBe(params.limit);
    });

    test('getById returns single booking', async () => {
      const salonId = 'salon-123';
      const bookingId = 'booking-123';

      const booking = await bookingsApi.getById(salonId, bookingId);

      expect(booking).toHaveProperty('id');
      expect(booking.id).toBeDefined();
    });

    test('getById throws error for non-existent booking', async () => {
      const salonId = 'salon-123';
      const bookingId = 'booking-404';

      await expect(bookingsApi.getById(salonId, bookingId)).rejects.toThrow();
    });

    test('create creates booking', async () => {
      const salonId = 'salon-123';
      const data = {
        customer_phone: '+1234567890',
        customer_name: 'John Doe',
        service: 'Haircut',
        start_ts: new Date().toISOString(),
      };

      const booking = await bookingsApi.create(salonId, data);

      expect(booking).toHaveProperty('id');
      expect(booking.customer_phone).toBe(data.customer_phone);
      expect(booking.service).toBe(data.service);
    });

    test('update updates booking', async () => {
      const salonId = 'salon-123';
      const bookingId = 'booking-123';
      const data = {
        status: BookingStatus.CANCELLED,
      };

      const booking = await bookingsApi.update(salonId, bookingId, data);

      expect(booking.id).toBe(bookingId);
      expect(booking.status).toBe(data.status);
    });

    test('delete deletes booking', async () => {
      const salonId = 'salon-123';
      const bookingId = 'booking-123';

      const result = await bookingsApi.delete(salonId, bookingId);

      expect(result).toHaveProperty('message');
    });

    test('bulkUpdate updates multiple bookings', async () => {
      const salonId = 'salon-123';
      const data = {
        bookingIds: ['booking-1', 'booking-2', 'booking-3'],
        status: BookingStatus.CANCELLED,
      };

      server.use(
        http.patch(`${API_URL}/api/bookings/bulk`, async ({ request }) => {
          const body = await request.json() as any;
          return HttpResponse.json({
            data: {
              updated: body.bookingIds.length,
              message: 'Bookings updated successfully',
            },
          });
        })
      );

      const result = await bookingsApi.bulkUpdate(salonId, data);

      expect(result).toBeDefined();
    });

    test('getStats returns statistics', async () => {
      const salonId = 'salon-123';

      const stats = await bookingsApi.getStats(salonId);

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('confirmed');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('cancelled');
    });
  });

  // ===== MESSAGES API =====

  describe('Messages API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('send sends message', async () => {
      const salonId = 'salon-123';
      const data = {
        to: '+1234567890',
        message: 'Hello, your appointment is confirmed!',
      };

      const message = await messagesApi.send(salonId, data as any);

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('status');
    });

    test('sendTemplate sends template message', async () => {
      const salonId = 'salon-123';
      const data = {
        to: '+1234567890',
        template: 'booking_confirmation',
        language: 'en',
        components: [],
      };

      const message = await messagesApi.sendTemplate(salonId, data as any);

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('status');
    });

    test('getAll returns paginated messages', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/messages/:salonId`, () => {
          return HttpResponse.json(
            createMockPaginatedResponse([
              {
                id: 'message-1',
                content: 'Test message',
                created_at: new Date().toISOString(),
              },
            ])
          );
        })
      );

      const result = await messagesApi.getAll(salonId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    test('getById returns single message', async () => {
      const messageId = 'message-123';

      server.use(
        http.get(`${API_URL}/api/messages/detail/:messageId`, () => {
          return HttpResponse.json({
            data: {
              id: messageId,
              content: 'Test message',
              created_at: new Date().toISOString(),
            },
          });
        })
      );

      const message = await messagesApi.getById(messageId);

      expect(message.id).toBe(messageId);
    });

    test('markAsRead marks message as read', async () => {
      const messageId = 'message-123';

      server.use(
        http.patch(`${API_URL}/api/messages/:messageId/read`, () => {
          return HttpResponse.json({
            data: {
              id: messageId,
              read: true,
              updated_at: new Date().toISOString(),
            },
          });
        })
      );

      const message = await messagesApi.markAsRead(messageId);

      expect(message).toBeDefined();
    });
  });

  // ===== CONVERSATIONS API =====

  describe('Conversations API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getAll returns paginated conversations', async () => {
      const salonId = 'salon-123';

      const result = await conversationsApi.getAll(salonId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    test('getById returns single conversation', async () => {
      const conversationId = 'conversation-123';

      server.use(
        http.get(`${API_URL}/api/conversations/detail/:conversationId`, () => {
          return HttpResponse.json({
            data: {
              id: conversationId,
              customer_id: 'customer-123',
              last_message: 'Hello',
            },
          });
        })
      );

      const conversation = await conversationsApi.getById(conversationId);

      expect(conversation.id).toBe(conversationId);
    });

    test('update updates conversation', async () => {
      const conversationId = 'conversation-123';
      const data = {
        status: 'archived' as const,
      };

      server.use(
        http.patch(`${API_URL}/api/conversations/:conversationId`, () => {
          return HttpResponse.json({
            data: {
              id: conversationId,
              ...data,
              updated_at: new Date().toISOString(),
            },
          });
        })
      );

      const conversation = await conversationsApi.update(conversationId, data);

      expect(conversation.id).toBe(conversationId);
    });
  });

  // ===== SALONS API =====

  describe('Salons API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getAll returns paginated salons', async () => {
      server.use(
        http.get(`${API_URL}/api/salons`, () => {
          return HttpResponse.json(
            createMockPaginatedResponse([
              {
                id: 'salon-1',
                name: 'Salon 1',
                phone_number_id: '123',
              },
            ])
          );
        })
      );

      const result = await salonsApi.getAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    test('getById returns single salon', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/salons/:salonId`, () => {
          return HttpResponse.json({
            data: {
              id: salonId,
              name: 'Test Salon',
              phone_number_id: '123',
            },
          });
        })
      );

      const salon = await salonsApi.getById(salonId);

      expect(salon.id).toBe(salonId);
    });

    test('create creates salon', async () => {
      const data = {
        name: 'New Salon',
        phone_number_id: '123456',
        access_token: 'token-123',
      };

      server.use(
        http.post(`${API_URL}/api/salons`, () => {
          return HttpResponse.json({
            data: {
              id: 'salon-new',
              ...data,
            },
          });
        })
      );

      const salon = await salonsApi.create(data);

      expect(salon.name).toBe(data.name);
    });

    test('update updates salon', async () => {
      const salonId = 'salon-123';
      const data = {
        name: 'Updated Salon',
      };

      server.use(
        http.patch(`${API_URL}/api/salons/:salonId`, () => {
          return HttpResponse.json({
            data: {
              id: salonId,
              ...data,
            },
          });
        })
      );

      const salon = await salonsApi.update(salonId, data);

      expect(salon.name).toBe(data.name);
    });

    test('delete deletes salon', async () => {
      const salonId = 'salon-123';

      const result = await salonsApi.delete(salonId);

      expect(result).toHaveProperty('message');
    });
  });

  // ===== TEMPLATES API =====

  describe('Templates API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getAll returns paginated templates', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/templates/:salonId`, () => {
          return HttpResponse.json({
            data: [
              {
                id: 'template-123',
                name: 'Booking Confirmation',
                content: 'Your booking is confirmed',
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          });
        })
      );

      const result = await templatesApi.getAll(salonId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    test('getById returns single template', async () => {
      const templateId = 'template-123';

      server.use(
        http.get(`${API_URL}/api/templates/detail/:templateId`, () => {
          return HttpResponse.json({
            data: {
              id: templateId,
              name: 'Test Template',
              content: 'Template content',
            },
          });
        })
      );

      const template = await templatesApi.getById(templateId);

      expect(template.id).toBe(templateId);
    });

    test('create creates template', async () => {
      const salonId = 'salon-123';
      const data = {
        name: 'new_template',
        content: 'New template content',
        language: 'en',
        category: 'MARKETING',
      };

      server.use(
        http.post(`${API_URL}/api/templates/:salonId`, () => {
          return HttpResponse.json({
            data: {
              id: 'template-new',
              ...data,
            },
          });
        })
      );

      const template = await templatesApi.create(salonId, data as any);

      expect(template.name).toBe(data.name);
    });

    test('update updates template', async () => {
      const templateId = 'template-123';
      const data = {
        status: TemplateStatus.APPROVED,
      };

      server.use(
        http.patch(`${API_URL}/api/templates/:templateId`, () => {
          return HttpResponse.json({
            data: {
              id: templateId,
              ...data,
            },
          });
        })
      );

      const template = await templatesApi.update(templateId, data);

      expect(template.id).toBe(templateId);
    });

    test('delete deletes template', async () => {
      const templateId = 'template-123';

      const result = await templatesApi.delete(templateId);

      expect(result).toHaveProperty('message');
    });
  });

  // ===== ANALYTICS API =====

  describe('Analytics API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getDashboard returns dashboard stats', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/analytics/:salonId/dashboard`, () => {
          return HttpResponse.json({
            data: {
              totalBookings: 100,
              totalRevenue: 10000,
              totalCustomers: 50,
              averageRating: 4.5,
            },
          });
        })
      );

      const stats = await analyticsApi.getDashboard(salonId);

      expect(stats).toHaveProperty('totalBookings');
      expect(stats).toHaveProperty('totalRevenue');
    });

    test('getBookingAnalytics returns booking analytics', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/analytics/:salonId/bookings`, () => {
          return HttpResponse.json({
            data: {
              timeSeries: [],
              summary: { total: 100 },
            },
          });
        })
      );

      const analytics = await analyticsApi.getBookingAnalytics(salonId);

      expect(analytics).toBeDefined();
    });

    test('getMessageAnalytics returns message analytics', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/analytics/:salonId/messages`, () => {
          return HttpResponse.json({
            data: {
              timeSeries: [],
              summary: { total: 50 },
            },
          });
        })
      );

      const analytics = await analyticsApi.getMessageAnalytics(salonId);

      expect(analytics).toBeDefined();
    });

    test('getRevenueAnalytics returns revenue analytics', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/analytics/:salonId/revenue`, () => {
          return HttpResponse.json({
            data: {
              timeSeries: [],
              summary: { totalRevenue: 10000 },
            },
          });
        })
      );

      const analytics = await analyticsApi.getRevenueAnalytics(salonId);

      expect(analytics).toBeDefined();
    });
  });

  // ===== CUSTOMERS API =====

  describe('Customers API', () => {
    beforeEach(() => {
      setupAuth(true);
    });

    test('getAll returns paginated customers', async () => {
      const salonId = 'salon-123';

      server.use(
        http.get(`${API_URL}/api/customers/:salonId`, () => {
          return HttpResponse.json(
            createMockPaginatedResponse([
              {
                id: 'customer-1',
                name: 'John Doe',
                phone: '+1234567890',
              },
            ])
          );
        })
      );

      const result = await customersApi.getAll(salonId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    test('getProfile returns customer profile', async () => {
      const salonId = 'salon-123';
      const phoneNumber = '+1234567890';

      server.use(
        http.get(`${API_URL}/api/customers/:salonId/:phoneNumber`, () => {
          return HttpResponse.json({
            data: {
              phone_number: phoneNumber,
              name: 'John Doe',
              total_bookings: 10,
              total_messages: 5,
              first_seen: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              favorite_service: 'Haircut',
              lifetime_value: null,
            },
          });
        })
      );

      const profile = await customersApi.getProfile(salonId, phoneNumber);

      expect(profile.phone_number).toBe(phoneNumber);
      expect(profile).toHaveProperty('total_bookings');
    });
  });

  // ===== COMBINED API OBJECT =====

  describe('Combined API Object', () => {
    test('api object exports all services', () => {
      expect(api).toHaveProperty('auth');
      expect(api).toHaveProperty('bookings');
      expect(api).toHaveProperty('messages');
      expect(api).toHaveProperty('conversations');
      expect(api).toHaveProperty('salons');
      expect(api).toHaveProperty('templates');
      expect(api).toHaveProperty('analytics');
      expect(api).toHaveProperty('customers');
    });

    test('api object methods are accessible', () => {
      expect(typeof api.auth.login).toBe('function');
      expect(typeof api.bookings.getAll).toBe('function');
      expect(typeof api.messages.send).toBe('function');
      expect(typeof api.conversations.getAll).toBe('function');
      expect(typeof api.salons.getAll).toBe('function');
      expect(typeof api.templates.getAll).toBe('function');
      expect(typeof api.analytics.getDashboard).toBe('function');
      expect(typeof api.customers.getAll).toBe('function');
    });
  });
});
