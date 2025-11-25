/**
 * Sentry Error Tracking Integration
 * WhatsApp SaaS Platform
 *
 * Production error monitoring with:
 * - Automatic error capture
 * - Performance monitoring
 * - Session replay
 * - User context tracking
 * - Breadcrumb trails
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import { env, isProduction, isDevelopment } from '../env';

/**
 * Sentry severity levels
 * Matches Sentry's SeverityLevel type
 */
export type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

/**
 * User context for Sentry
 */
export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  tenantId?: string;
}

/**
 * Breadcrumb data
 */
export interface SentryBreadcrumb {
  message: string;
  category?: string;
  level?: SentryLevel;
  data?: Record<string, any>;
  timestamp?: number;
}

/**
 * Error context
 */
export interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: SentryLevel;
  fingerprint?: string[];
  user?: SentryUser;
}

/**
 * Mock Sentry implementation for when Sentry is disabled
 */
class MockSentry {
  init(): void {
    console.log('[Sentry] Mock mode - Sentry is disabled');
  }

  captureException(error: Error, context?: ErrorContext): string {
    console.error('[Sentry Mock] Exception:', error, context);
    return 'mock-event-id';
  }

  captureMessage(message: string, level: SentryLevel = 'info'): string {
    console.log(`[Sentry Mock] Message [${level}]:`, message);
    return 'mock-event-id';
  }

  setUser(user: SentryUser | null): void {
    console.log('[Sentry Mock] User context:', user);
  }

  setContext(name: string, context: Record<string, any>): void {
    console.log('[Sentry Mock] Context:', name, context);
  }

  setTag(key: string, value: string): void {
    console.log('[Sentry Mock] Tag:', key, value);
  }

  setTags(tags: Record<string, string>): void {
    console.log('[Sentry Mock] Tags:', tags);
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    console.log('[Sentry Mock] Breadcrumb:', breadcrumb);
  }

  configureScope(callback: (scope: any) => void): void {
    console.log('[Sentry Mock] Configure scope');
  }

  withScope(callback: (scope: any) => void): void {
    console.log('[Sentry Mock] With scope');
  }
}

/**
 * Real Sentry implementation (lazy-loaded)
 */
class RealSentry {
  // @ts-ignore - Sentry is an optional dependency
  private sentry: any | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!env.NEXT_PUBLIC_ENABLE_SENTRY || !env.NEXT_PUBLIC_SENTRY_DSN) {
      console.warn('[Sentry] Sentry is disabled or DSN not configured');
      return;
    }

    try {
      // Dynamically import Sentry (optional dependency)
      // Using require-style dynamic import to avoid webpack issues
      // @ts-ignore - Sentry is an optional dependency
      const sentryModule = await Function('return import("@sentry/nextjs")')();
      this.sentry = sentryModule;

      this.sentry.init({
        dsn: env.NEXT_PUBLIC_SENTRY_DSN,
        environment: env.NODE_ENV,
        enabled: isProduction,

        // Performance Monitoring
        tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        // Release tracking
        release: env.NEXT_PUBLIC_APP_VERSION || 'development',

        // Integrations
        integrations: [
          this.sentry.browserTracingIntegration({
            tracePropagationTargets: [
              'localhost',
              /^\//,
              env.NEXT_PUBLIC_API_URL,
            ],
          }),
          this.sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],

        // Error filtering
        beforeSend: (event: any, hint: any) => {
          // Don't send network errors in development
          if (isDevelopment && hint.originalException) {
            const error = hint.originalException as any;
            if (error?.message?.includes('Network')) {
              return null;
            }
          }

          // Filter out common browser extension errors
          if (event.exception?.values?.[0]?.value?.includes('extension://')) {
            return null;
          }

          return event;
        },

        // Ignore specific errors
        ignoreErrors: [
          // Browser extension errors
          /extensions\//i,
          /^Non-Error/,
          // Network errors
          'Network request failed',
          'NetworkError',
          // Common false positives
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          // User cancellations
          'AbortError',
          'The user aborted a request',
        ],

        // Add tags
        initialScope: {
          tags: {
            application: env.NEXT_PUBLIC_APP_NAME,
            version: env.NEXT_PUBLIC_APP_VERSION || 'unknown',
          },
        },
      });

      this.initialized = true;
      console.log('[Sentry] Initialized successfully');
    } catch (error) {
      console.error('[Sentry] Failed to initialize:', error);
    }
  }

  captureException(error: Error, context?: ErrorContext): string {
    if (!this.sentry) {
      console.error('[Sentry] Not initialized - Exception:', error);
      return 'not-initialized';
    }

    return this.sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
      fingerprint: context?.fingerprint,
      user: context?.user,
    });
  }

  captureMessage(message: string, level: SentryLevel = 'info'): string {
    if (!this.sentry) {
      console.log('[Sentry] Not initialized - Message:', message);
      return 'not-initialized';
    }

    return this.sentry.captureMessage(message, level);
  }

  setUser(user: SentryUser | null): void {
    if (!this.sentry) return;
    this.sentry.setUser(user);
  }

  setContext(name: string, context: Record<string, any>): void {
    if (!this.sentry) return;
    this.sentry.setContext(name, context);
  }

  setTag(key: string, value: string): void {
    if (!this.sentry) return;
    this.sentry.setTag(key, value);
  }

  setTags(tags: Record<string, string>): void {
    if (!this.sentry) return;
    this.sentry.setTags(tags);
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    if (!this.sentry) return;
    this.sentry.addBreadcrumb(breadcrumb);
  }

  configureScope(callback: (scope: any) => void): void {
    if (!this.sentry) return;
    this.sentry.configureScope(callback);
  }

  withScope(callback: (scope: any) => void): void {
    if (!this.sentry) return;
    this.sentry.withScope(callback);
  }
}

