# Admin Panel Architecture

## Visual Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp SaaS Platform                        │
│                                                                   │
│  ┌──────────────┐  Login  ┌────────────────────────────────┐   │
│  │              │────────▶│   Authentication Middleware     │   │
│  │  Login Page  │         │   (middleware.ts)               │   │
│  │              │◀────────│   - Check JWT Token             │   │
│  └──────────────┘         │   - Verify User Role            │   │
│                            │   - Route Based on Role         │   │
│                            └────────────────────────────────┘   │
│                                     │                             │
│                    ┌────────────────┴────────────────┐          │
│                    │                                  │          │
│                    ▼                                  ▼          │
│         ┌──────────────────┐              ┌──────────────────┐ │
│         │  SUPER_ADMIN     │              │  SALON_ADMIN     │ │
│         │  Role            │              │  SALON_STAFF     │ │
│         │                  │              │  Roles           │ │
│         └────────┬─────────┘              └────────┬─────────┘ │
│                  │                                  │          │
│                  ▼                                  ▼          │
│    ┌──────────────────────────┐      ┌──────────────────────┐ │
│    │   /admin (Admin Panel)   │      │ /dashboard (Salon)   │ │
│    └──────────────────────────┘      └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Admin Panel Route Structure

```
/admin
├── / (Overview Dashboard)
│   ├── Platform Statistics
│   │   ├── Total Salons
│   │   ├── Total Users
│   │   ├── Messages (24h)
│   │   └── Monthly Revenue
│   ├── System Health
│   │   ├── API Server Status
│   │   ├── Database Status
│   │   ├── WhatsApp API Status
│   │   └── Background Jobs Status
│   ├── Recent Activity Feed
│   └── Quick Stats
│
├── /salons (Salons Management)
│   ├── Salon List (DataTable)
│   │   ├── Search & Filter
│   │   ├── Sortable Columns
│   │   └── Pagination
│   ├── Actions per Salon
│   │   ├── View Details
│   │   ├── Edit
│   │   ├── Toggle Active/Inactive
│   │   └── Delete
│   └── Create New Salon
│
├── /users (Users Management)
│   ├── User List (DataTable)
│   │   ├── Search & Filter
│   │   ├── Filter by Role
│   │   └── Pagination
│   ├── Actions per User
│   │   ├── View Details
│   │   ├── Edit User
│   │   ├── Change Role
│   │   └── Deactivate
│   └── Create New User
│
├── /analytics (Platform Analytics)
│   ├── Charts
│   │   ├── Message Volume (Area Chart)
│   │   ├── Revenue Growth (Bar Chart)
│   │   ├── User & Salon Growth (Line Chart)
│   │   └── API Usage (Pie Chart)
│   ├── Time Range Selector
│   └── Top Performing Salons
│
└── /system (System Settings)
    ├── Configuration Tab
    │   ├── System Status
    │   ├── Database Info
    │   └── Platform Settings
    ├── Audit Logs Tab
    │   └── Action History (DataTable)
    └── Error Logs Tab
        └── System Errors (DataTable)
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Admin Panel Layout                         │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │                │  │         Header                    │   │
│  │   AdminSidebar │  │  (Reused from salon dashboard)   │   │
│  │                │  └─────────────────────────────────┘   │
│  │  Navigation:   │  ┌─────────────────────────────────┐   │
│  │  - Overview    │  │                                  │   │
│  │  - Salons      │  │      Page Content Area          │   │
│  │  - Users       │  │                                  │   │
│  │  - Analytics   │  │  ┌────────────────────────┐     │   │
│  │  - System      │  │  │   Reusable Components  │     │   │
│  │                │  │  │                        │     │   │
│  │  User Info:    │  │  │  - DataTable          │     │   │
│  │  - Profile     │  │  │  - StatCard           │     │   │
│  │  - Logout      │  │  │  - Charts (Recharts)  │     │   │
│  │                │  │  │  - Card Components    │     │   │
│  └────────────────┘  │  └────────────────────────┘     │   │
│                      └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Data Flow Diagram                        │
└──────────────────────────────────────────────────────────────┘

User Action (Admin Page)
         │
         ▼
React Component
         │
         ▼
React Query Hook (useQuery/useMutation)
         │
         ▼
API Client Function (adminApi.*)
         │
         ▼
Axios HTTP Request
         │
         ▼
Backend API Endpoint (/api/admin/*)
         │
         ▼
Authentication Middleware
  - Verify JWT Token
  - Check SUPER_ADMIN Role
         │
         ▼
Authorization Check
  - Is user super admin?
         │
         ├─ Yes ────▶ Process Request
         │                   │
         └─ No ─────▶ Return 403 Forbidden
                             │
                             ▼
                    Database Query/Update
                             │
                             ▼
                    Audit Log (for mutations)
                             │
                             ▼
                    Return Response
                             │
         ┌───────────────────┘
         ▼
React Query Cache Update
         │
         ▼
UI Re-render with New Data
```

