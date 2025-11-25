/**
 * New Customer Page
 * Form for creating a new customer
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CustomerForm, type CustomerFormData } from '@/components/features/customers/CustomerForm';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { customersApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui';

export default function NewCustomerPage() {
  const router = useRouter();
  const salonId = useSalonIdSafe();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (data: CustomerFormData) => {
    if (!salonId) return;

    try {
      setIsLoading(true);
      setError(null);

      const customer = await customersApi.create(salonId, data);

      // Show success notification (you can implement a toast here)
      console.log('Customer created successfully:', customer);

      // Redirect to customer detail page
      router.push(`/dashboard/customers/${customer.phone_number}`);
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setError(err.message || 'Failed to create customer. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Customers</span>
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Add New Customer</h1>
        <p className="mt-2 text-neutral-600">
          Create a new customer profile with their contact information
        </p>
      </div>

      {/* Error message */}
      {error && (
        <Card className="border-error-200 bg-error-50">
          <CardContent className="py-4">
            <p className="text-sm text-error-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Customer form */}
      <CustomerForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel="Create Customer"
      />
    </div>
  );
}
