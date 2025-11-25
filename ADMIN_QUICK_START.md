# Admin Panel - Quick Start Guide

## Overview

This guide will help you quickly understand and work with the newly created admin panel.

## Access the Admin Panel

### 1. Create a Super Admin User

If you don't have a super admin user yet, create one in your database:

```sql
-- Example SQL (adjust for your database schema)
INSERT INTO users (id, email, password_hash, role, first_name, last_name)
VALUES (
  'uuid-here',
  'admin@platform.com',
  'hashed-password',
  'SUPER_ADMIN',
  'Admin',
  'User'
);
```

Or use your backend API to create one programmatically.

### 2. Login

1. Navigate to `http://localhost:3001/login`
2. Enter super admin credentials
3. You'll be automatically redirected to `/admin`

### 3. Explore the Admin Panel

The admin panel has 5 main sections:

- **Overview** (`/admin`) - Platform statistics and health
- **Salons** (`/admin/salons`) - Manage all salons
- **Users** (`/admin/users`) - Manage all users
- **Analytics** (`/admin/analytics`) - Platform analytics
- **System** (`/admin/system`) - Configuration and logs

---

## Understanding the Code

### Key Files to Know

```
Frontend/src/
├── middleware.ts                          # Route protection - START HERE
├── app/(admin)/admin/                     # All admin pages
└── components/admin/                      # Admin components
```

### 1. How Route Protection Works

**File**: `Frontend/src/middleware.ts`

```typescript
// Middleware checks:
// 1. Is user authenticated?
// 2. What is their role?
// 3. Route them accordingly

const adminPaths = ['/admin'];

// Super admin trying to access /dashboard → redirect to /admin
// Regular user trying to access /admin → redirect to /dashboard
```

### 2. Admin Layout Structure

**File**: `Frontend/src/app/(admin)/layout.tsx`

```typescript
// Simple wrapper that includes:
// - AdminSidebar (dark themed navigation)
// - Header (reused from main app)
// - Content area for child pages
```

### 3. Reusable DataTable Component

**File**: `Frontend/src/components/admin/DataTable.tsx`

**Example Usage**:

```typescript
import { DataTable, Column } from '@/components/admin';

// Define your columns
const columns: Column<YourType>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (item) => <strong>{item.name}</strong>
  },
  // ... more columns
];

// Use the table
<DataTable
  data={yourData}
  columns={columns}
  searchable
  searchPlaceholder="Search..."
  pagination={{
    page: currentPage,
    limit: 10,
    total: totalItems,
    onPageChange: setCurrentPage
  }}
  actions={(item) => (
    <button onClick={() => handleEdit(item)}>Edit</button>
  )}
/>
```

---

## Adding API Integration

### Step 1: Create API Client

Create `Frontend/src/lib/api/admin.ts`:

```typescript
import { apiClient } from './client';

export const adminApi = {
  // Get platform stats
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  // Get all salons
  getSalons: async (params) => {
    const response = await apiClient.get('/admin/salons', { params });
    return response.data;
  },

  // Add more methods...
};
```

### Step 2: Create React Query Hook

Create `Frontend/src/hooks/admin/useAdminStats.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
```

### Step 3: Use in Component

Update `Frontend/src/app/(admin)/admin/page.tsx`:

```typescript
import { useAdminStats } from '@/hooks/admin/useAdminStats';

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <StatCard
        title="Total Salons"
        value={stats.totalSalons}
        // ...
      />
    </div>
  );
}
```

---

## Common Tasks

### Task 1: Add a New Admin Page

1. Create the page file:
```bash
mkdir Frontend/src/app/(admin)/admin/your-page
touch Frontend/src/app/(admin)/admin/your-page/page.tsx
```

2. Add to sidebar navigation:
```typescript
// Frontend/src/components/admin/AdminSidebar.tsx
const adminNavItems: NavItem[] = [
  // ... existing items
  {
    label: 'Your Page',
    href: '/admin/your-page',
    icon: YourIcon,
  },
];
```

### Task 2: Add a New Column to DataTable

```typescript
// Add to your columns array
{
  key: 'new_field',
  label: 'New Field',
  sortable: true,
  render: (item) => (
    <span className="text-sm">{item.new_field}</span>
  ),
}
```

### Task 3: Add a Modal/Dialog

```typescript
// 1. Add state
const [showModal, setShowModal] = useState(false);

// 2. Add button to trigger
<button onClick={() => setShowModal(true)}>
  Open Modal
</button>

// 3. Add modal component
{showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Modal Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your form or content */}
        <button onClick={() => setShowModal(false)}>
          Close
        </button>
      </CardContent>
    </Card>
  </div>
)}
```

### Task 4: Add Action Button

```typescript
// In your DataTable usage
actions={(item) => (
  <div className="flex gap-2">
    <button
      onClick={() => handleYourAction(item)}
      className="rounded-md p-2 text-primary-600 hover:bg-primary-50"
      title="Your action"
    >
      <YourIcon className="h-4 w-4" />
    </button>
  </div>
)}
```

---

## Styling Guide

### Color Palette

```typescript
// Admin panel uses a dark sidebar for distinction
// Colors from Tailwind config:

primary: '#3b82f6',    // Blue - main actions
success: '#10b981',    // Green - positive indicators
warning: '#f59e0b',    // Orange - warnings
error: '#ef4444',      // Red - errors/destructive actions
neutral: '#6b7280',    // Gray - general text/borders
```

### Common Patterns

```typescript
// Status badge
<span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-success-100 text-success-700">
  Active
</span>

// Action button
<button className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100">
  <Icon className="h-4 w-4" />
</button>

// Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

---

## Debugging Tips

### 1. Check User Role

```typescript
// In any component
import { useAuthStore } from '@/store/useAuthStore';

