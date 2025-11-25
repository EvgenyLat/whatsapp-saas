# Application Metrics Guide

Comprehensive guide for using and integrating application metrics in the WhatsApp SaaS platform.

## Table of Contents

- [Overview](#overview)
- [Available Metrics](#available-metrics)
- [Quick Start](#quick-start)
- [Integration Examples](#integration-examples)
- [Dashboard Guide](#dashboard-guide)
- [SLA Tracking](#sla-tracking)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The WhatsApp SaaS platform includes comprehensive application instrumentation using Prometheus metrics. This provides real-time visibility into:

- **HTTP Performance**: Request latency, throughput, error rates
- **Business KPIs**: Bookings, messages, AI conversations
- **Database Performance**: Query duration, connection pools, slow queries
- **External APIs**: WhatsApp/OpenAI latency, rate limits, costs
- **Cache Performance**: Redis hit rates, operation latency
- **Queue Health**: Job processing time, backlog size

### Metrics Endpoint

All metrics are exposed at: `http://localhost:4000/metrics`

---

## Available Metrics

### 🌐 HTTP Metrics

#### http_request_duration_seconds
**Type**: Histogram
**Labels**: `method`, `route`, `status`
**Description**: Duration of HTTP requests in seconds
**Buckets**: 10ms, 50ms, 100ms, 300ms, 500ms, 1s, 2s, 5s, 10s

```promql
# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P95 latency by route
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

#### http_requests_total
**Type**: Counter
**Labels**: `method`, `route`, `status`
**Description**: Total number of HTTP requests

```promql
# Request rate
sum(rate(http_requests_total[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

#### http_requests_in_progress
**Type**: Gauge
**Labels**: `method`, `route`
**Description**: Number of HTTP requests currently being processed

```promql
# Active requests
sum(http_requests_in_progress)
```

#### http_response_size_bytes
**Type**: Histogram
**Labels**: `method`, `route`, `status`
**Description**: Size of HTTP responses in bytes
**Buckets**: 100B, 1KB, 10KB, 100KB, 1MB, 10MB

```promql
# P95 response size
histogram_quantile(0.95, sum(rate(http_response_size_bytes_bucket[5m])) by (le))
```

---

### 💼 Business Metrics

#### bookings_created_total
**Type**: Counter
**Labels**: `service_type`, `status`
**Description**: Total number of bookings created

```promql
# Bookings per minute
rate(bookings_created_total[1m]) * 60

# Bookings by service type
sum(rate(bookings_created_total[1h])) by (service_type)
```

#### bookings_cancelled_total
**Type**: Counter
**Labels**: `cancellation_reason`
**Description**: Total number of bookings cancelled

```promql
# Cancellation rate
rate(bookings_cancelled_total[1h]) / rate(bookings_created_total[1h]) * 100
```

#### bookings_active
**Type**: Gauge
**Labels**: `service_type`
**Description**: Number of currently active bookings

```promql
# Total active bookings
sum(bookings_active)
```

#### messages_sent_total / messages_received_total
**Type**: Counter
**Labels**: `message_type`
**Description**: Total WhatsApp messages sent/received

```promql
# Message volume
rate(messages_sent_total[5m])

# Messages by type
sum(rate(messages_sent_total[1h])) by (message_type)
```

#### messages_delivered_total / messages_failed_total / messages_read_total
**Type**: Counter
**Description**: Message delivery status tracking

```promql
# Delivery success rate
rate(messages_delivered_total[5m]) / rate(messages_sent_total[5m]) * 100

# Failure rate
rate(messages_failed_total[5m]) / rate(messages_sent_total[5m]) * 100
```

---

### 🤖 AI/ML Metrics

#### ai_conversations_total
**Type**: Counter
**Labels**: `salon_id`
**Description**: Total AI conversations initiated

```promql
# Conversation rate
rate(ai_conversations_total[5m])
```

#### ai_conversations_active
**Type**: Gauge
**Labels**: `salon_id`
**Description**: Currently active AI conversations

```promql
# Active conversations
sum(ai_conversations_active)
```

---

### 🗄️ Database Metrics

#### db_query_duration_seconds
**Type**: Histogram
**Labels**: `model`, `action`
**Description**: Duration of database queries
**Buckets**: 1ms, 10ms, 50ms, 100ms, 500ms, 1s, 2s, 5s

```promql
# P95 query latency
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le))

# Slowest queries
topk(10, histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, model, action)))
```

#### db_queries_total
**Type**: Counter
**Labels**: `model`, `action`
**Description**: Total number of database queries

```promql
# Query rate
sum(rate(db_queries_total[5m]))

# Queries by model
sum(rate(db_queries_total[5m])) by (model)
```

#### db_slow_queries_total
**Type**: Counter
**Labels**: `model`, `action`
**Description**: Slow queries (>1s)

```promql
# Slow query rate
rate(db_slow_queries_total[5m])
```

#### db_connection_pool_usage / db_connection_pool_size
**Type**: Gauge
**Labels**: `pool`
**Description**: Database connection pool metrics

```promql
# Pool utilization %
(db_connection_pool_usage / db_connection_pool_size) * 100
```

---

### 🌍 External API Metrics

#### WhatsApp API

##### whatsapp_api_calls_total
**Type**: Counter
**Labels**: `endpoint`, `method`
**Description**: Total WhatsApp API calls

```promql
# Call rate
sum(rate(whatsapp_api_calls_total[5m]))
```

##### whatsapp_api_latency_seconds
**Type**: Histogram
**Labels**: `endpoint`, `method`
**Description**: WhatsApp API call latency
**Buckets**: 100ms, 500ms, 1s, 2s, 5s, 10s

```promql
# P95 latency
histogram_quantile(0.95, sum(rate(whatsapp_api_latency_seconds_bucket[5m])) by (le))
```

##### whatsapp_api_errors_total
**Type**: Counter
**Labels**: `endpoint`, `error_type`, `status_code`
**Description**: WhatsApp API errors

```promql
# Error rate
sum(rate(whatsapp_api_errors_total[5m]))
```

##### whatsapp_rate_limit_hits_total
**Type**: Counter
**Labels**: `endpoint`
**Description**: Rate limit hits (HTTP 429)

```promql
# Rate limit hits
rate(whatsapp_rate_limit_hits_total[5m])
```

#### OpenAI API

##### openai_api_calls_total
**Type**: Counter
**Labels**: `model`, `function`
**Description**: Total OpenAI API calls

```promql
# Calls by model
sum(rate(openai_api_calls_total[5m])) by (model)
```

##### openai_api_latency_seconds
**Type**: Histogram
**Labels**: `model`, `function`
**Description**: OpenAI API latency
**Buckets**: 500ms, 1s, 2s, 5s, 10s, 20s, 30s, 60s

```promql
# P95 latency by model
histogram_quantile(0.95, sum(rate(openai_api_latency_seconds_bucket[5m])) by (le, model))
```

##### openai_tokens_prompt_total / openai_tokens_completion_total
**Type**: Counter
**Labels**: `model`
**Description**: Token usage (prompt and completion)

```promql
# Total token usage
rate(openai_tokens_prompt_total[1h]) + rate(openai_tokens_completion_total[1h])

# Token usage by model
sum(rate(openai_tokens_prompt_total[1h]) + rate(openai_tokens_completion_total[1h])) by (model)
```

##### openai_cost_estimate_usd
**Type**: Counter
**Labels**: `model`
**Description**: Estimated cost in USD

```promql
# Cost per hour
increase(openai_cost_estimate_usd[1h])

# Daily cost estimate
increase(openai_cost_estimate_usd[24h])
```

---

### 💾 Cache Metrics (Redis)

#### redis_operations_total
**Type**: Counter
**Labels**: `operation`, `status`
**Description**: Total Redis operations

```promql
# Operations per second
sum(rate(redis_operations_total[5m]))

# Success rate
sum(rate(redis_operations_total{status="success"}[5m])) / sum(rate(redis_operations_total[5m])) * 100
```

#### redis_operation_latency_seconds
**Type**: Histogram
**Labels**: `operation`
**Description**: Redis operation latency
**Buckets**: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s

```promql
# P95 latency
histogram_quantile(0.95, sum(rate(redis_operation_latency_seconds_bucket[5m])) by (le))
```

#### redis_cache_hit_rate
**Type**: Gauge
**Description**: Cache hit rate (0-1)

```promql
# Hit rate percentage
redis_cache_hit_rate * 100
```

#### redis_cache_hits_total / redis_cache_misses_total
**Type**: Counter
**Labels**: `key_prefix`
**Description**: Cache hits and misses

```promql
# Hit rate calculation
sum(rate(redis_cache_hits_total[5m])) / (sum(rate(redis_cache_hits_total[5m])) + sum(rate(redis_cache_misses_total[5m]))) * 100
```

---

## Quick Start

### 1. Verify Metrics Endpoint

```bash
curl http://localhost:4000/metrics
```

You should see Prometheus-formatted metrics output.

### 2. Access Grafana Dashboards

Navigate to http://localhost:3001 (admin/admin123) and check:

- **Real-Time Metrics & SLA Tracking** - Real-time operations and SLA compliance
- **Application Performance** - HTTP, webhooks, queues
- **Business Metrics** - KPIs, bookings, messages
- **Database Performance** - Query performance, connection pools
- **Redis Performance** - Cache hit rates, latency

### 3. Test Metrics Collection

```bash
# Make some requests
curl http://localhost:4000/healthz
curl http://localhost:4000/

# Check metrics updated
curl http://localhost:4000/metrics | grep http_requests_total
```

---

## Integration Examples

### Track Business Events

#### Example 1: Track Booking Creation

```javascript
const { trackBookingCreated } = require('./src/middleware/metrics');

async function createBooking(salonId, serviceType, customerData) {
  try {
    // Create booking in database
    const booking = await db.createBooking(salonId, serviceType, customerData);

    // Track metric
    trackBookingCreated(serviceType, 'pending');

    return booking;
  } catch (error) {
    logger.error('Failed to create booking:', error);
    throw error;
  }
}
```

#### Example 2: Track Message Sending

```javascript
const { trackMessageSent, trackMessageFailed } = require('./src/middleware/metrics');

async function sendWhatsAppMessage(phoneNumber, message, messageType = 'text') {
  const startTime = Date.now();

  try {
    // Send via WhatsApp API
    await whatsappApi.sendMessage(phoneNumber, message);

    // Track success
    trackMessageSent(messageType);

  } catch (error) {
    const errorType = error.code || 'unknown';
    trackMessageFailed(errorType);
    throw error;
  }
}
```

### Track Database Queries

#### Example 3: Track Database Operations

```javascript
const { trackDbQuery } = require('./src/middleware/metrics');

async function getUserBookings(userId) {
  const startTime = Date.now();
  const model = 'booking';
  const action = 'findMany';

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { service: true }
    });

    // Track successful query
    trackDbQuery(model, action, startTime);

    return bookings;
  } catch (error) {
    // Track failed query
    trackDbQuery(model, action, startTime, error);
    throw error;
  }
}
```

### Track External API Calls

#### Example 4: Track WhatsApp API

```javascript
const { trackWhatsAppApi } = require('./src/middleware/metrics');

async function callWhatsAppAPI(endpoint, method, data) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${WHATSAPP_API_BASE}${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify(data)
    });

    // Track API call
    trackWhatsAppApi(endpoint, method, startTime, response.status);

    if (!response.ok) {
      const error = new Error(`WhatsApp API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    trackWhatsAppApi(endpoint, method, startTime, error.status || 500, error);
    throw error;
  }
}
```

#### Example 5: Track OpenAI API

```javascript
const { trackOpenAiApi } = require('./src/middleware/metrics');

async function generateAIResponse(model, prompt, functionName = 'chat') {
  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }]
    });

    const promptTokens = response.usage.prompt_tokens;
    const completionTokens = response.usage.completion_tokens;

    // Track with token usage
    trackOpenAiApi(model, functionName, startTime, promptTokens, completionTokens);

    return response.choices[0].message.content;
  } catch (error) {
    trackOpenAiApi(model, functionName, startTime, 0, 0, error);
    throw error;
  }
}
```

### Track Cache Operations

#### Example 6: Track Redis Operations

```javascript
const { trackRedisOperation, trackRedisCache } = require('./src/middleware/metrics');

async function getCachedData(key, fetchFunction) {
  const startTime = Date.now();
  const keyPrefix = key.split(':')[0]; // Extract prefix for grouping

  try {
    // Try to get from cache
    const cached = await redis.get(key);

    if (cached) {
      // Cache hit
      trackRedisOperation('get', startTime);
      trackRedisCache(keyPrefix, true);
      return JSON.parse(cached);
    }

    // Cache miss
    trackRedisCache(keyPrefix, false);

    // Fetch data
    const data = await fetchFunction();

    // Store in cache
    const setStartTime = Date.now();
    await redis.set(key, JSON.stringify(data), 'EX', 3600);
    trackRedisOperation('set', setStartTime);

    return data;
  } catch (error) {
    trackRedisOperation('get', startTime, null, error);
    throw error;
  }
}
```

### Track Queue Jobs

#### Example 7: Track Queue Processing

```javascript
const { trackQueueJob, updateQueueStats } = require('./src/middleware/metrics');

// In your queue worker
messageQueue.process('send-message', async (job) => {
  const startTime = Date.now();
  const queueName = 'send-message';
  const jobType = job.data.messageType || 'text';

  try {
    // Process job
    await sendMessage(job.data);

    // Track successful processing
    trackQueueJob(queueName, jobType, startTime);

  } catch (error) {
    // Track failed job
    trackQueueJob(queueName, jobType, startTime, error);
    throw error;
  }
});

// Update queue stats periodically
setInterval(async () => {
  const stats = await messageQueue.getJobCounts();
  updateQueueStats('send-message', stats.waiting, stats.active);
}, 10000); // Every 10 seconds
```

### Track AI Conversations

#### Example 8: Track Conversation Lifecycle

```javascript
const {
  trackAiConversationStart,
  updateActiveAiConversations
} = require('./src/middleware/metrics');

async function startConversation(salonId, phoneNumber) {
  // Track conversation start
  trackAiConversationStart(salonId);

  // Update active count
  const activeCount = await getActiveConversationCount(salonId);
  updateActiveAiConversations(salonId, activeCount);

  return conversationId;
}

async function endConversation(salonId, conversationId) {
  // Mark conversation as ended
  await db.updateConversation(conversationId, { status: 'ended' });

  // Update active count
  const activeCount = await getActiveConversationCount(salonId);
  updateActiveAiConversations(salonId, activeCount);
}
```

---

## Dashboard Guide

### Real-Time Metrics & SLA Tracking

**Refresh**: 5 seconds
**Use Case**: Live monitoring, incident response, SLA compliance

**Key Panels**:
1. **API P95 Latency** - Shows SLA compliance (<300ms target)
2. **Error Rate** - Must stay below 1% for SLA
3. **SLA Compliance** - Overall availability percentage
4. **Requests Per Second** - Live traffic visualization
5. **Business KPIs** - Real-time bookings, messages, AI costs

**When to Use**:
- During deployments
- When investigating incidents
- Monitoring high-traffic events
- Checking SLA compliance

### Application Performance Dashboard

**Refresh**: 15 seconds
**Use Case**: Performance optimization, bottleneck identification

**Key Panels**:
1. **Request Duration by Route** - Identify slow endpoints
2. **Top 10 Slowest Routes** - Prioritize optimization
3. **Webhook Processing Time** - Monitor async operations
4. **Queue Jobs Waiting** - Detect backlog buildup

### Business Metrics Dashboard

**Refresh**: 1 minute
**Use Case**: Business analytics, growth tracking

**Key Panels**:
1. **Total Bookings (24h)** - Daily booking volume
2. **Cancellation Rate** - Customer satisfaction indicator
3. **Active Users (24h)** - User engagement
4. **AI Token Usage** - Cost monitoring

---

## SLA Tracking

### Defined SLAs

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **API P95 Latency** | < 300ms | > 300ms | > 1000ms |
| **Error Rate** | < 1% | > 1% | > 2% |
| **Availability** | > 99.9% | < 99.9% | < 99% |
| **Database P95** | < 50ms | > 50ms | > 200ms |
| **Cache Hit Rate** | > 95% | < 95% | < 80% |

### SLA Compliance Queries

#### Calculate Uptime %

```promql
# Last 24 hours
(1 - (sum(increase(http_requests_total{status=~"5.."}[24h])) / sum(increase(http_requests_total[24h])))) * 100
```

#### API Latency SLA

```promql
# P95 latency < 300ms
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) < 0.3
```

#### Error Budget

```promql
# Remaining error budget (1% = 100% budget)
100 - ((sum(rate(http_requests_total{status=~"5.."}[24h])) / sum(rate(http_requests_total[24h]))) * 100 / 0.01)
```

---

## Best Practices

### 1. Metric Naming

✅ **Good**: `http_requests_total`, `db_query_duration_seconds`
❌ **Bad**: `requests`, `query_time`

**Rules**:
- Use descriptive names
- Include units in name (`_seconds`, `_bytes`, `_total`)
- Follow Prometheus conventions

### 2. Label Cardinality

✅ **Good**: `{status="200"}` (finite values)
❌ **Bad**: `{user_id="12345"}` (infinite values)

**Rules**:
- Keep label values finite (< 100 unique values)
- Never use user IDs, timestamps, or UUIDs as labels
- Use aggregatable dimensions

### 3. Performance Impact

**Minimize overhead**:
- Metrics collection adds ~1-2ms per request
- Use histograms sparingly (they create multiple time series)
- Avoid excessive label combinations

**Example** - Good label design:

```javascript
// ✅ Good - Finite label values
trackDbQuery('booking', 'findMany', startTime);

// ❌ Bad - Infinite label values
trackDbQuery('booking', `findMany-${userId}`, startTime); // Don't do this!
```

### 4. Update Frequency

**Counters**: Increment on every event
**Gauges**: Update periodically (every 10-60 seconds)
**Histograms**: Observe on every measurement

```javascript
// Counter - increment immediately
trackMessageSent('text');

// Gauge - update periodically
setInterval(() => {
  const activeCount = await getActiveBookings();
  updateActiveBookings('haircut', activeCount);
}, 30000); // Every 30 seconds
```

### 5. Error Tracking

Always track both success and failure:

```javascript
try {
  const result = await apiCall();
  trackApiCall(endpoint, startTime);
  return result;
} catch (error) {
  trackApiCall(endpoint, startTime, error); // Pass error
  throw error;
}
```

### 6. Cost Monitoring

Track OpenAI costs to avoid surprises:

```javascript
// Check hourly spend
const hourlyCost = await prometheus.query('increase(openai_cost_estimate_usd[1h])');

if (hourlyCost > 10) { // $10/hour threshold
  logger.warn(`High OpenAI cost: $${hourlyCost}/hour`);
  // Maybe disable AI features temporarily
}
```

---

## Troubleshooting

### Metrics Not Appearing

**Problem**: `/metrics` endpoint returns empty or incomplete data

**Solutions**:

```bash
# 1. Check if prom-client is installed
npm list prom-client

# 2. Verify metrics middleware is loaded
curl http://localhost:4000/metrics | grep "# HELP"

# 3. Make some requests to generate metrics
for i in {1..10}; do curl http://localhost:4000/healthz; done

# 4. Check metrics again
curl http://localhost:4000/metrics | grep http_requests_total
```

### Dashboard Shows "No Data"

**Problem**: Grafana dashboard panels are empty

**Solutions**:

1. **Check Prometheus targets**:
   - Visit http://localhost:9090/targets
   - Ensure backend target is "UP"

2. **Verify scrape config**:
   ```yaml
   # monitoring/prometheus.yml
   - job_name: 'backend'
     static_configs:
       - targets: ['backend:4000']
   ```

3. **Test query in Prometheus**:
   - Go to http://localhost:9090/graph
   - Run: `http_requests_total`
   - Should show results

4. **Check Grafana datasource**:
   - Configuration → Data Sources → Prometheus
   - Click "Test" - should show "Data source is working"

### High Memory Usage

**Problem**: Prometheus using too much memory

**Cause**: Too many unique label combinations (high cardinality)

**Solution**:

```bash
# Find high-cardinality metrics
curl http://localhost:9090/api/v1/label/__name__/values | jq -r '.data[]' | while read metric; do
  echo "$metric: $(curl -s "http://localhost:9090/api/v1/query?query=count($metric)" | jq -r '.data.result[0].value[1]')"
done | sort -t: -k2 -nr | head -10
```

Fix by reducing label cardinality in your code.

### Metrics Lag Behind

**Problem**: Dashboards show old data

**Solutions**:

1. **Reduce scrape interval**:
   ```yaml
   # monitoring/prometheus.yml
   scrape_interval: 5s  # Instead of 15s
   ```

2. **Increase dashboard refresh**:
   - Dashboard settings → Time options → Refresh: 5s

3. **Use instant queries** for current values:
   ```promql
   http_requests_in_progress  # No rate() needed
   ```

### Cost Tracking Inaccurate

**Problem**: `openai_cost_estimate_usd` doesn't match bill

**Cause**: Pricing estimates are approximate

**Solution**:

Update pricing in `metrics.js`:

```javascript
// Update these values based on current OpenAI pricing
if (model.includes('gpt-4')) {
  promptCost = (promptTokens / 1000) * 0.03;  // Update rate
  completionCost = (completionTokens / 1000) * 0.06;  // Update rate
}
```

---

## Advanced Usage

### Custom Metrics

Create your own metrics:

```javascript
const { metrics } = require('./src/middleware/metrics');
const client = require('prom-client');

// Create custom counter
const customEventsTotal = new client.Counter({
  name: 'custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type'],
  registers: [metrics.register]
});

