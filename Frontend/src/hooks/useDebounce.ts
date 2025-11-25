/**
 * Debounce Hook
 * WhatsApp SaaS Platform
 *
 * Debounces a value, useful for search inputs and API calls
 *
 * @see https://usehooks.com/useDebounce/
 */

import { useEffect, useState } from 'react';

/**
 * Debounce a value with a specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 500);
 *
 *   // Trigger API call when debounced value changes
 *   useEffect(() => {
 *     if (debouncedSearch) {
 *       fetchResults(debouncedSearch);
 *     }
 *   }, [debouncedSearch]);
 *
 *   return (
 *     <input
 *       value={search}
 *       onChange={(e) => setSearch(e.target.value)}
 *       placeholder="Search..."
 *     />
 *   );
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 *
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @param deps - Dependency array for useCallback
 * @returns Debounced callback
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const fetchResults = useDebounceCallback(
 *     (query: string) => {
 *       api.search(query);
 *     },
 *     500,
 *     []
 *   );
 *
 *   return (
 *     <input
 *       onChange={(e) => fetchResults(e.target.value)}
 *       placeholder="Search..."
 *     />
 *   );
 * }
 * ```
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}

export default useDebounce;
