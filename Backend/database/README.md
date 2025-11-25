# Database Infrastructure Documentation
## WhatsApp SaaS Starter - Production Database Setup

**Version:** 1.0
**Last Updated:** 2025-10-17
**Status:** Production Ready

---

## Quick Start

This directory contains all production database infrastructure components for the WhatsApp SaaS Starter application.

### What's Included
- ✅ **Comprehensive database analysis** with production readiness assessment
- ✅ **Optimized schema** with performance indexes
- ✅ **Automated backup system** with disaster recovery procedures
- ✅ **High availability setup** with streaming replication
- ✅ **Connection pooling** configuration with PgBouncer
- ✅ **Monitoring stack** with Prometheus, Grafana, and Alertmanager
- ✅ **Security hardening** scripts and best practices
- ✅ **Operational runbooks** for common scenarios

---

## Directory Structure

```
database/
├── README.md                          # This file
├── DATABASE_PRODUCTION_ANALYSIS.md    # Detailed analysis and recommendations
├── PRODUCTION_DEPLOYMENT_GUIDE.md     # Step-by-step deployment guide
│
├── backup/
│   ├── backup-automation.sh           # Automated backup script
│   └── restore-procedures.md          # Disaster recovery runbook
│
├── replication/
│   ├── setup-replication.sh           # Replication configuration script
│   └── pgbouncer-config.ini           # Connection pooler configuration
│
├── monitoring/
│   ├── prometheus-postgres-exporter.yml  # Monitoring stack deployment
│   ├── custom-queries.yaml               # Application-specific metrics
│   └── alerts.yml                         # Alert rules
│
└── migrations/
    └── (Prisma migration files)
```

---

## Documentation Overview

### 1. DATABASE_PRODUCTION_ANALYSIS.md
**Purpose:** Comprehensive assessment of current database setup
**Key Sections:**
- Database technology evaluation (PostgreSQL 15)
- Schema design analysis with identified issues
- Query optimization and N+1 problem detection
- Backup strategy review (currently missing)
- Migration system analysis
- Connection pooling assessment
- Replication architecture review
- Security audit
- Monitoring gaps
- Production readiness score: 4/10

**Critical Issues Found:**
1. ❌ No backup strategy configured
2. ❌ Missing database migrations
3. ❌ No replication setup
4. ❌ Insufficient indexing
5. ❌ No connection pooling
6. ❌ Weak security (hardcoded credentials)
7. ⚠️ N+1 query issues in AI analytics
8. ⚠️ No database monitoring

### 2. PRODUCTION_DEPLOYMENT_GUIDE.md
**Purpose:** Step-by-step instructions for deploying production infrastructure
**Covers:**
- Infrastructure setup (AWS RDS or self-hosted)
- Database migration procedures
- Backup configuration and scheduling
- Replication setup (primary + 2 replicas)
- Connection pooling with PgBouncer
- Monitoring stack deployment
- Security hardening
- Performance tuning
- Validation and testing
- Troubleshooting guide

**Estimated Deployment Time:** 4-6 hours

### 3. Backup & Disaster Recovery
**Files:**
- `backup/backup-automation.sh` - Comprehensive backup automation
- `backup/restore-procedures.md` - Disaster recovery runbook

**Features:**
- Full and incremental backups
- GPG encryption
- S3 upload
- Automated verification
- Retention policy enforcement
- Slack/email notifications

**RTO/RPO:**
- RTO (Recovery Time): < 1 hour
- RPO (Recovery Point): < 5 minutes

### 4. High Availability
**Files:**
- `replication/setup-replication.sh` - Streaming replication setup
- `replication/pgbouncer-config.ini` - Connection pooling

**Architecture:**
```
Application Servers
        ↓
   PgBouncer (localhost:6432)
        ↓
Primary DB (Read/Write)
    ↓       ↓
Replica 1   Replica 2 (Read Only)
```

**Failover:** Manual promotion script included (automatic with Patroni)

### 5. Monitoring & Alerting
**Files:**
- `monitoring/prometheus-postgres-exporter.yml` - Monitoring stack
- `monitoring/custom-queries.yaml` - Application metrics
- `monitoring/alerts.yml` - Alert rules

**Metrics Tracked:**
- Database availability and connections
- Replication lag and health
- Query performance and slow queries
- Disk usage and WAL files
- Application-specific metrics (bookings, messages, AI costs)
- Backup status
- Security events

**Dashboards:**
- Grafana accessible at http://localhost:3001
- Pre-configured PostgreSQL dashboards
- Custom WhatsApp SaaS metrics

---

## Quick Deployment

