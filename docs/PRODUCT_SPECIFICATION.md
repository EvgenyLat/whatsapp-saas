# WhatsApp SaaS Platform - Product Specification

**Product**: Multi-tenant WhatsApp booking automation platform for beauty salons
**Version**: 1.0
**Created**: 2025-10-24
**Status**: In Development (70% backend, 30% frontend)
**Target Launch**: Q1 2026

---

## Executive Summary

### Vision

Empower beauty salons to automate appointment booking through WhatsApp, reducing manual work by 80% and improving customer satisfaction through instant 24/7 automated responses.

### Problem Statement

Beauty salons spend 3-5 hours daily managing appointment bookings via WhatsApp messages manually. This leads to:
- Missed bookings during closed hours (30% of inquiries)
- Double bookings due to human error (15% occurrence rate)
- Lost revenue from unanswered messages ($500-1500/month per salon)
- Staff burnout from repetitive administrative tasks

### Solution

A SaaS platform that provides beauty salons with:
1. **Automated WhatsApp bot** for 24/7 booking management
2. **Admin dashboard** for managing masters, services, and schedules
3. **Automatic reminders** 24 hours before appointments
4. **Multi-tenant architecture** supporting 1000+ salons
5. **Subscription billing** with tiered pricing plans

### Target Market

- **Primary**: Small to medium beauty salons (1-10 masters) in Russia, CIS countries
- **Secondary**: Hair salons, barbershops, nail studios
- **Market size**: 45,000+ beauty salons in Russia
- **Target**: 1000 paid subscribers within 12 months

---

## Current Status & Roadmap

### Completed (70% Backend)

✅ **Core Infrastructure**
- PostgreSQL database with Prisma ORM
- Redis caching layer
- JWT authentication & RBAC authorization
- REST API foundation (NestJS)
- Multi-tenant architecture base
- Basic WhatsApp webhook integration

✅ **Database Schema**
- Users, Salons, Masters, Services tables
- Bookings with status tracking
- Messages logging
- Multi-language support preparation

✅ **Basic Features**
- User registration & login
- Salon CRUD operations
- Basic API endpoints

### In Progress (30% Frontend)

🔄 **UI/UX System**
- Design system (TailwindCSS + shadcn/ui)
- Basic component library
- Responsive layout structure

### Pending (Priority Order)

**Priority 1: WhatsApp Business API Integration** (4 weeks)
- Complete webhook event handling
- Two-way messaging (send/receive)
- Message templates management
- Webhook signature verification
- Rate limiting compliance

**Priority 2: Admin Dashboard** (6 weeks)
- Salon owner dashboard with analytics
- Masters management interface
- Services & pricing configuration
- Schedule management calendar
- Booking management interface

**Priority 3: Automated Reminders System** (3 weeks)
- 24-hour appointment reminders
- Confirmation/cancellation via WhatsApp
- Reminder scheduling background jobs
- Template message compliance

**Priority 4: Billing & Subscriptions** (4 weeks)
- Stripe/PayPal integration
- Subscription plan management (Free, Basic, Pro, Enterprise)
- Usage tracking & limits enforcement
- Payment processing & invoicing
- Trial period management

**Priority 5: Production Deployment** (2 weeks)
- AWS infrastructure setup (RDS, ElastiCache, ALB)
- CI/CD pipeline (GitHub Actions)
- Monitoring (Prometheus + Grafana)
- SSL certificates & domain setup
- Backup & disaster recovery

---

## User Roles & Personas

### 1. Salon Owner (Primary User)

**Profile**: Maria, 35, owns a nail studio with 3 masters
- Tech-savvy but not technical
- Uses WhatsApp Business daily
- Manages 20-30 bookings/day
- Works 10-12 hour days

**Goals**:
- Automate booking responses 24/7
- Reduce time spent on administrative tasks
- Never miss a booking opportunity
- Track salon performance metrics

**Pain Points**:
- Manually answering same questions repeatedly
- Missing messages during appointments
- Double-booking mistakes
- No visibility into booking trends

### 2. Master/Stylist (Secondary User)

**Profile**: Anna, 27, manicure master
- Uses phone for WhatsApp communication
- Needs access to her schedule
- Prefers mobile-friendly interfaces

**Goals**:
- See her daily appointments
- Know client preferences/history
- Get notified about new bookings
- Manage her availability

**Pain Points**:
- Unclear communication about schedule changes
- Missing client details during appointments
- Last-minute cancellations

### 3. End Customer (Booking User)

**Profile**: Olga, 30, regular salon visitor
- Prefers WhatsApp over phone calls
- Books 2-3 times per month
- Values convenience and instant responses

**Goals**:
- Book appointments quickly without calling
- Receive confirmation immediately
- Get reminders before appointments
- Easy cancellation/rescheduling

**Pain Points**:
- Waiting hours for booking confirmation
- Forgotten appointments
- Difficulty reaching salon during business hours

### 4. Platform Administrator (Internal Role)

**Profile**: Technical support team member
- Monitors platform health
- Handles salon onboarding
- Resolves technical issues
- Manages subscriptions

**Goals**:
- Quick issue resolution
- Platform stability monitoring
- Efficient salon support
- Revenue optimization

---

## Core Features Specification

## Feature 1: WhatsApp Business API Integration

### Overview

