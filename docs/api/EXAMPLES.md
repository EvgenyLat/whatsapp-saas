# API Request & Response Examples

**Last Updated: January 18, 2025**

---

## Table of Contents

1. [Health & Monitoring](#health--monitoring)
2. [Salon Management](#salon-management)
3. [Booking Management](#booking-management)
4. [Message History](#message-history)
5. [Analytics & Statistics](#analytics--statistics)
6. [AI Analytics](#ai-analytics)
7. [Webhook Events](#webhook-events)
8. [System Administration](#system-administration)
9. [Error Responses](#error-responses)

---

## Health & Monitoring

### GET / - Root Endpoint

Get basic API information and status.

**Request:**
```http
GET / HTTP/1.1
Host: api.example.com
```

**cURL:**
```bash
curl https://api.example.com/
```

**Response:** `200 OK`
```json
{
  "message": "WhatsApp SaaS Starter is running",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

### GET /healthz - Health Check

Comprehensive health check for all services.

**Request:**
```http
GET /healthz HTTP/1.1
Host: api.example.com
```

**cURL:**
```bash
curl https://api.example.com/healthz
```

**Response:** `200 OK` (All services healthy)
```json
{
  "status": "ok",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "uptime": 1234567,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321,
    "external": 1234567,
    "arrayBuffers": 123456
  },
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 5,
      "connections": 10,
      "maxConnections": 100
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "latency": 2
    },
    "queues": {
      "status": "healthy",
      "counts": {
        "completed": 1000,
        "failed": 5,
        "delayed": 0,
        "active": 3,
        "waiting": 10
      }
    }
  }
}
```

**Response:** `503 Service Unavailable` (Database unhealthy)
```json
{
  "status": "error",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "uptime": 1234567,
  "memory": { /* ... */ },
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "error",
      "error": "Connection timeout"
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "latency": 2
    },
    "queues": {
      "status": "healthy",
      "counts": { /* ... */ }
    }
  }
}
```

---

### GET /metrics - Prometheus Metrics

Get Prometheus-formatted metrics.

**Request:**
```http
GET /metrics HTTP/1.1
Host: api.example.com
```

**cURL:**
```bash
curl https://api.example.com/metrics
```

**Response:** `200 OK`
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/healthz",status="200"} 1000
http_requests_total{method="POST",path="/webhook",status="200"} 500
http_requests_total{method="GET",path="/admin/salons",status="200"} 50

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005"} 500
http_request_duration_seconds_bucket{le="0.01"} 800
http_request_duration_seconds_bucket{le="0.05"} 950
http_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP database_query_duration_seconds Database query duration in seconds
# TYPE database_query_duration_seconds histogram
database_query_duration_seconds_bucket{le="0.01"} 800
database_query_duration_seconds_bucket{le="0.05"} 950
database_query_duration_seconds_bucket{le="0.1"} 990
database_query_duration_seconds_bucket{le="+Inf"} 1000
```

---

### GET /metrics/database - Database Metrics

Get detailed database metrics.

**Request:**
```http
GET /metrics/database HTTP/1.1
Host: api.example.com
```

**cURL:**
```bash
curl https://api.example.com/metrics/database
```

**Response:** `200 OK`
```json
{
  "pool": {
    "total": 10,
    "idle": 7,
    "active": 3,
    "waiting": 0,
    "max": 100
  },
  "queries": {
    "total": 15000,
    "slow": 45,
    "failed": 2,
    "avgDuration": 12.5,
    "p95Duration": 45.2,
    "p99Duration": 89.5
  },
  "tables": {
    "salons": {
      "rowCount": 150,
      "size": "2.5 MB"
    },
    "bookings": {
      "rowCount": 5000,
      "size": "15 MB"
    },
    "messages": {
      "rowCount": 25000,
      "size": "50 MB"
    }
  },
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

## Salon Management

### POST /admin/salons - Create Salon

Create a new salon.

**Request:**
```http
POST /admin/salons HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-admin-token: YOUR_ADMIN_TOKEN_HERE

{
  "name": "Hair Studio Downtown",
  "phone_number_id": "987654321",
  "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**cURL:**
```bash
curl -X POST https://api.example.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Hair Studio Downtown",
    "phone_number_id": "987654321",
    "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

**JavaScript:**
```javascript
const response = await fetch('https://api.example.com/admin/salons', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
  },
  body: JSON.stringify({
    name: 'Hair Studio Downtown',
    phone_number_id: '987654321',
    access_token: 'EAAGxxxxxxxxxxxxxxxxxxxxxxxx'
  })
});

const salon = await response.json();
console.log('Created salon:', salon);
```

**Python:**
```python
import requests

headers = {
    'Content-Type': 'application/json',
    'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
}

payload = {
    'name': 'Hair Studio Downtown',
    'phone_number_id': '987654321',
    'access_token': 'EAAGxxxxxxxxxxxxxxxxxxxxxxxx'
}

response = requests.post(
    'https://api.example.com/admin/salons',
    headers=headers,
    json=payload
)

salon = response.json()
print('Created salon:', salon)
```

**Response:** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hair Studio Downtown",
  "phone_number_id": "987654321",
  "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx",
  "created_at": "2025-01-18T10:00:00.000Z",
  "updated_at": "2025-01-18T10:00:00.000Z"
}
```

---

### POST /admin/salons - Update Salon

Update an existing salon by providing the `id` field.

**Request:**
```http
POST /admin/salons HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-admin-token: YOUR_ADMIN_TOKEN_HERE

{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hair Studio Downtown (Updated)",
  "phone_number_id": "987654321",
  "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**cURL:**
```bash
curl -X POST https://api.example.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "Hair Studio Downtown (Updated)",
    "phone_number_id": "987654321",
    "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

**Response:** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hair Studio Downtown (Updated)",
  "phone_number_id": "987654321",
  "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx",
  "created_at": "2025-01-18T10:00:00.000Z",
  "updated_at": "2025-01-18T10:30:00.000Z"
}
```

---

### GET /admin/salons - List All Salons

Retrieve all registered salons.

**Request:**
```http
GET /admin/salons HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl https://api.example.com/admin/salons \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**JavaScript:**
```javascript
const response = await fetch('https://api.example.com/admin/salons', {
  headers: {
    'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
  }
});

const salons = await response.json();
console.log('Salons:', salons);
```

**Response:** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "Hair Studio Downtown",
    "phone_number_id": "987654321",
    "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx",
    "created_at": "2025-01-18T10:00:00.000Z",
    "updated_at": "2025-01-18T10:00:00.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "name": "Spa & Wellness Center",
    "phone_number_id": "123456789",
    "access_token": "EAAGyyyyyyyyyyyyyyyyyyyyyyyy",
    "created_at": "2025-01-17T15:30:00.000Z",
    "updated_at": "2025-01-17T15:30:00.000Z"
  }
]
```

---

## Booking Management

### GET /admin/bookings/:salonId - Get Bookings

Retrieve bookings for a specific salon with pagination and filtering.

**Request:**
```http
GET /admin/bookings/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?page=1&limit=20&status=confirmed HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl "https://api.example.com/admin/bookings/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?page=1&limit=20&status=confirmed" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**JavaScript:**
```javascript
const salonId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  status: 'confirmed'
});

const response = await fetch(
  `https://api.example.com/admin/bookings/${salonId}?${params}`,
  {
    headers: {
      'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
    }
  }
);

