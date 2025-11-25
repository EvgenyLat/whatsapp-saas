# Tasks: Staff and Services Management Frontend Pages

**Input**: Design documents from `C:\whatsapp-saas-starter\specs\main\`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT requested in the feature specification. Focus is on rapid implementation of UI pages.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend project: `Frontend/src/`
- Tests: `Frontend/tests/` or `Frontend/src/**/__tests__/`
- This is a web application - adjusting paths accordingly

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and create shared components needed by multiple user stories

- [ ] T001 Verify Next.js 14 App Router configuration in Frontend/tsconfig.json and Frontend/next.config.js
- [ ] T002 Verify React Query configuration in Frontend/src/app/providers.tsx or similar
- [ ] T003 Verify existing UI component library accessibility in Frontend/src/components/ui/
- [ ] T004 [P] Create useDebouncedValue hook in Frontend/src/hooks/useDebouncedValue.ts for search functionality
- [ ] T005 [P] Create PageHeader shared component in Frontend/src/components/shared/PageHeader.tsx
- [ ] T006 [P] Create SearchBar shared component in Frontend/src/components/shared/SearchBar.tsx
- [ ] T007 [P] Create FilterBar shared component in Frontend/src/components/shared/FilterBar.tsx
- [ ] T008 [P] Create Pagination shared component in Frontend/src/components/shared/Pagination.tsx
- [ ] T009 [P] Create ErrorState shared component in Frontend/src/components/shared/ErrorState.tsx
- [ ] T010 [P] Create LoadingState shared component in Frontend/src/components/shared/LoadingState.tsx
- [ ] T011 Create barrel export file in Frontend/src/components/shared/index.ts

**Checkpoint**: Shared infrastructure ready - all user stories can now be implemented in parallel

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T012 Verify Staff API hooks exist in Frontend/src/hooks/api/useMasters.ts (useMasters, useCreateMaster, useUpdateMaster, useDeleteMaster)
- [ ] T013 Verify Services API hooks exist in Frontend/src/hooks/api/useServices.ts (useServices, useCreateService, useUpdateService, useDeleteService)
- [ ] T014 Verify StaffCard component exists in Frontend/src/components/features/staff/StaffCard.tsx or Frontend/src/components/staff/StaffCard.tsx
- [ ] T015 Verify ServiceCard component exists in Frontend/src/components/features/services/ServiceCard.tsx
- [ ] T016 Verify StaffForm component exists and is functional in Frontend/src/components/features/staff/StaffForm.tsx
- [ ] T017 Verify ServiceForm component exists and is functional in Frontend/src/components/features/services/ServiceForm.tsx
- [ ] T018 Verify TypeScript types for Staff (Master) exist in Frontend/src/types/models.ts
- [ ] T019 Verify TypeScript types for Service exist in Frontend/src/types/models.ts
- [ ] T020 Replace MOCK_SALON_ID constant with actual salon context/auth value (check Frontend/src/lib/auth/ or create context)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Search Staff Members (Priority: P1) 🎯 MVP

**Goal**: Enable salon owners to view all staff members with search and filter capabilities

**Independent Test**: Navigate to /dashboard/staff and verify all staff members display correctly with search and filter functionality working. Test with 0 staff (empty state), 15 staff (normal), and 50+ staff (pagination).

### Implementation for User Story 1

- [ ] T021 [P] [US1] Enhance staff list page in Frontend/src/app/(dashboard)/dashboard/staff/page.tsx with search, filters, and pagination
- [ ] T022 [P] [US1] Add debounced search state management using useDebouncedValue hook in staff list page
- [ ] T023 [P] [US1] Implement specialization filter using Select component in staff list page
- [ ] T024 [P] [US1] Implement status filter (active/inactive) using Select component in staff list page
- [ ] T025 [US1] Integrate SearchBar, FilterBar, and Pagination shared components into staff list page layout
- [ ] T026 [US1] Add EmptyState component display when staff list is empty with "Add Staff" button
- [ ] T027 [US1] Add LoadingState component display while fetching staff data
- [ ] T028 [US1] Add ErrorState component with retry button for API failures
- [ ] T029 [US1] Implement pagination state management with page number and limit (20 per page)
- [ ] T030 [US1] Add "Showing X to Y of Z" info text using pagination calculations
- [ ] T031 [US1] Update useMasters hook call with filter parameters (search, specialization, active, page, limit)
- [ ] T032 [US1] Add responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop) for StaffCard components
- [ ] T033 [US1] Implement filter reset to page 1 when search or filters change

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Staff list displays, search works, filters work, pagination works.

---

## Phase 4: User Story 2 - Add New Staff Member (Priority: P1) 🎯 MVP

**Goal**: Enable salon owners to add new staff members with full information including working hours

**Independent Test**: Click "Add New Staff", fill out form with name/phone/email/specialization/working hours, submit, and verify staff member appears in the list with success toast.

### Implementation for User Story 2

- [ ] T034 [P] [US2] Create staff creation page in Frontend/src/app/(dashboard)/dashboard/staff/new/page.tsx
- [ ] T035 [US2] Integrate StaffForm component into creation page with empty defaultValues
- [ ] T036 [US2] Implement form submission handler using useCreateMaster mutation hook
- [ ] T037 [US2] Add success feedback with Alert component showing "Staff member created!" message
- [ ] T038 [US2] Implement navigation to /dashboard/staff on successful creation using useRouter
- [ ] T039 [US2] Add error handling with Alert component for API errors during creation
- [ ] T040 [US2] Implement Cancel button navigation back to /dashboard/staff
- [ ] T041 [US2] Add PageHeader component with "Add New Staff Member" title
- [ ] T042 [US2] Verify form validation (required name, email format, phone format) is working via StaffForm
- [ ] T043 [US2] Test edge cases: duplicate email, missing required fields, invalid data

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Can list staff and add new staff members.

---

## Phase 5: User Story 5 - View and Search Services (Priority: P1) 🎯 MVP

**Goal**: Enable salon owners to view all services with search, category filter, and sorting capabilities

**Independent Test**: Navigate to /dashboard/services and verify all services display with search, category filter, sort, and pagination working. Verify category statistics bar shows counts.

### Implementation for User Story 5

- [ ] T044 [P] [US5] Enhance services list page in Frontend/src/app/(dashboard)/dashboard/services/page.tsx with all features (already partially implemented - verify completeness)
- [ ] T045 [P] [US5] Verify debounced search functionality exists and works correctly
- [ ] T046 [P] [US5] Verify category filter dropdown includes all 12 ServiceCategory options
- [ ] T047 [P] [US5] Verify status filter (active/inactive) works correctly
- [ ] T048 [US5] Implement sort dropdown with options: Name, Price, Duration, Category
- [ ] T049 [US5] Implement sort order toggle (ascending/descending) with icon indicator
- [ ] T050 [US5] Add category statistics bar at top showing "Haircut (X) | Coloring (Y)" with counts
- [ ] T051 [US5] Calculate category stats from services array using useMemo for performance
- [ ] T052 [US5] Add per-page limit selector (10, 20, 50, 100 options) with default 24
- [ ] T053 [US5] Integrate Pagination component with "Showing X to Y of Z" text
- [ ] T054 [US5] Add responsive grid layout (1 col mobile, 2 cols tablet, 4 cols desktop) for ServiceCard components
- [ ] T055 [US5] Verify EmptyState, LoadingState, and ErrorState components display correctly

**Checkpoint**: At this point, User Stories 1, 2, AND 5 should all work independently. Can manage both staff and services lists.

---

## Phase 6: User Story 6 - Add New Service (Priority: P1) 🎯 MVP

**Goal**: Enable salon owners to add new services to the catalog with all details

**Independent Test**: Click "Add New Service", fill form (name/category/duration/price), verify real-time preview, submit, verify service appears in catalog with success toast.

### Implementation for User Story 6

- [ ] T056 [P] [US6] Create service creation page in Frontend/src/app/(dashboard)/dashboard/services/new/page.tsx
- [ ] T057 [US6] Integrate ServiceForm component into creation page with empty defaultValues
- [ ] T058 [US6] Add real-time preview ServiceCard component on right side of form (2-column layout)
- [ ] T059 [US6] Implement form state synchronization so preview updates as user types
- [ ] T060 [US6] Implement form submission handler using useCreateService mutation hook
- [ ] T061 [US6] Add success feedback with Alert component showing "Service created!" message
- [ ] T062 [US6] Implement navigation to /dashboard/services on successful creation
- [ ] T063 [US6] Add error handling with Alert component for API errors
- [ ] T064 [US6] Implement Cancel button navigation back to /dashboard/services
- [ ] T065 [US6] Add PageHeader component with "Add New Service" title
- [ ] T066 [US6] Verify form validation (name min 3 chars, duration 5-480 min, price >= 0) works via ServiceForm
- [ ] T067 [US6] Test price conversion (dollars input → cents for API) is handled correctly by Zod schema

**Checkpoint**: At this point, all P1 User Stories (1, 2, 5, 6) are complete. MVP is fully functional - can manage both staff and services with full CRUD for creation and listing.

---

## Phase 7: User Story 3 - View Staff Details and Performance (Priority: P2)

**Goal**: Enable salon owners to view detailed information about individual staff members including schedule and statistics

**Independent Test**: Click on any staff card to view detailed page showing full information, weekly schedule, upcoming bookings (next 5), and performance stats (total bookings, revenue, rating).

### Implementation for User Story 3

- [ ] T068 [P] [US3] Create staff details page in Frontend/src/app/(dashboard)/dashboard/staff/[id]/page.tsx
- [ ] T069 [P] [US3] Extract staff ID from URL params and convert to number
- [ ] T070 [US3] Fetch staff data using useMasterById(staffId) hook
- [ ] T071 [US3] Fetch upcoming bookings using useBookings(salonId, { master_id: staffId, limit: 5, sort: 'start_ts' })
- [ ] T072 [US3] Fetch or calculate staff statistics (total bookings, revenue, rating) - check if useMasterStats hook exists
- [ ] T073 [US3] Display full staff information section (name, contact, specializations, working hours)
- [ ] T074 [US3] Create WorkingHoursDisplay component to show weekly schedule table in Frontend/src/components/shared/WorkingHoursDisplay.tsx
- [ ] T075 [US3] Display specialization badges using SpecializationBadge component
- [ ] T076 [US3] Display upcoming bookings section with list of next 5 appointments
- [ ] T077 [US3] Display performance statistics section with StatsCard components
- [ ] T078 [US3] Add "Edit" button that navigates to /dashboard/staff/[id]/edit
- [ ] T079 [US3] Implement "Deactivate" toggle with confirmation dialog (use window.confirm for MVP)
- [ ] T080 [US3] Add useUpdateMaster mutation to handle status toggle
- [ ] T081 [US3] Add LoadingState for data fetching
- [ ] T082 [US3] Add ErrorState with 404 message if staff not found
- [ ] T083 [US3] Add BackButton component linking to /dashboard/staff
- [ ] T084 [US3] Add responsive layout (stacked on mobile, 2-column on desktop)

**Checkpoint**: At this point, User Stories 1, 2, 3, 5, 6 are complete. Can view staff details with analytics.

---

## Phase 8: User Story 4 - Edit Staff Information (Priority: P2)

**Goal**: Enable salon owners to update existing staff member information

**Independent Test**: Navigate to staff details, click "Edit", modify phone number and working hours, save, verify changes appear in details page with success toast.

### Implementation for User Story 4

- [ ] T085 [P] [US4] Create staff edit page in Frontend/src/app/(dashboard)/dashboard/staff/[id]/edit/page.tsx
- [ ] T086 [US4] Extract staff ID from URL params
- [ ] T087 [US4] Fetch current staff data using useMasterById(staffId) hook
- [ ] T088 [US4] Pass current data as defaultValues to StaffForm component
- [ ] T089 [US4] Implement form submission handler using useUpdateMaster(staffId) mutation
- [ ] T090 [US4] Add success feedback with Alert showing "Staff updated!" message
- [ ] T091 [US4] Implement navigation to /dashboard/staff/[id] on success (back to details page)
- [ ] T092 [US4] Add error handling with Alert for API errors
- [ ] T093 [US4] Implement Cancel button navigation to /dashboard/staff/[id]
- [ ] T094 [US4] Add PageHeader with "Edit Staff Member" title and staff name
- [ ] T095 [US4] Add LoadingState while fetching current data
- [ ] T096 [US4] Verify form validation works for updates (same rules as creation)
- [ ] T097 [US4] Test edge case: form with no changes should still save successfully

**Checkpoint**: At this point, User Stories 1-4 (all staff-related) are complete. Staff management is fully functional.

---

## Phase 9: User Story 7 - View Service Details and Analytics (Priority: P2)

**Goal**: Enable salon owners to view detailed service information including booking statistics and revenue analytics

**Independent Test**: Click on any service card to view detailed page showing full info, booking statistics (total bookings, revenue, frequency), and recent 10 bookings.

### Implementation for User Story 7

- [ ] T098 [P] [US7] Create service details page in Frontend/src/app/(dashboard)/dashboard/services/[id]/page.tsx
- [ ] T099 [P] [US7] Extract service ID from URL params and convert to number
- [ ] T100 [US7] Fetch service data using useServiceById(serviceId) hook
- [ ] T101 [US7] Fetch recent bookings using useBookings(salonId, { service_id: serviceId, limit: 10, sort: '-created_at' })
- [ ] T102 [US7] Fetch or calculate service statistics - check if useServiceStats hook exists, otherwise calculate client-side
- [ ] T103 [US7] Display full service information section (name, category badge, description, price, duration)
- [ ] T104 [US7] Add category icon/image placeholder section
- [ ] T105 [US7] Display booking statistics section with StatsCard components (total bookings, revenue, frequency)
- [ ] T106 [US7] Calculate and display most popular time slots if data available
- [ ] T107 [US7] Display recent bookings section with list of last 10 bookings (customer names, dates)
- [ ] T108 [US7] Add "Edit" button navigating to /dashboard/services/[id]/edit
- [ ] T109 [US7] Implement "Deactivate" toggle with confirmation (use window.confirm)
- [ ] T110 [US7] Add useToggleServiceStatus or useUpdateService mutation for status toggle
- [ ] T111 [US7] Add warning message: "Deactivating won't affect past bookings"
- [ ] T112 [US7] Add LoadingState for data fetching
- [ ] T113 [US7] Add ErrorState with 404 if service not found
- [ ] T114 [US7] Add BackButton to /dashboard/services
- [ ] T115 [US7] Format price display using PriceDisplay component (cents → dollars)
- [ ] T116 [US7] Format duration using DurationBadge component

**Checkpoint**: At this point, User Stories 1-7 are complete. Can view service details with analytics.

---

## Phase 10: User Story 8 - Edit Service Information (Priority: P2)

**Goal**: Enable salon owners to update existing service information including pricing and duration

**Independent Test**: Navigate to service details, click "Edit", change price from $40 to $45 and duration from 45 to 60 minutes, save, verify updates appear with success toast.

### Implementation for User Story 8

- [ ] T117 [P] [US8] Create service edit page in Frontend/src/app/(dashboard)/dashboard/services/[id]/edit/page.tsx
- [ ] T118 [US8] Extract service ID from URL params
- [ ] T119 [US8] Fetch current service data using useServiceById(serviceId) hook
- [ ] T120 [US8] Convert price from cents to dollars for form display (divide by 100)
- [ ] T121 [US8] Pass converted data as defaultValues to ServiceForm component
- [ ] T122 [US8] Implement form submission handler using useUpdateService(serviceId) mutation
- [ ] T123 [US8] Ensure price conversion from dollars to cents happens in form submission (via Zod schema)
- [ ] T124 [US8] Add success feedback with Alert showing "Service updated!" message
- [ ] T125 [US8] Implement navigation to /dashboard/services/[id] on success
- [ ] T126 [US8] Add error handling with Alert for API errors
- [ ] T127 [US8] Implement Cancel button navigation to /dashboard/services/[id]
- [ ] T128 [US8] Add PageHeader with "Edit Service" title and service name
- [ ] T129 [US8] Add LoadingState while fetching current data
- [ ] T130 [US8] Verify form validation works for updates
- [ ] T131 [US8] Add note explaining that price changes only affect future bookings

**Checkpoint**: At this point, ALL User Stories (1-8) are complete. Full feature is functional with complete CRUD for both staff and services.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

- [ ] T132 [P] Update dashboard sidebar navigation in Frontend/src/components/layout/Sidebar.tsx to include "Staff" and "Services" links
- [ ] T133 [P] Add Breadcrumbs component to all detail and edit pages for better navigation
- [ ] T134 [P] Replace window.confirm with ConfirmDialog modal component for better UX (create in Frontend/src/components/shared/ConfirmDialog.tsx)
- [ ] T135 [P] Implement browser "unsaved changes" warning for forms using beforeunload event
- [ ] T136 [P] Add proper meta tags and page titles to all pages using Next.js Head/metadata
- [ ] T137 [P] Verify all pages are mobile responsive (test at 375px, 768px, 1024px widths)
- [ ] T138 [P] Run Lighthouse accessibility audit on all pages and fix issues (target score ≥90)
- [ ] T139 [P] Add keyboard navigation support (tab order, enter to submit, esc to cancel)
- [ ] T140 [P] Verify all ARIA labels are present on interactive elements
- [ ] T141 Conduct code review focusing on TypeScript strict mode compliance (no `any` types)
- [ ] T142 Run TypeScript compiler and fix any errors (npm run type-check)
- [ ] T143 Test all edge cases from spec.md (duplicate email, pagination with 100+ items, network failures, etc.)
- [ ] T144 Verify error messages are user-friendly and actionable
- [ ] T145 Test complete user journey from quickstart.md (add 5 staff, add 15 services, verify list/search/filter)
- [ ] T146 Performance optimization: Add React.memo to StaffCard and ServiceCard if needed
- [ ] T147 Performance optimization: Verify useMemo is used for expensive calculations (pagination, category stats)
- [ ] T148 [P] Update README.md with new page routes and features
- [ ] T149 [P] Create or update Frontend documentation explaining the new pages
- [ ] T150 Run final smoke test: Create, view, edit, delete for both staff and services

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
  - Creates shared components needed by multiple user stories

- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - Verifies all existing infrastructure (hooks, components, types)
  - Must resolve MOCK_SALON_ID before user stories can work

- **User Stories (Phases 3-10)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if multiple developers available)
  - Or sequentially in priority order:
    - **P1 Stories** (MVP): US1, US2, US5, US6 - Core list and create functionality
    - **P2 Stories**: US3, US4, US7, US8 - Details and edit functionality

- **Polish (Phase 11)**: Depends on all implemented user stories being complete

### User Story Dependencies

**P1 Stories (MVP - All Independent)**:
- **User Story 1 (View Staff)**: No dependencies on other stories ✅
- **User Story 2 (Add Staff)**: No dependencies on other stories ✅
- **User Story 5 (View Services)**: No dependencies on other stories ✅
- **User Story 6 (Add Services)**: No dependencies on other stories ✅

**P2 Stories (All Independent)**:
- **User Story 3 (Staff Details)**: Depends on US1 (need staff to view details)
- **User Story 4 (Edit Staff)**: Depends on US1 and US3 (need staff and details page)
- **User Story 7 (Service Details)**: Depends on US5 (need services to view details)
- **User Story 8 (Edit Service)**: Depends on US5 and US7 (need services and details page)

**Recommended Order**:
1. MVP: US1 + US2 (Staff management)
2. MVP: US5 + US6 (Services management)
3. Enhancement: US3 + US4 (Staff details/edit)
4. Enhancement: US7 + US8 (Service details/edit)

### Within Each User Story

Tasks within a story are generally sequential except where marked [P]:
- Shared component creation tasks can run in parallel
- Page setup tasks depend on components existing
- Integration tasks depend on individual pieces being complete

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T004-T010 marked [P] can run in parallel (different component files)

**Phase 2 (Foundational)**: All verification tasks can run in parallel - they're read-only checks

**Between User Stories**:
- US1 (View Staff) + US5 (View Services) can be developed in parallel
- US2 (Add Staff) + US6 (Add Services) can be developed in parallel
- US3 (Staff Details) + US7 (Service Details) can be developed in parallel
- US4 (Edit Staff) + US8 (Edit Service) can be developed in parallel

**Phase 11 (Polish)**: Most tasks marked [P] can run in parallel (different concerns)

---

## Parallel Example: P1 User Stories (MVP)

If you have 2 developers available after Foundational phase:

```bash
# Developer A: Staff Management
# Launch User Story 1 tasks
Task T021-T033: Enhance staff list page with all features

