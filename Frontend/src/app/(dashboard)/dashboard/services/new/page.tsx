/**
 * New Service Page
 * Form for creating a new service
 *
 * User Story: US6 - Add New Service
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ServiceForm, type ServiceFormData } from '@/components/features/services/ServiceForm';
import { PageHeader } from '@/components/shared';
import { useCreateService } from '@/hooks';
import { Card, CardContent } from '@/components/ui';
import type { CreateServiceRequest } from '@/types';
import { useSalonIdSafe } from '@/hooks/useSalonId';

export default function NewServicePage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();
  const createService = useCreateService();

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (data: ServiceFormData) => {
    try {
      setError(null);

      if (!salonId) {
        setError('Salon ID is missing. Please try refreshing the page.');
        return;
      }

      // Prepare data for backend
      const requestData: CreateServiceRequest = {
        salon_id: salonId,
        name: data.name,
        category: data.category, // Already in uppercase format (HAIRCUT, MASSAGE, etc.)
        description: data.description || undefined,
        duration_minutes: data.duration_minutes,
        price: data.price, // Backend expects decimal format (50.0), not cents
        // Note: status is not sent to backend (not in CreateServiceRequest)
      };

      // Create service using React Query mutation
      const service = await createService.mutateAsync(requestData);

      // Navigate to service details page on success
      router.push(`/dashboard/services/${service.id}`);
    } catch (err: any) {
      console.error('Failed to create service:', err);
      setError(err.message || 'Failed to create service. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/services');
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Services</span>
      </Link>

      {/* Page Header */}
      <PageHeader
        title="Add New Service"
        description="Create a new service with pricing and duration"
      />

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Service Form */}
      <ServiceForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createService.isPending}
        submitLabel="Create Service"
      />
    </div>
  );
}
