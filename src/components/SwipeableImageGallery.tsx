/**
 * Swipeable Image Gallery Component
 * Allows users to swipe left/right to navigate between images
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeableImageGalleryProps {
  images: string[];
  title?: string;
  onImageClick?: (index: number) => void;
  className?: string;
  showIndicators?: boolean;
  showNavigation?: boolean;
  autoHeight?: boolean;
}

export function SwipeableImageGallery({
  images,
  title,
  onImageClick,
  className,
  showIndicators = true,
  showNavigation = true,
  autoHeight = true,
}: SwipeableImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [transition, setTransition] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isSwipeRef = useRef(false);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    setIsDragging(true);
    setTransition(false);
    isSwipeRef.current = false;
  }, []);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - touchStartYRef.current;
    
    // Determine if this is a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipeRef.current = true;
      e.preventDefault();
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseTranslate = -currentIndex * containerWidth;
        const dragTranslate = deltaX;
        setTranslateX(baseTranslate + dragTranslate);
      }
    }
  }, [isDragging, currentIndex]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setTransition(true);
    
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.3; // 30% of container width
    
    const deltaX = translateX - (-currentIndex * containerWidth);
    
    if (isSwipeRef.current && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < images.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      } else {
        // Snap back to current
        setTranslateX(-currentIndex * containerWidth);
      }
    } else {
      // Snap back to current
      setTranslateX(-currentIndex * containerWidth);
    }
    
    isSwipeRef.current = false;
  }, [isDragging, currentIndex, translateX, images.length]);

  // Initialize translateX on mount
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      setTranslateX(-currentIndex * containerWidth);
    }
  }, []);

  // Update translateX when currentIndex changes
  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const containerWidth = containerRef.current.offsetWidth;
      setTranslateX(-currentIndex * containerWidth);
    }
  }, [currentIndex, isDragging]);

  // Handle mouse events for desktop
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleTouchMove(e);
    };

    const handleMouseUp = () => {
      handleTouchEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        e.preventDefault();
        setCurrentIndex(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg"
        style={{
          touchAction: 'pan-y pinch-zoom',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
      >
        {/* Images Container */}
        <div
          className="flex"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: transition ? 'transform 0.3s ease-out' : 'none',
            willChange: 'transform',
          }}
        >
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full flex justify-center items-center"
              style={{
                minHeight: autoHeight ? 'auto' : '70vh',
              }}
            >
              <img
                src={imageUrl}
                alt={`${title || 'Image'} - Page ${index + 1}`}
                className={cn(
                  'max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg',
                  onImageClick && 'cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]'
                )}
                onClick={() => onImageClick?.(index)}
                loading={index === 0 ? 'eager' : 'lazy'}
                draggable={false}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-center text-muted-foreground p-8">Image unavailable</div>';
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {showNavigation && images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background backdrop-blur-sm',
              'h-10 w-10 rounded-full shadow-lg',
              currentIndex === 0 && 'opacity-50 cursor-not-allowed'
            )}
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background backdrop-blur-sm',
              'h-10 w-10 rounded-full shadow-lg',
              currentIndex === images.length - 1 && 'opacity-50 cursor-not-allowed'
            )}
            onClick={goToNext}
            disabled={currentIndex === images.length - 1}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Page Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Page Counter */}
      {images.length > 1 && (
        <div className="text-center mt-2 text-sm text-muted-foreground">
          Page {currentIndex + 1} of {images.length}
        </div>
      )}
    </div>
  );
}

