import { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Download } from 'lucide-react';
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, images.length, onClose]);

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

  // Download current page
  const handleDownload = async (index: number) => {
    try {
      const response = await fetch(images[index]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-page-${index + 1}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header with Navigation */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-white/10 py-3 px-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={scrollToPrevious}
                disabled={currentPage === 0}
                title="Previous page (↑ or ←)"
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm min-w-[100px] text-center">
                Page {currentPage + 1} of {images.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={scrollToNext}
                disabled={currentPage === images.length - 1}
                title="Next page (↓ or →)"
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">{title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={() => handleDownload(currentPage)}
              title="Download current page"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Page Thumbnails */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full mt-3 hide-scrollbar justify-center">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPage(index)}
              className={`flex-shrink-0 w-10 h-14 rounded border transition-all ${
                currentPage === index
                  ? 'border-white bg-white/20'
                  : 'border-white/30 hover:border-white/50 bg-white/5'
              }`}
              title={`Go to page ${index + 1}`}
            >
              <div className="w-full h-full flex items-center justify-center text-xs text-white/70">
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PDF-like Scrollable Container */}
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
              className="w-full flex justify-center bg-white rounded-lg shadow-2xl p-6"
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

