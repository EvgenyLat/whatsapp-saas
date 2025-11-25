# User Story 1 Analytics System

Comprehensive logging and analytics tracking for the zero-typing touch-based booking flow.

## Purpose

Track metrics for User Story 1 success criteria validation:

- **SC-001**: 95%+ zero typing after initial message
- **SC-002**: Average 2-3 taps per booking
- **SC-003**: <30 seconds booking time

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    QuickBookingService                       │
│  (Booking orchestrator with analytics tracking calls)       │
└────────────────────┬────────────────────────────────────────┘
                     │ trackEvent()
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   US1AnalyticsService                        │
│  • Real-time event tracking                                  │
│  • Session state management                                  │
│  • Success criteria calculation                              │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────┐    ┌──────────────────────────────────┐
│   PostgreSQL       │    │      In-Memory Map               │
│ us1_analytics_     │    │  (Session metrics storage)       │
│ events table       │    │  Production: Redis               │
└────────────────────┘    └──────────────────────────────────┘
```

### Event Flow

1. **Customer sends initial message**
   - `booking_request_received` event tracked
   - Session initialized with `typingCount = 1`

2. **AI parses intent**
   - `intent_parsed` event tracked
   - `intentComplete` flag set based on extracted info

3. **Slots shown to customer**
   - `slots_shown` event tracked
   - `cardType` recorded (reply_buttons or list_message)

4. **Customer taps slot button**
   - `slot_selected` event tracked
   - `tapCount` incremented to 1

5. **Confirmation card shown**
   - `confirmation_shown` event tracked

6. **Customer taps Confirm button**
   - `booking_confirmed` event tracked
   - `tapCount` incremented to 2

7. **Booking saved to database**
   - `booking_completed` event tracked with final metrics
   - Success criteria achievement logged

### Event Types

```typescript
type US1EventType =
  | 'booking_request_received'  // Customer sends initial message
  | 'intent_parsed'             // AI parsed intent successfully
  | 'slots_shown'               // Interactive card sent
  | 'slot_selected'             // Customer tapped slot button
  | 'confirmation_shown'        // Confirmation card sent
  | 'booking_confirmed'         // Customer tapped Confirm button
  | 'booking_completed'         // Booking saved to database
  | 'typing_detected'           // Customer typed after buttons shown
  | 'error_occurred';           // Error during booking flow
```

## Database Schema

### us1_analytics_events Table

```sql
CREATE TABLE us1_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  salon_id VARCHAR(100) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_us1_analytics_salon_timestamp
  ON us1_analytics_events (salon_id, timestamp);

CREATE INDEX idx_us1_analytics_session
  ON us1_analytics_events (session_id);

CREATE INDEX idx_us1_analytics_completed_bookings
  ON us1_analytics_events (event_type, salon_id, timestamp)
  WHERE event_type = 'booking_completed';
```

### Metadata Fields

```typescript
interface EventMetadata {
  tapCount?: number;           // Running tap counter
  typingCount?: number;        // Running typing counter
  durationMs?: number;         // Time since first message
  intentComplete?: boolean;    // Did AI get all info?
  language?: string;           // Detected language
  cardType?: 'reply_buttons' | 'list_message';
  bookingId?: string;          // Final booking ID
  slotId?: string;             // Selected slot ID
  errorMessage?: string;       // Error details
  errorType?: string;          // Error category
}
```

## API Endpoints

### Calculate Success Criteria

```http
GET /api/ai/analytics/us1/success-criteria
  ?salonId=123
  &startDate=2025-01-01
  &endDate=2025-01-31
