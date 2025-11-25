# WhatsApp SaaS Platform - Architecture Diagrams

Visual representation of the system architecture, deployment flow, and development workflow.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Web Browser  ←→  Mobile Browser  ←→  Progressive Web App        │
│      ↓                  ↓                      ↓                  │
└──────┼──────────────────┼──────────────────────┼─────────────────┘
       │                  │                      │
       └──────────────────┴──────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER (Port 3001)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Next.js 14 Application                                          │
│  ├── Pages Router                                                │
│  ├── API Routes (Proxy)                                          │
│  ├── React Query (State Management)                              │
│  ├── Zustand (Global State)                                      │
│  ├── TailwindCSS + shadcn/ui (UI Components)                     │
│  └── NextAuth.js (Authentication)                                │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    HTTP/HTTPS API Calls
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (Port 4000)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Node.js + Express.js API                                        │
│  ├── Authentication Middleware (JWT)                             │
│  ├── Authorization Middleware (RBAC)                             │
│  ├── Rate Limiting Middleware                                    │
│  ├── Validation Middleware (Zod)                                 │
│  ├── Error Handling Middleware                                   │
│  │                                                                │
│  ├── REST API Endpoints                                          │
│  │   ├── /api/auth (Login, Register, Refresh)                   │
│  │   ├── /api/tenants (Tenant Management)                        │
│  │   ├── /api/contacts (Contact Management)                      │
│  │   ├── /api/messages (Message Operations)                      │
│  │   ├── /api/campaigns (Campaign Management)                    │
│  │   ├── /api/templates (Template Management)                    │
│  │   ├── /api/analytics (Analytics & Reporting)                  │
│  │   └── /api/health (Health Check)                              │
│  │                                                                │
│  ├── Business Logic Services                                     │
│  │   ├── AuthService                                             │
│  │   ├── TenantService                                           │
│  │   ├── MessageService                                          │
│  │   ├── CampaignService                                         │
│  │   └── AnalyticsService                                        │
│  │                                                                │
│  └── WhatsApp Integration                                        │
│      ├── Meta Business API Client                                │
│      ├── Webhook Handler                                         │
│      └── Message Queue Processor                                 │
│                                                                   │
└──────────────┬────────────────────────┬─────────────────────────┘
               │                        │
               ↓                        ↓
┌──────────────────────────┐  ┌─────────────────────────┐
│   DATA LAYER             │  │   CACHE LAYER           │
│   (Port 5432)            │  │   (Port 6379)           │
├──────────────────────────┤  ├─────────────────────────┤
│                          │  │                         │
│  PostgreSQL 15           │  │  Redis 7                │
│  ├── Tenants Table       │  │  ├── Session Store      │
│  ├── Users Table         │  │  ├── Rate Limit Cache   │
│  ├── Contacts Table      │  │  ├── Message Queue      │
│  ├── Messages Table      │  │  └── API Response Cache │
│  ├── Campaigns Table     │  │                         │
│  ├── Templates Table     │  └─────────────────────────┘
│  └── Analytics Tables    │
│                          │
└──────────────────────────┘
               │
               ↓
