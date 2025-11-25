# Monitoring Setup Guide

Complete guide for deploying and using the Prometheus + Grafana monitoring stack for the WhatsApp SaaS platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Dashboards](#dashboards)
- [Alerts](#alerts)
- [Slack Integration](#slack-integration)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Overview

This monitoring stack provides comprehensive observability for the WhatsApp SaaS platform with:

- **Metrics Collection**: Prometheus for time-series metrics
- **Visualization**: Grafana dashboards for system, application, database, and business metrics
- **Log Aggregation**: Loki for centralized logging
- **Alerting**: Alertmanager with Slack integration for critical and warning alerts
- **Exporters**: Node Exporter, Postgres Exporter, Redis Exporter, cAdvisor

### Key Features

✅ **Real-time Monitoring**: 15-second scrape intervals
✅ **Pre-built Dashboards**: 5 comprehensive dashboards
✅ **Smart Alerting**: 24+ alert rules with inhibition logic
✅ **Slack Notifications**: 5 dedicated channels for different alert types
✅ **Log Aggregation**: 30-day retention with full-text search
✅ **Business Metrics**: Track bookings, messages, and AI API usage

---

## Quick Start

### 1. Set Up Slack Webhooks (Optional but Recommended)

Create Slack incoming webhooks for alerting:

1. Go to https://api.slack.com/apps
2. Create a new app or select existing one
3. Navigate to "Incoming Webhooks" and activate
4. Create webhooks for these channels:
   - `#alerts` - General alerts
   - `#critical-alerts` - Critical alerts requiring immediate attention
   - `#app-alerts` - Application-specific alerts
   - `#infra-alerts` - Infrastructure alerts
   - `#database-alerts` - Database alerts
   - `#deployments` - Deployment notifications

5. Create a `.env.monitoring` file:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 2. Start the Monitoring Stack

```bash
# Load environment variables
set -a
source .env.monitoring
set +a

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Access the Dashboards

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Application Metrics**: http://localhost:4000/metrics

### 4. Install prom-client in Backend

```bash
cd Backend
npm install prom-client
```

### 5. Restart Backend to Enable Metrics

```bash
# If using Docker Compose
docker-compose restart backend

# Or restart your backend service
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MONITORING STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │ Backend  │─────>│Prometheus│─────>│ Grafana  │         │
│  │ :4000    │      │  :9090   │      │  :3001   │         │
│  │          │      │          │      │          │         │
│  │ /metrics │      │ Scrapes  │      │Visualize │         │
│  └──────────┘      └────┬─────┘      └──────────┘         │
│                         │                                   │
│                         ├──> Node Exporter (System)        │
│                         ├──> Postgres Exporter (Database)  │
│                         ├──> Redis Exporter (Cache)        │
│                         ├──> cAdvisor (Containers)         │
│                         │                                   │
│                         v                                   │
│                   ┌──────────┐      ┌──────────┐          │
│                   │Alertmgr  │─────>│  Slack   │          │
│                   │  :9093   │      │          │          │
│                   └──────────┘      └──────────┘          │
│                                                             │
│  ┌──────────┐      ┌──────────┐                           │
│  │ Promtail │─────>│   Loki   │<────┐                     │
│  │ Logs     │      │  :3100   │     │                     │
│  └──────────┘      └──────────┘     │                     │
│       └─── Reads Backend Logs ──────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Disk Space**: 10GB minimum (for 30 days retention)
- **RAM**: 4GB minimum
- **CPU**: 2 cores minimum

### Network Ports

Ensure these ports are available:

| Service | Port | Description |
|---------|------|-------------|
| Prometheus | 9090 | Metrics database and query UI |
| Grafana | 3001 | Visualization dashboards |
| Alertmanager | 9093 | Alert routing and management |
| Loki | 3100 | Log aggregation |
| Node Exporter | 9100 | System metrics |
| Postgres Exporter | 9187 | Database metrics |
| Redis Exporter | 9121 | Cache metrics |
| cAdvisor | 8080 | Container metrics |

---

## Installation

### Step 1: Update Database Connection

Update `docker-compose.monitoring.yml` with your actual database credentials:

```yaml
postgres-exporter:
  environment:
    DATA_SOURCE_NAME: "postgresql://YOUR_USER:YOUR_PASSWORD@postgres:5432/YOUR_DB?sslmode=disable"
```

### Step 2: Create Slack Webhook (Optional)

If you want Slack notifications:

1. Create `.env.monitoring`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

2. Load environment before starting:

```bash
set -a && source .env.monitoring && set +a
```

### Step 3: Start Monitoring Stack

```bash
# Start all services in detached mode
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### Step 4: Verify Services

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana health
curl http://localhost:3001/api/health

# Check application metrics endpoint
curl http://localhost:4000/metrics
```

---

## Configuration

### Prometheus Configuration

Edit `monitoring/prometheus.yml` to customize:

```yaml
global:
  scrape_interval: 15s  # How often to scrape targets
  evaluation_interval: 15s  # How often to evaluate rules

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:4000']  # Your backend endpoint
```

### Alert Rules

Alert rules are in `monitoring/alerts/`:

- `application.yml` - API latency, error rates, webhooks, queues
- `infrastructure.yml` - CPU, memory, disk, database, Redis

Example alert:

```yaml
- alert: HighAPILatency
  expr: |
    histogram_quantile(0.95,
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le, method, route)
    ) > 0.3
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High API latency detected"
    description: "95th percentile latency is {{ $value | humanizeDuration }}"
```

### Grafana Provisioning

Grafana automatically loads:

- **Datasources**: `monitoring/grafana/provisioning/datasources/`
- **Dashboards**: `monitoring/grafana/dashboards/`

No manual configuration needed!

---

## Dashboards

### 1. System Overview Dashboard

**URL**: Grafana → Dashboards → System Overview

**Panels**:
- CPU Usage (%)
- Memory Usage (%)
- Disk Usage (gauge)
- Network Traffic (RX/TX)
- System Load Average
- Container CPU/Memory

**Best For**: Infrastructure health monitoring

### 2. Application Performance Dashboard

**URL**: Grafana → Dashboards → Application Performance

**Panels**:
- Request Rate (req/s)
- Error Rate (%)
- P95 Latency
- Active Requests
- Request Duration by Route
- Top 10 Slowest Routes
- Webhook Processing Time
- Queue Jobs Waiting

**Best For**: API performance monitoring, identifying bottlenecks

### 3. Database Performance Dashboard

**URL**: Grafana → Dashboards → Database Performance

**Panels**:
- Database Status
- Active Connections
- Cache Hit Ratio
- Transactions Per Second
- Query Performance
- Deadlocks
- Table Sizes
- Index Usage
- Table Bloat
- Replication Lag

**Best For**: Database optimization, connection pool tuning

### 4. Redis Performance Dashboard

**URL**: Grafana → Dashboards → Redis Performance

**Panels**:
- Redis Status
- Connected Clients
- Memory Usage
- Hit Rate
- Commands Per Second
- Cache Hit/Miss Rate
- Evicted Keys
- Rejected Connections
- Network I/O

**Best For**: Cache optimization, memory management

### 5. Business Metrics Dashboard

**URL**: Grafana → Dashboards → Business Metrics

**Panels**:
- Total Bookings (24h)
- Active Bookings
- Cancellation Rate
- Messages Sent
- Booking Status Distribution
- Message Delivery Status
- AI API Calls
- Active Users
- Bookings by Hour
- Top Services

**Best For**: Business KPIs, growth tracking, user engagement

---

## Alerts

### Alert Severity Levels

| Severity | Description | Response Time | Notification |
|----------|-------------|---------------|--------------|
| **critical** | Service down, data loss imminent | Immediate | Slack @channel |
| **warning** | Performance degradation, capacity issues | 1 hour | Slack notification |
| **info** | Informational, deployment notifications | None | Logged only |

### Application Alerts

| Alert | Threshold | Severity | Description |
|-------|-----------|----------|-------------|
| HighAPILatency | p95 > 300ms | warning | API response time degraded |
| CriticalAPILatency | p95 > 1000ms | critical | API severely degraded |
| HighErrorRate | >2% | warning | Elevated error rate |
| CriticalErrorRate | >5% | critical | Very high error rate |
| SlowWebhookProcessing | p95 > 2s | warning | Webhook processing slow |
| QueueBacklog | >1000 jobs | warning | Queue backlog building up |
| NoBookingsCreated | 0 in 30min | warning | No bookings activity |

### Infrastructure Alerts

| Alert | Threshold | Severity | Description |
|-------|-----------|----------|-------------|
| HighCPUUsage | >80% | warning | CPU usage elevated |
| CriticalCPUUsage | >95% | critical | CPU nearly exhausted |
| HighMemoryUsage | >85% | warning | Memory usage elevated |
| CriticalMemoryUsage | >95% | critical | Memory nearly exhausted |
| HighDiskUsage | >90% | critical | Disk space critical |
| PostgresDown | 0 | critical | Database unavailable |
| RedisDown | 0 | critical | Cache unavailable |

### Alert Inhibition Rules

Smart alerting prevents noise:

1. **Critical suppresses warning**: If a critical alert fires, related warnings are suppressed
2. **Service down suppresses component alerts**: If PostgreSQL is down, database-related alerts are suppressed
3. **Component-based grouping**: Alerts are grouped by service/component

Example:

```yaml
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## Slack Integration

### Channel Setup

Create these Slack channels:

1. **#alerts** - General alerts (all severities)
2. **#critical-alerts** - Critical alerts only (@channel notifications)
3. **#app-alerts** - Application component alerts
4. **#infra-alerts** - Infrastructure alerts
5. **#database-alerts** - Database-specific alerts
6. **#deployments** - Deployment notifications

### Webhook Configuration

1. Edit `.env.monitoring`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

2. Restart Alertmanager:

```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### Testing Alerts

Send a test alert:

```bash
# Create a test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "warning",
    "component": "test"
  },
  "annotations": {
    "summary": "This is a test alert",
    "description": "Testing Slack integration"
  }
}]'
```

### Alert Message Format

Alerts include:

- **Status**: Firing or Resolved
- **Severity**: Critical, Warning, Info
- **Summary**: Short description
- **Description**: Detailed information
- **Component**: Which service/component
- **Instance**: Specific server/container
- **Runbook URL**: Link to troubleshooting guide

Example Slack message:

```
🚨 CRITICAL ALERT: HighAPILatency

*Summary:* High API latency detected
*Description:* 95th percentile latency is 850ms for POST /api/bookings
*Component:* api
*Instance:* backend-api
*Runbook:* https://docs.company.com/runbooks/high-api-latency
```

---

## Troubleshooting

### Service Won't Start

**Problem**: Container fails to start

**Solution**:

```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs [service_name]

# Common issues:
# 1. Port already in use
lsof -i :[port_number]

# 2. Permission issues
sudo chown -R 472:472 monitoring/grafana/

# 3. Configuration syntax error
docker-compose -f docker-compose.monitoring.yml config
```

### No Metrics Showing

**Problem**: Grafana dashboards are empty

**Solution**:

```bash
# 1. Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# 2. Verify backend metrics endpoint
curl http://localhost:4000/metrics

# 3. Check if prom-client is installed
cd Backend && npm list prom-client

# 4. Restart backend
docker-compose restart backend
```

### Alerts Not Firing

**Problem**: No Slack notifications received

**Solution**:

```bash
# 1. Check Alertmanager status
curl http://localhost:9093/api/v1/status

# 2. Verify webhook URL
echo $SLACK_WEBHOOK_URL

# 3. Test webhook manually
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test message"}'

# 4. Check alert rules are loaded
curl http://localhost:9090/api/v1/rules

# 5. View Alertmanager logs
docker-compose -f docker-compose.monitoring.yml logs alertmanager
```

### High Memory Usage

**Problem**: Monitoring stack consuming too much memory

**Solution**:

```yaml
# Reduce retention in prometheus.yml
--storage.tsdb.retention.time=15d  # Instead of 30d

# Reduce retention in loki-config.yml
retention_period: 336h  # 14 days instead of 30
```

### Slow Grafana Queries

**Problem**: Dashboards taking long to load

**Solution**:

```yaml
# Increase query timeout in datasources.yml
jsonData:
  queryTimeout: 120s  # Instead of 60s

# Optimize PromQL queries
# Use recording rules for expensive queries
```

---

## Maintenance

### Daily Tasks

- ✅ Check Grafana dashboards for anomalies
- ✅ Review critical alerts in Slack
- ✅ Monitor disk usage for metrics storage

### Weekly Tasks

- ✅ Review alert thresholds and adjust if needed
- ✅ Check for new Grafana dashboard updates
- ✅ Verify all exporters are healthy
- ✅ Review slow query logs

### Monthly Tasks

- ✅ Update Docker images:

```bash
docker-compose -f docker-compose.monitoring.yml pull
docker-compose -f docker-compose.monitoring.yml up -d
```

- ✅ Review and clean old metrics:

```bash
# Check Prometheus storage size
du -sh monitoring/prometheus-data/

# Loki storage
du -sh monitoring/loki-data/
```

- ✅ Backup Grafana dashboards:

```bash
# Export all dashboards
mkdir -p backups/grafana-$(date +%Y%m%d)
docker exec grafana curl -X GET http://admin:admin123@localhost:3000/api/search?type=dash-db \
  | jq -r '.[].url' | xargs -I {} sh -c 'docker exec grafana curl -X GET http://admin:admin123@localhost:3000/api/dashboards{} > backups/grafana-$(date +%Y%m%d)/$(basename {}).json'
```

- ✅ Review and optimize alert rules

### Backup Strategy

**Configuration Backup**:

```bash
# Backup all monitoring configs
tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz \
  monitoring/ \
  docker-compose.monitoring.yml
```

**Metrics Backup** (optional):

```bash
# Prometheus data
docker run --rm -v prometheus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar -czf /backup/prometheus-$(date +%Y%m%d).tar.gz /data
```

### Upgrading Components

```bash
# 1. Backup current state
./backup-monitoring.sh

# 2. Update docker-compose.monitoring.yml with new versions
# Example: prometheus:v2.47.0 -> prometheus:v2.48.0

# 3. Pull new images
docker-compose -f docker-compose.monitoring.yml pull

# 4. Restart with new images
docker-compose -f docker-compose.monitoring.yml up -d

# 5. Verify all services healthy
docker-compose -f docker-compose.monitoring.yml ps
```

### Scaling Considerations

**When to scale**:

- Prometheus memory usage > 8GB
- Prometheus disk I/O saturated
- Grafana response time > 3s
- More than 100 targets to scrape

**Scaling options**:

1. **Federation**: Multiple Prometheus instances with central aggregation
2. **Thanos**: Long-term storage and global query view
3. **Mimir**: Horizontally scalable Prometheus alternative
4. **Separate Grafana**: Dedicated Grafana instance for dashboards

---

## Advanced Configuration

### Custom Metrics

Add custom metrics in `Backend/src/middleware/metrics.js`:

```javascript
const { metrics } = require('./src/middleware/metrics');

// Create custom counter
const customCounter = new client.Counter({
  name: 'custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type'],
  registers: [register],
});

// Use in your code
customCounter.inc({ event_type: 'special_action' });
```

### Recording Rules

For expensive queries, create recording rules in `monitoring/prometheus.yml`:

```yaml
rule_files:
  - '/etc/prometheus/recording_rules/*.yml'

# Create monitoring/recording_rules/api.yml:
groups:
  - name: api_recording
    interval: 30s
    rules:
      - record: api:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

### Log-Based Alerts

Create alerts based on log patterns in Loki:

```yaml
# In monitoring/loki-config.yml ruler section
groups:
  - name: error_logs
    rules:
      - alert: HighErrorLogRate
        expr: |
          sum(rate({job="backend-api", level="error"}[5m])) > 10
        for: 5m
        annotations:
          summary: High error log rate detected
```

---

## Support and Resources

### Documentation

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)

### Quick Reference

```bash
# View all monitoring services
docker-compose -f docker-compose.monitoring.yml ps

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart [service]

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f [service]

# Stop all monitoring
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove volumes (WARNING: deletes all metrics)
docker-compose -f docker-compose.monitoring.yml down -v
```

### Performance Tuning

**Prometheus**:
```yaml
# Reduce scrape interval for less critical targets
- job_name: 'cadvisor'
  scrape_interval: 60s  # Instead of 15s
```

**Grafana**:
```yaml
# Increase cache TTL
environment:
  - GF_DATAPROXY_TIMEOUT=120
  - GF_DATAPROXY_KEEP_ALIVE_SECONDS=120
```

**Loki**:
```yaml
# Adjust chunk size for better compression
chunk_target_size: 1572864  # 1.5MB
```

---

## Conclusion

You now have a complete monitoring stack with:

- ✅ Real-time metrics collection
- ✅ Beautiful visualization dashboards
- ✅ Comprehensive alerting
- ✅ Log aggregation
- ✅ Slack integration
- ✅ 30-day retention

**Next Steps**:

1. Customize alert thresholds based on your traffic patterns
2. Create custom dashboards for specific use cases
3. Set up long-term metrics storage (Thanos/Mimir)
4. Implement automated runbooks for common alerts
5. Configure on-call schedules in Alertmanager

For questions or issues, refer to the troubleshooting section or check the official documentation links above.

Happy monitoring! 📊🚀
