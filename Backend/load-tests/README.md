# Load Testing Guide

This directory contains load testing scripts for the WhatsApp SaaS platform.

## Prerequisites

### Install k6

**macOS**:
```bash
brew install k6
```

**Windows**:
```bash
choco install k6
# or download from https://k6.io/docs/getting-started/installation
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Available Tests

### 1. Dashboard Stats Test (`k6-dashboard-test.js`)

Tests the most critical endpoint: dashboard statistics.

**What it tests**:
- Dashboard stats endpoint (`/api/v1/analytics/dashboard`)
- Bookings list endpoint
- Messages list endpoint
- Response compression
- Cache hit rate
- Error rate

**Load Profile**:
- Ramp-up: 0 → 50 users (2 min)
- Sustained: 50 users (5 min)
- Peak: 50 → 200 users (2 min)
- Sustained peak: 200 users (5 min)
- Ramp-down: 200 → 0 users (2 min)

**Performance Thresholds**:
- p95 response time: < 200ms
- p99 response time: < 500ms
- Error rate: < 1%
- Cache hit rate: > 50%
- Compression rate: > 95%

## Running Load Tests

### 1. Prepare Test Environment

**Start the backend**:
```bash
cd Backend
npm run start:dev
```

**Create test users** (if not already exists):
```bash
# Use Prisma Studio or seed script
npm run prisma:seed
```

### 2. Run the Load Test

**Basic run**:
```bash
cd Backend
k6 run load-tests/k6-dashboard-test.js
```

**With custom API URL**:
```bash
k6 run -e API_URL=http://localhost:3000 load-tests/k6-dashboard-test.js
```

**With specific duration**:
```bash
# Quick smoke test (30 users for 2 minutes)
k6 run --stage 30s:30,1m30s:30,30s:0 load-tests/k6-dashboard-test.js
```

**With cloud results** (requires k6 account):
```bash
k6 run --out cloud load-tests/k6-dashboard-test.js
```

### 3. Analyze Results

**Terminal Output**:
k6 provides a summary at the end including:
- Request rate (req/s)
- Response time (min, avg, p95, p99, max)
- Error rate
- Custom metrics (cache hit rate, compression rate)

**Example Output**:
```
     ✓ dashboard stats status is 200
     ✓ dashboard stats has data
     ✓ dashboard stats response time < 200ms
     ✓ dashboard stats response time < 500ms

     checks.........................: 100.00% ✓ 12000      ✗ 0
     data_received..................: 48 MB   160 kB/s
     data_sent......................: 1.2 MB  4.0 kB/s
     http_req_blocked...............: avg=1.2ms    min=0s      med=0s      max=50ms
     http_req_connecting............: avg=800µs    min=0s      med=0s      max=30ms
     http_req_duration..............: avg=85ms     min=10ms    med=75ms    max=450ms
       { name:dashboard_stats }.....: avg=65ms     min=10ms    med=55ms    max=200ms ✓
     http_req_failed................: 0.00%   ✓ 0          ✗ 12000
     http_req_receiving.............: avg=500µs    min=100µs   med=400µs   max=5ms
     http_req_sending...............: avg=200µs    min=50µs    med=150µs   max=2ms
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s
     http_req_waiting...............: avg=84ms     min=9ms     med=74ms    max=448ms
     http_reqs......................: 12000   40/s
     iteration_duration.............: avg=2.5s     min=2s      med=2.4s    max=3.5s
     iterations.....................: 3000    10/s

     ✓ errors........................: 0.00%   ✓ 0          ✗ 12000
     ✓ cache_hits....................: 75.00%  ✓ 9000       ✗ 3000
     ✓ compression_enabled...........: 98.00%  ✓ 11760      ✗ 240