┌──────────────────────────┐
│   BACKUP STORAGE         │
├──────────────────────────┤
│                          │
│  AWS S3 / Azure Blob     │
│  ├── Database Backups    │
│  ├── File Uploads        │
│  └── Logs Archive        │
│                          │
└──────────────────────────┘
```

---

## Development Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKSTATION                         │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  Option 1:   │   │  Option 2:   │   │   Option 3:      │
│  Docker      │   │  Automated   │   │   Manual Setup   │
│  Compose     │   │  Local Dev   │   │                  │
└──────────────┘   └──────────────┘   └──────────────────┘
        │                   │                   │
        ↓                   ↓                   ↓

┌─────────────────────────────────────────────────────────────────┐
│                     OPTION 1: DOCKER COMPOSE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  $ docker-compose -f docker-compose.dev.yml up                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  whatsapp_saas_network (Bridge Network)                │     │
│  │                                                         │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │     │
│  │  │  PostgreSQL  │  │    Redis     │  │  Backend   │   │     │
│  │  │   Container  │  │  Container   │  │ Container  │   │     │
│  │  │  (Port 5432) │  │ (Port 6379)  │  │(Port 4000) │   │     │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘   │     │
│  │         │                  │                │          │     │
│  │         │  Health Checks   │                │          │     │
│  │         └──────────────────┴────────────────┘          │     │
│  │                            │                           │     │
│  │                    ┌───────┴────────┐                  │     │
│  │                    │   Frontend     │                  │     │
│  │                    │   Container    │                  │     │
│  │                    │  (Port 3001)   │                  │     │
│  │                    └────────────────┘                  │     │
│  │                                                         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│        All services accessible via localhost                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│               OPTION 2: AUTOMATED LOCAL DEVELOPMENT              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  $ cd Frontend && npm run dev:full                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  1. scripts/dev.js starts                              │     │
│  │     ↓                                                   │     │
│  │  2. Check backend directory exists                     │     │
│  │     ↓                                                   │     │
│  │  3. Spawn backend process                              │     │
│  │     └─→ cd Backend && npm run dev                      │     │
│  │     ↓                                                   │     │
│  │  4. Wait 5 seconds for initialization                  │     │
│  │     ↓                                                   │     │
│  │  5. Run backend verification                           │     │
│  │     └─→ scripts/verify-backend.js                      │     │
│  │         ├─→ HTTP GET /api/health                       │     │
│  │         ├─→ Retry logic (5 attempts, 2s delay)         │     │
│  │         └─→ Parse response & validate                  │     │
│  │     ↓                                                   │     │
│  │  6. On success: Spawn frontend process                 │     │
│  │     └─→ npm run dev                                    │     │
│  │     ↓                                                   │     │
│  │  7. Both processes running                             │     │
│  │     ├─→ Backend: http://localhost:4000                 │     │
│  │     └─→ Frontend: http://localhost:3001                │     │
│  │                                                         │     │
│  │  8. Graceful shutdown on Ctrl+C                        │     │
│  │     └─→ Kill backend + frontend processes              │     │
│  │                                                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    OPTION 3: MANUAL SETUP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Terminal 1:                Terminal 2:                          │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │ cd Backend     │         │ cd Frontend    │                  │
│  │ npm run dev    │         │ npm run dev    │                  │
│  │ (Port 4000)    │         │ (Port 3001)    │                  │
│  └────────────────┘         └────────────────┘                  │
│         │                            │                           │
│         └────────────────┬───────────┘                           │
│                          │                                       │
│  Prerequisites (Local):  │                                       │
│  - PostgreSQL running (Port 5432)                                │
│  - Redis running (Port 6379)                                     │
│  - Environment variables configured                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Verification Flow

```
┌────────────────────────────────────────────────────────┐
│         scripts/verify-backend.js Execution            │
└────────────────────────────────────────────────────────┘
                         │
                         ↓
    ┌────────────────────────────────────────┐
    │ 1. Read NEXT_PUBLIC_API_URL from env   │
    │    Default: http://localhost:4000      │
    └────────────────┬───────────────────────┘
                     │
                     ↓
    ┌────────────────────────────────────────┐
    │ 2. Construct health endpoint URL       │
    │    URL: {BACKEND_URL}/api/health       │
    └────────────────┬───────────────────────┘
                     │
                     ↓
    ┌────────────────────────────────────────┐
    │ 3. Attempt HTTP GET request            │
    │    Timeout: 5 seconds                  │
    │    Max Attempts: 5                     │
    │    Retry Delay: 2 seconds              │
    └────────────────┬───────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓                       ↓
┌────────────────┐      ┌────────────────┐
│   SUCCESS      │      │    FAILURE     │
│   (200 OK)     │      │  (Error/Timeout)│
└────────┬───────┘      └────────┬───────┘
         │                       │
         ↓                       ↓
┌────────────────┐      ┌────────────────┐
│ Parse JSON     │      │ Retry logic    │
│ response       │      │ attempts < 5?  │
└────────┬───────┘      └────────┬───────┘
         │                       │
         ↓                  Yes  │  No
