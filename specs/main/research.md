# Research: Staff and Services Management Frontend Pages

**Date**: 2025-10-25
**Phase**: 0 - Technical Research
**Status**: Complete

## Executive Summary

Research conducted on the existing WhatsApp SaaS codebase to identify reusable components, established patterns, and technical decisions for implementing the Staff and Services management pages. All required infrastructure is in place - the implementation will follow proven patterns from the bookings module.

**Key Finding**: Staff and Services list pages already exist but need enhancement. Services page is more complete (has search/filter/pagination) and should serve as the primary reference.

---

## 1. Component Inventory

### ✅ REUSABLE COMPONENTS (Already Exist)

**Base UI Components** (`Frontend/src/components/ui/`):
- **Button** - All variants needed (primary, secondary, outline, danger, success), loading states, icons
- **Card System** - Card, CardHeader, CardTitle, CardContent, CardFooter
- **Form Controls** - Input, Textarea, Select (Radix UI), Checkbox, Switch
- **Feedback** - LoadingSpinner (4 sizes), Alert (4 types: info/success/warning/error), Badge
- **Modal** - Dialog component from Radix UI

**Feature Components**:
- **StaffCard** (`components/staff/StaffCard.tsx`) - Card display for staff members ✅
- **ServiceCard** (`components/features/services/ServiceCard.tsx`) - Card display for services ✅
- **EmptyState** (`components/analytics/EmptyState.tsx`) - Reusable empty state with icon/title/description/action ✅
- **FormField** (`components/forms/FormField.tsx`) - React Hook Form wrapper ✅

**Form Components** (Complete):
- **StaffForm** - Full create/edit form with validation ✅
- **ServiceForm** - Full create/edit form with category/pricing ✅

### ❌ COMPONENTS TO CREATE (Not Found)

**Shared Components** (Need to build):
1. **PageHeader** - Reusable page title + action buttons (can use existing Card + Button)
2. **SearchBar** - Debounced search input (can enhance existing Input)
3. **FilterBar** - Dropdown filters + active filter badges (can use Select + Badge)
4. **Pagination** - Page navigation (simple Previous/Next pattern)
5. **ConfirmDialog** - Better UX than window.confirm() (can use existing Modal)

**Decision**: Build minimal new components, primarily composing existing UI components.

---

## 2. Existing Pages Analysis

### Staff Page (`Frontend/src/app/(dashboard)/dashboard/staff/page.tsx`)

**Current State**:
- Basic card grid view using StaffCard ✅
- Delete functionality with window.confirm() ✅
- Navigation to detail/edit pages ✅
- Loading state with spinner ✅

**Missing Features** (to be added):
- ❌ Search functionality
- ❌ Filter by specialization
- ❌ Filter by active/inactive status
- ❌ Pagination
- ❌ "Showing X to Y of Z" info

**Priority**: Enhance this page to match Services page quality

---

### Services Page (`Frontend/src/app/(dashboard)/dashboard/services/page.tsx`)

**Current State**: ✅ COMPLETE - This is the reference implementation

Features implemented:
- ✅ Card grid view with ServiceCard
- ✅ Search with Input component
- ✅ Category filter (dropdown)
- ✅ Status filter (active/inactive dropdown)
- ✅ Per-page limit selector
- ✅ Pagination (Previous/Next)
- ✅ "Showing X to Y of Z" text
- ✅ Delete with confirmation
- ✅ Suspense boundary for useSearchParams
- ✅ Loading/error states

**Decision**: Use Services page as primary reference pattern for enhancing Staff page.

---

## 3. Established Patterns (from Bookings & Services)

### A. State Management Pattern

```typescript
// State-based (NOT URL params)
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const [categoryFilter, setCategoryFilter] = useState('');
const [statusFilter, setStatusFilter] = useState('active');
const [showFilters, setShowFilters] = useState(false);
```

**Decision**: Use state-based filtering. Simpler than URL params, matches existing pattern.

**Trade-off**: Filters reset on page refresh (acceptable for MVP).

---

### B. Pagination Approach

```typescript
// Simple Previous/Next pattern
<div className="flex items-center justify-between">
  <Button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
    Previous
  </Button>
  <span>Showing {start} to {end} of {total}</span>
  <Button onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
    Next
  </Button>
</div>
```

**Decision**: Use simple Previous/Next pagination. No page number buttons needed for MVP.

**Rationale**: Most salons have <100 staff/services, complex pagination not needed.

---

### C. Search Implementation

```typescript
// No debouncing in current implementation
const [search, setSearch] = useState('');

<Input
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on search
  }}
  placeholder="Search..."
/>

// Backend handles search via query param
const { data } = useServices({ search, page, limit });
```

**Decision**: Implement debouncing (300ms) for better UX and fewer API calls.

**Enhancement**: Add debounce using custom hook or lodash.debounce.

---

### D. Filter UI Pattern

