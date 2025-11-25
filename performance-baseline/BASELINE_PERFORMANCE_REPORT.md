# Performance Baseline Documentation

Comprehensive guide for establishing and maintaining performance baselines for the WhatsApp SaaS platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Benchmark Suite](#benchmark-suite)
- [Running Baselines](#running-baselines)
- [Interpreting Results](#interpreting-results)
- [Performance Targets](#performance-targets)
- [Optimization Workflow](#optimization-workflow)
- [Best Practices](#best-practices)

---

## Overview

### What is a Performance Baseline?

A performance baseline is a comprehensive snapshot of your application's performance characteristics at a specific point in time. It serves as a reference point to:

1. **Measure Impact**: Quantify the effect of code changes and optimizations
2. **Detect Regressions**: Identify when performance degrades
3. **Track Progress**: Monitor improvement trends over time
4. **Set SLAs**: Establish realistic performance goals

### Why Baseline Before Optimization?

- **Evidence-Based Decisions**: Know which optimizations actually help
- **Prevent Premature Optimization**: Focus on real bottlenecks
- **Verify Improvements**: Prove optimizations worked
- **Avoid Regressions**: Ensure "improvements" don't hurt other areas

### What We Measure

1. **API Performance**: Endpoint latency, throughput, error rates
2. **Database Performance**: Query execution time, index usage, table stats
3. **Frontend Performance**: Core Web Vitals, Lighthouse scores
4. **System Resources**: CPU, memory, disk I/O, network
5. **Business Metrics**: Requests/sec, concurrent users capacity

---

## Quick Start

### Prerequisites

```bash
# Required
- Node.js 16+
- PostgreSQL client (for database benchmarks)
- Running backend server
- Populated database (recommended)

# Optional
- Lighthouse (for frontend audits)
- k6 (for load testing)
```

### Run Complete Baseline

```bash
cd performance-baseline

# Set environment variables
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your-admin-token"
export TEST_SALON_ID="test-salon-123"
export DB_HOST="localhost"
export DB_USER="postgres"
export DB_PASSWORD="postgres"
export DB_NAME="whatsapp_saas"

# Run baseline
chmod +x run-baseline.sh
./run-baseline.sh
```

### View Results

```bash
# Results are saved in: ./results/baseline_YYYYMMDD_HHMMSS/

# View comprehensive report
cat results/baseline_*/BASELINE_REPORT.md

# View individual benchmarks
cat results/baseline_*/api-benchmark-*.json
cat results/baseline_*/database-benchmark-*.json
```

---

## Benchmark Suite

### 1. API Performance Benchmark

**Purpose**: Measure individual endpoint performance with detailed metrics

**Script**: `scripts/api-benchmark.js`

**What it Measures**:
- Request latency (P50, P95, P99, Max)
- Response size
- Error rate
- Requests per second
- Status code distribution

**Endpoints Tested**:
- Health check (`/healthz`)
- Root endpoint (`/`)
- Database metrics (`/metrics/database`)
- Prometheus metrics (`/metrics`)
- List bookings (various pagination)
- List messages
- Stats queries (7 days, 30 days)
- AI analytics

**Configuration**:
```javascript
{
  iterations: 100,      // Requests per endpoint
  warmupRequests: 10,   // Warmup iterations
}
```

**Expected Duration**: ~5-10 minutes

**Output**: `api-benchmark-TIMESTAMP.json`

### 2. Database Performance Benchmark

**Purpose**: Analyze database query performance and identify slow queries

**Script**: `scripts/database-benchmark.js`

**What it Measures**:
- Query execution time (avg, P50, P95, P99)
- Query execution plans (EXPLAIN ANALYZE)
- Table statistics (row count, size, indexes)
- Index usage statistics
- Slow queries (>100ms)

**Queries Tested**:
- Simple paginated queries
- Filtered queries with WHERE clauses
- Aggregation queries (COUNT, GROUP BY)
- Join queries (conversations with messages)
- Date range queries
- Analytics queries

**Slow Query Threshold**: 100ms

**Expected Duration**: ~2-5 minutes

**Output**: `database-benchmark-TIMESTAMP.json`

### 3. Frontend Performance Audit

**Purpose**: Measure frontend performance with Lighthouse

**Script**: `scripts/frontend-audit.js`

**What it Measures**:
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- Core Web Vitals (LCP, FID/TBT, CLS)
- Load time metrics (FCP, Speed Index, TTI)
- Resource diagnostics (network requests, total bytes, DOM size)
- Optimization opportunities

**Pages Audited**:
- Home
- Dashboard
- Bookings
- Messages
- Analytics

**Expected Duration**: ~10-15 minutes (depends on pages)

**Output**: `frontend-audit-TIMESTAMP.json`

**Requirements**:
```bash
npm install -g lighthouse chrome-launcher
```

### 4. System Resource Monitor

**Purpose**: Monitor system resource usage during baseline

**Script**: `scripts/system-monitor.js`

**What it Measures**:
- CPU usage (system and process)
- Memory usage (system and process)
- Load average
- Process metrics (if available)

**Configuration**:
```javascript
{
  duration: 60,     // seconds
  interval: 1,      // sample interval (seconds)
  processName: 'node'
}
```

**Expected Duration**: 60 seconds

**Output**: `system-monitor-TIMESTAMP.json`

### 5. Load Test (Optional)

**Purpose**: Measure performance under realistic load

**Script**: Runs k6 load tests in quick mode

**What it Measures**:
- API performance under load
- Database performance under concurrent queries
- Webhook processing throughput
- System stability during traffic spike

**Expected Duration**: ~5 minutes (quick mode)

**Output**: Copied to `load-test-results/`

---

## Running Baselines

### Basic Usage

```bash
# Full baseline (prompts for optional tests)
./run-baseline.sh

# Skip frontend audit
./run-baseline.sh --skip-frontend

# Skip load test
./run-baseline.sh --skip-load-test

# Skip both
./run-baseline.sh --skip-frontend --skip-load-test
```

### Individual Benchmarks

```bash
# API benchmark only
node scripts/api-benchmark.js

# Database benchmark only
node scripts/database-benchmark.js

# Frontend audit only
node scripts/frontend-audit.js

# System monitor only
MONITOR_DURATION=120 node scripts/system-monitor.js
```

### Environment Variables

```bash
# API Configuration
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your-admin-token"
export TEST_SALON_ID="test-salon-123"

# Database Configuration
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="whatsapp_saas"
export DB_USER="postgres"
export DB_PASSWORD="postgres"

# Frontend Configuration
export FRONTEND_URL="http://localhost:3000"

# Monitor Configuration
export MONITOR_DURATION="60"
export MONITOR_INTERVAL="1"
export PROCESS_NAME="node"
```

---

## Interpreting Results

### API Performance

**Metrics Explained**:

- **P50 (Median)**: Half of requests are faster than this
  - Target: < 50ms for simple endpoints, < 200ms for complex
  - User Experience: Typical response time

- **P95**: 95% of requests are faster than this
  - Target: < 100ms for simple, < 300ms for complex
  - User Experience: Near worst-case for most users

- **P99**: 99% of requests are faster than this
  - Target: < 200ms for simple, < 500ms for complex
  - User Experience: Worst case for most users

- **Error Rate**: Percentage of failed requests
  - Target: < 1%
  - Critical: > 5% indicates serious issues

**Example Output**:
```json
{
  "endpoint": {
    "name": "List Bookings (Page 1)",
    "method": "GET",
    "path": "/admin/bookings/test-salon-123?page=1&limit=10"
  },
  "latency": {
    "min": 12.34,
    "avg": 45.67,
    "p50": 42.10,
    "p95": 89.23,
    "p99": 123.45,
    "max": 234.56
  },
  "metrics": {
    "requests": 100,
    "errors": 0,
    "errorRate": 0,
    "requestsPerSecond": 15.87
  }
}
```

**What to Look For**:
- ✅ P95 < 200ms: Good performance
- ⚠️ P95 200-500ms: Acceptable but could improve
- ❌ P95 > 500ms: Slow, needs optimization

### Database Performance

**Metrics Explained**:

- **Average Query Time**: Mean execution time
  - Target: < 50ms for simple queries, < 100ms for complex
  - Action: Optimize queries > 100ms

- **Execution Plan**: Shows how PostgreSQL executes the query
  - Look for: Seq Scan (table scan - slow for large tables)
  - Prefer: Index Scan, Bitmap Heap Scan

- **Slow Queries**: Queries taking > 100ms
  - Action: Add indexes, rewrite queries, or cache results

**Example Output**:
```json
{
  "query": {
    "name": "List Bookings with Status Filter"
  },
  "performance": {
    "avg": 23.45,
    "p50": 22.10,
    "p95": 34.56,
    "p99": 45.67
  },
  "executionPlan": {
    "Plan": {
      "Node Type": "Index Scan",
      "Relation Name": "bookings",
      "Index Name": "idx_bookings_salon_status"
    },
    "Planning Time": 0.123,
    "Execution Time": 23.234
  },
  "isSlow": false
}
```

**What to Look For**:
- ✅ Index Scan: Using indexes (fast)
- ⚠️ Bitmap Heap Scan: Okay for moderate data
- ❌ Seq Scan on large tables: Missing index (slow)

**Common Issues**:
1. **Seq Scan**: Add index on filtered columns
2. **High Planning Time**: Too many indexes or complex query
3. **High Execution Time**: Optimize query logic or add caching

### Frontend Performance

**Core Web Vitals**:

1. **LCP (Largest Contentful Paint)**
   - Measures: Loading performance
   - Good: < 2.5s
   - Needs Improvement: 2.5s - 4s
   - Poor: > 4s

2. **FID (First Input Delay)** - Proxy: TBT
   - Measures: Interactivity
   - Good: < 100ms (TBT)
   - Needs Improvement: 100ms - 300ms
   - Poor: > 300ms

3. **CLS (Cumulative Layout Shift)**
   - Measures: Visual stability
   - Good: < 0.1
   - Needs Improvement: 0.1 - 0.25
   - Poor: > 0.25

**Lighthouse Scores**:
- 90-100: Excellent
- 50-89: Needs improvement
- 0-49: Poor

**Example Output**:
```json
{
  "page": { "name": "Dashboard" },
  "scores": {
    "performance": 85,
    "accessibility": 92,
    "bestPractices": 87,
    "seo": 90
  },
  "metrics": {
    "firstContentfulPaint": 1234,
    "largestContentfulPaint": 2345,
    "totalBlockingTime": 123,
    "cumulativeLayoutShift": 0.05
  },
  "coreWebVitals": {
    "lcp": { "value": 2345, "rating": "good" },
    "fid": { "value": 123, "rating": "good" },
    "cls": { "value": 0.05, "rating": "good" }
  }
}
```

**Common Opportunities**:
- Eliminate render-blocking resources
- Properly size images
- Enable text compression
- Reduce unused JavaScript
- Serve images in next-gen formats

### System Resources

**Metrics Explained**:

- **CPU Usage**: Percentage of CPU capacity used
  - Healthy: < 50% average
  - Warning: 50-80%
  - Critical: > 80% sustained

- **Memory Usage**: Percentage of RAM used
  - Healthy: < 70%
  - Warning: 70-85%
  - Critical: > 85% (risk of swapping)

- **Load Average**: Number of processes waiting for CPU
  - Healthy: < number of CPU cores
  - Warning: 1-2x CPU cores
  - Critical: > 2x CPU cores

**Example Output**:
```json
{
  "stats": {
    "cpu": {
      "avg": 23.45,
      "min": 12.34,
      "max": 45.67,
      "p95": 42.10
    },
    "memory": {
      "avg": 67.89,
      "min": 65.43,
      "max": 72.10,
      "p95": 71.23
    },
    "loadAverage": {
      "avg": 1.23,
      "min": 0.89,
      "max": 2.34
    }
  }
}
```

**What to Look For**:
- CPU spikes: Inefficient algorithms or blocking operations
- Memory growth: Memory leaks or unbounded caching
- High load average: Need more CPU cores or optimization

---

## Performance Targets

### Development Environment

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| API P95 Latency | < 100ms | < 200ms | > 200ms |
| API P99 Latency | < 200ms | < 500ms | > 500ms |
| API Error Rate | < 0.1% | < 1% | > 1% |
| Database Avg Query | < 30ms | < 100ms | > 100ms |
| Database Slow Queries | 0 | 1-2 | > 2 |
| Frontend Performance Score | > 90 | > 70 | < 70 |
| LCP | < 2s | < 3s | > 3s |
| TBT | < 100ms | < 200ms | > 200ms |
| CLS | < 0.1 | < 0.2 | > 0.2 |
| CPU Usage (avg) | < 30% | < 50% | > 50% |
| Memory Usage (avg) | < 50% | < 70% | > 70% |

### Production Environment

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| API P95 Latency | < 50ms | < 150ms | > 150ms |
| API P99 Latency | < 100ms | < 300ms | > 300ms |
| API Error Rate | < 0.01% | < 0.5% | > 0.5% |
| Database Avg Query | < 20ms | < 50ms | > 50ms |
| Database Slow Queries | 0 | 0 | > 0 |
| Frontend Performance Score | > 95 | > 85 | < 85 |
| LCP | < 1.5s | < 2.5s | > 2.5s |
| TBT | < 50ms | < 100ms | > 100ms |
| CLS | < 0.05 | < 0.1 | > 0.1 |
| CPU Usage (avg) | < 50% | < 70% | > 70% |
| Memory Usage (avg) | < 60% | < 75% | > 75% |

---

## Optimization Workflow

### 1. Establish Baseline

```bash
# Run before making ANY optimizations
./run-baseline.sh

# Results saved to: results/baseline_BEFORE/
```

### 2. Analyze Results

```bash
# Review comprehensive report
cat results/baseline_BEFORE/BASELINE_REPORT.md

# Identify bottlenecks:
# - Slow API endpoints
# - Slow database queries
# - Poor Core Web Vitals
# - High resource usage
```

### 3. Prioritize Optimizations

**Framework**: Impact × Effort

High Impact, Low Effort (Do First):
- Add missing database indexes
- Enable caching for repeated queries
- Optimize images (compression, next-gen formats)
- Remove unused JavaScript

High Impact, High Effort (Do Second):
- Refactor complex algorithms
- Implement query result caching (Redis)
- Code splitting and lazy loading
- Database query optimization

Low Impact (Do Last):
- Micro-optimizations
- Cosmetic improvements

### 4. Implement Optimizations

Focus on one optimization at a time to measure impact.

**Example**: Adding Database Index

```sql
-- Before (Slow)
-- Query: List Bookings with Status Filter
-- Execution Time: 234ms (Seq Scan)

-- Add index
CREATE INDEX idx_bookings_salon_status
ON bookings(salon_id, status, appointment_date DESC);

-- After
-- Execution Time: 12ms (Index Scan)
-- Improvement: 95% faster
```

### 5. Re-run Baseline

```bash
# Run after each significant optimization
./run-baseline.sh

# Results saved to: results/baseline_AFTER/
```

### 6. Compare Baselines

```bash
# Compare before and after
node analysis/compare-baselines.js \
  results/baseline_BEFORE \
  results/baseline_AFTER

# Output shows:
# - Performance improvements
# - Performance regressions
# - Overall verdict
```

### 7. Document and Iterate

```bash
# Document what you optimized and results
echo "## Optimization: Add Database Indexes

### Changes:
- Added idx_bookings_salon_status
- Added idx_messages_salon_created

### Results:
- Database avg query time: 234ms → 45ms (81% improvement)
- Slow queries: 5 → 0
- API P95 latency: 456ms → 123ms (73% improvement)

### Baseline: results/baseline_AFTER/
" >> OPTIMIZATIONS.md
```

---

## Best Practices

### When to Run Baselines

**Required**:
- ✅ Before starting optimization work
- ✅ After completing optimizations
- ✅ Before major releases
- ✅ After infrastructure changes

**Recommended**:
- 📅 Weekly (track trends)
- 📅 After dependency updates
- 📅 After database migrations
- 📅 When users report slowness

**Avoid**:
- ❌ During active development (results unstable)
- ❌ On systems with other heavy load
- ❌ Without proper test data

### Baseline Environment

**Consistency is Key**:

1. **Same Machine**: Always baseline on the same environment
   - Development: Your laptop (consistent state)
   - Staging: Dedicated staging server
   - Production: Use monitoring data (don't load test prod)

2. **Same Data**: Use consistent test data
   - Seed database with realistic data
   - ~10,000 bookings, ~50,000 messages minimum
   - Maintain data between baselines

3. **Same Load**: Minimize external factors
   - Close other applications
   - Disable background processes
   - Ensure stable network connection

4. **Warm Up**: Always warm up before measuring
   - Already done automatically in scripts
   - JIT compilation stabilizes
   - Caches populate

### Interpreting Changes

**Statistical Significance**:

- Changes < 5%: Likely noise
- Changes 5-10%: Minor improvement/regression
- Changes 10-25%: Significant change
- Changes > 25%: Major improvement/regression

**Multiple Metrics**:

Don't optimize one metric at the expense of others:
- ✅ Reduced P95 latency without increasing errors
- ❌ Reduced P95 latency but doubled CPU usage
- ❌ Faster queries but higher error rate

**Real-World Impact**:

Focus on user-facing metrics:
- P50/P95/P99 latency > Average latency
- Core Web Vitals > Lighthouse score
- Error rate > Request count

### Common Pitfalls

**1. Testing Without Warm-up**
```bash
# ❌ Wrong: Cold start skews results
node scripts/api-benchmark.js

# ✅ Correct: Scripts include warm-up automatically
# (warmupRequests: 10 in configuration)
```

**2. Inconsistent Test Data**
```bash
# ❌ Wrong: Empty database
./run-baseline.sh  # Fast but unrealistic

# ✅ Correct: Seed realistic data first
npm run seed-test-data
./run-baseline.sh
```

**3. Comparing Different Environments**
```bash
# ❌ Wrong: Compare dev laptop to staging server
./run-baseline.sh  # On laptop
# ... optimize ...
./run-baseline.sh  # On staging server
# Results incomparable!

# ✅ Correct: Same environment
./run-baseline.sh  # On laptop (before)
# ... optimize ...
./run-baseline.sh  # On laptop (after)
```

**4. Optimizing Without Measuring**
```bash
# ❌ Wrong: "I think adding this index will help"
CREATE INDEX ...
# (No proof it helped)

# ✅ Correct: Measure, optimize, measure again
./run-baseline.sh  # Before
CREATE INDEX ...
./run-baseline.sh  # After
node analysis/compare-baselines.js  # Verify
```

---

## Advanced Usage

### Custom Baseline Configurations

Edit `scripts/*.js` to customize:

```javascript
// api-benchmark.js
const config = {
  iterations: 200,  // More samples for precision
  warmupRequests: 20,  // Longer warm-up
};

// database-benchmark.js
const config = {
  slowQueryThreshold: 50,  // Stricter threshold
};

// system-monitor.js
const config = {
  duration: 300,  // 5 minute monitoring
  interval: 5,  // Sample every 5 seconds
};
```

### CI/CD Integration

```yaml
# .github/workflows/performance-baseline.yml
name: Performance Baseline

on:
  pull_request:
    branches: [main]

jobs:
  baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start services
        run: docker-compose up -d

      - name: Seed test data
        run: npm run seed-test-data

      - name: Run baseline
        run: |
          cd performance-baseline
          ./run-baseline.sh --skip-frontend --skip-load-test

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: baseline-results
          path: performance-baseline/results/
```

### Baseline Tracking Over Time

```bash
# Create baseline archive
mkdir -p baseline-history
cp -r results/baseline_* baseline-history/

# Track in git (just reports, not raw data)
git add baseline-history/*/BASELINE_REPORT.md
git commit -m "Add baseline: $(date +%Y-%m-%d)"

# Compare current to last week
LAST_WEEK=$(ls baseline-history/ | tail -n 2 | head -n 1)
CURRENT=$(ls results/ | tail -n 1)

node analysis/compare-baselines.js \
  baseline-history/$LAST_WEEK \
  results/$CURRENT
```

---

## Support

For issues or questions:

1. Review baseline results in `./results/`
2. Check [Troubleshooting](#troubleshooting) section
3. Compare with performance targets
4. Review optimization recommendations in report

---

**Last Updated**: 2025-01-18

**Baseline Suite Version**: 1.0.0
