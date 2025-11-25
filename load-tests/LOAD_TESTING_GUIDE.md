# Load Testing Guide

Comprehensive guide for load testing the WhatsApp SaaS platform using k6.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Suite](#test-suite)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Analyzing Results](#analyzing-results)
- [Performance Baselines](#performance-baselines)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

This load testing suite is designed to validate the performance, scalability, and reliability of the WhatsApp SaaS platform under various load conditions.

### Test Types

1. **API Load Test** - General API endpoint performance
2. **Database Load Test** - Database query performance and connection pool management
3. **Webhook Load Test** - WhatsApp webhook processing with AI integration
4. **Spike Test** - Sudden traffic surge handling
5. **Soak Test** - Long-term stability (1 hour)
6. **Stress Test** - Breaking point identification

### Key Metrics

- **Response Time**: P50, P95, P99 latency measurements
- **Throughput**: Requests per second
- **Error Rate**: Failed request percentage
- **Resource Utilization**: Database connections, memory usage
- **Stability**: Performance consistency over time

---

## Prerequisites

### Required Software

1. **k6** (Load testing tool)
   ```bash
   # macOS
   brew install k6

   # Windows
   choco install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Node.js** (For analysis tools)
   - Version 16+ required

3. **curl** (For pre-flight checks)

### Backend Requirements

- Backend server must be running and accessible
- Database must be initialized
- Test data should be seeded (optional but recommended)

---

## Quick Start

### 1. Configure Environment

Create a `.env` file or export environment variables:

```bash
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your-admin-token-here"
export TEST_SALON_ID="test-salon-123"
export WHATSAPP_VERIFY_TOKEN="your-verify-token"
export PHONE_NUMBER_ID="1234567890"
```

### 2. Run Quick Test Suite

```bash
cd load-tests
chmod +x run-all-tests.sh
./run-all-tests.sh --quick
```

This runs a shortened version of all tests (~5 minutes total).

### 3. View Results

Results are saved in `./results/run_YYYYMMDD_HHMMSS/`:
- HTML reports: `*-summary.html`
- JSON data: `*-summary.json`
- Raw metrics: `*-raw.json`

---

## Test Suite

### 1. API Load Test

**Purpose**: Validate general API endpoint performance

**Duration**: 10 minutes (2 min quick mode)

**Load Pattern**:
- Ramp up: 10 → 50 → 100 users
- Hold: 100 users for 3 minutes
- Ramp down: 100 → 0 users

**Endpoints Tested**:
- `GET /healthz`
- `GET /`
- `GET /admin/bookings/:salonId`
- `GET /admin/messages/:salonId`
- `GET /admin/stats/:salonId`
- `GET /metrics/database`
- `GET /metrics`

**Thresholds**:
- P95 < 200ms
- P99 < 500ms
- Error rate < 1%

**Usage**:
```bash
k6 run scripts/api-test.js
```

### 2. Database Load Test

**Purpose**: Test database query performance and connection pool management

**Duration**: 10 minutes

**Load Pattern**:
- Ramp up: 50 → 200 concurrent queries
- Hold: 200 queries for 4 minutes
- Ramp down: 200 → 0

**Tests**:
- Paginated queries (bookings, messages)
- Complex aggregations (stats, analytics)
- Concurrent query bursts (connection pool stress)

**Thresholds**:
- P95 < 100ms
- P99 < 200ms
- Error rate < 0.5%
- Connection pool not exhausted

**Usage**:
```bash
k6 run scripts/database-test.js
```

### 3. Webhook Load Test

**Purpose**: Simulate WhatsApp webhook traffic with message processing and AI

**Duration**: 10 minutes

**Load Pattern**:
- Ramp up: 20 → 100 users
- Hold: 100 users for 2 minutes
- Ramp down: 100 → 0

**Conversation Flows**:
- Booking flow (5 messages)
- Information queries (4 messages)
- Cancellation flow (3 messages)
- Short interactions (2 messages)

**Thresholds**:
- P95 < 1000ms (includes AI processing)
- P99 < 2000ms
- Error rate < 2%

**Usage**:
```bash
k6 run scripts/webhook-test.js
```

### 4. Spike Test

**Purpose**: Test system behavior under sudden traffic surge

**Duration**: 4 minutes

**Load Pattern**:
- Warm up: 10 users (10 seconds)
- **SPIKE**: 10 → 500 users (1 minute)
- Hold: 500 users (2 minutes)
- Recover: 500 → 10 users (1 minute)

**Acceptance Criteria**:
- System stays operational (no crashes)
- Error rate < 5%
- Health endpoint remains responsive
- System recovers after spike

**Usage**:
```bash
k6 run scripts/spike-test.js
```

### 5. Soak Test (Stability Test)

**Purpose**: Detect memory leaks, connection leaks, and performance degradation over time

**Duration**: 1 hour

**Load Pattern**:
- Ramp up: 0 → 50 users (2 minutes)
- **HOLD**: 50 users (56 minutes)
- Ramp down: 50 → 0 users (2 minutes)

**Monitoring**:
- Database connection counts
- Memory usage trends
- Response time stability
- Error rate consistency

**Thresholds**:
- P95 < 300ms (sustained)
- P99 < 800ms
- Error rate < 1%
- No performance degradation over time

**Usage**:
```bash
k6 run scripts/soak-test.js
```

### 6. Stress Test (Breaking Point)

**Purpose**: Find system's maximum capacity and breaking point

**Duration**: 37 minutes

**Load Pattern**:
- Stage 1: 50 users (2 min)
- Stage 2: 100 users (5 min)
- Stage 3: 200 users (5 min)
- Stage 4: 300 users (5 min)
- Stage 5: 400 users (5 min)
- Stage 6: **500 users** (10 min)
- Ramp down: 0 users (2 min)

**Outputs**:
- Recommended maximum capacity
- Breaking point threshold
- Performance by load stage
- Recovery capability

**Usage**:
```bash
k6 run scripts/stress-test.js
```

---

## Configuration

### Environment Variables

All tests use centralized configuration from `config/config.js`:

```javascript
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:4000',
  adminToken: __ENV.ADMIN_TOKEN || 'your-admin-token-here',
  testSalonId: __ENV.TEST_SALON_ID || 'test-salon-123',

  whatsapp: {
    verifyToken: __ENV.WHATSAPP_VERIFY_TOKEN || 'your-verify-token',
    phoneNumberId: __ENV.PHONE_NUMBER_ID || '1234567890',
  },

  thresholds: {
    api: { p95: 200, p99: 500, errorRate: 0.01 },
    webhook: { p95: 1000, p99: 2000, errorRate: 0.02 },
    database: { p95: 100, p99: 200, errorRate: 0.005 },
  },
};
```

### Customizing Thresholds

Edit `config/config.js` to adjust performance thresholds:

```javascript
thresholds: {
  api: {
    p95: 200,  // Change to your SLA requirement
    p99: 500,
    errorRate: 0.01,
  },
}
```

### Customizing Load Patterns

Modify stages in `config/config.js`:

```javascript
loadPatterns: {
  gradual: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 50 },
      // Add or modify stages
    ],
  },
}
```

---

## Running Tests

### Run Individual Tests

```bash
# API test
k6 run scripts/api-test.js

