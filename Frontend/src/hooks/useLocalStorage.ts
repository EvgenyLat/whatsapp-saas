/**
 * LocalStorage Hook
 * WhatsApp SaaS Platform
 *
 * Manages localStorage with SSR safety and TypeScript support
 *
 * @see https://usehooks.com/useLocalStorage/
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Type for localStorage event
 */
type SetValue<T> = T | ((val: T) => T);

/**
 * Hook to manage localStorage with SSR safety
 *
 * @param key - LocalStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns Tuple of [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * function PreferencesPanel() {
 *   const [theme, setTheme, removeTheme] = useLocalStorage<'light' | 'dark'>(
 *     'theme',
 *     'light'
 *   );
 *
 *   return (
 *     <div>
 *       <button onClick={() => setTheme('dark')}>Dark Mode</button>
 *       <button onClick={() => setTheme('light')}>Light Mode</button>
 *       <button onClick={removeTheme}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // SSR-safe initialization
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  /**
   * Set value to localStorage
   */
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        // Allow value to be a function for same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Dispatch storage event for cross-tab synchronization
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              newValue: JSON.stringify(valueToStore),
              url: window.location.href,
            })
          );
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  /**
   * Remove value from localStorage
   */
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);

        // Dispatch storage event
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: null,
            url: window.location.href,
          })
        );
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  /**
   * Listen for storage changes from other tabs
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key || e.url === window.location.href) {
        return;
      }

      try {
        if (e.newValue) {
          setStoredValue(JSON.parse(e.newValue) as T);
        } else {
          setStoredValue(initialValue);
        }
      } catch (error) {
        console.warn(`Error handling storage change for key "${key}":`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook to check if a localStorage key exists
 *
 * @param key - LocalStorage key to check
 * @returns Boolean indicating if key exists
 *
 * @example
 * ```tsx
 * function WelcomeMessage() {
 *   const hasSeenWelcome = useLocalStorageExists('welcome-shown');
 *
 *   if (hasSeenWelcome) {
 *     return null;
 *   }
 *
 *   return <WelcomeModal />;
 * }
 * ```
 */
export function useLocalStorageExists(key: string): boolean {
  const [exists, setExists] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(key) !== null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setExists(e.newValue !== null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return exists;
}

export default useLocalStorage;