┌────────────────┐          ↓   │   ↓
│ Display status │      ┌───┴───┴──────┐
│ - Backend OK   │      │ Wait 2s then │
│ - Services OK  │      │ retry GET    │
└────────┬───────┘      └──────┬───────┘
         │                     │
         ↓                     ↓
┌────────────────┐    ┌────────────────┐
│ Exit code: 0   │    │ Display error  │
│ (Success)      │    │ Exit code: 1   │
└────────────────┘    │ (Failure)      │
                      └────────────────┘
```

---

## Docker Compose Service Dependencies

```
┌────────────────────────────────────────────────────────────┐
│                 Service Startup Sequence                    │
└────────────────────────────────────────────────────────────┘
                            │
                  Step 1    │
                            ↓
        ┌───────────────────────────────────────┐
        │     PostgreSQL Container Starts        │
        │     ├── Create database volume         │
        │     ├── Initialize database            │
        │     └── Health check: pg_isready       │
        └─────────────────┬─────────────────────┘
                          │
                          │  Health: OK
                          ↓
        ┌───────────────────────────────────────┐
        │       Redis Container Starts           │
        │       ├── Create cache volume          │
        │       ├── Initialize Redis             │
        │       └── Health check: ping           │
        └─────────────────┬─────────────────────┘
                          │
              Step 2      │  Both Healthy
                          ↓
        ┌───────────────────────────────────────┐
        │      Backend Container Starts          │
        │      depends_on:                       │
        │        - postgres (healthy)            │
        │        - redis (healthy)               │
        │      ├── Connect to database           │
        │      ├── Connect to Redis              │
        │      ├── Run migrations (optional)     │
        │      ├── Start Express server          │
        │      └── Health check: /api/health     │
        └─────────────────┬─────────────────────┘
                          │
              Step 3      │  Backend Healthy
                          ↓
        ┌───────────────────────────────────────┐
        │     Frontend Container Starts          │
        │     depends_on:                        │
        │       - backend                        │
        │     ├── Set NEXT_PUBLIC_API_URL        │
        │     ├── Start Next.js dev server       │
        │     └── Health check: HTTP request     │
        └─────────────────┬─────────────────────┘
                          │
              Step 4      │  All Services Ready
                          ↓
        ┌───────────────────────────────────────┐
        │      pgAdmin Container Starts          │
        │      depends_on:                       │
        │        - postgres                      │
        │      ├── Initialize pgAdmin            │
        │      └── Start web interface           │
        └───────────────────────────────────────┘
                          │
                          ↓
        ┌───────────────────────────────────────┐
        │        All Services Running            │
        │                                        │
        │  Frontend:  http://localhost:3001     │
        │  Backend:   http://localhost:4000     │
        │  Postgres:  localhost:5432            │
        │  Redis:     localhost:6379            │
        │  pgAdmin:   http://localhost:5050     │
        └───────────────────────────────────────┘
```

---

## Multi-Stage Docker Build Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend Dockerfile Build Stages               │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        Development              Production
                │                       │
                ↓                       ↓
        ┌───────────────┐      ┌───────────────┐
        │  base stage   │      │  base stage   │
        │  Node 18 Alpine│     │  Node 18 Alpine│
        └───────┬───────┘      └───────┬───────┘
                │                      │
                ↓                      ↓
        ┌───────────────┐      ┌───────────────┐
        │  deps-dev     │      │  deps         │
        │  All deps     │      │  Prod deps    │
        └───────┬───────┘      └───────┬───────┘
                │                      │
                ↓                      ↓
        ┌───────────────┐      ┌───────────────┐
        │ development   │      │  builder      │
        │ - Hot reload  │      │  - Build app  │
        │ - Dev server  │      │  - Optimize   │
        │ - Source maps │      └───────┬───────┘
        └───────────────┘              │
                                       ↓
                              ┌───────────────┐
                              │  production   │
                              │  - Minimal    │
                              │  - Non-root   │
                              │  - Optimized  │
                              └───────────────┘

Target Selection:
$ docker build --target development -t frontend:dev .
$ docker build --target production -t frontend:prod .
```

---

