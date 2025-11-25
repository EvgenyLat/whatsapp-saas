/**
 * Verify Email Page
 * Email verification with token from URL
 */

'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type VerificationState = 'loading' | 'success' | 'error' | 'expired' | 'resend';

/**
 * Loading fallback component for Suspense boundary
 */
function VerifyEmailLoading(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading...</CardTitle>
        <CardDescription>Please wait</CardDescription>
      </CardHeader>

      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <LoadingSpinner variant="primary" />
          <p className="text-sm text-neutral-600">Loading verification page...</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Verify Email Page Content Component
 * Separated to allow Suspense wrapping of useSearchParams
 */
function VerifyEmailContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [state, setState] = React.useState<VerificationState>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(5);

  // Auto-verify on mount if token is present
  React.useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setState('resend');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-redirect countdown after success
  React.useEffect(() => {
    if (state === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (state === 'success' && countdown === 0) {
      router.push('/dashboard');
    }
    return undefined;
  }, [state, countdown, router]);

  const verifyEmail = async (verificationToken: string) => {
    setState('loading');
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (response.status === 400) {
          setState('expired');
          throw new Error(
            errorData.message || 'Verification link has expired. Please request a new one.'
          );
        }

        setState('error');
        throw new Error(errorData.message || 'Email verification failed');
      }

      // Success - start countdown to redirect
      setState('success');
      setCountdown(5);
    } catch (err) {
      console.error('Email verification error:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      );

      if (state === 'loading') {
        setState('error');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email address is required to resend verification');
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend verification email');
      }

      setState('resend');
    } catch (err) {
      console.error('Resend verification error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to resend verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Your Email</CardTitle>
          <CardDescription>Please wait while we verify your email address</CardDescription>
        </CardHeader>

        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <LoadingSpinner  variant="primary" />
            <p className="text-sm text-neutral-600">Verifying your email...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription>Your email has been successfully verified</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Success message */}
          <div className="flex items-start gap-3 rounded-md bg-success-50 border border-success-200 p-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-success-700 font-medium">
                Verification successful!
              </p>
              <p className="text-sm text-success-600 mt-1">
                Your email has been verified. You can now access your dashboard.
              </p>
            </div>
          </div>

          {/* Auto-redirect message */}
          <div className="flex items-start gap-3 rounded-md bg-info-50 border border-info-200 p-3">
            <AlertCircle className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-info-700">
              Redirecting to dashboard in {countdown} seconds...
            </p>
          </div>

          {/* Welcome message */}
          <div className="text-center py-4">
            <CheckCircle2 className="h-16 w-16 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Welcome to WhatsApp SaaS!
            </h3>
            <p className="text-sm text-neutral-600">
              Your account is now active and ready to use.
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Expired token state
  if (state === 'expired') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Link Expired</CardTitle>
          <CardDescription>
            This verification link has expired or is invalid
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error message */}
          <div className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-error-700 font-medium">
                Verification link has expired
              </p>
              <p className="text-sm text-error-600 mt-1">
                {error || 'Email verification links are only valid for 24 hours after being sent.'}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 text-sm text-neutral-600">
            <p className="font-medium text-neutral-700">To verify your email:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Click the button below to request a new verification email</li>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link within 24 hours</li>
            </ol>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleResendVerification}
            loading={isResending}
            disabled={isResending || !email}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>

          <Link
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium text-center"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>We couldn't verify your email address</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error message */}
          <div className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-error-700 font-medium">
                Verification failed
              </p>
              <p className="text-sm text-error-600 mt-1">
                {error || 'An error occurred while verifying your email.'}
              </p>
            </div>
          </div>

          {/* Help text */}
          <div className="space-y-3 text-sm text-neutral-600">
            <p className="font-medium text-neutral-700">What to try:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Request a new verification email</li>
              <li>Check that you clicked the most recent verification link</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleResendVerification}
            loading={isResending}
            disabled={isResending || !email}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>

          <Link
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium text-center"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Resend state (no token provided)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>Check your inbox for a verification email</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info message */}
        <div className="flex items-start gap-3 rounded-md bg-info-50 border border-info-200 p-3">
          <Mail className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-info-700 font-medium">
              Verification email sent
            </p>
            <p className="text-sm text-info-600 mt-1">
              We've sent a verification email to{' '}
              {email ? <span className="font-medium">{email}</span> : 'your email address'}
            </p>
          </div>
        </div>

        {/* Error message (for resend failures) */}
        {error && (
          <div className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3">
            <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-3 text-sm text-neutral-600">
          <p className="font-medium text-neutral-700">Next steps:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>You'll be automatically signed in</li>
          </ol>
        </div>

        {/* Note */}
        <div className="flex items-start gap-3 rounded-md bg-neutral-50 border border-neutral-200 p-3">
          <AlertCircle className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-600">
            The verification link will expire in 24 hours for security reasons.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {/* Resend button */}
        <div className="w-full space-y-2">
          <p className="text-sm text-neutral-600 text-center">
            Didn't receive the email?
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendVerification}
            loading={isResending}
            disabled={isResending || !email}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </div>

        {/* Back to login link */}
        <Link
          href="/login"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium text-center"
        >
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}

/**
 * Verify Email Page
 * Wraps content in Suspense boundary for useSearchParams compatibility
 */
export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
