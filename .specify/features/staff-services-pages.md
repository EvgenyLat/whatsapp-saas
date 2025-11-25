# Feature Specification: Staff and Services Management Frontend Pages

**Feature Branch**: `feature/staff-services-pages`
**Created**: 2025-10-25
**Status**: Ready for Implementation
**Input**: Create complete frontend pages to wire up existing Staff and Services components with backend API

---

## Executive Summary

Build 8 frontend pages (4 for Staff, 4 for Services) that enable salon owners to manage their team and service catalog through an intuitive web interface. All backend APIs, React Query hooks, and UI components are already implemented—this feature focuses solely on creating the page-level components that connect them.

**Current State**: Backend 100% complete, Components 100% complete, Pages 0% complete
**Target State**: Fully functional staff and services management interface
**Estimated Effort**: 2-3 days (1 Frontend Developer)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Search Staff Members (Priority: P1)

**Scenario**: Maria, a salon owner, needs to quickly find a specific staff member and review their schedule.

**Why this priority**: This is the foundation for all staff management - users must be able to see their team before they can edit, add, or manage them.

**Independent Test**: Navigate to /dashboard/staff and verify all staff members display correctly with search and filter functionality working. This delivers immediate value by providing visibility into the team.

**Acceptance Scenarios**:

1. **Given** Maria has 15 staff members in her system
   **When** she navigates to /dashboard/staff
   **Then** she sees all staff members displayed in a grid layout with name, specialization, and status

2. **Given** Maria is viewing the staff list
   **When** she types "Sarah" in the search box
   **Then** the list filters to show only staff members with "Sarah" in their name

3. **Given** Maria wants to see only active hairstylists
   **When** she selects "Hairstylist" from specialization filter and toggles "Active Only"
   **Then** the list shows only active staff members with hairstylist specialization

4. **Given** Maria has 50 staff members (pagination scenario)
   **When** she views the staff list
   **Then** she sees 20 staff members per page with pagination controls at the bottom

5. **Given** Maria has no staff members yet
   **When** she navigates to /dashboard/staff
   **Then** she sees an empty state message "No staff members yet. Add your first master!" with an "Add Staff" button

---

### User Story 2 - Add New Staff Member (Priority: P1)

**Scenario**: Maria hired a new manicurist named Anna and needs to add her to the system with working hours.

**Why this priority**: Cannot operate without adding staff - this is essential for system setup.

**Independent Test**: Click "Add New Staff", fill out form, submit, and verify staff member appears in the list. This can be tested completely independently and delivers immediate business value.

**Acceptance Scenarios**:

1. **Given** Maria clicks "Add New Staff" button
   **When** the page loads
   **Then** she sees a form with fields for name, phone, email, specialization, and working hours

2. **Given** Maria fills out the form with:
   - Name: "Anna Petrova"
   - Phone: "+79991234567"
   - Email: "anna@example.com"
   - Specialization: "Nail Technician"
   - Working hours: Mon-Fri 9:00-18:00
   **When** she clicks "Save"
   **Then** Anna is created in the system, a success toast appears "Staff member created!", and Maria is redirected to /dashboard/staff

3. **Given** Maria tries to create a staff member without a name
   **When** she clicks "Save"
   **Then** she sees a validation error "Name is required" and the form is not submitted

4. **Given** Maria enters an invalid email address "not-an-email"
   **When** she leaves the email field
   **Then** she sees validation error "Invalid email address"

5. **Given** Maria is filling out the form but changes her mind
   **When** she clicks "Cancel"
   **Then** she is redirected back to /dashboard/staff without saving

---

### User Story 3 - View Staff Details and Performance (Priority: P2)

**Scenario**: Maria wants to see detailed information about Sarah's schedule, upcoming bookings, and performance statistics.

**Why this priority**: While important for management insights, this is not blocking for basic operations. Salon can function with just list and create capabilities.

**Independent Test**: Click on any staff card to view their detailed page showing schedule, bookings, and stats. Delivers value by providing operational insights.

**Acceptance Scenarios**:

1. **Given** Maria clicks on Sarah's staff card
   **When** the details page loads
   **Then** she sees Sarah's full information including name, contact details, specializations, weekly schedule, and performance statistics

