/**
 * Login Page
 * User authentication with email and password
 * Uses backend JWT authentication
 */

'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Login form schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Loading fallback component for Suspense boundary
 */
function LoginLoading(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading...</CardTitle>
        <CardDescription>Please wait</CardDescription>
      </CardHeader>

      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <LoadingSpinner variant="primary" />
          <p className="text-sm text-neutral-600">Loading login page...</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Login Page Content Component
 * Separated to allow Suspense wrapping of useSearchParams
 */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: authError } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      await login(data);

      // Simplified redirect - always go to dashboard after successful login
      // Dashboard layout will handle any missing data gracefully
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid phone number or password. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {(error || authError) && (
            <div
              className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-700">{error || authError}</p>
            </div>
          )}

          {/* Email field */}
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            disabled={isLoading}
            {...register('email')}
          />

          {/* Password field */}
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            disabled={isLoading}
            {...register('password')}
          />

          {/* Forgot password link */}
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Demo credentials - removed as we now use phone login */}

          {/* Register link */}
          <div className="text-center text-sm text-neutral-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Login Page
 * Wraps content in Suspense boundary for useSearchParams compatibility
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
