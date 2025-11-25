# WhatsApp SaaS API Quick Reference

**Base URL:** `http://localhost:3000/api` (development)
**Authentication:** JWT Bearer Token required for all endpoints

---

## Quick Links

- [Masters API](#masters-api) - Staff/employee management
- [Services API](#services-api) - Service catalog management
- [Bookings API](#bookings-api) - Appointment scheduling
- [Analytics API](#analytics-api) - Dashboard statistics

---

## Authentication

### Get Access Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "user": { ... }
}
```

**Use in requests:**
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Masters API

### List All Masters

```bash
GET /api/masters?page=1&limit=10&is_active=true
```

### Create Master

```bash
POST /api/masters
{
  "salon_id": "uuid",
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+1234567890",
  "specialization": ["haircut", "coloring"],
  "working_hours": {
    "monday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "tuesday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "wednesday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "thursday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "friday": { "enabled": true, "start": "09:00", "end": "18:00" },
    "saturday": { "enabled": true, "start": "10:00", "end": "16:00" },
    "sunday": { "enabled": false }
  }
}
```

### Get Master Availability

```bash
GET /api/masters/{id}/availability?date=2025-10-26&duration_minutes=60
```

### Get Master Weekly Schedule

```bash
GET /api/masters/{id}/schedule?week_start=2025-10-21
```

---

## Services API

### List All Services

```bash
GET /api/services?category=HAIRCUT&is_active=true
```

### Create Service

```bash
POST /api/services
{
  "salon_id": "uuid",
  "name": "Premium Haircut",
  "description": "Professional haircut with styling",
  "duration_minutes": 60,
  "price": 50.00,
  "category": "HAIRCUT"
}
```

**Available Categories:**
- HAIRCUT
- COLORING
- MANICURE
- PEDICURE
- FACIAL
- MASSAGE
- WAXING
- OTHER

### Get Category Statistics

```bash
GET /api/services/categories?salon_id=uuid
```

---

## Bookings API

### List All Bookings

```bash
# Basic list
GET /api/bookings?page=1&limit=20

# Filter by master
GET /api/bookings?master_id=uuid&start_date=2025-10-01

# Filter by service
GET /api/bookings?service_id=uuid&status=CONFIRMED

# Combined filters
GET /api/bookings?master_id=uuid&service_id=uuid&start_date=2025-10-01&end_date=2025-10-31
```

### Create Booking

```bash
POST /api/bookings
{
  "salon_id": "uuid",
  "customer_phone": "+1234567890",
  "customer_name": "Jane Doe",
  "service": "Premium Haircut",
  "start_ts": "2025-10-26T14:00:00.000Z",
  "master_id": "master-uuid",      # Optional - assign staff
  "service_id": "service-uuid",    # Optional - auto-calculates end_ts
  "booking_code": "BK-12345"       # Optional - auto-generated
}
```

**Status Values:**
- CONFIRMED (default)
- IN_PROGRESS
- COMPLETED
- CANCELLED
- NO_SHOW

### Update Booking

```bash
PATCH /api/bookings/{id}
{
  "master_id": "new-master-uuid",    # Reassign to different staff
  "service_id": "new-service-uuid",  # Change service
  "start_ts": "2025-10-26T15:00:00.000Z"
}
```

### Update Booking Status

```bash
PATCH /api/bookings/{id}/status
{
  "status": "COMPLETED"
}
```

### Cancel Booking

```bash
DELETE /api/bookings/{id}
```

---

## Analytics API

### Get Dashboard Statistics

```bash
GET /api/analytics/dashboard?salon_id=uuid

# Response
{
  "success": true,
  "data": {
    "totalBookings": 150,
    "todayBookings": 5,
    "activeChats": 12,
    "responseRate": 95.5,
    "bookingsByStatus": {
      "CONFIRMED": 20,
      "COMPLETED": 100,
      "CANCELLED": 15,
      "NO_SHOW": 10,
      "PENDING": 5
    },
    "recentActivity": {
      "bookings": 25,
      "messages": 150,
      "newCustomers": 8
    },
    "trends": {
      "bookingsChange": 15.5,
      "messagesChange": -5.2,
      "responseRateChange": 2.1
    }
  },
  "timestamp": "2025-10-25T10:00:00.000Z"
}
```

---

## Common Filters

### Pagination (all list endpoints)

```bash
?page=1&limit=20
```

### Search (masters, services)

```bash
?search=john
```

### Date Range (bookings)

```bash
?start_date=2025-10-01T00:00:00.000Z&end_date=2025-10-31T23:59:59.999Z
```

### Active Status (masters, services)

```bash
?is_active=true
```

---

## Response Format

### Success Response

```json
{
  "id": "uuid",
  "name": "Resource Name",
  "created_at": "2025-10-25T10:00:00.000Z",
  ...
}
```

### Paginated Response

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## Rate Limits

- **Default:** 100 requests per minute per user
- **Headers:** Check `X-RateLimit-*` headers in response

---

## Testing with cURL

### Create Master

```bash
curl -X POST http://localhost:3000/api/masters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Sarah Johnson",
    "email": "sarah@example.com",
    "phone": "+12025550123",
    "specialization": ["haircut", "coloring"],
    "working_hours": {
      "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "saturday": {"enabled": true, "start": "10:00", "end": "16:00"},
      "sunday": {"enabled": false}
    }
  }'
```

### Create Booking with Master & Service

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_phone": "+12025550199",
    "customer_name": "John Doe",
    "service": "Premium Haircut",
    "start_ts": "2025-10-26T14:00:00.000Z",
    "master_id": "650e8400-e29b-41d4-a716-446655440001",
    "service_id": "750e8400-e29b-41d4-a716-446655440002"
  }'
```

### Get Bookings for a Master

```bash
curl -X GET "http://localhost:3000/api/bookings?master_id=650e8400-e29b-41d4-a716-446655440001&start_date=2025-10-01T00:00:00.000Z&end_date=2025-10-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Swagger Documentation

Interactive API documentation available at:

```
http://localhost:3000/api/docs
```

---

**Quick Tips:**

1. **Always authenticate** - All endpoints require JWT token
2. **Verify salon ownership** - Users can only access their salon's data
3. **Use UUIDs** - All IDs are UUID v4 format
4. **ISO 8601 dates** - Use format: `2025-10-26T14:00:00.000Z`
5. **Phone format** - Use E.164 format: `+1234567890`
6. **Pagination** - Default page=1, limit=10
7. **Soft deletes** - DELETE endpoints deactivate, not remove

---

**Last Updated:** 2025-10-25