### Prerequisites
```bash
# 1. Install required tools
sudo apt-get install postgresql-15 pgbouncer docker-compose awscli

# 2. Set environment variables
export DB_PASSWORD="your_secure_password"
export S3_BUCKET="your-backup-bucket"
export SLACK_WEBHOOK="your_webhook_url"
```

### Option A: Deploy Everything (Recommended)
```bash
# 1. Apply optimized schema
cp ../prisma/schema-optimized.prisma ../prisma/schema.prisma
npx prisma migrate deploy

# 2. Set up replication
sudo bash replication/setup-replication.sh primary

# 3. Configure backups
sudo bash backup/backup-automation.sh full
echo "0 2 * * * /usr/local/bin/backup-automation.sh full" | sudo crontab -

# 4. Deploy monitoring
cd monitoring
docker-compose -f prometheus-postgres-exporter.yml up -d

# 5. Start PgBouncer
sudo cp replication/pgbouncer-config.ini /etc/pgbouncer/
sudo systemctl start pgbouncer
```

### Option B: AWS RDS Managed Service
```bash
# See PRODUCTION_DEPLOYMENT_GUIDE.md for AWS RDS setup
# Includes automated backups, multi-AZ, and read replicas
```

---

## Performance Improvements

### Current Schema Issues
The original `schema.prisma` is missing critical indexes. The optimized schema adds:

**Booking Indexes:**
- `idx_booking_salon_start` - Fast conflict checking
- `idx_booking_salon_status_start` - Active bookings query
- `idx_booking_customer_salon` - User booking history

**Message Indexes:**
- `idx_message_salon_created` - Salon message history
- `idx_message_conversation_created` - Conversation messages
- `idx_message_phone_salon_created` - User messages

**AI Indexes:**
- `idx_ai_conv_salon_activity` - Active AI conversations
- `idx_ai_msg_salon_created` - AI message history

**Expected Performance Gain:** 10x improvement on common queries

### Query Optimization
Several N+1 query issues were identified and documented:

1. **AI Analytics Popular Intents** (SEVERE)
   - Issue: Groups by content column causing full table scan
   - Fix: Use `IntentAnalytics` materialized view table

2. **Conversation Quality Analysis** (SEVERE)
   - Issue: Loads all conversations into memory
   - Fix: Use aggregation queries

3. **Missing Connection Pooling**
   - Issue: Direct Prisma connections without pooling
   - Fix: PgBouncer configuration provided

---

## Security Enhancements

### Current Security Issues
1. ❌ Hardcoded credentials in docker-compose.yml
2. ❌ No SSL/TLS enforcement
3. ❌ Using postgres superuser for application
4. ❌ No encryption at rest or in transit

### Security Hardening Checklist
- [ ] Generate SSL certificates
- [ ] Enable SSL in PostgreSQL
- [ ] Update pg_hba.conf to require SSL
- [ ] Create least-privilege application users
- [ ] Enable backup encryption with GPG
- [ ] Implement credential rotation
- [ ] Enable audit logging
- [ ] Configure firewall rules

**Scripts:** See `PRODUCTION_DEPLOYMENT_GUIDE.md` security section

---

## Monitoring Setup

### Metrics Dashboard
Access Grafana: http://localhost:3001 (admin/admin)

**Pre-configured Dashboards:**
1. **PostgreSQL Overview** - Database health and performance
2. **Replication Status** - Lag monitoring and replica health
3. **WhatsApp SaaS Metrics** - Application-specific metrics
4. **Backup Status** - Backup success/failure tracking

### Alert Rules
Critical alerts configured for:
- Database down (1 min)
- Replication lag > 60s (5 min)
- Disk space < 20% (5 min)
- Connection pool exhausted (5 min)
- Backup failures (1 hour)
- High query latency (10 min)
- AI cost spikes (30 min)

**Notification Channels:**
- Slack: #database-alerts
- PagerDuty: Critical alerts only
- Email: ops@yourdomain.com

---

## Cost Estimation

### AWS RDS Setup (Monthly)
| Component | Instance Type | Cost |
|-----------|--------------|------|
| Primary DB | db.r6g.xlarge | $290 |
| Replica 1 | db.r6g.xlarge | $290 |
| Replica 2 | db.r6g.xlarge | $290 |
| Backup Storage (500GB) | S3 Standard-IA | $12 |
| Redis Cache | r6g.large | $157 |
| Monitoring | CloudWatch | $20 |
| **Total** | | **~$1,059/month** |

