/**
 * MSW Mock API Handlers
 * Comprehensive mocks for all API endpoints used in testing
 */

import { http, HttpResponse } from 'msw';

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Mock data generators
export const mockCustomers = [
  {
    phone_number: '+1234567890',
    name: 'John Doe',
    email: 'john@example.com',
    total_bookings: 5,
    last_seen: '2025-10-15T10:30:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    phone_number: '+0987654321',
    name: 'Jane Smith',
    email: 'jane@example.com',
    total_bookings: 3,
    last_seen: '2025-10-18T14:20:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    phone_number: '+1122334455',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    total_bookings: 0,
    last_seen: '2025-09-01T09:00:00Z',
    created_at: '2025-03-20T00:00:00Z',
  },
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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

export const mockStaff = [
  {
    id: 'staff-1',
    name: 'Alice Johnson',
    email: 'alice@salon.com',
    phone_number: '+1234567890',
    role: 'stylist',
    specializations: ['haircut', 'coloring'],
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'staff-2',
    name: 'Bob Williams',
    email: 'bob@salon.com',
    phone_number: '+0987654321',
    role: 'barber',
    specializations: ['haircut', 'shaving'],
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
  },
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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

export const mockServices = [
  {
    id: 'service-1',
    name: 'Haircut',
    description: 'Professional haircut service',
    duration_minutes: 30,
    price: 50,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'service-2',
    name: 'Hair Coloring',
    description: 'Full hair coloring service',
    duration_minutes: 120,
    price: 150,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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

export const mockTemplates = [
  {
    id: 'template-1',
    name: 'Booking Confirmation',
    content: 'Hi {customer_name}, your booking is confirmed for {date} at {time}.',
    variables: ['customer_name', 'date', 'time'],
    type: 'booking_confirmation',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    name: 'Booking Reminder',
    content: 'Hi {customer_name}, reminder: your appointment is tomorrow at {time}.',
    variables: ['customer_name', 'time'],
    type: 'booking_reminder',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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

export const mockBookings = [
  {
    id: 'booking-1',
    customer_phone: '+1234567890',
    customer_name: 'John Doe',
    service_id: 'service-1',
    service_name: 'Haircut',
    staff_id: 'staff-1',
    staff_name: 'Alice Johnson',
    start_time: '2025-10-25T10:00:00Z',
    end_time: '2025-10-25T10:30:00Z',
    status: 'confirmed',
    price: 50,
    notes: 'Customer prefers short style',
    created_at: '2025-10-20T00:00:00Z',
  },
  {
    id: 'booking-2',
    customer_phone: '+0987654321',
    customer_name: 'Jane Smith',
    service_id: 'service-2',
    service_name: 'Hair Coloring',
    staff_id: 'staff-1',
    staff_name: 'Alice Johnson',
    start_time: '2025-10-26T14:00:00Z',
    end_time: '2025-10-26T16:00:00Z',
    status: 'pending',
    price: 150,
    notes: '',
    created_at: '2025-10-20T00:00:00Z',
  },
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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

// API Handlers
export const handlers = [
  // Authentication endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'admin@salon.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: 'user-1',
          email: 'admin@salon.com',
          name: 'Admin User',
          role: 'admin',
        },
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 'user-new',
        email: body.email,
        name: body.name,
        role: 'user',
      },
    }, { status: 201 });
  }),

  http.post(`${API_URL}/auth/forgot-password`, async () => {
    return HttpResponse.json({ message: 'Reset link sent to email' });
  }),

  http.post(`${API_URL}/auth/reset-password`, async () => {
    return HttpResponse.json({ message: 'Password reset successful' });
  }),

  http.post(`${API_URL}/auth/verify-email`, async () => {
    return HttpResponse.json({ message: 'Email verified successfully' });
  }),

  // Customers endpoints
  http.get(`${API_URL}/salons/:salonId/customers`, ({ params, request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredCustomers = [...mockCustomers];

    if (search) {
      filteredCustomers = filteredCustomers.filter(
        c => c.name.toLowerCase().includes(search.toLowerCase()) ||
             c.phone_number.includes(search)
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    return HttpResponse.json({
      data: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: filteredCustomers.length,
        totalPages: Math.ceil(filteredCustomers.length / limit),
      },
    });
  }),

  http.get(`${API_URL}/salons/:salonId/customers/:customerId`, ({ params }) => {
    const customer = mockCustomers.find(c => c.phone_number === params.customerId);

    if (!customer) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(customer);
  }),

  http.post(`${API_URL}/salons/:salonId/customers`, async ({ request }) => {
    const body = await request.json() as any;

    const newCustomer = {
      phone_number: body.phone_number,
      name: body.name,
      email: body.email,
      total_bookings: 0,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  http.put(`${API_URL}/salons/:salonId/customers/:customerId`, async ({ params, request }) => {
    const body = await request.json() as any;
    const customer = mockCustomers.find(c => c.phone_number === params.customerId);

    if (!customer) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ ...customer, ...body });
  }),

  http.delete(`${API_URL}/salons/:salonId/customers/:customerId`, ({ params }) => {
    const customer = mockCustomers.find(c => c.phone_number === params.customerId);

    if (!customer) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Customer deleted successfully' });
  }),

  // Staff endpoints
  http.get(`${API_URL}/salons/:salonId/staff`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: mockStaff,
      pagination: {
        page,
        limit,
        total: mockStaff.length,
        totalPages: Math.ceil(mockStaff.length / limit),
      },
    });
  }),

  http.get(`${API_URL}/salons/:salonId/staff/:staffId`, ({ params }) => {
    const staff = mockStaff.find(s => s.id === params.staffId);

    if (!staff) {
      return HttpResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(staff);
  }),

  http.post(`${API_URL}/salons/:salonId/staff`, async ({ request }) => {
    const body = await request.json() as any;

    const newStaff = {
      id: `staff-${Date.now()}`,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(newStaff, { status: 201 });
  }),

  http.put(`${API_URL}/salons/:salonId/staff/:staffId`, async ({ params, request }) => {
    const body = await request.json() as any;
    const staff = mockStaff.find(s => s.id === params.staffId);

    if (!staff) {
      return HttpResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ ...staff, ...body });
  }),

  http.delete(`${API_URL}/salons/:salonId/staff/:staffId`, ({ params }) => {
    const staff = mockStaff.find(s => s.id === params.staffId);

    if (!staff) {
      return HttpResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Staff member deleted successfully' });
  }),

  // Services endpoints
  http.get(`${API_URL}/salons/:salonId/services`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: mockServices,
      pagination: {
        page,
        limit,
        total: mockServices.length,
        totalPages: Math.ceil(mockServices.length / limit),
      },
    });
  }),

  http.get(`${API_URL}/salons/:salonId/services/:serviceId`, ({ params }) => {
    const service = mockServices.find(s => s.id === params.serviceId);

    if (!service) {
      return HttpResponse.json(
        { message: 'Service not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(service);
  }),

  http.post(`${API_URL}/salons/:salonId/services`, async ({ request }) => {
    const body = await request.json() as any;

    const newService = {
      id: `service-${Date.now()}`,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(newService, { status: 201 });
  }),

  http.put(`${API_URL}/salons/:salonId/services/:serviceId`, async ({ params, request }) => {
    const body = await request.json() as any;
    const service = mockServices.find(s => s.id === params.serviceId);

    if (!service) {
      return HttpResponse.json(
        { message: 'Service not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ ...service, ...body });
  }),

  http.delete(`${API_URL}/salons/:salonId/services/:serviceId`, ({ params }) => {
    const service = mockServices.find(s => s.id === params.serviceId);

    if (!service) {
      return HttpResponse.json(
        { message: 'Service not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Service deleted successfully' });
  }),

  // Templates endpoints
  http.get(`${API_URL}/salons/:salonId/templates`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: mockTemplates,
      pagination: {
        page,
        limit,
        total: mockTemplates.length,
        totalPages: Math.ceil(mockTemplates.length / limit),
      },
    });
  }),

  http.get(`${API_URL}/salons/:salonId/templates/:templateId`, ({ params }) => {
    const template = mockTemplates.find(t => t.id === params.templateId);

    if (!template) {
      return HttpResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(template);
  }),

  http.post(`${API_URL}/salons/:salonId/templates`, async ({ request }) => {
    const body = await request.json() as any;

    const newTemplate = {
      id: `template-${Date.now()}`,
      ...body,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  http.put(`${API_URL}/salons/:salonId/templates/:templateId`, async ({ params, request }) => {
    const body = await request.json() as any;
    const template = mockTemplates.find(t => t.id === params.templateId);

    if (!template) {
      return HttpResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ ...template, ...body });
  }),

  http.delete(`${API_URL}/salons/:salonId/templates/:templateId`, ({ params }) => {
    const template = mockTemplates.find(t => t.id === params.templateId);

    if (!template) {
      return HttpResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Template deleted successfully' });
  }),

  // Bookings endpoints
  http.get(`${API_URL}/salons/:salonId/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: mockBookings,
      pagination: {
        page,
        limit,
        total: mockBookings.length,
        totalPages: Math.ceil(mockBookings.length / limit),
      },
    });
  }),

  http.get(`${API_URL}/salons/:salonId/bookings/:bookingId`, ({ params }) => {
    const booking = mockBookings.find(b => b.id === params.bookingId);

    if (!booking) {
      return HttpResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(booking);
  }),

  http.post(`${API_URL}/salons/:salonId/bookings`, async ({ request }) => {
    const body = await request.json() as any;

    const newBooking = {
      id: `booking-${Date.now()}`,
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(newBooking, { status: 201 });
  }),

  http.put(`${API_URL}/salons/:salonId/bookings/:bookingId`, async ({ params, request }) => {
    const body = await request.json() as any;
    const booking = mockBookings.find(b => b.id === params.bookingId);

    if (!booking) {
      return HttpResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ ...booking, ...body });
  }),

  http.delete(`${API_URL}/salons/:salonId/bookings/:bookingId`, ({ params }) => {
    const booking = mockBookings.find(b => b.id === params.bookingId);

    if (!booking) {
      return HttpResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Booking deleted successfully' });
  }),

  // Dashboard/Analytics endpoints
  http.get(`${API_URL}/salons/:salonId/analytics/dashboard`, () => {
    return HttpResponse.json({
      total_customers: mockCustomers.length,
      total_bookings: mockBookings.length,
      total_revenue: mockBookings.reduce((sum, b) => sum + b.price, 0),
      upcoming_bookings: mockBookings.filter(b => b.status === 'confirmed').length,
      recent_bookings: mockBookings.slice(0, 5),
      revenue_chart: [
        { date: '2025-10-14', revenue: 500 },
        { date: '2025-10-15', revenue: 750 },
        { date: '2025-10-16', revenue: 600 },
        { date: '2025-10-17', revenue: 900 },
        { date: '2025-10-18', revenue: 1200 },
        { date: '2025-10-19', revenue: 800 },
        { date: '2025-10-20', revenue: 1000 },
      ],
    });
  }),

  // Messages endpoints
  http.get(`${API_URL}/salons/:salonId/messages`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const mockMessages = [
      {
        id: 'msg-1',
        customer_phone: '+1234567890',
        customer_name: 'John Doe',
        message: 'Booking confirmed for tomorrow at 10 AM',
        direction: 'outbound',
        status: 'delivered',
        created_at: '2025-10-20T10:00:00Z',
      },
      {
        id: 'msg-2',
        customer_phone: '+0987654321',
        customer_name: 'Jane Smith',
        message: 'Can I reschedule my appointment?',
        direction: 'inbound',
        status: 'received',
        created_at: '2025-10-20T11:30:00Z',
      },
    ];

    return HttpResponse.json({
      data: mockMessages,
      pagination: {
        page,
        limit,
        total: mockMessages.length,
        totalPages: Math.ceil(mockMessages.length / limit),
      },
    });
  }),

  // Settings endpoints
  http.get(`${API_URL}/salons/:salonId/settings`, () => {
    return HttpResponse.json({
      name: 'Demo Salon',
      email: 'contact@demosalon.com',
      phone: '+1234567890',
      address: '123 Main St, City, State 12345',
      timezone: 'America/New_York',
      business_hours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '20:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { open: null, close: null },
      },
    });
  }),

  http.put(`${API_URL}/salons/:salonId/settings`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),
  // Generic test endpoint handlers (without /api/v1 prefix for client tests)
  http.get("http://localhost:4000/api/bookings", () => {
    return HttpResponse.json({
      data: mockBookings,
      pagination: { page: 1, limit: 10, total: mockBookings.length, totalPages: 1 },
    });
  }),

  http.post("http://localhost:4000/api/bookings", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: "booking-new",
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.put("http://localhost:4000/api/bookings/:bookingId", async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.bookingId,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete("http://localhost:4000/api/bookings/:bookingId", ({ params }) => {
    return HttpResponse.json({
      message: "Booking deleted successfully",
      id: params.bookingId,
    });
  }),

  // Test endpoint handlers (catch-all for test routes)
  http.get("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, data: { test: true } });
  }),

  http.post("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.put("http://localhost:4000/api/test/*", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, ...body });
  }),

  http.delete("http://localhost:4000/api/test/*", () => {
    return HttpResponse.json({ success: true, message: "Deleted" });
  }),

  // CORS preflight OPTIONS handlers
  http.options("http://localhost:4000/api/*", () => {
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
