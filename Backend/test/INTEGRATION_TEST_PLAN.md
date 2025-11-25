# Phase 5: Integration Testing Plan
## WhatsApp SaaS Platform - Comprehensive Integration Testing Strategy

**Date:** 2025-10-24
**Test Engineer:** Claude
**Scope:** End-to-End Integration Testing for WhatsApp AI Booking Assistant

---

## Executive Summary

This document outlines a comprehensive integration testing strategy for the WhatsApp SaaS platform. The testing focuses on verifying the complete flow from WhatsApp webhook events through AI processing to booking creation and response delivery.

### Coverage Goals
- **Critical Path Coverage:** 100% of booking flows
- **API Integration Coverage:** 95%+ of external integrations
- **Error Scenario Coverage:** 90%+ of known failure modes
- **Performance Benchmarks:** Response time < 2s, Cache hit rate > 85%

---

## Test Environment

### Prerequisites
- Backend running on `http://localhost:3000`
- PostgreSQL database (not SQLite)
- Redis for caching
- OpenAI API key (for AI integration tests)
- Test salon with valid WhatsApp credentials

### Test Data Requirements
- Test salon with usage limits configured
- Test phone numbers for customers
- Valid WhatsApp webhook payloads
- Multi-language test messages (Russian, English, Hebrew, Spanish)

---

## Phase 5.1: WhatsApp Webhook Integration Tests

### Test Suite: Webhook Verification

#### TC-WH-001: Webhook Challenge-Response Verification
**Objective:** Verify Meta's webhook verification flow
**Endpoint:** `GET /api/v1/whatsapp/webhook`

**Test Steps:**
1. Send GET request with verification parameters
2. Verify challenge is returned correctly

**Test Data:**
```json
{
  "hub.mode": "subscribe",
  "hub.verify_token": "test-verify-token",
  "hub.challenge": "challenge-1234567890"
}
```

**Expected Result:**
- Status: 200 OK
- Body: "challenge-1234567890"

**Failure Scenarios:**
- Invalid verify token returns 401
- Missing parameters returns 400

---

#### TC-WH-002: Incoming Text Message Processing
**Objective:** Process incoming WhatsApp text message
**Endpoint:** `POST /api/v1/whatsapp/webhook`

**Test Steps:**
1. Send webhook payload with text message
2. Verify message stored in database
3. Verify conversation created/updated
4. Verify webhook log created

**Test Data:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "entry-123",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "test-phone-number-id"
        },
        "messages": [{
          "from": "+79001234567",
          "id": "wamid.test123",
          "timestamp": "1729756800",
          "type": "text",
          "text": {
            "body": "Здравствуйте! Какие у вас услуги?"
          }
        }]
      }
    }]
  }]
}
```

**Expected Result:**
- Status: 200 OK
- Message saved with `direction: INBOUND`
- Conversation created with `phone_number: +79001234567`
- Webhook log with `status: SUCCESS`

**Assertions:**
```sql
-- Verify message created
SELECT * FROM "Message" WHERE whatsapp_id = 'wamid.test123';
-- Verify conversation exists
SELECT * FROM "Conversation" WHERE phone_number = '+79001234567';
```

---

#### TC-WH-003: Message Status Update Processing
**Objective:** Process WhatsApp message status updates
**Endpoint:** `POST /api/v1/whatsapp/webhook`

**Test Steps:**
1. Create outbound message in database
2. Send status update webhook
3. Verify message status updated

**Status Flow Test Cases:**
- SENT → DELIVERED
- DELIVERED → READ
- SENT → FAILED

**Test Data:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "entry-123",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "test-phone-number-id"
        },
        "statuses": [{
          "id": "wamid.outbound123",
          "status": "delivered",
          "timestamp": "1729756900",
          "recipient_id": "+79001234567"
        }]
      }
    }]
  }]
}
```

**Expected Result:**
- Message status updated from SENT to DELIVERED
- No duplicate status updates for READ messages

---

#### TC-WH-004: Webhook Signature Verification
**Objective:** Verify webhook signature validation
**Endpoint:** `POST /api/v1/whatsapp/webhook`

**Test Steps:**
1. Send webhook with valid signature
2. Send webhook with invalid signature
3. Send webhook without signature

**Expected Results:**
- Valid signature: Processed successfully
- Invalid signature: 401 Unauthorized
- No signature: Processed (if secret not configured) or 401

**Signature Calculation:**
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

#### TC-WH-005: Media Message Processing
**Objective:** Handle image, document, audio, video messages
**Endpoint:** `POST /api/v1/whatsapp/webhook`

**Test Cases:**
- Image message with caption
- Document message with filename
- Audio message
- Video message with caption

**Expected Result:**
- Media messages stored with correct type
- Media ID captured in content field
- Caption preserved (if present)

---