```

**Response:**

```json
{
  "SC_001_zeroTyping": 87.5,
  "SC_002_avgTaps": 2.1,
  "SC_003_avgBookingTime": 24.8,
  "totalBookings": 150,
  "sampleSize": 150,
  "periodStart": "2025-01-01T00:00:00.000Z",
  "periodEnd": "2025-01-31T23:59:59.999Z",
  "breakdown": {
    "zeroTypingCount": 132,
    "zeroTypingPercentage": 87.5,
    "tapDistribution": {
      "2": 145,
      "3": 5
    },
    "timeDistribution": {
      "under10s": 20,
      "under20s": 50,
      "under30s": 70,
      "over30s": 10
    }
  }
}
```

### Get Session Metrics

```http
GET /api/ai/analytics/us1/session/session_123
```

**Response:**

```json
{
  "sessionId": "session_123",
  "salonId": "salon_456",
  "customerId": "customer_789",
  "tapCount": 2,
  "typingCount": 1,
  "durationMs": 24500,
  "isComplete": true,
  "bookingId": "booking_abc",
  "eventCount": 7
}
```

## Usage Examples

### Tracking Events in QuickBookingService

```typescript
// 1. Initialize session
await this.analytics.initializeSession(
  sessionId,
  request.salonId,
  customerId,
);

// 2. Track booking request
await this.analytics.trackEvent({
  eventType: 'booking_request_received',
  salonId: request.salonId,
  customerId,
  sessionId,
  timestamp: new Date(),
  metadata: {
    language: request.language || 'auto',
    typingCount: 1,
  },
});

// 3. Track slot selection
await this.analytics.trackEvent({
  eventType: 'slot_selected',
  salonId: request.salonId,
  customerId,
  sessionId,
  timestamp: new Date(),
  metadata: {
    slotId,
    tapCount: 1,
    durationMs: Date.now() - startTime,
  },
});

// 4. Complete session
await this.analytics.completeSession(sessionId, bookingId);
```

### Calculating Success Criteria

```typescript
const results = await analyticsService.calculateSuccessCriteria(
  'salon_123',
  new Date('2025-01-01'),
  new Date('2025-01-31'),
);

console.log(`SC-001 (Zero Typing): ${results.SC_001_zeroTyping}%`);
console.log(`SC-002 (Avg Taps): ${results.SC_002_avgTaps}`);
console.log(`SC-003 (Avg Time): ${results.SC_003_avgBookingTime}s`);
```

## Log Format

All events are logged in structured JSON format:

```json
{
  "event": "us1.booking_completed",
  "sessionId": "session_1706198400000_abc123",
  "salonId": "salon_456",
  "customerId": "customer_789",
  "timestamp": "2025-01-25T14:30:00.000Z",
  "durationMs": 24500,
  "metrics": {
    "tapCount": 2,
    "typingCount": 1
  },
  "metadata": {
    "bookingId": "booking_xyz",
    "language": "en"
  }
}
```

### Success Criteria Achievement Log

When a booking is completed, the service logs whether each success criterion was achieved:

```json
{
  "event": "us1.booking_completed",
  "bookingId": "booking_xyz",
  "sessionId": "session_abc",
  "metrics": {
    "tapCount": 2,
    "typingCount": 1,
    "durationMs": 24500,
    "durationSeconds": "24.50",
    "achievedZeroTyping": true,   // SC-001: 1 typing = zero typing after initial
    "achievedTapTarget": true,    // SC-002: 2 taps ≤ 3 target
    "achievedTimeTarget": true    // SC-003: 24.5s < 30s target
  }
}
```

## Performance

### Event Tracking

- **Target**: <10ms per event
- **Implementation**: In-memory session updates + async database writes
- **Warning**: Logs if tracking takes >10ms

### Success Criteria Calculation

- **Target**: <1s for 10,000 bookings
- **Optimization**: Indexed queries on `event_type` and `timestamp`
- **Caching**: Consider caching daily/weekly aggregates for large datasets

## Session Management

### In-Memory Storage (Development)

```typescript
private readonly sessionMetrics = new Map<string, SessionMetrics>();
```

- Sessions stored in Map for fast access
- Cleaned up automatically after 1 hour of completion
- Cleanup runs every 5 minutes

### Production Recommendation

Replace Map with Redis:

```typescript
// Example Redis implementation
await redis.setex(
  `us1:session:${sessionId}`,
  3600, // 1 hour TTL
  JSON.stringify(sessionMetrics),
);
```

## Migration Guide

### Running the Migration

```bash
# Development (SQLite)
cd Backend
npm run migrate:dev

