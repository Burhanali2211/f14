import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { performanceMonitor } from "./lib/error-tracking";

// Function to get current zoom level using multiple methods
const getZoomLevel = (): number => {
  const visualViewport = (window as any).visualViewport;
  let zoom = 1;
  
  // Method 1: Visual Viewport API (most accurate on mobile)
  if (visualViewport && visualViewport.scale) {
    zoom = visualViewport.scale;
  }
  // Method 2: Compare innerWidth to outerWidth (browser zoom detection)
  else if (window.outerWidth && window.innerWidth) {
    zoom = window.outerWidth / window.innerWidth;
  }
  // Method 3: Compare screen width to viewport width
  else if (window.screen && window.screen.width && document.documentElement) {
    const screenWidth = window.screen.width;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    if (viewportWidth > 0) {
      zoom = screenWidth / viewportWidth;
    }
  }
  // Method 4: devicePixelRatio (can indicate zoom on some browsers)
  else {
    zoom = window.devicePixelRatio || 1;
  }
  
  // Also check for CSS zoom property
  const htmlZoom = parseFloat((document.documentElement.style as any).zoom || '1');
  const bodyZoom = parseFloat((document.body.style as any).zoom || '1');
  
  // If CSS zoom is set, use that instead
  if (htmlZoom !== 1) return htmlZoom;
  if (bodyZoom !== 1) return bodyZoom;
  
  return zoom;
};

// Function to reset zoom to 1.0 using multiple aggressive methods
const resetZoom = (): void => {
  // Method 1: Reset viewport meta tag (most important for mobile)
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    // Remove and re-add to force browser to re-parse
    const parent = viewport.parentNode;
    const content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no';
    viewport.setAttribute('content', content);
    // Force re-application by temporarily removing
    if (parent) {
      parent.removeChild(viewport);
      parent.insertBefore(viewport, parent.firstChild);
    }
  }
  
  // Method 2: Force reset using CSS zoom property (works in some browsers)
  try {
    (document.body.style as any).zoom = '1';
    (document.documentElement.style as any).zoom = '1';
  } catch (e) {
    // Ignore errors
  }
  
  // Method 3: Use Visual Viewport API to reset (if available)
  const visualViewport = (window as any).visualViewport;
  if (visualViewport && visualViewport.scale !== 1) {
    // Try to programmatically reset (may not work in all browsers)
    try {
      // Force a resize event that might trigger browser to reset
      window.dispatchEvent(new Event('resize'));
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Method 4: Remove any CSS transforms that might cause scaling
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  const htmlTransform = htmlElement.style.transform;
  const bodyTransform = bodyElement.style.transform;
  
  // Check if transform contains scale
  if (htmlTransform && htmlTransform.includes('scale')) {
    htmlElement.style.transform = htmlTransform.replace(/scale\([^)]+\)/g, 'scale(1)');
  }
  if (bodyTransform && bodyTransform.includes('scale')) {
    bodyElement.style.transform = bodyTransform.replace(/scale\([^)]+\)/g, 'scale(1)');
  }
};

// Reset zoom immediately when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    resetZoom();
  });
} else {
  resetZoom();
}

// Reset zoom on page visibility change (when user returns to tab)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    resetZoom();
  }
});

// Reset zoom on window resize (handles orientation changes)
let resizeTimeout: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resetZoom();
  }, 100);
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
if ('visualViewport' in window) {
  const visualViewport = (window as any).visualViewport;
  
  visualViewport.addEventListener('resize', () => {
    const currentScale = visualViewport.scale;
    
    // If zoom is not 1.0, reset it
    if (currentScale !== 1.0) {
      resetZoom();
    }
  });
  
  visualViewport.addEventListener('scroll', () => {
    const currentScale = visualViewport.scale;
    if (currentScale !== 1.0) {
      resetZoom();
    }
  });
}

// Ensure viewport meta tag exists and is correct (in case it was removed/modified)
const ensureViewportMeta = () => {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    document.head.insertBefore(viewport, document.head.firstChild);
  }
  const correctContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no';
  if (viewport.getAttribute('content') !== correctContent) {
    viewport.setAttribute('content', correctContent);
  }
};

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
        resetZoom();
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
// Only check on mobile devices where screen width should match viewport
const checkViewportMismatch = (): boolean => {
  const screenWidth = window.screen?.width || 0;
  const innerWidth = window.innerWidth;
  const outerWidth = window.outerWidth;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Only check on mobile devices (where outerWidth should be close to screenWidth)
  // On desktop, browser chrome makes outerWidth much smaller than screenWidth
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLikelyMobile = outerWidth > 0 && Math.abs(outerWidth - screenWidth) < 100; // Desktop browsers have significant chrome
  
  let widthMismatch = false;
  if (isMobile || isLikelyMobile) {
    // On mobile, expected width should be close to screen width (accounting for device pixel ratio)
    const expectedWidth = screenWidth > 0 ? screenWidth / devicePixelRatio : innerWidth;
    // Allow larger tolerance on mobile (50px) due to browser UI variations
    widthMismatch = Math.abs(innerWidth - expectedWidth) > 50;
  }
  // On desktop, don't check - browser chrome makes this unreliable
  
  return widthMismatch;
};

// More aggressive approach: Force viewport meta tag on every check
// Some browsers ignore viewport meta if it's set before content loads
let lastViewportCheck = 0;
const forceViewportReset = () => {
  const now = Date.now();
  // Only force reset every 500ms to avoid performance issues
  if (now - lastViewportCheck < 500) return;
  lastViewportCheck = now;
  
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    // Force browser to re-parse by changing content slightly then back
    const currentContent = viewport.getAttribute('content') || '';
    const targetContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover, user-scalable=no';
    
    if (currentContent !== targetContent) {
      // Remove and re-add to force browser to re-parse
      const parent = viewport.parentNode;
      if (parent) {
        parent.removeChild(viewport);
        const newViewport = document.createElement('meta');
        newViewport.setAttribute('name', 'viewport');
        newViewport.setAttribute('content', targetContent);
        parent.insertBefore(newViewport, parent.firstChild);
      }
    }
  }
};

// Re-check viewport meta periodically (in case something modifies it)
setInterval(() => {
  ensureViewportMeta();
  forceViewportReset(); // Aggressively enforce viewport meta
  const currentZoom = getZoomLevel();
  const hasMismatch = checkViewportMismatch();
  
  if (currentZoom !== 1.0 || hasMismatch) {
    resetZoom();
  }
}, 1000);

// Initialize performance monitoring
performanceMonitor.measurePageLoad();

createRoot(document.getElementById("root")!).render(<App />);