/**
 * Sentry instance (auto-detects if Sentry should be enabled)
 */
const sentryInstance =
  env.NEXT_PUBLIC_ENABLE_SENTRY && env.NEXT_PUBLIC_SENTRY_DSN
    ? new RealSentry()
    : new MockSentry();

/**
 * Initialize Sentry
 * Call this early in your app initialization
 */
export async function initSentry(): Promise<void> {
  await sentryInstance.init();
}

/**
 * Capture exception to Sentry
 *
 * @param error - Error to capture
 * @param context - Additional context
 * @returns Event ID
 */
export function captureException(error: Error, context?: ErrorContext): string {
  return sentryInstance.captureException(error, context);
}

/**
 * Capture message to Sentry
 *
 * @param message - Message to capture
 * @param level - Severity level
 * @returns Event ID
 */
export function captureMessage(message: string, level: SentryLevel = 'info'): string {
  return sentryInstance.captureMessage(message, level);
}

/**
 * Set user context
 *
 * @param user - User information
 */
export function setUser(user: SentryUser): void {
  sentryInstance.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  sentryInstance.setUser(null);
}

/**
 * Set custom context
 *
 * @param name - Context name
 * @param context - Context data
 */
export function setContext(name: string, context: Record<string, any>): void {
  sentryInstance.setContext(name, context);
}

/**
 * Set a tag
 *
 * @param key - Tag key
 * @param value - Tag value
 */
export function setTag(key: string, value: string): void {
  sentryInstance.setTag(key, value);
}

/**
 * Set multiple tags
 *
 * @param tags - Tags object
 */
export function setTags(tags: Record<string, string>): void {
  sentryInstance.setTags(tags);
}

/**
 * Add breadcrumb
 *
 * @param message - Breadcrumb message
 * @param data - Additional data
 * @param category - Breadcrumb category
 * @param level - Severity level
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category = 'default',
  level: SentryLevel = 'info'
): void {
  sentryInstance.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Configure scope for the next error/message
 *
 * @param callback - Scope configuration callback
 */
export function configureScope(callback: (scope: any) => void): void {
  sentryInstance.configureScope(callback);
}

/**
 * Execute callback with isolated scope
 *
 * @param callback - Callback to execute
 */
export function withScope(callback: (scope: any) => void): void {
  sentryInstance.withScope(callback);
}

/**
 * Capture API error with structured context
 *
 * @param error - Error object
 * @param requestId - Request ID
 * @param endpoint - API endpoint
 * @param method - HTTP method
 */
export function captureApiError(
  error: Error,
  requestId?: string,
  endpoint?: string,
  method?: string
): string {
  return captureException(error, {
    tags: {
      error_type: 'api_error',
      endpoint: endpoint || 'unknown',
      method: method || 'unknown',
    },
    extra: {
      requestId,
      endpoint,
      method,
    },
    level: 'error',
  });
}

/**
 * Capture navigation error
 *
 * @param error - Error object
 * @param from - From route
 * @param to - To route
 */
export function captureNavigationError(error: Error, from?: string, to?: string): string {
  return captureException(error, {
    tags: {
      error_type: 'navigation_error',
    },
    extra: {
      from,
      to,
    },
    level: 'error',
  });
}

/**
 * Capture form validation error
 *
 * @param formName - Form name
 * @param errors - Validation errors
 */
export function captureFormError(formName: string, errors: Record<string, any>): string {
  return captureMessage(`Form validation failed: ${formName}`, 'warning');
}

/**
 * Track performance issue
 *
 * @param operation - Operation name
 * @param duration - Duration in milliseconds
 * @param threshold - Performance threshold
 */
export function trackPerformanceIssue(
  operation: string,
  duration: number,
  threshold: number
): void {
  if (duration > threshold) {
    captureMessage(`Performance issue: ${operation} took ${duration}ms`, 'warning');
    addBreadcrumb(`Slow operation: ${operation}`, {
      duration,
      threshold,
    });
  }
}