# Production (PostgreSQL)
npm run migrate:deploy
```

### Manual Migration

```bash
psql $DATABASE_URL -f prisma/migrations/20250125_create_us1_analytics_events/migration.sql
```

## Monitoring

### Key Metrics to Track

1. **Event Volume**: Events per hour/day
2. **Event Latency**: Time to track each event
3. **Session Duration**: Average session completion time
4. **Database Performance**: Query execution time for success criteria calculation
5. **Storage Growth**: Table size over time

### Dashboard Queries

**Daily Success Criteria:**

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as bookings,
  AVG((metadata->>'tapCount')::int) as avg_taps,
  AVG((metadata->>'durationMs')::int / 1000.0) as avg_time_seconds,
  SUM(CASE WHEN (metadata->>'typingCount')::int = 1 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as zero_typing_pct
FROM us1_analytics_events
WHERE event_type = 'booking_completed'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Hourly Event Volume:**

```sql
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  event_type,
  COUNT(*) as count
FROM us1_analytics_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), event_type
ORDER BY hour DESC, event_type;
```

## Testing

### Unit Tests

```typescript
describe('US1AnalyticsService', () => {
  it('should track booking_request_received event', async () => {
    await service.trackEvent({
      eventType: 'booking_request_received',
      salonId: 'salon_123',
      customerId: 'customer_456',
      sessionId: 'session_789',
      timestamp: new Date(),
      metadata: { language: 'en', typingCount: 1 },
    });

    const session = await service.getSessionMetrics('session_789');
    expect(session.typingCount).toBe(1);
  });

  it('should calculate success criteria correctly', async () => {
    // Create test events
    // ...

    const results = await service.calculateSuccessCriteria(
      'salon_123',
      startDate,
      endDate,
    );

    expect(results.SC_001_zeroTyping).toBeGreaterThan(90);
    expect(results.SC_002_avgTaps).toBeLessThanOrEqual(3);
    expect(results.SC_003_avgBookingTime).toBeLessThan(30);
  });
});
```

### Integration Tests

```typescript
describe('QuickBookingService with Analytics', () => {
  it('should track full booking flow', async () => {
    // 1. Send booking request
    const response = await quickBooking.handleBookingRequest({
      text: 'Haircut tomorrow 3pm',
      customerPhone: '+1234567890',
      salonId: 'salon_123',
      language: 'en',
    });

    // 2. Select slot
    await quickBooking.handleButtonClick(
      'slot_abc123',
      '+1234567890',
    );

    // 3. Confirm booking
    await quickBooking.handleButtonClick(
      'confirm_abc123',
      '+1234567890',
    );

    // 4. Verify analytics
    const metrics = await analytics.getSessionMetrics(response.sessionId);
    expect(metrics.tapCount).toBe(2);
    expect(metrics.typingCount).toBe(1);
    expect(metrics.isComplete).toBe(true);
  });
});
```

## Troubleshooting

### No Analytics Data

1. Check if migration was run: `SELECT * FROM us1_analytics_events LIMIT 1;`
2. Check if analytics service is injected in QuickBookingService
3. Check logs for "us1.booking_request" events

### Missing Events

- Verify `trackEvent()` calls are awaited
- Check for errors in async event storage
- Ensure session is initialized before tracking

### Incorrect Metrics

- Verify tap/typing counters are incremented correctly
- Check session metrics are retrieved before tracking
- Ensure session cleanup isn't removing active sessions

## Future Enhancements

### Phase 2: Real-time Dashboard

- WebSocket streaming of live metrics
- Real-time success criteria visualization
- Alert system for metrics falling below thresholds

### Phase 3: Advanced Analytics

- Customer segmentation by behavior
- A/B testing framework for UI variations
- Funnel analysis (drop-off points)
- Cohort analysis

### Phase 4: Machine Learning

- Predictive models for booking success
- Anomaly detection for unusual patterns
- Personalized booking flow optimization

## References

- [User Story 1 Specification](../../../specs/001-whatsapp-quick-booking/)
- [QuickBookingService Documentation](../quick-booking.service.ts)
- [Success Criteria Definition](../../../specs/001-whatsapp-quick-booking/success-criteria.md)
