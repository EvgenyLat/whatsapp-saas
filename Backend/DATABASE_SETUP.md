# PostgreSQL Database Setup Guide
## WhatsApp SaaS Platform - Backend Database Configuration

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Docker Installation](#docker-installation)
3. [Database Setup](#database-setup)
4. [Prisma Migrations](#prisma-migrations)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Backup and Recovery](#backup-and-recovery)
8. [Monitoring](#monitoring)

---

## Prerequisites

### Required Software
- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **Docker Desktop**: Latest version for Windows
- **Git Bash** or **PowerShell**: For running commands

### Database Requirements
- PostgreSQL 16
- Redis 7 (for caching)
- Minimum 2GB RAM available
- 5GB disk space

---

## Docker Installation

### Step 1: Install Docker Desktop for Windows

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download Windows version
   - File size: ~500MB

2. **Install Docker Desktop**
   ```powershell
   # Run the installer as Administrator
   # Follow the installation wizard
   # Enable WSL 2 feature when prompted
   ```

3. **Verify Installation**
   ```powershell
   docker --version
   # Expected output: Docker version 24.x.x, build xxxxxxx

   docker-compose --version
   # Expected output: Docker Compose version v2.x.x
   ```

4. **Start Docker Desktop**
   - Launch Docker Desktop from Start Menu
   - Wait for "Docker Desktop is running" indicator
   - Check system tray for Docker icon (should be green)

### Alternative: Windows Subsystem for Linux (WSL2)

If Docker Desktop doesn't work, you can use WSL2:

```powershell
# Enable WSL2
wsl --install

# Install Ubuntu
wsl --install -d Ubuntu

# Inside WSL2 Ubuntu terminal:
sudo apt update
sudo apt install docker.io docker-compose postgresql-client -y
sudo service docker start
```

---

## Database Setup

### Option 1: Using Docker Compose (Recommended)

#### Start Database Services

```bash
cd C:\whatsapp-saas-starter\backend

# Start PostgreSQL and Redis only
docker-compose -f docker-compose.db.yml up -d

# Check service status
docker-compose -f docker-compose.db.yml ps

# View logs
docker-compose -f docker-compose.db.yml logs -f postgres
```

#### Expected Output
```
✓ Container whatsapp-saas-postgres-dev  Started
✓ Container whatsapp-saas-redis-dev     Started
```

#### Start with Management Tools (Optional)

```bash
# Start database + Adminer + pgAdmin + Redis Commander
docker-compose -f docker-compose.db.yml --profile tools up -d

# Access URLs:
# - Adminer: http://localhost:8080
# - pgAdmin: http://localhost:5050 (admin@whatsapp-saas.local / admin)
# - Redis Commander: http://localhost:8081
```

### Option 2: Using Root Docker Compose

```bash
cd C:\whatsapp-saas-starter

# Start only database services
docker-compose up -d postgres redis

# Verify
docker-compose ps postgres redis
```

### Option 3: Manual PostgreSQL Installation (Without Docker)

If Docker is not available, install PostgreSQL directly:

1. **Download PostgreSQL 16**
   - Visit: https://www.postgresql.org/download/windows/
   - Download installer for Windows

2. **Install PostgreSQL**
   ```
   - Port: 5432
   - Superuser: postgres
   - Password: postgres
   - Database: postgres (will create whatsapp_saas later)
   ```

3. **Create Database**
   ```powershell
   # Open Command Prompt
   cd "C:\Program Files\PostgreSQL\16\bin"

   # Create database
   psql -U postgres
   # Enter password: postgres

   CREATE DATABASE whatsapp_saas;
   \l  # List databases to verify
   \q  # Quit
   ```

4. **Install Redis (Optional)**
   - Download from: https://github.com/microsoftarchive/redis/releases
   - Or use WSL2 to run Redis

---

## Prisma Migrations

### Step 1: Verify Environment Configuration

```bash
cd C:\whatsapp-saas-starter\backend

# Check DATABASE_URL in .env.development
type .env.development | findstr DATABASE_URL
```

Expected:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas?schema=public
```

### Step 2: Generate Prisma Client

```bash
cd C:\whatsapp-saas-starter\backend

# Generate Prisma Client
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client to ./node_modules/.prisma/client
```

### Step 3: Run Initial Migration

```bash
# Create and apply initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create migrations folder
# 2. Generate SQL migration file
# 3. Apply migration to database
# 4. Regenerate Prisma Client
```

Expected output:
```
Environment variables loaded from .env.development
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "whatsapp_saas"

Applying migration `20250121000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250121000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client to ./node_modules/.prisma/client
```

### Step 4: Verify Migration Status

```bash
# Check migration status
npx prisma migrate status

# Expected: "Database schema is up to date!"
```

---

## Verification

### Verify Database Connection

```bash
cd C:\whatsapp-saas-starter\backend

# Test connection
npx prisma db pull

# Should output: "Introspecting based on datasource defined in schema.prisma"
```

### Verify Tables Creation

#### Option 1: Using Prisma Studio (Recommended)

```bash
npx prisma studio

# Opens browser at: http://localhost:5555
# Browse all tables and data visually
```

#### Option 2: Using psql Command Line

```bash
# If using Docker:
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas

# If using local PostgreSQL:
psql -U postgres -d whatsapp_saas

# Then run:
\dt  # List all tables

# Expected tables:
# - salons
# - bookings
# - messages
# - templates
# - conversations
# - webhook_logs
# - ai_conversations
# - ai_messages
# - _prisma_migrations
```

#### Option 3: Using SQL Query

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output:
```
     table_name
---------------------
 ai_conversations
 ai_messages
 bookings
 conversations
 messages
 salons
 templates
 webhook_logs
 _prisma_migrations
(9 rows)
```

### Verify Indexes

```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Database Size

```sql
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'whatsapp_saas';
```

---

## Troubleshooting

### Issue 1: Docker Not Starting

**Symptoms:**
```
Cannot connect to the Docker daemon
```

**Solutions:**
1. Start Docker Desktop manually
2. Check if Docker service is running:
   ```powershell
   Get-Service -Name "*docker*"
   ```
3. Restart Docker Desktop
4. Check Docker logs in: `C:\Users\<YourUser>\AppData\Local\Docker`

### Issue 2: Port Already in Use

**Symptoms:**
```
Error: Port 5432 is already allocated
```

**Solutions:**

1. Check what's using the port:
   ```powershell
   netstat -ano | findstr :5432
   ```

2. Stop the process:
   ```powershell
   # Find PID from above command, then:
   taskkill /PID <PID> /F
   ```

3. Or change port in docker-compose.db.yml:
   ```yaml
   ports:
     - "5433:5432"  # Use port 5433 on host
   ```

   Then update DATABASE_URL:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/whatsapp_saas?schema=public
   ```

### Issue 3: Migration Fails

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker logs whatsapp-saas-postgres-dev
   ```

3. Verify DATABASE_URL:
   ```bash
   echo %DATABASE_URL%  # Windows CMD
   echo $env:DATABASE_URL  # PowerShell
   ```

4. Test connection manually:
   ```bash
   docker exec -it whatsapp-saas-postgres-dev psql -U postgres -c "SELECT version();"
   ```

### Issue 4: Prisma Client Out of Sync

**Symptoms:**
```
Error: Prisma Client is not generated yet
```

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate --force

# Or clear cache and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue 5: Permission Denied

**Symptoms:**
```
Error: permission denied for database
```

**Solution:**
```bash
# Grant all privileges
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE whatsapp_saas TO postgres;"
```

---

## Backup and Recovery

### Automated Backup Script

Create `scripts/backup-db.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="whatsapp_saas_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="whatsapp-saas-postgres-dev"
DB_NAME="whatsapp_saas"
DB_USER="postgres"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_FILE"
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Delete backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_FILE.gz"
```

### Manual Backup

```bash
# Create backup
docker exec -t whatsapp-saas-postgres-dev pg_dump -U postgres -d whatsapp_saas > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Decompress backup
gunzip backup_20250121.sql.gz

# Restore to database
docker exec -i whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas < backup_20250121.sql
```

### Backup Schedule (Windows Task Scheduler)

1. Create PowerShell script: `scripts/backup-db.ps1`
   ```powershell
   $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
   $backupFile = "whatsapp_saas_backup_$timestamp.sql"
   docker exec -t whatsapp-saas-postgres-dev pg_dump -U postgres -d whatsapp_saas | Out-File -FilePath "backups\$backupFile"
   ```

2. Create scheduled task:
   ```powershell
   # Run as Administrator
   $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\whatsapp-saas-starter\backend\scripts\backup-db.ps1"
   $trigger = New-ScheduledTaskTrigger -Daily -At 2am
   Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "WhatsApp-SaaS-DB-Backup" -Description "Daily database backup"
   ```

---

## Monitoring

### Connection Pool Monitoring

```sql
-- Current connections
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity
WHERE datname = 'whatsapp_saas';
```

### Database Size Monitoring

```sql
-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Slow Query Monitoring

```sql
-- Enable slow query logging (in Docker)
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
docker restart whatsapp-saas-postgres-dev

-- View slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index Usage Monitoring

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "=== Database Health Check ==="

# Check if container is running
if docker ps | grep -q whatsapp-saas-postgres-dev; then
    echo "✓ PostgreSQL container is running"
else
    echo "✗ PostgreSQL container is not running"
    exit 1
fi

# Check database connection
if docker exec whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas -c "SELECT 1" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Cannot connect to database"
    exit 1
fi

# Check table count
TABLE_COUNT=$(docker exec whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
echo "✓ Tables count: $TABLE_COUNT"

# Check replication lag (if applicable)
# docker exec whatsapp-saas-postgres-dev psql -U postgres -c "SELECT pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag;"

echo "=== Health Check Complete ==="
```

---

## Quick Reference Commands

### Docker Commands

```bash
# Start services
docker-compose -f docker-compose.db.yml up -d

# Stop services
docker-compose -f docker-compose.db.yml down

# Restart PostgreSQL
docker restart whatsapp-saas-postgres-dev

# View logs
docker logs -f whatsapp-saas-postgres-dev

# Execute SQL
docker exec -it whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas

# Backup
docker exec -t whatsapp-saas-postgres-dev pg_dump -U postgres -d whatsapp_saas > backup.sql

# Restore
docker exec -i whatsapp-saas-postgres-dev psql -U postgres -d whatsapp_saas < backup.sql
```

### Prisma Commands

```bash
# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Check migration status
npx prisma migrate status

# Pull database schema
npx prisma db pull

# Push schema changes (without migration)
npx prisma db push
```

---

## Next Steps

After successful database setup:

1. **Test Authentication Module**: Implement user registration and login
2. **Set Up Monitoring**: Configure Prometheus and Grafana
3. **Configure Backups**: Set up automated backup schedule
4. **Implement Seeding**: Create seed data for development
5. **Set Up Replication**: Configure read replicas for production
6. **Performance Tuning**: Optimize indexes and queries

---

## Support and Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/16/
- **Prisma Documentation**: https://www.prisma.io/docs
- **Docker Documentation**: https://docs.docker.com/
- **Project Repository**: [Your GitHub Repo]
- **Issue Tracker**: [Your Issue Tracker]

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Maintainer**: WhatsApp SaaS Platform Team
