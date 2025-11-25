# Testing Quick Start Guide

Get up and running with integration tests in 5 minutes.

## 1. Install Dependencies

```bash
cd Backend
npm install
```

## 2. Configure Environment

Create `.env.test` file:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_test"
NODE_ENV="test"
PORT=3001
```

## 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:deploy

# Seed test data
npm run db:seed
```

## 4. Run Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:cov

# Watch mode (auto-rerun on changes)
npm run test:integration:watch
```

## 5. Write Your First Test

Create `tests/my-first.test.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp, cleanupTestApp, getTestPrisma, seedTestData } from './setup';

describe('My First Integration Test', () => {
  let app: INestApplication;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    app = await setupTestApp();
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  it('should work', async () => {
    // Test your API
    const response = await request(app.getHttpServer())
      .get('/api/v1/salons')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```

## 6. Run Your Test

```bash
npm run test:integration -- tests/my-first.test.ts
```

## Common Commands

```bash
# Seed database with test data
npm run db:seed

# Reset database (drop + migrate + seed)
npm run db:reset

# Run specific test file
npm run test:integration -- tests/example-integration.test.ts

# Run tests matching pattern
npm run test:integration -- --testNamePattern="should create booking"

# Debug tests
npm run test:debug
```

## Next Steps

1. Read the full [Testing Guide](./TESTING_GUIDE.md)
2. Explore [Example Tests](./example-integration.test.ts)
3. Review [WhatsApp Mocks](./mocks/whatsapp-api.mock.ts)
4. Check [Test Setup](./setup.ts) utilities

## Troubleshooting

### Database connection failed

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Create database manually
psql -U postgres -c "CREATE DATABASE whatsapp_test"
```

### Prisma client not found

```bash
npm run prisma:generate
```

### Port already in use

```bash
# Change PORT in .env.test
PORT=3002
```

### Tests timing out

```typescript
// Increase timeout in test
jest.setTimeout(30000);
```

## Test Data

After seeding, you'll have:

- **Test User**: `owner@testsalon.com` / `TestPassword123!`
- **Test Salon**: "Test Salon"
- **3 Masters**: Sarah, Alex, Maria
- **5 Services**: Haircut, Coloring, Manicure, Pedicure, Facial
- **5 Bookings**: Various statuses and dates

## Support

Having issues? Check:
1. [Testing Guide](./TESTING_GUIDE.md) - Comprehensive documentation
2. [Example Tests](./example-integration.test.ts) - Working examples
3. PostgreSQL is running and accessible
4. `.env.test` file exists and is configured correctly
