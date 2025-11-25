/**
 * Settings Page - Redirects to Profile
 * Settings have been unified with Profile page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page where all settings are now located
    router.replace('/dashboard/profile');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner label="Redirecting to Profile..." />
    </div>
  );
}
