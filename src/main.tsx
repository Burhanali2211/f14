import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { performanceMonitor } from "./lib/error-tracking";

// Filter out known third-party warnings from YouTube/Google scripts
// These are harmless warnings from external resources we can't control
// Can be disabled by setting localStorage.setItem('showYoutubeWarnings', 'true')
if (typeof window !== 'undefined') {
  const showYoutubeWarnings = localStorage.getItem('showYoutubeWarnings') === 'true';
  
  if (!showYoutubeWarnings) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Patterns to filter (YouTube/Google third-party scripts)
  const filterPatterns = [
    /www-player\.css/i,
    /www-embed-player/i,
    /Unknown property.*-moz-/i,
    /Unknown pseudo-class.*-moz-/i,
    /Unknown pseudo-class.*-ms-/i,
    /Error in parsing value/i,
    /Declaration dropped/i,
    /Ruleset ignored/i,
    /r43BVKpqVNByaR4gLMQgR4Bxv0Q6w9Dzv0MAphxEz80\.js/i,
    /unreachable code after return statement/i,
    /doubleclick\.net/i,
    /googleads\.g\.doubleclick\.net/i,
    /Partitioned cookie or storage access/i,
    /Invalid URI.*Load of media resource/i,
  ];
  
  const shouldFilter = (message: string): boolean => {
    return filterPatterns.some(pattern => pattern.test(message));
  };
  
  console.error = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    if (!shouldFilter(message)) {
      originalError.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    if (!shouldFilter(message)) {
      originalWarn.apply(console, args);
    }
  };
  }
}

// Function to get current zoom level - only use reliable methods
const getZoomLevel = (): number => {
  // Method 1: Visual Viewport API (most accurate, works on mobile and modern desktop browsers)
  const visualViewport = (window as any).visualViewport;
  if (visualViewport && visualViewport.scale !== undefined) {
    return visualViewport.scale;
  }
  
  // Method 2: Check CSS zoom property (if explicitly set)
  const htmlZoom = parseFloat((document.documentElement.style as any).zoom || '1');
  const bodyZoom = parseFloat((document.body.style as any).zoom || '1');
  if (htmlZoom !== 1 && htmlZoom > 0) {
    return htmlZoom;
  }
  if (bodyZoom !== 1 && bodyZoom > 0) {
    return bodyZoom;
  }
  
  // On desktop, width-based methods are unreliable due to browser chrome
  // Only use them on mobile where they're more accurate
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Method 3: On mobile, compare screen width to viewport width (more reliable)
    if (window.screen && window.screen.width && document.documentElement) {
      const screenWidth = window.screen.width;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      if (viewportWidth > 0 && screenWidth > 0) {
        const calculatedZoom = screenWidth / viewportWidth;
        // Only return if it's significantly different from 1 (not just browser UI)
        if (Math.abs(calculatedZoom - 1) > 0.1) {
          return calculatedZoom;
        }
      }
    }
  }
  
  // Default: assume no zoom
  return 1;
};

// Ensure viewport meta tag exists and is correct (in case it was removed/modified)
// Only update if content actually differs to avoid unnecessary re-parsing
// MUST be defined before resetZoomInternal uses it
const ensureViewportMeta = () => {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    document.head.insertBefore(viewport, document.head.firstChild);
  }
  const correctContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no';
  const currentContent = viewport.getAttribute('content');
  // Only update if content actually differs
  if (currentContent !== correctContent) {
    viewport.setAttribute('content', correctContent);
  }
};

// COMPLETELY REMOVED resetZoom functions - they were causing the zoom issues!
// We rely ONLY on the viewport meta tag to prevent zoom
// No programmatic zoom manipulation whatsoever

// Ensure viewport meta is correct on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureViewportMeta();
  });
} else {
  ensureViewportMeta();
}

// Reset zoom on page visibility change (when user returns to tab)
// REMOVED: This was causing issues - just ensure viewport meta is correct
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    ensureViewportMeta();
  }
});

// Reset zoom on window resize (handles orientation changes)
// REMOVED: resetZoom() calls - they were causing the zoom issues
// Just ensure viewport meta is correct
let resizeTimeout: ReturnType<typeof setTimeout>;
let lastResizeCheck = 0;
const RESIZE_CHECK_DEBOUNCE_MS = 500; // Only check every 500ms
window.addEventListener('resize', () => {
  const now = Date.now();
  if (now - lastResizeCheck < RESIZE_CHECK_DEBOUNCE_MS) return;
  lastResizeCheck = now;
  
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Just ensure viewport meta is correct - that's all we need
    ensureViewportMeta();
  }, 200);
});

// Prevent zoom gestures (pinch-to-zoom, double-tap zoom) on the website
// Allow zoom only in fullscreen image viewer
let lastTouchEnd = 0;
document.addEventListener('touchstart', (e) => {
  // Allow zoom in fullscreen image viewer
  const target = e.target as HTMLElement;
  if (target.closest('[data-fullscreen-image-viewer]')) {
    return;
  }
  
  // Prevent pinch zoom
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  // Allow zoom in fullscreen image viewer
  const target = e.target as HTMLElement;
  if (target.closest('[data-fullscreen-image-viewer]')) {
    return;
  }
  
  // Prevent double-tap zoom
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// Prevent wheel zoom with Ctrl/Cmd key (except in fullscreen image viewer)
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-fullscreen-image-viewer]')) {
    return;
  }
  
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
}, { passive: false });

// Additional zoom prevention using Visual Viewport API (more reliable on mobile)
// Use debounced handler to prevent event loops
if ('visualViewport' in window) {
  const visualViewport = (window as any).visualViewport;
  let lastScaleCheck = 0;
  const SCALE_CHECK_DEBOUNCE_MS = 200;
  
  const handleViewportChange = () => {
    const now = Date.now();
    if (now - lastScaleCheck < SCALE_CHECK_DEBOUNCE_MS) return;
    lastScaleCheck = now;
    
    // COMPLETELY REMOVED: Any zoom manipulation
    // The viewport meta tag is the only way to prevent zoom
  };
  
  visualViewport.addEventListener('resize', handleViewportChange);
  // Don't listen to scroll events - they fire too frequently and cause loops
}

// Ensure viewport meta is correct on load
ensureViewportMeta();

// Watch for viewport meta tag changes using MutationObserver
const viewportObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'content') {
      const viewport = mutation.target as HTMLMetaElement;
      const correctContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no';
      if (viewport.getAttribute('content') !== correctContent) {
        ensureViewportMeta();
        // COMPLETELY REMOVED: Any zoom manipulation
      }
    }
  });
});

// Start observing the viewport meta tag
const viewportMeta = document.querySelector('meta[name="viewport"]');
if (viewportMeta) {
  viewportObserver.observe(viewportMeta, { attributes: true, attributeFilter: ['content'] });
}

// Function to check for viewport width mismatch (indicates zoom)
// DISABLED: This function was incorrectly detecting mismatches and causing issues
// The viewport meta tag is sufficient to prevent zoom
const checkViewportMismatch = (): boolean => {
  // Always return false - we don't want to trigger any zoom resets
  // The viewport meta tag handles zoom prevention
  return false;
};

// Removed forceViewportReset - it was too aggressive and caused issues
// The ensureViewportMeta function is sufficient

// DISABLED: Periodic zoom checks were causing issues
// The viewport meta tag is sufficient to prevent zoom
// Only ensure viewport meta is correct on load and when it changes
// No periodic checks needed

// Initialize performance monitoring
performanceMonitor.measurePageLoad();

// Register service worker for update detection (even if notifications aren't enabled)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Main] New service worker installed, update available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[Main] Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
