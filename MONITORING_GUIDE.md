# WhatsApp SaaS MVP - Monitoring Guide

**Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [CloudWatch Alarms](#cloudwatch-alarms)
5. [CloudWatch Dashboard](#cloudwatch-dashboard)
6. [Log Management](#log-management)
7. [Custom Application Metrics](#custom-application-metrics)
8. [SNS Notifications](#sns-notifications)
9. [Testing Alarms](#testing-alarms)
10. [Viewing Metrics](#viewing-metrics)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)
13. [Cost Optimization](#cost-optimization)

---

## Overview

This guide covers the complete monitoring setup for the WhatsApp SaaS MVP platform using AWS CloudWatch.

### What's Monitored

| Resource | Metrics | Alarms |
|----------|---------|--------|
| **RDS PostgreSQL** | CPU, Storage, Connections, Latency, IOPS | 5 alarms |
| **ElastiCache Redis** | CPU, Memory, Evictions, Connections | 4 alarms |
| **EC2 Instances** | CPU, Status Checks, Network | 3 alarms |
| **Application** | Error Rate, Response Time, Request Count | 3 alarms |

**Total:** 15 CloudWatch alarms monitoring 4 critical infrastructure components.

### Key Features

- ✅ **Real-time Alerting** - SNS notifications to email and Slack
- ✅ **Comprehensive Dashboard** - Single-pane view of system health
- ✅ **Log Aggregation** - Centralized logging with CloudWatch Logs
- ✅ **Custom Metrics** - Application-level performance tracking
- ✅ **Anomaly Detection** - Automatic anomaly detection for request patterns
- ✅ **Historical Analysis** - Up to 15 months of metric retention

---

## Architecture

### Monitoring Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AWS Infrastructure                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   RDS    │  │  Redis   │  │   EC2    │  │   App    │   │
│  │PostgreSQL│  │ElastiCache│ │Instances │  │  Logs    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
                  ┌─────────────────┐
                  │  CloudWatch     │
                  │  - Metrics      │
                  │  - Logs         │
                  │  - Alarms       │
                  │  - Dashboard    │
                  └────────┬────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
            ┌──────────────┐ ┌──────────────┐
            │  SNS Topic   │ │  SNS Topic   │
            │  (Critical)  │ │  (Warning)   │
            └──────┬───────┘ └──────┬───────┘
                   │                 │
         ┌─────────┴────────┐        │
         │                  │        │
         ▼                  ▼        ▼
    ┌────────┐        ┌────────┐ ┌────────┐
    │ Email  │        │ Slack  │ │ Slack  │
    └────────┘        └────────┘ └────────┘
```

### Alarm Severity Levels

| Level | SNS Topic | Notifications | Example Alarms |
|-------|-----------|---------------|----------------|
| **Critical** | whatsapp-saas-mvp-critical-alerts | Email + Slack | RDS CPU > 80%, Storage < 2GB, Error Rate > 5% |
| **Warning** | whatsapp-saas-mvp-warning-alerts | Slack only | Redis Memory > 70%, Response Time > 300ms |

---

## Quick Start

### 1. Initial Setup

Run the monitoring setup script:

```bash
# Make scripts executable
chmod +x scripts/setup-cloudwatch.sh scripts/create-dashboards.sh

# Set up CloudWatch alarms and SNS topics
./scripts/setup-cloudwatch.sh

# Create CloudWatch dashboard
./scripts/create-dashboards.sh
```

### 2. Confirm Email Subscription

After running the setup script, you'll receive a confirmation email:

1. Check your email inbox (email address you provided during setup)
2. Look for "AWS Notification - Subscription Confirmation"
3. Click the "Confirm subscription" link
4. You should see "Subscription confirmed!"

**Important:** You won't receive critical alerts via email until you confirm the subscription.

### 3. Verify Setup

```bash
# List all alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "whatsapp-saas-mvp" \
  --query 'MetricAlarms[].AlarmName' \
  --output table

# Check SNS topics
aws sns list-topics \
  --query 'Topics[?contains(TopicArn, `whatsapp-saas-mvp`)]' \
  --output table

# View dashboard
aws cloudwatch get-dashboard \
  --dashboard-name "WhatsApp-SaaS-MVP-Dashboard" \
  --query 'DashboardBody' \
  --output text | jq '.'
```

### 4. Access Dashboard

**AWS Console:**
1. Go to [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Navigate to **Dashboards** in left sidebar
3. Click **WhatsApp-SaaS-MVP-Dashboard**

**Direct Link:**
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=WhatsApp-SaaS-MVP-Dashboard
```

---

## CloudWatch Alarms

### RDS PostgreSQL Alarms

#### 1. High CPU Utilization

**Alarm Name:** `whatsapp-saas-mvp-rds-cpu-high`

**Trigger:** CPU > 80% for 5 minutes
**Severity:** Critical
**Impact:** Slow database queries, application timeouts

**Troubleshooting:**
```sql
-- Find slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Kill long-running query (if needed)
SELECT pg_terminate_backend(pid);
```

**Mitigation:**
- Scale up RDS instance (vertical scaling)
- Add read replicas (horizontal scaling)
- Optimize slow queries
- Implement connection pooling

#### 2. Low Free Storage

**Alarm Name:** `whatsapp-saas-mvp-rds-storage-low`

**Trigger:** Free storage < 2GB
**Severity:** Critical
**Impact:** Database writes may fail, potential downtime

**Troubleshooting:**
```sql
-- Check database sizes
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

**Mitigation:**
- Increase RDS storage (can be done without downtime)
- Delete old data or archive to S3
- Vacuum tables to reclaim space
- Implement data retention policies

#### 3. High Connection Count

**Alarm Name:** `whatsapp-saas-mvp-rds-connections-high`

**Trigger:** Connections > 80
**Severity:** Critical
**Impact:** New connections may be rejected

**Troubleshooting:**
```bash
# Check current connection pool settings
psql -h $RDS_ENDPOINT -U postgres -c "SHOW max_connections;"

# View active connections
psql -h $RDS_ENDPOINT -U postgres -c "
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;
"
```

**Mitigation:**
- Review connection pool settings (Backend/.env: DB_CONNECTION_LIMIT)
- Close idle connections
- Implement connection pooling with PgBouncer
- Increase max_connections (requires reboot)

#### 4. High Read Latency

**Alarm Name:** `whatsapp-saas-mvp-rds-read-latency-high`

**Trigger:** Read latency > 100ms
**Severity:** Warning
**Impact:** Slow API responses

**Mitigation:**
- Add read replicas
- Implement caching (Redis)
- Optimize queries with indexes
- Use query result caching

#### 5. High Write Latency

**Alarm Name:** `whatsapp-saas-mvp-rds-write-latency-high`

**Trigger:** Write latency > 100ms
**Severity:** Warning
**Impact:** Slow write operations

**Mitigation:**
- Upgrade to Provisioned IOPS storage
- Batch write operations
- Optimize indexes
- Consider async processing for writes

### ElastiCache Redis Alarms

#### 1. High CPU Utilization

**Alarm Name:** `whatsapp-saas-mvp-redis-cpu-high`

**Trigger:** CPU > 80%
**Severity:** Critical
**Impact:** Slow cache operations, potential cache misses

**Troubleshooting:**
```bash
# Connect to Redis
redis-cli -h $REDIS_ENDPOINT

# Check slow log
SLOWLOG GET 10

# Monitor commands in real-time
MONITOR

# Check info
INFO CPU
INFO STATS
```

**Mitigation:**
- Scale up to larger node type
- Add read replicas
- Optimize expensive operations (KEYS, SMEMBERS on large sets)
- Implement proper key expiration

#### 2. High Memory Usage

**Alarm Name:** `whatsapp-saas-mvp-redis-memory-high`

**Trigger:** Memory > 90%
**Severity:** Critical
**Impact:** Evictions, cache misses, OOM errors

**Troubleshooting:**
```bash
redis-cli INFO MEMORY

# Check largest keys
redis-cli --bigkeys

# Check eviction stats
redis-cli INFO STATS | grep evicted
```

**Mitigation:**
- Implement proper TTL on keys
- Review memory allocation policy
- Scale up to larger node type
- Delete unused keys
- Implement LRU eviction policy

#### 3. High Evictions

**Alarm Name:** `whatsapp-saas-mvp-redis-evictions-high`

**Trigger:** Evictions > 10 per minute
**Severity:** Warning
**Impact:** Reduced cache hit rate, increased database load

**Mitigation:**
- Increase Redis memory
- Reduce TTL for less critical data
- Implement tiered caching
- Review cache usage patterns

#### 4. High Connection Count

**Alarm Name:** `whatsapp-saas-mvp-redis-connections-high`

**Trigger:** Connections > 50
**Severity:** Warning
**Impact:** May hit connection limit

**Mitigation:**
- Review connection pooling settings
- Close idle connections
- Increase maxclients parameter
- Implement connection reuse

### EC2 Instance Alarms

#### 1. High CPU Utilization

**Alarm Name:** `whatsapp-saas-mvp-ec2-cpu-high`

**Trigger:** CPU > 80% for 5 minutes
**Severity:** Critical
**Impact:** Slow application response times

**Troubleshooting:**
```bash
# SSH to instance
ssh -i key.pem ubuntu@$EC2_IP

# Check CPU usage
top -bn1 | head -20

# Check processes
ps aux --sort=-%cpu | head -20

# Check application logs
pm2 logs

# Check system load
uptime
```

**Mitigation:**
- Scale horizontally (add more instances)
- Scale vertically (larger instance type)
- Optimize application code
- Implement caching
- Use load balancer

#### 2. Instance Status Check Failed

**Alarm Name:** `whatsapp-saas-mvp-ec2-status-check-failed`

**Trigger:** Status check fails
**Severity:** Critical
**Impact:** Instance may be unreachable

**Mitigation:**
- Check instance logs via AWS Console
- Reboot instance if needed
- Check security group rules
- Verify network configuration
- Consider replacing instance

#### 3. High Network In

**Alarm Name:** `whatsapp-saas-mvp-ec2-network-in-high`

**Trigger:** Network in > 100MB for 5 minutes
**Severity:** Warning
**Impact:** Possible DDoS, unexpected traffic spike

**Mitigation:**
- Enable AWS Shield
- Review CloudFront logs
- Implement rate limiting
- Check for legitimate traffic spikes
- Scale infrastructure if needed

### Application Alarms

#### 1. High Error Rate

**Alarm Name:** `whatsapp-saas-mvp-app-error-rate-high`

**Trigger:** Error rate > 5%
**Severity:** Critical
**Impact:** User-facing errors, degraded service

**Troubleshooting:**
```bash
# View recent errors
aws logs tail /aws/ec2/whatsapp-saas-mvp/application \
  --follow \
  --filter-pattern "ERROR"

# Query error patterns
aws logs start-query \
  --log-group-name /aws/ec2/whatsapp-saas-mvp/application \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, @message
    | filter @message like /ERROR/
    | stats count() by @message
    | sort count desc
  '
```

**Mitigation:**
- Review error logs
- Deploy hotfix if needed
- Rollback recent deployment
- Enable debug logging
- Check third-party service status (Meta, OpenAI)

#### 2. High API Response Time

**Alarm Name:** `whatsapp-saas-mvp-api-response-time-high`

**Trigger:** p95 response time > 500ms
**Severity:** Critical
**Impact:** Slow user experience

**Troubleshooting:**
```bash
# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s https://api.domain.com/healthz

# Create curl-format.txt:
cat > curl-format.txt <<EOF
time_namelookup:    %{time_namelookup}s
time_connect:       %{time_connect}s
time_appconnect:    %{time_appconnect}s
time_pretransfer:   %{time_pretransfer}s
time_redirect:      %{time_redirect}s
time_starttransfer: %{time_starttransfer}s
time_total:         %{time_total}s
EOF
```

**Mitigation:**
- Review slow database queries
- Implement caching
- Optimize API endpoints
- Scale infrastructure
- Enable CDN for static assets

#### 3. Request Count Anomaly

**Alarm Name:** `whatsapp-saas-mvp-app-request-anomaly`

**Trigger:** Anomaly detection triggers
**Severity:** Warning
**Impact:** Unexpected traffic patterns

**Investigation:**
- Review traffic sources
- Check for bot traffic
- Verify legitimate campaigns
- Monitor for DDoS

---

## CloudWatch Dashboard

### Dashboard Overview

The **WhatsApp-SaaS-MVP-Dashboard** provides a single-pane view of system health.

**Access:**
```
AWS Console → CloudWatch → Dashboards → WhatsApp-SaaS-MVP-Dashboard
```

### Dashboard Widgets

#### System Health Section

**1. RDS - CPU & Connections**
- CPU Utilization (%)
- Database Connections
- Threshold annotation at 80%

**2. RDS - Storage & Memory**
- Free Storage Space (GB)
- Freeable Memory (MB)
- Critical threshold at 2GB

**3. RDS - Latency & IOPS**
- Read Latency (ms)
- Write Latency (ms)
- Read/Write IOPS

#### Redis Performance Section

**4. Redis - CPU & Memory**
- CPU Utilization (%)
- Memory Usage (%)
- Threshold annotations

**5. Redis - Connections & Evictions**
- Current Connections
- Evictions per minute
- New Connections per minute

**6. Redis - Cache Performance**
- Cache Hits
- Cache Misses
- Cache Hit Ratio (calculated)

#### Application Performance Section

**7. Application - Requests & Errors**
- Total Request Count
- Error Rate (%)
- 5xx Errors
- 4xx Errors

**8. Application - Response Times**
- Average Response Time
- p50 Response Time
- p95 Response Time
- p99 Response Time

**9. EC2 - CPU & Network**
- CPU Utilization (%)
- Network In (MB)
- Network Out (MB)

#### Logs Section

**10. Recent Application Errors**
- Live log stream of ERROR level messages
- Last 20 errors
- Auto-refresh every 1 minute

### Customizing Dashboard

#### Add New Widget

```bash
# Get current dashboard
aws cloudwatch get-dashboard \
  --dashboard-name "WhatsApp-SaaS-MVP-Dashboard" \
  --query 'DashboardBody' > dashboard.json

# Edit dashboard.json to add widget
# Example: Add custom metric widget
{
  "type": "metric",
  "properties": {
    "metrics": [
      ["whatsapp-saas/mvp", "CustomMetricName"]
    ],
    "period": 300,
    "stat": "Average",
    "region": "us-east-1",
    "title": "Custom Metric"
  }
}

# Update dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "WhatsApp-SaaS-MVP-Dashboard" \
  --dashboard-body file://dashboard.json
```

#### Change Time Range

In AWS Console:
1. Open dashboard
2. Click time range selector (top right)
3. Choose: 1h, 3h, 12h, 1d, 3d, 1w, custom

#### Set Auto-Refresh

1. Open dashboard
2. Click refresh icon (top right)
3. Select interval: 10s, 1m, 2m, 5m, 15m

---

## Log Management

### Log Groups

| Log Group | Purpose | Retention | Size Estimate |
|-----------|---------|-----------|---------------|
| `/aws/rds/instance/whatsapp-saas-mvp-db/postgresql` | PostgreSQL logs | 30 days | ~500 MB/month |
| `/aws/elasticache/whatsapp-saas-mvp-redis` | Redis slow log | 30 days | ~100 MB/month |
| `/aws/ec2/whatsapp-saas-mvp/application` | Application logs | 30 days | ~2 GB/month |
| `/aws/ec2/whatsapp-saas-mvp/nginx` | Nginx access/error logs | 30 days | ~1 GB/month |

### Viewing Logs

#### AWS Console

```
CloudWatch → Logs → Log groups → Select group → Search log streams
```

#### AWS CLI

```bash
# Tail application logs (like tail -f)
aws logs tail /aws/ec2/whatsapp-saas-mvp/application --follow

# Filter by pattern
aws logs tail /aws/ec2/whatsapp-saas-mvp/application \
  --follow \
  --filter-pattern "ERROR"

# Get logs from specific time range
aws logs filter-log-events \
  --log-group-name /aws/ec2/whatsapp-saas-mvp/application \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

### Log Insights Queries

CloudWatch Logs Insights provides SQL-like querying:

#### Top Error Messages

```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as error_count by @message
| sort error_count desc
| limit 20
```

#### API Response Times

```
fields @timestamp, @message
| filter @message like /Response time/
| parse @message /Response time: (?<response_time>\d+)ms/
| stats avg(response_time), max(response_time), min(response_time)
```

#### Error Rate by Endpoint

```
fields @timestamp, @message
| filter @message like /POST|GET|PUT|DELETE/
| parse @message /(?<method>[A-Z]+) (?<endpoint>\/[^ ]*) (?<status>\d{3})/
| filter status >= 500
| stats count() as errors by endpoint
| sort errors desc
```

#### Database Query Performance

```
fields @timestamp, @message
| filter @message like /Query took/
| parse @message /Query took (?<duration>\d+)ms/
| filter duration > 1000
| stats count() as slow_queries, avg(duration) as avg_duration
```

### Forwarding Logs to CloudWatch

#### From EC2 Instance (CloudWatch Agent)

**Install CloudWatch Agent:**

```bash
# Download CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install
sudo dpkg -i amazon-cloudwatch-agent.deb

# Create configuration
sudo cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/whatsapp-saas/application.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/application",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/nginx",
            "log_stream_name": "{instance_id}-access"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/nginx",
            "log_stream_name": "{instance_id}-error"
          }
        ]
      }
    }
  }
}
EOF

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

#### From Application (Winston Logger)

**Install Winston CloudWatch:**

```bash
cd Backend
npm install winston winston-cloudwatch
```

**Configure Logger:**

```javascript
// Backend/src/config/logger.js
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new CloudWatchTransport({
      logGroupName: '/aws/ec2/whatsapp-saas-mvp/application',
      logStreamName: `${process.env.INSTANCE_ID || 'local'}-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      jsonMessage: true
    })
  ]
});

module.exports = logger;
```

---

## Custom Application Metrics

### Publishing Custom Metrics

Custom metrics enable monitoring of application-specific KPIs.

#### Using CloudWatch SDK

**Install AWS SDK:**

```bash
cd Backend
npm install @aws-sdk/client-cloudwatch
```

**Create Metrics Module:**

```javascript
// Backend/src/utils/metrics.js
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });

const namespace = 'whatsapp-saas/mvp';
const environment = process.env.ENVIRONMENT || 'development';

class Metrics {
  /**
   * Publish a metric to CloudWatch
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Unit (Count, Seconds, Milliseconds, Percent, etc.)
   * @param {Object} dimensions - Additional dimensions
   */
  async publish(metricName, value, unit = 'Count', dimensions = {}) {
    if (process.env.USE_CLOUDWATCH_METRICS !== 'true') {
      console.log(`[Metrics] ${metricName}: ${value} ${unit}`);
      return;
    }

    const params = {
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Environment', Value: environment },
            ...Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
          ]
        }
      ]
    };

    try {
      await cloudwatch.send(new PutMetricDataCommand(params));
    } catch (error) {
      console.error('Failed to publish metric:', error);
    }
  }

  // Convenience methods
  async recordError(errorType, endpoint) {
    await this.publish('ErrorCount', 1, 'Count', {
      ErrorType: errorType,
      Endpoint: endpoint
    });
  }

  async recordResponseTime(endpoint, duration) {
    await this.publish('ResponseTime', duration, 'Milliseconds', {
      Endpoint: endpoint
    });
  }

  async recordRequest(endpoint, method, statusCode) {
    await this.publish('RequestCount', 1, 'Count', {
      Endpoint: endpoint,
      Method: method,
      StatusCode: statusCode.toString()
    });
  }

  async recordCacheHit(cacheType) {
    await this.publish('CacheHits', 1, 'Count', {
      CacheType: cacheType
    });
  }

  async recordCacheMiss(cacheType) {
    await this.publish('CacheMisses', 1, 'Count', {
      CacheType: cacheType
    });
  }

  async recordMessageSent() {
    await this.publish('MessagesSent', 1, 'Count');
  }

  async recordMessageReceived() {
    await this.publish('MessagesReceived', 1, 'Count');
  }

  async recordOpenAICall(model, tokens) {
    await this.publish('OpenAICalls', 1, 'Count', { Model: model });
    await this.publish('OpenAITokens', tokens, 'Count', { Model: model });
  }
}

module.exports = new Metrics();
```

#### Using Metrics in Middleware

**Create Metrics Middleware:**

```javascript
// Backend/src/middleware/metrics.js
const metrics = require('../utils/metrics');

module.exports = function metricsMiddleware(req, res, next) {
  const startTime = Date.now();

  // Record request
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const endpoint = req.route?.path || req.path;
    const statusCode = res.statusCode;

    // Record response time
    await metrics.recordResponseTime(endpoint, duration);

    // Record request count
    await metrics.recordRequest(endpoint, req.method, statusCode);

    // Record errors
    if (statusCode >= 500) {
      await metrics.recordError('5xx', endpoint);
    } else if (statusCode >= 400) {
      await metrics.recordError('4xx', endpoint);
    }

    // Calculate error rate (for alarm)
    const errorRate = statusCode >= 500 ? 100 : 0;
    await metrics.publish('ErrorRate', errorRate, 'Percent', {
      Endpoint: endpoint
    });
  });

  next();
};
```

**Add to Express App:**

```javascript
// Backend/src/app.js
const metricsMiddleware = require('./middleware/metrics');

// Add after other middleware
app.use(metricsMiddleware);
```

#### Example Usage in Code

```javascript
// Backend/src/services/message.service.js
const metrics = require('../utils/metrics');

async function sendMessage(to, message) {
  try {
    const response = await whatsappClient.send(to, message);

    // Record success
    await metrics.recordMessageSent();

    return response;
  } catch (error) {
    // Record failure
    await metrics.recordError('WhatsAppSendFailed', '/api/messages/send');
    throw error;
  }
}

// Backend/src/services/openai.service.js
async function generateResponse(prompt) {
  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });

    const duration = Date.now() - startTime;
    const tokens = response.usage.total_tokens;

    // Record metrics
    await metrics.recordOpenAICall('gpt-4', tokens);
    await metrics.publish('OpenAIResponseTime', duration, 'Milliseconds');

    return response;
  } catch (error) {
    await metrics.recordError('OpenAIFailed', '/ai/generate');
    throw error;
  }
}
```

### Viewing Custom Metrics

**AWS Console:**
```
CloudWatch → Metrics → whatsapp-saas/mvp → View all metrics
```

**AWS CLI:**
```bash
# List custom metrics
aws cloudwatch list-metrics \
  --namespace "whatsapp-saas/mvp"

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace "whatsapp-saas/mvp" \
  --metric-name "ResponseTime" \
  --dimensions Name=Endpoint,Value=/api/messages \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum,Minimum
```

### Creating Alarms for Custom Metrics

```bash
# Error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "whatsapp-saas-mvp-custom-error-rate" \
  --metric-name "ErrorRate" \
  --namespace "whatsapp-saas/mvp" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Environment,Value=mvp \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts

# Response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "whatsapp-saas-mvp-custom-response-time" \
  --metric-name "ResponseTime" \
  --namespace "whatsapp-saas/mvp" \
  --extended-statistic p95 \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Environment,Value=mvp \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts
```

---

## SNS Notifications

### SNS Topics

| Topic | ARN | Purpose | Subscribers |
|-------|-----|---------|-------------|
| **Critical Alerts** | `arn:aws:sns:region:account:whatsapp-saas-mvp-critical-alerts` | High-severity issues | Email + Slack |
| **Warning Alerts** | `arn:aws:sns:region:account:whatsapp-saas-mvp-warning-alerts` | Medium-severity issues | Slack only |

### Email Notifications

#### Add Email Subscriber

```bash
# Add email to critical alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription via email link
```

#### Remove Email Subscriber

```bash
# List subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts

# Unsubscribe
aws sns unsubscribe \
  --subscription-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts:SUBSCRIPTION-ID
```

### Slack Notifications

#### Setup AWS Chatbot for Slack

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Create new app
   - Add to your workspace

2. **Configure AWS Chatbot:**
   ```bash
   # Go to AWS Chatbot console
   https://console.aws.amazon.com/chatbot/

   # Click "Configure new client"
   # Select Slack
   # Choose workspace
   # Select channel (#alerts)
   # Add SNS topics
   ```

3. **Test Notification:**
   ```bash
   aws sns publish \
     --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
     --message "Test alert from CloudWatch" \
     --subject "Test Alert"
   ```

#### Custom Slack Webhook (Alternative)

If you prefer custom Slack webhooks:

**Create Lambda Function:**

```javascript
// slack-notifier/index.js
const https = require('https');

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

exports.handler = async (event) => {
  const message = JSON.parse(event.Records[0].Sns.Message);

  const slackMessage = {
    text: `🚨 *CloudWatch Alarm*`,
    attachments: [
      {
        color: message.NewStateValue === 'ALARM' ? 'danger' : 'good',
        fields: [
          { title: 'Alarm', value: message.AlarmName, short: true },
          { title: 'State', value: message.NewStateValue, short: true },
          { title: 'Reason', value: message.NewStateReason, short: false },
          { title: 'Time', value: new Date(message.StateChangeTime).toISOString(), short: true }
        ]
      }
    ]
  };

  return new Promise((resolve, reject) => {
    const req = https.request(SLACK_WEBHOOK, { method: 'POST' }, (res) => {
      resolve({ statusCode: 200 });
    });
    req.on('error', reject);
    req.write(JSON.stringify(slackMessage));
    req.end();
  });
};
```

**Deploy Lambda:**

```bash
# Package
zip -r slack-notifier.zip index.js

# Create function
aws lambda create-function \
  --function-name whatsapp-saas-slack-notifier \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://slack-notifier.zip \
  --environment Variables="{SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL}"

# Subscribe Lambda to SNS
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:ACCOUNT:function:whatsapp-saas-slack-notifier
```

---

## Testing Alarms

### Manual Testing

#### Test RDS CPU Alarm

```bash
# Connect to RDS
psql -h $RDS_ENDPOINT -U postgres

-- Generate CPU load
SELECT pg_sleep(0.1) FROM generate_series(1, 1000000);
```

#### Test Redis Memory Alarm

```bash
redis-cli -h $REDIS_ENDPOINT

# Fill memory with data
FOR i IN {1..100000}; do
  redis-cli SET "test:key:$i" "$(head -c 1000 /dev/urandom | base64)"
done
```

#### Test Application Error Rate Alarm

```bash
# Send requests that trigger errors
for i in {1..100}; do
  curl -X POST https://api.domain.com/api/invalid-endpoint
  sleep 0.1
done
```

#### Test API Response Time Alarm

```bash
# Stress test with Apache Bench
ab -n 1000 -c 10 https://api.domain.com/api/messages
```

### CloudWatch Alarm Test

AWS provides built-in alarm testing:

```bash
# Set alarm to ALARM state (for testing)
aws cloudwatch set-alarm-state \
  --alarm-name "whatsapp-saas-mvp-rds-cpu-high" \
  --state-value ALARM \
  --state-reason "Testing alarm notification"

# Reset to OK
aws cloudwatch set-alarm-state \
  --alarm-name "whatsapp-saas-mvp-rds-cpu-high" \
  --state-value OK \
  --state-reason "Test complete"
```

### Verify Notifications

After triggering alarm:

1. **Check Alarm State:**
   ```bash
   aws cloudwatch describe-alarms \
     --alarm-names "whatsapp-saas-mvp-rds-cpu-high" \
     --query 'MetricAlarms[0].{State:StateValue,Reason:StateReason}'
   ```

2. **Check Email:**
   - Look for email from AWS Notifications
   - Subject: "ALARM: whatsapp-saas-mvp-rds-cpu-high"

3. **Check Slack:**
   - Verify message in #alerts channel

4. **Check CloudWatch History:**
   ```bash
   aws cloudwatch describe-alarm-history \
     --alarm-name "whatsapp-saas-mvp-rds-cpu-high" \
     --max-records 5
   ```

---

## Viewing Metrics

### AWS Console

**CloudWatch Metrics:**
```
CloudWatch → Metrics → All metrics → Select namespace
```

**Graphing Metrics:**
1. Select metrics
2. Click "Graphed metrics" tab
3. Configure:
   - Statistic (Average, Sum, Min, Max, p50, p95, p99)
   - Period (1m, 5m, 1h, etc.)
   - Y-axis (left/right)

**Math Expressions:**

Example: Calculate cache hit ratio
```
m1 = CacheHits
m2 = CacheMisses
e1 = (m1 / (m1 + m2)) * 100
Label: Cache Hit Ratio (%)
```

### AWS CLI

**List Metrics:**
```bash
# RDS metrics
aws cloudwatch list-metrics \
  --namespace AWS/RDS \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-mvp-db

# Custom metrics
aws cloudwatch list-metrics \
  --namespace whatsapp-saas/mvp
```

**Get Metric Statistics:**
```bash
# Average CPU last hour
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-mvp-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Get Metric Data (Advanced):**
```bash
aws cloudwatch get-metric-data \
  --metric-data-queries file://query.json \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# query.json:
[
  {
    "Id": "m1",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/RDS",
        "MetricName": "CPUUtilization",
        "Dimensions": [
          {"Name": "DBInstanceIdentifier", "Value": "whatsapp-saas-mvp-db"}
        ]
      },
      "Period": 300,
      "Stat": "Average"
    }
  }
]
```

### Programmatic Access

**Using AWS SDK (Node.js):**

```javascript
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');

const client = new CloudWatchClient({ region: 'us-east-1' });

async function getRDSCPU() {
  const params = {
    Namespace: 'AWS/RDS',
    MetricName: 'CPUUtilization',
    Dimensions: [
      { Name: 'DBInstanceIdentifier', Value: 'whatsapp-saas-mvp-db' }
    ],
    StartTime: new Date(Date.now() - 3600000), // 1 hour ago
    EndTime: new Date(),
    Period: 300,
    Statistics: ['Average', 'Maximum']
  };

  const command = new GetMetricStatisticsCommand(params);
  const response = await client.send(command);

  console.log('RDS CPU:', response.Datapoints);
}
```

---

## Troubleshooting

### Common Issues

#### 1. No Metrics Showing

**Symptoms:** Dashboard empty, no data in metrics

**Causes:**
- Resources not created yet
- Incorrect resource IDs in alarms
- Metrics not published yet (custom metrics)
- Wrong AWS region

**Solutions:**
```bash
# Verify resources exist
aws rds describe-db-instances --query 'DBInstances[].DBInstanceIdentifier'
aws elasticache describe-cache-clusters --query 'CacheClusters[].CacheClusterId'

# Check alarm configuration
aws cloudwatch describe-alarms \
  --alarm-name-prefix "whatsapp-saas-mvp" \
  --query 'MetricAlarms[].{Name:AlarmName,Namespace:Namespace,Metric:MetricName}'

# Verify region
echo $AWS_REGION
aws configure get region
```

#### 2. Alarms Not Triggering

**Symptoms:** Metric exceeds threshold but alarm doesn't trigger

**Causes:**
- Evaluation period not met
- Treat missing data setting
- Insufficient data points
- SNS topic permission issues

**Solutions:**
```bash
# Check alarm state
aws cloudwatch describe-alarms \
  --alarm-names "whatsapp-saas-mvp-rds-cpu-high" \
  --query 'MetricAlarms[0].{State:StateValue,Reason:StateReason,Data:StateReasonData}'

# Check alarm history
aws cloudwatch describe-alarm-history \
  --alarm-name "whatsapp-saas-mvp-rds-cpu-high" \
  --max-records 10

# Test alarm manually
aws cloudwatch set-alarm-state \
  --alarm-name "whatsapp-saas-mvp-rds-cpu-high" \
  --state-value ALARM \
  --state-reason "Manual test"
```

#### 3. Email Notifications Not Received

**Symptoms:** Alarm triggers but no email received

**Causes:**
- Email subscription not confirmed
- Email in spam folder
- SNS topic not attached to alarm
- Email delivery issues

**Solutions:**
```bash
# Check subscription status
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
  --query 'Subscriptions[?Protocol==`email`].{Email:Endpoint,Status:SubscriptionArn}'

# Resend confirmation
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Test SNS directly
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:whatsapp-saas-mvp-critical-alerts \
  --message "Test message" \
  --subject "Test Alert"
```

#### 4. High CloudWatch Costs

**Symptoms:** Unexpected CloudWatch charges

**Causes:**
- Too many custom metrics
- High-resolution metrics (1-second)
- Long retention periods
- Excessive API calls
- Too many log ingestion

**Solutions:**
```bash
# Review metric count
aws cloudwatch list-metrics --namespace whatsapp-saas/mvp | grep -c MetricName

# Check log group sizes
aws logs describe-log-groups \
  --query 'logGroups[].{Name:logGroupName,Size:storedBytes,Retention:retentionInDays}' \
  --output table

# Reduce retention for non-critical logs
aws logs put-retention-policy \
  --log-group-name /aws/ec2/whatsapp-saas-mvp/nginx \
  --retention-in-days 7

# Delete old metrics (can't delete individual metrics, must stop publishing)
```

#### 5. Custom Metrics Not Appearing

**Symptoms:** Published metrics don't show in CloudWatch

**Causes:**
- IAM permissions missing
- Incorrect namespace or dimensions
- Timestamp issues
- Metric buffering delay (up to 2 minutes)

**Solutions:**
```bash
# Check IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/ec2-role \
  --action-names cloudwatch:PutMetricData \
  --resource-arns "*"

# Verify metric exists
aws cloudwatch list-metrics \
  --namespace "whatsapp-saas/mvp" \
  --metric-name "ResponseTime"

# Check recent datapoints
aws cloudwatch get-metric-statistics \
  --namespace "whatsapp-saas/mvp" \
  --metric-name "ResponseTime" \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

### Getting Help

**AWS Support:**
- Basic: Community forums
- Developer: 12-24 hour response
- Business: <1 hour for production issues

**Useful Resources:**
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [AWS re:Post](https://repost.aws/)

---

## Best Practices

### Alarm Design

1. **Set Appropriate Thresholds**
   - Base on historical data
   - Leave 20% buffer for normal spikes
   - Adjust after observing patterns

2. **Use Multiple Evaluation Periods**
   ```bash
   # Bad: Triggers on single spike
   --evaluation-periods 1 --datapoints-to-alarm 1

   # Good: Requires sustained issue
   --evaluation-periods 3 --datapoints-to-alarm 2
   ```

3. **Configure Treat Missing Data**
   - `notBreaching`: For intermittent metrics (recommended for custom metrics)
   - `breaching`: For critical always-on metrics
   - `ignore`: For metrics with expected gaps
   - `missing`: Treat as missing (alarm in INSUFFICIENT_DATA state)

4. **Use Composite Alarms**
   ```bash
   # Trigger only if both CPU AND memory are high
   aws cloudwatch put-composite-alarm \
     --alarm-name "whatsapp-saas-mvp-rds-resource-exhaustion" \
     --alarm-rule "ALARM(whatsapp-saas-mvp-rds-cpu-high) AND ALARM(whatsapp-saas-mvp-rds-memory-low)"
   ```

### Metric Collection

1. **Publish at Appropriate Resolution**
   - Standard: 1-minute (sufficient for most use cases)
   - High-resolution: 1-second (expensive, only for critical metrics)

2. **Use Metric Dimensions Wisely**
   ```javascript
   // Good: Useful dimensions
   { Environment: 'mvp', Endpoint: '/api/messages', Method: 'POST' }

   // Bad: Too granular (creates many unique metrics)
   { UserId: '12345', RequestId: 'uuid-...' }
   ```

3. **Batch Metric Publishing**
   ```javascript
   // Batch multiple metrics in single API call
   await cloudwatch.send(new PutMetricDataCommand({
     Namespace: 'whatsapp-saas/mvp',
     MetricData: [
       { MetricName: 'Metric1', Value: 1 },
       { MetricName: 'Metric2', Value: 2 },
       // ... up to 20 metrics
     ]
   }));
   ```

### Dashboard Design

1. **Group Related Metrics**
   - System health widgets together
   - Application metrics in separate section
   - Use clear titles and annotations

2. **Use Appropriate Visualizations**
   - Line graphs: Time-series data (CPU, memory)
   - Stacked area: Cumulative metrics (requests by status code)
   - Number widgets: Single values (total errors)
   - Log widgets: Recent log entries

3. **Add Context**
   ```json
   {
     "annotations": {
       "horizontal": [
         {
           "value": 80,
           "label": "Warning threshold",
           "fill": "above",
           "color": "#ff7f0e"
         }
       ],
       "vertical": [
         {
           "value": "2025-10-18T10:00:00Z",
           "label": "Deployment",
           "color": "#2ca02c"
         }
       ]
     }
   }
   ```

### Cost Optimization

1. **Optimize Log Retention**
   - Critical logs: 30-90 days
   - Application logs: 7-30 days
   - Debug logs: 3-7 days
   - Access logs: 7 days (or export to S3)

2. **Reduce Metric Cardinality**
   ```javascript
   // Bad: Creates 1000s of unique metrics
   dimensions: { UserId: userId, SessionId: sessionId }

   // Good: Manageable number of metrics
   dimensions: { Environment: env, Service: service }
   ```

3. **Use Metric Filters Instead of Custom Metrics**
   ```bash
   # Instead of publishing custom metric, use log metric filter
   aws logs put-metric-filter \
     --log-group-name /aws/ec2/whatsapp-saas-mvp/application \
     --filter-name ErrorCount \
     --filter-pattern "[time, request_id, level = ERROR, ...]" \
     --metric-transformations \
       metricName=ErrorCount,metricNamespace=whatsapp-saas/mvp,metricValue=1
   ```

4. **Export Infrequently Accessed Logs to S3**
   ```bash
   # Export logs older than 30 days
   aws logs create-export-task \
     --log-group-name /aws/ec2/whatsapp-saas-mvp/application \
     --from $(date -d '60 days ago' +%s)000 \
     --to $(date -d '30 days ago' +%s)000 \
     --destination s3-bucket-name \
     --destination-prefix cloudwatch-logs/
   ```

### Security

1. **Use IAM Policies for Access Control**
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "cloudwatch:PutMetricData"
     ],
     "Resource": "*",
     "Condition": {
       "StringEquals": {
         "cloudwatch:namespace": "whatsapp-saas/mvp"
       }
     }
   }
   ```

2. **Enable CloudTrail Logging**
   - Log all CloudWatch API calls
   - Monitor for unauthorized changes
   - Set up alarms for suspicious activity

3. **Restrict SNS Topic Access**
   ```json
   {
     "Effect": "Deny",
     "Principal": "*",
     "Action": "SNS:Publish",
     "Resource": "arn:aws:sns:*:*:whatsapp-saas-mvp-*",
     "Condition": {
       "StringNotEquals": {
         "aws:SourceAccount": "YOUR_ACCOUNT_ID"
       }
     }
   }
   ```

### Maintenance

1. **Regular Review**
   - Weekly: Review triggered alarms
   - Monthly: Adjust thresholds based on trends
   - Quarterly: Archive unused dashboards and metrics

2. **Documentation**
   - Document alarm thresholds and rationale
   - Maintain runbooks for common alerts
   - Update dashboard annotations for deployments

3. **Testing**
   - Test alarms after creation
   - Verify notifications work
   - Conduct quarterly DR drills

---

## Cost Optimization

### CloudWatch Pricing (as of 2025)

| Service | Free Tier | Pricing |
|---------|-----------|---------|
| **Metrics** | 10 custom metrics | $0.30 per metric/month |
| **API Requests** | 1M requests | $0.01 per 1000 requests |
| **Dashboard** | 3 dashboards, 50 metrics | $3.00 per dashboard/month |
| **Alarms** | 10 alarms | $0.10 per alarm/month |
| **Logs Ingestion** | 5GB | $0.50 per GB |
| **Logs Storage** | - | $0.03 per GB/month |

### Estimated Monthly Costs (MVP)

| Component | Quantity | Cost |
|-----------|----------|------|
| Standard metrics (AWS) | ~50 | Free (AWS services) |
| Custom metrics | 10 | $3.00 |
| Alarms | 15 | $1.50 |
| Dashboard | 1 | $3.00 |
| Log ingestion | ~5GB | Free |
| Log storage | ~10GB | $0.30 |
| **Total** | | **~$7.80/month** |

### Cost Reduction Tips

1. **Use Metric Math Instead of New Metrics**
   ```javascript
   // Instead of publishing separate "ErrorRate" metric
   // Calculate in alarm or dashboard:
   // ErrorRate = (Errors / TotalRequests) * 100
   ```

2. **Aggregate Before Publishing**
   ```javascript
   // Bad: Publish every request (1000 API calls/min)
   await metrics.publish('RequestCount', 1);

   // Good: Aggregate and publish every minute (1 API call/min)
   let requestCount = 0;
   setInterval(async () => {
     await metrics.publish('RequestCount', requestCount);
     requestCount = 0;
   }, 60000);
   ```

3. **Use Log Metric Filters**
   - Extract metrics from logs instead of publishing separately
   - No additional cost for metric filters

4. **Optimize Log Retention**
   ```bash
   # Set shorter retention for verbose logs
   aws logs put-retention-policy \
     --log-group-name /aws/ec2/whatsapp-saas-mvp/nginx \
     --retention-in-days 7  # Instead of 30
   ```

5. **Delete Unused Alarms**
   ```bash
   # List alarms in INSUFFICIENT_DATA state
   aws cloudwatch describe-alarms \
     --state-value INSUFFICIENT_DATA \
     --query 'MetricAlarms[].AlarmName'

   # Delete if not needed
   aws cloudwatch delete-alarms \
     --alarm-names "alarm-name"
   ```

---

## Appendix

### Useful Scripts

#### Generate Weekly Report

```bash
#!/bin/bash
# weekly-report.sh - Generate weekly monitoring report

REPORT_FILE="monitoring-report-$(date +%Y-%m-%d).txt"

echo "WhatsApp SaaS MVP - Weekly Monitoring Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "=======================================" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Alarm summary
echo "Alarm Summary:" >> $REPORT_FILE
aws cloudwatch describe-alarms \
  --alarm-name-prefix "whatsapp-saas-mvp" \
  --query 'MetricAlarms[].{Name:AlarmName,State:StateValue}' \
  --output table >> $REPORT_FILE

echo "" >> $REPORT_FILE

# Alarm history (last 7 days)
echo "Alarms Triggered (Last 7 Days):" >> $REPORT_FILE
for alarm in $(aws cloudwatch describe-alarms --alarm-name-prefix "whatsapp-saas-mvp" --query 'MetricAlarms[].AlarmName' --output text); do
  echo "- $alarm:" >> $REPORT_FILE
  aws cloudwatch describe-alarm-history \
    --alarm-name "$alarm" \
    --start-date $(date -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --history-item-type StateUpdate \
    --query 'AlarmHistoryItems[?contains(HistorySummary, `to ALARM`)].Timestamp' \
    --output text >> $REPORT_FILE
done

echo "" >> $REPORT_FILE
echo "Report saved to: $REPORT_FILE"
```

#### Check System Health

```bash
#!/bin/bash
# health-check.sh - Quick system health check

echo "=== WhatsApp SaaS MVP Health Check ==="
echo ""

# Check RDS
echo "RDS Status:"
aws rds describe-db-instances \
  --db-instance-identifier whatsapp-saas-mvp-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Storage:AllocatedStorage,Class:DBInstanceClass}' \
  --output table

# Check Redis
echo ""
echo "Redis Status:"
aws elasticache describe-cache-clusters \
  --cache-cluster-id whatsapp-saas-mvp-redis \
  --query 'CacheClusters[0].{Status:CacheClusterStatus,Nodes:NumCacheNodes,Type:CacheNodeType}' \
  --output table

# Check EC2
echo ""
echo "EC2 Status:"
aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=whatsapp-saas" \
  --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,Type:InstanceType}' \
  --output table

# Check active alarms
echo ""
echo "Active Alarms:"
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[].{Name:AlarmName,Reason:StateReason}' \
  --output table
```

### CloudWatch Agent Configuration

Complete configuration for EC2 instances:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/whatsapp-saas/application*.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/application",
            "log_stream_name": "{instance_id}/{ip_address}/application",
            "timezone": "UTC",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S.%fZ"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/nginx",
            "log_stream_name": "{instance_id}/access",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/whatsapp-saas-mvp/nginx",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "whatsapp-saas/mvp",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "/"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

### Quick Reference Commands

```bash
# View all alarms
aws cloudwatch describe-alarms --alarm-name-prefix "whatsapp-saas-mvp"

# View dashboard
aws cloudwatch get-dashboard --dashboard-name "WhatsApp-SaaS-MVP-Dashboard"

# Tail logs
aws logs tail /aws/ec2/whatsapp-saas-mvp/application --follow

# Test alarm
aws cloudwatch set-alarm-state --alarm-name "NAME" --state-value ALARM --state-reason "Test"

# Publish custom metric
aws cloudwatch put-metric-data --namespace "whatsapp-saas/mvp" --metric-name "TestMetric" --value 1

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/RDS" \
  --metric-name "CPUUtilization" \
  --dimensions Name=DBInstanceIdentifier,Value=whatsapp-saas-mvp-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## Summary

This monitoring setup provides:

✅ **15 CloudWatch alarms** covering RDS, Redis, EC2, and application metrics
✅ **Comprehensive dashboard** with system health, performance, and error tracking
✅ **Log aggregation** with 4 log groups and 30-day retention
✅ **SNS notifications** to email and Slack for critical and warning alerts
✅ **Custom metrics** framework for application-specific monitoring
✅ **Cost-effective** design (~$8/month estimated)
✅ **Production-ready** with best practices and troubleshooting guides

**Next Steps:**
1. Run setup scripts: `./scripts/setup-cloudwatch.sh` and `./scripts/create-dashboards.sh`
2. Confirm email subscription
3. Configure Slack notifications (optional)
4. Implement custom metrics in application code
5. Test alarms and verify notifications

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Maintained By:** DevOps Team
**Related Docs:** SECRETS_MANAGEMENT.md, README.md
