# 🔐 Database Backup and Restore Procedures

**Version:** 1.0
**Last Updated:** 2025-10-17
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Backup Scripts](#backup-scripts)
4. [Restore Procedures](#restore-procedures)
5. [Automated Scheduling](#automated-scheduling)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Testing & Validation](#testing--validation)
8. [Disaster Recovery](#disaster-recovery)
9. [Security & Compliance](#security--compliance)
10. [Troubleshooting](#troubleshooting)
11. [Appendix](#appendix)

---

## Overview

This document describes the comprehensive backup and restore procedures for the WhatsApp SaaS application database. The solution includes automated backups, S3 storage, integrity verification, monitoring, and disaster recovery capabilities.

### Key Features

✅ **Automated Backups** - Daily, weekly, and monthly schedules
✅ **S3 Storage** - Encrypted, geo-redundant cloud storage
✅ **Compression** - Gzip compression with configurable levels
✅ **Integrity Verification** - Automatic backup validation
✅ **CloudWatch Monitoring** - Real-time metrics and alerts
✅ **Point-in-Time Recovery** - Restore to any backup
✅ **Dry-Run Support** - Test without making changes
✅ **Email Notifications** - Failure alerts via SNS

### Architecture

```
┌─────────────────┐
│  PostgreSQL DB  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────┐
│ backup-database │──────▶│  Local File  │
│      .sh        │       │  /var/backups│
└────────┬────────┘       └──────┬───────┘
         │                       │
         │                       │ gzip
         ▼                       ▼
┌─────────────────┐       ┌──────────────┐
│   AWS S3        │◀──────│  .dump.gz    │
│   Bucket        │       │  + metadata  │
└────────┬────────┘       └──────────────┘
         │
         ▼
┌─────────────────┐
│  CloudWatch     │
│  Metrics/Alarms │
└─────────────────┘
```

### Backup Strategy

| Type | Frequency | Retention | Storage Class |
|------|-----------|-----------|---------------|
| **Daily** | 3:00 AM UTC | 30 days | STANDARD_IA |
| **Weekly** | Sunday 2:00 AM | 30 days | STANDARD_IA |
| **Monthly** | 1st day 1:00 AM | 365 days | GLACIER |

---

## Quick Start

### Prerequisites

1. **Required Software:**
   ```bash
   # PostgreSQL client tools
   sudo apt-get install postgresql-client

   # AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Environment Variables:**
   ```bash
   # Add to Backend/.env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   AWS_S3_BACKUP_BUCKET=your-backup-bucket
   AWS_REGION=us-east-1
   NOTIFICATION_EMAIL=admin@example.com  # Optional
   ```

3. **AWS Configuration:**
   ```bash
   aws configure
   # AWS Access Key ID: YOUR_KEY
   # AWS Secret Access Key: YOUR_SECRET
   # Default region: us-east-1
   # Default output format: json
   ```

### 5-Minute Setup

```bash
cd Backend/scripts

# 1. Make scripts executable
chmod +x *.sh

# 2. Test backup (dry run)
./backup-database.sh --daily --dry-run

# 3. Test restore
./test-backup-restore.sh --full

# 4. Install automated backups
sudo ./setup-backup-cron.sh --install

# 5. Setup monitoring
./setup-backup-monitoring.sh --install --email admin@example.com
```

---

## Backup Scripts

### 1. backup-database.sh

**Purpose:** Create compressed PostgreSQL backups and upload to S3

**Usage:**
```bash
./backup-database.sh [OPTIONS]
```

**Options:**
- `--daily` - Daily incremental backup (default)
- `--weekly` - Weekly full backup
- `--monthly` - Monthly archive backup
- `--dry-run` - Simulate without making changes
- `--verbose` - Detailed logging
- `--no-upload` - Skip S3 upload (local only)

**Examples:**

```bash
# Daily backup with S3 upload
./backup-database.sh --daily

# Weekly backup (verbose)
./backup-database.sh --weekly --verbose

# Dry run to test configuration
./backup-database.sh --daily --dry-run

# Local backup only (no S3)
./backup-database.sh --daily --no-upload
```

**Output:**

```
[2025-10-17 03:00:01] [INFO] ==========================================
[2025-10-17 03:00:01] [INFO] Database Backup Script Started
[2025-10-17 03:00:01] [INFO] ==========================================
[2025-10-17 03:00:01] [INFO] Backup Type: daily
[2025-10-17 03:00:01] [INFO] Timestamp: 20251017_030001
[2025-10-17 03:00:02] [INFO] Environment validation complete
[2025-10-17 03:00:03] [INFO] Database connection successful
[2025-10-17 03:00:03] [INFO] Starting daily backup...
[2025-10-17 03:02:15] [INFO] Backup created successfully
[2025-10-17 03:02:15] [INFO] File: /var/backups/whatsapp-saas/daily_20251017_030001.dump.gz
[2025-10-17 03:02:15] [INFO] Size: 45M
[2025-10-17 03:02:15] [INFO] Duration: 132 seconds
[2025-10-17 03:03:20] [INFO] Upload complete (65 seconds)
[2025-10-17 03:03:25] [INFO] S3 upload verified
[2025-10-17 03:03:26] [INFO] Deleted 2 old local backup(s)
[2025-10-17 03:03:26] [INFO] ==========================================
[2025-10-17 03:03:26] [INFO] Backup Complete
[2025-10-17 03:03:26] [INFO] Total Duration: 205 seconds
[2025-10-17 03:03:26] [INFO] ==========================================
```

**Logs:**
- Location: `/var/log/backups.log`
- Format: `[TIMESTAMP] [LEVEL] MESSAGE`
- Rotation: Daily with 30-day retention

**Backup Files:**

```
/var/backups/whatsapp-saas/
├── daily_20251017_030001.dump.gz
├── daily_20251017_030001.dump.gz.meta
├── weekly_2025_W42_030001.dump.gz
└── monthly_2025_10_030001.dump.gz
```

**Metadata Format:**

```json
{
  "backup_file": "daily_20251017_030001.dump.gz",
  "backup_type": "daily",
  "timestamp": "20251017_030001",
  "date": "2025-10-17T03:00:01+00:00",
  "hostname": "prod-server-01",
  "database_url": "***REDACTED***",
  "size": "45M",
  "duration_seconds": 132,
  "compression": "gzip-9",
  "pg_dump_version": "pg_dump (PostgreSQL) 14.9"
}
```

---

### 2. restore-database.sh

**Purpose:** Restore PostgreSQL database from backups with verification

**Usage:**
```bash
./restore-database.sh [OPTIONS] <backup-file>
```

**Options:**
- `--from-s3 <path>` - Restore from S3 path
- `--latest` - Restore from latest backup
- `--list-backups` - List available backups
- `--dry-run` - Simulate without restoring
- `--verify-only` - Only verify backup integrity
- `--force` - Skip confirmation prompts
- `--target-db <name>` - Restore to specific database
- `--verbose` - Detailed logging

**Examples:**

```bash
# List available backups
./restore-database.sh --list-backups

# Restore latest backup (with confirmation)
./restore-database.sh --latest

# Restore specific local backup
./restore-database.sh /var/backups/whatsapp-saas/daily_20251017_030001.dump.gz

# Restore from S3
./restore-database.sh --from-s3 s3://bucket/database-backups/daily/daily_20251017.dump.gz

# Dry run (test without restoring)
./restore-database.sh --latest --dry-run

# Verify backup integrity only
./restore-database.sh /path/to/backup.dump.gz --verify-only

# Force restore without confirmation
./restore-database.sh --latest --force
```

**Restore Process:**

```
1. Validate backup file
2. Verify integrity (gzip + pg_restore)
3. Display backup information
4. Request user confirmation
5. Create pre-restore snapshot
6. Perform database restore
7. Verify restored data
8. Cleanup temporary files
```

**Output:**

```
[2025-10-17 10:30:01] [INFO] ==========================================
[2025-10-17 10:30:01] [INFO] Database Restore Script Started
[2025-10-17 10:30:01] [INFO] ==========================================
[2025-10-17 10:30:02] [INFO] Finding latest backup...
[2025-10-17 10:30:03] [INFO] Latest backup: s3://bucket/database-backups/daily/daily_20251017.dump.gz
[2025-10-17 10:30:03] [INFO] ============================================
[2025-10-17 10:30:03] [INFO] Backup Information:
[2025-10-17 10:30:03] [INFO] ============================================
[2025-10-17 10:30:03] [INFO] File: daily_20251017_030001.dump.gz
[2025-10-17 10:30:03] [INFO] Size: 45M
[2025-10-17 10:30:03] [INFO] Date: 2025-10-17 03:00:01
[2025-10-17 10:30:05] [INFO] Backup integrity verified successfully
[2025-10-17 10:30:05] [WARN] ==========================================
[2025-10-17 10:30:05] [WARN] WARNING: DATABASE RESTORE OPERATION
[2025-10-17 10:30:05] [WARN] ==========================================
[2025-10-17 10:30:05] [WARN] This will REPLACE the current database with backup data!
[2025-10-17 10:30:05] [WARN] Target Database: whatsapp_saas
Are you sure you want to continue? (type 'yes' to proceed): yes
[2025-10-17 10:30:10] [INFO] Creating pre-restore snapshot...
[2025-10-17 10:31:45] [INFO] Pre-restore snapshot created
[2025-10-17 10:31:45] [INFO] Starting database restore...
[2025-10-17 10:35:20] [INFO] Database restore complete (215 seconds)
[2025-10-17 10:35:25] [INFO] Database queries successful
[2025-10-17 10:35:25] [INFO] Restored database size: 187 MB
[2025-10-17 10:35:25] [INFO] ==========================================
[2025-10-17 10:35:25] [INFO] Restore Complete
[2025-10-17 10:35:25] [INFO] ==========================================
```

**Safety Features:**

1. **Pre-Restore Snapshot:** Automatic backup before restore
2. **Confirmation Prompt:** Requires explicit "yes" confirmation
3. **Integrity Verification:** Validates backup before restoring
4. **Dry-Run Mode:** Test without making changes
5. **Rollback Support:** Pre-restore snapshot enables rollback

---

## Automated Scheduling

### Cron Setup

Use `setup-backup-cron.sh` to configure automated backups:

```bash
# Install cron jobs
sudo ./setup-backup-cron.sh --install

# Show current schedule
./setup-backup-cron.sh --show

# Test scripts
./setup-backup-cron.sh --test

# Remove cron jobs
sudo ./setup-backup-cron.sh --remove
```

###Default Schedule

```cron
# Daily backup at 3:00 AM UTC
0 3 * * * /path/to/backup-database.sh --daily >> /var/log/backups.log 2>&1

# Weekly backup at 2:00 AM UTC on Sunday
0 2 * * 0 /path/to/backup-database.sh --weekly >> /var/log/backups.log 2>&1

# Monthly backup at 1:00 AM UTC on the 1st
0 1 1 * * /path/to/backup-database.sh --monthly >> /var/log/backups.log 2>&1
```

### Custom Schedule

Edit crontab manually:

```bash
sudo crontab -e
```

Examples:

```cron
# Every 6 hours
0 */6 * * * /path/to/backup-database.sh --daily

# Every weekday at 2 AM
0 2 * * 1-5 /path/to/backup-database.sh --daily

# Twice daily (2 AM and 2 PM)
0 2,14 * * * /path/to/backup-database.sh --daily
```

---

## Monitoring & Alerts

### CloudWatch Setup

Install monitoring with `setup-backup-monitoring.sh`:

```bash
# Install with email notifications
./setup-backup-monitoring.sh --install --email admin@example.com

# Install with existing SNS topic
./setup-backup-monitoring.sh --install --sns-topic arn:aws:sns:...

# Test monitoring
./setup-backup-monitoring.sh --test

# Remove monitoring
./setup-backup-monitoring.sh --remove
```

### CloudWatch Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `BackupSuccess` | Successful backup count | Count |
| `BackupSize` | Backup file size | Bytes |
| `BackupDuration` | Time to complete backup | Seconds |
| `RestoreSuccess` | Successful restore count | Count |
| `RestoreDuration` | Time to complete restore | Seconds |

### CloudWatch Alarms

1. **Backup Failure Alarm**
   - Triggers when no successful backup in 24 hours
   - Severity: CRITICAL
   - Action: Email notification

2. **Backup Size Anomaly**
   - Triggers when size drops >50%
   - Severity: HIGH
   - Action: Email notification

3. **Backup Duration High**
   - Triggers when backup takes >30 minutes
   - Severity: MEDIUM
   - Action: Email notification

4. **Restore Test Missing**
   - Triggers when no restore test in 30 days
   - Severity: LOW
   - Action: Email reminder

### Dashboard

Access CloudWatch dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=WhatsAppSaaS-Backups
```

Dashboard includes:
- Backup success rate (24h)
- Backup size trend
- Backup duration metrics
- Restore test history
- Recent backup errors

---

## Testing & Validation

### Automated Testing

Run comprehensive test suite:

```bash
# Full test suite
./test-backup-restore.sh --full

# Backup functionality only
./test-backup-restore.sh --backup-only

# Restore functionality only
./test-backup-restore.sh --restore-only

# Integrity verification only
./test-backup-restore.sh --integrity-only

# Performance benchmarks
./test-backup-restore.sh --performance
```

### Test Reports

Tests generate detailed reports in `Backend/test-results/`:

```markdown
# Backup and Restore Test Report

**Date:** 2025-10-17 14:30:00
**Hostname:** prod-server-01
**Test Mode:** full

## Summary

- **Total Tests:** 7
- **Passed:** 7
- **Failed:** 0
- **Skipped:** 0

## Test Results

| Test Name | Result | Duration |
|-----------|--------|----------|
| backup_creation | PASS | 132s |
| backup_compression | PASS | 2s |
| backup_integrity | PASS | 15s |
| s3_upload | PASS | 65s |
| database_restore | PASS | 215s |
| data_integrity | PASS | 8s |
| backup_performance | PASS | 125s |
```

### Monthly Restore Test

**Requirement:** Perform restore test monthly to ensure recovery capability.

**Procedure:**

```bash
#!/bin/bash
# Monthly restore test (run on 1st of month)

# 1. List available backups
./restore-database.sh --list-backups

# 2. Select latest monthly backup
LATEST_BACKUP=$(./restore-database.sh --list-backups | grep "monthly" | head -n1 | awk '{print $4}')

# 3. Restore to test database
export DATABASE_URL="postgresql://user:pass@host:5432/test_restore"
./restore-database.sh --from-s3 "s3://bucket/database-backups/monthly/${LATEST_BACKUP}" --force

# 4. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM salons;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM bookings;"

# 5. Measure restore time
# (captured automatically in logs)

# 6. Clean up test database
psql postgresql://user:pass@host:5432/postgres -c "DROP DATABASE test_restore;"

# 7. Send CloudWatch metric
aws cloudwatch put-metric-data \
  --namespace "WhatsAppSaaS/Backups" \
  --metric-name "RestoreSuccess" \
  --value 1 \
  --unit "Count"
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

**Target RTO:** 2 hours from disaster detection to full service restoration

### Recovery Point Objective (RPO)

**Target RPO:** 24 hours (data loss limited to last 24 hours)

### Disaster Scenarios

#### Scenario 1: Database Corruption

**Detection:**
- Application errors
- Query failures
- Integrity check failures

**Recovery Steps:**

```bash
# 1. Verify corruption
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;"

# 2. Stop application
sudo systemctl stop whatsapp-saas

# 3. Restore from latest backup
./restore-database.sh --latest --force

# 4. Verify restoration
./test-backup-restore.sh --integrity-only

# 5. Start application
sudo systemctl start whatsapp-saas

# 6. Monitor for errors
tail -f /var/log/whatsapp-saas.log
```

**Estimated Time:** 30-45 minutes

#### Scenario 2: Complete Server Loss

**Detection:**
- Server unreachable
- Hardware failure
- Data center outage

**Recovery Steps:**

```bash
# 1. Provision new server
# (use Infrastructure as Code / CloudFormation)

# 2. Install dependencies
sudo apt-get update
sudo apt-get install postgresql-client awscli

# 3. Configure environment
export DATABASE_URL="postgresql://..."
export AWS_S3_BACKUP_BUCKET="..."

# 4. Download restore script
wget https://raw.githubusercontent.com/.../restore-database.sh
chmod +x restore-database.sh

# 5. Restore from S3
./restore-database.sh --from-s3 s3://bucket/database-backups/daily/latest.dump.gz --force

# 6. Deploy application
# (use deployment pipeline)

# 7. Verify functionality
curl https://new-server/healthz
```

**Estimated Time:** 1-2 hours

#### Scenario 3: Accidental Data Deletion

**Detection:**
- User reports missing data
- Audit logs show deletion events

**Recovery Steps:**

```bash
# 1. Identify deletion time
psql $DATABASE_URL -c "SELECT * FROM audit_log WHERE action='DELETE' ORDER BY timestamp DESC LIMIT 10;"

# 2. Find backup before deletion
./restore-database.sh --list-backups

# 3. Restore to temporary database
export DATABASE_URL="postgresql://.../ temp_recovery"
./restore-database.sh --from-s3 s3://bucket/.../backup_before_deletion.dump.gz --target-db temp_recovery --force

# 4. Export deleted data
pg_dump postgresql://.../temp_recovery --table=deleted_data --data-only > deleted_data.sql

# 5. Import to production
psql $DATABASE_URL < deleted_data.sql

# 6. Verify recovery
# (manual verification)

# 7. Clean up temp database
psql postgresql://.../postgres -c "DROP DATABASE temp_recovery;"
```

**Estimated Time:** 30-60 minutes

---

## Security & Compliance

### Encryption

**At Rest:**
- S3 server-side encryption (SSE-S3)
- AES-256 encryption
- Encrypted backups on local disk

**In Transit:**
- TLS 1.2+ for S3 uploads
- Encrypted database connections

**Enable S3 Encryption:**

```bash
aws s3api put-bucket-encryption \
  --bucket your-backup-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Access Control

**IAM Policy for Backup User:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-backup-bucket",
        "arn:aws:s3:::your-backup-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

### Compliance

**GDPR:**
- ✅ Data encryption at rest and in transit
- ✅ Access logs for audit trail
- ✅ Retention policies for data deletion
- ✅ Geographical data residency (S3 region selection)

**HIPAA (if applicable):**
- ✅ Encrypted backups
- ✅ Access control and authentication
- ✅ Audit logging
- ⚠️ Requires BAA with AWS

**PCI DSS (if handling payment data):**
- ✅ Secure backup storage
- ✅ Access controls
- ✅ Encryption
- ✅ Retention and disposal policies

---

## Troubleshooting

### Common Issues

#### Issue 1: Backup Script Fails with "Permission Denied"

**Symptoms:**
```
[ERROR] Failed to create backup directory
```

**Solution:**
```bash
# Fix directory permissions
sudo mkdir -p /var/backups/whatsapp-saas
sudo chown $USER:$USER /var/backups/whatsapp-saas
sudo chmod 750 /var/backups/whatsapp-saas

# Fix log permissions
sudo touch /var/log/backups.log
sudo chown $USER:$USER /var/log/backups.log
```

#### Issue 2: S3 Upload Fails

**Symptoms:**
```
[ERROR] S3 upload failed
```

**Diagnosis:**
```bash
# Test AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-backup-bucket/

# Check IAM permissions
aws iam get-user-policy --user-name backup-user --policy-name backup-policy
```

**Solution:**
```bash
# Reconfigure AWS CLI
aws configure

# Verify bucket exists
aws s3api head-bucket --bucket your-backup-bucket
```

#### Issue 3: Database Connection Fails

**Symptoms:**
```
[ERROR] Cannot connect to database
```

**Diagnosis:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check pg_isready
pg_isready -d $DATABASE_URL
```

**Solution:**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/dbname

# Test with components
psql -h host -p 5432 -U user -d dbname

# Check firewall/security groups
telnet host 5432
```

#### Issue 4: Restore Fails with "Invalid Dump File"

**Symptoms:**
```
[ERROR] Backup file is not a valid PostgreSQL dump
```

**Diagnosis:**
```bash
# Test gzip integrity
gunzip -t backup.dump.gz

# Check file type
file backup.dump.gz

# Check file size
ls -lh backup.dump.gz
```

**Solution:**
```bash
# Download fresh copy from S3
aws s3 cp s3://bucket/path/backup.dump.gz ./backup.dump.gz

# Verify integrity
./restore-database.sh --verify-only backup.dump.gz
```

#### Issue 5: Cron Jobs Not Running

**Symptoms:**
```
No backups being created at scheduled times
```

**Diagnosis:**
```bash
# Check cron service
sudo systemctl status cron

# View cron logs
grep CRON /var/log/syslog

# List crontab
crontab -l
```

**Solution:**
```bash
# Restart cron
sudo systemctl restart cron

# Verify environment in cron
# Add to crontab:
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# Test manually
/path/to/backup-database.sh --daily
```

---

## Appendix

### A. File Locations

```
Backend/scripts/
├── backup-database.sh              # Main backup script
├── restore-database.sh             # Main restore script
├── setup-backup-cron.sh            # Cron installation
├── setup-backup-monitoring.sh      # CloudWatch setup
└── test-backup-restore.sh          # Test suite

/var/backups/whatsapp-saas/         # Local backup storage
/var/log/backups.log                # Backup logs
/var/log/restores.log               # Restore logs

Backend/test-results/               # Test reports
```

### B. Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `AWS_S3_BACKUP_BUCKET` | Yes | S3 bucket name | `my-company-backups` |
| `AWS_REGION` | No | AWS region | `us-east-1` (default) |
| `NOTIFICATION_EMAIL` | No | Email for alerts | `admin@example.com` |
| `BACKUP_DIR` | No | Local backup directory | `/var/backups/whatsapp-saas` |
| `LOG_FILE` | No | Log file path | `/var/log/backups.log` |

### C. S3 Bucket Structure

```
s3://your-backup-bucket/
└── database-backups/
    ├── daily/
    │   ├── daily_20251017_030001.dump.gz
    │   ├── daily_20251017_030001.dump.gz.meta
    │   ├── daily_20251016_030001.dump.gz
    │   └── ...
    ├── weekly/
    │   ├── weekly_2025_W42_020001.dump.gz
    │   └── ...
    └── monthly/
        ├── monthly_2025_10_010001.dump.gz
        └── ...
```

### D. Backup Size Estimates

| Database Size | Compressed Backup Size | Backup Time | Restore Time |
|---------------|------------------------|-------------|--------------|
| 100 MB | ~20 MB | 15-30s | 30-60s |
| 1 GB | ~200 MB | 2-3min | 5-8min |
| 10 GB | ~2 GB | 15-20min | 30-45min |
| 100 GB | ~20 GB | 2-3hrs | 4-6hrs |

### E. Cost Estimates (AWS)

**S3 Storage (STANDARD_IA):**
- $0.0125 per GB/month
- 30 daily backups × 200MB = 6GB = $0.08/month
- 4 weekly backups × 200MB = 0.8GB = $0.01/month
- 12 monthly backups × 200MB = 2.4GB = $0.03/month
- **Total:** ~$0.12/month

**S3 Requests:**
- PUT requests: $0.01 per 1,000 requests
- GET requests: $0.001 per 1,000 requests
- ~100 requests/month = $0.001/month

**CloudWatch:**
- Metrics: First 10 metrics free
- Alarms: First 10 alarms free
- **Total:** $0/month (within free tier)

**Grand Total:** ~$0.12/month

### F. Performance Optimization Tips

1. **Use pigz for parallel compression:**
   ```bash
   sudo apt-get install pigz
   # Set USE_PIGZ=true in backup script
   ```

2. **Increase backup buffer:**
   ```bash
   # Add to backup command
   PGDUMP_OPTIONS="--verbose --format=custom --no-owner --no-acl --jobs=4"
   ```

3. **Use AWS Transfer Acceleration:**
   ```bash
   aws s3 cp file s3://bucket/ --endpoint-url https://bucket.s3-accelerate.amazonaws.com
   ```

4. **Compress before network transfer:**
   ```bash
   pg_dump | gzip | aws s3 cp - s3://bucket/backup.gz
   ```

### G. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-17 | Initial release |

---

## 🎯 Summary

This comprehensive backup solution provides:

✅ **Automated Protection** - Daily, weekly, monthly backups
✅ **Cloud Storage** - Encrypted S3 backups with retention
✅ **Monitoring** - Real-time CloudWatch metrics and alerts
✅ **Testing** - Automated test suite with verification
✅ **Documentation** - Complete procedures and troubleshooting
✅ **Disaster Recovery** - RTO: 2hrs, RPO: 24hrs

**Status:** ✅ Production Ready
**Next Review:** 2025-11-17

---

**Questions or Issues?**
Create an issue in the project repository or contact the DevOps team.
