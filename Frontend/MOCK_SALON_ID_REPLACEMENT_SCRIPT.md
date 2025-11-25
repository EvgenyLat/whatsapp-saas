# MOCK_SALON_ID Replacement Script

## Quick Reference Guide

This document provides copy-paste ready replacements for all remaining files with MOCK_SALON_ID.

---

## Replacement Pattern (Universal)

### Step 1: Add Import
Add this line to the import section:
```typescript
import { useSalonId } from '@/hooks/useSalonId';
```

### Step 2: Remove Mock
Delete these lines:
```typescript
// Mock salon ID for now
const MOCK_SALON_ID = 'salon-123';
```

OR
```typescript
// Mock salon ID for now - in production this would come from auth context
const MOCK_SALON_ID = 'salon-123';
```

### Step 3: Add Hook
At the start of the component function:
```typescript
const salonId = useSalonId();
```

### Step 4: Replace All References
Find and replace all `MOCK_SALON_ID` with `salonId`

---

## Files Requiring Update

### ✅ COMPLETED
1. `src/app/(dashboard)/dashboard/page.tsx` - Dashboard home
2. `src/app/(dashboard)/dashboard/bookings/page.tsx` - Bookings list

### ⚠️ PENDING (16 files)

#### Bookings Pages (3 files)

**File 1**: `src/app/(dashboard)/dashboard/bookings/[id]/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useBooking(salonId, bookingId)`

**File 2**: `src/app/(dashboard)/dashboard/bookings/[id]/edit/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useBooking(salonId, bookingId)`, `useUpdateBooking(salonId)`

**File 3**: `src/app/(dashboard)/dashboard/bookings/new/page.tsx`
**Expected Occurrences**: 1
**API Calls**: `useCreateBooking(salonId)`

---

#### Customers Pages (4 files)

**File 4**: `src/app/(dashboard)/dashboard/customers/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useCustomers(salonId, params)`

**File 5**: `src/app/(dashboard)/dashboard/customers/[id]/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useCustomer(salonId, customerId)`

**File 6**: `src/app/(dashboard)/dashboard/customers/[id]/edit/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useCustomer(salonId, customerId)`, `useUpdateCustomer(salonId)`

**File 7**: `src/app/(dashboard)/dashboard/customers/new/page.tsx`
**Expected Occurrences**: 1
**API Calls**: `useCreateCustomer(salonId)`

---

#### Templates Pages (4 files)

**File 8**: `src/app/(dashboard)/dashboard/templates/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useTemplates(salonId, params)`

**File 9**: `src/app/(dashboard)/dashboard/templates/[id]/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useTemplate(salonId, templateId)`

**File 10**: `src/app/(dashboard)/dashboard/templates/[id]/edit/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useTemplate(salonId, templateId)`, `useUpdateTemplate(salonId)`

**File 11**: `src/app/(dashboard)/dashboard/templates/new/page.tsx`
**Expected Occurrences**: 1
**API Calls**: `useCreateTemplate(salonId)`

---

#### Staff Pages (2 files)

**File 12**: `src/app/(dashboard)/dashboard/staff/[id]/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useMaster(salonId, masterId)` OR `useStaff(salonId, staffId)`

**File 13**: `src/app/(dashboard)/dashboard/staff/[id]/edit/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useMaster(salonId, masterId)`, `useUpdateMaster(salonId)`

---

#### Services Pages (2 files)

**File 14**: `src/app/(dashboard)/dashboard/services/[id]/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useService(salonId, serviceId)`

**File 15**: `src/app/(dashboard)/dashboard/services/[id]/edit/page.tsx`
**Expected Occurrences**: 1-2
**API Calls**: `useService(salonId, serviceId)`, `useUpdateService(salonId)`

---

## Example Replacements

### Example 1: List Page

**Before:**
```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/api/useCustomers';

// Mock salon ID for now
const MOCK_SALON_ID = 'salon-123';

export default function CustomersPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useCustomers(MOCK_SALON_ID, { page });

  return (
    <div>
      <h1>Customers</h1>
      {/* ... */}
    </div>
  );
}
```

