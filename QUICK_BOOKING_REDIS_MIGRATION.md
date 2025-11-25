# QuickBookingService Redis Migration - Production Fix

**Date:** 2025-10-31
**Status:** Completed
**Branch:** 001-whatsapp-quick-booking

## Overview

Successfully migrated QuickBookingService from in-memory Map storage to production-ready Redis-based session management using the existing SessionContextService. This fix addresses critical production issues and implements backward compatibility for existing sessions.

## Changes Made

### 1. Removed In-Memory Map Storage

**Before:**
```typescript
// Session storage for button click context (in production, use Redis)
private readonly sessionStore = new Map<
  string,
  {
    intent: BookingIntent;
    slots: SlotSuggestion[];
    selectedSlot?: SlotSuggestion;
    salonId: string;
    sessionId: string;
    customerId: string;
    language: string;
    timestamp: number;
  }
>();

constructor(...) {
  // Clean up stale sessions every 15 minutes
  setInterval(() => this.cleanupStaleSessions(), 15 * 60 * 1000);
}
```

**After:**
```typescript
constructor(...) {
  // Session cleanup is handled by Redis TTL (30 minutes)
  // No need for interval-based cleanup
}
```

### 2. Added Optional Language Parameter to handleButtonClick

**Before:**
```typescript
async handleButtonClick(
  buttonId: string,
  customerPhone: string,
): Promise<...>
```

**After:**
```typescript
async handleButtonClick(
  buttonId: string,
  customerPhone: string,
  language?: string, // NEW: Optional language override
): Promise<...> {
  // Step 3: Determine language (priority: parameter > session > default)
  const lang = language || session?.language || 'en';

  // Store language in session if it was overridden
  if (language && language !== session.language) {
    await this.updateSessionLanguage(customerPhone, language);
  }
  // ...
}
```

### 3. Implemented Redis-Based Session Management

#### storeSession (Redis + Migration)
```typescript
private async storeSession(customerPhone: string, data: any): Promise<void> {
  try {
    // Migration: Ensure language field exists (default to 'en')
    const language = data.language || 'en';

    // Build BookingContext compatible with SessionContextService
    const context: BookingContext = {
      sessionId: data.sessionId,
      customerId: data.customerId,
      salonId: data.salonId,
      language: language as any, // Migrate to typed language
      originalIntent: {
        serviceName: data.intent?.serviceName,
        serviceId: data.intent?.serviceId,
        date: data.intent?.preferredDate,
        time: data.intent?.preferredTime,
        masterId: data.intent?.masterId,
        masterName: data.intent?.masterName,
      },
      choices: data.choices || [],
      createdAt: data.createdAt || new Date(),
      lastInteractionAt: new Date(),
    };

    // Store additional session data (slots, selectedSlot, intent)
    const extendedData = {
      ...context,
      slots: data.slots || [],
      selectedSlot: data.selectedSlot,
      intent: data.intent,
      timestamp: Date.now(),
    };

    // Save to Redis using SessionContextService
    await this.sessionContext.save(customerPhone, extendedData as any);

    this.logger.debug(`Session stored for ${customerPhone} (language: ${language})`);
  } catch (error) {
    this.logger.error(
      `Failed to store session for ${customerPhone}: ${(error as Error).message}`,
    );
    // Don't throw - graceful degradation
  }
}
```

#### getSession (Redis + Migration)
```typescript
private async getSession(customerPhone: string): Promise<any | null> {
  try {
    const context = await this.sessionContext.get(customerPhone);

    if (!context) {
      return null;
    }

    // Migration: Add language field if missing (backward compatibility)
    const migratedContext = {
      ...context,
      language: context.language || 'en', // Default to English for old sessions
    };

    // If language was missing, update the session
    if (!context.language) {
      this.logger.debug(
        `Migrating session for ${customerPhone}: adding language field (default: 'en')`,
      );
      await this.sessionContext.save(customerPhone, migratedContext as any);
    }

    this.logger.debug(`Session retrieved for ${customerPhone}`);
    return migratedContext;
  } catch (error) {
    this.logger.error(
      `Failed to get session for ${customerPhone}: ${(error as Error).message}`,
    );
    return null; // Graceful degradation
  }
}
```

#### clearSession (Redis)
```typescript
private async clearSession(customerPhone: string): Promise<void> {
  try {
    await this.sessionContext.delete(customerPhone);
    this.logger.debug(`Session cleared for ${customerPhone}`);
  } catch (error) {
    this.logger.error(
      `Failed to clear session for ${customerPhone}: ${(error as Error).message}`,
    );
    // Don't throw - graceful degradation
  }
}
```

#### updateSessionLanguage (New Method)
```typescript
private async updateSessionLanguage(
  customerPhone: string,
  language: string,
): Promise<void> {
  try {
    const session = await this.getSession(customerPhone);
    if (session) {
      session.language = language;
      await this.storeSession(customerPhone, session);
      this.logger.debug(
        `Language updated to '${language}' for ${customerPhone}`,
      );
    }
  } catch (error) {
    this.logger.error(
      `Failed to update language for ${customerPhone}: ${(error as Error).message}`,
    );
    // Don't throw - graceful degradation
  }
}
```

### 4. Updated All Method Calls to Async

- `await this.storeSession(...)` in handleBookingRequest
- `await this.getSession(...)` in handleButtonClick
- `await this.storeSession(...)` in handleSlotSelection
- `await this.clearSession(...)` in handleBookingConfirmation

## Migration Strategy

### Automatic Language Field Migration

The implementation includes automatic migration for old sessions without the `language` field:

1. **On Read (getSession):**
   - If session exists but has no `language` field → add `language: 'en'`
   - Save the migrated session back to Redis
   - Log the migration for debugging

