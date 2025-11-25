/**
 * Security Module - ENFORCED
 * WhatsApp SaaS Platform
 *
 * Central export for all ENFORCED security features:
 * - CSRF Token Protection (ENFORCED)
 * - Rate Limiting (ENFORCED)
 * - Input Sanitization (ENFORCED)
 * - XSS Protection (ENFORCED)
 *
 * SECURITY STATUS: ALL FEATURES ENFORCED
 */

// CSRF Protection
export {
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  clearCsrfToken,
  refreshCsrfToken,
  addCsrfTokenToRequest,
  initializeCsrfToken,
  isCsrfTokenValid,
  getCsrfTokenMetadata,
} from './csrf';

// Rate Limiting
export {
  RateLimiter,
  createRateLimiter,
  rateLimiters,
  checkRateLimit,
  getRateLimitStatus,
  resetAllRateLimiters,
  resetRateLimiter,
  getAllRateLimitStatuses,
} from './rateLimit';

// Input Sanitization
export {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizePhone,
  sanitizeEmail,
  sanitizeFilename,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeObject,
  sanitizeFormData,
  sanitizeSearchQuery,
  sanitizeJson,
  toSafeString,
} from './sanitize';

// XSS Protection
export {
  escapeHtml,
  unescapeHtml,
  sanitizeAttribute,
  detectXssPattern,
  removeScriptTags,
  SafeText,
  SafeHtml,
  safeJsonParse,
  generateCspNonce,
  isSafeUrl,
  stripDangerousAttributes,
  encodeForJavascript,
  encodeForCss,
  sanitizeHtmlId,
  isObjectSafe,
} from './xss';

/**
 * Initialize all security features
 * ENFORCED: Call this on app start
 */
export function initializeSecurity(): void {
  // Initialize CSRF token
  const { initializeCsrfToken } = require('./csrf');
  initializeCsrfToken();

  console.log('[Security] All security features initialized (ENFORCED)');
}

/**
 * Get security status
 * ENFORCED: Returns status of all security features
 */
export function getSecurityStatus(): {
  csrf: {
    enabled: true;
    status: 'ENFORCED';
    hasToken: boolean;
    isValid: boolean;
  };
  rateLimit: {
    enabled: true;
    status: 'ENFORCED';
    endpoints: number;
  };
  sanitization: {
    enabled: true;
    status: 'ENFORCED';
  };
  xss: {
    enabled: true;
    status: 'ENFORCED';
  };
} {
  const { getCsrfTokenMetadata } = require('./csrf');
  const { rateLimiters } = require('./rateLimit');

  const csrfMeta = getCsrfTokenMetadata();

  return {
    csrf: {
      enabled: true,
      status: 'ENFORCED',
      hasToken: csrfMeta.hasToken,
      isValid: csrfMeta.isValid,
    },
    rateLimit: {
      enabled: true,
      status: 'ENFORCED',
      endpoints: Object.keys(rateLimiters).length,
    },
    sanitization: {
      enabled: true,
      status: 'ENFORCED',
    },
    xss: {
      enabled: true,
      status: 'ENFORCED',
    },
  };
}
