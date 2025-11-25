# Performance Testing Quick Start Guide

## Overview

This guide provides step-by-step instructions for running all performance tests on the WhatsApp SaaS platform.

---

## Prerequisites

### Install Required Tools

#### 1. k6 (Load Testing)

**Windows**:
```powershell
choco install k6
```

**macOS**:
```bash
brew install k6
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### 2. Lighthouse & Chrome Launcher (Frontend Testing)

```bash
cd Frontend
npm install -D lighthouse chrome-launcher
```

#### 3. webpack-bundle-analyzer (Bundle Analysis)

```bash
cd Frontend
npm install -D webpack-bundle-analyzer
```

---

## Quick Performance Test Suite

### Run All Tests (Recommended)

```bash
# From project root
cd Backend && npm run start:prod &
sleep 30
cd ../Frontend && npm run build
npm run lighthouse
cd ../Backend && k6 run load-tests/k6-dashboard-test.js
```

---

## Individual Test Commands

### 1. Backend Load Testing

**Purpose**: Test API performance under load

**Location**: `C:\whatsapp-saas-starter\Backend`

**Commands**:

```bash
cd Backend

# Start backend
npm run start:prod

# In another terminal, run load test
k6 run load-tests/k6-dashboard-test.js

# Or with custom API URL
k6 run -e API_URL=http://localhost:3000 load-tests/k6-dashboard-test.js
```

**Test Scenarios**:

```bash
# Smoke test (quick health check)
k6 run --stage 30s:5,1m:5,30s:0 load-tests/k6-dashboard-test.js

# Load test (normal traffic)
k6 run --stage 2m:50,10m:50,2m:0 load-tests/k6-dashboard-test.js

# Stress test (find breaking point)
k6 run --stage 5m:100,5m:200,5m:300,5m:400,5m:500,5m:0 load-tests/k6-dashboard-test.js

# Spike test (sudden traffic surge)
k6 run --stage 1m:10,0s:300,5m:300,2m:0 load-tests/k6-dashboard-test.js

# Soak test (long duration)
k6 run --stage 5m:100,2h:100,5m:0 load-tests/k6-dashboard-test.js
```

**Expected Output**:
```
✓ dashboard stats status is 200
✓ dashboard stats response time < 200ms
✓ errors........................: 0.00%
✓ cache_hits....................: 75.00%
✓ compression_enabled...........: 98.00%

http_req_duration..............: avg=85ms  p(95)=150ms  p(99)=280ms
```

---

### 2. Frontend Lighthouse Testing

**Purpose**: Measure Core Web Vitals and performance scores

**Location**: `C:\whatsapp-saas-starter\Frontend`

**Commands**:

```bash
cd Frontend

# Build production bundle
npm run build

# Run Lighthouse tests
npm run lighthouse