2. **On Write (storeSession):**
   - Always ensure `language` field exists (default to `'en'`)
   - Preserve all other session data

3. **Language Override:**
   - New `language` parameter in `handleButtonClick`
   - Priority: parameter > session > default ('en')
   - Automatically updates session if language changes

### Backward Compatibility

The solution maintains full backward compatibility:

- Old sessions without `language` field are automatically migrated
- No breaking changes to existing APIs
- Graceful degradation if Redis is unavailable
- Session structure remains compatible with BookingContext type

## Production Benefits

### 1. Scalability
- **Before:** In-memory Map limited to single instance
- **After:** Redis allows horizontal scaling across multiple instances

### 2. Reliability
- **Before:** Sessions lost on server restart
- **After:** Sessions persist in Redis (30-minute TTL)

### 3. Performance
- **Before:** Manual cleanup every 15 minutes
- **After:** Redis TTL handles automatic cleanup

### 4. Monitoring
- SessionContextService provides:
  - `getActiveSessions()` - View all active sessions
  - `getStatistics()` - Session count and average TTL
  - `clearExpiredSessions()` - Manual cleanup if needed

## Testing Checklist

- [x] TypeScript compilation passes (no errors in QuickBookingService)
- [x] All session methods converted to async/await
- [x] Migration logic for old sessions implemented
- [x] Language parameter added to handleButtonClick
- [x] Graceful error handling for Redis failures
- [x] Backward compatibility maintained

## Files Modified

- **Backend/src/modules/ai/quick-booking.service.ts**
  - Removed in-memory Map storage
  - Implemented Redis-based session management
  - Added language parameter to handleButtonClick
  - Added migration logic for old sessions
  - Updated all session methods to async

## Architecture

```
┌─────────────────────────────────────┐
│   QuickBookingService               │
│                                     │
│  - handleBookingRequest()           │
│  - handleButtonClick(language?)     │ ← NEW: Optional language
│  - handleSlotSelection()            │
│  - handleBookingConfirmation()      │
│                                     │
│  Private Methods:                   │
│  - storeSession() → Redis           │ ← NEW: Uses SessionContextService
│  - getSession() → Redis             │ ← NEW: Auto-migrates old sessions
│  - clearSession() → Redis           │ ← NEW: Uses Redis delete
│  - updateSessionLanguage()          │ ← NEW: Language update helper
└─────────────────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────┐
│   SessionContextService             │
│                                     │
│  - save(phone, context)             │
│  - get(phone)                       │
│  - delete(phone)                    │
│  - update(phone, partial)           │
│                                     │
│  Redis Features:                    │
│  - 30-minute TTL                    │
│  - 100ms timeout                    │
│  - Graceful degradation             │
└─────────────────────────────────────┘
                 │
                 │ stores in
                 ▼
┌─────────────────────────────────────┐
│          Redis                      │
│                                     │
│  Key: booking:session:+1234567890   │
│  TTL: 1800 seconds (30 minutes)     │
│  Value: {                           │
│    sessionId: "sess_...",           │
│    language: "en",  ← Migrated      │
│    slots: [...],                    │
│    selectedSlot: {...},             │
│    ...                              │
│  }                                  │
└─────────────────────────────────────┘
```

## Language Priority Flow

```
handleButtonClick(buttonId, phone, language?)
        │
        ▼
┌───────────────────────────────────┐
│ Determine language:               │
│                                   │
│ 1. Parameter (if provided)        │
│ 2. Session.language (if exists)   │
│ 3. Default: 'en'                  │
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ If language changed:              │
│ → updateSessionLanguage()         │
│ → Save updated session to Redis   │
└───────────────────────────────────┘
```

## Session Migration Flow

```
getSession(customerPhone)
        │
        ▼
┌───────────────────────────────────┐
│ Retrieve from Redis               │
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ Check: context.language exists?   │
│                                   │
│ NO → Add language: 'en'           │
│   → Save migrated session         │
│   → Log migration                 │
│                                   │
│ YES → Return context as-is        │
└───────────────────────────────────┘
```

## Monitoring Commands

### Check Active Sessions
```typescript
const stats = await sessionContext.getStatistics();
console.log(`Total sessions: ${stats.totalSessions}`);
console.log(`Average TTL: ${stats.averageTTL}s`);
```

### View All Session Keys
```typescript
const sessions = await sessionContext.getActiveSessions();
console.log('Active sessions:', sessions);
```

### Manual Cleanup (if needed)
```typescript
const cleared = await sessionContext.clearExpiredSessions();
console.log(`Cleared ${cleared} expired sessions`);
```

## Error Handling

All session methods implement graceful degradation:

- **Redis unavailable:** Logs warning, continues without session
- **Parse error:** Logs error, returns null
- **Save failure:** Logs error, doesn't throw (allows booking to continue)
- **Delete failure:** Logs error, doesn't block completion

This ensures the booking flow remains functional even if Redis has issues.

## Next Steps (Optional Enhancements)

1. **Add Redis Health Check**
   - Implement health endpoint to monitor Redis connectivity
   - Alert if Redis is unavailable

2. **Add Session Metrics**
   - Track session creation/retrieval/deletion rates
   - Monitor average session duration

3. **Implement Session Compression**
   - Consider compressing large session data
   - Reduce Redis memory usage

4. **Add Session Backup**
   - Periodic snapshot to database
   - Restore sessions after Redis restart

## Conclusion

The migration from in-memory Map to Redis-based session management is complete and production-ready. The implementation includes:

- Full Redis integration via SessionContextService
- Automatic migration for old sessions
- Optional language parameter support
- Backward compatibility
- Graceful error handling
- Comprehensive logging

The QuickBookingService is now ready for horizontal scaling and production deployment.
