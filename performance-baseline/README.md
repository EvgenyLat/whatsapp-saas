# Performance Baseline Suite

Comprehensive performance benchmarking and baseline establishment for the WhatsApp SaaS platform.

## Quick Start

```bash
# 1. Set environment variables
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your-admin-token"
export TEST_SALON_ID="test-salon-123"
export DB_HOST="localhost"
export DB_PASSWORD="postgres"

# 2. Run complete baseline
chmod +x run-baseline.sh
./run-baseline.sh

# 3. View results
cat results/baseline_*/BASELINE_REPORT.md
```

## What Gets Measured

| Benchmark | Metrics | Duration |
|-----------|---------|----------|
| **API Performance** | Latency (P50, P95, P99), Error Rate, Response Size | ~5-10 min |
| **Database Performance** | Query Time, Execution Plans, Slow Queries, Index Usage | ~2-5 min |
| **Frontend Performance** | Core Web Vitals, Lighthouse Scores, Load Times | ~10-15 min |
| **System Resources** | CPU, Memory, Load Average, Process Metrics | 60 seconds |
| **Load Test** (optional) | Performance under load, Concurrent capacity | ~5 min |

## Performance Targets

### Development

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| API P95 | < 100ms | < 200ms | > 200ms |
| Database Avg | < 30ms | < 100ms | > 100ms |
| LCP | < 2s | < 3s | > 3s |
| CPU (avg) | < 30% | < 50% | > 50% |

### Production

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| API P95 | < 50ms | < 150ms | > 150ms |
| Database Avg | < 20ms | < 50ms | > 50ms |
| LCP | < 1.5s | < 2.5s | > 2.5s |
| CPU (avg) | < 50% | < 70% | > 70% |

## Directory Structure

```
performance-baseline/
├── scripts/                  # Benchmark scripts
│   ├── api-benchmark.js      # API endpoint benchmarking
│   ├── database-benchmark.js # Database query analysis
│   ├── frontend-audit.js     # Lighthouse audits
│   └── system-monitor.js     # Resource monitoring
├── analysis/                 # Analysis tools
│   ├── generate-report.js    # Report generator
│   └── compare-baselines.js  # Baseline comparison
├── results/                  # Benchmark results (generated)
│   └── baseline_TIMESTAMP/
│       ├── BASELINE_REPORT.md
│       ├── api-benchmark-*.json
│       ├── database-benchmark-*.json
│       ├── frontend-audit-*.json
│       └── system-monitor-*.json
├── run-baseline.sh           # Main baseline runner
└── BASELINE_PERFORMANCE_REPORT.md  # Complete documentation
```

## Usage

### Run Complete Baseline

```bash
# Full baseline with all tests
./run-baseline.sh

# Skip frontend audit (if Lighthouse not installed)
./run-baseline.sh --skip-frontend

# Skip load test (faster baseline)
./run-baseline.sh --skip-load-test

# Skip both
./run-baseline.sh --skip-frontend --skip-load-test
```

### Run Individual Benchmarks

```bash
# API performance only
node scripts/api-benchmark.js

# Database queries only
node scripts/database-benchmark.js

# Frontend audit only (requires Lighthouse)
node scripts/frontend-audit.js

# System monitoring only
MONITOR_DURATION=120 node scripts/system-monitor.js
```

### Compare Baselines

```bash
# Run baseline before optimization
./run-baseline.sh
# Results: results/baseline_20250118_100000/

# ... make optimizations ...

# Run baseline after optimization
./run-baseline.sh
# Results: results/baseline_20250118_120000/

# Compare
node analysis/compare-baselines.js \
  results/baseline_20250118_100000 \
  results/baseline_20250118_120000
```

## Example Output

