# 🚨 CRITICAL BUG REPORT - AI Cache Integration

**Date**: 2025-11-01  
**Severity**: 🔴 **CRITICAL**  
**Status**: ⚠️ **REQUIRES IMMEDIATE FIX**

---

## 🐛 Bug #1: METHOD SIGNATURE MISMATCH

### Location
`Backend/src/modules/ai/services/ai-intent.service.ts:509`

### Problem

**AI Intent Service вызывает:**
```typescript
const cached = await this.cacheService.get(text, normalizedLanguage);
```

**AiCacheService имеет метод:**
```typescript
async lookup(input: CacheLookupInput): Promise<CacheLookupResult>
```

**НЕТ метода `get(text, language)`!**

### Impact
- ❌ Code will NOT compile
- ❌ Runtime error: `this.cacheService.get is not a function`
- ❌ Integration completely broken
- ❌ MVP не работает

### Root Cause

Agent использовал **неправильное API** для cache service. 

**Должно быть:**
```typescript
// WRONG (current)
const cached = await this.cacheService.get(text, normalizedLanguage);

// CORRECT
const cached = await this.cacheService.lookup({
  query: text,
  language: normalizedLanguage,
  category: ResponseCategory.GENERAL, // or detect from context
});
```

---

## 🐛 Bug #2: SET METHOD ALSO WRONG

### Location
`Backend/src/modules/ai/services/ai-intent.service.ts:562`

### Problem

**AI Intent Service вызывает:**
```typescript
await this.cacheService.set(
  text,
  normalizedLanguage,
  JSON.stringify(result),
  result.confidence,
  category,
);
```

**AiCacheService имеет метод:**
```typescript
async store(input: CreateCachedResponseInput): Promise<boolean>
```

**НЕТ метода `set(text, lang, response, confidence, category)`!**

### Impact
- ❌ Code will NOT compile
- ❌ Runtime error: `this.cacheService.set is not a function`
- ❌ Caching не работает

### Root Cause

Agent использовал **неправильное API** для store method.

**Должно быть:**
```typescript
// WRONG (current)
await this.cacheService.set(
  text,
  normalizedLanguage,
  JSON.stringify(result),
  result.confidence,
  category,
);

// CORRECT
const normalizedQuery = QueryNormalizer.normalize(text, normalizedLanguage);

await this.cacheService.store({
  originalQuery: text,
  normalizedQuery: normalizedQuery,
  language: normalizedLanguage,
  responseText: JSON.stringify(result),
  confidenceScore: result.confidence,
  responseCategory: category,
  originalResponseTime: 0, // should be actual AI response time
});
```

---

## 🔧 REQUIRED FIXES

### Fix #1: Correct Cache Lookup

**File**: `Backend/src/modules/ai/services/ai-intent.service.ts`  
**Lines**: 507-520

**Replace:**
```typescript
// Check cache first if available
if (this.cacheService) {
  const cached = await this.cacheService.get(text, normalizedLanguage);
  if (cached) {
    this.logger.debug(`Cache hit for query: "${text.substring(0, 50)}..."`);

    // Parse cached result if it's a string (JSON)
    const cachedResult = typeof cached === 'string' ? JSON.parse(cached) : cached;

    // Return cached intent classification result
    return cachedResult as IntentClassificationResult;
  }
}
```

**With:**
```typescript
// Check cache first if available
if (this.cacheService) {
  const cacheResult = await this.cacheService.lookup({
    query: text,
    language: normalizedLanguage,
    category: ResponseCategory.GENERAL, // Will be refined after classification
  });
  
  if (cacheResult.hit && cacheResult.response) {
    this.logger.debug(`Cache hit for query: "${text.substring(0, 50)}..." (${cacheResult.responseTime}ms)`);

    // Parse cached result from responseText
    const cachedResult = JSON.parse(cacheResult.response.responseText);

    // Return cached intent classification result
    return cachedResult as IntentClassificationResult;
  }
}
```

---

### Fix #2: Correct Cache Store

**File**: `Backend/src/modules/ai/services/ai-intent.service.ts`  
**Lines**: 557-571

**Replace:**
```typescript
// Cache result if confidence is high enough and cache service is available
if (this.cacheService && result.confidence >= 0.7) {
  // Determine category based on intent type
  const category = this.mapIntentToCategory(result.intent);

  await this.cacheService.set(
    text,
    normalizedLanguage,
    JSON.stringify(result),
    result.confidence,
    category,
  );

  this.logger.debug(`Cached intent classification result for: "${text.substring(0, 50)}..."`);
}
```

