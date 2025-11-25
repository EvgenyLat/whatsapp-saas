# State Management Architecture Diagram

**WhatsApp SaaS Platform - Visual Architecture Guide**

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                             │
│  (Pages, Layouts, UI Components)                                     │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │                                  │
             │ Import Hooks                     │ Import Stores
             │                                  │
┌────────────┴────────────┐         ┌──────────┴────────────┐
│   REACT QUERY HOOKS     │         │   ZUSTAND STORES      │
│   (Server State)        │         │   (Client State)      │
│                         │         │                       │
│  • useBookings()        │         │  • useAuthStore       │
│  • useMessages()        │         │  • useUIStore         │
│  • useSalons()          │         │  • useFilterStore     │
│  • useAnalytics()       │         │  • useNotificationStore│
│  • useTemplates()       │         │                       │
└────────────┬────────────┘         └──────────┬────────────┘
             │                                  │
             │ Uses                             │ Persists to
             │                                  │
┌────────────┴────────────┐         ┌──────────┴────────────┐
│   REACT QUERY CLIENT    │         │   LOCAL STORAGE       │
│                         │         │                       │
│  • Cache Management     │         │  • auth-storage       │
│  • Request Deduplication│         │  • ui-storage         │
│  • Optimistic Updates   │         │  • notifications-storage│
│  • Background Refetch   │         │                       │
└────────────┬────────────┘         └───────────────────────┘
             │
             │ Makes Requests
             │
┌────────────┴────────────┐
│      API CLIENT         │
│   (Axios Instance)      │
│                         │
│  • Auth Interceptor     │
│  • Error Handler        │
│  • Base URL Config      │
└────────────┬────────────┘
             │
             │ HTTP Requests
             │
┌────────────┴────────────┐
│      BACKEND API        │
│  (Express + Prisma)     │
└─────────────────────────┘
```

---

## State Flow Diagram

### Reading Data (Query)

```
Component
   │
   ├─> useBookings(salonId)
   │      │
   │      ├─> Check Cache
   │      │      │
   │      │      ├─> HIT → Return Cached Data
   │      │      │
   │      │      └─> MISS → Fetch from API
   │      │               │
   │      │               ├─> api.bookings.getAll()
   │      │               │      │
   │      │               │      └─> Axios Request
   │      │               │             │
   │      │               │             └─> Backend API
   │      │               │
   │      │               └─> Cache Response
   │      │
   │      └─> Return Data to Component
   │
   └─> Render with Data
```

### Writing Data (Mutation)

```
Component
   │
   ├─> useCreateBooking()
   │      │
   │      └─> mutation.mutate(newBooking)
   │             │
   │             ├─> onMutate (Optimistic Update)
   │             │      │
   │             │      └─> Update Cache Immediately
   │             │
   │             ├─> mutationFn
   │             │      │
   │             │      └─> api.bookings.create(newBooking)
   │             │             │
   │             │             └─> Axios POST
   │             │                    │
   │             │                    └─> Backend API
   │             │
   │             ├─> onSuccess
   │             │      │
   │             │      └─> Invalidate Related Queries
   │             │
   │             └─> onError (Rollback)
   │                    │
   │                    └─> Restore Previous Cache State
   │
   └─> UI Updates (Instant Feedback)
```

---

## Data Flow by Feature

### 1. Authentication Flow

```
Login Form Component
   │
   ├─> User enters credentials
   │
   ├─> authApi.login(credentials)
   │      │
   │      └─> POST /auth/login
   │             │
   │             └─> Returns { user, token }
   │
   ├─> useAuthStore.login(user, token)
   │      │
   │      ├─> Store in Zustand state
   │      │
   │      ├─> Save to localStorage
   │      │
   │      └─> Set isAuthenticated = true
   │
   └─> Redirect to Dashboard
