/**
 * Analytics React Query Hooks
 * WhatsApp SaaS Platform
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { api } from '@/lib/api';
import apiClient from '@/lib/api/client';
import type {
  DashboardStats,
  AnalyticsResponse,
  GetDashboardStatsParams,
  GetAnalyticsParams,
} from '@/types';
import type {
  StaffPerformanceResponse,
  ServicePerformanceResponse,
  RevenueAnalyticsResponse,
  CustomerAnalyticsResponse,
  AIPerformanceResponse,
  AnalyticsParams,
} from '@/types/analytics';
import type { UseQueryOptions } from '@tanstack/react-query';

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats(
  salonId: string,
  params?: GetDashboardStatsParams,
  options?: Omit<UseQueryOptions<DashboardStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(salonId, params || {}),
    queryFn: () => api.analytics.getDashboard(salonId, params),
    enabled: !!salonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  });
}

/**
 * Fetch booking analytics
 */
export function useBookingAnalytics(
  salonId: string,
  params?: GetAnalyticsParams,
  options?: Omit<UseQueryOptions<AnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.bookings(salonId, params || {}),
    queryFn: () => api.analytics.getBookingAnalytics(salonId, params),
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch message analytics
 */
export function useMessageAnalytics(
  salonId: string,
  params?: GetAnalyticsParams,
  options?: Omit<UseQueryOptions<AnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.messages(salonId, params || {}),
    queryFn: () => api.analytics.getMessageAnalytics(salonId, params),
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch revenue analytics
 */
export function useRevenueAnalytics(
  salonId: string,
  params?: GetAnalyticsParams,
  options?: Omit<UseQueryOptions<AnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue(salonId, params || {}),
    queryFn: () => api.analytics.getRevenueAnalytics(salonId, params),
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch staff performance analytics
 */
export function useStaffPerformance(
  params: AnalyticsParams,
  options?: Omit<UseQueryOptions<StaffPerformanceResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['analytics', 'staff-performance', params],
    queryFn: async () => {
      const response = await apiClient.get<{ data: StaffPerformanceResponse }>(
        '/analytics/staff-performance',
        { params }
      );
      return response.data.data;
    },
    enabled: !!params.salon_id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch service performance analytics
 */
export function useServicePerformance(
  params: AnalyticsParams,
  options?: Omit<UseQueryOptions<ServicePerformanceResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['analytics', 'service-performance', params],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ServicePerformanceResponse }>(
        '/analytics/service-performance',
        { params }
      );
      return response.data.data;
    },
    enabled: !!params.salon_id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch detailed revenue analytics
 */
export function useDetailedRevenueAnalytics(
  params: AnalyticsParams,
  options?: Omit<UseQueryOptions<RevenueAnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['analytics', 'revenue-detailed', params],
    queryFn: async () => {
      const response = await apiClient.get<{ data: RevenueAnalyticsResponse }>(
        '/analytics/revenue',
        { params }
      );
      return response.data.data;
    },
    enabled: !!params.salon_id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch customer analytics
 */
export function useCustomerAnalytics(
  params: AnalyticsParams,
  options?: Omit<UseQueryOptions<CustomerAnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['analytics', 'customers', params],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CustomerAnalyticsResponse }>(
        '/analytics/customers',
        { params }
      );
      return response.data.data;
    },
    enabled: !!params.salon_id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch AI performance analytics
 */
export function useAIPerformance(
  params: AnalyticsParams,
  options?: Omit<UseQueryOptions<AIPerformanceResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['analytics', 'ai-performance', params],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AIPerformanceResponse }>(
        '/analytics/ai-performance',
        { params }
      );
      return response.data.data;
    },
    enabled: !!params.salon_id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Export analytics data
 */
export async function exportAnalyticsData(
  type: 'staff' | 'service' | 'revenue' | 'customer' | 'ai',
  params: AnalyticsParams,
  format: 'csv' | 'pdf' = 'csv'
): Promise<Blob> {
  const response = await apiClient.get(`/analytics/export/${type}`, {
    params: { ...params, format },
    responseType: 'blob',
  });
  return response.data;
}
