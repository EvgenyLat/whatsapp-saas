# Database Architecture Diagrams
## WhatsApp SaaS Starter - Visual Infrastructure Guide

---

## Current Architecture (Development)

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Express  │  │  Prisma  │  │  Redis   │              │
│  │  Server  │──│  Client  │──│  Cache   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │   PostgreSQL 15       │
           │   (Single Instance)   │
           │                       │
           │  ❌ No backups        │
           │  ❌ No replication    │
           │  ❌ No monitoring     │
           └───────────────────────┘

ISSUES:
- Single point of failure
- No disaster recovery
- Direct database connections (no pooling)
- Missing performance indexes
```

---

## Recommended Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Tier                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Express  │  │ Express  │  │ Express  │  │ Express  │           │
│  │ Server 1 │  │ Server 2 │  │ Server 3 │  │ Server N │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
         │            │            │            │
         ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Connection Pooling Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │PgBouncer │  │PgBouncer │  │PgBouncer │  │PgBouncer │           │
│  │ :6432    │  │ :6432    │  │ :6432    │  │ :6432    │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
         │                                              │
         │ (Write Traffic)                             │ (Read Traffic)
         ▼                                              ▼
┌──────────────────────┐                    ┌──────────────────────────┐
│  PostgreSQL PRIMARY  │                    │   Read Replica Pool      │
│  ┌────────────────┐  │                    │  ┌────────────────────┐ │
│  │  Read/Write    │  │                    │  │   Replica 1        │ │
│  │  Operations    │  │ Streaming          │  │   (Read Only)      │ │
│  │                │  │ Replication        │  │                    │ │
│  │  Indexes: ✅   │  │ ════════════════>  │  └────────────────────┘ │
│  │  Monitoring: ✅│  │                    │  ┌────────────────────┐ │
│  │  SSL/TLS: ✅   │  │                    │  │   Replica 2        │ │
│  └────────────────┘  │ ════════════════>  │  │   (Read Only)      │ │
│                      │                    │  │                    │ │
│  Port: 5432          │                    │  └────────────────────┘ │
│  Storage: 100GB SSD  │                    │                         │
└──────────────────────┘                    └──────────────────────────┘
         │
         │ WAL Archiving
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Backup & Archive                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Full Backup │  │ Incremental │  │ WAL Archive │                 │
│  │ (Daily 2AM) │  │ (Hourly)    │  │ (Continuous)│                 │
│  │             │  │             │  │             │                 │
│  │ GPG Encrypt │  │ GPG Encrypt │  │ Compressed  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                 │                 │                        │
│         └─────────────────┴─────────────────┘                        │
│                           ▼                                          │
│                  ┌──────────────────┐                                │
│                  │   S3 Storage     │                                │
│                  │   (Encrypted)    │                                │
│                  │                  │                                │
│                  │  Retention:      │                                │
│                  │  - Daily: 7d     │                                │
│                  │  - Weekly: 30d   │                                │
│                  │  - Monthly: 365d │                                │
│                  └──────────────────┘                                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      Monitoring & Alerting                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │PostgreSQL  │  │ Prometheus │  │  Grafana   │  │ Alertmanager │  │
│  │ Exporter   │─▶│  Server    │─▶│ Dashboards │◀─│  (Alerts)    │  │
│  │ :9187      │  │  :9090     │  │  :3001     │  │  :9093       │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
│                                                           │           │
│                                                           ▼           │
│                                                  ┌─────────────────┐ │
│                                                  │  Slack/Email    │ │
│                                                  │  PagerDuty      │ │
│                                                  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

KEY FEATURES:
✅ High Availability (3 database nodes)
✅ Automated Backups (RTO < 1hr, RPO < 5min)
✅ Connection Pooling (1,000 concurrent connections)
✅ Read Scaling (2 read replicas)
✅ Comprehensive Monitoring (25+ alerts)
✅ SSL/TLS Encryption
✅ Disaster Recovery Procedures
```