```

### 2. Booking List Flow

```
Booking List Component
   │
   ├─> const { data, isLoading } = useBookings(salonId, filters)
   │      │
   │      ├─> Query Key: ['bookings', 'list', salonId, filters]
   │      │
   │      ├─> Check Cache
   │      │      │
   │      │      └─> If stale (>5min) → Fetch from API
   │      │
   │      └─> Return PaginatedResponse<Booking>
   │
   ├─> const { bookingFilters } = useFilterStore()
   │      │
   │      └─> Return current filter state
   │
   └─> Render List with Filters
```

### 3. Create Booking Flow

```
Create Booking Form
   │
   ├─> const createBooking = useCreateBooking(salonId)
   │
   ├─> User submits form
   │
   ├─> createBooking.mutate(formData)
   │      │
   │      ├─> Optimistic Update
   │      │      │
   │      │      └─> Add to cache immediately
   │      │             │
   │      │             └─> UI shows new booking instantly
   │      │
   │      ├─> POST /bookings
   │      │      │
   │      │      ├─> SUCCESS → Keep optimistic update
   │      │      │      │
   │      │      │      └─> Invalidate queries
   │      │      │
   │      │      └─> ERROR → Rollback to previous state
   │      │             │
   │      │             └─> Show error message
   │      │
   │      └─> useSuccessToast('Booking created!')
   │
   └─> Form resets
```

### 4. Real-time Messages Flow

```
Message List Component
   │
   ├─> const { data } = useMessages(salonId, { conversationId })
   │      │
   │      ├─> Query with auto-refetch (30s interval)
   │      │      │
   │      │      └─> Keeps data fresh for real-time feel
   │      │
   │      └─> Returns latest messages
   │
   ├─> const sendMessage = useSendMessage(salonId)
   │
   ├─> User types and sends
   │
   ├─> sendMessage.mutate({ phone_number, content })
   │      │
   │      ├─> Optimistic: Add to list immediately
   │      │
   │      ├─> POST /messages
   │      │      │
   │      │      └─> Returns sent message with ID
   │      │
   │      └─> Invalidate conversation queries
   │
   └─> Message appears in list (instant feedback)
```

---

## Store Interaction Diagram

### UI Store + Auth Store Interaction

```
Application Layout
   │
   ├─> const { user } = useAuthStore()
   │      │
   │      └─> Returns current authenticated user
   │
   ├─> const { theme, setTheme } = useUIStore()
   │      │
   │      └─> Returns current theme preference
   │
   ├─> Check if user is authenticated
   │      │
   │      ├─> YES → Show authenticated UI
   │      │      │
   │      │      ├─> Sidebar (from useUIStore)
   │      │      │
   │      │      ├─> Theme toggle (from useUIStore)
   │      │      │
   │      │      └─> Notification bell (from useNotificationStore)
   │      │
   │      └─> NO → Redirect to login
   │
   └─> Apply theme to document
          │
          └─> useUIStore.resolvedTheme
```

### Filter Store + API Hooks Interaction

```
Booking List Page
   │
   ├─> const { bookingFilters, updateBookingFilter } = useFilterStore()
   │      │
   │      └─> Current filter state
   │
   ├─> const { data } = useBookings(salonId, bookingFilters)
   │      │
   │      └─> Fetches data with current filters
   │
   ├─> User changes filter (e.g., status = 'CONFIRMED')
   │      │
   │      └─> updateBookingFilter('status', 'CONFIRMED')
   │             │
   │             ├─> Updates Zustand store
   │             │
   │             └─> Triggers useBookings refetch
   │                    │
   │                    └─> New query key → Fetches fresh data
   │
   └─> List updates with filtered results
