# Integration Testing Guide

Comprehensive guide for integration testing of the WhatsApp SaaS platform API endpoints and system components.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Suites](#test-suites)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Writing Tests](#writing-tests)
7. [Test Data & Fixtures](#test-data--fixtures)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Integration Testing?

Integration tests verify that different parts of the system work together correctly:

- **API Endpoints**: HTTP request/response handling
- **Database Operations**: CRUD, transactions, constraints
- **External Services**: WhatsApp API, OpenAI, Redis
- **Message Queue**: Job creation and processing
- **Authentication**: Token validation, permissions
- **Business Logic**: End-to-end workflows

### Technology Stack

- **Test Framework**: Jest
- **HTTP Testing**: Supertest
- **Database**: PostgreSQL (test database)
- **Cache**: Redis (test instance)
- **Queue**: Bull/BullMQ
- **Mocking**: Jest mocks for external APIs

### Test Statistics

- **Total Tests**: 150+
- **Test Suites**: 6
- **Code Coverage Target**: 80%+
- **Critical Path Coverage**: 100%
- **Estimated Duration**: 5-10 minutes

---

## Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# PostgreSQL 15+
psql --version

# Redis 7+
redis-cli --version
```

### Installation

```bash
# Navigate to Backend directory
cd Backend

# Install dependencies (if not already done)
npm install

# Install test-specific dependencies
npm install --save-dev jest supertest @types/jest
```

### Environment Setup

Create `.env.test` in the `Backend/` directory:

```env
# Server
NODE_ENV=test
PORT=4001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_saas_test
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=2

# Authentication
ADMIN_TOKEN=test-admin-token-integration
JWT_SECRET=test-jwt-secret-integration

# WhatsApp
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_TOKEN=test-whatsapp-token
WHATSAPP_WEBHOOK_SECRET=test-webhook-secret
WHATSAPP_VERIFY_TOKEN=test-verify-token

# OpenAI
OPENAI_API_KEY=test-openai-key

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=60000
```

### Database Setup

```bash
# Create test database
createdb whatsapp_saas_test

# Run migrations
npm run migrate -- --env test

# Seed test data
npm run seed:test
```

### Running Your First Test

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- webhook

# Run with coverage
npm run test:integration -- --coverage
```

---

## Test Suites

### 1. Webhook Integration (`webhook.test.js`)

**Purpose**: Tests WhatsApp webhook endpoint

**Test Cases** (30 tests):

#### Valid Message Processing
- ✅ Accept valid webhook with correct signature
- ✅ Store incoming message in database
- ✅ Create conversation if not exists
- ✅ Handle text messages
- ✅ Handle image messages
- ✅ Handle document messages
- ✅ Handle video messages
- ✅ Handle audio messages
- ✅ Update conversation timestamp

#### Invalid Signature Rejection
- ✅ Reject webhook with invalid signature
- ✅ Reject webhook with missing signature
- ✅ Reject webhook with expired timestamp
- ✅ Reject replayed webhooks

#### Rate Limiting
- ✅ Rate limit excessive requests
- ✅ Include retry-after header when limited
- ✅ Reset rate limit after cooldown
- ✅ Different limits per customer phone

#### Queue Job Creation
- ✅ Create job for message processing
- ✅ Process job and send AI response
- ✅ Retry failed jobs
- ✅ Handle job timeout
- ✅ Priority queue for urgent messages

#### Webhook Verification
- ✅ Verify webhook with correct token
- ✅ Reject verification with incorrect token

#### Error Handling
- ✅ Handle malformed JSON
- ✅ Handle missing required fields
- ✅ Handle invalid phone number format
- ✅ Handle non-existent salon
- ✅ Handle database errors gracefully

**Example Test**:
```javascript
describe('POST /webhook - Valid Message Processing', () => {
  it('should accept valid webhook with correct signature', async () => {
    const payload = fixtures.createIncomingMessage({
      from: '+1234567890',
      to: testSalon.phone,
      body: 'Hello',
    });

    const signature = generateSignature(JSON.stringify(payload), webhookSecret);

    const response = await request(app)
      .post('/webhook/whatsapp')
      .set('X-Hub-Signature-256', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});
```

---

### 2. Admin API (`admin.test.js`)

**Purpose**: Tests admin dashboard API endpoints

**Test Cases** (35 tests):

#### Authentication
- ✅ Allow access with valid admin token
- ✅ Reject requests without token
- ✅ Reject requests with invalid token
- ✅ Reject expired tokens

#### GET /admin/stats
- ✅ Return statistics for salon
- ✅ Filter by date range
- ✅ Include all metrics (bookings, messages, revenue)
- ✅ Handle empty data gracefully
- ✅ Validate date range parameters

#### GET /admin/bookings
- ✅ List all bookings for salon
- ✅ Paginate results (page, limit)
- ✅ Filter by status (pending, confirmed, cancelled)
- ✅ Filter by date range
- ✅ Search by customer phone
- ✅ Search by customer name
- ✅ Sort by date (ascending/descending)
- ✅ Include pagination metadata
- ✅ Enforce max page size (100)

#### GET /admin/messages
- ✅ List all messages for salon
- ✅ Paginate results
- ✅ Filter by conversation
- ✅ Filter by direction (incoming/outgoing)
- ✅ Filter by date range
- ✅ Search by customer phone
- ✅ Include message metadata

#### GET /admin/ai/analytics
- ✅ Return AI analytics
- ✅ Include intent distribution
- ✅ Include entity extraction stats
- ✅ Include conversation metrics
- ✅ Filter by date range
- ✅ Calculate accuracy metrics

#### POST /admin/bookings/:id/update
- ✅ Update booking status
- ✅ Update appointment date
- ✅ Update service type
- ✅ Validate status transitions
- ✅ Send notification on update

#### Error Handling
- ✅ Handle non-existent salon
- ✅ Handle invalid query parameters
- ✅ Handle database errors
- ✅ Return proper error codes (400, 401, 404, 500)

**Example Test**:
```javascript
describe('GET /admin/bookings', () => {
  it('should list bookings with pagination', async () => {
    const response = await request(app)
      .get(`/admin/bookings/${testSalon.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });
});
```

---

### 3. Database Operations (`database.test.js`)

**Purpose**: Tests database layer operations

**Test Cases** (25 tests):

#### CRUD Operations
- ✅ Create salon
- ✅ Read salon by ID
- ✅ Update salon
- ✅ Delete salon (soft delete)
- ✅ Create booking
- ✅ Read booking by ID
- ✅ Update booking
- ✅ Delete booking
- ✅ Create message
- ✅ Create conversation

#### Transactions
- ✅ Commit successful transaction
- ✅ Rollback failed transaction
- ✅ Handle concurrent transactions
- ✅ Prevent race conditions

#### Constraints
- ✅ Enforce foreign key constraints
- ✅ Enforce unique constraints
- ✅ Enforce not null constraints
- ✅ Validate date constraints (appointment in future)
- ✅ Validate enum constraints (status values)

#### Index Usage
- ✅ Use index for salon_id lookups
- ✅ Use index for date range queries
- ✅ Use index for status filters
- ✅ Use composite index for salon + date

#### Connection Pooling
- ✅ Acquire connection from pool
- ✅ Release connection back to pool
- ✅ Handle pool exhaustion
- ✅ No connection leaks

**Example Test**:
```javascript
describe('Database Transactions', () => {
  it('should rollback on error', async () => {
    const transaction = await db.transaction();

    try {
      await db.models.Salon.create({
        name: 'Test Salon',
        phone: '+1234567890',
      }, { transaction });

      // Force error
      throw new Error('Test error');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }

    const count = await db.models.Salon.count({
      where: { phone: '+1234567890' },
    });

    expect(count).toBe(0); // Should be rolled back
  });
});
```

---

### 4. AI Processing (`ai.test.js`)

**Purpose**: Tests AI message processing

**Test Cases** (20 tests):

#### Intent Detection
- ✅ Detect booking intent
- ✅ Detect cancellation intent
- ✅ Detect modification intent
- ✅ Detect inquiry intent
- ✅ Handle unclear intent
- ✅ Confidence score calculation

#### Entity Extraction
- ✅ Extract service type
- ✅ Extract date and time
- ✅ Extract customer name
- ✅ Extract phone number
- ✅ Handle multiple entities
- ✅ Handle missing entities

#### Booking Creation
- ✅ Create booking from extracted entities
- ✅ Validate booking data
- ✅ Handle conflicting appointments
- ✅ Send confirmation message

#### Context Management
- ✅ Store conversation context
- ✅ Retrieve conversation context
- ✅ Update context with new information
- ✅ Clear old context

#### Error Handling
- ✅ Handle OpenAI API errors
- ✅ Handle timeout
- ✅ Fallback to rule-based processing
- ✅ Log AI failures

**Example Test**:
```javascript
describe('Intent Detection', () => {
  it('should detect booking intent', async () => {
    const message = 'I want to book a haircut for tomorrow at 2pm';

    const result = await aiService.detectIntent(message);

    expect(result.intent).toBe('booking');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.entities).toMatchObject({
      service: 'haircut',
      date: expect.any(String),
      time: '14:00',
    });
  });
});
```

---

### 5. Messaging (`messaging.test.js`)

**Purpose**: Tests WhatsApp message sending

**Test Cases** (18 tests):

#### Send WhatsApp Message
- ✅ Send text message
- ✅ Send template message
- ✅ Send media message (image)
- ✅ Send media message (document)
- ✅ Handle API success
- ✅ Store sent message in database

#### Template Messages
- ✅ Send booking confirmation template
- ✅ Send reminder template
- ✅ Send cancellation template
- ✅ Validate template parameters

#### Rate Limiting
- ✅ Respect WhatsApp rate limits
- ✅ Queue messages when rate limited
- ✅ Retry after cooldown

#### Error Handling
- ✅ Handle API errors
- ✅ Handle network errors
- ✅ Handle invalid phone numbers
- ✅ Log message failures

#### Cost Tracking
- ✅ Track message costs
- ✅ Calculate monthly costs
- ✅ Generate cost reports

**Example Test**:
```javascript
describe('Send WhatsApp Message', () => {
  it('should send text message and store in database', async () => {
    const result = await messagingService.sendMessage({
      to: '+1234567890',
      body: 'Test message',
      salonId: testSalon.id,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();

    const message = await db.models.Message.findOne({
      where: { whatsapp_message_id: result.messageId },
    });

    expect(message).toBeTruthy();
    expect(message.direction).toBe('outgoing');
  });
});
```

---

### 6. Queue Processing (`queue.test.js`)

**Purpose**: Tests message queue operations

**Test Cases** (22 tests):

#### Job Creation
- ✅ Create job for message processing
- ✅ Create job with priority
- ✅ Create job with delay
- ✅ Create bulk jobs

#### Job Processing
- ✅ Process job successfully
- ✅ Update job progress
- ✅ Complete job
- ✅ Handle job data

#### Job Failure
- ✅ Mark job as failed
- ✅ Store failure reason
- ✅ Move to failed queue

#### Retry Logic
- ✅ Retry failed job
- ✅ Exponential backoff
- ✅ Max retry attempts
- ✅ Give up after max retries

#### Concurrency
- ✅ Process multiple jobs concurrently
- ✅ Respect concurrency limits
- ✅ No race conditions

#### Job Lifecycle
- ✅ Waiting → Active → Completed
- ✅ Waiting → Active → Failed
- ✅ Failed → Waiting (retry)
- ✅ Clean up old jobs
- ✅ Get job status
- ✅ Cancel job

**Example Test**:
```javascript
describe('Job Processing', () => {
  it('should process job and update status', async () => {
    const job = await queue.add('process-message', {
      messageId: 'test-123',
      customerPhone: '+1234567890',
    });

    // Wait for processing
    await delay(2000);

    const completed = await job.isCompleted();
    expect(completed).toBe(true);

    const result = await job.finished();
    expect(result).toHaveProperty('success', true);
  });
});
```

---

## Running Tests

### Run All Tests

```bash
# All integration tests
npm run test:integration

# With coverage
npm run test:integration -- --coverage

# Watch mode
npm run test:integration -- --watch
```

### Run Specific Suite

```bash
# Single test file
npm run test:integration -- webhook

# Multiple test files
npm run test:integration -- webhook admin

# Pattern matching
npm run test:integration -- --testNamePattern="should accept valid"
```

### Run in Different Modes

```bash
# Verbose output
npm run test:integration -- --verbose

# Silent mode
npm run test:integration -- --silent

# Bail on first failure
npm run test:integration -- --bail

# Run specific test
npm run test:integration -- --testNamePattern="should accept valid webhook"
```

### Environment Variables

```bash
# Use different database
DB_NAME=whatsapp_saas_test_custom npm run test:integration

# Increase timeout
JEST_TIMEOUT=30000 npm run test:integration

# Enable debug logging
DEBUG=* npm run test:integration
```

---

## Test Coverage

### Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| **Overall Coverage** | 80%+ | TBD |
| **Critical Paths** | 100% | TBD |
| **API Endpoints** | 90%+ | TBD |
| **Database Layer** | 85%+ | TBD |
| **Business Logic** | 90%+ | TBD |
| **Error Handling** | 80%+ | TBD |

### Generate Coverage Report

```bash
# Run tests with coverage
npm run test:integration -- --coverage

# View HTML report
open coverage/lcov-report/index.html

# View terminal summary
npm run test:integration -- --coverage --coverageReporters=text
```

### Coverage Report Structure

```
coverage/
├── lcov-report/       # HTML report
│   └── index.html
├── coverage-final.json
└── lcov.info          # LCOV format for CI tools
```

---

## Writing Tests

### Basic Test Structure

```javascript
const request = require('supertest');
const { app } = require('../../../src/app');
const { db } = require('../../../src/config/database');
const fixtures = require('../fixtures/common.fixtures');

describe('Feature Name', () => {
  let testData;

  beforeAll(async () => {
    // Setup that runs once
    testData = await fixtures.createTestSalon();
  });

  afterAll(async () => {
    // Cleanup that runs once
    await fixtures.cleanupTestData(testData.id);
    await db.close();
  });

  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('Specific Feature', () => {
    it('should do something', async () => {
      // Arrange
      const testInput = { ... };

      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .send(testInput);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ ... });
    });
  });
});
```

### API Request Testing

```javascript
// GET request with query parameters
const response = await request(app)
  .get('/admin/bookings/salon-123')
  .query({ page: 1, limit: 20, status: 'confirmed' })
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