2. **Given** Maria is viewing Sarah's details page
   **When** the page loads
   **Then** she sees upcoming bookings section showing next 5 appointments with Sarah

3. **Given** Maria views performance statistics
   **When** the page loads
   **Then** she sees total bookings count, total revenue generated, and average rating (if available)

4. **Given** Maria wants to make changes
   **When** she clicks "Edit" button
   **Then** she is navigated to /dashboard/staff/[id]/edit

5. **Given** Maria wants to deactivate Sarah temporarily
   **When** she clicks the "Deactivate" toggle and confirms
   **Then** Sarah's status changes to inactive and she no longer appears in active bookings

---

### User Story 4 - Edit Staff Information (Priority: P2)

**Scenario**: Sarah changed her phone number and now works Saturdays - Maria needs to update her profile.

**Why this priority**: Staff information changes regularly, but this is not blocking for initial setup. Can be done later if time-constrained.

**Independent Test**: Navigate to staff details, click edit, change information, save, and verify updates appear in system.

**Acceptance Scenarios**:

1. **Given** Maria navigates to Sarah's edit page
   **When** the page loads
   **Then** she sees the form pre-filled with Sarah's current information

2. **Given** Maria updates Sarah's phone number from "+79991111111" to "+79992222222"
   **When** she clicks "Save"
   **Then** the phone number is updated, a success toast appears "Staff updated!", and she's redirected to Sarah's details page

3. **Given** Maria adds Saturday to Sarah's working days
   **When** she checks the "Saturday" checkbox and sets hours 10:00-16:00
   **Then** Sarah's schedule is updated to include Saturdays

4. **Given** Maria makes changes but changes her mind
   **When** she clicks "Cancel"
   **Then** she's returned to the details page and no changes are saved

---

### User Story 5 - View and Search Services (Priority: P1)

**Scenario**: Maria needs to review her service catalog and find the pricing for women's haircut.

**Why this priority**: Foundation for service management - must see services before managing them.

**Independent Test**: Navigate to /dashboard/services and verify all services display with search and category filters working.

**Acceptance Scenarios**:

1. **Given** Maria has 30 services in her catalog
   **When** she navigates to /dashboard/services
   **Then** she sees all services in a grid layout showing name, category, price, and duration

2. **Given** Maria wants to find haircut services
   **When** she types "haircut" in the search box
   **Then** only services with "haircut" in the name are displayed

3. **Given** Maria wants to see all manicure services
   **When** she selects "MANICURE" from the category dropdown
   **Then** only services in the manicure category are shown

4. **Given** Maria wants to sort by price
   **When** she selects "Price" from the sort dropdown
   **Then** services are displayed in ascending price order

5. **Given** Maria sees category statistics bar at the top
   **When** the page loads
   **Then** she sees "Haircut (8) | Coloring (5) | Manicure (6)..." showing counts per category

---

### User Story 6 - Add New Service (Priority: P1)

**Scenario**: Maria added a new service "Gel Polish Removal" and needs to add it to the catalog.

**Why this priority**: Cannot offer services to customers without adding them to the system. Essential for business operations.

**Independent Test**: Click "Add New Service", fill form, submit, verify service appears in catalog.

**Acceptance Scenarios**:

1. **Given** Maria clicks "Add New Service"
   **When** the page loads
   **Then** she sees a form with fields for name, category, description, duration, and price

2. **Given** Maria fills out:
   - Name: "Gel Polish Removal"
   - Category: "MANICURE"
   - Duration: 30 minutes
   - Price: $15
   **When** she clicks "Save"
   **Then** the service is created, toast shows "Service created!", and she's redirected to /dashboard/services

3. **Given** Maria sees a preview card on the right side of the form
   **When** she types information into the form
   **Then** the preview updates in real-time showing how the service will look

4. **Given** Maria enters duration of 500 minutes (invalid)
   **When** she tries to save
   **Then** she sees validation error "Duration must be between 5 and 480 minutes"

5. **Given** Maria enters a negative price
   **When** she tries to save
   **Then** she sees validation error "Price must be greater than 0"

---

### User Story 7 - View Service Details and Analytics (Priority: P2)

