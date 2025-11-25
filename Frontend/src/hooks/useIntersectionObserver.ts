/**
 * Intersection Observer Hook
 * WhatsApp SaaS Platform
 *
 * Hook for detecting element visibility (infinite scroll, lazy loading)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Options for useIntersectionObserver hook
 */
export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Callback when intersection changes */
  onChange?: (entry: IntersectionObserverEntry) => void;
  /** Only trigger once */
  triggerOnce?: boolean;
}

/**
 * Hook to observe element intersection with viewport
 *
 * @param options - Intersection observer options
 * @returns Tuple of [ref, entry, isIntersecting]
 *
 * @example
 * ```tsx
 * function LazyImage({ src }: { src: string }) {
 *   const [ref, entry, isIntersecting] = useIntersectionObserver({
 *     threshold: 0.1,
 *     triggerOnce: true
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isIntersecting && <img src={src} alt="" />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefCallback<T>, IntersectionObserverEntry | null, boolean] {
  const { onChange, triggerOnce = false, ...observerOptions } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Callback ref to attach observer
  const ref = useCallback(
    (element: T | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Don't observe if triggerOnce and already triggered
      if (triggerOnce && hasTriggeredRef.current) {
        return;
      }

      // Create new observer if element exists
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;

            setEntry(entry);
            setIsIntersecting(entry.isIntersecting);

            if (entry.isIntersecting && triggerOnce) {
              hasTriggeredRef.current = true;
              observer.disconnect();
            }

            onChange?.(entry);
          },
          observerOptions
        );

        observer.observe(element);
        observerRef.current = observer;
      }
    },
    [onChange, triggerOnce, observerOptions.root, observerOptions.rootMargin, observerOptions.threshold]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, entry, isIntersecting];
}

/**
 * Hook for infinite scroll implementation
 *
 * @param onLoadMore - Callback to load more items
 * @param options - Intersection observer options
 * @returns Ref to attach to the sentinel element
 *
 * @example
 * ```tsx
 * function InfiniteBookingList() {
 *   const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(...);
 *   const sentinelRef = useInfiniteScroll(
 *     () => {
 *       if (hasNextPage) {
 *         fetchNextPage();
 *       }
 *     },
 *     { rootMargin: '200px' }
 *   );
 *
 *   return (
 *     <div>
 *       {data?.pages.map(page =>
 *         page.data.map(item => <BookingCard key={item.id} {...item} />)
 *       )}
 *       <div ref={sentinelRef} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLElement>(
  onLoadMore: () => void,
  options: UseIntersectionObserverOptions = {}
): React.RefCallback<T> {
  const [ref] = useIntersectionObserver<T>({
    ...options,
    onChange: (entry) => {
      if (entry.isIntersecting) {
        onLoadMore();
      }
    },
  });

  return ref;
}

/**
 * Hook for lazy loading elements
 *
 * @param options - Intersection observer options
 * @returns Tuple of [ref, isVisible, hasBeenVisible]
 *
 * @example
 * ```tsx
 * function LazySection() {
 *   const [ref, isVisible, hasBeenVisible] = useLazyLoad({
 *     threshold: 0.25,
 *     triggerOnce: true
 *   });
 *
 *   return (
 *     <section ref={ref}>
 *       {hasBeenVisible && <ExpensiveComponent />}
 *     </section>
 *   );
 * }
 * ```
 */
export function useLazyLoad<T extends HTMLElement = HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefCallback<T>, boolean, boolean] {
  const [hasBeenVisible, setHasBeenVisible] = useState<boolean>(false);
  const [ref, , isVisible] = useIntersectionObserver<T>({
    ...options,
    onChange: (entry) => {
      if (entry.isIntersecting && !hasBeenVisible) {
        setHasBeenVisible(true);
      }
      options.onChange?.(entry);
    },
  });

  return [ref, isVisible, hasBeenVisible];
}

/**
 * Hook to check if element is in viewport
 *
 * @param ref - Element ref
 * @param options - Intersection observer options
 * @returns Whether element is in viewport
 *
 * @example
 * ```tsx
 * function ScrollAnimatedBox() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const isInView = useIsInViewport(ref, { threshold: 0.5 });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       className={isInView ? 'animate-fade-in' : 'opacity-0'}
 *     >
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsInViewport<T extends HTMLElement = HTMLElement>(
  elementRef: React.RefObject<T>,
  options: UseIntersectionObserverOptions = {}
): boolean {
  const [isInViewport, setIsInViewport] = useState<boolean>(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options.root, options.rootMargin, options.threshold]);

  return isInViewport;
}

export default useIntersectionObserver;
