# Database Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from JSON file storage to PostgreSQL database for the WhatsApp SaaS application.

**Migration Scope:**
- **Salon Data**: `data/salons.json` → `salons` table
- **Booking Data**: `data/bookings_{salonId}.json` → `bookings` table

**Key Features:**
- Zero downtime migration with backward compatibility
- Automatic backup of existing data
- Rollback capability
- Data validation and verification
- Idempotent operations (can run multiple times safely)

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Migration Steps](#migration-steps)
3. [Verification](#verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring](#monitoring)
7. [Post-Migration Cleanup](#post-migration-cleanup)

---

## Pre-Migration Checklist

### 1. Environment Validation

Ensure your environment meets the following requirements:

```bash
# Check Node.js version (require 14.x or higher)
node --version

# Check npm version
npm --version

# Verify PostgreSQL is running
# For local PostgreSQL:
psql --version

# For Docker:
docker ps | grep postgres
```

### 2. Database Connection

Verify database connectivity:

```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test database connection
npx prisma db execute --preview-feature --stdin <<< "SELECT version();"
```

### 3. Backup Existing Data

**CRITICAL**: Always backup before migration!

```bash
# Create manual backup directory
mkdir -p backups/pre-migration-$(date +%Y%m%d-%H%M%S)

# Backup JSON files
cp -r Backend/data/ backups/pre-migration-$(date +%Y%m%d-%H%M%S)/

# Backup database (if has existing data)
pg_dump $DATABASE_URL > backups/pre-migration-$(date +%Y%m%d-%H%M%S)/database.sql
```

### 4. Code Deployment

Ensure latest code is deployed:

```bash
cd Backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### 5. Dry Run

**ALWAYS** perform a dry run first:

```bash
# Dry run migration (no changes made)
node scripts/migrate-data.js --dry-run
```

Review the output carefully. Check for:
- Number of salons to be migrated
- Number of bookings to be migrated
- Any validation errors
- Any data inconsistencies

---

## Migration Steps

### Step 1: Apply Database Schema Migration

Apply the Prisma migration to add indexes and helper functions:

```bash
cd Backend

# Deploy migration
npm run db:deploy

# Or for development:
npm run db:migrate
```

**Expected Output:**
```
Applying migration `20250117000000_migrate_static_data`
The following migration have been applied:
migrations/
  └─ 20250117000000_migrate_static_data/
    └─ migration.sql
✓ Generated Prisma Client
```

### Step 2: Seed Default Data (Optional)

If starting fresh or need to populate from environment variables:

```bash
# Run seed script
npm run db:seed
```

This will:
- Load salon data from `data/salons.json` if exists
- Create default salon from environment variables
- Handle data conflicts gracefully

### Step 3: Migrate Existing Data

Migrate all JSON file data to PostgreSQL:

```bash
# Full migration
node scripts/migrate-data.js
```

The script will:
1. Backup all JSON files to `Backend/data_backup/`
2. Validate all data
3. Migrate salons first
4. Migrate bookings for each salon
5. Generate detailed report

**Expected Output Example:**
```
╔══════════════════════════════════════╗
║   DATA MIGRATION SCRIPT              ║
║   JSON Files → PostgreSQL            ║
╚══════════════════════════════════════╝

======================================
Backing up data files...
======================================
  ✓ Backed up: salons.json -> 2025-01-17T12-00-00-000Z_salons.json
  ✓ Backed up: bookings_env-default.json -> 2025-01-17T12-00-00-000Z_bookings_env-default.json

✓ Backed up 2 file(s) to C:\whatsapp-saas-starter\Backend\data_backup

======================================
Migrating salons...
======================================
Found 1 salon(s) in JSON file

[1/1] Processing: Default Salon (123456789)
  ✓ Migrated

======================================
Migrating bookings...
======================================
Found 1 booking file(s)

--- Processing: bookings_env-default.json (salon: env-default) ---
  Found 5 booking(s)

  [1/5] ABC123 - John Doe
    ✓ Migrated
  [2/5] DEF456 - Jane Smith
    ✓ Migrated
  ...

======================================
MIGRATION REPORT
======================================
MODE: FULL MIGRATION

Backups:
  Files backed up: 2

Salons:
  Successful: 1
  Failed: 0
  Skipped: 0

Bookings:
  Successful: 5
  Failed: 0
  Skipped: 0

Total Records:
  Migrated: 6
  Failed: 0
  Skipped: 0
======================================

Migration completed! Check the output above for any errors.
Backups are stored in: C:\whatsapp-saas-starter\Backend\data_backup
```

### Step 4: Restart Application

Restart the application to use the new database-backed modules:

```bash
# Stop current application
# (Press Ctrl+C if running in foreground)

# Start application
npm start

# Or for development:
npm run dev
```

---

## Verification

### 1. Database Verification

Check data in PostgreSQL:

```sql
-- Connect to database
psql $DATABASE_URL

-- Check salons
SELECT id, name, phone_number_id, created_at
FROM salons
ORDER BY created_at;

-- Check bookings count
SELECT salon_id, status, COUNT(*) as count
FROM bookings
GROUP BY salon_id, status;

-- Check recent bookings
SELECT booking_code, customer_name, service, start_ts, status
FROM bookings
ORDER BY created_at DESC
LIMIT 10;
```

### 2. API Verification

Test the API endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Webhook endpoint (simulated)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "metadata": {"phone_number_id": "YOUR_PHONE_ID"},
          "messages": [{
            "from": "1234567890",
            "type": "text",
            "text": {"body": "завтра 14:00"}
          }]
        }
      }]
    }]
  }'
```

### 3. Functional Testing

Run the automated test suite:

```bash
# Run migration tests
npm test -- database-migration.test.js

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### 4. Data Consistency Check

Verify data consistency between backup and database:

```bash
# Count salons in JSON backup
cat Backend/data_backup/$(ls -t Backend/data_backup | head -1)/*salons.json | jq length

# Count salons in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM salons;"

# Count bookings in JSON backups
for f in Backend/data_backup/$(ls -t Backend/data_backup | head -1)/bookings_*.json; do
  echo "$f: $(cat "$f" | jq length)";
done

# Count bookings in database
psql $DATABASE_URL -c "SELECT salon_id, COUNT(*) FROM bookings GROUP BY salon_id;"
```

### 5. Booking Creation Test

Test creating a new booking:

```bash
# Using your application's booking endpoint
# Or test directly in code:
node -e "
const bookings = require('./src/bookings');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
bookings.tryCreateBookingFromParsed(
  {
    date: tomorrow.toISOString().split('T')[0],
    time: '14:00',
    name: 'Test Customer',
    service: 'Test Service'
  },
  'test_phone',
  'env-default'
).then(result => console.log(JSON.stringify(result, null, 2)));
"
```

---

## Rollback Procedures

### Scenario 1: Data Migration Failed

If migration script fails partway through:

```bash
# The script is idempotent, so you can safely re-run it
node scripts/migrate-data.js

# Or restore from backup:
# 1. Restore JSON files
cp -r Backend/data_backup/TIMESTAMP/* Backend/data/

# 2. Clear partial database data
psql $DATABASE_URL << EOF
DELETE FROM bookings WHERE created_at > 'MIGRATION_START_TIME';
DELETE FROM salons WHERE created_at > 'MIGRATION_START_TIME';
EOF
```

### Scenario 2: Application Issues After Migration

If application has issues after migration:

**Option A: Revert Code Changes**

```bash
# If using git
git revert HEAD

# Or restore previous versions of files
# salons.js, bookings.js, database/client.js
```

**Option B: Use Hybrid Mode**

The refactored code includes fallback to environment variables. Ensure these are set:

```bash
# In .env file
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### Scenario 3: Complete Rollback

If you need to completely revert to JSON file storage:

```bash
# 1. Restore original code files from git
git checkout HEAD~1 -- Backend/src/salons.js
git checkout HEAD~1 -- Backend/src/bookings.js

# 2. Restore JSON data files
cp -r Backend/data_backup/LATEST_TIMESTAMP/* Backend/data/

# 3. Restart application
npm restart
```

### Scenario 4: Database Corruption

If database becomes corrupted:

```bash
# 1. Drop and recreate database
psql $DATABASE_URL << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

# 2. Reset and reapply migrations
npm run db:reset

# 3. Re-run migration from backups
node scripts/migrate-data.js
```

---

## Troubleshooting

### Issue 1: Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Or start PostgreSQL
docker-compose up -d postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Issue 2: Permission Denied

**Symptoms:**
```
Error: permission denied for table salons
```

**Solution:**
```sql
-- Connect as superuser
psql $DATABASE_URL

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Issue 3: Unique Constraint Violation

**Symptoms:**
```
Error: Unique constraint failed on the fields: (`phone_number_id`)
```

**Solution:**
```bash
# Migration script is idempotent, but you may need to clear duplicates
psql $DATABASE_URL << EOF
-- Find duplicates
SELECT phone_number_id, COUNT(*)
FROM salons
GROUP BY phone_number_id
HAVING COUNT(*) > 1;

-- Keep only the latest
DELETE FROM salons
WHERE id NOT IN (
  SELECT MAX(id)
  FROM salons
  GROUP BY phone_number_id
);
EOF
```

### Issue 4: Missing Data Files

**Symptoms:**
```
Warning: Could not load data/salons.json
```

**Solution:**

This is not an error if you're starting fresh. The seed script will create data from environment variables.

If you need to restore:
```bash
# Restore from backup
cp Backend/data_backup/TIMESTAMP/* Backend/data/
```

### Issue 5: Date/Time Format Issues

**Symptoms:**
```
Error: Invalid date format
```

**Solution:**

The migration handles multiple date formats. If issues persist:

```javascript
// Check booking data format
const fs = require('fs');
const bookings = JSON.parse(fs.readFileSync('Backend/data/bookings_default.json'));
console.log(bookings[0].start_ts); // Should be ISO string

// Fix format if needed
bookings.forEach(b => {
  b.start_ts = new Date(b.start_ts).toISOString();
});
fs.writeFileSync('Backend/data/bookings_default.json', JSON.stringify(bookings, null, 2));
```

### Issue 6: Status Enum Mismatch

**Symptoms:**
```
Error: Invalid value for enum BookingStatus
```

**Solution:**

The migration automatically maps status values:
- `'confirmed'` → `'CONFIRMED'`
- `'cancelled'` → `'CANCELLED'`

If you have custom status values:

```sql
-- Update Prisma schema to include new status
-- Then regenerate client
npm run db:generate
```

---

## Monitoring

### Key Metrics to Monitor

#### 1. Database Connection Pool

```javascript
// In your application
db.prisma.$metrics().then(metrics => {
  console.log('Connection pool metrics:', metrics);
});
```

#### 2. Query Performance

Monitor slow queries:

```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE your_db SET log_min_duration_statement = 1000;

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 3. Database Size

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('your_database'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 4. Booking Conflicts

Monitor booking conflict rate:

```sql
-- Daily booking conflict rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  -- This would need application-level logging
FROM webhook_logs
WHERE event_type = 'booking_attempt'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Health Check Queries

Add to your monitoring system:

```sql
-- Database connectivity
SELECT 1;

-- Record counts
SELECT
  (SELECT COUNT(*) FROM salons) as salons,
  (SELECT COUNT(*) FROM bookings) as bookings;

-- Replication lag (if using replication)
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- Lock monitoring
SELECT
  locktype,
  relation::regclass,
  mode,
  granted
FROM pg_locks
WHERE NOT granted;
```

### Application Monitoring

```javascript
// Add to your Express app
app.get('/health', async (req, res) => {
  try {
    const health = await db.healthCheck();

    const stats = {
      status: health.status,
      timestamp: health.timestamp,
      database: {
        connected: health.status === 'healthy',
        salons: await db.prisma.salon.count(),
        bookings: await db.prisma.booking.count(),
        activeBookings: await db.prisma.booking.count({
          where: { status: 'CONFIRMED' }
        })
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(stats);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

---

## Post-Migration Cleanup

### After Successful Migration (Wait 7-14 Days)

Once you've verified the migration is successful and stable:

#### 1. Archive JSON Files

```bash
# Move to long-term archive
mkdir -p archives/json-storage-$(date +%Y%m%d)
mv Backend/data/*.json archives/json-storage-$(date +%Y%m%d)/

# Create archive
tar -czf archives/json-storage-$(date +%Y%m%d).tar.gz archives/json-storage-$(date +%Y%m%d)/

# Optional: Upload to S3 or backup storage
# aws s3 cp archives/json-storage-$(date +%Y%m%d).tar.gz s3://your-bucket/archives/
```

#### 2. Remove Backup Directory

```bash
# After 30 days, if everything is stable
rm -rf Backend/data_backup/
```

#### 3. Update Documentation

Update your README and documentation to reflect PostgreSQL usage:

```markdown
# Update README.md
## Database
- PostgreSQL 14+
- Managed via Prisma ORM
- See DATABASE_MIGRATION.md for migration history
```

#### 4. Remove Fallback Code (Optional)

If you're confident in the database approach:

```javascript
// In salons.js, remove environment variable fallback
// Keep only database logic
```

#### 5. Optimize Database

```sql
-- Analyze tables for query optimization
ANALYZE salons;
ANALYZE bookings;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Update statistics
UPDATE pg_stat_user_tables SET n_mod_since_analyze = 0;
```

#### 6. Set Up Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/whatsapp-saas-$(date +\%Y\%m\%d).sql.gz

# Backup retention (keep 30 days)
0 3 * * * find /backups -name "whatsapp-saas-*.sql.gz" -mtime +30 -delete
```

---

## Performance Optimization

### Index Optimization

The migration adds these indexes automatically:

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Connection Pooling

Configure PgBouncer or use Prisma connection pooling:

```javascript
// In database/client.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  connection_limit: 10,
  pool_timeout: 10,
});
```

### Query Optimization

Monitor and optimize slow queries:

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Common Issues and Solutions

### High CPU Usage

**Cause**: Missing indexes or inefficient queries

**Solution**:
```sql
-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
```

### Connection Pool Exhaustion

**Cause**: Too many concurrent connections

**Solution**:
```javascript
// Implement connection pooling
// Use PgBouncer or increase pool size
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"
```

### Lock Contention

**Cause**: Long-running transactions

**Solution**:
```sql
-- Monitor locks
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Kill problematic query
SELECT pg_terminate_backend(pid);
```

---

## Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

### RTO: 15 minutes
- Time to restore from backup and restart application
- Assumes daily backups are available

### RPO: 5 minutes
- With continuous replication: 0-5 minutes of data loss
- With daily backups: up to 24 hours of data loss

### To Improve RTO/RPO:

1. **Continuous Backup**: Use WAL archiving
2. **Replication**: Set up streaming replication
3. **Monitoring**: Real-time alerts for failures
4. **Automated Failover**: Use tools like Patroni or Stolon

---

## Support and Escalation

### Level 1: Self-Service
- Review this documentation
- Check troubleshooting section
- Run verification scripts

### Level 2: Database Administrator
- Complex query issues
- Performance optimization
- Replication issues

### Level 3: Engineering Team
- Application bugs
- Data corruption
- Schema changes

---

## Appendix

### A. Migration Script Options

```bash
# Dry run (no changes)
node scripts/migrate-data.js --dry-run

# Backup only
node scripts/migrate-data.js --backup-only

# Full migration
node scripts/migrate-data.js
```

### B. Useful SQL Queries

```sql
-- Check all bookings for a specific date
SELECT * FROM bookings
WHERE DATE(start_ts) = '2025-01-17'
ORDER BY start_ts;

-- Find double bookings
SELECT salon_id, start_ts, COUNT(*)
FROM bookings
WHERE status = 'CONFIRMED'
GROUP BY salon_id, start_ts
HAVING COUNT(*) > 1;

-- Booking statistics
SELECT
  DATE(start_ts) as date,
  status,
  COUNT(*) as count
FROM bookings
GROUP BY DATE(start_ts), status
ORDER BY date DESC;
```

### C. Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/whatsapp_saas
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token

# Optional
SALON_NAME="My Salon"
NODE_ENV=production
```

### D. Database Schema

See `Backend/prisma/schema.prisma` for complete schema definition.

Key tables:
- `salons`: Salon configuration
- `bookings`: Customer bookings
- `messages`: WhatsApp message log
- `conversations`: Conversation tracking

---

## Changelog

- **2025-01-17**: Initial migration from JSON to PostgreSQL
- Migration includes indexes for performance
- Backward compatibility maintained
- Fallback to environment variables for single-tenant mode

---

## Conclusion

This migration provides a robust, scalable foundation for your WhatsApp SaaS application. The database-backed approach enables:

- **Better Performance**: Indexed queries vs. file scans
- **Data Integrity**: ACID transactions
- **Scalability**: Support for multiple salons and high volume
- **Reliability**: Automated backups and replication
- **Advanced Features**: Complex queries, reporting, analytics

For questions or issues, consult this guide's troubleshooting section or contact your database administrator.