**Scenario**: Maria wants to analyze how popular "Women's Haircut" is and how much revenue it generates.

**Why this priority**: Analytics are valuable but not blocking for core operations. Can be implemented after basic CRUD.

**Independent Test**: Click on any service card to view detailed page with booking statistics and revenue data.

**Acceptance Scenarios**:

1. **Given** Maria clicks on "Women's Haircut" service card
   **When** the details page loads
   **Then** she sees complete service information including description, pricing, duration, and category

2. **Given** Maria views booking statistics section
   **When** the page loads
   **Then** she sees total bookings count, total revenue, and average booking frequency

3. **Given** Maria views recent bookings section
   **When** the page loads
   **Then** she sees last 10 bookings that used this service with customer names and dates

4. **Given** Maria wants to edit the service
   **When** she clicks "Edit" button
   **Then** she's navigated to /dashboard/services/[id]/edit

---

### User Story 8 - Edit Service Information (Priority: P2)

**Scenario**: Maria increased the price of "Women's Haircut" from $40 to $45 and wants to update it.

**Why this priority**: Prices and details change, but not frequently enough to be P1. Can wait if timeline is tight.

**Independent Test**: Navigate to service details, click edit, change price, save, verify new price displays.

**Acceptance Scenarios**:

1. **Given** Maria navigates to "Women's Haircut" edit page
   **When** the page loads
   **Then** the form is pre-filled with current service data including $40 price

2. **Given** Maria changes price from $40 to $45
   **When** she clicks "Save"
   **Then** the price is updated, toast shows "Service updated!", and she's redirected to service details page

3. **Given** Maria changes the service duration from 45 to 60 minutes
   **When** she saves the changes
   **Then** future bookings will calculate end time based on 60 minutes (existing bookings unaffected)

4. **Given** Maria clicks "Deactivate" toggle
   **When** she confirms the action
   **Then** the service becomes inactive and won't appear in booking dropdowns, but past bookings remain visible

---

### Edge Cases

- **What happens when** a staff member is deleted but has future bookings?
  → Bookings remain intact with master_id set to NULL, master name preserved in booking data

- **What happens when** a service is deactivated but is in upcoming bookings?
  → Existing bookings remain, service just can't be selected for new bookings

- **What happens when** user creates 100+ staff members and pagination fails?
  → Graceful error handling with error boundary, fallback to showing first 20 with manual retry

- **What happens when** user tries to add staff member with duplicate email?
  → Backend returns 409 Conflict, frontend shows "Email already exists" error

- **What happens when** network request fails during form submission?
  → Form shows error message, data is preserved, user can retry without re-entering

- **What happens when** user navigates away from form with unsaved changes?
  → Browser shows "You have unsaved changes" confirmation dialog (if implemented)

- **What happens when** staff member has no working hours set?
  → Working hours display shows "Not configured" and availability checks return no slots

- **What happens when** service price is $0?
  → Allowed for free services, displays as "Free" in UI

---

## Requirements *(mandatory)*

### Functional Requirements

**Staff Management**:

- **FR-001**: System MUST display all staff members in a paginated grid layout (20 per page)
- **FR-002**: System MUST allow searching staff by name with debounced input (300ms delay)
- **FR-003**: System MUST allow filtering staff by specialization (dropdown) and active status (toggle)
- **FR-004**: Users MUST be able to create new staff members with name, phone, email, specialization, and working hours
- **FR-005**: System MUST validate required fields (name) and format fields (email, phone) before submission
- **FR-006**: Users MUST be able to view staff details including schedule, upcoming bookings, and performance statistics
- **FR-007**: Users MUST be able to edit staff information and update working hours
- **FR-008**: Users MUST be able to deactivate/activate staff members with confirmation dialog
- **FR-009**: System MUST show loading skeletons while fetching data
- **FR-010**: System MUST show appropriate empty states when no staff exist

**Services Management**:

