/**
 * User Profile Page
 * Unified settings and profile management page with tabs
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  LoadingSpinner,
  Alert,
  Badge,
} from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateUserProfile, useChangePassword } from '@/hooks/api/useUser';
import {
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Save,
  Bell,
  Palette,
  Info,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Profile update schema
 */
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Password change schema
 */
const passwordSchema = z.object({
  old_password: z.string().min(6, 'Password must be at least 6 characters'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

/**
 * Tab configuration
 */
const tabs = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'account', label: 'Account', icon: Info },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const;

type TabId = typeof tabs[number]['id'];

/**
 * Profile section component
 */
function PersonalInfoTab() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateUserProfile();
  const [isEditing, setIsEditing] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          {!isEditing && (
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* User role badge */}
          <div className="flex items-center gap-3 pb-6 border-b border-neutral-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
              </p>
              <Badge variant="primary" className="mt-1">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' :
                 user?.role === 'SALON_ADMIN' ? 'Salon Admin' :
                 user?.role || 'User'}
              </Badge>
            </div>
          </div>

          {/* Email verification status */}
          {user?.isEmailVerified === false && (
            <Alert
              type="warning"
              title="Email not verified"
              message="Please check your inbox for a verification email."
              showIcon
            />
          )}

          {user?.isEmailVerified && (
            <Alert
              type="success"
              message="Email verified"
              showIcon
            />
          )}

          {/* Form fields */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                First Name
              </label>
              <Input
                {...register('firstName')}
                placeholder="John"
                disabled={!isEditing}
                error={errors.firstName?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name
              </label>
              <Input
                {...register('lastName')}
                placeholder="Doe"
                disabled={!isEditing}
                error={errors.lastName?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="john@example.com"
                  disabled={!isEditing}
                  error={errors.email?.message}
                  className="pl-10"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+1234567890"
                  disabled={!isEditing}
                  error={errors.phone?.message}
                  className="pl-10"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                variant="primary"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
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
                disabled={updateProfile.isPending}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Success/Error messages */}
          {updateProfile.isSuccess && (
            <Alert
              type="success"
              message="Profile updated successfully"
              showIcon
            />
          )}

          {updateProfile.isError && (
            <Alert
              type="error"
              message="Failed to update profile. Please try again."
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Password change section component
 */
function SecurityTab() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword.mutateAsync({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      reset();
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                {...register('old_password')}
                type="password"
                placeholder="Enter current password"
                error={errors.old_password?.message}
                className="pl-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                {...register('new_password')}
                type="password"
                placeholder="Enter new password"
                error={errors.new_password?.message}
                className="pl-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Password must be at least 6 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                {...register('confirm_password')}
                type="password"
                placeholder="Confirm new password"
                error={errors.confirm_password?.message}
                className="pl-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="submit"
              variant="primary"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset()}
              disabled={changePassword.isPending}
            >
              Reset
            </Button>
          </div>

          {/* Success/Error messages */}
          {changePassword.isSuccess && (
            <Alert
              type="success"
              message="Password changed successfully"
              showIcon
            />
          )}

          {changePassword.isError && (
            <Alert
              type="error"
              message="Failed to change password. Please check your current password and try again."
              showIcon
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Account info tab
 */
function AccountTab() {
  const user = useAuthStore((state) => state.user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-neutral-200">
          <div>
            <p className="text-sm font-medium text-neutral-700">Account Status</p>
            <p className="text-sm text-neutral-500">Your account is active</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-200">
          <div>
            <p className="text-sm font-medium text-neutral-700">Account ID</p>
            <p className="text-sm text-neutral-500 font-mono">{user?.id || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-neutral-700">Member Since</p>
            <p className="text-sm text-neutral-500">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Notifications tab (placeholder)
 */
function NotificationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="py-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
            <Bell className="h-8 w-8 text-secondary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            Coming Soon
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Notification settings will be available soon
          </p>
          <div className="mt-6 space-y-2 text-sm text-neutral-500 max-w-md mx-auto text-left">
            <p>• Email notifications for bookings and messages</p>
            <p>• WhatsApp notification preferences</p>
            <p>• Push notification settings</p>
            <p>• Reminder schedules</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Appearance tab (placeholder)
 */
function AppearanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
      </CardHeader>
      <CardContent className="py-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
            <Palette className="h-8 w-8 text-secondary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            Coming Soon
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Appearance customization will be available soon
          </p>
          <div className="mt-6 space-y-2 text-sm text-neutral-500 max-w-md mx-auto text-left">
            <p>• Dark mode / Light mode toggle</p>
            <p>• Color theme customization</p>
            <p>• Language preferences</p>
            <p>• Timezone settings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Profile page component with tabs
 */
export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = React.useState<TabId>('personal');

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Profile & Settings</h1>
        <p className="mt-2 text-neutral-600">
          Manage your personal information, security, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8" aria-label="Profile tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'personal' && <PersonalInfoTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  );
}
