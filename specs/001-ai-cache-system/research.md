# Research: AI Cache System

**Branch**: `001-ai-cache-system` | **Date**: 2025-11-01
**Feature**: [AI Cache System](./spec.md)

## Executive Summary

This research document consolidates technical decisions for implementing the AI Cache System to achieve 90% reduction in OpenAI API costs through intelligent response caching.

## Technical Decisions

### 1. Cache Storage Solution

**Decision**: Redis with persistence enabled
**Rationale**:
- Sub-millisecond response times for cache hits
- Built-in TTL support for time-based expiration
- Distributed caching capability for horizontal scaling
- Native support for atomic operations
- Existing integration in the WhatsApp SaaS platform

**Alternatives Considered**:
- In-memory Map: Too limited for production scale, no persistence
- PostgreSQL: Higher latency (5-10ms vs <1ms), not optimized for key-value operations
- DynamoDB: Higher cost, unnecessary for this use case

### 2. Query Normalization Strategy

**Decision**: Multi-step normalization with SHA256 hashing
**Rationale**:
- Consistent hash generation across all queries
- Maximizes cache hit rate by treating similar queries identically
- Language-agnostic normalization preserves multi-language support

**Normalization Steps**:
1. Convert to lowercase
2. Remove extra whitespace
3. Remove punctuation (except language-specific characters)
4. Sort words alphabetically for order-independent matching
5. Generate SHA256 hash as cache key

**Alternatives Considered**:
- Fuzzy matching: Too computationally expensive for real-time lookups
- Exact matching only: Would miss 60-70% of cache opportunities
- Stemming/Lemmatization: Too complex for multi-language support

### 3. Cache Invalidation Strategy

**Decision**: Time-based expiration with category-specific TTLs
**Rationale**:
- Simple to implement and understand
- Aligns with business requirements for information freshness
- Prevents stale data issues automatically

**TTL Configuration**:
- Greetings: No expiration (static responses)
- Pricing: 7 days (weekly updates)
- Availability: 1 hour (dynamic information)
- Services: 30 days (rarely changes)
- General queries: 24 hours (default)

**Alternatives Considered**:
- Event-based invalidation: Too complex for initial implementation
- Manual invalidation: Prone to human error, operational overhead
- Fixed TTL for all: Doesn't match business needs

### 4. Multi-Language Support

**Decision**: Language-specific cache entries with shared normalization logic
**Rationale**:
- Preserves response quality in each language
- Allows language-specific optimizations
- Simplifies debugging and monitoring

**Implementation**:
- Cache key includes language code prefix (e.g., "ru:", "en:")
- Normalization rules adapt to language-specific characters
- Analytics track performance per language

**Alternatives Considered**:
- Translation-based caching: Would reduce response quality
- Single language cache: Wouldn't meet multi-language requirements

### 5. Quality Scoring System

**Decision**: Confidence-based scoring with minimum threshold
**Rationale**:
- Prevents low-quality responses from being cached
- Allows gradual improvement of cache quality
- Provides metrics for cache optimization

**Scoring Criteria**:
- AI confidence score (0.0-1.0)
- Response length validation
- Minimum threshold: 0.7 for caching
- Automatic pruning below 0.5

**Alternatives Considered**:
- No quality control: Risk of caching errors or nonsense
- Manual review: Not scalable
- User feedback scoring: Too slow for initial implementation

### 6. Analytics and Monitoring

**Decision**: Real-time metrics with PostgreSQL persistence
**Rationale**:
- Leverages existing database infrastructure
- Enables complex queries for business intelligence
- Supports compliance and audit requirements

**Metrics Tracked**:
- Hit rate per query category
- Cost savings (calculated from OpenAI pricing)
- Response time percentiles (p50, p95, p99)
- Cache size and memory usage
- Top queries by frequency

**Alternatives Considered**:
- External analytics service: Unnecessary cost
- Log-based analytics only: Harder to query
- No persistence: Would lose historical data

## Best Practices Applied

### Performance Optimization
- **Connection Pooling**: Reuse Redis connections
- **Batch Operations**: Process multiple cache operations together
- **Async/Await**: Non-blocking cache operations
- **Circuit Breaker**: Fail fast when cache is unavailable

### Error Handling
- **Graceful Degradation**: Continue without cache if Redis unavailable
- **Retry Logic**: Exponential backoff for transient failures
- **Error Logging**: Structured logging for debugging
- **Health Checks**: Monitor cache availability

### Security Considerations
- **No PII in Cache Keys**: Use hashed queries only
- **Encrypted Connections**: TLS for Redis in production
- **Access Control**: Redis AUTH and network isolation
- **Audit Logging**: Track cache operations for compliance

### Testing Strategy
- **Unit Tests**: Test normalization and scoring logic
- **Integration Tests**: Test Redis interactions
- **Performance Tests**: Validate <100ms response time
- **Load Tests**: Verify 1000 req/sec capability
- **Chaos Testing**: Test graceful degradation

## Implementation Roadmap

### Phase 1: Core Cache Service (Days 1-2)
- Cache service with Redis integration
- Query normalization implementation
- Basic get/set operations
- Error handling and graceful degradation

### Phase 2: Intelligence Layer (Day 3)
- Quality scoring system
- TTL management by category
- Multi-language support
- Automatic cache warming

### Phase 3: Analytics & Monitoring (Day 4)
- Metrics collection service
- Cost savings calculation
- Performance monitoring
- Analytics dashboard endpoints

### Phase 4: Integration & Testing (Day 5)
- Integration with AI service
- Comprehensive test suite
- Performance optimization
- Production deployment preparation

## Risk Mitigation

### Technical Risks
- **Redis Failure**: Mitigated by graceful degradation
- **Cache Poisoning**: Mitigated by quality scoring
- **Memory Overflow**: Mitigated by size limits and pruning
- **Performance Degradation**: Mitigated by circuit breakers

### Business Risks
- **Stale Information**: Mitigated by category-specific TTLs
- **Quality Issues**: Mitigated by confidence thresholds
- **Cost Overruns**: Mitigated by cache size limits

## Dependencies Validation

### Confirmed Available
- ✅ Redis infrastructure (already in use)
- ✅ NestJS framework (v10.x installed)
- ✅ PostgreSQL database (existing)
- ✅ OpenAI SDK (integrated)
- ✅ Jest testing framework (configured)

### No Additional Dependencies Required

## Conclusion

All technical decisions have been validated and no clarifications are needed. The implementation can proceed with Phase 1: Design & Contracts using the decisions documented above. The chosen approaches balance simplicity, performance, and maintainability while achieving the 90% cost reduction goal.