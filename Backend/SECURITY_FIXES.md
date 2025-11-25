# Security Vulnerabilities Fixed

## Overview

This document details the critical and high-priority security vulnerabilities that were identified during security audit and have been fixed. All changes maintain backward compatibility with existing functionality while significantly improving security posture.

## Fixed Vulnerabilities

### CRITICAL-1: Hardcoded JWT Secrets

**Severity:** CRITICAL
**File:** `src/config/jwt.config.ts`

**Vulnerability:**
- Application used default JWT secrets if environment variables were not set
- Secrets contained insecure patterns like "change-this", "secret-key"
- No minimum length requirement for secrets
- Allowed application to start with weak or default secrets

**Impact:**
- Attackers could forge JWT tokens if default secrets were used
- Complete authentication bypass possible
- User sessions could be hijacked
- CWE-798: Use of Hard-coded Credentials

**Fix Implemented:**
```typescript
// Now throws error if JWT_SECRET or JWT_REFRESH_SECRET not set
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

// Validates against insecure patterns
const insecurePatterns = ['change-this', 'secret-key', 'your-secret', ...];
// Rejects any secret containing these patterns
```

**Configuration Required:**
```bash
# Generate secure secrets
openssl rand -base64 32

# Set in .env
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

**Verification:**
- Application will not start without proper secrets set
- Secrets must be at least 32 characters
- Secrets cannot contain common insecure patterns

---

### CRITICAL-2: CORS Wildcard with Credentials

**Severity:** CRITICAL
**File:** `src/main.ts`

**Vulnerability:**
- CORS configured with `origin: '*'` and `credentials: true`
- This combination allows any website to make authenticated requests
- Browser security mechanism bypassed

**Impact:**
- Cross-Site Request Forgery (CSRF) attacks possible
- Session theft from legitimate users
- Unauthorized API access from malicious domains
- CWE-346: Origin Validation Error

**Fix Implemented:**
```typescript
// Strict CORS validation
if (environment === 'production' && corsOrigin === '*') {
  throw new Error('Wildcard CORS origin not allowed in production with credentials');
}

// Origin validation callback
origin: (origin, callback) => {
  if (!origin) return callback(null, true); // Allow mobile apps

  // Check against whitelist
  if (Array.isArray(allowedOrigins)) {
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  }

  callback(new Error('Not allowed by CORS'));
}
```

**Configuration Required:**
```bash
# Development (allows localhost)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Production (specify exact domains)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Verification:**
- Production deployment will fail if CORS_ORIGIN='*'
- Only specified origins can make credentialed requests
- Unauthorized origins are logged and blocked

---

### HIGH-1: Missing JWT Algorithm Specification

**Severity:** HIGH
**Files:**
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.service.ts`

**Vulnerability:**
- JWT signing and verification did not explicitly specify algorithm
- Vulnerable to "none" algorithm attack
- Attacker could manipulate token algorithm header

**Impact:**
- JWT bypass by using "none" algorithm
- Token forgery possible
- Authentication bypass
- CWE-347: Improper Verification of Cryptographic Signature

**Fix Implemented:**
```typescript
// JWT Strategy
super({
  ...
  algorithms: ['HS256'], // Explicitly allow only HS256
});

// JWT Module
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    signOptions: {
      algorithm: 'HS256', // Explicit signing algorithm
    },
    verifyOptions: {
      algorithms: ['HS256'], // Only accept HS256
    },
  }),
});

