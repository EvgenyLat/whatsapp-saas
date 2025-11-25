/**
 * useSalonId Hook
 *
 * Returns the authenticated user's salon ID.
 * Used across all salon-specific pages (staff, services, bookings, etc).
 *
 * Two variants:
 * - useSalonId(): throws error if no salon (use in dashboard pages)
 * - useSalonIdSafe(): returns null if no salon (use in optional contexts)
 *
 * @example
 * ```tsx
 * function StaffPage() {
 *   const salonId = useSalonId(); // Throws if no salon
 *   const { data } = useMasters(salonId, { page: 1 });
 *
 *   return <StaffList data={data} />;
 * }
 * ```
 */

'use client';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Get salon ID (throws if no salon)
 * Use in dashboard pages where salon is required
 */
export function useSalonId(): string {
  const { salon, user } = useAuthStore();

  // Return salon.id if available
  if (salon?.id) {
    return salon.id;
  }

  // Fallback to user.salon_id if salon not loaded yet
  if (user?.salon_id) {
    return user.salon_id;
  }

  // Throw error if no salon
  throw new Error('No salon found. User has not set up a salon yet.');
}

/**
 * Get salon ID (safe - returns null if no salon)
 * Use in optional contexts where salon might not exist
 */
export function useSalonIdSafe(): string | null {
  const { salon, user } = useAuthStore();

  // Debug logging
  console.log('[useSalonIdSafe]', {
    salon_id: salon?.id,
    user_salon_id: user?.salon_id,
    has_salon: !!salon,
    has_user: !!user,
  });

  // Return salon.id if available
  if (salon?.id) {
    console.log('[useSalonIdSafe] Returning salon.id:', salon.id);
    return salon.id;
  }

  // Fallback to user.salon_id if salon not loaded yet
  if (user?.salon_id) {
    console.log('[useSalonIdSafe] Returning user.salon_id:', user.salon_id);
    return user.salon_id;
  }

  console.log('[useSalonIdSafe] Returning null - no salon_id found');
  return null;
}
