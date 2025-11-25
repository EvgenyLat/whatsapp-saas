# E2E Test Suite

End-to-end tests for the WhatsApp SaaS platform using Playwright.

## Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npm run install-browsers

# Set environment variables (copy .env.example to .env)
cp ../../../.env.example .env

# Run all tests
npm test

# Run specific browser
npm run test:chromium
```

## Test Suites

| Suite | Tests | Duration | Description |
|-------|-------|----------|-------------|
| **booking.spec.js** | 7 | ~4 min | Complete booking flow from WhatsApp to admin |
| **admin.spec.js** | 12 | ~5 min | Admin panel operations and data management |
| **webhook.spec.js** | 15 | ~3 min | WhatsApp webhook handling and security |
| **conversation.spec.js** | 10 | ~6 min | AI-powered conversation flows |
| **errors.spec.js** | 14 | ~4 min | Error handling and edge cases |
| **performance.spec.js** | 8 | ~3 min | Performance and resource management |

**Total**: 66 tests, ~25 minutes (all browsers)

## Running Tests

### All Tests

```bash
# All tests, all browsers
npm test

# Single browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Specific Suites

```bash
npm run test:booking
npm run test:admin
npm run test:webhook
npm run test:conversation
npm run test:errors
npm run test:performance
```

### Debug Mode

```bash
# Interactive UI mode
npm run test:ui

# Debug mode with inspector
npm run test:debug

# Headed mode (see browser)
npm run test:headed
```

### View Reports

```bash
# HTML report
npm run report

# Results location
./test-results/e2e-html-report/index.html
```

## Environment Variables

Create `.env` file in this directory:

```env
BASE_URL=http://localhost:4000
ADMIN_TOKEN=your-admin-token
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_saas_test
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
WHATSAPP_VERIFY_TOKEN=your-verify-token
OPENAI_API_KEY=your-openai-key
```

## CI/CD

Tests automatically run on:
- ✅ Every PR to `main`/`develop`
- ✅ Every push to `main`
- ✅ Manual trigger

See `.github/workflows/e2e-tests.yml`

## Documentation

**Full Guide**: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)

Covers:
- Test suite details
- Writing new tests
- Test helpers
- Troubleshooting
- Best practices

## Directory Structure

```
Backend/tests/e2e/
├── specs/                    # Test specifications
│   ├── booking.spec.js
│   ├── admin.spec.js
│   ├── webhook.spec.js
│   ├── conversation.spec.js
│   ├── errors.spec.js
│   └── performance.spec.js
├── helpers/                  # Test helpers
│   ├── whatsapp-helper.js
│   ├── database-helper.js
│   ├── admin-helper.js
│   ├── redis-helper.js
│   └── performance-helper.js
├── fixtures/                 # Test fixtures (if needed)
├── playwright.config.js      # Playwright configuration
├── global-setup.js           # Global test setup
├── global-teardown.js        # Global test teardown
├── package.json              # Dependencies and scripts
├── E2E_TESTING_GUIDE.md      # Comprehensive guide
└── README.md                 # This file
```

## Test Helpers

### WhatsAppHelper

Simulates WhatsApp webhook interactions:
```javascript
await whatsappHelper.sendWebhook(message);
await whatsappHelper.sendWebhookWithSignature(message);
```

### DatabaseHelper

Database operations for test data:
```javascript
await databaseHelper.createTestSalon(data);
await databaseHelper.getLatestBooking(salonId, phone);
await databaseHelper.cleanupTestData(salonId);
```

### AdminHelper

Admin panel interactions:
```javascript
await adminHelper.login(page);
await adminHelper.navigateToBookings(salonId);
await adminHelper.filterByStatus('confirmed');
```

### RedisHelper

Redis cache operations:
```javascript
await redisHelper.get(key);
await redisHelper.clearRateLimit(identifier);
```

### PerformanceHelper

Performance measurement utilities:
```javascript
performanceHelper.start('operation');
performanceHelper.end('operation');
const stats = performanceHelper.getStats(measurements);
```

## Success Criteria

### Performance Targets

- ✅ Webhook response: < 200ms
- ✅ Database queries: < 100ms
- ✅ Admin page load: < 2s
- ✅ Full booking flow: < 10s

### Reliability Targets

- ✅ Test pass rate: > 95%
- ✅ No flaky tests
- ✅ All edge cases covered
- ✅ Proper error handling

## Troubleshooting

### Tests Fail Locally

```bash
# Check server is running
curl http://localhost:4000/healthz

# Check database
psql -h localhost -U postgres -d whatsapp_saas_test -c "SELECT COUNT(*) FROM salons;"

# Check Redis
redis-cli ping

# View detailed logs
DEBUG=pw:api npm test
```

### Flaky Tests

```bash
# Run with retries
npx playwright test --retries=2

# Enable trace
npx playwright test --trace=on

# View trace
npx playwright show-trace test-results/trace.zip
```

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use test helpers for common operations
3. Add descriptive test names
4. Clean up test data in `afterEach`/`afterAll`
5. Update documentation
6. Ensure tests pass in CI

## Support

- **Documentation**: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
- **Issues**: Create GitHub issue
- **Questions**: Ask in team chat

---

**Last Updated**: 2025-01-18
**Playwright Version**: 1.40.0
**Node Version**: 18+
