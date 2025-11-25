/**
 * BookingForm Component
 * WhatsApp SaaS Platform
 *
 * Form for creating/editing bookings with:
 * - Customer name
 * - Customer phone
 * - Service selection
 * - Date picker
 * - Time picker
 * - Notes (optional)
 * - Submit button with loading state
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, Briefcase, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FormField } from './FormField';
import { createBookingSchema, type CreateBookingInput } from '@/types';
import { cn } from '@/lib/utils';

export interface BookingFormProps {
  initialData?: Partial<CreateBookingInput>;
  onSubmit: (data: CreateBookingInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isEdit?: boolean;
  className?: string;
}

/**
 * BookingForm Component
 *
 * @example
 * ```tsx
 * <BookingForm
 *   onSubmit={async (data) => {
 *     await createBooking(data);
 *   }}
 *   onCancel={() => router.back()}
 *   submitLabel="Create Booking"
 * />
 * ```
 */
export const BookingForm = memo(function BookingForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Booking',
  isEdit = false,
  className,
}: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const methods = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customer_name: initialData?.customer_name || '',
      customer_phone: initialData?.customer_phone || '',
      service: initialData?.service || '',
      start_ts: initialData?.start_ts || '',
      booking_code: initialData?.booking_code || '',
    },
  });

  const handleSubmit = useCallback(async (data: CreateBookingInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Combine date and time if they're separate
      const formData = {
        ...data,
        // Ensure start_ts is in ISO format
        start_ts: typeof data.start_ts === 'string' ? data.start_ts : new Date(data.start_ts).toISOString(),
      };

      await onSubmit(formData);
      setSuccess(isEdit ? 'Booking updated successfully!' : 'Booking created successfully!');

      if (!isEdit) {
        methods.reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      console.error('Booking form error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit, isEdit, methods]);

  return (
    <div className={cn('w-full max-w-2xl', className)}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6" aria-label={isEdit ? 'Edit booking form' : 'Create booking form'}>
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Customer Information</h3>

            <FormField
              name="customer_name"
              label="Customer Name"
              type="text"
              placeholder="John Doe"
              leftIcon={<User size={16} />}
              disabled={isLoading}
            />

            <FormField
              name="customer_phone"
              label="Customer Phone"
              type="tel"
              placeholder="+1234567890"
              leftIcon={<Phone size={16} />}
              disabled={isLoading}
              hint="Include country code (e.g., +1)"
            />
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Booking Details</h3>

            <FormField
              name="service"
              label="Service"
              type="text"
              placeholder="Haircut, Coloring, Styling..."
              leftIcon={<Briefcase size={16} />}
              disabled={isLoading}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="start_ts"
                label="Date & Time"
                type="datetime-local"
                leftIcon={<Calendar size={16} />}
                disabled={isLoading}
              />
            </div>

            <FormField
              name="booking_code"
              label="Booking Code (Optional)"
              type="text"
              placeholder="Leave empty to auto-generate"
              leftIcon={<FileText size={16} />}
              disabled={isLoading}
              hint="A unique code will be generated if not provided"
            />
          </div>

          {/* Success Alert */}
          {success && (
            <Alert type="success" message={success} className="animate-in fade-in-0 slide-in-from-top-2" />
          )}

          {/* Error Alert */}
          {error && (
            <Alert type="error" message={error} className="animate-in fade-in-0 slide-in-from-top-2" />
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : submitLabel}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
});

BookingForm.displayName = 'BookingForm';
