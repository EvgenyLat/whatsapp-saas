/**
 * Message React Query Hooks
 * WhatsApp SaaS Platform
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type {
  Message,
  GetMessagesParams,
  SendMessageRequest,
  SendTemplateMessageRequest,
  PaginatedResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all messages for a salon
 */
export function useMessages(
  salonId: string,
  params?: GetMessagesParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Message>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.messages.list(salonId, params || {}),
    queryFn: () => api.messages.getAll(salonId, params),
    enabled: !!salonId,
    staleTime: 30 * 1000, // 30 seconds for real-time feel
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    ...options,
  });
}

/**
 * Fetch a single message by ID
 */
export function useMessage(
  messageId: string,
  options?: Omit<UseQueryOptions<Message, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.messages.detail(messageId),
    queryFn: () => api.messages.getById(messageId),
    enabled: !!messageId,
    ...options,
  });
}

/**
 * Send a text message
 */
export function useSendMessage(
  salonId: string,
  options?: UseMutationOptions<Message, Error, SendMessageRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => api.messages.send(salonId, data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.messages.lists(),
        queryKeys.conversations.all,
        queryKeys.analytics.dashboard(salonId),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Send a template message
 */
export function useSendTemplateMessage(
  salonId: string,
  options?: UseMutationOptions<Message, Error, SendTemplateMessageRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendTemplateMessageRequest) => api.messages.sendTemplate(salonId, data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.messages.lists(),
        queryKeys.conversations.all,
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Mark message as read
 */
export function useMarkAsRead(
  options?: UseMutationOptions<Message, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => api.messages.markAsRead(messageId),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.messages.lists(),
        queryKeys.messages.detail(variables),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
