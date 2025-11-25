# Mock System Documentation

## Overview

This document describes the comprehensive mock system for integration testing. All external dependencies (OpenAI, Redis, WhatsApp) are mocked to enable fast, reliable tests without external API calls.

## Architecture

```
Backend/tests/
├── mocks/
│   ├── openai.mock.ts          # OpenAI API mock
│   ├── redis.mock.ts            # Redis cache mock
│   └── whatsapp-api.mock.ts    # WhatsApp Cloud API mock
├── setup.ts                     # Test setup with mock integration
└── test-app.factory.ts          # Test app creation utilities
```

## Mock Capabilities

### 1. OpenAI Mock (`openai.mock.ts`)

**Purpose**: Mock OpenAI chat completions API for intent parsing without external calls.

**Features**:
- Pattern-based intent parsing (deterministic results)
- Predefined responses for common test scenarios
- Configurable success/failure modes
- Call tracking and history

**Usage**:

```typescript
import { createMockOpenAI, parseTestIntent } from './mocks/openai.mock';

// Create mock instance
const mockOpenAI = createMockOpenAI();

// Configure for success
mockOpenAI.succeed();

// Call API (returns mock response)
const response = await mockOpenAI.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: 'You are a booking assistant' },
    { role: 'user', content: 'Haircut Friday 3pm' }
  ]
});

// Extract intent from response
const intent = JSON.parse(response.choices[0].message.content);
console.log(intent);
// Output: {
//   serviceName: "Haircut",
//   preferredDate: "2025-10-31",
//   preferredTime: "15:00",
//   language: "en"
// }

// Configure for failure
mockOpenAI.fail(new Error('OpenAI timeout'));

// Get call statistics
console.log(mockOpenAI.getCallCount()); // 1
console.log(mockOpenAI.getCallHistory());

// Reset mock state
mockOpenAI.reset();
```

**Test Intent Patterns**:

| Input | Output Intent |
|-------|--------------|
| `"Haircut Friday 3pm"` | `{ serviceName: "Haircut", preferredDate: "2025-10-31", preferredTime: "15:00", language: "en" }` |
| `"Manicure tomorrow 2pm"` | `{ serviceName: "Manicure", preferredDate: "2025-10-26", preferredTime: "14:00", language: "en" }` |
| `"Facial next Monday morning"` | `{ serviceName: "Facial", preferredDate: "2025-10-27", preferredTimeOfDay: "morning", language: "en" }` |

**Direct Intent Parsing** (without API call):

```typescript
import { parseTestIntent } from './mocks/openai.mock';

const intent = parseTestIntent("Haircut Friday 3pm");
// Returns: BookingIntent object
```

---

### 2. Redis Mock (`redis.mock.ts`)

**Purpose**: Mock Redis client for caching without requiring a real Redis instance.

**Features**:
- In-memory Map-based storage
- Full command support: get, set, del, exists, ttl, incr, decr, expire
- TTL (time-to-live) with automatic expiration
- Configurable success/failure modes
- Call tracking and history

**Usage**:

```typescript
import { createMockRedis } from './mocks/redis.mock';

// Create mock instance
const redis = createMockRedis();

// Set value with TTL
await redis.set('user:123', JSON.stringify({ name: 'John' }), 3600); // 1 hour TTL

// Get value
const value = await redis.get('user:123');
console.log(JSON.parse(value)); // { name: 'John' }

// Check if key exists
const exists = await redis.exists('user:123'); // Returns 1

// Get TTL
const ttl = await redis.ttl('user:123'); // Returns remaining seconds

// Delete key
await redis.del('user:123');

// Increment counter
await redis.incr('booking:count'); // Returns 1
await redis.incr('booking:count'); // Returns 2

// Set expiration on existing key
await redis.set('session:abc', 'session-data');
await redis.expire('session:abc', 1800); // 30 minutes

// Clear all keys
await redis.flushall();

// Configure for failure
redis.fail(new Error('Redis connection failed'));

// Get call statistics
console.log(redis.getCallCount());
console.log(redis.getCallHistory());
console.log(redis.getStoreSize()); // Number of keys in store
console.log(redis.getAllKeys()); // Array of all keys

// Reset mock state
redis.reset();
```

**Supported Commands**:

