/**
 * Reset Password Page
 * Create a new password using reset token from URL
 */

'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Reset password form schema
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Loading fallback component for Suspense boundary
 */
function ResetPasswordLoading(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading...</CardTitle>
        <CardDescription>Please wait</CardDescription>
      </CardHeader>

      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <LoadingSpinner variant="primary" />
          <p className="text-sm text-neutral-600">Loading reset password page...</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reset Password Page Content Component
 * Separated to allow Suspense wrapping of useSearchParams
 */
function ResetPasswordContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState(false);
  const [countdown, setCountdown] = React.useState(5);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Validate token on mount
  React.useEffect(() => {
    if (!token) {
      setTokenError(true);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  // Auto-redirect countdown after success
  React.useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      router.push('/login');
    }
    return undefined;
  }, [isSuccess, countdown, router]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 12.5;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 12.5;
    return strength;
  };

  const passwordStrength = password ? getPasswordStrength(password) : 0;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (response.status === 400) {
          setTokenError(true);
          throw new Error(
            errorData.message || 'Invalid or expired reset token. Please request a new one.'
          );
        }

        throw new Error(errorData.message || 'Failed to reset password');
      }

      // Show success message and start countdown
      setIsSuccess(true);
      setCountdown(5);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show token error state
  if (tokenError && !token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error message */}
          <div className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-error-700 font-medium">
                Reset link is invalid or expired
              </p>
              <p className="text-sm text-error-600 mt-1">
                Password reset links are only valid for 1 hour after being sent.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 text-sm text-neutral-600">
            <p className="font-medium text-neutral-700">To reset your password:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Go to the forgot password page</li>
              <li>Enter your email address</li>
              <li>Check your email for a new reset link</li>
              <li>Click the link within 1 hour</li>
            </ol>
          </div>
        </CardContent>

        <CardFooter>
          <Link href="/forgot-password" className="w-full">
            <Button variant="primary" className="w-full">
              Request New Reset Link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isSuccess ? 'Password Reset Successful' : 'Reset Your Password'}
        </CardTitle>
        <CardDescription>
          {isSuccess
            ? 'Your password has been updated'
            : 'Enter your new password below'}
        </CardDescription>
      </CardHeader>

      {!isSuccess ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Error message */}
            {error && (
              <div
                className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-error-700">{error}</p>
                  {tokenError && (
                    <Link
                      href="/forgot-password"
                      className="text-sm text-error-600 hover:text-error-700 underline mt-1 inline-block"
                    >
                      Request a new reset link
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* New password field */}
            <div>
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                disabled={isLoading}
                autoFocus
                {...register('password')}
              />
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-600">Password strength</span>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength >= 75
                          ? 'text-success-600'
                          : passwordStrength >= 50
                          ? 'text-warning-600'
                          : 'text-error-600'
                      }`}
                    >
                      {passwordStrength >= 75
                        ? 'Strong'
                        : passwordStrength >= 50
                        ? 'Medium'
                        : 'Weak'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength >= 75
                          ? 'bg-success-500'
                          : passwordStrength >= 50
                          ? 'bg-warning-500'
                          : 'bg-error-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password field */}
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              disabled={isLoading}
              {...register('confirmPassword')}
            />

            {/* Password requirements */}
            <div className="space-y-2 text-xs text-neutral-600">
              <p className="font-medium text-neutral-700">Password must contain:</p>
              <ul className="space-y-1 ml-4">
                <li className={password?.length >= 8 ? 'text-success-600' : ''}>
                  • At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password || '') ? 'text-success-600' : ''}>
                  • One uppercase letter
                </li>
                <li className={/[a-z]/.test(password || '') ? 'text-success-600' : ''}>
                  • One lowercase letter
                </li>
                <li className={/[0-9]/.test(password || '') ? 'text-success-600' : ''}>
                  • One number
                </li>
                <li className={/[^A-Za-z0-9]/.test(password || '') ? 'text-success-600' : ''}>
                  • One special character
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </Button>

            {/* Back to login link */}
            <Link
              href="/login"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium text-center"
            >
              Remember your password? Sign in
            </Link>
          </CardFooter>
        </form>
      ) : (
        <>
          <CardContent className="space-y-4">
            {/* Success message */}
            <div className="flex items-start gap-3 rounded-md bg-success-50 border border-success-200 p-3">
              <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-success-700 font-medium">
                  Password reset successful!
                </p>
                <p className="text-sm text-success-600 mt-1">
                  You can now sign in with your new password.
                </p>
              </div>
            </div>

            {/* Auto-redirect message */}
            <div className="flex items-start gap-3 rounded-md bg-info-50 border border-info-200 p-3">
              <AlertCircle className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-info-700">
                Redirecting to login page in {countdown} seconds...
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="primary" className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

/**
 * Reset Password Page
 * Wraps content in Suspense boundary for useSearchParams compatibility
 */
export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