Enable salons to communicate with customers via WhatsApp using automated responses and two-way messaging.

### User Stories

#### Story 1.1: Receive Customer Messages (Priority: P1)

**As a** salon owner
**I want** to receive customer messages sent to my WhatsApp Business number
**So that** I can track all customer inquiries in one place

**Why this priority**: Foundation for all WhatsApp functionality. Nothing works without message reception.

**Independent Test**: Send WhatsApp message → System logs message in database → Admin can view in dashboard

**Acceptance Scenarios**:
1. **Given** WhatsApp webhook is configured, **When** customer sends "Hello", **Then** message is stored in database with timestamp, sender phone, and content
2. **Given** message is received, **When** admin views dashboard, **Then** message appears in recent activity feed
3. **Given** multiple messages arrive simultaneously, **When** system processes them, **Then** all messages are captured without loss

#### Story 1.2: Send Automated Responses (Priority: P1)

**As a** salon owner
**I want** customers to receive instant automatic responses to common questions
**So that** they don't wait hours for simple information

**Why this priority**: Core value proposition - 24/7 automated responses

**Independent Test**: Customer asks "What are your hours?" → Bot responds with business hours within 3 seconds

**Acceptance Scenarios**:
1. **Given** customer asks about services, **When** bot processes message, **Then** customer receives list of available services within 5 seconds
2. **Given** customer sends greeting ("Hi", "Hello"), **When** bot detects greeting, **Then** customer receives welcome message with booking instructions
3. **Given** customer asks in Russian, **When** bot processes message, **Then** response is generated in Russian

#### Story 1.3: Process Booking Requests (Priority: P1)

**As a** end customer
**I want** to book an appointment via WhatsApp
**So that** I don't have to call the salon during business hours

**Why this priority**: Primary use case for the entire platform

**Independent Test**: Customer sends "Book manicure tomorrow at 2pm" → System creates booking → Customer receives confirmation

**Acceptance Scenarios**:
1. **Given** customer specifies service, date, and time, **When** timeslot is available, **Then** booking is created and customer receives confirmation number
2. **Given** customer specifies date but not time, **When** bot asks for time preference, **Then** customer can reply with time and complete booking
3. **Given** requested timeslot is unavailable, **When** bot detects conflict, **Then** customer receives alternative time suggestions (3 nearest available slots)

#### Story 1.4: Handle Message Templates (Priority: P2)

**As a** salon owner
**I want** to use pre-approved WhatsApp message templates
**So that** I comply with WhatsApp Business API policies

**Why this priority**: Required for automated reminders and marketing messages

**Independent Test**: Trigger reminder → System uses approved template → Message delivered within policy limits

**Acceptance Scenarios**:
1. **Given** reminder is scheduled, **When** time arrives, **Then** approved template message is sent using WhatsApp Business API
2. **Given** template requires variables (name, time), **When** message is sent, **Then** placeholders are replaced with actual booking data
3. **Given** template send fails, **When** error is detected, **Then** admin is notified and retry is scheduled

### Functional Requirements

- **FR-WA-001**: System MUST receive incoming WhatsApp messages via webhook
- **FR-WA-002**: System MUST verify webhook signatures to prevent unauthorized requests
- **FR-WA-003**: System MUST send WhatsApp messages using Business API
- **FR-WA-004**: System MUST support message templates for automated messages
- **FR-WA-005**: System MUST handle message delivery status (sent, delivered, read, failed)
- **FR-WA-006**: System MUST support multimedia messages (images for service gallery)
- **FR-WA-007**: System MUST implement rate limiting (80 messages/second per phone number)
- **FR-WA-008**: System MUST log all inbound and outbound messages for audit trail
- **FR-WA-009**: System MUST handle webhook retries from WhatsApp (idempotent processing)
- **FR-WA-010**: System MUST support multi-language message generation (Russian, English)

### Key Entities

- **WhatsApp Message**: Unique ID, direction (inbound/outbound), sender phone, recipient phone, content, timestamp, delivery status, salon ID
- **WhatsApp Template**: Template name, language, content with placeholders, approval status, category (reminder/marketing)
- **Webhook Event**: Event type, payload, signature, processed status, retry count

### Success Criteria

- **SC-WA-001**: 99.9% of incoming messages are captured within 3 seconds of receipt
- **SC-WA-002**: Customers receive automated responses within 5 seconds on average
- **SC-WA-003**: 98% of booking requests are successfully processed on first attempt
- **SC-WA-004**: Zero message loss during peak loads (100 messages/minute)
- **SC-WA-005**: System handles 1000+ concurrent WhatsApp conversations without degradation

---

## Feature 2: Admin Dashboard

### Overview

Web-based interface for salon owners to manage their business operations, view analytics, and configure WhatsApp automation.

### User Stories

#### Story 2.1: View Booking Dashboard (Priority: P1)

**As a** salon owner
**I want** to see today's bookings and upcoming appointments at a glance
**So that** I can prepare for the day's schedule

**Why this priority**: First screen salon owners see - must provide immediate value

**Independent Test**: Login → Dashboard loads with today's 5 bookings → Can click to see details

**Acceptance Scenarios**:
1. **Given** salon has bookings today, **When** owner opens dashboard, **Then** all today's bookings are displayed with client name, service, time, and master
2. **Given** owner wants to see tomorrow, **When** owner clicks date selector, **Then** tomorrow's bookings appear
3. **Given** booking status changes, **When** page auto-refreshes, **Then** updated status appears without manual reload

