# Data Model: Staff and Services Frontend State Management

**Date**: 2025-10-25
**Phase**: 1 - Design & Contracts
**Purpose**: Document frontend state patterns, data flow, and component interfaces

---

## Overview

This document describes the frontend data model for Staff and Services management pages. Since this is a pure frontend feature consuming existing APIs, the focus is on:

1. **Page-level state management** (search, filters, pagination)
2. **Data transformation patterns** (API response → UI display)
3. **Component prop interfaces** (contracts for all components)
4. **Form data schemas** (validation and submission)

**Key Principle**: No new backend models - all types already exist in `Frontend/src/types/`

---

## 1. Domain Models (Already Defined)

### Staff/Master Entity

**Source**: `Frontend/src/types/models.ts`

```typescript
interface Master {
  id: number;
  salon_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: Specialization[];
  working_hours: WorkingHours;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Specialization =
  | 'HAIRSTYLIST'
  | 'MAKEUP_ARTIST'
  | 'NAIL_TECHNICIAN'
  | 'MASSAGE_THERAPIST'
  | 'BEAUTICIAN'
  | 'BARBER'
  | 'ESTHETICIAN'
  | 'OTHER';

interface WorkingHours {
  monday?: { start: string; end: string } | null;
  tuesday?: { start: string; end: string } | null;
  wednesday?: { start: string; end: string } | null;
  thursday?: { start: string; end: string } | null;
  friday?: { start: string; end: string } | null;
  saturday?: { start: string; end: string } | null;
  sunday?: { start: string; end: string } | null;
}
```

**UI Display Fields** (derived):
- Status badge: "Active" (green) | "Inactive" (gray)
- Specialization badges: Array of colored badges
- Working days count: "Works 5 days/week"
- Availability status: "Available" | "Unavailable" (for current time)

---

### Service Entity

**Source**: `Frontend/src/types/models.ts`

```typescript
interface Service {
  id: number;
  salon_id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  duration: number; // minutes
  price: number; // cents (stored as cents, displayed as dollars)
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ServiceCategory =
  | 'HAIRCUT'
  | 'COLORING'
  | 'STYLING'
  | 'MANICURE'
  | 'PEDICURE'
  | 'FACIAL'
  | 'MASSAGE'
  | 'MAKEUP'
  | 'WAXING'
  | 'THREADING'
  | 'TATTOO'
  | 'PIERCING';
```

**UI Display Fields** (derived):
- Price in dollars: `price / 100` formatted as `$XX.XX`
- Duration badge: "45 min" | "1h 30min"
- Category badge: Colored badge with category name
- Status badge: "Active" | "Inactive"

---

## 2. Page State Models

### Staff List Page State

```typescript
interface StaffListState {
  // Pagination
  page: number; // Current page (1-indexed)
  limit: number; // Items per page (default: 20)
  totalPages: number; // Calculated from total / limit
  totalItems: number; // Total count from API

  // Filters
  search: string; // Search by name
  specializationFilter: Specialization | ''; // Filter by specialization
  statusFilter: 'active' | 'inactive' | ''; // Filter by status

  // UI State
  isLoading: boolean; // React Query isLoading
  error: Error | null; // React Query error
  showFilters: boolean; // Advanced filters visibility (optional)
}
```

**State Management**: React `useState` hooks

**URL Persistence**: Not implemented in MVP (state-based only)

**Example**:
```typescript
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const [specializationFilter, setSpecializationFilter] = useState<Specialization | ''>('');
const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('active');
```

---

### Services List Page State

```typescript
interface ServicesListState {
  // Pagination
  page: number; // Current page (1-indexed)
  limit: number; // Items per page (default: 24)
  totalPages: number;
  totalItems: number;

  // Filters
  search: string; // Search by name
  categoryFilter: ServiceCategory | ''; // Filter by category
  statusFilter: 'active' | 'inactive' | '';

  // Sorting (optional)
  sortBy: 'name' | 'price' | 'duration' | 'category';
  sortOrder: 'asc' | 'desc';

  // UI State
  isLoading: boolean;
  error: Error | null;
}
```

**Enhanced Features** (vs Staff page):
- Sorting by multiple fields
- Per-page limit selector (10, 20, 50, 100)

