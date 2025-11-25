/**
 * Media Query Hook
 * WhatsApp SaaS Platform
 *
 * Responsive hook for matching media queries
 *
 * @see https://usehooks.com/useMediaQuery/
 */

import { useState, useEffect } from 'react';

/**
 * Hook to match media queries
 *
 * @param query - Media query string
 * @returns Boolean indicating if query matches
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileNav />}
 *       {isDesktop && <DesktopNav />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe initialization
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // Update state
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial state
    setMatches(mediaQuery.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks based on Tailwind CSS defaults
 */

/**
 * Check if screen is mobile (< 640px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

/**
 * Check if screen is tablet (640px - 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
}

/**
 * Check if screen is desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Check if screen is small (>= 640px)
 */
export function useIsSmallScreen(): boolean {
  return useMediaQuery('(min-width: 640px)');
}

/**
 * Check if screen is medium (>= 768px)
 */
export function useIsMediumScreen(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/**
 * Check if screen is large (>= 1024px)
 */
export function useIsLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Check if screen is extra large (>= 1280px)
 */
export function useIsExtraLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/**
 * Check if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Get current breakpoint
 *
 * @returns Current breakpoint name
 *
 * @example
 * ```tsx
 * function AdaptiveLayout() {
 *   const breakpoint = useBreakpoint();
 *
 *   return (
 *     <div>
 *       Current breakpoint: {breakpoint}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const is2xl = useMediaQuery('(min-width: 1536px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isSm = useMediaQuery('(min-width: 640px)');

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

export default useMediaQuery;