### Test Suite: Outbound Message Sending

#### TC-WH-006: Send Text Message via API
**Objective:** Send text message through WhatsApp API
**Endpoint:** `POST /api/v1/whatsapp/send-text`

**Test Steps:**
1. Authenticate as salon owner
2. Send text message request
3. Verify WhatsApp API called
4. Verify message saved in database

**Test Data:**
```json
{
  "salon_id": "test-salon-id",
  "to": "+79001234567",
  "text": "Спасибо за ваш запрос! Наши услуги: Маникюр, Педикюр, Стрижка.",
  "conversation_id": "conv-123"
}
```

**Expected Result:**
- Status: 200 OK
- WhatsApp API receives request
- Message saved with `direction: OUTBOUND`
- Response contains `whatsapp_id` and `message_id`

---

#### TC-WH-007: Message Cost Calculation
**Objective:** Verify correct message cost calculation

**Test Cases:**
- TEXT: $0.005
- TEMPLATE: $0.01
- IMAGE: $0.01
- VIDEO: $0.02

**Expected Result:**
- Conversation cost incremented correctly
- Message cost saved in database

---

## Phase 5.2: End-to-End AI Booking Flow Tests

### Test Suite: AI Message Processing

#### TC-AI-001: Simple Inquiry Response
**Objective:** Customer asks about services
**Flow:** WhatsApp Message → AI Processing → Response

**Test Steps:**
1. Send webhook with inquiry message
2. AI service processes message
3. Verify AI response returned
4. Verify usage counter incremented

**Test Messages:**
- Russian: "Какие у вас услуги?"
- English: "What services do you offer?"
- Hebrew: "איזה שירותים אתם מציעים?"

**Expected Result:**
- AI responds with service list
- Language detected correctly
- Response time < 2000ms
- Usage counter incremented

**Assertions:**
```javascript
expect(response.response).toContain('Маникюр' || 'Manicure');
expect(response.tokens_used).toBeGreaterThan(0);
expect(response.response_time_ms).toBeLessThan(2000);
```

---

#### TC-AI-002: Full Booking Flow
**Objective:** Complete booking from message to confirmation
**Flow:** Request → Availability Check → Booking Creation → Confirmation

**Test Steps:**
1. Customer sends booking request: "Запись к Ольге на завтра в 15:00"
2. AI extracts booking details
3. AI calls `check_availability` function
4. AI calls `create_booking` function
5. AI sends confirmation with booking code
6. Verify booking created in database
7. Verify usage counters incremented (messages + bookings)

**Test Data:**
```json
{
  "message": "Запись к Ольге на завтра в 15:00, Маникюр",
  "customer_name": "Мария Иванова",
  "phone_number": "+79001234567",
  "salon_id": "test-salon-id"
}
```

**Expected Result:**
- Booking created with status CONFIRMED
- Booking code generated (format: BK-XXXXX)
- AI response contains booking code
- Message usage: +1
- Booking usage: +1
- Function calls logged: check_availability, create_booking

**Database Assertions:**
```sql
SELECT * FROM "Booking"
WHERE customer_phone = '+79001234567'
AND service = 'Маникюр'
AND status = 'CONFIRMED';
```

---

#### TC-AI-003: Booking Conflict Handling
**Objective:** Handle time slot already booked
**Flow:** Request → Availability Check → Suggest Alternatives

**Test Steps:**
1. Create existing booking at 15:00
2. Customer requests same time slot
3. AI checks availability (returns false)
4. AI suggests alternative times
5. Verify no duplicate booking created

**Expected Result:**
- AI responds with "Время занято"
- Alternative times suggested (e.g., 16:00, 17:00, 18:00)
- No booking created
- Message usage incremented, booking usage NOT incremented

---

#### TC-AI-004: Past Date Rejection
**Objective:** Reject booking requests for past dates

**Test Steps:**
1. Request booking for yesterday
2. AI checks availability
3. Verify rejection message

**Expected Result:**
- AI responds: "Нельзя забронировать время в прошлом"
- No booking created
- Error handled gracefully

---

### Test Suite: AI Cache Performance

#### TC-AI-005: Cache Hit Scenario
**Objective:** Verify cache reduces OpenAI API calls
**Flow:** Same Question Twice → Second Time Uses Cache

**Test Steps:**
1. First request: "Какие у вас услуги?"
   - Verify OpenAI API called
   - Response cached with hash
2. Second request: "Какие у вас услуги?"
   - Verify cache hit
   - Verify NO OpenAI API call
   - Response time < 100ms

**Expected Result:**
- First response: tokens_used > 0, model: "gpt-4"
- Second response: tokens_used = 0, model: "CACHE"
- Cache hit incremented in analytics
- 100% cost savings on cached request

**Performance Metrics:**
- Cache lookup time: < 50ms
- Response time with cache: < 100ms (vs 1500ms+ without cache)

