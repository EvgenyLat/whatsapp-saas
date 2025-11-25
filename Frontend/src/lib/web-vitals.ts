/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals and sends them to analytics
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Target < 2.5s
 * - INP (Interaction to Next Paint): Target < 200ms (replaces FID)
 * - CLS (Cumulative Layout Shift): Target < 0.1
 * - FCP (First Contentful Paint): Target < 1.8s
 * - TTFB (Time to First Byte): Target < 600ms
 * - INP (Interaction to Next Paint): Target < 200ms
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Send metric to analytics endpoint
 * Replace with your analytics service (e.g., Google Analytics, Vercel Analytics)
 */
function sendToAnalytics(metric: WebVitalMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  }

  // Send to analytics endpoint in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to custom analytics endpoint
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Use sendBeacon if available (doesn't block page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body);
    } else {
      fetch('/api/analytics/web-vitals', {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch((error) => {
        console.error('Failed to send web vitals:', error);
      });
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this in your app entry point
 */
export function initWebVitals() {
  // Track all Core Web Vitals
  onCLS(sendToAnalytics);
  // onFID is deprecated in web-vitals v4, replaced by onINP
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}

/**
 * Get performance budgets for monitoring
 */
export const PERFORMANCE_BUDGETS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  // FID removed - deprecated in web-vitals v4
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  TTFB: {
    good: 600,
    needsImprovement: 1500,
  },
  INP: {
    good: 200,
    needsImprovement: 500,
  },
} as const;

/**
 * Custom performance marker for measuring custom metrics
 */
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];

      if (measure) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${name}: ${Math.round(measure.duration)}ms`);
        }
        return measure.duration;
      }
      return 0;
    } catch (error) {
      console.error('Failed to measure performance:', error);
      return 0;
    }
  }
  return 0;
}