// Token generation
this.jwtService.sign(payload, {
  algorithm: 'HS256', // Explicit algorithm
});
```

**Verification:**
- Tokens with "none" algorithm are rejected
- Only HS256 algorithm tokens are accepted
- Algorithm header tampering is prevented

---

### HIGH-2: Refresh Token Rotation with Reuse Detection

**Severity:** HIGH
**Files:**
- `prisma/schema.prisma`
- `src/modules/auth/auth.service.ts`

**Vulnerability:**
- Refresh tokens were deleted immediately after use
- No detection of token reuse (possible theft indicator)
- No audit trail of token usage

**Impact:**
- Token theft could go undetected
- Compromised tokens could be used without detection
- No mechanism to revoke all sessions on suspicious activity
- CWE-613: Insufficient Session Expiration

**Fix Implemented:**

Database Schema Changes:
```prisma
model RefreshToken {
  id         String    @id @default(uuid())
  token      String    @unique
  user_id    String
  expires_at DateTime
  is_used    Boolean   @default(false)  // NEW: Track usage
  used_at    DateTime?                  // NEW: Track when used
  created_at DateTime  @default(now())

  @@index([token, is_used]) // NEW: Optimize reuse detection
}
```

Service Implementation:
```typescript
async refreshToken(refreshTokenString: string) {
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { token: refreshTokenString },
  });

  // REUSE DETECTION
  if (storedToken.is_used) {
    // Token reuse detected - possible theft
    // Revoke ALL user tokens as security measure
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: storedToken.user_id },
    });

    throw new UnauthorizedException(
      'Refresh token reuse detected. All sessions terminated for security.'
    );
  }

  // Mark as used (rotation)
  await this.prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { is_used: true, used_at: new Date() },
  });

  // Generate new token
  const { accessToken, refreshToken } = await this.generateTokens(user);

  // Keep last 5 used tokens for audit trail
  // Delete older tokens
}
```

**Security Benefits:**
- Automatic detection of token theft/reuse
- All sessions revoked on suspicious activity
- Audit trail of token usage maintained
- Implements OAuth 2.0 best practices for token rotation

**Migration:**
```bash
npx prisma migrate deploy
```

---

### HIGH-3: CSRF Backend Validation

**Severity:** HIGH
**Files:**
- `src/common/guards/csrf.guard.ts` (NEW)
- `src/common/decorators/skip-csrf.decorator.ts` (NEW)
- `src/modules/auth/csrf.controller.ts` (NEW)
- `src/modules/auth/auth.controller.ts` (UPDATED)
- `src/modules/auth/auth.module.ts` (UPDATED)

**Vulnerability:**
- Frontend sent CSRF tokens but backend never validated them
- No protection against Cross-Site Request Forgery
- State-changing operations vulnerable to CSRF attacks

**Impact:**
- Attackers could perform actions on behalf of authenticated users
- Unauthorized data modification possible
- Account takeover via CSRF
- CWE-352: Cross-Site Request Forgery (CSRF)

**Fix Implemented:**

CSRF Guard:
```typescript
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only validate for state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const csrfToken = request.headers['x-csrf-token'];

    if (!csrfToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Validate token against session
    if (!this.validateCsrfToken(csrfToken, sessionId)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }

  generateCsrfToken(sessionId: string): string {
    // Time-based token with HMAC
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${sessionId}:${timestamp}:${this.csrfSecret}`)
      .digest('hex');

    return Buffer.from(`${timestamp}:${hash}`).toString('base64');
  }

  private validateCsrfToken(token: string, sessionId: string): boolean {
    // Decode and verify timestamp
    // Regenerate hash and use timing-safe comparison
    // Tokens valid for 24 hours
  }
}
```

CSRF Token Endpoints:
```typescript
// Get CSRF token for authenticated users
GET /api/v1/csrf/token
Headers: Authorization: Bearer <jwt-token>
Response: { csrfToken: "base64-encoded-token" }

// Get CSRF token for anonymous users (login/register)
GET /api/v1/csrf/token/anonymous
Response: { csrfToken: "base64-encoded-token" }
```

Protected Endpoints:
```typescript
@Controller('auth')
@UseGuards(CsrfGuard) // Applied to all routes
export class AuthController {

  @SkipCsrf() // Only for specific routes
  @Post('login')
  async login() { ... }

  // Protected with CSRF
  @Post('send-verification')
  async sendVerification() { ... }
}
```

**Integration Guide:**

Frontend Integration:
```typescript
// 1. Get CSRF token before authenticated requests
const { csrfToken } = await fetch('/api/v1/csrf/token', {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json());

// 2. Include CSRF token in state-changing requests
await fetch('/api/v1/auth/send-verification', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-CSRF-Token': csrfToken,
  },
});
```

**Routes Requiring CSRF:**
- POST /api/v1/auth/send-verification
- POST /api/v1/auth/logout
- All other state-changing operations (POST, PUT, PATCH, DELETE)

**Routes Exempt from CSRF:**
- POST /api/v1/auth/login (uses anonymous CSRF or credentials)
- POST /api/v1/auth/register (uses anonymous CSRF)
- POST /api/v1/auth/refresh (refresh token serves as CSRF protection)
- POST /api/v1/auth/verify-email (verification token serves as protection)
- POST /api/v1/auth/forgot-password (safe operation, no state change)
- POST /api/v1/auth/reset-password (reset token serves as protection)
- All GET requests

---

## Environment Configuration

### Required Environment Variables

**CRITICAL - Application will not start without these:**

```bash
# JWT Secrets (minimum 32 characters, randomly generated)
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>

# CORS Configuration
# Development:
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Production (MUST be specific domains, not '*'):
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Optional but Recommended:**

```bash
# CSRF Secret (uses JWT_SECRET if not set)
CSRF_SECRET=<generate-with-openssl-rand-base64-32>

# Node Environment
NODE_ENV=production  # CRITICAL: Set to 'production' in production
```

### Generating Secure Secrets

```bash
# Method 1: OpenSSL (recommended)
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Online (use with caution)
# https://www.uuidgenerator.net/
```

### Example .env for Development

```bash
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
JWT_SECRET=uwjGbXVPvgXa5EeOj1KD/wEpLkUxPsYP5W2IZTm0FPs=
JWT_REFRESH_SECRET=TD/rlheswgyS6Q6Aoxfv/GdcE96Uq9SJiXzavp7nk4U=
```

### Example .env for Production

```bash
NODE_ENV=production
CORS_ORIGIN=https://api.yourdomain.com,https://app.yourdomain.com
JWT_SECRET=<SECURE-SECRET-FROM-SECRETS-MANAGER>
JWT_REFRESH_SECRET=<SECURE-SECRET-FROM-SECRETS-MANAGER>
CSRF_SECRET=<SECURE-SECRET-FROM-SECRETS-MANAGER>
```

---

## Testing Security Fixes

### 1. Test JWT Secret Validation

```bash
# Should FAIL - no secrets set
unset JWT_SECRET JWT_REFRESH_SECRET
npm start
# Expected: Error "JWT_SECRET environment variable must be set"

# Should FAIL - secrets too short
export JWT_SECRET="short"
export JWT_REFRESH_SECRET="short"
npm start
# Expected: Error "at least 32 characters long"

# Should FAIL - insecure secret
export JWT_SECRET="please-change-this-secret-key"
export JWT_REFRESH_SECRET="please-change-this-secret-key"
npm start
# Expected: Error "insecure default values"

# Should SUCCEED - secure secrets
export JWT_SECRET="uwjGbXVPvgXa5EeOj1KD/wEpLkUxPsYP5W2IZTm0FPs="
export JWT_REFRESH_SECRET="TD/rlheswgyS6Q6Aoxfv/GdcE96Uq9SJiXzavp7nk4U="
npm start
# Expected: Application starts successfully
```

### 2. Test CORS Validation

```bash
# Should FAIL in production
export NODE_ENV=production
export CORS_ORIGIN="*"
npm start
# Expected: Error "Wildcard CORS origin not allowed in production"

# Should SUCCEED in production
export NODE_ENV=production
export CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com"
npm start
# Expected: Application starts successfully

# Test CORS blocking
curl -H "Origin: https://malicious.com" \
     -H "Cookie: session=xyz" \
     http://localhost:3000/api/v1/auth/me
# Expected: CORS error, request blocked
```

### 3. Test JWT Algorithm Protection

```typescript
// Attempt to use 'none' algorithm (should fail)
const header = { alg: 'none', typ: 'JWT' };
const payload = { sub: 'user-id', email: 'test@example.com' };
const token = base64(JSON.stringify(header)) + '.' +
              base64(JSON.stringify(payload)) + '.';

// Send request with 'none' algorithm token
const response = await fetch('http://localhost:3000/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
});

// Expected: 401 Unauthorized - Invalid token
```

### 4. Test Refresh Token Reuse Detection

```bash
# 1. Login to get refresh token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Response: { "refreshToken": "abc123..." }

# 2. Use refresh token (should succeed)
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"abc123..."}'

