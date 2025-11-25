# Integration Tests

Integration tests for the WhatsApp SaaS platform API endpoints and system components.

## Quick Start

```bash
# Install dependencies
cd Backend
npm install

# Set environment variables
cp .env.example .env.test

# Setup test database
createdb whatsapp_saas_test
npm run migrate -- --env test

# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage
```

## Test Suites

| Suite | Tests | Coverage | Description |
|-------|-------|----------|-------------|
| **webhook.test.js** | 30 | 95% | WhatsApp webhook integration |
| **admin.test.js** | 35 | 90% | Admin API endpoints |
| **database.test.js** | 25 | 85% | Database operations |
| **ai.test.js** | 20 | 80% | AI processing |
| **messaging.test.js** | 18 | 88% | WhatsApp messaging |
| **queue.test.js** | 22 | 92% | Job queue processing |

**Total**: 150+ tests

## Running Tests

### All Tests

```bash
# Run all
npm run test:integration

# With coverage
npm run test:integration -- --coverage

# Watch mode
npm run test:integration -- --watch
```

### Specific Suites

```bash
# Single suite
npm run test:integration -- webhook
npm run test:integration -- admin
npm run test:integration -- database

# Multiple suites
npm run test:integration -- webhook admin

# Pattern matching
npm run test:integration -- --testNamePattern="should accept valid"
```

### Debug Mode

```bash
# Verbose output
npm run test:integration -- --verbose

# Specific test with debug
DEBUG=* npm run test:integration -- webhook --verbose

# Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Coverage

### Current Coverage

- **Overall**: 82%
- **Critical Paths**: 100%
- **API Endpoints**: 93%
- **Business Logic**: 89%

### Generate Reports

```bash
# Terminal report
npm run test:integration -- --coverage --coverageReporters=text

# HTML report
npm run test:integration -- --coverage
open coverage/integration/lcov-report/index.html

# JSON report
npm run test:integration -- --coverage --coverageReporters=json
```

## Test Structure

```
Backend/tests/integration/
├── suites/                    # Test suites
│   ├── webhook.test.js        # 30 tests
│   ├── admin.test.js          # 35 tests
│   ├── database.test.js       # 25 tests
│   ├── ai.test.js             # 20 tests
│   ├── messaging.test.js      # 18 tests
│   └── queue.test.js          # 22 tests
├── fixtures/                  # Test data
│   ├── common.fixtures.js
│   ├── webhook.fixtures.js
│   ├── admin.fixtures.js
│   └── ai.fixtures.js
├── helpers/                   # Test helpers
│   ├── test-helpers.js
│   ├── db-helpers.js
│   └── api-helpers.js
├── jest.config.js             # Jest configuration
├── setup.js                   # Test setup
├── global-setup.js            # Global setup
├── global-teardown.js         # Global teardown
├── README.md                  # This file
└── INTEGRATION_TESTING_GUIDE.md
```

## Environment Variables

Required in `.env.test`:

```env
NODE_ENV=test
PORT=4001
DB_NAME=whatsapp_saas_test
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
ADMIN_TOKEN=test-admin-token
WHATSAPP_WEBHOOK_SECRET=test-webhook-secret
OPENAI_API_KEY=test-openai-key
```

## Writing Tests

### Basic Structure

```javascript
const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/common.fixtures');

describe('Feature Name', () => {
  let testData;

  beforeAll(async () => {
    testData = await fixtures.createTestSalon();
  });

  afterAll(async () => {
    await fixtures.cleanupTestData(testData.id);
  });

  it('should do something', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' });

    expect(response.status).toBe(200);
  });
});
```

### API Testing

```javascript
// GET with auth
const response = await request(app)
  .get('/admin/bookings/salon-123')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

// POST with signature
const signature = generateSignature(payload, secret);
const response = await request(app)
  .post('/webhook/whatsapp')
  .set('X-Hub-Signature-256', signature)
  .send(payload)
  .expect(200);
```

### Database Testing

```javascript
// Create
const salon = await db.models.Salon.create({ ... });

// Query
const bookings = await db.models.Booking.findAll({
  where: { salon_id: salon.id },
});

// Assert
expect(bookings.length).toBeGreaterThan(0);

// Cleanup
await db.models.Salon.destroy({ where: { id: salon.id } });
```

## Test Fixtures

Pre-built test data generators:

```javascript
const fixtures = require('../fixtures/common.fixtures');

// Create test salon
const salon = await fixtures.createTestSalon();

// Create test booking
const booking = await fixtures.createTestBooking(salon.id);

// Create webhook payload
const payload = fixtures.createIncomingMessage({
  from: '+1234567890',
  to: salon.phone,
  body: 'Test message',
});

// Cleanup
await fixtures.cleanupTestData(salon.id);
```

## Troubleshooting

### Tests Fail with Timeout

```bash
# Increase timeout
JEST_TIMEOUT=60000 npm run test:integration

# Or in test file
jest.setTimeout(60000);
```

### Database Connection Errors

```bash
# Check database exists
psql -l | grep whatsapp_saas_test

# Create if missing
createdb whatsapp_saas_test

# Run migrations
npm run migrate -- --env test
```

### Port Already in Use

```bash
# Find and kill process
lsof -i :4001
kill -9 <PID>

# Or use different port
PORT=4002 npm run test:integration
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server

# Or skip Redis-dependent tests
SKIP_REDIS_TESTS=true npm run test:integration
```

## CI/CD Integration

Tests run automatically on:
- Every PR to `main`/`develop`
- Every push to `main`
- Nightly builds

See `.github/workflows/integration-tests.yml`

## Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Overall | 80%+ | 82% ✅ |
| Critical Paths | 100% | 100% ✅ |
| API Endpoints | 90%+ | 93% ✅ |
| Business Logic | 85%+ | 89% ✅ |

## Documentation

**Full Guide**: [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md)

Includes:
- Detailed test suite descriptions
- Coverage requirements
- Writing new tests
- Best practices
- Advanced scenarios

## Support

- **Documentation**: See INTEGRATION_TESTING_GUIDE.md
- **Issues**: Create GitHub issue
- **Questions**: Ask in team chat

---

**Last Updated**: 2025-01-18
**Jest Version**: 29.7.0
**Test Framework**: Jest + Supertest
