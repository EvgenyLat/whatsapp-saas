# Analytics API Specification

## Overview
This document specifies the required backend endpoints for the analytics dashboard system.

## Base URL
```
/api/v1/analytics
```

## Authentication
All endpoints require JWT authentication with valid salon access.

## Common Query Parameters
- `salon_id` (required): Salon identifier
- `start_date` (required): ISO date string (YYYY-MM-DD)
- `end_date` (required): ISO date string (YYYY-MM-DD)

## Endpoints

### 1. Staff Performance Analytics
```
GET /analytics/staff-performance
```

**Query Parameters:**
- `salon_id`: string (required)
- `start_date`: string (required, YYYY-MM-DD)
- `end_date`: string (required, YYYY-MM-DD)
- `master_id`: number (optional, filter specific staff)

**Response:**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "staff": [
      {
        "master_id": 1,
        "name": "Jane Smith",
        "total_bookings": 45,
        "revenue": 450000,
        "cancellation_rate": 5.2,
        "utilization_rate": 78.5,
        "popular_services": [
          {
            "service_name": "Haircut",
            "count": 25
          }
        ],
        "peak_hours": [
          {
            "hour": 14,
            "count": 12
          }
        ],
        "trend": "up",
        "average_rating": 4.8
      }
    ],
    "summary": {
      "total_bookings": 180,
      "total_revenue": 1800000,
      "average_utilization": 75.3
    }
  }
}
```

**Database Queries:**
```sql
-- Staff bookings and revenue
SELECT
  m.id as master_id,
  m.name,
  COUNT(b.id) as total_bookings,
  SUM(b.total_price) as revenue,
  (COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) * 100.0 / COUNT(*)) as cancellation_rate
FROM masters m
LEFT JOIN bookings b ON b.master_id = m.id
  AND b.start_ts BETWEEN :start_date AND :end_date
  AND b.salon_id = :salon_id
WHERE m.salon_id = :salon_id
GROUP BY m.id, m.name;

-- Popular services per staff
SELECT
  b.master_id,
  b.service as service_name,
  COUNT(*) as count
FROM bookings b
WHERE b.salon_id = :salon_id
  AND b.start_ts BETWEEN :start_date AND :end_date
GROUP BY b.master_id, b.service
ORDER BY count DESC
LIMIT 5;

-- Peak hours per staff
SELECT
  b.master_id,
  EXTRACT(HOUR FROM b.start_ts) as hour,
  COUNT(*) as count
FROM bookings b
WHERE b.salon_id = :salon_id
  AND b.start_ts BETWEEN :start_date AND :end_date
GROUP BY b.master_id, EXTRACT(HOUR FROM b.start_ts)
ORDER BY count DESC;
```

---

### 2. Service Performance Analytics
```
GET /analytics/service-performance
```

**Query Parameters:**
- `salon_id`: string (required)
- `start_date`: string (required)
- `end_date`: string (required)
- `category`: string (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "services": [
      {
        "service_id": 1,
        "name": "Haircut",
        "category": "Hair",
        "total_bookings": 125,
        "revenue": 625000,
        "avg_frequency": 4.2,
        "growth_rate": 12.5,
        "popular_times": [
          {
            "day": "Monday",
            "hour": 14,
            "count": 8
          }
        ],
        "conversion_rate": 68.5
      }
    ],
    "by_category": [
      {
        "category": "Hair",
        "total_bookings": 200,
        "revenue": 1000000,
        "avg_price": 5000,
        "growth_rate": 10.2
      }
    ]
  }
}
```

**Database Queries:**
```sql
-- Service performance
SELECT
  s.id as service_id,
  s.name,
  s.category,
  COUNT(b.id) as total_bookings,
  SUM(b.total_price) as revenue,
  COUNT(b.id) * 1.0 / DATEDIFF(:end_date, :start_date) as avg_frequency
FROM services s
LEFT JOIN bookings b ON b.service = s.name
  AND b.start_ts BETWEEN :start_date AND :end_date
  AND b.salon_id = :salon_id
WHERE s.salon_id = :salon_id
GROUP BY s.id, s.name, s.category;

-- Category aggregation
SELECT
  category,
  COUNT(*) as total_bookings,
  SUM(total_price) as revenue,
  AVG(total_price) as avg_price
FROM bookings b
JOIN services s ON b.service = s.name
WHERE b.salon_id = :salon_id
  AND b.start_ts BETWEEN :start_date AND :end_date
GROUP BY category;
```

---

### 3. Revenue Analytics
```
GET /analytics/revenue
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "total_revenue": 5000000,
    "period_comparison": 12.5,
    "by_category": [
      {
        "category": "Hair",
        "revenue": 2500000,
        "percentage": 50.0
      }
    ],
    "by_staff": [
      {
        "master_id": 1,
        "name": "Jane Smith",
        "revenue": 1200000,
        "percentage": 24.0
      }
    ],
    "by_day_of_week": [
      {
        "day": "Monday",
        "revenue": 750000
      }
    ],
    "trend_data": [
      {
        "date": "2024-01-01",
        "revenue": 25000,
        "bookings": 5
      }
    ],
    "payment_status": {
      "paid": 4500000,
      "pending": 450000,
      "failed": 50000
    },
    "metrics": {
      "average_transaction_value": 27778,
      "revenue_per_customer": 15625,
      "revenue_per_booking": 27778
    }
  }
}
```

