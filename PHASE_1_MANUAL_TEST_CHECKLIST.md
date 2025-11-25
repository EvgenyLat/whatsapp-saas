# Phase 1 Critical Fixes - Manual Testing Checklist

**Date**: 2025-11-07
**Version**: 1.0
**Tester**: _________________

## Overview
This checklist verifies all 5 critical fixes implemented in Phase 1:
1. Race condition fix (master row locking)
2. OpenAI retry logic with exponential backoff
3. WhatsApp confirmation messages (English format)
4. Past date validation
5. English language messages throughout

---

## Pre-Test Setup

### Environment Setup
- [ ] Backend server is running (`npm run dev` in Backend/)
- [ ] Database is accessible (PostgreSQL running)
- [ ] WhatsApp Business API credentials configured
- [ ] Test salon account created
- [ ] Test master and services configured

### Test Data Preparation
- [ ] Test Salon ID: `___________________`
- [ ] Test Master ID: `___________________`
- [ ] Test Service ID: `___________________`
- [ ] Test Phone Numbers:
  - Customer 1: `___________________`
  - Customer 2: `___________________`

---

## Test #1: Race Condition Prevention

### Objective
Verify that concurrent booking attempts for the same slot are handled correctly - only one succeeds.

### Prerequisites
- [ ] Identified available future slot: Date `_______` Time `_______`
- [ ] Two test devices/accounts ready

### Test Steps

#### Step 1.1: Simulate Concurrent Booking
1. [ ] Customer 1: Start booking flow via WhatsApp
2. [ ] Customer 1: Select service and master
3. [ ] Customer 1: View available slots
4. [ ] Customer 2: Start booking flow simultaneously
5. [ ] Customer 2: Select same service and master
6. [ ] Customer 2: View available slots (should show same slots)
7. [ ] **Both customers click same time slot SIMULTANEOUSLY**

**Expected Result:**
- [ ] Only one customer receives confirmation card
- [ ] Other customer receives "slot no longer available" message
- [ ] Alternative slots suggested to second customer

**Actual Result:**
```
Customer 1: _________________________________________________
Customer 2: _________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL

#### Step 1.2: Verify Database State
1. [ ] Check database for bookings at that time slot
2. [ ] Query: `SELECT * FROM bookings WHERE start_ts = '[slot_time]'`

**Expected Result:**
- [ ] Exactly 1 booking exists
- [ ] No duplicate bookings

**Actual Count:** `_______`

**Status:** ☐ PASS  ☐ FAIL

#### Step 1.3: Race Condition Stress Test
1. [ ] Prepare 3 test accounts
2. [ ] All 3 select same slot within 2 seconds
3. [ ] All 3 confirm booking

**Expected Result:**
- [ ] Only 1 confirmation succeeds
- [ ] Other 2 receive conflict errors

**Actual Results:**
- Confirmed: `_______`
- Failed: `_______`

**Status:** ☐ PASS  ☐ FAIL

---

## Test #2: OpenAI Retry Logic

### Objective
Verify retry mechanism works with exponential backoff (simulated via database delays).

### Prerequisites
- [ ] Backend logs accessible
- [ ] Can monitor retry attempts

### Test Steps

#### Step 2.1: Normal Operation (No Retries)
1. [ ] Start booking flow
2. [ ] Complete booking successfully
3. [ ] Check backend logs for `Creating booking (attempt 1/3)`

**Expected Result:**
- [ ] Booking succeeds on first attempt
- [ ] Log shows: `Booking created on attempt 1`

**Log Output:**
```
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL

#### Step 2.2: Simulated Transient Failure
**Note:** This requires temporary code modification or database throttling

1. [ ] Enable retry testing mode (if available)
2. [ ] OR: Temporarily increase database load to trigger timeouts
3. [ ] Start booking flow
4. [ ] Complete booking

**Expected Result:**
- [ ] Log shows multiple attempts: `attempt 1/3`, `attempt 2/3`, etc.
- [ ] Delays between attempts: ~100ms, ~200ms, ~400ms (exponential)
- [ ] Eventually succeeds

**Log Output:**
```
__________________________________________________________________
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL  ☐ SKIP (requires setup)

#### Step 2.3: Max Retries Exhausted
1. [ ] Simulate persistent database failure
2. [ ] Attempt booking

**Expected Result:**
- [ ] After 3 attempts, returns error to customer
- [ ] Error message: "Failed to create booking. Please try again or contact support."
- [ ] Session cleared

**Actual Error:**
```
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL  ☐ SKIP

---

## Test #3: WhatsApp Confirmation Messages

### Objective
Verify confirmation messages are sent in English with correct formatting.

### Test Steps

#### Step 3.1: Successful Booking Confirmation
1. [ ] Complete full booking flow
2. [ ] Confirm booking
3. [ ] Receive WhatsApp confirmation message

**Expected Message Format:**
```
✅ Booking Confirmed!

Service: [Service Name]
Date: [Weekday, Month DD]
Time: [H:MM AM/PM]
Master: [Master Name]

Booking Code: BK[6 digits]

We'll send you a reminder 24 hours before your appointment.

See you soon! 👋
```

