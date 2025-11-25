/**
 * Edit Customer Page
 * Form for editing existing customer
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CustomerForm, type CustomerFormData } from '@/components/features/customers/CustomerForm';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { customersApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui';
import type { CustomerProfile } from '@/types';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const salonId = useSalonIdSafe();

  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!salonId) return;

    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        const data = await customersApi.getById(salonId, customerId);
        setCustomer(data);
      } catch (err: any) {
        console.error('Failed to fetch customer:', err);
        setError(err.message || 'Failed to load customer details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [salonId, customerId]);

  const handleSubmit = async (data: CustomerFormData) => {
    if (!salonId) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const updated = await customersApi.update(salonId, customerId, data);

      // Show success notification (you can implement a toast here)
      console.log('Customer updated successfully:', updated);

      // Redirect to customer detail page
      router.push(`/dashboard/customers/${customerId}`);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setSaveError(err.message || 'Failed to update customer. Please try again.');
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
          <p className="mt-4 text-neutral-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </button>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-error-600 font-medium">Failed to load customer</p>
              <p className="mt-2 text-sm text-neutral-500">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Go Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Customer</span>
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Edit Customer</h1>
        <p className="mt-2 text-neutral-600">
          Update customer information for {customer.name || 'this customer'}
        </p>
        {customer.last_seen && (
          <p className="mt-1 text-sm text-neutral-500">
            Last updated: {new Date(customer.last_seen).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Error message */}
      {saveError && (
        <Card className="border-error-200 bg-error-50">
          <CardContent className="py-4">
            <p className="text-sm text-error-700">{saveError}</p>
          </CardContent>
        </Card>
      )}

      {/* Customer form */}
      <CustomerForm
        initialData={{
          name: customer.name || '',
          phone_number: customer.phone_number,
          email: '',
          date_of_birth: '',
          gender: '',
          address: '',
          notes: '',
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSaving}
        submitLabel="Save Changes"
      />
    </div>
  );
}