const data = await response.json();
console.log('Bookings:', data);
```

**Python:**
```python
import requests

salon_id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
params = {
    'page': 1,
    'limit': 20,
    'status': 'confirmed'
}

response = requests.get(
    f'https://api.example.com/admin/bookings/{salon_id}',
    headers={'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'},
    params=params
)

data = response.json()
print('Bookings:', data)
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "booking_code": "ABC123",
      "salon_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "customer_phone": "+1234567890",
      "customer_name": "John Doe",
      "service": "Haircut",
      "start_ts": "2025-01-19T14:00:00.000Z",
      "status": "confirmed",
      "created_at": "2025-01-18T10:30:00.000Z"
    },
    {
      "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8g",
      "booking_code": "DEF456",
      "salon_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "customer_phone": "+9876543210",
      "customer_name": "Jane Smith",
      "service": "Hair Coloring",
      "start_ts": "2025-01-19T16:00:00.000Z",
      "status": "confirmed",
      "created_at": "2025-01-18T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Message History

### GET /admin/messages/:salonId - Get Messages

Retrieve message history for a specific salon with pagination and filtering.

**Request:**
```http
GET /admin/messages/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?page=1&limit=50&direction=inbound HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl "https://api.example.com/admin/messages/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?page=1&limit=50&direction=inbound" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**JavaScript:**
```javascript
const salonId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const params = new URLSearchParams({
  page: '1',
  limit: '50',
  direction: 'inbound'
});

const response = await fetch(
  `https://api.example.com/admin/messages/${salonId}?${params}`,
  {
    headers: {
      'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
    }
  }
);

const data = await response.json();
console.log('Messages:', data);
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8g9h",
      "salon_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "customer_phone": "+1234567890",
      "direction": "inbound",
      "message_type": "text",
      "content": "I would like to book an appointment tomorrow at 2pm",
      "metadata": {
        "whatsapp_message_id": "wamid.abc123xyz",
        "intent": "booking",
        "ai_confidence": 0.95
      },
      "timestamp": "2025-01-18T10:30:00.000Z",
      "created_at": "2025-01-18T10:30:01.000Z"
    },
    {
      "id": "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8g9h0i",
      "salon_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "customer_phone": "+9876543210",
      "direction": "inbound",
      "message_type": "text",
      "content": "What are your prices for haircuts?",
      "metadata": {
        "whatsapp_message_id": "wamid.def456uvw",
        "intent": "faq",
        "ai_confidence": 0.98
      },
      "timestamp": "2025-01-18T10:35:00.000Z",
      "created_at": "2025-01-18T10:35:01.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5000,
    "pages": 100
  }
}
```

---

## Analytics & Statistics

### GET /admin/stats/:salonId - Get Salon Statistics

Retrieve aggregated statistics for a salon.

**Request:**
```http
GET /admin/stats/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl "https://api.example.com/admin/stats/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**JavaScript:**
```javascript
const salonId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const startDate = '2025-01-01T00:00:00Z';
const endDate = '2025-01-31T23:59:59Z';

const response = await fetch(
  `https://api.example.com/admin/stats/${salonId}?startDate=${startDate}&endDate=${endDate}`,
  {
    headers: {
      'x-admin-token': 'YOUR_ADMIN_TOKEN_HERE'
    }
  }
);

