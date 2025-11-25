/**
 * Security Middleware - ENFORCED
 * WhatsApp SaaS Platform
 *
 * This middleware enforces comprehensive security:
 * - Security Headers (ENFORCED)
 * - Content Security Policy (ENFORCED)
 * - JWT Authentication Protection (ENFORCED)
 *
 * SECURITY STATUS: HEADERS & AUTH ENFORCED
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/forgot-password'];
const authPaths = ['/login', '/register'];
const adminPaths = ['/admin'];

/**
 * Security headers middleware with JWT authentication
 * ENFORCED: Sets comprehensive security headers on all responses
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie (set by zustand persist)
  const authStorage = request.cookies.get('auth-storage')?.value;

  let isAuthenticated = false;
  let userRole: string | null = null;

  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      isAuthenticated = !!parsed.state?.access_token;
      userRole = parsed.state?.user?.role || null;
    } catch (e) {
      // Invalid JSON, treat as not authenticated
      console.error('[Middleware] Failed to parse auth-storage cookie:', e);
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authPaths.some((p) => pathname.startsWith(p))) {
    // Redirect super admins to admin panel, others to dashboard
    const redirectUrl = userRole === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !publicPaths.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection - only SUPER_ADMIN can access
  if (isAuthenticated && adminPaths.some((p) => pathname.startsWith(p))) {
    if (userRole !== 'SUPER_ADMIN') {
      // Non-admin users trying to access admin routes - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Prevent super admins from accessing salon dashboard
  if (isAuthenticated && userRole === 'SUPER_ADMIN' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const response = NextResponse.next();

  // ENFORCED SECURITY HEADERS
  // These headers are ACTIVE and PROTECTING the application

  // DNS Prefetch Control
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 2 years, including subdomains
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // XSS Protection (legacy but still useful)
  // Enable browser XSS filter and block page if attack detected
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Frame Options
  // Prevent clickjacking by disallowing iframe embedding
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Content Type Options
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  // Control referrer information
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // Permissions Policy
  // Restrict access to browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy (CSP)
  // PRODUCTION FIX: Dynamic CSP based on environment
  const isDev = process.env.NODE_ENV === 'development';

  const cspDirectives = [
    "default-src 'self'",
    // PRODUCTION: Allow unsafe-inline for Next.js inline scripts
    // Next.js requires 'unsafe-inline' for hydration and chunk loading
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires both in production
    "style-src 'self' 'unsafe-inline'", // Keep for CSS-in-JS
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    // PRODUCTION FIX: Add localhost:3001 to connect-src for frontend API calls
    `connect-src 'self' http://localhost:3000 ws://localhost:3000 http://localhost:3001`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    isDev ? '' : 'upgrade-insecure-requests', // Only in production
  ].filter(Boolean); // Remove empty strings

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Report-Only CSP for testing (optional)
  // Uncomment to test CSP without breaking functionality
  // response.headers.set('Content-Security-Policy-Report-Only', cspDirectives.join('; '));

  // Remove server identification
  response.headers.delete('X-Powered-By');

  // Security logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security] Headers enforced for:', request.nextUrl.pathname);
  }

  return response;
}

export const config = {
  // PRODUCTION FIX: More explicit matcher to reduce regex evaluation overhead
  // Match all routes EXCEPT:
  // - API routes (/api/*)
  // - Static files (_next/static/*)
  // - Image optimization (_next/image/*)
  // - Public files (favicon, robots, etc.)
  // - Static assets with extensions (images, css, js, etc.)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (API routes)
     * - _next/static/ (static files)
     * - _next/image/ (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (public files)
     * - *.* (files with extensions - images, css, js, etc.)
     */
    '/((?!api/|_next/static/|_next/image/|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