# Then User Story 2 tasks
Task T034-T043: Create staff creation page

# Developer B: Services Management
# Launch User Story 5 tasks
Task T044-T055: Enhance services list page with all features

# Then User Story 6 tasks
Task T056-T067: Create service creation page

# Result: MVP complete in parallel, ~half the time
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

**Day 1**:
1. Complete Phase 1: Setup (shared components) - 2-3 hours
2. Complete Phase 2: Foundational (verify infrastructure) - 1 hour
3. Start Phase 3: User Story 1 (View Staff) - 2-3 hours
4. Start Phase 4: User Story 2 (Add Staff) - 2 hours

**Day 2**:
5. Complete Phase 5: User Story 5 (View Services) - 2-3 hours
6. Complete Phase 6: User Story 6 (Add Services) - 2-3 hours
7. **STOP and VALIDATE**: Test all P1 stories independently
8. Fix any bugs discovered

**Checkpoint**: MVP is now functional with staff and services list/create capabilities

### Incremental Delivery (Full Feature)

**Day 3** (Optional - P2 Stories):
9. Complete Phase 7: User Story 3 (Staff Details) - 3 hours
10. Complete Phase 8: User Story 4 (Edit Staff) - 2 hours
11. Complete Phase 9: User Story 7 (Service Details) - 3 hours
12. Complete Phase 10: User Story 8 (Edit Service) - 2 hours