- **FR-011**: System MUST display all services in a grid layout with pagination (24 per page)
- **FR-012**: System MUST allow searching services by name with debounced input
- **FR-013**: System MUST allow filtering services by category (12 categories) and active status
- **FR-014**: System MUST allow sorting services by name, price, duration, or category
- **FR-015**: Users MUST be able to create new services with name, category, description, duration, and price
- **FR-016**: System MUST validate duration (5-480 minutes) and price (≥0) before submission
- **FR-017**: System MUST show real-time preview of service card while creating/editing
- **FR-018**: Users MUST be able to view service details including booking statistics and revenue data
- **FR-019**: Users MUST be able to edit service information including price and duration
- **FR-020**: System MUST convert prices between dollars (display) and cents (storage) automatically
- **FR-021**: System MUST show category statistics bar with counts per category

**Navigation**:

- **FR-022**: Dashboard sidebar MUST include "Staff" link pointing to /dashboard/staff
- **FR-023**: Dashboard sidebar MUST include "Services" link pointing to /dashboard/services
- **FR-024**: All navigation MUST use Next.js Link component for client-side routing
- **FR-025**: Breadcrumbs MUST show current location (e.g., "Dashboard > Staff > Edit")

**Form Behavior**:

- **FR-026**: Forms MUST use React Hook Form for validation and state management
- **FR-027**: Forms MUST show field-level validation errors immediately on blur
- **FR-028**: Forms MUST prevent submission while validation errors exist
- **FR-029**: Forms MUST show success toast on successful submission
- **FR-030**: Forms MUST preserve data and show error toast on failed submission

**Accessibility**:

- **FR-031**: All interactive elements MUST have keyboard navigation support
- **FR-032**: All form inputs MUST have associated labels with proper ARIA attributes
- **FR-033**: All buttons MUST have descriptive ARIA labels
- **FR-034**: Color-coded elements MUST not rely solely on color (include icons/text)
- **FR-035**: Focus indicators MUST be clearly visible on all interactive elements

**Responsive Design**:

- **FR-036**: All pages MUST be fully functional on mobile (375px width)
- **FR-037**: Grid layouts MUST stack to single column on mobile
- **FR-038**: Forms MUST remain usable on mobile devices
- **FR-039**: Tables MUST scroll horizontally on mobile or convert to cards

### Key Entities

**StaffCard Component** (already exists):
- Displays staff member in card format
- Shows name, specialization, phone, email, active status
- Includes action buttons (view, edit, deactivate)

**ServiceCard Component** (already exists):
- Displays service in card format
- Shows name, category badge, price, duration badge
- Includes action buttons (view, edit, deactivate)

**StaffForm Component** (already exists):
- Reusable form for create/edit staff
- Handles working hours configuration
- Validates all inputs

**ServiceForm Component** (already exists):
- Reusable form for create/edit service
- Real-time preview of service card
- Price conversion (dollars ↔ cents)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Salon owner can add all staff members (5-10 typical) in under 10 minutes
- **SC-002**: Salon owner can create complete service catalog (20-30 services) in under 15 minutes
- **SC-003**: All pages load in under 2 seconds on standard broadband connection
- **SC-004**: Forms validate correctly with 100% accuracy (no false positives/negatives)
- **SC-005**: 90% of users successfully complete staff/service creation on first attempt without errors
- **SC-006**: Mobile experience is rated 4/5 or higher by users (usable on phone)
- **SC-007**: Search and filter reduce visible items to relevant results in under 500ms
- **SC-008**: Zero console errors or warnings in browser developer tools
- **SC-009**: TypeScript compiles without errors or warnings
- **SC-010**: All pages pass WCAG 2.1 AA accessibility standards (tested with Lighthouse)

### Performance Metrics

- **PM-001**: First Contentful Paint (FCP) < 1.5s
- **PM-002**: Time to Interactive (TTI) < 3s
- **PM-003**: Cumulative Layout Shift (CLS) < 0.1
- **PM-004**: Form submission completes in < 1s (excluding network)

### Quality Metrics

- **QM-001**: Code follows existing patterns from bookings module (consistency)
- **QM-002**: All components are properly typed with TypeScript (no `any` types)
- **QM-003**: All React Query hooks use proper cache invalidation strategies
- **QM-004**: All error states are handled gracefully with user-friendly messages

---

## Technical Architecture

### Page Structure