**Database Queries:**
```sql
-- Total revenue and metrics
SELECT
  SUM(total_price) as total_revenue,
  AVG(total_price) as average_transaction_value,
  SUM(total_price) / COUNT(DISTINCT customer_phone) as revenue_per_customer,
  SUM(total_price) / COUNT(*) as revenue_per_booking
FROM bookings
WHERE salon_id = :salon_id
  AND start_ts BETWEEN :start_date AND :end_date;

-- Revenue by day
SELECT
  DATE(start_ts) as date,
  SUM(total_price) as revenue,
  COUNT(*) as bookings
FROM bookings
WHERE salon_id = :salon_id
  AND start_ts BETWEEN :start_date AND :end_date
GROUP BY DATE(start_ts)
ORDER BY date;

-- Revenue by day of week
SELECT
  DAYNAME(start_ts) as day,
  SUM(total_price) as revenue
FROM bookings
WHERE salon_id = :salon_id
  AND start_ts BETWEEN :start_date AND :end_date
GROUP BY DAYNAME(start_ts)
ORDER BY FIELD(DAYNAME(start_ts), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
```

---

### 4. Customer Analytics
```
GET /analytics/customers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "total_customers": 320,
    "new_customers": 45,
    "returning_customers": 275,
    "churn_rate": 8.5,
    "customer_lifetime_value": 156250,
    "average_bookings_per_customer": 2.8,
    "segmentation": {
      "by_frequency": [
        {
          "segment": "One-time",
          "count": 120,
          "percentage": 37.5
        },
        {
          "segment": "Occasional (2-5)",
          "count": 150,
          "percentage": 46.9
        },
        {
          "segment": "Regular (6-10)",
          "count": 40,
          "percentage": 12.5
        },
        {
          "segment": "Loyal (11+)",
          "count": 10,
          "percentage": 3.1
        }
      ],
      "by_spending": [
        {
          "tier": "Low ($0-$100)",
          "count": 160,
          "avg_spend": 5000
        },
        {
          "tier": "Medium ($100-$500)",
          "count": 120,
          "avg_spend": 25000
        },
        {
          "tier": "High ($500-$1000)",
          "count": 30,
          "avg_spend": 75000
        },
        {
          "tier": "VIP ($1000+)",
          "count": 10,
          "avg_spend": 150000
        }
      ],
      "by_service_preference": [
        {
          "category": "Hair",
          "count": 180
        },
        {
          "category": "Nails",
          "count": 120
        }
      ]
    },
    "growth_data": [
      {
        "date": "2024-01-01",
        "total_customers": 275,
        "new_customers": 5
      }
    ]
  }
}
```

**Database Queries:**
```sql
-- Customer counts
SELECT
  COUNT(DISTINCT customer_phone) as total_customers,
  COUNT(DISTINCT CASE WHEN created_at BETWEEN :start_date AND :end_date THEN customer_phone END) as new_customers
FROM bookings
WHERE salon_id = :salon_id;

-- Customer frequency segmentation
SELECT
  CASE
    WHEN booking_count = 1 THEN 'One-time'
    WHEN booking_count BETWEEN 2 AND 5 THEN 'Occasional (2-5)'
    WHEN booking_count BETWEEN 6 AND 10 THEN 'Regular (6-10)'
    ELSE 'Loyal (11+)'
  END as segment,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM (
  SELECT customer_phone, COUNT(*) as booking_count
  FROM bookings
  WHERE salon_id = :salon_id
  GROUP BY customer_phone
) customer_bookings
GROUP BY segment;

-- Spending tiers
SELECT
  CASE
    WHEN total_spent < 10000 THEN 'Low ($0-$100)'
    WHEN total_spent < 50000 THEN 'Medium ($100-$500)'
    WHEN total_spent < 100000 THEN 'High ($500-$1000)'
    ELSE 'VIP ($1000+)'
  END as tier,
  COUNT(*) as count,
  AVG(total_spent) as avg_spend
FROM (
  SELECT customer_phone, SUM(total_price) as total_spent
  FROM bookings
  WHERE salon_id = :salon_id
  GROUP BY customer_phone
) customer_spending
GROUP BY tier;
```

---