const stats = await response.json();
console.log('Stats:', stats);
```

**Response:** `200 OK`
```json
{
  "period": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.000Z"
  },
  "messages": {
    "total": 1500,
    "inbound": 800,
    "outbound": 700,
    "avgPerDay": 48.4,
    "growth": 12.5
  },
  "bookings": {
    "total": 250,
    "confirmed": 200,
    "cancelled": 30,
    "completed": 180,
    "noShow": 20,
    "conversionRate": 0.25,
    "cancellationRate": 0.12
  },
  "conversations": {
    "total": 500,
    "active": 50,
    "resolved": 450,
    "avgDuration": 180,
    "avgMessages": 5.2,
    "resolutionRate": 0.90
  },
  "customers": {
    "total": 350,
    "new": 80,
    "returning": 270,
    "engaged": 200
  },
  "topServices": [
    {
      "service": "Haircut",
      "count": 120,
      "percentage": 48
    },
    {
      "service": "Hair Coloring",
      "count": 80,
      "percentage": 32
    },
    {
      "service": "Spa Treatment",
      "count": 50,
      "percentage": 20
    }
  ]
}
```

---

## AI Analytics

### GET /admin/ai/analytics/:salonId - Get AI Analytics

Retrieve comprehensive AI conversation analytics.

**Request:**
```http
GET /admin/ai/analytics/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl "https://api.example.com/admin/ai/analytics/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**Response:** `200 OK`
```json
{
  "period": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.000Z"
  },
  "intents": {
    "booking": 450,
    "cancel": 30,
    "faq": 200,
    "greeting": 100,
    "other": 120
  },
  "sentiment": {
    "positive": 600,
    "neutral": 250,
    "negative": 50,
    "avgScore": 0.75
  },
  "responseQuality": {
    "avgConfidence": 0.92,
    "highConfidence": 800,
    "mediumConfidence": 80,
    "lowConfidence": 20,
    "successRate": 0.95
  },
  "topTopics": [
    {
      "topic": "pricing",
      "count": 120,
      "percentage": 13.3
    },
    {
      "topic": "availability",
      "count": 100,
      "percentage": 11.1
    },
    {
      "topic": "services",
      "count": 90,
      "percentage": 10.0
    }
  ],
  "automationMetrics": {
    "fullyAutomated": 750,
    "partiallyAutomated": 100,
    "humanHandoff": 50,
    "automationRate": 0.83
  }
}
```

