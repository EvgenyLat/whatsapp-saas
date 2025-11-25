# Integration Testing Suite
## WhatsApp SaaS Platform - Complete Test Documentation

Welcome to the comprehensive integration testing suite for the WhatsApp SaaS booking assistant platform.

---

## Quick Start

```bash
# Install dependencies
npm install

# Setup test database
createdb whatsapp_saas_test
npx prisma migrate deploy

# Run all integration tests
npm run test:e2e

# Run with coverage
npm run test:e2e -- --coverage
```

---

## Documentation Index

### 1. [Integration Test Plan](./INTEGRATION_TEST_PLAN.md)
Comprehensive test strategy covering:
- 30+ test scenarios across 3 phases
- Detailed test cases with expected results
- Performance benchmarks and SLAs
- Error scenario coverage
- Test execution checklist

**Read this first** to understand the testing strategy.

### 2. [Test Execution Guide](./TEST_EXECUTION_GUIDE.md)
Step-by-step guide for running tests:
- Prerequisites and environment setup
- Running tests (all, specific suites, individual cases)
- Debugging and troubleshooting
- CI/CD integration examples
- Common failure resolutions

**Use this** when executing tests.

### 3. [Test Report Template](./TEST_REPORT_TEMPLATE.md)
Template for documenting test results:
- Test statistics and metrics
- Bug tracking format
- Performance analysis
- Coverage reports
- Risk assessment

**Use this** to document test execution results.

---

## Test Suites Overview

### Phase 5.1: WhatsApp Webhook Integration
**File:** `whatsapp-integration.e2e-spec.ts`

Tests the complete WhatsApp webhook integration:
- ✅ Webhook verification (Meta challenge-response)
- ✅ Incoming message processing (text, images, documents)
- ✅ Message status updates (sent → delivered → read)
- ✅ Outbound message sending
- ✅ Error handling (unknown salon, invalid payloads)
- ✅ Performance benchmarks (< 200ms response time)
- ✅ Concurrent request handling (10+ simultaneous webhooks)

**Test Cases:** 12
**Duration:** ~30 seconds
**Coverage:** Webhook flow end-to-end

---

### Phase 5.2: AI Booking Flow Integration
**File:** `ai-booking-flow.e2e-spec.ts`

Tests the AI-powered booking system:
- ✅ Simple inquiry responses (service questions)
- ✅ Multi-language support (Russian, English, Hebrew, Spanish)
- ✅ Full booking creation flow (request → availability → booking → confirmation)
- ✅ Availability checking and conflict resolution
- ✅ Past date rejection
- ✅ AI cache performance (90%+ hit rate, <100ms response)
- ✅ Conversation history and context maintenance
- ✅ OpenAI function calling (check_availability, create_booking)

**Test Cases:** 15
**Duration:** ~60-90 seconds (includes OpenAI API calls)
**Coverage:** AI service, booking service, cache service integration

---

### Phase 5.3: Usage Limits & Freemium Model
**File:** `usage-limits.e2e-spec.ts`

Tests the freemium usage tracking system:
- ✅ Message limit enforcement (1000/month)
- ✅ Booking limit enforcement (500/month)
- ✅ Usage counter increments
- ✅ Monthly counter reset (automatic)
- ✅ Warning notifications (80%, 90%, 100%)
- ✅ Graceful limit reached messages
- ✅ Usage statistics API
- ✅ Custom limits for different tiers

**Test Cases:** 12
**Duration:** ~20 seconds
**Coverage:** Usage tracking service, limit enforcement

---

## Test Coverage Matrix

| Module | Unit Tests | Integration Tests | E2E Tests | Coverage |
|--------|-----------|-------------------|-----------|----------|
| WhatsApp Service | ✅ | ✅ | ✅ | 85%+ |
| Webhook Service | ✅ | ✅ | ✅ | 90%+ |
| AI Service | ✅ | ✅ | ✅ | 80%+ |
| Bookings Service | ✅ | ✅ | ✅ | 85%+ |
| Usage Tracking | ✅ | ✅ | ✅ | 90%+ |
| Cache Service | ✅ | ✅ | ✅ | 85%+ |
| Language Detector | ✅ | ✅ | ✅ | 95%+ |

---

## Critical Flows Tested

### 1. End-to-End Booking Flow
```
Customer sends WhatsApp message
    ↓
Webhook receives message
    ↓
AI processes message (detects language, extracts intent)
    ↓
AI checks availability (function call)
    ↓
AI creates booking (function call)
    ↓
Usage counters incremented (messages + bookings)
    ↓
AI responds with booking code
    ↓
WhatsApp sends confirmation to customer
```

**Test Coverage:** ✅ Complete

---

### 2. Cache-Optimized Response Flow
```
Customer asks common question
    ↓
AI service checks cache
    ↓
Cache HIT → Return cached response (0 tokens, <100ms)
    ↓
OR
    ↓
Cache MISS → Call OpenAI (~1500ms, costs $$$)
    ↓
Store response in cache for future
```

**Test Coverage:** ✅ Complete

---

### 3. Usage Limit Enforcement Flow
```
Customer sends message/booking request
    ↓
Check usage limits (messages/bookings)
    ↓
If UNDER LIMIT:
  → Process request normally
  → Increment counter
  → Check if approaching limit (80%, 90%)
  → Send warnings if needed
    ↓
If AT LIMIT:
  → Block request
  → Return friendly limit message
  → Log attempt
  → No OpenAI API call (save costs)
```

**Test Coverage:** ✅ Complete

---

## Performance Benchmarks