---

### Staff Details Page State

```typescript
interface StaffDetailsState {
  staffId: number; // From URL params
  isLoading: boolean;
  error: Error | null;

  // Related Data (fetched separately)
  upcomingBookings: Booking[]; // Next 5 bookings
  statistics: {
    totalBookings: number;
    totalRevenue: number;
    averageRating: number | null;
  };
}
```

**Data Sources**:
- Staff data: `useMasterById(staffId)`
- Bookings: `useBookings({ master_id: staffId, limit: 5, sort: 'start_ts' })`
- Statistics: `useMasterStats(staffId)` (if hook exists) or calculated client-side

---

### Service Details Page State

```typescript
interface ServiceDetailsState {
  serviceId: number; // From URL params
  isLoading: boolean;
  error: Error | null;

  // Related Data
  recentBookings: Booking[]; // Last 10 bookings using this service
  statistics: {
    totalBookings: number;
    totalRevenue: number;
    averageFrequency: number; // Bookings per day
    popularTimeSlots: string[]; // Most booked times
  };
}
```

---

## 3. Form Data Schemas

### Create/Edit Staff Form

**Source**: `Frontend/src/components/features/staff/StaffForm.tsx` (already implemented)

```typescript
import { z } from 'zod';

const staffFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),

  phone: z.string()
    .regex(/^\+?[0-9]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),

  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  specialization: z.array(z.enum([
    'HAIRSTYLIST',
    'MAKEUP_ARTIST',
    'NAIL_TECHNICIAN',
    'MASSAGE_THERAPIST',
    'BEAUTICIAN',
    'BARBER',
    'ESTHETICIAN',
    'OTHER'
  ])).min(1, 'At least one specialization required'),

  working_hours: z.object({
    monday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    tuesday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    wednesday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    thursday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    friday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    saturday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    sunday: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
  }),

  is_active: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffFormSchema>;
```

**API Transformation**: Direct mapping (no transformation needed)

---

### Create/Edit Service Form

**Source**: `Frontend/src/components/features/services/ServiceForm.tsx` (already implemented)

```typescript
const serviceFormSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name too long'),

  category: z.enum([
    'HAIRCUT', 'COLORING', 'STYLING',
    'MANICURE', 'PEDICURE',
    'FACIAL', 'MASSAGE', 'MAKEUP',
    'WAXING', 'THREADING', 'TATTOO', 'PIERCING'
  ]),

  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .or(z.literal('')),

  duration: z.number()
    .int('Duration must be a whole number')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),

  price: z.number()
    .min(0, 'Price cannot be negative')
    .transform(val => Math.round(val * 100)), // Convert dollars to cents

  is_active: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;
```

**API Transformation**: Price dollars → cents (done in schema transform)

**Display Transformation**: Price cents → dollars
```typescript
const displayPrice = service.price / 100;
```

---

## 4. API Request/Response Types

### List APIs

**Staff List Request**:
```typescript
interface GetMastersParams {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: Specialization;
  active?: boolean; // true = active only, false = inactive only, undefined = all
  sort?: 'name' | 'created_at';
  order?: 'asc' | 'desc';
}
```