```
Frontend/src/app/(dashboard)/dashboard/
├── staff/
│   ├── page.tsx                    # Staff list (FR-001 to FR-010)
│   ├── new/
│   │   └── page.tsx                # Create staff (FR-004, FR-005)
│   └── [id]/
│       ├── page.tsx                # Staff details (FR-006)
│       └── edit/
│           └── page.tsx            # Edit staff (FR-007, FR-008)
│
└── services/
    ├── page.tsx                    # Services list (FR-011 to FR-014, FR-021)
    ├── new/
    │   └── page.tsx                # Create service (FR-015 to FR-017)
    └── [id]/
        ├── page.tsx                # Service details (FR-018)
        └── edit/
            └── page.tsx            # Edit service (FR-019, FR-020)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                          │
│              (e.g., Navigate to /staff/new)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Page Component                   │
│                  (e.g., staff/new/page.tsx)                 │
│  - Renders StaffForm component                              │
│  - Provides form submission handler                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Reusable Form Component                    │
│                    (e.g., StaffForm)                        │
│  - React Hook Form validation                               │
│  - Field-level error display                                │
│  - Calls onSubmit prop when valid                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  React Query Mutation Hook                  │
│                  (e.g., useCreateStaff)                     │
│  - Calls API client                                         │
│  - Handles loading/error states                             │
│  - Invalidates query cache on success                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Client                           │
│              (Frontend/src/lib/api/client.ts)               │
│  - Makes HTTP request to backend                            │
│  - Injects JWT token                                        │
│  - Handles network errors                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Endpoint                     │
│                  (e.g., POST /api/masters)                  │
│  - Validates request                                        │
│  - Creates database record                                  │
│  - Returns staff object                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Success/Error Handling                     │
│  - Success: Show toast, invalidate cache, redirect         │
│  - Error: Show error message, preserve form data            │
└─────────────────────────────────────────────────────────────┘
```

### Component Reuse Strategy

All pages will reuse existing components:

**Already Implemented (100% complete)**:
- `StaffCard` - Display staff member
- `ServiceCard` - Display service
- `StaffForm` - Create/edit staff form
- `ServiceForm` - Create/edit service form
- `SpecializationBadge` - Color-coded specialization
- `CategoryBadge` - Color-coded service category
- `DurationBadge` - Duration display
- `PriceDisplay` - Formatted price

**From UI Library** (already exists):
- `Button` - All buttons
- `Input` - Text inputs
- `Select` - Dropdowns
- `Checkbox` - Checkboxes
- `Card` - Card containers
- `Badge` - Status badges
- `Modal` - Confirmation dialogs
- `Toast` - Success/error notifications
- `Skeleton` - Loading states

**New Components Needed** (if not in UI library):
- `PageHeader` - Reusable page title + action buttons
- `EmptyState` - Empty state with icon + message
- `SearchBar` - Debounced search input
- `FilterBar` - Filter dropdowns + active filters
- `Pagination` - Page navigation controls

---

## Implementation Details

### Staff List Page (/dashboard/staff/page.tsx)

**Priority**: P1
**Estimated Time**: 3-4 hours

**Key Features**:
- Grid of StaffCard components (3 columns desktop, 2 tablet, 1 mobile)
- Search bar (debounced 300ms)
- Filter by specialization (dropdown with all enum values)
- Filter by active status (toggle)
- "Add New Staff" button (top right)
- Pagination (20 per page)
- Loading: Skeleton grid
- Empty state: "No staff members yet. Add your first master!"

**React Query Hook**: `useStaff({ search, specialization, active, page })`

**Code Pattern**:
```typescript
'use client';

export default function StaffListPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ specialization: 'all', active: true });
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useStaff({
    search,
    ...filters,
    page,
    limit: 20
  });

  if (isLoading) return <SkeletonGrid count={20} />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (data.staff.length === 0) return <EmptyState />;

  return (
    <div>
      <PageHeader title="Staff Members" action={<Button href="/staff/new">Add Staff</Button>} />
      <FilterBar ... />
      <Grid>
        {data.staff.map(member => <StaffCard key={member.id} {...member} />)}
      </Grid>
      <Pagination ... />
    </div>
  );
}
```

---

### Create Staff Page (/dashboard/staff/new/page.tsx)

**Priority**: P1
**Estimated Time**: 2-3 hours

