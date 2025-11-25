/**
 * Environment Variables Validation
 * WhatsApp SaaS Platform
 *
 * Production-ready environment validation using Zod:
 * - Type-safe environment variables
 * - Runtime validation
 * - Default values
 * - Clear error messages
 *
 * @see https://zod.dev
 */

import { z } from 'zod';

/**
 * Environment variables schema
 * Define all required and optional environment variables
 */
const envSchema = z.object({
  // API Configuration
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:3000/api/v1'),
  NEXT_PUBLIC_API_TIMEOUT: z.coerce
    .number()
    .positive('NEXT_PUBLIC_API_TIMEOUT must be positive')
    .default(30000),

  // App Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('WhatsApp SaaS Platform'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3001'),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  // NextAuth Configuration
  NEXTAUTH_URL: z
    .string()
    .url('NEXTAUTH_URL must be a valid URL')
    .optional()
    .transform((val) => val || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters')
    .optional()
    .transform((val) => {
      // Only validate on server-side in production
      if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !val) {
        throw new Error('NEXTAUTH_SECRET is required in production');
      }
      return val || 'development-secret-min-32-chars-long-for-testing';
    }),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters')
    .optional()
    .transform((val) => {
      // Only validate on server-side in production
      if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !val) {
        throw new Error('AUTH_SECRET is required in production');
      }
      return val || process.env.NEXTAUTH_SECRET || 'development-secret-min-32-chars-long-for-testing';
    }),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_SENTRY: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_DEBUG: z.coerce.boolean().default(false),

  // Sentry Configuration (optional in development)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  SENTRY_AUTH_TOKEN: z.string().optional().or(z.literal('')),
  SENTRY_ORG: z.string().optional().or(z.literal('')),
  SENTRY_PROJECT: z.string().optional().or(z.literal('')),

  // Analytics (optional)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional().or(z.literal('')),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional().or(z.literal('')),
});

/**
 * Inferred environment type from schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Cached validated environment
 * Prevents re-validation on every access
 */
let cachedEnv: Env | null = null;

/**
 * Validate and parse environment variables
 * Throws error if validation fails with detailed messages
 *
 * @returns Validated environment variables
 * @throws ZodError if validation fails
 */
export function validateEnv(): Env {
  // Return cached if already validated
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));

    // Create detailed error message
    const errors = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 *
 * @example
 * import { env } from '@/lib/env';
 * console.log(env.NEXT_PUBLIC_API_URL);
 */
export const env = validateEnv();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Check if debug mode is enabled
 */
export const isDebug = env.NEXT_PUBLIC_ENABLE_DEBUG;

/**
 * Get safe environment info for logging
 * Excludes sensitive data like secrets
 *
 * @returns Safe environment info object
 */
export function getSafeEnvInfo() {
  return {
    nodeEnv: env.NODE_ENV,
    apiUrl: env.NEXT_PUBLIC_API_URL,
    appName: env.NEXT_PUBLIC_APP_NAME,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    appVersion: env.NEXT_PUBLIC_APP_VERSION,
    enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    enableSentry: env.NEXT_PUBLIC_ENABLE_SENTRY,
    enableDebug: env.NEXT_PUBLIC_ENABLE_DEBUG,
  };
}

/**
 * Validate environment on module import
 * This ensures errors are caught early
 */
if (typeof window === 'undefined') {
  // Server-side validation
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