# Database test
k6 run scripts/database-test.js

# Webhook test
k6 run scripts/webhook-test.js

# Spike test
k6 run scripts/spike-test.js

# Soak test (1 hour)
k6 run scripts/soak-test.js

# Stress test
k6 run scripts/stress-test.js
```

### Run Full Test Suite

```bash
# Full suite (prompts for soak and stress tests)
./run-all-tests.sh

# Quick mode (shortened tests)
./run-all-tests.sh --quick
```

### Override Configuration

```bash
# Custom base URL
BASE_URL=https://staging.example.com k6 run scripts/api-test.js

# Custom admin token
ADMIN_TOKEN=my-token k6 run scripts/api-test.js

# Multiple overrides
BASE_URL=http://localhost:4000 \
ADMIN_TOKEN=test-token \
TEST_SALON_ID=salon-123 \
k6 run scripts/api-test.js
```

### Custom Load Patterns

```bash
# Override stages
k6 run --stage 1m:10,2m:50,1m:0 scripts/api-test.js

# Set VUs and duration
k6 run --vus 50 --duration 5m scripts/api-test.js
```

### Output Options

```bash
# JSON output
k6 run --out json=results/output.json scripts/api-test.js

# CSV output
k6 run --out csv=results/output.csv scripts/api-test.js

