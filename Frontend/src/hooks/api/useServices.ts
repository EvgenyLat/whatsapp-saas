/**
 * Service React Query Hooks
 * WhatsApp SaaS Platform
 *
 * Provides hooks for service-related operations:
 * - Fetching services (list, single, categories, stats)
 * - Creating services with optimistic updates
 * - Updating services
 * - Deleting services (soft delete/deactivate)
 *
 * @see https://tanstack.com/query/latest
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type {
  Service,
  ServiceListItem,
  GetServicesParams,
  CreateServiceRequest,
  UpdateServiceRequest,
  PaginatedResponse,
  DeleteResponse,
} from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Fetch all services for the authenticated user's salon
 *
 * @param params - Optional filter parameters
 * @param options - React Query options
 * @returns Query result with paginated services
 *
 * @example
 * ```tsx
 * function ServiceList() {
 *   const { data, isLoading, error } = useServices({
 *     category: 'HAIRCUT',
 *     status: 'active',
 *     page: 1,
 *     limit: 20
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <ServiceGrid services={data.data} pagination={data.pagination} />;
 * }
 * ```
 */
export function useServices(
  params?: GetServicesParams,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<ServiceListItem>, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.services.list(params || {}),
    queryFn: () => api.services.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch a single service by ID with statistics
 *
 * @param serviceId - Service ID
 * @param options - React Query options
 * @returns Query result with service details and stats
 *
 * @example
 * ```tsx
 * function ServiceDetail({ serviceId }: Props) {
 *   const { data: service, isLoading } = useService(serviceId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h1>{service.name}</h1>
 *       <p>Total bookings: {service.bookingCount}</p>
 *       <p>Revenue: ${(service.totalRevenue / 100).toFixed(2)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useService(
  serviceId: string,
  options?: Omit<UseQueryOptions<Service, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.services.detail(serviceId),
    queryFn: () => api.services.getById(serviceId),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch category statistics
 * Gets aggregated data for all service categories
 *
 * @param salonId - Optional salon ID (defaults to user's salon)
 * @param options - React Query options
 * @returns Query result with category stats
 *
 * @example
 * ```tsx
 * function CategoryStats() {
 *   const { data: stats } = useServiceCategories();
 *
 *   return (
 *     <div>
 *       {stats.categories.map(cat => (
 *         <CategoryCard
 *           key={cat.category}
 *           name={cat.category}
 *           serviceCount={cat.serviceCount}
 *           totalRevenue={cat.totalRevenue}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
// TODO: Implement getCategoryStats API endpoint
// export function useServiceCategories(
//   salonId?: string,
//   options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
// ) {
//   return useQuery({
//     queryKey: queryKeys.services.categories(salonId),
//     queryFn: () => api.services.getCategoryStats(salonId),
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     ...options,
//   });
// }

/**
 * Fetch service statistics by ID
 * Gets detailed metrics for a specific service
 *
 * @param serviceId - Service ID
 * @param options - React Query options
 * @returns Query result with service stats
 *
 * @example
 * ```tsx
 * function ServiceMetrics({ serviceId }: Props) {
 *   const { data: stats } = useServiceStats(serviceId);
 *
 *   return (
 *     <div>
 *       <Stat label="Total Bookings" value={stats.bookingCount} />
 *       <Stat label="Revenue" value={`$${(stats.totalRevenue / 100).toFixed(2)}`} />
 *       <Stat label="Avg Duration" value={`${stats.avgDuration} min`} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useServiceStats(
  serviceId: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.services.stats(serviceId),
    queryFn: () => api.services.getById(serviceId), // Stats included in service detail
    enabled: !!serviceId,
    staleTime: 1 * 60 * 1000, // 1 minute
    select: (data) => ({
      bookingCount: (data as any).bookingCount || 0,
      totalRevenue: (data as any).totalRevenue || 0,
      avgDuration: data.duration,
    }),
    ...options,
  });
}

/**
 * Create a new service with optimistic updates
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function CreateServiceForm() {
 *   const createService = useCreateService();
 *
 *   const handleSubmit = async (data: CreateServiceRequest) => {
 *     try {
 *       await createService.mutateAsync(data);
 *       toast.success('Service created successfully');
 *       router.push('/dashboard/services');
 *     } catch (error) {
 *       toast.error('Failed to create service');
 *     }
 *   };
 *
 *   return <ServiceForm onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useCreateService(
  options?: UseMutationOptions<Service, Error, CreateServiceRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequest) => {
      // Extract salon_id from data (it should be included in CreateServiceRequest)
      const { salon_id, ...serviceData } = data as any;
      return api.services.create(salon_id, data);
    },
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.services.lists(),
        queryKeys.services.categories(),
        queryKeys.analytics.topServices(''),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Update a service with optimistic updates
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function EditServiceForm({ service }: Props) {
 *   const updateService = useUpdateService();
 *
 *   const handleSubmit = async (data: UpdateServiceRequest) => {
 *     try {
 *       await updateService.mutateAsync({
 *         serviceId: service.id,
 *         data
 *       });
 *       toast.success('Service updated successfully');
 *     } catch (error) {
 *       toast.error('Failed to update service');
 *     }
 *   };
 *
 *   return <ServiceForm defaultValues={service} onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useUpdateService(
  options?: UseMutationOptions<
    Service,
    Error,
    { serviceId: string; data: UpdateServiceRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, data }) => api.services.update(serviceId, data),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.services.lists(),
        queryKeys.services.detail(variables.serviceId),
        queryKeys.services.categories(),
        queryKeys.analytics.topServices(''),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Delete (deactivate) a service with optimistic updates
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function DeleteServiceButton({ serviceId }: Props) {
 *   const deleteService = useDeleteService();
 *
 *   const handleDelete = () => {
 *     if (confirm('Are you sure you want to deactivate this service?')) {
 *       deleteService.mutate(serviceId, {
 *         onSuccess: () => {
 *           toast.success('Service deactivated successfully');
 *           router.push('/dashboard/services');
 *         }
 *       });
 *     }
 *   };
 *
 *   return <Button variant="danger" onClick={handleDelete}>Deactivate</Button>;
 * }
 * ```
 */
export function useDeleteService(
  options?: UseMutationOptions<DeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) => api.services.delete(serviceId),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.services.lists(),
        queryKeys.services.detail(variables),
        queryKeys.services.categories(),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Toggle service status (active/inactive)
 * Convenience hook for quickly enabling/disabling services
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function ServiceToggle({ service }: Props) {
 *   const toggleStatus = useToggleServiceStatus();
 *
 *   const handleToggle = () => {
 *     toggleStatus.mutate({
 *       serviceId: service.id,
 *       status: service.status === 'active' ? 'inactive' : 'active'
 *     });
 *   };
 *
 *   return (
 *     <Switch
 *       checked={service.status === 'active'}
 *       onChange={handleToggle}
 *       loading={toggleStatus.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useToggleServiceStatus(
  options?: UseMutationOptions<
    Service,
    Error,
    { serviceId: string; status: 'active' | 'inactive' }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, status }) =>
      api.services.update(serviceId, { status }),
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      await invalidateQueries(queryClient, [
        queryKeys.services.lists(),
        queryKeys.services.detail(variables.serviceId),
      ]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