---

#### TC-AI-006: Cache Miss for Unique Questions
**Objective:** Ensure unique questions bypass cache

**Test Steps:**
1. Ask unique question: "Какая цена на педикюр с красным лаком?"
2. Verify cache miss
3. Verify OpenAI API called
4. Verify response cached for future

**Expected Result:**
- Cache miss (no similar query found)
- OpenAI API called
- New cache entry created

---

#### TC-AI-007: Multi-Language Cache Separation
**Objective:** Verify cache respects language boundaries

**Test Steps:**
1. Ask in Russian: "Какие услуги?"
2. Ask in English: "What services?"
3. Verify separate cache entries

**Expected Result:**
- Different cache hashes for different languages
- Both responses cached separately
- Language detection works correctly

---

## Phase 5.3: Usage Limit & Freemium Model Tests

### Test Suite: Usage Tracking

#### TC-USAGE-001: Message Limit Enforcement
**Objective:** Block messages when limit reached
**Limit:** 1000 messages/month

**Test Steps:**
1. Set salon message usage to 999
2. Send AI message (should succeed, usage = 1000)
3. Send another AI message (should be blocked)
4. Verify friendly limit message returned

**Expected Result:**
- Message 1000: Processed successfully
- Message 1001: Blocked with message
- Response: "Достигнут лимит AI сообщений..."
- No OpenAI API call for blocked message
- tokens_used = 0, cost = 0

**Database Assertions:**
```sql
SELECT usage_current_messages, usage_limit_messages
FROM "Salon" WHERE id = 'test-salon-id';
-- Should show 1000/1000
```

---

#### TC-USAGE-002: Booking Limit Enforcement
**Objective:** Block bookings when limit reached
**Limit:** 500 bookings/month

**Test Steps:**
1. Set salon booking usage to 499
2. Create booking via AI (should succeed, usage = 500)
3. Try to create another booking (should be blocked)
4. Verify error message

**Expected Result:**
- Booking 500: Created successfully
- Booking 501: Blocked with BadRequestException
- Error: "Достигнут лимит бронирований..."

---

#### TC-USAGE-003: Usage Counter Reset
**Objective:** Verify monthly counter reset

**Test Steps:**
1. Set salon usage_reset_at to yesterday
2. Send AI message (triggers reset check)
3. Verify counters reset to 0
4. Verify next reset date = 1 month from now

**Expected Result:**
```sql
SELECT
  usage_current_messages,  -- Should be 0 or 1
  usage_current_bookings,  -- Should be 0
  usage_reset_at           -- Should be ~30 days from now
FROM "Salon" WHERE id = 'test-salon-id';
```

---

#### TC-USAGE-004: Warning Notifications
**Objective:** Verify warning levels at 80% and 90%

**Test Cases:**
- 800/1000 messages: Warning level "warning_80"
- 900/1000 messages: Warning level "warning_90"
- 1000/1000 messages: Warning level "limit_reached"

**Expected Result:**
- Warning messages returned in API response
- Logs contain warning messages
- Operations still allowed at 80% and 90%

---

## Phase 5.4: Error Scenario Tests

### Test Suite: Error Handling

#### TC-ERR-001: OpenAI API Failure
**Objective:** Handle OpenAI service unavailability

**Test Steps:**
1. Mock OpenAI API to return 500 error
2. Send AI message request
3. Verify fallback response returned

**Expected Result:**
- Status: 200 OK (graceful degradation)
- Response: "Извините, произошла ошибка..."
- Error logged
- No database corruption

---

#### TC-ERR-002: Database Connection Error
**Objective:** Handle database unavailability

**Test Steps:**
1. Disconnect database
2. Send webhook request
3. Verify error response

**Expected Result:**
- Status: 500 or 503
- Error logged
- No data loss when database recovers

---

#### TC-ERR-003: Invalid Webhook Payload
**Objective:** Handle malformed webhook data

**Test Cases:**
- Missing required fields
- Invalid JSON
- Unknown message type
- Null values

**Expected Result:**
- Request logged
- Error returned or ignored gracefully
- No application crash

---

#### TC-ERR-004: WhatsApp API Rate Limit
**Objective:** Handle WhatsApp API rate limiting

**Test Steps:**
1. Mock WhatsApp API to return 429
2. Send outbound message
3. Verify retry logic activated

**Expected Result:**
- Automatic retry with exponential backoff
- Max 3 retry attempts
- Error returned after final attempt
- Rate limit logged

---

## Phase 5.5: Performance & Load Tests

### Test Suite: Performance Benchmarks

#### TC-PERF-001: Response Time Requirements
**Objective:** Verify all endpoints meet performance SLAs

**Benchmarks:**
- Webhook processing: < 200ms
- AI response (cache hit): < 100ms
- AI response (cache miss): < 2000ms
- Booking creation: < 500ms
- Database queries: < 100ms

