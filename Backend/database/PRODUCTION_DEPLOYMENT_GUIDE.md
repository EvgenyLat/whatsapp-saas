# Production Database Deployment Guide
## WhatsApp SaaS Starter - Complete Infrastructure Setup

**Target Audience:** DevOps Engineers, Database Administrators
**Estimated Deployment Time:** 4-6 hours for initial setup
**Prerequisites:** Basic PostgreSQL and Docker knowledge

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Migration](#database-migration)
4. [Backup Configuration](#backup-configuration)
5. [Replication Setup](#replication-setup)
6. [Connection Pooling](#connection-pooling)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Security Hardening](#security-hardening)
9. [Performance Tuning](#performance-tuning)
10. [Validation and Testing](#validation-and-testing)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Pre-Deployment Checklist

### Environment Preparation
- [ ] AWS/Cloud provider account with appropriate permissions
- [ ] Domain name configured for database endpoints
- [ ] SSL certificates obtained and validated
- [ ] VPC and security groups configured
- [ ] Backup storage (S3 bucket) created
- [ ] Monitoring tools (Prometheus/Grafana) deployed
- [ ] Slack/PagerDuty webhooks configured

### Team Readiness
- [ ] On-call rotation established
- [ ] Runbooks reviewed by team
- [ ] Communication channels (Slack) set up
- [ ] Rollback plan documented
- [ ] Post-deployment checklist prepared

### Database Requirements
- [ ] Schema review completed
- [ ] Migration scripts tested in staging
- [ ] Seed data prepared
- [ ] Connection strings documented
- [ ] Credential management strategy defined

---

## Infrastructure Setup

### Option 1: AWS RDS (Recommended for Production)

#### Step 1: Create RDS PostgreSQL Instance
```bash
# Create primary RDS instance
aws rds create-db-instance \
  --db-instance-identifier whatsapp-saas-primary \
  --db-instance-class db.r6g.xlarge \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "${DB_PASSWORD}" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --multi-az \
  --publicly-accessible false \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name whatsapp-saas-subnet-group \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]' \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --tags Key=Environment,Value=production Key=Application,Value=whatsapp-saas
```

#### Step 2: Create Read Replicas
```bash
# Create first read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier whatsapp-saas-replica-1 \
  --source-db-instance-identifier whatsapp-saas-primary \
  --db-instance-class db.r6g.xlarge \
  --publicly-accessible false \
  --tags Key=Role,Value=read-replica

# Create second read replica (different AZ)
aws rds create-db-instance-read-replica \
  --db-instance-identifier whatsapp-saas-replica-2 \
  --source-db-instance-identifier whatsapp-saas-primary \
  --db-instance-class db.r6g.xlarge \
  --availability-zone us-east-1b \
  --publicly-accessible false \
  --tags Key=Role,Value=read-replica
```

#### Step 3: Configure Parameter Group
```bash
# Create custom parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name whatsapp-saas-pg15 \
  --db-parameter-group-family postgres15 \
  --description "WhatsApp SaaS optimized parameters"

# Apply optimized parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name whatsapp-saas-pg15 \
  --parameters \
    "ParameterName=shared_buffers,ParameterValue='{DBInstanceClassMemory/4}',ApplyMethod=pending-reboot" \
    "ParameterName=effective_cache_size,ParameterValue='{DBInstanceClassMemory*3/4}',ApplyMethod=immediate" \
    "ParameterName=maintenance_work_mem,ParameterValue=2097152,ApplyMethod=immediate" \
    "ParameterName=checkpoint_completion_target,ParameterValue=0.9,ApplyMethod=immediate" \
    "ParameterName=wal_buffers,ParameterValue=16384,ApplyMethod=pending-reboot" \
    "ParameterName=default_statistics_target,ParameterValue=100,ApplyMethod=immediate" \
    "ParameterName=random_page_cost,ParameterValue=1.1,ApplyMethod=immediate" \
    "ParameterName=effective_io_concurrency,ParameterValue=200,ApplyMethod=immediate" \
    "ParameterName=work_mem,ParameterValue=16384,ApplyMethod=immediate" \
    "ParameterName=min_wal_size,ParameterValue=1024,ApplyMethod=immediate" \
    "ParameterName=max_wal_size,ParameterValue=4096,ApplyMethod=immediate"

# Apply parameter group to instance
aws rds modify-db-instance \
  --db-instance-identifier whatsapp-saas-primary \
  --db-parameter-group-name whatsapp-saas-pg15 \
  --apply-immediately
```

### Option 2: Self-Hosted on EC2

#### Step 1: Launch EC2 Instances
```bash
# Launch primary database server
aws ec2 run-instances \
  --image-id ami-xxxxx \
  --instance-type r6g.xlarge \
  --key-name your-key \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/sda1",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Encrypted": true
      }
    }
  ]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=whatsapp-saas-db-primary}]'
```

#### Step 2: Install PostgreSQL
```bash
# SSH to instance
ssh -i your-key.pem ubuntu@primary-db-ip

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-15 postgresql-contrib-15

# Install additional tools
sudo apt-get -y install pgbouncer pg-activity postgresql-15-cron
```

---

## Database Migration

### Step 1: Apply Optimized Schema
```bash
# Navigate to project directory
cd /opt/whatsapp-saas/Backend

# Copy optimized schema
cp prisma/schema-optimized.prisma prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init --create-only

# Review migration file
cat prisma/migrations/*/migration.sql

# Apply migration to production
DATABASE_URL="postgresql://postgres:${PASSWORD}@primary.db.internal:5432/whatsapp_saas?sslmode=require" \
npx prisma migrate deploy
```

### Step 2: Verify Schema
```bash
# Connect to database
psql -h primary.db.internal -U postgres -d whatsapp_saas

# Verify tables
\dt

# Verify indexes
\di

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Backup Configuration

### Step 1: Deploy Backup Automation
```bash
# Copy backup script
sudo cp database/backup/backup-automation.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-automation.sh

# Set environment variables
export DB_HOST=primary.db.internal
export DB_PASSWORD=your_password
export S3_BUCKET=whatsapp-saas-backups
export SLACK_WEBHOOK=your_webhook_url

# Test backup
sudo -E /usr/local/bin/backup-automation.sh full

# Verify backup
ls -lh /var/backups/postgresql/
aws s3 ls s3://whatsapp-saas-backups/backups/postgresql/
```

### Step 2: Configure Cron Jobs
```bash
# Create backup user
sudo useradd -r -s /bin/bash backup

# Edit crontab
sudo crontab -e -u backup

# Add backup schedules
# Full backup daily at 2 AM
0 2 * * * /usr/local/bin/backup-automation.sh full >> /var/log/backups/backup.log 2>&1

# Incremental backup every hour
0 * * * * /usr/local/bin/backup-automation.sh incremental >> /var/log/backups/backup.log 2>&1

# Verify backups weekly on Sunday at 3 AM
0 3 * * 0 /usr/local/bin/backup-automation.sh verify >> /var/log/backups/verify.log 2>&1
```

### Step 3: Configure WAL Archiving
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add WAL archiving configuration
archive_mode = on
archive_command = 'test ! -f /var/backups/postgresql/wal_archive/%f && cp %p /var/backups/postgresql/wal_archive/%f'
archive_timeout = 300  # Archive every 5 minutes

# Create WAL archive directory
sudo mkdir -p /var/backups/postgresql/wal_archive
sudo chown postgres:postgres /var/backups/postgresql/wal_archive

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Replication Setup

### Step 1: Configure Primary Server
```bash
# Run replication setup script on primary
sudo bash database/replication/setup-replication.sh primary

# Verify replication configuration
sudo -u postgres psql -c "SHOW wal_level;"
sudo -u postgres psql -c "SELECT slot_name, active FROM pg_replication_slots;"
```

### Step 2: Configure Replica Servers
```bash
# SSH to replica server
ssh replica1.internal

# Set environment variables
export PRIMARY_HOST=primary.db.internal
export PRIMARY_PASSWORD=replicator_password
export REPLICA_NAME=replica1

# Run replication setup
sudo bash database/replication/setup-replication.sh replica replica1

# Verify replication
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
sudo -u postgres psql -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
```

### Step 3: Monitor Replication Lag
```bash
# On primary, check connected replicas
sudo -u postgres psql -c "
  SELECT
    application_name,
    client_addr,
    state,
    sync_state,
    replay_lag
  FROM pg_stat_replication;
"

# Set up monitoring alert
# (See monitoring section below)
```

---

## Connection Pooling

### Step 1: Install PgBouncer
```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# Copy configuration
sudo cp database/replication/pgbouncer-config.ini /etc/pgbouncer/pgbouncer.ini

# Create userlist
sudo nano /etc/pgbouncer/userlist.txt

# Add users (get password hash from PostgreSQL)
# "app_user" "scram-sha-256$4096:..."

# Set permissions
sudo chown pgbouncer:pgbouncer /etc/pgbouncer/pgbouncer.ini
sudo chmod 600 /etc/pgbouncer/userlist.txt
```

### Step 2: Start PgBouncer
```bash
# Enable and start service
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer

# Verify status
sudo systemctl status pgbouncer

# Test connection through PgBouncer
psql -h localhost -p 6432 -U app_user whatsapp_saas_primary
```

### Step 3: Update Application Connection String
```bash
# Update .env file
nano /opt/whatsapp-saas/Backend/.env

# Change from:
DATABASE_URL=postgresql://app_user:password@primary.db.internal:5432/whatsapp_saas

# To:
DATABASE_URL=postgresql://app_user:password@localhost:6432/whatsapp_saas_primary

# Restart application
docker-compose restart app
```

---

## Monitoring and Alerting

### Step 1: Deploy Monitoring Stack
```bash
# Navigate to monitoring directory
cd database/monitoring

# Set environment variables
export POSTGRES_PASSWORD=your_password
export GRAFANA_PASSWORD=your_grafana_password

# Deploy monitoring stack
docker-compose -f prometheus-postgres-exporter.yml up -d

# Verify services
docker-compose ps
```

### Step 2: Configure Prometheus
```bash
# Verify Prometheus is scraping metrics
curl http://localhost:9090/api/v1/targets

# Test query
curl 'http://localhost:9090/api/v1/query?query=pg_up'
```

### Step 3: Import Grafana Dashboards
```bash
# Access Grafana
# URL: http://your-server:3001
# Username: admin
# Password: (from GRAFANA_PASSWORD)

# Import PostgreSQL dashboard
# Dashboard ID: 9628 (PostgreSQL Database)
# Dashboard ID: 14114 (PostgreSQL Exporter Quickstart)
```

### Step 4: Configure Alertmanager
```bash
# Create alertmanager configuration
nano database/monitoring/alertmanager.yml

# Add Slack webhook
# Add PagerDuty integration
# Add email notifications

# Reload alertmanager
docker-compose -f prometheus-postgres-exporter.yml restart alertmanager
```

---

## Security Hardening

### Step 1: Configure SSL/TLS
```bash
# Generate SSL certificates
openssl req -new -x509 -days 365 -nodes -text \
  -out /etc/postgresql/15/main/server.crt \
  -keyout /etc/postgresql/15/main/server.key \
  -subj "/CN=primary.db.internal"

# Set permissions
chmod 600 /etc/postgresql/15/main/server.key
chown postgres:postgres /etc/postgresql/15/main/server.*

# Enable SSL in postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/15/main/server.crt'
ssl_key_file = '/etc/postgresql/15/main/server.key'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 2: Configure Authentication
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Require SSL for all remote connections
hostssl all all 0.0.0.0/0 scram-sha-256
hostssl replication all 0.0.0.0/0 scram-sha-256

# Reload PostgreSQL
sudo systemctl reload postgresql
```

### Step 3: Create Application Users
```bash
# Connect to database
sudo -u postgres psql

-- Create read-write user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE whatsapp_saas TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Create read-only user for analytics
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE whatsapp_saas TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Create backup user
CREATE USER backup_user WITH REPLICATION PASSWORD 'secure_password';
```

---

## Performance Tuning

### Step 1: Enable pg_stat_statements
```bash
# Add to postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000

# Restart PostgreSQL
sudo systemctl restart postgresql

# Create extension
sudo -u postgres psql -d whatsapp_saas -c "CREATE EXTENSION pg_stat_statements;"
```

### Step 2: Analyze Slow Queries
```bash
# Find slow queries
sudo -u postgres psql -d whatsapp_saas <<EOF
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF
```

### Step 3: Optimize Queries
```bash
# Add missing indexes based on slow queries
# (Refer to schema-optimized.prisma for recommended indexes)

# Run ANALYZE to update statistics
sudo -u postgres psql -d whatsapp_saas -c "ANALYZE;"

# Configure auto-vacuum
# Edit postgresql.conf:
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
```

---

## Validation and Testing

### Step 1: Connection Testing
```bash
# Test direct connection
psql -h primary.db.internal -U app_user -d whatsapp_saas -c "SELECT 1;"

# Test PgBouncer connection
psql -h localhost -p 6432 -U app_user whatsapp_saas_primary -c "SELECT 1;"

# Test read replica
psql -h replica1.db.internal -U readonly_user -d whatsapp_saas -c "SELECT pg_is_in_recovery();"
```

### Step 2: Load Testing
```bash
# Install pgbench
sudo apt-get install postgresql-contrib

# Initialize test data
pgbench -i -s 50 whatsapp_saas

# Run benchmark
pgbench -c 10 -j 2 -t 1000 whatsapp_saas

# Analyze results
# Monitor: connections, TPS, latency, replication lag
```

### Step 3: Failover Testing
```bash
# Simulate primary failure
sudo systemctl stop postgresql

# Verify replica promotion
# Run on replica:
sudo /usr/local/bin/promote-replica.sh

# Verify application connectivity
# Update DNS/load balancer
# Monitor for errors
```

---

## Troubleshooting Guide

### Issue: High Replication Lag
**Symptoms:** Replica is behind primary by > 60 seconds
**Solution:**
```bash
# Check network bandwidth
iftop -i eth0

# Check disk I/O
iostat -x 1

# Check replication slot
sudo -u postgres psql -c "SELECT * FROM pg_replication_slots;"

# If lag is persistent, rebuild replica
sudo bash database/replication/setup-replication.sh replica replica1
```

### Issue: Connection Pool Exhaustion
**Symptoms:** "FATAL: sorry, too many clients already"
**Solution:**
```bash
# Check PgBouncer stats
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS;"

# Increase pool size
sudo nano /etc/pgbouncer/pgbouncer.ini
# default_pool_size = 50

# Reload PgBouncer
sudo systemctl reload pgbouncer
```

### Issue: Slow Queries
**Symptoms:** High query latency in application
**Solution:**
```bash
# Find slow queries
sudo -u postgres psql -d whatsapp_saas -c "
  SELECT query, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;
"

# Analyze query plan
sudo -u postgres psql -d whatsapp_saas
EXPLAIN ANALYZE <slow_query>;

# Add missing indexes
# Run VACUUM ANALYZE
```

---

## Post-Deployment Checklist

- [ ] All services running (database, replicas, PgBouncer)
- [ ] Backups configured and tested
- [ ] Monitoring dashboards accessible
- [ ] Alerts configured and tested
- [ ] Application connected successfully
- [ ] Replication lag within acceptable limits
- [ ] SSL/TLS enabled and verified
- [ ] Performance benchmarks recorded
- [ ] Documentation updated
- [ ] Team trained on runbooks
- [ ] On-call rotation activated

---

## Next Steps

1. **Week 1:** Monitor closely, tune based on production load
2. **Week 2:** Implement query optimization based on slow query log
3. **Week 3:** Set up cross-region disaster recovery
4. **Month 2:** Implement table partitioning for large tables
5. **Month 3:** Consider sharding strategy for horizontal scaling

---

**Support:** Contact DevOps team in #database-ops Slack channel
**Emergency:** Page on-call DBA via PagerDuty