#### Story 2.2: Manage Masters (Priority: P2)

**As a** salon owner
**I want** to add and manage my team of masters
**So that** I can assign bookings to specific stylists

**Why this priority**: Required before bookings can be properly assigned

**Independent Test**: Add master "Anna" with specialty "Manicure" → Create booking → Anna appears in master selection dropdown

**Acceptance Scenarios**:
1. **Given** owner clicks "Add Master", **When** owner fills name, phone, specialties, **Then** master is saved and appears in masters list
2. **Given** master needs schedule update, **When** owner sets working hours (Mon-Fri 9-18), **Then** booking system only allows appointments during those hours
3. **Given** master is on vacation, **When** owner sets "unavailable" status, **Then** master doesn't appear in booking options for those dates

#### Story 2.3: Configure Services & Pricing (Priority: P2)

**As a** salon owner
**I want** to define services, durations, and prices
**So that** customers know what's available and how much it costs

**Why this priority**: Required data for booking creation and price quotes

**Independent Test**: Add service "Gel Manicure" (60 min, 2000 RUB) → Customer asks about manicure → Bot quotes correct price

**Acceptance Scenarios**:
1. **Given** owner clicks "Add Service", **When** owner enters name, duration, price, **Then** service is available for booking
2. **Given** service price changes, **When** owner updates price, **Then** new bookings use new price, existing bookings unchanged
3. **Given** service is seasonal, **When** owner sets availability dates, **Then** service only appears during specified period

#### Story 2.4: View Analytics & Reports (Priority: P3)

**As a** salon owner
**I want** to see booking trends and revenue metrics
**So that** I can make data-driven business decisions

**Why this priority**: Nice-to-have for optimization, not critical for core functionality

**Independent Test**: View dashboard → See "30 bookings this month, 15% increase from last month"

**Acceptance Scenarios**:
1. **Given** owner views analytics, **When** dashboard loads, **Then** key metrics displayed: total bookings, revenue, popular services, busiest days
2. **Given** owner wants monthly report, **When** owner selects date range, **Then** bookings and revenue graph displays for selected period
3. **Given** owner wants to export data, **When** owner clicks export, **Then** CSV file downloads with booking details

### Functional Requirements

- **FR-DB-001**: Dashboard MUST display real-time booking count for current day
- **FR-DB-002**: Dashboard MUST show upcoming bookings for next 7 days
- **FR-DB-003**: System MUST allow CRUD operations for masters (name, phone, specialties, schedule)
- **FR-DB-004**: System MUST allow CRUD operations for services (name, duration, price, description)
- **FR-DB-005**: System MUST validate working hours don't overlap for same master
- **FR-DB-006**: System MUST display analytics: booking count, revenue, popular services, peak hours
- **FR-DB-007**: Dashboard MUST load within 2 seconds on 3G connection
- **FR-DB-008**: Dashboard MUST be responsive (mobile, tablet, desktop)
- **FR-DB-009**: System MUST support data export (CSV, PDF) for reports
- **FR-DB-010**: Dashboard MUST auto-refresh booking status every 30 seconds

### Key Entities

- **Dashboard View**: Salon owner's customized view with widgets (bookings, revenue, notifications)
- **Master Profile**: Name, phone, email, specialties, working schedule, photo, status (active/inactive)
- **Service Definition**: Name, description, duration (minutes), price (RUB), category, availability schedule
- **Analytics Data**: Date range, metric type, aggregated values, comparisons

### Success Criteria

- **SC-DB-001**: Salon owners can complete initial setup (add 3 masters, 5 services) in under 15 minutes
- **SC-DB-002**: Dashboard loads all data for a salon with 100 bookings/day in under 2 seconds
- **SC-DB-003**: 95% of salon owners successfully navigate dashboard without training
- **SC-DB-004**: Mobile dashboard is usable on phones with 360px width screens
- **SC-DB-005**: Analytics accurately reflect booking data with zero discrepancies

---

## Feature 3: Automated Reminder System

### Overview

Background job system that sends WhatsApp reminders 24 hours before appointments to reduce no-shows.

### User Stories

#### Story 3.1: Send 24-Hour Reminders (Priority: P1)

**As a** salon owner
**I want** customers to receive automatic reminders 24 hours before their appointment
**So that** I reduce no-show rate and improve attendance

**Why this priority**: Proven to reduce no-shows by 40-60%, direct revenue impact

**Independent Test**: Create booking for tomorrow 2pm → Wait 24 hours → Customer receives reminder → Can confirm via WhatsApp

**Acceptance Scenarios**:
1. **Given** booking is 24 hours away, **When** reminder job runs, **Then** customer receives WhatsApp message with appointment details and confirmation link
2. **Given** customer confirms via WhatsApp, **When** customer replies "Yes" or "Confirm", **Then** booking status updates to "confirmed"
3. **Given** customer doesn't respond, **When** 12 hours before appointment, **Then** second reminder is sent

#### Story 3.2: Handle Cancellations via Reminder (Priority: P2)

**As an** end customer
**I want** to cancel my appointment by replying to the reminder
**So that** I don't have to call the salon