**Test Steps:**
1. Send 100 requests to each endpoint
2. Measure response times
3. Calculate p50, p95, p99 percentiles

**Expected Result:**
- p95 response time meets benchmarks
- No timeouts
- No memory leaks

---

#### TC-PERF-002: Cache Hit Rate
**Objective:** Verify 85%+ cache hit rate for common queries

**Test Steps:**
1. Send 100 common queries (services, hours, pricing)
2. Measure cache hits vs misses
3. Calculate hit rate

**Expected Result:**
- Cache hit rate > 85%
- Average response time < 200ms
- Cost savings > 80%

---

#### TC-PERF-003: Concurrent Request Handling
**Objective:** Handle 50 concurrent webhook requests

**Test Steps:**
1. Send 50 webhook requests simultaneously
2. Verify all processed successfully
3. Measure total processing time

**Expected Result:**
- All requests succeed
- No deadlocks
- Average processing time < 500ms

---

## Test Execution Checklist

### Pre-Execution
- [ ] Backend running on port 3000
- [ ] Database migrated and seeded
- [ ] Redis cache running
- [ ] Environment variables configured
- [ ] Test salon created with credentials

### Execution Order
1. [ ] Run webhook verification tests (TC-WH-001 to TC-WH-005)
2. [ ] Run webhook sending tests (TC-WH-006 to TC-WH-007)
3. [ ] Run AI integration tests (TC-AI-001 to TC-AI-007)
4. [ ] Run usage limit tests (TC-USAGE-001 to TC-USAGE-004)
5. [ ] Run error scenario tests (TC-ERR-001 to TC-ERR-004)
6. [ ] Run performance tests (TC-PERF-001 to TC-PERF-003)

### Post-Execution
- [ ] Generate test coverage report
- [ ] Document all failures
- [ ] Create bug tickets
- [ ] Update test documentation

---

## Test Reporting

### Test Metrics to Track
- Total test cases: 30+
- Pass rate: Target 95%+
- Code coverage: Target 85%+
- Critical bugs found: Document severity
- Performance regressions: Flag and investigate

### Report Format
```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Environment:** Local Development
**Tester:** Name

### Summary
- Total Tests: X
- Passed: X (XX%)
- Failed: X (XX%)
- Skipped: X (XX%)

### Coverage
- Unit Tests: XX%
- Integration Tests: XX%
- E2E Tests: XX%

### Bugs Found
1. [CRITICAL] Bug description
2. [HIGH] Bug description
3. [MEDIUM] Bug description

### Performance Metrics
- Average Response Time: XXXms
- Cache Hit Rate: XX%
- 95th Percentile: XXXms
```

---

## Known Limitations & Risks

### Test Environment Limitations
- Mock WhatsApp API (no real Meta integration)
- Test OpenAI API key (quota limits)
- Local database (not production config)

### Coverage Gaps
- Real WhatsApp webhook delivery
- Production load scenarios
- Network failure recovery
- Multi-tenant isolation

### Risks
1. **OpenAI API Costs:** Real API calls cost money (use caching)
2. **Rate Limits:** Meta/OpenAI may throttle test requests
3. **Test Data Cleanup:** Ensure proper teardown
4. **Time-Dependent Tests:** Booking time calculations may fail

---

## Next Steps

### After Phase 5 Completion
1. Fix all critical and high-priority bugs
2. Optimize performance bottlenecks
3. Implement missing test coverage
4. Document integration patterns
5. Create CI/CD pipeline integration
6. Plan Phase 6: Production deployment testing

---

## Appendix

### Useful Commands

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:e2e

# Run with coverage
npm run test:cov

# Run specific test suite
npm test -- whatsapp-integration.e2e-spec

# Check database state
npx prisma studio
```

### Test Data Seeds

```sql
-- Create test salon
INSERT INTO "Salon" (id, name, owner_id, phone_number_id, access_token, usage_limit_messages, usage_limit_bookings, usage_current_messages, usage_current_bookings)
VALUES ('test-salon-id', 'Test Salon', 'test-user-id', 'test-phone-number-id', 'test-access-token', 1000, 500, 0, 0);

-- Create test user
INSERT INTO "User" (id, email, password_hash, first_name, last_name, role)
VALUES ('test-user-id', 'test@example.com', '$2a$10$...', 'Test', 'User', 'SALON_OWNER');
```

### Environment Variables

```env
# Test environment
NODE_ENV=test
DATABASE_URL="postgresql://user:password@localhost:5432/test_db"
OPENAI_API_KEY="sk-test-..."
WHATSAPP_WEBHOOK_SECRET="test-webhook-secret"
WHATSAPP_VERIFY_TOKEN="test-verify-token"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Maintained By:** QA Engineering Team