**Key Features**:
- StaffForm component with all fields
- React Hook Form validation
- Success toast on create
- Redirect to /staff on success
- Cancel button returns to /staff
- Loading state during submission

**React Query Hook**: `useCreateStaff()`

**Code Pattern**:
```typescript
'use client';

export default function CreateStaffPage() {
  const router = useRouter();
  const createStaff = useCreateStaff();

  const handleSubmit = async (data) => {
    try {
      await createStaff.mutateAsync(data);
      toast.success('Staff member created!');
      router.push('/dashboard/staff');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <PageHeader title="Add New Staff Member" />
      <StaffForm onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  );
}
```

---

### Staff Details Page (/dashboard/staff/[id]/page.tsx)

**Priority**: P2
**Estimated Time**: 4-5 hours

**Key Features**:
- Display full staff information
- Weekly schedule table (Mon-Sun with hours)
- Upcoming bookings section (next 5)
- Performance statistics (total bookings, revenue, rating)
- Edit button → navigate to /staff/[id]/edit
- Deactivate toggle with confirmation
- 404 error state if staff not found

**React Query Hooks**:
- `useStaffById(id)` - Main data
- `useStaffSchedule(id)` - Schedule with bookings
- `useStaffStats(id)` - Performance metrics

---

### Edit Staff Page (/dashboard/staff/[id]/edit/page.tsx)

**Priority**: P2
**Estimated Time**: 2-3 hours

**Key Features**:
- StaffForm pre-filled with current data
- Same validation as create page
- Success toast on update
- Redirect to /staff/[id] on success
- Cancel returns to /staff/[id]

**React Query Hooks**:
- `useStaffById(id)` - Load current data
- `useUpdateStaff(id)` - Mutation

---

### Services List Page (/dashboard/services/page.tsx)

**Priority**: P1
**Estimated Time**: 4-5 hours

**Key Features**:
- Grid of ServiceCard components (4 columns desktop, 2 tablet, 1 mobile)
- Search bar (debounced 300ms)
- Filter by category (dropdown with 12 categories)
- Filter by active status (toggle)
- Sort by: Name, Price, Duration, Category
- Category statistics bar (e.g., "Haircut (8) | Coloring (5)")
- "Add New Service" button
- Pagination (24 per page)
- Loading: Skeleton grid
- Empty state: "No services yet. Create your first service!"

**React Query Hook**: `useServices({ search, category, active, sortBy, page })`

---

### Create Service Page (/dashboard/services/new/page.tsx)

**Priority**: P1
**Estimated Time**: 3-4 hours

**Key Features**:
- ServiceForm component with all fields
- Real-time preview card (shows how service will look)
- Price input in dollars (converts to cents for API)
- Duration validation (5-480 minutes)
- Success toast on create
- Redirect to /services on success

**React Query Hook**: `useCreateService()`

---

### Service Details Page (/dashboard/services/[id]/page.tsx)

**Priority**: P2
**Estimated Time**: 4-5 hours

**Key Features**:
- Full service information display
- Category icon/image placeholder
- Booking statistics:
  - Total bookings
  - Total revenue
  - Average frequency
  - Most booked time slots
- Recent bookings section (last 10)
- Edit button
- Deactivate toggle with confirmation
- Warning message: "Deactivating won't affect past bookings"

**React Query Hooks**:
- `useServiceById(id)` - Main data
- `useServiceStats(id)` - Statistics

---

### Edit Service Page (/dashboard/services/[id]/edit/page.tsx)

**Priority**: P2
**Estimated Time**: 2-3 hours

**Key Features**:
- ServiceForm pre-filled with current data
- Price shown in dollars (stored as cents)
- Same validation as create page
- Success toast on update
- Redirect to /services/[id] on success

**React Query Hooks**:
- `useServiceById(id)` - Load current data
- `useUpdateService(id)` - Mutation

---

## Testing Requirements

### Manual Testing Checklist