# Multiple outputs
k6 run \
  --out json=results/output.json \
  --out influxdb=http://localhost:8086/k6 \
  scripts/api-test.js
```

---

## Analyzing Results

### Automatic Analysis

The test suite includes automated analysis tools:

```bash
# Analyze single test run
node tools/analyze-results.js results/run_20250101_120000

# Compare two runs
node tools/compare-runs.js \
  results/run_20250101_120000 \
  results/run_20250101_140000
```

### HTML Reports

Each test generates an HTML report:

```bash
# Open in browser
open results/run_20250101_120000/api-test-summary.html
```

### Manual Analysis

Key metrics to review:

1. **Response Time Percentiles**
   - P50 (median): Typical user experience
   - P95: 95% of requests faster than this
   - P99: Worst case for most users

2. **Error Rate**
   - Should be < 1% for normal load
   - Spikes indicate issues

3. **Throughput**
   - Requests per second
   - Should scale linearly with VUs

4. **Resource Metrics**
   - Database connections
   - Memory usage
   - CPU utilization

### Grafana Integration

View real-time metrics in Grafana:

1. Start Grafana: `docker-compose up -d`
2. Open: http://localhost:3001
3. Navigate to "Real-time Metrics" dashboard
4. Run load tests and observe live metrics

### k6 Cloud (Optional)

Stream results to k6 Cloud for advanced analysis:

```bash
k6 login cloud
k6 run --out cloud scripts/api-test.js
```

---

## Performance Baselines

### Expected Performance (Local Development)

| Test Type | P95 Latency | P99 Latency | Error Rate | Throughput |
|-----------|-------------|-------------|------------|------------|
| API | < 200ms | < 500ms | < 1% | 100+ req/s |
| Database | < 100ms | < 200ms | < 0.5% | 200+ queries/s |
| Webhook | < 1000ms | < 2000ms | < 2% | 50+ msg/s |

### Expected Performance (Production)

| Test Type | P95 Latency | P99 Latency | Error Rate | Throughput |
|-----------|-------------|-------------|-------------|------------|
| API | < 150ms | < 300ms | < 0.5% | 500+ req/s |
| Database | < 50ms | < 100ms | < 0.1% | 1000+ queries/s |
| Webhook | < 800ms | < 1500ms | < 1% | 100+ msg/s |

### Capacity Planning

| Load Level | Users | Expected Latency | Notes |
|------------|-------|------------------|-------|
| Low | 10-50 | < 100ms | Normal operation |
| Medium | 50-100 | < 200ms | Typical traffic |
| High | 100-300 | < 500ms | Peak traffic |
| Critical | 300-500 | < 1000ms | Near capacity |
| Overload | 500+ | Variable | Degraded performance |

---

## Troubleshooting

### Common Issues

#### 1. Backend Not Accessible

**Error**: `Backend is not running at http://localhost:4000`

**Solution**:
```bash
# Check if backend is running
curl http://localhost:4000/healthz

# Start backend
cd Backend
npm start
```

#### 2. High Error Rates

**Symptoms**: Error rate > 5%

**Diagnosis**:
1. Check backend logs for errors
2. Review database connection pool
3. Check external API rate limits (WhatsApp, OpenAI)

**Solutions**:
- Increase database connection pool size
- Add request throttling
- Implement retry logic

#### 3. Database Connection Exhaustion

**Error**: `Connection pool exhausted`

**Solutions**:
```javascript
// Backend/src/config/database.js
pool: {
  max: 20,  // Increase max connections
  min: 5,
  acquire: 30000,
  idle: 10000,
}
```