// Use it
customEventsTotal.inc({ event_type: 'special_action' });
```

### Recording Rules

For expensive queries, create recording rules:

```yaml
# monitoring/prometheus.yml
groups:
  - name: api_recording
    interval: 30s
    rules:
      - record: api:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

Then use in dashboards:

```promql
# Instead of expensive histogram query
api:http_request_duration_seconds:p95
```

### Alerting on Business Metrics

```yaml
# monitoring/alerts/business.yml
- alert: NoBookingsIn30Minutes
  expr: increase(bookings_created_total[30m]) == 0
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "No bookings created in 30 minutes"
    description: "Possible issue with booking system"
```

---

## Summary

You now have comprehensive application metrics covering:

- ✅ **HTTP Performance** - Latency, throughput, errors, response sizes
- ✅ **Business KPIs** - Bookings, messages, AI conversations
- ✅ **Database** - Query performance, connection pools, slow queries
- ✅ **External APIs** - WhatsApp/OpenAI latency, errors, costs
- ✅ **Cache** - Redis hit rates, operation latency
- ✅ **Queues** - Processing time, backlog size
- ✅ **SLA Tracking** - Real-time compliance monitoring

**Next Steps**:

1. Integrate metrics into your application code
2. Set up alerts for critical thresholds
3. Create custom dashboards for your specific needs
4. Monitor SLA compliance daily
5. Optimize based on metrics insights

For questions or issues, refer to the [MONITORING_SETUP_GUIDE.md](./MONITORING_SETUP_GUIDE.md) or check Prometheus/Grafana documentation.

Happy monitoring! 📊
