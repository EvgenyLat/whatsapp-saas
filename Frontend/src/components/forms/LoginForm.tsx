/**
 * LoginForm Component
 * WhatsApp SaaS Platform
 *
 * Authentication login form with:
 * - Email input
 * - Password input
 * - Remember me checkbox
 * - Forgot password link
 * - Submit button with loading state
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { FormField } from './FormField';
import { loginSchema, type LoginInput } from '@/types';
import { cn } from '@/lib/utils';

export interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

/**
 * LoginForm Component
 *
 * @example
 * ```tsx
 * <LoginForm
 *   onSuccess={() => console.log('Login successful')}
 *   redirectTo="/dashboard"
 * />
 * ```
 */
export const LoginForm = memo(function LoginForm({ onSuccess, redirectTo = '/dashboard', className }: LoginFormProps) {
  const { login, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = useCallback(async (data: LoginInput) => {
    setError(null);

    try {
      await login({ email: data.email, password: data.password });
      onSuccess?.();
      // Note: login hook handles redirect to dashboard by default
      if (redirectTo !== '/dashboard') {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
      console.error('Login error:', err);
    }
  }, [login, onSuccess, redirectTo, router]);

  return (
    <div className={cn('w-full max-w-md', className)}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6" aria-label="Login form">
          {/* Email Field */}
          <FormField
            name="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail size={16} />}
            disabled={authLoading}
          />

          {/* Password Field */}
          <FormField
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            leftIcon={<Lock size={16} />}
            disabled={authLoading}
          />

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <Checkbox
              {...methods.register('rememberMe')}
              label="Remember me"
              disabled={authLoading}
            />
            <a
              href="/forgot-password"
              className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert type="error" message={error} className="animate-in fade-in-0 slide-in-from-top-2" />
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={authLoading}
            disabled={authLoading}
          >
            {authLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-neutral-600">
            Don't have an account?{' '}
            <a
              href="/register"
              className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              Sign up
            </a>
          </p>
        </form>
      </FormProvider>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';
