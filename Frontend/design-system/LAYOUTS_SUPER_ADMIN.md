# Super Admin Dashboard - Page Layouts

**Version:** 1.0.0
**Last Updated:** January 18, 2025
**Target Users:** Platform administrators and system operators

This document provides detailed page layout specifications for the Super Admin Dashboard interface.

---

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Salons Management](#salons-management)
3. [Platform Analytics](#platform-analytics)
4. [System Monitoring](#system-monitoring)
5. [User Management](#user-management)
6. [Audit Logs](#audit-logs)

---

## Layout Structure

Super Admin dashboard uses a similar structure to Salon Admin but with platform-wide views:

```
┌────────────────────────────────────────────────────────────┐
│  Sidebar (256px)  │         Main Content Area              │
│                   │                                        │
│   [Logo]          │  ┌──────────────────────────────────┐ │
│   SUPER ADMIN     │  │  Header (64px)                   │ │
│                   │  │  [Breadcrumbs] [Search] [Admin]  │ │
│   Navigation:     │  └──────────────────────────────────┘ │
│   • Dashboard     │                                        │
│   • Salons        │  ┌──────────────────────────────────┐ │
│   • Analytics     │  │                                  │ │
│   • Monitoring    │  │  Page Content                    │ │
│   • Users         │  │                                  │ │
│   • Audit Logs    │  │                                  │ │
│   • Settings      │  │                                  │ │
│                   │  │                                  │ │
│   [Admin Profile] │  │                                  │ │
│   [Logout]        │  │                                  │ │
└────────────────────────────────────────────────────────────┘
```

### Color Theme

Super Admin dashboard uses a distinct color scheme to differentiate from Salon Admin:

- **Primary:** Teal (`--color-secondary-500: #128C7E`)
- **Accent:** Deep Blue (`--color-info-600: #2563EB`)
- **Sidebar:** Darker background to emphasize admin nature

---

## Dashboard Overview

**Route:** `/admin/dashboard`
**Purpose:** Platform-wide overview with key metrics across all salons

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / Dashboard                         [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: Platform Dashboard                                 │
│ Subtitle: Overview of all salons and system performance        │
│                                   [Refresh Data] [Last: 2m ago] │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Platform Statistics (5 cards)                                    │
│                                                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐  │
│ │ Active │ │ Total  │ │ Total  │ │ Total  │ │ System       │  │
│ │ Salons │ │ Users  │ │ Booking│ │ Message│ │ Health       │  │
│ │        │ │        │ │        │ │        │ │              │  │
│ │ 47     │ │ 152    │ │ 12,847 │ │ 89,542 │ │ 99.8% ✓      │  │
│ │ ↑ 3    │ │ ↑ 8    │ │ ↑ 1.2K │ │ ↑ 12K  │ │ All Systems  │  │
│ │ this mo│ │ this mo│ │ this mo│ │ this mo│ │ Operational  │  │
│ └────────┘ └────────┘ └────────┘ └────────┘ └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Two-Column Layout (Main: 2/3, Sidebar: 1/3)                     │
│                                                                  │
│ ┌────────────────────────────────────┐ ┌───────────────────┐   │
│ │ Platform Activity (Last 7 Days)    │ │ Quick Actions     │   │
│ │                                    │ │                   │   │
│ │ [Line Chart: Multi-series]         │ │ [+ Add New Salon]│   │
│ │                                    │ │ [View All Users] │   │
│ │     300│            ●               │ │ [Refresh Secrets]│   │
│ │        │       ●  ●   ●             │ │ [Export Report]  │   │
│ │     200│    ●           ●           │ │                   │   │
│ │        │  ●               ●         │ │ System Status     │   │
│ │     100│●                   ●       │ │ API: ● Online    │   │
│ │        │                     ●      │ │ Database: ● OK   │   │
│ │       0└─────────────────────────── │ │ Redis: ● OK      │   │
│ │         M  T  W  T  F  S  S         │ │ Webhooks: ● OK   │   │
│ │                                    │ │                   │   │
│ │ ● Bookings ● Messages ● API Calls  │ │ Version: 1.0.0   │   │
│ └────────────────────────────────────┘ │ Uptime: 99.8%    │   │
│                                        └───────────────────┘   │
│ ┌────────────────────────────────────┐                         │
│ │ Top Performing Salons              │ ┌───────────────────┐   │
│ │                                    │ │ Recent Activity   │   │
│ │ 1. Hair Studio Downtown            │ │                   │   │
│ │    1,247 bookings | 98% confirm    │ │ 2m ago           │   │
│ │    4.9/5.0 ⭐                       │ │ New salon added: │   │
│ │                                    │ │ "Spa Relax"      │   │
│ │ 2. Beauty Center Plus              │ │                   │   │
│ │    1,089 bookings | 95% confirm    │ │ 15m ago          │   │
│ │    4.8/5.0 ⭐                       │ │ User created     │   │
│ │                                    │ │ for Salon #42    │   │
│ │ 3. Elite Salon & Spa               │ │                   │   │
│ │    987 bookings | 92% confirm      │ │ 1h ago           │   │
│ │    4.7/5.0 ⭐                       │ │ Secrets refreshed│   │
│ │                                    │ │                   │   │
│ │ [View All Salons →]                │ │ [View All →]     │   │
│ └────────────────────────────────────┘ └───────────────────┘   │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Infrastructure Metrics                                     │ │
│ │                                                            │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│ │ │ API Req/ │ │ Database │ │ Redis    │ │ Avg Response │  │ │
│ │ │ Minute   │ │ Queries/s│ │ Ops/s    │ │ Time         │  │ │
│ │ │          │ │          │ │          │ │              │  │ │
│ │ │ 487      │ │ 1,247    │ │ 3,542    │ │ 127ms        │  │ │
│ │ │ ↓ 5%     │ │ ↑ 12%    │ │ ↑ 8%     │ │ ↓ 15ms       │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│ └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Data Sources

- Platform stats: `GET /admin/stats/platform` (custom endpoint)
- Active salons: `GET /admin/salons?is_active=true`
- System health: `GET /healthz` + `GET /metrics/database`
- Activity log: Custom aggregation from audit logs

---

## Salons Management

**Route:** `/admin/salons`
**Purpose:** Manage all salons on the platform (create, update, deactivate)

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / Salons                            [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: Salons Management                                  │
│ Subtitle: Manage all salons registered on the platform         │
│                                       [+ Create New Salon]      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Summary Cards                                                   │
│                                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│ │ Total    │ │ Active   │ │ Inactive │ │ Added This Month │   │
│ │ Salons   │ │ Salons   │ │ Salons   │ │                  │   │
│ │          │ │          │ │          │ │                  │   │
│ │ 50       │ │ 47       │ │ 3        │ │ 3                │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Filters & Search                                                │
│                                                                 │
│ [Search by salon name, phone, ID...]                           │
│                                                                 │
│ Status: [All ▼]  Date Added: [All Time ▼]  Sort: [Name ▼]     │
│                                          [Clear Filters]        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Salons Table                                                    │
│                                                                 │
│ ┌────┬──────────────┬─────────────┬────────┬───────┬─────────┐│
│ │ ID │ Salon Name   │ Phone       │Created │Status │Actions  ││
│ ├────┼──────────────┼─────────────┼────────┼───────┼─────────┤│
│ │a1b2│Hair Studio   │+5511999988..│Jan 10  │●Active│[View]   ││
│ │c3d4│Downtown      │             │2025    │       │[Edit]   ││
│ │    │              │             │        │       │[Disable]││
│ │    │1,247 bookings│             │        │       │         ││
│ ├────┼──────────────┼─────────────┼────────┼───────┼─────────┤│
│ │e5f6│Beauty Center │+5511888877..│Jan 08  │●Active│[View]   ││
│ │g7h8│Plus          │             │2025    │       │[Edit]   ││
│ │    │              │             │        │       │[Disable]││
│ │    │1,089 bookings│             │        │       │         ││
│ ├────┼──────────────┼─────────────┼────────┼───────┼─────────┤│
│ │i9j0│Elite Salon   │+5511777766..│Jan 05  │●Active│[View]   ││
│ │k1l2│& Spa         │             │2025    │       │[Edit]   ││
│ │    │              │             │        │       │[Disable]││
│ │    │987 bookings  │             │        │       │         ││
│ ├────┼──────────────┼─────────────┼────────┼───────┼─────────┤│
│ │m3n4│Old Salon     │+5511666655..│Dec 20  │○Inact.│[View]   ││
│ │o5p6│(Closed)      │             │2024    │       │[Enable] ││
│ │    │              │             │        │       │[Delete] ││
│ │    │543 bookings  │             │        │       │         ││
│ └────┴──────────────┴─────────────┴────────┴───────┴─────────┘│
│                                                                 │
│ Showing 1-10 of 50 salons                                      │
│                                     [< Prev] [1] [2] [3] [Next>]│
└─────────────────────────────────────────────────────────────────┘
```

### Create/Edit Salon Modal

```
┌──────────────────────────────────────────────┐
│ Create New Salon                        [×]  │
├──────────────────────────────────────────────┤
│                                              │
│ Salon Information                            │
│                                              │
│ Salon Name *                                 │
│ [_____________________________________]      │
│                                              │
│ WhatsApp Business Configuration              │
│                                              │
│ Phone Number ID *                            │
│ [_____________________________________] [?]  │
│ Get from Meta Business Manager               │
│                                              │
│ Business Account ID                          │
│ [_____________________________________] [?]  │
│                                              │
│ Access Token *                               │
│ [_____________________________________] [?]  │
│ Long-lived access token from Meta            │
│                                              │
│ Owner/Contact Information                    │
│                                              │
│ Owner Name                                   │
│ [_____________________________________]      │
│                                              │
│ Contact Email                                │
│ [_____________________________________]      │
│                                              │
│ Contact Phone                                │
│ [_____________________________________]      │
│                                              │
│ Status                                       │
│ [●] Active  [ ] Inactive                     │
│                                              │
│ [Test Connection]                            │
│                                              │
├──────────────────────────────────────────────┤
│                         [Cancel] [Create]    │
└──────────────────────────────────────────────┘
```

### Salon Detail View

When clicking [View] on a salon:

```
┌─────────────────────────────────────────────────────────────────┐
│ Salon Details: Hair Studio Downtown                       [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Overview] [Statistics] [Messages] [Configuration] [Logs]      │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Overview Tab                                               │ │
│ │                                                            │ │
│ │ Salon ID: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d            │ │
│ │ Created: January 10, 2025                                  │ │
│ │ Last Active: 2 minutes ago                                 │ │
│ │ Status: ● Active                                           │ │
│ │                                                            │ │
│ │ WhatsApp Integration                                       │ │
│ │ Phone Number ID: 123456789012345                           │ │
│ │ Connection Status: ✓ Connected                             │ │
│ │ Last Verified: 2 minutes ago                               │ │
│ │                                                            │ │
│ │ Performance Metrics (Last 30 Days)                         │ │
│ │                                                            │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│ │ │ Total    │ │ Confirm. │ │ Messages │ │ AI Success   │  │ │
│ │ │ Bookings │ │ Rate     │ │ Handled  │ │ Rate         │  │ │
│ │ │          │ │          │ │          │ │              │  │ │
│ │ │ 1,247    │ │ 87%      │ │ 3,542    │ │ 94%          │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│ │                                                            │ │
│ │ Owner Information                                          │ │
│ │ Name: João Silva                                           │ │
│ │ Email: joao@hairstudio.com                                 │ │
│ │ Phone: +55 11 3333-4444                                    │ │
│ │                                                            │ │
│ │ Actions                                                    │ │
│ │ [Edit Configuration] [Refresh Access Token]                │ │
│ │ [View Full Logs] [Disable Salon]                           │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources

- Salons list: `GET /admin/salons`
- Create salon: `POST /admin/salons`
- Salon details: `GET /admin/salons/:salonId` + `GET /admin/stats/:salonId`

---

## Platform Analytics

**Route:** `/admin/analytics`
**Purpose:** Platform-wide analytics and insights

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / Analytics                         [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: Platform Analytics                                 │
│ Subtitle: Comprehensive insights across all salons             │
│                                                                 │
│ Date Range: [Last 30 Days ▼]            [Export Full Report ↓] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tabs Navigation                                                 │
│ [Growth] [Performance] [AI Insights] [Revenue] [Infrastructure] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Growth Tab                                                      │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Platform Growth Metrics                                    │ │
│ │                                                            │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│ │ │ New      │ │ New      │ │ Total    │ │ Growth Rate  │  │ │
│ │ │ Salons   │ │ Users    │ │ Bookings │ │              │  │ │
│ │ │          │ │          │ │          │ │              │  │ │
│ │ │ 3        │ │ 8        │ │ 1,247    │ │ +18.5%       │  │ │
│ │ │ ↑ vs 2   │ │ ↑ vs 5   │ │ ↑ vs 987 │ │ MoM          │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Salon Growth Over Time (Line Chart)                        │ │
│ │                                                            │ │
│ │    50│                                           ●        │ │
│ │      │                                      ●             │ │
│ │    40│                                 ●                  │ │
│ │      │                            ●                       │ │
│ │    30│                       ●                            │ │
│ │      │                  ●                                 │ │
│ │    20│             ●                                      │ │
│ │      │        ●                                           │ │
│ │    10│   ●                                                │ │
│ │      │                                                    │ │
│ │     0└─────────────────────────────────────────────────  │ │
│ │       Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec    │ │
│ │                                                            │ │
│ │ Total Salons: 47 | Projected EOY: 62                       │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌───────────────────────┐ ┌──────────────────────────────────┐│
│ │ User Growth by Region │ │ Salon Distribution by Category   ││
│ │                       │ │                                  ││
│ │ [Map Visualization]   │ │ [Pie Chart]                      ││
│ │                       │ │                                  ││
│ │ São Paulo: 28 salons  │ │ Hair Salon: 45%                  ││
│ │ Rio de Janeiro: 12    │ │ Spa: 25%                         ││
│ │ Belo Horizonte: 7     │ │ Barber Shop: 20%                 ││
│ │ Other: 3              │ │ Beauty Center: 10%               ││
│ └───────────────────────┘ └──────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AI Insights Tab                                                 │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Platform-Wide AI Performance                               │ │
│ │                                                            │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│ │ │ Total    │ │ Avg      │ │ Booking  │ │ Avg Response │  │ │
│ │ │ Messages │ │ Intent   │ │ Creation │ │ Time         │  │ │
│ │ │ Processed│ │ Accuracy │ │ Success  │ │              │  │ │
│ │ │          │ │          │ │          │ │              │  │ │
│ │ │ 89,542   │ │ 93.8%    │ │ 86.2%    │ │ 2.4s         │  │ │
│ │ │ ↑ 12,487 │ │ ↑ 1.2%   │ │ ↑ 3.1%   │ │ ↓ 0.3s       │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Intent Distribution Across All Salons (Pie Chart)          │ │
│ │                                                            │ │
│ │        New Booking: 42% (37,608 messages)                  │ │
│ │        Check Status: 24% (21,490 messages)                 │ │
│ │        Cancel Booking: 16% (14,327 messages)               │ │
│ │        Reschedule: 11% (9,850 messages)                    │ │
│ │        General Inquiry: 7% (6,267 messages)                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Salons by AI Performance (Table)                           │ │
│ │                                                            │ │
│ │ Top Performers:                                            │ │
│ │ 1. Hair Studio Downtown - 98% accuracy, 95% success        │ │
│ │ 2. Beauty Center Plus - 97% accuracy, 93% success          │ │
│ │ 3. Elite Salon & Spa - 96% accuracy, 92% success           │ │
│ │                                                            │ │
│ │ Needs Attention:                                           │ │
│ │ 1. Small Salon ABC - 78% accuracy, 65% success             │ │
│ │ 2. Budget Cuts XYZ - 82% accuracy, 72% success             │ │
│ │                                                            │ │
│ │ [View Full Report]                                         │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Infrastructure Tab                                              │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ System Resource Usage                                      │ │
│ │                                                            │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│ │ │ API      │ │ Database │ │ Redis    │ │ Storage      │  │ │
│ │ │ Requests │ │ Load     │ │ Memory   │ │ Used         │  │ │
│ │ │          │ │          │ │          │ │              │  │ │
│ │ │ 487/min  │ │ 42%      │ │ 1.2 GB   │ │ 47.3 GB      │  │ │
│ │ │ Normal   │ │ Healthy  │ │ / 4 GB   │ │ / 500 GB     │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ API Response Times (Last 24 Hours)                         │ │
│ │                                                            │ │
│ │ [Line Chart showing P50, P95, P99 latencies]               │ │
│ │                                                            │ │
│ │ P50: 87ms | P95: 247ms | P99: 512ms                        │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Error Rates by Service                                     │ │
│ │                                                            │ │
│ │ API Endpoints: 0.08% (23 errors / 28,742 requests)         │ │
│ │ Webhooks: 0.12% (15 errors / 12,487 requests)              │ │
│ │ Database: 0.01% (2 errors / 15,942 queries)                │ │
│ │ AI Service: 0.23% (87 errors / 37,842 calls)               │ │
│ │                                                            │ │
│ │ [View Error Details]                                       │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources

- Platform aggregations: Custom analytics endpoints
- AI metrics: `GET /admin/ai/analytics/platform` (custom endpoint)
- Infrastructure: `GET /metrics` (Prometheus endpoint)
- Growth data: Historical aggregations from database

---

## System Monitoring

**Route:** `/admin/monitoring`
**Purpose:** Real-time system health monitoring and alerts

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / System Monitoring                 [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: System Monitoring                                  │
│ Subtitle: Real-time health and performance monitoring          │
│                                        [Auto-refresh: ON] [30s] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ System Status Overview                                          │
│                                                                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│ │ ● All Systems    │ │ ⚠ 2 Warnings     │ │ ✗ 0 Critical    │ │
│ │   Operational    │ │   (Non-critical) │ │   Issues        │ │
│ └──────────────────┘ └──────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Service Health Status                                           │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Service         Status   Uptime   Last Check  Response Time││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ API Server      ● Online 99.98%   5s ago      127ms        ││
│ │ Database (RDS)  ● Online 99.99%   5s ago      12ms         ││
│ │ Redis Cache     ● Online 99.97%   5s ago      3ms          ││
│ │ Webhook Handler ● Online 99.95%   5s ago      89ms         ││
│ │ AI Service      ⚠ Warn   99.82%   5s ago      2,847ms ⚠    ││
│ │ Meta Platform   ● Online 99.99%   10s ago     342ms        ││
│ │ AWS S3          ● Online 99.99%   15s ago     87ms         ││
│ │ CloudWatch      ● Online 100.0%   30s ago     45ms         ││
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Resource Utilization                                            │
│                                                                 │
│ ┌──────────────────────────┐ ┌──────────────────────────────┐ │
│ │ CPU Usage (%)            │ │ Memory Usage (GB)            │ │
│ │                          │ │                              │ │
│ │ [Real-time Line Chart]   │ │ [Real-time Line Chart]       │ │
│ │                          │ │                              │ │
│ │ Current: 42%             │ │ Current: 3.2 GB / 8 GB (40%) │ │
│ │ Avg (1h): 38%            │ │ Avg (1h): 2.8 GB             │ │
│ │ Peak (24h): 68%          │ │ Peak (24h): 4.1 GB           │ │
│ └──────────────────────────┘ └──────────────────────────────┘ │
│                                                                 │
│ ┌──────────────────────────┐ ┌──────────────────────────────┐ │
│ │ Network I/O (MB/s)       │ │ Disk I/O (MB/s)              │ │
│ │                          │ │                              │ │
│ │ [Real-time Line Chart]   │ │ [Real-time Line Chart]       │ │
│ │                          │ │                              │ │
│ │ In: 12.4 MB/s            │ │ Read: 3.2 MB/s               │ │
│ │ Out: 8.7 MB/s            │ │ Write: 1.8 MB/s              │ │
│ └──────────────────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Recent Alerts & Events                                          │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Timestamp    Severity  Service      Message                ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 2m ago       ⚠ Warning AI Service    High latency: 2.8s   ││
│ │              Response time exceeded threshold (2.5s)       ││
│ │              [View Details] [Mark Resolved]                ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 15m ago      ℹ Info    Database     Slow query detected   ││
│ │              Query took 487ms - Consider indexing          ││
│ │              [View Query] [Mark Resolved]                  ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 1h ago       ✓ Resolved API Server   Rate limit triggered ││
│ │              IP: 203.0.113.42 exceeded 100 req/min         ││
│ │              [View Logs]                                   ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 2h ago       ✓ Resolved Redis Cache  Memory usage: 82%    ││
│ │              Auto-scaled, now at 45%                       ││
│ │              [View Details]                                ││
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [View All Alerts] [Configure Alert Rules]                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Quick Actions                                                   │
│                                                                 │
│ [Refresh All Secrets]  [Restart Service]  [Clear Cache]        │
│ [Export Logs]          [Run Health Check] [View Documentation] │
└─────────────────────────────────────────────────────────────────┘
```

### Data Sources

- Health checks: `GET /healthz`
- Metrics: `GET /metrics` and `GET /metrics/database`
- AWS CloudWatch: Custom integration for infrastructure metrics
- Alerts: Custom alerting system or integration with monitoring service

---

## User Management

**Route:** `/admin/users`
**Purpose:** Manage platform users (salon owners, admins)

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / Users                             [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: User Management                                    │
│ Subtitle: Manage all platform users and permissions            │
│                                       [+ Create New User]       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Filters & Search                                                │
│                                                                 │
│ [Search by name, email, salon...]                              │
│                                                                 │
│ Role: [All ▼]  Status: [Active ▼]  Salon: [All ▼]             │
│                                          [Clear Filters]        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Users Table                                                     │
│                                                                 │
│ ┌────┬──────────┬──────────────┬────────────┬──────┬─────────┐│
│ │ ID │ Name     │ Email        │ Salon      │Role  │Actions  ││
│ ├────┼──────────┼──────────────┼────────────┼──────┼─────────┤│
│ │a1b2│João Silva│joao@hair..   │Hair Studio │Owner │[View]   ││
│ │    │●Active   │              │Downtown    │      │[Edit]   ││
│ │    │Jan 10/25 │              │            │      │[Disable]││
│ ├────┼──────────┼──────────────┼────────────┼──────┼─────────┤│
│ │c3d4│Maria    │maria@beauty..│Beauty      │Owner │[View]   ││
│ │    │Santos    │              │Center Plus │      │[Edit]   ││
│ │    │●Active   │              │            │      │[Disable]││
│ │    │Jan 08/25 │              │            │      │         ││
│ ├────┼──────────┼──────────────┼────────────┼──────┼─────────┤│
│ │e5f6│Carlos    │carlos@elite..│Elite Salon │Owner │[View]   ││
│ │    │Lima      │              │& Spa       │      │[Edit]   ││
│ │    │●Active   │              │            │      │[Disable]││
│ │    │Jan 05/25 │              │            │      │         ││
│ ├────┼──────────┼──────────────┼────────────┼──────┼─────────┤│
│ │g7h8│Ana Costa │ana@admin..   │(Platform)  │Admin │[View]   ││
│ │    │●Active   │              │            │      │[Edit]   ││
│ │    │Dec 01/24 │              │            │      │[Revoke] ││
│ └────┴──────────┴──────────────┴────────────┴──────┴─────────┘│
│                                                                 │
│ Showing 1-10 of 152 users                                      │
│                                     [< Prev] [1] [2] [3] [Next>]│
└─────────────────────────────────────────────────────────────────┘
```

### Create User Modal

```
┌──────────────────────────────────────────────┐
│ Create New User                         [×]  │
├──────────────────────────────────────────────┤
│                                              │
│ User Information                             │
│                                              │
│ Full Name *                                  │
│ [_____________________________________]      │
│                                              │
│ Email Address *                              │
│ [_____________________________________]      │
│                                              │
│ Phone Number                                 │
│ [_____________________________________]      │
│                                              │
│ Role *                                       │
│ ( ) Salon Owner                              │
│ ( ) Salon Manager                            │
│ ( ) Platform Admin                           │
│                                              │
│ Associated Salon (if Owner/Manager)          │
│ [Select salon... ▼]                          │
│                                              │
│ Initial Password *                           │
│ [_____________________________________]      │
│ [Generate Strong Password]                   │
│                                              │
│ ☑ Send welcome email with login credentials │
│                                              │
├──────────────────────────────────────────────┤
│                         [Cancel] [Create]    │
└──────────────────────────────────────────────┘
```

---

## Audit Logs

**Route:** `/admin/audit-logs`
**Purpose:** View all platform activity and changes

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ Super Admin / Audit Logs                        [Search] [User] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page Title: Audit Logs                                         │
│ Subtitle: Complete activity log for compliance and debugging   │
│                                       [Export Logs ↓]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Filters                                                         │
│                                                                 │
│ Date Range: [Last 7 Days ▼]                                    │
│ Event Type: [All ▼]  User: [All ▼]  Salon: [All ▼]            │
│ Severity: [All ▼]                                              │
│                                          [Clear Filters]        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Audit Log Entries                                               │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 2m ago | ℹ INFO | System                                   ││
│ │ Secrets refreshed successfully                             ││
│ │ Actor: admin@platform.com                                  ││
│ │ Details: AWS Secrets Manager sync completed                ││
│ │ [View Full Entry]                                          ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 15m ago | ✓ SUCCESS | Salon                                ││
│ │ New salon created: "Spa Relax"                             ││
│ │ Actor: admin@platform.com                                  ││
│ │ Details: ID=x1y2z3, Phone=+5511888887777                   ││
│ │ [View Full Entry]                                          ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 1h ago | ⚠ WARNING | API                                   ││
│ │ Rate limit exceeded                                        ││
│ │ Actor: 203.0.113.42 (IP)                                   ││
│ │ Details: 150 requests in 1 minute (limit: 100)             ││
│ │ [View Full Entry] [Block IP]                               ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 2h ago | ✓ SUCCESS | User                                  ││
│ │ User login successful                                      ││
│ │ Actor: joao@hairstudio.com                                 ││
│ │ Details: IP=198.51.100.23, Location=São Paulo              ││
│ │ [View Full Entry]                                          ││
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 3h ago | ℹ INFO | Configuration                            ││
│ │ Salon settings updated                                     ││
│ │ Actor: maria@beauty.com                                    ││
│ │ Salon: Beauty Center Plus                                  ││
│ │ Details: Business hours changed                            ││
│ │ [View Full Entry] [Revert Changes]                         ││
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Showing 1-20 of 12,847 entries                                 │
│                                     [< Prev] [1] [2] [3] [Next>]│
└─────────────────────────────────────────────────────────────────┘
```

### Log Entry Detail Modal

```
┌──────────────────────────────────────────────────────────────┐
│ Audit Log Entry Details                                 [×]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Event ID: log-a1b2c3d4-e5f6-7890                             │
│ Timestamp: 2025-01-18 14:35:22 UTC                           │
│                                                              │
│ Event Type: USER_LOGIN                                       │
│ Severity: INFO                                               │
│ Status: SUCCESS                                              │
│                                                              │
│ Actor Information                                            │
│ User: joao@hairstudio.com (João Silva)                       │
│ User ID: user-123456                                         │
│ Salon: Hair Studio Downtown                                  │
│                                                              │
│ Request Details                                              │
│ IP Address: 198.51.100.23                                    │
│ User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...     │
│ Location: São Paulo, Brazil                                  │
│                                                              │
│ Action Details                                               │
│ Endpoint: POST /api/auth/login                               │
│ Method: PASSWORD                                             │
│ Session ID: sess-xyz789                                      │
│                                                              │
│ Metadata (JSON)                                              │
│ {                                                            │
│   "login_method": "password",                                │
│   "remember_me": true,                                       │
│   "two_factor": false,                                       │
│   "device_id": "dev-abc123"                                  │
│ }                                                            │
│                                                              │
│                                          [Export] [Close]    │
└──────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

Super Admin dashboard follows similar responsive patterns as Salon Admin:

- **Mobile:** Sidebar hidden, hamburger menu
- **Tablet:** Collapsible sidebar
- **Desktop:** Full sidebar always visible

---

## Security Features

- **Role-based access control:** Only super admins can access
- **Activity logging:** All actions logged to audit trail
- **Session timeout:** 30 minutes of inactivity
- **Two-factor authentication:** Required for super admin accounts
- **IP whitelist:** Optional restriction to specific IPs

---

**End of Super Admin Dashboard Layouts**
