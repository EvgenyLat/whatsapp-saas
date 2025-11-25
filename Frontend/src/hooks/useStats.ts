/**
 * useStats Hook
 * React Query hook for fetching dashboard statistics
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useStats(salonId: string) {
  return useQuery<DashboardStats>({
    queryKey: ['stats', salonId],
    queryFn: () => analyticsApi.getDashboard(salonId),
    enabled: !!salonId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