## API Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                Client (Browser) Request                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────┐
        │  Frontend Next.js Server          │
        │  (Port 3001)                      │
        │  ├── Route handling               │
        │  ├── Server-side rendering        │
        │  └── API proxy (optional)         │
        └─────────────┬─────────────────────┘
                      │
                      │  HTTP Request
                      ↓
        ┌───────────────────────────────────┐
        │  Backend Express Server           │
        │  (Port 4000)                      │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Middleware Chain                 │
        │  1. CORS Handler                  │
        │  2. Body Parser                   │
        │  3. Rate Limiter (Redis)          │
        │  4. Authentication (JWT)          │
        │  5. Authorization (RBAC)          │
        │  6. Validation (Zod)              │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Route Handler                    │
        │  ├── Extract request params       │
        │  ├── Call service layer           │
        │  └── Format response              │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Service Layer                    │
        │  ├── Business logic               │
        │  ├── Data validation              │
        │  └── Call data layer              │
        └─────────────┬─────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│  PostgreSQL      │    │  Redis Cache     │
│  ├── Query data  │    │  ├── Get cache   │
│  ├── Run txn     │    │  ├── Set cache   │
│  └── Return rows │    │  └── Invalidate  │
└──────────┬───────┘    └──────────┬───────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ↓
        ┌───────────────────────────────────┐
        │  Response Processing              │
        │  ├── Format data                  │
        │  ├── Add metadata                 │
        │  └── Apply transformations        │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Error Handling Middleware        │
        │  ├── Catch errors                 │
        │  ├── Log errors                   │
        │  ├── Format error response        │
        │  └── Return appropriate status    │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Response to Client               │
        │  ├── Status code                  │
        │  ├── Headers                      │
        │  └── JSON body                    │
        └───────────────────────────────────┘
```

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database Schema                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐
│   tenants    │         │    users     │
├──────────────┤         ├──────────────┤
│ id (PK)      │─────────│ id (PK)      │
│ name         │   1:N   │ tenant_id(FK)│
│ slug         │         │ email        │
│ status       │         │ password_hash│
│ created_at   │         │ role         │
└──────────────┘         └──────┬───────┘
       │                        │
       │ 1:N                    │ 1:N
       │                        │
       ↓                        ↓
┌──────────────┐         ┌──────────────┐
│  contacts    │         │  messages    │
├──────────────┤         ├──────────────┤
│ id (PK)      │─────────│ id (PK)      │
│ tenant_id(FK)│   1:N   │ contact_id(FK)│
│ phone_number │         │ tenant_id(FK)│
│ name         │         │ user_id (FK) │
│ tags         │         │ content      │
│ created_at   │         │ status       │
└──────────────┘         │ direction    │
       │                 │ created_at   │
       │                 └──────────────┘
       │ N:M                    │
       │                        │ N:1
       ↓                        │
┌──────────────┐                │
│  campaigns   │                │
├──────────────┤                │
│ id (PK)      │────────────────┘
│ tenant_id(FK)│   1:N
│ user_id (FK) │
│ name         │
│ status       │
│ scheduled_at │
│ created_at   │
└──────────────┘
       │
       │ 1:N
       ↓
┌──────────────┐
│ templates    │
├──────────────┤
│ id (PK)      │
│ tenant_id(FK)│
│ name         │
│ content      │
│ variables    │
│ created_at   │
└──────────────┘

Indexes for Performance:
- tenants.slug (UNIQUE)
- users.email (UNIQUE)
- users.tenant_id
- contacts.tenant_id, contacts.phone_number
- messages.tenant_id, messages.created_at
- messages.contact_id
- campaigns.tenant_id, campaigns.status
```

---

## Monitoring and Health Check Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Health Check System                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────┐
        │  Frontend Health Check            │
        │  - Next.js server responding      │
        │  - API connectivity verified      │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Backend Health Endpoint          │
        │  GET /api/health                  │
        │  Response:                        │
        │  {                                │
        │    "status": "healthy",           │
        │    "timestamp": "...",            │
        │    "services": {                  │
        │      "database": "connected",     │
        │      "redis": "connected",        │
        │      "whatsapp": "operational"    │
        │    },                             │
        │    "version": "1.0.0"             │
        │  }                                │
        └─────────────┬─────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│  Database Check  │    │  Redis Check     │
