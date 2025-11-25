# Working Hours Validation - Test Examples

## Quick Test Guide

This document provides SQL commands and test scenarios to verify the working hours validation implementation.

## Setup Test Data

### 1. Configure Salon Working Hours

```sql
-- Set salon to work 9:00 AM - 8:00 PM
UPDATE salons
SET
  working_hours_start = '09:00',
  working_hours_end = '20:00'
WHERE id = 'your-salon-id';

-- Verify
SELECT id, name, working_hours_start, working_hours_end
FROM salons
WHERE id = 'your-salon-id';
```

### 2. Configure Master Working Hours

```sql
-- Standard Monday-Saturday schedule
UPDATE masters
SET working_hours = '{
  "monday": {"start": "09:00", "end": "18:00"},
  "tuesday": {"start": "09:00", "end": "18:00"},
  "wednesday": {"start": "09:00", "end": "18:00"},
  "thursday": {"start": "09:00", "end": "18:00"},
  "friday": {"start": "09:00", "end": "18:00"},
  "saturday": {"start": "10:00", "end": "16:00"}
}'::jsonb
WHERE id = 'your-master-id';

-- Part-time master (only works afternoons)
UPDATE masters
SET working_hours = '{
  "monday": {"start": "14:00", "end": "20:00"},
  "tuesday": {"start": "14:00", "end": "20:00"},
  "wednesday": {"start": "14:00", "end": "20:00"},
  "thursday": {"start": "14:00", "end": "20:00"},
  "friday": {"start": "14:00", "end": "20:00"}
}'::jsonb
WHERE name = 'Part-Time Stylist';

-- Verify
SELECT id, name, working_hours, is_active
FROM masters
WHERE id = 'your-master-id';
```

### 3. Deactivate Master (Test Inactive Status)

```sql
-- Deactivate a master
UPDATE masters
SET is_active = false
WHERE id = 'your-master-id';

-- Reactivate
UPDATE masters
SET is_active = true
WHERE id = 'your-master-id';
```

## Test Scenarios

### Test 1: Booking Outside Salon Hours

**Scenario**: Try to book at 3:00 AM (before salon opens)

**Expected Result**:
```
❌ REJECTED
Reason: "Salon is closed at this time. Working hours: 9:00 AM - 8:00 PM"
```

**How to Test**:
1. Generate slot for 03:00
2. Click the slot button in WhatsApp
3. Check response message

**Log Entry**:
```
[WARN] Slot outside salon working hours: 03:00 (salon hours: 09:00 - 20:00)
```

---

### Test 2: Booking After Salon Closes

**Scenario**: Try to book at 9:00 PM (after salon closes at 8:00 PM)

**Expected Result**:
```
❌ REJECTED
Reason: "Salon is closed at this time. Working hours: 9:00 AM - 8:00 PM"
```

---

### Test 3: Booking with Inactive Master

**Scenario**: Try to book with a deactivated master

**Setup**:
```sql
UPDATE masters SET is_active = false WHERE id = 'master-id';
```

**Expected Result**:
```
❌ REJECTED
Reason: "This staff member is not available"
```

**Log Entry**:
```
[WARN] Master not found or inactive: master-id
```

---

### Test 4: Booking on Master's Day Off

**Scenario**: Try to book on Sunday when master doesn't work

**Setup**:
```sql
-- Master's working_hours doesn't include Sunday
UPDATE masters
SET working_hours = '{
  "monday": {"start": "09:00", "end": "18:00"},
  "tuesday": {"start": "09:00", "end": "18:00"},
  "wednesday": {"start": "09:00", "end": "18:00"},
  "thursday": {"start": "09:00", "end": "18:00"},
  "friday": {"start": "09:00", "end": "18:00"},
  "saturday": {"start": "10:00", "end": "16:00"}
}'::jsonb;
```

**Expected Result**:
```
❌ REJECTED
Reason: "This staff member is not available on Sundays"
```

**Log Entry**:
```
[WARN] Master John Doe doesn't work on sunday
```

---

### Test 5: Booking Outside Master's Hours

**Scenario**: Try to book at 8:00 AM when master starts at 9:00 AM

**Expected Result**:
```
❌ REJECTED
Reason: "This staff member is not available at this time. Working hours: 9:00 AM - 6:00 PM"
```

**Log Entry**:
```
[WARN] Slot outside master working hours: 08:00 (master John Doe hours on monday: 09:00 - 18:00)
```

---

### Test 6: Service Duration Exceeds Working Hours

**Scenario**: Try to book at 7:30 PM for 60-minute service when salon closes at 8:00 PM

**Expected Result**:
```
❌ REJECTED
Reason: "Service duration exceeds available time. Salon closes at 8:00 PM"
```

