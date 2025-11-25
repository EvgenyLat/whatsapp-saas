# Onboarding Wizard - Quick Start Guide

## What Was Built

A comprehensive 4-step onboarding wizard that guides new users through:
1. Creating their salon
2. Adding their first service
3. Configuring WhatsApp (optional)
4. Completion and redirection to dashboard

## Files Created/Modified

### New Files
- `Frontend/src/app/(onboarding)/layout.tsx` - Onboarding layout
- `Frontend/src/app/(onboarding)/onboarding/page.tsx` - Wizard component

### Modified Files
- `Frontend/src/app/(auth)/register/page.tsx` - Now redirects to `/onboarding`
- `Frontend/src/hooks/useAuth.ts` - Login checks for salon existence

## How It Works

### Registration Flow
```
User Registers → Redirected to /onboarding → Complete 4 Steps → Dashboard
```

### Login Flow
```
User Logs In → Check Salon
  ├─ Has Salon → Dashboard
  └─ No Salon → /onboarding
```

## Quick Test

1. **Start Backend**
   ```bash
   cd Backend
   npm run start:dev
   ```

2. **Start Frontend**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test Onboarding**
   - Navigate to http://localhost:3001/register
   - Create a new account
   - You'll be redirected to /onboarding
   - Complete all 4 steps
   - Verify redirect to /dashboard

## Step-by-Step Overview

### Step 1: Salon Creation
**Fields**: Name, Address, Phone, Description (optional)
**API**: `POST /api/v1/salons`
**Validation**: Name 3-100 chars, phone 10+ digits

### Step 2: Service Creation
**Fields**: Name, Category, Duration, Price, Description (optional)
**API**: `POST /api/v1/services/{salonId}`
**Validation**: Duration 15-480 min, category from dropdown

### Step 3: WhatsApp Config (Optional)
**Fields**: API Token, Phone Number ID, Verify Token
**API**: `PUT /api/v1/salons/{salonId}` (if not skipped)
**Action**: Can skip this step

### Step 4: Completion
**Display**: Success message, summary, next steps
**Action**: "Go to Dashboard" clears localStorage and redirects

## Features

- Form validation with Zod
- Progress persistence in localStorage
- Loading states and error handling
- Mobile-responsive design
- Back button navigation
- Step-by-step validation
- API integration with React Query

## Key Technical Details

### State Management
- **Form**: React Hook Form
- **API**: React Query (TanStack Query)
- **Persistence**: localStorage (`onboarding_progress`)
- **Auth**: Zustand store

### Validation Rules
```typescript
Salon Name: 3-100 characters
Address: 5+ characters
Phone: 10+ digits, format: /^[0-9+\-\s()]+$/
Service Duration: 15-480 minutes
Price: ≥ 0 (converted to cents for API)
```

### API Endpoints Used
```
POST   /api/v1/salons           - Create salon
POST   /api/v1/services/:id     - Create service
PUT    /api/v1/salons/:id       - Update WhatsApp config
GET    /api/v1/salons           - Check salon existence (login)
```

## Important Notes

1. **Price Format**: Frontend sends price in cents (multiplies by 100)
2. **Service Categories**: Must match backend enum
3. **Placeholder Token**: Step 1 uses `'placeholder_token'` for access_token
4. **Progress Saving**: Automatically saves after each step
5. **Logout Clears**: Should clear `onboarding_progress` from localStorage

## Common Issues

### "Salon not created" error
- Check backend is running
- Verify JWT token in request
- Check backend logs for validation errors

### Progress not saving
- Check if localStorage is enabled
- Disable private browsing
- Clear localStorage and retry

### Stuck on loading
- Check network tab for failed requests
- Verify CORS settings
- Check API timeout (default: 30s)

## Browser Console Debugging

```javascript
// Check localStorage
localStorage.getItem('onboarding_progress')

// Check auth state
localStorage.getItem('auth-storage')

// Clear progress and restart
localStorage.removeItem('onboarding_progress')
```

## Next Steps

1. **Backend Verification**
   - Ensure all API endpoints exist
   - Verify service category enum matches
   - Test price storage in cents

2. **Testing**
   - Run manual tests (see full report)
   - Test on mobile devices
   - Test with slow network

3. **Deployment**
   - Review security checklist
   - Add analytics tracking (optional)
   - Configure environment variables

## Full Documentation

See `ONBOARDING_IMPLEMENTATION_REPORT.md` for:
- Detailed architecture
- Complete testing guide
- API specifications
- Security considerations
- Future enhancements
- Troubleshooting guide

## Support

Questions? Check the full implementation report or contact:
- Frontend Team
- Backend Team
- Product Manager

---

**Status**: ✅ Ready for Testing
**Version**: 1.0.0
**Date**: 2025-10-25