# Or combined
npm run perf:test
```

**Expected Output**:
```
📊 Testing: Dashboard (http://localhost:3001/dashboard)

Desktop Scores:
  performance: ✅ 92
  accessibility: ✅ 95
  best-practices: ✅ 100
  seo: ✅ 100
  pwa: ✅ 85

Core Web Vitals (Desktop):
  FCP: 800ms
  LCP: 1100ms
  TBT: 150ms
  CLS: 0.03
```

**Reports Location**: `Frontend/lighthouse-reports/`

---

### 3. Bundle Size Analysis

**Purpose**: Analyze JavaScript bundle composition and size

**Location**: `C:\whatsapp-saas-starter\Frontend`

**Commands**:

```bash
cd Frontend

# Build with analyzer
npm run build:analyze

# Opens interactive bundle analyzer in browser
```

**What to Look For**:
- Total bundle size < 500KB
- Framework chunk < 200KB
- No duplicate dependencies
- Vendor chunk properly split

---

### 4. Database Query Performance

**Purpose**: Monitor database query performance

**Location**: `C:\whatsapp-saas-starter\Backend`

**Enable Query Logging**:

In `.env`:
```env
DATABASE_ENABLE_LOGGING=true
```

**Commands**:

```bash
cd Backend
npm run start:dev

# In logs, look for query times:
# prisma:query SELECT ... [15ms]
```

**Check for**:
- Queries > 50ms (needs optimization)
- N+1 query patterns
- Missing indexes

---

## Performance Monitoring

### Real-Time Monitoring During Tests

#### Backend Monitoring

**Monitor Server Resources**:
```bash
# CPU and Memory
top -p $(pgrep -f "node.*nest")

# Or use htop
htop -p $(pgrep -f "node.*nest")
```

**Monitor Database**:
```bash
# PostgreSQL connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql -U postgres -c "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
```

**Monitor Logs**:
```bash
cd Backend
tail -f logs/app.log
```

#### Frontend Monitoring

**Chrome DevTools**:
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Enable "Disable cache"
4. Throttle to "Slow 3G" or "Fast 3G"
5. Record performance profile

**React Query DevTools**:
- Open DevTools at bottom of page
- Monitor cache hits/misses
- Check stale time behavior

---

## Performance Benchmarks

### Backend Performance Targets

| Metric | Target | Alert |
|--------|--------|-------|
| Dashboard Stats API | < 200ms p95 | > 300ms |
| List Bookings API | < 300ms p95 | > 400ms |
| Database Queries | < 50ms | > 100ms |
| Error Rate | < 1% | > 2% |
| Cache Hit Rate | > 60% | < 50% |

### Frontend Performance Targets

| Metric | Target | Alert |
|--------|--------|-------|
| LCP | < 2.5s | > 4.0s |
| FID | < 100ms | > 300ms |
| CLS | < 0.1 | > 0.25 |
| FCP | < 1.8s | > 3.0s |
| TTFB | < 600ms | > 1500ms |
| Bundle Size | < 500KB | > 600KB |

---

## Automated Testing in CI/CD

### GitHub Actions Example

Create `.github/workflows/performance-test.yml`:

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: Backend/package-lock.json

      - name: Install Backend Dependencies
        run: |
          cd Backend
          npm ci

      - name: Run Database Migrations
        run: |
          cd Backend
          npx prisma migrate deploy

      - name: Start Backend
        run: |
          cd Backend
          npm run start:prod &
          sleep 30

      - name: Install k6
        run: |
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Tests
        run: |
          cd Backend
          k6 run --quiet load-tests/k6-dashboard-test.js

      - name: Upload k6 Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: Backend/load-tests/results/

  lighthouse-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: Frontend/package-lock.json

      - name: Install Frontend Dependencies
        run: |
          cd Frontend
          npm ci

      - name: Build Frontend
        run: |
          cd Frontend
          npm run build

      - name: Start Frontend
        run: |
          cd Frontend
          npm start &
          sleep 30

      - name: Run Lighthouse Tests
        run: |
          cd Frontend
          npm run lighthouse

      - name: Upload Lighthouse Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: Frontend/lighthouse-reports/

      - name: Check Performance Budget
        run: |
          cd Frontend
          node scripts/check-performance-budget.js
```

---

## Troubleshooting

### High Error Rate in Load Tests

**Problem**: Error rate > 1%

**Possible Causes**:
- Database connection pool exhausted
- Rate limiting triggered
- Authentication issues
- Memory exhaustion

**Solutions**:
1. Increase connection pool size in `prisma.service.ts`
2. Adjust rate limiting rules
3. Verify test user credentials exist
4. Increase server memory allocation

### Slow Response Times

**Problem**: p95 > 500ms

**Possible Causes**:
- Database queries not optimized
- Cache not working
- Insufficient server resources
- Network latency

**Solutions**:
1. Enable Prisma query logging
2. Verify cache hit rate > 60%
3. Scale up server resources
4. Check network configuration
5. Review slow query logs

### Low Cache Hit Rate

**Problem**: Cache hit rate < 50%

**Possible Causes**:
- Cache not enabled on endpoints
- Cache TTL too short
- Cache invalidation too aggressive
- Different query parameters

**Solutions**:
1. Verify `@UseInterceptors(CacheInterceptor)` is applied
2. Check cache service configuration
3. Review cache invalidation logic
4. Normalize query parameters

### Lighthouse Scores Too Low

**Problem**: Performance score < 85

**Possible Causes**:
- Large bundle size
- Unoptimized images
- Slow server response
- Render-blocking resources

**Solutions**:
1. Run bundle analyzer: `npm run build:analyze`
2. Optimize images (WebP/AVIF)
3. Enable compression
4. Review code splitting
5. Check for unused dependencies

---

## Performance Checklist

### Before Release

- [ ] Run full load test suite
- [ ] Run Lighthouse audits (all pages)
- [ ] Analyze bundle size
- [ ] Check database query performance
- [ ] Verify cache hit rate > 60%
- [ ] Test on slow 3G network
- [ ] Test on real mobile devices
- [ ] Profile memory usage
- [ ] Check for memory leaks
- [ ] Verify error rates < 1%
- [ ] Test with production-like data
- [ ] Monitor resource usage under load

### After Release

- [ ] Monitor Web Vitals in production
- [ ] Track API response times
- [ ] Monitor error rates
- [ ] Check cache effectiveness
- [ ] Review slow query logs
- [ ] Monitor resource utilization
- [ ] Set up alerts for regressions

---

## Continuous Monitoring

### Set Up Monitoring Dashboard

**Recommended Tools**:
- **Prometheus + Grafana** (open source)
- **DataDog** (commercial)
- **New Relic** (commercial)
- **Vercel Analytics** (for Next.js)

**Key Metrics to Monitor**:
1. API response times (p50, p95, p99)
2. Core Web Vitals (LCP, FID, CLS)
3. Error rates
4. Cache hit rates
5. Database query times
6. Server resource usage

### Alert Configuration

**Critical Alerts**:
- API p95 > 500ms
- Error rate > 1%
- LCP > 4.0s
- Database connection pool exhausted

**Warning Alerts**:
- API p95 > 300ms
- Cache hit rate < 50%
- LCP > 2.5s
- Memory usage > 80%

---

## Resources

- **Performance Optimizations**: `PERFORMANCE_OPTIMIZATIONS.md`
- **Performance Budget**: `PERFORMANCE_BUDGET.md`
- **Performance Summary**: `PERFORMANCE_SUMMARY.md`
- **Load Testing Guide**: `Backend/load-tests/README.md`

**External Resources**:
- [k6 Documentation](https://k6.io/docs/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

## Quick Commands Reference

```bash
# Backend Load Test
cd Backend && k6 run load-tests/k6-dashboard-test.js

# Frontend Lighthouse Test
cd Frontend && npm run lighthouse

# Bundle Analysis
cd Frontend && npm run build:analyze

# Combined Performance Test
cd Frontend && npm run perf:test

# Monitor Backend Logs
cd Backend && tail -f logs/app.log

# Database Query Logging
# Set DATABASE_ENABLE_LOGGING=true in .env
cd Backend && npm run start:dev
```

---

**Last Updated**: 2025-10-23
**Version**: 1.0
