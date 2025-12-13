import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that scrolls to the top of the page
 * whenever the route changes. This ensures all pages open at the top.
 * Uses useLayoutEffect to scroll before the browser paints, preventing
 * any flash of content at the wrong scroll position.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // Scroll to top immediately when route changes
    // This runs synchronously before the browser paints
    window.scrollTo(0, 0);
    
    // Also ensure scroll position is reset after a brief delay
    // to handle any async content loading that might affect layout
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
