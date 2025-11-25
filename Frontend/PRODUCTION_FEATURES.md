# Production Features Documentation

Complete documentation for all production-ready features implemented in the WhatsApp SaaS Platform frontend.

## Overview

This document describes the production features that have been implemented to ensure the application is ready for deployment at scale.

## Table of Contents

1. [Environment Variables Validation](#environment-variables-validation)
2. [Health Check Integration](#health-check-integration)
3. [Production Logging System](#production-logging-system)
4. [Sentry Error Tracking](#sentry-error-tracking)
5. [API Versioning Strategy](#api-versioning-strategy)
6. [Enhanced API Client](#enhanced-api-client)

---

## Environment Variables Validation

**File:** `src/lib/env.ts`

### Overview

Type-safe environment variable validation using Zod schema validation. Ensures all required configuration is present and valid before the application starts.

### Features

- ✅ Runtime validation of all environment variables
- ✅ Type-safe access to environment variables
- ✅ Default values for development
- ✅ Clear error messages on validation failure
- ✅ Production-ready checks

### Usage

```typescript
import { env, isProduction, isDevelopment } from '@/lib/env';

// Type-safe access to environment variables
console.log(env.NEXT_PUBLIC_API_URL); // string (validated URL)
console.log(env.NEXT_PUBLIC_API_TIMEOUT); // number

// Environment checks
if (isProduction) {
  // Production-only code
}

// Get safe environment info (excludes secrets)
const safeInfo = getSafeEnvInfo();
```

### Required Environment Variables

**Production Required:**
- `NEXTAUTH_URL` - Full application URL
- `NEXTAUTH_SECRET` - Min 32 characters
- `AUTH_SECRET` - Min 32 characters

**Optional:**
- `NEXT_PUBLIC_API_URL` - Defaults to `http://localhost:4000`
- `NEXT_PUBLIC_API_TIMEOUT` - Defaults to `30000`
- `NEXT_PUBLIC_SENTRY_DSN` - For error tracking
- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable analytics
- `NEXT_PUBLIC_ENABLE_SENTRY` - Enable Sentry

### Validation

Environment variables are validated on application start:

```typescript
// Server-side validation (automatic)
// Logs: ✅ Environment variables validated successfully
// Or exits with detailed error messages
```

---

## Health Check Integration

**File:** `src/lib/api/health.ts`

### Overview

Comprehensive health monitoring for the backend API with continuous monitoring capabilities.

### Features

- ✅ Backend health status checks
- ✅ Service-level health monitoring
- ✅ Uptime tracking
- ✅ Response time measurement
- ✅ Continuous monitoring with callbacks
- ✅ Startup readiness checks

### Usage

#### Basic Health Check

```typescript
import { checkHealth, isBackendHealthy } from '@/lib/api/health';

// Check backend health
const health = await checkHealth();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'

// Simple boolean check
const isHealthy = await isBackendHealthy();
```

#### Wait for Backend (Development)

```typescript
import { waitForBackend } from '@/lib/api/health';

// Wait for backend to be ready
const ready = await waitForBackend(
  10, // max attempts
  1000, // delay between attempts
  (attempt, maxAttempts) => {
    console.log(`Waiting for backend: ${attempt}/${maxAttempts}`);
  }
);
```

#### Continuous Monitoring

```typescript
import { createHealthMonitor } from '@/lib/api/health';

const monitor = createHealthMonitor({
  interval: 30000, // Check every 30 seconds
  timeout: 5000,
  onHealthChange: (status) => {
    console.log(`Health status changed to: ${status}`);
  },
  onServiceChange: (service, status) => {
    console.log(`${service} is now ${status}`);
  },
});

monitor.start(); // Start monitoring
// ... later
monitor.stop(); // Stop monitoring
```

#### Health Statistics

```typescript
import { getHealthStats, resetHealthStats } from '@/lib/api/health';

const stats = getHealthStats();
console.log(`Success rate: ${stats.successfulChecks / stats.totalChecks}`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
```

### Response Format

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    whatsapp: 'up' | 'down';
    redis?: 'up' | 'down';
  };
  version: string;
  uptime: number;
}
```

---

## Production Logging System

**File:** `src/lib/monitoring/logger.ts`

### Overview

Structured logging system with multiple log levels and production-safe output.

### Features

- ✅ Multiple log levels (debug, info, warn, error)
- ✅ Contextual metadata
- ✅ Request ID tracking
- ✅ Performance measurement
- ✅ Multiple transports (console, JSON, browser)
- ✅ Child logger support

### Usage

#### Basic Logging

```typescript
import { logger } from '@/lib/monitoring/logger';

// Different log levels
logger.debug('Debug message', { userId: '123' });
logger.info('User logged in', { userId: '123' });
logger.warn('Slow query detected', { duration: 5000 });
logger.error('API error', error, { requestId: 'req_123' });
```

#### Child Logger

```typescript
import { createLogger } from '@/lib/monitoring/logger';

// Create logger with default context
const apiLogger = createLogger({
  component: 'API',
  service: 'auth',
});

apiLogger.info('Request started'); // Includes component and service
```

#### Performance Timing

```typescript
import { startTimer, measureAsync } from '@/lib/monitoring/logger';

// Manual timing
const timer = startTimer('Database query');
// ... do work
timer.end({ query: 'SELECT * FROM users' });

// Automatic timing for async functions
const result = await measureAsync(
  'Fetch user data',
  async () => {
    return await fetchUser(userId);
  },
  { userId }
);
```

#### Log Levels

```typescript
import { logger, LogLevel } from '@/lib/monitoring/logger';

// Set log level
logger.setLevel(LogLevel.WARN); // Only warn and error

// Get current level
const level = logger.getLevel();
```

### Log Entry Format

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: {
    requestId?: string;
    userId?: string;
    duration?: number;
    [key: string]: any;
  };
  environment: string;
}
```

### Production Output

In production, logs are output as structured JSON for log aggregation:

```json
{
  "level": "error",
  "message": "API request failed",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "context": {
    "requestId": "req_123",
    "status": 500,
    "url": "/api/users"
  },
  "environment": "production"
}
```

---

## Sentry Error Tracking

**File:** `src/lib/monitoring/sentry.ts`

### Overview

Production error tracking and monitoring using Sentry (optional dependency).

### Features

- ✅ Automatic error capture
- ✅ Performance monitoring
- ✅ Session replay
- ✅ User context tracking
- ✅ Breadcrumb trails
- ✅ Mock implementation when disabled

### Setup

1. **Install Sentry (optional):**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure environment variables:**
   ```env
   NEXT_PUBLIC_ENABLE_SENTRY=true
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

3. **Initialize Sentry:**
   ```typescript
   import { initSentry } from '@/lib/monitoring/sentry';

   // In your app initialization
   await initSentry();
   ```

### Usage

#### Capture Exceptions

```typescript
import { captureException } from '@/lib/monitoring/sentry';

try {
  // ... code that might throw
} catch (error) {
  captureException(error, {
    tags: { feature: 'authentication' },
    extra: { userId: '123' },
    level: 'error',
  });
}
```

#### Capture Messages

```typescript
import { captureMessage } from '@/lib/monitoring/sentry';

captureMessage('User completed onboarding', 'info');
```

#### User Context

```typescript
import { setUser, clearUser } from '@/lib/monitoring/sentry';

// Set user context
setUser({
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'admin',
});

// Clear on logout
clearUser();
```

#### Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/monitoring/sentry';

addBreadcrumb('User clicked login button', {
  category: 'ui',
  level: 'info',
});
```

#### API Error Tracking

```typescript
import { captureApiError } from '@/lib/monitoring/sentry';

captureApiError(
  error,
  'req_123', // request ID
  '/api/users', // endpoint
  'GET' // method
);
```

#### Performance Tracking

```typescript
import { trackPerformanceIssue } from '@/lib/monitoring/sentry';

const duration = measureOperation();
trackPerformanceIssue('Slow database query', duration, 1000); // threshold: 1s
```

### Mock Mode

When Sentry is disabled, all functions work but output to console instead:

```typescript
// Outputs: [Sentry Mock] Exception: Error message
captureException(error);
```

---

## API Versioning Strategy

**File:** `src/lib/api/versioning.ts`

### Overview

URL-based API versioning with backward compatibility and migration support.

### Features

- ✅ URL-based versioning (`/api/v1/...`)
- ✅ Version compatibility matrix
- ✅ Automatic version injection
- ✅ Version negotiation
- ✅ Migration helpers
- ✅ Deprecation warnings

### Supported Versions

- `v1` - Current stable version
- `v2` - Next version (breaking changes)

### Usage

#### Automatic Versioning

```typescript
// API client automatically adds version to all requests
import apiClient from '@/lib/api/client';

// Automatically becomes: /api/v1/users
const users = await apiClient.get('/users');
```

#### Custom Version

```typescript
import { createVersionedEndpoint } from '@/lib/api/versioning';

// Create v2 endpoint
const endpoint = createVersionedEndpoint('/users', 'v2');
// Result: /api/v2/users
```

#### Version Compatibility Check

```typescript
import { checkVersionCompatibility } from '@/lib/api/versioning';

const compatible = checkVersionCompatibility('v1', 'v2');
// Returns: true or false
```

#### Version Negotiation

```typescript
import { negotiateVersion } from '@/lib/api/versioning';

// Select best version based on client and server support
const version = negotiateVersion('v1', ['v1', 'v2']);
// Returns: 'v1' (best match)
```

#### Version Metadata

```typescript
import { getVersionMetadata, getRecommendedVersion } from '@/lib/api/versioning';

const metadata = getVersionMetadata('v1');
console.log(metadata.features); // List of features
console.log(metadata.releaseDate); // Release date

const recommended = getRecommendedVersion();
// Returns: Latest non-deprecated version
```

#### Migration Support

```typescript
import { versionMigrator } from '@/lib/api/versioning';

// Register migration
versionMigrator.register({
  from: 'v1',
  to: 'v2',
  migrate: (data) => ({
    ...data,
    // Transform v1 data to v2 format
  }),
});

// Migrate data
const migratedData = versionMigrator.migrate(data, 'v1', 'v2');
```

---

## Enhanced API Client

**File:** `src/lib/api/client.ts` (updated)

### Overview

The API client has been enhanced with all production features.

### New Features

- ✅ Environment-based configuration
- ✅ Production logging integration
- ✅ Sentry error tracking
- ✅ Automatic API versioning
- ✅ Enhanced error handling

### Configuration

```typescript
// Uses validated environment variables
const client = apiClient; // Pre-configured

// All requests include:
// - API version (e.g., /api/v1/...)
// - Request ID for tracing
// - Structured logging
// - Error tracking (in production)
```

### Error Tracking

```typescript
// Server errors (5xx) are automatically sent to Sentry in production
try {
  await apiClient.get('/users');
} catch (error) {
  // Error is logged and tracked automatically
  // You can also add custom tracking
  captureApiError(error, requestId, '/users', 'GET');
}
```

### Logging

```typescript
// All API requests are logged with structured data
// Development: Colorful console output
// Production: JSON structured logs

// Example log output:
// [2024-01-20T12:00:00Z] [DEBUG] API Request
// {
//   "requestId": "req_abc123",
//   "method": "GET",
//   "url": "/api/v1/users",
//   "duration": 150
// }
```

---

## Environment Setup

### Development

```env
# .env.local
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Optional (for development)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=development-secret-min-32-chars-long
AUTH_SECRET=development-secret-min-32-chars-long

# Feature flags
NEXT_PUBLIC_ENABLE_SENTRY=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Production

```env
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_APP_VERSION=1.0.0

# Required in production
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=your-strong-32-char-secret-here
AUTH_SECRET=your-strong-32-char-secret-here

# Feature flags
NEXT_PUBLIC_ENABLE_SENTRY=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false

# Sentry configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Testing

### Type Checking

```bash
npm run type-check
```

### Quality Check

```bash
npm run quality-check
```

This runs:
- TypeScript type checking
- ESLint
- Prettier
- Unit tests

---

## Best Practices

### 1. Environment Variables

- Never commit `.env` files
- Use different secrets for each environment
- Validate on startup
- Use type-safe access via `env`

### 2. Logging

- Use appropriate log levels
- Include contextual information
- Don't log sensitive data
- Use structured logging in production

### 3. Error Tracking

- Set user context when authenticated
- Add breadcrumbs for user actions
- Tag errors by feature/module
- Filter out noise (e.g., network errors in dev)

### 4. API Versioning

- Use latest stable version
- Plan migrations in advance
- Deprecate gracefully
- Document breaking changes

### 5. Health Monitoring

- Check health on app startup
- Monitor critical services
- Set up alerts for degraded status
- Have a rollback plan

---

## Troubleshooting

### Environment Validation Fails

```bash
# Check which variables are invalid
npm run build

# Look for error output:
# ❌ Invalid environment variables:
# {
#   "NEXTAUTH_SECRET": ["String must contain at least 32 character(s)"]
# }
```

### Sentry Not Initializing

```typescript
// Check if Sentry is enabled
import { env } from '@/lib/env';
console.log(env.NEXT_PUBLIC_ENABLE_SENTRY); // Should be true
console.log(env.NEXT_PUBLIC_SENTRY_DSN); // Should be set

// Check if Sentry package is installed
// npm install @sentry/nextjs
```

### Health Check Failing

```typescript
import { checkHealth } from '@/lib/api/health';

try {
  const health = await checkHealth();
  console.log('Health:', health);
} catch (error) {
  console.error('Health check failed:', error);
  // Check if API_URL is correct
  // Check if backend is running
}
```

---

## Migration Guide

### From Old to New API Client

**Before:**
```typescript
const response = await fetch('/api/users');
```

**After:**
```typescript
import apiClient from '@/lib/api/client';
const response = await apiClient.get('/users');
// Automatically includes: versioning, logging, error tracking
```

### Adding Sentry to Existing Code

**Before:**
```typescript
try {
  // ... code
} catch (error) {
  console.error(error);
}
```

**After:**
```typescript
import { captureException } from '@/lib/monitoring/sentry';

try {
  // ... code
} catch (error) {
  captureException(error, {
    tags: { feature: 'feature-name' },
  });
  console.error(error);
}
```

---

## Support

For issues or questions:

1. Check [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
2. Review environment variables
3. Check application logs
4. Review Sentry dashboard (if enabled)

---

**Last Updated**: 2024-01-20
**Version**: 1.0.0
**Maintained By**: Development Team
