# End-to-End Testing Guide

Comprehensive guide for running and maintaining E2E tests with Playwright for the WhatsApp SaaS platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Suites](#test-suites)
4. [Running Tests](#running-tests)
5. [Test Configuration](#test-configuration)
6. [Writing Tests](#writing-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

### What Gets Tested

The E2E test suite validates the entire application stack from end to end:

- **Booking Flow**: WhatsApp message → AI processing → Database → Admin panel
- **Admin Operations**: Login, data viewing, filtering, exporting
- **Webhook Integration**: Message reception, signature verification, rate limiting
- **AI Conversations**: Multi-turn dialogues, context retention, intent understanding
- **Error Scenarios**: Database failures, API errors, invalid inputs
- **Performance**: Response times, concurrent requests, resource cleanup

### Technology Stack

- **Test Framework**: Playwright
- **Language**: JavaScript (Node.js)
- **Browsers**: Chromium, Firefox, WebKit
- **Databases**: PostgreSQL (test database)
- **Cache**: Redis (test instance)

### Test Statistics

- **Total Tests**: 60+
- **Test Suites**: 6
- **Helper Modules**: 5
- **Estimated Duration**: 15-20 minutes (all tests, single browser)

---

## Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# PostgreSQL 15+
psql --version

# Redis 7+ (optional but recommended)
redis-cli --version
```

### Installation

```bash
# Navigate to E2E directory
cd Backend/tests/e2e

# Install Playwright and dependencies
npm install

# Install Playwright browsers
npx playwright install chromium firefox webkit
```

### Environment Setup

Create `.env.test` in the `Backend/` directory:

```env
# Server
BASE_URL=http://localhost:4000
PORT=4000
NODE_ENV=test

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_saas_test
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Authentication
ADMIN_TOKEN=test-admin-token-12345
WHATSAPP_WEBHOOK_SECRET=test-webhook-secret
WHATSAPP_VERIFY_TOKEN=test-verify-token

# OpenAI (for AI conversation tests)
OPENAI_API_KEY=your-openai-api-key

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_COOLDOWN=60000
```

### Database Setup

```bash
# Create test database
createdb whatsapp_saas_test

# Run migrations
cd Backend
npm run migrate -- --env test

# Seed test data (optional)
npm run seed:test
```

### Running Your First Test

```bash
# Start the backend server
cd Backend
npm start

# In another terminal, run tests
cd Backend/tests/e2e
npx playwright test specs/booking.spec.js --project=chromium
```

---

## Test Suites

### 1. Booking Flow (`booking.spec.js`)

**Purpose**: Tests the complete booking lifecycle

**Test Cases**:
- ✅ Process booking from WhatsApp to completion
- ✅ Handle booking modification requests
- ✅ Handle booking cancellation requests
- ✅ Handle invalid booking dates gracefully
- ✅ Handle multiple bookings from same customer
- ✅ Maintain conversation context across messages

**Duration**: ~3-5 minutes

**Example**:
```bash
npx playwright test specs/booking.spec.js
```

### 2. Admin Operations (`admin.spec.js`)

**Purpose**: Tests admin panel functionality

**Test Cases**:
- ✅ Login with valid/invalid credentials
- ✅ View and filter bookings
- ✅ Search bookings by customer phone
- ✅ Paginate large datasets
- ✅ View statistics and analytics
- ✅ Export data (CSV/JSON)
- ✅ Update booking status

**Duration**: ~4-6 minutes

**Example**:
```bash
npx playwright test specs/admin.spec.js
```

### 3. Webhook Integration (`webhook.spec.js`)

**Purpose**: Tests WhatsApp webhook handling

**Test Cases**:
- ✅ Receive and acknowledge webhooks
- ✅ Verify webhook signatures
- ✅ Reject invalid signatures
- ✅ Handle rate limiting
- ✅ Process media messages (images, documents)
- ✅ Handle status callbacks
- ✅ Handle malformed payloads

**Duration**: ~2-4 minutes

**Example**:
```bash
npx playwright test specs/webhook.spec.js
```

### 4. AI Conversation (`conversation.spec.js`)

**Purpose**: Tests AI-powered conversation handling

**Test Cases**:
- ✅ Multi-turn booking conversations
- ✅ Context retention across messages
- ✅ Clarification questions
- ✅ Booking modifications via natural language
- ✅ Cancellation with confirmation
- ✅ Handle unrecognized intents
- ✅ Special requests and notes

**Duration**: ~5-7 minutes

**Example**:
```bash
npx playwright test specs/conversation.spec.js
```

### 5. Error Scenarios (`errors.spec.js`)

**Purpose**: Tests error handling across the system

**Test Cases**:
- ✅ Invalid webhook signatures
- ✅ Database connection loss
- ✅ Redis connection loss
- ✅ OpenAI API errors and timeouts
- ✅ Rate limit exceeded
- ✅ Invalid booking dates
- ✅ Malformed JSON
- ✅ Concurrent operation conflicts

**Duration**: ~3-5 minutes

**Example**:
```bash
npx playwright test specs/errors.spec.js
```

### 6. Performance (`performance.spec.js`)

**Purpose**: Tests performance characteristics

**Test Cases**:
- ✅ Webhook response times (<200ms)
- ✅ Response times under load
- ✅ Database query performance (<100ms)
- ✅ Handle 50+ concurrent requests
- ✅ Resource cleanup (connections, memory)
- ✅ Memory leak detection
- ✅ Throughput (>10 req/s)
- ✅ End-to-end booking flow (<10s)

**Duration**: ~2-3 minutes

**Example**:
```bash
npx playwright test specs/performance.spec.js
```

---

## Running Tests

### Run All Tests

```bash
# All tests, all browsers
npx playwright test

# All tests, specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Specific Suite

```bash
# Single test file
npx playwright test specs/booking.spec.js

# Multiple test files
npx playwright test specs/booking.spec.js specs/admin.spec.js
```

### Run Specific Test

```bash
# By test name
npx playwright test -g "should process booking request"

# By line number
npx playwright test specs/booking.spec.js:45
```

### Run in Different Modes

```bash
# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# With specific workers (parallel execution)
npx playwright test --workers=4
```

### Run with Environment Variables

```bash
# Override base URL
BASE_URL=http://staging.example.com npx playwright test

# Use different database
DB_NAME=whatsapp_saas_staging npx playwright test

# Enable verbose logging
DEBUG=pw:api npx playwright test
```

---

## Test Configuration

### Playwright Config (`playwright.config.js`)

```javascript
module.exports = defineConfig({
  testDir: './specs',
  timeout: 60 * 1000,              // 60 seconds per test
  expect: { timeout: 10 * 1000 },  // 10 seconds for assertions
  retries: process.env.CI ? 2 : 0, // Retry on CI
  workers: process.env.CI ? 2 : 4, // Parallel execution

  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
  ],
});
```

### Global Setup (`global-setup.js`)

Runs once before all tests:
- ✅ Connect to database
- ✅ Clean up existing test data
- ✅ Verify database schema
- ✅ Connect to Redis
- ✅ Verify environment variables

### Global Teardown (`global-teardown.js`)

Runs once after all tests:
- ✅ Clean up test data
- ✅ Close database connections
- ✅ Close Redis connections

---

## Writing Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');

test.describe('Feature Name', () => {
  let whatsappHelper;
  let databaseHelper;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    await databaseHelper.connect();
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);
  });

  test.afterAll(async () => {
    await databaseHelper.disconnect();
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const testData = { ... };

    // Act
    const response = await whatsappHelper.sendWebhook(testData);

    // Assert
    expect(response.status).toBe(200);
  });
});
```

### Using Test Helpers

#### WhatsAppHelper

```javascript
// Send webhook
const response = await whatsappHelper.sendWebhook({
  from: '+1234567890',
  to: salonId,
  body: 'Book a haircut tomorrow at 2pm',
  timestamp: Date.now(),
});

// Send with signature verification
const response = await whatsappHelper.sendWebhookWithSignature(message);

// Send raw payload
const response = await whatsappHelper.sendRawWebhook({ custom: 'data' });
```

#### DatabaseHelper

```javascript
// Create test data
const salon = await databaseHelper.createTestSalon({ name: 'Test Salon' });
const booking = await databaseHelper.createTestBooking({ salon_id: salon });

// Query data
const latestBooking = await databaseHelper.getLatestBooking(salonId, phone);
const messages = await databaseHelper.getMessages(salonId);

// Cleanup
await databaseHelper.cleanupTestData(salonId);
```

#### AdminHelper

```javascript
// Login
await adminHelper.login(page);

// Navigate
await adminHelper.navigateToBookings(salonId);

// Filter and search
await adminHelper.filterByStatus('confirmed');
await adminHelper.search('+1234567890');

// Export data
const download = await adminHelper.exportCSV();
```

### Assertions

```javascript
// Response status
expect(response.status).toBe(200);

// Database state
const booking = await databaseHelper.getLatestBooking(salon, phone);
expect(booking).toBeTruthy();
expect(booking.status).toBe('confirmed');

// UI elements
await expect(page.locator('[data-testid="booking-row"]')).toBeVisible();
await expect(page.locator('h1')).toHaveText('Dashboard');

// Performance
expect(duration).toBeLessThan(200); // ms
```

### Waiting Strategies

```javascript
// Wait for processing (AI, database)
await new Promise(resolve => setTimeout(resolve, 3000));

// Wait for selector
await page.waitForSelector('[data-testid="success-message"]');

// Wait for URL
await page.waitForURL(/\/admin\/dashboard/);

// Wait for network idle
await page.waitForLoadState('networkidle');
```

---

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests automatically run on:
- ✅ Every pull request to `main` or `develop`
- ✅ Every push to `main`
- ✅ Manual trigger via `workflow_dispatch`

**Workflow File**: `.github/workflows/e2e-tests.yml`

### PR Workflow

1. **PR Created**: Tests run automatically
2. **Tests Pass**: ✅ PR can be merged
3. **Tests Fail**: ❌ PR blocked, review test report
4. **Comment**: GitHub bot comments with test results

### Viewing Results

```bash
# GitHub Actions
https://github.com/your-repo/actions

# HTML Report (locally)
npx playwright show-report test-results/e2e-html-report

# JSON Results
cat test-results/e2e-results.json | jq .
```

### Artifacts

Uploaded after every run:
- **Test Results**: JSON, JUnit XML
- **HTML Report**: Interactive report
- **Screenshots**: Failures only
- **Videos**: Failures only
- **Traces**: Retried tests only

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

**Symptom**: Tests fail with timeout errors

**Solutions**:
```javascript
// Increase test timeout
test.setTimeout(120000); // 2 minutes

// Increase expect timeout
await expect(element).toBeVisible({ timeout: 30000 });

// Check if server is running
curl http://localhost:4000/healthz
```

#### Database Connection Errors

**Symptom**: `ECONNREFUSED` or `Connection refused`

**Solutions**:
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check environment variables
echo $DB_HOST
echo $DB_NAME

# Test connection manually
psql -h localhost -U postgres -d whatsapp_saas_test
```

#### Redis Not Available

**Symptom**: `ECONNREFUSED` to Redis

**Solutions**:
```bash
# Verify Redis is running
redis-cli ping

# Tests should continue without Redis (degraded mode)
# Check logs for warnings
```

#### Webhook Signature Failures

**Symptom**: All webhook tests fail with 401

**Solutions**:
```bash
# Verify webhook secret matches
echo $WHATSAPP_WEBHOOK_SECRET

# Check signature generation in helper
# Ensure backend uses same secret
```

#### Flaky Tests

**Symptom**: Tests pass/fail inconsistently

**Solutions**:
```javascript
// Add retries for flaky tests
test.describe.configure({ retries: 2 });

// Increase wait times for async operations
await new Promise(resolve => setTimeout(resolve, 5000));

// Use more specific selectors
await page.locator('[data-testid="specific-element"]');
```

### Debug Mode

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Run specific test in debug mode
npx playwright test specs/booking.spec.js:45 --debug

# Enable verbose logging
DEBUG=pw:api npx playwright test
```

### Viewing Traces

```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip

# Navigate to failed test
# Inspect DOM snapshots, network requests, console logs
```

---

## Best Practices

### Test Organization

✅ **DO**:
- Group related tests in `test.describe` blocks
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests independent
- Clean up test data

❌ **DON'T**:
- Share state between tests
- Rely on test execution order
- Leave test data in database
- Use hardcoded delays (use waitFor instead)

### Performance

✅ **DO**:
- Run tests in parallel
- Use database transactions for cleanup
- Reuse browser contexts
- Mock external APIs when possible

❌ **DON'T**:
- Create new browser for each test
- Make unnecessary network requests
- Wait longer than needed

### Reliability

✅ **DO**:
- Use data-testid attributes
- Wait for elements before interacting
- Handle timing issues properly
- Verify state in database

❌ **DON'T**:
- Use CSS selectors that might change
- Assume operations complete instantly
- Skip assertions
- Ignore test failures

### Maintenance

✅ **DO**:
- Update tests when features change
- Keep helpers DRY
- Document complex test logic
- Monitor test execution time

❌ **DON'T**:
- Skip failing tests
- Let test suite grow too slow
- Ignore flaky tests
- Duplicate test code

---

## Example Test Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-booking-flow

# Develop feature
# ...

# Write E2E test
# Backend/tests/e2e/specs/new-booking.spec.js

# Run test locally
npx playwright test specs/new-booking.spec.js

# Fix any failures
# ...
```

### 2. Local Testing

```bash
# Run all tests
npx playwright test

# Run specific browser
npx playwright test --project=chromium

# View report
npx playwright show-report
```

### 3. Create PR

```bash
# Commit changes
git add .
git commit -m "Add new booking flow"

# Push to remote
git push origin feature/new-booking-flow

# Create PR
# Tests run automatically in CI
```

### 4. Review Results

- ✅ All tests pass → Merge PR
- ❌ Tests fail → Review failures, fix, push again

---

## Resources

### Documentation

- **Playwright Docs**: https://playwright.dev
- **Test Best Practices**: https://playwright.dev/docs/best-practices
- **Debugging**: https://playwright.dev/docs/debug

### Support

- **Issues**: Create GitHub issue
- **Questions**: Ask in team chat
- **Updates**: Check CHANGELOG.md

---

## Appendix

### Test Data Patterns

```javascript
// Test salon
const testSalon = {
  id: `salon_test_${Date.now()}`,
  name: 'E2E Test Salon',
  phone: '+1234567890',
};

// Test booking
const testBooking = {
  salon_id: testSalon.id,
  customer_phone: '+1987654321',
  service_type: 'Haircut',
  appointment_date: new Date(Date.now() + 86400000), // Tomorrow
  status: 'confirmed',
};

// Test message
const testMessage = {
  from: '+1987654321',
  to: testSalon.id,
  body: 'I want to book a haircut',
  timestamp: Date.now(),
};
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | Yes | `http://localhost:4000` | Backend server URL |
| `ADMIN_TOKEN` | Yes | - | Admin authentication token |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | - | Test database name |
| `DB_USER` | Yes | `postgres` | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `WHATSAPP_WEBHOOK_SECRET` | Yes | - | Webhook signature secret |
| `WHATSAPP_VERIFY_TOKEN` | Yes | - | Webhook verification token |
| `OPENAI_API_KEY` | No | - | OpenAI API key (for AI tests) |

---

**Last Updated**: 2025-01-18
**Version**: 1.0
**Maintainers**: Test Engineering Team
