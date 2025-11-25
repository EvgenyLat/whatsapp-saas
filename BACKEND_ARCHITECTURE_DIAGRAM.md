# WhatsApp SaaS Backend Architecture

Visual representation of the backend API architecture, data flow, and relationships.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  (Frontend, Mobile Apps, WhatsApp Business API, External APIs)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Helmet.js  │  │ Rate Limiter │  │     CORS     │          │
│  │   Security   │  │ (100 req/min)│  │   Policies   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         JWT Authentication Middleware                 │      │
│  │  (Validates Bearer Token on all protected routes)    │      │
│  └──────────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     NESTJS APPLICATION                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │              CONTROLLER LAYER                      │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │         │
│  │  │ Masters  │ │ Services │ │ Bookings │ │ Auth │ │         │
│  │  │Controller│ │Controller│ │Controller│ │Ctrl  │ │         │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ │         │
│  └───────┼────────────┼────────────┼───────────┼─────┘         │
│          │            │            │           │                │
│  ┌───────▼────────────▼────────────▼───────────▼─────┐         │
│  │              SERVICE LAYER                         │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │         │
│  │  │ Masters  │ │ Services │ │ Bookings │ │ Auth │ │         │
│  │  │ Service  │ │ Service  │ │ Service  │ │Servic│ │         │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ │         │
│  └───────┼────────────┼────────────┼───────────┼─────┘         │
│          │            │            │           │                │
│  ┌───────▼────────────▼────────────▼───────────▼─────┐         │
│  │            REPOSITORY LAYER                        │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │         │
│  │  │ Masters  │ │ Services │ │ Bookings │           │         │
│  │  │   Repo   │ │   Repo   │ │   Repo   │           │         │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘           │         │
│  └───────┼────────────┼────────────┼─────────────────┘         │
│          │            │            │                            │
│  ┌───────▼────────────▼────────────▼─────────────────┐         │
│  │           PRISMA ORM CLIENT                        │         │
│  └────────────────────┬───────────────────────────────┘         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  PostgreSQL  │ │    Redis    │ │   BullMQ   │
│   Database   │ │    Cache    │ │   Queue    │
│              │ │             │ │            │
│  • Masters   │ │ • Analytics │ │ • Reminders│
│  • Services  │ │ • Sessions  │ │ • Webhooks │
│  • Bookings  │ │ • Rate Limit│ │ • Emails   │
│  • Salons    │ │             │ │            │
└──────────────┘ └─────────────┘ └────────────┘
```

---

## API Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      APP MODULE                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Config Module │  │ Database Mod │  │  Cache Module│      │
│  │  (Global)    │  │  (Prisma)    │  │   (Redis)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │           FEATURE MODULES                       │         │
│  │                                                 │         │
│  │  ┌─────────────────────────────────┐           │         │
│  │  │      MASTERS MODULE              │           │         │
│  │  │  • MastersController             │           │         │
│  │  │  • MastersService                │           │         │
│  │  │  • MastersRepository             │           │         │
│  │  │  • DTOs (Create, Update, Filter) │           │         │
│  │  └─────────────────────────────────┘           │         │
│  │                                                 │         │
│  │  ┌─────────────────────────────────┐           │         │
│  │  │      SERVICES MODULE             │           │         │
│  │  │  • ServicesController            │           │         │
│  │  │  • ServicesService               │           │         │
│  │  │  • ServicesRepository            │           │         │
│  │  │  • DTOs (Create, Update, Filter) │           │         │
│  │  └─────────────────────────────────┘           │         │
│  │                                                 │         │
│  │  ┌─────────────────────────────────┐           │         │
│  │  │      BOOKINGS MODULE             │           │         │
│  │  │  • BookingsController            │           │         │
│  │  │  • BookingsService               │           │         │
│  │  │  • BookingsRepository            │           │         │
│  │  │  • DTOs (Create, Update, Filter) │           │         │
│  │  └─────────────────────────────────┘           │         │
│  │                                                 │         │
│  │  ┌─────────────────────────────────┐           │         │
│  │  │     ANALYTICS MODULE             │           │         │
│  │  │  • AnalyticsController           │           │         │
│  │  │  • AnalyticsService              │           │         │
│  │  │  • CacheService integration      │           │         │
│  │  └─────────────────────────────────┘           │         │
│  │                                                 │         │
│  │  ┌─────────────────────────────────┐           │         │
│  │  │       AUTH MODULE                │           │         │
│  │  │  • AuthController                │           │         │
│  │  │  • AuthService                   │           │         │
│  │  │  • JWT Strategy & Guards         │           │         │
│  │  └─────────────────────────────────┘           │         │
│  │                                                 │         │
│  │  Other Modules:                                │         │
│  │  • Salons, Messages, Templates,                │         │
│  │  • Conversations, WhatsApp, AI,                │         │
│  │  • Reminders, Queue                            │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Entity Relationships

```
┌────────────────┐
│     Users      │
│                │
│ • id (PK)      │
│ • email        │
│ • password     │
│ • role         │
│ • first_name   │
│ • last_name    │
└───────┬────────┘
        │ 1
        │
        │ owns
        │
        │ N