**Day 4** (Optional - Polish):
13. Complete Phase 11: Polish & Cross-Cutting Concerns - half day
14. Final testing and validation - half day

### Parallel Team Strategy (2 Developers)

With multiple developers after Foundational phase completes:

**Developer A: Staff Features**
- Day 1-2: US1 + US2 (P1 staff list and create)
- Day 3: US3 + US4 (P2 staff details and edit)

**Developer B: Services Features**
- Day 1-2: US5 + US6 (P1 services list and create)
- Day 3: US7 + US8 (P2 service details and edit)

**Both Together**:
- Day 4: Phase 11 (Polish) - pair on cross-cutting concerns

**Result**: Full feature complete in 4 days vs 4-5 days solo

---

## Task Summary

**Total Tasks**: 150
- **Setup**: 11 tasks (T001-T011)
- **Foundational**: 9 tasks (T012-T020)
- **User Story 1 (P1)**: 13 tasks (T021-T033)
- **User Story 2 (P1)**: 10 tasks (T034-T043)
- **User Story 5 (P1)**: 12 tasks (T044-T055)
- **User Story 6 (P1)**: 12 tasks (T056-T067)
- **User Story 3 (P2)**: 17 tasks (T068-T084)
- **User Story 4 (P2)**: 13 tasks (T085-T097)
- **User Story 7 (P2)**: 19 tasks (T098-T116)
- **User Story 8 (P2)**: 15 tasks (T117-T131)
- **Polish**: 19 tasks (T132-T150)

