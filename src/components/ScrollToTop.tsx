import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_POSITIONS_KEY = 'scroll_positions';
const NAVIGATION_STACK_KEY = 'navigation_stack';

/**
 * ScrollRestoration component that properly handles scroll position
 * when navigating. It preserves scroll position when using browser back/forward
 * buttons, but scrolls to top on new navigation.
 */
export function ScrollToTop() {
  const { pathname, key } = useLocation();
  const isRestoring = useRef(false);
  const previousPathname = useRef<string>('');
  const navigationStack = useRef<string[]>([]);
  const isInitialMount = useRef(true);
  const lastNavigationType = useRef<'push' | 'pop' | 'replace'>('push');

  // Initialize navigation stack from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(NAVIGATION_STACK_KEY);
      if (stored) {
        navigationStack.current = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    // Get scroll positions from sessionStorage
    const getScrollPositions = (): Record<string, number> => {
      try {
        const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    };

    const saveScrollPositions = (positions: Record<string, number>) => {
      try {
        sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      } catch {
        // Ignore errors
      }
    };

    // Save current scroll position before navigation
    const saveCurrentScroll = () => {
      if (previousPathname.current && !isRestoring.current && !isInitialMount.current) {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 0) {
          const positions = getScrollPositions();
          positions[previousPathname.current] = scrollY;
          saveScrollPositions(positions);
        }
      }
    };

    // Detect navigation type using Performance API
    const detectNavigationType = (): 'push' | 'pop' | 'replace' => {
      try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (nav) {
          // Check if this is a back/forward navigation
          // If the current path is in our stack before the previous path, it's likely a back navigation
          const currentIndex = navigationStack.current.indexOf(pathname);
          const previousIndex = previousPathname.current 
            ? navigationStack.current.indexOf(previousPathname.current) 
            : -1;
          
          // If current path appears before previous path in stack, it's a back navigation
          if (currentIndex !== -1 && previousIndex !== -1 && currentIndex < previousIndex) {
            return 'pop';
          }
        }
      } catch {
        // Fallback
      }
      return 'push';
    };

    // Handle popstate (browser back/forward button)
    const handlePopState = () => {
      isRestoring.current = true;
      lastNavigationType.current = 'pop';
    };

    window.addEventListener('popstate', handlePopState);

    // On initial mount, don't do anything
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousPathname.current = pathname;
      // Initialize stack with current path
      if (!navigationStack.current.includes(pathname)) {
        navigationStack.current.push(pathname);
        try {
          sessionStorage.setItem(NAVIGATION_STACK_KEY, JSON.stringify(navigationStack.current));
        } catch {
          // Ignore
        }
      }
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }

    // Save scroll position of previous page
    if (previousPathname.current && previousPathname.current !== pathname) {
      saveCurrentScroll();
    }

    // Detect navigation type
    const navType = detectNavigationType();
    if (isRestoring.current) {
      lastNavigationType.current = 'pop';
    } else if (navType === 'pop') {
      lastNavigationType.current = 'pop';
    } else {
      lastNavigationType.current = 'push';
    }

    // Check if we have a saved scroll position for this path
    const positions = getScrollPositions();
    const savedPosition = positions[pathname];

    // Restore scroll position for back navigation
    if (lastNavigationType.current === 'pop' && savedPosition !== undefined) {
      isRestoring.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedPosition,
            behavior: 'auto'
          });
          isRestoring.current = false;
        });
      });
    } else {
      // New navigation - scroll to top
      if (lastNavigationType.current === 'push') {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: 'auto'
          });
        });
      }
      isRestoring.current = false;
    }

    // Update navigation stack
    if (previousPathname.current !== pathname) {
      if (lastNavigationType.current === 'pop') {
        // For back navigation, remove paths after current one
        const currentIndex = navigationStack.current.indexOf(pathname);
        if (currentIndex !== -1) {
          navigationStack.current = navigationStack.current.slice(0, currentIndex + 1);
        } else {
          // Path not in stack, add it
          navigationStack.current.push(pathname);
        }
      } else {
        // For forward navigation, add to stack
        const currentIndex = navigationStack.current.indexOf(pathname);
        if (currentIndex === -1) {
          navigationStack.current.push(pathname);
        } else {
          // Path exists, remove everything after it and add it at the end
          navigationStack.current = navigationStack.current.slice(0, currentIndex);
          navigationStack.current.push(pathname);
        }
      }
      
      // Keep only last 50 entries
      if (navigationStack.current.length > 50) {
        navigationStack.current = navigationStack.current.slice(-50);
      }
      
      // Save to sessionStorage
      try {
        sessionStorage.setItem(NAVIGATION_STACK_KEY, JSON.stringify(navigationStack.current));
      } catch {
        // Ignore errors
      }
    }

    previousPathname.current = pathname;

    return () => {
      window.removeEventListener('popstate', handlePopState);
      saveCurrentScroll();
    };
  }, [pathname, key]);

  // Save scroll position on scroll (throttled)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      if (isRestoring.current) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 0) {
          try {
            const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
            positions[pathname] = scrollY;
            sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
          } catch {
            // Ignore errors
          }
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Save on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && !isRestoring.current) {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 0) {
          try {
            const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
            positions[pathname] = scrollY;
            sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
          } catch {
            // Ignore errors
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(scrollTimeout);
    };
  }, [pathname]);

  return null;
}