```

---

## Caching Strategy Diagram

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    QUERY CACHE                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Bookings List (salonId: 'salon-1', status: 'CONFIRMED') │
│  │  • Stale Time: 2 minutes                          │
│  │  • GC Time: 10 minutes                            │
│  │  • Auto Refetch: On window focus                  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Booking Detail (id: 'booking-123')               │
│  │  • Stale Time: 5 minutes                          │
│  │  • GC Time: 10 minutes                            │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Dashboard Stats (salonId: 'salon-1')             │
│  │  • Stale Time: 2 minutes                          │
│  │  • Refetch Interval: 5 minutes                    │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Messages (salonId: 'salon-1', conversationId: 'conv-1') │
│  │  • Stale Time: 30 seconds                         │
│  │  • Refetch Interval: 30 seconds (real-time)       │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Cache Invalidation on Mutations:
   Create Booking → Invalidates ['bookings', 'list']
   Update Booking → Invalidates ['bookings', 'list'] + ['bookings', 'detail', id]
   Delete Booking → Invalidates ['bookings']
   Send Message  → Invalidates ['messages'] + ['conversations']
```

---

## Performance Optimization Points

### 1. Selector Optimization (Zustand)

```
// ❌ BAD - Causes re-render on any state change
const { user, token, login, logout } = useAuthStore();

// ✅ GOOD - Only re-renders when user changes
const user = useAuthStore((state) => state.user);
const logout = useAuthStore((state) => state.logout);
```

### 2. Query Deduplication (React Query)

```
Component A                Component B
    │                          │
    ├─> useBookings(salonId)   ├─> useBookings(salonId)
    │          │               │          │
    │          └───────────────┴──────────┘
    │                     │
    │              Single API Request
    │                     │
    └──────────────┬──────┘
                   │
              Shared Cache
```

### 3. Background Refetching

```
Time: 0s → User opens page
         │
         └─> useBookings() fetches data
                │
                └─> Data is fresh

Time: 3min → Data becomes stale (staleTime: 2min)
          │
          └─> Still shows cached data (instant)

Time: 3min 1s → User focuses window
             │
             └─> Automatic background refetch
                    │
                    └─> Updates cache when complete
                           │
                           └─> UI updates seamlessly
```

---

## Error Handling Flow

```
API Request Fails
   │
   ├─> Is it 401 Unauthorized?
   │      │
   │      ├─> YES → Clear auth token
   │      │      │
   │      │      └─> Redirect to login
   │      │
   │      └─> NO → Continue error handling
   │
   ├─> Is it 4xx Client Error?
   │      │
   │      ├─> YES → Don't retry
   │      │      │
   │      │      └─> Show error message
   │      │
   │      └─> NO → Continue error handling
   │
   ├─> Is it 5xx Server Error?
   │      │
   │      └─> YES → Retry with exponential backoff
   │             │
   │             ├─> Attempt 1 (delay: 1s)
   │             │
   │             ├─> Attempt 2 (delay: 2s)
   │             │
   │             ├─> Attempt 3 (delay: 4s)
   │             │
   │             └─> All failed → Show error
   │
   └─> Optimistic Update Active?
          │
          └─> YES → Rollback to previous state
                 │
                 └─> Show error toast
```

---

## DevTools Integration

```
Development Environment
   │
   ├─> React Query DevTools
   │      │
   │      ├─> View all queries
   │      │
   │      ├─> Inspect cache state
   │      │
   │      ├─> Manually trigger refetch
   │      │
   │      └─> View query timings
   │
   └─> Zustand DevTools
          │
          ├─> View store state
          │
          ├─> Track action history
          │
          ├─> Time-travel debugging
          │
          └─> Export/import state
```

---

## Summary

This architecture provides:

1. ✅ **Separation of Concerns**
   - Server state (React Query) separate from client state (Zustand)
   - Clear data flow from components to API

2. ✅ **Optimal Performance**
   - Automatic caching and deduplication
   - Selector-based subscriptions
   - Background refetching

3. ✅ **Developer Experience**
   - TypeScript type safety
   - DevTools for debugging
   - Comprehensive error handling

4. ✅ **Production Ready**
   - Optimistic updates for instant feedback
   - Automatic retry and rollback
   - Real-time data synchronization

---

**Architecture designed for scalability, maintainability, and performance.**
