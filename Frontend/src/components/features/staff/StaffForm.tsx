/**
 * Staff Form Component
 * Simplified form for creating and editing staff members (masters)
 * Only requires name and service specializations
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Input,
  Button,
  Card,
  CardContent,
  CheckboxRoot,
} from '@/components/ui';
import { User, Scissors } from 'lucide-react';
import { useServices } from '@/hooks';
import { useSalonIdSafe } from '@/hooks/useSalonId';

// Simplified staff form validation schema
const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  specialization: z.array(z.string()).min(1, 'Please select at least one service'),
});

export type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  initialData?: Partial<StaffFormData>;
  onSubmit: (data: StaffFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function StaffForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
}: StaffFormProps) {
  const salonId = useSalonIdSafe();

  // Fetch available services
  const { data: servicesData, isLoading: servicesLoading } = useServices({
    page: 1,
    limit: 100, // Get all services
    is_active: true, // Only active services
  });

  const services = servicesData?.data || [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: initialData?.name || '',
      specialization: initialData?.specialization || [],
    },
  });

  const handleFormSubmit = async (data: StaffFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (servicesLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent mb-4"></div>
          <p className="text-neutral-600">Loading services...</p>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No services available
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Please create services first before adding staff members
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Staff Member Information
          </h3>

          <div className="space-y-4">
            {/* Name Field */}
            <Input
              label="Staff Name"
              placeholder="e.g., Maria Johnson"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
              required
            />

            {/* Services Multi-Select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Services <span className="text-error-500">*</span>
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select services this staff member provides
              </p>

              <Controller
                name="specialization"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-neutral-300 rounded-md p-4">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-start gap-3 p-3 rounded-md hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <CheckboxRoot
                          checked={field.value?.includes(service.name) || false}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            if (checked) {
                              field.onChange([...currentValue, service.name]);
                            } else {
                              field.onChange(currentValue.filter((v) => v !== service.name));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900">{service.name}</p>
                          <p className="text-xs text-neutral-500">
                            {service.category} • {service.duration_minutes} min • ${Number(service.price).toFixed(2)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              />

              {errors.specialization && (
                <p className="text-xs text-error-500">{errors.specialization.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || isLoading}
          loading={isSubmitting || isLoading}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