**Why this priority**: Convenience feature that improves customer experience

**Independent Test**: Receive reminder → Reply "Cancel" → Booking cancelled → Salon owner notified

**Acceptance Scenarios**:
1. **Given** customer receives reminder, **When** customer replies "Cancel" or "Отмена", **Then** booking is marked cancelled and timeslot becomes available
2. **Given** booking is cancelled, **When** system processes cancellation, **Then** salon owner receives notification
3. **Given** cancellation occurs less than 6 hours before appointment, **When** system detects late cancellation, **Then** salon owner is notified with "late cancellation" flag

#### Story 3.3: Reschedule via Reminder (Priority: P3)

**As an** end customer
**I want** to reschedule my appointment by replying to the reminder
**So that** I can easily change my time if needed

**Why this priority**: Nice-to-have convenience feature

**Independent Test**: Receive reminder → Reply "Reschedule" → Bot shows available times → Select new time → Confirmed

**Acceptance Scenarios**:
1. **Given** customer receives reminder, **When** customer replies "Reschedule", **Then** bot presents 5 nearest available timeslots
2. **Given** customer selects new time, **When** timeslot is available, **Then** booking is updated and customer receives new confirmation
3. **Given** customer selects occupied timeslot, **When** bot detects conflict, **Then** customer receives updated available times

### Functional Requirements

- **FR-RM-001**: System MUST scan for bookings 24 hours in the future every 5 minutes
- **FR-RM-002**: System MUST send reminder using approved WhatsApp template
- **FR-RM-003**: System MUST not send duplicate reminders for same booking
- **FR-RM-004**: System MUST handle confirmation responses ("yes", "да", "confirm", "✓")
- **FR-RM-005**: System MUST handle cancellation responses ("cancel", "отмена", "no")
- **FR-RM-006**: System MUST update booking status when customer confirms/cancels
- **FR-RM-007**: System MUST log all reminder sends and responses for analytics
- **FR-RM-008**: System MUST retry failed reminder sends up to 3 times with exponential backoff
- **FR-RM-009**: System MUST respect customer timezone for reminder timing
- **FR-RM-010**: System MUST allow salon owner to disable reminders per booking

### Key Entities

- **Reminder Job**: Booking ID, scheduled send time, status (pending/sent/failed), retry count, last error
- **Reminder Response**: Booking ID, customer phone, response text, parsed intent (confirm/cancel/reschedule), timestamp

### Success Criteria

- **SC-RM-001**: 98% of reminders are delivered exactly 24 hours before appointment
- **SC-RM-002**: No-show rate decreases by 40% for salons using reminders
- **SC-RM-003**: 80% of customers who receive reminders either confirm or cancel
- **SC-RM-004**: Reminder processing handles 10,000 reminders/hour during peak times
- **SC-RM-005**: Failed reminder sends are retried successfully 95% of the time

---

## Feature 4: Billing & Subscription Management

### Overview

Monetization system with tiered subscription plans, payment processing, and usage tracking.

### Subscription Plans

#### Free Plan (Trial)
- **Duration**: 14 days
- **Limits**: 50 bookings/month, 1 master, 5 services
- **Features**: Basic WhatsApp bot, manual booking management
- **Price**: 0 RUB

#### Basic Plan
- **Target**: Small salons (1-2 masters)
- **Limits**: 200 bookings/month, 3 masters, 20 services
- **Features**: All Free + automated reminders, basic analytics
- **Price**: 1,990 RUB/month (~$20)

#### Pro Plan
- **Target**: Medium salons (3-5 masters)
- **Limits**: 1,000 bookings/month, 10 masters, unlimited services
- **Features**: All Basic + advanced analytics, priority support, custom branding
- **Price**: 4,990 RUB/month (~$50)

#### Enterprise Plan
- **Target**: Large salons/chains (6+ masters)
- **Limits**: Unlimited bookings, unlimited masters, unlimited services
- **Features**: All Pro + multi-location support, API access, dedicated account manager
- **Price**: Custom pricing (starting 15,000 RUB/month)

### User Stories

#### Story 4.1: Subscribe to Plan (Priority: P1)

**As a** salon owner
**I want** to subscribe to a paid plan after my trial expires
**So that** I can continue using the platform

**Why this priority**: Revenue generation - critical for business viability

**Independent Test**: Trial expires → See upgrade prompt → Choose Basic plan → Enter payment → Subscription active

**Acceptance Scenarios**:
1. **Given** trial expires in 3 days, **When** owner logs in, **Then** prominent upgrade banner appears with plan comparison
2. **Given** owner selects plan, **When** owner enters payment details, **Then** Stripe securely processes payment
3. **Given** payment succeeds, **When** subscription activates, **Then** all plan features become immediately available

#### Story 4.2: Manage Payment Methods (Priority: P2)

**As a** salon owner
**I want** to update my payment card
**So that** my subscription continues without interruption

**Why this priority**: Prevents involuntary churn from expired cards

**Independent Test**: Navigate to billing → Update card → Save → Next invoice uses new card

**Acceptance Scenarios**:
1. **Given** owner has active subscription, **When** owner adds new payment method, **Then** new method becomes default for future charges
2. **Given** payment fails, **When** retry occurs, **Then** owner receives email notification with payment link
3. **Given** card expires, **When** expiration date approaches (7 days), **Then** owner receives proactive reminder to update