Services page pattern (recommended):
```typescript
// Filters in header row
<div className="flex gap-4 items-center">
  <Input placeholder="Search..." /> {/* Search */}
  <Select value={category} onChange={...}> {/* Category filter */}
  <Select value={status} onChange={...}> {/* Status filter */}
  <Select value={limit} onChange={...}> {/* Per-page selector */}
</div>
```

Bookings page pattern (alternative):
```typescript
// Quick filters always visible
<div className="flex gap-2">
  <Badge onClick={() => setFilter('all')}>All</Badge>
  <Badge onClick={() => setFilter('confirmed')}>Confirmed</Badge>
</div>

// Advanced filters collapsible
<Collapsible open={showFilters}>
  <Select ... />
  <Select ... />
</Collapsible>
```

**Decision**: Use Services page pattern (simpler, all filters visible).

---

### E. Data Display - Card Grid vs Table

**Staff/Services**: Card grid (responsive columns)
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>
```

**Bookings**: Table view (row-based)
```typescript
<table>
  <tbody>
    {items.map(item => <tr key={item.id}>...</tr>)}
  </tbody>
</table>
```

**Decision**: Keep card grid for Staff/Services (already implemented, better for mobile).

---

### F. Loading States

```typescript
if (isLoading) {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size="lg" label="Loading..." />
    </div>
  );
}
```

**Decision**: Use full-page spinner for simplicity (matches existing pattern).

**Alternative**: Skeleton cards (better UX but more complex) - defer to future enhancement.

---

### G. Error Handling

```typescript
if (error) {
  return (
    <Card>
      <CardContent>
        <Alert type="error" message={error.message} />
        <Button onClick={() => refetch()}>Retry</Button>
      </CardContent>
    </Card>
  );
}
```

**Decision**: Use Alert component + Retry button pattern.

---

### H. Empty State

```typescript
if (data.items.length === 0) {
  return (
    <EmptyState
      icon={<UsersIcon />}
      title="No staff members yet"
      description="Add your first staff member to get started"
      action={<Button href="/staff/new">Add Staff</Button>}
    />
  );
}
```

**Decision**: Use existing EmptyState component (already perfect for this use case).

---

## 4. React Query Hook Patterns

### Query Pattern
```typescript
const { data, isLoading, error, refetch } = useMasters(MOCK_SALON_ID, {
  page,
  limit: 20,
  search,
  specialization: specializationFilter,
  active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
});
```

**Decision**: Use existing hooks as-is. They support all needed filter parameters.

---

### Mutation Pattern
```typescript
const deleteMaster = useDeleteMaster(MOCK_SALON_ID);

const handleDelete = async (id: number) => {
  if (window.confirm('Are you sure?')) {
    await deleteMaster.mutateAsync(id);
    // React Query auto-invalidates and refetches
  }
};
```

**Decision**: Keep window.confirm() for MVP (simple, functional).

**Future Enhancement**: Replace with ConfirmDialog component for better UX.

---

### Optimistic Updates
```typescript
// Already implemented in hooks
const updateMaster = useUpdateMaster(MOCK_SALON_ID);

// Mutation automatically invalidates cache and refetches
// No manual refetch needed
```

**Decision**: Trust existing hook implementation. No manual cache management needed.

---

## 5. Form Patterns (React Hook Form + Zod)

### Form Setup
```typescript
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().regex(/^\+?[0-9]+$/, 'Invalid phone'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'staff']),
});

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: initialData || {},
});
```

**Decision**: Use Zod for validation (already established pattern).

---

### Form Submission
```typescript
const handleFormSubmit = async (data: FormData) => {
  try {
    await createMaster.mutateAsync(data);
    // Show success feedback
  } catch (err) {
    // Show error feedback
  }
};
```

**Decision**: Parent component handles success/error, form only handles validation.

**Rationale**: Separation of concerns - form validates, page handles navigation/feedback.

---

### Success/Error Feedback
```typescript
// In page component, not form
try {
  await mutation.mutateAsync(data);
  setSuccessAlert('Staff member created!');
  router.push('/dashboard/staff');
} catch (err) {
  setErrorAlert(err.message);
}
```

**Decision**: Use Alert component for inline feedback in page.

**No global toast system** - keeping it simple with Alert component.

---

## 6. Next.js App Router Patterns

### Client Components
```typescript
'use client'; // Required for all interactive pages

export default function StaffPage() {
  // State, hooks, event handlers
}
```

**Decision**: All pages will use 'use client' directive.

---

### Navigation
```typescript
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const router = useRouter();

// Programmatic navigation
router.push('/dashboard/staff/new');

// Link components
<Link href="/dashboard/staff/new">Add Staff</Link>
```

**Decision**: Use Link for static links, useRouter for programmatic navigation.

---

### Search Params (Services page pattern)
```typescript
'use client';

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  // ...
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ServicesPageContent />
    </Suspense>
  );
}
```

**Decision**: Wrap useSearchParams usage in Suspense to avoid hydration issues.

**Note**: Current implementation uses state, not URL params. This pattern is for future enhancement.

---

## 7. TypeScript Configuration

### Strict Mode Settings
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitAny": true,
  "noImplicitReturns": true
}
```