**Staff Management**:
- [ ] Navigate to /dashboard/staff and verify all staff display
- [ ] Search for staff member by name - results filter correctly
- [ ] Filter by specialization - only matching staff show
- [ ] Toggle active/inactive filter - list updates
- [ ] Click "Add New Staff" - navigate to create page
- [ ] Create new staff with all required fields - success
- [ ] Try to create staff without name - validation error shown
- [ ] Click on staff card - navigate to details page
- [ ] View staff schedule and upcoming bookings
- [ ] Click Edit - navigate to edit page
- [ ] Update staff information - changes save
- [ ] Deactivate staff - confirmation modal appears
- [ ] Cancel deactivation - no changes made
- [ ] Pagination works with 20+ staff members

**Services Management**:
- [ ] Navigate to /dashboard/services and verify all services display
- [ ] Search for service by name - results filter correctly
- [ ] Filter by category - only matching services show
- [ ] Sort by price - services reorder correctly
- [ ] View category statistics bar - counts accurate
- [ ] Click "Add New Service" - navigate to create page
- [ ] Create new service - preview updates in real-time
- [ ] Enter invalid price ($-10) - validation error shown
- [ ] Enter invalid duration (500 min) - validation error shown
- [ ] Create service successfully - appears in list
- [ ] Click on service card - navigate to details page
- [ ] View service statistics and recent bookings
- [ ] Click Edit - navigate to edit page
- [ ] Update price from $40 to $45 - saves correctly
- [ ] Deactivate service - confirmation modal appears

**Mobile Testing** (375px width):
- [ ] All pages render correctly on mobile
- [ ] Grids stack to single column
- [ ] Forms remain usable and inputs accessible
- [ ] Navigation works on mobile
- [ ] Touch targets are large enough (44x44px minimum)

**Accessibility Testing**:
- [ ] All pages pass Lighthouse accessibility audit (score ≥90)
- [ ] Tab key navigates through all interactive elements
- [ ] Enter key submits forms
- [ ] Esc key closes modals
- [ ] Screen reader announces page changes
- [ ] All images have alt text
- [ ] All form inputs have labels

### Automated Testing (Optional but Recommended)

```typescript
// Example E2E test with Playwright
test('can create new staff member', async ({ page }) => {
  await page.goto('/dashboard/staff');
  await page.click('text=Add New Staff');

  await page.fill('input[name="name"]', 'Test Staff');
  await page.fill('input[name="phone"]', '+79991234567');
  await page.selectOption('select[name="specialization"]', 'HAIRSTYLIST');

  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Staff member created!')).toBeVisible();
  await expect(page).toHaveURL('/dashboard/staff');
  await expect(page.locator('text=Test Staff')).toBeVisible();
});
```

---

## Out of Scope

The following features are explicitly **not included** in this specification and should be deferred to future iterations:

### Not in Scope for V1:
- Bulk import/export (CSV, Excel)
- Staff photo/avatar upload
- Service image upload and gallery
- Advanced scheduling (vacations, time-off requests)
- Staff permissions and access control
- Commission calculations
- Payroll integration
- Staff performance reports (detailed analytics)
- Service packages/bundles
- Multi-location support (if staff works at multiple salons)
- Staff messaging/notifications
- Calendar view for staff schedules
- Drag-and-drop schedule editing
- Service categories customization (using fixed enum)

These can be added in future versions based on user feedback and business priorities.

---

## Dependencies

### Frontend Dependencies (Already Available):
- ✅ Next.js 14 App Router
- ✅ React 18
- ✅ React Query (Tanstack Query)
- ✅ React Hook Form
- ✅ Tailwind CSS
- ✅ TypeScript
- ✅ UI Component Library
- ✅ Zustand (auth state)
- ✅ Axios (API client)

### Backend Dependencies (Already Available):
- ✅ Staff API endpoints (`/api/masters/*`)
- ✅ Services API endpoints (`/api/services/*`)
- ✅ Authentication (JWT)
- ✅ Prisma database models

### Custom Hooks (Already Implemented):
- ✅ `useStaff()` and all staff hooks
- ✅ `useServices()` and all service hooks

### Components (Already Implemented):
- ✅ All card components
- ✅ All form components
- ✅ All badge components

### What's Missing (Needs Implementation):
- ❌ 8 page components (4 staff + 4 services)
- ❌ Sidebar navigation updates
- ❌ Shared components (PageHeader, EmptyState, SearchBar, FilterBar, Pagination) - only if not in UI library