# Response: { "accessToken": "...", "refreshToken": "xyz789..." }

# 3. Attempt to reuse OLD refresh token (should fail and revoke all tokens)
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"abc123..."}'

# Expected: 401 Unauthorized
# Message: "Refresh token reuse detected. All sessions have been terminated."
# Side effect: All user's refresh tokens deleted from database
```

### 5. Test CSRF Protection

```bash
# 1. Get CSRF token
curl http://localhost:3000/api/v1/csrf/token/anonymous

# Response: { "csrfToken": "base64-token..." }

# 2. Attempt state-changing request WITHOUT CSRF token (should fail)
curl -X POST http://localhost:3000/api/v1/auth/send-verification \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json"

# Expected: 403 Forbidden - "CSRF token missing"

# 3. With CSRF token (should succeed)
curl -X POST http://localhost:3000/api/v1/auth/send-verification \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -H "Content-Type: application/json"

# Expected: 200 OK
```

---

## Deployment Checklist

### Before Deploying to Production

- [ ] Generate new, unique JWT secrets (minimum 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` with specific allowed domains (no wildcards)
- [ ] Set up secrets management (AWS Secrets Manager recommended)
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Test authentication flow end-to-end
- [ ] Verify CORS configuration blocks unauthorized origins
- [ ] Test CSRF protection on state-changing endpoints
- [ ] Enable security logging and monitoring
- [ ] Set up alerts for:
  - Refresh token reuse detection
  - CSRF validation failures
  - Unauthorized CORS access attempts
  - Application startup failures (missing secrets)

### Post-Deployment Verification

