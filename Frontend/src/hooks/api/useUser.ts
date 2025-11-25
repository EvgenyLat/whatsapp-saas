/**
 * User React Query Hooks
 * WhatsApp SaaS Platform
 *
 * Provides hooks for user profile operations:
 * - Fetching current user profile
 * - Updating user profile
 * - Changing password
 * - Email verification
 *
 * @see https://tanstack.com/query/latest
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { invalidateQueries } from '@/lib/query/mutations';
import { api } from '@/lib/api';
import type { User } from '@/types';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Update user profile request
 */
export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/**
 * Fetch current user profile
 * Auto-enabled when user is authenticated
 *
 * @param options - React Query options
 * @returns Query result with user data
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { data: user, isLoading } = useUserProfile();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <ProfileCard user={user} />;
 * }
 * ```
 */
export function useUserProfile(
  options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>
) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => api.auth.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Update user profile
 * Updates auth store on success
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function EditProfileForm() {
 *   const updateProfile = useUpdateUserProfile();
 *
 *   const handleSubmit = async (data: UpdateUserProfileRequest) => {
 *     try {
 *       await updateProfile.mutateAsync(data);
 *       toast.success('Profile updated successfully');
 *     } catch (error) {
 *       toast.error('Failed to update profile');
 *     }
 *   };
 *
 *   return <ProfileForm onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useUpdateUserProfile(
  options?: UseMutationOptions<User, Error, UpdateUserProfileRequest>
) {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (data: UpdateUserProfileRequest) => {
      // Note: Backend endpoint needs to be created - PUT /api/v1/users/me
      const response = await api.auth.getProfile(); // Placeholder
      // TODO: Replace with actual update endpoint when backend is ready
      // const response = await apiClient.put<User>('/users/me', data);
      return response;
    },
    onSuccess: async (data, variables, context) => {
      // Update auth store with new user data
      updateUser(data);

      // Invalidate related queries
      await invalidateQueries(queryClient, [queryKeys.user.profile()]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Change user password
 * Requires current password for verification
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function ChangePasswordForm() {
 *   const changePassword = useChangePassword();
 *
 *   const handleSubmit = async (data: ChangePasswordRequest) => {
 *     try {
 *       await changePassword.mutateAsync(data);
 *       toast.success('Password changed successfully');
 *       form.reset();
 *     } catch (error) {
 *       toast.error('Failed to change password');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Input name="old_password" type="password" label="Current Password" />
 *       <Input name="new_password" type="password" label="New Password" />
 *       <Button type="submit">Change Password</Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useChangePassword(
  options?: UseMutationOptions<void, Error, ChangePasswordRequest>
) {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      api.auth.changePassword(data.old_password, data.new_password),
    ...options,
  });
}

/**
 * Request email verification
 * Sends verification email to user's current email
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function VerifyEmailButton() {
 *   const requestVerification = useRequestEmailVerification();
 *
 *   return (
 *     <Button
 *       onClick={() => requestVerification.mutate()}
 *       loading={requestVerification.isPending}
 *     >
 *       Send Verification Email
 *     </Button>
 *   );
 * }
 * ```
 */
export function useRequestEmailVerification(
  options?: UseMutationOptions<void, Error, void>
) {
  return useMutation({
    mutationFn: async () => {
      // TODO: Implement when backend endpoint is ready
      // await api.auth.requestEmailVerification();
      throw new Error('Email verification not implemented yet');
    },
    ...options,
  });
}

/**
 * Verify email with token
 * Called after user clicks verification link in email
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * function VerifyEmailPage({ token }: { token: string }) {
 *   const verifyEmail = useVerifyEmail();
 *
 *   React.useEffect(() => {
 *     verifyEmail.mutate(token);
 *   }, [token]);
 *
 *   if (verifyEmail.isPending) return <Spinner />;
 *   if (verifyEmail.isSuccess) return <SuccessMessage />;
 *   if (verifyEmail.isError) return <ErrorMessage />;
 * }
 * ```
 */
export function useVerifyEmail(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => api.auth.verifyEmail(token),
    onSuccess: async (data, variables, context) => {
      // Invalidate user profile to get updated verification status
      await invalidateQueries(queryClient, [queryKeys.user.profile()]);

      // Call user-provided onSuccess
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
