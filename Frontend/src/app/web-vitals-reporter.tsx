/**
 * Web Vitals Reporter Component
 * Client-side component that tracks and reports Web Vitals
 */

'use client';

import { useEffect } from 'react';

export function WebVitalsReporter() {
  useEffect(() => {
    // Dynamically import web-vitals only on client side
    import('web-vitals').then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
      const reportMetric = (metric: any) => {
        // Log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals]', {
            name: metric.name,
            value: Math.round(metric.value),
            rating: metric.rating,
          });
        }

        // Send to analytics in production
        if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
          const body = JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            url: window.location.href,
          });

          // Use sendBeacon if available (doesn't block page unload)
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/v1/analytics/web-vitals', body);
          } else {
            fetch('/api/v1/analytics/web-vitals', {
              body,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
            }).catch(console.error);
          }
        }
      };

      // Track all Core Web Vitals
      onCLS(reportMetric);
      // onFID is deprecated in web-vitals v4, replaced by onINP
      onLCP(reportMetric);
      onFCP(reportMetric);
      onTTFB(reportMetric);
      onINP(reportMetric);
    });
  }, []);

  return null;
}