const { user, isSuperAdmin } = useAuthStore();
console.log('Current user:', user);
console.log('Is super admin:', isSuperAdmin());
```

### 2. Check Route Protection

```typescript
// middleware.ts has console.error for auth failures
// Check browser console for middleware messages
```

### 3. Inspect API Calls

```typescript
// React Query Devtools (already installed)
// Open browser console and click "⚛️ React Query" tab
```

### 4. Test Role-Based Routing

```typescript
// Test these scenarios:

// 1. SUPER_ADMIN user:
// - Should access /admin ✓
// - Should NOT access /dashboard (redirected to /admin)

// 2. SALON_ADMIN user:
// - Should access /dashboard ✓
// - Should NOT access /admin (redirected to /dashboard)
```

---

## API Endpoint Checklist

Refer to `ADMIN_API_ENDPOINTS.md` for the complete list. Start with these high-priority endpoints:

**Must Have**:
- [ ] `GET /api/admin/stats` - Platform statistics
- [ ] `GET /api/admin/salons` - List salons
- [ ] `POST /api/admin/salons` - Create salon
- [ ] `GET /api/admin/users` - List users

**Should Have**:
- [ ] `PUT /api/admin/salons/:id` - Update salon
- [ ] `PATCH /api/admin/users/:id/change-role` - Change user role
- [ ] `GET /api/admin/analytics/messages` - Message analytics

**Nice to Have**:
- [ ] `GET /api/admin/system/audit-logs` - Audit logs
- [ ] `GET /api/admin/system/error-logs` - Error logs

---

## Testing Checklist

### Manual Testing

```bash
# 1. Authentication & Routing
[ ] Login as SUPER_ADMIN → should go to /admin
[ ] Login as SALON_ADMIN → should go to /dashboard
[ ] SALON_ADMIN tries /admin → should redirect to /dashboard
[ ] SUPER_ADMIN tries /dashboard → should redirect to /admin

# 2. Navigation
[ ] Click all sidebar links → pages load correctly
[ ] Mobile menu works (< 1024px width)
[ ] Sidebar stays open on desktop

# 3. Data Tables
[ ] Search works
[ ] Pagination works
[ ] Sorting works (click column headers)
[ ] Action buttons are clickable

# 4. Responsive Design
[ ] Test on mobile (320px+)
[ ] Test on tablet (768px+)
[ ] Test on desktop (1024px+)
```

---

## Common Issues & Solutions

### Issue 1: Can't Access Admin Panel

**Problem**: "403 Forbidden" or redirected to dashboard

**Solution**:
```typescript
// Check user role in database
// Should be 'SUPER_ADMIN' exactly (case-sensitive)

// Check auth-storage cookie in browser:
// 1. Open DevTools → Application → Cookies
// 2. Find 'auth-storage'
// 3. Decode the JSON value
// 4. Check state.user.role === 'SUPER_ADMIN'
```

### Issue 2: Sidebar Not Showing

**Problem**: Sidebar is hidden or not rendering

**Solution**:
```typescript
// Check if useUIStore is working:
import { useUIStore } from '@/store/useUIStore';

const { sidebarOpen, toggleSidebar } = useUIStore();
console.log('Sidebar open:', sidebarOpen);

// Toggle it manually:
toggleSidebar();
```

### Issue 3: Mock Data Not Showing

**Problem**: Tables are empty

**Solution**:
```typescript
// Check console for errors
// Verify data is defined:
console.log('Table data:', mockSalons);

// Check DataTable props:
<DataTable
  data={mockSalons}  // Should be an array
  columns={columns}   // Should be an array
  // ...
/>
```

---

## Performance Tips

### 1. Optimize Re-renders

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // ...
});

// Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort(/* ... */);
}, [data]);
```

### 2. Implement Virtual Scrolling

For very large lists (1000+ items), consider react-window:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>{items[index]}</div>
  )}
</FixedSizeList>
```

### 3. Use Server-Side Pagination

```typescript
// Instead of client-side pagination
// Let backend handle it:
const { data } = useAdminSalons({
  page: currentPage,
  limit: 10,
  // Backend returns only 10 items per page
});
```

---

## Next Steps

1. **Implement Backend API**
   - Follow `ADMIN_API_ENDPOINTS.md`
   - Start with high-priority endpoints
   - Add authentication/authorization middleware

2. **Create API Client**
   - Add `Frontend/src/lib/api/admin.ts`
   - Implement methods for each endpoint
   - Add error handling

3. **Create React Query Hooks**
   - Add hooks in `Frontend/src/hooks/admin/`
   - One hook per endpoint
   - Add proper caching strategies

4. **Replace Mock Data**
   - Update each admin page
   - Use the React Query hooks
   - Add loading and error states

5. **Add Modals**
   - Create/Edit salon modal
   - Create/Edit user modal
   - Confirmation dialogs

6. **Testing**
   - Manual testing first
   - Then add unit tests
   - Finally E2E tests

---

## Resources

- **Full Documentation**: See `ADMIN_PANEL_SUMMARY.md`
- **API Spec**: See `ADMIN_API_ENDPOINTS.md`
- **Architecture**: See `ADMIN_PANEL_ARCHITECTURE.md`
- **React Query Docs**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Recharts**: https://recharts.org/en-US/

---

## Get Help

If you encounter issues:

1. Check the browser console for errors
2. Check the network tab for failed requests
3. Review the middleware logs (server console)
4. Check React Query Devtools for cache state
5. Verify user role in auth-storage cookie

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
