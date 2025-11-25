# Admin API Endpoints - Implementation Checklist

This document lists all the API endpoints needed for the super admin panel functionality.

## Overview

The admin panel requires additional endpoints beyond the standard salon owner endpoints. These endpoints should only be accessible to users with the `SUPER_ADMIN` role.

## Authentication & Authorization

All admin endpoints should:
- Require valid JWT authentication
- Check for `SUPER_ADMIN` role
- Return 403 Forbidden if user is not a super admin

## Required Endpoints

### 1. Platform Statistics (Admin Dashboard)

**GET /api/admin/stats**

Platform-wide overview statistics.

**Response:**
```typescript
{
  totalSalons: number;
  totalUsers: number;
  totalMessages: number;
  monthlyRevenue: number;
  activeSalons: number;
  newSalonsThisMonth: number;
  trends: {
    salons: number;      // % change
    users: number;
    messages: number;
    revenue: number;
  };
}
```

**GET /api/admin/activity**

Recent platform activity across all salons.

**Response:**
```typescript
{
  data: Array<{
    id: string;
    type: 'salon' | 'user' | 'message' | 'error';
    message: string;
    timestamp: string;
  }>;
}
```

**GET /api/admin/health**

System health status for all services.

**Response:**
```typescript
{
  data: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    lastCheck: string;
  }>;
}
```

---

### 2. Salons Management

**GET /api/admin/salons**

List all salons with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Search by salon name
- `is_active` (boolean, optional) - Filter by active status
- `sortBy` (string, optional) - Sort field
- `sortOrder` ('asc' | 'desc', optional)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    phone_number_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    total_users: number;
    total_bookings: number;
    total_messages: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

**GET /api/admin/salons/:id**

Get detailed information about a specific salon.

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    name: string;
    phone_number_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    users: Array<User>;
    stats: {
      total_bookings: number;
      total_messages: number;
      total_customers: number;
      revenue: number;
    };
  };
}
```

**POST /api/admin/salons**

Create a new salon (super admin only).

**Request Body:**
```typescript
{
  name: string;
  phone_number_id: string;
  access_token: string;
  owner_email: string;      // Email for the salon admin account
  owner_name: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    salon: Salon;
    owner: User;
  };
  message: string;
}
```

**PUT /api/admin/salons/:id**

Update salon information.

**Request Body:**
```typescript
{
  name?: string;
  phone_number_id?: string;
  access_token?: string;
  is_active?: boolean;
}
```

**PATCH /api/admin/salons/:id/toggle-active**

Toggle salon active status.

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    is_active: boolean;
  };
  message: string;
}
```

**DELETE /api/admin/salons/:id**

Delete a salon and all associated data (use with caution).

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 3. Users Management

**GET /api/admin/users**

List all users across all salons.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Search by name or email
- `role` (UserRole, optional) - Filter by role
- `salon_id` (string, optional) - Filter by salon
- `sortBy` (string, optional)
- `sortOrder` ('asc' | 'desc', optional)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    salon_id: string | null;
    salon_name?: string;
    isEmailVerified: boolean;
    created_at: string;
    last_login?: string;
  }>;
  pagination: PaginationMetadata;
}
```

**GET /api/admin/users/:id**

Get detailed information about a specific user.

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    salon_id: string | null;
    salon?: Salon;
    isEmailVerified: boolean;
    created_at: string;
    updated_at: string;
    last_login?: string;
    activity: {
      total_logins: number;
      total_actions: number;
    };
  };
}
```

**POST /api/admin/users**

Create a new user (any role).

**Request Body:**
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  salon_id?: string | null;
}
```

**PUT /api/admin/users/:id**

Update user information.

**Request Body:**
```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  salon_id?: string | null;
}
```

**PATCH /api/admin/users/:id/change-role**

Change user role.

**Request Body:**
```typescript
{
  role: UserRole;
}
```

**PATCH /api/admin/users/:id/deactivate**

Deactivate a user account.

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 4. Platform Analytics

**GET /api/admin/analytics/messages**

Message volume trends over time.

**Query Parameters:**
- `startDate` (ISO date string)
- `endDate` (ISO date string)
- `interval` ('hour' | 'day' | 'week' | 'month')

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    date: string;
    total: number;
    sent: number;
    received: number;
  }>;
}
```