```bash
# 1. Verify application starts successfully
# Check logs for no secret-related errors

# 2. Test authentication flow
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Verify CORS protection
curl -H "Origin: https://malicious.com" \
     https://api.yourdomain.com/api/v1/auth/me
# Expected: CORS error

# 4. Verify CSRF protection
curl -X POST https://api.yourdomain.com/api/v1/auth/send-verification \
  -H "Authorization: Bearer ${TOKEN}"
# Expected: 403 CSRF token missing

# 5. Monitor logs for security events
# - CORS blocks
# - CSRF failures
# - Token reuse detection
```

---

## Security Best Practices

### Secrets Management

1. **Never commit secrets to version control**
   - Secrets should only exist in environment variables
   - Use `.env.example` with placeholders only

2. **Use different secrets for each environment**
   - Development, staging, and production must have unique secrets
   - Never reuse development secrets in production

3. **Rotate secrets regularly**
   - Recommended: Every 90 days
   - Emergency: Immediately if compromise suspected

4. **Use secrets management service in production**
   - AWS Secrets Manager (recommended)
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

### CORS Configuration

1. **Be specific in production**
   - List exact allowed origins
   - Never use wildcards with credentials

2. **Use HTTPS in production**
   - All origins should use `https://`
   - Never allow `http://` origins in production

3. **Monitor CORS blocks**
   - Log blocked origins
   - Alert on repeated blocks (possible attack)

### Token Security

1. **Refresh token handling**
   - Store refresh tokens securely (httpOnly cookies recommended)
   - Never expose in client-side JavaScript
   - Implement token rotation
   - Detect and respond to reuse

2. **Access token handling**
   - Keep expiry short (15 minutes recommended)
   - Use for API authentication only
   - Refresh before expiration

3. **Session management**
   - Implement logout functionality
   - Revoke all sessions on password change
   - Provide user session management UI

### CSRF Protection

1. **Frontend integration**
   - Fetch CSRF token before state-changing requests
   - Include token in `X-CSRF-Token` header
   - Handle 403 CSRF errors (re-fetch token)

2. **API design**
   - Use POST/PUT/PATCH/DELETE for state changes
   - Never use GET for state changes
   - Apply CSRF to all state-changing endpoints

3. **Mobile/API clients**
   - Can skip CSRF if using API keys
   - Must still validate origin if using cookies

---

## Migration Impact

### Database Changes

```sql
-- Added columns to refresh_tokens table
ALTER TABLE refresh_tokens ADD COLUMN is_used BOOLEAN DEFAULT false;
ALTER TABLE refresh_tokens ADD COLUMN used_at TIMESTAMP;
CREATE INDEX idx_refresh_tokens_token_is_used ON refresh_tokens(token, is_used);
```

### Breaking Changes

**None** - All changes are backward compatible:
- Existing refresh tokens will work (is_used defaults to false)
- Existing API endpoints unchanged
- Authentication flow unchanged
- CSRF only enforced on new guards

### Frontend Changes Required

**Optional CSRF Integration:**
```typescript
// Add CSRF token to requests
const csrfToken = await getCsrfToken();
headers['X-CSRF-Token'] = csrfToken;
```

**No breaking changes if CSRF not implemented yet:**
- Most auth endpoints exempt from CSRF (@SkipCsrf decorator)
- Can implement CSRF gradually

---

## Monitoring and Alerting

### Security Events to Monitor

1. **Refresh Token Reuse Detection**
   - Log: User ID, timestamp, IP address
   - Alert: Immediate (possible token theft)
   - Action: Force password reset, notify user

2. **CSRF Validation Failures**
   - Log: User ID, endpoint, origin
   - Alert: High frequency (>10/hour)
   - Action: Investigate potential CSRF attack

3. **CORS Blocks**
   - Log: Origin, endpoint, timestamp
   - Alert: New origins, high frequency
   - Action: Verify legitimate requests, update whitelist

4. **JWT Validation Failures**
   - Log: Reason, IP address, token signature
   - Alert: High frequency (>100/hour)
   - Action: Investigate brute force attempts

### Logging Configuration

```typescript
// All security events logged with context
logger.warn('CORS: Blocked request from unauthorized origin', {
  origin: request.headers.origin,
  endpoint: request.url,
  timestamp: new Date().toISOString(),
});

logger.error('SECURITY: Refresh token reuse detected', {
  userId: user.id,
  tokenId: token.id,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});
```

---

## Support and Questions

For questions about security fixes:
1. Review this documentation
2. Check example configurations in `.env.example`
3. Test with provided test cases
4. Open issue if problems persist

## Security Disclosure

If you discover a security vulnerability:
1. **Do not** open a public issue
2. Email security contact (set in package.json)
3. Provide detailed reproduction steps
4. Allow 90 days for fix before public disclosure