**Actual Message Received:**
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

**Verification Checklist:**
- [ ] Contains "Booking Confirmed" (not Russian "подтверждено")
- [ ] Service name displayed correctly
- [ ] Date in English format (e.g., "Friday, Nov 15")
- [ ] Time in 12-hour format with AM/PM (not 24-hour)
- [ ] Master name displayed
- [ ] Booking code in format BK######
- [ ] Contains "See you soon!" message
- [ ] NO Russian text anywhere

**Status:** ☐ PASS  ☐ FAIL

#### Step 3.2: Time Format Verification
Test various times:

**Test Case A: Morning time (09:00)**
- [ ] Books 09:00 slot
- [ ] Confirmation shows: "9:00 AM"

**Test Case B: Afternoon time (15:00)**
- [ ] Books 15:00 slot
- [ ] Confirmation shows: "3:00 PM"

**Test Case C: Evening time (18:30)**
- [ ] Books 18:30 slot
- [ ] Confirmation shows: "6:30 PM"

**Test Case D: Midnight/noon edge cases**
- [ ] Books 12:00 slot
- [ ] Confirmation shows: "12:00 PM" (noon)

**Status:** ☐ PASS  ☐ FAIL

#### Step 3.3: Date Format Verification
1. [ ] Book slot 3 days in future
2. [ ] Verify date includes weekday name

**Expected:** e.g., "Wednesday, Nov 10"
**Actual:** `_______________________`

**Status:** ☐ PASS  ☐ FAIL

---

## Test #4: Past Date Validation

### Objective
Verify system rejects any booking attempts for past dates/times.

### Test Steps

#### Step 4.1: Past Date Slot Selection
1. [ ] Manually construct slot button ID with yesterday's date
   - Button ID format: `slot_[YYYY-MM-DD]_[HH:MM]_[masterId]`
   - Example: `slot_2025-11-06_15:00_master-123`
2. [ ] Send button click via API or test interface

**Expected Result:**
- [ ] Error message: "Cannot book time slots in the past"
- [ ] No booking created in database

**Actual Result:**
```
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL

#### Step 4.2: Past Time on Current Day
1. [ ] Get current date and time
2. [ ] Attempt to book slot 2 hours in the past (same day)
3. [ ] Example: Current time 15:00, try to book 13:00

**Expected Result:**
- [ ] Slot marked as unavailable
- [ ] Reason: "Cannot book time slots in the past"

**Actual Result:**
```
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL

#### Step 4.3: Future Slot Acceptance
1. [ ] Book slot 1 day in future
2. [ ] Verify booking succeeds

**Expected Result:**
- [ ] Booking accepted
- [ ] Confirmation received

**Status:** ☐ PASS  ☐ FAIL

#### Step 4.4: Edge Case - Slot Just Became Past
1. [ ] Select slot that starts in 2 minutes
2. [ ] Wait 3 minutes
3. [ ] Attempt to confirm booking (session still active)

**Expected Result:**
- [ ] Booking rejected
- [ ] Error about past time slot

**Actual Result:**
```
__________________________________________________________________
```

**Status:** ☐ PASS  ☐ FAIL

---

## Test #5: English Language Throughout Flow

### Objective
Verify all user-facing messages are in English, not Russian or mixed languages.

### Test Steps

#### Step 5.1: Initial Slot Selection Messages
1. [ ] Start booking flow
2. [ ] Receive slot selection card

**Check for English text:**
- [ ] Button labels in English
- [ ] Date/time formats in English
- [ ] "Available Slots" or similar heading in English

**No Russian text:**
- [ ] No "Доступные слоты"
- [ ] No Russian date/time formats

**Status:** ☐ PASS  ☐ FAIL

#### Step 5.2: Confirmation Card Messages
1. [ ] Select slot
2. [ ] Receive confirmation card

**Check for English:**
- [ ] "Confirm Booking" button text
- [ ] Booking details in English
- [ ] All labels (Service, Master, Date, Time) in English

**No Russian:**
- [ ] No "Подтвердить"
- [ ] No "Услуга", "Мастер", etc.

**Status:** ☐ PASS  ☐ FAIL

#### Step 5.3: Error Messages
Test various error scenarios:

**Error A: Session Expired**
1. [ ] Start booking, wait 20 minutes
2. [ ] Attempt to confirm

**Expected:** "Session expired. Please select a time slot again."
**Actual:** `_______________________`
**Contains Russian?** ☐ Yes ☐ No

**Error B: Slot Unavailable**
1. [ ] Two customers book same slot
2. [ ] Second customer gets error

**Expected:** "Sorry, this time slot is no longer available..."
**Actual:** `_______________________`
**Contains Russian?** ☐ Yes ☐ No

**Error C: Invalid Request**
1. [ ] Send malformed button click
2. [ ] Receive error

**Expected:** English error message
**Actual:** `_______________________`
**Contains Russian?** ☐ Yes ☐ No

**Status:** ☐ PASS  ☐ FAIL