**MVP Scope** (P1 only): 57 tasks (Setup + Foundational + US1 + US2 + US5 + US6)
**Full Feature**: 150 tasks

**Parallel Tasks**: 40+ tasks marked [P] can run in parallel
**Independent Stories**: All 8 user stories are independently testable

**Estimated Effort**:
- MVP (P1): 2-3 days (1 developer) or 1.5 days (2 developers)
- Full Feature: 4-5 days (1 developer) or 3 days (2 developers)

---

## Validation Checklist

Before marking the feature complete, verify:

- [ ] All 8 user stories pass their independent tests from spec.md
- [ ] TypeScript compiles with zero errors (npm run type-check)
- [ ] No console errors or warnings in browser
- [ ] All pages load in <2 seconds
- [ ] Mobile responsive on 375px, 768px, 1024px widths
- [ ] Lighthouse accessibility score ≥90 on all pages
- [ ] Can complete quickstart.md user journey end-to-end
- [ ] All edge cases from spec.md handled gracefully
- [ ] Search debouncing works (300ms delay)
- [ ] Pagination works with 0, 15, 50, 100+ items
- [ ] All forms validate correctly
- [ ] Success/error feedback appears for all mutations
- [ ] Navigation works correctly between all pages
- [ ] Deactivate/delete confirmations work
- [ ] Price conversion (dollars ↔ cents) works correctly
- [ ] Working hours display correctly
- [ ] Empty states, loading states, error states all display
- [ ] No `any` types in codebase
- [ ] All [P] tasks truly have no dependencies

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work within same phase
- [Story] label (US1-US8) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group of [P] tasks
- Stop at any checkpoint to validate story independently
- Focus on MVP first (P1 stories) before adding P2 enhancements
- Verify existing components work before creating new ones
- Use window.confirm() for MVP, replace with ConfirmDialog in Polish phase
- All paths are absolute starting from repository root
- Test on multiple screen sizes throughout development
- Keep TypeScript strict mode enabled, no `any` types allowed

**Key Success Metrics**:
- Salon owner can add 10 staff members in <10 minutes ✅
- Salon owner can create 20 services in <15 minutes ✅
- All pages load in <2 seconds ✅
- Zero TypeScript/console errors ✅
- Mobile-friendly on 375px width ✅
- 90% success rate on first attempt ✅

---

**Generated**: 2025-10-25
**Feature Branch**: feature/staff-services-pages
**Ready for Implementation**: ✅ YES
