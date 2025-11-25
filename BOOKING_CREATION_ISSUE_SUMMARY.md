# Booking Creation Form Analysis

## Critical Issue: Missing salon_id in API Request

The booking creation form is sending incomplete data to the backend API.

### What Frontend Sends:
- customer_phone: OK
- customer_name: OK
- service_id: OK
- master_id: OK
- start_ts: OK
- service: EMPTY STRING (problem)
- salon_id: MISSING (critical problem)

### What Backend Requires (CreateBookingDto):
All REQUIRED fields with @IsNotEmpty():
- salon_id: string - MISSING
- customer_phone: string
- customer_name: string
- service: string - SENT AS EMPTY
- start_ts: ISO date string

### Why Bookings Don't Appear:
1. Frontend sends POST to /bookings/{salonId} WITHOUT salon_id in body
2. Backend validation fails on missing salon_id field
3. Request rejected with 400 Bad Request
4. Booking never created in database
5. Calendar query returns nothing

### How to Fix:
In Frontend/src/app/.../bookings/new/page.tsx line 79-87:

Add: salon_id: salonId
Replace service from empty string to actual service name

### Files with Issues:
- Frontend: Frontend/src/app/dashboard/bookings/new/page.tsx (lines 72-94)
- Backend: Backend/src/modules/bookings/dto/create-booking.dto.ts (salon_id validation)
- Backend: Backend/src/modules/bookings/bookings.service.ts (uses salon_id)

### Complete Analysis:
See BOOKING_FORM_DETAILED_ANALYSIS.md for full code details

