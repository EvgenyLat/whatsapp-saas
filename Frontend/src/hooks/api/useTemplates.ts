/**
 * Template React Query Hooks
 * WhatsApp SaaS Platform
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type {
  Template,
  GetTemplatesParams,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  PaginatedResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all templates for a salon
 */
export function useTemplates(
  salonId: string,
  params?: GetTemplatesParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Template>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.templates.list(salonId, params || {}),
    queryFn: () => api.templates.getAll(salonId, params),
    enabled: !!salonId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Fetch a single template by ID
 */
export function useTemplate(
  templateId: string,
  options?: Omit<UseQueryOptions<Template, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.templates.detail(templateId),
    queryFn: () => api.templates.getById(templateId),
    enabled: !!templateId,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Create a new template
 */
export function useCreateTemplate(
  salonId: string,
  options?: UseMutationOptions<Template, Error, CreateTemplateRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => api.templates.create(salonId, data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [queryKeys.templates.all]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update a template
 */
export function useUpdateTemplate(
  templateId: string,
  options?: UseMutationOptions<Template, Error, UpdateTemplateRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTemplateRequest) => api.templates.update(templateId, data),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.templates.lists(),
        queryKeys.templates.detail(templateId),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate(
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => api.templates.delete(templateId),
    onSuccess: async (data, variables, context) => {
      await invalidateQueries(queryClient, [
        queryKeys.templates.all,
        queryKeys.templates.detail(variables),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
