import { http, HttpResponse } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'SALON_ADMIN' as const, salon_id: 'salon-123' };
const mockToken = 'mock-jwt-token-12345';

export const handlers = [
  // Auth
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ access_token: mockToken, refresh_token: 'refresh-token', user: mockUser });
    }
    return HttpResponse.json({ error: { message: 'Invalid credentials' } }, { status: 401 });
  }),

  http.post(`${API_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ access_token: mockToken, refresh_token: 'refresh-token', user: mockUser });
    }
    return HttpResponse.json({ error: { message: 'Invalid credentials' } }, { status: 401 });
  }),

  // Bookings
  http.get(`${API_URL}/api/bookings`, () => HttpResponse.json({ data: [{ id: 'booking-123', customer_name: 'Test', status: 'confirmed' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.post(`${API_URL}/api/bookings`, async ({ request }) => HttpResponse.json({ id: 'booking-new', ...(await request.json() as any) })),
  http.put(`${API_URL}/api/bookings/:id`, async ({ params, request }) => HttpResponse.json({ id: params.id, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/bookings/:id`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.id })),

  http.get(`${API_URL}/api/v1/bookings/:salonId`, () => HttpResponse.json({ data: [{ id: 'booking-123', customer_name: 'Test', status: 'confirmed' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.get(`${API_URL}/api/v1/bookings/:salonId/:bookingId`, ({ params }) => HttpResponse.json({ id: params.bookingId, customer_name: 'Test', status: 'confirmed' })),
  http.post(`${API_URL}/api/v1/bookings/:salonId`, async ({ request }) => HttpResponse.json({ id: 'booking-new', ...(await request.json() as any) }, { status: 201 })),
  http.put(`${API_URL}/api/v1/bookings/:salonId/:bookingId`, async ({ params, request }) => HttpResponse.json({ id: params.bookingId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/bookings/:salonId/:bookingId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.bookingId })),

  // Staff
  http.get(`${API_URL}/api/v1/staff/:salonId`, () => HttpResponse.json({ data: [{ id: 'staff-1', name: 'Test Staff', role: 'stylist', status: 'active' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.get(`${API_URL}/api/v1/staff/:salonId/:staffId`, ({ params }) => HttpResponse.json({ id: params.staffId, name: 'Test Staff', role: 'stylist', status: 'active' })),
  http.post(`${API_URL}/api/v1/staff/:salonId`, async ({ request }) => HttpResponse.json({ id: 'staff-new', ...(await request.json() as any) }, { status: 201 })),
  http.put(`${API_URL}/api/v1/staff/:salonId/:staffId`, async ({ params, request }) => HttpResponse.json({ id: params.staffId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/staff/:salonId/:staffId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.staffId })),

  // Services
  http.get(`${API_URL}/api/v1/services/:salonId`, () => HttpResponse.json({ data: [{ id: 'service-1', name: 'Test Service', price: 50, duration: 30, status: 'active' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.get(`${API_URL}/api/v1/services/:salonId/:serviceId`, ({ params }) => HttpResponse.json({ id: params.serviceId, name: 'Test Service', price: 50, duration: 30, status: 'active' })),
  http.post(`${API_URL}/api/v1/services/:salonId`, async ({ request }) => HttpResponse.json({ id: 'service-new', ...(await request.json() as any) }, { status: 201 })),
  http.put(`${API_URL}/api/v1/services/:salonId/:serviceId`, async ({ params, request }) => HttpResponse.json({ id: params.serviceId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/services/:salonId/:serviceId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.serviceId })),

  // Templates
  http.get(`${API_URL}/api/v1/templates/:salonId`, () => HttpResponse.json({ data: [{ id: 'template-1', name: 'Test Template', type: 'notification', status: 'active' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.get(`${API_URL}/api/v1/templates/detail/:templateId`, ({ params }) => HttpResponse.json({ id: params.templateId, name: 'Test Template', content: 'Hello {name}', status: 'active' })),
  http.post(`${API_URL}/api/v1/templates/:salonId`, async ({ request }) => HttpResponse.json({ id: 'template-new', ...(await request.json() as any) }, { status: 201 })),
  http.put(`${API_URL}/api/v1/templates/:templateId`, async ({ params, request }) => HttpResponse.json({ id: params.templateId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/templates/:templateId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.templateId })),

  // Customers
  http.get(`${API_URL}/api/v1/customers/:salonId`, () => HttpResponse.json({ data: [{ id: 'customer-1', name: 'Test Customer', phone: '+1234567890', email: 'test@example.com' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })),
  http.get(`${API_URL}/api/v1/customers/:salonId/:customerId`, ({ params }) => HttpResponse.json({ id: params.customerId, name: 'Test Customer', phone: '+1234567890' })),
  http.post(`${API_URL}/api/v1/customers/:salonId`, async ({ request }) => HttpResponse.json({ id: 'customer-new', ...(await request.json() as any) }, { status: 201 })),
  http.put(`${API_URL}/api/v1/customers/:salonId/:customerId`, async ({ params, request }) => HttpResponse.json({ id: params.customerId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/customers/:salonId/:customerId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.customerId })),

  // Analytics
  http.get(`${API_URL}/api/v1/analytics/:salonId/dashboard`, () => HttpResponse.json({ total_bookings: 100, total_revenue: 5000, total_customers: 50 })),
  http.get(`${API_URL}/api/v1/analytics/:salonId/bookings`, () => HttpResponse.json({ total: 100, by_status: {}, by_service: {} })),
  http.get(`${API_URL}/api/v1/analytics/:salonId/revenue`, () => HttpResponse.json({ total_revenue: 5000, by_period: [] })),
  http.get(`${API_URL}/api/v1/analytics/:salonId/messages`, () => HttpResponse.json({ total_sent: 200, total_delivered: 180 })),

  // Salons
  http.get(`${API_URL}/api/v1/salons/:salonId`, ({ params }) => HttpResponse.json({ id: params.salonId, name: 'Test Salon', email: 'salon@test.com' })),
  http.put(`${API_URL}/api/v1/salons/:salonId`, async ({ params, request }) => HttpResponse.json({ id: params.salonId, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/v1/salons/:salonId`, ({ params }) => HttpResponse.json({ message: 'Deleted', id: params.salonId })),

  // Test endpoints (specific)
  http.get(`${API_URL}/api/test/network-error`, () => HttpResponse.error()),
  http.get(`${API_URL}/api/test/server-error`, () => HttpResponse.json({ error: { message: 'Server error' } }, { status: 500 })),

  // Test endpoints wildcard
  http.get(`${API_URL}/api/test/*`, () => HttpResponse.json({ success: true, data: { test: true } })),
  http.post(`${API_URL}/api/test/*`, async ({ request }) => HttpResponse.json({ success: true, ...(await request.json() as any) })),
  http.put(`${API_URL}/api/test/*`, async ({ request }) => HttpResponse.json({ success: true, ...(await request.json() as any) })),
  http.delete(`${API_URL}/api/test/*`, () => HttpResponse.json({ success: true, message: 'Deleted' })),

  // Catch-all for /api/v1/*
  http.get(`${API_URL}/api/v1/*`, () => HttpResponse.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
  http.post(`${API_URL}/api/v1/*`, async ({ request }) => HttpResponse.json({ id: 'new-id', ...(await request.json() as any), created_at: new Date().toISOString() }, { status: 201 })),
  http.put(`${API_URL}/api/v1/*`, async ({ request }) => HttpResponse.json({ ...(await request.json() as any), updated_at: new Date().toISOString() })),
  http.delete(`${API_URL}/api/v1/*`, () => HttpResponse.json({ message: 'Deleted successfully' })),

  // Catch-all for /api/*
  http.get(`${API_URL}/api/*`, () => HttpResponse.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
  http.post(`${API_URL}/api/*`, async ({ request }) => HttpResponse.json({ id: 'new-id', ...(await request.json() as any), created_at: new Date().toISOString() }, { status: 201 })),
  http.put(`${API_URL}/api/*`, async ({ request }) => HttpResponse.json({ ...(await request.json() as any), updated_at: new Date().toISOString() })),
  http.delete(`${API_URL}/api/*`, () => HttpResponse.json({ message: 'Deleted successfully' })),

  // OPTIONS for CORS
  http.options(`${API_URL}/api/*`, () => new HttpResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } })),
];