// POST request with JSON body
const response = await request(app)
  .post('/webhook/whatsapp')
  .set('X-Hub-Signature-256', signature)
  .set('Content-Type', 'application/json')
  .send(payload)
  .expect(200);

// PUT request
const response = await request(app)
  .put('/admin/bookings/booking-123')
  .set('Authorization', `Bearer ${token}`)
  .send({ status: 'confirmed' })
  .expect(200);

// DELETE request
const response = await request(app)
  .delete('/admin/bookings/booking-123')
  .set('Authorization', `Bearer ${token}`)
  .expect(204);
```

### Database Testing

```javascript
// Create test data
const salon = await db.models.Salon.create({
  name: 'Test Salon',
  phone: '+1234567890',
});

// Query data
const bookings = await db.models.Booking.findAll({
  where: { salon_id: salon.id },
  order: [['created_at', 'DESC']],
});

// Verify data
expect(bookings.length).toBeGreaterThan(0);
expect(bookings[0]).toMatchObject({
  salon_id: salon.id,
  status: 'confirmed',
});

// Cleanup
await db.models.Booking.destroy({ where: { salon_id: salon.id } });
await db.models.Salon.destroy({ where: { id: salon.id } });
```

### Async Testing

```javascript
// Async/await
it('should process async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(true);
});