## File Organization

```
whatsapp-saas-starter/
├── Frontend/src/
│   ├── app/
│   │   ├── (admin)/                    # Admin route group
│   │   │   ├── layout.tsx              # Admin layout wrapper
│   │   │   └── admin/
│   │   │       ├── page.tsx            # Overview dashboard
│   │   │       ├── salons/
│   │   │       │   └── page.tsx        # Salons management
│   │   │       ├── users/
│   │   │       │   └── page.tsx        # Users management
│   │   │       ├── analytics/
│   │   │       │   └── page.tsx        # Analytics
│   │   │       └── system/
│   │   │           └── page.tsx        # System settings
│   │   │
│   │   └── (dashboard)/                # Salon dashboard (existing)
│   │       └── ...
│   │
│   ├── components/
│   │   ├── admin/                      # Admin-specific components
│   │   │   ├── AdminSidebar.tsx        # Dark themed sidebar
│   │   │   ├── DataTable.tsx           # Reusable table
│   │   │   └── index.ts                # Barrel export
│   │   │
│   │   ├── layout/                     # Shared layout components
│   │   │   ├── Sidebar.tsx             # Salon sidebar
│   │   │   └── Header.tsx              # Shared header
│   │   │
│   │   └── ui/                         # Shared UI components
│   │       └── ...
│   │
│   ├── lib/
│   │   └── api/
│   │       ├── admin.ts                # Admin API client (TODO)
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── admin/                      # Admin hooks (TODO)
│   │   │   ├── useAdminStats.ts
│   │   │   ├── useAdminSalons.ts
│   │   │   └── ...
│   │   │
│   │   └── useAuth.ts                  # Authentication hook
│   │
│   ├── store/
│   │   ├── useAuthStore.ts             # Auth state (role checking)
│   │   └── useUIStore.ts               # UI state
│   │
│   ├── middleware.ts                   # Route protection (UPDATED)
│   │
│   └── types/
│       └── ...                         # TypeScript types
│
├── ADMIN_API_ENDPOINTS.md              # API specification
├── ADMIN_PANEL_SUMMARY.md              # Implementation guide
└── ADMIN_PANEL_ARCHITECTURE.md         # This file
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
└─────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├── HTTPS Enforcement
├── CORS Configuration
└── Rate Limiting

Layer 2: Authentication
├── JWT Token Validation
├── Token Expiration Check
└── Refresh Token Mechanism

Layer 3: Authorization (Middleware)
├── Route-Based Protection
│   ├── /admin/* → SUPER_ADMIN only
│   └── /dashboard/* → SALON users only
├── Role Verification
└── Automatic Redirection

Layer 4: API Endpoint Security
├── Role Check on Each Request
├── Input Validation
├── SQL Injection Prevention
└── XSS Protection

Layer 5: Audit & Monitoring
├── Action Logging
├── Error Tracking
└── Anomaly Detection
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                  State Management Flow                       │
└─────────────────────────────────────────────────────────────┘

Global State (Zustand)
├── useAuthStore
│   ├── user: User | null
│   ├── access_token: string | null
│   ├── isAuthenticated: boolean
│   └── Role Checking Methods
│       ├── isSuperAdmin()
│       ├── isSalonAdmin()
│       └── hasRole(role)
│
└── useUIStore
    ├── sidebarOpen: boolean
    ├── theme: Theme
    └── UI Helpers

Server State (React Query)
├── Admin Queries
│   ├── useAdminStats()
│   ├── useAdminSalons()
│   ├── useAdminUsers()
│   └── useAdminAnalytics()
│
└── Mutations
    ├── useCreateSalon()
    ├── useUpdateSalon()
    ├── useCreateUser()
    └── useChangeUserRole()

Component State (useState)
├── Search Query
├── Current Page
├── Selected Items
└── Modal State
```

## Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Flows                          │
└─────────────────────────────────────────────────────────────┘

Login Flow:
┌───────────┐
│  /login   │
└─────┬─────┘
      │ Submit Credentials
      ▼
┌─────────────────┐
│  Authenticate   │
└────┬────────┬───┘
     │        │
     │ Success│
     ▼        ▼
SUPER_ADMIN   SALON User
     │             │
     ▼             ▼
  /admin      /dashboard


Admin Navigation:
┌─────────────┐
│   /admin    │◀─── Default landing for SUPER_ADMIN
└──────┬──────┘
       │ Click Navigation
       ├────────▶ /admin/salons
       ├────────▶ /admin/users
       ├────────▶ /admin/analytics
       └────────▶ /admin/system


