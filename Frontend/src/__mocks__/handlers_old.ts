/**
 * MSW Request Handlers
 * WhatsApp SaaS Platform - API Integration Tests
 *
 * Mock handlers for all API endpoints
 */

import { http, HttpResponse } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Mock data generators
 */
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'SALON_ADMIN' as const,
  salon_id: 'salon-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockToken = 'mock-jwt-token-12345';
const mockRefreshToken = 'mock-refresh-token-67890';

const mockBooking = {
  id: 'booking-123',
  customer_id: 'customer-123',
  salon_id: 'salon-123',
  service_id: 'service-123',
  staff_id: 'staff-123',
  scheduled_at: new Date().toISOString(),
  status: 'CONFIRMED' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Request handlers
 */
export const handlers = [
  // ===== AUTH ENDPOINTS =====

  // POST /api/auth/login
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as any;

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        token: mockToken,
        refreshToken: mockRefreshToken,
      });
    }

    return HttpResponse.json(
      { error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } },
      { status: 401 }
    );
  }),

  // POST /api/auth/register
  http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
    const body = await request.json() as any;

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: { message: 'Email already exists', code: 'EMAIL_EXISTS' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      user: { ...mockUser, email: body.email, name: body.name },
      token: mockToken,
      refreshToken: mockRefreshToken,
    });
  }),

  // POST /api/auth/logout
  http.post(`${API_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // POST /api/auth/refresh
  http.post(`${API_URL}/api/auth/refresh`, async ({ request }) => {
    const body = await request.json() as any;

    if (body.refreshToken === mockRefreshToken) {
      return HttpResponse.json({
        token: 'new-mock-token-12345',
        refreshToken: 'new-mock-refresh-token-67890',
      });
    }

    return HttpResponse.json(
      { error: { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' } },
      { status: 401 }
    );
  }),

  // GET /api/auth/me
  http.get(`${API_URL}/api/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockUser);
  }),

  // PUT /api/auth/profile
  http.put(`${API_URL}/api/auth/profile`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockUser,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /api/auth/change-password
  http.post(`${API_URL}/api/auth/change-password`, async ({ request }) => {
    const body = await request.json() as any;

    if (body.currentPassword !== 'password123') {
      return HttpResponse.json(
        { error: { message: 'Current password is incorrect', code: 'INVALID_PASSWORD' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({ message: 'Password changed successfully' });
  }),

  // POST /api/auth/forgot-password
  http.post(`${API_URL}/api/auth/forgot-password`, () => {
    return HttpResponse.json({ message: 'Password reset email sent' });
  }),

  // POST /api/auth/reset-password
  http.post(`${API_URL}/api/auth/reset-password`, async ({ request }) => {
    const body = await request.json() as any;

    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        { error: { message: 'Invalid or expired reset token', code: 'INVALID_TOKEN' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({ message: 'Password reset successfully' });
  }),

  // ===== BOOKINGS ENDPOINTS =====

  // GET /api/bookings
  http.get(`${API_URL}/api/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: [mockBooking],
      pagination: {
        page,
        limit,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  }),

  // GET /api/bookings/:id
  http.get(`${API_URL}/api/bookings/:id`, ({ params }) => {
    if (params.id === 'booking-404') {
      return HttpResponse.json(
        { error: { message: 'Booking not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockBooking);
  }),

  // POST /api/bookings
  http.post(`${API_URL}/api/bookings`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockBooking,
      ...body,
      id: 'booking-new-123',
    });
  }),

  // PUT /api/bookings/:id
  http.put(`${API_URL}/api/bookings/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      ...mockBooking,
      id: params.id as string,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /api/bookings/:id
  http.delete(`${API_URL}/api/bookings/:id`, () => {
    return HttpResponse.json({ message: 'Booking deleted successfully' });
  }),

  // PATCH /api/bookings/bulk
  http.patch(`${API_URL}/api/bookings/bulk`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      updated: body.ids?.length || 0,
      message: 'Bookings updated successfully',
    });
  }),

  // GET /api/bookings/stats
  http.get(`${API_URL}/api/bookings/stats`, () => {
    return HttpResponse.json({
      total: 100,
      confirmed: 75,
      pending: 15,
      cancelled: 10,
      today: 5,
      thisWeek: 25,
      thisMonth: 100,
    });
  }),

  // ===== MESSAGES ENDPOINTS =====

  // POST /api/messages/send
  http.post(`${API_URL}/api/messages/send`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: 'message-123',
      ...body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }),

  // GET /api/messages/templates
  http.get(`${API_URL}/api/messages/templates`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'template-123',
          name: 'Booking Confirmation',
          content: 'Your booking is confirmed for {{date}}',
          variables: ['date'],
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
  }),

  // GET /api/messages/conversations
  http.get(`${API_URL}/api/messages/conversations`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'conversation-123',
          customer_id: 'customer-123',
          last_message: 'Hello',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
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
  }),

  // ===== ERROR SCENARIOS =====

  // Network error simulation
  http.get(`${API_URL}/api/test/network-error`, () => {
    return HttpResponse.error();
  }),

  // 500 Server error
  http.get(`${API_URL}/api/test/server-error`, () => {
    return HttpResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }),

  // 502 Bad Gateway (retryable)
  http.get(`${API_URL}/api/test/bad-gateway`, () => {
    return HttpResponse.json(
      { error: { message: 'Bad gateway', code: 'BAD_GATEWAY' } },
      { status: 502 }
    );
  }),

  // 429 Rate limit
  http.get(`${API_URL}/api/test/rate-limit`, () => {
    return HttpResponse.json(
      { error: { message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' } },
      { status: 429 }
    );
  }),

  // Timeout simulation (slow response)
  http.get(`${API_URL}/api/test/timeout`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 35000)); // Longer than default timeout
    return HttpResponse.json({ data: 'success' });
  }),
  // Wildcard handlers for generic test routes (must be at the end)
  http.get(`${API_URL}/api/test/*`, ({ request }) => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post(`${API_URL}/api/test/*`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put(`${API_URL}/api/test/*`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete(`${API_URL}/api/test/*`, () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // OPTIONS handlers for CORS preflight
  http.options(`${API_URL}/api/*`, () => {
    return new HttpResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }),
];