**Calculation**:
- Start: 7:30 PM (19:30)
- Service: 60 minutes
- End: 8:30 PM (20:30)
- Salon closes: 8:00 PM (20:00)
- Result: ❌ Exceeds by 30 minutes

**Log Entry**:
```
[WARN] Service duration exceeds salon hours: booking would end at 20:30, but salon closes at 20:00
```

---

### Test 7: Valid Booking Within All Hours

**Scenario**: Book at 2:00 PM (14:00) on a Wednesday

**Conditions**:
- Salon open: 9:00 AM - 8:00 PM ✅
- Master works Wednesday: 9:00 AM - 6:00 PM ✅
- Time 2:00 PM within both ranges ✅
- 60-min service ends at 3:00 PM ✅
- No existing booking ✅

**Expected Result**:
```
✅ APPROVED
Shows confirmation card with booking details
```

**Log Entries**:
```
[DEBUG] Salon working hours check passed: 14:00 is within 09:00 - 20:00
[DEBUG] Master working hours check passed: 14:00 is within 09:00 - 18:00 on wednesday
[DEBUG] Service duration check passed: booking ends at 15:00, within working hours ending at 18:00
[DEBUG] Slot available: 2024-11-07 14:00 with master master-id
```

---

### Test 8: Graceful Degradation (Invalid Working Hours)

**Scenario**: Master has invalid working_hours JSON

**Setup**:
```sql
-- Set invalid JSON
UPDATE masters
SET working_hours = 'invalid json'::jsonb
WHERE id = 'master-id';

-- Or empty object
UPDATE masters
SET working_hours = '{}'::jsonb
WHERE id = 'master-id';
```

**Expected Result**:
```
⚠️ WARNING LOGGED, BUT BOOKING PROCEEDS
Validation continues without working hours check
```

**Log Entry**:
```
[WARN] Master master-id has invalid working_hours format. Skipping working hours validation (graceful degradation).
```

---

## Integration Test Script

```typescript
// test-working-hours.ts
import { ButtonHandlerService } from './button-handler.service';

describe('Working Hours Validation', () => {
  let service: ButtonHandlerService;

  it('should reject booking outside salon hours', async () => {
    const result = await service.validateSlotAvailability(
      'master-id',
      '2024-11-07',
      '03:00', // 3 AM
      'salon-id'
    );

    expect(result.available).toBe(false);
    expect(result.reason).toContain('Salon is closed');
  });

  it('should reject booking on master day off', async () => {
    const result = await service.validateSlotAvailability(
      'master-id',
      '2024-11-10', // Sunday
      '14:00',
      'salon-id'
    );

    expect(result.available).toBe(false);
    expect(result.reason).toContain('not available on');
  });

  it('should accept valid booking', async () => {
    const result = await service.validateSlotAvailability(
      'master-id',
      '2024-11-07', // Thursday
      '14:00',
      'salon-id'
    );

    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
```

## Manual Testing Checklist

### Pre-requisites
- [ ] Backend server running
- [ ] Database populated with test data
- [ ] WhatsApp webhook configured
- [ ] Test salon and master created

### Test Cases

#### Salon Hours
- [ ] Try booking before salon opens (e.g., 6:00 AM)
- [ ] Try booking after salon closes (e.g., 10:00 PM)
- [ ] Try booking at opening time (e.g., 9:00 AM)
- [ ] Try booking just before closing (e.g., 7:30 PM for 30-min service)

#### Master Status
- [ ] Try booking with inactive master
- [ ] Try booking with active master
- [ ] Try booking with non-existent master ID

