/**
 * Salon Management Page
 * Comprehensive salon management interface including:
 * - Basic salon information editing
 * - Business hours configuration
 * - Statistics overview
 * - Danger zone (delete salon)
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Switch,
  LoadingSpinner,
  Alert,
  Badge,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui';
import { useSalon, useCreateSalon, useUpdateSalon, useDeleteSalon } from '@/hooks/api/useSalons';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  Trash2,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react';

/**
 * Salon info update schema
 */
const salonInfoSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters'),
  address: z.string().optional(),
  phone_number_id: z.string().optional(),
  access_token: z.string().optional(),
  is_active: z.boolean(),
  // Working hours configuration
  working_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  working_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  slot_duration_minutes: z.number().min(5, 'Minimum 5 minutes').max(240, 'Maximum 240 minutes'),
});

type SalonInfoFormData = z.infer<typeof salonInfoSchema>;

/**
 * Days of week for business hours
 */
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

/**
 * Salon Info Section
 */
function SalonInfoSection({ salonId }: { salonId: string }) {
  const { data: salon, isLoading, error } = useSalon(salonId);
  const updateSalon = useUpdateSalon(salonId);
  const [isEditing, setIsEditing] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SalonInfoFormData>({
    resolver: zodResolver(salonInfoSchema),
    defaultValues: {
      name: salon?.name || '',
      address: salon?.address || '',
      phone_number_id: salon?.phone_number_id || '',
      access_token: '',
      is_active: salon?.is_active ?? true,
      working_hours_start: salon?.working_hours_start || '09:00',
      working_hours_end: salon?.working_hours_end || '20:00',
      slot_duration_minutes: salon?.slot_duration_minutes || 30,
    },
  });

  // Update form when salon data loads
  React.useEffect(() => {
    if (salon) {
      reset({
        name: salon.name,
        address: salon.address || '',
        phone_number_id: salon.phone_number_id,
        access_token: '',
        is_active: salon.is_active,
        working_hours_start: salon.working_hours_start || '09:00',
        working_hours_end: salon.working_hours_end || '20:00',
        slot_duration_minutes: salon.slot_duration_minutes || 30,
      });
    }
  }, [salon, reset]);

  const isActive = watch('is_active');

  const onSubmit = async (data: SalonInfoFormData) => {
    try {
      // Only send access_token if it was changed
      const updateData: any = {
        name: data.name,
        is_active: data.is_active,
        working_hours_start: data.working_hours_start,
        working_hours_end: data.working_hours_end,
        slot_duration_minutes: data.slot_duration_minutes,
      };

      if (data.address !== undefined) {
        updateData.address = data.address;
      }

      if (data.phone_number_id) {
        updateData.phone_number_id = data.phone_number_id;
      }

      if (data.access_token) {
        updateData.access_token = data.access_token;
      }

      await updateSalon.mutateAsync(updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update salon:', error);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <LoadingSpinner label="Loading salon information..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !salon) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert
            type="error"
            message="Failed to load salon information"
            showIcon
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Salon Information</CardTitle>
          {!isEditing && (
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Salon name and status */}
          <div className="flex items-center gap-4 pb-6 border-b border-neutral-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <Store className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900">{salon.name}</h3>
              <Badge variant={salon.is_active ? 'success' : 'default'}>
                {salon.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Salon Name
              </label>
              <Input
                {...register('name')}
                placeholder="My Beautiful Salon"
                disabled={!isEditing}
                error={errors.name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Address
              </label>
              <Input
                {...register('address')}
                placeholder="123 Main Street, New York, NY 10001"
                disabled={!isEditing}
                error={errors.address?.message}
              />
              <p className="mt-1 text-sm text-neutral-500">
                Physical location of your salon (optional)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                WhatsApp Phone Number ID
              </label>
              <Input
                {...register('phone_number_id')}
                placeholder="Enter WhatsApp Phone Number ID"
                disabled={!isEditing}
                error={errors.phone_number_id?.message}
              />
              <p className="mt-1 text-sm text-neutral-500">
                Get this from your Facebook Business Manager
              </p>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  WhatsApp Access Token
                </label>
                <Input
                  {...register('access_token')}
                  type="password"
                  placeholder="Enter new access token (leave empty to keep current)"
                  disabled={!isEditing}
                  error={errors.access_token?.message}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Only enter if you want to update the access token
                </p>
              </div>
            )}

            {/* Working Hours Configuration */}
            <div className="pt-4 border-t border-neutral-200">
              <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Hours
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Opening Time
                  </label>
                  <Input
                    {...register('working_hours_start')}
                    type="time"
                    disabled={!isEditing}
                    error={errors.working_hours_start?.message}
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    When your salon opens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Closing Time
                  </label>
                  <Input
                    {...register('working_hours_end')}
                    type="time"
                    disabled={!isEditing}
                    error={errors.working_hours_end?.message}
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    When your salon closes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Slot Duration (minutes)
                  </label>
                  <Input
                    {...register('slot_duration_minutes', { valueAsNumber: true })}
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    disabled={!isEditing}
                    error={errors.slot_duration_minutes?.message}
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    Booking time intervals
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-neutral-700">Salon Status</p>
                <p className="text-sm text-neutral-500">
                  {isActive ? 'Salon is active and accepting bookings' : 'Salon is inactive'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Action buttons */}
          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                variant="primary"
                disabled={updateSalon.isPending}
              >
                {updateSalon.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={updateSalon.isPending}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Success/Error messages */}
          {updateSalon.isSuccess && (
            <Alert
              type="success"
              message="Salon information updated successfully"
              showIcon
            />
          )}

          {updateSalon.isError && (
            <Alert
              type="error"
              message="Failed to update salon information. Please try again."
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Salon Statistics Section
 */
function SalonStatsSection({ salonId }: { salonId: string }) {
  // Mock statistics - in production these would come from analytics API
  const stats = {
    totalServices: 15,
    totalMasters: 8,
    bookingsThisMonth: 247,
    revenueThisMonth: 15420,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salon Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Store className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-900">{stats.totalServices}</p>
              <p className="text-sm text-primary-600">Total Services</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100">
              <Users className="h-6 w-6 text-secondary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-900">{stats.totalMasters}</p>
              <p className="text-sm text-secondary-600">Total Masters</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-success-50 rounded-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
              <Calendar className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success-900">{stats.bookingsThisMonth}</p>
              <p className="text-sm text-success-600">Bookings This Month</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-info-50 rounded-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info-100">
              <DollarSign className="h-6 w-6 text-info-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-info-900">
                ${stats.revenueThisMonth.toLocaleString()}
              </p>
              <p className="text-sm text-info-600">Revenue This Month</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Danger Zone Section
 */
function DangerZoneSection({ salonId }: { salonId: string }) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const deleteSalon = useDeleteSalon();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteSalon.mutateAsync(salonId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete salon:', error);
    }
  };

  return (
    <>
      <Card className="border-error-200">
        <CardHeader>
          <CardTitle className="text-error-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-error-50 rounded-lg border border-error-200">
            <div>
              <p className="text-sm font-medium text-error-900">Delete Salon</p>
              <p className="text-sm text-error-600">
                Permanently delete this salon and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Salon</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            <Alert
              type="warning"
              title="This action cannot be undone"
              message="All salon data, bookings, messages, and configurations will be permanently deleted."
              showIcon
            />

            <p className="text-sm text-neutral-600">
              Are you absolutely sure you want to delete this salon?
            </p>

            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteSalon.isPending}
              >
                {deleteSalon.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Yes, Delete Salon
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteSalon.isPending}
              >
                Cancel
              </Button>
            </div>

            {deleteSalon.isError && (
              <Alert
                type="error"
                message="Failed to delete salon. Please try again."
                showIcon
              />
            )}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

/**
 * Create Salon Form Schema
 */
const createSalonSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters'),
  address: z.string().optional(),
  phone_number_id: z.string().min(1, 'WhatsApp Phone Number ID is required'),
  access_token: z.string().min(1, 'WhatsApp Access Token is required'),
  // Working hours configuration
  working_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').default('09:00'),
  working_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').default('20:00'),
  slot_duration_minutes: z.number().min(5, 'Minimum 5 minutes').max(240, 'Maximum 240 minutes').default(30),
});

type CreateSalonFormData = z.infer<typeof createSalonSchema>;

/**
 * Create Salon Section
 */
function CreateSalonSection() {
  const createSalon = useCreateSalon();
  const router = useRouter();
  const fetchUserData = useAuthStore((state) => state.fetchUserData);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSalonFormData>({
    resolver: zodResolver(createSalonSchema),
    defaultValues: {
      working_hours_start: '09:00',
      working_hours_end: '20:00',
      slot_duration_minutes: 30,
    },
  });

  const onSubmit = async (data: CreateSalonFormData) => {
    try {
      const salon = await createSalon.mutateAsync({
        name: data.name,
        address: data.address,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        is_active: true,
        working_hours_start: data.working_hours_start || '09:00',
        working_hours_end: data.working_hours_end || '20:00',
        slot_duration_minutes: data.slot_duration_minutes || 30,
      });

      // Refresh user data from backend to get updated salon_id
      // This will also automatically fetch the salon data
      await fetchUserData();

      // Redirect to the salon page to show the new salon
      router.push('/dashboard/salon');
      router.refresh();
    } catch (error) {
      console.error('Failed to create salon:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Salon</CardTitle>
        <p className="text-sm text-neutral-600 mt-2">
          Set up your salon to start managing bookings, staff, and services
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Salon Name *
            </label>
            <Input
              {...register('name')}
              placeholder="My Beautiful Salon"
              error={errors.name?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              The name of your salon or business
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Address
            </label>
            <Input
              {...register('address')}
              placeholder="123 Main Street, New York, NY 10001"
              error={errors.address?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Physical location of your salon (optional)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              WhatsApp Phone Number ID *
            </label>
            <Input
              {...register('phone_number_id')}
              placeholder="102951292676262"
              error={errors.phone_number_id?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Get this from your Meta Business Manager. <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Open Meta Business</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              WhatsApp Access Token *
            </label>
            <Input
              {...register('access_token')}
              type="password"
              placeholder="EAAx1234567890..."
              error={errors.access_token?.message}
            />
            <p className="mt-1 text-sm text-neutral-500">
              Your WhatsApp Business API access token from Meta
            </p>
          </div>

          {/* Working Hours Configuration */}
          <div className="pt-4 border-t border-neutral-200">
            <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Working Hours
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Opening Time
                </label>
                <Input
                  {...register('working_hours_start')}
                  type="time"
                  error={errors.working_hours_start?.message}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  When your salon opens (default: 09:00)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Closing Time
                </label>
                <Input
                  {...register('working_hours_end')}
                  type="time"
                  error={errors.working_hours_end?.message}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  When your salon closes (default: 20:00)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Slot Duration (minutes)
                </label>
                <Input
                  {...register('slot_duration_minutes', { valueAsNumber: true })}
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  error={errors.slot_duration_minutes?.message}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Booking time intervals (default: 30 min)
                </p>
              </div>
            </div>
          </div>

          <Alert
            type="info"
            title="Need help?"
            message="If you don't have WhatsApp Business API credentials yet, you can create test values for now and update them later in salon settings."
            showIcon
          />

          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={createSalon.isPending}
            >
              {createSalon.isPending ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating Salon...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Salon
                </>
              )}
            </Button>
          </div>

          {createSalon.isError && (
            <Alert
              type="error"
              message="Failed to create salon. Please try again."
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Salon Management Page
 */
export default function SalonPage() {
  const salonId = useSalonIdSafe();
  const { user, salon, isHydrated, isLoading } = useAuthStore();

  // Wait for auth state to fully hydrate
  if (!isHydrated || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label="Loading salon data..." />
      </div>
    );
  }

  // Check if user exists
  if (!user) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert
            type="error"
            message="User session not found. Please log in again."
            showIcon
          />
        </CardContent>
      </Card>
    );
  }

  // Debug logging
  console.log('[Salon Page] State:', {
    salonId,
    user_salon_id: user.salon_id,
    salon_id: salon?.id,
    isHydrated,
    isLoading,
  });

  if (!salonId) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Setup Your Salon</h1>
          <p className="mt-2 text-neutral-600">
            Create your salon profile to start managing bookings and services
          </p>
        </div>

        {/* Create Salon Form */}
        <CreateSalonSection />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Salon Management</h1>
        <p className="mt-2 text-neutral-600">
          Manage your salon information, settings, and view statistics
        </p>
      </div>

      {/* Sections */}
      <SalonInfoSection salonId={salonId} />
      <SalonStatsSection salonId={salonId} />
      <DangerZoneSection salonId={salonId} />
    </div>
  );
}