┌───────▼────────┐
│     Salons     │
│                │
│ • id (PK)      │
│ • name         │
│ • owner_id(FK) │
│ • is_active    │
│ • usage limits │
└───┬────────┬───┘
    │        │
    │ 1      │ 1
    │        │
    │ N      │ N
┌───▼──────┐ │ ┌─────────────┐
│ Masters  │ │ │  Services   │
│          │ │ │             │
│ • id(PK) │ │ │ • id (PK)   │
│ • salon ─┘ │ │ • salon ────┘
│ • name   │   │ • name      │
│ • email  │   │ • duration  │
│ • phone  │   │ • price     │
│ • spec.  │   │ • category  │
│ • hours  │   │ • is_active │
└────┬─────┘   └──────┬──────┘
     │                │
     │ 1              │ 1
     │                │
     │ assigned_to    │ uses
     │                │
     │ N              │ N
     └────────┬───────┘
              │
         ┌────▼─────────┐
         │   Bookings   │
         │              │
         │ • id (PK)    │
         │ • salon_id   │
         │ • master_id  │◄─── Optional FK (SET NULL)
         │ • service_id │◄─── Optional FK (SET NULL)
         │ • customer   │
         │ • start_ts   │
         │ • end_ts     │
         │ • status     │
         │ • code       │
         └──────┬───────┘
                │
                │ 1
                │
                │ has
                │
                │ N
         ┌──────▼───────┐
         │  Reminders   │
         │              │
         │ • id (PK)    │
         │ • booking_id │
         │ • scheduled  │
         │ • sent_at    │
         │ • status     │
         └──────────────┘
```

**Key Relationships:**
- User → Salon: One-to-Many (owner)
- Salon → Masters: One-to-Many (cascade delete)
- Salon → Services: One-to-Many (cascade delete)
- Salon → Bookings: One-to-Many (cascade delete)
- Master → Bookings: One-to-Many (set null on delete)
- Service → Bookings: One-to-Many (set null on delete)
- Booking → Reminders: One-to-Many (cascade delete)

---

## Request Flow Diagram

### Example: Create Booking with Master & Service Assignment

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ POST /api/bookings
      │ {
      │   "salon_id": "...",
      │   "master_id": "...",
      │   "service_id": "...",
      │   "start_ts": "...",
      │   ...
      │ }
      │
      ▼
┌─────────────────────┐
│  JWT Auth Guard     │
│  • Verify token     │
│  • Extract user     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│BookingsController   │
│  @Post()            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ BookingsService     │
│  create()           │
└──────┬──────────────┘
       │
       │ 1. Verify salon ownership
       ├──────────────────────────►┌───────────────┐
       │                            │SalonsService  │
       │◄──────────────────────────┤               │
       │                            └───────────────┘
       │ 2. Check usage limits
       ├──────────────────────────►┌───────────────┐
       │                            │UsageTracking  │
       │◄──────────────────────────┤               │
       │                            └───────────────┘
       │ 3. Auto-calculate end_ts
       ├──────────────────────────►┌───────────────┐
       │                            │ServicesRepo   │
       │◄─── service.duration ──────┤findById()     │
       │                            └───────────────┘
       │ 4. Create booking
       ├──────────────────────────►┌───────────────┐
       │                            │BookingsRepo   │
       │◄─── booking ───────────────┤create()       │
       │                            └───────────────┘
       │ 5. Increment usage
       ├──────────────────────────►┌───────────────┐
       │                            │UsageTracking  │
       │◄──────────────────────────┤increment()    │
       │                            └───────────────┘
       │ 6. Schedule reminder
       └──────────────────────────►┌───────────────┐
                                    │RemindersServ  │
                                    │schedule()     │
                                    └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  BullMQ Job   │
                                    │  (delayed)    │
                                    └───────────────┘
```