#### Step 5.4: Complete Flow Language Consistency
1. [ ] Complete entire booking flow
2. [ ] Document every message received

**Messages in Flow:**
1. Initial response: `_______________________`
2. Slot selection card: `_______________________`
3. Confirmation card: `_______________________`
4. Final confirmation: `_______________________`

**All messages in English?** ☐ Yes ☐ No

**Status:** ☐ PASS  ☐ FAIL

---

## Test #6: Integration - All Fixes Together

### Objective
Verify all fixes work together in realistic scenarios.

### Test Steps

#### Step 6.1: Full Happy Path
1. [ ] Customer starts booking flow
2. [ ] Selects future slot
3. [ ] Receives English confirmation card
4. [ ] Confirms booking
5. [ ] Receives English confirmation message
6. [ ] Booking appears in database

**All steps in English:** ☐ Yes ☐ No
**No race conditions:** ☐ Yes ☐ No
**No past date issues:** ☐ Yes ☐ No

**Status:** ☐ PASS  ☐ FAIL

#### Step 6.2: Concurrent + Language Test
1. [ ] Two customers book different future slots simultaneously
2. [ ] Both receive confirmations
3. [ ] Both confirmations in English

**Both succeed:** ☐ Yes ☐ No
**Both English:** ☐ Yes ☐ No

**Status:** ☐ PASS  ☐ FAIL

#### Step 6.3: Error Recovery Test
1. [ ] Attempt past date booking
2. [ ] Receive error in English
3. [ ] Immediately book valid future slot
4. [ ] Succeeds with English confirmation

**Error in English:** ☐ Yes ☐ No
**Recovery works:** ☐ Yes ☐ No

**Status:** ☐ PASS  ☐ FAIL

---

## Performance Validation

### Test #7: Booking Speed

#### Step 7.1: Single Booking Performance
1. [ ] Start timer
2. [ ] Complete full booking flow (slot selection → confirmation)
3. [ ] Stop timer

**Expected:** < 3 seconds total (excluding network latency)
**Actual:** `_______` seconds

**Status:** ☐ PASS (< 3s)  ☐ FAIL

#### Step 7.2: Concurrent Booking Performance
1. [ ] 10 customers book different slots within 30 seconds
2. [ ] Measure time to completion

**Expected:** All complete within 60 seconds
**Actual:** `_______` seconds

**Status:** ☐ PASS  ☐ FAIL

---

## Database Validation

### Test #8: Data Integrity

#### Step 8.1: Booking Record Verification
After successful booking:

1. [ ] Check `bookings` table
2. [ ] Verify all fields populated correctly

**Query:** `SELECT * FROM bookings WHERE booking_code = 'BK[code]'`

**Fields to verify:**
- [ ] `booking_code` format correct (BK######)
- [ ] `start_ts` is future datetime
- [ ] `end_ts` is start_ts + duration
- [ ] `status` = 'CONFIRMED'
- [ ] `customer_phone` matches
- [ ] `customer_name` populated
- [ ] `master_id` correct
- [ ] `service_id` correct
- [ ] `metadata` contains price, duration, created_via

**Status:** ☐ PASS  ☐ FAIL

#### Step 8.2: No Duplicate Bookings
1. [ ] Run query for overlapping bookings:

```sql
SELECT
  b1.booking_code,
  b1.start_ts,
  b1.end_ts,
  b2.booking_code,
  b2.start_ts,
  b2.end_ts
FROM bookings b1
JOIN bookings b2 ON
  b1.master_id = b2.master_id AND
  b1.id != b2.id AND
  b1.status IN ('CONFIRMED', 'PENDING') AND
  b2.status IN ('CONFIRMED', 'PENDING') AND
  (
    (b1.start_ts >= b2.start_ts AND b1.start_ts < b2.end_ts) OR
    (b1.end_ts > b2.start_ts AND b1.end_ts <= b2.end_ts) OR
    (b1.start_ts <= b2.start_ts AND b1.end_ts >= b2.end_ts)
  )
```

**Expected:** 0 rows (no overlaps)
**Actual:** `_______` rows

**Status:** ☐ PASS  ☐ FAIL

---

## Final Checklist

### Critical Fix Verification Summary

| Fix | Test Passed | Notes |
|-----|-------------|-------|
| 1. Race Condition Prevention | ☐ | ___________________ |
| 2. OpenAI Retry Logic | ☐ | ___________________ |
| 3. WhatsApp Confirmation Messages | ☐ | ___________________ |
| 4. Past Date Validation | ☐ | ___________________ |
| 5. English Language Messages | ☐ | ___________________ |

### Overall Status
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Performance acceptable
- [ ] Data integrity verified

### Issues Found
List any issues discovered during testing:

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Recommendations
List any recommendations for improvement:

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

---

## Sign-Off

**Tester Name:** _______________________
**Date Completed:** _______________________
**Overall Result:** ☐ PASS  ☐ FAIL  ☐ PASS WITH ISSUES

**Approved By:** _______________________
**Date:** _______________________

---

## Notes

Use this space for additional observations:

```
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
```