### Self-Hosted Setup (Monthly)
| Component | Instance Type | Cost |
|-----------|--------------|------|
| Primary DB | r6g.xlarge EC2 | $180 |
| Replica 1 | r6g.xlarge EC2 | $180 |
| Replica 2 | r6g.xlarge EC2 | $180 |
| EBS Storage (300GB) | gp3 | $30 |
| Backup Storage (500GB) | S3 | $12 |
| **Total** | | **~$582/month** |

**Cost Savings:** 45% cheaper with self-hosted
**Trade-off:** More operational overhead

---

## Operational Procedures

### Daily Operations
- Monitor dashboard for anomalies
- Review slow query log
- Check replication lag
- Verify backup success

### Weekly Operations
- Run backup verification test
- Review disk usage trends
- Analyze query performance
- Update monitoring alerts

### Monthly Operations
- Test disaster recovery procedures
- Review and rotate credentials
- Update database statistics (ANALYZE)
- Perform capacity planning

### Quarterly Operations
- Full disaster recovery drill
- Security audit
- Performance benchmark
- Infrastructure review

---

## Troubleshooting

### Common Issues

#### Issue: High Replication Lag
```bash
# Check lag
psql -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));"

# Solution: Rebuild replica
sudo bash replication/setup-replication.sh replica replica1
```

#### Issue: Out of Connections
```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Solution: Increase pool size
sudo nano /etc/pgbouncer/pgbouncer.ini
# default_pool_size = 50
sudo systemctl reload pgbouncer
```

#### Issue: Slow Queries
```bash
# Find slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements
         ORDER BY mean_exec_time DESC LIMIT 10;"

# Solution: Add indexes, optimize queries
```

### Emergency Contacts
- **Primary DBA:** [Name] - [Phone]
- **DevOps Lead:** [Name] - [Phone]
- **Slack Channel:** #incidents-production
- **PagerDuty:** Emergency escalation

---

## Migration from Current Setup

### Step 1: Assess Current State
```bash
# Check current schema
psql -c "\d"

# Check data volume
psql -c "SELECT pg_size_pretty(pg_database_size('whatsapp_saas'));"

# Export current data
pg_dump -Fc whatsapp_saas > backup_before_migration.dump
```

### Step 2: Apply Optimized Schema
```bash
# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Apply optimized schema
cp database/prisma/schema-optimized.prisma prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name add_production_indexes

# Review SQL
cat prisma/migrations/*/migration.sql

# Apply to production
npx prisma migrate deploy
```

### Step 3: Deploy Infrastructure
Follow `PRODUCTION_DEPLOYMENT_GUIDE.md` for complete deployment

---

## Testing Checklist

### Before Production Deployment
- [ ] Test backup and restore procedures
- [ ] Verify replication setup
- [ ] Load test with expected traffic
- [ ] Test failover procedures
- [ ] Verify monitoring and alerts
- [ ] Security audit passed
- [ ] Performance benchmarks recorded
- [ ] Team trained on procedures

### After Production Deployment
- [ ] Monitor for 24 hours
- [ ] Verify backup completion
- [ ] Check replication lag
- [ ] Review slow query log
- [ ] Test alert notifications
- [ ] Update documentation

---

## Success Metrics

### Target KPIs
- **Availability:** 99.9% uptime
- **Replication Lag:** < 5 seconds
- **Query Performance:** 95th percentile < 100ms
- **Backup Success Rate:** 100%
- **Recovery Time:** < 1 hour
- **Recovery Point:** < 5 minutes

### Current Baseline
- Establish baseline metrics in first week
- Track improvements over time
- Adjust targets based on business needs

---

## Contributing

### Adding New Metrics
1. Add query to `monitoring/custom-queries.yaml`
2. Update Grafana dashboards
3. Configure alerts if needed
4. Document in this README

### Updating Procedures
1. Test changes in staging environment
2. Update relevant documentation
3. Review with team
4. Schedule deployment window

---

## Additional Resources

### Internal Documentation
- Original Analysis: `DATABASE_PRODUCTION_ANALYSIS.md`
- Deployment Guide: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- DR Procedures: `backup/restore-procedures.md`

### External Resources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Prometheus PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)

### Training Materials
- PostgreSQL DBA Workshop (internal)
- Disaster Recovery Drills (quarterly)
- On-call Runbook Review (monthly)

---

## Support

### Getting Help
- **Slack:** #database-ops for general questions
- **PagerDuty:** For production emergencies
- **Email:** dba-team@yourdomain.com

### Escalation Path
1. Check this documentation
2. Search Slack #database-ops history
3. Page on-call DBA
4. Escalate to engineering manager if unresolved

---

**Last Reviewed:** 2025-10-17
**Next Review:** 2025-11-17
**Maintained By:** Database Operations Team
