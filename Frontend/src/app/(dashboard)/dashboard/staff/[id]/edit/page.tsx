/**
 * Edit Staff Member Page
 * Form for editing an existing staff member
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StaffForm, type StaffFormData } from '@/components/features/staff/StaffForm';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { staffApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui';

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;
  const salonId = useSalonIdSafe();

  const [staff, setStaff] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!salonId) return;

    const fetchStaff = async () => {
      try {
        const data = await staffApi.getById(salonId, staffId);
        setStaff(data);
      } catch (err) {
        console.error('Failed to fetch staff member:', err);
        setError('Failed to load staff member');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [salonId, staffId]);

  const handleSubmit = async (data: StaffFormData) => {
    if (!salonId) return;

    try {
      setIsSaving(true);
      setError(null);

      const updated = await staffApi.update(salonId, staffId, data);
      console.log('Staff member updated successfully:', updated);
      router.push(`/dashboard/staff/${staffId}`);
    } catch (err: any) {
      console.error('Failed to update staff member:', err);
      setError(err.message || 'Failed to update staff member. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-error-600 font-medium">Staff member not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Staff Details</span>
      </button>

      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Edit Staff Member</h1>
        <p className="mt-2 text-neutral-600">Update staff member information</p>
      </div>

      {error && (
        <Card className="border-error-200 bg-error-50">
          <CardContent className="py-4">
            <p className="text-sm text-error-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <StaffForm
        initialData={staff}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSaving}
        submitLabel="Update Staff Member"
        isEdit
      />
    </div>
  );
}