running (05m00.0s), 000/200 VUs, 3000 complete and 0 interrupted iterations
```

## Performance Targets

### Response Time Targets

| Endpoint | p50 | p95 | p99 | Status |
|----------|-----|-----|-----|--------|
| Dashboard Stats | < 50ms | < 200ms | < 500ms | ✅ |
| List Bookings | < 100ms | < 300ms | < 600ms | ✅ |
| List Messages | < 100ms | < 300ms | < 600ms | ✅ |
| Send Message | < 150ms | < 400ms | < 800ms | ✅ |

### Throughput Targets

| Load Level | Concurrent Users | Expected RPS | Expected p95 |
|------------|------------------|--------------|--------------|
| Low | 10-50 | 10-50 req/s | < 150ms |
| Normal | 50-100 | 50-100 req/s | < 200ms |
| High | 100-200 | 100-200 req/s | < 300ms |
| Peak | 200-500 | 200-500 req/s | < 500ms |

### Error Rate Targets

- **Success Rate**: > 99% (< 1% errors)
- **Timeout Rate**: < 0.1%
- **5xx Errors**: < 0.5%
- **4xx Errors**: < 2%

## Test Scenarios

### 1. Smoke Test (Quick Health Check)

**Purpose**: Verify system works under minimal load

**Profile**: 5 users for 2 minutes

```bash
k6 run --stage 30s:5,1m:5,30s:0 load-tests/k6-dashboard-test.js
```

### 2. Load Test (Normal Traffic)

**Purpose**: Test system under expected load

**Profile**: 50 users for 10 minutes

```bash
k6 run --stage 2m:50,10m:50,2m:0 load-tests/k6-dashboard-test.js
```

### 3. Stress Test (Find Breaking Point)

**Purpose**: Find the maximum capacity

**Profile**: Gradually increase to 500 users

```bash
k6 run --stage 5m:100,5m:200,5m:300,5m:400,5m:500,5m:0 load-tests/k6-dashboard-test.js
```

### 4. Spike Test (Sudden Traffic Surge)

**Purpose**: Test system resilience to sudden spikes

**Profile**: Sudden jump from 10 to 300 users

```bash
k6 run --stage 1m:10,0s:300,5m:300,2m:0 load-tests/k6-dashboard-test.js
```

### 5. Soak Test (Long Duration)

**Purpose**: Find memory leaks and degradation over time

**Profile**: 100 users for 2 hours

```bash
k6 run --stage 5m:100,2h:100,5m:0 load-tests/k6-dashboard-test.js
```

## Monitoring During Load Tests

### 1. Backend Monitoring

**Check logs**:
```bash
cd Backend
tail -f logs/app.log
```

**Monitor resource usage**:
```bash
# CPU and Memory
top -p $(pgrep -f "node.*nest")

# Or use htop
htop -p $(pgrep -f "node.*nest")
```

### 2. Database Monitoring

**PostgreSQL**:
```bash
# Connection count
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql -U postgres -c "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
```

**SQLite**:
```bash
# Check database size
ls -lh prisma/dev.db
```

### 3. System Monitoring

**Linux/macOS**:
```bash
# Network I/O
iftop

# Disk I/O
iotop

# System overview
glances
```

## Troubleshooting

### High Error Rate

**Symptoms**: > 1% error rate

**Possible Causes**:
- Database connection pool exhausted
- Rate limiting triggered
- Authentication issues
- Memory exhaustion

**Solutions**:
1. Increase connection pool size in Prisma
2. Adjust rate limiting rules
3. Check test user credentials
4. Increase server memory

### Slow Response Times

**Symptoms**: p95 > 500ms

**Possible Causes**:
- Database queries not optimized
- Cache not working
- Insufficient server resources
- Network latency

**Solutions**:
1. Enable Prisma query logging
2. Verify cache hit rate
3. Scale up server resources
4. Check network configuration

### Cache Not Working

**Symptoms**: Cache hit rate < 50%

**Possible Causes**:
- Cache not enabled
- Cache TTL too short
- Cache invalidation too aggressive

**Solutions**:
1. Verify CacheInterceptor is applied
2. Check cache service configuration
3. Review cache invalidation logic

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd Backend
          npm ci

      - name: Start backend
        run: |
          cd Backend
          npm run start:prod &
          sleep 30

      - name: Install k6
        run: |
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: |
          cd Backend
          k6 run --quiet load-tests/k6-dashboard-test.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: Backend/load-tests/results/
```

## Best Practices

1. **Warm-up Period**: Always include a ramp-up period to warm up caches
2. **Realistic Data**: Use production-like data volumes
3. **Think Time**: Add sleep() between requests to simulate real users
4. **Multiple Scenarios**: Test different user journeys
5. **Regular Testing**: Run load tests before major releases
6. **Monitor Everything**: Track backend metrics during tests
7. **Baseline First**: Establish baseline before optimizations
8. **Document Results**: Keep history of test results

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)

## Next Steps

After running load tests:

1. ✅ Verify all performance targets are met
2. ✅ Identify bottlenecks from test results
3. ✅ Optimize based on findings
4. ✅ Re-run tests to confirm improvements
5. ✅ Set up automated load testing in CI/CD
6. ✅ Create performance regression alerts

---

**Last Updated**: 2025-10-23