// Wait for processing
it('should wait for job processing', async () => {
  await triggerJob();

  // Wait 2 seconds for processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = await checkJobResult();
  expect(result).toBe('completed');
});
```

### Mocking External Services

```javascript
// Mock OpenAI
jest.mock('../../../src/services/openai', () => ({
  chat: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked response' } }],
  }),
}));

// Mock WhatsApp API
jest.mock('../../../src/services/whatsapp', () => ({
  sendMessage: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-message-id',
  }),
}));

// Use mock
const response = await openai.chat('test prompt');
expect(response.choices[0].message.content).toBe('Mocked response');
```

---

## Test Data & Fixtures

### Fixture Structure

```javascript
// fixtures/common.fixtures.js
module.exports = {
  createTestSalon: async () => {
    return await db.models.Salon.create({
      id: `salon_test_${Date.now()}`,
      name: 'Test Salon',
      phone: '+1234567890',
      email: 'test@example.com',
    });
  },

  createTestBooking: async (salonId) => {
    return await db.models.Booking.create({
      salon_id: salonId,
      customer_phone: '+9876543210',
      service_type: 'Haircut',
      appointment_date: new Date(Date.now() + 86400000),
      status: 'confirmed',
    });
  },

  cleanupTestData: async (salonId) => {
    await db.models.Message.destroy({ where: { salon_id: salonId } });
    await db.models.Booking.destroy({ where: { salon_id: salonId } });
    await db.models.Salon.destroy({ where: { id: salonId } });
  },
};
```

### Webhook Fixtures

```javascript
// fixtures/webhook.fixtures.js
module.exports = {
  createIncomingMessage: ({ from, to, body, timestamp }) => ({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry-id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: to,
            phone_number_id: 'test-phone-id',
          },
          messages: [{
            from,
            id: `msg_${Date.now()}`,
            timestamp: timestamp || Date.now(),
            type: 'text',
            text: { body },
          }],
        },
        field: 'messages',
      }],
    }],
  }),

  createImageMessage: ({ from, to, imageId, mimeType }) => ({
    // ... image message structure
  }),
};
```

---

## Best Practices

### Test Organization

✅ **DO**:
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent
- Clean up test data after each test

❌ **DON'T**:
- Share state between tests
- Rely on test execution order
- Leave test data in database
- Skip cleanup in afterEach/afterAll

### Performance

✅ **DO**:
- Use `beforeAll` for expensive setup
- Reuse database connections
- Run tests in parallel
- Mock external APIs

❌ **DON'T**:
- Create new connections per test
- Make real API calls
- Test external services directly

### Reliability

✅ **DO**:
- Wait for async operations
- Use proper timeout values
- Verify database state
- Test error scenarios

❌ **DON'T**:
- Use arbitrary timeouts
- Assume operations complete instantly
- Skip error case testing

---

## Troubleshooting

### Tests Failing Locally

```bash
# Check database connection
psql -h localhost -U postgres -d whatsapp_saas_test

# Check Redis
redis-cli ping

# Clear test database
psql -h localhost -U postgres -d whatsapp_saas_test -c "TRUNCATE TABLE messages, bookings, conversations, salons CASCADE;"

# Run single test with debug
DEBUG=* npm run test:integration -- webhook --verbose
```

### Port Already in Use

```bash
# Find process using port 4001
lsof -i :4001

# Kill process
kill -9 <PID>

# Or use different port
PORT=4002 npm run test:integration
```

### Database Connection Issues

```bash
# Verify environment variables
echo $DB_HOST
echo $DB_NAME

# Check if test database exists
psql -h localhost -U postgres -l | grep whatsapp_saas_test

# Create if missing
createdb whatsapp_saas_test
```

---

## Resources

### Documentation

- **Jest Docs**: https://jestjs.io
- **Supertest Docs**: https://github.com/visionmedia/supertest
- **Testing Best Practices**: https://testingjavascript.com

### Support

- **Issues**: Create GitHub issue
- **Questions**: Ask in team chat

---

**Last Updated**: 2025-01-18
**Jest Version**: 29.7.0
**Node Version**: 18+
