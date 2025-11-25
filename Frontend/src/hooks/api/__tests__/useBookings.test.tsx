/**
 * Booking Hooks Tests
 * WhatsApp SaaS Platform
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookings, useCreateBooking } from '../useBookings';
import { api } from '@/lib/api';
import type { Booking, PaginatedResponse } from '@/types';
import { BookingStatus } from '@/types';
import React from 'react';

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    bookings: {
      getAll: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockBooking: Booking = {
  id: 'booking-1',
  booking_code: 'BK001',
  salon_id: 'salon-1',
  customer_phone: '+1234567890',
  customer_name: 'John Doe',
  service: 'Haircut',
  start_ts: new Date().toISOString(),
  status: BookingStatus.CONFIRMED,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockResponse: PaginatedResponse<Booking> = {
  success: true,
  data: [mockBooking],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
  timestamp: new Date().toISOString(),
};

describe('useBookings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch bookings successfully', async () => {
    (api.bookings.getAll as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBookings('salon-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(api.bookings.getAll).toHaveBeenCalledWith('salon-1', undefined);
  });

  it('should fetch bookings with filters', async () => {
    (api.bookings.getAll as jest.Mock).mockResolvedValue(mockResponse);

    const filters = { status: BookingStatus.CONFIRMED, page: 1, limit: 10 };
    const { result } = renderHook(() => useBookings('salon-1', filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.bookings.getAll).toHaveBeenCalledWith('salon-1', filters);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');
    (api.bookings.getAll as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useBookings('salon-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch if salonId is missing', () => {
    const { result } = renderHook(() => useBookings(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(api.bookings.getAll).not.toHaveBeenCalled();
  });
});

describe('useCreateBooking', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should create booking successfully', async () => {
    (api.bookings.create as jest.Mock).mockResolvedValue(mockBooking);

    const { result } = renderHook(() => useCreateBooking('salon-1'), { wrapper });

    const newBooking = {
      customer_phone: '+1234567890',
      customer_name: 'John Doe',
      service: 'Haircut',
      start_ts: new Date().toISOString(),
    };

    await waitFor(() => {
      result.current.mutate(newBooking);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBooking);
    expect(api.bookings.create).toHaveBeenCalledWith('salon-1', newBooking);
  });

  it('should handle creation errors', async () => {
    const error = new Error('Failed to create');
    (api.bookings.create as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateBooking('salon-1'), { wrapper });

    const newBooking = {
      customer_phone: '+1234567890',
      customer_name: 'John Doe',
      service: 'Haircut',
      start_ts: new Date().toISOString(),
    };

    await waitFor(() => {
      result.current.mutate(newBooking);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
