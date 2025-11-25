# US1 Analytics Quick Start Guide

## Setup (5 minutes)

### 1. Run Database Migration

```bash
cd Backend
npm run migrate:dev  # or npm run migrate:deploy for production
```

### 2. Verify Table Created

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM us1_analytics_events;"
```

### 3. Start Application

```bash
npm run start:dev
```

## Testing Analytics

### 1. Simulate a Booking Flow

```bash
# Send booking request
curl -X POST http://localhost:3000/api/ai/quick-booking/request \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Haircut tomorrow 3pm",
    "customerPhone": "+1234567890",
    "salonId": "salon_123",
    "language": "en"
  }'

# Response will include sessionId
# {"success": true, "sessionId": "session_abc123", ...}
```

### 2. Check Session Metrics

```bash
curl http://localhost:3000/api/ai/analytics/us1/session/session_abc123
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "tapCount": 0,
  "typingCount": 1,
  "durationMs": 1500,
  "isComplete": false
}
```

### 3. Complete the Booking

```bash
# Click slot button
curl -X POST http://localhost:3000/api/ai/quick-booking/button \
  -d '{"buttonId": "slot_001", "customerPhone": "+1234567890"}'

# Click confirm button
curl -X POST http://localhost:3000/api/ai/quick-booking/button \
  -d '{"buttonId": "confirm_001", "customerPhone": "+1234567890"}'
```

### 4. View Success Criteria

```bash
curl "http://localhost:3000/api/ai/analytics/us1/success-criteria?salonId=salon_123&startDate=2025-01-01&endDate=2025-12-31"
```

**Response:**
```json
{
  "SC_001_zeroTyping": 100.0,
  "SC_002_avgTaps": 2.0,
  "SC_003_avgBookingTime": 24.5,
  "totalBookings": 1,
  "breakdown": {
    "zeroTypingCount": 1,
    "tapDistribution": {"2": 1},
    "timeDistribution": {
      "under10s": 0,
      "under20s": 0,
      "under30s": 1,
      "over30s": 0
    }
  }
}
```

## View Logs

### Structured JSON Logs

```bash
# View all US1 events
docker logs backend_api | grep "us1\."

# View specific event type
docker logs backend_api | grep "us1.booking_completed"
```

**Example Log:**
```json
{
  "event": "us1.booking_completed",
  "sessionId": "session_abc123",
  "bookingId": "booking_xyz",
  "metrics": {
    "tapCount": 2,
    "typingCount": 1,
    "durationMs": 24500,
    "achievedZeroTyping": true,
    "achievedTapTarget": true,
    "achievedTimeTarget": true
  }
}
```

## Database Queries

### View Recent Events

```sql
SELECT
  event_type,
  session_id,
  metadata->>'tapCount' as taps,
  metadata->>'typingCount' as typing,
  timestamp
FROM us1_analytics_events
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 20;
```

### Calculate Success Criteria

```sql
SELECT
  COUNT(*) as total_bookings,
  AVG((metadata->>'tapCount')::int) as avg_taps,
  AVG((metadata->>'durationMs')::int / 1000.0) as avg_time_seconds,
  SUM(CASE WHEN (metadata->>'typingCount')::int = 1 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as zero_typing_pct
FROM us1_analytics_events
WHERE event_type = 'booking_completed'
  AND timestamp >= NOW() - INTERVAL '30 days';
```

### View Session Journey

```sql
SELECT
  event_type,
  metadata->>'tapCount' as taps,
  metadata->>'durationMs' as duration_ms,
  timestamp
FROM us1_analytics_events
WHERE session_id = 'session_abc123'
ORDER BY timestamp;
```

## Common Tasks

### Add New Event Type

1. Add to `US1AnalyticsEvent.eventType` union type
2. Track in `QuickBookingService` at appropriate point
3. Update documentation

### Customize Metrics

Edit `US1AnalyticsService.generateBreakdown()` to add custom metrics:

```typescript
private generateBreakdown(sessions) {
  return {
    ...existingMetrics,
    // Add custom metric
    perfectBookings: sessions.filter(s =>
      s.tapCount === 2 &&
      s.typingCount === 1 &&
      s.durationMs < 20000
    ).length,
  };
}
```

### Export Analytics Data

```bash
# Export to CSV
psql $DATABASE_URL -c "\COPY (SELECT * FROM us1_analytics_events WHERE timestamp >= '2025-01-01') TO 'analytics.csv' CSV HEADER"

# Export to JSON
psql $DATABASE_URL -t -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM us1_analytics_events WHERE timestamp >= '2025-01-01') t" > analytics.json
```

## Troubleshooting

### No Events Appearing

**Check 1**: Verify analytics service is injected
```typescript
// In QuickBookingService constructor
constructor(
  // ...
  private readonly analytics: US1AnalyticsService, // ✅ Should be here
) {}
```

**Check 2**: Verify trackEvent is awaited
```typescript
await this.analytics.trackEvent({ /* ... */ }); // ✅ Awaited
```

**Check 3**: Check logs for errors
```bash
docker logs backend_api | grep -i error
```

### Session Not Found

**Cause**: Session expired (1 hour TTL) or never initialized

**Solution**: Ensure `initializeSession()` is called first:
```typescript
await this.analytics.initializeSession(sessionId, salonId, customerId);
```

### Wrong Metrics

**Cause**: Tap/typing counters not incremented correctly

**Solution**: Always get session metrics before tracking:
```typescript
const sessionMetrics = await this.analytics.getSessionMetrics(sessionId);
const tapCount = (sessionMetrics?.tapCount || 0) + 1;
```

## Performance Tips

### 1. Batch Queries

Instead of:
```typescript
for (const salon of salons) {
  await analytics.calculateSuccessCriteria(salon.id, start, end);
}
```

Use:
```typescript
const results = await Promise.all(
  salons.map(s => analytics.calculateSuccessCriteria(s.id, start, end))
);
```

### 2. Cache Results

For dashboards, cache success criteria for 1 hour:
```typescript
const cacheKey = `us1:success:${salonId}:${date}`;
let results = await redis.get(cacheKey);