**Staff List Response**:
```typescript
interface GetMastersResponse {
  masters: Master[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

**Services List Request**:
```typescript
interface GetServicesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: ServiceCategory;
  active?: boolean;
  sort?: 'name' | 'price' | 'duration' | 'category';
  order?: 'asc' | 'desc';
}
```

**Services List Response**:
```typescript
interface GetServicesResponse {
  services: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

### Create/Update APIs

**Create Staff Request**:
```typescript
interface CreateMasterRequest {
  name: string;
  phone?: string;
  email?: string;
  specialization: Specialization[];
  working_hours: WorkingHours;
  is_active?: boolean;
}
```

**Update Staff Request**:
```typescript
interface UpdateMasterRequest {
  name?: string;
  phone?: string;
  email?: string;
  specialization?: Specialization[];
  working_hours?: WorkingHours;
  is_active?: boolean;
}
```

---

## 5. Data Transformations

### Price Conversion (Services)

**Storage → Display**:
```typescript
function centsToDisplayPrice(cents: number, currency: string = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(dollars);
}

// Example: 4500 → "$45.00"
```

**Form Input → API**:
```typescript
// Handled by Zod schema transform
price: z.number().transform(val => Math.round(val * 100))

// Example: User enters 45.00 → API receives 4500
```

---

### Duration Formatting

```typescript
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
}

// Examples:
// 30 → "30 min"
// 60 → "1h"
// 90 → "1h 30min"
```

---

### Working Hours Display

```typescript
function formatWorkingHours(hours: WorkingHours): string {
  const days = Object.entries(hours)
    .filter(([_, times]) => times !== null)
    .map(([day]) => day.slice(0, 3).toUpperCase()); // MON, TUE, etc.

  return days.length === 0
    ? 'Not configured'
    : `${days.join(', ')} (${days.length} days/week)`;
}

// Example: { monday: {...}, tuesday: {...} } → "MON, TUE (2 days/week)"
```

---

### Specialization Display

```typescript
const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  HAIRSTYLIST: 'Hairstylist',
  MAKEUP_ARTIST: 'Makeup Artist',
  NAIL_TECHNICIAN: 'Nail Technician',
  MASSAGE_THERAPIST: 'Massage Therapist',
  BEAUTICIAN: 'Beautician',
  BARBER: 'Barber',
  ESTHETICIAN: 'Esthetician',
  OTHER: 'Other',
};

// Usage: specialization.map(s => SPECIALIZATION_LABELS[s]).join(', ')
```

---

### Category Display

```typescript
const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  HAIRCUT: 'Haircut',
  COLORING: 'Coloring',
  STYLING: 'Styling',
  MANICURE: 'Manicure',
  PEDICURE: 'Pedicure',
  FACIAL: 'Facial',
  MASSAGE: 'Massage',
  MAKEUP: 'Makeup',
  WAXING: 'Waxing',
  THREADING: 'Threading',
  TATTOO: 'Tattoo',
  PIERCING: 'Piercing',
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  HAIRCUT: 'bg-blue-100 text-blue-800',
  COLORING: 'bg-purple-100 text-purple-800',
  STYLING: 'bg-pink-100 text-pink-800',
  MANICURE: 'bg-red-100 text-red-800',
  PEDICURE: 'bg-orange-100 text-orange-800',
  // ... etc
};
```

---

## 6. Computed/Derived State

### Pagination Calculations

```typescript
interface PaginationInfo {
  start: number; // First item index (1-indexed)
  end: number; // Last item index
  hasMore: boolean; // Has next page
  hasPrev: boolean; // Has previous page
}

function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasMore = end < total;
  const hasPrev = page > 1;

  return { start, end, hasMore, hasPrev };
}

// Example: page=2, limit=20, total=45
// → { start: 21, end: 40, hasMore: true, hasPrev: true }
```

---

### Filter Active Count

```typescript
function countActiveFilters(state: StaffListState): number {
  let count = 0;
  if (state.search) count++;
  if (state.specializationFilter) count++;
  if (state.statusFilter) count++;
  return count;
}

// Used to show badge: "3 filters active"
```

---

### Category Statistics

```typescript
interface CategoryStats {
  category: ServiceCategory;
  count: number;
  percentage: number;
}

function calculateCategoryStats(services: Service[]): CategoryStats[] {
  const counts = new Map<ServiceCategory, number>();

  services.forEach(s => {
    counts.set(s.category, (counts.get(s.category) || 0) + 1);
  });

  const total = services.length;

  return Array.from(counts.entries()).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

// Used to show: "Haircut (8) | Coloring (5) | Manicure (6)"
```

---

## 7. React Query Cache Structure

### Query Keys Pattern

**Source**: `Frontend/src/lib/query/queryKeys.ts`

```typescript
export const queryKeys = {
  masters: {
    all: ['masters'] as const,
    lists: () => [...queryKeys.masters.all, 'list'] as const,
    list: (salonId: string, filters?: GetMastersParams) =>
      [...queryKeys.masters.lists(), salonId, filters] as const,
    details: () => [...queryKeys.masters.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.masters.details(), id] as const,
    schedule: (id: number) => [...queryKeys.masters.detail(id), 'schedule'] as const,
    stats: (id: number) => [...queryKeys.masters.detail(id), 'stats'] as const,
  },

  services: {
    all: ['services'] as const,
    lists: () => [...queryKeys.services.all, 'list'] as const,
    list: (salonId: string, filters?: GetServicesParams) =>
      [...queryKeys.services.lists(), salonId, filters] as const,
    details: () => [...queryKeys.services.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.services.details(), id] as const,
    stats: (id: number) => [...queryKeys.services.detail(id), 'stats'] as const,
  },
};
```

**Cache Invalidation Strategy**:
- Create master → Invalidate `masters.lists()`
- Update master → Invalidate `masters.detail(id)` and `masters.lists()`
- Delete master → Invalidate `masters.lists()` and related bookings
- Same pattern for services

---

## 8. State Management Decisions

### Why State-Based (Not URL Params)?

**Advantages**:
1. Simpler implementation (no URL parsing/serialization)
2. Matches existing codebase patterns
3. Faster development
4. No hydration issues with SSR

**Disadvantages**:
1. Filters reset on page refresh
2. Can't share filtered view via URL
3. No browser back/forward support for filters

**Decision**: State-based for MVP, URL params as future enhancement.

---

### Why React Query (Not Redux/Zustand)?

**Advantages**:
1. Already integrated in codebase
2. Built-in caching, loading, error states
3. Automatic refetching and invalidation
4. Optimistic updates support
5. No manual state synchronization

**Decision**: Use React Query for all server state. No additional state management needed.

---

### Why Forms in Components (Not Pages)?

**Advantages**:
1. Reusability (same form for create/edit)
2. Separation of concerns (form validation separate from page logic)
3. Easier testing
4. Already implemented (StaffForm, ServiceForm exist)

**Decision**: Keep forms as reusable components. Pages handle navigation and feedback only.

---

## 9. Error Handling Patterns

### API Errors

```typescript
interface APIError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>; // Validation errors
}

// React Query automatically provides error object
const { data, error } = useMasters(salonId);

if (error) {
  // Display user-friendly message
  const message = error.response?.data?.message || 'Failed to load staff';
  return <Alert type="error" message={message} />;
}
```

---

### Form Validation Errors

```typescript
// Zod validation errors automatically shown by React Hook Form
const { register, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

// Field-level errors
{errors.name && <span className="error">{errors.name.message}</span>}
```

---

### Delete Confirmation

```typescript
const handleDelete = async (id: number) => {
  // Simple confirmation (MVP)
  if (!window.confirm('Are you sure you want to delete this staff member?')) {
    return;
  }

  try {
    await deleteMaster.mutateAsync(id);
    // Success feedback (automatic refetch by React Query)
  } catch (err) {
    // Error feedback
    alert('Failed to delete: ' + err.message);
  }
};
```

**Future Enhancement**: Replace with custom ConfirmDialog modal.

---

## 10. Performance Optimizations

### Memoization

```typescript
// Memoize expensive calculations
const paginationInfo = useMemo(
  () => calculatePagination(page, limit, total),
  [page, limit, total]
);

// Memoize lookup maps
const mastersById = useMemo(
  () => new Map(masters.map(m => [m.id, m])),
  [masters]
);
```

---

### Debounced Search

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue'; // or lodash.debounce

const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebouncedValue(searchInput, 300);

// Use debounced value in API call
const { data } = useMasters(salonId, { search: debouncedSearch });
```

---

### React Query Stale Time

```typescript
// Cache staff list for 2 minutes
useQuery({
  queryKey: queryKeys.masters.list(salonId, params),
  queryFn: () => api.masters.list(salonId, params),
  staleTime: 2 * 60 * 1000, // 2 minutes
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
});
```

---

## Summary

This data model document provides:

1. ✅ Complete frontend state patterns (pagination, filters, UI state)
2. ✅ Data transformation functions (price, duration, working hours)
3. ✅ Form schemas with validation (Zod)
4. ✅ API request/response types (already defined)
5. ✅ Computed state calculations (pagination, statistics)
6. ✅ React Query cache structure (query keys)
7. ✅ Error handling patterns
8. ✅ Performance optimizations

**Next Step**: Create TypeScript contract files in `contracts/` directory with all component prop interfaces.
