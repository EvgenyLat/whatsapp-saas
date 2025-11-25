/**
 * =============================================================================
 * SECURITY TEST HELPERS
 * =============================================================================
 *
 * Helper functions for security testing including token generation,
 * signature creation, and common security test utilities.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for testing
 */
function generateToken(options = {}) {
  const {
    salonId = 'test-salon-id',
    role = 'admin',
    expiresIn = '1h',
  } = options;

  const payload = {
    sub: salonId,
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  const secret = process.env.JWT_SECRET || 'test-jwt-secret';

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload, secret = null) {
  const webhookSecret = secret || process.env.WHATSAPP_WEBHOOK_SECRET || 'test-webhook-secret';

  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload);

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(payloadString);

  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Generate API key for testing
 */
function generateApiKey(salonId, options = {}) {
  const { scopes = ['read:bookings', 'write:bookings'] } = options;

  const apiKey = crypto.randomBytes(32).toString('base64url');
  const keyData = {
    key: apiKey,
    salon_id: salonId,
    scopes,
    created_at: Date.now(),
  };

  return apiKey;
}

/**
 * Create a tampered signature (for negative testing)
 */
function createTamperedSignature(payload, secret = null) {
  const validSignature = generateWebhookSignature(payload, secret);

  // Modify last few characters
  return validSignature.slice(0, -4) + 'XXXX';
}

/**
 * Generate random phone number for testing
 */
function generateRandomPhone() {
  const number = Math.floor(1000000000 + Math.random() * 9000000000);
  return `+1${number}`;
}

/**
 * Generate random email for testing
 */
function generateRandomEmail() {
  const random = crypto.randomBytes(8).toString('hex');
  return `test-${random}@example.com`;
}

/**
 * Create SQL injection payload variants
 */
function getSQLInjectionPayloads() {
  return [
    "' OR '1'='1",
    "'; DROP TABLE users--",
    "1' UNION SELECT * FROM salons--",
    "admin'--",
    "' OR 1=1--",
    "' OR 'x'='x",
    "1; DELETE FROM bookings WHERE '1'='1",
    "' UNION SELECT NULL, NULL, NULL--",
  ];
}

/**
 * Create XSS payload variants
 */
function getXSSPayloads() {
  return [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
  ];
}

/**
 * Create command injection payloads
 */
function getCommandInjectionPayloads() {
  return [
    '; ls -la',
    '| cat /etc/passwd',
    '&& whoami',
    '$(cat /etc/passwd)',
    '`cat /etc/passwd`',
    '; rm -rf /',
  ];
}

/**
 * Create path traversal payloads
 */
function getPathTraversalPayloads() {
  return [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '..;/..;/..;/etc/passwd',
    '/etc/passwd',
    '../../../../../../etc/passwd',
  ];
}

/**
 * Encrypt data for testing (simulates production encryption)
 */
function encryptData(data) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex').slice(0, 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data for testing
 */
function decryptData(encryptedData, iv, authTag) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex').slice(0, 32);

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask PII data (for logging)
 */
function maskPII(data, type = 'phone') {
  if (!data) return data;

  if (type === 'phone') {
    // Mask middle digits: +1234567890 -> +123****890
    return data.replace(/(\+\d{3})\d{4}(\d{3})/, '$1****$2');
  }

  if (type === 'email') {
    // Mask email: john.doe@example.com -> j***e@example.com
    return data.replace(/^(.).*?(.@.*)$/, '$1***$2');
  }

  if (type === 'ssn') {
    // Mask SSN: 123-45-6789 -> ***-**-6789
    return data.replace(/\d{3}-\d{2}-(\d{4})/, '***-**-$1');
  }

  return data;
}

/**
 * Generate secure random string
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash password for testing
 */
async function hashPassword(password) {
  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password hash
 */
async function verifyPassword(password, hash) {
  const bcrypt = require('bcrypt');
  return await bcrypt.compare(password, hash);
}

/**
 * Create rate limit key for testing
 */
function createRateLimitKey(ip, endpoint) {
  return `ratelimit:${ip}:${endpoint}`;
}

/**
 * Wait for specified milliseconds (for timing tests)
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
function validateCSRFToken(token, sessionToken) {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

/**
 * Create security headers for testing
 */
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'no-referrer',
  };
}

/**
 * Verify security headers in response
 */
function verifySecurityHeaders(headers) {
  const required = [
    'x-content-type-options',
    'x-frame-options',
    'strict-transport-security',
  ];

  const missing = required.filter(header => !headers[header]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Generate test certificate for SSL/TLS testing
 */
function generateTestCertificate() {
  // This would use a library like node-forge to generate certificates
  // For now, return a placeholder
  return {
    cert: 'test-certificate',
    key: 'test-private-key',
  };
}

/**
 * Create audit log entry
 */
function createAuditLog(action, resource, userId, details = {}) {
  return {
    action,
    resource,
    user_id: userId,
    ip_address: details.ip || '127.0.0.1',
    user_agent: details.userAgent || 'test-agent',
    timestamp: Date.now(),
    details: JSON.stringify(details),
  };
}

/**
 * Sanitize input for logging
 */
function sanitizeForLogging(data) {
  if (typeof data !== 'object') return data;

  const sanitized = { ...data };

  const sensitiveFields = [
    'password',
    'token',
    'api_key',
    'secret',
    'credit_card',
    'ssn',
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}

/**
 * Validate input against security rules
 */
function validateInput(input, rules = {}) {
  const errors = [];

  if (rules.maxLength && input.length > rules.maxLength) {
    errors.push(`Input exceeds maximum length of ${rules.maxLength}`);
  }

  if (rules.minLength && input.length < rules.minLength) {
    errors.push(`Input below minimum length of ${rules.minLength}`);
  }

  if (rules.pattern && !rules.pattern.test(input)) {
    errors.push('Input does not match required pattern');
  }

  if (rules.noHtml && /<[^>]*>/.test(input)) {
    errors.push('HTML tags are not allowed');
  }

  if (rules.noSqlKeywords) {
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION'];
    const upperInput = input.toUpperCase();
    for (const keyword of sqlKeywords) {
      if (upperInput.includes(keyword)) {
        errors.push(`SQL keyword detected: ${keyword}`);
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  // Token and signature generation
  generateToken,
  generateWebhookSignature,
  generateApiKey,
  createTamperedSignature,
  generateCSRFToken,
  validateCSRFToken,

  // Random data generation
  generateRandomPhone,
  generateRandomEmail,
  generateSecureRandom,

  // Attack payloads
  getSQLInjectionPayloads,
  getXSSPayloads,
  getCommandInjectionPayloads,
  getPathTraversalPayloads,

  // Encryption/Hashing
  encryptData,
  decryptData,
  hashPassword,
  verifyPassword,

  // PII handling
  maskPII,
  sanitizeForLogging,

  // Security headers
  getSecurityHeaders,
  verifySecurityHeaders,

  // Rate limiting
  createRateLimitKey,

  // Utilities
  wait,
  createAuditLog,
  validateInput,
  generateTestCertificate,
};
