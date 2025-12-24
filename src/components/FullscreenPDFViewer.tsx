import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenPDFViewerProps {
  images: string[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

export function FullscreenPDFViewer({ 
  images, 
  title, 
  isOpen, 
  onClose, 
  initialPage = 0 
}: FullscreenPDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isScrolling, setIsScrolling] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitZoom, setFitZoom] = useState(1);
  const [imageDimensions, setImageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [position, setPosition] = useState<Map<number, { x: number; y: number }>>(new Map());
  
  // Store zoom and rotation per page
  const pageStateRef = useRef<Map<number, { zoom: number; rotation: number }>>(new Map());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  
  // Touch state for pinch zoom
  const touchStartRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);
  
  // Drag state for panning when zoomed
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownPositionRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Calculate fit-to-screen zoom based on viewport dimensions
  const calculateFitZoom = (imgWidth: number, imgHeight: number, rotation: number): number => {
    if (!containerRef.current || imgWidth === 0 || imgHeight === 0) return 1;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Account for rotation - swap dimensions if rotated 90 or 270 degrees
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? imgHeight : imgWidth;
    const effectiveImgHeight = isRotated ? imgWidth : imgHeight;
    
    // Calculate zoom to fit viewport (contain mode - no cropping)
    // Add padding (20px on each side = 40px total)
    const padding = 40;
    const scaleX = (viewportWidth - padding) / effectiveImgWidth;
    const scaleY = (viewportHeight - padding) / effectiveImgHeight;
    const fitZoomValue = Math.min(scaleX, scaleY);
    
    return Math.max(0.5, Math.min(fitZoomValue, 2)); // Clamp between 0.5x and 2x for initial fit
  };

  // Calculate fit zoom when images load or window resizes
  useEffect(() => {
    if (!isOpen) return;
    
    const calculateForCurrentPage = () => {
      const dims = imageDimensions.get(currentPage);
      if (!dims || dims.width === 0 || dims.height === 0) return;
      
      const calculatedFitZoom = calculateFitZoom(dims.width, dims.height, rotation);
      setFitZoom(calculatedFitZoom);
      
      // If no saved state for current page, set zoom to fit
      const pageState = pageStateRef.current.get(currentPage);
      if (!pageState) {
        setZoom(calculatedFitZoom);
        pageStateRef.current.set(currentPage, { zoom: calculatedFitZoom, rotation });
        
        // Also set fit zoom for all other pages that don't have saved state
        images.forEach((_, index) => {
          if (index !== currentPage) {
            const otherDims = imageDimensions.get(index);
            if (otherDims && otherDims.width > 0 && otherDims.height > 0) {
              const otherFitZoom = calculateFitZoom(otherDims.width, otherDims.height, rotation);
              const otherPageState = pageStateRef.current.get(index);
              if (!otherPageState) {
                pageStateRef.current.set(index, { zoom: otherFitZoom, rotation });
              }
            }
          }
        });
      }
    };
    
    // Calculate after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateForCurrentPage, 200);
    
    const handleResize = () => {
      calculateForCurrentPage();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, currentPage, rotation, imageDimensions, images.length]);

  // Reset to initial page when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage);
      setIsScrolling(true);
      // Reset zoom states when opening - will be recalculated when images load
      pageStateRef.current.clear();
      setZoom(1);
      setRotation(0);
      setFitZoom(1);
      setImageDimensions(new Map());
      
      // Scroll to initial page after a brief delay to ensure DOM is ready
      setTimeout(() => {
        if (pageRefs.current[initialPage] && containerRef.current) {
          const targetPage = pageRefs.current[initialPage];
          if (targetPage) {
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetPage.getBoundingClientRect();
            const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
        setTimeout(() => setIsScrolling(false), 500);
      }, 100);
    }
  }, [isOpen, initialPage]);

  // Scroll to page when currentPage changes (only when triggered programmatically, not by scroll detection)
  const scrollToPageProgrammatically = useRef(false);
  
  useEffect(() => {
    if (isOpen && pageRefs.current[currentPage] && scrollToPageProgrammatically.current) {
      scrollToPageProgrammatically.current = false;
      setIsScrolling(true);
      const targetPage = pageRefs.current[currentPage];
      if (targetPage && containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetPage.getBoundingClientRect();
        const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
      setTimeout(() => setIsScrolling(false), 500);
    }
  }, [currentPage, isOpen]);

  // Handle scroll to detect current page (throttled to prevent excessive updates)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = () => {
    if (!containerRef.current || !isOpen || isScrolling) return;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Throttle scroll detection to avoid conflicts with programmatic scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current || isScrolling) return;
      
      const container = containerRef.current;
      
      // Find which page is most visible
      let maxVisible = 0;
      let maxVisibleRatio = 0;
      
      pageRefs.current.forEach((pageRef, index) => {
        if (!pageRef) return;
        
        const rect = pageRef.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate visible portion
        const visibleTop = Math.max(0, rect.top - containerRect.top);
        const visibleBottom = Math.min(containerRect.height, rect.bottom - containerRect.top);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleRatio = visibleHeight / rect.height;
        
        if (visibleRatio > maxVisibleRatio) {
          maxVisibleRatio = visibleRatio;
          maxVisible = index;
        }
      });
      
      // Only update if different and not currently programmatically scrolling
      if (maxVisible !== currentPage && !isScrolling) {
        scrollToPageProgrammatically.current = false; // This is user scroll, not programmatic
        setCurrentPage(maxVisible);
      }
    }, 100); // Throttle to 100ms
  };

  const scrollToPage = (index: number) => {
    if (pageRefs.current[index] && containerRef.current) {
      scrollToPageProgrammatically.current = true; // Mark as programmatic scroll
      setIsScrolling(true);
      const targetPage = pageRefs.current[index];
      if (targetPage) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetPage.getBoundingClientRect();
        const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
      setCurrentPage(index);
      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  const scrollToPrevious = () => {
    if (currentPage > 0) {
      scrollToPage(currentPage - 1);
    }
  };

  const scrollToNext = () => {
    if (currentPage < images.length - 1) {
      scrollToPage(currentPage + 1);
    }
  };


  // Disable body scroll when open - prevent background page from scrolling
  useEffect(() => {
    if (isOpen) {
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
  
  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Touch helpers for pinch zoom
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };
  
  // Zoom controls - apply to all pages consistently
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 5);
    setZoom(newZoom);
    // Update all pages to use the same zoom for consistency
    images.forEach((_, index) => {
      const pageState = pageStateRef.current.get(index) || { zoom: fitZoom || 1, rotation: 0 };
      pageStateRef.current.set(index, { ...pageState, zoom: newZoom });
    });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
    // Update all pages to use the same zoom for consistency
    images.forEach((_, index) => {
      const pageState = pageStateRef.current.get(index) || { zoom: fitZoom || 1, rotation: 0 };
      pageStateRef.current.set(index, { ...pageState, zoom: newZoom });
    });
  };

  const handleResetZoom = () => {
    const resetZoom = fitZoom || 1;
    setZoom(resetZoom);
    // Reset all pages to fit zoom
    images.forEach((_, index) => {
      const pageState = pageStateRef.current.get(index) || { zoom: fitZoom || 1, rotation: 0 };
      pageStateRef.current.set(index, { ...pageState, zoom: resetZoom });
    });
  };
  
  // Constrain position to keep image within bounds when zoomed
  const constrainPosition = (x: number, y: number, currentZoom: number, index: number): { x: number; y: number } => {
    const dims = imageDimensions.get(index);
    if (!dims || !containerRef.current || currentZoom <= 1) {
      return { x: 0, y: 0 };
    }
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Account for rotation
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? dims.height : dims.width;
    const effectiveImgHeight = isRotated ? dims.width : dims.height;
    
    const scaledWidth = effectiveImgWidth * currentZoom;
    const scaledHeight = effectiveImgHeight * currentZoom;
    
    const PADDING = 5;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    if (scaledWidth > viewportWidth) {
      const halfDiff = (scaledWidth - viewportWidth) / 2;
      minX = halfDiff + PADDING;
      maxX = -halfDiff - PADDING;
    }
    
    if (scaledHeight > viewportHeight) {
      const halfDiff = (scaledHeight - viewportHeight) / 2;
      minY = halfDiff + PADDING;
      maxY = -halfDiff - PADDING;
    }
    
    return {
      x: Math.max(maxX, Math.min(minX, x)),
      y: Math.max(maxY, Math.min(minY, y))
    };
  };

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || zoom <= 1) return; // Only drag when zoomed in
    
    mouseDownPositionRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasMovedRef.current = false;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    const currentPos = position.get(currentPage) || { x: 0, y: 0 };
    lastPositionRef.current = { ...currentPos };
    e.preventDefault();
    e.stopPropagation();
  }, [zoom, currentPage, position]);

  // Mouse event listeners for dragging
  useEffect(() => {
    if (!isOpen) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || zoom <= 1) return;
      
      const deltaX = e.clientX - (mouseDownPositionRef.current?.x || 0);
      const deltaY = e.clientY - (mouseDownPositionRef.current?.y || 0);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 5) {
        hasMovedRef.current = true;
      }
      
      const dragDeltaX = e.clientX - dragStartRef.current.x;
      const dragDeltaY = e.clientY - dragStartRef.current.y;
      
      const currentPos = position.get(currentPage) || { x: 0, y: 0 };
      const newX = lastPositionRef.current.x + dragDeltaX;
      const newY = lastPositionRef.current.y + dragDeltaY;
      
      const constrained = constrainPosition(newX, newY, zoom, currentPage);
      setPosition(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPage, constrained);
        return newMap;
      });
      
      lastPositionRef.current = constrained;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        mouseDownPositionRef.current = null;
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isOpen, zoom, currentPage, position]);

  // Touch handlers for pinch zoom and drag - apply to all pages
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      touchStartRef.current = { distance, center };
      isDraggingRef.current = false;
    } else if (e.touches.length === 1 && zoom > 1) {
      // Single touch - start drag when zoomed
      const touch = e.touches[0];
      isDraggingRef.current = true;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      const currentPos = position.get(currentPage) || { x: 0, y: 0 };
      lastPositionRef.current = { ...currentPos };
      mouseDownPositionRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      hasMovedRef.current = false;
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      
      if (touchStartRef.current.distance > 0 && currentDistance > 0) {
        const scaleChange = currentDistance / touchStartRef.current.distance;
        const newZoom = Math.max(0.5, Math.min(5, zoom * scaleChange));
        setZoom(newZoom);
        
        // Update all pages to use the same zoom for consistency
        images.forEach((_, index) => {
          const pageState = pageStateRef.current.get(index) || { zoom: fitZoom || 1, rotation: 0 };
          pageStateRef.current.set(index, { ...pageState, zoom: newZoom });
        });
        
        // Reset position when zoom changes significantly
        if (Math.abs(newZoom - zoom) > 0.1) {
          setPosition(prev => {
            const newMap = new Map(prev);
            newMap.set(currentPage, { x: 0, y: 0 });
            return newMap;
          });
        }
        
        touchStartRef.current.distance = currentDistance;
      }
    } else if (e.touches.length === 1 && isDraggingRef.current && zoom > 1) {
      // Single touch drag - pan when zoomed
      e.preventDefault();
      const touch = e.touches[0];
      const dragDeltaX = touch.clientX - dragStartRef.current.x;
      const dragDeltaY = touch.clientY - dragStartRef.current.y;
      
      const currentPos = position.get(currentPage) || { x: 0, y: 0 };
      const newX = lastPositionRef.current.x + dragDeltaX;
      const newY = lastPositionRef.current.y + dragDeltaY;
      
      const constrained = constrainPosition(newX, newY, zoom, currentPage);
      setPosition(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPage, constrained);
        return newMap;
      });
      
      lastPositionRef.current = constrained;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      
      const deltaX = touch.clientX - (mouseDownPositionRef.current?.x || 0);
      const deltaY = touch.clientY - (mouseDownPositionRef.current?.y || 0);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > 5) {
        hasMovedRef.current = true;
      }
    }
  };
  
  const handleTouchEnd = () => {
    touchStartRef.current = null;
    isDraggingRef.current = false;
    hasMovedRef.current = false;
    mouseDownPositionRef.current = null;
  };

  // Rotate - apply to all pages for consistency
  const handleRotate = () => {
    if (!containerRef.current || !pageRefs.current[currentPage]) return;
    
    const container = containerRef.current;
    const currentPageElement = pageRefs.current[currentPage];
    if (!currentPageElement) return;
    
    // Store current scroll position and viewport center
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewportCenter = scrollTop + (containerHeight / 2);
    
    // Get page position
    const pageTop = currentPageElement.offsetTop;
    const pageHeight = currentPageElement.offsetHeight;
    const pageCenter = pageTop + (pageHeight / 2);
    
    // Calculate how far the viewport center is from page center
    const offsetFromPageCenter = viewportCenter - pageCenter;
    
    // Apply rotation to all pages
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    // Update all pages with new rotation
    images.forEach((_, index) => {
      const pageState = pageStateRef.current.get(index) || { zoom: fitZoom || 1, rotation: 0 };
      pageStateRef.current.set(index, { ...pageState, rotation: newRotation });
    });
    
    // Wait for DOM to update with new rotation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (container && currentPageElement) {
          // Get new page dimensions after rotation
          const newPageTop = currentPageElement.offsetTop;
          const newPageHeight = currentPageElement.offsetHeight;
          const newPageCenter = newPageTop + (newPageHeight / 2);
          
          // Calculate new scroll position to maintain the same visual center
          const newViewportCenter = newPageCenter + offsetFromPageCenter;
          const newScrollTop = newViewportCenter - (containerHeight / 2);
          
          // Smooth scroll to maintain position
          container.scrollTo({
            top: Math.max(0, newScrollTop),
            behavior: 'auto'
          });
        }
      });
    });
  };

  // Sync zoom across all pages when changing pages - maintain consistency
  useEffect(() => {
    if (!isOpen) return;
    
    // Always use current zoom for all pages to maintain consistency
    // Only load rotation from saved state
    const pageState = pageStateRef.current.get(currentPage);
    if (pageState) {
      // Update rotation if different, but keep current zoom
      if (pageState.rotation !== rotation) {
        setRotation(pageState.rotation);
      }
      // Update saved state with current zoom to keep all pages in sync
      pageStateRef.current.set(currentPage, { zoom, rotation: pageState.rotation });
    } else {
      // First time viewing this page - use fit zoom if available
      const dims = imageDimensions.get(currentPage);
      if (dims) {
        const calculatedFitZoom = calculateFitZoom(dims.width, dims.height, rotation);
        if (fitZoom === 1 || Math.abs(calculatedFitZoom - fitZoom) > 0.1) {
          setFitZoom(calculatedFitZoom);
          setZoom(calculatedFitZoom);
        }
        pageStateRef.current.set(currentPage, { zoom: calculatedFitZoom, rotation });
      } else if (fitZoom > 1) {
        setZoom(fitZoom);
        pageStateRef.current.set(currentPage, { zoom: fitZoom, rotation });
      }
    }
    
    // Ensure all pages use the same zoom
    images.forEach((_, index) => {
      const state = pageStateRef.current.get(index);
      if (state) {
        pageStateRef.current.set(index, { zoom, rotation: state.rotation });
      }
    });
  }, [currentPage, isOpen, images.length]);
  
  // Save zoom and rotation state when they change
  useEffect(() => {
    pageStateRef.current.set(currentPage, { zoom, rotation });
  }, [currentPage, zoom, rotation]);
  
  // Reset all page states when viewer is closed
  useEffect(() => {
    if (!isOpen) {
      pageStateRef.current.clear();
      setZoom(1);
      setRotation(0);
      setPosition(new Map());
      isDraggingRef.current = false;
    }
  }, [isOpen]);
  
  // Reset position when zoom resets to fit or below 1, or when changing pages
  useEffect(() => {
    if (zoom <= 1) {
      setPosition(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPage, { x: 0, y: 0 });
        return newMap;
      });
    }
    
    // Reset position when changing pages if not zoomed
    if (zoom <= 1) {
      const currentPos = position.get(currentPage);
      if (currentPos && (currentPos.x !== 0 || currentPos.y !== 0)) {
        setPosition(prev => {
          const newMap = new Map(prev);
          newMap.set(currentPage, { x: 0, y: 0 });
          return newMap;
        });
      }
    }
  }, [zoom, currentPage]);
  
  // Handle browser back button - reset states when closing
  useEffect(() => {
    if (isOpen) {
      // Only push state if we don't already have one
      if (!window.history.state?.pdfViewerOpen) {
        window.history.pushState({ pdfViewerOpen: true }, '');
      }
      
      const handlePopState = (e: PopStateEvent) => {
        // Only close if the state indicates the viewer should be closed
        if (isOpen && !e.state?.pdfViewerOpen) {
          pageStateRef.current.clear();
          setZoom(1);
          setRotation(0);
          onClose();
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          scrollToPrevious();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          scrollToNext();
          break;
        case 'Home':
          e.preventDefault();
          scrollToPage(0);
          break;
        case 'End':
          e.preventDefault();
          scrollToPage(images.length - 1);
          break;
        case '+':
        case '=':
          if (!e.shiftKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, images.length, onClose, zoom, rotation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Minimal Header - Only Close Button */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-end p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-11 w-11 sm:h-10 sm:w-10 rounded-full touch-manipulation"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close viewer"
          >
            <X className="w-6 h-6 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      {/* Zoom and Rotate Controls - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-11 w-11 sm:h-10 sm:w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          disabled={zoom >= 5}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-11 w-11 sm:h-10 sm:w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          disabled={zoom <= 0.5}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-11 w-11 sm:h-10 sm:w-10 rounded-full touch-manipulation"
          onClick={handleResetZoom}
          title="Reset Zoom to Fit (0 or F)"
          aria-label="Reset zoom to fit screen"
        >
          <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-11 w-11 sm:h-10 sm:w-10 rounded-full touch-manipulation"
          onClick={handleRotate}
          title="Rotate (R)"
          aria-label="Rotate"
        >
          <RotateCw className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* PDF-like Scrollable Container with Zoom and Rotate */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={{
          scrollBehavior: 'smooth',
          overflowX: zoom > 1 ? 'auto' : 'hidden',
          touchAction: zoom > 1 ? 'pan-y pan-x pinch-zoom' : 'pan-y',
        }}
      >
        <div className="flex flex-col items-center gap-6 py-4">
          {images.map((imageUrl, index) => {
            // Get rotation for this specific page, but always use current zoom for consistency
            const pageState = pageStateRef.current.get(index);
            // Always use current zoom for all pages to maintain consistency
            const pageZoom = zoom;
            // Use saved rotation or current rotation
            const pageRotation = pageState?.rotation ?? rotation;
            
            return (
              <div
                key={index}
                ref={(el) => {
                  pageRefs.current[index] = el;
                }}
                className="flex justify-center items-center bg-white shadow-2xl"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'visible',
                  padding: '20px',
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: zoom > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
                  userSelect: 'none',
                  touchAction: 'none',
                }}
                onMouseDown={index === currentPage && zoom > 1 ? handleMouseDown : undefined}
                onTouchStart={index === currentPage ? handleTouchStart : undefined}
                onTouchMove={index === currentPage ? handleTouchMove : undefined}
                onTouchEnd={index === currentPage ? handleTouchEnd : undefined}
              >
                <img
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                  src={imageUrl}
                  alt={`${title} - Page ${index + 1}`}
                  className="object-contain"
                  draggable={false}
                  style={{
                    display: 'block',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    width: 'auto',
                    height: 'auto',
                    transform: `scale(${pageZoom}) rotate(${pageRotation}deg) translate(${
                      index === currentPage ? (position.get(currentPage)?.x || 0) : 0
                    }px, ${
                      index === currentPage ? (position.get(currentPage)?.y || 0) : 0
                    }px)`,
                    transformOrigin: 'center center',
                    transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                    willChange: 'transform',
                    cursor: zoom > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
                    pointerEvents: 'auto',
                  }}
                  loading="lazy"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;
                    if (naturalWidth > 0 && naturalHeight > 0) {
                      setImageDimensions(prev => {
                        const newMap = new Map(prev);
                        newMap.set(index, { width: naturalWidth, height: naturalHeight });
                        return newMap;
                      });
                      
                      // If this is the current page and we don't have a saved state, calculate fit zoom
                      if (index === currentPage && !pageStateRef.current.get(index)) {
                        setTimeout(() => {
                          const calculatedFitZoom = calculateFitZoom(naturalWidth, naturalHeight, rotation);
                          setFitZoom(calculatedFitZoom);
                          setZoom(calculatedFitZoom);
                          pageStateRef.current.set(index, { zoom: calculatedFitZoom, rotation });
                        }, 100);
                      }
                    }
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-white/50">Image unavailable</div>';
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

