# PostgreSQL Disaster Recovery Procedures
## WhatsApp SaaS Starter - Database Restoration Guide

**Document Version:** 1.0
**Last Updated:** 2025-10-17
**Maintained By:** Database Operations Team

---

## Table of Contents
1. [Emergency Contacts](#emergency-contacts)
2. [Quick Recovery Decision Tree](#quick-recovery-decision-tree)
3. [Recovery Time & Point Objectives](#recovery-objectives)
4. [Full Database Restore](#full-database-restore)
5. [Point-in-Time Recovery (PITR)](#point-in-time-recovery)
6. [Partial Table Recovery](#partial-table-recovery)
7. [Verification Procedures](#verification-procedures)
8. [Post-Recovery Checklist](#post-recovery-checklist)
9. [Common Failure Scenarios](#common-failure-scenarios)
10. [Rollback Procedures](#rollback-procedures)

---

## Emergency Contacts

### On-Call Rotation
- **Primary DBA:** [Name] - [Phone] - [Email]
- **Secondary DBA:** [Name] - [Phone] - [Email]
- **DevOps Lead:** [Name] - [Phone] - [Email]
- **Engineering Manager:** [Name] - [Phone] - [Email]

### External Support
- **AWS Support:** 1-866-773-0985 (Premium Support)
- **PostgreSQL Consulting:** [Vendor Contact]

### Communication Channels
- **Incident Slack:** #incidents-production
- **Status Page:** status.yourdomain.com
- **War Room:** Zoom/Meet Link

---

## Quick Recovery Decision Tree

```
Database Issue Detected
        |
        v
Can users access data?
        |
    Yes |   No
        |   |
        |   v
        | Is database responding?
        |   |
        | Yes |   No
        |   |   |
        |   |   v
        |   | Emergency Failover to Replica
        |   | (Section 9.1)
        |   v
        | Data corruption detected?
        |   |
        | Yes |   No
        |   |   |
        |   v   v
        | PITR  Performance Issue
        | (Section 5)  (Check monitoring)
        v
  Determine recovery point needed
        |
    Last Hour | Last Day | Last Week
        |         |          |
        v         v          v
      WAL       Full      Older
    Restore   Backup    Backup
```

---

## Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Services:** < 15 minutes (via replica failover)
- **Full Database Restore:** < 1 hour
- **Point-in-Time Recovery:** < 2 hours

### RPO (Recovery Point Objective)
- **Maximum Data Loss:** < 5 minutes
- **WAL Archiving Frequency:** Continuous
- **Full Backup Frequency:** Daily at 02:00 UTC

### Service Level Agreements
- 99.9% uptime = ~43 minutes downtime/month
- Recovery procedures tested monthly
- Disaster recovery drills quarterly

---

## Full Database Restore

### Prerequisites
- [ ] Backup file location confirmed
- [ ] Sufficient disk space available (2x backup size)
- [ ] Database credentials ready
- [ ] Incident declared in Slack/Status page

### Step 1: Stop Application Servers
```bash
# Stop all application containers
docker-compose -f /opt/whatsapp-saas/docker-compose.yml stop app

# Verify no connections to database
psql -h DB_HOST -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'whatsapp_saas' AND pid <> pg_backend_pid();"
```

### Step 2: Identify Backup to Restore
```bash
# List available backups
ls -lh /var/backups/postgresql/
aws s3 ls s3://your-bucket/backups/postgresql/ --recursive

# Check backup metadata
cat /var/backups/postgresql/2025/10/17/whatsapp_saas_full_20251017_020000.sql.gz.meta

# Verify backup integrity
sha256sum -c /var/backups/postgresql/2025/10/17/whatsapp_saas_full_20251017_020000.sql.gz.meta
```

### Step 3: Create Restore Database
```bash
# Drop existing database (CAUTION!)
psql -h DB_HOST -U postgres -c "DROP DATABASE IF EXISTS whatsapp_saas;"

# Create new database
psql -h DB_HOST -U postgres -c "CREATE DATABASE whatsapp_saas OWNER postgres;"
```

### Step 4: Decrypt and Decompress Backup
```bash
# If backup is encrypted
gpg --decrypt /var/backups/postgresql/backup.sql.gz.gpg > /tmp/backup.sql.gz

# Decompress
gunzip /tmp/backup.sql.gz
```

### Step 5: Restore Database
```bash
# For custom format (pg_dump -Fc)
pg_restore -h DB_HOST -U postgres -d whatsapp_saas \
  --verbose \
  --no-owner \
  --no-acl \
  /tmp/backup.sql

# Monitor restore progress
watch -n 1 "psql -h DB_HOST -U postgres -d whatsapp_saas -c 'SELECT COUNT(*) FROM information_schema.tables;'"
```

### Step 6: Verify Restoration
```bash
# Run verification script
./verify-database-integrity.sh

# Check critical tables
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
SELECT 'Salons' as table, COUNT(*) as count FROM salons
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations;
EOF

# Verify latest data timestamp
psql -h DB_HOST -U postgres -d whatsapp_saas -c "SELECT MAX(created_at) FROM messages;"
```

### Step 7: Restart Application
```bash
# Start application containers
docker-compose -f /opt/whatsapp-saas/docker-compose.yml up -d app

# Monitor application logs
docker-compose logs -f app

# Health check
curl -f http://localhost:3000/healthz
```

### Estimated Time: 45-60 minutes

---

## Point-in-Time Recovery (PITR)

### When to Use PITR
- Data corruption at known timestamp
- Accidental DELETE/UPDATE/DROP
- Need to recover to specific transaction

### Prerequisites
- WAL archiving enabled
- Base backup available
- WAL files from base backup to recovery point

### Step 1: Identify Recovery Point
```bash
# Find the timestamp of bad transaction
psql -h DB_HOST -U postgres -d whatsapp_saas -c "
  SELECT * FROM webhook_logs
  WHERE event_type = 'data_corruption'
  ORDER BY created_at DESC LIMIT 10;"

# Determine recovery target
RECOVERY_TARGET="2025-10-17 14:30:00"
```

### Step 2: Prepare Recovery Environment
```bash
# Stop database
systemctl stop postgresql

# Backup current data directory
mv /var/lib/postgresql/15/main /var/lib/postgresql/15/main.backup

# Create new data directory
mkdir /var/lib/postgresql/15/main
chown postgres:postgres /var/lib/postgresql/15/main
```

### Step 3: Restore Base Backup
```bash
# Extract base backup
tar -xzf /var/backups/postgresql/base_backup_20251017_020000.tar.gz \
  -C /var/lib/postgresql/15/main

# Set permissions
chown -R postgres:postgres /var/lib/postgresql/15/main
```

### Step 4: Configure Recovery
```bash
# Create recovery configuration
cat > /var/lib/postgresql/15/main/recovery.conf <<EOF
restore_command = 'cp /var/backups/postgresql/wal_archive/%f %p'
recovery_target_time = '${RECOVERY_TARGET}'
recovery_target_action = 'promote'
EOF
```

### Step 5: Start Recovery
```bash
# Start PostgreSQL in recovery mode
systemctl start postgresql

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql-15-main.log

# Recovery complete when you see: "database system is ready to accept connections"
```

### Step 6: Verify Recovery Point
```bash
# Check last transaction timestamp
psql -h DB_HOST -U postgres -d whatsapp_saas -c "
  SELECT MAX(created_at) FROM messages;"

# Should be close to RECOVERY_TARGET
```

### Estimated Time: 1-2 hours (depends on WAL file size)

---

## Partial Table Recovery

### Use Case: Recover single table from backup

### Step 1: Restore to Temporary Database
```bash
# Create temporary database
psql -h DB_HOST -U postgres -c "CREATE DATABASE temp_recovery;"

# Restore backup to temp database
pg_restore -h DB_HOST -U postgres -d temp_recovery \
  --no-owner --no-acl \
  /var/backups/postgresql/backup.sql
```

### Step 2: Export Specific Table
```bash
# Export table data
pg_dump -h DB_HOST -U postgres -d temp_recovery \
  --table=bookings \
  --data-only \
  --inserts \
  > /tmp/bookings_recovery.sql
```

### Step 3: Import to Production
```bash
# Review SQL before applying
less /tmp/bookings_recovery.sql

# Apply to production (in transaction)
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
BEGIN;
-- Backup current data
CREATE TABLE bookings_backup_$(date +%Y%m%d) AS SELECT * FROM bookings;
-- Import recovered data
\i /tmp/bookings_recovery.sql
-- Verify
SELECT COUNT(*) FROM bookings;
COMMIT;
EOF
```

### Step 4: Cleanup
```bash
# Drop temporary database
psql -h DB_HOST -U postgres -c "DROP DATABASE temp_recovery;"
```

### Estimated Time: 30 minutes

---

## Verification Procedures

### Data Integrity Checks
```bash
#!/bin/bash
# verify-database-integrity.sh

# Check foreign key constraints
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND convalidated = false;
EOF

# Check for orphaned records
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
-- Bookings without salon
SELECT COUNT(*) FROM bookings b
LEFT JOIN salons s ON b.salon_id = s.id
WHERE s.id IS NULL;

-- Messages without salon
SELECT COUNT(*) FROM messages m
LEFT JOIN salons s ON m.salon_id = s.id
WHERE s.id IS NULL;
EOF

# Verify table counts
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
EOF

# Check index validity
psql -h DB_HOST -U postgres -d whatsapp_saas <<EOF
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey';
EOF
```

### Application Verification
```bash
# Test critical API endpoints
curl -f http://localhost:3000/healthz
curl -f http://localhost:3000/admin/salons -H "x-admin-token: $ADMIN_TOKEN"

# Test booking creation
curl -X POST http://localhost:3000/webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": "booking_creation"}'

# Monitor application logs
docker-compose logs -f app | grep -i error
```

---

## Post-Recovery Checklist

### Immediate (< 30 minutes)
- [ ] Verify all application services running
- [ ] Test critical user workflows
- [ ] Check error logs for anomalies
- [ ] Update status page
- [ ] Notify stakeholders of recovery

### Short-term (< 24 hours)
- [ ] Run full data integrity verification
- [ ] Review and analyze root cause
- [ ] Update runbooks with lessons learned
- [ ] Schedule backup verification test
- [ ] Review monitoring alerts

### Long-term (< 1 week)
- [ ] Conduct post-mortem meeting
- [ ] Implement preventive measures
- [ ] Update disaster recovery documentation
- [ ] Test restored backup independently
- [ ] Review and update RTO/RPO targets

---

## Common Failure Scenarios

### Scenario 1: Accidental Table DROP
**Symptoms:** Table missing, application errors
**Recovery:** PITR to before DROP command
**Prevention:** Require explicit confirmation for DROP commands

### Scenario 2: Data Corruption
**Symptoms:** Invalid data, constraint violations
**Recovery:** Restore from last known good backup
**Prevention:** Implement application-level validation

### Scenario 3: Disk Full
**Symptoms:** Cannot write to database
**Recovery:** Free disk space, restart services
**Prevention:** Implement disk monitoring alerts

### Scenario 4: Replication Lag
**Symptoms:** Stale data on replicas
**Recovery:** Rebuild replica from primary
**Prevention:** Monitor replication lag continuously

### Scenario 5: Connection Pool Exhaustion
**Symptoms:** Connection timeouts
**Recovery:** Restart connection pooler, kill idle connections
**Prevention:** Configure connection pool limits

---

## Rollback Procedures

### Application Rollback with Database Changes
```bash
# 1. Create rollback migration
npx prisma migrate dev --name rollback_feature_x --create-only

# 2. Edit migration file to reverse changes
# migrations/XXXXXX_rollback_feature_x/migration.sql

# 3. Apply rollback migration
npx prisma migrate deploy

# 4. Rollback application code
git revert <commit-hash>
docker-compose up -d --build
```

### Emergency Database Rollback
```bash
# 1. Restore previous backup
pg_restore -h DB_HOST -U postgres -d whatsapp_saas \
  --clean --if-exists \
  /var/backups/postgresql/before_deploy_backup.sql

# 2. Verify restoration
./verify-database-integrity.sh

# 3. Restart services
docker-compose restart
```

---

## Testing This Runbook

### Monthly Drill Checklist
- [ ] Restore from last night's backup to staging
- [ ] Perform PITR to yesterday
- [ ] Test partial table recovery
- [ ] Verify all scripts execute successfully
- [ ] Update estimated times
- [ ] Document any issues encountered

### Metrics to Track
- Actual RTO vs Target RTO
- Actual RPO vs Target RPO
- Number of errors during recovery
- Time to detect vs time to resolve
- Success rate of automated procedures

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | DBA Team | Initial version |

---

**Remember:** In a production outage, communicate early and often. Update stakeholders every 15 minutes even if there's no progress to report.