if (!results) {
  results = await analytics.calculateSuccessCriteria(salonId, start, end);
  await redis.setex(cacheKey, 3600, JSON.stringify(results));
}
```

### 3. Use Materialized Views

For frequently accessed aggregations:
```sql
CREATE MATERIALIZED VIEW us1_hourly_metrics AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  salon_id,
  COUNT(*) as bookings,
  AVG((metadata->>'tapCount')::int) as avg_taps
FROM us1_analytics_events
WHERE event_type = 'booking_completed'
GROUP BY DATE_TRUNC('hour', timestamp), salon_id;

-- Refresh every hour
REFRESH MATERIALIZED VIEW us1_hourly_metrics;
```

## Integration Examples

### React Dashboard Component

```typescript
function SuccessCriteriaWidget({ salonId }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch(`/api/ai/analytics/us1/success-criteria?salonId=${salonId}`)
      .then(res => res.json())
      .then(setMetrics);
  }, [salonId]);

  if (!metrics) return <Spinner />;

  return (
    <div>
      <Metric
        label="Zero Typing"
        value={`${metrics.SC_001_zeroTyping}%`}
        target="95%"
        status={metrics.SC_001_zeroTyping >= 95 ? 'success' : 'warning'}
      />
      <Metric
        label="Avg Taps"
        value={metrics.SC_002_avgTaps}
        target="2-3"
        status={metrics.SC_002_avgTaps <= 3 ? 'success' : 'warning'}
      />
      <Metric
        label="Avg Time"
        value={`${metrics.SC_003_avgBookingTime}s`}
        target="<30s"
        status={metrics.SC_003_avgBookingTime < 30 ? 'success' : 'warning'}
      />
    </div>
  );
}
```

### Slack Alert Bot

```typescript
async function checkSuccessCriteria() {
  const metrics = await analytics.calculateSuccessCriteria(
    'all',
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date(),
  );

  if (metrics.SC_001_zeroTyping < 90) {
    await slack.postMessage({
      channel: '#alerts',
      text: `⚠️ Zero typing rate dropped to ${metrics.SC_001_zeroTyping}% (target: 95%)`,
    });
  }
}

// Run every hour
setInterval(checkSuccessCriteria, 60 * 60 * 1000);
```

## Next Steps

1. ✅ Test analytics with sample bookings
2. ✅ Verify success criteria calculations
3. ✅ Set up monitoring dashboard
4. ✅ Configure alerts for threshold violations
5. ✅ Train team on log analysis

## Support

- **Documentation**: [README.md](./README.md)
- **API Reference**: [us1-analytics.service.ts](./us1-analytics.service.ts)
- **Implementation Guide**: [US1_ANALYTICS_IMPLEMENTATION_SUMMARY.md](../../../../US1_ANALYTICS_IMPLEMENTATION_SUMMARY.md)