---

## Acceptance Criteria Summary

This feature is considered **complete** when:

1. ✅ All 8 pages are implemented and accessible via routing
2. ✅ Salon owner can add 10 staff members in under 10 minutes
3. ✅ Salon owner can create 20 services in under 15 minutes
4. ✅ All pages load in under 2 seconds
5. ✅ All forms validate correctly with helpful error messages
6. ✅ Search and filters work with under 500ms response time
7. ✅ Mobile experience is fully functional on 375px width
8. ✅ Zero TypeScript errors or warnings
9. ✅ Zero console errors or warnings
10. ✅ All pages pass WCAG 2.1 AA accessibility standards
11. ✅ Pagination works correctly with 20+ items
12. ✅ Empty states display when no data exists
13. ✅ Error states display and allow retry
14. ✅ Success/error toasts appear for all mutations
15. ✅ Navigation between pages works correctly
16. ✅ Cancel buttons return to previous page
17. ✅ Confirmation modals appear for destructive actions
18. ✅ Data persists correctly after page refresh
19. ✅ All React Query cache invalidations work properly
20. ✅ Code follows existing patterns from bookings module

---

## Rollout Plan

### Phase 1: Core Pages (Priority P1) - Day 1-2

**Day 1**:
- Implement Staff List page (`/staff/page.tsx`)
- Implement Create Staff page (`/staff/new/page.tsx`)
- Implement Services List page (`/services/page.tsx`)
- Test basic CRUD operations

**Day 2**:
- Implement Create Service page (`/services/new/page.tsx`)
- Add navigation links to sidebar
- Test complete user journey: Add staff → Add services → Verify in lists
- Fix any bugs discovered

**Deliverable**: MVP that allows adding and viewing staff/services

---

### Phase 2: Details & Edit Pages (Priority P2) - Day 3

**Day 3 Morning**:
- Implement Staff Details page (`/staff/[id]/page.tsx`)
- Implement Staff Edit page (`/staff/[id]/edit/page.tsx`)

**Day 3 Afternoon**:
- Implement Service Details page (`/services/[id]/page.tsx`)
- Implement Service Edit page (`/services/[id]/edit/page.tsx`)
- Polish UI/UX based on testing
- Fix any accessibility issues

**Deliverable**: Complete feature with full CRUD + details/analytics views

---

### Phase 3: Testing & Polish (Optional Day 4)

If time allows:
- Comprehensive testing on multiple devices
- Accessibility audit and fixes
- Performance optimization
- Code review and refactoring
- Documentation updates

---

## Risk Mitigation

### Risk 1: Existing Components Don't Match Requirements

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Review all existing components before starting (already done in this spec)
- Create wrapper components if existing ones need slight modifications
- Don't modify shared components unless absolutely necessary

### Risk 2: Backend API Incompatibility

**Likelihood**: Very Low (APIs already tested)
**Impact**: High

**Mitigation**:
- APIs are already fully functional and documented
- React Query hooks are already tested with backend
- If any issues found, adjust frontend to match backend (backend is correct)

### Risk 3: Performance Issues with Large Datasets

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Implement pagination from the start (20/24 per page)
- Use React Query caching to minimize API calls
- Use `useMemo` for expensive computations
- Implement virtual scrolling if needed (future enhancement)

### Risk 4: Mobile UX Challenges

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Test on mobile devices throughout development
- Use Tailwind responsive utilities from the start
- Simplify mobile layouts (stack grids, hide less important info)
- Prioritize touch targets ≥44x44px

### Risk 5: Accessibility Compliance

**Likelihood**: Medium
**Impact**: High (if discovered late)

**Mitigation**:
- Run Lighthouse audits after each page
- Test keyboard navigation during development
- Use semantic HTML elements
- Add ARIA labels proactively
- Test with screen reader if possible

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-25
**Author**: Product Specification Team
**Status**: Ready for Implementation

---

## Changelog

- **1.0.0** (2025-10-25): Initial specification created
  - 8 user stories with priorities
  - 39 functional requirements
  - 10 success criteria
  - Complete technical architecture
  - Implementation timeline (2-3 days)
  - Testing requirements
  - Risk mitigation strategies
