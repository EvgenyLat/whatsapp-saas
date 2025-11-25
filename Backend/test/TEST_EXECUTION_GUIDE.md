# Test Execution Guide
## WhatsApp SaaS Platform - Integration Testing

This guide provides step-by-step instructions for executing the comprehensive integration test suite.

---

## Prerequisites

### 1. Environment Setup

Ensure the following are installed and running:
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x (for caching)

### 2. Environment Variables

Create a `.env.test` file in the Backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas_test"

# JWT
JWT_SECRET="test-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="test-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="sk-your-test-api-key"
OPENAI_MODEL="gpt-4"
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# WhatsApp
WHATSAPP_API_URL="https://graph.facebook.com"
WHATSAPP_API_VERSION="v18.0"
WHATSAPP_WEBHOOK_SECRET="test-webhook-secret"
WHATSAPP_VERIFY_TOKEN="test-verify-token"

# Redis (for caching)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Application
NODE_ENV="test"
PORT=3001
```

### 3. Database Setup

```bash
# Navigate to Backend directory
cd Backend

# Create test database
createdb whatsapp_saas_test

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Test Execution

### Running All Tests

```bash
# Run all integration tests
npm run test:e2e

# Run with coverage report
npm run test:e2e -- --coverage

# Run specific test suite
npm run test:e2e -- whatsapp-integration.e2e-spec.ts
npm run test:e2e -- ai-booking-flow.e2e-spec.ts
npm run test:e2e -- usage-limits.e2e-spec.ts
```

### Running Tests by Phase

```bash
# Phase 5.1: WhatsApp Webhook Tests
npm run test:e2e -- whatsapp-integration

# Phase 5.2: AI Booking Flow Tests
npm run test:e2e -- ai-booking-flow

# Phase 5.3: Usage Limits Tests
npm run test:e2e -- usage-limits
```

### Running Specific Test Cases

```bash
# Run specific test case
npm run test:e2e -- -t "TC-WH-001"

# Run specific describe block
npm run test:e2e -- -t "Webhook Verification"
```

### Debugging Tests

```bash
# Run in debug mode
npm run test:debug

# Run with verbose output
npm run test:e2e -- --verbose

# Run specific test with logs
npm run test:e2e -- -t "Should create booking" --verbose
```

---

## Test Suite Breakdown

### 1. WhatsApp Integration Tests (whatsapp-integration.e2e-spec.ts)

**Test Coverage:**
- Webhook verification (Meta challenge-response)
- Incoming message processing (text, image, document)
- Message status updates (sent, delivered, read)
- Outbound message sending
- Error handling (unknown salon, invalid payload)
- Performance benchmarks (response time, concurrency)

**Expected Duration:** ~30 seconds

**Test Cases:**
- TC-WH-001: Webhook verification
- TC-WH-002: Incoming message processing
- TC-WH-003: Message status updates
- TC-WH-005: Media message handling
- TC-WH-006: Send text message
- TC-WH-007: Message cost calculation
- TC-PERF-001: Response time benchmarks
- TC-PERF-003: Concurrent request handling

---

### 2. AI Booking Flow Tests (ai-booking-flow.e2e-spec.ts)

**Test Coverage:**
- Simple inquiry responses
- Multi-language support (Russian, English, Hebrew)
- Cache performance and hit rate
- Full booking creation flow
- Availability checking
- Booking conflict handling
- Past date rejection
- Conversation history context
- Error handling

**Expected Duration:** ~60-90 seconds (includes OpenAI API calls)

**Test Cases:**
- TC-AI-001: Service inquiry responses
- TC-AI-002: Full booking creation
- TC-AI-003: Booking conflict handling
- TC-AI-004: Past date rejection
- TC-AI-005: Cache hit scenarios
- TC-AI-006: Cache miss for unique queries
- TC-AI-007: Multi-language cache separation
- TC-PERF-001: AI response time
- TC-PERF-002: Cache response time

---

### 3. Usage Limits Tests (usage-limits.e2e-spec.ts)

**Test Coverage:**
- Message limit enforcement (1000/month)
- Booking limit enforcement (500/month)
- Usage counter increments
- Monthly counter reset
- Warning notifications (80%, 90%, 100%)
- Custom limits for different tiers
- Usage statistics API

**Expected Duration:** ~20 seconds

**Test Cases:**
- TC-USAGE-001: Message limit enforcement
- TC-USAGE-002: Booking limit enforcement
- TC-USAGE-003: Usage counter reset
- TC-USAGE-004: Warning notifications

---

## Interpreting Test Results

### Success Criteria

A successful test run should show:
- **Pass Rate:** >= 95%
- **Coverage:** >= 85% (lines, statements, branches)
- **Performance:**
  - Webhook processing: < 200ms
  - AI response (cache miss): < 2000ms
  - AI response (cache hit): < 100ms
  - Concurrent requests: All succeed

### Common Test Failures

#### 1. OpenAI API Failures
**Error:** `OpenAI API key not configured` or `Rate limit exceeded`

**Solution:**
- Verify `OPENAI_API_KEY` is set in `.env.test`
- Check API key has sufficient quota
- Wait a few minutes if rate limited

