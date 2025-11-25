# WhatsApp SaaS Platform - Disaster Recovery Runbook

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Recovery Time Objectives (RTO)](#recovery-time-objectives-rto)
4. [Recovery Point Objectives (RPO)](#recovery-point-objectives-rpo)
5. [Database Recovery Procedures](#database-recovery-procedures)
6. [Application Recovery Procedures](#application-recovery-procedures)
7. [Infrastructure Recovery Procedures](#infrastructure-recovery-procedures)
8. [Verification and Testing](#verification-and-testing)

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| On-Call Engineer | TBD | TBD | 24/7 |
| DevOps Lead | TBD | TBD | Business Hours |
| CTO | TBD | TBD | Emergency Only |
| AWS Support | AWS TAM | Case Portal | 24/7 |

---

## Disaster Scenarios

### Scenario 1: Database Failure (RDS Primary Down)

**Detection:**
- CloudWatch alarm: `whatsapp-saas-production-rds-*`
- Application unable to connect to database
- Error rate spike (> 50%)

**Impact:** Complete service outage

**Recovery Steps:**

1. **Verify Multi-AZ failover (automatic - 1-2 minutes)**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier whatsapp-saas-production \
     --query 'DBInstances[0].DBInstanceStatus'
   ```

2. **If failover fails, restore from latest snapshot:**
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier whatsapp-saas-production \
     --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
     --output table

   # Restore from snapshot
   ./scripts/restore-database.sh --snapshot <snapshot-id>
   ```

3. **Update application connection string**
   ```bash
   # Update Secrets Manager with new endpoint
   aws secretsmanager update-secret \
     --secret-id whatsapp-saas-production-db-credentials \
     --secret-string '{"host":"new-endpoint","port":5432,...}'

   # Force ECS service to pick up new credentials
   aws ecs update-service \
     --cluster whatsapp-saas-production-cluster \
     --service whatsapp-saas-production-service \
     --force-new-deployment
   ```

4. **Verify application recovery**
   ```bash
   ./scripts/validate-production.sh
   ```

**Expected Recovery Time:** 10-15 minutes

---

### Scenario 2: Redis Cache Failure

**Detection:**
- CloudWatch alarm: `whatsapp-saas-production-redis-*`
- Application performance degradation
- Cache miss rate > 90%

**Impact:** Performance degradation (not complete outage)

**Recovery Steps:**

1. **Check replication group status**
   ```bash
   aws elasticache describe-replication-groups \
     --replication-group-id whatsapp-saas-production
   ```

2. **If primary node failed, trigger failover**
   ```bash
   aws elasticache test-failover \
     --replication-group-id whatsapp-saas-production \
     --node-group-id 0001
   ```

3. **Application will gracefully degrade (cache misses go to database)**

4. **Monitor database load** - scale up if needed
   ```bash
   # Check RDS CPU and connections
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name CPUUtilization \
     --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-production \
     --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Average
   ```

**Expected Recovery Time:** 3-5 minutes

---

### Scenario 3: Complete Regional Failure (us-east-1)

**Detection:**
- AWS Health Dashboard shows regional issues
- Multiple CloudWatch alarms firing
- Complete service unavailability

**Impact:** Complete outage until recovery

**Recovery Steps:**

1. **Assess scope of regional failure**
   - Check AWS Service Health Dashboard
   - Verify if RDS, ElastiCache, ECS all affected

2. **If prolonged outage (> 30 minutes), restore in alternate region:**

   **WARNING:** This requires DR infrastructure pre-deployed in secondary region

   ```bash
   # Set target region
   export AWS_REGION=us-west-2

   # Deploy infrastructure to secondary region
   cd terraform/environments/dr
   terraform init
   terraform apply -auto-approve

   # Restore database from cross-region snapshot
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier whatsapp-saas-dr \
     --db-snapshot-identifier <cross-region-snapshot> \
     --region us-west-2

   # Deploy application
   ./scripts/deploy-application.sh --region us-west-2

   # Update DNS to point to DR region ALB
   # (This step depends on your DNS provider)
   ```

3. **Communicate with users via status page**

**Expected Recovery Time:** 2-4 hours (without pre-deployed DR infrastructure)

---

### Scenario 4: Application Failure (ECS Service Down)

**Detection:**
- CloudWatch alarm: `whatsapp-saas-production-alb-unhealthy-targets`
- All ECS tasks failing health checks
- HTTP 503 errors from ALB

**Impact:** Complete service outage

**Recovery Steps:**

1. **Check ECS service events**
   ```bash
   aws ecs describe-services \
     --cluster whatsapp-saas-production-cluster \
     --services whatsapp-saas-production-service \
     --query 'services[0].events[:10]'
   ```

2. **Check recent task failures**
   ```bash
   aws ecs list-tasks \
     --cluster whatsapp-saas-production-cluster \
     --service-name whatsapp-saas-production-service \
     --desired-status STOPPED \
     --max-results 5

   # Get stopped reason
   aws ecs describe-tasks \
     --cluster whatsapp-saas-production-cluster \
     --tasks <task-arn> \
     --query 'tasks[0].stoppedReason'
   ```

3. **View application logs**
   ```bash
   aws logs tail /ecs/whatsapp-saas-production \
     --since 10m \
     --follow
   ```

4. **Common fixes:**

   **A. Bad deployment (new code causing crashes):**
   ```bash
   # Rollback to previous task definition
   aws ecs update-service \
     --cluster whatsapp-saas-production-cluster \
     --service whatsapp-saas-production-service \
     --task-definition whatsapp-saas-production:<previous-revision>
   ```

   **B. Database connection issues:**
   ```bash
   # Check database connectivity
   ./scripts/validate-production.sh

   # Restart service to re-establish connections
   aws ecs update-service \
     --cluster whatsapp-saas-production-cluster \
     --service whatsapp-saas-production-service \
     --force-new-deployment
   ```

   **C. Secrets Manager issues:**
   ```bash
   # Verify secrets exist and are accessible
   aws secretsmanager get-secret-value \
     --secret-id whatsapp-saas-production-db-credentials

   # Check ECS task execution role permissions
   aws iam simulate-principal-policy \
     --policy-source-arn <task-execution-role-arn> \
     --action-names secretsmanager:GetSecretValue
   ```

5. **Scale up service if needed**
   ```bash
   aws ecs update-service \
     --cluster whatsapp-saas-production-cluster \
     --service whatsapp-saas-production-service \
     --desired-count 4
   ```

**Expected Recovery Time:** 5-10 minutes

---

### Scenario 5: Data Corruption / Accidental Deletion

**Detection:**
- User reports data missing
- Database integrity check fails
- Application errors indicating missing records

**Impact:** Data loss for specific users/timeframe

**Recovery Steps:**

1. **Assess scope of corruption**
   ```bash
   # Connect to database and investigate
   psql -h <db-host> -U <db-user> -d whatsapp_saas_prod

   # Check affected tables
   SELECT COUNT(*) FROM salons WHERE updated_at > '2024-01-01';
   SELECT COUNT(*) FROM bookings WHERE created_at > '2024-01-01';
   ```

2. **Identify backup to restore from**
   ```bash
   # List available backups
   aws s3 ls s3://whatsapp-saas-production-backups/database-backups/ \
     --recursive \
     --human-readable

   # Or list RDS snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier whatsapp-saas-production
   ```

3. **Option A: Point-in-time recovery (if within 7 days)**
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier whatsapp-saas-production \
     --target-db-instance-identifier whatsapp-saas-prod-pit-recovery \
     --restore-time 2024-01-15T14:30:00Z
   ```

4. **Option B: Restore from backup to temporary database**
   ```bash
   # Create temporary RDS instance
   aws rds create-db-instance \
     --db-instance-identifier whatsapp-saas-temp-restore \
     --db-instance-class db.t3.small \
     --engine postgres \
     --master-username postgres \
     --master-user-password <temp-password>

   # Restore backup to temp instance
   ./scripts/restore-database.sh \
     --backup whatsapp_saas_prod_20240115_143000.sql \
     --target whatsapp-saas-temp-restore

   # Export affected data
   pg_dump -h <temp-host> -U postgres -d whatsapp_saas_prod \
     -t salons -t bookings \
     --data-only \
     --file=/tmp/recovered_data.sql

   # Import to production (carefully!)
   psql -h <prod-host> -U <prod-user> -d whatsapp_saas_prod \
     < /tmp/recovered_data.sql

   # Delete temp instance
   aws rds delete-db-instance \
     --db-instance-identifier whatsapp-saas-temp-restore \
     --skip-final-snapshot
   ```

5. **Verify data recovery**
   ```bash
   # Query affected records
   psql -h <db-host> -U <db-user> -d whatsapp_saas_prod -c \
     "SELECT COUNT(*) FROM salons WHERE id IN (<affected-ids>);"
   ```

**Expected Recovery Time:** 30 minutes - 2 hours (depending on data volume)

---

## Recovery Time Objectives (RTO)

| Component | Target RTO | Maximum Acceptable Downtime |
|-----------|------------|-----------------------------|
| Database (Multi-AZ Failover) | 2 minutes | 5 minutes |
| Database (Snapshot Restore) | 15 minutes | 30 minutes |
| Redis Cache | 5 minutes | 10 minutes |
| ECS Application | 10 minutes | 20 minutes |
| Complete Regional DR | 4 hours | 8 hours |

---

## Recovery Point Objectives (RPO)

| Component | Target RPO | Maximum Data Loss |
|-----------|------------|-------------------|
| Database (Multi-AZ) | 0 seconds | 1 minute |
| Database (Automated Snapshot) | 5 minutes | 15 minutes |
| Database (Manual Backup) | 24 hours | 24 hours |
| Redis Cache | 0 seconds | N/A (cache) |

---

## Backup Schedule

### Automated Backups

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| RDS Automated Snapshots | Every 5 minutes | 7 days | Same region |
| RDS Manual Snapshots | Daily (3am UTC) | 30 days | Same region |
| Database pg_dump | Daily (2am UTC) | 30 days | S3 (Standard-IA) |
| ElastiCache Snapshots | Daily (2am UTC) | 7 days | Same region |

### Manual Backups (Before Major Changes)

```bash
# Before infrastructure changes
./scripts/backup-database.sh --manual --snapshot

# Before application deployments
./scripts/backup-database.sh --manual

# Before database migrations
./scripts/migrate-production-database.sh --dry-run
./scripts/backup-database.sh --manual
./scripts/migrate-production-database.sh
```

---

## Testing Schedule

### Quarterly DR Drills

1. **Q1:** Test database restore from snapshot
2. **Q2:** Test application rollback procedure
3. **Q3:** Test point-in-time recovery
4. **Q4:** Full regional failover simulation

### Monthly Validation

```bash
# Run on first Saturday of each month
./scripts/validate-production.sh
./scripts/backup-database.sh --manual
./scripts/restore-database.sh --backup <latest> --dry-run
```

---

## Post-Incident Checklist

After any disaster recovery event:

- [ ] Document timeline of events
- [ ] Record all commands executed
- [ ] Identify root cause
- [ ] Update runbook with lessons learned
- [ ] Schedule post-mortem meeting
- [ ] Test that backups are current
- [ ] Verify monitoring alerts are functioning
- [ ] Update on-call rotation if needed
- [ ] Communicate resolution to stakeholders

---

## Emergency Escalation

**Escalate immediately if:**
- Recovery exceeding RTO targets
- Data loss exceeds RPO targets
- Multiple recovery attempts failing
- Unknown root cause after 30 minutes
- Security incident suspected

**Escalation Path:**
1. On-Call Engineer → DevOps Lead (15 min)
2. DevOps Lead → CTO (30 min)
3. CTO → AWS TAM (for AWS-side issues)

---

## Additional Resources

- [AWS Well-Architected Framework - Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [ECS Troubleshooting Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/troubleshooting.html)

---

**Last Updated:** 2024-01-15
**Next Review:** 2024-04-15
**Owner:** DevOps Team