---

## Data Flow Diagrams

### Write Operation Flow
```
User Request (POST /webhook)
         │
         ▼
┌─────────────────────┐
│  Express Server     │
│  - Validates data   │
│  - Security checks  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  PgBouncer Pool     │
│  - Gets connection  │
│  - Transaction mode │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Primary Database   │
│  - Writes data      │
│  - Generates WAL    │
└─────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────┐    ┌─────────────┐
│  Replica 1  │    │  Replica 2  │
│  (Async)    │    │  (Async)    │
└─────────────┘    └─────────────┘
```

### Read Operation Flow (Optimized)
```
User Request (GET /admin/analytics)
         │
         ▼
┌─────────────────────┐
│  Express Server     │
│  - Determines: Read │
│  - Routes to replica│
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  PgBouncer Pool     │
│  - Read replica     │
│  - Connection reuse │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Read Replica       │
│  - Fast indexes     │
│  - Cached data      │
└─────────────────────┘
```

---

## Backup & Recovery Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backup Strategy                               │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Primary    │   WAL   │ WAL Archive  │                     │
│  │   Database   │ ──────▶ │ /var/backups │                     │
│  │              │         │ /wal_archive │                     │
│  └──────────────┘         └──────────────┘                     │
│         │                         │                             │
│         │ Full Backup             │ Continuous                  │
│         │ Daily 2AM               │ Archive                     │
│         ▼                         ▼                             │
│  ┌──────────────────────────────────────┐                      │
│  │         Backup Files                 │                      │
│  │  ┌────────────────────────────────┐  │                      │
│  │  │ whatsapp_saas_full_DATE.sql.gz │  │                      │
│  │  └────────────────────────────────┘  │                      │
│  │                │                      │                      │
│  │                ▼ GPG Encrypt          │                      │
│  │  ┌────────────────────────────────┐  │                      │
│  │  │ whatsapp_saas_full_DATE.gpg    │  │                      │
│  │  └────────────────────────────────┘  │                      │
│  └──────────────────────────────────────┘                      │
│                   │                                             │
│                   ▼ Upload to S3                                │
│  ┌─────────────────────────────────────────────────┐           │
│  │              S3 Bucket Structure                 │           │
│  │  backups/postgresql/                             │           │
│  │    └── 2025/                                     │           │
│  │        └── 10/                                   │           │
│  │            └── 17/                               │           │
│  │                ├── whatsapp_saas_full_*.gpg      │           │
│  │                ├── wal_archive/                  │           │
│  │                │   └── 000000010000000000000001  │           │
│  │                └── metadata.json                 │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Recovery Scenarios                              │
│                                                                  │
│  Scenario 1: Full Database Restore                              │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐         │
│  │Download│ ─▶ │Decrypt │ ─▶ │Restore │ ─▶ │ Verify │         │
│  │from S3 │    │  GPG   │    │pg_rest.│    │  Data  │         │
│  └────────┘    └────────┘    └────────┘    └────────┘         │
│                                                                  │
│  Scenario 2: Point-in-Time Recovery (PITR)                      │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐         │
│  │ Base   │ ─▶ │ Apply  │ ─▶ │Stop at │ ─▶ │ Verify │         │
│  │ Backup │    │  WAL   │    │ Target │    │  Point │         │
│  └────────┘    └────────┘    └────────┘    └────────┘         │
│                                                                  │
│  Scenario 3: Replica Promotion (Failover)                       │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐         │
│  │Primary │ ─▶ │Promote │ ─▶ │Update  │ ─▶ │Rebuild │         │
│  │ Fails  │    │Replica │    │  DNS   │    │Old Prim│         │
│  └────────┘    └────────┘    └────────┘    └────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Metrics Collection                           │
│                                                                  │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │  Primary DB │         │  Replica 1  │                        │
│  │             │         │             │                        │
│  │  Port: 5432 │         │  Port: 5432 │                        │
│  └─────────────┘         └─────────────┘                        │
│         │                        │                               │
│         │                        │                               │
│         ▼                        ▼                               │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │PG Exporter 1│         │PG Exporter 2│                        │
│  │  Port: 9187 │         │  Port: 9188 │                        │
│  └─────────────┘         └─────────────┘                        │
│         │                        │                               │
│         └────────┬───────────────┘                               │
│                  │                                               │
│                  ▼                                               │
│         ┌─────────────────┐                                      │
│         │   Prometheus    │                                      │
│         │   Port: 9090    │                                      │
│         │                 │                                      │
│         │  Scrape: 30s    │                                      │
│         │  Retention: 30d │                                      │
│         └─────────────────┘                                      │
│                  │                                               │
│         ┌────────┴────────┐                                      │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌─────────────┐   ┌─────────────┐                             │
│  │   Grafana   │   │Alertmanager │                             │
│  │ Port: 3001  │   │ Port: 9093  │                             │
│  │             │   │             │                             │
│  │ Dashboards: │   │ Routes to:  │                             │
│  │ - PG Health │   │ - Slack     │                             │
│  │ - App Metr. │   │ - PagerDuty │                             │
│  │ - Replica   │   │ - Email     │                             │
│  └─────────────┘   └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Key Metrics Tracked                           │
│                                                                  │
│  Database Health:                                                │
│  • pg_up (availability)                                          │
│  • pg_stat_database_* (connections, transactions)                │
│  • pg_stat_activity_count (active queries)                       │
│  • pg_database_size_bytes (storage usage)                        │
│                                                                  │
│  Replication:                                                    │
│  • pg_replication_lag (seconds behind primary)                   │
│  • pg_stat_replication_* (replica status)                        │
│  • pg_replication_slots_active (slot health)                     │
│                                                                  │
│  Performance:                                                    │
│  • pg_stat_statements_* (slow queries)                           │
│  • pg_stat_database_blks_hit_ratio (cache hit rate)             │
│  • pg_locks_count (lock contention)                              │
│  • pg_stat_user_tables_* (table bloat)                           │
│                                                                  │
│  Application Metrics:                                            │
│  • bookings_total (by salon, status)                             │
│  • messages_total (by direction, type, status)                   │
│  • ai_conversation_cost (by salon, model)                        │
│  • webhook_events (by type, status)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Network Security                            │
│                                                                  │
│  Internet                                                        │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────┐                                                │
│  │  CloudFlare  │ WAF, DDoS Protection                          │
│  └──────────────┘                                                │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────┐                                                │
│  │   ALB/NLB    │ SSL Termination                               │
│  └──────────────┘                                                │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────┐                    │
│  │            VPC (10.0.0.0/16)            │                    │
│  │                                         │                    │
│  │  ┌────────────────────────────────┐    │                    │
│  │  │  Public Subnet (10.0.1.0/24)   │    │                    │
│  │  │  ┌──────────┐  ┌──────────┐    │    │                    │
│  │  │  │  App 1   │  │  App 2   │    │    │                    │
│  │  │  └──────────┘  └──────────┘    │    │                    │
│  │  └────────────────────────────────┘    │                    │
│  │                │                        │                    │
│  │                ▼                        │                    │
│  │  ┌────────────────────────────────┐    │                    │
│  │  │  Private Subnet (10.0.2.0/24)  │    │                    │
│  │  │  ┌──────────┐  ┌──────────┐    │    │                    │
│  │  │  │PgBouncer │  │PgBouncer │    │    │                    │
│  │  │  └──────────┘  └──────────┘    │    │                    │
│  │  └────────────────────────────────┘    │                    │
│  │                │                        │                    │
│  │                ▼                        │                    │
│  │  ┌────────────────────────────────┐    │                    │
│  │  │   DB Subnet (10.0.3.0/24)      │    │                    │
│  │  │  ┌──────────┐  ┌──────────┐    │    │                    │
│  │  │  │ Primary  │  │ Replica  │    │    │                    │
│  │  │  │  :5432   │  │  :5432   │    │    │                    │
│  │  │  └──────────┘  └──────────┘    │    │                    │
│  │  └────────────────────────────────┘    │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Authentication & Authorization                  │
│                                                                  │
│  Database Users:                                                 │
│  ┌────────────────┬─────────────┬──────────────────────────┐   │
│  │ User           │ Privileges  │ Purpose                  │   │
│  ├────────────────┼─────────────┼──────────────────────────┤   │
│  │ app_user       │ Read/Write  │ Application operations   │   │
│  │                │ (Limited)   │ Grants: SELECT, INSERT,  │   │
│  │                │             │ UPDATE, DELETE on tables │   │
│  ├────────────────┼─────────────┼──────────────────────────┤   │
│  │ readonly_user  │ Read Only   │ Analytics, reporting     │   │
│  │                │             │ Grants: SELECT only      │   │
│  ├────────────────┼─────────────┼──────────────────────────┤   │
│  │ backup_user    │ Replication │ Backup operations        │   │
│  │                │             │ Grants: REPLICATION      │   │
│  ├────────────────┼─────────────┼──────────────────────────┤   │
│  │ replicator     │ Replication │ Streaming replication    │   │
│  │                │             │ Grants: REPLICATION      │   │
│  └────────────────┴─────────────┴──────────────────────────┘   │
│                                                                  │
│  SSL/TLS Configuration:                                          │
│  • Server Certificate: /etc/postgresql/15/main/server.crt       │
│  • Server Key: /etc/postgresql/15/main/server.key               │
│  • Client Verification: Optional (scram-sha-256)                │
│  • Protocol: TLS 1.2+                                            │
│                                                                  │
│  pg_hba.conf Rules:                                              │
│  hostssl  all  all  0.0.0.0/0  scram-sha-256                     │
│  hostssl  replication  all  0.0.0.0/0  scram-sha-256             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Failover Scenarios

