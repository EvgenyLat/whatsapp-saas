# 🔌 Connection Pooling Guide

**Version:** 1.0
**Last Updated:** 2025-10-17
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Monitoring](#monitoring)
4. [Load Testing](#load-testing)
5. [Performance Tuning](#performance-tuning)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

The WhatsApp SaaS application uses **Prisma Client** with **PostgreSQL** connection pooling to efficiently manage database connections. This guide covers configuration, monitoring, and optimization of the connection pool.

### Key Features

✅ **Configurable Pool Size** - Control max connections (default: 20)
✅ **Connection Timeouts** - Prevent hanging connections (default: 20s)
✅ **Statement Caching** - Cache prepared statements (default: 100)
✅ **Query Timeout** - Enforce max query duration (default: 10s)
✅ **Slow Query Logging** - Track queries >1s
✅ **Real-time Metrics** - Active connections, utilization, performance
✅ **Automatic Alerts** - Warn at 80% pool utilization

### Architecture

```
┌──────────────────┐
│  Application     │
│  (Express.js)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Prisma Client   │
│  Connection Pool │
│  (Max: 20)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PostgreSQL      │
│  Database        │
└──────────────────┘
```

---

## Configuration

### Environment Variables

Add to `Backend/.env`:

```bash
# Connection Pool Configuration
DB_CONNECTION_LIMIT=20              # Max connections in pool
DB_POOL_TIMEOUT=20                  # Connection acquisition timeout (seconds)
DB_STATEMENT_CACHE_SIZE=100         # Prepared statement cache size

# Query Configuration
DB_QUERY_TIMEOUT=10000              # Query timeout (milliseconds)
DB_SLOW_QUERY_THRESHOLD=1000        # Slow query threshold (milliseconds)
```

### Configuration Recommendations by Environment

| Environment | Connection Limit | Pool Timeout | Query Timeout |
|-------------|-----------------|--------------|---------------|
| **Development** | 5 | 10s | 30s |
| **Staging** | 10 | 15s | 15s |
| **Production** | 20 | 20s | 10s |
| **High Traffic** | 50 | 30s | 5s |

### Calculating Optimal Pool Size

**Formula:** `connections = ((core_count × 2) + effective_spindle_count)`

For typical setups:
- **2 CPU cores:** 5-10 connections
- **4 CPU cores:** 10-20 connections
- **8 CPU cores:** 20-40 connections

**Important:** More connections ≠ better performance. Too many connections can degrade performance.

---

## Monitoring

### Metrics Endpoint

Access real-time database metrics at:

```bash
GET http://localhost:3000/metrics/database
```

**Response Example:**

```json
{
  "pool": {
    "active": 5,
    "total": 12,
    "limit": 20,
    "utilization": 60.00,
    "idle": 7
  },
  "queries": {
    "queriesExecuted": 15234,
    "slowQueries": 45,
    "queryErrors": 3,
    "averageQueryTime": 12.45,
    "slowQueryRate": 0.30,
    "uptimeMs": 3600000,
    "lastResetTime": "2025-10-17T10:00:00.000Z"
  },
  "slowQueries": [
    {
      "query": "SELECT * FROM bookings WHERE salon_id = $1 AND start_ts > $2 ORDER BY created_at DESC",
      "duration": 1523,
      "timestamp": "2025-10-17T10:15:23.456Z"
    }
  ],
  "config": {
    "connectionLimit": 20,
    "poolTimeout": 20,
    "queryTimeout": 10000,
    "slowQueryThreshold": 1000
  },
  "timestamp": "2025-10-17T10:30:00.000Z"
}
```

### Key Metrics Explained

#### Pool Metrics

| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| `active` | Queries currently executing | < 80% of limit |
| `total` | Total connections in pool | < limit |
| `utilization` | Pool usage percentage | < 80% |
| `idle` | Available connections | > 20% of limit |

#### Query Metrics

| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| `queriesExecuted` | Total queries since startup | N/A |
| `slowQueries` | Queries > 1s | < 5% of total |
| `queryErrors` | Failed queries | < 1% of total |
| `averageQueryTime` | Mean execution time (ms) | < 50ms |
| `slowQueryRate` | % of slow queries | < 5% |

### Automated Alerts

The system automatically logs warnings when:

- **Pool utilization > 80%**
  ```
  [WARN] High pool utilization: 85.0% (17/20)
  ```

- **Slow query detected (>1s)**
  ```
  [WARN] Slow query detected (1523ms): SELECT * FROM bookings...
  ```

- **Query timeout**
  ```
  [ERROR] Query timeout after 10000ms
  ```

### Monitoring Dashboard

Create a monitoring dashboard using the metrics endpoint:

```javascript
// Example: Poll metrics every 30 seconds
setInterval(async () => {
  const response = await fetch('http://localhost:3000/metrics/database');
  const metrics = await response.json();

  console.log(`Pool Utilization: ${metrics.pool.utilization}%`);
  console.log(`Avg Query Time: ${metrics.queries.averageQueryTime}ms`);
  console.log(`Slow Queries: ${metrics.queries.slowQueries}`);
}, 30000);
```

---

## Load Testing

### Running Load Tests

Test the connection pool under various load conditions:

```bash
cd Backend/scripts

# Basic load test (100 concurrent connections, 60 seconds)
node load-test-connection-pool.js

# Custom configuration
node load-test-connection-pool.js \
  --concurrent 200 \
  --duration 120 \
  --ramp-up 20 \
  --query-type mixed \
  --report-file ../test-results/load-test-report.json
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--concurrent` | Number of concurrent connections | 100 |
| `--duration` | Test duration (seconds) | 60 |
| `--ramp-up` | Ramp-up time (seconds) | 10 |
| `--query-type` | Query type: simple, complex, mixed | mixed |
| `--report-file` | Save report to file | none |

### Test Report Example

```
============================================================
Load Test Results
============================================================

Configuration:
  Concurrent Connections: 100
  Test Duration: 60s
  Query Type: mixed

Performance:
  Total Queries: 45,678
  Successful: 45,623 (99.88%)
  Failed: 55
  Throughput: 761.30 queries/second

Connection Acquisition:
  Average: 45.23ms
  P95: 156.78ms
  P99: 234.56ms
  Max: 456.78ms

Query Execution:
  Average: 12.34ms
  P95: 45.67ms
  P99: 123.45ms
  Max: 876.54ms

Errors:
  Total: 55
  Connection Errors: 2
  Timeouts: 0
  Slow Queries (>1s): 23

Concurrency:
  Peak: 98
  Final: 0

Assessment:
  Status: ✓ PASS
```

### Interpreting Results

#### Success Criteria

- ✅ Success rate > 99%
- ✅ Connection acquisition P95 < 1000ms
- ✅ Query execution P95 < 500ms
- ✅ Error rate < 1%
- ✅ No connection timeout errors

#### Common Issues

**High Connection Acquisition Time (P95 > 1s)**
- **Cause:** Pool exhaustion
- **Solution:** Increase `DB_CONNECTION_LIMIT` or reduce concurrent load

**High Query Execution Time (P95 > 500ms)**
- **Cause:** Missing indexes or inefficient queries
- **Solution:** Add indexes (see INDEX_PERFORMANCE_REPORT.md)

**Connection Errors**
- **Cause:** Pool timeout or database unavailable
- **Solution:** Increase `DB_POOL_TIMEOUT` or check database health

---

## Performance Tuning

### Scenario 1: High Traffic Application

**Symptoms:**
- Pool utilization consistently > 80%
- Connection acquisition time > 500ms
- Occasional connection timeouts

**Solution:**

```bash
# Backend/.env
DB_CONNECTION_LIMIT=50
DB_POOL_TIMEOUT=30
DB_QUERY_TIMEOUT=5000
```

**Verification:**
```bash
node scripts/load-test-connection-pool.js --concurrent 200 --duration 120
```

### Scenario 2: Low Latency Requirements

**Symptoms:**
- Need P95 query time < 50ms
- Real-time user interactions

**Solution:**

```bash
# Backend/.env
DB_CONNECTION_LIMIT=30
DB_QUERY_TIMEOUT=3000
DB_SLOW_QUERY_THRESHOLD=50

# Add aggressive indexes
# See INDEX_PERFORMANCE_REPORT.md
```

### Scenario 3: Cost Optimization

**Symptoms:**
- Low traffic
- High database connection costs
- Over-provisioned resources

**Solution:**

```bash
# Backend/.env
DB_CONNECTION_LIMIT=5
DB_POOL_TIMEOUT=10
DB_QUERY_TIMEOUT=15000
```

### PostgreSQL Configuration

Adjust PostgreSQL settings for optimal performance:

```sql
-- postgresql.conf

-- Maximum connections (should be > sum of all app pools)
max_connections = 100

-- Shared buffers (25% of RAM)
shared_buffers = 4GB

-- Effective cache size (50-75% of RAM)
effective_cache_size = 12GB

-- Work memory (for sorting/hashing)
work_mem = 64MB

-- Maintenance work memory (for VACUUM, CREATE INDEX)
maintenance_work_mem = 1GB

-- WAL settings for performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9

-- Query planner settings
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200  # For SSD
```

---

## Troubleshooting

### Issue 1: "Connection Pool Exhausted"

**Symptoms:**
```
Error: Can't reach database server at `localhost:5432`
Timeout acquiring connection from the pool
```

**Diagnosis:**
```bash
# Check metrics
curl http://localhost:3000/metrics/database

# Check pool utilization
{
  "pool": {
    "utilization": 100.00,
    "active": 20,
    "total": 20,
    "limit": 20
  }
}
```

**Solutions:**

1. **Increase pool size:**
   ```bash
   # .env
   DB_CONNECTION_LIMIT=40
   ```

2. **Increase timeout:**
   ```bash
   # .env
   DB_POOL_TIMEOUT=30
   ```

3. **Check for connection leaks:**
   ```bash
   # Run load test
   node scripts/load-test-connection-pool.js --duration 300

   # Check if connections are released
   # Final concurrency should be 0
   ```

### Issue 2: Slow Queries Degrading Performance

**Symptoms:**
```
[WARN] Slow query detected (2345ms): SELECT * FROM bookings...
High average query time: 456ms
```

**Diagnosis:**
```bash
# Get slow queries
curl http://localhost:3000/metrics/database | jq '.slowQueries'

# Check database
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

**Solutions:**

1. **Add indexes** (see INDEX_PERFORMANCE_REPORT.md)

2. **Optimize queries:**
   ```javascript
   // Bad: N+1 query problem
   const salons = await prisma.salon.findMany();
   for (const salon of salons) {
     const bookings = await prisma.booking.findMany({
       where: { salon_id: salon.id }
     });
   }

   // Good: Use include
   const salons = await prisma.salon.findMany({
     include: { bookings: true }
   });
   ```

3. **Use query batching:**
   ```javascript
   // Use Promise.all for parallel queries
   const [salons, messages] = await Promise.all([
     prisma.salon.findMany(),
     prisma.message.findMany()
   ]);
   ```

### Issue 3: Memory Leaks

**Symptoms:**
```
Increasing memory usage over time
Pool connections not released
Application crashes with OOM
```

**Diagnosis:**
```bash
# Monitor memory
curl http://localhost:3000/healthz | jq '.memory'

# Check for leaked connections
psql $DATABASE_URL -c "
  SELECT COUNT(*), state
  FROM pg_stat_activity
  WHERE datname = current_database()
  GROUP BY state;
"
```

**Solutions:**

1. **Always disconnect properly:**
   ```javascript
   // Ensure prisma.$disconnect() is called on shutdown
   process.on('SIGTERM', async () => {
     await prisma.$disconnect();
     process.exit(0);
   });
   ```

2. **Use connection pooling middleware:**
   ```javascript
   // Automatic connection management
   app.use(async (req, res, next) => {
     res.on('finish', () => {
       // Connections are automatically returned to pool
     });
     next();
   });
   ```

### Issue 4: Database Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Can't reach database server
```

**Solutions:**

1. **Check database is running:**
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. **Verify connection string:**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://user:pass@host:5432/dbname
   ```

3. **Check firewall/security groups:**
   ```bash
   telnet localhost 5432
   ```

---

## Best Practices

### 1. Connection Management

✅ **DO:** Use singleton pattern for Prisma Client
```javascript
// Good: Single instance
const db = new DatabaseClient();
module.exports = db;
```

❌ **DON'T:** Create multiple Prisma clients
```javascript
// Bad: Multiple instances exhaust pool
app.get('/data', async (req, res) => {
  const prisma = new PrismaClient(); // ❌ Don't do this
  const data = await prisma.data.findMany();
  res.json(data);
});
```

### 2. Query Optimization

✅ **DO:** Use selective queries
```javascript
// Good: Select only needed fields
const salons = await prisma.salon.findMany({
  select: { id: true, name: true }
});
```

❌ **DON'T:** Fetch unnecessary data
```javascript
// Bad: Fetches all fields and relations
const salons = await prisma.salon.findMany({
  include: { bookings: true, messages: true }
});
```

### 3. Error Handling

✅ **DO:** Handle connection errors gracefully
```javascript
try {
  const data = await prisma.data.findMany();
} catch (error) {
  if (error.code === 'P2024') {
    // Connection pool timeout
    logger.error('Database overloaded');
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  throw error;
}
```

### 4. Monitoring

✅ **DO:** Monitor metrics regularly
```bash
# Set up monitoring dashboard
# Alert on:
# - Pool utilization > 80%
# - Slow query rate > 5%
# - Error rate > 1%
```

### 5. Testing

✅ **DO:** Load test before production
```bash
# Test at 2x expected peak load
node scripts/load-test-connection-pool.js \
  --concurrent 200 \
  --duration 300 \
  --query-type mixed
```

### 6. Capacity Planning

**Monitor these metrics for scaling decisions:**

| Metric | Scale Up Threshold | Action |
|--------|-------------------|--------|
| Pool Utilization | > 70% sustained | Increase `DB_CONNECTION_LIMIT` |
| P95 Query Time | > 200ms | Add indexes or optimize queries |
| Connection Errors | > 0.1% | Increase `DB_POOL_TIMEOUT` |
| Slow Query Rate | > 5% | Optimize slow queries |

---

## Quick Reference

### Environment Variables

```bash
DB_CONNECTION_LIMIT=20          # Pool size
DB_POOL_TIMEOUT=20              # Connection timeout (seconds)
DB_STATEMENT_CACHE_SIZE=100     # Statement cache size
DB_QUERY_TIMEOUT=10000          # Query timeout (ms)
DB_SLOW_QUERY_THRESHOLD=1000    # Slow query threshold (ms)
```

### Monitoring Commands

```bash
# Get metrics
curl http://localhost:3000/metrics/database

# Load test
node scripts/load-test-connection-pool.js

# Check PostgreSQL connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

### Common Configurations

| Use Case | Connection Limit | Pool Timeout | Query Timeout |
|----------|-----------------|--------------|---------------|
| Development | 5 | 10 | 30000 |
| Low Traffic | 10 | 15 | 15000 |
| Normal | 20 | 20 | 10000 |
| High Traffic | 50 | 30 | 5000 |

---

## Summary

**Connection Pooling Status:** ✅ Configured and Monitored

**Key Features Implemented:**
- ✅ Configurable connection pool (20 connections)
- ✅ Connection timeout (20 seconds)
- ✅ Query timeout enforcement (10 seconds)
- ✅ Slow query logging (>1 second)
- ✅ Real-time metrics endpoint
- ✅ Automatic utilization alerts (>80%)
- ✅ Comprehensive load testing script
- ✅ Production-ready configuration

**Next Steps:**
1. Configure environment variables for your environment
2. Run load tests to verify configuration
3. Monitor metrics endpoint regularly
4. Tune configuration based on actual traffic patterns

---

**Questions or Issues?**
Create an issue in the project repository or contact the DevOps team.

**Last Updated:** 2025-10-17
**Version:** 1.0