**Decision**: Follow strict TypeScript rules. No `any` types allowed.

---

### Path Aliases Available
```
@/* → Frontend/src/*
@/components/* → Frontend/src/components/*
@/hooks/* → Frontend/src/hooks/*
@/types/* → Frontend/src/types/*
@/lib/* → Frontend/src/lib/*
```

**Decision**: Use path aliases for cleaner imports.

---

## 8. Testing Strategy

### Jest Configuration
- **Environment**: jsdom
- **Test Location**: `__tests__/` folder next to component
- **Coverage Target**: 80% (adjusted to 70% for UI-heavy pages)

### Testing Pattern
```typescript
import { render, screen, waitFor, userEvent } from '@/test-utils';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe('StaffPage', () => {
  it('renders page header', () => {
    render(<StaffPage />);
    expect(screen.getByText('Staff Members')).toBeInTheDocument();
  });

  it('displays staff after loading', async () => {
    render(<StaffPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

**Decision**: Follow existing test patterns. Mock Next.js hooks, test rendering and user interactions.

---

## 9. Technical Decisions Summary

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| **State Management** | React state (not URL params) | Simpler, matches existing pattern |
| **Pagination** | Previous/Next only | Sufficient for expected data size (<100 items) |
| **Search** | Debounced (300ms) | Better UX, fewer API calls |
| **Filters** | All visible (Services pattern) | Simpler than collapsible |
| **Display** | Card grid (3 cols responsive) | Already implemented, mobile-friendly |
| **Loading** | Full-page spinner | Simple, matches existing |
| **Empty State** | EmptyState component | Already available and perfect |
| **Error Handling** | Alert + Retry button | Consistent with existing |
| **Confirmation** | window.confirm() for MVP | Simple, functional (enhance later) |
| **Forms** | React Hook Form + Zod | Established pattern |
| **Feedback** | Alert component (no toast) | No toast library, Alert sufficient |
| **Navigation** | Link + useRouter | Next.js standard |
| **Testing** | Jest + RTL, 70% coverage | Realistic for UI-heavy pages |

---

## 10. Implementation Priorities

### Priority 1 (P1) - Core Functionality
1. Enhance Staff list page with search/filter/pagination (match Services page)
2. Implement Create Staff page (form already exists)
3. Implement Create Service page (form already exists)
4. Basic navigation between list and create pages

**Estimated Effort**: 1-2 days

---

### Priority 2 (P2) - Details & Management
1. Staff Details page with schedule/stats
2. Staff Edit page (reuse form)
3. Service Details page with analytics
4. Service Edit page (reuse form)

**Estimated Effort**: 1 day

---

### Priority 3 (P3) - Enhancements (Future)
1. Replace window.confirm with ConfirmDialog modal
2. Implement URL-based search params (persistent filters)
3. Add skeleton loading states
4. Implement page number pagination
5. Add bulk operations
6. Export functionality (CSV)

**Defer to future iterations**

---

## 11. Constraints & Gotchas

### Critical Constraints
1. **MOCK_SALON_ID**: Replace hardcoded 'salon-123' with actual salon context
2. **TypeScript Strict**: No `any` types, all interfaces must be complete
3. **Component Reuse**: Prefer composition over new components
4. **Pattern Consistency**: Follow Services page pattern for Staff enhancements

### Known Gotchas
1. **useSearchParams**: Must wrap in Suspense to avoid hydration errors
2. **React Query Keys**: Must match existing pattern in queryKeys.ts for proper invalidation
3. **Form Validation**: Zod schemas must match backend validation exactly
4. **Delete Operations**: Soft delete (deactivate) not hard delete
5. **Pagination Reset**: Always reset to page 1 when search/filter changes

---

## 12. Dependencies Confirmed

### ✅ All Dependencies Available
- Next.js 14 App Router ✅
- React 18 ✅
- React Query (Tanstack Query) ✅
- React Hook Form ✅
- Zod validation ✅
- Tailwind CSS ✅
- Radix UI components ✅
- Jest + React Testing Library ✅
- All API hooks (useMasters, useServices) ✅
- All UI components ✅
- All form components ✅

### ❌ No Blockers
No missing dependencies. All infrastructure in place.

---

## 13. Next Phase Preparation

### Phase 1 Deliverables
1. **data-model.md** - Frontend state patterns for staff/services management
2. **contracts/*.ts** - TypeScript interfaces for all page props and shared components
3. **quickstart.md** - User guide for salon owners
4. **Agent context update** - Add new routes and patterns

### Ready to Proceed
- ✅ All research complete
- ✅ Technical decisions documented
- ✅ Patterns identified and proven
- ✅ No blocking issues
- ✅ Clear implementation path

---

**Research Status**: COMPLETE
**Phase 0 Output**: This document
**Next Phase**: Phase 1 - Design & Contracts
**Blocking Issues**: None