Access Denied Flow:
SALON User attempts /admin/*
         │
         ▼
   Middleware Check
         │
         ▼
   Redirect to /dashboard

SUPER_ADMIN attempts /dashboard/*
         │
         ▼
   Middleware Check
         │
         ▼
   Redirect to /admin
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Tech Stack Overview                       │
└─────────────────────────────────────────────────────────────┘

Frontend Framework
├── Next.js 14 (App Router)
├── React 18
└── TypeScript

Styling
├── Tailwind CSS
├── CSS Modules
└── Tailwind Merge (cn utility)

State Management
├── Zustand (Global State)
├── React Query (Server State)
└── React useState (Component State)

UI Components
├── Radix UI (Primitives)
├── Lucide React (Icons)
└── Custom Components

Data Visualization
└── Recharts

Forms & Validation
├── React Hook Form
└── Zod

HTTP Client
└── Axios

Date Handling
└── date-fns

Development Tools
├── ESLint
├── Prettier
└── TypeScript
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│              Performance Strategies                          │
└─────────────────────────────────────────────────────────────┘

1. Code Splitting
   ├── Route-based splitting (Next.js automatic)
   ├── Component lazy loading (future)
   └── Dynamic imports for heavy components

2. Data Fetching
   ├── React Query caching
   ├── Pagination (limit data per request)
   ├── Debounced search
   └── Background refetching

3. Rendering Optimization
   ├── Memoization (React.memo, useMemo)
   ├── Virtual scrolling (for large lists)
   └── Optimistic updates

4. Asset Optimization
   ├── Image optimization (Next.js Image)
   ├── Font optimization
   └── Bundle size monitoring

5. Network Optimization
   ├── Request deduplication
   ├── Stale-while-revalidate
   └── Prefetching (on hover)
```

## Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                           │
└─────────────────────────────────────────────────────────────┘

                    ▲
                   ╱ ╲
                  ╱   ╲  E2E Tests (Planned)
                 ╱─────╲  - Login flows
                ╱       ╲ - Admin actions
               ╱─────────╲- Role-based routing
              ╱           ╲
             ╱Integration  ╲
            ╱   Tests       ╲
           ╱   (Planned)     ╲
          ╱─────────────────────╲
         ╱                       ╲
        ╱    Unit Tests           ╲
       ╱      (Planned)            ╲
      ╱───────────────────────────────╲
     ╱                                 ╲
    ╱       Manual Testing              ╲
   ╱         (Current)                   ╲
  ╱─────────────────────────────────────────╲

Current: Manual testing
Next: Unit tests for utilities
Then: Integration tests for API hooks
Finally: E2E tests for critical flows
```

## Deployment Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                 Deployment Checklist                         │
└─────────────────────────────────────────────────────────────┘

Pre-deployment:
├── ✓ Environment variables configured
├── ✓ API endpoints updated for production
├── ✓ Security headers verified
├── □ Audit logging enabled
└── □ Error monitoring configured

Build:
├── ✓ TypeScript compilation passes
├── ✓ No ESLint errors
├── ✓ Production build successful
└── □ Bundle size optimized

Testing:
├── □ All admin routes accessible
├── □ Role-based access working
├── □ All CRUD operations functional
└── □ Error handling tested

Monitoring:
├── □ Error tracking (Sentry/similar)
├── □ Performance monitoring
├── □ Audit log verification
└── □ Usage analytics
```

## Future Enhancements

```
┌─────────────────────────────────────────────────────────────┐
│                    Roadmap                                   │
└─────────────────────────────────────────────────────────────┘

Phase 1: Current (UI Complete)
├── ✓ Admin layout and routing
├── ✓ All 5 admin pages
├── ✓ DataTable component
└── ✓ Mock data implementation

Phase 2: API Integration (Next)
├── □ Backend API implementation
├── □ Frontend API client
├── □ React Query hooks
└── □ Real data integration

Phase 3: Enhanced Features
├── □ Real-time updates (WebSockets)
├── □ Advanced filtering & search
├── □ Bulk operations
├── □ Data export (CSV/Excel)
├── □ Email notifications
└── □ Advanced analytics

Phase 4: Polish & Optimization
├── □ Loading skeletons
├── □ Error boundaries
├── □ Optimistic updates
├── □ Offline support
└── □ Performance optimization

Phase 5: Advanced Admin Features
├── □ User impersonation
├── □ Feature flags management
├── □ A/B testing dashboard
├── □ Custom reporting
└── □ Scheduled tasks management
```

---

**Last Updated**: 2025-10-22
**Status**: Phase 1 Complete - Ready for API Integration
