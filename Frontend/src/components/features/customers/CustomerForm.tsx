/**
 * Customer Form Component
 * Reusable form for creating and editing customers
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Card,
  CardContent,
} from '@/components/ui';
import { User, Phone, Mail, Calendar, MapPin, FileText } from 'lucide-react';

// Customer form validation schema
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone_number: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[0-9]+$/, 'Phone number can only contain numbers and optional leading +'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes are too long').optional().or(z.literal('')),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Customer',
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone_number: initialData?.phone_number || '',
      email: initialData?.email || '',
      date_of_birth: initialData?.date_of_birth || '',
      gender: initialData?.gender || '',
      address: initialData?.address || '',
      notes: initialData?.notes || '',
    },
  });

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Basic Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+1234567890"
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone_number?.message}
              {...register('phone_number')}
              required
              disabled={!!initialData?.phone_number}
              hint={initialData?.phone_number ? 'Phone number cannot be changed' : 'Include country code (e.g., +1)'}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Date of Birth"
              type="date"
              leftIcon={<Calendar className="h-4 w-4" />}
              error={errors.date_of_birth?.message}
              {...register('date_of_birth')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Additional Information
          </h3>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <p className="text-xs text-error-500">{errors.gender.message}</p>
                )}
              </div>
              <Input
                label="Address"
                placeholder="123 Main St, City, State"
                leftIcon={<MapPin className="h-4 w-4" />}
                error={errors.address?.message}
                {...register('address')}
              />
            </div>
            <Textarea
              label="Notes"
              placeholder="Additional notes about this customer..."
              rows={4}
              error={errors.notes?.message}
              showCount
              maxLength={1000}
              {...register('notes')}
            />
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