#### Master Working Days
- [ ] Try booking on Sunday (master's day off)
- [ ] Try booking on Saturday (half day: 10 AM - 4 PM)
- [ ] Try booking on Monday (full day: 9 AM - 6 PM)

#### Master Working Hours
- [ ] Try booking before master starts (e.g., 8:00 AM when starts at 9:00 AM)
- [ ] Try booking after master ends (e.g., 7:00 PM when ends at 6:00 PM)
- [ ] Try booking during lunch break (if configured)

#### Service Duration
- [ ] Try 60-min service at 7:30 PM (salon closes 8:00 PM) - should fail
- [ ] Try 30-min service at 7:30 PM (salon closes 8:00 PM) - should succeed
- [ ] Try 90-min service at 4:30 PM (master ends 6:00 PM) - should succeed

#### Edge Cases
- [ ] Master with invalid working_hours JSON - should succeed with warning
- [ ] Master with null working_hours - should succeed with warning
- [ ] Salon without working hours set - should use defaults
- [ ] Booking at midnight (00:00)
- [ ] Booking at noon (12:00)

### Verification Steps

1. **Check Error Messages**
   - Messages are in English
   - Times displayed in 12-hour format (AM/PM)
   - Messages are user-friendly (not technical)

2. **Check Logs**
   ```bash
   # Backend logs
   tail -f backend.log | grep "working hours"

   # Should see:
   # [DEBUG] Salon working hours check passed
   # [DEBUG] Master working hours check passed
   # [WARN] Slot outside salon working hours
   # etc.
   ```

3. **Check Database**
   ```sql
   -- Verify no bookings outside working hours
   SELECT
     b.id,
     b.start_ts,
     TO_CHAR(b.start_ts, 'HH24:MI') as booking_time,
     s.working_hours_start,
     s.working_hours_end,
     CASE
       WHEN TO_CHAR(b.start_ts, 'HH24:MI') < s.working_hours_start THEN 'BEFORE OPEN'
       WHEN TO_CHAR(b.start_ts, 'HH24:MI') >= s.working_hours_end THEN 'AFTER CLOSE'
       ELSE 'OK'
     END as status
   FROM bookings b
   JOIN salons s ON b.salon_id = s.id
   WHERE b.created_at > NOW() - INTERVAL '1 day'
   ORDER BY b.start_ts;
   ```

## Debugging

### Enable Detailed Logging

```typescript
// In button-handler.service.ts
private readonly logger = new Logger(ButtonHandlerService.name);

// Set log level to DEBUG in environment
LOG_LEVEL=debug npm run start:dev
```

### Check Validation Steps

```bash
# Filter logs for a specific booking attempt
grep "master=master-123" backend.log | grep "validating"

# Check all rejection reasons
grep "available: false" backend.log | grep "reason:"

# Monitor working hours checks
watch -n 1 "tail -100 backend.log | grep 'working hours'"
```

### Common Issues

#### Issue: All bookings rejected
**Possible Cause**: Salon working hours not set
**Solution**:
```sql
UPDATE salons
SET working_hours_start = '09:00', working_hours_end = '20:00'
WHERE working_hours_start IS NULL;
```

#### Issue: Master always unavailable
**Possible Cause**: `is_active = false` or invalid working_hours
**Solution**:
```sql
-- Check master status
SELECT id, name, is_active, working_hours FROM masters;

-- Reactivate master
UPDATE masters SET is_active = true WHERE id = 'master-id';

-- Fix working hours
UPDATE masters
SET working_hours = '{
  "monday": {"start": "09:00", "end": "18:00"}
}'::jsonb
WHERE working_hours IS NULL OR working_hours::text = '{}';
```

#### Issue: Graceful degradation warnings
**Possible Cause**: Invalid JSON in working_hours field
**Solution**:
```sql
-- Find invalid entries
SELECT id, name, working_hours
FROM masters
WHERE working_hours IS NULL
   OR working_hours::text = '{}'
   OR working_hours::text = 'null';

-- Fix format
UPDATE masters
SET working_hours = '{
  "monday": {"start": "09:00", "end": "18:00"},
  "tuesday": {"start": "09:00", "end": "18:00"},
  "wednesday": {"start": "09:00", "end": "18:00"},
  "thursday": {"start": "09:00", "end": "18:00"},
  "friday": {"start": "09:00", "end": "18:00"}
}'::jsonb
WHERE id = 'master-id';
```

## Performance Testing

### Measure Validation Time

```typescript
const start = Date.now();
const result = await buttonHandler.validateSlotAvailability(...);
const elapsed = Date.now() - start;
console.log(`Validation took ${elapsed}ms`);
```

**Expected Times**:
- With salonId: ~15-25ms (2 DB queries)
- Without salonId: ~10-15ms (1 DB query)

### Load Testing

```bash
# Use Apache Bench to simulate concurrent bookings
ab -n 1000 -c 10 -T 'application/json' \
  -p booking-payload.json \
  http://localhost:3000/api/whatsapp/webhook
```

**Metrics to Monitor**:
- Average response time: <100ms
- 95th percentile: <200ms
- Error rate: <1%
- Database connection pool usage

## Success Criteria

✅ All test cases pass
✅ Error messages are user-friendly
✅ Logs show validation steps
✅ No bookings created outside working hours
✅ Performance impact <25ms per validation
✅ Graceful degradation works (invalid data doesn't break system)

## Rollback Plan

If issues arise:

```sql
-- Emergency: Disable master working hours check
-- (This won't disable the validation, but you can modify code)

-- Revert to previous version
git revert <commit-hash>
npm run build
pm2 restart backend
```

## Support

For questions or issues:
1. Check logs: `tail -f backend.log | grep "working hours"`
2. Verify database: Run SQL queries above
3. Test manually: Use WhatsApp to trigger booking flow
4. Contact development team: Include master_id, date, time, and error message