#### 2. Database Connection Errors
**Error:** `Can't reach database server`

**Solution:**
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check database exists: `psql whatsapp_saas_test`

#### 3. WhatsApp API Errors
**Error:** `Failed to send WhatsApp message`

**Solution:**
- These tests are expected to fail if WhatsApp credentials are not configured
- Tests verify the flow, not the actual WhatsApp API
- Skip WhatsApp sending tests if credentials not available

#### 4. Timeout Errors
**Error:** `Timeout: test exceeded 5000ms`

**Solution:**
- OpenAI API calls can be slow (1-2 seconds)
- Increase timeout in jest config: `jest.setTimeout(10000)`
- Check network connection

---

## Performance Benchmarking

### Metrics to Track

After running tests, check these metrics:

```bash
# View test timing summary
npm run test:e2e -- --verbose

# Generate coverage report
npm run test:e2e -- --coverage
open coverage/lcov-report/index.html
```

### Expected Performance

| Metric | Target | Current |
|--------|--------|---------|
| Webhook Processing | < 200ms | TBD |
| AI Response (Cache) | < 100ms | TBD |
| AI Response (OpenAI) | < 2000ms | TBD |
| Booking Creation | < 500ms | TBD |
| Cache Hit Rate | > 85% | TBD |
| Test Pass Rate | > 95% | TBD |

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: whatsapp_saas_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:6
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd Backend && npm ci

      - name: Run migrations
        run: cd Backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_saas_test

      - name: Run integration tests
        run: cd Backend && npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_saas_test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          JWT_SECRET: test-jwt-secret
          JWT_REFRESH_SECRET: test-refresh-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./Backend/coverage/lcov.info
```

---

## Test Data Management

### Before Tests
- Database is automatically seeded with test users and salons
- Each test suite creates isolated test data
- Test data uses unique timestamps to avoid conflicts

### After Tests
- Test data is automatically cleaned up in `afterAll()` hooks
- Database can be reset: `npx prisma migrate reset --force`
- Check for orphaned data: `npm run test:cleanup`

### Manual Cleanup

```sql
-- Connect to test database
psql whatsapp_saas_test

-- View test data
SELECT email FROM "User" WHERE email LIKE '%test%';

-- Delete all test data
DELETE FROM "AIMessage" WHERE salon_id IN (SELECT id FROM "Salon" WHERE name LIKE '%Test%');
DELETE FROM "Booking" WHERE salon_id IN (SELECT id FROM "Salon" WHERE name LIKE '%Test%');
DELETE FROM "Message" WHERE salon_id IN (SELECT id FROM "Salon" WHERE name LIKE '%Test%');
DELETE FROM "Conversation" WHERE salon_id IN (SELECT id FROM "Salon" WHERE name LIKE '%Test%');
DELETE FROM "Salon" WHERE name LIKE '%Test%';
DELETE FROM "User" WHERE email LIKE '%test%';
```

---

## Troubleshooting

### Database Issues

```bash
# Reset database
npx prisma migrate reset --force

# Regenerate Prisma client
npx prisma generate

# Check database connection
npx prisma db push --preview-feature
```

### Port Conflicts

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process using port
kill -9 $(lsof -t -i :3001)
```

### Cache Issues

```bash
# Clear Redis cache
redis-cli FLUSHDB

# Restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis # Linux
```

---

## Best Practices

### 1. Run Tests Before Committing
Always run the full test suite before committing:
```bash
npm run test:e2e
```

### 2. Isolate Test Data
- Use unique identifiers (timestamps) for test data
- Clean up test data in `afterAll()` hooks
- Don't depend on specific database state

### 3. Mock External APIs When Possible
- WhatsApp API calls can fail in test environment
- OpenAI API calls cost money (use cache where possible)
- Consider mocking APIs for faster tests

### 4. Keep Tests Fast
- Target: < 2 minutes for full suite
- Use database transactions for rollback
- Parallelize independent tests

### 5. Monitor Test Flakiness
- Track tests that fail intermittently
- Fix or skip flaky tests
- Investigate root causes (timing, race conditions)

---

## Reporting Issues

When reporting test failures, include:
1. Test case ID (e.g., TC-WH-001)
2. Full error message and stack trace
3. Environment details (OS, Node version, database version)
4. Steps to reproduce
5. Expected vs actual behavior

**Example:**
```
Test: TC-AI-002 - Full booking creation flow
Status: FAILED
Error: Expected booking to be created, but none found
Environment: macOS 13.5, Node 18.16.0, PostgreSQL 14.2
Steps:
1. Send AI message with booking request
2. Check database for booking
Expected: Booking with status CONFIRMED
Actual: No booking found
```

---

## Next Steps

After completing Phase 5 integration testing:
1. Review test results and fix critical bugs
2. Improve test coverage for gaps identified
3. Optimize performance bottlenecks
4. Document integration patterns
5. Set up CI/CD pipeline
6. Plan Phase 6: Production deployment testing

---

**Last Updated:** 2025-10-24
**Maintained By:** QA Engineering Team
