# Authentication Pages - Quick Reference

## Page Routes

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | User authentication |
| Register | `/register` | New user signup (3-step form) |
| Forgot Password | `/forgot-password` | Request password reset email |
| Reset Password | `/reset-password?token=[token]` | Create new password |
| Verify Email | `/verify-email?token=[token]` | Email verification |

## Features Summary

### Register Page
- **3-step wizard:** Basic Info → Business Info → Subscription Plan
- **Password strength meter:** Real-time validation
- **Plan selection:** Starter ($29), Professional ($79), Enterprise ($199)
- **Validation:** Email, password requirements, terms acceptance

### Forgot Password Page
- **Email submission:** Sends reset link
- **Rate limiting:** 60-second cooldown
- **Success state:** Shows sent confirmation
- **Resend option:** If email not received

### Reset Password Page
- **Token validation:** From URL query params
- **Password strength:** Live strength indicator
- **Requirements checklist:** Visual feedback for password rules
- **Auto-redirect:** 5-second countdown to login on success
- **Error handling:** Expired/invalid token detection

### Verify Email Page
- **Auto-verification:** Triggers on page load
- **Loading state:** Spinner during verification
- **Success redirect:** Auto-redirect to dashboard (5 seconds)
- **Resend option:** For expired tokens
- **Multiple states:** Loading, success, error, expired, resend

## Key Components Used

```tsx
// UI Components (from @/components/ui)
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge } from '@/components/ui';
import { Checkbox } from '@/components/ui/Checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Icons (from lucide-react)
import { Mail, Lock, User, Building2, Phone, MapPin, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
```

## Validation Schemas

### Password Requirements
```typescript
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*, etc.)
```

### Email Format
```typescript
- Standard email validation
- RFC compliant regex
```

### Phone Format
```typescript
- Minimum 10 digits
- Allows: +, -, spaces, ()
- Example: +1 (555) 000-0000
```

## API Endpoints (To Be Implemented)

| Endpoint | Method | Request Body | Success Response | Error Response |
|----------|--------|--------------|------------------|----------------|
| `/api/auth/register` | POST | `{ name, email, password, salonName, phone, address, plan, termsAccepted }` | `{ success: true }` | `{ message: string }` |
| `/api/auth/forgot-password` | POST | `{ email }` | `{ success: true }` | `{ message: string }` (429 for rate limit) |
| `/api/auth/reset-password` | POST | `{ token, password }` | `{ success: true }` | `{ message: string }` (400 for invalid token) |
| `/api/auth/verify-email` | POST | `{ token }` | `{ success: true }` | `{ message: string }` (400 for expired) |
| `/api/auth/resend-verification` | POST | `{ email }` | `{ success: true }` | `{ message: string }` |

## Common Patterns

### Form Validation (React Hook Form + Zod)
```tsx
const {
  register,
  handleSubmit,
  formState: { errors },
  watch,
  trigger,
} = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onBlur',
});
```

### Error Display
```tsx
{error && (
  <div className="flex items-start gap-3 rounded-md bg-error-50 border border-error-200 p-3" role="alert">
    <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
    <p className="text-sm text-error-700">{error}</p>
  </div>
)}
```

### Loading State
```tsx
<Button
  type="submit"
  variant="primary"
  loading={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Processing...' : 'Submit'}
</Button>
```

## User Flows

### 1. Complete Registration
```
/register → Step 1 (Basic) → Step 2 (Business) → Step 3 (Plan) →
/verify-email?email=[email] → Check email → Click link →
/verify-email?token=[token] → /dashboard
```

### 2. Password Reset
```
/login → Click "Forgot password?" → /forgot-password →
Enter email → Check email → Click reset link →
/reset-password?token=[token] → Create new password → /login
```

### 3. Email Verification (standalone)
```
Receive email → Click verification link →
/verify-email?token=[token] → Auto-verify → /dashboard
```

## Styling Patterns

### Color Classes
- **Primary:** `bg-primary-500`, `text-primary-600`, `border-primary-500`
- **Success:** `bg-success-50`, `text-success-700`, `border-success-200`
- **Error:** `bg-error-50`, `text-error-700`, `border-error-200`
- **Info:** `bg-info-50`, `text-info-700`, `border-info-200`
- **Warning:** `bg-warning-50`, `text-warning-700`, `border-warning-200`
- **Neutral:** `bg-neutral-50`, `text-neutral-600`, `border-neutral-200`

### Spacing
- Small gap: `gap-2` (0.5rem)
- Medium gap: `gap-3` (0.75rem)
- Large gap: `gap-4` (1rem)
- Section spacing: `space-y-4`

### Typography
- Card title: `text-xl font-semibold`
- Card description: `text-sm text-neutral-500`
- Form label: `text-sm font-medium`
- Error text: `text-sm text-error-700`
- Help text: `text-xs text-neutral-600`

## Accessibility Attributes

```tsx
// Form inputs
<Input
  aria-invalid={hasError}
  aria-describedby={error ? `${id}-error` : undefined}
/>

// Error messages
<p id={`${id}-error`} role="alert">{error}</p>

// Loading states
<div role="status">
  <LoadingSpinner />
  <span className="sr-only">Loading...</span>
</div>

// Alerts
<div role="alert" aria-live="polite">
  {message}
</div>
```

## Testing URLs

For local development:

```bash
# Login
http://localhost:3000/login

# Register
http://localhost:3000/register

# Forgot Password
http://localhost:3000/forgot-password

# Reset Password (requires token)
http://localhost:3000/reset-password?token=sample-token-here

# Verify Email (with token)
http://localhost:3000/verify-email?token=sample-token-here

# Verify Email (resend mode)
http://localhost:3000/verify-email?email=user@example.com
```

## File Locations

```
Frontend/
└── src/
    └── app/
        └── (auth)/
            ├── layout.tsx
            ├── login/page.tsx
            ├── register/page.tsx
            ├── forgot-password/page.tsx
            ├── reset-password/page.tsx
            └── verify-email/page.tsx
```

## Quick Tips

1. **Password Strength:** Green = Strong (75%+), Yellow = Medium (50-74%), Red = Weak (<50%)
2. **Rate Limiting:** Forgot password has 60-second cooldown
3. **Token Expiry:** Reset tokens expire in 1 hour, verification tokens in 24 hours
4. **Auto-redirects:** Both reset success and verify success auto-redirect after 5 seconds
5. **Mobile First:** All pages are fully responsive and touch-friendly
6. **Keyboard Navigation:** All forms support Tab, Enter, and Escape keys
7. **Screen Readers:** All pages have proper ARIA labels and roles

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Token invalid" error | User clicked old link; use "Request new link" button |
| Password strength not updating | Check regex patterns in passwordSchema |
| Rate limit error | Wait for countdown to complete |
| Email not received | Check spam folder, use resend button |
| Form not submitting | Check browser console for validation errors |

---

**Last Updated:** October 20, 2025