**With:**
```typescript
// Cache result if confidence is high enough and cache service is available
if (this.cacheService && result.confidence >= 0.7) {
  // Determine category based on intent type
  const category = this.mapIntentToCategory(result.intent);

  // Normalize query for cache key
  const normalizedQuery = QueryNormalizer.normalize(text, normalizedLanguage);

  await this.cacheService.store({
    originalQuery: text,
    normalizedQuery: normalizedQuery,
    language: normalizedLanguage as any, // Type cast if needed
    responseText: JSON.stringify(result),
    confidenceScore: result.confidence,
    responseCategory: category,
    originalResponseTime: 0, // Intent classification doesn't track this
  });

  this.logger.debug(`Cached intent classification result for: "${text.substring(0, 50)}..."`);
}
```

---

### Fix #3: Add Missing Import

**File**: `Backend/src/modules/ai/services/ai-intent.service.ts`  
**Line**: 11

**Add:**
```typescript
import { QueryNormalizer } from '../../cache/utils/query-normalizer';
```

---

## 🧪 Verification Tests

After fixing, verify with:

```typescript
// Test 1: Cache lookup
const result1 = await aiIntentService.classifyIntent('Привет', 'ru');
console.log('First call (miss):', result1);

// Test 2: Cache hit
const result2 = await aiIntentService.classifyIntent('Привет', 'ru');
console.log('Second call (should be hit):', result2);

// Both should return same result, second should be faster
```

---

## 📊 Impact Assessment

### Current State
- ❌ Code does NOT compile
- ❌ Integration is BROKEN
- ❌ MVP is NOT functional
- ❌ Tests will FAIL

### After Fixes
- ✅ Code compiles
- ✅ Integration works
- ✅ MVP functional
- ✅ Tests pass

---

## 🎯 Severity Rating

| Category | Rating | Justification |
|----------|--------|---------------|
| Severity | 🔴 CRITICAL | Code doesn't work at all |
| Urgency | 🔴 HIGH | Blocks MVP deployment |
| Complexity | 🟡 MEDIUM | 3 simple fixes required |
| Time to Fix | 🟢 LOW | 15-30 minutes |

---

## ✅ Action Items

1. **IMMEDIATE**: Apply Fix #1 (cache lookup)
2. **IMMEDIATE**: Apply Fix #2 (cache store)
3. **IMMEDIATE**: Apply Fix #3 (add import)
4. **VERIFY**: Run TypeScript compiler (`npm run build`)
5. **VERIFY**: Run unit tests (`npm test`)
6. **VERIFY**: Run integration tests
7. **VERIFY**: Manual testing with real queries

---

## 📝 Lessons Learned

### What Went Wrong

1. **API Mismatch**: Agent assumed `get/set` methods exist without checking actual interface
2. **No Type Checking**: If TypeScript compiler was run, this would have been caught immediately
3. **No Integration Tests**: Unit tests passed but integration wasn't tested

### Prevention

1. **Always check actual method signatures** before using
2. **Run TypeScript compiler** after each change
3. **Run integration tests** to verify end-to-end flow
4. **Use IDE autocomplete** to catch signature mismatches

---

## 🚀 Post-Fix Checklist

After applying fixes:

- [ ] Code compiles (`npm run build`)
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Manual test: Send "Привет" twice, verify cache hit
- [ ] Manual test: Send "Hello" twice, verify cache hit
- [ ] Check logs for cache HIT/MISS messages
- [ ] Verify response times (<100ms for hits)
- [ ] Update tasks.md with fix notes
- [ ] Document this bug for future reference

---

## 💡 Recommendation

**DO NOT DEPLOY** until these fixes are applied and verified!

The integration looks good architecturally, but has critical API mismatch bugs that prevent it from working.

**Estimated Fix Time**: 15-30 minutes  
**Risk Level**: Low (fixes are straightforward)  
**Priority**: 🔴 **CRITICAL - FIX NOW**

---

**Status**: ⚠️ AWAITING FIX  
**Blocker**: Yes, blocks MVP deployment  
**Responsible**: Development team

---

## 📞 Next Steps

1. Apply fixes immediately
2. Run full test suite
3. Verify manual testing
4. Update FINAL_VERDICT.md with fix notes
5. Re-run deployment checklist
