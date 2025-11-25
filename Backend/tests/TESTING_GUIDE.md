# Testing Guide - Phase 2 Integration Tests

This guide explains how to use the Phase 2 testing infrastructure for comprehensive integration testing of the WhatsApp SaaS application.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Test Components](#test-components)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Phase 2 testing infrastructure provides three main components:

1. **Supertest Setup** (`tests/setup.ts`) - Test application and database management
2. **Test Seed Data** (`prisma/seed.ts`) - Comprehensive test data seeding
3. **WhatsApp API Mocks** (`tests/mocks/whatsapp-api.mock.ts`) - Mock WhatsApp Cloud API

## Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Environment variables configured

### Environment Configuration

Create a `.env.test` file in the Backend directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_test"

# WhatsApp (test credentials)
WHATSAPP_API_URL="https://graph.facebook.com/v18.0"
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_ACCESS_TOKEN="test_token"

# Application
NODE_ENV="test"
PORT=3001
```

### Install Dependencies

```bash
cd Backend
npm install
```

### Initialize Test Database

```bash
# Run migrations
npx prisma migrate deploy

# Seed test data
npm run prisma:seed
```

## Test Components

### 1. Supertest Setup (`tests/setup.ts`)

Provides utilities for managing test application lifecycle and database.

#### Key Functions

```typescript
// Setup NestJS test application
const app = await setupTestApp();

// Get Prisma client for database operations
const prisma = getTestPrisma();

// Clean database between tests
await cleanTestDatabase();

// Cleanup application and connections
await cleanupTestApp(app);

// Seed basic test data
await seedTestData();
```

#### Database Management

```typescript
// Initialize test database (creates DB and runs migrations)
await initializeTestDatabase();

// Drop test database completely
await dropTestDatabase();

// Clean all data but keep schema
await cleanTestDatabase();
```

#### Test Utilities

```typescript
// Wait for async operations
await waitFor(() => condition === true, { timeout: 5000 });

// Generate unique test IDs
const id = generateTestId('booking');

// Delay execution
await delay(1000);

// Create mock request/response objects
const req = createMockRequest({ user: { id: '123' } });
const res = createMockResponse();
```

### 2. Test Seed Script (`prisma/seed.ts`)

Seeds the database with comprehensive test data.

#### Seeded Data

- **1 Test User**
  - Email: `owner@testsalon.com`
  - Password: `TestPassword123!`
  - Role: SALON_OWNER

- **1 Test Salon**
  - Name: "Test Salon"
  - Phone: "+1234567890"
  - Active trial

- **3 Masters**
  - Sarah Johnson (Haircut, Coloring)
  - Alex Smith (Manicure, Pedicure)
  - Maria Garcia (Facial, Massage, Waxing)

- **5 Services**
  - Haircut (60 min, $50.00)
  - Hair Coloring (120 min, $80.00)
  - Manicure (45 min, $30.00)
  - Pedicure (60 min, $40.00)
  - Facial (90 min, $70.00)

- **5 Sample Bookings**
  - Past completed, cancelled, and upcoming bookings

- **Customer Preferences**
  - Learned booking patterns for 2 customers

- **Waitlist Entries**
  - 2 active waitlist entries

#### Running the Seed

```bash
# Using npm script
npm run prisma:seed

# Direct execution
npx ts-node prisma/seed.ts

# With custom database
DATABASE_URL="postgresql://..." npx ts-node prisma/seed.ts
```

### 3. WhatsApp API Mocks (`tests/mocks/whatsapp-api.mock.ts`)

Provides mock WhatsApp Cloud API responses and webhook payloads.

#### API Response Mocks

```typescript
// Mock successful send message
const response = mockSendMessageResponse('msg_123');

// Mock API error
const error = mockSendMessageError(131047, 'Message failed');

// Mock media operations
const mediaUrl = mockGetMediaUrlResponse('media_123', 'image/jpeg');
const uploadResponse = mockUploadMediaResponse();

// Mock rate limiting
const rateLimitError = mockRateLimitError();
```

#### Webhook Payload Mocks

```typescript
// Text message
const textWebhook = createTextMessageWebhook({
  from: '+1234567890',
  text: 'Hello!',
});

// Button click
const buttonWebhook = createButtonClickWebhook({
  from: '+1234567890',
  buttonId: 'btn_confirm',
  buttonText: 'Confirm',
});

// List reply
const listWebhook = createListReplyWebhook({
  from: '+1234567890',
  listId: 'list_item_1',
  listTitle: 'Option 1',
});

// Image message
const imageWebhook = createImageMessageWebhook({
  from: '+1234567890',
  imageId: 'img_123',
  caption: 'My photo',
});

// Location message
const locationWebhook = createLocationMessageWebhook({
  from: '+1234567890',
  latitude: 40.7128,
  longitude: -74.0060,
  name: 'New York',
});

// Status update
const statusWebhook = createMessageStatusWebhook({
  messageId: 'msg_123',
  status: 'delivered',
  recipientId: '1234567890',
});
```

#### Mock WhatsApp API Client

```typescript
// Create mock client
const mockAPI = createMockWhatsAppAPI();

// Send message (automatically tracked)
await mockAPI.sendMessage('+1234567890', {
  type: 'text',
  text: { body: 'Hello' },
});

// Get sent messages
const messages = mockAPI.getSentMessages();
const lastMessage = mockAPI.getLastMessage();

// Check if message was sent
const wasSent = mockAPI.hasMessageBeenSent(
  msg => msg.to === '+1234567890'
);

// Simulate failures
mockAPI.fail(customError);
await mockAPI.sendMessage(...); // Will throw error

// Reset to success mode
mockAPI.succeed();

// Clear message history
mockAPI.clearMessages();
```

## Usage Examples

### Basic Integration Test

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp, cleanupTestApp, getTestPrisma } from './setup';

describe('Bookings API', () => {
  let app: INestApplication;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  it('should create a booking', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send({
        customerPhone: '+1234567890',
        service: 'Haircut',
        startTime: new Date().toISOString(),
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
  });
});
```

### Testing Webhook Processing

```typescript
import { createTextMessageWebhook } from './mocks/whatsapp-api.mock';

describe('WhatsApp Webhook', () => {
  it('should process text message', async () => {
    const webhook = createTextMessageWebhook({
      from: '+1234567890',
      text: 'Book appointment',
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/whatsapp')
      .send(webhook)
      .expect(200);

    // Verify message was stored
    const messages = await prisma.message.findMany({
      where: { phone_number: '+1234567890' },
    });

    expect(messages.length).toBeGreaterThan(0);
  });
});
```

### Testing with Mocked API

```typescript
import { createMockWhatsAppAPI } from './mocks/whatsapp-api.mock';

describe('Message Service', () => {
  let mockAPI: MockWhatsAppAPI;

  beforeEach(() => {
    mockAPI = createMockWhatsAppAPI();
  });

  it('should send confirmation message', async () => {
    await mockAPI.sendMessage('+1234567890', {
      type: 'text',
      text: { body: 'Booking confirmed!' },
    });

    const sentMessages = mockAPI.getSentMessages();
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message.text.body).toBe('Booking confirmed!');
  });

  it('should handle API failures', async () => {
    mockAPI.fail();

    await expect(
      mockAPI.sendMessage('+1234567890', { type: 'text', text: { body: 'Test' } })
    ).rejects.toBeDefined();
  });
});
```

### End-to-End Booking Flow

```typescript
import {
  createTextMessageWebhook,
  createButtonClickWebhook,
} from './mocks/whatsapp-api.mock';

describe('E2E Booking Flow', () => {
  it('should complete booking process', async () => {
    const customerPhone = '+1555000123';

    // 1. Customer initiates booking
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/whatsapp')
      .send(createTextMessageWebhook({
        from: customerPhone,
        text: 'I want to book',
      }))
      .expect(200);

    // 2. Customer selects service
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/whatsapp')
      .send(createButtonClickWebhook({
        from: customerPhone,
        buttonId: 'service_haircut',
        buttonText: 'Haircut',
      }))
      .expect(200);

    // 3. Verify booking was created
    const booking = await prisma.booking.findFirst({
      where: { customer_phone: customerPhone },
    });

    expect(booking).toBeDefined();
    expect(booking.service).toBe('Haircut');
  });
});
```

## Best Practices

### Test Isolation

```typescript
// Clean database before each test
beforeEach(async () => {
  await cleanTestDatabase();
});
```

### Seed Data Management

```typescript
// Seed only when needed
beforeEach(async () => {
  await cleanTestDatabase();
  await seedTestData(); // Only if test needs it
});
```

### Mock Management

```typescript
// Clear mocks between tests
beforeEach(() => {
  mockAPI.clearMessages();
  jest.clearAllMocks();
});
```

### Assertions

```typescript
// Use specific assertions
expect(response.body).toMatchObject({
  id: expect.any(String),
  status: 'CONFIRMED',
});

// Verify database state
const dbRecord = await prisma.booking.findUnique({
  where: { id: response.body.id },
});
expect(dbRecord).toBeDefined();
```

### Error Testing

```typescript
// Test both success and failure paths
it('should handle invalid input', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/bookings')
    .send({ /* invalid data */ })
    .expect(400);
});
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL in .env.test
echo $DATABASE_URL

# Reset test database
npx prisma migrate reset --force
```

### Migration Issues

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Test Timeouts

```typescript
// Increase timeout for slow tests
jest.setTimeout(30000); // 30 seconds

// Or per test
it('slow test', async () => {
  // test code
}, 30000);
```

### Port Conflicts

```bash
# Change test port in .env.test
PORT=3002

# Or kill process using port
lsof -ti:3001 | xargs kill -9
```

### Clear Test Data

```bash
# Drop and recreate database
npx prisma migrate reset --force

# Or manually
psql -U postgres -c "DROP DATABASE whatsapp_test"
psql -U postgres -c "CREATE DATABASE whatsapp_test"
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/example-integration.test.ts

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch

# Debug mode
npm run test:debug
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all API endpoints
- **E2E Tests**: Cover critical user flows

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

## Support

For issues or questions:
1. Check this guide
2. Review example tests in `tests/example-integration.test.ts`
3. Consult team documentation
4. Ask in team chat