---

## Master Availability Calculation Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ GET /api/masters/:id/availability
      │ ?date=2025-10-26&duration_minutes=60
      │
      ▼
┌───────────────────────────────────────────┐
│  MastersService.getAvailability()         │
└─────┬─────────────────────────────────────┘
      │
      │ 1. Verify master exists
      ▼
┌───────────────────┐
│ MastersRepository │
│ findByIdWithStats │
└─────┬─────────────┘
      │
      │ 2. Parse working_hours JSON
      │    Get schedule for requested day
      ▼
┌────────────────────────────────────┐
│  working_hours.monday = {          │
│    enabled: true,                  │
│    start: "09:00",                 │
│    end: "18:00",                   │
│    breaks: [                       │
│      {start:"13:00", end:"14:00"}  │
│    ]                               │
│  }                                 │
└────────┬───────────────────────────┘
         │
         │ 3. Get existing bookings
         ▼
┌───────────────────┐
│ MastersRepository │
│ getBookingsForDate│
└─────┬─────────────┘
      │
      │ 4. Calculate slots
      ▼
┌───────────────────────────────────────────┐
│  calculateAvailableSlots()                │
│                                           │
│  For each 15-min interval (09:00-18:00): │
│    • Check if slot fits duration (60min) │
│    • Check if slot overlaps break        │
│    • Check if slot overlaps booking      │
│    • Add to available_slots if free      │
│                                           │
│  Returns:                                 │
│  [                                        │
│    "2025-10-26T09:00:00.000Z",           │
│    "2025-10-26T09:15:00.000Z",           │
│    "2025-10-26T10:00:00.000Z",           │
│    "2025-10-26T14:00:00.000Z",  ← After  │
│    ...                            lunch  │
│  ]                                        │
└───────────────────────────────────────────┘
```

---

## Analytics Caching Strategy

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ GET /api/analytics/dashboard?salon_id=...
      │
      ▼
┌────────────────────────────────┐
│  AnalyticsController           │
│  getDashboardStats()           │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│  AnalyticsService              │
│  getDashboardStats()           │
└──────┬─────────────────────────┘
       │
       │ 1. Try cache first
       ▼
┌────────────────────────────────┐
│  CacheService                  │
│  getDashboardStats()           │
└──────┬─────────────────────────┘
       │
       ├─── Cache HIT? ────────►┌──────────────┐
       │                         │ Return cache │
       │                         │ (15-min TTL) │
       │                         └──────────────┘
       │
       │ Cache MISS
       ▼
┌────────────────────────────────┐
│  Fetch from database           │
│                                │
│  • Single query for bookings   │
│  • Single query for messages   │
│  • Count active conversations  │
│  • In-memory aggregation       │
│  • Calculate trends            │
└──────┬─────────────────────────┘
       │
       │ 2. Cache result
       ▼
┌────────────────────────────────┐
│  CacheService                  │
│  setDashboardStats()           │
│  (TTL: 15 minutes)             │
└──────┬─────────────────────────┘
       │
       │ 3. Return data
       ▼
┌────────────────────────────────┐
│  {                             │
│    totalBookings: 150,         │
│    todayBookings: 5,           │
│    activeChats: 12,            │
│    responseRate: 95.5,         │
│    bookingsByStatus: {...},    │
│    recentActivity: {...},      │
│    trends: {...}               │
│  }                             │
└────────────────────────────────┘
```

**Cache Invalidation:**
- On booking creation → Invalidate dashboard cache
- On booking update → Invalidate dashboard cache
- On message received → Invalidate dashboard cache
- Manual: DELETE /api/cache/dashboard

---

## Booking Status State Machine

```
                  ┌──────────────┐
          ┌───────│  CONFIRMED   │◄─────── (Initial State)
          │       └───────┬──────┘
          │               │
          │               │ Start appointment
          │               │
          │       ┌───────▼──────┐
          │       │ IN_PROGRESS  │
          │       └───────┬──────┘
          │               │
          │               │ Finish appointment
    Cancel│               │
          │       ┌───────▼──────┐
          │       │  COMPLETED   │◄───── (Terminal State)
          │       └──────────────┘
          │
          │       ┌──────────────┐
          └──────►│  CANCELLED   │◄───── (Terminal State)
                  └──────────────┘

                  ┌──────────────┐
        Customer  │   NO_SHOW    │◄───── (Terminal State)
        no-show   └──────────────┘
```