### Scenario 1: Primary Database Failure

```
BEFORE FAILURE:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Primary  │ ──▶ │Replica 1 │ ──▶ │Replica 2 │
│  (RW)    │     │  (RO)    │     │  (RO)    │
└──────────┘     └──────────┘     └──────────┘
     │
     ▼
  ┌─────┐
  │Apps │
  └─────┘

FAILURE DETECTED:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Primary  │  X  │Replica 1 │     │Replica 2 │
│  (DOWN)  │     │  (RO)    │     │  (RO)    │
└──────────┘     └──────────┘     └──────────┘
     X

┌───────────────────────────────┐
│ Alertmanager triggers:         │
│ • PagerDuty alert             │
│ • Slack notification          │
│ • Email to on-call DBA        │
└───────────────────────────────┘

MANUAL FAILOVER:
1. DBA runs: /usr/local/bin/promote-replica.sh
2. Replica 1 promoted to primary
3. DNS updated to point to new primary
4. Applications reconnect automatically

AFTER FAILOVER:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Replica1 │ ──▶ │Replica 2 │     │ Primary  │
│  (NEW RW)│     │  (RO)    │     │(REBUILD) │
└──────────┘     └──────────┘     └──────────┘
     │
     ▼
  ┌─────┐
  │Apps │
  └─────┘

Recovery Time: 5-15 minutes (manual)
           or: < 1 minute (with Patroni)
```