**GET /api/admin/analytics/revenue**

Revenue analytics and growth.

**Query Parameters:**
- `startDate` (ISO date string)
- `endDate` (ISO date string)
- `interval` ('day' | 'week' | 'month')

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    period: string;
    revenue: number;
    growth: number;
  }>;
}
```

**GET /api/admin/analytics/users**

User and salon growth over time.

**Query Parameters:**
- `startDate` (ISO date string)
- `endDate` (ISO date string)
- `interval` ('day' | 'week' | 'month')

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    period: string;
    users: number;
    salons: number;
  }>;
}
```

**GET /api/admin/analytics/api-usage**

API endpoint usage distribution.

**Query Parameters:**
- `startDate` (ISO date string)
- `endDate` (ISO date string)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    endpoint: string;
    count: number;
    percentage: number;
  }>;
}
```

**GET /api/admin/analytics/top-salons**

Top performing salons by various metrics.

**Query Parameters:**
- `metric` ('messages' | 'revenue' | 'bookings')
- `limit` (number, default: 10)
- `startDate` (ISO date string, optional)
- `endDate` (ISO date string, optional)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    salon_id: string;
    salon_name: string;
    value: number;
    rank: number;
  }>;
}
```

---

### 5. System Settings & Monitoring

**GET /api/admin/system/config**

Get platform configuration settings.

**Response:**
```typescript
{
  success: boolean;
  data: {
    platform_name: string;
    max_salons: number | null;
    max_users_per_salon: number;
    message_rate_limit: number;
    session_timeout: number;
    backup_frequency: string;
    maintenance_mode: boolean;
  };
}
```

**PUT /api/admin/system/config**

Update platform configuration.

**Request Body:**
```typescript
{
  max_salons?: number | null;
  max_users_per_salon?: number;
  message_rate_limit?: number;
  session_timeout?: number;
  maintenance_mode?: boolean;
}
```

**GET /api/admin/system/audit-logs**

Get audit logs for all actions.

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `action` (string, optional) - Filter by action type
- `user_id` (string, optional)
- `resource_type` (string, optional)
- `startDate` (ISO date string, optional)
- `endDate` (ISO date string, optional)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    action: string;
    user_id: string;
    user_email: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
    ip_address: string;
    details?: any;
  }>;
  pagination: PaginationMetadata;
}
```

**GET /api/admin/system/error-logs**

Get error logs from the system.

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `level` ('error' | 'warning' | 'info', optional)
- `source` (string, optional)
- `startDate` (ISO date string, optional)
- `endDate` (ISO date string, optional)

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    source: string;
    stack_trace?: string;
    timestamp: string;
    count: number;
  }>;
  pagination: PaginationMetadata;
}
```

**GET /api/admin/system/database-stats**

Get database statistics.

**Response:**
```typescript
{
  success: boolean;
  data: {
    total_size: number;        // in bytes
    table_sizes: Record<string, number>;
    total_records: number;
    last_backup: string;
  };
}
```

---

## Implementation Priority

1. **High Priority** (Core functionality)
   - Platform statistics endpoints
   - Salons management (list, create, update, toggle active)
   - Users management (list, view, change role)

2. **Medium Priority** (Important features)
   - Analytics endpoints
   - Audit logs
   - Salon and user details

3. **Low Priority** (Nice to have)
   - Error logs
   - Database stats
   - Advanced configuration

---

## Security Considerations

1. **Role-Based Access Control**
   - All endpoints must verify `SUPER_ADMIN` role
   - Use middleware to enforce authorization
   - Log all admin actions

2. **Rate Limiting**
   - Implement rate limiting on sensitive endpoints
   - Separate limits for admin vs regular users

3. **Audit Logging**
   - Log all create, update, delete operations
   - Include user ID, IP address, timestamp
   - Store immutable audit trail

4. **Data Privacy**
   - Don't expose sensitive data (passwords, tokens)
   - Encrypt sensitive fields in responses
   - Implement data masking where appropriate

---

## Next Steps

1. Implement backend API endpoints following this spec
2. Create corresponding API client functions in `Frontend/src/lib/api/admin.ts`
3. Create React Query hooks in `Frontend/src/hooks/admin/`
4. Replace mock data in admin pages with actual API calls
5. Add error handling and loading states
6. Implement real-time updates where applicable (WebSockets/SSE)