#### Story 4.3: Upgrade/Downgrade Plans (Priority: P2)

**As a** salon owner
**I want** to upgrade to a higher plan when my business grows
**So that** I can handle more bookings without hitting limits

**Why this priority**: Allows revenue growth as customers expand

**Independent Test**: Basic plan → Reach 150 bookings → Upgrade to Pro → Limits immediately increase

**Acceptance Scenarios**:
1. **Given** owner approaches plan limit (90% usage), **When** owner views dashboard, **Then** upgrade suggestion appears
2. **Given** owner upgrades mid-month, **When** upgrade processes, **Then** prorated charges are calculated correctly
3. **Given** owner downgrades, **When** downgrade processes, **Then** change takes effect at next billing cycle

### Functional Requirements

- **FR-BL-001**: System MUST integrate with Stripe for payment processing
- **FR-BL-002**: System MUST enforce plan limits (bookings/month, masters count, services count)
- **FR-BL-003**: System MUST send invoice emails after each successful charge
- **FR-BL-004**: System MUST handle failed payments with 3 retry attempts over 7 days
- **FR-BL-005**: System MUST calculate prorated charges for mid-month upgrades
- **FR-BL-006**: System MUST allow plan changes (upgrade/downgrade)
- **FR-BL-007**: System MUST track usage (bookings created, messages sent) per salon
- **FR-BL-008**: System MUST send trial expiration reminders (7 days, 3 days, 1 day before)
- **FR-BL-009**: System MUST generate monthly usage reports for Enterprise customers
- **FR-BL-010**: System MUST comply with PCI DSS (use Stripe, never store card details)

### Key Entities

- **Subscription**: Salon ID, plan type, status (trial/active/past_due/cancelled), start date, next billing date, Stripe subscription ID
- **Payment Method**: Stripe payment method ID, card last 4 digits, expiration date, billing address
- **Invoice**: Subscription ID, amount, status, paid date, invoice PDF URL
- **Usage Tracking**: Salon ID, month, bookings count, messages sent, masters count

### Success Criteria

- **SC-BL-001**: 70% of trial users convert to paid plans within 14 days
- **SC-BL-002**: Payment processing succeeds on first attempt 98% of the time
- **SC-BL-003**: Failed payment recovery rate of 60% within retry period
- **SC-BL-004**: Monthly churn rate below 5% for paying customers
- **SC-BL-005**: Plan upgrade flow completes in under 2 minutes on average

---

## Feature 5: Production Infrastructure

### Overview

AWS-based production deployment with high availability, monitoring, and automated CI/CD.

### Architecture Components

#### AWS Services

**RDS PostgreSQL**
- Primary database for all structured data
- Multi-AZ deployment for high availability
- Automated daily backups with 30-day retention
- Instance type: db.t3.medium (2 vCPU, 4GB RAM) initially
- Encryption at rest enabled

**ElastiCache Redis**
- AI response caching (90%+ hit rate target)
- Session storage for user authentication
- Rate limiting counters
- Instance type: cache.t3.medium initially
- Multi-AZ with automatic failover