### Scenario 2: Replica Failure

```
BEFORE FAILURE:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Primary  │ ──▶ │Replica 1 │ ──▶ │Replica 2 │
│  (RW)    │     │  (RO)    │     │  (RO)    │
└──────────┘     └──────────┘     └──────────┘

FAILURE DETECTED:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Primary  │ ──▶ │Replica 1 │  X  │Replica 2 │
│  (RW)    │     │  (RO)    │     │  (DOWN)  │
└──────────┘     └──────────┘     └──────────┘

IMPACT:
• Read traffic redistributed to Replica 1
• No write impact
• Reduced read capacity (50%)

RECOVERY:
1. Fix underlying issue
2. Rebuild replica from primary:
   bash replication/setup-replication.sh replica replica2
3. Resume replication

Recovery Time: 30 minutes - 1 hour
```

---

## Scaling Patterns

### Vertical Scaling (Current)
```
┌────────────────────────────────────┐
│         Single Instance            │
│                                    │
│  CPU: 4 cores                      │
│  RAM: 16 GB                        │
│  Storage: 100 GB SSD               │
│  Connections: ~100                 │
│                                    │
│  Estimated Capacity:               │
│  • 1,000 req/min                   │
│  • 1,000 concurrent users          │
└────────────────────────────────────┘

       Upgrade ▼

┌────────────────────────────────────┐
│       Larger Instance              │
│                                    │
│  CPU: 16 cores                     │
│  RAM: 64 GB                        │
│  Storage: 500 GB SSD               │
│  Connections: ~500                 │
│                                    │
│  Estimated Capacity:               │
│  • 5,000 req/min                   │
│  • 5,000 concurrent users          │
└────────────────────────────────────┘

Pros: Simple, no architecture change
Cons: Hard limits, expensive, downtime
```

