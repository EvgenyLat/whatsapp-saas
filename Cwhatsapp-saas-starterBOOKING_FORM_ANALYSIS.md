# Booking Creation Form - Complete Analysis Report

## Executive Summary

The booking creation form exists and is functional but has a critical issue: the frontend form is sending incomplete booking data to the backend API. The form successfully collects date, time, service, and staff member information through SmartBookingForm, but there is a mismatch between what the backend requires and what the frontend sends.

**Main Problem**: The API request is missing the salon_id field, which is REQUIRED by the backend.

---

## Current Form Fields (What User Sees)

The booking creation flow has TWO stages at /dashboard/bookings/new:

### Stage 1: Customer Selection
- Search/select existing customer
- OR Create new customer with:
  - Customer Name *
  - Phone Number *
  - Email (Optional)

### Stage 2: Booking Details (SmartBookingForm)
- Service Selection (dropdown from services list)
- Staff Member Selection (dropdown from masters/staff list)
- Date (date picker)
- Start Time (time picker)
- Automatic Duration Display (read-only, calculated from service)
- Estimated End Time (read-only, auto-calculated)
- Price Preview (read-only, from service)
- Availability Checker (validates conflicts)

---

## Backend API Requirements

### CreateBookingDto (Backend Validation)

**REQUIRED Fields**:
1. salon_id - STRING - Salon ID (CRITICAL)
2. customer_phone - STRING - Customer phone number
3. customer_name - STRING - Customer name
4. service - STRING - Service name/description
5. start_ts - ISO 8601 DATE STRING - Booking start time

**OPTIONAL Fields**:
1. end_ts - ISO 8601 DATE STRING - Booking end time (auto-calculated)
2. master_id - STRING - Staff member ID
3. service_id - STRING - Service ID (for auto-calculation of end_ts)
4. booking_code - STRING - Unique booking code (auto-generated)

---

## CRITICAL ISSUE FOUND

### Issue: Missing salon_id in Request Body

**Current Code** (Frontend/src/app/.../bookings/new/page.tsx):
```
API POST to: /bookings/${salonId}

Request body sends:
{
  customer_phone: selectedCustomer.phone_number,
  customer_name: selectedCustomer.name,
  customer_email: selectedCustomer.email,
  service_id: bookingData.service_id,
  master_id: bookingData.master_id,
  start_ts: appointmentDateTime,
  service: ''
}

MISSING: salon_id
```

**Backend Expects** (Backend/src/modules/bookings/dto/create-booking.dto.ts):
```
CreateBookingDto {
  salon_id: string  ← REQUIRED
  customer_phone: string  ← Required
  customer_name: string  ← Required
  service: string  ← Required
  start_ts: string  ← Required
  ...optional fields
}
```

### What This Means:
- Bookings FAIL validation because salon_id is undefined
- Backend cannot verify salon ownership
- Booking creation is rejected before reaching database
- No bookings are created or stored

---

## Complete Field Comparison

| Field | Required | Collected | Sent in Request | Status |
|-------|----------|-----------|-----------------|--------|
| salon_id | YES | Available | NO | ERROR |
| customer_phone | YES | YES | YES | OK |
| customer_name | YES | YES | YES | OK |
| service | YES | Selected | Empty string | ERROR |
| start_ts | YES | YES | YES | OK |
| service_id | NO* | YES | YES | OK |
| master_id | NO | YES | YES | OK |
| end_ts | NO* | Auto-calc | NO | OK |
| booking_code | NO | - | NO | OK (auto-gen) |

*NO = Optional, but required if you want auto-calculation

---

## Why Bookings Don't Appear

### Reason 1: API Request Fails
- salon_id missing causes 400 Bad Request
- Backend validation rejects the request
- Booking is never created in database

### Reason 2: Even if somehow created
- No salon_id means no proper association
- Bookings wouldn't be linked to correct salon
- User couldn't see their own bookings

### Reason 3: Calendar doesn't show anything
- Calendar queries: GET /bookings with salon_id filter
- Since booking creation failed, query returns empty
- Weekly schedule view shows no bookings

---

## Files with Code Details

### Frontend Page (NEW BOOKING CREATION)
**File**: Frontend/src/app/(dashboard)/dashboard/bookings/new/page.tsx
**Lines 72-87**: Form submission handler
**Issue**: salon_id NOT included in data object

### Frontend Form Component
**File**: Frontend/src/components/bookings/SmartBookingForm.tsx
**Status**: Correctly collects service, staff, date, time, duration
**Note**: Component doesn't know about salon_id

### API Request
**File**: Frontend/src/lib/api/index.ts
**Lines 379-385**: Booking creation endpoint
**Code**: POST /bookings/${salonId} with data body
**Issue**: salon_id should be in body, not just URL

### Backend Validation
**File**: Backend/src/modules/bookings/dto/create-booking.dto.ts
**Lines 8-11**: salon_id validation
**Validation**: IsString, IsNotEmpty
**Result**: Request without salon_id fails

### Backend Creation Service
**File**: Backend/src/modules/bookings/bookings.service.ts
**Lines 46-114**: Create method
**Line 51**: Accesses createBookingDto.salon_id
**Error**: undefined if not in request body

---

## Additional Issues

### Issue 2: Empty service Field
- Frontend sends: service: ''
- Backend requires: service with value
- Solution: Should fetch service name from selectedService

### Issue 3: Type Conversion
- Frontend sends service_id as number
- Backend expects string
- May cause type validation errors

---

## What Gets Stored (IF booking creation succeeds)

Looking at Backend/src/modules/bookings/bookings.service.ts (lines 89-100):

```
booking = {
  booking_code: generated or provided
  salon_id: from DTO
  customer_phone: from DTO
  customer_name: from DTO
  service: from DTO (currently empty!)
  start_ts: from DTO
  end_ts: calculated from service duration
  master_id: from DTO
  service_id: from DTO
  status: CONFIRMED
}
```

---

## How Booking System Should Work

1. User selects customer (existing or creates new)
2. SmartBookingForm collects: service, staff, date, time
3. Availability Checker validates no conflicts
4. Submit handler combines all data
5. API sends to backend with salon_id
6. Backend validates and creates booking
7. Booking appears in database
8. Calendar query fetches and displays booking
9. Weekly schedule shows the appointment

**Current Status**: Breaks at step 5 (missing salon_id)

---

## Solution Overview

To fix booking creation:
1. Get salon_id from useSalonIdSafe() hook (already available in component)
2. Add salon_id to the data object sent to API
3. Add service name from selectedService.name
4. Ensure service_id and master_id are strings
5. Test booking creation end-to-end

---

## Testing the Issue

To verify this is the problem:
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Create a booking
4. Look at the POST request to /bookings/...
5. Check the request body
6. You will see: NO salon_id field

---

## Summary

**Current State**:
- Form collects customer name, phone, service, staff, date, time (GOOD)
- Form does not send salon_id in request body (BAD)
- Backend rejects request due to missing salon_id (RESULT)
- No booking created in database (CONSEQUENCE)
- No booking appears in calendar (CONSEQUENCE)

**Required Fix**:
- Include salon_id in the API request body
- Include service name instead of empty string
- Verify type conversions are correct

---