**Application Load Balancer (ALB)**
- SSL termination (Let's Encrypt certificates)
- Health checks every 30 seconds
- Distributes traffic across multiple EC2 instances
- HTTPS only (HTTP redirects to HTTPS)

**EC2 Auto Scaling Group**
- Min: 2 instances, Max: 10 instances
- Instance type: t3.medium (2 vCPU, 4GB RAM)
- Scale up: CPU > 70% for 5 minutes
- Scale down: CPU < 30% for 10 minutes
- Blue-green deployment strategy

**S3**
- Static assets (images, PDFs)
- Log archival (CloudWatch logs to S3)
- Database backup storage

**CloudWatch**
- Application logs aggregation
- Metrics dashboarding
- Alerts for error rates, latency spikes
- Log retention: 90 days

#### CI/CD Pipeline (GitHub Actions)

**Build Stage**
1. Checkout code
2. Run linters (ESLint, Prettier)
3. Run TypeScript compilation check
4. Run unit tests (80%+ coverage required)
5. Build Docker images (backend, frontend)

**Test Stage**
1. Deploy to test environment
2. Run integration tests
3. Run E2E tests (Playwright)
4. Security scan (Snyk, npm audit)

**Deploy Stage (Staging)**
1. Deploy to staging environment
2. Run smoke tests
3. Manual approval gate

**Deploy Stage (Production)**
1. Blue-green deployment
2. Health check validation
3. Route 10% traffic to new version
4. Monitor for 10 minutes
5. If healthy, route 100% traffic
6. If unhealthy, rollback automatically

### User Stories

#### Story 5.1: Zero-Downtime Deployments (Priority: P1)

**As a** platform user
**I want** deployments to not interrupt my service
**So that** I can rely on the platform 24/7

**Why this priority**: Downtime during salon business hours = lost bookings = lost revenue

**Independent Test**: Trigger deployment during business hours → Service remains available → Deployment completes → No user impact

**Acceptance Scenarios**:
1. **Given** new version is ready, **When** blue-green deployment starts, **Then** traffic continues on old version until new version is healthy
2. **Given** health checks fail on new version, **When** failure is detected, **Then** traffic remains on old version and deployment is aborted
3. **Given** deployment succeeds, **When** traffic shifts to new version, **Then** transition occurs with zero dropped requests

#### Story 5.2: Automated Monitoring & Alerts (Priority: P1)

**As a** platform administrator
**I want** to be alerted when system health degrades
**So that** I can resolve issues before they impact users

**Why this priority**: Proactive problem detection prevents user-facing outages

**Independent Test**: Simulate database connection failure → Alert fires within 1 minute → On-call engineer paged

**Acceptance Scenarios**:
1. **Given** error rate exceeds 5% for 5 minutes, **When** threshold is breached, **Then** Slack alert and PagerDuty page sent
2. **Given** API latency exceeds 1 second (p95), **When** degradation is detected, **Then** alert sent with latency graph
3. **Given** system recovers, **When** metrics return to normal, **Then** recovery notification sent

#### Story 5.3: Database Backup & Recovery (Priority: P2)

**As a** platform administrator
**I want** automated daily database backups
**So that** I can recover from data loss within 1 hour

**Why this priority**: Data loss protection - critical for business continuity

**Independent Test**: Trigger backup → Simulate database failure → Restore from backup → Verify data integrity

**Acceptance Scenarios**:
1. **Given** daily backup scheduled, **When** backup runs at 3am UTC, **Then** full database snapshot is stored in S3 encrypted
2. **Given** data corruption occurs, **When** restore is initiated, **Then** database is restored to state within last 24 hours
3. **Given** restore completes, **When** validation runs, **Then** all critical tables have expected row counts

### Functional Requirements

- **FR-IF-001**: System MUST achieve 99.9% uptime (< 8.7 hours downtime/year)
- **FR-IF-002**: System MUST handle 1000 concurrent users without performance degradation
- **FR-IF-003**: System MUST complete deployments with zero dropped requests
- **FR-IF-004**: System MUST alert on-call engineer within 1 minute of critical failure
- **FR-IF-005**: System MUST perform daily automated database backups at 3am UTC
- **FR-IF-006**: System MUST encrypt all data at rest (AES-256)
- **FR-IF-007**: System MUST encrypt all data in transit (TLS 1.3)
- **FR-IF-008**: System MUST retain logs for 90 days for compliance
- **FR-IF-009**: System MUST auto-scale based on CPU/memory thresholds
- **FR-IF-010**: System MUST recover from AZ failure within 5 minutes (RDS multi-AZ)

### Key Entities

- **Deployment**: Version number, environment (staging/prod), status, deployed by, timestamp, rollback available
- **Health Check**: Service name, endpoint, status (healthy/unhealthy), last check time, consecutive failures
- **Alert**: Severity (critical/warning/info), metric, threshold, current value, triggered at
- **Backup**: Backup ID, database name, size, timestamp, S3 location, retention expires at

### Success Criteria

- **SC-IF-001**: 99.9% uptime measured monthly (< 43 minutes downtime/month)
- **SC-IF-002**: Deployment frequency of 2+ per week with zero rollbacks
- **SC-IF-003**: Mean time to recovery (MTTR) under 30 minutes for any outage
- **SC-IF-004**: Database restore completes within 60 minutes for any backup
- **SC-IF-005**: Auto-scaling handles 10x traffic spike (100 → 1000 users) without manual intervention

---

## Security & Compliance

### OWASP Top 10 Compliance

#### A01:2021 - Broken Access Control
- **Mitigation**: RBAC implemented, all endpoints require authentication, salon data isolation verified
- **Testing**: Automated tests verify users cannot access other salons' data

#### A02:2021 - Cryptographic Failures
- **Mitigation**: TLS 1.3 for all traffic, AES-256 for data at rest, secrets in AWS Secrets Manager
- **Testing**: SSL Labs A+ rating, no plaintext sensitive data in logs

#### A03:2021 - Injection
- **Mitigation**: Parameterized queries (Prisma ORM), input validation (Zod), output encoding
- **Testing**: SQL injection test suite, SAST scan with Semgrep

#### A04:2021 - Insecure Design
- **Mitigation**: Threat modeling completed, security architecture review by external auditor
- **Testing**: Penetration test annually

#### A05:2021 - Security Misconfiguration
- **Mitigation**: Hardened Docker images, security headers configured, dependency updates automated
- **Testing**: Weekly Snyk scans, automated security patching

#### A06:2021 - Vulnerable Components
- **Mitigation**: Automated dependency scanning (npm audit, Snyk), update policy (patch within 7 days)
- **Testing**: CI/CD blocks builds with high/critical vulnerabilities

#### A07:2021 - Identification & Authentication Failures
- **Mitigation**: JWT with short expiry (15 min access, 7 day refresh), password complexity enforced, rate limiting on auth endpoints
- **Testing**: Brute force protection verified, session fixation tests

#### A08:2021 - Software & Data Integrity Failures
- **Mitigation**: Webhook signature verification, artifact signing in CI/CD, immutable Docker tags
- **Testing**: Signature validation tests, supply chain security audit

#### A09:2021 - Security Logging & Monitoring Failures
- **Mitigation**: All auth events logged, centralized logging (CloudWatch), real-time alerting
- **Testing**: Log injection tests, alert verification

#### A10:2021 - Server-Side Request Forgery (SSRF)
- **Mitigation**: URL allowlist for external requests, network segmentation, no user-controlled URLs
- **Testing**: SSRF test cases in security suite

### GDPR Compliance

- **Right to Access**: Users can export all their data via dashboard
- **Right to Deletion**: Account deletion removes all personal data within 30 days
- **Data Minimization**: Only collect necessary data (no unnecessary PII)
- **Consent**: Explicit consent required for marketing messages
- **Data Protection Officer**: Designated DPO for privacy inquiries
- **Breach Notification**: 72-hour notification process documented

### WhatsApp Business API Compliance

- **Message Templates**: All marketing messages use approved templates
- **Opt-in Required**: Customers must initiate conversation or explicitly opt-in
- **Opt-out Supported**: "STOP" command cancels subscription
- **Rate Limits**: 80 messages/second per phone number enforced
- **24-Hour Window**: Automated messages only within 24h of customer message
- **Quality Rating**: Monitor messaging quality score (must stay above "Medium")

---

## Performance Requirements

### Response Time Targets

| Operation | Target (p95) | Target (p99) | Max Acceptable |
|-----------|--------------|--------------|----------------|
| API Endpoint (read) | < 100ms | < 200ms | 500ms |
| API Endpoint (write) | < 200ms | < 500ms | 1000ms |
| Dashboard page load | < 2s | < 3s | 5s |
| WhatsApp message processing | < 3s | < 5s | 10s |
| AI response generation (cached) | < 500ms | < 1s | 2s |
| AI response generation (uncached) | < 2s | < 5s | 10s |
| Database query | < 50ms | < 100ms | 200ms |
| Booking creation | < 1s | < 2s | 5s |

### Throughput Requirements

| Metric | Requirement |
|--------|-------------|
| Concurrent users | 1,000 minimum, 10,000 target |
| Requests per second | 500 minimum, 2,000 target |
| Messages per hour | 10,000 minimum, 50,000 target |
| Database connections | 100 concurrent minimum |
| Cache hit rate | 90%+ for AI responses |

### Scalability Targets

**Year 1**:
- 1,000 active salons
- 50,000 bookings/month
- 500,000 WhatsApp messages/month

**Year 2**:
- 5,000 active salons
- 250,000 bookings/month
- 2,500,000 WhatsApp messages/month

**Year 3**:
- 15,000 active salons
- 750,000 bookings/month
- 10,000,000 WhatsApp messages/month

---

## Data Model (High-Level)

### Core Entities

**User**
- ID, email, password hash, first name, last name, phone
- Role (SUPER_ADMIN, SALON_OWNER, MASTER)
- Created at, updated at, last login

**Salon**
- ID, owner ID, name, phone, address, city, country
- WhatsApp Business Account ID, phone number ID
- Subscription plan, status (trial/active/cancelled)
- Created at, updated at

**Master**
- ID, salon ID, user ID (optional), name, phone, email
- Specialties (array), bio, photo URL
- Status (active/inactive), created at

**Service**
- ID, salon ID, name, description, duration (minutes), price
- Category, available days, created at

**Booking**
- ID, salon ID, master ID, service ID
- Customer name, customer phone, appointment date/time
- Status (pending/confirmed/cancelled/completed/no_show)
- Notes, created at, updated at

**Message**
- ID, salon ID, direction (inbound/outbound)
- Phone from, phone to, content, type (text/image/template)
- Status (sent/delivered/read/failed), timestamp

**Reminder**
- ID, booking ID, scheduled time, sent time
- Status (pending/sent/failed), retry count
- Customer response, response time

**Subscription**
- ID, salon ID, plan type, status
- Stripe subscription ID, current period start/end
- Cancel at period end, created at

**Payment**
- ID, subscription ID, amount, currency
- Status (succeeded/failed/pending), paid at
- Stripe payment intent ID, invoice URL

---

## Technical Constraints & Assumptions

### Constraints

1. **WhatsApp Business API Limits**
   - 80 messages/second per phone number
   - 24-hour messaging window for automated messages
   - Template approval required (2-7 day review)

2. **Stripe Payment Processing**
   - 2.9% + 30¢ per transaction (US)
   - Different rates for international cards
   - Payout delays (2-7 days)

3. **AWS Regional Availability**
   - Primary region: eu-central-1 (Frankfurt) for Russian market proximity
   - Backup region: eu-west-1 (Ireland)

4. **OpenAI API Costs**
   - GPT-3.5-turbo: $0.0015/1K tokens input, $0.002/1K tokens output
   - Caching critical for cost control

### Assumptions

1. **User Behavior**
   - Average salon receives 10-30 bookings/day
   - 60% of customers use WhatsApp for communication
   - 80% of booking requests are during business hours

2. **Business Model**
   - Free trial converts at 70% rate
   - Average customer lifetime: 18 months
   - Monthly churn: 5%
   - Customer acquisition cost: $50/salon

3. **Technical**
   - 90%+ users access from mobile devices
   - Average message length: 50-100 characters
   - AI response cache hit rate: 90% after 30 days
   - Database growth: 1GB/month per 100 active salons

---

## Success Metrics (KPIs)

### Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active salons | 1,000 in 12 months | Monthly active users |
| Booking automation rate | 80% | Automated bookings / total bookings |
| Customer satisfaction | 4.5/5 stars | NPS survey |
| No-show reduction | 40% decrease | Before vs after reminders |
| Trial conversion rate | 70% | Paid subscriptions / trials started |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| System uptime | 99.9% | Monthly uptime percentage |
| API latency (p95) | < 200ms | CloudWatch metrics |
| Error rate | < 0.1% | Failed requests / total requests |
| Cache hit rate | 90%+ | Cache hits / total cache lookups |
| Deployment frequency | 2+ per week | GitHub Actions runs |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Recurring Revenue (MRR) | $50,000 in 12 months | Sum of active subscriptions |
| Customer Lifetime Value (LTV) | $900 | Average revenue per customer lifetime |
| Churn rate | < 5% monthly | Cancelled subscriptions / active subscriptions |
| Customer acquisition cost (CAC) | < $50 | Marketing spend / new customers |
| LTV:CAC ratio | 18:1 | LTV / CAC |

---

## Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WhatsApp API changes breaking integration | Medium | High | Webhook versioning, automated tests, fallback to manual booking |
| Database performance degradation at scale | Low | High | Query optimization, read replicas, caching strategy |
| OpenAI API costs exceeding budget | Medium | Medium | Aggressive caching, rate limiting, alternative models (Llama) |
| Security breach exposing customer data | Low | Critical | Penetration testing, bug bounty, encryption, compliance audits |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low trial conversion rate | Medium | High | Onboarding optimization, feature demos, customer success outreach |
| High churn due to product complexity | Medium | Medium | UX improvements, in-app tutorials, support chatbot |
| Competitors launching similar product | High | Medium | Faster feature velocity, unique value props (AI quality) |
| WhatsApp Business API pricing increase | Low | High | Multi-channel support (SMS, Telegram), price increase for customers |

---

## Open Questions & Clarifications Needed

1. **Multi-location Support**: Should Enterprise plan support salon chains with multiple physical locations under one subscription?
   - **Suggested Answer A**: Yes, each location gets separate WhatsApp number and calendar
   - **Suggested Answer B**: No, each location requires separate subscription
   - **Impact**: Changes data model (Location entity), billing logic, UI navigation

2. **Language Support Priority**: Which languages should be supported at launch?
   - **Suggested Answer A**: Russian only (core market)
   - **Suggested Answer B**: Russian + English (broader appeal)
   - **Suggested Answer C**: Russian + English + Ukrainian + Kazakh (CIS focus)
   - **Impact**: Translation effort, AI training data, support costs

3. **Payment Provider**: Stripe vs local Russian payment providers?
   - **Suggested Answer A**: Stripe (international standard, easy integration)
   - **Suggested Answer B**: Yookassa/CloudPayments (local, better for Russian market)
   - **Suggested Answer C**: Both (Stripe for international, Yookassa for Russia)
   - **Impact**: Integration complexity, transaction fees, customer trust

---

## Appendices

### A. Technology Stack Summary

**Backend**:
- NestJS (Node.js framework)
- TypeScript
- PostgreSQL (Prisma ORM)
- Redis (ioredis)
- Bull (job queues)
- WhatsApp Business API (Meta)
- OpenAI API (GPT-3.5-turbo)

**Frontend**:
- Next.js 14 (React framework)
- TypeScript
- TailwindCSS + shadcn/ui
- React Query (data fetching)
- Zustand (state management)

**Infrastructure**:
- AWS (RDS, ElastiCache, EC2, ALB, S3, CloudWatch)
- Docker (containerization)
- GitHub Actions (CI/CD)
- Prometheus + Grafana (monitoring)

**Testing**:
- Jest (unit/integration tests)
- Playwright (E2E tests)
- Supertest (API testing)

### B. Glossary

- **Master**: Beauty professional (manicurist, hairstylist, etc.) who provides services
- **Salon**: Beauty salon business subscribing to the platform
- **Booking**: Appointment reservation for a specific service, master, and time
- **Multi-tenant**: Architecture where one instance serves multiple customers (salons) with data isolation
- **WhatsApp Template**: Pre-approved message format required for automated marketing messages
- **Webhook**: HTTP callback that WhatsApp uses to send events to the platform
- **Cache hit rate**: Percentage of requests served from cache vs requiring API call

### C. External Dependencies

1. **WhatsApp Business API** - Meta
   - Purpose: Send/receive WhatsApp messages
   - Criticality: Critical - core functionality
   - SLA: Not publicly available
   - Fallback: Manual booking via web dashboard

2. **OpenAI API** - OpenAI
   - Purpose: Generate conversational responses
   - Criticality: High - core value prop
   - SLA: 99.9% uptime (Enterprise)
   - Fallback: Template-based responses

3. **Stripe** - Stripe Inc.
   - Purpose: Payment processing
   - Criticality: Critical - revenue collection
   - SLA: 99.99% uptime
   - Fallback: Manual invoicing

4. **AWS** - Amazon Web Services
   - Purpose: Infrastructure hosting
   - Criticality: Critical - entire platform
   - SLA: 99.99% for EC2, RDS (Multi-AZ)
   - Fallback: Multi-region deployment plan

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Next Review**: 2025-11-24
**Owner**: Product Team

---

## Approval Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | [TODO] | ________ | __/__/____ |
| Technical Lead | [TODO] | ________ | __/__/____ |
| Business Owner | [TODO] | ________ | __/__/____ |
