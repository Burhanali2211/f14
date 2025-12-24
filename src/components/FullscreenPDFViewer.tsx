import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset to initial page when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage);
      setIsScrolling(true);
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

  // Zoom controls - minimum zoom is 1.0 (original size)
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1.0)); // Minimum is 1.0, not 0.5
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  // Rotate - maintain viewport center position
  const handleRotate = () => {
    if (!containerRef.current || !pageRefs.current[currentPage]) return;
    
    const container = containerRef.current;
    const currentPageElement = pageRefs.current[currentPage];
    if (!currentPageElement) return;
    
    // Store viewport center position relative to the page
    const containerRect = container.getBoundingClientRect();
    const pageRect = currentPageElement.getBoundingClientRect();
    const viewportCenterY = containerRect.height / 2;
    const pageTop = pageRect.top - containerRect.top + container.scrollTop;
    const pageCenterY = pageTop + (pageRect.height / 2);
    
    // Calculate offset from page center
    const offsetFromCenter = viewportCenterY - pageCenterY;
    
    // Apply rotation
    setRotation(prev => {
      const newRotation = (prev + 90) % 360;
      
      // Use double requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container && currentPageElement) {
            // Recalculate page center after rotation
            const newPageRect = currentPageElement.getBoundingClientRect();
            const newContainerRect = container.getBoundingClientRect();
            const newPageTop = newPageRect.top - newContainerRect.top + container.scrollTop;
            const newPageCenterY = newPageTop + (newPageRect.height / 2);
            
            // Restore viewport center position
            const newViewportCenterY = newPageCenterY + offsetFromCenter;
            container.scrollTop = newViewportCenterY - (containerRect.height / 2);
          }
        });
      });
      
      return newRotation;
    });
  };

  // Reset zoom and rotation when page changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentPage]);

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
            className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Zoom and Rotate Controls - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          disabled={zoom >= 5}
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          disabled={zoom <= 1}
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
          onClick={handleRotate}
          title="Rotate (R)"
        >
          <RotateCw className="w-5 h-5" />
        </Button>
      </div>

      {/* PDF-like Scrollable Container with Zoom and Rotate */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex flex-col items-center gap-6 p-6">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              className="w-full flex justify-center bg-white rounded-lg shadow-2xl p-6 transition-all duration-200"
              style={{
                minHeight: '800px',
                maxWidth: '900px',
              }}
            >
              <img
                src={imageUrl}
                alt={`${title} - Page ${index + 1}`}
                className="w-full h-auto object-contain"
                loading="lazy"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out',
                  willChange: 'transform', // Optimize for performance
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
          ))}
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

