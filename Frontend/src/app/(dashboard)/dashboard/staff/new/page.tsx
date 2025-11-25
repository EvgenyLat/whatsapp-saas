/**
 * New Staff Member Page
 * Form for creating a new staff member
 *
 * User Story: US2 - Add New Staff Member
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StaffForm, type StaffFormData } from '@/components/features/staff/StaffForm';
import { PageHeader } from '@/components/shared';
import { useCreateMaster } from '@/hooks';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { Card, CardContent, Button } from '@/components/ui';
import type { CreateMasterRequest } from '@/types';

export default function NewStaffPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();
  const createMaster = useCreateMaster(salonId || '');

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (data: StaffFormData) => {
    try {
      setError(null);

      if (!salonId) {
        setError('Salon ID is missing. Please try refreshing the page.');
        return;
      }

      // Validate specialization
      if (!data.specialization || data.specialization.length === 0) {
        setError('Please select at least one service');
        return;
      }

      // Convert form data to CreateMasterRequest format
      const masterData: CreateMasterRequest = {
        salon_id: salonId,
        name: data.name,
        specialization: data.specialization,
        // Default working hours: Mon-Fri 9:00-18:00
        working_hours: {
          monday: { enabled: true, start: '09:00', end: '18:00' },
          tuesday: { enabled: true, start: '09:00', end: '18:00' },
          wednesday: { enabled: true, start: '09:00', end: '18:00' },
          thursday: { enabled: true, start: '09:00', end: '18:00' },
          friday: { enabled: true, start: '09:00', end: '18:00' },
          saturday: { enabled: false },
          sunday: { enabled: false },
        },
      };

      // Create staff member using React Query mutation
      const staff = await createMaster.mutateAsync(masterData);

      // Navigate to staff details page on success
      router.push(`/dashboard/staff/${staff.id}`);
    } catch (err: any) {
      console.error('Failed to create staff member:', err);
      setError(err.message || 'Failed to create staff member. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/staff');
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard/staff"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Staff</span>
      </Link>

      {/* Page Header */}
      <PageHeader
        title="Add Staff Member"
        description="Enter name and select services this staff member provides"
      />

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Staff Form */}
      <StaffForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMaster.isPending}
        submitLabel="Add Staff Member"
      />
    </div>
  );
}