**Valid Transitions:**
- CONFIRMED → IN_PROGRESS
- CONFIRMED → CANCELLED
- CONFIRMED → NO_SHOW
- IN_PROGRESS → COMPLETED
- IN_PROGRESS → CANCELLED

**Invalid Transitions:**
- COMPLETED → (any)
- CANCELLED → (any)
- NO_SHOW → (any)

---

## Security Layers

```
┌────────────────────────────────────────────────────┐
│              EXTERNAL REQUEST                       │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 1: Network Security                         │
│  • HTTPS/TLS encryption                            │
│  • Firewall rules                                  │
│  • DDoS protection                                 │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 2: Application Security (Helmet.js)         │
│  • Content Security Policy (CSP)                   │
│  • X-Frame-Options: DENY                           │
│  • X-Content-Type-Options: nosniff                 │
│  • Strict-Transport-Security                       │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 3: Rate Limiting                            │
│  • 100 requests/minute per user                    │
│  • Redis-based tracking                            │
│  • 429 Too Many Requests response                  │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 4: Authentication (JWT)                     │
│  • Verify Bearer token signature                   │
│  • Check token expiration (15 min)                 │
│  • Extract user info (id, role, email)             │
│  • 401 Unauthorized if invalid                     │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 5: Authorization (RBAC)                     │
│  • Check user role (SUPER_ADMIN, SALON_OWNER)      │
│  • Verify salon ownership                          │
│  • Resource-level permissions                      │
│  • 403 Forbidden if insufficient                   │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 6: Input Validation                         │
│  • class-validator decorators                      │
│  • Type checking (DTOs)                            │
│  • Sanitization                                    │
│  • 400 Bad Request if invalid                      │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│  Layer 7: Database Security                        │
│  • Prisma ORM (prevents SQL injection)             │
│  • Parameterized queries                           │
│  • Row-level security (RLS)                        │
│  • Connection pooling                              │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│              BUSINESS LOGIC                         │
└────────────────────────────────────────────────────┘
```

---

## Performance Optimization Strategy

### Database Queries

```
BEFORE (N+1 Query Problem):
┌──────────────────────────────┐
│ SELECT * FROM bookings;      │ ← 1 query (returns 100 rows)
└──────────────────────────────┘
         │
         ├─► SELECT * FROM masters WHERE id = 'uuid1'  ← 100 queries!
         ├─► SELECT * FROM masters WHERE id = 'uuid2'
         ├─► SELECT * FROM masters WHERE id = 'uuid3'
         └─► ...

AFTER (Single Query with Join):
┌────────────────────────────────────────────────┐
│ SELECT b.*, m.name, s.name, s.duration         │
│ FROM bookings b                                │
│ LEFT JOIN masters m ON b.master_id = m.id     │
│ LEFT JOIN services s ON b.service_id = s.id   │
│ WHERE b.salon_id = 'uuid'                      │
│ ORDER BY b.start_ts DESC                       │
│ LIMIT 20 OFFSET 0;                             │
└────────────────────────────────────────────────┘
         │
         └─► 1 query with all data!
```

### Caching Strategy

```
┌──────────────────┐         ┌──────────────────┐
│   L1: Memory     │         │   L2: Redis      │
│   (Node cache)   │         │   (Distributed)  │
│                  │         │                  │
│  • Config data   │◄───────►│  • Analytics     │
│  • Enums         │         │  • Session data  │
│  • Constants     │         │  • Rate limits   │
│  (10-min TTL)    │         │  (15-min TTL)    │
└──────────────────┘         └──────────────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   L3: PostgreSQL       │
         │   (Source of Truth)    │
         │                        │
         │  • Masters             │
         │  • Services            │
         │  • Bookings            │
         │  • Analytics           │
         └────────────────────────┘
```

---

## Deployment Architecture (Production)

```
                        ┌──────────────┐
                        │   Internet   │
                        └──────┬───────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │   (ALB/NLB)      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  NestJS App │  │  NestJS App │  │  NestJS App │
    │  Instance 1 │  │  Instance 2 │  │  Instance 3 │
    │  (Container)│  │  (Container)│  │  (Container)│
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  PostgreSQL  │ │    Redis     │ │   BullMQ     │
    │  (Aurora)    │ │  (Cluster)   │ │   Workers    │
    │              │ │              │ │              │
    │  • Primary   │ │  • Master    │ │  • Reminder  │
    │  • Replicas  │ │  • Replicas  │ │  • Webhook   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

**Last Updated:** 2025-10-25
**Version:** 1.0