```
═══════════════════════════════════════════════════════════
PERFORMANCE BASELINE
═══════════════════════════════════════════════════════════

✓ Backend is running at http://localhost:4000
✓ Database is accessible
✓ Created results directory: ./results/baseline_20250118_143000

▶ 1. API Performance Benchmark
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benchmarking: Health Check
  GET /healthz
  Results:
    Requests: 100
    Errors: 0 (0.00%)
    RPS: 142.86
    Latency:
      Min: 5.23ms
      Avg: 7.89ms
      P50: 7.45ms
      P95: 12.34ms
      P99: 15.67ms
      Max: 18.90ms

...

═══════════════════════════════════════════════════════════
BASELINE COMPLETE
═══════════════════════════════════════════════════════════

Results saved to: ./results/baseline_20250118_143000

Next steps:
  1. Review baseline results
  2. Identify optimization opportunities
  3. Implement performance improvements
  4. Re-run baseline: ./run-baseline.sh
  5. Compare results: node analysis/compare-baselines.js ...

✓ Performance baseline established successfully!
```

## Optimization Workflow

### 1. Establish Baseline

```bash
./run-baseline.sh
# Results: baseline_BEFORE/
```

### 2. Review Results

```bash
cat results/baseline_BEFORE/BASELINE_REPORT.md
```

Identify:
- Slow API endpoints (P95 > 200ms)
- Slow database queries (> 100ms)
- Poor Core Web Vitals
- High resource usage

### 3. Implement Optimizations

Example: Add database index

```sql
-- Identified slow query:
-- "List Bookings with Status Filter": 234ms

-- Add index
CREATE INDEX idx_bookings_salon_status
ON bookings(salon_id, status, appointment_date DESC);

-- Expected improvement: ~95% faster
```

### 4. Re-run Baseline

```bash
./run-baseline.sh
# Results: baseline_AFTER/
```

### 5. Compare and Verify

```bash
node analysis/compare-baselines.js \
  results/baseline_BEFORE \
  results/baseline_AFTER

# Output:
# ✓ Database avg query time: 234ms → 12ms (95% improvement)
# ✓ API P95 latency: 456ms → 89ms (81% improvement)
```

## Environment Variables

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
export MONITOR_DURATION="60"     # seconds
export MONITOR_INTERVAL="1"      # seconds
export PROCESS_NAME="node"
```

## Prerequisites

### Required

- Node.js 16+
- Running backend server
- Database with test data

### Optional

```bash
# For frontend audits
npm install -g lighthouse chrome-launcher

# For load tests
brew install k6  # or: choco install k6

# For database benchmarks
brew install postgresql  # or: choco install postgresql
```

## Troubleshooting

### Backend Not Running

```
Error: Backend is not running at http://localhost:4000
```

**Solution**:
```bash
cd Backend
npm start
```

### Database Not Accessible

```
Error: Database is not accessible
```

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U postgres -d whatsapp_saas -c "SELECT 1"
```

### Lighthouse Not Installed

```
Error: lighthouse and chrome-launcher are required
```

**Solution**:
```bash
npm install -g lighthouse chrome-launcher

# Or skip frontend audit
./run-baseline.sh --skip-frontend
```

### No Test Data

For realistic baselines, seed test data:

```bash
# Recommended minimum:
# - 10,000+ bookings
# - 50,000+ messages
# - 100+ conversations

npm run seed-test-data
```

## Best Practices

### When to Run

✅ **Do Run Baselines**:
- Before starting optimization work
- After completing optimizations
- Before major releases
- Weekly (track trends)

❌ **Don't Run Baselines**:
- During active development
- On systems with other heavy load
- Without proper test data

### Consistency

**Same Environment**:
- Always use same machine
- Same database state
- Minimal external load

**Same Data**:
- Consistent test data set
- ~10,000 bookings minimum
- ~50,000 messages minimum

**Warm Up**:
- Scripts include automatic warm-up
- JIT compilation stabilizes
- Caches populate

### Interpreting Changes

- < 5%: Likely noise
- 5-10%: Minor change
- 10-25%: Significant change
- > 25%: Major change

**Focus on**:
- P95/P99 over average
- Core Web Vitals over scores
- Error rate over throughput

## Documentation

See [BASELINE_PERFORMANCE_REPORT.md](./BASELINE_PERFORMANCE_REPORT.md) for:
- Detailed benchmark descriptions
- Performance target explanations
- Comprehensive optimization workflow
- Advanced usage and best practices

## Support

For issues:
1. Review [BASELINE_PERFORMANCE_REPORT.md](./BASELINE_PERFORMANCE_REPORT.md)
2. Check individual benchmark results in `./results/`
3. Verify environment configuration
4. Ensure backend and database are running