### Horizontal Scaling (Recommended)
```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│              (Read/Write Splitting)                      │
└─────────────────────────────────────────────────────────┘
            │                              │
            │ (Write 20%)                  │ (Read 80%)
            ▼                              ▼
    ┌──────────────┐           ┌──────────────────────────┐
    │   Primary    │           │    Read Replica Pool     │
    │   (Write)    │           │                          │
    │              │ ─────────▶│  ┌────┐ ┌────┐ ┌────┐   │
    │  4 cores     │           │  │Rep1│ │Rep2│ │Rep3│   │
    │  16 GB RAM   │           │  └────┘ └────┘ └────┘   │
    └──────────────┘           └──────────────────────────┘

Capacity:
• Primary: 2,000 write/min
• Each Replica: 5,000 read/min
• Total Read: 15,000 read/min
• Combined: ~17,000 req/min

To Scale Further:
• Add more read replicas (up to 15)
• Implement sharding by salon_id
• Use Citus for distributed PostgreSQL
```

### Sharding Strategy (Future)
```
┌───────────────────────────────────────────────────────┐
│               Application Layer                        │
│         (Sharding Logic by salon_id)                   │
└───────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Shard 1 │    │ Shard 2 │    │ Shard 3 │
    │         │    │         │    │         │
    │Salons   │    │Salons   │    │Salons   │
    │1-1000   │    │1001-2000│    │2001-3000│
    └─────────┘    └─────────┘    └─────────┘
         │              │              │
         ▼              ▼              ▼
    Each shard has its own Primary + Replicas

Capacity: 50,000+ req/min
When: > 10,000 salons or > 10TB data
```

---

## Summary

**Current State:**
- Single PostgreSQL instance
- No high availability
- No disaster recovery
- Direct connections

**Production Architecture:**
- 3-node cluster (1 primary + 2 replicas)
- Automated backups (daily full + hourly incremental)
- Connection pooling (PgBouncer)
- Comprehensive monitoring
- SSL/TLS encryption
- Disaster recovery procedures

**Expected Improvements:**
- Availability: 99.9% uptime
- Performance: 10x faster queries
- Capacity: 10,000 req/min
- Recovery: RTO < 1hr, RPO < 5min
- Connections: 1,000 concurrent

**Implementation Time:** 4-6 hours

---

For detailed implementation, see:
- `DATABASE_PRODUCTION_ANALYSIS.md` - Analysis
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment steps
- `README.md` - Quick reference
