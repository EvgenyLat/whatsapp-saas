# Quick Update Guide - Security Patches

## CRITICAL: Execute Immediately

**Risk:** CVSS 9.1 Authorization Bypass in Next.js
**Time:** 90 minutes
**Breaking Changes:** NONE

---

## Phase 1: Critical Updates (TODAY)

### Pre-Flight Check
```bash
cd C:\whatsapp-saas-starter\Frontend
git status  # Ensure clean working directory
npm test -- --watchAll=false  # Baseline: all tests pass
```

### Execute Updates
```bash
# 1. Safety commit
git add -A
git commit -m "chore: pre-security-update checkpoint"

# 2. Update axios (HIGH severity)
npm install axios@1.12.0

# 3. Update Next.js (CRITICAL severity)
npm install next@13.5.11

# 4. Clear Next.js cache
rm -rf .next

# 5. Verify
npm test -- --watchAll=false
npm run type-check
npm run build

# 6. Check vulnerabilities (should show 2 low remaining)
npm audit

# 7. Commit
git add package.json package-lock.json
git commit -m "fix(deps): critical security patches - next@13.5.11 axios@1.12.0"
```

### Success Criteria
- [ ] Tests pass
- [ ] Build succeeds
- [ ] npm audit: 0 critical, 0 high
- [ ] No console errors

---

## Phase 2: Low Priority (This Week)

```bash
cd C:\whatsapp-saas-starter\Frontend

# Update msw (dev dependency only)
npm install -D msw@2.11.5

# Verify
npm test -- --watchAll=false
npm run build
npm audit  # Should show 0 vulnerabilities

# Commit
git add package.json package-lock.json
git commit -m "fix(deps): update msw@2.11.5 - all vulnerabilities resolved"
```

---

## Rollback (If Needed)

```bash
cd C:\whatsapp-saas-starter\Frontend

# Restore previous versions
npm install next@13.5.6 axios@1.11.0 msw@1.3.5

# Clear cache
rm -rf .next node_modules
npm install

# Verify
npm test
npm run build
```

---

## Manual Testing Checklist

After Phase 1, test locally:

```bash
npm run dev
# Visit http://localhost:3000
```

**Test These:**
- [ ] Homepage loads
- [ ] Dashboard loads
- [ ] Booking table displays data
- [ ] Forms work
- [ ] API calls succeed
- [ ] No console errors

---

## Vulnerabilities Resolved

### Phase 1 Fixes:
1. **Next.js GHSA-f82v-jwr5-mffw** - CRITICAL (CVSS 9.1)
   - Authorization bypass
   - Unauthorized access to protected routes

2. **Next.js GHSA-fr5h-rqp8-mj6g** - HIGH (CVSS 7.5)
   - Server-Side Request Forgery

3. **Next.js GHSA-gp8f-8m3g-qvj9** - HIGH (CVSS 7.5)
   - Cache poisoning DoS

4. **axios GHSA-4hjh-wcwx-xvwj** - HIGH (CVSS 7.5)
   - DoS via unbounded response buffering

5. **Plus 7 more Next.js vulnerabilities** - MODERATE/LOW

### Phase 2 Fixes:
6. **cookie GHSA-pxg6-pf52-xh8x** - LOW
   - Out-of-bounds characters (dev only)

---

## Support

- Full details: [DEPENDENCY_UPDATE_PLAN.md](./DEPENDENCY_UPDATE_PLAN.md)
- Questions: Check detailed plan document
- Issues: Follow rollback procedure above

**Status After Phase 1:** 2/4 vulnerabilities fixed (100% of critical/high)
**Status After Phase 2:** 4/4 vulnerabilities fixed (0 remaining)