#### 4. Memory Leaks (Soak Test)

**Symptoms**: P95 latency increases over time

**Diagnosis**:
```bash
# Monitor memory during test
watch -n 5 'ps aux | grep node'

# Check for connection leaks
SELECT count(*) FROM pg_stat_activity;
```

**Solutions**:
- Profile application with Node.js profiler
- Check for unclosed connections
- Review event listener cleanup

#### 5. Slow AI Processing

**Symptoms**: Webhook test P95 > 2000ms

**Solutions**:
- Implement request queuing
- Add caching for common responses
- Use faster OpenAI model (gpt-3.5-turbo)
- Process AI requests asynchronously

### Performance Optimization Tips

1. **Database Optimization**
   ```sql
   -- Add indexes
   CREATE INDEX idx_bookings_salon_date ON bookings(salon_id, appointment_date);
   CREATE INDEX idx_messages_salon_created ON messages(salon_id, created_at);

   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM bookings WHERE salon_id = '123';
   ```

2. **Caching**
   ```javascript
   // Add Redis caching for stats
   const cacheKey = `stats:${salonId}:${startDate}:${endDate}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

3. **Connection Pooling**
   ```javascript
   // Increase pool size for high load
   pool: {
     max: 50,
     min: 10,
   }
   ```

4. **Rate Limiting**
   ```javascript
   // Add rate limiting middleware
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minute
     max: 100 // 100 requests per minute
   });

   app.use('/api/', limiter);
   ```

---

## Best Practices

### Before Testing

1. **Prepare Test Environment**
   - Use dedicated test environment
   - Seed realistic test data
   - Clear caches and restart services

2. **Set Realistic Thresholds**
   - Based on SLA requirements
   - Consider infrastructure capabilities
   - Account for external dependencies

3. **Monitor Resources**
   - CPU, memory, disk I/O
   - Database connections
   - Network bandwidth

### During Testing

1. **Monitor Continuously**
   - Watch Grafana dashboards
   - Check application logs
   - Monitor system resources

2. **Document Observations**
   - Note when errors spike
   - Record performance degradation points
   - Capture unusual behavior

3. **Don't Test Production**
   - Always use staging/test environment
   - Production testing requires careful planning
   - Consider business hours and user impact

### After Testing

1. **Analyze Results Thoroughly**
   - Review all metrics
   - Compare with baselines
   - Identify trends and patterns

2. **Document Findings**
   - Performance bottlenecks
   - Capacity limitations
   - Optimization opportunities

3. **Take Action**
   - Fix critical issues
   - Optimize slow queries
   - Scale infrastructure if needed

4. **Retest**
   - Verify fixes improved performance
   - Compare before/after results
   - Update baselines

### CI/CD Integration

Add load testing to your pipeline:

```yaml
# .github/workflows/load-tests.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.47.0-linux-amd64/k6 /usr/bin/

      - name: Run load tests
        run: |
          cd load-tests
          ./run-all-tests.sh --quick
        env:
          BASE_URL: ${{ secrets.TEST_BASE_URL }}
          ADMIN_TOKEN: ${{ secrets.TEST_ADMIN_TOKEN }}

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: load-tests/results/
```

### Performance Testing Schedule

- **Daily**: Quick smoke tests (--quick mode)
- **Weekly**: Full test suite
- **Before Release**: Complete test suite including soak and stress tests
- **After Major Changes**: Targeted tests for affected components

---

## Additional Resources

### k6 Documentation
- [k6 Official Docs](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Best Practices](https://k6.io/docs/testing-guides/automated-performance-testing/)

### Monitoring Tools
- [Grafana Dashboards](https://grafana.com/docs/)
- [Prometheus Metrics](https://prometheus.io/docs/)

### Performance Testing
- [Web Performance Testing](https://web.dev/performance/)
- [Load Testing Best Practices](https://www.keycdn.com/blog/load-testing)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review test logs in `./results/`
3. Check Grafana dashboards for detailed metrics
4. Contact the performance engineering team

---

**Last Updated**: 2025-01-18

**Test Suite Version**: 1.0.0