---

### GET /admin/ai/conversations/:salonId - Get Conversation Stats

Retrieve conversation-level statistics.

**Request:**
```http
GET /admin/ai/conversations/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-15T00:00:00Z&endDate=2025-01-18T23:59:59Z HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl "https://api.example.com/admin/ai/conversations/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d?startDate=2025-01-15T00:00:00Z&endDate=2025-01-18T23:59:59Z" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**Response:** `200 OK`
```json
{
  "period": {
    "start": "2025-01-15T00:00:00.000Z",
    "end": "2025-01-18T23:59:59.000Z"
  },
  "total": 150,
  "active": 20,
  "completed": 130,
  "avgDuration": 180,
  "avgMessages": 5.2,
  "resolutionRate": 0.89,
  "satisfactionScore": 0.92,
  "durationBuckets": {
    "0-60s": 30,
    "60-180s": 60,
    "180-300s": 40,
    "300s+": 20
  },
  "messageBuckets": {
    "1-3": 40,
    "4-6": 70,
    "7-10": 30,
    "11+": 10
  },
  "outcomes": {
    "bookingCreated": 80,
    "questionAnswered": 50,
    "cancelled": 10,
    "other": 10
  }
}
```

---

## Webhook Events

### POST /webhook - Receive Webhook Event

WhatsApp sends webhook events to this endpoint. Your server verifies the HMAC signature and processes events asynchronously.

**Request from WhatsApp:**
```http
POST /webhook HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-hub-signature-256: sha256=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1234567890",
              "phone_number_id": "987654321"
            },
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.HBgNMTIzNDU2Nzg5MAVReg==",
                "timestamp": "1642512000",
                "type": "text",
                "text": {
                  "body": "I would like to book an appointment tomorrow at 2pm"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:** `200 OK`
```
EVENT_RECEIVED
```

**Note:** Your server returns 200 immediately to acknowledge receipt. Processing happens asynchronously in background workers.

---

### GET /webhook - Webhook Verification

Meta Platform calls this endpoint during webhook setup to verify ownership.

**Request from Meta:**
```http
GET /webhook?hub.mode=subscribe&hub.verify_token=my_verify_token&hub.challenge=abc123xyz HTTP/1.1
Host: api.example.com
```

**Response:** `200 OK`
```
abc123xyz
```

---

## System Administration

### POST /admin/refresh-secrets - Refresh Secrets

Manually refresh secrets from AWS Secrets Manager.

**Request:**
```http
POST /admin/refresh-secrets HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl -X POST https://api.example.com/admin/refresh-secrets \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Secrets refreshed successfully",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

### GET /admin/secrets/health - Secrets Health Check

Check secrets management system health.

**Request:**
```http
GET /admin/secrets/health HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**cURL:**
```bash
curl https://api.example.com/admin/secrets/health \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE"
```

**Response:** `200 OK`
```json
{
  "initialized": true,
  "lastRefresh": "2025-01-18T09:00:00.000Z",
  "secretsLoaded": 12,
  "autoRotationEnabled": true,
  "nextRotation": "2025-01-25T09:00:00.000Z"
}
```

---

## Error Responses

### 400 Bad Request - Validation Error

Invalid request parameters or missing required fields.

**Request:**
```http
POST /admin/salons HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-admin-token: YOUR_ADMIN_TOKEN_HERE

{
  "name": "Hair Studio"
  // Missing required fields: phone_number_id, access_token
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "phone_number_id is required and must be a string",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "details": {
    "fields": [
      {
        "field": "phone_number_id",
        "error": "required"
      },
      {
        "field": "access_token",
        "error": "required"
      }
    ]
  }
}
```

---

### 401 Unauthorized - Missing or Invalid Token

Missing or invalid admin token.

**Request:**
```http
GET /admin/salons HTTP/1.1
Host: api.example.com
x-admin-token: invalid_token_here
```

**Response:** `401 Unauthorized`
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing admin token",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

### 404 Not Found - Route Not Found

Requested route does not exist.

**Request:**
```http
GET /admin/nonexistent HTTP/1.1
Host: api.example.com
x-admin-token: YOUR_ADMIN_TOKEN_HERE
```

**Response:** `404 Not Found`
```json
{
  "error": "Not Found",
  "message": "Route GET /admin/nonexistent not found",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

### 429 Too Many Requests - Rate Limit Exceeded

Rate limit exceeded for this endpoint.

**Request:**
```http
POST /webhook HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-hub-signature-256: sha256=...

{ /* ... */ }
```

**Response:** `429 Too Many Requests`
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60,
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

### 500 Internal Server Error - Server Error

Unexpected server error.

**Response:** `500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later.",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "requestId": "req_a1b2c3d4e5f6g7h8"
}
```

---

### 503 Service Unavailable - Service Unavailable

Service temporarily unavailable (maintenance, database down, etc.).

**Response:** `503 Service Unavailable`
```json
{
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable due to maintenance. Please try again later.",
  "timestamp": "2025-01-18T10:00:00.000Z",
  "retryAfter": 300
}
```

---

## Testing & Development

### Using Postman

1. Import the OpenAPI specification: `docs/api/openapi.yaml`
2. Create environment variables:
   - `base_url`: `https://api.example.com` (or `http://localhost:3000`)
   - `admin_token`: Your admin API token
3. Collection will auto-populate with all endpoints

### Using httpie

```bash
# Install httpie
pip install httpie

# List salons
http GET https://api.example.com/admin/salons \
  x-admin-token:YOUR_ADMIN_TOKEN_HERE

# Create salon
http POST https://api.example.com/admin/salons \
  x-admin-token:YOUR_ADMIN_TOKEN_HERE \
  name="Hair Studio" \
  phone_number_id="987654321" \
  access_token="EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Using curl with JSON files

```bash
# Create salon from JSON file
curl -X POST https://api.example.com/admin/salons \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN_HERE" \
  -d @salon.json

# Where salon.json contains:
# {
#   "name": "Hair Studio Downtown",
#   "phone_number_id": "987654321",
#   "access_token": "EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
# }
```

---

## Related Documentation

- [OpenAPI Specification](openapi.yaml) - Complete API reference
- [Authentication Guide](AUTHENTICATION.md) - Authentication & authorization details
- [Webhooks Guide](WEBHOOKS.md) - Webhook events and handling
- [Rate Limiting Guide](RATE_LIMITING.md) - Rate limiting details
- [Error Handling Guide](ERROR_HANDLING.md) - Error codes and responses

---

**Last Updated: January 18, 2025**