**After:**
```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/api/useCustomers';
import { useSalonId } from '@/hooks/useSalonId';

export default function CustomersPage() {
  const router = useRouter();
  const salonId = useSalonId();
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useCustomers(salonId, { page });

  return (
    <div>
      <h1>Customers</h1>
      {/* ... */}
    </div>
  );
}
```

---

### Example 2: Detail Page

**Before:**
```typescript
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useBooking } from '@/hooks/api/useBookings';

const MOCK_SALON_ID = 'salon-123';

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const { data: booking, isLoading } = useBooking(MOCK_SALON_ID, bookingId);

  return (
    <div>
      <h1>Booking Details</h1>
      {/* ... */}
    </div>
  );
}
```

**After:**
```typescript
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useBooking } from '@/hooks/api/useBookings';
import { useSalonId } from '@/hooks/useSalonId';

export default function BookingDetailPage() {
  const params = useParams();
  const salonId = useSalonId();
  const bookingId = params.id as string;

  const { data: booking, isLoading } = useBooking(salonId, bookingId);

  return (
    <div>
      <h1>Booking Details</h1>
      {/* ... */}
    </div>
  );
}
```

---

### Example 3: Form/Create Page

**Before:**
```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBooking } from '@/hooks/api/useBookings';

const MOCK_SALON_ID = 'salon-123';

export default function NewBookingPage() {
  const router = useRouter();
  const createBooking = useCreateBooking(MOCK_SALON_ID);

  const handleSubmit = async (data: any) => {
    await createBooking.mutateAsync(data);
    router.push('/dashboard/bookings');
  };

  return (
    <div>
      <h1>New Booking</h1>
      {/* ... */}
    </div>
  );
}
```

**After:**
```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBooking } from '@/hooks/api/useBookings';
import { useSalonId } from '@/hooks/useSalonId';

export default function NewBookingPage() {
  const router = useRouter();
  const salonId = useSalonId();
  const createBooking = useCreateBooking(salonId);

  const handleSubmit = async (data: any) => {
    await createBooking.mutateAsync(data);
    router.push('/dashboard/bookings');
  };

  return (
    <div>
      <h1>New Booking</h1>
      {/* ... */}
    </div>
  );
}
```

---

## Verification Checklist

After replacing each file, verify:

- [ ] Import added: `import { useSalonId } from '@/hooks/useSalonId';`
- [ ] Mock constant removed: `const MOCK_SALON_ID = 'salon-123';`
- [ ] Hook called: `const salonId = useSalonId();`
- [ ] All `MOCK_SALON_ID` replaced with `salonId`
- [ ] No TypeScript errors
- [ ] File compiles successfully
- [ ] Page loads without errors

---

## Testing After Replacement

### Test Each Page:

1. **Login** as a user with an existing salon
2. **Navigate** to the updated page
3. **Verify** data loads (no infinite spinner)
4. **Check** network tab shows correct salon_id in API calls
5. **Test** CRUD operations work correctly

### Common Issues:

**Issue**: Page shows loading spinner forever
**Cause**: API call still using 'salon-123' instead of real salon_id
**Fix**: Check all occurrences are replaced

**Issue**: "No salon found" error
**Cause**: User doesn't have a salon
**Fix**: This is expected - redirect to onboarding

**Issue**: TypeScript error on salonId
**Cause**: salonId might be null
**Fix**: useSalonId() throws if no salon, so this shouldn't happen in dashboard

---

## Batch Replacement Command (Optional)

If you have access to command line tools, you can use this pattern:

```bash
# Search for files with MOCK_SALON_ID
grep -r "MOCK_SALON_ID" src/app/\(dashboard\) --include="*.tsx" -l

# For each file, manually apply the pattern above
# No automated replacement recommended due to varying contexts
```

---

## Summary

- **Total Files to Update**: 16
- **Estimated Time**: 2-3 minutes per file = 30-45 minutes total
- **Difficulty**: Low (repetitive pattern)
- **Testing Time**: 5 minutes per page = 80 minutes total

**Total Estimated Effort**: ~2 hours for complete replacement and testing

---

## Need Help?

Refer to the two completed examples:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/bookings/page.tsx`

These show the exact pattern to follow.