| Command | Description | Example |
|---------|-------------|---------|
| `get(key)` | Get value | `await redis.get('key')` |
| `set(key, value, ttl?)` | Set value with optional TTL | `await redis.set('key', 'value', 3600)` |
| `setex(key, seconds, value)` | Set with expiration | `await redis.setex('key', 3600, 'value')` |
| `del(key)` | Delete key(s) | `await redis.del('key')` or `await redis.del(['key1', 'key2'])` |
| `exists(key)` | Check if key exists | `await redis.exists('key')` (returns 1 or 0) |
| `ttl(key)` | Get time to live | `await redis.ttl('key')` (returns seconds, -1 = no expiry, -2 = not found) |
| `incr(key)` | Increment by 1 | `await redis.incr('counter')` |
| `decr(key)` | Decrement by 1 | `await redis.decr('counter')` |
| `expire(key, seconds)` | Set expiration | `await redis.expire('key', 3600)` |
| `mget(keys)` | Get multiple values | `await redis.mget(['key1', 'key2'])` |
| `flushall()` | Clear all keys | `await redis.flushall()` |

---

### 3. WhatsApp Mock (`whatsapp-api.mock.ts`)

**Purpose**: Mock WhatsApp Cloud API for message sending without external calls.

**Features**:
- Mock message sending (text, interactive, buttons, lists)
- Webhook payload generators
- Message tracking and assertions
- Configurable success/failure modes

**Usage**:

```typescript
import {
  createMockWhatsAppAPI,
  createTextMessageWebhook,
  createButtonClickWebhook,
} from './mocks/whatsapp-api.mock';

// Create mock instance
const mockWhatsApp = createMockWhatsAppAPI();

// Configure for success
mockWhatsApp.succeed();

// Send text message
await mockWhatsApp.sendTextMessage('+1234567890', 'Hello!');

// Send interactive message
await mockWhatsApp.sendInteractiveMessage('+1234567890', {
  type: 'button',
  body: { text: 'Choose an option' },
  action: {
    buttons: [
      { type: 'reply', reply: { id: 'btn1', title: 'Option 1' } }
    ]
  }
});

// Get sent messages
const messages = mockWhatsApp.getSentMessages();
console.log(messages.length); // 2

// Get last message
const lastMessage = mockWhatsApp.getLastMessage();
console.log(lastMessage.message.type); // 'interactive'

// Check if specific message was sent
const found = mockWhatsApp.hasMessageBeenSent(
  (msg) => msg.message.type === 'text'
);
console.log(found); // true

// Clear message queue
mockWhatsApp.clearMessages();

// Configure for failure
mockWhatsApp.fail(new Error('WhatsApp API error'));

// Reset mock
mockWhatsApp.clearMessages();
mockWhatsApp.succeed();
```

**Webhook Payload Generators**:

```typescript
// Create text message webhook (customer types message)
const webhook = createTextMessageWebhook({
  from: '+1234567890',
  text: 'Haircut Friday 3pm',
  name: 'John Doe'
});

// Create button click webhook (customer taps button)
const buttonWebhook = createButtonClickWebhook({
  from: '+1234567890',
  buttonId: 'slot_2025-10-25_15:00_m123',
  buttonText: '3:00 PM - Sarah'
});

// Create list reply webhook (customer selects from list)
const listWebhook = createListReplyWebhook({
  from: '+1234567890',
  listId: 'service_haircut',
  listTitle: 'Haircut'
});

// Send webhook to app
await request(app.getHttpServer())
  .post('/api/v1/whatsapp/webhook')
  .send(webhook)
  .expect(200);
```

---

## Integration Testing Setup

### Method 1: Using `setupTestApp()` (Recommended)

The `setupTestApp()` function automatically initializes all mocks:

```typescript
import {
  setupTestApp,
  cleanupTestApp,
  getTestPrisma,
  getMockOpenAI,
  getMockRedis,
  getMockWhatsApp
} from './setup';

describe('Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Automatically creates all mocks
    app = await setupTestApp();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await cleanupTestApp(app);
  });

  beforeEach(() => {
    // Get mock instances
    const mockOpenAI = getMockOpenAI();
    const mockRedis = getMockRedis();
    const mockWhatsApp = getMockWhatsApp();

    // Reset mocks for each test
    mockOpenAI.reset();
    mockRedis.reset();
    mockWhatsApp.clearMessages();
    mockWhatsApp.succeed();
  });

  it('should complete booking flow', async () => {
    const mockWhatsApp = getMockWhatsApp();

    // Send initial message
    const webhook = createTextMessageWebhook({
      from: '+1234567890',
      text: 'Haircut Friday 3pm'
    });

    await request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .send(webhook)
      .expect(200);

    // Verify interactive message was sent
    const messages = mockWhatsApp.getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].message.type).toBe('interactive');
  });
});
```

### Method 2: Using Test App Factory

For more control over mock configuration:

```typescript
import {
  createTestApp,
  configureMocksForSuccess,
  configureMocksForFailure,
  resetMocks,
  getMockCallStats
} from './test-app.factory';

describe('Advanced Integration Tests', () => {
  let testContext;

  beforeAll(async () => {
    testContext = await createTestApp();
  });

  afterAll(async () => {
    await testContext.app.close();
  });

  beforeEach(() => {
    resetMocks(testContext);
    configureMocksForSuccess(testContext);
  });

  it('should handle OpenAI timeout', async () => {
    // Configure OpenAI to fail
    testContext.mocks.openai.fail(new Error('Timeout'));

    // Test error handling
    const webhook = createTextMessageWebhook({
      from: '+1234567890',
      text: 'Haircut Friday 3pm'
    });

    await request(testContext.app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .send(webhook)
      .expect(200);

    // Verify error message sent
    const messages = testContext.mocks.whatsapp.getSentMessages();
    expect(messages[0].message.text.body).toContain('error');
  });

  it('should track mock calls', async () => {
    // Perform operations...

    // Get statistics
    const stats = getMockCallStats(testContext);
    console.log(`OpenAI calls: ${stats.openai}`);
    console.log(`Redis calls: ${stats.redis}`);
    console.log(`WhatsApp messages: ${stats.whatsapp}`);
  });
});
```

---

## Mock Configuration Patterns

### Success Scenario (Default)

```typescript
beforeEach(() => {
  const mockOpenAI = getMockOpenAI();
  const mockRedis = getMockRedis();
  const mockWhatsApp = getMockWhatsApp();

  mockOpenAI.succeed();
  mockRedis.succeed();
  mockWhatsApp.succeed();
});
```

### Failure Scenarios

```typescript
it('should handle OpenAI failure', async () => {
  const mockOpenAI = getMockOpenAI();
  mockOpenAI.fail(new Error('OpenAI API timeout'));

  // Test error handling...
});

it('should handle Redis failure', async () => {
  const mockRedis = getMockRedis();
  mockRedis.fail(new Error('Redis connection error'));

  // Test graceful degradation...
});

it('should handle WhatsApp failure', async () => {
  const mockWhatsApp = getMockWhatsApp();
  mockWhatsApp.fail(new Error('WhatsApp API error'));

  // Test retry logic...
});
```

### Rate Limit Simulation

```typescript
it('should handle OpenAI rate limit', async () => {
  const mockOpenAI = getMockOpenAI();

  const rateLimitError = new Error('Rate limit exceeded');
  rateLimitError.status = 429;

  mockOpenAI.fail(rateLimitError);

  // Test rate limit handling...
});
```

---

## Test Data Seeding

The `seedTestData()` function creates baseline data for tests:

```typescript
import { seedTestData, getTestSalon, getTestServices, getTestMasters } from './setup';

beforeAll(async () => {
  await setupTestApp();
  await cleanTestDatabase();
  await seedTestData();
});

it('should use seeded data', async () => {
  const salon = await getTestSalon();
  console.log(salon.name); // "Test Beauty Salon"

  const services = await getTestServices();
  console.log(services); // [Haircut, Manicure, Facial, Coloring, Pedicure, Massage]

  const masters = await getTestMasters();
  console.log(masters); // [Sarah Johnson, Emily Davis, Jessica Martinez]
});
```

**Seeded Data**:

| Entity | Details |
|--------|---------|
| **User** | Email: `test@example.com`, Role: `SALON_OWNER` |
| **Salon** | Name: `Test Beauty Salon`, ID: `test-salon-1` |
| **Services** | Haircut ($50, 60min), Manicure ($40, 45min), Facial ($80, 60min), Coloring ($120, 90min), Pedicure ($45, 50min), Massage ($90, 60min) |
| **Masters** | Sarah Johnson (Haircut/Coloring), Emily Davis (Manicure/Pedicure), Jessica Martinez (Facial/Massage) |

---

## Assertion Helpers

### OpenAI Assertions

```typescript
const mockOpenAI = getMockOpenAI();

// Check API was called
expect(mockOpenAI.getCallCount()).toBe(1);

// Check call parameters
const lastCall = mockOpenAI.getLastCall();
expect(lastCall.model).toBe('gpt-3.5-turbo');
expect(lastCall.messages[1].content).toContain('Haircut');

// Check call history
const history = mockOpenAI.getCallHistory();
expect(history[0].response.serviceName).toBe('Haircut');
```

### Redis Assertions