│  ├── Connection  │    │  ├── Connection  │
│  ├── Query test  │    │  ├── PING test   │
│  └── Response    │    │  └── Response    │
│     time         │    │     time         │
└──────────────────┘    └──────────────────┘

Future Monitoring:
┌───────────────────────────────────────────┐
│  Prometheus Metrics                       │
│  ├── Request count                        │
│  ├── Response time (p50, p95, p99)        │
│  ├── Error rate                           │
│  ├── Active connections                   │
│  └── Resource usage (CPU, Memory)         │
└───────────────────────────────────────────┘
                │
                ↓
┌───────────────────────────────────────────┐
│  Grafana Dashboards                       │
│  ├── System overview                      │
│  ├── API performance                      │
│  ├── Database metrics                     │
│  ├── Error tracking                       │
│  └── Alert rules                          │
└───────────────────────────────────────────┘
```

---

## Deployment Flow (Production)

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────┐
        │  1. Code Push to Git              │
        │     ├── GitHub/GitLab/Bitbucket   │
        │     └── Trigger pipeline          │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  2. Build Stage                   │
        │     ├── Install dependencies      │
        │     ├── Run linters               │
        │     ├── Type checking             │
        │     └── Unit tests                │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  3. Test Stage                    │
        │     ├── Integration tests         │
        │     ├── E2E tests                 │
        │     ├── Security scans            │
        │     └── Coverage reports          │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  4. Docker Build                  │
        │     ├── Build frontend image      │
        │     ├── Build backend image       │
        │     ├── Tag with version          │
        │     └── Push to registry          │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  5. Deploy to Staging             │
        │     ├── Pull images               │
        │     ├── Run migrations            │
        │     ├── Deploy services           │
        │     └── Smoke tests               │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  6. Manual Approval (Optional)    │
        │     └── Review staging            │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  7. Deploy to Production          │
        │     ├── Blue-Green deployment     │
        │     ├── Health checks             │
        │     ├── Rollback if needed        │
        │     └── Update DNS/Load balancer  │
        └───────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Security Layers                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────┐
        │  Layer 1: Network Security        │
        │  ├── Firewall rules               │
        │  ├── DDoS protection              │
        │  ├── SSL/TLS encryption           │
        │  └── VPC isolation                │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Layer 2: Application Security    │
        │  ├── Rate limiting                │
        │  ├── CORS policies                │
        │  ├── Security headers             │
        │  ├── Input validation             │
        │  └── XSS/CSRF protection          │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Layer 3: Authentication          │
        │  ├── JWT tokens                   │
        │  ├── Password hashing (bcrypt)    │
        │  ├── Session management           │
        │  └── Multi-factor auth (optional) │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Layer 4: Authorization           │
        │  ├── Role-based access control    │
        │  ├── Tenant isolation             │
        │  ├── Resource permissions         │
        │  └── Audit logging                │
        └─────────────┬─────────────────────┘
                      │
                      ↓
        ┌───────────────────────────────────┐
        │  Layer 5: Data Security           │
        │  ├── Encryption at rest           │
        │  ├── Encryption in transit        │
        │  ├── Secure backups               │
        │  ├── Secrets management           │
        │  └── Data sanitization            │
        └───────────────────────────────────┘
```

---

## Key Architecture Decisions

### Technology Choices
- **Frontend**: Next.js 14 for SSR, SEO, and developer experience
- **Backend**: Node.js + Express for JavaScript ecosystem consistency
- **Database**: PostgreSQL for ACID compliance and relational data
- **Cache**: Redis for session storage and rate limiting
- **Container**: Docker for consistency and portability
- **Orchestration**: Docker Compose for development simplicity

### Design Patterns
- **Multi-tenancy**: Tenant-based data isolation
- **Middleware Chain**: Request processing pipeline
- **Service Layer**: Business logic separation
- **Repository Pattern**: Data access abstraction
- **Health Checks**: Service availability monitoring

### Scalability Considerations
- **Horizontal Scaling**: Stateless backend services
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Redis for frequently accessed data
- **Message Queues**: Async processing for campaigns
- **Load Balancing**: Ready for multiple instances

---

End of Architecture Diagrams
