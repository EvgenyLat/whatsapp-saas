# Quick Start: AI Cache System

**Branch**: `001-ai-cache-system` | **Date**: 2025-11-01

## Overview

The AI Cache System reduces OpenAI API costs by 90% through intelligent caching of common responses. This guide helps you get started with implementation and testing.

## Prerequisites

- Node.js 20+ installed
- Redis server running locally or accessible
- PostgreSQL database configured
- NestJS application running
- OpenAI API key configured

## Installation

### 1. Install Dependencies

```bash
npm install redis ioredis @nestjs/cache-manager cache-manager-redis-store
npm install --save-dev @types/cache-manager
```

### 2. Configure Redis Connection

Add to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=86400

# Cache Configuration
CACHE_MAX_ITEMS=10000
CACHE_MAX_SIZE_MB=100
CACHE_MIN_CONFIDENCE=0.7
CACHE_DEFAULT_TTL_SECONDS=86400
```

### 3. Import Cache Module

In your main app module:

```typescript
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    // ... other modules
    CacheModule
  ],
})
export class AppModule {}
```

## Basic Usage

### Query the Cache

```typescript
import { CacheService } from './modules/cache/services/cache.service';

@Injectable()
export class AIService {
  constructor(private cacheService: CacheService) {}

  async processQuery(query: string, language: string): Promise<string> {
    // Try cache first
    const cached = await this.cacheService.get(query, language);
    if (cached) {
      return cached.response;
    }

    // Fall back to AI
    const aiResponse = await this.callOpenAI(query, language);

    // Cache if high confidence
    if (aiResponse.confidence >= 0.7) {
      await this.cacheService.set(
        query,
        language,
        aiResponse.text,
        aiResponse.confidence,
        'general' // category
      );
    }

    return aiResponse.text;
  }
}
```

### Warm the Cache

```typescript
// Warm cache with common queries
const commonQueries = [
  { query: "What are your hours?", language: "en", category: "hours" },
  { query: "Какой у вас график?", language: "ru", category: "hours" },
  { query: "How much does a haircut cost?", language: "en", category: "pricing" },
];

await cacheService.warmCache(commonQueries);
```

### Get Analytics

```typescript
// Get cache statistics
const stats = await cacheService.getStatistics('daily', startDate, endDate);
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Cost savings: $${stats.estimatedCostSavings}`);

// Get top queries
const topQueries = await cacheService.getTopQueries(10, 'en');
```

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/cache/query` | Query cache or AI |
| POST | `/api/v1/cache/warm` | Pre-populate cache |
| DELETE | `/api/v1/cache/invalidate` | Clear cache entries |
| GET | `/api/v1/cache/statistics` | Get performance metrics |
| GET | `/api/v1/cache/top-queries` | Get frequently cached queries |
| GET | `/api/v1/cache/health` | Check system health |

### Example API Calls

#### Query for Response

```bash
curl -X POST http://localhost:3000/api/v1/cache/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are your business hours?",
    "language": "en"
  }'
```

Response:
```json
{
  "response": "We are open Monday-Friday 9AM-6PM, Saturday 10AM-4PM",
  "cached": true,
  "responseTime": 45,
  "confidence": 0.95
}
```

#### Get Statistics

```bash
curl -X GET "http://localhost:3000/api/v1/cache/statistics?period=daily"
```

Response:
```json
{
  "period": "daily",
  "metrics": {
    "totalRequests": 10000,
    "cacheHits": 9000,
    "hitRate": 90.0,
    "estimatedCostSavings": 18.50,
    "avgCacheResponseTime": 45
  }
}
```

## Testing

### Unit Tests

```bash
# Run cache service tests
npm test -- cache.service.spec.ts

# Run with coverage
npm test -- --coverage cache
```

### Integration Tests

```bash
# Run integration tests
npm test -- cache-integration.spec.ts

# Test Redis connection
npm run test:redis
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance -- cache