```typescript
const mockRedis = getMockRedis();

// Check key exists
expect(await mockRedis.exists('cache:intent:12345')).toBe(1);

// Check cached value
const cached = await mockRedis.get('cache:intent:12345');
expect(JSON.parse(cached).serviceName).toBe('Haircut');

// Check TTL
const ttl = await mockRedis.ttl('cache:intent:12345');
expect(ttl).toBeGreaterThan(3000); // More than 50 minutes remaining

// Check store size
expect(mockRedis.getStoreSize()).toBe(5);

// Check all keys
const keys = mockRedis.getAllKeys();
expect(keys).toContain('cache:intent:12345');
```

### WhatsApp Assertions

```typescript
const mockWhatsApp = getMockWhatsApp();

// Check message was sent
const messages = mockWhatsApp.getSentMessages();
expect(messages).toHaveLength(1);

// Check message type
expect(messages[0].message.type).toBe('interactive');

// Check interactive message structure
const interactive = messages[0].message.interactive;
expect(interactive.type).toBe('button');
expect(interactive.action.buttons).toHaveLength(3);

// Check button IDs match pattern
const button = interactive.action.buttons[0];
expect(button.reply.id).toMatch(/^slot_\d{4}-\d{2}-\d{2}_\d{2}:\d{2}_m\d+$/);

// Check specific message was sent
const found = mockWhatsApp.hasMessageBeenSent(
  (msg) => msg.message.text?.body?.includes('confirmed')
);
expect(found).toBe(true);
```

---

## Best Practices

### 1. Reset Mocks Between Tests

```typescript
beforeEach(() => {
  const mockOpenAI = getMockOpenAI();
  const mockRedis = getMockRedis();
  const mockWhatsApp = getMockWhatsApp();

  mockOpenAI.reset();
  mockRedis.reset();
  mockWhatsApp.clearMessages();
  mockWhatsApp.succeed();
});
```

### 2. Clean Database Between Tests

```typescript
beforeEach(async () => {
  await cleanTestDatabase();
  await seedTestData();
});
```

### 3. Use Specific Assertions

```typescript
// Good: Specific assertion
expect(messages[0].message.type).toBe('interactive');
expect(messages[0].message.interactive.action.buttons).toHaveLength(3);

// Bad: Vague assertion
expect(messages).toBeDefined();
```

### 4. Test Both Success and Failure Paths

```typescript
describe('Intent Parsing', () => {
  it('should parse intent successfully', async () => {
    // Success path...
  });

  it('should handle OpenAI timeout', async () => {
    const mockOpenAI = getMockOpenAI();
    mockOpenAI.fail(new Error('Timeout'));
    // Failure path...
  });
});
```

### 5. Verify Mock Interactions

```typescript
it('should cache parsed intent', async () => {
  const mockRedis = getMockRedis();

  // Perform operation...

  // Verify Redis was called
  expect(mockRedis.getCallCount()).toBeGreaterThan(0);

  // Verify cache was set
  const keys = mockRedis.getAllKeys();
  expect(keys.some(k => k.startsWith('cache:intent:'))).toBe(true);
});
```

---

## Troubleshooting

### Mock Not Initialized

**Error**: `Mock OpenAI not initialized. Call setupTestApp() first.`

**Solution**: Ensure `setupTestApp()` is called in `beforeAll()`:

```typescript
beforeAll(async () => {
  app = await setupTestApp();
});
```

### Mock Calls Not Tracked

**Problem**: `getCallCount()` returns 0 even though mock was called.

**Solution**: Mock may have been reset. Check `beforeEach()` hooks:

```typescript
beforeEach(() => {
  // Don't reset if you need to track across multiple operations
  // mockOpenAI.reset(); // This clears call history
});
```

### TTL Not Working

**Problem**: Cached values don't expire.

**Solution**: Use `await` when setting values with TTL:

```typescript
// Correct
await redis.set('key', 'value', 3600);

// Incorrect (TTL not set)
redis.set('key', 'value', 3600); // Missing await
```

---

## Performance Tips

1. **Use setupTestApp() once per suite**: Initialize app in `beforeAll()`, not `beforeEach()`
2. **Reset mocks, not app**: Use `reset()` methods instead of recreating app
3. **Clean database efficiently**: Use transactions for faster cleanup
4. **Mock external calls**: Never make real API calls in tests

---

## Summary

| Mock | Purpose | Key Methods |
|------|---------|-------------|
| **OpenAI** | Intent parsing | `parseTestIntent()`, `succeed()`, `fail()`, `reset()` |
| **Redis** | Caching | `get()`, `set()`, `del()`, `flushall()`, `reset()` |
| **WhatsApp** | Message sending | `sendTextMessage()`, `sendInteractiveMessage()`, `getSentMessages()` |

All mocks support:
- Configurable success/failure modes
- Call tracking and history
- Reset functionality
- Full test isolation
