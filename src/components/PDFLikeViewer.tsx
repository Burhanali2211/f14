import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFLikeViewerProps {
  images: string[];
  title: string;
  onImageClick?: (index: number) => void;
}

export function PDFLikeViewer({ images, title, onImageClick }: PDFLikeViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track if scrolling is programmatic (button click) vs user-initiated
  const scrollToPageProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to page when currentPage changes (only when triggered programmatically)
  useEffect(() => {
    if (pageRefs.current[currentPage] && scrollToPageProgrammatically.current && containerRef.current) {
      scrollToPageProgrammatically.current = false;
      setIsScrolling(true);
      const targetPage = pageRefs.current[currentPage];
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
      setTimeout(() => setIsScrolling(false), 500);
    }
  }, [currentPage]);

  // Handle scroll to detect current page (throttled to prevent conflicts)
  const handleScroll = () => {
    if (!containerRef.current || isScrolling) return;
    
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
  
  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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

  return (
    <div className="relative w-full">
      {/* Page Navigation - Fixed at top */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-4 py-3 px-4 rounded-t-2xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={scrollToPrevious}
              disabled={currentPage === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {currentPage + 1} of {images.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={scrollToNext}
              disabled={currentPage === images.length - 1}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Page Thumbnails */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[300px] hide-scrollbar">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToPage(index)}
                className={`flex-shrink-0 w-8 h-10 rounded border transition-all ${
                  currentPage === index
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                title={`Go to page ${index + 1}`}
              >
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  {index + 1}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PDF-like Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-muted/30"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex flex-col items-center gap-4 p-4">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              className="w-full flex justify-center bg-white rounded-lg shadow-lg p-4 mb-4"
              style={{
                minHeight: '600px',
                maxWidth: '800px',
              }}
            >
              <img
                src={imageUrl}
                alt={`${title} - Page ${index + 1}`}
                className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick?.(index)}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground">Image unavailable</div>';
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-4 right-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-background/90 backdrop-blur-sm"
          onClick={() => onImageClick?.(currentPage)}
          title="View full size"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
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