# Load test the cache
npm run load-test -- --target cache --rps 1000
```

### Manual Testing

1. **Test Cache Hit**:
   ```bash
   # First call (cache miss)
   curl -X POST .../cache/query -d '{"query":"Hello","language":"en"}'

   # Second call (cache hit - should be faster)
   curl -X POST .../cache/query -d '{"query":"Hello","language":"en"}'
   ```

2. **Test Multi-Language**:
   ```bash
   # Test each language
   for lang in ru en es pt he; do
     curl -X POST .../cache/query \
       -d "{\"query\":\"Hello\",\"language\":\"$lang\"}"
   done
   ```

3. **Test Cache Invalidation**:
   ```bash
   # Clear pricing category
   curl -X DELETE ".../cache/invalidate?category=pricing"
   ```

## Monitoring

### Key Metrics to Track

1. **Performance Metrics**:
   - Cache hit rate (target: >90%)
   - Response time p95 (target: <100ms)
   - Cache size (limit: 100MB)

2. **Cost Metrics**:
   - Daily cost savings
   - AI API calls avoided
   - Cost per customer query

3. **Health Metrics**:
   - Redis connection status
   - Memory usage
   - Expired entries count

### Dashboard Access

Access the analytics dashboard at:
```
http://localhost:3000/admin/cache-analytics
```

### Alerts Configuration

Set up alerts for:
- Hit rate drops below 80%
- Response time exceeds 200ms
- Cache size exceeds 90MB
- Redis connection failures

## Troubleshooting

### Common Issues

#### 1. Low Hit Rate
- **Symptom**: Hit rate below 80%
- **Solution**: Review query normalization, increase cache TTL, warm cache with common queries

#### 2. Slow Cache Response
- **Symptom**: Response time >100ms
- **Solution**: Check Redis latency, optimize query normalization, review network configuration

#### 3. Cache Size Growing
- **Symptom**: Approaching 100MB limit
- **Solution**: Run maintenance, reduce TTLs, increase pruning frequency

#### 4. Redis Connection Issues
- **Symptom**: Fallback to AI for all queries
- **Solution**: Check Redis server, verify credentials, test network connectivity

### Debug Mode

Enable detailed logging:

```typescript
// In cache.service.ts
const DEBUG = process.env.CACHE_DEBUG === 'true';

if (DEBUG) {
  console.log('Cache key:', cacheKey);
  console.log('Normalized query:', normalizedQuery);
  console.log('Hit/Miss:', cached ? 'HIT' : 'MISS');
}
```

## Best Practices

### 1. Query Normalization
- Always normalize queries before caching
- Remove punctuation and extra spaces
- Convert to lowercase
- Sort words for order-independence

### 2. TTL Management
- Use category-specific TTLs
- Shorter TTL for dynamic content (availability: 1 hour)
- Longer TTL for static content (greetings: no expiration)

### 3. Quality Control
- Only cache responses with confidence >= 0.7
- Monitor and prune low-quality entries
- Track response accuracy metrics

### 4. Cost Optimization
- Pre-warm cache during off-peak hours
- Batch cache operations when possible
- Monitor cost savings dashboard

### 5. Error Handling
- Always implement graceful degradation
- Log all cache failures
- Monitor fallback rate to AI

## Architecture Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  WhatsApp   │────▶│Cache Service │────▶│    Redis    │
│   Client    │     │              │     │   (Cache)   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            │ (miss)
                            ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  AI Service  │────▶│   OpenAI    │
                    │              │     │     API     │
                    └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Analytics) │
                    └──────────────┘
```

## Next Steps

1. **Implement Core Service**: Start with `cache.service.ts`
2. **Add Query Normalization**: Implement normalization logic
3. **Create API Endpoints**: Build REST API layer
4. **Set Up Monitoring**: Configure metrics and alerts
5. **Write Tests**: Ensure comprehensive test coverage
6. **Deploy to Staging**: Test with real traffic patterns
7. **Monitor and Optimize**: Track metrics and fine-tune

## Support

For questions or issues:
- Check the [full documentation](./plan.md)
- Review the [API specification](./contracts/cache-api.yaml)
- Contact the development team

---

**Ready to start?** Begin with implementing the cache service in `Backend/src/modules/cache/services/cache.service.ts`