| Operation | Target | Tested | Status |
|-----------|--------|--------|--------|
| Webhook Processing | < 200ms | ✅ | 🎯 |
| AI Response (Cache Hit) | < 100ms | ✅ | 🎯 |
| AI Response (OpenAI) | < 2000ms | ✅ | 🎯 |
| Booking Creation | < 500ms | ✅ | 🎯 |
| Database Query | < 100ms | ✅ | 🎯 |
| Cache Lookup | < 50ms | ✅ | 🎯 |
| Concurrent Webhooks (10x) | All succeed | ✅ | 🎯 |

---

## Known Limitations

### What IS Tested
- ✅ Complete webhook processing flow
- ✅ AI message processing and booking creation
- ✅ Usage limit enforcement
- ✅ Cache performance and hit rates
- ✅ Multi-language support
- ✅ Error handling and edge cases
- ✅ Database integration
- ✅ Performance benchmarks

### What IS NOT Tested (Yet)
- ❌ Real WhatsApp message delivery (mocked)
- ❌ Production-scale load testing (1000+ concurrent users)
- ❌ Network failure recovery
- ❌ Database failover scenarios
- ❌ Payment processing integration
- ❌ Email/SMS notification delivery
- ❌ Third-party calendar sync

---

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Suite
```bash
npm run test:e2e -- whatsapp-integration
npm run test:e2e -- ai-booking-flow
npm run test:e2e -- usage-limits
```

### Specific Test Case
```bash
npm run test:e2e -- -t "TC-WH-001"
npm run test:e2e -- -t "Should create booking"
```

### With Coverage
```bash
npm run test:e2e -- --coverage
open coverage/lcov-report/index.html
```

### Debug Mode
```bash
npm run test:debug
```

---

## Continuous Integration

### GitHub Actions Workflow

Tests run automatically on:
- ✅ Every push to `main` or `develop`
- ✅ Every pull request
- ✅ Nightly builds (scheduled)

**Pipeline includes:**
1. Database setup (PostgreSQL + Redis)
2. Dependency installation
3. Prisma migration
4. Integration test execution
5. Coverage report upload
6. Performance benchmarking

---

## Test Data Management

### Test Isolation
- Each test suite creates its own test data
- Unique timestamps prevent data conflicts
- Automatic cleanup in `afterAll()` hooks
- No shared state between tests

### Database Cleanup
```bash
# Manual cleanup if needed
npm run test:cleanup

# Or via SQL
psql whatsapp_saas_test
DELETE FROM "User" WHERE email LIKE '%test%';
```

---

## Troubleshooting

### Common Issues

**1. OpenAI API Key Error**
```
Error: OPENAI_API_KEY not configured
```
**Solution:** Add key to `.env.test`

**2. Database Connection Error**
```
Error: Can't reach database server
```
**Solution:** Ensure PostgreSQL is running and database exists

**3. Test Timeout**
```
Error: Timeout exceeded 5000ms
```
**Solution:** OpenAI API can be slow. Increase timeout or check network

**4. Port Already in Use**
```
Error: Port 3001 already in use
```
**Solution:** `kill -9 $(lsof -t -i :3001)`

See [Test Execution Guide](./TEST_EXECUTION_GUIDE.md) for more troubleshooting.

---

## Best Practices

### Before Committing
1. Run full test suite: `npm run test:e2e`
2. Check coverage: Ensure >= 85%
3. Review test failures: Fix or document
4. Update test documentation if flows changed

### Writing New Tests
1. Follow AAA pattern (Arrange, Act, Assert)
2. Use descriptive test names with TC-IDs
3. Clean up test data in `afterAll()`
4. Add performance assertions where relevant
5. Document edge cases tested

### Maintaining Tests
1. Keep tests fast (< 2 minutes total)
2. Fix flaky tests immediately
3. Update tests when features change
4. Add tests for new features
5. Review test coverage monthly

---

## Success Criteria

For Phase 5 integration testing to be considered successful:

- ✅ **Pass Rate:** >= 95% (ideally 100%)
- ✅ **Coverage:** >= 85% (lines, branches, functions)
- ✅ **Performance:** All benchmarks met
- ✅ **Critical Bugs:** 0 blocking issues
- ✅ **Documentation:** Complete and up-to-date
- ✅ **CI/CD:** Tests integrated and passing

---

## Next Steps

### After Phase 5 Completion

1. **Fix Critical Bugs**
   - Address all P0/P1 bugs found
   - Re-run tests to verify fixes
   - Update regression test suite

2. **Performance Optimization**
   - Optimize slow queries (if any)
   - Improve cache hit rate to 90%+
   - Reduce AI response time

3. **Coverage Improvement**
   - Add tests for uncovered edge cases
   - Test error scenarios more thoroughly
   - Add load testing suite

4. **Phase 6 Planning**
   - Production readiness testing
   - Security testing (penetration, auth)
   - User acceptance testing
   - Disaster recovery testing

---

## Contributing

### Adding New Tests

1. Choose appropriate test suite file
2. Follow existing test structure
3. Add TC-ID to test case name
4. Document test in INTEGRATION_TEST_PLAN.md
5. Update this README if adding new suite

### Reporting Bugs

Use the bug template in TEST_REPORT_TEMPLATE.md:
- Include TC-ID
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

---

## Resources

### Internal Documentation
- [Integration Test Plan](./INTEGRATION_TEST_PLAN.md) - Comprehensive test strategy
- [Test Execution Guide](./TEST_EXECUTION_GUIDE.md) - How to run tests
- [Test Report Template](./TEST_REPORT_TEMPLATE.md) - Reporting format

### External Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)

---

## Support

For questions or issues:
1. Check [Test Execution Guide](./TEST_EXECUTION_GUIDE.md) troubleshooting section
2. Review existing test files for examples
3. Contact QA team: [qa@example.com]
4. Create issue in project tracker

---

**Last Updated:** 2025-10-24
**Maintained By:** QA Engineering Team
**Version:** 1.0.0
