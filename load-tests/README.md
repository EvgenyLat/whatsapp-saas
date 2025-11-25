# Load Testing Suite

Comprehensive k6 load testing suite for the WhatsApp SaaS platform.

## Quick Start

```bash
# 1. Install k6
brew install k6  # macOS
# or visit https://k6.io/docs/getting-started/installation/

# 2. Set environment variables
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your-admin-token"
export TEST_SALON_ID="test-salon-123"

# 3. Run quick test suite
chmod +x run-all-tests.sh
./run-all-tests.sh --quick
```

## Test Scripts

| Test | Purpose | Duration | Load Pattern |
|------|---------|----------|--------------|
| `api-test.js` | General API performance | 10 min | 10 → 100 users |
| `database-test.js` | Database query performance | 10 min | 50 → 200 queries |
| `webhook-test.js` | WhatsApp webhook processing | 10 min | 20 → 100 users |
| `spike-test.js` | Sudden traffic surge | 4 min | 10 → 500 users |
| `soak-test.js` | 1-hour stability test | 60 min | 50 users constant |
| `stress-test.js` | Breaking point test | 37 min | 50 → 500 users |

## Performance Thresholds

| Metric | API | Database | Webhook |
|--------|-----|----------|---------|
| P95 Latency | < 200ms | < 100ms | < 1000ms |
| P99 Latency | < 500ms | < 200ms | < 2000ms |
| Error Rate | < 1% | < 0.5% | < 2% |

## Directory Structure

```
load-tests/
├── scripts/           # Test scripts
│   ├── api-test.js
│   ├── database-test.js
│   ├── webhook-test.js
│   ├── spike-test.js
│   ├── soak-test.js
│   └── stress-test.js
├── config/            # Configuration
│   └── config.js
├── utils/             # Utility functions
│   └── helpers.js
├── tools/             # Analysis tools
│   ├── analyze-results.js
│   └── compare-runs.js
├── results/           # Test results (generated)
├── run-all-tests.sh   # Test runner
└── LOAD_TESTING_GUIDE.md  # Complete documentation
```

## Running Tests

### Individual Tests
```bash
k6 run scripts/api-test.js
k6 run scripts/database-test.js
k6 run scripts/webhook-test.js
```

### Full Suite
```bash
# Full suite (prompts for long tests)
./run-all-tests.sh

# Quick mode (shortened tests)
./run-all-tests.sh --quick
```

### Custom Configuration
```bash
BASE_URL=https://staging.example.com \
ADMIN_TOKEN=my-token \
k6 run scripts/api-test.js
```

## Analyzing Results

### Automatic Analysis
```bash
# Analyze single run
node tools/analyze-results.js results/run_20250101_120000

# Compare two runs
node tools/compare-runs.js \
  results/run_20250101_120000 \
  results/run_20250101_140000
```

### View Reports
Results are saved in `./results/run_YYYYMMDD_HHMMSS/`:
- HTML reports: `*-summary.html`
- JSON data: `*-summary.json`
- Raw metrics: `*-raw.json`

## Grafana Integration

View real-time metrics during tests:

1. Start Grafana: `docker-compose up -d`
2. Open: http://localhost:3001
3. Dashboard: "Real-time Metrics"
4. Run tests and observe live metrics

## Documentation

See [LOAD_TESTING_GUIDE.md](./LOAD_TESTING_GUIDE.md) for:
- Detailed test descriptions
- Configuration options
- Performance baselines
- Troubleshooting guide
- Best practices

## Example Output

```
═══════════════════════════════════════════════════════════
LOAD TESTING SUITE
═══════════════════════════════════════════════════════════

🔧 Configuration:
  Base URL: http://localhost:4000
  Admin Token: <set>
  Test Salon ID: test-salon-123

✓ Backend is running
✓ Results directory: ./results/run_20250118_143000

▶ Starting: API Load Test (General API endpoints)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

running (10m03s), 000/100 VUs, 15234 complete and 0 interrupted iterations

     ✓ Health Check
     ✓ Get Bookings

     http_req_duration..............: avg=145.23ms p(95)=189.45ms p(99)=234.12ms
     http_req_failed................: 0.12%
     http_reqs......................: 15234

✓ Completed: API Load Test

═══════════════════════════════════════════════════════════
✓ All tests completed successfully!
═══════════════════════════════════════════════════════════
```

## Troubleshooting

### Backend Not Running
```bash
curl http://localhost:4000/healthz
# If fails, start backend:
cd Backend && npm start
```

### High Error Rates
- Check backend logs
- Review database connection pool
- Verify external API rate limits

### Memory Issues
```bash
# Monitor during soak test
watch -n 5 'ps aux | grep node'
```

## Support

For detailed help, see:
- [LOAD_TESTING_GUIDE.md](./LOAD_TESTING_GUIDE.md)
- Test logs in `./results/`
- Grafana dashboards
