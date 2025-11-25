/**
 * Forgot Password Page
 * Request password reset link via email
 */

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Clock } from 'lucide-react';
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

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const email = watch('email');

  // Countdown timer for rate limiting
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setRateLimitError(false);
    }
    return undefined;
  }, [countdown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setRateLimitError(false);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle rate limiting (429 status)
        if (response.status === 429) {
          setRateLimitError(true);
          setCountdown(60); // 60 seconds cooldown
          throw new Error(
            errorData.message || 'Too many requests. Please try again later.'
          );
        }

        throw new Error(errorData.message || 'Failed to send reset link');
      }

      // Show success message
      setIsSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (email) {
      await onSubmit({ email });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
        </CardTitle>
        <CardDescription>
          {isSuccess
            ? "We've sent you a password reset link"
            : 'Enter your email to receive a password reset link'}
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
                  {rateLimitError && countdown > 0 && (
                    <p className="text-xs text-error-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Please wait {countdown} seconds before trying again
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Email field */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              disabled={isLoading || (rateLimitError && countdown > 0)}
              autoFocus
              {...register('email')}
            />

            {/* Info message */}
            <div className="flex items-start gap-3 rounded-md bg-info-50 border border-info-200 p-3">
              <AlertCircle className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-info-700">
                If an account exists with this email, you will receive a password reset link within a few minutes.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
              disabled={isLoading || (rateLimitError && countdown > 0)}
            >
              {isLoading
                ? 'Sending reset link...'
                : rateLimitError && countdown > 0
                ? `Wait ${countdown}s`
                : 'Send Reset Link'}
            </Button>

            {/* Back to login link */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
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
                <p className="text-sm text-success-700 font-medium">Reset link sent!</p>
                <p className="text-sm text-success-600 mt-1">
                  We've sent a password reset link to{' '}
                  <span className="font-medium">{email}</span>
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-sm text-neutral-600">
              <p className="font-medium text-neutral-700">Next steps:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
                <li>Sign in with your new password</li>
              </ol>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-3 rounded-md bg-neutral-50 border border-neutral-200 p-3">
              <AlertCircle className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-neutral-600">
                  The reset link will expire in 1 hour for security reasons.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Resend button */}
            <div className="w-full space-y-2">
              <p className="text-sm text-neutral-600 text-center">
                Didn't receive the email?
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={isLoading || (rateLimitError && countdown > 0)}
                loading={isLoading}
              >
                {isLoading
                  ? 'Resending...'
                  : rateLimitError && countdown > 0
                  ? `Wait ${countdown}s`
                  : 'Resend Reset Link'}
              </Button>
            </div>

            {/* Back to login link */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