### 5. AI Performance Analytics
```
GET /analytics/ai-performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "total_conversations": 1250,
    "messages_processed": 8750,
    "successful_bookings": 425,
    "success_rate": 34.0,
    "average_response_time": 350,
    "token_usage": {
      "total_tokens": 2500000,
      "total_cost": 125.50,
      "average_per_conversation": 2000
    },
    "intent_analysis": {
      "intents": [
        {
          "intent": "booking_request",
          "count": 450,
          "conversion_rate": 85.5
        },
        {
          "intent": "information_request",
          "count": 380,
          "conversion_rate": 12.3
        }
      ],
      "failed_detections": 45
    },
    "usage_over_time": [
      {
        "date": "2024-01-01",
        "conversations": 42,
        "messages": 294,
        "tokens": 84000
      }
    ],
    "language_distribution": [
      {
        "language": "en",
        "count": 1000,
        "percentage": 80.0
      },
      {
        "language": "es",
        "count": 250,
        "percentage": 20.0
      }
    ],
    "performance_metrics": {
      "avg_conversation_length": 7.0,
      "avg_resolution_time": 180,
      "escalation_rate": 5.5
    }
  }
}
```

**Database Queries:**
```sql
-- AI conversation metrics
SELECT
  COUNT(*) as total_conversations,
  SUM(message_count) as messages_processed,
  AVG(response_time_ms) as average_response_time,
  SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) as successful_bookings,
  (SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM ai_conversations
WHERE salon_id = :salon_id
  AND created_at BETWEEN :start_date AND :end_date;

-- Token usage
SELECT
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost,
  AVG(tokens_used) as average_per_conversation
FROM ai_conversations
WHERE salon_id = :salon_id
  AND created_at BETWEEN :start_date AND :end_date;

-- Intent analysis
SELECT
  intent,
  COUNT(*) as count,
  (SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as conversion_rate
FROM ai_messages
WHERE salon_id = :salon_id
  AND created_at BETWEEN :start_date AND :end_date
  AND intent IS NOT NULL
GROUP BY intent
ORDER BY count DESC;
```

---

### 6. Export Analytics Data
```
GET /analytics/export/{type}
```

**Path Parameters:**
- `type`: string (staff | service | revenue | customer | ai)

**Query Parameters:**
- Same as respective analytics endpoint
- `format`: string (csv | pdf)

**Response:**
- Content-Type: `text/csv` or `application/pdf`
- File download with appropriate headers

**Example CSV Output:**
```csv
Staff Name,Bookings,Revenue,Utilization Rate,Cancellation Rate
Jane Smith,45,$4500.00,78.5%,5.2%
John Doe,38,$3800.00,65.3%,3.1%
```

**Implementation:**
```python
@router.get("/export/{type}")
async def export_analytics(
    type: str,
    salon_id: str,
    start_date: str,
    end_date: str,
    format: str = "csv",
    current_user: User = Depends(get_current_user)
):
    # Fetch data based on type
    data = await get_analytics_data(type, salon_id, start_date, end_date)

    if format == "csv":
        csv_content = generate_csv(data, type)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={type}-{date.today()}.csv"
            }
        )
    elif format == "pdf":
        pdf_content = generate_pdf(data, type)
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={type}-{date.today()}.pdf"
            }
        )
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "End date must be after start date"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to salon data"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "SALON_NOT_FOUND",
    "message": "Salon not found"
  }
}
```

---

## Performance Considerations

### Caching
- Implement Redis caching for frequently accessed date ranges
- Cache duration: 5-15 minutes depending on data freshness requirements
- Cache key format: `analytics:{type}:{salon_id}:{start_date}:{end_date}`

### Database Optimization
- Create indexes on:
  - `bookings.salon_id`
  - `bookings.start_ts`
  - `bookings.master_id`
  - `bookings.customer_phone`
  - `bookings.status`
  - `ai_conversations.salon_id`
  - `ai_conversations.created_at`

### Pagination
- For detail views with large datasets, implement cursor-based pagination
- Default limit: 100 items
- Maximum limit: 1000 items

### Rate Limiting
- 100 requests per minute per user
- 1000 requests per hour per salon

---

## Testing Requirements

### Unit Tests
- Test all calculation logic
- Test date range validation
- Test permission checks
- Test error handling

### Integration Tests
- Test with real database data
- Test export functionality
- Test caching behavior
- Test rate limiting

### Performance Tests
- Load test with 10,000+ bookings
- Test query execution time (target: <500ms)
- Test concurrent requests
- Test cache effectiveness

---

## Implementation Checklist

- [ ] Create database indexes
- [ ] Implement staff performance endpoint
- [ ] Implement service performance endpoint
- [ ] Implement revenue analytics endpoint
- [ ] Implement customer analytics endpoint
- [ ] Implement AI performance endpoint
- [ ] Implement export endpoint (CSV)
- [ ] Implement export endpoint (PDF)
- [ ] Add Redis caching layer
- [ ] Add rate limiting
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform load testing
- [ ] Update API documentation
- [ ] Deploy to staging
- [ ] Deploy to production

---

## Notes

1. **All monetary values are in cents** (e.g., $50.00 = 5000)
2. **All dates are in ISO format** (YYYY-MM-DD)
3. **All percentages are decimals** (e.g., 12.5% = 12.5, not 0.125)
4. **Timezone handling**: All timestamps should be in salon's local timezone
5. **Empty data**: Return empty arrays for missing data, never null
6. **Trend calculation**: Compare with same period length in previous period
