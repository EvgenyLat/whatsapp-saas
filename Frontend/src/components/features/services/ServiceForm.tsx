/**
 * Service Form Component
 * Reusable form for creating and editing services
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
import { Scissors, Tag, Clock, DollarSign, FileText } from 'lucide-react';

// Service form validation schema
const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Name is too long'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
  duration_minutes: z.coerce.number().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  initialData?: Partial<ServiceFormData>;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const CATEGORIES = [
  { value: 'HAIRCUT', label: 'Haircut' },
  { value: 'COLORING', label: 'Coloring' },
  { value: 'MANICURE', label: 'Manicure' },
  { value: 'PEDICURE', label: 'Pedicure' },
  { value: 'FACIAL', label: 'Facial' },
  { value: 'MASSAGE', label: 'Massage' },
  { value: 'WAXING', label: 'Waxing' },
  { value: 'OTHER', label: 'Other' },
];

export function ServiceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Service',
}: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || '',
      description: initialData?.description || '',
      duration_minutes: initialData?.duration_minutes || 30,
      price: initialData?.price || 0, // Price is already in decimal format
      status: initialData?.status || 'active',
    },
  });

  const handleFormSubmit = async (data: ServiceFormData) => {
    try {
      // Submit data as-is (price in decimal format, not cents)
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const priceValue = watch('price');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Service Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Service Name"
              placeholder="Premium Haircut"
              leftIcon={<Scissors className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
              required
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Category <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <select
                  {...register('category')}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white pl-10 pr-3 py-2 text-base transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p className="text-xs text-error-500">{errors.category.message}</p>
              )}
            </div>
            <Input
              label="Duration (minutes)"
              type="number"
              placeholder="30"
              leftIcon={<Clock className="h-4 w-4" />}
              error={errors.duration_minutes?.message}
              {...register('duration_minutes')}
              required
              min="15"
              max="480"
            />
            <div className="space-y-2">
              <label htmlFor="price" className="block text-sm font-medium text-neutral-700">
                Price <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  {...register('price')}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white pl-10 pr-3 py-2 text-base transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {errors.price && (
                <p className="text-xs text-error-500">{errors.price.message}</p>
              )}
              <p className="text-xs text-neutral-500">
                Price in dollars (e.g., 50.00 = $50.00)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Additional Details
          </h3>
          <div className="space-y-4">
            <Textarea
              label="Description"
              placeholder="Describe this service..."
              rows={4}
              error={errors.description?.message}
              showCount
              maxLength={500}
              {...register('description')}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Status
              </label>
              <select
                {...register('status')}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-xs"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="text-xs text-error-500">{errors.status.message}</p>
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
