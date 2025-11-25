/**
 * Register Page
 * Single-step user registration form
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Registration schema - simplified to email and password only
const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading: authLoading, error: authError } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  // Use auth loading state
  const isLoading = authLoading;

  // Sync auth error to local error state
  React.useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Clear error when user modifies form
  React.useEffect(() => {
    const subscription = watch(() => {
      if (error) {
        setError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, error]);

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

  // Form submission
  const onSubmit = async (data: RegisterFormData) => {
    setError(null);

    try {
      // Transform form data to match backend API schema
      const registerData = {
        email: data.email,
        password: data.password,
      };

      // Call useAuth register method - handles API call and token storage
      await registerUser(registerData);

      // Redirect immediately to dashboard after successful registration
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);

      // Extract meaningful error message
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err instanceof Error) {
        // Check for specific error messages
        if (err.message.includes('already exists') || err.message.includes('already registered')) {
          errorMessage = 'This email address is already registered. Please sign in instead or use a different email.';
        } else if (err.message.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (err.message.includes('password')) {
          errorMessage = 'Password does not meet requirements.';
        } else {
          // Use the actual error message if available
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Sign up to get started with WhatsApp booking automation
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {error && (
            <div
              className="flex flex-col gap-3 rounded-md bg-error-50 border border-error-200 p-3"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-700">{error}</p>
              </div>

              {/* Show "Sign In" link if phone already exists */}
              {error.includes('already registered') && (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Go to Sign In →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Email Field */}
          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              disabled={isLoading}
              required
              {...register('email')}
            />
            {!errors.email?.message && (
              <p className="text-xs text-neutral-600 mt-1">
                We'll use this email for account verification and password recovery
              </p>
            )}
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              disabled={isLoading}
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

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            {...register('confirmPassword')}
          />
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          {/* Login link */}
          <div className="text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
