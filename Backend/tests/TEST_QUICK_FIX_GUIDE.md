# Quick Fix Guide for Zero-Typing Tests

## TypeScript Fixes Needed

### File: `tests/integration/zero-typing-booking.spec.ts`

#### Fix 1: Line 457, 626-639 - Update `service_relation` to `serviceRel`
```typescript
// BEFORE (WRONG):
include: {
  service_relation: true,
  master: true,
}
expect(booking.service_relation).toBeDefined();

// AFTER (CORRECT):
include: {
  serviceRel: true,
  master: true,
}
expect(booking!.serviceRel).toBeDefined();
```

#### Fix 2: Lines 708, 712-713 - Update Conversation model fields
```typescript
// BEFORE (WRONG):
const conversation = await prisma.conversation.findFirst({
  where: { customer_phone: testCustomer.phone },
});
expect(conversation.customer_phone).toBe(testCustomer.phone);
expect(conversation.customer_name).toBe(testCustomer.name);

// AFTER (CORRECT):
const conversation = await prisma.conversation.findFirst({
  where: { phone_number: testCustomer.phone },
});
expect(conversation!.phone_number).toBe(testCustomer.phone);
// Remove customer_name check (field doesn't exist)
```

#### Fix 3: Add null assertion operators (!)
Add `!` after all booking/salon/conversation variables that might be null:
```typescript
// BEFORE:
expect(booking.customer_name).toBe(testCustomer.name);

// AFTER:
expect(booking!.customer_name).toBe(testCustomer.name);
```

### File: `tests/e2e/zero-typing-booking.e2e.spec.ts`

#### Same fixes as integration tests:
1. Replace `service_relation` → `serviceRel`
2. Replace `customer_phone` → `phone_number` (in Conversation queries)
3. Add `!` null assertions

## Run Tests After Fixing

```bash
cd Backend

# Test contract tests (should pass)
npm run test:integration -- --testPathPattern=contract/whatsapp-interactive-webhook

# Test integration tests (should fail with implementation errors, not TypeScript)
npm run test:integration -- --testPathPattern=integration/zero-typing-booking

# Test E2E tests (should fail with implementation errors, not TypeScript)
npm run test:integration -- --testPathPattern=e2e/zero-typing-booking
```

## Expected Results After Fixes

### Contract Tests
```
PASS tests/contract/whatsapp-interactive-webhook.spec.ts
  ✓ 27 tests passing
```

### Integration & E2E Tests
```
FAIL tests/integration/zero-typing-booking.spec.ts
  ✕ should complete booking with 1 typed message and 2 button taps
      Error: Cannot POST /api/v1/whatsapp/webhook

  ... (all tests fail because services don't exist)
```

This is CORRECT for RED phase - tests compile and run, but fail due to missing implementation.
